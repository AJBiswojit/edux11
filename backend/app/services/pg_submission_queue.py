"""Postgres-backed exam submission queue (no Redis).

Drop-in replacement for the Redis SubmissionService/QueueWorker. A submission is
a row in ``submission_jobs``; a background worker claims pending rows with
``SELECT ... FOR UPDATE SKIP LOCKED``, runs the scoring/persistence via
``submit_exam_attempt``, and writes the status back on the same row.

Public contract matches the Redis version exactly:
  - enqueue_submission(...) -> {"submissionId", "status", "message"}
  - get_status(submission_id, student_id) -> {"submissionId", "status", "updatedAt", (+attemptId/+message)}
  - queue_metrics() -> {"queue_depth", "dead_letter_count", "processed_last_minute", "worker_status"}
Status strings: queued | processing | completed | failed.
"""

from __future__ import annotations

import asyncio
import json
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog
from fastapi import HTTPException, status
from sqlalchemy import func, select, text

from app.core.config import Settings
from app.db.session import SessionLocal
from app.models.exams import SubmissionJob

log = structlog.get_logger("medixo")

# Worker heartbeat: last time the in-process worker completed a drain cycle.
# queue_metrics() uses it to report an honest worker_status (no Redis needed).
_worker_heartbeat: float = 0.0
_HEARTBEAT_STALE_SECONDS = 15.0


@dataclass
class _MockUser:
    """Lightweight user for the worker hot path (no DB round-trip)."""

    id: str
    institution_id: str
    primary_role: str = "student"
    status: str = "active"


