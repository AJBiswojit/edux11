"""Seed SPA JSON fixtures into Postgres and serve them as the runtime source of truth."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.data.platform_site import EXAM_AGENT_GROUP_LABELS, PLATFORM_SITE
from app.models.ops import AppKv
from app.services.spa_payloads import DATA_DIR, clone, load
from app.services.spa_question_cleanup import AFFECTED_DOCUMENTS, clean_spa_document
from app.services.spa_store import kv_get, kv_put

SPA_PREFIX = "spa:"


def spa_key(name: str) -> str:
    return f"{SPA_PREFIX}{name}"


def document(db: Session, name: str) -> Any:
    stored = kv_get(db, spa_key(name), None)
    if stored is not None:
        return clone(stored)
    data = clone(load(name))
    kv_put(db, spa_key(name), data)
    return clone(data)


def seed_spa_documents(db: Session) -> dict[str, int]:
    """Copy JSON fixtures into app_kv once. Existing rows are left alone so mutations persist.

    Phase G: stored copies of the question-carrying documents are healed with
    the spa_question_cleanup transform — seeded question records physically
    removed, fabricated question-derived values neutralised. The transform is
    pure + idempotent + scoped to AFFECTED_DOCUMENTS, so unrelated documents
    and any legitimate mutations in other documents are never touched, and a
    re-seed can never reintroduce the removed records.
    """
    pending: dict[str, Any] = {}
    skipped = 0
    healed = 0

    for path in sorted(DATA_DIR.glob("*.json")):
        key = spa_key(path.stem)
        if db.get(AppKv, key) is None:
            pending[key] = json.loads(path.read_text(encoding="utf-8"))
        else:
            skipped += 1
            if path.stem in AFFECTED_DOCUMENTS:
                stored = kv_get(db, key, None)
                if stored is not None:
                    cleaned, _ = clean_spa_document(stored)
                    if cleaned != stored:
                        pending[key] = cleaned
                        healed += 1

    platform_key = spa_key("platform")
    platform = pending.get(platform_key)
    if platform is None:
        platform = kv_get(db, platform_key, {}) or {}
    platform_changed = False
    for extra_key, extra_value in PLATFORM_SITE.items():
        if extra_key not in platform:
            platform[extra_key] = extra_value
            platform_changed = True
    if platform_changed:
        pending[platform_key] = platform

    exams_key = spa_key("exam-agent-exams")
    exams = pending.get(exams_key)
    if exams is None:
        exams = kv_get(db, exams_key, {}) or {}
    if isinstance(exams, dict) and "groupLabels" not in exams:
        pending[exams_key] = {**exams, "groupLabels": EXAM_AGENT_GROUP_LABELS}

    written = 0
    for key, value in pending.items():
        kv_put(db, key, value, commit=False)
        written += 1
    db.commit()
    return {"written": written, "skipped": skipped, "healed": healed}
