"""Phase 1 student runtime — SQL-only snapshot. Isolated sqlite via conftest."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from app.models.catalog import Course
from app.models.intelligence import StudentDnaSnapshot
from app.models.people import Enrollment
from app.models.teaching import Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession

from test.conftest import auth_header
from test.test_examination_core import _create_paper


AARAV_MARKERS = ("Aarav", "8.72", "92.4", "Meera", "Ishita", "MIT-P")


def _blob(value) -> str:
    return str(value)


def test_empty_student_snapshot_is_not_aarav(client, world):
    student = world["student_b"]
    headers = auth_header(student)
    summary = client.get("/v1/intelligence/summary", headers=headers)
    assert summary.status_code == 200, summary.text
    body = summary.json()
    text = _blob(body)
    for marker in AARAV_MARKERS:
        assert marker not in text
    assert body["profile"]["id"] == student.id
    assert body["profile"]["cgpa"] is None
    assert body["datasets"]["attendance"]["overall"] == 0
    assert body["datasets"]["assignments"] == []
    assert body["datasets"]["courses"] == []
    assert body["derived"]["academicHealth"]["grade"] == "Building"
    assert body["derived"]["portfolioWorkspace"]["portfolio"]["profiles"]["github"] == ""
    dna_ws = body["derived"]["dnaWorkspace"]
    assert dna_ws["learningBehaviour"]["attendancePattern"]["overall"] == 0
    assert isinstance(dna_ws["mistakes"], dict)
    assert dna_ws["mistakes"]["items"] == []
    assert dna_ws["executive"]["overallRating"] == body["derived"]["academicHealth"]["score"]

    attendance = client.get("/v1/student/attendance", headers=headers).json()
    assert attendance["overall"] == 0
    assert attendance["total"] == 0
    assert attendance["bySubject"] == []

    assignments = client.get("/v1/student/assignments", headers=headers).json()
    assert assignments["items"] == []

    forum = client.get("/v1/student/forum", headers=headers).json()
    assert forum["topics"] == []
    assert "BACKEND GAP" in forum.get("gap", "")

    admit = client.get("/v1/student/admit-card", headers=headers).json()
    assert admit["available"] is False

    analysis = client.get("/v1/student/exam-analysis/options", headers=headers).json()
    items = analysis if isinstance(analysis, list) else analysis.get("items") or []
    assert items == []

    threads = client.get("/v1/ai/tutor/threads", headers=headers).json()
    assert threads["threads"] == []

    path = client.get("/v1/ai/learning-path", headers=headers).json()
    assert path["milestones"] == []
    assert path["nextSteps"] == []

    mocks = client.get("/v1/student/mock-tests", headers=headers).json()
    assert mocks["items"] == []


def test_unpublished_paper_is_hidden_from_student(client, world):
    faculty = world["faculty"]
    student = world["student"]
    created = _create_paper(
        client,
        faculty,
        title="Draft Uni Hidden",
        domain="University",
        exam_family=None,
        question_ids=["q_uni_1"],
    )
    assert created.status_code == 200, created.text
    paper_id = created.json()["paper"]["id"]
    listing = client.get("/v1/student/exams", headers=auth_header(student)).json()
    assert all(item["id"] != paper_id for item in listing.get("items") or [])
    missing = client.get(f"/v1/student/exams/{paper_id}", headers=auth_header(student))
    assert missing.status_code == 404


def test_assignment_enrolled_only_submit_and_cgpa(client, world, db):
    student = world["student"]
    other = world["student_b"]
    course = Course(id="c_runtime_dsa", institution_id=world["inst_a"].id, code="CS601", name="Runtime DSA", credits=4)
    other_course = Course(id="c_runtime_hidden", institution_id=world["inst_a"].id, code="CS602", name="Hidden Course", credits=3)
    db.add_all([course, other_course])
    db.flush()
    db.add(Enrollment(id="en_runtime_dsa", student_id=student.id, course_id=course.id, status="active"))
    due = datetime.now(timezone.utc) + timedelta(days=3)
    assignment = Assignment(
        id="as_runtime_1",
        institution_id=world["inst_a"].id,
        course_id=course.id,
        title="Graph lab",
        body="Submit the lab notebook",
        due_at=due,
        max_marks=20,
    )
    hidden = Assignment(
        id="as_runtime_hidden",
        institution_id=world["inst_a"].id,
        course_id=other_course.id,
        title="Should not appear",
        due_at=due,
        max_marks=10,
    )
    db.add_all([assignment, hidden])
    db.commit()

    headers = auth_header(student)
    listing = client.get("/v1/student/assignments", headers=headers).json()["items"]
    ids = {row["id"] for row in listing}
    assert "as_runtime_1" in ids
    assert "as_runtime_hidden" not in ids
    assert all(row["status"] == "Pending" for row in listing if row["id"] == "as_runtime_1")

    other_list = client.get("/v1/student/assignments", headers=auth_header(other)).json()["items"]
    assert all(row["id"] != "as_runtime_1" for row in other_list)

    submitted = client.post(
        "/v1/student/assignments/as_runtime_1/submit",
        json={"fileName": "lab.pdf", "note": "first draft"},
        headers=headers,
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["submission"]["status"] == "Submitted"

    after = client.get("/v1/student/assignments", headers=headers).json()["items"]
    row = next(item for item in after if item["id"] == "as_runtime_1")
    assert row["status"] == "Submitted"

    sub = db.query(AssignmentSubmission).filter_by(assignment_id="as_runtime_1", student_id=student.id).one()
    sub.marks = 18
    sub.status = "graded"
    db.commit()

    summary = client.get("/v1/intelligence/summary", headers=headers).json()
    assert summary["profile"]["cgpa"] is not None
    assert summary["profile"]["cgpa"] >= 9.0
    graded = next(item for item in summary["datasets"]["assignments"] if item["id"] == "as_runtime_1")
    assert graded["status"] == "Graded"
    assert graded["score"] == 18


def test_attendance_from_records(client, world, db):
    student = world["student"]
    if db.get(Course, "c_runtime_dsa") is None:
        db.add(Course(id="c_runtime_dsa", institution_id=world["inst_a"].id, code="CS601", name="Runtime DSA", credits=4))
        db.flush()
    if db.query(Enrollment).filter_by(student_id=student.id, course_id="c_runtime_dsa").first() is None:
        db.add(Enrollment(id="en_runtime_dsa_att", student_id=student.id, course_id="c_runtime_dsa", status="active"))
    session = AttendanceSession(
        id="att_sess_runtime",
        course_id="c_runtime_dsa",
        session_date=date(2026, 8, 10),
        topic="Lecture 1",
    )
    db.add(session)
    db.flush()
    db.add(AttendanceRecord(session_id=session.id, student_id=student.id, mark="present"))
    db.commit()

    payload = client.get("/v1/student/attendance", headers=auth_header(student)).json()
    assert payload["total"] == 1
    assert payload["present"] == 1
    assert payload["overall"] == 100.0
    assert payload["bySubject"][0]["subjectCode"] == "CS601"


def test_practice_questions_come_from_bank(client, world, db):
    student = world["student"]
    if db.get(Course, "c_runtime_dsa") is None:
        db.add(Course(id="c_runtime_dsa", institution_id=world["inst_a"].id, code="CS601", name="Runtime DSA", credits=4))
        db.flush()
    if db.query(Enrollment).filter_by(student_id=student.id, course_id="c_runtime_dsa").first() is None:
        db.add(Enrollment(id="en_runtime_dsa_pr", student_id=student.id, course_id="c_runtime_dsa", status="active"))
    overdue = Assignment(
        id="as_runtime_overdue",
        institution_id=world["inst_a"].id,
        course_id="c_runtime_dsa",
        title="Late lab",
        due_at=datetime.now(timezone.utc) - timedelta(days=2),
        max_marks=10,
    )
    db.add(overdue)
    db.commit()

    headers = auth_header(student)
    interventions = client.get("/v1/student/interventions", headers=headers).json()["items"]
    overdue_iv = next(row for row in interventions if row["id"] == "int_as_as_runtime_overdue")
    practice = client.get(f"/v1/student/interventions/{overdue_iv['id']}/practice", headers=headers)
    assert practice.status_code == 200, practice.text
    questions = practice.json()["questions"]
    assert questions
    ids = {q["id"] for q in questions}
    assert "q_other_inst" not in ids
    assert questions[0]["source"] == "question-bank"


def test_exam_submit_rebuilds_dna_and_analysis_is_live(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    created = _create_paper(
        client,
        faculty,
        title="Uni DNA Quiz",
        domain="University",
        exam_family=None,
        question_ids=["q_uni_1", "q_uni_2"],
    )
    paper_id = created.json()["paper"]["id"]
    client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
    res = client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "questionAttempts": [
                {"questionId": "q_uni_1", "response": {"selected": 0}},
                {"questionId": "q_uni_2", "response": {"selected": 1}},
            ],
        },
        headers=auth_header(student),
    )
    assert res.status_code == 200, res.text
    attempt_id = res.json()["id"]
    snapshots = db.query(StudentDnaSnapshot).filter_by(student_id=student.id).all()
    assert snapshots

    options = client.get("/v1/student/exam-analysis/options", headers=auth_header(student)).json()
    items = options if isinstance(options, list) else options.get("items") or []
    assert any(row["id"] == attempt_id for row in items)
    assert all(row.get("sample") is False for row in items)

    analysis = client.get(f"/v1/student/exam-analysis/{attempt_id}", headers=auth_header(student))
    assert analysis.status_code == 200
    missing = client.get("/v1/student/exam-analysis/not-a-real-attempt", headers=auth_header(student))
    assert missing.status_code == 404

    summary = client.get("/v1/intelligence/summary", headers=auth_header(student)).json()
    assert "Aarav" not in _blob(summary)
    assert summary["profile"]["cgpa"] is not None


def test_cross_student_exam_analysis_isolation(client, world):
    faculty = world["faculty"]
    student_a = world["student"]
    student_b = world["student_b"]
    created = _create_paper(
        client,
        faculty,
        title="Isolation Uni Quiz",
        domain="University",
        exam_family=None,
        question_ids=["q_uni_1"],
    )
    assert created.status_code == 200, created.text
    paper_id = created.json()["paper"]["id"]
    client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
    res = client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student_a),
    )
    assert res.status_code == 200, res.text
    attempt_id = res.json()["id"]

    b_opts = client.get("/v1/student/exam-analysis/options", headers=auth_header(student_b)).json()
    b_items = b_opts if isinstance(b_opts, list) else b_opts.get("items") or []
    assert all(row.get("id") != attempt_id for row in b_items)

    stolen = client.get(f"/v1/student/exam-analysis/{attempt_id}", headers=auth_header(student_b))
    assert stolen.status_code == 404

    summary_b = client.get("/v1/intelligence/summary", headers=auth_header(student_b)).json()
    assert summary_b["profile"]["id"] == student_b.id
    assert summary_b["profile"]["cgpa"] is None
    assert summary_b["datasets"]["assignments"] == []
    for marker in AARAV_MARKERS:
        assert marker not in _blob(summary_b)

    summary_a = client.get("/v1/intelligence/summary", headers=auth_header(student_a)).json()
    assert summary_a["profile"]["id"] == student_a.id
    assert "Aarav" not in _blob(summary_a)

    a_opts = client.get("/v1/student/exam-analysis/options", headers=auth_header(student_a)).json()
    a_items = a_opts if isinstance(a_opts, list) else a_opts.get("items") or []
    assert any(row.get("id") == attempt_id for row in a_items)


def test_practice_attempt_uses_authenticated_student(client, world, db):
    student = world["student"]
    other = world["student_b"]
    if db.get(Course, "c_runtime_dsa") is None:
        db.add(Course(id="c_runtime_dsa", institution_id=world["inst_a"].id, code="CS601", name="Runtime DSA", credits=4))
        db.flush()
    if db.query(Enrollment).filter_by(student_id=student.id, course_id="c_runtime_dsa").first() is None:
        db.add(Enrollment(id="en_runtime_dsa_pa", student_id=student.id, course_id="c_runtime_dsa", status="active"))
    overdue = Assignment(
        id="as_runtime_practice_post",
        institution_id=world["inst_a"].id,
        course_id="c_runtime_dsa",
        title="Late lab for practice POST",
        due_at=datetime.now(timezone.utc) - timedelta(days=2),
        max_marks=10,
    )
    db.add(overdue)
    db.commit()

    headers = auth_header(student)
    interventions = client.get("/v1/student/interventions", headers=headers).json()["items"]
    overdue_iv = next(row for row in interventions if row["id"] == "int_as_as_runtime_practice_post")
    posted = client.post(
        f"/v1/student/interventions/{overdue_iv['id']}/practice-attempts",
        json={"kind": "practice", "studentId": other.id, "score": 4, "maxScore": 8, "accuracy": 50},
        headers=headers,
    )
    assert posted.status_code == 200, posted.text
    body = posted.json()
    assert body["attempt"]["studentId"] == student.id
    assert body["attempt"]["studentId"] != other.id

    missing = client.post(
        f"/v1/student/interventions/{overdue_iv['id']}/practice-attempts",
        json={"kind": "practice"},
        headers=auth_header(other),
    )
    assert missing.status_code == 404
