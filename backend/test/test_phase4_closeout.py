"""Phase 4 close-out — remaining Faculty KV / mixed operational state.

Isolated sqlite only. Does not claim live PostgreSQL.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.models.ai import AiTrace
from app.models.assessment import PaperShare
from app.models.catalog import Course
from app.models.exams import ExamAttempt
from app.models.identity import Role, User, UserRole
from app.models.intelligence import StudentDnaSnapshot
from app.models.people import Enrollment, StudentProfile
from app.models.teaching import Assignment

from test.conftest import auth_header
from test.test_examination_core import _create_paper


def _student(db, inst_id: str, user_id: str, roll: str, name: str = "Closeout Stu"):
    existing = db.get(User, user_id)
    if existing:
        return existing
    user = User(
        id=user_id,
        institution_id=inst_id,
        email=f"{user_id}@test.edu",
        password_hash=hash_password("aurora123"),
        full_name=name,
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
    db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no=roll))
    db.commit()
    db.refresh(user)
    return user


def test_similar_issues_empty_without_exam_evidence(client, world):
    faculty = world["faculty_b"]
    payload = client.get("/v1/faculty/similar-issues", headers=auth_header(faculty)).json()
    assert payload["groups"] == []
    assert payload["count"] == 0
    blob = json.dumps(payload)
    assert "Graph Algorithms" not in blob
    assert "sig-01" not in blob
    listing = client.get("/v1/faculty/interventions", headers=auth_header(faculty)).json()
    assert listing["items"] == []


def test_similar_issues_from_dna_not_seeded_and_isolated(client, world, db):
    faculty = world["faculty"]
    other = world["faculty_b"]
    a = _student(db, world["inst_a"].id, "u_co_sig_a", "COA1", "Close A")
    b = _student(db, world["inst_a"].id, "u_co_sig_b", "COA2", "Close B")
    payload = json.dumps(
        {
            "chapters": [
                {"chapter": "Deadlocks", "subject": "OS", "accuracy": 42.0, "questions": 8, "avgTime": 91},
            ]
        }
    )
    db.add(StudentDnaSnapshot(student_id=a.id, exam_mode="university", exam_family=None, payload=payload))
    db.add(StudentDnaSnapshot(student_id=b.id, exam_mode="university", exam_family=None, payload=payload))
    db.commit()

    packed = client.get("/v1/faculty/similar-issues", headers=auth_header(faculty)).json()
    assert packed["count"] == 1
    group = packed["groups"][0]
    assert group["chapter"] == "Deadlocks"
    assert group["subject"] == "OS"
    assert group["studentCount"] == 2
    assert group["avgAccuracy"] == 42.0
    assert group["avgTime"] == 91.0
    assert "Graph Algorithms" not in json.dumps(packed)
    created = client.post(
        f"/v1/faculty/similar-issues/{group['id']}/interventions",
        json={"notes": "close-out persist"},
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    iv = created.json()["intervention"]
    assert iv["persisted"] is True
    assert iv["source"] == "sql"

    hidden = client.get("/v1/faculty/similar-issues", headers=auth_header(other)).json()
    assert hidden["groups"] == []
    stolen = client.get(f"/v1/faculty/interventions/{iv['id']}", headers=auth_header(other))
    assert stolen.status_code in {403, 404}


def test_practice_attempt_persists_exam_attempt(client, world, db):
    student = world["student"]
    other = world["student_b"]
    if db.get(Course, "c_closeout_dsa") is None:
        db.add(Course(id="c_closeout_dsa", institution_id=world["inst_a"].id, code="CS901", name="Closeout OS", credits=4))
        db.flush()
    if db.query(Enrollment).filter_by(student_id=student.id, course_id="c_closeout_dsa").first() is None:
        db.add(Enrollment(student_id=student.id, course_id="c_closeout_dsa", status="active"))
    overdue = Assignment(
        id="as_closeout_practice",
        institution_id=world["inst_a"].id,
        course_id="c_closeout_dsa",
        title="Late closeout lab",
        due_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc) - __import__("datetime").timedelta(days=2),
        max_marks=10,
        status="published",
    )
    db.add(overdue)
    db.commit()

    headers = auth_header(student)
    items = client.get("/v1/student/interventions", headers=headers).json()["items"]
    iv = next(row for row in items if row["id"] == "int_as_as_closeout_practice")
    posted = client.post(
        f"/v1/student/interventions/{iv['id']}/practice-attempts",
        json={
            "kind": "practice",
            "studentId": other.id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=headers,
    )
    assert posted.status_code == 200, posted.text
    body = posted.json()
    assert body["attempt"]["studentId"] == student.id
    attempt_id = body["attempt"]["id"]
    row = db.get(ExamAttempt, attempt_id)
    assert row is not None
    assert row.student_id == student.id
    assert row.attempt_kind == "intervention_practice"
    scoring = json.loads(row.scoring)
    assert scoring["correct"] == 1
    assert scoring["score"] == 2

    missing = client.post(
        f"/v1/student/interventions/{iv['id']}/practice-attempts",
        json={"kind": "practice"},
        headers=auth_header(other),
    )
    assert missing.status_code == 404


def test_ai_studio_history_sql_and_failed_without_item(client, world, db):
    faculty = world["faculty"]
    other = world["faculty_b"]
    empty = client.get("/v1/faculty/ai-studio", headers=auth_header(faculty)).json()
    assert empty["generationHistory"] == []

    failed = client.post("/v1/faculty/ai-studio/save", json={"kind": "content"}, headers=auth_header(faculty))
    assert failed.status_code == 200, failed.text
    assert failed.json()["ok"] is False
    assert failed.json()["status"] == "FAILED"
    still = client.get("/v1/faculty/ai-studio", headers=auth_header(faculty)).json()
    assert still["generationHistory"] == []

    saved = client.post(
        "/v1/faculty/ai-studio/save",
        json={"kind": "content", "item": {"title": "OS notes", "type": "handout"}},
        headers=auth_header(faculty),
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["ok"] is True
    entry = saved.json()["historyEntry"]
    assert entry["item"]["title"] == "OS notes"
    listed = client.get("/v1/faculty/ai-studio", headers=auth_header(faculty)).json()
    assert any(row["id"] == entry["id"] for row in listed["generationHistory"])
    trace = db.get(AiTrace, entry["id"])
    assert trace is not None
    assert trace.status == "COMPLETED"
    assert trace.user_id == faculty.id

    other_hist = client.get("/v1/faculty/ai-studio", headers=auth_header(other)).json()
    assert other_hist["generationHistory"] == []


def test_paper_share_sql_not_frontend_click(client, world, db):
    faculty = world["faculty"]
    other = world["faculty_b"]

    incomplete = _create_paper(
        client,
        faculty,
        title="Closeout Empty Paper",
        domain="University",
        exam_family=None,
        question_ids=[],
    )
    assert incomplete.status_code == 200, incomplete.text
    empty_id = incomplete.json()["paper"]["id"]
    blocked = client.post(
        f"/v1/faculty/paper-generator/papers/{empty_id}/share",
        json={"audience": "Entire class"},
        headers=auth_header(faculty),
    )
    assert blocked.status_code == 400

    created = _create_paper(
        client,
        faculty,
        title="Closeout Share Paper",
        domain="University",
        exam_family=None,
        question_ids=["q_uni_1"],
    )
    paper_id = created.json()["paper"]["id"]
    shared = client.post(
        f"/v1/faculty/paper-generator/papers/{paper_id}/share",
        json={"audience": "Entire class", "recipients": ["Stu A"], "message": "sit this"},
        headers=auth_header(faculty),
    )
    assert shared.status_code == 200, shared.text
    share = shared.json()["share"]
    assert share["paperId"] == paper_id
    row = db.get(PaperShare, share["id"])
    assert row is not None
    assert row.paper_id == paper_id
    listed = client.get("/v1/faculty/paper-generator/shares", headers=auth_header(faculty)).json()
    assert any(item["id"] == share["id"] for item in listed["items"])
    hidden = client.get("/v1/faculty/paper-generator/shares", headers=auth_header(other)).json()
    assert all(item["id"] != share["id"] for item in hidden["items"])
