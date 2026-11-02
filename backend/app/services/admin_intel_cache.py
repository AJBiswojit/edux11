"""In-memory admin dashboard snapshot cache with background refresh.

Admin intelligence is expensive to assemble (full institution scan). This module
keeps the last good snapshot per admin user, serves it immediately, and rebuilds
in the background so dashboards do not wait on a cold SQL pass.
"""

from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.identity import User, UserRole
from app.services import admin_runtime

log = get_logger("medixo.admin_cache")

# Fresh enough to serve without a rebuild.
FRESH_TTL_SECONDS = 90
# Still safe to show while a background rebuild runs.
STALE_TTL_SECONDS = 600
REFRESH_INTERVAL_SECONDS = 45

_store_lock = threading.Lock()
_key_locks: dict[str, threading.Lock] = {}
_key_locks_guard = threading.Lock()

_summaries: dict[str, "_Entry"] = {}
_teaching: dict[str, "_Entry"] = {}
_students: dict[str, "_Entry"] = {}
_faculty: dict[str, "_Entry"] = {}
_user_institutions: dict[str, str] = {}


@dataclass
class _Entry:
    data: Any
    ts: float
    dirty: bool = False


def _background_ok() -> bool:
    return os.environ.get("PYTEST_CURRENT_TEST") is None


def _lock_for(key: str) -> threading.Lock:
    with _key_locks_guard:
        lock = _key_locks.get(key)
        if lock is None:
            lock = threading.Lock()
            _key_locks[key] = lock
        return lock


def _now() -> float:
    return time.monotonic()


def clear_all() -> None:
    with _store_lock:
        _summaries.clear()
        _teaching.clear()
        _students.clear()
        _faculty.clear()
        _user_institutions.clear()


def invalidate_institution(institution_id: str | None) -> None:
    if not institution_id:
        return
    with _store_lock:
        user_ids = [uid for uid, inst in _user_institutions.items() if inst == institution_id]
        for uid in user_ids:
            for bucket in (_summaries, _teaching, _students, _faculty):
                entry = bucket.get(uid)
                if entry is not None:
                    entry.dirty = True
        # Institution-scoped people lists are also stored by institution id.
        for bucket in (_students, _faculty):
            entry = bucket.get(institution_id)
            if entry is not None:
                entry.dirty = True


def on_admin_write(user: User) -> None:
    invalidate_institution(user.institution_id)
    if _background_ok() and user.id:
        schedule_warm_user(user.id)


def _peek(bucket: dict[str, _Entry], key: str) -> Any | None:
    entry = bucket.get(key)
    if entry is None or entry.dirty:
        return None
    age = _now() - entry.ts
    if age > STALE_TTL_SECONDS:
        return None
    return entry.data, age


def _put(bucket: dict[str, _Entry], key: str, data: Any) -> None:
    bucket[key] = _Entry(data=data, ts=_now(), dirty=False)


def load_admin_user(db: Session, user_id: str) -> User | None:
    user = db.scalars(
        select(User)
        .options(joinedload(User.role_links).joinedload(UserRole.role))
        .where(User.id == user_id)
    ).unique().one_or_none()
    if user is None:
        return None
    if user.primary_role != "admin":
        return None
    return user


def _remember(user: User) -> None:
    if user.id and user.institution_id:
        _user_institutions[user.id] = user.institution_id


def _people_from_summary(snap: dict) -> tuple[dict, dict]:
    students = (snap.get("datasets") or {}).get("people", {}).get("students") or []
    faculty = (snap.get("datasets") or {}).get("people", {}).get("faculty") or []
    jee = sum(1 for row in students if "JEE" in (row.get("examFamilies") or []) or row.get("examFamily") == "JEE")
    neet = sum(1 for row in students if "NEET" in (row.get("examFamilies") or []) or row.get("examFamily") == "NEET")
    students_payload = {
        "students": students,
        "total": len(students),
        "totals": {"all": len(students), "JEE": jee, "NEET": neet},
    }
    faculty_payload = {"faculty": faculty, "total": len(faculty)}
    return students_payload, faculty_payload


def _store_summary(user: User, snap: dict) -> None:
    students_payload, faculty_payload = _people_from_summary(snap)
    with _store_lock:
        _remember(user)
        _put(_summaries, user.id, snap)
        if user.institution_id:
            _put(_students, user.institution_id, students_payload)
            _put(_faculty, user.institution_id, faculty_payload)


def _wait_if_summary_building(user_id: str | None) -> None:
    if not user_id:
        return
    lock = _lock_for(f"summary:{user_id}")
    if lock.locked():
        with lock:
            pass


