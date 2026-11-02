"""Per-logged-in-student runtime snapshot assembled from PostgreSQL.

Student dashboards must never fall back to SPA / Aarav fixtures. Empty tables
yield calculated zeros, null CGPA, and empty arrays — not prototype history.
"""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Paper, Question
from app.models.catalog import Batch, CalendarEvent, Course, Department, Program, Subject
from app.models.exams import ExamAttempt
from app.models.identity import Institution, User
from app.models.intelligence import StudentDnaSnapshot
from app.models.people import Enrollment, FacultyProfile, StudentProfile
from app.models.teaching import Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession
from app.services.examination import (
    STATUS_PUBLISHED,
    list_published_exams,
    paper_mode_family,
    paper_visible_to_student,
    serialize_student_exam,
    student_enrolled_family,
)
from app.services.spa_exams import attempt_to_dict, visible_attempts
from app.services.spa_store import coll_key, kv_get, kv_set

COURSE_COLORS = ["#6366f1", "#14b8a6", "#f43f5e", "#8b5cf6", "#f59e0b", "#0ea5e9", "#10b981", "#f97316"]
DEFAULT_ATTENDANCE_THRESHOLD = 75.0


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def extra_json(profile: StudentProfile | None) -> dict:
    if profile is None:
        return {}
    try:
        data = json.loads(profile.extra or "{}")
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def round1(value: float | None) -> float:
    return round(float(value or 0) * 10) / 10


def clamp(value, lo: float = 0, hi: float = 100) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = 0
    return max(lo, min(hi, number))


def parse_json(raw: str | None, default: Any = None) -> Any:
    if not raw:
        return {} if default is None else default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {} if default is None else default


def attendance_threshold(db: Session, user: User) -> float:
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    if inst and inst.attendance_threshold is not None:
        return float(inst.attendance_threshold)
    return DEFAULT_ATTENDANCE_THRESHOLD


def color_for(code: str | None, index: int = 0) -> str:
    if code:
        return COURSE_COLORS[sum(ord(ch) for ch in code) % len(COURSE_COLORS)]
    return COURSE_COLORS[index % len(COURSE_COLORS)]


def grade_from_pct(pct: float | None) -> str | None:
    if pct is None:
        return None
    if pct >= 90:
        return "A+"
    if pct >= 80:
        return "A"
    if pct >= 70:
        return "B+"
    if pct >= 60:
        return "B"
    if pct >= 50:
        return "C"
    return "D"


def require_student(db: Session, user: User) -> StudentProfile:
    profile = db.get(StudentProfile, user.id)
    if not profile:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student profile required")
    return profile


def enrolled_courses(db: Session, user: User) -> list[tuple[Enrollment, Course]]:
    rows = db.scalars(select(Enrollment).where(Enrollment.student_id == user.id)).all()
    out: list[tuple[Enrollment, Course]] = []
    for enrollment in rows:
        course = db.get(Course, enrollment.course_id)
        if course:
            out.append((enrollment, course))
    return out


def enrolled_course_ids(db: Session, user: User) -> set[str]:
    return {course.id for _, course in enrolled_courses(db, user)}


def list_student_assignments(db: Session, user: User) -> list[dict]:
    """Assignments for courses this student is enrolled in or institution assignments."""
    course_ids = enrolled_course_ids(db, user)
    if course_ids:
        rows = db.scalars(
            select(Assignment)
            .where(
                Assignment.institution_id == user.institution_id,
                (Assignment.course_id.in_(course_ids) | (Assignment.course_id == None) | (Assignment.course_id == ""))
            )
            .order_by(Assignment.due_at)
        ).all()
    else:
        rows = db.scalars(
            select(Assignment)
            .where(Assignment.institution_id == user.institution_id)
            .order_by(Assignment.due_at)
        ).all()
    all_courses = db.scalars(select(Course).where(Course.institution_id == user.institution_id, Course.is_deleted.is_(False))).all()
    courses = {c.id: c for c in all_courses}
    subs = {
        s.assignment_id: s
        for s in db.scalars(select(AssignmentSubmission).where(AssignmentSubmission.student_id == user.id)).all()
    }
    now = utcnow()
    items = []
    for row in rows:
        lifecycle = (row.status or "published").lower()
        if lifecycle in {"draft", "archived"}:
            continue
        course = courses.get(row.course_id)
        sub = subs.get(row.id)
        due = row.due_at
        if sub and (sub.marks is not None or (sub.status or "").lower() == "graded"):
            status_label = "Graded"
            progress = 100
        elif sub and sub.submitted_at:
            status_label = "Submitted"
            progress = 100
        elif due and due.replace(tzinfo=due.tzinfo or timezone.utc) < now:
            status_label = "Overdue"
            progress = 0
        elif sub and (sub.status or "").lower() not in {"pending", "", None}:
            status_label = (sub.status or "Pending").title()
            progress = 50
        else:
            status_label = "Pending"
            progress = 0
        pct = None
        if sub and sub.marks is not None and row.max_marks:
            pct = round1((float(sub.marks) / float(row.max_marks)) * 100)
        items.append(
            {
                "id": row.id,
                "title": row.title,
                "courseCode": course.code if course else row.course_id,
                "course": course.code if course else row.course_id,
                "courseTitle": course.name if course else None,
                "subject": course.name if course else (course.code if course else row.course_id),
                "type": "Assignment",
                "due": iso(row.due_at),
                "dueDate": iso(row.due_at),
                "status": status_label,
                "progress": progress,
                "maxScore": row.max_marks,
                "max": row.max_marks,
                "weight": None,
                "description": row.body,
                "body": row.body,
                "score": sub.marks if sub else None,
                "grade": grade_from_pct(pct) if pct is not None else None,
                "feedback": sub.feedback if sub else None,
            }
        )
    return items


def _course_category(subject: Subject | None) -> str:
    family = (subject.exam_family or "").upper() if subject and subject.exam_family else ""
    if family in {"NEET", "JEE"}:
        return family
    if subject and (subject.exam_mode or "").lower() == "competitive":
        return family or "Competitive"
    return "University"


def list_student_courses(db: Session, user: User) -> list[dict]:
    """Enrolled courses only. Scores stay empty until real records exist."""
    pairs = enrolled_courses(db, user)
    if not pairs:
        return []
    faculty_names: dict[str, str] = {}
    if user.institution_id:
        for profile in db.scalars(select(FacultyProfile).where(FacultyProfile.institution_id == user.institution_id)).all():
            owner = db.get(User, profile.user_id)
            if owner:
                faculty_names[profile.department_id or ""] = owner.full_name
    items = []
    for index, (enrollment, course) in enumerate(pairs):
        subject = db.get(Subject, course.subject_id) if course.subject_id else None
        faculty = faculty_names.get(subject.department_id) if subject and subject.department_id else None
        items.append(
            {
                "id": course.id,
                "code": course.code,
                "title": course.name,
                "name": course.name,
                "credits": course.credits,
                "semester": course.semester_no,
                "status": enrollment.status or "active",
                "progress": None,
                "lessons": None,
                "completed": None,
                "grade": None,
                "faculty": faculty or "Faculty Member",
                "instructor": faculty or "Faculty Member",
                "color": color_for(course.code, index),
                "description": None,
                "enrolled": None,
                "modules": [],
                "resources": [],
                "internal": None,
                "category": _course_category(subject),
                "stats": {
                    "lessonsCompleted": None,
                    "avgScore": None,
                    "hoursSpent": None,
                    "mastery": None,
                },
            }
        )
    return items


