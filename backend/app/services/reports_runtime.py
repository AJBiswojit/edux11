"""Faculty reports persisted as generated_reports + file metadata."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.capabilities import GeneratedReport
from app.models.identity import User
from app.models.ops import FileObject
from app.services.faculty_runtime import iso, parse_json, require_faculty
from app.services.storage import write_bytes, write_simple_pdf


READY = "READY"
FAILED = "FAILED"


def _touch_admin_cache(user: User) -> None:
    from app.services.admin_intel_cache import on_admin_write

    on_admin_write(user)
QUEUED = "queued"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def serialize_report(row: GeneratedReport) -> dict:
    payload = parse_json(row.payload, {})
    status_raw = (row.status or QUEUED).upper()
    ui_status = "Ready" if status_raw == READY else ("Failed" if status_raw == FAILED else "Processing")
    return {
        "id": row.id,
        "title": payload.get("title") or row.template_code,
        "type": payload.get("format") or "PDF",
        "category": payload.get("category") or "Academic",
        "status": ui_status,
        "generationStatus": status_raw,
        "scope": row.scope or payload.get("scope") or "All courses",
        "period": payload.get("period") or "Current",
        "generated": iso(row.created_at)[:10] if row.created_at else None,
        "size": payload.get("size"),
        "pages": payload.get("pages") or (1 if status_raw == READY else None),
        "downloads": payload.get("downloads") or 0,
        "archived": bool(row.archived),
        "summary": payload.get("summary"),
        "template": row.template_code,
        "objectKey": row.object_key,
        "fileId": row.file_id,
        "downloadable": status_raw == READY and bool(row.object_key),
    }


def list_reports(db: Session, user: User) -> list[dict]:
    require_faculty(user)
    query = select(GeneratedReport).where(GeneratedReport.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(GeneratedReport.owner_id == user.id)
    rows = db.scalars(query.order_by(GeneratedReport.created_at.desc())).all()
    return [serialize_report(row) for row in rows]


def _owned(db: Session, user: User, report_id: str) -> GeneratedReport:
    row = db.get(GeneratedReport, report_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report not found")
    if user.primary_role != "admin" and row.owner_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this report")
    return row


def create_report(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    title = str((body or {}).get("title") or "").strip()
    if not title:
        return {"ok": False, "error": "Report title is required."}
    fmt = str((body or {}).get("format") or "PDF").upper()
    template = str((body or {}).get("template") or "Custom")
    scope = (body or {}).get("scope") or "All courses"
    period = (body or {}).get("period") or "Current"
    summary = (body or {}).get("summary") or "Faculty report generated from live records."
    row = GeneratedReport(
        institution_id=user.institution_id,
        owner_id=user.id,
        scope=scope,
        template_code=template,
        payload=json.dumps(
            {
                "title": title,
                "format": fmt,
                "category": (body or {}).get("category") or "Academic",
                "period": period,
                "summary": summary,
                "downloads": 0,
            }
        ),
        status=QUEUED,
        archived=False,
    )
    db.add(row)
    db.flush()
    try:
        if fmt != "PDF":
            raise ValueError(f"{fmt} export is not implemented")
        pdf = write_simple_pdf(
            title=title,
            lines=[
                f"Institution report · {scope} · {period}",
                summary,
                f"Generated {utcnow().isoformat()}",
                f"Owner {user.full_name}",
                "Download is available only while status is READY.",
            ],
        )
        object_key = f"reports/{user.institution_id}/{row.id}.pdf"
        path = write_bytes(object_key, pdf)
        file_row = FileObject(
            institution_id=user.institution_id,
            owner_id=user.id,
            bucket="local",
            object_key=object_key,
            mime="application/pdf",
            bytes=len(pdf),
            purpose="report",
        )
        db.add(file_row)
        db.flush()
        row.file_id = file_row.id
        row.object_key = object_key
        row.status = READY
        payload = parse_json(row.payload, {})
        payload["size"] = f"{max(len(pdf) // 1024, 1)} KB"
        payload["pages"] = 1
        row.payload = json.dumps(payload)
        db.commit()
        db.refresh(row)
        _touch_admin_cache(user)
        return {"ok": True, "report": serialize_report(row)}
    except Exception as exc:
        row.status = FAILED
        payload = parse_json(row.payload, {})
        payload["error"] = str(exc)[:500]
        row.payload = json.dumps(payload)
        db.commit()
        db.refresh(row)
        _touch_admin_cache(user)
        return {"ok": False, "error": str(exc)[:300], "report": serialize_report(row)}


def delete_report(db: Session, user: User, report_id: str) -> dict:
    require_faculty(user)
    row = _owned(db, user, report_id)
    db.delete(row)
    db.commit()
    _touch_admin_cache(user)
    return {"ok": True, "deleted": report_id}


def archive_report(db: Session, user: User, report_id: str, archived: bool | None) -> dict:
    require_faculty(user)
    row = _owned(db, user, report_id)
    row.archived = (not row.archived) if archived is None else bool(archived)
    db.commit()
    db.refresh(row)
    _touch_admin_cache(user)
    return {"ok": True, "report": serialize_report(row)}


def download_report(db: Session, user: User, report_id: str) -> tuple[GeneratedReport, bytes]:
    require_faculty(user)
    row = _owned(db, user, report_id)
    if (row.status or "").upper() != READY or not row.object_key:
        raise HTTPException(status.HTTP_409_CONFLICT, "Report is not ready for download")
    from app.services.storage import read_bytes

    data = read_bytes(row.object_key)
    if data is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Report file is missing from storage")
    payload = parse_json(row.payload, {})
    payload["downloads"] = int(payload.get("downloads") or 0) + 1
    row.payload = json.dumps(payload)
    db.commit()
    return row, data
