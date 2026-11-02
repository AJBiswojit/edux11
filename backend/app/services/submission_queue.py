"""Queue-based exam submission service.

Enqueues exam submission jobs into Redis, tracks per-submission status,
and exposes queue metrics for the admin dashboard.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

import redis.asyncio as aioredis
import structlog
from fastapi import HTTPException, status

from app.core.config import Settings

log = structlog.get_logger("medixo")

# ---------------------------------------------------------------------------
# Redis key constants
# ---------------------------------------------------------------------------

QUEUE_KEY = "exam_submissions:queue"
PROCESSING_KEY = "exam_submissions:processing"
DLQ_KEY = "exam_submissions:dead_letter"
HEARTBEAT_KEY = "exam_submissions:worker:heartbeat"
METRICS_KEY_PREFIX = "exam_submissions:metrics"


def _status_key(submission_id: str) -> str:
    return f"exam_submissions:status:{submission_id}"


def _lock_key(attempt_id: str) -> str:
    return f"exam_submissions:status:lock:{attempt_id}"


# ---------------------------------------------------------------------------
# SubmissionService
# ---------------------------------------------------------------------------


class SubmissionService:
    """Manages the Redis-backed exam submission queue."""

    def __init__(self, redis_client: aioredis.Redis, settings: Settings) -> None:
        self._redis = redis_client
        self._settings = settings

    # ------------------------------------------------------------------
    # Task 2.1 — enqueue_submission
    # ------------------------------------------------------------------

    async def enqueue_submission(
        self,
        *,
        student_id: str,
        institution_id: str,
        exam_id: str,
        attempt_id: str | None,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        """Validate, de-duplicate, and push a submission job onto the queue.

        Returns a dict with ``submissionId``, ``status``, and ``message``.

        Raises:
            HTTPException 400: ``examId`` field is absent or blank.
            HTTPException 409: A job for this ``attempt_id`` is already
                queued or processing.
            redis.RedisError / redis.ConnectionError: propagated to caller.
        """
        # Validate examId
        exam_id_in_body: Any = body.get("examId")
        if not exam_id_in_body or not str(exam_id_in_body).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="examId is required",
            )

        # Duplicate check via attempt-level lock key
        if attempt_id:
            lock_data: dict[bytes, bytes] = await self._redis.hgetall(_lock_key(attempt_id))
            if lock_data:
                current_status = lock_data.get(b"status", b"").decode()
                if current_status in {"queued", "processing"}:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Submission already in progress",
                    )

        # Generate a fresh submission ID
        submission_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()

        # Build the job payload
        job: dict[str, Any] = {
            "submission_id": submission_id,
            "student_id": student_id,
            "institution_id": institution_id,
            "exam_id": exam_id,
            "attempt_id": attempt_id,
            "body": body,
            "attempt_count": 0,
            "enqueued_at": now_iso,
            "retry_after": None,
        }

        # Push to queue (LPUSH — worker uses BLMOVE RIGHT LEFT, i.e. pops from right → FIFO)
        await self._redis.lpush(QUEUE_KEY, json.dumps(job))

        # Persist status hash for the submission
        await self._redis.hset(
            _status_key(submission_id),
            mapping={
                "status": "queued",
                "updated_at": now_iso,
                "student_id": student_id,
                "exam_id": exam_id,
            },
        )

        # Attempt-level lock key so duplicate calls are rejected
        if attempt_id:
            await self._redis.hset(
                _lock_key(attempt_id),
                mapping={
                    "status": "queued",
                    "submission_id": submission_id,
                },
            )
            await self._redis.expire(
                _lock_key(attempt_id),
                self._settings.queue_status_ttl_seconds,
            )

        # Set TTL on the status hash
        await self._redis.expire(
            _status_key(submission_id),
            self._settings.queue_status_ttl_seconds,
        )

        log.info(
            "submission_enqueued",
            submission_id=submission_id,
            student_id=student_id,
            exam_id=exam_id,
        )

        return {
            "submissionId": submission_id,
            "status": "queued",
            "message": "Your exam has been submitted. Results will be available shortly.",
        }

    # ------------------------------------------------------------------
    # Task 2.5 — get_status
    # ------------------------------------------------------------------

    async def get_status(self, submission_id: str, student_id: str) -> dict[str, Any]:
        """Return the current status of a submission.

        Raises:
            HTTPException 404: submission not found, expired, or belongs to
                a different student (ownership check is indistinguishable
                from not-found to the caller).
        """
        raw: dict[bytes, bytes] = await self._redis.hgetall(_status_key(submission_id))

        if not raw:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found",
            )

        # Decode bytes → str
        data: dict[str, str] = {k.decode(): v.decode() for k, v in raw.items()}

        # Ownership check — intentionally same 404 to avoid information leakage
        if data.get("student_id") != student_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found",
            )

        out: dict[str, Any] = {
            "submissionId": submission_id,
            "status": data["status"],
            "updatedAt": data["updated_at"],
        }

        if data.get("attempt_id"):
            out["attemptId"] = data["attempt_id"]

        if data.get("error"):
            out["message"] = data["error"]

        return out

    # ------------------------------------------------------------------
    # Task 2.8 — queue_metrics
    # ------------------------------------------------------------------

    async def queue_metrics(self) -> dict[str, Any]:
        """Return current queue health metrics.

        Raises:
            redis.RedisError: propagated to caller (admin endpoint returns 503).
        """
        queue_depth: int = await self._redis.llen(QUEUE_KEY)
        dead_letter_count: int = await self._redis.llen(DLQ_KEY)

        minute_key = (
            f"{METRICS_KEY_PREFIX}:"
            f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
        )
        val = await self._redis.get(minute_key)
        processed_last_minute: int = int(val) if val else 0

        heartbeat = await self._redis.get(HEARTBEAT_KEY)
        worker_status: str = "running" if heartbeat else "stopped"

        return {
            "queue_depth": queue_depth,
            "dead_letter_count": dead_letter_count,
            "processed_last_minute": processed_last_minute,
            "worker_status": worker_status,
        }
