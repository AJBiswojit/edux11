from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, uuid_pk


class Institution(Base, TimestampMixin):
    __tablename__ = "institutions"

    id: Mapped[str] = uuid_pk()
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    short_name: Mapped[Optional[str]] = mapped_column(String(32))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    academic_year: Mapped[Optional[str]] = mapped_column(String(32))
    attendance_threshold: Mapped[float] = mapped_column(default=75.0)
    pass_mark: Mapped[float] = mapped_column(default=40.0)
    settings_json: Mapped[Optional[str]] = mapped_column("settings", Text, default="{}")


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = (UniqueConstraint("institution_id", "code"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    code: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(64))


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("institution_id", "email"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    password_hash: Mapped[Optional[str]] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[Optional[str]] = mapped_column(String(80))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    status: Mapped[str] = mapped_column(String(20), default="active")
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    legacy_role: Mapped[Optional[str]] = mapped_column("role", String(32), default="student")
    # Single active session marker. Each new student login rotates this id; an
    # access token whose "sid" no longer matches is rejected, so a student can
    # only be signed in on one device at a time.
    active_session_id: Mapped[Optional[str]] = mapped_column(String(36))
    # When the current student session's access token expires. While this is in
    # the future, a new login is refused so the student cannot open a second
    # session in another tab or browser on any device.
    session_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    role_links: Mapped[list["UserRole"]] = relationship(back_populates="user")

    @property
    def roles(self) -> list[Role]:
        return [link.role for link in self.role_links if link.role is not None]

    @property
    def primary_role(self) -> str:
        codes = [r.code for r in self.roles]
        for preferred in ("admin", "faculty", "student", "parent"):
            if preferred in codes:
                return preferred
        if codes:
            return codes[0]
        if self.legacy_role:
            return self.legacy_role
        return "student"


class UserRole(Base):
    __tablename__ = "user_roles"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id"), primary_key=True)
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"), primary_key=True)

    user: Mapped[User] = relationship(back_populates="role_links")
    role: Mapped[Role] = relationship()


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = uuid_pk()
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(255))
    user_agent: Mapped[Optional[str]] = mapped_column(String(255))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[str] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), index=True)
    purpose: Mapped[str] = mapped_column(String(32))
    code_hash: Mapped[str] = mapped_column(String(255))
    attempts: Mapped[int] = mapped_column(default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class RegistrationDraft(Base):
    __tablename__ = "registration_drafts"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(32))
    payload: Mapped[str] = mapped_column(Text)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
