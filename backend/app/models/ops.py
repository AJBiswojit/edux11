from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    actor_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(64))
    resource_type: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[Optional[str]] = mapped_column(String(64))
    before: Mapped[Optional[str]] = mapped_column(Text)
    after: Mapped[Optional[str]] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    requester_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AppKv(Base):
    """JSON document store for SPA contract documents and mutations."""

    __tablename__ = "app_kv"

    key: Mapped[str] = mapped_column(String(191), primary_key=True)
    payload: Mapped[str] = mapped_column(Text, default="null")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id: Mapped[str] = uuid_pk()
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"

    id: Mapped[str] = uuid_pk()
    name: Mapped[Optional[str]] = mapped_column(String(255))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    institution: Mapped[Optional[str]] = mapped_column(String(255))
    topic: Mapped[Optional[str]] = mapped_column(String(128))
    message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class FileObject(Base):
    __tablename__ = "files"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    owner_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    bucket: Mapped[str] = mapped_column(String(64))
    object_key: Mapped[str] = mapped_column(String(512))
    mime: Mapped[Optional[str]] = mapped_column(String(128))
    bytes: Mapped[Optional[int]]
    purpose: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
