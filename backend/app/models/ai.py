from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, uuid_pk


class AiPromptTemplate(Base):
    __tablename__ = "ai_prompt_templates"
    __table_args__ = (UniqueConstraint("institution_id", "code", "version"),)

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("institutions.id"))
    code: Mapped[str] = mapped_column(String(64))
    version: Mapped[int]
    body: Mapped[str] = mapped_column(Text)


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    channel: Mapped[str] = mapped_column(String(32))  # mentor | teaching_studio | executive | support
    title: Mapped[Optional[str]] = mapped_column(String(255))
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AiMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = uuid_pk()
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("ai_conversations.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(Text)
    citations: Mapped[Optional[str]] = mapped_column(Text)
    prompt_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("ai_prompt_templates.id"))
    model_id: Mapped[Optional[str]] = mapped_column(String(64))
    tokens_in: Mapped[Optional[int]] = mapped_column(Integer)
    tokens_out: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class AiTrace(Base):
    __tablename__ = "ai_traces"

    id: Mapped[str] = uuid_pk()
    institution_id: Mapped[str] = mapped_column(String(36), ForeignKey("institutions.id"))
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"))
    feature: Mapped[str] = mapped_column(String(64), index=True)
    request: Mapped[str] = mapped_column(Text)
    response_meta: Mapped[Optional[str]] = mapped_column(Text)
    latency_ms: Mapped[Optional[int]]
    status: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
