"""Live Postgres serializers for catalog, people, teaching, and exams."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Paper, PaperQuestion, Question
from app.models.catalog import Batch, CalendarEvent, Course, Department, Program, Subject
from app.models.identity import Institution, User
from app.models.people import Enrollment, FacultyProfile, StudentProfile
from app.models.teaching import Announcement, Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession
from app.services.exam_family import normalize_exam_family
from app.services.spa_payloads import payload


def _iso(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


def _extra(profile: StudentProfile | None) -> dict:
    if profile is None:
        return {}
    try:
        return json.loads(profile.extra or "{}")
    except json.JSONDecodeError:
        return {}


def _dept_counts(db: Session, institution_id: str) -> tuple[dict[str, int], dict[str, int]]:
    students = defaultdict(int)
    faculty = defaultdict(int)
    for profile in db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all():
        if profile.department_id:
            students[profile.department_id] += 1
    for profile in db.scalars(select(FacultyProfile).where(FacultyProfile.institution_id == institution_id)).all():
        if profile.department_id:
            faculty[profile.department_id] += 1
    return students, faculty


def admin_departments(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_departments

    return list_departments(db, institution_id)


def admin_courses(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_courses

    return list_courses(db, institution_id)


def admin_programs(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_programs

    return list_programs(db, institution_id)


def admin_subjects(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_subjects

    return list_subjects(db, institution_id)


def admin_batches(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_batches

    return list_batches(db, institution_id)


def admin_users(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_users

    return list_users(db, institution_id)


def admin_calendar(db: Session, institution_id: str) -> list[dict]:
    from app.services.admin_runtime import list_calendar

    return list_calendar(db, institution_id)


def admin_dashboard(db: Session, institution_id: str) -> dict:
    from app.services.admin_runtime import dashboard_payload

    return dashboard_payload(db, institution_id)


def student_assignments(db: Session, user: User) -> list[dict]:
    from app.services.student_runtime import list_student_assignments

    return list_student_assignments(db, user)


def faculty_assignments(db: Session, institution_id: str) -> list[dict]:
    assignments = db.scalars(select(Assignment).where(Assignment.institution_id == institution_id).order_by(Assignment.due_at.desc())).all()
    courses = {course.id: course for course in db.scalars(select(Course).where(Course.institution_id == institution_id, Course.is_deleted.is_(False))).all()}
    students = db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all()
    enrollments = db.scalars(select(Enrollment).where(Enrollment.student_id.in_([student.user_id for student in students]))).all() if students else []
    enrolled_by_course: dict[str, set[str]] = defaultdict(set)
    for enrollment in enrollments:
        enrolled_by_course[enrollment.course_id].add(enrollment.student_id)
    submissions = db.scalars(select(AssignmentSubmission).where(AssignmentSubmission.assignment_id.in_([row.id for row in assignments]))).all() if assignments else []
    submission_by_assignment: dict[str, list[AssignmentSubmission]] = defaultdict(list)
    for submission in submissions:
        submission_by_assignment[submission.assignment_id].append(submission)
    items = []
    for assignment in assignments:
        rows = submission_by_assignment[assignment.id]
        course = courses.get(assignment.course_id)
        submitted = len(rows)
        graded = sum(1 for row in rows if row.marks is not None or row.status == "graded")
        scores = [float(row.marks) for row in rows if row.marks is not None]
        total = len(enrolled_by_course.get(assignment.course_id, set()))
        lifecycle = (assignment.status or "published").lower()
        items.append({
            "id": assignment.id,
            "title": assignment.title,
            "course": course.code if course else assignment.course_id,
            "due": _iso(assignment.due_at),
            "published": _iso(assignment.published_at or assignment.created_at),
            "submissions": submitted,
            "total": total,
            "graded": graded,
            "status": "Graded" if submitted and graded == submitted else "Open",
            "lifecycleStatus": lifecycle,
            "maxScore": assignment.max_marks,
            "avgScore": round(sum(scores) / len(scores), 1) if scores else None,
        })
    return items


def faculty_attendance(db: Session, institution_id: str) -> dict:
    sessions = db.scalars(select(AttendanceSession).join(Course).where(Course.institution_id == institution_id).order_by(AttendanceSession.session_date.desc())).all()
    courses = {course.id: course for course in db.scalars(select(Course).where(Course.institution_id == institution_id, Course.is_deleted.is_(False))).all()}
    batches = {batch.id: batch for batch in db.scalars(select(Batch).where(Batch.institution_id == institution_id)).all()}
    records = db.scalars(select(AttendanceRecord).where(AttendanceRecord.session_id.in_([row.id for row in sessions]))).all() if sessions else []
    records_by_session: dict[str, list[AttendanceRecord]] = defaultdict(list)
    attendance_by_student: dict[str, list[AttendanceRecord]] = defaultdict(list)
    for record in records:
        records_by_session[record.session_id].append(record)
        attendance_by_student[record.student_id].append(record)
    classes = []
    for session in sessions:
        row_records = records_by_session[session.id]
        total = len(row_records)
        present = sum(1 for row in row_records if (row.mark or "").lower() == "present")
        course = courses.get(session.course_id)
        batch = batches.get(session.batch_id)
        classes.append({
            "id": session.id,
            "course": course.code if course else session.course_id,
            "section": batch.section or "-" if batch else "-",
            "date": session.session_date.isoformat(),
            "total": total,
            "present": present,
            "pct": round((present / total) * 100, 1) if total else 0,
            # A session with no records has not been marked. It is not 0% attendance.
            "status": "Marked" if total else "Pending",
            "topic": session.topic or "Class session",
        })
    student_profiles = {profile.user_id: profile for profile in db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all()}
    users = {user.id: user for user in db.scalars(select(User).where(User.id.in_(student_profiles))).all()} if student_profiles else {}
    threshold = []
    for student_id, student_records in attendance_by_student.items():
        total = len(student_records)
        present = sum(1 for record in student_records if (record.mark or "").lower() == "present")
        percentage = round((present / total) * 100, 1) if total else 0
        if percentage < 75:
            profile = student_profiles[student_id]
            threshold.append({"name": users[student_id].full_name, "roll": profile.roll_no, "attendance": percentage, "classes": total - present})
    snapshot = attendance_snapshot(classes)
    return {
        "classes": classes,
        "weeklyTrend": snapshot["weeklyTrend"],
        "summary": {
            "avgAttendance": snapshot["avgAttendance"],
            "highestClass": snapshot["highestClass"],
            "lowestClass": snapshot["lowestClass"],
            "studentsBelow75": len(threshold),
            "attendanceDelta": snapshot["delta"],
        },
        "studentsBelowThreshold": threshold,
    }


def attendance_snapshot(classes: list[dict]) -> dict:
    """Averages and trend from sessions that actually have marks.

    Unmarked sessions (zero records) stay in the class list so faculty can
    still open them, but they are not treated as 0% attendance.
    """
    marked = [row for row in classes if (row.get("total") or 0) > 0]
    percentages = [float(row.get("pct") or 0) for row in marked]
    ordered = sorted(marked, key=lambda row: str(row.get("date") or ""))
    delta = None
    if len(ordered) >= 2:
        delta = round(float(ordered[-1].get("pct") or 0) - float(ordered[0].get("pct") or 0), 1)
    return {
        "avgAttendance": round(sum(percentages) / len(percentages), 1) if percentages else 0,
        "highestClass": max(marked, key=lambda row: float(row.get("pct") or 0))["course"] if marked else "-",
        "lowestClass": min(marked, key=lambda row: float(row.get("pct") or 0))["course"] if marked else "-",
        "weeklyTrend": [{"week": f"W{index + 1}", "pct": row.get("pct")} for index, row in enumerate(ordered)],
        "delta": delta,
    }


def student_courses(db: Session, user: User) -> list[dict]:
    from app.services.student_runtime import list_student_courses

    return list_student_courses(db, user)


def student_events(db: Session, user: User) -> list[dict]:
    from app.services.student_runtime import list_student_events

    return list_student_events(db, user)


def faculty_announcements(db: Session, institution_id: str) -> list[dict]:
    rows = db.scalars(select(Announcement).where(Announcement.institution_id == institution_id).order_by(Announcement.created_at.desc())).all()
    if not rows:
        return []
    return [
        {
            "id": row.id,
            "title": row.title,
            "body": row.body,
            "date": _iso(row.created_at),
            "pinned": bool(row.pinned),
            "audience": "All sections",
            "attachments": [],
        }
        for row in rows
    ]


def faculty_question_bank(db: Session, institution_id: str) -> dict:
    questions = db.scalars(select(Question).where(Question.institution_id == institution_id).order_by(Question.created_at.desc())).all()
    if not questions:
        return {"summary": {"total": 0, "bySubject": {}}, "questions": []}
    subjects = {s.id: s for s in db.scalars(select(Subject).where(Subject.institution_id == institution_id, Subject.is_deleted.is_(False))).all()}
    items = []
    by_subject: dict[str, int] = defaultdict(int)
    for question in questions:
        subject = subjects.get(question.subject_id)
        code = subject.code if subject else question.exam_mode
        by_subject[code or "General"] += 1
        options = []
        try:
            options = json.loads(question.options or "[]")
        except json.JSONDecodeError:
            options = []
        items.append(
            {
                "id": question.id,
                "subject": code,
                "topic": question.concept,
                "chapter": question.concept,
                "type": (question.q_type or "mcq").upper() if question.q_type != "mcq" else "MCQ",
                "difficulty": (question.difficulty or "medium").title(),
                "text": question.stem,
                "options": options,
                "status": (question.status or "approved").title(),
                "source": question.source or "Bank",
                "usage": 0,
                "lastUsed": _iso(question.updated_at) if getattr(question, "updated_at", None) else None,
                "bloom": (question.bloom or "Apply").title() if question.bloom else "Apply",
                "tags": [],
            }
        )
    return {
        "summary": {"total": len(items), "bySubject": dict(by_subject)},
        "questions": items,
    }


def exam_agent_bundle(db: Session, institution_id: str | None = None) -> dict:
    papers = db.scalars(select(Paper).where(Paper.status == "published").order_by(Paper.paper_code)).all()
    if institution_id:
        papers = [p for p in papers if p.institution_id == institution_id]
    live_items = []
    for paper in papers:
        links = db.scalars(select(PaperQuestion).where(PaperQuestion.paper_id == paper.id).order_by(PaperQuestion.sort_order)).all()
        questions = []
        for link in links:
            question = db.get(Question, link.question_id)
            snap = {}
            try:
                snap = json.loads(link.snapshot or "{}")
            except json.JSONDecodeError:
                snap = {}
            options = snap.get("options")
            if options is None and question:
                try:
                    options = json.loads(question.options or "[]")
                except json.JSONDecodeError:
                    options = []
            stem = snap.get("stem") or (question.stem if question else "")
            questions.append(
                {
                    "id": (question.id if question else f"Q{link.sort_order:02d}"),
                    "subject": snap.get("subject") or (question.concept if question else paper.title),
                    "chapter": snap.get("chapter") or "",
                    "topic": snap.get("topic") or (question.concept if question else ""),
                    "difficulty": (snap.get("difficulty") or (question.difficulty if question else "medium") or "medium").title(),
                    "question": stem,
                    "options": options or [],
                    "type": "MCQ",
                    "marks": question.marks if question else 1,
                    "negativeMarks": question.negative_marks if question else 0,
                }
            )
        family = normalize_exam_family(paper.exam_family)
        exam_type = family or "University"
        live_items.append(
            {
                "id": paper.id,
                "title": paper.title,
                "type": exam_type,
                "category": "Competitive" if family or str(paper.exam_mode or "").lower() == "competitive" else "University",
                "durationMinutes": paper.duration_minutes,
                "marksPerQuestion": questions[0]["marks"] if questions else 0,
                "negativeMarksPerQuestion": questions[0]["negativeMarks"] if questions else 0,
                "questions": questions,
                "totalMarks": paper.total_marks,
            }
        )
    return {"items": live_items, "groupLabels": {}}


def registration_options(db: Session) -> dict:
    stored = payload("registration-options", db)
    institutions = db.scalars(select(Institution).order_by(Institution.name)).all()
    if institutions:
        stored = dict(stored)
        stored["institutions"] = [
            {"id": inst.id, "name": inst.name, "city": json.loads(inst.settings_json or "{}").get("city") or ""}
            for inst in institutions
        ]
        stored["institutions"].append({"id": "inst_other", "name": "Other institution", "city": ""})
    programs = db.scalars(select(Program).order_by(Program.name)).all()
    if programs:
        stored["degrees"] = [p.name for p in programs] + ["Other degree"]
    depts = db.scalars(select(Department).order_by(Department.name)).all()
    if depts:
        stored["branches"] = [d.name for d in depts] + ["Other branch"]
    return stored
