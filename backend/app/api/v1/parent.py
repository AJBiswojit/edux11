from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.core.deps import DbDep, require_roles
from app.models.identity import User
from app.services.spa_payloads import payload
from app.services.spa_store import coll_key, kv_get, kv_set
from typing import Annotated
from fastapi import Depends

router = APIRouter(tags=["parent"])
ParentDep = Annotated[User, Depends(require_roles("parent", "admin"))]


def _parent_gate() -> None:
    if not get_settings().parent_portal_enabled:
        raise HTTPException(403, "Parent portal is disabled")


@router.get("/parent/profile")
def parent_profile(_: ParentDep):
    _parent_gate()
    return payload("parent")["profile"]


@router.get("/parent/dashboard")
def parent_dashboard(_: ParentDep):
    _parent_gate()
    return payload("parent")["dashboard"]


@router.get("/parent/progress")
def parent_progress(_: ParentDep):
    _parent_gate()
    return payload("parent")["progress"]


@router.get("/parent/attendance")
def parent_attendance(_: ParentDep):
    _parent_gate()
    return payload("parent")["attendance"]


@router.get("/parent/performance")
def parent_performance(_: ParentDep):
    _parent_gate()
    return payload("parent")["performance"]


@router.get("/parent/exam-results")
def parent_exam_results(_: ParentDep):
    _parent_gate()
    return {"items": payload("parent")["examResults"]}


@router.get("/parent/communication")
def parent_communication(_: ParentDep):
    _parent_gate()
    return payload("parent")["communication"]


@router.get("/parent/ai-insights")
def parent_ai_insights(_: ParentDep):
    _parent_gate()
    return {"items": payload("parent")["aiInsights"]}


@router.get("/parent/reports")
def parent_reports(_: ParentDep):
    _parent_gate()
    return payload("parent")["reports"]


@router.get("/parent/assignments")
def parent_assignments(_: ParentDep):
    _parent_gate()
    return {"items": payload("parent")["assignments"]}


@router.get("/parent/fees")
def parent_fees(_: ParentDep):
    _parent_gate()
    return payload("parent")["fees"]


@router.get("/parent/behavior")
def parent_behavior(_: ParentDep):
    _parent_gate()
    return payload("parent")["behavior"]


@router.get("/parent/events")
def parent_events(_: ParentDep):
    _parent_gate()
    return {"items": payload("parent")["events"]}


@router.get("/parent/downloads")
def parent_downloads(_: ParentDep):
    _parent_gate()
    return payload("parent")["downloads"]


@router.get("/parent/notifications")
def parent_notifications(_: ParentDep):
    _parent_gate()
    return payload("parent")["notifications"]


@router.get("/parent/settings")
def parent_settings(db: DbDep, user: ParentDep):
    _parent_gate()
    stored = kv_get(db, coll_key("parent_settings", user.id), None)
    return stored or payload("parent")["settings"]


@router.patch("/parent/settings")
def patch_parent_settings(body: dict, db: DbDep, user: ParentDep):
    _parent_gate()
    current = kv_get(db, coll_key("parent_settings", user.id), payload("parent")["settings"])
    current.update(body or {})
    kv_set(db, coll_key("parent_settings", user.id), current)
    return {"ok": True, "settings": current}
