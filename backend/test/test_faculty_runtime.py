"""Phase 2 faculty runtime — sqlite verification. Does not claim live PostgreSQL."""

from __future__ import annotations

from app.core.security import hash_password
from app.models.catalog import Course
from app.models.identity import Institution, Role, User, UserRole
from app.models.people import Enrollment, FacultyProfile, StudentProfile
from app.models.teaching import Assignment, AssignmentSubmission, AttendanceRecord

from test.conftest import auth_header


FORBIDDEN = ("Meera", "Aarav", "MIT-P", "u_fac_001", "Dr. Meera")


def _blob(value) -> str:
    return str(value)


def test_faculty_identity_from_authenticated_user(client, world):
    faculty = world["faculty"]
    res = client.get("/v1/faculty-intelligence/summary", headers=auth_header(faculty))
    assert res.status_code == 200, res.text
    snap = res.json()
    profile = snap["profile"]
    assert profile["id"] == faculty.id
    assert profile["fullName"] == "Fac A"
    assert profile["email"] == "faculty.a@test.edu"
    settings = client.get("/v1/faculty/settings", headers=auth_header(faculty)).json()
    assert settings["profile"]["name"] == "Fac A"
    assert settings["profile"]["email"] == faculty.email
    text = _blob(snap) + _blob(settings)
    for token in FORBIDDEN:
        assert token not in text


def test_empty_faculty_directory_and_pyq_stay_empty(client, db):
    inst = Institution(id="inst_empty_p2", slug="empty-college-p2", name="Empty College", academic_year="2026-27")
    db.add(inst)
    db.flush()
    user = User(
        id="u_fac_empty_p2",
        institution_id=inst.id,
        email="empty.faculty@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Empty Faculty",
        status="active",
        legacy_role="faculty",
    )
    db.add(user)
    role = Role(institution_id=inst.id, code="faculty", name="Faculty")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst.id))
    db.commit()

    headers = auth_header(user)
    intel = client.get("/v1/faculty-intelligence/summary", headers=headers).json()
    assert intel["profile"]["fullName"] == "Empty Faculty"
    assert intel["derived"]["students"]["students"] == []
    assert intel["derived"]["assessment"]["questionStats"]["total"] == 0
    assert intel["derived"]["dashboard"]["todaySchedule"] == []
    assert intel["datasets"]["teachingSchedule"] == []
    assert intel["datasets"]["weeklyTeachingHours"] == 0
    assert intel["derived"]["teachingProductivity"]["hoursSaved"] == 0
    pyq = client.get("/v1/faculty/pyq-analysis", headers=headers).json()
    assert pyq["overview"]["totalQuestions"] == 0
    assert pyq["overview"]["yearsCovered"] == []
    courses = client.get("/v1/faculty/courses", headers=headers).json()
    assert courses["items"] == []
    announcements = client.get("/v1/faculty/announcements", headers=headers).json()
    assert announcements["items"] == []
    studio = client.get("/v1/faculty/question-studio/sources", headers=headers).json()
    assert studio["items"] == []
    text = _blob(intel) + _blob(pyq)
    for token in FORBIDDEN:
        assert token not in text


def test_cross_institution_isolation(client, world):
    faculty = world["faculty"]
    faculty_b = world["faculty_b"]
    bank_a = client.get("/v1/faculty/question-bank", headers=auth_header(faculty)).json()
    bank_b = client.get("/v1/faculty/question-bank", headers=auth_header(faculty_b)).json()
    ids_a = {q["id"] for q in bank_a["questions"]}
    ids_b = {q["id"] for q in bank_b["questions"]}
    assert "q_other_inst" not in ids_a
    assert "q_uni_1" not in ids_b
    assert "q_other_inst" in ids_b
    students_a = client.get("/v1/faculty/students", headers=auth_header(faculty)).json()
    assert all(s["id"] != world["student_b"].id for s in students_a["students"])
    forbidden = client.get(f"/v1/faculty/students/{world['student_b'].id}/360", headers=auth_header(faculty))
    assert forbidden.status_code in {403, 404}


