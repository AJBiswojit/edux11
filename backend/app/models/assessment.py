from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    exam_mode: Mapped[str] = mapped_column(String(32), index=True)
    exam_family: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id"))
    chapter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chapters.id"))
    topic_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("topics.id"))
    concept: Mapped[Optional[str]] = mapped_column(String(255))
    stem: Mapped[str] = mapped_column(Text)
    q_type: Mapped[str] = mapped_column(String(32), default="mcq")
    options: Mapped[Optional[str]] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    marks: Mapped[float] = mapped_column(default=1)
    negative_marks: Mapped[float] = mapped_column(default=1)
    difficulty: Mapped[Optional[str]] = mapped_column(String(16))
    bloom: Mapped[Optional[str]] = mapped_column(String(32))
    is_pyq: Mapped[bool] = mapped_column(Boolean, default=False)
    pyq_year: Mapped[Optional[int]]
    source: Mapped[Optional[str]] = mapped_column(String(64))
    quality_score: Mapped[Optional[float]]
    status: Mapped[str] = mapped_column(String(32), default="approved")
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))


class Paper(Base, TimestampMixin):
    __tablename__ = "papers"
    __table_args__ = (UniqueConstraint("institution_id", "paper_code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    paper_code: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(255))
    exam_mode: Mapped[str] = mapped_column(String(32))
    exam_family: Mapped[Optional[str]] = mapped_column(String(16))
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id"))
    course_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("courses.id"))
    paper_type: Mapped[Optional[str]] = mapped_column(String(64))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    total_marks: Mapped[float]
    negative_marking: Mapped[bool] = mapped_column(Boolean, default=False)
    blueprint: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    version: Mapped[int] = mapped_column(default=1)
    parent_paper_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("papers.id"))
    intervention_id: Mapped[Optional[str]] = mapped_column(String(36))
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), index=True)


class PaperQuestion(Base):
    __tablename__ = "paper_questions"

    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id"), primary_key=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"), primary_key=True)
    sort_order: Mapped[int]
    marks_override: Mapped[Optional[float]]
    snapshot: Mapped[str] = mapped_column(Text)


class PaperShare(Base):
    """Delivery record for a published SQL paper. Schema already defined in schema.sql."""

    __tablename__ = "paper_shares"

    id: Mapped[str] = uuid_pk()
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id"), index=True)
    shared_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    audience: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AiPaperShare(Base):
    """Delivery record for an AI-generated paper share.

    ai_generated_papers is owned by the external AI service (EduX reads only),
    so we cannot FK into it.  paper_id is stored as a plain VARCHAR referencing
    the ai_generated_papers.id UUID — integrity is enforced at the service layer.
    """

    __tablename__ = "ai_paper_shares"

    id: Mapped[str] = uuid_pk()
    # Reference to ai_generated_papers.id — no DB FK (EduX is read-only for that table).
    paper_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    shared_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    audience: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ContentSource(Base, TimestampMixin):
    __tablename__ = "content_sources"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    title: Mapped[str] = mapped_column(String(255))
    exam_mode: Mapped[str] = mapped_column(String(32))
    exam_family: Mapped[Optional[str]] = mapped_column(String(16))
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id"))
    object_key: Mapped[Optional[str]] = mapped_column(String(512))
    page_count: Mapped[Optional[int]]
    analysis: Mapped[Optional[str]] = mapped_column(Text)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    analysis_status: Mapped[str] = mapped_column(String(32), default="PENDING")
    analysis_error: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))


class QuestionStudioSession(Base, TimestampMixin):
    __tablename__ = "question_studio_sessions"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"))
    source_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("content_sources.id"))
    settings: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="open")


class QuestionGeneration(Base, TimestampMixin):
    """Faculty-initiated AI question generation job — real DB persistence.

    Stores the faculty's paper configuration and tracks lifecycle:
    GENERATING -> PROCESSING -> READY or FAILED.
    Generated Question rows are linked via question_generation_items.
    """

    __tablename__ = "question_generations"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), index=True)
    faculty_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="GENERATING")
    config: Mapped[str] = mapped_column(Text, default="{}")
    requested_count: Mapped[int] = mapped_column(Integer, default=0)
    generated_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(Text)


class QuestionGenerationItem(Base):
    __tablename__ = "question_generation_items"

    generation_id: Mapped[str] = mapped_column(String(36), ForeignKey("question_generations.id"), primary_key=True)
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"), primary_key=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class QuestionVersion(Base, TimestampMixin):
    __tablename__ = "question_versions"

    id: Mapped[str] = uuid_pk()
    question_id: Mapped[str] = mapped_column(String(36), ForeignKey("questions.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    stem: Mapped[str] = mapped_column(Text)
    options: Mapped[Optional[str]] = mapped_column(Text)
    correct_answer: Mapped[str] = mapped_column(Text)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))


class ContentChunk(Base):
    __tablename__ = "source_chunks"

    id: Mapped[str] = uuid_pk()
    source_id: Mapped[str] = mapped_column(String(36), ForeignKey("content_sources.id"), index=True)
    page_no: Mapped[Optional[int]]
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text)
