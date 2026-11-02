from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = (UniqueConstraint("course_id", "batch_id", "session_date"),)

    id: Mapped[str] = uuid_pk()
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    batch_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("batches.id"))
    marked_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"))
    session_date: Mapped[datetime] = mapped_column(Date)
    topic: Mapped[Optional[str]] = mapped_column(String(255))


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("attendance_sessions.id"), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), primary_key=True)
    mark: Mapped[str] = mapped_column(String(16))


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    course_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("courses.id"))
    faculty_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("faculty_profiles.user_id"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[Optional[str]] = mapped_column(Text)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    max_marks: Mapped[Optional[float]]
    status: Mapped[str] = mapped_column(String(32), default="published")
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id"),)

    id: Mapped[str] = uuid_pk()
    assignment_id: Mapped[str] = mapped_column(String(36), ForeignKey("assignments.id"))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"))
    files: Mapped[Optional[str]] = mapped_column(Text, default="[]")
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    marks: Mapped[Optional[float]]
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    graded_by: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    graded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    author_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[Optional[str]] = mapped_column(Text)
    audience: Mapped[Optional[str]] = mapped_column(Text, default="{}")
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
