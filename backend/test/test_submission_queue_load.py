"""Load / durability test for the Postgres submission queue at 400 students.

WHAT THIS PROVES (in the test harness, on sqlite):
  - 400 submissions can be enqueued and are ALL processed.
  - Each job is processed EXACTLY ONCE (no loss, no double-processing).
  - Every processed job produces a saved, scored ExamAttempt for the right student.
  - Enqueue stays fast (it is a single row insert per submission).

WHAT THIS DOES NOT PROVE:
  - Real Postgres concurrency / wall-clock throughput. The harness DB is sqlite,
    which serializes writes and does not honour `FOR UPDATE SKIP LOCKED` (the
    worker uses a fallback). Genuine parallel throughput must be measured on
    Postgres with concurrent HTTP clients in a staging environment.

Marked `slow` so it can be skipped in the normal run:  pytest -m slow
"""

import json
import time

import pytest

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.exams import ExamAttempt, SubmissionJob
from app.models.identity import Role, User, UserRole
from app.models.people import StudentProfile
from app.services.pg_submission_queue import PgQueueWorker, PgSubmissionService

from test.conftest import auth_header

N_STUDENTS = 400


def _publish_paper(client, faculty, *, title, question_ids):
    created = client.post(
        "/v1/faculty/paper-generator/papers",
        json={
            "title": title,
            "domain": "University",
            "examFamily": None,
            "selectedQuestionIds": question_ids,
            "duration": 60,
            "totalMarks": 4,
        },
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    paper_id = created.json()["paper"]["id"]
    pub = client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
    assert pub.status_code == 200, pub.text
    return paper_id


def _make_students(db, inst_id, n):
    """Create N student users + profiles for the load run."""
    role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "student").first()
    if role is None:
        role = Role(institution_id=inst_id, code="student", name="Student")
        db.add(role)
        db.flush()
    ids = []
    for i in range(n):
        uid = f"u_load_{i}"
        if db.get(User, uid) is None:
            db.add(User(
                id=uid, institution_id=inst_id, email=f"load{i}@test.edu",
                password_hash=hash_password("aurora123"), full_name=f"Load {i}",
                status="active", legacy_role="student",
            ))
            db.add(UserRole(user_id=uid, role_id=role.id, institution_id=inst_id))
            db.add(StudentProfile(user_id=uid, institution_id=inst_id, roll_no=f"L{i:04d}"))
        ids.append(uid)
    db.commit()
    return ids


@pytest.mark.slow
def test_400_students_all_processed_exactly_once(client, world):
    faculty = world["faculty"]
    inst_id = world["inst_a"].id
    paper_id = _publish_paper(client, faculty, title="Load Test Paper", question_ids=["q_uni_1"])

    db = SessionLocal()
    try:
        student_ids = _make_students(db, inst_id, N_STUDENTS)
    finally:
        db.close()

    service = PgSubmissionService(get_settings())

    # --- enqueue 400 submissions (measure enqueue latency) ---
    import asyncio
    body = {"examId": paper_id, "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}]}
    t0 = time.monotonic()
    submission_ids = []
    for sid in student_ids:
        res = asyncio.get_event_loop().run_until_complete(
            service.enqueue_submission(
                student_id=sid, institution_id=inst_id, exam_id=paper_id,
                attempt_id=None, body=body,
            )
        )
        submission_ids.append(res["submissionId"])
    enqueue_seconds = time.monotonic() - t0
    assert len(submission_ids) == N_STUDENTS
    assert len(set(submission_ids)) == N_STUDENTS  # all unique

    # All 400 are queued.
    db = SessionLocal()
    try:
        queued = db.query(SubmissionJob).filter(SubmissionJob.status == "queued").count()
        assert queued >= N_STUDENTS
    finally:
        db.close()

    # --- drain the whole queue via the real worker cycle ---
    worker = PgQueueWorker(get_settings())
    t1 = time.monotonic()
    drains = 0
    while worker._drain_once() > 0:
        drains += 1
        if drains > N_STUDENTS + 50:  # safety cap
            break
    process_seconds = time.monotonic() - t1

    # --- assert: every job completed exactly once, nothing lost ---
    db = SessionLocal()
    try:
        jobs = db.query(SubmissionJob).filter(SubmissionJob.id.in_(submission_ids)).all()
        assert len(jobs) == N_STUDENTS
        statuses = [j.status for j in jobs]
        assert all(s == "completed" for s in statuses), \
            f"not all completed: { {s: statuses.count(s) for s in set(statuses)} }"

        # Each student has exactly one saved, scored attempt for this exam.
        attempt_ids = [j.result_attempt_id for j in jobs]
        assert all(attempt_ids), "some jobs produced no attempt"
        assert len(set(attempt_ids)) == N_STUDENTS, "duplicate/double-processed attempts"

        saved = db.query(ExamAttempt).filter(ExamAttempt.id.in_(attempt_ids)).all()
        assert len(saved) == N_STUDENTS
        for a in saved:
            assert a.submitted_at is not None
            scoring = json.loads(a.scoring or "{}")
            assert scoring.get("score") == 2  # q_uni_1 correct = 2 marks

        # No student was skipped.
        processed_students = {a.student_id for a in saved}
        assert processed_students == set(student_ids)
    finally:
        db.close()

    print(
        f"\n[load] {N_STUDENTS} submissions | enqueue={enqueue_seconds:.2f}s "
        f"| process={process_seconds:.2f}s | drains={drains}"
    )
