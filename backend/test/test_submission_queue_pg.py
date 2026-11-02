"""Postgres-backed submission queue (no Redis).

Covers: enqueue returns 202 + submissionId; the worker processes a queued job
end-to-end (scores + saves the attempt) and marks it completed; status reports
completed with the attempt id; duplicate in-flight submits are rejected;
queue_metrics reports depth.
"""

import asyncio
import json

from app.core.config import get_settings
from app.models.exams import ExamAttempt, SubmissionJob
from app.services.pg_submission_queue import PgQueueWorker, PgSubmissionService

from test.conftest import auth_header


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


def _drain(settings):
    """Run the worker's claim+process cycle once (synchronously) for tests."""
    worker = PgQueueWorker(settings)
    worker._drain_once()


def test_enqueue_then_worker_processes(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Queue Paper", question_ids=["q_uni_1"])

    # Enqueue via the HTTP endpoint → 202 + submissionId (queued).
    # Demo submission: exercises the full queue+worker+scoring path without
    # polluting the shared student's real CGPA/analytics (demo is excluded).
    res = client.post(
        f"/v1/student/exams/{paper_id}/submit",
        json={
            "examId": paper_id,
            "isDemo": True,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student),
    )
    assert res.status_code == 202, res.text
    submission_id = res.json()["submissionId"]
    assert res.json()["status"] == "queued"

    # No worker running in tests → drain manually.
    _drain(get_settings())

    # Status now completed with a real attempt id.
    status_res = client.get(f"/v1/student/submissions/{submission_id}/status", headers=auth_header(student))
    assert status_res.status_code == 200, status_res.text
    payload = status_res.json()
    assert payload["status"] == "completed"
    attempt_id = payload["attemptId"]

    # The attempt was actually scored + saved by the worker.
    db.expire_all()
    row = db.get(ExamAttempt, attempt_id)
    assert row is not None
    assert row.submitted_at is not None
    assert row.student_id == student.id


def test_duplicate_submission_rejected(client, world):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Queue Dupe", question_ids=["q_uni_1"])

    body = {"examId": paper_id, "attemptId": "attempt-dupe-1", "questionAttempts": []}
    first = client.post(f"/v1/student/exams/{paper_id}/submit", json=body, headers=auth_header(student))
    assert first.status_code == 202, first.text

    # Same attemptId still queued → duplicate rejected.
    second = client.post(f"/v1/student/exams/{paper_id}/submit", json=body, headers=auth_header(student))
    assert second.status_code == 409, second.text


def test_status_ownership_is_hidden(client, world):
    faculty = world["faculty"]
    student = world["student"]
    other = world["student_b"]
    paper_id = _publish_paper(client, faculty, title="Queue Owner", question_ids=["q_uni_1"])

    res = client.post(
        f"/v1/student/exams/{paper_id}/submit",
        json={"examId": paper_id, "questionAttempts": []},
        headers=auth_header(student),
    )
    submission_id = res.json()["submissionId"]

    # Another student cannot read this submission's status (404, not leaked).
    seen = client.get(f"/v1/student/submissions/{submission_id}/status", headers=auth_header(other))
    assert seen.status_code == 404


def test_stale_processing_job_is_reclaimed(client, world, db):
    """Crash recovery: a job stuck in 'processing' (worker died mid-job) is put
    back to 'queued' and retried on the next drain."""
    from datetime import datetime, timedelta, timezone

    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Queue Crash Recovery", question_ids=["q_uni_1"])

    res = client.post(
        f"/v1/student/exams/{paper_id}/submit",
        json={"examId": paper_id, "isDemo": True, "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}]},
        headers=auth_header(student),
    )
    submission_id = res.json()["submissionId"]

    # Simulate a crash mid-job: mark it 'processing' with an old timestamp.
    job = db.get(SubmissionJob, submission_id)
    job.status = "processing"
    job.updated_at = datetime.now(timezone.utc) - timedelta(seconds=999)
    db.commit()

    # A drain reclaims the stale job and completes it.
    _drain(get_settings())
    db.expire_all()
    reclaimed = db.get(SubmissionJob, submission_id)
    assert reclaimed.status == "completed", reclaimed.status


def test_batch_processes_multiple_jobs_in_one_drain(client, world, db):
    """A single drain processes a whole claimed batch (concurrently), not one."""
    faculty = world["faculty"]
    student = world["student"]
    # Multiple queued jobs at once. Use demo submissions so they don't pollute
    # the shared student's real CGPA/analytics state (demo attempts are excluded)
    # while still exercising the worker's batch processing.
    submission_ids = []
    for i, qid in enumerate(["q_uni_1", "q_uni_2"]):
        paper_id = _publish_paper(client, faculty, title=f"Batch Paper {i}", question_ids=[qid])
        res = client.post(
            f"/v1/student/exams/{paper_id}/submit",
            json={
                "examId": paper_id,
                "isDemo": True,
                "questionAttempts": [{"questionId": qid, "response": {"selected": 0}}],
            },
            headers=auth_header(student),
        )
        assert res.status_code == 202, res.text
        submission_ids.append(res.json()["submissionId"])

    # One drain (batch size defaults to 4) processes both jobs in a single cycle.
    _drain(get_settings())

    for sid in submission_ids:
        payload = client.get(f"/v1/student/submissions/{sid}/status", headers=auth_header(student)).json()
        assert payload["status"] == "completed", payload


def test_queue_metrics_shape(client, world):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Queue Metrics", question_ids=["q_uni_1"])
    client.post(
        f"/v1/student/exams/{paper_id}/submit",
        json={"examId": paper_id, "questionAttempts": []},
        headers=auth_header(student),
    )
    metrics = asyncio.get_event_loop().run_until_complete(PgSubmissionService(get_settings()).queue_metrics())
    assert set(metrics.keys()) == {"queue_depth", "dead_letter_count", "processed_last_minute", "worker_status"}
    assert metrics["queue_depth"] >= 1
