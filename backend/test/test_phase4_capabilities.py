"""Phase 4 missing backend capabilities — sqlite verification, not live PostgreSQL."""

from __future__ import annotations

from app.core.security import hash_password
from app.models.catalog import Course
from app.models.identity import Role, User, UserRole
from app.models.people import Enrollment, FacultyProfile, StudentProfile
from app.models.teaching import Assignment

from test.conftest import auth_header


def _student(db, inst_id: str, user_id: str = "u_stu_p4"):
    existing = db.get(User, user_id)
    if existing:
        return existing
    user = User(
        id=user_id,
        institution_id=inst_id,
        email=f"{user_id}@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Stu Phase4",
        status="active",
        legacy_role="student",
    )
    db.add(user)
    role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "student").first()
    if role is None:
        role = Role(institution_id=inst_id, code="student", name="Student")
        db.add(role)
        db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst_id))
    db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no="P4001"))
    db.commit()
    db.refresh(user)
    return user


def test_micro_assessment_lifecycle_and_student_isolation(client, world, db, competitive_catalog, fake_ai_service):
    faculty = world["faculty"]
    other = world["faculty_b"]
    student = _student(db, world["inst_a"].id)
    outsider = world["student_b"]
    if db.get(FacultyProfile, faculty.id) is None:
        db.add(FacultyProfile(user_id=faculty.id, institution_id=faculty.institution_id))
        db.commit()

    created = client.post(
        "/v1/faculty/micro-assessments",
        json={"title": "Biology check", "subject": "Biology", "chapter": "Genetics", "duration": 10},
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    assessment_id = created.json()["assessment"]["id"]
    assert created.json()["assessment"]["lifecycleStatus"] == "draft"

    hidden = client.get("/v1/student/micro-assessments", headers=auth_header(student)).json()
    assert hidden["items"] == []

    gen = client.post(
        f"/v1/faculty/micro-assessments/{assessment_id}/generate",
        json={
            "questionCount": 2,
            "domain": "Competitive",
            "examFamily": "NEET",
            "subject": "Biology",
            "chapter": "Genetics",
        },
        headers=auth_header(faculty),
    )
    assert gen.status_code == 200, gen.text
    assert gen.json()["ok"] is True
    generation_id = gen.json()["generationId"]

    # The real agent writes asynchronously; simulate completion, settle, then
    # read the assessment back so links are materialised.
    fake_ai_service["write_output"]()
    from test.conftest import settle_generation
    settled = settle_generation(client, faculty, generation_id)
    assert settled["status"] == "READY"
    detail = client.get(f"/v1/faculty/micro-assessments/{assessment_id}", headers=auth_header(faculty))
    assert detail.status_code == 200, detail.text
    questions = detail.json()["assessment"]["questions"]
    assert len(questions) == 2
    assert all(q.get("id") for q in questions)

    forbidden = client.get(f"/v1/faculty/micro-assessments/{assessment_id}", headers=auth_header(other))
    assert forbidden.status_code in {403, 404}

    assigned = client.post(
        f"/v1/faculty/micro-assessments/{assessment_id}/assign",
        json={"studentIds": [student.id]},
        headers=auth_header(faculty),
    )
    assert assigned.status_code == 200, assigned.text
    sent = client.post(f"/v1/faculty/micro-assessments/{assessment_id}/send", json={}, headers=auth_header(faculty))
    assert sent.status_code == 200, sent.text
    assert sent.json()["assessment"]["lifecycleStatus"] == "published"

    listing = client.get("/v1/student/micro-assessments", headers=auth_header(student)).json()
    assert any(item["id"] == assessment_id for item in listing["items"])

    outsider_list = client.get("/v1/student/micro-assessments", headers=auth_header(outsider)).json()
    assert all(item["id"] != assessment_id for item in outsider_list["items"])

    detail = client.get(f"/v1/student/micro-assessments/{assessment_id}", headers=auth_header(student))
    assert detail.status_code == 200, detail.text
    questions = detail.json()["assessment"]["questions"]
    assert questions
    blob = str(questions)
    assert "correctAnswer" not in blob
    assert "correct_answer" not in blob

    qid = questions[0]["id"]
    option = (questions[0].get("options") or ["A"])[0]
    submit = client.post(
        f"/v1/student/micro-assessments/{assessment_id}/attempts",
        json={"answers": {qid: option}},
        headers=auth_header(student),
    )
    assert submit.status_code == 200, submit.text
    scoring = submit.json()["attempt"]["scoring"]
    assert "percentage" in scoring
    assert "score" in scoring

    analytics = client.get(f"/v1/faculty/micro-assessments/{assessment_id}/analytics", headers=auth_header(faculty))
    assert analytics.status_code == 200
    assert analytics.json()["submitted"] == 1


def test_draft_assignment_not_visible_until_publish(client, world, db):
    faculty = world["faculty"]
    student = _student(db, world["inst_a"].id)
    course = db.get(Course, "c_p4_asg")
    if course is None:
        course = Course(id="c_p4_asg", institution_id=world["inst_a"].id, code="CS801P4", name="Compilers", credits=4)
        db.add(course)
        db.add(Enrollment(student_id=student.id, course_id=course.id, status="active"))
        db.commit()

    created = client.post(
        "/v1/faculty/assignments",
        json={"title": "Hidden draft", "courseId": course.id, "maxMarks": 10, "status": "draft"},
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    assignment_id = created.json()["assignment"]["id"]
    row = db.get(Assignment, assignment_id)
    assert row.status == "draft"

    visible = client.get("/v1/student/assignments", headers=auth_header(student)).json()
    assert all(item["id"] != assignment_id for item in visible["items"])

    published = client.post(f"/v1/faculty/assignments/{assignment_id}/publish", headers=auth_header(faculty))
    assert published.status_code == 200, published.text
    after = client.get("/v1/student/assignments", headers=auth_header(student)).json()
    assert any(item["id"] == assignment_id for item in after["items"])


def test_studio_edit_persists_version(client, world, db, competitive_catalog, fake_ai_service):
    faculty = world["faculty"]
    if db.get(FacultyProfile, faculty.id) is None:
        db.add(FacultyProfile(user_id=faculty.id, institution_id=faculty.institution_id))
        db.commit()
    generated = client.post(
        "/v1/faculty/question-studio/generate",
        json={
            "settings": {
                "count": 1,
                "domain": "Competitive",
                "examFamily": "NEET",
                "subject": "Biology",
                "chapter": "All chapters",
                "topic": "All topics",
                "difficulty": "Easy",
                "qType": "MCQ",
            }
        },
        headers=auth_header(faculty),
    )
    assert generated.status_code == 200, generated.text
    generated_id = generated.json()["session"]["generationId"]
    fake_ai_service["write_output"]()
    from test.conftest import settle_generation
    settled = settle_generation(client, faculty, generated_id)
    assert settled["status"] == "READY"
    session_res = client.get(
        f"/v1/faculty/question-studio/sessions/{generated.json()['session']['studioSessionId']}",
        headers=auth_header(faculty),
    )
    assert session_res.status_code == 200
    session = session_res.json()["session"]
    qid = session["questions"][0]["id"]
    edited = client.post(
        f"/v1/faculty/question-studio/sessions/{session['studioSessionId']}/questions/{qid}/edit",
        json={"question": "Edited stem from Phase 4", "options": ["A", "B", "C", "D"], "correctAnswer": 1},
        headers=auth_header(faculty),
    )
    assert edited.status_code == 200, edited.text
    assert "Edited stem from Phase 4" in edited.json()["question"]["question"]
    rejected = client.post(
        f"/v1/faculty/question-studio/sessions/{session['studioSessionId']}/questions/{qid}/reject",
        headers=auth_header(faculty),
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["rejected"] is True


def test_lecture_timetable_research_and_reports(client, world, db):
    faculty = world["faculty"]
    if db.get(FacultyProfile, faculty.id) is None:
        db.add(FacultyProfile(user_id=faculty.id, institution_id=faculty.institution_id))
        db.commit()

    empty_lessons = client.get("/v1/faculty/lecture-planner", headers=auth_header(faculty)).json()
    assert empty_lessons["items"] == []
    lesson = client.post(
        "/v1/faculty/lecture-planner",
        json={"topic": "Deadlocks", "week": "W3", "course": "OS", "duration": 50},
        headers=auth_header(faculty),
    )
    assert lesson.status_code == 200, lesson.text
    listed = client.get("/v1/faculty/lecture-planner", headers=auth_header(faculty)).json()
    assert any(item["topic"] == "Deadlocks" for item in listed["items"])

    slot = client.post(
        "/v1/faculty/timetable",
        json={"day": "Monday", "time": "09:00-10:00", "topic": "OS lecture", "room": "A1"},
        headers=auth_header(faculty),
    )
    assert slot.status_code == 200, slot.text
    timetable = client.get("/v1/faculty/timetable", headers=auth_header(faculty)).json()
    monday = next(day for day in timetable["items"] if day["day"] == "Monday")
    assert monday["slots"]

    pub = client.post(
        "/v1/faculty/research",
        json={"title": "Scheduling survey", "venue": "EduX Letters", "year": 2026},
        headers=auth_header(faculty),
    )
    assert pub.status_code == 200, pub.text
    research = client.get("/v1/faculty/research", headers=auth_header(faculty)).json()
    assert research["summary"]["publications"] >= 1
    assert any(item["title"] == "Scheduling survey" for item in research["publications"])

    report = client.post(
        "/v1/faculty/reports",
        json={"title": "Term health", "format": "PDF", "scope": "All courses", "period": "Current"},
        headers=auth_header(faculty),
    )
    assert report.status_code == 200, report.text
    body = report.json()
    assert body["ok"] is True
    assert body["report"]["generationStatus"] == "READY"
    download = client.get(f"/v1/faculty/reports/{body['report']['id']}/download", headers=auth_header(faculty))
    assert download.status_code == 200
    assert download.content[:4] == b"%PDF"

    other = client.get("/v1/faculty/reports", headers=auth_header(world["faculty_b"])).json()
    assert all(item["id"] != body["report"]["id"] for item in other["items"])


def test_content_analysis_fails_without_text(client, world, db):
    faculty = world["faculty"]
    uploaded = client.post(
        "/v1/faculty/question-studio/sources/upload",
        json={"title": "Empty PDF", "domain": "University"},
        headers=auth_header(faculty),
    )
    assert uploaded.status_code == 200, uploaded.text
    source_id = uploaded.json()["source"]["sourceId"]
    analyzed = client.post(f"/v1/faculty/question-studio/sources/{source_id}/analyze", json={}, headers=auth_header(faculty))
    assert analyzed.status_code == 200, analyzed.text
    payload = analyzed.json()
    assert payload["ok"] is False
    assert payload["status"] == "FAILED"

    with_text = client.post(
        "/v1/faculty/question-studio/sources/upload",
        json={"title": "Graphs notes", "domain": "University", "text": "Breadth first search visits neighbours. Depth first search uses a stack. Graphs and trees."},
        headers=auth_header(faculty),
    )
    sid = with_text.json()["source"]["sourceId"]
    ok = client.post(f"/v1/faculty/question-studio/sources/{sid}/analyze", json={}, headers=auth_header(faculty))
    assert ok.status_code == 200
    assert ok.json()["ok"] is True
    assert ok.json()["status"] == "ANALYZED"
    assert ok.json()["analysis"]["topics"]


def test_intervention_persists_sql(client, world, db):
    faculty = world["faculty"]
    student = _student(db, world["inst_a"].id)
    if db.get(FacultyProfile, faculty.id) is None:
        db.add(FacultyProfile(user_id=faculty.id, institution_id=faculty.institution_id))
        db.commit()
    created = client.post(
        f"/v1/faculty/students/{student.id}/interventions",
        json={"subject": "OS", "chapter": "Deadlocks", "notes": "Phase 4 SQL"},
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    iv = created.json()["intervention"]
    assert iv["persisted"] is True
    assert iv["source"] == "sql"
    fetched = client.get(f"/v1/faculty/interventions/{iv['id']}", headers=auth_header(faculty))
    assert fetched.status_code == 200
    assert fetched.json()["intervention"]["id"] == iv["id"]
    listing = client.get("/v1/faculty/interventions", headers=auth_header(faculty)).json()
    assert any(item["id"] == iv["id"] for item in listing["items"])
