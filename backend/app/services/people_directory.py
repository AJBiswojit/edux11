import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.catalog import Batch, Department, Program
from app.models.exams import ExamAttempt
from app.models.identity import Institution, User
from app.models.people import FacultyProfile, StudentProfile
from app.services.exam_family import normalize_exam_family

_IST = timezone(timedelta(hours=5, minutes=30))
_IST_NAMES = {"Asia/Kolkata", "Asia/Calcutta", "IST"}


def _extra(profile: StudentProfile) -> dict:
    try:
        return json.loads(profile.extra or "{}")
    except json.JSONDecodeError:
        return {}


def _parse_blob(raw) -> dict:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _num(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _attempt_accuracy(scoring: dict) -> float | None:
    for key in ("accuracy", "percentage", "pct"):
        number = _num(scoring.get(key))
        if number is not None:
            return number
    return None


def _is_blank_scoring(scoring: dict) -> bool:
    """True when the sitting has no answered questions (abandoned / empty auto-submit)."""
    correct = _num(scoring.get("correct")) or 0
    incorrect = _num(scoring.get("incorrect")) or 0
    if correct + incorrect > 0:
        return False
    rate = _num(scoring.get("attemptRate"))
    if rate is not None:
        return rate <= 0
    score = _num(scoring.get("score"))
    accuracy = _num(scoring.get("accuracy"))
    if not scoring:
        return True
    return (score is None or score == 0) and (accuracy is None or accuracy == 0)


def _eligible_attempts(rows: list[ExamAttempt]) -> list[tuple[ExamAttempt, dict, float]]:
    """Submitted, non-demo sittings with real scoring evidence, oldest → newest."""
    scored = []
    for row in rows:
        if row.submitted_at is None:
            continue
        scoring = _parse_blob(row.scoring)
        if _is_blank_scoring(scoring):
            continue
        accuracy = _attempt_accuracy(scoring)
        if accuracy is None:
            continue
        scored.append((row, scoring, accuracy))
    scored.sort(key=lambda item: item[0].submitted_at or item[0].created_at)
    return scored


def _status_bands() -> tuple[float, float, float]:
    # Imported lazily: intelligence_rules pulls exam_engine, which would cycle
    # through admin_runtime → faculty_runtime → this module at import time.
    from app.services.intelligence_rules import DEVELOPING_ACCURACY, STRONG_ACCURACY, STUDENT_TREND_POINTS

    return DEVELOPING_ACCURACY, STRONG_ACCURACY, STUDENT_TREND_POINTS


def _status_from_accuracies(accuracies: list[float]) -> tuple[str, str]:
    if not accuracies:
        return "No exams", "new"
    developing, strong, trend_points = _status_bands()
    latest = accuracies[-1]
    trend = "new"
    if len(accuracies) >= 2:
        mid = (len(accuracies) + 1) // 2
        early = accuracies[:mid]
        late = accuracies[mid:] or accuracies[-1:]
        delta = (sum(late) / len(late)) - (sum(early) / len(early))
        if delta >= trend_points:
            trend = "improving"
        elif delta <= -trend_points:
            trend = "declining"
        else:
            trend = "stable"
    if latest < developing or trend == "declining":
        status = "Needs Attention"
    elif latest >= strong:
        status = "Strong"
    elif trend == "improving":
        status = "Improving"
    else:
        status = "Stable"
    return status, trend


def _attention_reason(status: str, trend: str) -> str | None:
    if status != "Needs Attention":
        return None
    if trend == "declining":
        return "Declining performance trend"
    developing, _strong, _trend = _status_bands()
    return f"Latest accuracy below {developing:g}%"


def _local_date(value, tz_name: str | None) -> str | None:
    if value is None:
        return None
    if not isinstance(value, datetime):
        text = str(value)
        return text[:10] if text else None
    moment = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    name = (tz_name or "Asia/Kolkata").strip() or "Asia/Kolkata"
    if name in _IST_NAMES:
        return moment.astimezone(_IST).date().isoformat()
    try:
        from zoneinfo import ZoneInfo

        return moment.astimezone(ZoneInfo(name)).date().isoformat()
    except Exception:
        return moment.astimezone(_IST).date().isoformat()


def _catalog_domain(batch: Batch | None, exam_family: str | None, eligible: list) -> str | None:
    mode = (batch.exam_mode or "").strip().lower() if batch else ""
    if mode == "competitive" or exam_family in {"JEE", "NEET"}:
        return "Competitive"
    if mode == "university":
        return "University"
    for row, _scoring, _acc in reversed(eligible):
        attempt_mode = (row.exam_mode or "").strip().lower()
        if attempt_mode == "competitive":
            return "Competitive"
        if attempt_mode == "university":
            return "University"
        if normalize_exam_family(row.exam_family) in {"JEE", "NEET"}:
            return "Competitive"
    return None


def faculty_students_directory(db: Session, institution_id: str) -> dict:
    """Faculty student cards: live roster + submitted exam evidence only.

    Status, accuracy, exam count and last-exam come from countable attempts.
    Identity (batch / domain / family / program) comes from catalog rows and
    those same attempts. Profile.extra seed labels are not used.
    """
    inst = db.get(Institution, institution_id) if institution_id else None
    academic_year = inst.academic_year if inst else None
    tz_name = inst.timezone if inst else None
    programs = {p.id: p for p in db.scalars(select(Program).where(Program.institution_id == institution_id, Program.is_deleted.is_(False))).all()}
    batches = db.scalars(select(Batch).where(Batch.institution_id == institution_id, Batch.is_deleted.is_(False))).all()
    profiles = db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all()
    user_ids = [p.user_id for p in profiles]
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}

    attempts_by_student: dict[str, list[ExamAttempt]] = defaultdict(list)
    if user_ids:
        for attempt in db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.institution_id == institution_id,
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.is_deleted.is_(False),
            )
        ).all():
            attempts_by_student[attempt.student_id].append(attempt)

    batch_map = {b.id: b for b in batches}
    students_out = []
    for profile in profiles:
        user = users.get(profile.user_id)
        if not user:
            continue
        batch = batch_map.get(profile.batch_id)
        eligible = _eligible_attempts(attempts_by_student.get(profile.user_id, []))
        accuracies = [acc for _row, _scoring, acc in eligible]
        status, trend = _status_from_accuracies(accuracies)
        last_row, last_scoring, latest_accuracy = (eligible[-1] if eligible else (None, {}, None))
        snapshot = _parse_blob(last_row.exam_snapshot) if last_row else {}
        last_exam = None
        if last_row is not None:
            last_exam = {
                "title": last_row.exam_name,
                "shortTitle": snapshot.get("shortTitle") or last_row.exam_name,
                "date": _local_date(last_row.submitted_at, tz_name),
                "pct": latest_accuracy,
                "attemptId": last_row.id,
            }

        attempt_families = []
        for row, _scoring, _acc in eligible:
            family = normalize_exam_family(row.exam_family)
            if family and family not in attempt_families:
                attempt_families.append(family)
        batch_family = normalize_exam_family(batch.exam_family) if batch else None
        latest_family = None
        for row, _scoring, _acc in reversed(eligible):
            latest_family = normalize_exam_family(row.exam_family)
            if latest_family:
                break
        exam_family = batch_family or latest_family
        exam_families = list(attempt_families)
        if batch_family and batch_family not in exam_families:
            exam_families.insert(0, batch_family)
        domain = _catalog_domain(batch, exam_family, eligible)
        program = programs.get(profile.program_id) or (programs.get(batch.program_id) if batch and batch.program_id else None)

        students_out.append(
            {
                "id": profile.user_id,
                "email": user.email,
                "roll": profile.roll_no,
                "name": user.full_name,
                "batchId": profile.batch_id,
                "batchName": batch.name if batch else None,
                "domain": domain,
                "examFamily": exam_family,
                "examFamilies": exam_families,
                "program": program.name if program else None,
                "course": None,
                "courseCode": None,
                "semester": None,
                "section": profile.section or (batch.section if batch else None),
                "academicSession": academic_year,
                "examsCompleted": len(eligible),
                "latestAccuracy": latest_accuracy,
                "accuracy": latest_accuracy,
                "latestScore": last_scoring.get("score") if last_scoring else None,
                "maxScore": last_scoring.get("maxScore") if last_scoring else None,
                "status": status,
                "trend": trend,
                "attention": status == "Needs Attention",
                "attentionReason": _attention_reason(status, trend),
                "lastExam": last_exam,
                "accountStatus": user.status,
                "cgpa": profile.cgpa,
            }
        )

    overview = {
        "students": len(students_out),
        "batches": len(batches),
        "needsAttention": sum(1 for s in students_out if s["status"] == "Needs Attention"),
        "improving": sum(1 for s in students_out if s["status"] == "Improving"),
        "strong": sum(1 for s in students_out if s["status"] == "Strong"),
        "stable": sum(1 for s in students_out if s["status"] == "Stable"),
    }

    batch_rows = []
    for b in batches:
        members = [s for s in students_out if s["batchId"] == b.id]
        accuracies = [s["latestAccuracy"] for s in members if s["latestAccuracy"] is not None]
        mode = (b.exam_mode or "").strip().lower()
        domain = "Competitive" if mode == "competitive" or normalize_exam_family(b.exam_family) in {"JEE", "NEET"} else ("University" if mode == "university" else None)
        family = normalize_exam_family(b.exam_family)
        program = programs.get(b.program_id)
        batch_rows.append(
            {
                "id": b.id,
                "name": b.name,
                "domain": domain,
                "examFamily": family,
                "academicSession": academic_year,
                "program": program.name if program else None,
                "section": b.section,
                "status": "Active",
                "studentCount": len(members),
                "avgAccuracy": round(sum(accuracies) / len(accuracies), 1) if accuracies else None,
                "attentionCount": sum(1 for s in members if s["attention"]),
                "improvingCount": sum(1 for s in members if s["status"] == "Improving"),
                "strongCount": sum(1 for s in members if s["status"] == "Strong"),
                "students": members,
            }
        )

    return {"overview": overview, "students": students_out, "batches": batch_rows}


