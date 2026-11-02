"""Queue worker for processing exam submission jobs from Redis.

Dequeues jobs atomically via BLMOVE, processes them with a fresh SQLAlchemy
session, handles retries with exponential back-off, and moves exhausted jobs
to a dead-letter store.
"""
from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass
from datetime import datetime, timezone

import redis.asyncio as aioredis
import structlog
from fastapi import HTTPException

from app.core.config import Settings
from app.db.session import SessionLocal
from app.services.submission_queue import (
    DLQ_KEY,
    HEARTBEAT_KEY,
    METRICS_KEY_PREFIX,
    PROCESSING_KEY,
    QUEUE_KEY,
    _status_key,
)

log = structlog.get_logger("medixo")


# ---------------------------------------------------------------------------
# Lightweight mock user — avoids a DB round-trip in the worker hot path.
# submit_exam_attempt only needs .id, .institution_id, and .primary_role
# (and .status for any active-check guards).
# ---------------------------------------------------------------------------


@dataclass
class _MockUser:
    id: str
    institution_id: str
    primary_role: str = "student"
    status: str = "active"


# ---------------------------------------------------------------------------
# User-facing error message helper
# ---------------------------------------------------------------------------


def _user_facing_message(exc: Exception) -> str:
    """Return a sanitised, user-facing error string for a failed job."""
    from sqlalchemy.exc import SQLAlchemyError  # local import to avoid startup cost

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


# ---------------------------------------------------------------------------
# QueueWorker
# ---------------------------------------------------------------------------