def test_student_360_is_selected_student_not_aarav(client, world):
    faculty = world["faculty"]
    student = world["student"]
    res = client.get(f"/v1/faculty/students/{student.id}/360", headers=auth_header(faculty))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["student"]["id"] == student.id
    assert body["student"]["name"] == "Stu A"
    text = _blob(body)
    assert "Aarav" not in text
    assert "Meera" not in text


def test_question_generation_persists_and_bank_grows(client, world, competitive_catalog, fake_ai_service):
    """Generate via the REAL deployed-agent flow and verify bank growth."""
    from test.conftest import settle_generation

    faculty = world["faculty"]
    before = client.get("/v1/faculty/question-bank", headers=auth_header(faculty)).json()["total"]
    gen = client.post(
        "/v1/faculty/question-bank/generate",
        json={
            "domain": "Competitive",
            "examFamily": "NEET",
            "questionCount": 3,
            "subject": "Biology",
            "chapter": "All chapters",
            "difficulty": "Medium",
        },
        headers=auth_header(faculty),
    )
    assert gen.status_code == 200, gen.text
    payload = gen.json()
    assert payload["status"] == "PROCESSING"
    fake_ai_service["write_output"]()
    settled = settle_generation(client, faculty, payload["generationId"])
    assert settled["status"] == "READY"
    assert settled["generatedCount"] == 3
    questions = client.get(
        f"/v1/faculty/question-bank/generations/{payload['generationId']}/questions",
        headers=auth_header(faculty),
    ).json()
    assert len(questions["questions"]) == 3
    assert all(q["source"] == "ai" for q in questions["questions"])
    after = client.get("/v1/faculty/question-bank", headers=auth_header(faculty)).json()
    assert after["total"] >= before + 3


def test_incomplete_paper_cannot_publish_or_share(client, world):
    faculty = world["faculty"]
    created = client.post(
        "/v1/faculty/paper-generator/papers",
        json={
            "title": "Incomplete Runtime Paper",
            "domain": "University",
            "selectedQuestionIds": ["q_uni_1"],
            "requestedQuestionCount": 4,
            "duration": 60,
        },
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    paper = created.json()["paper"]
    assert paper["generationStatus"] == "GENERATING"
    assert paper["requestedQuestionCount"] == 4
    assert paper["validQuestionCount"] == 1
    assert paper["ready"] is False
    pub = client.post(f"/v1/faculty/paper-generator/papers/{paper['id']}/publish", headers=auth_header(faculty))
    assert pub.status_code == 400
    share = client.post(
        f"/v1/faculty/paper-generator/papers/{paper['id']}/share",
        json={"audience": "batch"},
        headers=auth_header(faculty),
    )
    assert share.status_code == 400


def test_ready_paper_share_publishes_for_students(client, world):
    faculty = world["faculty"]
    student = world["student"]
    created = client.post(
        "/v1/faculty/paper-generator/papers",
        json={
            "title": "Ready Runtime Paper",
            "domain": "University",
            "selectedQuestionIds": ["q_uni_1", "q_uni_2"],
            "requestedQuestionCount": 2,
            "duration": 45,
        },
        headers=auth_header(faculty),
    )
    paper = created.json()["paper"]
    assert paper["generationStatus"] == "READY"
    assert paper["validQuestionCount"] == 2
    share = client.post(
        f"/v1/faculty/paper-generator/papers/{paper['id']}/share",
        json={"audience": "Entire class"},
        headers=auth_header(faculty),
    )
    assert share.status_code == 200, share.text
    assert share.json()["share"]["status"] == "Published"
    listing = client.get("/v1/student/exams", headers=auth_header(student)).json()
    assert any(item["id"] == paper["id"] for item in listing["items"])


def _phase2_student(db, inst_id: str):
    user = User(
        id="u_stu_p2",
        institution_id=inst_id,
        email="stu.p2@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Stu Phase2",
        status="active",
        legacy_role="student",
    )
    if db.get(User, user.id) is None:
        db.add(user)
        role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "student").first()
        if role is None:
            role = Role(institution_id=inst_id, code="student", name="Student")
            db.add(role)
            db.flush()
        db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst_id))
        db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no="P2001"))
        db.flush()
    return db.get(User, "u_stu_p2")


