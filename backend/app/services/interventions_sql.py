"""SQL persistence for faculty-created interventions."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import User
from app.models.interventions import (
    Intervention,
    InterventionEffectiveness,
    InterventionStatusHistory,
    InterventionStudent,
    IssueGroup,
)
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.people import StudentProfile
from app.services.faculty_runtime import ensure_faculty_profile, iso, parse_json
from app.services.spa_issues import can_transition


STATUS_MAP = {
    "Detected": "detected",
    "Recommended": "recommended",
    "Approved": "approved",
    "Planned": "planned",
    "Assigned": "assigned",
    "In Progress": "in_progress",
    "Completed": "completed",
    "Re-test Pending": "retest_pending",
    "Evaluating": "evaluating",
    "Resolved": "resolved",
    "Improving": "improving",
    "Persistent": "persistent",
    "Dismissed": "dismissed",
}
TITLE_MAP = {v: k for k, v in STATUS_MAP.items()}


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def to_db_status(label: str | None) -> str:
    if not label:
        return "detected"
    if label in STATUS_MAP:
        return STATUS_MAP[label]
    raw = str(label).strip().lower().replace(" ", "_").replace("-", "_")
    raw = raw.replace("re_test", "retest")
    return raw


def to_ui_status(raw: str | None) -> str:
    key = (raw or "detected").lower()
    return TITLE_MAP.get(key, (raw or "Detected").replace("_", " ").title())


def serialize_sql(db: Session, row: Intervention) -> dict:
    evidence = parse_json(row.evidence, {})
    students = db.scalars(select(InterventionStudent).where(InterventionStudent.intervention_id == row.id)).all()
    ids = [s.student_id for s in students]
    names = []
    for sid in ids:
        profile = db.get(StudentProfile, sid)
        user = db.get(User, sid)
        names.append({"studentId": sid, "name": user.full_name if user else None, "roll": profile.roll_no if profile else None})
    fingerprint = {}
    if row.group_id:
        group = db.get(IssueGroup, row.group_id)
        fingerprint = parse_json(group.fingerprint, {}) if group else {}
    return {
        "id": row.id,
        "title": row.title,
        "status": to_ui_status(row.status),
        "priority": (row.priority or "medium").title(),
        "subject": fingerprint.get("subject") or evidence.get("subject"),
        "chapter": fingerprint.get("chapter") or evidence.get("chapter"),
        "domain": fingerprint.get("domain") or evidence.get("domain") or "University",
        "examFamily": fingerprint.get("examFamily") or evidence.get("examFamily"),
        "issueType": fingerprint.get("issueType") or evidence.get("issueType"),
        "studentIds": ids,
        "students": names,
        "notes": row.notes,
        "practiceConfig": parse_json(row.practice_config, {}),
        "recommendedAction": row.recommended_action,
        "expectedOutcome": row.expected_outcome,
        "assignedAt": iso(row.assigned_at),
        "completedAt": iso(row.completed_at),
        "createdAt": iso(row.created_at),
        "persisted": True,
        "source": "sql",
    }


def _history(db: Session, intervention_id: str, from_status: str | None, to_status: str, user: User, note: str | None = None) -> None:
    db.add(
        InterventionStatusHistory(
            intervention_id=intervention_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=user.id,
            note=note,
        )
    )


def create_from_group_sql(db: Session, user: User, group: dict, body: dict) -> dict:
    ensure_faculty_profile(db, user)
    fingerprint = {
        "domain": group.get("domain"),
        "examFamily": group.get("examFamily"),
        "subject": group.get("subject"),
        "chapter": group.get("chapter"),
        "issueType": group.get("issueType"),
    }
    issue = IssueGroup(
        institution_id=user.institution_id,
        fingerprint=json.dumps(fingerprint),
        similarity_score=group.get("similarity"),
        evidence=json.dumps(group.get("evidence") or {}),
        why_detected=group.get("whyDetected"),
    )
    db.add(issue)
    db.flush()
    student_ids = list(body.get("studentIds") or group.get("studentIds") or [])
    actions = (group.get("recommendation") or {}).get("actions") or []
    action_labels = []
    for action in actions[:4]:
        if isinstance(action, dict):
            action_labels.append(str(action.get("label") or action.get("detail") or ""))
        else:
            action_labels.append(str(action))
    row = Intervention(
        institution_id=user.institution_id,
        group_id=issue.id,
        faculty_id=user.id,
        title=(group.get("recommendation") or {}).get("title") or f"{group.get('chapter') or 'Issue'} intervention",
        status="recommended",
        priority=str(body.get("priority") or group.get("priority") or "medium").lower(),
        recommended_action="; ".join([label for label in action_labels if label]) or None,
        practice_config=json.dumps(body.get("practiceConfig") or {}),
        evidence=json.dumps(group.get("evidence") or fingerprint),
        notes=body.get("notes"),
    )
    db.add(row)
    db.flush()
    for sid in student_ids:
        student = db.get(StudentProfile, sid)
        if not student or student.institution_id != user.institution_id:
            continue
        db.add(InterventionStudent(intervention_id=row.id, student_id=sid))
    _history(db, row.id, None, "recommended", user, "Created from similar-issues group")
    db.commit()
    db.refresh(row)
    return {"ok": True, "intervention": serialize_sql(db, row)}


def _baseline_accuracy(db: Session, student_id: str, subject: str | None) -> float | None:
    """Compute a student's historical accuracy for a given subject.

    Returns accuracy as a percentage (0-100) or None if no data.
    """
    query = (
        select(ExamQuestionAttempt)
        .join(ExamAttempt, ExamQuestionAttempt.attempt_id == ExamAttempt.id)
        .where(
            ExamAttempt.student_id == student_id,
            ExamAttempt.submitted_at.is_not(None),
            ExamAttempt.is_demo.is_(False),
        )
    )
    rows = db.scalars(query).all()
    correct = 0
    total = 0
    for row in rows:
        ctx = parse_json(row.academic_context, {})
        if subject and ctx.get("subject") != subject:
            continue
        ev = parse_json(row.evaluation, {})
        if ev.get("isCorrect") is None:
            continue
        total += 1
        if ev["isCorrect"]:
            correct += 1
    if total == 0:
        return None
    return round(correct / total * 100, 1)


def create_for_student(db: Session, user: User, student_id: str, body: dict, student: dict) -> dict:
    ensure_faculty_profile(db, user)
    target = db.get(StudentProfile, student_id)
    if not target or target.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
    fingerprint = {
        "domain": student.get("domain") or "University",
        "examFamily": student.get("examFamily"),
        "subject": body.get("subject") or "General",
        "chapter": body.get("chapter") or "Targeted practice",
        "issueType": body.get("issueType") or "Performance Gap",
    }
    issue = IssueGroup(
        institution_id=user.institution_id,
        fingerprint=json.dumps(fingerprint),
        similarity_score=None,
        evidence=json.dumps({"studentId": student_id}),
        why_detected=body.get("objective") or "Created from Student 360.",
    )
    db.add(issue)
    db.flush()
    baseline = _baseline_accuracy(db, student_id, fingerprint.get("subject"))
    evidence_dict = {**fingerprint, "studentId": student_id}
    if baseline is not None:
        evidence_dict["avgAccuracy"] = baseline
    row = Intervention(
        institution_id=user.institution_id,
        group_id=issue.id,
        faculty_id=user.id,
        title=body.get("title") or f"Targeted practice — {fingerprint['chapter']}",
        status="recommended",
        priority=str(body.get("priority") or "medium").lower(),
        practice_config=json.dumps(body.get("practiceConfig") or {}),
        evidence=json.dumps(evidence_dict),
        notes=body.get("notes"),
    )
    db.add(row)
    db.flush()
    ids = body.get("studentIds") or [student_id]
    for sid in ids:
        profile = db.get(StudentProfile, sid)
        if profile and profile.institution_id == user.institution_id:
            db.add(InterventionStudent(intervention_id=row.id, student_id=sid))
    _history(db, row.id, None, "recommended", user, "Created from Student 360")
    db.commit()
    db.refresh(row)
    return {"ok": True, "intervention": serialize_sql(db, row)}


def list_sql(db: Session, user: User) -> list[dict]:
    query = select(Intervention).where(Intervention.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(Intervention.faculty_id == user.id)
    rows = db.scalars(query.order_by(Intervention.created_at.desc())).all()
    return [serialize_sql(db, row) for row in rows]


def get_sql(db: Session, user: User, intervention_id: str) -> Intervention | None:
    row = db.get(Intervention, intervention_id)
    if not row or row.institution_id != user.institution_id:
        return None
    if user.primary_role != "admin" and row.faculty_id and row.faculty_id != user.id:
        members = db.scalars(select(InterventionStudent).where(InterventionStudent.intervention_id == row.id)).all()
        if user.id not in [m.student_id for m in members] and user.primary_role == "faculty":
            return None
    return row


def transition_sql(db: Session, user: User, intervention_id: str, to_label: str, note: str | None = None) -> dict:
    row = get_sql(db, user, intervention_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found")
    current = to_ui_status(row.status)
    if not can_transition(current, to_label):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot move from {current} to {to_label}")
    new_status = to_db_status(to_label)
    _history(db, row.id, row.status, new_status, user, note)
    row.status = new_status
    row.updated_at = utcnow()
    if new_status == "assigned":
        row.assigned_at = utcnow()
    if new_status == "completed":
        row.completed_at = utcnow()
    if new_status == "approved":
        row.approved_by = user.id
        row.approved_at = utcnow()
    db.commit()
    db.refresh(row)
    iv = serialize_sql(db, row)
    return {"ok": True, "id": iv["id"], "status": iv["status"], "intervention": iv}


def assign_students(db: Session, user: User, intervention_id: str, student_ids: list[str]) -> dict:
    row = get_sql(db, user, intervention_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found")
    existing = {s.student_id for s in db.scalars(select(InterventionStudent).where(InterventionStudent.intervention_id == row.id)).all()}
    for sid in student_ids:
        if sid in existing:
            continue
        profile = db.get(StudentProfile, sid)
        if not profile or profile.institution_id != user.institution_id:
            continue
        db.add(InterventionStudent(intervention_id=row.id, student_id=sid))
    if (row.status or "") in {"detected", "recommended", "approved", "planned"}:
        _history(db, row.id, row.status, "assigned", user, "Assigned to students")
        row.status = "assigned"
        row.assigned_at = utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, "intervention": serialize_sql(db, row)}


def _attempt_accuracy(attempt) -> float | None:
    scoring = parse_json(attempt.scoring, {})
    summary = parse_json(attempt.summary, {})
    value = scoring.get("accuracy")
    if value is None:
        value = summary.get("accuracy")
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def effectiveness_sql(db: Session, user: User, intervention_id: str) -> dict:
    row = get_sql(db, user, intervention_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found")

    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.intervention_id == row.id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ).all()
    practice = [a for a in attempts if a.attempt_kind == "intervention_practice"]
    retest = [a for a in attempts if a.attempt_kind == "intervention_retest"]
    evidence = parse_json(row.evidence, {})
    before = evidence.get("avgAccuracy")
    after = None
    if retest:
        after = _attempt_accuracy(retest[-1])
    elif practice:
        after = _attempt_accuracy(practice[-1])
    delta = round((after or 0) - (before or 0), 1) if after is not None and before is not None else None
    if after is None:
        outcome = "Pending"
    elif delta is not None and delta >= 15:
        outcome = "Resolved"
    elif delta is not None and delta >= 5:
        outcome = "Improving"
    elif delta is not None and delta < 0:
        outcome = "Persistent"
    else:
        outcome = "Pending"
    return {
        "interventionId": row.id,
        "before": before,
        "after": after,
        "delta": delta,
        "outcome": outcome,
        "practiceCount": len(practice),
        "retestCount": len(retest),
        "source": "exam_attempts",
    }


def modify_sql(db: Session, user: User, intervention_id: str, body: dict) -> dict:
    row = get_sql(db, user, intervention_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found.")
    payload = body or {}
    if payload.get("notes") is not None:
        row.notes = payload.get("notes")
    if payload.get("priority"):
        row.priority = str(payload.get("priority")).lower()
    if payload.get("title"):
        row.title = payload.get("title")
    if payload.get("practiceConfig") is not None:
        row.practice_config = json.dumps(payload.get("practiceConfig"))
    if payload.get("studentIds"):
        existing = {s.student_id for s in db.scalars(select(InterventionStudent).where(InterventionStudent.intervention_id == row.id)).all()}
        for sid in payload["studentIds"]:
            if sid in existing:
                continue
            profile = db.get(StudentProfile, sid)
            if profile and profile.institution_id == user.institution_id:
                db.add(InterventionStudent(intervention_id=row.id, student_id=sid))
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, "intervention": serialize_sql(db, row)}


def create_retest_sql(db: Session, user: User, intervention_id: str, body: dict | None = None) -> dict:
    from app.services.faculty_runtime import faculty_practice_questions

    row = get_sql(db, user, intervention_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found.")
    current = to_ui_status(row.status)
    if current != "Re-test Pending":
        if not can_transition(current, "Re-test Pending"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot move from {current} to Re-test Pending")
        transition_sql(db, user, row.id, "Re-test Pending", "faculty created re-test")
        row = get_sql(db, user, intervention_id)
    ser = serialize_sql(db, row)
    count = int((body or {}).get("count") or 10)
    questions = faculty_practice_questions(db, user, subject=ser.get("subject"), chapter=ser.get("chapter"), count=count)
    return {
        "ok": True,
        "retest": {
            "id": f"rt_{row.id[:8]}",
            "interventionId": row.id,
            "title": f"Re-test — {ser.get('chapter') or ser.get('title')}",
            "chapter": ser.get("chapter"),
            "subject": ser.get("subject"),
            "domain": ser.get("domain"),
            "examFamily": ser.get("examFamily"),
            "questions": questions,
            "count": len(questions),
            "createdAt": iso(row.updated_at),
            "mode": "intervention-retest",
            "source": "sql",
        },
        "intervention": ser,
    }


def normalize_status_label(raw: str | None) -> str:
    to = str(raw or "")
    if to and to[0].islower():
        to = to.replace("_", " ").replace("-", " ").title().replace("Retest", "Re-test")
    mapping = {
        "Detected": "Detected",
        "Recommended": "Recommended",
        "Approved": "Approved",
        "Planned": "Planned",
        "Assigned": "Assigned",
        "In Progress": "In Progress",
        "Completed": "Completed",
        "Retest Pending": "Re-test Pending",
        "Re-Test Pending": "Re-test Pending",
        "Evaluating": "Evaluating",
        "Resolved": "Resolved",
        "Improving": "Improving",
        "Persistent": "Persistent",
        "Dismissed": "Dismissed",
    }
    return mapping.get(to, to)


def student_sql_interventions(db: Session, user: User) -> list[dict]:
    links = db.scalars(select(InterventionStudent).where(InterventionStudent.student_id == user.id)).all()
    items = []
    for link in links:
        row = db.get(Intervention, link.intervention_id)
        if not row or row.institution_id != user.institution_id:
            continue
        if (row.status or "") in {"detected", "recommended", "dismissed"}:
            continue
        items.append(serialize_sql(db, row))
    return items
