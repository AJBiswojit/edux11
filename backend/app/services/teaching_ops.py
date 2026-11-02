"""Lecture planner, timetable, research, and assignment lifecycle."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.capabilities import LessonPlan, ResearchPublication, TimetableSlot
from app.models.catalog import Course
from app.models.identity import User
from app.models.teaching import Assignment
from app.services.faculty_runtime import ensure_faculty_profile, iso, parse_json, require_faculty
from app.services.live_catalog import faculty_assignments


WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _course_label(db: Session, course_id: str | None) -> str | None:
    if not course_id:
        return None
    course = db.get(Course, course_id)
    return course.code if course else None


def serialize_lesson(db: Session, row: LessonPlan) -> dict:
    payload = parse_json(row.payload, {})
    return {
        "id": row.id,
        "week": payload.get("week"),
        "date": payload.get("date"),
        "topic": payload.get("topic") or payload.get("title"),
        "course": payload.get("course") or _course_label(db, row.course_id),
        "duration": payload.get("duration") or 60,
        "status": payload.get("status") or "Planned",
        "objectives": payload.get("objectives") or [],
        "activities": payload.get("activities") or [],
        "resources": payload.get("resources") or [],
        "bloom": payload.get("bloom"),
        "assessment": payload.get("assessment"),
        "prep": payload.get("prep") or 0,
        "createdAt": iso(row.created_at),
    }


def list_lessons(db: Session, user: User) -> dict:
    require_faculty(user)
    query = select(LessonPlan).where(LessonPlan.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(LessonPlan.faculty_id == user.id)
    rows = db.scalars(query.order_by(LessonPlan.created_at.desc())).all()
    items = [serialize_lesson(db, row) for row in rows]
    return {"items": items, "count": len(items)}


def create_lesson(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    topic = str((body or {}).get("topic") or (body or {}).get("title") or "").strip()
    if not topic:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Lecture topic is required")
    course_id = (body or {}).get("courseId")
    if course_id:
        course = db.get(Course, course_id)
        if not course or course.institution_id != user.institution_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    payload = {
        "week": (body or {}).get("week"),
        "date": (body or {}).get("date"),
        "topic": topic,
        "title": topic,
        "course": (body or {}).get("course") or _course_label(db, course_id),
        "duration": (body or {}).get("duration") or 60,
        "status": (body or {}).get("status") or "Planned",
        "objectives": (body or {}).get("objectives") or [],
        "activities": (body or {}).get("activities") or [],
        "resources": (body or {}).get("resources") or [],
        "bloom": (body or {}).get("bloom"),
        "assessment": (body or {}).get("assessment"),
    }
    row = LessonPlan(
        institution_id=user.institution_id,
        faculty_id=user.id,
        course_id=course_id,
        payload=json.dumps(payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": serialize_lesson(db, row)}


def serialize_slot(db: Session, row: TimetableSlot) -> dict:
    start = row.starts_at
    end = row.ends_at
    day = WEEKDAYS[start.weekday()] if start else None
    time = None
    if start and end:
        time = f"{start.strftime('%H:%M')}–{end.strftime('%H:%M')}"
    return {
        "id": row.id,
        "day": day,
        "time": time,
        "course": _course_label(db, row.course_id),
        "topic": row.topic,
        "room": row.room,
        "type": row.slot_type or "Lecture",
        "students": None,
        "startsAt": iso(row.starts_at),
        "endsAt": iso(row.ends_at),
    }


def list_slots(db: Session, user: User) -> dict:
    require_faculty(user)
    query = select(TimetableSlot).where(TimetableSlot.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(TimetableSlot.faculty_id == user.id)
    rows = db.scalars(query.order_by(TimetableSlot.starts_at)).all()
    grouped = {day: [] for day in WEEKDAYS}
    for row in rows:
        item = serialize_slot(db, row)
        day = item.get("day") or "Monday"
        grouped.setdefault(day, []).append(
            {
                "id": item["id"],
                "time": item.get("time"),
                "course": item.get("course") or "—",
                "topic": item.get("topic"),
                "room": item.get("room") or "—",
                "type": item.get("type") or "Lecture",
                "section": "All",
            }
        )
    items = [{"day": day, "slots": grouped[day]} for day in WEEKDAYS]
    return {"items": items, "count": len(rows), "slots": [serialize_slot(db, row) for row in rows]}


def create_slot(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    start_raw = (body or {}).get("startsAt") or (body or {}).get("start")
    end_raw = (body or {}).get("endsAt") or (body or {}).get("end")
    if not start_raw:
        day_name = str((body or {}).get("day") or "Monday")
        time_range = str((body or {}).get("time") or "09:00-10:00")
        try:
            weekday = WEEKDAYS.index(day_name.title()) if day_name.title() in WEEKDAYS else 0
        except ValueError:
            weekday = 0
        parts = time_range.replace("–", "-").split("-")
        start_hm = (parts[0] if parts else "09:00").strip()
        end_hm = (parts[1] if len(parts) > 1 else "10:00").strip()
        today = utcnow().date()
        delta = (weekday - today.weekday()) % 7
        day = today + timedelta(days=delta)
        try:
            sh, sm = [int(x) for x in start_hm.split(":")[:2]]
            eh, em = [int(x) for x in end_hm.split(":")[:2]]
        except ValueError:
            sh, sm, eh, em = 9, 0, 10, 0
        start = datetime(day.year, day.month, day.day, sh, sm, tzinfo=timezone.utc)
        end = datetime(day.year, day.month, day.day, eh, em, tzinfo=timezone.utc)
    else:
        try:
            start = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
            end = datetime.fromisoformat(str(end_raw).replace("Z", "+00:00")) if end_raw else start + timedelta(hours=1)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid slot time") from exc
    course_id = (body or {}).get("courseId")
    if course_id:
        course = db.get(Course, course_id)
        if not course or course.institution_id != user.institution_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    row = TimetableSlot(
        institution_id=user.institution_id,
        faculty_id=user.id,
        course_id=course_id,
        batch_id=(body or {}).get("batchId"),
        room=(body or {}).get("room"),
        starts_at=start,
        ends_at=end,
        topic=(body or {}).get("topic"),
        slot_type=(body or {}).get("type") or "Lecture",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "item": serialize_slot(db, row)}


def serialize_publication(row: ResearchPublication) -> dict:
    extra = parse_json(row.extra, {})
    return {
        "id": row.id,
        "title": row.title,
        "venue": row.venue,
        "year": row.year,
        "type": (row.kind or "paper").title(),
        "doi": row.doi,
        "citations": row.citations or 0,
        "authors": ", ".join(extra.get("authors") or []) if isinstance(extra.get("authors"), list) else (extra.get("authors") or ""),
        "status": extra.get("status") or "Published",
    }


def list_research(db: Session, user: User) -> dict:
    require_faculty(user)
    query = select(ResearchPublication).where(ResearchPublication.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(ResearchPublication.faculty_id == user.id)
    rows = db.scalars(query.order_by(ResearchPublication.year.desc(), ResearchPublication.created_at.desc())).all()
    publications = [serialize_publication(row) for row in rows]
    citations = sum(row.citations or 0 for row in rows)
    years = sorted({row.year for row in rows if row.year})
    trend = []
    for year in years:
        trend.append({"year": year, "citations": sum((r.citations or 0) for r in rows if r.year == year)})
    return {
        "summary": {"publications": len(publications), "citations": citations, "grants": 0, "hIndex": 0, "phdStudents": 0},
        "citationsTrend": trend,
        "publications": publications,
        "grants": [],
        "collaborations": [],
    }


def create_publication(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    title = str((body or {}).get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Publication title is required")
    row = ResearchPublication(
        institution_id=user.institution_id,
        faculty_id=user.id,
        title=title,
        venue=(body or {}).get("venue") or (body or {}).get("journal"),
        year=(body or {}).get("year"),
        kind=str((body or {}).get("type") or (body or {}).get("kind") or "paper").lower(),
        doi=(body or {}).get("doi"),
        citations=int((body or {}).get("citations") or 0),
        extra=json.dumps({"authors": (body or {}).get("authors") or [], "status": (body or {}).get("status") or "Published"}),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "publication": serialize_publication(row)}


def _assignment_or_404(db: Session, user: User, assignment_id: str) -> Assignment:
    row = db.get(Assignment, assignment_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if row.faculty_id and row.faculty_id != user.id and user.primary_role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot manage another faculty member's assignment")
    return row


def publish_assignment(db: Session, user: User, assignment_id: str) -> dict:
    require_faculty(user)
    row = _assignment_or_404(db, user, assignment_id)
    if (row.status or "").lower() == "archived":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Archived assignments cannot be published")
    row.status = "published"
    row.published_at = utcnow()
    db.commit()
    items = faculty_assignments(db, user.institution_id)
    created = next((item for item in items if item["id"] == row.id), None)
    return {"ok": True, "assignment": created or {"id": row.id, "status": "published"}}


def archive_assignment(db: Session, user: User, assignment_id: str) -> dict:
    require_faculty(user)
    row = _assignment_or_404(db, user, assignment_id)
    row.status = "archived"
    row.archived_at = utcnow()
    db.commit()
    return {"ok": True, "assignment": {"id": row.id, "status": "archived"}}