def test_assignment_create_submit_grade_roundtrip(client, world, db):
    faculty = world["faculty"]
    student = _phase2_student(db, world["inst_a"].id)
    course = Course(id="c_os_p2", institution_id=world["inst_a"].id, code="CS701P2", name="Operating Systems", credits=4, semester_no=6)
    db.add(course)
    db.add(Enrollment(student_id=student.id, course_id=course.id, status="active"))
    db.commit()

    created = client.post(
        "/v1/faculty/assignments",
        json={"title": "OS Lab 1", "courseId": course.id, "maxMarks": 20},
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    assignment_id = created.json()["assignment"]["id"]
    row = db.get(Assignment, assignment_id)
    assert row is not None
    assert row.title == "OS Lab 1"
    assert row.institution_id == world["inst_a"].id

    visible = client.get("/v1/student/assignments", headers=auth_header(student)).json()
    assert any(item["id"] == assignment_id for item in visible["items"])

    submitted = client.post(
        f"/v1/student/assignments/{assignment_id}/submit",
        json={"fileName": "lab1.pdf"},
        headers=auth_header(student),
    )
    assert submitted.status_code == 200, submitted.text

    graded = client.post(
        f"/v1/faculty/assignments/{assignment_id}/grade",
        json={"studentId": student.id, "marks": 18, "feedback": "Solid work"},
        headers=auth_header(faculty),
    )
    assert graded.status_code == 200, graded.text
    sub = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id,
        AssignmentSubmission.student_id == student.id,
    ).one()
    assert sub.marks == 18
    assert sub.status == "graded"

    after = client.get("/v1/student/assignments", headers=auth_header(student)).json()
    items = after["items"] if isinstance(after, dict) else after
    mine = next(item for item in items if item["id"] == assignment_id)
    assert mine["score"] == 18
    assert mine["status"] == "Graded"


def test_attendance_mark_persists(client, world, db):
    faculty = world["faculty"]
    student = _phase2_student(db, world["inst_a"].id)
    course = db.get(Course, "c_os_p2")
    if course is None:
        course = Course(id="c_os_att_p2", institution_id=world["inst_a"].id, code="CS702P2", name="Networks", credits=3)
        db.add(course)
        db.commit()
    session = client.post(
        "/v1/faculty/attendance",
        json={"courseId": course.id, "topic": "Lecture 1"},
        headers=auth_header(faculty),
    )
    assert session.status_code == 200, session.text
    session_id = session.json()["session"]["id"]
    marked = client.post(
        f"/v1/faculty/attendance/{session_id}/mark",
        json={"records": [{"studentId": student.id, "mark": "present"}]},
        headers=auth_header(faculty),
    )
    assert marked.status_code == 200, marked.text
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student.id,
    ).one()
    assert record.mark == "present"
    listing = client.get("/v1/faculty/attendance", headers=auth_header(faculty)).json()
    assert any(row["id"] == session_id for row in listing["classes"])


