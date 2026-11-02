from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, uuid_pk


class Department(Base, TimestampMixin):
    __tablename__ = "departments"
    __table_args__ = (UniqueConstraint("institution_id", "code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    code: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(255))
    hod_user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    is_deleted: Mapped[bool] = mapped_column(default=False)


class Program(Base, TimestampMixin):
    __tablename__ = "programs"
    __table_args__ = (UniqueConstraint("institution_id", "code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(255))
    degree_type: Mapped[Optional[str]] = mapped_column(String(64))
    duration_years: Mapped[Optional[int]]
    is_deleted: Mapped[bool] = mapped_column(default=False)


class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(255))
    exam_mode: Mapped[str] = mapped_column(String(32), default="university")
    exam_family: Mapped[Optional[str]] = mapped_column(String(16))
    is_deleted: Mapped[bool] = mapped_column(default=False)


class Course(Base, TimestampMixin):
    __tablename__ = "courses"
    __table_args__ = (UniqueConstraint("institution_id", "code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    program_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("programs.id"))
    subject_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subjects.id"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(255))
    credits: Mapped[Optional[float]]
    semester_no: Mapped[Optional[int]]
    is_deleted: Mapped[bool] = mapped_column(default=False)


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[str] = uuid_pk()
    subject_id: Mapped[str] = mapped_column(String(36), ForeignKey("subjects.id"))
    course_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("courses.id"))
    name: Mapped[str] = mapped_column(String(255))
    unit_no: Mapped[Optional[int]]
    sort_order: Mapped[int] = mapped_column(default=0)


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = uuid_pk()
    chapter_id: Mapped[str] = mapped_column(String(36), ForeignKey("chapters.id"))
    name: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(default=0)


class AcademicTerm(Base):
    __tablename__ = "academic_terms"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    name: Mapped[str] = mapped_column(String(64))
    academic_year: Mapped[str] = mapped_column(String(16))
    is_current: Mapped[bool] = mapped_column(default=False)


class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (UniqueConstraint("institution_id", "code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255))
    exam_mode: Mapped[str] = mapped_column(String(32))
    exam_family: Mapped[Optional[str]] = mapped_column(String(16))
    program_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("programs.id"))
    term_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("academic_terms.id"))
    section: Mapped[Optional[str]] = mapped_column(String(16))
    is_deleted: Mapped[bool] = mapped_column(default=False)


class Campus(Base):
    __tablename__ = "campuses"
    __table_args__ = (UniqueConstraint("institution_id", "name"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[Optional[str]] = mapped_column(String(128))
    student_count: Mapped[Optional[int]]


class CalendarEvent(Base):
    __tablename__ = "calendar_events"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    title: Mapped[str] = mapped_column(String(255))
    kind: Mapped[str] = mapped_column(String(32))
    starts_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    payload: Mapped[Optional[str]] = mapped_column(Text, default="{}")
