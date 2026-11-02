"""Persistent JSON collections for SPA contract mutations."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.ops import AppKv


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def kv_get(db: Session, key: str, default: Any) -> Any:
    row = db.get(AppKv, key)
    if row is None or not row.payload:
        return json.loads(json.dumps(default))
    try:
        return json.loads(row.payload)
    except json.JSONDecodeError:
        return json.loads(json.dumps(default))


def kv_put(db: Session, key: str, value: Any, *, commit: bool = True) -> Any:
    payload = json.dumps(value)
    row = db.get(AppKv, key)
    if row is None:
        row = AppKv(key=key, payload=payload, updated_at=datetime.now(timezone.utc))
        db.add(row)
    else:
        row.payload = payload
        row.updated_at = datetime.now(timezone.utc)
    if commit:
        db.commit()
    else:
        db.flush()
    return value


def kv_set(db: Session, key: str, value: Any) -> Any:
    return kv_put(db, key, value, commit=True)


def coll_key(kind: str, scope: str | None) -> str:
    return f"{kind}:{scope or 'platform'}"
