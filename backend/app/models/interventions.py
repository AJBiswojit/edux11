from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class IssueGroup(Base):
    __tablename__ = "issue_groups"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    fingerprint: Mapped[str] = mapped_column(Text)
    similarity_score: Mapped[Optional[float]]
    evidence: Mapped[str] = mapped_column(Text)
    why_detected: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    group_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("issue_groups.id"))
    faculty_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"))
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="detected")
    priority: Mapped[str] = mapped_column(String(16), default="medium")
    objectives: Mapped[Optional[str]] = mapped_column(Text)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text)
    expected_outcome: Mapped[Optional[str]] = mapped_column(Text)
    practice_config: Mapped[Optional[str]] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    approved_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    assigned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class InterventionStudent(Base):
    __tablename__ = "intervention_students"

    id: Mapped[str] = uuid_pk()
    intervention_id: Mapped[str] = mapped_column(String(36), ForeignKey("interventions.id"), index=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), index=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(32), default="assigned")


class InterventionStatusHistory(Base):
    __tablename__ = "intervention_status_history"

    id: Mapped[str] = uuid_pk()
    intervention_id: Mapped[str] = mapped_column(String(36), ForeignKey("interventions.id"), index=True)
    from_status: Mapped[Optional[str]] = mapped_column(String(32))
    to_status: Mapped[str] = mapped_column(String(32))
    changed_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    note: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class InterventionEffectiveness(Base):
    __tablename__ = "intervention_effectiveness"

    id: Mapped[str] = uuid_pk()
    intervention_id: Mapped[str] = mapped_column(String(36), ForeignKey("interventions.id"), index=True)
    metric: Mapped[str] = mapped_column(String(64))
    baseline: Mapped[Optional[float]]
    observed: Mapped[Optional[float]]
    notes: Mapped[Optional[str]] = mapped_column(Text)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
