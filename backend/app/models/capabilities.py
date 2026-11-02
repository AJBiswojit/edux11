"""Phase 4 tables: micro-assessments, lectures, timetable, research, reports."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class MicroAssessment(Base, TimestampMixin):
    __tablename__ = "micro_assessments"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text)
    instructions: Mapped[Optional[str]] = mapped_column(Text)
    subject: Mapped[Optional[str]] = mapped_column(String(128))
    chapter: Mapped[Optional[str]] = mapped_column(String(255))
    topic: Mapped[Optional[str]] = mapped_column(String(255))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=15)
    deadline_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    generation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("question_generations.id"))
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class MicroAssessmentQuestion(Base):
    __tablename__ = "micro_assessment_questions"

    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("micro_assessments.id"), primary_key=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    snapshot: Mapped[Optional[str]] = mapped_column(Text)


class MicroAssessmentTarget(Base):
    __tablename__ = "micro_assessment_targets"
    __table_args__ = (UniqueConstraint("assessment_id", "student_id"),)

    id: Mapped[str] = uuid_pk()
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("micro_assessments.id"), index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class MicroAssessmentAttempt(Base, TimestampMixin):
    __tablename__ = "micro_assessment_attempts"

    id: Mapped[str] = uuid_pk()
    assessment_id: Mapped[str] = mapped_column(String(36), ForeignKey("micro_assessments.id"), index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), index=True)
    answers: Mapped[str] = mapped_column(Text, default="{}")
    scoring: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="in_progress")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class LessonPlan(Base):
    __tablename__ = "lesson_plans"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"), index=True)
    course_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("courses.id"))
    payload: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    faculty_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"))
    course_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("courses.id"))
    batch_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("batches.id"))
    room: Mapped[Optional[str]] = mapped_column(String(64))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    topic: Mapped[Optional[str]] = mapped_column(String(255))
    slot_type: Mapped[Optional[str]] = mapped_column(String(32))


class ResearchPublication(Base, TimestampMixin):
    __tablename__ = "research_publications"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"), index=True)
    title: Mapped[str] = mapped_column(String(512))
    venue: Mapped[Optional[str]] = mapped_column(String(255))
    year: Mapped[Optional[int]]
    kind: Mapped[str] = mapped_column(String(32), default="paper")
    doi: Mapped[Optional[str]] = mapped_column(String(128))
    citations: Mapped[int] = mapped_column(Integer, default=0)
    extra: Mapped[Optional[str]] = mapped_column(Text)


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    owner_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    scope: Mapped[str] = mapped_column(String(64), default="faculty")
    template_code: Mapped[str] = mapped_column(String(128), default="custom")
    payload: Mapped[str] = mapped_column(Text, default="{}")
    object_key: Mapped[Optional[str]] = mapped_column(String(512))
    file_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("files.id"))
    status: Mapped[str] = mapped_column(String(32), default="queued")
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
