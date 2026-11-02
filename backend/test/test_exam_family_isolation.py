"""Batch family drives exam visibility and 360 domain — no University leak for JEE/NEET."""

from __future__ import annotations

from datetime import datetime, timezone

from app.core.security import hash_password
from app.models.catalog import Batch
from app.models.identity import Role, User, UserRole
from app.models.people import StudentProfile
from app.services.examination import normalize_exam_family, paper_mode_family
from app.services.student_360_metrics import analyze_student_360
from test.conftest import auth_header
from test.test_examination_core import _create_paper


class _Paper:
    def __init__(self, exam_mode, exam_family):
        self.exam_mode = exam_mode
        self.exam_family = exam_family


def test_family_aliases_normalize_for_storage():
    assert normalize_exam_family("JEE_MAIN") == "jee"
    assert normalize_exam_family("NEET-UG") == "neet"
    assert normalize_exam_family("JEE", mode="university") is None


def test_paper_family_wins_over_university_mode():
    mode, family = paper_mode_family(_Paper("university", "JEE_MAIN"))
    assert mode == "competitive"
    assert family == "jee"


def test_360_counts_jee_family_even_when_mode_is_university():
    analysis = analyze_student_360(
        [
            {
                "id": "a1",
                "examMode": "University",
                "examFamily": "JEE",
                "attemptRate": 80,
                "accuracy": 70,
                "submittedAt": "2026-01-01T00:00:00",
                "questionAttempts": [],
            }
        ]
    )
    assert analysis["byDomain"]["JEE"]["overviewAll"]["examsCompleted"] == 1
    assert analysis["byDomain"]["University"]["overviewAll"]["examsCompleted"] == 0


def _enrolled_student(db, inst_id, *, suffix, family):
    user = User(
        id=f"u_iso_{suffix}",
        institution_id=inst_id,
        email=f"iso.{suffix}@test.edu",
        password_hash=hash_password("aurora123"),
        full_name=f"Iso {suffix}",
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
    batch = Batch(
        id=f"batch_iso_{suffix}",
        institution_id=inst_id,
        code=f"ISO-{suffix}",
        name=f"{family}-ISO-{suffix}",
        exam_mode="competitive",
        exam_family=family,
    )
    db.add(batch)
    db.flush()
    db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no=f"ISO-{suffix}", batch_id=batch.id))
    db.commit()
    return user


def test_enrolled_jee_student_does_not_see_neet_or_university_exams(client, world, db):
    faculty = world["faculty"]
    jee = _create_paper(client, faculty, title="Iso JEE", domain="Competitive", exam_family="JEE", question_ids=["q_jee_phy"])
    neet = _create_paper(client, faculty, title="Iso NEET", domain="Competitive", exam_family="NEET", question_ids=["q_neet_phy"])
    uni = _create_paper(client, faculty, title="Iso Uni", domain="University", exam_family=None, question_ids=["q_uni_1", "q_uni_2"])
    jee_id = jee.json()["paper"]["id"]
    neet_id = neet.json()["paper"]["id"]
    uni_id = uni.json()["paper"]["id"]
    for paper_id in (jee_id, neet_id, uni_id):
        pub = client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
        assert pub.status_code == 200, pub.text

    student = _enrolled_student(db, world["inst_a"].id, suffix=datetime.now(timezone.utc).strftime("%H%M%S%f"), family="jee")
    listing = client.get("/v1/student/exams", headers=auth_header(student)).json()
    ids = {item["id"] for item in listing["items"]}
    assert jee_id in ids
    assert neet_id not in ids
    assert uni_id not in ids
    blocked = client.post(f"/v1/student/exams/{neet_id}/start", json={}, headers=auth_header(student))
    assert blocked.status_code == 404
