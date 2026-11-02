"""Models for the AI paper-generation pipeline (shared DB with the external
AI microservice).

Ownership / write model (Option A):
  * ai_paper_status            -> EduX writes (request intake + lifecycle).
  * ai_generated_papers        -> external AI service writes; EduX reads only.
  * ai_generated_paper_questions -> external AI service writes; EduX reads only.
  * ai_generation_jobs         -> external AI service (LLM audit); not modelled here.

These table definitions mirror the live `edux` schema exactly so that
Base.metadata.create_all(...) is a no-op against the existing tables. EduX must
NOT INSERT/UPDATE ai_generated_papers or ai_generated_paper_questions — those are
written by the AI service keyed on the paper_id EduX passes in.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

# PostgreSQL keeps the deployed JSONB columns exactly as-is; other dialects
# (SQLite, used by the unit-test suite) compile the generic JSON so
# Base.metadata.create_all() works there too. On PostgreSQL this renders as
# JSONB — byte-for-byte the same DDL as before.
JSONB = JSON().with_variant(JSONB, "postgresql")

from app.db.base import Base, uuid_pk


class AiPaperStatus(Base):
    """Request/job intake tracker — EduX writes this.

    Records what a faculty asked the AI to generate and where the job is in its
    lifecycle (pending -> running -> completed/failed).
    """

    __tablename__ = "ai_paper_status"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    exam_family: Mapped[str] = mapped_column(String(32), nullable=False)
    subject: Mapped[str] = mapped_column(String(64), nullable=False)
    chapters: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    difficulty: Mapped[str] = mapped_column(String(32), nullable=False, server_default="medium")
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="pending")
    created_by: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.current_timestamp(), onupdate=func.current_timestamp()
    )


class AiGeneratedPaper(Base):
    """Paper header written by the AI service. EDUX READS ONLY."""

    __tablename__ = "ai_generated_papers"
    __table_args__ = (UniqueConstraint("paper_code"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # NOTE: physical FK to ai_generation_jobs exists in the DB, but that table is
    # owned by the AI service and not modelled here. Kept as a plain column so the
    # ORM mapper resolves without needing ai_generation_jobs in Base.metadata.
    generation_job_id: Mapped[Optional[str]] = mapped_column(String(36))
    paper_code: Mapped[Optional[str]] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_mode: Mapped[str] = mapped_column(String(32), nullable=False, server_default="Competitive")
    exam_family: Mapped[Optional[str]] = mapped_column(String(32))
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id"))
    chapter_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("chapters.id"))
    topic_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("topics.id"))
    subject_name: Mapped[Optional[str]] = mapped_column(String(128))
    chapter_name: Mapped[Optional[str]] = mapped_column(String(160))
    topic_name: Mapped[Optional[str]] = mapped_column(String(160))
    total_marks: Mapped[Optional[int]] = mapped_column(Integer)
    duration_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    difficulty_mix: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    status: Mapped[str] = mapped_column(String(32), nullable=False, server_default="draft")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    published_at: Mapped[Optional[datetime]]


class AiGeneratedPaperQuestion(Base):
    """One generated question. EDUX READS ONLY."""

    __tablename__ = "ai_generated_paper_questions"
    __table_args__ = (UniqueConstraint("paper_id", "position"),)

    id: Mapped[str] = uuid_pk()
    paper_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ai_generated_papers.id"), nullable=False, index=True
    )
    question_id: Mapped[Optional[str]] = mapped_column(String(36))
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    level: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    stem_text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    correct_option: Mapped[Optional[str]] = mapped_column(String(8))
    solution: Mapped[Optional[str]] = mapped_column(Text)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    marks: Mapped[Optional[int]] = mapped_column(Integer, server_default="4")
    negative_marks: Mapped[Optional[int]] = mapped_column(Integer, server_default="1")
    contains_formula: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    has_image: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    stem_image_url: Mapped[Optional[str]] = mapped_column(Text)
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