def calculate_attendance(db: Session, user: User) -> dict:
    required = attendance_threshold(db, user)
    sessions = {
        row.id: row
        for row in db.scalars(select(AttendanceSession)).all()
    }
    records = db.scalars(select(AttendanceRecord).where(AttendanceRecord.student_id == user.id)).all()
    course_ids = {sessions[r.session_id].course_id for r in records if r.session_id in sessions}
    courses = {c.id: c for c in db.scalars(select(Course).where(Course.id.in_(course_ids))).all()} if course_ids else {}

    total = len(records)
    present = sum(1 for r in records if (r.mark or "").lower() == "present")
    leave_n = sum(1 for r in records if (r.mark or "").lower() == "leave")
    overall = round1((present / total) * 100) if total else 0.0
    buffer = round1(overall - required)

    by_course: dict[str, dict] = {}
    history = []
    for record in records:
        session = sessions.get(record.session_id)
        if not session:
            continue
        course = courses.get(session.course_id)
        code = course.code if course else session.course_id
        name = course.name if course else code
        bucket = by_course.setdefault(code, {"subjectCode": code, "subject": name, "present": 0, "total": 0, "color": color_for(code)})
        bucket["total"] += 1
        if (record.mark or "").lower() == "present":
            bucket["present"] += 1
        mark = (record.mark or "absent").title()
        if mark.lower() == "present":
            status = "Present"
        elif mark.lower() == "leave":
            status = "Leave"
        else:
            status = "Absent"
        history.append(
            {
                "date": iso(session.session_date),
                "subject": name,
                "type": session.topic or "Class",
                "status": status,
            }
        )
    history.sort(key=lambda row: row.get("date") or "", reverse=True)
    by_subject = []
    for bucket in by_course.values():
        pct = round1((bucket["present"] / bucket["total"]) * 100) if bucket["total"] else 0
        by_subject.append({**bucket, "pct": pct})

    calendar = []
    monthly: dict[str, dict] = {}
    weekly: dict[str, dict] = {}
    for row in history:
        day = row["date"][:10] if row.get("date") else None
        if not day:
            continue
        parsed = date.fromisoformat(day)
        calendar.append({"date": day, "day": parsed.day, "weekday": parsed.isoweekday() % 7, "status": row["status"], "note": row.get("type") or ""})
        month_key = day[:7]
        monthly.setdefault(month_key, {"month": month_key, "present": 0, "total": 0})
        monthly[month_key]["total"] += 1
        if row["status"] == "Present":
            monthly[month_key]["present"] += 1
        iso_week = parsed.isocalendar()[1]
        week_key = f"W{iso_week}"
        weekly.setdefault(week_key, {"week": week_key, "present": 0, "total": 0, "range": day, "focus": ""})
        weekly[week_key]["total"] += 1
        if row["status"] == "Present":
            weekly[week_key]["present"] += 1

    monthly_trend = []
    for key in sorted(monthly):
        row = monthly[key]
        pct = round1((row["present"] / row["total"]) * 100) if row["total"] else 0
        monthly_trend.append({"month": key, "pct": pct})
    weekly_list = []
    weekly_summary = []
    for key in sorted(weekly, key=lambda k: int(k[1:]) if k[1:].isdigit() else 0):
        row = weekly[key]
        pct = round1((row["present"] / row["total"]) * 100) if row["total"] else 0
        weekly_list.append({"week": key, "pct": pct})
        weekly_summary.append({**row, "pct": pct})

    insights = []
    suggestions = []
    if total == 0:
        insights.append({"id": "att_empty", "tone": "info", "title": "No attendance recorded yet", "body": "Your attendance percentage will appear here after faculty mark a class."})
    elif overall < required:
        insights.append({"id": "att_low", "tone": "warning", "title": "Below the institution threshold", "body": f"Overall attendance is {overall}% versus the {required}% requirement."})
        suggestions.append({"id": "att_act", "topic": "Attend upcoming classes", "body": "Each marked session updates this percentage from live records.", "impact": "High"})

    return {
        "overall": overall,
        "required": required,
        "buffer": buffer,
        "bySubject": by_subject,
        "weekly": weekly_list,
        "heatmap": [],
        "history": history,
        "recent": history[:7],
        "insights": insights,
        "aiSuggestions": suggestions,
        "calendar": calendar,
        "analytics": {
            "monthlyTrend": monthly_trend,
            "weeklyPattern": weekly_list,
            "weeklySummary": weekly_summary,
            "weakestDay": None,
        },
        "present": present,
        "leaves": leave_n,
        "total": total,
    }


def calculate_cgpa(db: Session, user: User) -> float | None:
    """CGPA from graded university work only. Competitive attempts never contribute. None if no grades."""
    points: list[float] = []
    subs = db.scalars(select(AssignmentSubmission).where(AssignmentSubmission.student_id == user.id)).all()
    assignment_ids = [s.assignment_id for s in subs]
    assignments = {a.id: a for a in db.scalars(select(Assignment).where(Assignment.id.in_(assignment_ids))).all()} if assignment_ids else {}
    for sub in subs:
        if sub.marks is None:
            continue
        assignment = assignments.get(sub.assignment_id)
        max_marks = assignment.max_marks if assignment else None
        if not max_marks:
            continue
        points.append((float(sub.marks) / float(max_marks)) * 10)

    attempts = visible_attempts(
        db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.student_id == user.id,
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.submitted_at.is_not(None),
                ExamAttempt.is_deleted.is_(False),
            )
        ).all(),
        db,
    )
    for attempt in attempts:
        mode = (attempt.exam_mode or "university").lower()
        if mode != "university":
            continue
        scoring = parse_json(attempt.scoring, {})
        summary = parse_json(attempt.summary, {})
        pct = scoring.get("percentage")
        if pct is None:
            pct = scoring.get("pct") if scoring.get("pct") is not None else summary.get("pct")
        if pct is None:
            continue
        points.append((float(pct) / 100) * 10)
    if not points:
        return None
    return round(sum(points) / len(points), 2)


