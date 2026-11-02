"""Batch rank on exam-analysis subject cards.

Scoped to spa_exams.apply_batch_subject_ranks so program results, comparison
blocks, and other ranking surfaces keep their own contracts.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json

from app.core.security import hash_password
from app.models.catalog import Batch
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import Role, User, UserRole
from app.models.people import StudentProfile
from app.services.spa_exams import apply_batch_subject_ranks, attempt_to_dict, analysis_from_attempt, competition_rank


def _now():
    return datetime.now(timezone.utc)


def _student(db, inst_id, *, user_id, email, name, roll, batch_id):
    existing = db.get(User, user_id)
    if existing:
        return existing
    user = User(
        id=user_id,
        institution_id=inst_id,
        email=email,
        password_hash=hash_password("aurora123"),
        full_name=name,
        status="active",
        legacy_role="student",
    )
    db.add(user)
    role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "student").first()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst_id))
    db.add(StudentProfile(user_id=user.id, institution_id=inst_id, roll_no=roll, batch_id=batch_id))
    db.flush()
    return user


def _attempt(db, *, inst_id, student_id, exam_id, batch_id, roll, exam_family="NEET", exam_name=None):
    row = ExamAttempt(
        institution_id=inst_id,
        student_id=student_id,
        roll_no=roll,
        batch_id=batch_id,
        exam_id=exam_id,
        exam_name=exam_name or f"{exam_family} Full Mock",
        exam_mode="university" if exam_family == "University" else "competitive",
        exam_family=exam_family,
        started_at=_now(),
        submitted_at=_now(),
        exam_snapshot="{}",
        timing="{}",
        scoring='{"score": 0, "maxScore": 720, "percentage": 0}',
        is_demo=False,
    )
    db.add(row)
    db.flush()
    return row


def _q(db, attempt_id, number, subject, marks):
    db.add(
        ExamQuestionAttempt(
            attempt_id=attempt_id,
            question_id=f"{attempt_id}-{subject}-{number}",
            question_number=number,
            question_snapshot=json.dumps({"subject": subject, "marks": 4}),
            academic_context=json.dumps({"subject": subject}),
            response=json.dumps({"selected": 0, "status": "answered"}),
            timing="{}",
            behaviour="{}",
            evaluation=json.dumps({"isCorrect": marks > 0, "marks": marks}),
        )
    )


def test_competition_rank_ties_share_place():
    assert competition_rank(99, [99, 94, 315]) == 2
    assert competition_rank(315, [99, 94, 315]) == 1
    assert competition_rank(94, [99, 94, 315]) == 3
    assert competition_rank(80, [80, 80, 50]) == 1


def test_analysis_subject_rank_is_batch_not_intra_paper(db, world):
    inst_id = world["inst_a"].id
    batch = Batch(
        id="batch_neet_rank_a",
        institution_id=inst_id,
        code="NEET-RANK-A",
        name="NEET 2027 A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add(batch)
    db.flush()

    a = _student(db, inst_id, user_id="u_stu_rank_a", email="rank.a@test.edu", name="Stu A", roll="N001", batch_id=batch.id)
    b = _student(db, inst_id, user_id="u_stu_rank_b", email="rank.b@test.edu", name="Stu B", roll="N002", batch_id=batch.id)
    c = _student(db, inst_id, user_id="u_stu_rank_c", email="rank.c@test.edu", name="Stu C", roll="N003", batch_id=batch.id)

    exam_id = "paper-neet-mock-rank"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=batch.id, roll="N001")
    att_b = _attempt(db, inst_id=inst_id, student_id=b.id, exam_id=exam_id, batch_id=batch.id, roll="N002")
    att_c = _attempt(db, inst_id=inst_id, student_id=c.id, exam_id=exam_id, batch_id=batch.id, roll="N003")

    # Physics: C 12, B 8, A 4  → A ranks 3 in Physics
    # Chemistry: A 12, B 4, C 8 → A ranks 1 in Chemistry
    # Biology: B 16, A 8, C 4   → A ranks 2 in Biology
    _q(db, att_a.id, 1, "Physics", 4)
    _q(db, att_a.id, 2, "Chemistry", 12)
    _q(db, att_a.id, 3, "Biology", 8)

    _q(db, att_b.id, 1, "Physics", 8)
    _q(db, att_b.id, 2, "Chemistry", 4)
    _q(db, att_b.id, 3, "Biology", 16)

    _q(db, att_c.id, 1, "Physics", 12)
    _q(db, att_c.id, 2, "Chemistry", 8)
    _q(db, att_c.id, 3, "Biology", 4)
    db.commit()

    payload = attempt_to_dict(att_a, db)
    out = analysis_from_attempt(payload, db=db, attempt_row=att_a)
    by_name = {s["name"]: s for s in out["subjects"]}
    assert by_name["Physics"]["rank"] == 3
    assert by_name["Chemistry"]["rank"] == 1
    assert by_name["Biology"]["rank"] == 2
    assert by_name["Physics"]["rankCohort"] == 3
    assert by_name["Physics"]["rankMethod"] == "NEET-NTA"
    # Totals: A 24, B 28, C 24 → B AIR 1; A beats C on Biology 8 vs 4
    assert out["hero"]["batchRank"] == 2
    assert out["hero"]["rankMethod"] == "NEET-NTA"
    assert out["hero"]["cohortSize"] == 3
    assert out["hero"]["ntaPercentile"] is None


def test_other_batch_does_not_affect_rank(db, world):
    inst_id = world["inst_a"].id
    batch_a = Batch(
        id="batch_neet_iso_a",
        institution_id=inst_id,
        code="NEET-ISO-A",
        name="NEET A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    batch_b = Batch(
        id="batch_neet_iso_b",
        institution_id=inst_id,
        code="NEET-ISO-B",
        name="NEET B",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add_all([batch_a, batch_b])
    db.flush()

    a = _student(db, inst_id, user_id="u_stu_iso_a", email="iso.a@test.edu", name="Iso A", roll="N011", batch_id=batch_a.id)
    outsider = _student(db, inst_id, user_id="u_stu_rank_out", email="rank.out@test.edu", name="Out", roll="N099", batch_id=batch_b.id)

    exam_id = "paper-neet-batch-isolate"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=batch_a.id, roll="N011")
    att_out = _attempt(db, inst_id=inst_id, student_id=outsider.id, exam_id=exam_id, batch_id=batch_b.id, roll="N099")
    _q(db, att_a.id, 1, "Physics", 4)
    _q(db, att_out.id, 1, "Physics", 40)
    db.commit()

    subjects = [{"name": "Physics", "score": 4, "rank": None}]
    meta = apply_batch_subject_ranks(db, att_a, subjects)
    assert subjects[0]["rank"] == 1
    assert subjects[0]["rankCohort"] == 1
    assert meta["overallRank"] == 1
    assert meta["method"] == "NEET-NTA"
    assert meta["cohortSize"] == 1


def test_null_attempt_batch_uses_profile_and_excludes_other_batch(db, world):
    inst_id = world["inst_a"].id
    batch_a = Batch(
        id="batch_neet_null_a",
        institution_id=inst_id,
        code="NEET-NULL-A",
        name="NEET Null A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    batch_b = Batch(
        id="batch_neet_null_b",
        institution_id=inst_id,
        code="NEET-NULL-B",
        name="NEET Null B",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add_all([batch_a, batch_b])
    db.flush()
    a = _student(db, inst_id, user_id="u_stu_null_a", email="null.a@test.edu", name="Null A", roll="N021", batch_id=batch_a.id)
    outsider = _student(db, inst_id, user_id="u_stu_null_out", email="null.out@test.edu", name="Null Out", roll="N022", batch_id=batch_b.id)
    exam_id = "paper-neet-null-stamp"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=None, roll="N021")
    att_out = _attempt(db, inst_id=inst_id, student_id=outsider.id, exam_id=exam_id, batch_id=batch_b.id, roll="N022")
    _q(db, att_a.id, 1, "Physics", 4)
    _q(db, att_out.id, 1, "Physics", 40)
    db.commit()

    subjects = [{"name": "Physics", "score": 4, "rank": None}]
    meta = apply_batch_subject_ranks(db, att_a, subjects)
    assert subjects[0]["rank"] == 1
    assert subjects[0]["rankCohort"] == 1
    assert meta["overallRank"] == 1
    assert meta["cohortSize"] == 1


def test_profile_batch_wins_over_stale_attempt_stamp(db, world):
    inst_id = world["inst_a"].id
    batch_a = Batch(
        id="batch_neet_stale_a",
        institution_id=inst_id,
        code="NEET-STALE-A",
        name="NEET Stale A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    batch_b = Batch(
        id="batch_neet_stale_b",
        institution_id=inst_id,
        code="NEET-STALE-B",
        name="NEET Stale B",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add_all([batch_a, batch_b])
    db.flush()
    a = _student(db, inst_id, user_id="u_stu_stale_a", email="stale.a@test.edu", name="Stale A", roll="N031", batch_id=batch_a.id)
    outsider = _student(db, inst_id, user_id="u_stu_stale_out", email="stale.out@test.edu", name="Stale Out", roll="N032", batch_id=batch_b.id)
    exam_id = "paper-neet-stale-stamp"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=batch_b.id, roll="N031")
    att_out = _attempt(db, inst_id=inst_id, student_id=outsider.id, exam_id=exam_id, batch_id=batch_b.id, roll="N032")
    _q(db, att_a.id, 1, "Physics", 8)
    _q(db, att_out.id, 1, "Physics", 40)
    db.commit()

    subjects = [{"name": "Physics", "score": 8, "rank": None}]
    meta = apply_batch_subject_ranks(db, att_a, subjects)
    assert subjects[0]["rank"] == 1
    assert subjects[0]["rankCohort"] == 1
    assert meta["overallRank"] == 1
    assert meta["cohortSize"] == 1


def test_unresolved_batch_hides_air_and_subject_rank(db, world):
    inst_id = world["inst_a"].id
    a = _student(db, inst_id, user_id="u_stu_nobatch_a", email="nobatch.a@test.edu", name="No Batch", roll="N041", batch_id=None)
    exam_id = "paper-neet-no-batch"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=None, roll="N041")
    _q(db, att_a.id, 1, "Physics", 12)
    db.commit()

    subjects = [{"name": "Physics", "score": 12, "rank": None}]
    meta = apply_batch_subject_ranks(db, att_a, subjects)
    assert subjects[0]["rank"] is None
    assert meta["overallRank"] is None
    assert meta["cohortSize"] == 0


def test_same_paper_three_in_a_one_in_b_ranks_inside_home_batch(db, world):
    inst_id = world["inst_a"].id
    batch_a = Batch(
        id="batch_neet_home_a",
        institution_id=inst_id,
        code="NEET-HOME-A",
        name="NEET Home A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    batch_b = Batch(
        id="batch_neet_home_b",
        institution_id=inst_id,
        code="NEET-HOME-B",
        name="NEET Home B",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add_all([batch_a, batch_b])
    db.flush()
    a1 = _student(db, inst_id, user_id="u_stu_home_a1", email="home.a1@test.edu", name="A1", roll="N051", batch_id=batch_a.id)
    a2 = _student(db, inst_id, user_id="u_stu_home_a2", email="home.a2@test.edu", name="A2", roll="N052", batch_id=batch_a.id)
    a3 = _student(db, inst_id, user_id="u_stu_home_a3", email="home.a3@test.edu", name="A3", roll="N053", batch_id=batch_a.id)
    b1 = _student(db, inst_id, user_id="u_stu_home_b1", email="home.b1@test.edu", name="B1", roll="N054", batch_id=batch_b.id)
    exam_id = "paper-neet-home-split"
    att_a1 = _attempt(db, inst_id=inst_id, student_id=a1.id, exam_id=exam_id, batch_id=batch_a.id, roll="N051")
    att_a2 = _attempt(db, inst_id=inst_id, student_id=a2.id, exam_id=exam_id, batch_id=batch_a.id, roll="N052")
    att_a3 = _attempt(db, inst_id=inst_id, student_id=a3.id, exam_id=exam_id, batch_id=batch_a.id, roll="N053")
    att_b1 = _attempt(db, inst_id=inst_id, student_id=b1.id, exam_id=exam_id, batch_id=batch_b.id, roll="N054")
    _q(db, att_a1.id, 1, "Physics", 4)
    _q(db, att_a2.id, 1, "Physics", 8)
    _q(db, att_a3.id, 1, "Physics", 12)
    _q(db, att_b1.id, 1, "Physics", 40)
    db.commit()

    out_low = analysis_from_attempt(attempt_to_dict(att_a1, db), db=db, attempt_row=att_a1)
    out_b = analysis_from_attempt(attempt_to_dict(att_b1, db), db=db, attempt_row=att_b1)
    by_name = {s["name"]: s for s in out_low["subjects"]}
    assert out_low["hero"]["batchRank"] == 3
    assert out_low["hero"]["cohortSize"] == 3
    assert by_name["Physics"]["rank"] == 3
    assert by_name["Physics"]["rankCohort"] == 3
    assert out_b["hero"]["batchRank"] == 1
    assert out_b["hero"]["cohortSize"] == 1
    assert out_b["subjects"][0]["rank"] == 1
    assert out_low["comparison"]["batchAverage"].get("cohortSize") == 3
    assert out_b["comparison"]["batchAverage"].get("cohortSize") == 1


def test_air_and_subject_rank_use_full_batch_roster(db, world):
    inst_id = world["inst_a"].id
    batch_a = Batch(
        id="batch_neet_roster_a",
        institution_id=inst_id,
        code="NEET-ROSTER-A",
        name="NEET Roster A",
        exam_mode="competitive",
        exam_family="NEET",
    )
    batch_b = Batch(
        id="batch_neet_roster_b",
        institution_id=inst_id,
        code="NEET-ROSTER-B",
        name="NEET Roster B",
        exam_mode="competitive",
        exam_family="NEET",
    )
    db.add_all([batch_a, batch_b])
    db.flush()
    a1 = _student(db, inst_id, user_id="u_stu_roster_a1", email="roster.a1@test.edu", name="R1", roll="N061", batch_id=batch_a.id)
    a2 = _student(db, inst_id, user_id="u_stu_roster_a2", email="roster.a2@test.edu", name="R2", roll="N062", batch_id=batch_a.id)
    _student(db, inst_id, user_id="u_stu_roster_a3", email="roster.a3@test.edu", name="R3", roll="N063", batch_id=batch_a.id)
    _student(db, inst_id, user_id="u_stu_roster_a4", email="roster.a4@test.edu", name="R4", roll="N064", batch_id=batch_a.id)
    outsider = _student(db, inst_id, user_id="u_stu_roster_b1", email="roster.b1@test.edu", name="RB", roll="N065", batch_id=batch_b.id)
    exam_id = "paper-neet-full-roster"
    att_a1 = _attempt(db, inst_id=inst_id, student_id=a1.id, exam_id=exam_id, batch_id=batch_a.id, roll="N061")
    att_a2 = _attempt(db, inst_id=inst_id, student_id=a2.id, exam_id=exam_id, batch_id=batch_a.id, roll="N062")
    att_out = _attempt(db, inst_id=inst_id, student_id=outsider.id, exam_id=exam_id, batch_id=batch_b.id, roll="N065")
    _q(db, att_a1.id, 1, "Physics", 12)
    _q(db, att_a2.id, 1, "Physics", 4)
    _q(db, att_out.id, 1, "Physics", 40)
    db.commit()

    out_low = analysis_from_attempt(attempt_to_dict(att_a2, db), db=db, attempt_row=att_a2)
    out_top = analysis_from_attempt(attempt_to_dict(att_a1, db), db=db, attempt_row=att_a1)
    by_name = {s["name"]: s for s in out_low["subjects"]}
    assert out_low["hero"]["batchRank"] == 2
    assert out_low["hero"]["cohortSize"] == 4
    assert by_name["Physics"]["rank"] == 2
    assert by_name["Physics"]["rankCohort"] == 4
    assert out_top["hero"]["batchRank"] == 1
    assert out_top["hero"]["cohortSize"] == 4


def test_jee_air_uses_nta_math_percentile_tie_break(db, world):
    inst_id = world["inst_a"].id
    batch = Batch(
        id="batch_jee_air_a",
        institution_id=inst_id,
        code="JEE-AIR-A",
        name="JEE 2027 A",
        exam_mode="competitive",
        exam_family="JEE",
    )
    db.add(batch)
    db.flush()

    a = _student(db, inst_id, user_id="u_stu_jee_air_a", email="jee.air.a@test.edu", name="Jee A", roll="J001", batch_id=batch.id)
    b = _student(db, inst_id, user_id="u_stu_jee_air_b", email="jee.air.b@test.edu", name="Jee B", roll="J002", batch_id=batch.id)
    c = _student(db, inst_id, user_id="u_stu_jee_air_c", email="jee.air.c@test.edu", name="Jee C", roll="J003", batch_id=batch.id)

    exam_id = "paper-jee-mock-air"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=batch.id, roll="J001", exam_family="JEE")
    att_b = _attempt(db, inst_id=inst_id, student_id=b.id, exam_id=exam_id, batch_id=batch.id, roll="J002", exam_family="JEE")
    att_c = _attempt(db, inst_id=inst_id, student_id=c.id, exam_id=exam_id, batch_id=batch.id, roll="J003", exam_family="JEE")

    _q(db, att_a.id, 1, "Mathematics", 40)
    _q(db, att_a.id, 2, "Physics", 20)
    _q(db, att_a.id, 3, "Chemistry", 20)

    _q(db, att_b.id, 1, "Mathematics", 20)
    _q(db, att_b.id, 2, "Physics", 40)
    _q(db, att_b.id, 3, "Chemistry", 20)

    _q(db, att_c.id, 1, "Mathematics", 10)
    _q(db, att_c.id, 2, "Physics", 15)
    _q(db, att_c.id, 3, "Chemistry", 15)
    db.commit()

    out_a = analysis_from_attempt(attempt_to_dict(att_a, db), db=db, attempt_row=att_a)
    out_b = analysis_from_attempt(attempt_to_dict(att_b, db), db=db, attempt_row=att_b)
    by_name = {s["name"]: s for s in out_a["subjects"]}
    assert out_a["hero"]["batchRank"] == 1
    assert out_b["hero"]["batchRank"] == 2
    assert out_a["hero"]["rankMethod"] == "JEE-NTA"
    assert out_a["hero"]["ntaPercentile"] == 100.0
    assert by_name["Mathematics"]["rank"] == 1
    assert by_name["Physics"]["rank"] == 2
    assert by_name["Mathematics"]["ntaPercentile"] == 100.0


def test_university_keeps_simple_subject_rank_without_nta_air(db, world):
    inst_id = world["inst_a"].id
    batch = Batch(
        id="batch_uni_rank_a",
        institution_id=inst_id,
        code="UNI-RANK-A",
        name="BSc A",
        exam_mode="university",
        exam_family="University",
    )
    db.add(batch)
    db.flush()
    a = _student(db, inst_id, user_id="u_stu_uni_rank_a", email="uni.rank.a@test.edu", name="Uni A", roll="U001", batch_id=batch.id)
    b = _student(db, inst_id, user_id="u_stu_uni_rank_b", email="uni.rank.b@test.edu", name="Uni B", roll="U002", batch_id=batch.id)
    exam_id = "paper-uni-rank"
    att_a = _attempt(db, inst_id=inst_id, student_id=a.id, exam_id=exam_id, batch_id=batch.id, roll="U001", exam_family="University")
    att_b = _attempt(db, inst_id=inst_id, student_id=b.id, exam_id=exam_id, batch_id=batch.id, roll="U002", exam_family="University")
    _q(db, att_a.id, 1, "Physics", 8)
    _q(db, att_b.id, 1, "Physics", 12)
    db.commit()

    out = analysis_from_attempt(attempt_to_dict(att_a, db), db=db, attempt_row=att_a)
    by_name = {s["name"]: s for s in out["subjects"]}
    assert by_name["Physics"]["rank"] == 2
    assert by_name["Physics"].get("ntaPercentile") is None
    assert out["hero"]["batchRank"] is None
    assert out["hero"]["rankMethod"] == "batch"
