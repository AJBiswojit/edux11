from datetime import date
from typing import Optional

from sqlalchemy import Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class StudentProfile(Base):
    __tablename__ = "student_profiles"
    __table_args__ = (UniqueConstraint("institution_id", "roll_no"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    roll_no: Mapped[str] = mapped_column(String(32), index=True)
    enrollment_no: Mapped[Optional[str]] = mapped_column(String(64))
    program_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("programs.id"))
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"))
    batch_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("batches.id"))
    section: Mapped[Optional[str]] = mapped_column(String(16))
    admission_year: Mapped[Optional[int]]
    academic_status: Mapped[str] = mapped_column(String(32), default="regular")
    cgpa: Mapped[Optional[float]]
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(32))
    extra: Mapped[Optional[str]] = mapped_column(Text, default="{}")
    is_deleted: Mapped[bool] = mapped_column(default=False)


class FacultyProfile(Base):
    __tablename__ = "faculty_profiles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    department_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("departments.id"))
    designation: Mapped[Optional[str]] = mapped_column(String(128))
    specialization: Mapped[Optional[str]] = mapped_column(String(255))
    employee_no: Mapped[Optional[str]] = mapped_column(String(64))


class Enrollment(Base):
    __tablename__ = "enrollments"

    id: Mapped[str] = uuid_pk()
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    term_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("academic_terms.id"))
    status: Mapped[str] = mapped_column(String(32), default="active")


class Guardian(Base):
    __tablename__ = "guardians"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))


class GuardianStudent(Base):
    __tablename__ = "guardian_students"

    guardian_id: Mapped[str] = mapped_column(String(36), ForeignKey("guardians.user_id"), primary_key=True)
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("student_profiles.user_id"), primary_key=True)
    relationship: Mapped[Optional[str]] = mapped_column(String(64))