def test_studio_generate_persists_questions(client, world, db, competitive_catalog, fake_ai_service):
    from test.conftest import settle_generation

    faculty = world["faculty"]
    if db.get(FacultyProfile, faculty.id) is None:
        db.add(FacultyProfile(user_id=faculty.id, institution_id=faculty.institution_id))
        db.commit()
    res = client.post(
        "/v1/faculty/question-studio/generate",
        json={
            "settings": {
                "count": 2,
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
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["ok"] is True
    assert body["session"]["generationId"]

    # Async real-agent contract: questions become available after the agent
    # finishes. Simulate completion, settle, then read the session back.
    fake_ai_service["write_output"]()
    settled = settle_generation(client, faculty, body["session"]["generationId"])
    assert settled["status"] == "READY"
    session_res = client.get(
        f"/v1/faculty/question-studio/sessions/{body['session']['studioSessionId']}",
        headers=auth_header(faculty),
    )
    assert session_res.status_code == 200
    questions = session_res.json()["session"]["questions"]
    assert len(questions) == 2
    assert all(q.get("id") for q in questions)


def test_greeting_follows_institution_clock_not_utc():
    from datetime import datetime, timezone

    from app.services.faculty_runtime import day_period, local_now

    # 07:37 UTC is 13:07 in Asia/Kolkata — afternoon locally, morning in UTC.
    utc = datetime(2026, 10, 1, 7, 37, tzinfo=timezone.utc)
    local = local_now("Asia/Kolkata", now=utc)
    assert local.hour == 13
    assert local.minute == 7
    assert day_period(local.hour) == "Afternoon"
    assert day_period(11) == "Morning"
    assert day_period(12) == "Afternoon"
    assert day_period(16) == "Afternoon"
    assert day_period(17) == "Evening"


def test_intelligence_has_contract_keys_without_spa_history(client, world):
    snap = client.get("/v1/faculty-intelligence/summary", headers=auth_header(world["faculty"])).json()
    derived = snap["derived"]
    for key in (
        "teachingHealth",
        "teachingProductivity",
        "attendanceIntelligence",
        "assignmentAnalytics",
        "engagementAnalytics",
        "teachingInsights",
        "attentionStudents",
        "teachingTimeline",
        "evaluationProgress",
        "dashboard",
    ):
        assert key in derived
    assert "successCenter" in derived["dashboard"]
    assert "aiBrief" in derived["dashboard"]
    assert derived["dashboard"]["aiBrief"]["greeting"].startswith("Good")
    assert "Fac" in derived["dashboard"]["aiBrief"]["greeting"]
    text = _blob(snap)
    assert "Meera" not in text
    assert "Aarav" not in text


def test_attendance_snapshot_ignores_unmarked_sessions():
    from app.services.live_catalog import attendance_snapshot

    snap = attendance_snapshot(
        [
            {"course": "CS501", "date": "2026-07-28", "total": 0, "pct": 0},
            {"course": "CS501", "date": "2026-07-30", "total": 2, "pct": 100},
            {"course": "CS503", "date": "2026-07-31", "total": 0, "pct": 0},
            {"course": "CS501", "date": "2026-08-01", "total": 2, "pct": 100},
        ]
    )
    assert snap["avgAttendance"] == 100
    assert snap["delta"] == 0
    assert [row["pct"] for row in snap["weeklyTrend"]] == [100, 100]
    assert snap["lowestClass"] == "CS501"


def test_question_coverage_is_syllabus_share(db, app):
    from app.models.assessment import Question
    from app.models.catalog import Chapter, Subject, Topic
    from app.services.faculty_runtime import syllabus_question_coverage

    inst = Institution(id="inst_cov", slug="cov", name="Coverage College", academic_year="2026-27")
    db.add(inst)
    db.flush()
    subject = Subject(id="sub_cov", institution_id=inst.id, code="PHY", name="Physics", exam_mode="university")
    db.add(subject)
    db.flush()
    chapter = Chapter(id="ch_cov", subject_id=subject.id, name="Mechanics")
    db.add(chapter)
    db.flush()
    db.add_all(
        [
            Topic(id="top_a", chapter_id=chapter.id, name="Kinematics"),
            Topic(id="top_b", chapter_id=chapter.id, name="Dynamics"),
        ]
    )
    db.flush()
    db.add(
        Question(
            id="q_cov",
            institution_id=inst.id,
            exam_mode="university",
            subject_id=subject.id,
            chapter_id=chapter.id,
            topic_id="top_a",
            stem="A body starts from rest.",
            correct_answer="0",
        )
    )
    db.commit()
    # One of two syllabus topics has a question. Bank size must not read as 100%.
    assert syllabus_question_coverage(db, inst.id) == 50.0


def test_engagement_blend_uses_only_signals_that_exist():
    from app.services.faculty_runtime import blend_engagement

    score = blend_engagement(
        attendance=100,
        assignment_completion=0,
        participation=80,
        has_attendance=True,
        has_assignments=True,
        has_students=True,
    )
    assert score == 66.0
    attendance_only = blend_engagement(
        attendance=100,
        assignment_completion=0,
        participation=0,
        has_attendance=True,
        has_assignments=False,
        has_students=False,
    )
    assert attendance_only == 100.0
