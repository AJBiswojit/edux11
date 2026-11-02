"""Admin program result sheet — official JEE 75 / NEET 180 +4/−1 scoring."""

from __future__ import annotations

from datetime import datetime, timezone
import json

from app.core.security import hash_password
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import Role, User, UserRole
from app.models.people import StudentProfile

from test.conftest import auth_header
from test.test_admin_runtime import _admin


def _now():
    return datetime.now(timezone.utc)


def _attempt(db, *, inst_id, student_id, family, name, roll="A001"):
    row = ExamAttempt(
        institution_id=inst_id,
        student_id=student_id,
        roll_no=roll,
        exam_name=name,
        exam_mode="competitive",
        exam_family=family,
        started_at=_now(),
        submitted_at=_now(),
        exam_snapshot="{}",
        timing="{}",
        scoring="{}",
        is_demo=False,
    )
    db.add(row)
    db.flush()
    return row


def _questions(db, attempt_id, items):
    for index, (subject, correct) in enumerate(items, start=1):
        db.add(
            ExamQuestionAttempt(
                attempt_id=attempt_id,
                question_id=f"{attempt_id}-q{index}",
                question_number=index,
                question_snapshot=json.dumps({"subject": subject}),
                academic_context=json.dumps({"subject": subject, "examFamily": "JEE"}),
                response=json.dumps({"selected": 0 if correct is not None else None}),
                timing="{}",
                behaviour="{}",
                evaluation=json.dumps({"isCorrect": correct}),
            )
        )


def _second_student(db, inst_id, user_id="u_stu_a2", roll="A002", name="Stu A2"):
    existing = db.get(User, user_id)
    if existing:
        return existing
    user = User(
        id=user_id,
        institution_id=inst_id,
        email="stu.a2@test.edu",
        password_hash=hash_password("aurora123"),
        full_name=name,
        status="active",
        legacy_role="student",
    )
    db.add(user)
    role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "student").first()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst_id))
    db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no=roll))
    db.flush()
    return user


def test_program_results_picks_attempt_with_more_answers(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    short = _attempt(db, inst_id=world["inst_a"].id, student_id=world["student"].id, family="JEE", name="JEE Mini")
    _questions(db, short.id, [("Physics", True), ("Physics", False)])
    long = _attempt(db, inst_id=world["inst_a"].id, student_id=world["student"].id, family="JEE", name="JEE Full Mock")
    _questions(
        db,
        long.id,
        [("Physics", True), ("Physics", True), ("Chemistry", False), ("Mathematics", True), ("Mathematics", None)],
    )
    db.commit()

    res = client.get("/v1/admin/programs/exam-jee/results", headers=auth_header(admin))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["scheme"]["nq"] == 75
    assert body["scheme"]["maxMarks"] == 300
    assert body["scheme"]["gracePercent"] == 15
    assert len(body["rows"]) == 1
    row = body["rows"][0]
    assert row["attemptId"] == long.id
    assert row["nca"] == 3
    assert row["nwa"] == 1
    assert row["attended"] == 4
    assert row["nuq"] == 71
    assert row["nq"] == 75
    assert row["rawTotal"] == 11
    assert row["graceMarks"] == 45
    assert row["total"] == 56
    assert row["percentage"] == round(56 / 300 * 100, 2)
    assert row["subjects"]["PHY"]["score"] == 23
    assert row["subjects"]["CHM"]["score"] == 14
    assert row["subjects"]["MATH"]["score"] == 19
    assert row["overallRank"] == 1
    assert body["analysis"]["students"] == 1
    assert body["analysis"]["averageCorrect"] == 3


def test_program_results_neet_official_180_and_ranks(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    other = _second_student(db, world["inst_a"].id)
    a = _attempt(db, inst_id=world["inst_a"].id, student_id=world["student"].id, family="NEET", name="NEET GT", roll="A001")
    _questions(db, a.id, [("Physics", True), ("Botany", True), ("Zoology", False)])
    b = _attempt(db, inst_id=world["inst_a"].id, student_id=other.id, family="NEET", name="NEET GT", roll="A002")
    _questions(db, b.id, [("Physics", True)])
    db.commit()

    res = client.get("/v1/admin/programs/exam-neet/results", headers=auth_header(admin))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["scheme"]["nq"] == 180
    assert body["scheme"]["maxMarks"] == 720
    assert [s["code"] for s in body["scheme"]["subjects"]] == ["PHY", "CHM", "BOT", "ZOL"]
    rows = {r["studentId"]: r for r in body["rows"]}
    top = rows[world["student"].id]
    assert top["nca"] == 2 and top["nwa"] == 1
    assert top["rawTotal"] == 7
    assert top["graceMarks"] == 108
    assert top["total"] == 115
    assert top["nuq"] == 177
    assert top["percentage"] == round(115 / 720 * 100, 2)
    assert top["overallRank"] == 1
    assert rows[other.id]["overallRank"] == 2
    assert rows[other.id]["rawTotal"] == 4
    assert rows[other.id]["total"] == 112


def test_program_results_hide_other_institution(client, world, db):
    admin_a = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    admin_b = _admin(db, inst_id=world["inst_b"].id, email="admin.b@test.edu", name="Admin Beta", user_id="u_adm_b")
    attempt = _attempt(db, inst_id=world["inst_b"].id, student_id=world["student_b"].id, family="JEE", name="Other JEE", roll="B001")
    _questions(db, attempt.id, [("Physics", True)])
    db.commit()
    res = client.get("/v1/admin/programs/exam-jee/results", headers=auth_header(admin_a))
    assert res.status_code == 200
    assert all(r["studentId"] != world["student_b"].id for r in res.json()["rows"])
    other = client.get("/v1/admin/programs/exam-jee/results", headers=auth_header(admin_b))
    assert other.status_code == 200
    assert any(r["studentId"] == world["student_b"].id for r in other.json()["rows"])


def test_student_cannot_read_program_results(client, world):
    res = client.get("/v1/admin/programs/exam-jee/results", headers=auth_header(world["student"]))
    assert res.status_code == 403


def test_student_exam_analysis_stays_raw_without_grace(client, world, db):
    attempt = _attempt(db, inst_id=world["inst_a"].id, student_id=world["student"].id, family="JEE", name="JEE Raw Check")
    _questions(db, attempt.id, [("Physics", True), ("Chemistry", False)])
    attempt.scoring = json.dumps({"score": 3, "maxScore": 8, "percentage": 37.5, "correct": 1, "incorrect": 1, "unanswered": 0, "total": 2})
    db.commit()

    analysis = client.get(f"/v1/student/exam-analysis/{attempt.id}", headers=auth_header(world["student"]))
    assert analysis.status_code == 200, analysis.text
    blob = json.dumps(analysis.json())
    assert "graceMarks" not in blob
    assert "gracePercent" not in blob