def list_student_events(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    rows = db.scalars(
        select(CalendarEvent).where(CalendarEvent.institution_id == user.institution_id).order_by(CalendarEvent.starts_at)
    ).all()
    return [
        {
            "id": row.id,
            "date": iso(row.starts_at),
            "title": row.title,
            "kind": row.kind,
            "type": row.kind,
            "end": iso(row.ends_at),
            "subject": None,
        }
        for row in rows
    ]


def _attempt_pct(attempt: ExamAttempt) -> float | None:
    scoring = parse_json(attempt.scoring, {})
    summary = parse_json(attempt.summary, {})
    pct = scoring.get("percentage")
    if pct is None:
        pct = scoring.get("pct") if scoring.get("pct") is not None else summary.get("pct")
    if pct is None:
        return None
    return float(pct)


def published_exam_datasets(db: Session, user: User) -> tuple[list[dict], list[dict], list[dict]]:
    listing = list_published_exams(db, user, include_questions=False)
    papers = listing.get("items") or []
    attempts = {
        row.exam_id: row
        for row in visible_attempts(
            db.scalars(
                select(ExamAttempt).where(ExamAttempt.student_id == user.id, ExamAttempt.submitted_at.is_not(None), ExamAttempt.is_demo.is_(False), ExamAttempt.is_deleted.is_(False))
            ).all(),
            db,
        )
    }
    university: list[dict] = []
    competitive: list[dict] = []
    performance: list[dict] = []
    for paper in papers:
        attempt = attempts.get(paper["id"])
        pct = _attempt_pct(attempt) if attempt else None
        score = None
        max_score = paper.get("totalMarks")
        if attempt:
            scoring = parse_json(attempt.scoring, {})
            score = scoring.get("score")
            max_score = scoring.get("maxScore") if scoring.get("maxScore") is not None else max_score
        status = "Completed" if attempt else "Upcoming"
        category = paper.get("category") or paper.get("domain") or "University"
        row = {
            "id": paper["id"],
            "title": paper.get("title"),
            "shortName": paper.get("title"),
            "examType": paper.get("type") or category,
            "subject": paper.get("subject"),
            "subjectCode": paper.get("subject"),
            "date": iso(attempt.submitted_at)[:10] if attempt and attempt.submitted_at else None,
            "duration": paper.get("durationMinutes") or paper.get("duration"),
            "maxMarks": max_score,
            "score": score,
            "pct": pct,
            "grade": grade_from_pct(pct) if pct is not None else None,
            "status": status,
            "priority": None,
            "faculty": None,
            "semester": None,
            "academicYear": None,
            "venue": None,
            "hallNumber": None,
            "seatNumber": None,
            "admitCard": None,
            "inPlanner": False,
            "examFamily": paper.get("examFamily"),
            "examMode": paper.get("examMode") or category,
            "negativeMarking": paper.get("negativeMarking"),
            "pattern": paper.get("examFamily") or category,
        }
        if str(category).lower() == "competitive" or (paper.get("examMode") or "").lower() == "competitive":
            competitive.append(row)
            exam_type = "Competitive"
        else:
            university.append(row)
            exam_type = "University"
        if attempt:
            performance.append(
                {
                    "id": attempt.id,
                    "examId": paper["id"],
                    "title": paper.get("title"),
                    "type": exam_type,
                    "status": "Completed",
                    "date": iso(attempt.submitted_at)[:10] if attempt.submitted_at else None,
                    "pct": pct,
                    "grade": grade_from_pct(pct) if pct is not None else None,
                    "percentile": None,
                    "subjectCode": paper.get("subject"),
                    "examFamily": paper.get("examFamily"),
                }
            )
    return university, competitive, performance


def is_mock_paper(paper: Paper) -> bool:
    kind = (paper.paper_type or "").lower()
    if "mock" in kind:
        return True
    mode, _family = paper_mode_family(paper)
    return mode == "competitive" and kind in {"practice", "mock", "mock-test", "test-series"}


def list_mock_tests(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    papers = db.scalars(
        select(Paper)
        .where(Paper.institution_id == user.institution_id, Paper.status == STATUS_PUBLISHED)
        .order_by(Paper.created_at.desc())
    ).all()
    enrolled_family = student_enrolled_family(db, user)
    items = []
    for paper in papers:
        if not is_mock_paper(paper):
            continue
        if not paper_visible_to_student(paper, enrolled_family):
            continue
        items.append(serialize_student_exam(db, paper, include_questions=False, include_answers=False))
    return items


def build_profile(db: Session, user: User) -> dict:
    student = db.get(StudentProfile, user.id)
    extra = extra_json(student)
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    program = db.get(Program, student.program_id) if student and student.program_id else None
    dept = db.get(Department, student.department_id) if student and student.department_id else None
    batch = db.get(Batch, student.batch_id) if student and student.batch_id else None
    names = (user.full_name or "").split(" ", 1)
    first = user.first_name or extra.get("firstName") or (names[0] if names else None)
    last = extra.get("lastName") or (names[1] if len(names) > 1 else None)
    attendance = calculate_attendance(db, user)
    cgpa = calculate_cgpa(db, user)
    term = None
    if student and extra.get("semester"):
        term = extra.get("semester")
    return {
        "id": user.id,
        "firstName": first,
        "lastName": last,
        "fullName": user.full_name,
        "gender": extra.get("gender") or (student.gender if student else None),
        "dateOfBirth": extra.get("dateOfBirth") or (student.date_of_birth.isoformat() if student and student.date_of_birth else None),
        "bloodGroup": extra.get("bloodGroup"),
        "photo": None,
        "avatarGradient": extra.get("avatarGradient") or "linear-gradient(135deg, #6366f1, #3b82f6)",
        "email": user.email,
        "phone": user.phone,
        "address": {
            "city": extra.get("city"),
            "state": extra.get("state"),
            "pincode": extra.get("pincode"),
            "country": extra.get("country") or "India",
        },
        "institution": inst.name if inst else None,
        "institutionInfo": {
            "id": user.institution_id,
            "name": inst.name if inst else None,
            "city": extra.get("city"),
            "state": extra.get("state"),
            "shortName": inst.short_name if inst else None,
        },
        "studentId": student.roll_no if student else None,
        "rollNo": student.roll_no if student else None,
        "enrollmentNo": student.enrollment_no if student else extra.get("enrollmentNo"),
        "program": program.name if program else extra.get("program"),
        "academicProgram": {
            "id": program.id if program else None,
            "code": program.code if program else None,
            "name": program.name if program else extra.get("program"),
            "level": program.degree_type if program else None,
            "durationYears": program.duration_years if program else None,
            "totalSemesters": (program.duration_years * 2) if program and program.duration_years else None,
            "totalCredits": None,
            "earnedCredits": 0,
        } if program or extra.get("program") else None,
        "branch": dept.name if dept else extra.get("branch"),
        "department": dept.name if dept else extra.get("department"),
        "semester": term,
        "section": student.section if student else None,
        "batch": batch.name if batch else extra.get("batchLabel"),
        "admissionYear": student.admission_year if student else None,
        "academicStatus": (student.academic_status or "regular").title() if student else None,
        "cgpa": cgpa,
        "attendance": attendance["overall"],
        "rank": None,
        "cohortSize": None,
        "currentSemester": {
            "name": term,
            "academicYear": inst.academic_year if inst else None,
            "credits": None,
            "status": "In Progress" if term else None,
        },
        "mentor": None,
        "advisor": None,
        "competitiveProfile": {"enabled": False, "exams": []},
    }


def empty_study() -> dict:
    return {
        "streakDays": 0,
        "longestStreak": 0,
        "weeklyHours": 0,
        "avgFocus": 0,
        "activeDaysPerWeek": 0,
        "weeklyActivity": [],
        "hoursBySubject": [],
    }


def dna_from_snapshots(db: Session, user: User) -> dict:
    rows = db.scalars(
        select(StudentDnaSnapshot)
        .where(StudentDnaSnapshot.student_id == user.id)
        .order_by(StudentDnaSnapshot.computed_at.desc())
    ).all()
    university = {"chapters": [], "strengths": [], "weaknesses": []}
    competitive = {"JEE": {"chapters": [], "strengths": [], "weaknesses": []}, "NEET": {"chapters": [], "strengths": [], "weaknesses": []}}
    mastery = []
    for row in rows:
        payload = parse_json(row.payload, {})
        mode = (row.exam_mode or "university").lower()
        family = (row.exam_family or "").upper()
        chapters = payload.get("chapters") or []
        if mode == "competitive" and family in competitive:
            competitive[family] = payload
        elif mode != "competitive" and not university["chapters"]:
            university = payload if payload else university
        for chapter in chapters:
            acc = chapter.get("accuracy")
            if acc is None:
                continue
            mastery.append(
                {
                    "subjectCode": chapter.get("subject") or chapter.get("chapter"),
                    "subject": chapter.get("chapter"),
                    "mastery": acc,
                    "trend": "0",
                    "level": "Strong" if acc >= 80 else "Average" if acc >= 65 else "Weak",
                }
            )
    strengths = sorted([m for m in mastery if m["mastery"] >= 80], key=lambda m: m["mastery"], reverse=True)[:3]
    weaknesses = sorted([m for m in mastery if m["mastery"] < 70], key=lambda m: m["mastery"])[:3]
    has_evidence = bool(mastery)
    return {
        "mastery": mastery,
        "strongConcepts": [f"{m['subject']}" for m in strengths],
        "weakConcepts": [f"{m['subject']}" for m in weaknesses],
        "learningStyle": None,
        "retentionCurve": [],
        "errorPatterns": [],
        "examEvidence": {"university": university, "competitive": competitive, "latest": None, "totals": {"attempts": len(rows), "questions": 0}},
        "summary": "Building your profile" if not has_evidence else f"{len(mastery)} chapter signals from your attempts.",
        "competitive": {"summary": [], "strengths": [], "weaknesses": [], "strongChapters": [], "weakChapters": [], "errorPatterns": []},
        "hasEvidence": has_evidence,
    }


def compute_health(attendance: dict, cgpa: float | None, consistency: float, assignments: list[dict]) -> dict:
    required = attendance.get("required") or DEFAULT_ATTENDANCE_THRESHOLD
    overall = attendance.get("overall") if attendance.get("total") else 0
    attendance_score = clamp((overall / required) * 75) if required else 0
    if cgpa is None:
        performance_score = 0
        cgpa_note = "No graded records yet"
    else:
        performance_score = clamp((cgpa / 10) * 100)
        cgpa_note = f"CGPA {cgpa} from graded records"
    graded = [a for a in assignments if a.get("status") == "Graded"]
    pending = [a for a in assignments if a.get("status") in {"Pending", "Overdue"}]
    if assignments:
        timeliness = 100 * (1 - (len(pending) / max(len(assignments), 1)))
    else:
        timeliness = 0
    workload = clamp(timeliness)
    has_evidence = bool(attendance.get("total") or cgpa is not None or assignments)
    score = round1(attendance_score * 0.25 + performance_score * 0.45 + consistency * 0.2 + workload * 0.1)
    if not has_evidence:
        grade = "Building"
    elif score >= 85:
        grade = "Excellent"
    elif score >= 70:
        grade = "Good"
    elif score >= 55:
        grade = "At Risk"
    else:
        grade = "Critical"
    return {
        "score": score if has_evidence else 0,
        "grade": grade,
        "delta": 0,
        "trend": "steady",
        "hasEvidence": has_evidence,
        "factors": [
            {"label": "Attendance health", "value": round1(attendance_score), "weight": 0.25, "note": f"{overall}% vs {required}% required"},
            {"label": "Academic performance", "value": round1(performance_score), "weight": 0.45, "note": cgpa_note},
            {"label": "Consistency", "value": round1(consistency), "weight": 0.2, "note": "Attendance regularity from records"},
            {"label": "Workload balance", "value": round1(workload), "weight": 0.1, "note": f"{len(graded)} graded / {len(assignments)} assignments"},
        ],
    }


def build_university_slice(*, profile: dict, datasets: dict, derived: dict) -> dict:
    ds = datasets
    assignment_list = ds.get("assignments") or []
    pending = [a for a in assignment_list if a.get("status") in {"Pending", "Upcoming", "Overdue"}]
    graded = [a for a in assignment_list if a.get("status") == "Graded"]
    graded_pcts = []
    for a in graded:
        if a.get("score") is not None and a.get("maxScore"):
            graded_pcts.append((float(a["score"]) / float(a["maxScore"])) * 100)
    courses = ds.get("courses") or []
    subjects = ds.get("subjects") or []
    attendance = ds.get("attendance") or {}
    perf = ds.get("academicPerformance") or {}
    upcoming_uni = [e for e in (ds.get("universityExams") or []) if e.get("status") in {"Scheduled", "Upcoming"}]
    upcoming_comp = [e for e in (ds.get("competitiveExams") or []) if e.get("status") in {"Scheduled", "Upcoming"}]
    calendar = list(ds.get("events") or [])
    for exam in upcoming_uni + upcoming_comp:
        if exam.get("date"):
            calendar.append({"id": f"cal_{exam['id']}", "title": exam.get("title"), "date": exam.get("date"), "type": "exam", "subject": exam.get("subjectCode") or exam.get("subject")})
    for assignment in pending:
        if assignment.get("due"):
            calendar.append({"id": f"cal_as_{assignment['id']}", "title": f"{assignment.get('title')} due", "date": assignment.get("due"), "type": "deadline", "subject": assignment.get("courseCode")})
    calendar = [e for e in calendar if e.get("date")]
    calendar.sort(key=lambda e: str(e.get("date")))
    known_progress = [c.get("progress") for c in courses if c.get("progress") is not None]
    progress_avg = round(sum(known_progress) / len(known_progress), 0) if known_progress else None
    return {
        "context": "university",
        "identity": {
            "institution": profile.get("institution"),
            "institutionCity": (profile.get("institutionInfo") or {}).get("city"),
            "degree": (profile.get("academicProgram") or {}).get("name") or profile.get("program"),
            "branch": profile.get("branch"),
            "department": profile.get("department"),
            "semester": (profile.get("currentSemester") or {}).get("name") or profile.get("semester"),
            "academicYear": (profile.get("currentSemester") or {}).get("academicYear"),
            "section": profile.get("section"),
            "batch": profile.get("batch"),
        },
        "courses": courses,
        "subjects": subjects,
        "resources": ds.get("academicResources") or [],
        "credits": {"earned": perf.get("creditsEarned") or 0, "target": perf.get("creditsTarget") or 0, "current": None},
        "attendance": {
            **attendance,
            "monthlyTrend": (ds.get("attendanceAnalytics") or {}).get("monthlyTrend") or [],
            "trend": (ds.get("attendanceAnalytics") or {}).get("monthlyTrend") or [],
            "weeklySummary": (ds.get("attendanceAnalytics") or {}).get("weeklySummary") or [],
            "weakestDay": (ds.get("attendanceAnalytics") or {}).get("weakestDay"),
        },
        "assignments": {
            "items": [
                {
                    "id": a.get("id"),
                    "title": a.get("title"),
                    "subjectCode": a.get("courseCode"),
                    "subject": a.get("subject") or a.get("courseTitle") or a.get("courseCode"),
                    "course": a.get("subject") or a.get("courseTitle") or a.get("courseCode"),
                    "type": a.get("type") or "Assignment",
                    "due": a.get("due"),
                    "status": a.get("status"),
                    "progress": a.get("progress") or 0,
                    "maxScore": a.get("maxScore"),
                    "weight": a.get("weight"),
                    "description": a.get("description"),
                    "score": a.get("score"),
                    "grade": a.get("grade"),
                    "feedback": a.get("feedback"),
                }
                for a in assignment_list
            ],
            "pending": [{"id": a.get("id"), "title": a.get("title"), "subjectCode": a.get("courseCode"), "due": a.get("due"), "progress": a.get("progress") or 0} for a in pending],
            "graded": [{"id": a.get("id"), "title": a.get("title"), "subjectCode": a.get("courseCode"), "score": a.get("score"), "maxScore": a.get("maxScore"), "grade": a.get("grade")} for a in graded],
            "pendingCount": len(pending),
            "gradedCount": len(graded),
            "averageGradedPct": round1(sum(graded_pcts) / len(graded_pcts)) if graded_pcts else None,
        },
        "assessments": {
            "internal": [],
            "endSem": [],
            "results": [
                {"examId": e.get("examId") or e.get("id"), "title": e.get("title"), "subjectCode": e.get("subjectCode"), "date": e.get("date"), "pct": e.get("pct"), "grade": e.get("grade"), "percentile": None}
                for e in (ds.get("examPerformance") or [])
                if e.get("type") == "University"
            ],
            "averagePct": round1(
                sum(e.get("pct") or 0 for e in (ds.get("examPerformance") or []) if e.get("type") == "University" and e.get("pct") is not None)
                / max(len([e for e in (ds.get("examPerformance") or []) if e.get("type") == "University" and e.get("pct") is not None]), 1)
            ) if any(e.get("type") == "University" and e.get("pct") is not None for e in (ds.get("examPerformance") or [])) else None,
            "totalCompleted": len([e for e in (ds.get("examPerformance") or []) if e.get("type") == "University"]),
        },
        "performance": {
            "cgpa": profile.get("cgpa"),
            "targetCGPA": None,
            "semesterHistory": perf.get("semesterHistory") or [],
            "subjectGrades": perf.get("subjectGrades") or [],
            "rankTrend": [],
            "creditsEarned": perf.get("creditsEarned") or 0,
            "creditsTarget": perf.get("creditsTarget") or 0,
        },
        "progress": {
            "overall": progress_avg,
            "courses": [{"id": c.get("id") or c.get("code"), "code": c.get("code"), "title": c.get("title"), "color": c.get("color"), "progress": c.get("progress") if c.get("progress") is not None else None, "lessons": f"{c.get('completed')}/{c.get('lessons')}" if c.get("completed") is not None or c.get("lessons") is not None else None, "credits": c.get("credits"), "grade": c.get("grade")} for c in courses],
            "semesterTarget": None,
            "subjects": [{"code": s.get("code"), "name": s.get("name"), "color": s.get("color"), "syllabus": s.get("progress") if s.get("progress") is not None else None} for s in subjects],
        },
        "examinations": {"university": upcoming_uni, "competitive": upcoming_comp},
        "calendarEvents": calendar,
        "readiness": derived.get("readiness", {}).get("university") or [],
        "dna": {
            "strengths": derived.get("strengths") or [],
            "weaknesses": derived.get("weaknesses") or [],
            "mastery": (derived.get("academicDna") or {}).get("mastery") or [],
            "strongConcepts": (derived.get("academicDna") or {}).get("strongConcepts") or [],
            "weakConcepts": (derived.get("academicDna") or {}).get("weakConcepts") or [],
            "learningStyle": None,
            "errorPatterns": [],
        },
        "recommendations": [r for r in (derived.get("recommendations") or []) if r.get("context") == "university"],
        "timeline": derived.get("academicJourney") or [],
        "summary": {
            "health": (derived.get("academicHealth") or {}).get("score") or 0,
            "consistency": derived.get("consistencyScore") or 0,
            "confidence": derived.get("confidenceIndex") or 0,
            "improvement": derived.get("improvementIndex") or 0,
            "nextExam": None,
        },
    }


def build_daily_brief(profile: dict, attendance: dict, assignments: list[dict], health: dict) -> dict:
    hour = utcnow().hour
    period = "Morning" if hour < 12 else "Afternoon" if hour < 17 else "Evening"
    first = profile.get("firstName") or "Student"
    pending = [a for a in assignments if a.get("status") in {"Pending", "Upcoming", "Overdue"}]
    pending.sort(key=lambda a: a.get("due") or "")
    next_due = pending[0] if pending else None
    overall = attendance.get("overall") if attendance.get("total") else 0
    return {
        "greeting": f"Good {period}, {first}",
        "dateLabel": utcnow().strftime("%A, %d %B"),
        "items": [
            {"key": "attendance", "label": "Today's attendance", "value": f"{overall}%", "detail": f"{attendance.get('total') or 0} recorded classes", "tone": "info"},
            {"key": "class", "label": "Upcoming class", "value": "No timetable yet", "detail": "Schedule appears when classes are published", "tone": "info"},
            {"key": "deadline", "label": "Assignment due", "value": (next_due.get("title") if next_due else "Nothing due"), "detail": (next_due.get("due")[:10] if next_due and next_due.get("due") else "All clear"), "tone": "warn" if next_due else "good"},
            {"key": "revision", "label": "Recommended revision", "value": "Keep practising", "detail": "", "tone": "info"},
            {"key": "health", "label": "Academic health", "value": str(health.get("score") or 0), "detail": health.get("grade") or "Building", "tone": "info"},
        ],
        "suggestion": "Your dashboard updates from live records — enrollments, attendance, assignments and exam attempts.",
    }


_HEALTH_FACTOR_KEYS = {
    "Attendance health": "attendance",
    "Academic performance": "examinations",
    "Consistency": "consistency",
    "Workload balance": "assignments",
}


def _dna_workspace(*, health: dict, dna: dict, strengths: list, weaknesses: list, ranking: list, attendance: dict, assignments: list, consistency: float, confidence: float) -> dict:
    """Shape live DNA to the Academic DNA tab contract without changing other derived slices."""
    graded = [a for a in assignments if a.get("status") == "Graded"]
    pending = [a for a in assignments if a.get("status") in {"Pending", "Upcoming", "Overdue"}]
    health_breakdown = []
    for i, factor in enumerate(health.get("factors") or []):
        value = factor.get("value") or 0
        health_breakdown.append(
            {
                "key": factor.get("key") or _HEALTH_FACTOR_KEYS.get(factor.get("label") or "", f"factor-{i}"),
                "label": factor.get("label"),
                "value": value,
                "weight": factor.get("weight") or 0,
                "contribution": value,
                "tone": "success" if value >= 85 else "warning" if value >= 70 else "danger",
            }
        )
    return {
        "executive": {
            "score": health.get("score") or 0,
            "grade": health.get("grade"),
            "academicHealthScore": health.get("score") or 0,
            "learningEfficiency": 0,
            "consistencyScore": consistency,
            "confidenceIndex": confidence,
            "improvementIndex": 0,
            "overallRating": health.get("score") or 0,
            "overallGrade": health.get("grade") or "Building",
            "summary": dna.get("summary") or health.get("grade") or "Building your profile",
        },
        "strengths": [
            {
                **s,
                "reason": s.get("reason") or f"{s.get('mastery', 0)}% mastery from your attempts",
                "trend": s.get("trend") or "—",
                "confidence": s.get("confidence") if s.get("confidence") is not None else s.get("mastery") or 0,
            }
            for s in strengths
        ],
        "weaknesses": [
            {
                **w,
                "priority": w.get("priority") or ("Critical" if (w.get("mastery") or 0) < 65 else "High"),
                "reason": w.get("reason") or f"{w.get('mastery', 0)}% mastery",
                "academicImpact": w.get("academicImpact") or "Keep practising this area",
                "estimatedRecovery": w.get("estimatedRecovery") or "—",
                "suggestedImprovement": w.get("suggestedImprovement") or "Complete more attempts and targeted practice.",
            }
            for w in weaknesses
        ],
        "healthBreakdown": health_breakdown,
        "learningBehaviour": {
            "score": 0,
            "attendancePattern": {"overall": attendance.get("overall") or 0, "note": ""},
            "assignmentCompletion": {"onTime": len(graded), "late": 0, "pending": len(pending), "rate": 0, "note": ""},
            "practiceFrequency": {"sessions": 0, "perWeek": 0, "note": ""},
            "revisionHabit": {"weeklySessions": 0, "avgLengthMin": 0, "note": ""},
            "quizParticipation": {"attempted": 0, "avgAccuracy": 0, "note": ""},
            "courseProgress": [],
            "dailyStudy": [],
            "weeklyStudy": [],
            "monthlyPattern": [],
            "observations": [],
        },
        "subjectMastery": [
            {
                **row,
                "chapters": row.get("chapters") or [],
                "status": row.get("status") or ("Strong" if (row.get("mastery") or 0) >= 80 else "Developing" if (row.get("mastery") or 0) >= 65 else "At Risk"),
                "trend": row.get("trend") or "—",
                "confidence": row.get("confidence") if row.get("confidence") is not None else row.get("mastery") or 0,
                "masteredCount": row.get("masteredCount") or 0,
                "weakCount": row.get("weakCount") or 0,
            }
            for row in ranking
        ],
        "chapterMastery": [],
        "topicMastery": [],
        "mistakes": {"items": [], "total": 0, "bySeverity": {"high": 0, "medium": 0, "low": 0}},
        "opportunities": [],
        "weeklyPlan": [],
        "prediction": {
            "metrics": [],
            "expectedSemesterImprovement": {"value": "—", "unit": ""},
            "timeline": [],
            "confidence": "Building",
            "modelNote": "Predictions appear as more assessments are recorded.",
        },
    }


def assemble_student_intelligence(db: Session, user: User) -> dict:
    require_student(db, user)
    profile = build_profile(db, user)
    attendance = calculate_attendance(db, user)
    assignments = list_student_assignments(db, user)
    courses = list_student_courses(db, user)
    events = list_student_events(db, user)
    university_exams, competitive_exams, exam_performance = published_exam_datasets(db, user)
    subjects = [
        {
            "code": c.get("code"),
            "name": c.get("title") or c.get("name"),
            "teacher": c.get("faculty") or c.get("instructor") or "Faculty Member",
            "credits": c.get("credits"),
            "progress": c.get("progress") if c.get("progress") is not None else None,
            "attendance": next((s.get("pct") for s in attendance.get("bySubject", []) if s.get("subjectCode") == c.get("code") and s.get("pct") is not None), None),
            "internal": c.get("internal") if c.get("internal") is not None else None,
            "color": c.get("color") or "#6366f1",
        }
        for c in courses
    ]
    dna = dna_from_snapshots(db, user)
    weekly = attendance["analytics"]["weeklyPattern"]
    pcts = [w.get("pct") for w in weekly if w.get("pct") is not None]
    consistency = round1(sum(pcts) / len(pcts)) if pcts else 0
    health = compute_health(attendance, profile.get("cgpa"), consistency, assignments)
    exam_pcts = [e.get("pct") for e in exam_performance if e.get("pct") is not None]
    confidence = round1(sum(exam_pcts) / len(exam_pcts)) if exam_pcts else 0
    ranking = sorted(
        [
            {"subjectCode": s["code"], "subject": s["name"], "mastery": s.get("attendance")}
            for s in subjects
            if s.get("attendance") is not None
        ],
        key=lambda row: row["mastery"],
        reverse=True,
    )
    strengths = [m for m in dna["mastery"] if m.get("mastery", 0) >= 80][:3]
    weaknesses = sorted([m for m in dna["mastery"] if m.get("mastery", 0) < 70], key=lambda m: m.get("mastery", 0))[:3]
    interventions = []
    for subj in attendance["bySubject"]:
        if subj.get("pct", 100) < attendance["required"]:
            interventions.append(
                {
                    "id": f"int_att_{subj.get('subjectCode')}",
                    "type": "attendance",
                    "severity": "warning",
                    "priority": "Medium",
                    "status": "Active",
                    "title": f"Attendance low — {subj.get('subject')}",
                    "reason": f"At {subj.get('pct')}% vs {attendance['required']}% required.",
                    "affectedSubject": subj.get("subjectCode"),
                    "suggestedAction": "Attend remaining sessions in this course.",
                }
            )
    for assignment in assignments:
        if assignment.get("status") == "Overdue":
            interventions.append(
                {
                    "id": f"int_as_{assignment.get('id')}",
                    "type": "deadline",
                    "severity": "warning",
                    "priority": "High",
                    "status": "Active",
                    "title": f"Assignment overdue — {assignment.get('title')}",
                    "reason": f"Due {assignment.get('due')}",
                    "affectedSubject": assignment.get("courseCode"),
                    "suggestedAction": "Submit as soon as possible.",
                }
            )

    datasets = {
        "attendance": {
            "overall": attendance["overall"],
            "required": attendance["required"],
            "buffer": attendance["buffer"],
            "bySubject": attendance["bySubject"],
            "weekly": attendance["weekly"],
            "heatmap": [],
            "history": attendance["history"],
            "insights": attendance["insights"],
            "aiSuggestions": attendance["aiSuggestions"],
            "calendar": attendance["calendar"],
        },
        "attendanceAnalytics": attendance["analytics"],
        "todaySchedule": [],
        "courses": courses,
        "subjects": subjects,
        "assignments": assignments,
        "projects": [],
        "universityExams": university_exams,
        "competitiveExams": competitive_exams,
        "quizResults": [],
        "examPerformance": exam_performance,
        "practiceSessions": [],
        "learningBehaviour": {},
        "studyStatistics": empty_study(),
        "academicPerformance": {
            "currentCGPA": profile.get("cgpa"),
            "targetCGPA": None,
            "semesterHistory": [],
            "subjectGrades": [],
            "creditsEarned": 0,
            "creditsTarget": 0,
        },
        "recommendations": [],
        "notifications": [],
        "achievements": [],
        "academicJourney": [
            {
                "id": f"jv_{a.id}" if hasattr(a, "id") else f"jv_{a.get('id')}",
                "title": a.get("title") if isinstance(a, dict) else None,
                "detail": None,
                "date": a.get("date") if isinstance(a, dict) else None,
                "type": "exam",
            }
            for a in exam_performance
        ],
        "digitalPortfolio": {
            "resumeScore": 0,
            "resume": {"headline": "", "summary": "", "experience": [], "education": profile.get("program") or ""},
            "profiles": {"github": "", "linkedin": ""},
            "skills": [],
            "projects": [],
            "certifications": [],
            "competitions": [],
            "internships": [],
            "research": [],
        },
        "careerProfile": {},
        "academicHealthInputs": {},
        "academicDnaInputs": {"masteryHistory": dna["mastery"], "conceptSignals": [], "learningStyle": None, "errorPatterns": []},
        "examReadinessInputs": [],
        "interventionRules": [],
        "chapterMastery": [],
        "topicMastery": [],
        "mistakeIntelligence": [],
        "weeklyActionPlan": [],
        "improvementPrediction": {},
        "learningBehaviourDetailed": {
            "attendancePattern": {"overall": attendance.get("overall") or 0},
            "assignmentCompletion": {
                "onTime": len([a for a in assignments if a.get("status") == "Graded"]),
                "late": 0,
                "pending": len([a for a in assignments if a.get("status") in {"Pending", "Upcoming", "Overdue"}]),
            },
            "weeklyStudy": [],
            "practiceFrequency": {"perWeek": 0},
            "revisionHabit": {"weeklySessions": 0, "avgLengthMin": 0},
            "quizParticipation": {"avgAccuracy": 0, "attempted": 0},
        },
        "healthBreakdownInputs": [],
        "aiConversations": [],
        "suggestedQuestions": [],
        "quickPrompts": [],
        "resourceRecommendations": [],
        "generatedNotes": [],
        "downloads": [],
        "completedRecommendations": [],
        "competitivePyqPerformance": {},
        "academicResources": [],
        "events": events,
        "courseModules": {},
    }

    career = {
        "score": 0,
        "delta": 0,
        "trend": "steady",
        "level": "Building",
        "skillBase": 0,
        "gaps": [],
        "nextActions": [],
        "applications": {},
        "placementDrive": None,
        "dimensions": {},
        "profileStrength": 0,
        "placementReadiness": "Building",
        "recommendedCertifications": [],
        "recommendedSkills": [],
        "careerSuggestions": [],
        "roadmap": [],
        "careerGoal": None,
        "targetTimeline": None,
    }
    achievements = {"completed": 0, "inProgress": 0, "total": 0, "progress": 0, "completedList": [], "inProgressList": []}
    derived: dict[str, Any] = {
        "academicHealth": health,
        "examIntelligence": [],
        "portfolioWorkspace": {
            "portfolio": datasets["digitalPortfolio"],
            "career": career,
            "completion": {"completion": 0, "breakdown": [{"label": "Resume", "value": 0}, {"label": "Certifications", "value": 0}, {"label": "Projects", "value": 0}, {"label": "Skills", "value": 0}, {"label": "GitHub / LinkedIn", "value": 0}, {"label": "Achievements", "value": 0}]},
        },
        "dnaWorkspace": _dna_workspace(
            health=health,
            dna=dna,
            strengths=strengths,
            weaknesses=weaknesses,
            ranking=ranking,
            attendance=attendance,
            assignments=assignments,
            consistency=consistency,
            confidence=confidence,
        ),
        "dailyBrief": {},
        "recentActivities": [
            {"id": f"act_{e.get('id')}", "type": "grade", "title": e.get("title"), "detail": f"{e.get('pct')}%" if e.get("pct") is not None else "Completed", "date": e.get("date"), "icon": "ClipboardList"}
            for e in exam_performance
        ],
        "upcomingDeadlines": [
            {"id": f"dl_as_{a.get('id')}", "type": "assignment", "title": a.get("title"), "subject": a.get("courseCode"), "due": a.get("due"), "daysLeft": None, "priority": "Medium", "progress": a.get("progress") or 0}
            for a in assignments
            if a.get("status") in {"Pending", "Upcoming"}
        ],
        "consistencyScore": consistency,
        "learningBehaviourScore": 0,
        "confidenceIndex": confidence,
        "improvementIndex": 0,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "subjectMasteryRanking": ranking,
        "academicDna": dna,
        "examReadiness": [],
        "interventions": interventions,
        "recommendations": [],
        "careerReadiness": career,
        "achievements": achievements,
        "academicJourney": datasets["academicJourney"],
        "readiness": {"university": [], "competitive": [], "byExamFamily": {}, "summary": {"nextUniversity": None, "nextCompetitive": None, "universityCount": 0, "competitiveCount": 0, "families": []}},
        "competitive": {"examFamilies": [], "exams": {}, "performance": {"mocks": []}, "dna": {"weakChapters": []}, "recommendations": [], "readiness": {"byExamFamily": {}}},
        "generatedAt": utcnow().isoformat(),
    }
    derived["dailyBrief"] = build_daily_brief(profile, attendance, assignments, health)
    derived["university"] = build_university_slice(profile=profile, datasets=datasets, derived=derived)
    return {"profile": profile, "datasets": datasets, "derived": derived}


def programs_payload(db: Session, user: User) -> dict:
    student = require_student(db, user)
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    program = db.get(Program, student.program_id) if student.program_id else None
    cgpa = calculate_cgpa(db, user)
    if not program:
        return {"current": None, "others": []}
    years = program.duration_years or 0
    started = f"{student.admission_year}" if student.admission_year else None
    expected = f"{student.admission_year + years}" if student.admission_year and years else None
    return {
        "current": {
            "id": program.id,
            "name": program.name,
            "code": program.code,
            "institution": inst.name if inst else None,
            "duration": f"{years} years" if years else None,
            "started": started,
            "expectedEnd": expected,
            "status": "In Progress",
            "totalCredits": 0,
            "earnedCredits": 0,
            "cgpa": cgpa if cgpa is not None else "—",
            "accredited": None,
            "specializations": [],
            "semesters": [],
            "requirements": [],
        },
        "others": [],
    }


def default_settings(user: User) -> dict:
    return {
        "profile": {
            "email": user.email,
            "phone": user.phone,
            "language": "English",
            "timezone": "IST (UTC+5:30)",
        },
        "preferences": {
            "emailNotifications": True,
            "pushNotifications": False,
            "weeklyDigest": False,
            "deadlineReminders": True,
            "aiInsights": False,
            "streakReminders": False,
            "reducedMotion": False,
            "compactMode": False,
        },
        "privacy": {
            "showRankToPeers": False,
            "showProfilePublic": False,
            "shareLearningData": False,
        },
        "dangerZone": {"exportData": True, "deleteAccount": False},
    }


def settings_payload(db: Session, user: User) -> dict:
    stored = kv_get(db, coll_key("student_settings", user.id), None)
    base = default_settings(user)
    if not stored or not isinstance(stored, dict):
        return base
    merged = {**base, **stored}
    merged["profile"] = {**base["profile"], **(stored.get("profile") or {})}
    merged["profile"]["email"] = user.email
    merged["profile"]["phone"] = user.phone
    merged["preferences"] = {**base["preferences"], **(stored.get("preferences") or {})}
    merged["privacy"] = {**base["privacy"], **(stored.get("privacy") or {})}
    return merged


def patch_settings(db: Session, user: User, body: dict) -> dict:
    current = settings_payload(db, user)
    incoming = body or {}
    if "preferences" in incoming and isinstance(incoming["preferences"], dict):
        current["preferences"].update(incoming["preferences"])
    if "privacy" in incoming and isinstance(incoming["privacy"], dict):
        current["privacy"].update(incoming["privacy"])
    for key, value in incoming.items():
        if key in {"preferences", "privacy", "profile", "dangerZone"}:
            continue
        current[key] = value
    kv_set(db, coll_key("student_settings", user.id), current)
    return current


def mentor_workspace(db: Session, user: User) -> dict:
    from app.models.ai import AiConversation, AiMessage

    convos = db.scalars(
        select(AiConversation)
        .where(AiConversation.user_id == user.id, AiConversation.channel == "mentor")
        .order_by(AiConversation.created_at.desc())
    ).all()
    conversations = []
    for conv in convos:
        messages = db.scalars(select(AiMessage).where(AiMessage.conversation_id == conv.id)).all()
        conversations.append(
            {
                "id": conv.id,
                "title": conv.title,
                "updated": iso(conv.created_at),
                "messages": len(messages),
                "pinned": False,
                "status": "Active",
            }
        )
    return {
        "conversations": conversations,
        "suggestedQuestions": [],
        "quickPrompts": [],
        "quickTopics": [],
        "resourceRecommendations": [],
        "generatedNotes": [],
        "notes": [],
        "concepts": [],
        "downloads": [],
        "completedRecommendations": [],
        "quizBank": [],
        "practiceSets": [],
        "revisionPlans": [],
        "learningHistory": [],
    }


def forum_payload() -> dict:
    return {"topics": [], "categories": []}


def admit_card_payload(db: Session, user: User) -> dict:
    profile = build_profile(db, user)
    return {
        "available": False,
        "id": None,
        "name": profile.get("fullName"),
        "rollNo": profile.get("rollNo"),
        "program": profile.get("program"),
        "semester": profile.get("semester"),
        "examName": None,
        "issueDate": None,
        "photo": None,
        "signature": None,
        "instructions": [],
        "schedule": [],
    }


def empty_learning_path() -> dict:
    return {"overall": 0, "milestones": [], "nextSteps": [], "history": []}


def practice_questions_from_bank(db: Session, user: User, *, subject: str | None, chapter: str | None, count: int = 8) -> list[dict]:
    if not user.institution_id:
        return []
    query = select(Question).where(Question.institution_id == user.institution_id, Question.status == "approved")
    rows = db.scalars(query.order_by(Question.created_at.desc())).all()
    needle_subject = (subject or "").lower()
    needle_chapter = (chapter or "").lower()

    def serialize(question) -> dict:
        options = parse_json(question.options, [])
        subj = db.get(Subject, question.subject_id) if question.subject_id else None
        subject_name = (subj.name if subj else "") or ""
        return {
            "id": question.id,
            "question": question.stem,
            "options": options if isinstance(options, list) else [],
            "subject": subject_name or question.exam_mode,
            "chapter": question.concept,
            "topic": question.concept,
            "difficulty": (question.difficulty or "medium").title(),
            "questionType": (question.q_type or "mcq").upper(),
            "isPyq": bool(question.is_pyq),
            "source": "question-bank",
        }

    items = []
    for question in rows:
        blob = f"{question.concept or ''} {question.stem or ''}".lower()
        subj = db.get(Subject, question.subject_id) if question.subject_id else None
        subject_name = (subj.name if subj else "") or ""
        if needle_subject and needle_subject not in subject_name.lower() and needle_subject not in blob:
            continue
        if needle_chapter and needle_chapter not in blob and needle_chapter not in (question.concept or "").lower():
            continue
        items.append(serialize(question))
        if len(items) >= count:
            break
    if not items:
        for question in rows:
            items.append(serialize(question))
            if len(items) >= count:
                break
    return items


def exam_analysis_options(db: Session, user: User) -> dict:
    from app.services.exam_family import normalize_exam_family

    profile = db.get(StudentProfile, user.id)
    batch = db.get(Batch, profile.batch_id) if profile and profile.batch_id else None
    program = db.get(Program, profile.program_id) if profile and profile.program_id else None
    raw_family = batch.exam_family if batch else (program.exam_family if program else (extra_json(profile).get("examFamily") or extra_json(profile).get("batchType")))
    student_family = normalize_exam_family(raw_family)

    rows = (
        db.query(ExamAttempt)
        .filter(ExamAttempt.student_id == user.id, ExamAttempt.is_demo.is_(False), ExamAttempt.submitted_at.is_not(None), ExamAttempt.is_deleted.is_(False))
        .order_by(ExamAttempt.submitted_at.desc())
        .all()
    )
    # Time-lock: exclude attempts whose exam window is still open.
    rows = visible_attempts(rows, db)
    items = []
    for row in rows:
        payload = attempt_to_dict(row, db, include_questions=True)
        # Skip zero-score/zero-accuracy attempts — these are tester runs, not
        # real student attempts.  A genuine zero (e.g. all skipped) would have
        # scoring.score=0 AND scoring.accuracy=0; any real attempt has at least
        # one answered question and therefore a non-zero score or accuracy.
        scoring = payload.get("scoring") or {}
        summary = payload.get("summary") or {}
        score = scoring.get("score") if scoring.get("score") is not None else summary.get("score")
        accuracy = scoring.get("accuracy") if scoring.get("accuracy") is not None else summary.get("accuracy")
        try:
            score_val = float(score) if score is not None else 0.0
            accuracy_val = float(accuracy) if accuracy is not None else 0.0
        except (TypeError, ValueError):
            score_val = 0.0
            accuracy_val = 0.0
        if score_val == 0.0 and accuracy_val == 0.0:
            continue

        mode = payload.get("examMode") or "University"
        category = "Competitive" if str(mode).lower() == "competitive" else "University"
        family = normalize_exam_family(payload.get("examFamily") or row.exam_family)
        if not family and payload.get("examTitle"):
            t_upper = str(payload.get("examTitle")).upper()
            if "NEET" in t_upper:
                family = "NEET"
            elif "JEE" in t_upper:
                family = "JEE"

        # Domain isolation: if student is NEET, exclude JEE competitive attempts
        if category == "Competitive" and student_family:
            if student_family == "NEET" and family == "JEE":
                continue
            if student_family == "JEE" and family == "NEET":
                continue

        questions = payload.get("questionAttempts") or []
        subjects = []
        for qa in questions:
            ctx = qa.get("academicContext") or {}
            name = ctx.get("subject")
            if name and name not in subjects:
                subjects.append(name)
        submitted = payload.get("submittedAt") or ""
        items.append(
            {
                "id": payload["id"],
                "attemptId": payload["id"],
                "examId": payload.get("examId"),
                "title": payload.get("examTitle") or payload.get("examName"),
                "name": payload.get("examTitle") or payload.get("examName"),
                "shortName": payload.get("shortTitle") or payload.get("examName"),
                "date": submitted[:10] if submitted else None,
                "category": category,
                "pattern": family or (student_family if category == "Competitive" else category),
                "examMode": mode,
                "examFamily": family or student_family,
                "totalMarks": (payload.get("scoring") or {}).get("maxScore"),
                "status": "Analysed",
                "subjects": ["All Subjects", *subjects],
                "sample": False,
            }
        )
    return {"items": items}


def submit_assignment(db: Session, user: User, assignment_id: str, body: dict | None = None) -> dict:
    require_student(db, user)
    assignment = db.get(Assignment, assignment_id)
    if not assignment or assignment.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    course_ids = enrolled_course_ids(db, user)
    if assignment.course_id not in course_ids:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not enrolled in this course")
    if (assignment.status or "published").lower() != "published":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    existing = db.scalars(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.student_id == user.id,
        )
    ).first()
    if existing and (existing.marks is not None or (existing.status or "").lower() == "graded"):
        raise HTTPException(status.HTTP_409_CONFLICT, "Graded submissions cannot be replaced")
    files = []
    payload = body or {}
    if isinstance(payload.get("files"), list):
        files = payload.get("files")
    elif payload.get("fileName"):
        files = [payload.get("fileName")]
    now = utcnow()
    if existing is None:
        existing = AssignmentSubmission(
            assignment_id=assignment.id,
            student_id=user.id,
            files=json.dumps(files),
            submitted_at=now,
            status="submitted",
            feedback=payload.get("note") or payload.get("feedback"),
        )
        db.add(existing)
    else:
        existing.files = json.dumps(files)
        existing.submitted_at = now
        existing.status = "submitted"
        if payload.get("note"):
            existing.feedback = payload.get("note")
    db.commit()
    db.refresh(existing)
    return {
        "ok": True,
        "submission": {
            "id": existing.id,
            "assignmentId": assignment.id,
            "studentId": user.id,
            "status": "Submitted",
            "submittedAt": iso(existing.submitted_at),
            "files": files,
        },
    }


def student_dashboard_payload(db: Session, user: User) -> dict:
    snap = assemble_student_intelligence(db, user)
    return {
        "profile": snap["profile"],
        "kpis": {
            "cgpa": snap["profile"].get("cgpa"),
            "attendance": snap["datasets"]["attendance"]["overall"],
            "pendingAssignments": len([a for a in snap["datasets"]["assignments"] if a.get("status") in {"Pending", "Overdue"}]),
            "streak": snap["datasets"]["studyStatistics"]["streakDays"],
        },
        "todaySchedule": [],
        "upcomingDeadlines": snap["derived"]["upcomingDeadlines"],
    }


def course_detail(db: Session, user: User, course_id: str) -> dict:
    courses = list_student_courses(db, user)
    match = next((c for c in courses if c.get("id") == course_id or c.get("code") == course_id), None)
    if not match:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    return {"course": match}