def _user_facing_message(exc: Exception) -> str:
    from sqlalchemy.exc import SQLAlchemyError

    if isinstance(exc, HTTPException):
        if exc.status_code == 404:
            return "The exam could not be found. Please contact your institution."
        if exc.status_code == 403:
            return "You are not authorized to submit this exam."
        if exc.status_code == 409:
            return "This exam has already been submitted."
    if isinstance(exc, SQLAlchemyError):
        return "A database error occurred. Your answers have been saved and will be processed."
    return "An unexpected error occurred. Please contact support."


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PgSubmissionService:
    """Producer/reader for the Postgres submission queue."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def enqueue_submission(
        self,
        *,
        student_id: str,
        institution_id: str,
        exam_id: str,
        attempt_id: str | None,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        exam_id_in_body = body.get("examId")
        if not exam_id_in_body or not str(exam_id_in_body).strip():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "examId is required")

        db = SessionLocal()
        try:
            # De-duplicate: an in-flight job for the same attempt is rejected.
            if attempt_id:
                existing = db.scalars(
                    select(SubmissionJob.id).where(
                        SubmissionJob.attempt_id == attempt_id,
                        SubmissionJob.status.in_(("queued", "processing")),
                    )
                ).first()
                if existing:
                    raise HTTPException(status.HTTP_409_CONFLICT, "Submission already in progress")

            # Also de-duplicate by student + exam to catch rapid double-clicks
            # and network retries even when attempt_id is absent.
            existing_by_exam = db.scalars(
                select(SubmissionJob.id).where(
                    SubmissionJob.student_id == student_id,
                    SubmissionJob.exam_id == exam_id,
                    SubmissionJob.status.in_(("queued", "processing")),
                )
            ).first()
            if existing_by_exam:
                raise HTTPException(status.HTTP_409_CONFLICT, "Submission already in progress")

            job = SubmissionJob(
                student_id=student_id,
                institution_id=institution_id or None,
                exam_id=exam_id,
                attempt_id=attempt_id,
                body=json.dumps(body),
                status="queued",
                attempt_count=0,
            )
            db.add(job)
            db.commit()
            db.refresh(job)
            submission_id = job.id
        finally:
            db.close()

        log.info("submission_enqueued", submission_id=submission_id, student_id=student_id, exam_id=exam_id)
        return {
            "submissionId": submission_id,
            "status": "queued",
            "message": "Your exam has been submitted. Results will be available shortly.",
        }

    async def get_status(self, submission_id: str, student_id: str) -> dict[str, Any]:
        db = SessionLocal()
        try:
            job = db.get(SubmissionJob, submission_id)
            # Ownership check is indistinguishable from not-found (no info leak).
            if job is None or job.student_id != student_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found")
            out: dict[str, Any] = {
                "submissionId": job.id,
                "status": job.status,
                "updatedAt": (job.updated_at or job.created_at).isoformat() if (job.updated_at or job.created_at) else None,
            }
            if job.result_attempt_id:
                out["attemptId"] = job.result_attempt_id
            if job.error:
                out["message"] = job.error
            return out
        finally:
            db.close()

    async def queue_metrics(self) -> dict[str, Any]:
        db = SessionLocal()
        try:
            queue_depth = db.scalar(
                select(func.count()).select_from(SubmissionJob).where(SubmissionJob.status.in_(("queued", "processing")))
            ) or 0
            dead_letter_count = db.scalar(
                select(func.count()).select_from(SubmissionJob).where(SubmissionJob.status == "failed")
            ) or 0
            one_min_ago = _now() - timedelta(minutes=1)
            processed_last_minute = db.scalar(
                select(func.count()).select_from(SubmissionJob).where(
                    SubmissionJob.status == "completed", SubmissionJob.updated_at >= one_min_ago
                )
            ) or 0
            worker_alive = _worker_heartbeat > 0 and (time.monotonic() - _worker_heartbeat) < _HEARTBEAT_STALE_SECONDS
            return {
                "queue_depth": int(queue_depth),
                "dead_letter_count": int(dead_letter_count),
                "processed_last_minute": int(processed_last_minute),
                "worker_status": "running" if worker_alive else "stopped",
            }
        finally:
            db.close()


class PgQueueWorker:
    """Background poller that processes queued submission_jobs rows."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._concurrency = max(1, int(settings.queue_worker_concurrency))
        self._pool = ThreadPoolExecutor(max_workers=self._concurrency, thread_name_prefix="submitq")
        self._cycles = 0

    async def start(self) -> None:
        log.info("pg_queue_worker_started")
        try:
            while True:
                global _worker_heartbeat
                _worker_heartbeat = time.monotonic()
                processed = await asyncio.to_thread(self._drain_once)
                # Idle backoff when nothing to do; tight loop when busy.
                if processed == 0:
                    await asyncio.sleep(1.0)
        except asyncio.CancelledError:
            log.info("pg_queue_worker_stopped")
            raise
        finally:
            self._pool.shutdown(wait=False)

    def _drain_once(self) -> int:
        """Claim a batch and process the jobs concurrently. Returns how many ran."""
        # Reclaim crashed jobs occasionally, not on every idle tick.
        self._cycles += 1
        if self._cycles % 10 == 1:
            self._reclaim_stale()
        jobs = self._claim(self._concurrency)
        if not jobs:
            return 0
        # Each _process opens its own DB session, so jobs run safely in parallel.
        list(self._pool.map(self._process, jobs))
        return len(jobs)

    def _reclaim_stale(self) -> None:
        """Crash recovery: a job left 'processing' past the stale timeout (its
        worker died) is put back to 'queued' so it gets retried."""
        db = SessionLocal()
        try:
            cutoff = _now() - timedelta(seconds=self._settings.queue_stale_processing_seconds)
            stale = db.scalars(
                select(SubmissionJob).where(
                    SubmissionJob.status == "processing",
                    SubmissionJob.updated_at < cutoff,
                )
            ).all()
            for job in stale:
                job.status = "queued"
                job.updated_at = _now()
                log.warning("job_reclaimed_stale", submission_id=job.id, attempt_count=job.attempt_count)
            if stale:
                db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    def _claim(self, limit: int) -> list[str]:
        """Atomically mark up to `limit` due jobs as processing and return their ids."""
        db = SessionLocal()
        try:
            schema = (self._settings.db_schema or "").strip()
            table = f'"{schema}"."submission_jobs"' if schema else "submission_jobs"
            rows = db.execute(
                text(
                    f"""
                    WITH due AS (
                        SELECT id FROM {table}
                        WHERE status = 'queued'
                          AND (retry_after IS NULL OR retry_after <= now())
                        ORDER BY created_at
                        FOR UPDATE SKIP LOCKED
                        LIMIT :limit
                    )
                    UPDATE {table} j
                    SET status = 'processing', updated_at = now()
                    FROM due
                    WHERE j.id = due.id
                    RETURNING j.id
                    """
                ),
                {"limit": limit},
            ).all()
            db.commit()
            return [r[0] for r in rows]
        except Exception:
            db.rollback()
            # On non-Postgres (e.g. sqlite tests) FOR UPDATE SKIP LOCKED is a no-op;
            # fall back to a simple claim so the worker still functions.
            return self._claim_fallback(limit)
        finally:
            db.close()

    def _claim_fallback(self, limit: int) -> list[str]:
        db = SessionLocal()
        try:
            now = _now()
            ids = db.scalars(
                select(SubmissionJob.id)
                .where(
                    SubmissionJob.status == "queued",
                    (SubmissionJob.retry_after.is_(None)) | (SubmissionJob.retry_after <= now),
                )
                .order_by(SubmissionJob.created_at)
                .limit(limit)
            ).all()
            for job_id in ids:
                job = db.get(SubmissionJob, job_id)
                if job and job.status == "queued":
                    job.status = "processing"
                    job.updated_at = now
            db.commit()
            return list(ids)
        except Exception:
            db.rollback()
            return []
        finally:
            db.close()

    def _process(self, job_id: str) -> None:
        db = SessionLocal()
        t0 = time.monotonic()
        try:
            job = db.get(SubmissionJob, job_id)
            if job is None:
                return
            body = json.loads(job.body or "{}")
            from app.services.examination import submit_exam_attempt

            mock_user = _MockUser(id=job.student_id, institution_id=job.institution_id or "", primary_role="student")
            result = submit_exam_attempt(
                db, mock_user, body, exam_id=job.exam_id, attempt_id=job.attempt_id
            )
            job.status = "completed"
            job.result_attempt_id = result.get("id")
            job.error = None
            job.updated_at = _now()
            db.commit()
            log.info(
                "job_completed",
                submission_id=job_id,
                attempt_id=job.result_attempt_id,
                processing_time_ms=int((time.monotonic() - t0) * 1000),
            )
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            self._handle_failure(job_id, exc)
        finally:
            db.close()

    def _handle_failure(self, job_id: str, exc: Exception) -> None:
        db = SessionLocal()
        try:
            job = db.get(SubmissionJob, job_id)
            if job is None:
                return
            log.error("job_failed", submission_id=job_id, attempt_count=job.attempt_count, error_type=type(exc).__name__, error_message=str(exc)[:500])

            non_retryable = isinstance(exc, HTTPException) and 400 <= exc.status_code < 500
            job.attempt_count = (job.attempt_count or 0) + 1

            if non_retryable or job.attempt_count >= self._settings.queue_max_retries:
                job.status = "failed"
                job.error = _user_facing_message(exc)[:500]
                job.updated_at = _now()
                db.commit()
                log.error("job_dead_lettered", submission_id=job_id, attempt_count=job.attempt_count)
                return

            # Retryable: requeue with linear backoff (capped 60s).
            delay = min(self._settings.queue_retry_delay_seconds * job.attempt_count, 60)
            job.status = "queued"
            job.retry_after = _now() + timedelta(seconds=delay)
            job.updated_at = _now()
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