def get_summary(db: Session, user: User) -> dict:
    admin_runtime.require_admin(user)
    with _store_lock:
        peeked = _peek(_summaries, user.id)
    if peeked is not None:
        data, age = peeked
        if age < FRESH_TTL_SECONDS:
            return data
        schedule_warm_user(user.id)
        return data

    lock = _lock_for(f"summary:{user.id}")
    with lock:
        with _store_lock:
            peeked = _peek(_summaries, user.id)
        if peeked is not None and peeked[1] < FRESH_TTL_SECONDS:
            return peeked[0]
        snap = admin_runtime.assemble_admin_intelligence(db, user)
        _store_summary(user, snap)
        return snap


def get_teaching(db: Session, user: User) -> dict:
    admin_runtime.require_admin(user)

    def build() -> dict:
        payload = admin_runtime.assemble_admin_teaching(db, user)
        with _store_lock:
            _remember(user)
            _put(_teaching, user.id, payload)
        return payload

    with _store_lock:
        peeked = _peek(_teaching, user.id)
    if peeked is not None:
        data, age = peeked
        if age < FRESH_TTL_SECONDS:
            return data
        schedule_warm_user(user.id)
        return data

    lock = _lock_for(f"teaching:{user.id}")
    with lock:
        with _store_lock:
            peeked = _peek(_teaching, user.id)
        if peeked is not None and peeked[1] < FRESH_TTL_SECONDS:
            return peeked[0]
        return build()


def get_students(db: Session, user: User) -> dict:
    admin_runtime.require_admin(user)
    inst = user.institution_id
    _wait_if_summary_building(user.id)
    with _store_lock:
        peeked = _peek(_students, inst) if inst else None
    if peeked is not None:
        data, age = peeked
        if age < FRESH_TTL_SECONDS:
            return data
        schedule_warm_user(user.id)
        return data

    lock = _lock_for(f"students:{inst}")
    with lock:
        with _store_lock:
            peeked = _peek(_students, inst) if inst else None
        if peeked is not None and peeked[1] < FRESH_TTL_SECONDS:
            return peeked[0]
        payload = admin_runtime.students_payload(db, inst)
        with _store_lock:
            _remember(user)
            if inst:
                _put(_students, inst, payload)
        return payload


def get_faculty(db: Session, user: User) -> dict:
    admin_runtime.require_admin(user)
    inst = user.institution_id
    _wait_if_summary_building(user.id)
    with _store_lock:
        peeked = _peek(_faculty, inst) if inst else None
    if peeked is not None:
        data, age = peeked
        if age < FRESH_TTL_SECONDS:
            return data
        schedule_warm_user(user.id)
        return data

    lock = _lock_for(f"faculty:{inst}")
    with lock:
        with _store_lock:
            peeked = _peek(_faculty, inst) if inst else None
        if peeked is not None and peeked[1] < FRESH_TTL_SECONDS:
            return peeked[0]
        payload = admin_runtime.faculty_payload(db, inst)
        with _store_lock:
            _remember(user)
            if inst:
                _put(_faculty, inst, payload)
        return payload


def schedule_warm_user(user_id: str | None) -> None:
    if not user_id or not _background_ok():
        return
    thread = threading.Thread(
        target=_warm_user,
        args=(user_id,),
        daemon=True,
        name=f"admin-intel-{user_id[:8]}",
    )
    thread.start()


def _warm_user(user_id: str) -> None:
    summary_lock = _lock_for(f"summary:{user_id}")
    with summary_lock:
        db = SessionLocal()
        try:
            user = load_admin_user(db, user_id)
            if user is None:
                return
            snap = admin_runtime.assemble_admin_intelligence(db, user)
            _store_summary(user, snap)
            log.info("admin_intel_warmed", user_id=user_id, institution_id=user.institution_id)
        except Exception:
            log.exception("admin_intel_warm_failed", user_id=user_id)
        finally:
            db.close()

    teaching_lock = _lock_for(f"teaching:{user_id}")
    with teaching_lock:
        db = SessionLocal()
        try:
            user = load_admin_user(db, user_id)
            if user is None:
                return
            payload = admin_runtime.assemble_admin_teaching(db, user)
            with _store_lock:
                _remember(user)
                _put(_teaching, user.id, payload)
        except Exception:
            log.exception("admin_teaching_warm_failed", user_id=user_id)
        finally:
            db.close()


def known_admin_user_ids() -> list[str]:
    with _store_lock:
        return list(_user_institutions.keys())


def refresh_stale_in_background() -> None:
    if not _background_ok():
        return
    now = _now()
    due: list[str] = []
    with _store_lock:
        for user_id, entry in _summaries.items():
            if entry.dirty or now - entry.ts >= FRESH_TTL_SECONDS * 0.6:
                due.append(user_id)
        for user_id in _user_institutions:
            if user_id not in due and user_id not in _summaries:
                due.append(user_id)
    for user_id in due:
        schedule_warm_user(user_id)


async def background_refresh_loop() -> None:
    import asyncio

    while True:
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)
        try:
            refresh_stale_in_background()
        except Exception:
            log.exception("admin_intel_refresh_loop_failed")
