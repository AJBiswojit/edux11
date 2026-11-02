"""Faculty My Students cards: live exam + catalog evidence only."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.models.catalog import Batch
from app.models.exams import ExamAttempt
from app.models.identity import Institution, Role, User, UserRole
from app.models.people import StudentProfile
from app.services.people_directory import faculty_students_directory
from test.conftest import auth_header


def _college(db, *, slug: str) -> tuple[Institution, User]:
    inst = Institution(
        id=f"inst_dir_{slug}",
        slug=f"dir-{slug}",
        name=f"Directory College {slug}",
        timezone="Asia/Kolkata",
        academic_year="2026-27",
    )
    db.add(inst)
    db.flush()
    faculty = User(
        id=f"u_dir_fac_{slug}",
        institution_id=inst.id,
        email=f"dir.fac.{slug}@test.edu",
        password_hash=hash_password("aurora123"),
        full_name=f"Dir Fac {slug}",
        status="active",
        legacy_role="faculty",
    )
    db.add(faculty)
    role = Role(institution_id=inst.id, code="faculty", name="Faculty")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id=faculty.id, role_id=role.id, institution_id=inst.id))
    db.flush()
    return inst, faculty


def _student(db, inst_id: str, *, suffix: str, extra: dict | None = None, batch_id: str | None = None) -> User:
    user = User(
        id=f"u_dir_{suffix}",
        institution_id=inst_id,
        email=f"dir.{suffix}@test.edu",
        password_hash=hash_password("aurora123"),
        full_name=f"Directory {suffix}",
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
    db.add(
        StudentProfile(
            user_id=user.id,
            institution_id=inst_id,
            roll_no=f"DIR-{suffix}",
            batch_id=batch_id,
            extra=json.dumps(extra or {}),
        )
    )
    db.flush()
    return user


def _batch(db, inst_id: str, *, suffix: str, mode="competitive", family="jee") -> Batch:
    row = Batch(
        id=f"batch_dir_{suffix}",
        institution_id=inst_id,
        code=f"DIR-{suffix}",
        name=f"JEE-DIR-{suffix}",
        exam_mode=mode,
        exam_family=family,
        section="A",
    )
    db.add(row)
    db.flush()
    return row


def _attempt(db, inst_id: str, student_id: str, *, name, submitted, scoring, family="JEE", mode="competitive", snapshot=None):
    db.add(
        ExamAttempt(
            institution_id=inst_id,
            student_id=student_id,
            roll_no="DIR",
            exam_name=name,
            exam_mode=mode,
            exam_family=family,
            started_at=submitted or datetime.now(timezone.utc),
            submitted_at=submitted,
            exam_snapshot=json.dumps(snapshot or {}),
            timing="{}",
            scoring=json.dumps(scoring),
            is_demo=False,
        )
    )


def _card(payload: dict, student_id: str) -> dict:
    return next(s for s in payload["students"] if s["id"] == student_id)


def test_directory_ignores_seed_label_when_no_exams(db, world):
    inst, _faculty = _college(db, slug="none")
    inst_id = inst.id
    batch = _batch(db, inst_id, suffix="none")
    student = _student(
        db,
        inst_id,
        suffix="none",
        batch_id=batch.id,
        extra={"academicLabel": "At Risk", "domain": "University", "examFamily": "NEET"},
    )
    db.commit()
    payload = faculty_students_directory(db, inst_id)
    row = _card(payload, student.id)
    assert row["status"] == "No exams"
    assert row["latestAccuracy"] is None
    assert row["examsCompleted"] == 0
    assert row["lastExam"] is None
    assert row["attention"] is False
    assert row["attentionReason"] is None
    assert row["batchName"] == batch.name
    assert row["domain"] == "Competitive"
    assert row["examFamily"] == "JEE"


def test_blank_latest_attempt_does_not_zero_previous_score(db, world):
    inst, _faculty = _college(db, slug="blank")
    inst_id = inst.id
    student = _student(db, inst_id, suffix="blank")
    now = datetime.now(timezone.utc)
    _attempt(
        db,
        inst_id,
        student.id,
        name="JEE Mock Test Final",
        submitted=now - timedelta(days=10),
        scoring={"accuracy": 82.24, "score": 164, "maxScore": 200, "correct": 41, "incorrect": 9, "attemptRate": 66.7},
        snapshot={"shortTitle": "JEE Mock Test Final"},
    )
    _attempt(
        db,
        inst_id,
        student.id,
        name="JEE Final Mock Set 2",
        submitted=now,
        scoring={"accuracy": 0.0, "score": 0, "maxScore": 200, "correct": 0, "incorrect": 0, "attemptRate": 0, "unanswered": 75},
    )
    _attempt(
        db,
        inst_id,
        student.id,
        name="In progress paper",
        submitted=None,
        scoring={},
    )
    db.commit()
    row = _card(faculty_students_directory(db, inst_id), student.id)
    assert row["examsCompleted"] == 1
    assert row["latestAccuracy"] == 82.24
    assert row["status"] == "Strong"
    assert row["lastExam"]["title"] == "JEE Mock Test Final"
    assert row["lastExam"]["attemptId"]
    assert row["attention"] is False


def test_improving_and_declining_come_from_attempt_series(db, world):
    inst, _faculty = _college(db, slug="trend")
    inst_id = inst.id
    improving = _student(db, inst_id, suffix="imp")
    declining = _student(db, inst_id, suffix="dec")
    now = datetime.now(timezone.utc)
    _attempt(db, inst_id, improving.id, name="T1", submitted=now - timedelta(days=20), scoring={"accuracy": 50, "score": 100, "correct": 20, "incorrect": 10, "attemptRate": 40})
    _attempt(db, inst_id, improving.id, name="T2", submitted=now - timedelta(days=2), scoring={"accuracy": 70, "score": 140, "correct": 35, "incorrect": 10, "attemptRate": 60})
    _attempt(db, inst_id, declining.id, name="T1", submitted=now - timedelta(days=20), scoring={"accuracy": 80, "score": 160, "correct": 40, "incorrect": 10, "attemptRate": 66})
    _attempt(db, inst_id, declining.id, name="T2", submitted=now - timedelta(days=2), scoring={"accuracy": 60, "score": 120, "correct": 30, "incorrect": 15, "attemptRate": 60})
    db.commit()
    payload = faculty_students_directory(db, inst_id)
    up = _card(payload, improving.id)
    down = _card(payload, declining.id)
    assert up["status"] == "Improving"
    assert up["trend"] == "improving"
    assert up["latestAccuracy"] == 70
    assert up["examsCompleted"] == 2
    assert payload["overview"]["improving"] >= 1
    assert down["status"] == "Needs Attention"
    assert down["trend"] == "declining"
    assert down["attentionReason"] == "Declining performance trend"


def test_percentage_used_when_accuracy_key_missing(db, world):
    inst, _faculty = _college(db, slug="pct")
    inst_id = inst.id
    student = _student(db, inst_id, suffix="pct")
    now = datetime.now(timezone.utc)
    _attempt(
        db,
        inst_id,
        student.id,
        name="NEET Mock",
        submitted=now,
        family="NEET",
        scoring={"percentage": 74.51, "score": 540, "maxScore": 720, "correct": 135, "incorrect": 20, "attemptRate": 86},
    )
    db.commit()
    row = _card(faculty_students_directory(db, inst_id), student.id)
    assert row["latestAccuracy"] == 74.51
    assert row["status"] == "Stable"
    assert row["examFamily"] == "NEET"
    assert row["domain"] == "Competitive"


def test_last_exam_date_uses_institution_timezone(db, world):
    inst, _faculty = _college(db, slug="tz")
    inst_id = inst.id
    student = _student(db, inst_id, suffix="tz")
    # 00:30 IST on 18 Sep is 19:00 UTC on 17 Sep.
    submitted = datetime(2026, 9, 17, 19, 0, tzinfo=timezone.utc)
    _attempt(
        db,
        inst_id,
        student.id,
        name="JEE Final Mock Set 2",
        submitted=submitted,
        scoring={"accuracy": 44.44, "score": 80, "correct": 20, "incorrect": 25, "attemptRate": 60},
    )
    db.commit()
    row = _card(faculty_students_directory(db, inst_id), student.id)
    assert row["lastExam"]["date"] == "2026-09-18"
    assert row["latestAccuracy"] == 44.44
    assert row["status"] == "Needs Attention"
    assert row["attentionReason"] == "Latest accuracy below 55%"


def test_malformed_scoring_does_not_fail_directory(db, world):
    inst, _faculty = _college(db, slug="badjson")
    inst_id = inst.id
    student = _student(db, inst_id, suffix="badjson")
    now = datetime.now(timezone.utc)
    db.add(
        ExamAttempt(
            institution_id=inst_id,
            student_id=student.id,
            roll_no="DIR",
            exam_name="Broken blob",
            exam_mode="competitive",
            exam_family="JEE",
            started_at=now,
            submitted_at=now,
            exam_snapshot="{}",
            timing="{}",
            scoring="{not-json",
            is_demo=False,
        )
    )
    db.commit()
    payload = faculty_students_directory(db, inst_id)
    row = _card(payload, student.id)
    assert row["examsCompleted"] == 0
    assert row["status"] == "No exams"


def test_faculty_students_endpoint_serves_directory(client, world, db):
    inst, faculty = _college(db, slug="api")
    inst_id = inst.id
    student = _student(db, inst_id, suffix="api")
    now = datetime.now(timezone.utc)
    _attempt(
        db,
        inst_id,
        student.id,
        name="Ready paper",
        submitted=now,
        scoring={"accuracy": 85.54, "score": 170, "correct": 43, "incorrect": 7, "attemptRate": 66},
    )
    db.commit()
    res = client.get("/v1/faculty/students", headers=auth_header(faculty))
    assert res.status_code == 200, res.text
    row = _card(res.json(), student.id)
    assert row["latestAccuracy"] == 85.54
    assert row["status"] == "Strong"
    assert row["examsCompleted"] == 1
    assert {s["id"] for s in res.json()["students"]} == {student.id}