def admin_students_payload(db: Session, institution_id: str) -> dict:
    profiles = db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all()
    users = {u.id: u for u in db.scalars(select(User).where(User.institution_id == institution_id)).all()}
    depts = {d.id: d for d in db.scalars(select(Department).where(Department.institution_id == institution_id, Department.is_deleted.is_(False))).all()}
    items = []
    for profile in profiles:
        user = users.get(profile.user_id)
        if not user:
            continue
        extra = _extra(profile)
        dept = depts.get(profile.department_id)
        batch = db.get(Batch, profile.batch_id) if profile.batch_id else None
        family = (
            normalize_exam_family(extra.get("examFamily") or extra.get("batchType"))
            or (normalize_exam_family(batch.exam_family) if batch else None)
        )
        items.append(
            {
                "id": profile.user_id,
                "name": user.full_name,
                "roll": profile.roll_no,
                "email": user.email,
                "cgpa": profile.cgpa,
                "attendance": extra.get("attendance"),
                "internalMarks": extra.get("internalMarks"),
                "status": extra.get("academicLabel") or ("Enrolled" if (profile.academic_status or "").lower() in {"regular", "active", ""} else profile.academic_status),
                "dept": dept.code if dept else None,
                "program": extra.get("program"),
                "accountStatus": user.status,
                "batch": batch.name if batch else extra.get("batch"),
                "batchType": family,
                "examFamily": family,
            }
        )
    return {"students": items, "total": len(items)}


def admin_faculty_payload(db: Session, institution_id: str) -> dict:
    profiles = db.scalars(select(FacultyProfile).where(FacultyProfile.institution_id == institution_id)).all()
    users = {u.id: u for u in db.scalars(select(User).where(User.institution_id == institution_id)).all()}
    depts = {d.id: d for d in db.scalars(select(Department).where(Department.institution_id == institution_id, Department.is_deleted.is_(False))).all()}
    items = []
    for profile in profiles:
        user = users.get(profile.user_id)
        if not user:
            continue
        dept = depts.get(profile.department_id)
        items.append(
            {
                "id": profile.user_id,
                "name": user.full_name,
                "email": user.email,
                "dept": dept.code if dept else None,
                "designation": profile.designation,
                "status": "Active" if user.status == "active" else user.status.title(),
            }
        )
    return {"faculty": items, "total": len(items)}