class QueueWorker:
    """Background asyncio worker that dequeues and processes submission jobs."""

    def __init__(self, redis_client: aioredis.Redis, settings: Settings) -> None:
        self._redis = redis_client
        self._settings = settings
        self._semaphore = asyncio.Semaphore(settings.queue_worker_concurrency)

    # ------------------------------------------------------------------
    # Task 3.1 — main worker loop
    # ------------------------------------------------------------------

    async def start(self) -> None:
        """Main worker loop. Runs until cancelled (app shutdown)."""
        log.info("queue_worker_started")
        try:
            while True:
                # Heartbeat: keep alive every iteration (TTL 10s)
                await self._redis.set(HEARTBEAT_KEY, "1", ex=10)

                # BLMOVE with 2s timeout — atomic dequeue into processing list
                job_json = await self._redis.blmove(
                    QUEUE_KEY, PROCESSING_KEY, 2.0, "RIGHT", "LEFT"
                )

                if job_json is None:
                    # Timeout — loop to refresh heartbeat
                    continue

                # Decode bytes if needed
                if isinstance(job_json, bytes):
                    job_json_str = job_json.decode()
                else:
                    job_json_str = str(job_json)

                # Warn if queue is getting deep
                queue_depth = await self._redis.llen(QUEUE_KEY)
                if queue_depth >= 200:
                    log.warning(
                        "queue_depth_threshold_exceeded",
                        queue_depth=queue_depth,
                        threshold_exceeded=True,
                    )

                job = json.loads(job_json_str)
                job["_raw_json"] = job_json_str  # store original for LREM later

                # Acquire semaphore then spawn task (non-blocking for worker loop)
                await self._semaphore.acquire()
                asyncio.create_task(self._process_job(job))

        except asyncio.CancelledError:
            log.info("queue_worker_stopped")
            raise

    # ------------------------------------------------------------------
    # Task 3.4 — process a single job
    # ------------------------------------------------------------------

    async def _process_job(self, job: dict) -> None:
        """Process a single submission job. Opens a fresh DB session."""
        submission_id = job["submission_id"]
        job_json_str = job.pop("_raw_json")  # remove helper field before processing
        t0 = time.monotonic()

        # Mark as processing in Redis
        await self._redis.hset(
            _status_key(submission_id),
            mapping={
                "status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        db = SessionLocal()
        result_attempt_id = None
        try:
            # Import here to avoid circular imports at module load time
            from app.services.examination import submit_exam_attempt  # noqa: PLC0415

            # Build a lightweight mock user from job payload (no DB query)
            mock_user = _MockUser(
                id=job["student_id"],
                institution_id=job["institution_id"],
                primary_role="student",
            )

            # submit_exam_attempt handles scoring, DB commit, AND rebuild_student_dna
            # internally — do NOT call rebuild_student_dna separately from the worker.
            result = submit_exam_attempt(
                db,
                mock_user,
                job["body"],
                exam_id=job["exam_id"],
                attempt_id=job["attempt_id"],
            )
            result_attempt_id = result.get("id")

            # Update status to completed
            await self._redis.hset(
                _status_key(submission_id),
                mapping={
                    "status": "completed",
                    "attempt_id": result_attempt_id or "",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            )

            # Increment per-minute metrics counter
            minute_key = (
                f"{METRICS_KEY_PREFIX}:"
                f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
            )
            await self._redis.incr(minute_key)
            await self._redis.expire(minute_key, 120)

            processing_time_ms = int((time.monotonic() - t0) * 1000)
            log.info(
                "job_completed",
                submission_id=submission_id,
                attempt_id=result_attempt_id,
                exam_id=job["exam_id"],
                processing_time_ms=processing_time_ms,
            )

        except Exception as exc:
            await self._handle_failure(job, exc, job_json_str)

        finally:
            # Always remove from processing list and release semaphore
            await self._redis.lrem(PROCESSING_KEY, 1, job_json_str)
            db.close()
            self._semaphore.release()

    # ------------------------------------------------------------------
    # Task 3.7 — failure handling and dead-letter routing
    # ------------------------------------------------------------------

    async def _handle_failure(
        self, job: dict, exc: Exception, original_job_json: str
    ) -> None:
        """Handle a failed job: retry with back-off or move to dead-letter."""
        submission_id = job["submission_id"]

        log.error(
            "job_failed",
            submission_id=submission_id,
            attempt_count=job["attempt_count"],
            error_type=type(exc).__name__,
            error_message=str(exc)[:500],
        )

        # Classify: non-retryable if HTTPException with 4xx
        is_non_retryable = isinstance(exc, HTTPException) and 400 <= exc.status_code < 500

        if is_non_retryable:
            await self._dead_letter(job, original_job_json, _user_facing_message(exc))
            return

        # Retryable path — increment attempt counter
        job["attempt_count"] += 1

        if job["attempt_count"] >= self._settings.queue_max_retries:
            await self._dead_letter(job, original_job_json, _user_facing_message(exc))
            return

        # Exponential-ish delay capped at 60s
        delay = min(
            self._settings.queue_retry_delay_seconds * job["attempt_count"], 60
        )
        job["retry_after"] = (
            datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        )

        await self._redis.hset(
            _status_key(submission_id),
            mapping={
                "status": "processing",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        # Sleep without blocking the worker loop (this runs in its own task)
        await asyncio.sleep(delay)

        # Re-enqueue the updated job (strip the helper key if it snuck back in)
        job.pop("_raw_json", None)
        updated_json = json.dumps(job)
        await self._redis.lpush(QUEUE_KEY, updated_json)
        await self._redis.lrem(PROCESSING_KEY, 1, original_job_json)

    async def _dead_letter(
        self, job: dict, original_job_json: str, error_message: str
    ) -> None:
        """Move a job to the dead-letter store and mark it as failed."""
        submission_id = job["submission_id"]
        job_copy = {k: v for k, v in job.items() if k != "_raw_json"}

        await self._redis.lpush(DLQ_KEY, json.dumps(job_copy))
        await self._redis.hset(
            _status_key(submission_id),
            mapping={
                "status": "failed",
                "error": error_message[:500],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        await self._redis.lrem(PROCESSING_KEY, 1, original_job_json)

        log.error(
            "job_dead_lettered",
            submission_id=submission_id,
            attempt_count=job["attempt_count"],
            error_type="dead_letter",
            error_message=error_message[:500],
        )
