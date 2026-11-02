from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class StudentDnaSnapshot(Base):
    __tablename__ = "student_dna_snapshots"

    id: Mapped[str] = uuid_pk()
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), index=True)
    exam_mode: Mapped[str] = mapped_column(String(32))
    exam_family: Mapped[Optional[str]] = mapped_column(String(16))
    payload: Mapped[str] = mapped_column(Text)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class InstitutionHealthSnapshot(Base):
    __tablename__ = "institution_health_snapshots"

    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), primary_key=True)
    overall: Mapped[float]
    academic: Mapped[float]
    student_success: Mapped[float]
    attendance: Mapped[float]
    assessment: Mapped[float]
    faculty: Mapped[float]
    outcomes: Mapped[float]
    payload: Mapped[str] = mapped_column(Text)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
