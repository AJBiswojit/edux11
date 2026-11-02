from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class ExamSitting(Base):
    __tablename__ = "exam_sittings"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id"))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"))
    attempt_kind: Mapped[str] = mapped_column(String(32), default="practice")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    server_seed: Mapped[Optional[str]] = mapped_column(String(64))


class ExamAttempt(Base):
    """Canonical exam attempt — matches frontend Phase 0 contract."""

    __tablename__ = "exam_attempts"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    sitting_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("exam_sittings.id"))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), index=True)
    roll_no: Mapped[str] = mapped_column(String(32))
    batch_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("batches.id"))
    section_id: Mapped[Optional[str]] = mapped_column(String(16))
    exam_id: Mapped[Optional[str]] = mapped_column(String(36))
    exam_name: Mapped[str] = mapped_column(String(255))
    exam_mode: Mapped[str] = mapped_column(String(32), index=True)
    exam_family: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    source: Mapped[str] = mapped_column(String(32), default="exam_agent")
    attempt_kind: Mapped[str] = mapped_column(String(32), default="practice")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    intervention_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # Proctoring: number of times the student left the exam window (tab switch /
    # blur). On the 4th the attempt is auto-submitted with terminated=True.
    proctor_violations: Mapped[int] = mapped_column(Integer, default=0)
    terminated: Mapped[bool] = mapped_column(Boolean, default=False)
    termination_reason: Mapped[Optional[str]] = mapped_column(String(255))
    exam_snapshot: Mapped[str] = mapped_column(Text)
    timing: Mapped[str] = mapped_column(Text)
    scoring: Mapped[str] = mapped_column(Text)
    interactions: Mapped[Optional[str]] = mapped_column(Text)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    # Resume: faculty can reopen a terminated attempt so the student resumes.
    resume_granted: Mapped[bool] = mapped_column(Boolean, default=False)
    resume_granted_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    resume_granted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)


class ExamQuestionAttempt(Base):
    __tablename__ = "exam_question_attempts"

    id: Mapped[str] = uuid_pk()
    attempt_id: Mapped[str] = mapped_column(String(36), ForeignKey("exam_attempts.id"), index=True)
    question_id: Mapped[Optional[str]] = mapped_column(String(36))
    question_number: Mapped[int] = mapped_column(Integer)
    question_snapshot: Mapped[str] = mapped_column(Text)
    academic_context: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    timing: Mapped[str] = mapped_column(Text)
    behaviour: Mapped[str] = mapped_column(Text)
    evaluation: Mapped[str] = mapped_column(Text)


class SubmissionJob(Base):
    """Postgres-backed exam submission queue (replaces the Redis queue).

    One row per queued submission. A background worker claims pending rows with
    SELECT ... FOR UPDATE SKIP LOCKED, runs the scoring/persistence, and writes
    the status back here. `attempt_id` lets us de-duplicate an in-flight submit.
    """

    __tablename__ = "submission_jobs"

    id: Mapped[str] = uuid_pk()  # this is the submissionId
    student_id: Mapped[str] = mapped_column(String(36), index=True)
    institution_id: Mapped[Optional[str]] = mapped_column(String(36))
    exam_id: Mapped[str] = mapped_column(String(36), index=True)
    attempt_id: Mapped[Optional[str]] = mapped_column(String(36), index=True)
    body: Mapped[str] = mapped_column(Text)  # the full submit payload (JSON)
    status: Mapped[str] = mapped_column(String(16), default="queued", index=True)  # queued|processing|completed|failed
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    result_attempt_id: Mapped[Optional[str]] = mapped_column(String(36))
    error: Mapped[Optional[str]] = mapped_column(String(512))
    retry_after: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
