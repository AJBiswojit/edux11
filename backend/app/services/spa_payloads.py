"""Load SPA contract documents from Postgres (seeded from JSON fixtures)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "spa"


def clone(value: Any) -> Any:
    return json.loads(json.dumps(value))


@lru_cache(maxsize=64)
def load(name: str) -> Any:
    path = DATA_DIR / f"{name}.json"
    if not path.exists():
        raise FileNotFoundError(f"SPA fixture missing: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def payload(name: str, db: Session | None = None) -> Any:
    """Return a cloned document. Prefer Postgres; JSON files are seed-only fallback."""
    if db is not None:
        from app.services.spa_documents import document

        return document(db, name)
    from app.db.session import current_db

    session = current_db()
    if session is not None:
        from app.services.spa_documents import document

        return document(session, name)
    return clone(load(name))
