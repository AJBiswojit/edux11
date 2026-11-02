"""Keep student auth alive for the duration of an open exam sitting.

While a student has an unsubmitted attempt, access tokens and the single-device
session lock are pinned to the sitting deadline (+ grace) so a 30-minute
default access TTL cannot kick them out mid-exam.

Example: a 200-minute paper gets auth until start+200m, plus
``exam_auth_grace_minutes`` (default 60) → ~260 minutes total from start.
Any ``paper.duration_minutes`` value is supported (not capped at 120/180).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.assessment import Paper
from app.models.exams import ExamAttempt, ExamSitting
from app.models.identity import User


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def open_exam_auth_deadline(db: Session, user: User) -> datetime | None:
    """Latest auth deadline covering any open (unsubmitted) exam attempt.

    Returns None when the student is not mid-exam. Otherwise returns
    sitting/paper end time plus ``exam_auth_grace_minutes`` so submit /
    autosave still work briefly after the clock hits zero.
    """
    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.submitted_at.is_(None),
        )
    ).all()
    if not attempts:
        return None

    settings = get_settings()
    grace = timedelta(minutes=max(1, int(settings.exam_auth_grace_minutes)))
    latest_end: datetime | None = None

    for attempt in attempts:
        candidate: datetime | None = None
        if attempt.sitting_id:
            sitting = db.get(ExamSitting, attempt.sitting_id)
            if sitting and sitting.expires_at is not None:
                candidate = _as_utc(sitting.expires_at)
        if candidate is None:
            paper = db.get(Paper, attempt.exam_id) if attempt.exam_id else None
            duration = (paper.duration_minutes if paper and paper.duration_minutes else None) or 120
            started = _as_utc(attempt.started_at) if attempt.started_at else datetime.now(timezone.utc)
            candidate = started + timedelta(minutes=int(duration))
        if latest_end is None or candidate > latest_end:
            latest_end = candidate

    assert latest_end is not None
    deadline = latest_end + grace
    if deadline <= datetime.now(timezone.utc):
        # Abandoned attempt (never submitted, clock long gone): treat the
        # student as not mid-exam so normal TTL and session rotation resume.
        return None
    return deadline


def access_minutes_until(deadline: datetime) -> int:
    """Minutes of access-token life needed to reach ``deadline`` (at least default TTL)."""
    settings = get_settings()
    remaining = (_as_utc(deadline) - datetime.now(timezone.utc)).total_seconds() / 60.0
    needed = max(1, int(remaining) + 1)
    return max(settings.access_token_expire_minutes, needed)
