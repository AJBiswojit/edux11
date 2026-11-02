from datetime import datetime
from uuid import uuid4

from sqlalchemy import DateTime, MetaData, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import get_settings


def _metadata() -> MetaData:
    settings = get_settings()
    if settings.is_sqlite:
        return MetaData()
    schema = (settings.db_schema or "").strip()
    if not schema:
        return MetaData()
    return MetaData(schema=schema)


class Base(DeclarativeBase):
    metadata = _metadata()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


def uuid_pk():
    return mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
