"""Per-logged-in-faculty runtime snapshot assembled from PostgreSQL.

Faculty dashboards must never fall back to SPA / Meera / Aarav fixtures.
Empty tables yield calculated zeros and empty arrays — not prototype history.
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.ai import AiTrace
from app.models.assessment import AiPaperShare, ContentSource, Paper, PaperShare, Question, QuestionStudioSession
from app.models.ai_papers import AiGeneratedPaper, AiPaperStatus
from app.models.catalog import Chapter, Course, Department, Program, Subject, Topic
from app.models.exams import ExamAttempt
from app.models.identity import Institution, User
from app.models.intelligence import StudentDnaSnapshot
from app.models.people import Enrollment, FacultyProfile, StudentProfile
from app.models.teaching import Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession
from app.services.examination import (
    list_faculty_papers,
    list_question_bank,
    publish_sql_paper,
    serialize_question_faculty,
    title_domain,
    title_family,
    normalize_exam_family,
    normalize_exam_mode,
    _catalog_maps,
)
from app.services.live_catalog import faculty_assignments, faculty_attendance
from app.services.people_directory import faculty_students_directory
from app.services.spa_store import coll_key, kv_get
from app.services.student_runtime import practice_questions_from_bank

DEFAULT_PREFS = {
    "autoGradeWithAI": False,
    "aiDraftLessons": False,
    "notifyOnSubmission": True,
    "weeklySummary": False,
    "allowStudentPolls": False,
}
DEFAULT_AI = {
    "gradingStrictness": "Standard",
    "language": "English",
    "citationsRequired": False,
}

# ---------------------------------------------------------------------------
# Short-TTL in-process cache for assemble_faculty_intelligence.
# Keyed by (institution_id, faculty_id) → (timestamp, payload).
# TTL: 3 minutes.  Cleared on any mutating operation via
# invalidate_faculty_intelligence_cache().
# ---------------------------------------------------------------------------
_INTEL_CACHE_TTL = 180  # seconds
_intel_cache: dict[tuple, tuple[float, dict]] = {}


def invalidate_faculty_intelligence_cache(institution_id: str, faculty_id: str | None = None) -> None:
    """Evict cached intelligence for a faculty member (or entire institution)."""
    keys = [k for k in _intel_cache if k[0] == institution_id and (faculty_id is None or k[1] == faculty_id)]
    for k in keys:
        _intel_cache.pop(k, None)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# India has no daylight saving. Keep this offset so greetings stay correct
# on hosts that do not ship the IANA timezone database (Windows without tzdata).
_IST = timezone(timedelta(hours=5, minutes=30))
_IST_NAMES = {"Asia/Kolkata", "Asia/Calcutta", "IST"}


def day_period(hour: int) -> str:
    if hour < 12:
        return "Morning"
    if hour < 17:
        return "Afternoon"
    return "Evening"


def local_now(tz_name: str | None = None, *, now: datetime | None = None) -> datetime:
    """Current time in the institution timezone. Defaults to Asia/Kolkata."""
    moment = now or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    name = (tz_name or "Asia/Kolkata").strip() or "Asia/Kolkata"
    if name in _IST_NAMES:
        return moment.astimezone(_IST)
    try:
        from zoneinfo import ZoneInfo

        return moment.astimezone(ZoneInfo(name))
    except Exception:
        return moment.astimezone(_IST)


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


def require_faculty(user: User) -> None:
    if user.primary_role not in {"faculty", "admin"}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Faculty profile required")
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")


def ensure_faculty_profile(db: Session, user: User) -> FacultyProfile:
    profile = db.get(FacultyProfile, user.id)
    if profile:
        return profile
    profile = FacultyProfile(user_id=user.id, institution_id=user.institution_id)
    db.add(profile)
    db.flush()
    return profile


def score_label(score: float, *, has_evidence: bool) -> str:
    if not has_evidence:
        return "Building"
    if score >= 85:
        return "Excellent"
    if score >= 75:
        return "Strong"
    if score >= 65:
        return "Stable"
    return "Needs attention"


def bank_stats(db: Session, institution_id: str) -> dict:
    base = Question.institution_id == institution_id
    total = db.scalar(select(func.count()).select_from(Question).where(base)) or 0
    ai_generated = db.scalar(
        select(func.count()).select_from(Question).where(base, func.lower(Question.source) == "ai")
    ) or 0
    flagged = db.scalar(
        select(func.count()).select_from(Question).where(base, func.lower(Question.status) == "flagged")
    ) or 0
    pyq = db.scalar(select(func.count()).select_from(Question).where(base, Question.is_pyq.is_(True))) or 0
    subject_map = {
        s.id: s.code or s.name
        for s in db.scalars(select(Subject).where(Subject.institution_id == institution_id, Subject.is_deleted.is_(False))).all()
    }
    by_subject: dict[str, int] = {}
    for subject_id, count in db.execute(
        select(Question.subject_id, func.count()).where(base).group_by(Question.subject_id)
    ).all():
        key = subject_map.get(subject_id) or (subject_id or "General")
        by_subject[key] = int(count)
    return {
        "total": int(total),
        "aiGenerated": int(ai_generated),
        "flagged": int(flagged),
        "pyq": int(pyq),
        "bySubject": by_subject,
    }


def syllabus_question_coverage(db: Session, institution_id: str) -> float:
    """Share of the catalog that has at least one bank question.

    Topics are the unit of coverage when the syllabus has them, then chapters,
    then subjects. Bank size is not coverage — a large bank can still miss
    most of the syllabus.
    """
    topic_ids = db.scalars(
        select(Topic.id)
        .join(Chapter, Topic.chapter_id == Chapter.id)
        .join(Subject, Chapter.subject_id == Subject.id)
        .where(Subject.institution_id == institution_id)
    ).all()
    if topic_ids:
        covered = db.scalar(
            select(func.count(func.distinct(Question.topic_id))).where(
                Question.institution_id == institution_id,
                Question.topic_id.in_(topic_ids),
            )
        ) or 0
        return round1((covered / len(topic_ids)) * 100)

    chapter_ids = db.scalars(
        select(Chapter.id).join(Subject, Chapter.subject_id == Subject.id).where(Subject.institution_id == institution_id)
    ).all()
    if chapter_ids:
        covered = db.scalar(
            select(func.count(func.distinct(Question.chapter_id))).where(
                Question.institution_id == institution_id,
                Question.chapter_id.in_(chapter_ids),
            )
        ) or 0
        return round1((covered / len(chapter_ids)) * 100)

    subject_ids = db.scalars(select(Subject.id).where(Subject.institution_id == institution_id)).all()
    if subject_ids:
        covered = db.scalar(
            select(func.count(func.distinct(Question.subject_id))).where(
                Question.institution_id == institution_id,
                Question.subject_id.in_(subject_ids),
            )
        ) or 0
        return round1((covered / len(subject_ids)) * 100)
    return 0.0


def exam_participation(db: Session, institution_id: str, student_count: int) -> float:
    """Students who submitted a real exam, as a percent of the student roster."""
    if not student_count:
        return 0.0
    submitted_students = db.scalar(
        select(func.count(func.distinct(ExamAttempt.student_id))).where(
            ExamAttempt.institution_id == institution_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ) or 0
    return round1((submitted_students / student_count) * 100)


def blend_engagement(*, attendance, assignment_completion, participation, has_attendance: bool, has_assignments: bool, has_students: bool) -> float:
    """Score the three signals shown on the class-pulse card.

    Weights are renormalized when a signal has no evidence, so a missing
    roster or an unmarked class does not count as a zero.
    """
    factors: list[tuple[float, float]] = []
    if has_attendance:
        factors.append((clamp(attendance), 0.5))
    if has_assignments:
        factors.append((clamp(assignment_completion), 0.3))
    if has_students:
        factors.append((clamp(participation), 0.2))
    if not factors:
        return 0.0
    weight_sum = sum(weight for _, weight in factors) or 1
    return round1(sum(value * weight for value, weight in factors) / weight_sum)


def list_faculty_courses(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    courses = db.scalars(select(Course).where(Course.institution_id == user.institution_id, Course.is_deleted.is_(False)).order_by(Course.code)).all()
    enrollments = dict(
        db.execute(
            select(Enrollment.course_id, func.count())
            .select_from(Enrollment)
            .join(StudentProfile, StudentProfile.user_id == Enrollment.student_id)
            .where(StudentProfile.institution_id == user.institution_id)
            .group_by(Enrollment.course_id)
        ).all()
    )
    items = []
    for course in courses:
        items.append(
            {
                "id": course.id,
                "code": course.code,
                "title": course.name,
                "name": course.name,
                "credits": course.credits or 0,
                "semester": f"Sem {course.semester_no}" if course.semester_no else None,
                "enrolled": int(enrollments.get(course.id) or 0),
                "status": "Active",
                "progress": 0,
                "faculty": user.full_name,
            }
        )
    return items


def build_faculty_profile(db: Session, user: User, *, _prefetched_courses: list | None = None) -> dict:
    profile = db.get(FacultyProfile, user.id)
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    dept = db.get(Department, profile.department_id) if profile and profile.department_id else None
    names = (user.full_name or "").split(" ", 1)
    first = user.first_name or (names[0] if names else None)
    last = names[1] if len(names) > 1 else None
    courses = _prefetched_courses if _prefetched_courses is not None else list_faculty_courses(db, user)
    specialization = []
    if profile and profile.specialization:
        specialization = [part.strip() for part in profile.specialization.split(",") if part.strip()]
    return {
        "id": user.id,
        "facultyId": profile.employee_no if profile else None,
        "firstName": first,
        "lastName": last,
        "fullName": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "avatarGradient": "linear-gradient(135deg, #6366f1, #3b82f6)",
        "institution": inst.name if inst else None,
        "department": dept.name if dept else None,
        "designation": profile.designation if profile else None,
        "qualification": None,
        "experienceYears": None,
        "specialization": specialization,
        "researchInterests": [],
        "officeHours": None,
        "officeRoom": None,
        "room": None,
        "courses": courses,
        "subjects": [],
        "assignedClasses": [],
        "teachingLoad": None,
        "weeklyTeachingHours": 0,
        "advisorGroups": [],
        "currentSemester": inst.academic_year if inst else None,
        "teachingStatistics": {},
        "teachingGoals": [],
        "departmentInfo": {"id": dept.id, "name": dept.name, "code": dept.code} if dept else None,
    }


def settings_payload(db: Session, user: User, *, _prefetched_profile: dict | None = None) -> dict:
    profile = _prefetched_profile if _prefetched_profile is not None else build_faculty_profile(db, user)
    stored = kv_get(db, coll_key("faculty_settings", user.id), None) or {}
    prefs = {**DEFAULT_PREFS, **(stored.get("teachingPrefs") or {})}
    ai = {**DEFAULT_AI, **(stored.get("aiSettings") or {})}
    return {
        "profile": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "designation": profile.get("designation"),
            "department": profile.get("department"),
            "officeHours": profile.get("officeHours"),
            "room": profile.get("officeRoom"),
        },
        "teachingPrefs": prefs,
        "aiSettings": ai,
    }


def empty_pyq_analysis(*, overview: dict | None = None) -> dict:
    ov = overview or {
        "totalPapers": 0,
        "yearsCovered": [],
        "subjects": [],
        "totalQuestions": 0,
        "repeatedQuestions": 0,
        "coveragePct": 0,
    }
    return {
        "overview": ov,
        "uploads": [],
        "trendAnalytics": {
            "yearWise": [],
            "semesterTrends": [],
            "questionFrequency": [],
            "chapterWeightage": [],
            "topicWeightage": [],
            "subjectWeightage": [],
        },
        "questionIntelligence": {
            "importantConcepts": [],
            "frequentChapters": [],
            "frequentTopics": [],
            "emergingTopics": [],
            "neverAsked": [],
            "mostRepeated": [],
            "aiPredictedQuestions": [],
        },
        "ncertMapping": [],
        "aiImportantQuestions": [],
        "difficultyAnalytics": {"distribution": [], "typeDistribution": []},
        "aiSuggestions": [],
        "exportOptions": [],
    }


def pyq_corpus(db: Session, user: User, *, subject: str | None = None) -> tuple[list[Question], dict]:
    if not user.institution_id:
        return [], empty_pyq_analysis()
    query = select(Question).where(Question.institution_id == user.institution_id, Question.is_pyq.is_(True))
    rows = db.scalars(query.order_by(Question.pyq_year.desc(), Question.created_at.desc())).all()
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    if subject and subject not in {"All", "All subjects"}:
        needle = subject.lower()
        filtered = []
        for row in rows:
            subj = subjects.get(row.subject_id)
            code = (subj.code if subj else "") or ""
            name = (subj.name if subj else "") or ""
            if needle in code.lower() or needle in name.lower() or needle in (row.concept or "").lower():
                filtered.append(row)
        rows = filtered
    years = sorted({int(q.pyq_year) for q in rows if q.pyq_year})
    subject_names = []
    seen = set()
    for row in rows:
        subj = subjects.get(row.subject_id)
        label = (subj.code if subj else None) or (subj.name if subj else None) or row.concept
        if label and label not in seen:
            seen.add(label)
            subject_names.append(label)
    by_year: dict[int, int] = defaultdict(int)
    by_chapter: dict[str, int] = defaultdict(int)
    by_topic: dict[str, int] = defaultdict(int)
    by_diff: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)
    for row in rows:
        if row.pyq_year:
            by_year[int(row.pyq_year)] += 1
        chapter = chapters.get(row.chapter_id) if row.chapter_id else None
        topic = topics.get(row.topic_id) if row.topic_id else None
        ch_name = (chapter.name if chapter else None) or row.concept or "General"
        tp_name = (topic.name if topic else None) or row.concept or ch_name
        by_chapter[ch_name] += 1
        by_topic[tp_name] += 1
        by_diff[(row.difficulty or "medium").title()] += 1
        by_type[(row.q_type or "mcq").upper() if (row.q_type or "") != "mcq" else "MCQ"] += 1
    total = len(rows)
    overview = {
        "totalPapers": len({q.pyq_year for q in rows if q.pyq_year}),
        "yearsCovered": years,
        "subjects": subject_names,
        "totalQuestions": total,
        "repeatedQuestions": 0,
        "coveragePct": 0,
    }
    analysis = empty_pyq_analysis(overview=overview)
    analysis["trendAnalytics"]["yearWise"] = [{"year": y, "questions": by_year[y], "repeated": 0} for y in years]
    analysis["trendAnalytics"]["chapterWeightage"] = [
        {"chapter": name, "weight": round1((count / total) * 100) if total else 0, "count": count}
        for name, count in sorted(by_chapter.items(), key=lambda kv: kv[1], reverse=True)
    ]
    analysis["trendAnalytics"]["topicWeightage"] = [
        {"topic": name, "weight": round1((count / total) * 100) if total else 0, "count": count}
        for name, count in sorted(by_topic.items(), key=lambda kv: kv[1], reverse=True)
    ]
    analysis["trendAnalytics"]["questionFrequency"] = [
        {"topic": name, "frequency": count} for name, count in sorted(by_topic.items(), key=lambda kv: kv[1], reverse=True)
    ]
    analysis["questionIntelligence"]["frequentChapters"] = [name for name, _ in sorted(by_chapter.items(), key=lambda kv: kv[1], reverse=True)[:8]]
    analysis["questionIntelligence"]["frequentTopics"] = [name for name, _ in sorted(by_topic.items(), key=lambda kv: kv[1], reverse=True)[:8]]
    analysis["questionIntelligence"]["importantConcepts"] = analysis["questionIntelligence"]["frequentTopics"]
    analysis["difficultyAnalytics"]["distribution"] = [
        {"difficulty": name, "count": count, "pct": round1((count / total) * 100) if total else 0}
        for name, count in by_diff.items()
    ]
    analysis["difficultyAnalytics"]["typeDistribution"] = [
        {"type": name, "count": count} for name, count in by_type.items()
    ]
    return rows, analysis


def pyq_filters(db: Session, user: User) -> dict:
    if not user.institution_id:
        return {"programs": [], "subjects": [], "chapters": {}, "yearRanges": []}
    programs = [p.name for p in db.scalars(select(Program).where(Program.institution_id == user.institution_id, Program.is_deleted.is_(False)).order_by(Program.name)).all()]

    subject_rows = db.scalars(select(Subject).where(Subject.institution_id == user.institution_id, Subject.is_deleted.is_(False)).order_by(Subject.code)).all()
    subject_ids = [s.id for s in subject_rows]

    # Batch-fetch all chapters for all subjects in one query (replaces N queries).
    all_chapters = (
        db.scalars(select(Chapter).where(Chapter.subject_id.in_(subject_ids)).order_by(Chapter.subject_id, Chapter.sort_order)).all()
        if subject_ids else []
    )
    chapters_by_subject: dict[str, list] = defaultdict(list)
    for ch in all_chapters:
        chapters_by_subject[ch.subject_id].append(ch)

    chapter_ids = [ch.id for ch in all_chapters]

    # Batch-fetch all topics for all chapters in one query (replaces M queries).
    all_topics = (
        db.scalars(select(Topic).where(Topic.chapter_id.in_(chapter_ids)).order_by(Topic.chapter_id, Topic.sort_order)).all()
        if chapter_ids else []
    )
    topics_by_chapter: dict[str, list[str]] = defaultdict(list)
    for t in all_topics:
        topics_by_chapter[t.chapter_id].append(t.name)

    subjects_out = []
    chapters_map: dict[str, list[str]] = {}
    for subject in subject_rows:
        chapter_rows = chapters_by_subject.get(subject.id, [])
        chapter_names = [c.name for c in chapter_rows]
        subjects_out.append({"code": subject.code, "name": subject.name, "chapters": chapter_names, "examMode": subject.exam_mode, "examFamily": subject.exam_family})
        for chapter in chapter_rows:
            chapters_map[chapter.name] = topics_by_chapter.get(chapter.id, [])

    years = sorted(
        {
            int(q.pyq_year)
            for q in db.scalars(select(Question).where(Question.institution_id == user.institution_id, Question.is_pyq.is_(True), Question.pyq_year.is_not(None))).all()
            if q.pyq_year
        }
    )
    year_ranges = []
    if years:
        year_ranges.append({"id": f"{years[0]}-{years[-1]}", "label": f"{years[0]}–{years[-1]}", "from": years[0], "to": years[-1]})
        for year in years:
            year_ranges.append({"id": str(year), "label": str(year), "from": year, "to": year})
    return {"programs": programs, "subjects": subjects_out, "chapters": chapters_map, "yearRanges": year_ranges}


def pyq_patterns(db: Session, user: User) -> list[dict]:
    _, analysis = pyq_corpus(db, user)
    items = []
    for row in analysis["trendAnalytics"]["questionFrequency"][:8]:
        items.append(
            {
                "pattern": row["topic"],
                "years": analysis["overview"]["yearsCovered"][-3:] if analysis["overview"]["yearsCovered"] else [],
                "frequency": row["frequency"],
                "impact": "High" if row["frequency"] >= 3 else "Medium" if row["frequency"] >= 2 else "Low",
            }
        )
    return items


def dna_weak_topics(db: Session, institution_id: str) -> list[dict]:
    student_ids = [
        p.user_id
        for p in db.scalars(select(StudentProfile).where(StudentProfile.institution_id == institution_id, StudentProfile.is_deleted.is_(False))).all()
    ]
    if not student_ids:
        return []
    rows = db.scalars(select(StudentDnaSnapshot).where(StudentDnaSnapshot.student_id.in_(student_ids))).all()
    buckets: dict[str, dict] = {}
    for row in rows:
        payload = parse_json(row.payload, {})
        for chapter in payload.get("chapters") or []:
            acc = chapter.get("accuracy")
            if acc is None or acc >= 70:
                continue
            key = chapter.get("chapter") or chapter.get("topic") or chapter.get("subject") or "General"
            bucket = buckets.setdefault(key, {"topic": key, "chapter": key, "course": chapter.get("subject"), "gap": 0, "studentsAffected": 0, "difficulty": "Medium", "action": {"label": "Targeted revision", "effort": "—"}})
            bucket["studentsAffected"] += 1
            bucket["gap"] = max(bucket["gap"], round1(100 - float(acc)))
    return sorted(buckets.values(), key=lambda row: row["gap"], reverse=True)


def assemble_faculty_intelligence(db: Session, user: User) -> dict:
    require_faculty(user)

    # Serve from cache when still fresh.
    cache_key = (user.institution_id, user.id)
    cached = _intel_cache.get(cache_key)
    if cached is not None:
        ts, payload = cached
        if time.time() - ts < _INTEL_CACHE_TTL:
            return payload

    courses = list_faculty_courses(db, user)
    profile = build_faculty_profile(db, user, _prefetched_courses=courses)
    directory = faculty_students_directory(db, user.institution_id)
    students = directory.get("students") or []
    assignments = faculty_assignments(db, user.institution_id)
    attendance = faculty_attendance(db, user.institution_id)
    papers = list_faculty_papers(db, user)
    stats = bank_stats(db, user.institution_id)
    published = [p for p in papers if str(p.get("status") or "").lower() == "published"]
    drafts = [p for p in papers if str(p.get("status") or "").lower() == "draft"]
    pending_grading = sum(max((a.get("submissions") or 0) - (a.get("graded") or 0), 0) for a in assignments)
    submitted = sum(a.get("submissions") or 0 for a in assignments)
    graded = sum(a.get("graded") or 0 for a in assignments)
    assignment_rates = []
    for row in assignments:
        total = row.get("total") or 0
        subs = row.get("submissions") or 0
        if total:
            assignment_rates.append((subs / total) * 100)
        elif subs == 0:
            # Published work with an empty roster and no submissions is 0% complete,
            # not "unknown". Submissions without a roster are left out of the average.
            assignment_rates.append(0.0)
    assignment_completion = round1(sum(assignment_rates) / len(assignment_rates)) if assignment_rates else 0
    attendance_avg = attendance.get("summary", {}).get("avgAttendance") or 0
    attendance_delta = attendance.get("summary", {}).get("attendanceDelta")
    marked_sessions = any((row.get("total") or 0) > 0 for row in (attendance.get("classes") or []))
    below = attendance.get("studentsBelowThreshold") or []
    attention_students = [s for s in students if s.get("attention") or s.get("status") == "Needs Attention"]
    weak_topics = dna_weak_topics(db, user.institution_id)
    classes_completed = len(attendance.get("classes") or [])
    has_evidence = bool(classes_completed or assignments or papers or stats["total"] or students)
    teaching_score = 0.0
    if has_evidence:
        teaching_score = round1(
            clamp(attendance_avg) * 0.35
            + clamp(assignment_completion) * 0.25
            + clamp((len(published) / max(len(papers), 1)) * 100 if papers else 0) * 0.2
            + clamp(100 - min(len(attention_students) * 10, 100)) * 0.2
        )
    participation = exam_participation(db, user.institution_id, len(students))
    engagement_score = (
        blend_engagement(
            attendance=attendance_avg,
            assignment_completion=assignment_completion,
            participation=participation,
            has_attendance=marked_sessions,
            has_assignments=bool(assignments),
            has_students=bool(students),
        )
        if has_evidence
        else 0
    )
    coverage = syllabus_question_coverage(db, user.institution_id) if stats["total"] else 0
    ready_papers = [p for p in papers if p.get("ready")]
    readiness = round1((len(ready_papers) / len(papers)) * 100) if papers else 0
    assessment_score = round1(clamp(coverage) * 0.5 + clamp(readiness) * 0.5) if (stats["total"] or papers) else 0
    first = profile.get("firstName") or "Faculty"
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    local = local_now(inst.timezone if inst else None)
    period = day_period(local.hour)
    greeting = f"Good {period}, {first}"
    date_label = local.strftime("%A, %d %B")
    bank_status = f"{stats['total']} questions · {stats['flagged']} flagged"
    paper_ready_label = f"{len(ready_papers)}/{len(papers)}" if papers else "0/0"
    weekly_trend = [{"label": row.get("week"), "value": row.get("pct"), "avg": row.get("pct")} for row in (attendance.get("weeklyTrend") or [])]
    teaching_health = {
        "score": teaching_score,
        "grade": score_label(teaching_score, has_evidence=has_evidence),
        "factors": [
            {"label": "Attendance", "value": round1(attendance_avg), "weight": 0.35},
            {"label": "Assignments", "value": assignment_completion, "weight": 0.25},
            {"label": "Papers published", "value": round1((len(published) / max(len(papers), 1)) * 100) if papers else 0, "weight": 0.2},
            {"label": "Student follow-up", "value": clamp(100 - min(len(attention_students) * 10, 100)), "weight": 0.2},
        ],
        "classesCompleted": classes_completed,
        "courseCompletion": 0,
        "weeklyTrend": weekly_trend,
    }
    student_engagement = {
        "score": engagement_score,
        "attendanceTrend": {
            "latest": attendance_avg if marked_sessions else None,
            "delta": attendance_delta if marked_sessions else None,
        },
        "assignmentCompletion": assignment_completion if assignments else None,
        "participation": participation if students else None,
        "studentsRequiringAttention": len(attention_students),
        "byCourse": [],
    }
    assessment_health = {
        "score": assessment_score,
        "grade": score_label(assessment_score, has_evidence=bool(stats["total"] or papers)),
        "readiness": readiness,
        "coverage": coverage,
        "pendingEvaluations": pending_grading,
        "paperGeneration": paper_ready_label,
        "questionBankStatus": bank_status,
    }
    ai_insights = {
        "alertsCount": len(attention_students) + len(weak_topics),
        "revisionCritical": sum(1 for t in weak_topics if t.get("gap", 0) >= 40),
        "weakChaptersCount": len(weak_topics),
        "weakStudentCount": len(attention_students),
        "todaysRecommendation": (
            f"{len(attention_students)} student(s) need follow-up."
            if attention_students
            else "No priority action recommended today."
        ),
        "topWeakChapter": weak_topics[0]["topic"] if weak_topics else "—",
    }
    assignment_items = []
    completion_trend = []
    for row in assignments:
        total = row.get("total") or 0
        subs = row.get("submissions") or 0
        graded_n = row.get("graded") or 0
        rate = round((subs / total) * 100) if total else 0
        assignment_items.append(
            {
                **row,
                "lateCount": 0,
                "pendingGrading": max(subs - graded_n, 0),
                "needsReview": max(subs - graded_n, 0) > 0,
                "submissionRate": rate,
                "avgPct": None,
                "failureRate": None,
                "commonMistakes": [],
            }
        )
        completion_trend.append({"label": row.get("title"), "submissionRate": rate, "gradedRate": round((graded_n / subs) * 100) if subs else 0})
    attention_items = []
    for student in attention_students:
        attention_items.append(
            {
                "id": student.get("id"),
                "name": student.get("name"),
                "roll": student.get("roll"),
                "course": student.get("course") or student.get("batchName") or "—",
                "category": "Weak Performance" if student.get("latestAccuracy") is not None else "Low Engagement",
                "priority": "High" if (student.get("latestAccuracy") or 100) < 55 else "Medium",
                "risk": round1(100 - float(student.get("latestAccuracy") or 0)) if student.get("latestAccuracy") is not None else 0,
                "confidence": 0,
                "reason": student.get("attentionReason") or "Flagged from live exam records.",
                "suggestedAction": "Review Student 360 and assign targeted practice.",
                "estimatedImprovement": "—",
                "improvementDetail": "Calculated after a published re-test.",
            }
        )
    by_category: dict[str, list] = defaultdict(list)
    for item in attention_items:
        by_category[item["category"]].append(item)
    category_summary = [{"category": key, "count": len(rows), "topRisk": max((r.get("risk") or 0) for r in rows)} for key, rows in by_category.items()]
    first_name = first
    dashboard = {
        "successCenter": {
            "teachingHealth": teaching_health,
            "studentEngagement": student_engagement,
            "assessmentHealth": assessment_health,
            "aiTeachingInsights": ai_insights,
        },
        "aiBrief": {
            "greeting": greeting,
            "date": date_label,
            "todayClasses": 0,
            "pendingReview": pending_grading,
            "studentsNeedingAttention": len(attention_students),
            "assessmentCoverage": coverage,
            "recommendedRevision": weak_topics[0]["topic"] if weak_topics else "—",
            "todaysPriority": (
                f"{len(attention_students)} student(s) need follow-up"
                if attention_students
                else "No urgent follow-up"
            ),
            "priorityDetail": "Signals come from live attendance, assignments and exam attempts.",
        },
        "todaySchedule": [],
        "interventions": [],
        "timeline": [],
        "pendingTasks": (
            [{"id": "grade", "title": f"{pending_grading} submissions to grade", "to": "/faculty/assignments"}]
            if pending_grading
            else []
        ),
        "courseProgress": [
            {"courseCode": c.get("code"), "title": c.get("title"), "section": None, "lecturesDone": 0, "lecturesTotal": 0, "progress": 0}
            for c in courses
        ],
        "attention": [
            {"id": s.get("id"), "name": s.get("name"), "roll": s.get("roll"), "reason": s.get("attentionReason"), "status": s.get("status")}
            for s in attention_students
        ],
        "recentActivities": [
            {"id": p.get("id"), "type": "paper", "title": p.get("title"), "detail": p.get("status"), "date": p.get("generated")}
            for p in papers[:8]
        ],
        "smartActions": [
            {"id": "attendance", "label": "Mark attendance", "desc": f"{classes_completed} sessions recorded", "to": "/faculty/attendance", "icon": "CalendarClock", "grad": "from-indigo-500 to-blue-500"},
            {"id": "assignments", "label": "Grade assignments", "desc": f"{pending_grading} pending", "to": "/faculty/assignments", "icon": "ClipboardCheck", "grad": "from-amber-500 to-orange-500"},
            {"id": "students", "label": "Students needing attention", "desc": f"{len(attention_students)} flagged", "to": "/faculty/my-students", "icon": "Users", "grad": "from-rose-500 to-red-500"},
            {"id": "papers", "label": "Paper library", "desc": f"{len(papers)} papers", "to": "/faculty/question-intelligence", "icon": "Wand2", "grad": "from-emerald-500 to-teal-500"},
            {"id": "studio", "label": "Question studio", "desc": f"{stats['total']} bank questions", "to": "/faculty/ai-question-studio", "icon": "Sparkles", "grad": "from-violet-500 to-fuchsia-500"},
            {"id": "planner", "label": "Lecture planner", "desc": "No timetable yet" if not courses else f"{len(courses)} courses", "to": "/faculty/lecture-planner", "icon": "Presentation", "grad": "from-sky-500 to-cyan-500"},
        ],
        "questionBankStatus": bank_status,
    }
    from app.services.reports_runtime import list_reports as sql_reports
    from app.services.teaching_ops import list_research as sql_research
    from app.services.teaching_ops import list_lessons, list_slots

    reports_items = sql_reports(db, user)
    research = sql_research(db, user)
    lessons = list_lessons(db, user).get("items") or []
    timetable_pack = list_slots(db, user)
    timetable = timetable_pack.get("slots") or []
    derived = {
        "teachingHealth": teaching_health,
        "teachingEffectiveness": {"score": teaching_score, "grade": teaching_health["grade"]},
        "studentEngagement": student_engagement,
        "teachingProductivity": {
            "score": 0,
            "hoursSaved": 0,
            "questionsGenerated": stats["aiGenerated"],
            "lessonsDrafted": 0,
            "gradedAutomated": 0,
        },
        "performanceTrend": weekly_trend,
        "assessmentReadiness": {
            "score": assessment_score,
            "coverage": coverage,
            "draftsInReview": len(drafts),
            "readyPapers": len(ready_papers),
            "publishedQuizzes": 0,
        },
        "courseProgress": dashboard["courseProgress"],
        "assessmentCoverage": coverage,
        "assignmentCompletion": {
            "items": assignment_items,
            "overallSubmission": assignment_completion,
            "overallGraded": round1((graded / submitted) * 100) if submitted else 0,
            "pendingGrading": pending_grading,
        },
        "evaluationProgress": {
            "graded": graded,
            "submitted": submitted,
            "pending": pending_grading,
            "overall": round1((graded / submitted) * 100) if submitted else 0,
        },
        "weakChapters": {"items": weak_topics, "count": len(weak_topics)},
        "revisionPriority": {"items": weak_topics, "critical": ai_insights["revisionCritical"]},
        "cohorts": directory.get("batches") or [],
        "alerts": [],
        "recommendations": {"items": [], "critical": 0},
        "attendanceIntelligence": {
            "overall": attendance_avg,
            "summary": attendance.get("summary") or {},
            "byClass": [],
            "bySubject": [],
            "weeklyTrend": attendance.get("weeklyTrend") or [],
            "heatmap": [],
            "lowAttendance": [
                {"name": s.get("name"), "roll": s.get("roll"), "attendance": s.get("attendance"), "classes": s.get("classes"), "level": "Critical" if (s.get("attendance") or 0) < 65 else "Watch"}
                for s in below
            ],
            "consecutiveMissing": [],
            "correlation": [],
            "correlationGap": 0,
            "insights": [],
            "pendingToday": {"count": 0, "slots": []},
        },
        "assignmentAnalytics": {
            "items": assignment_items,
            "completionTrend": completion_trend,
            "pendingGrading": pending_grading,
            "submitted": submitted,
            "late": 0,
            "needsReviewCount": sum(1 for a in assignment_items if a.get("needsReview")),
            "openCount": sum(1 for a in assignments if a.get("status") == "Open"),
            "gradedCount": sum(1 for a in assignments if a.get("status") == "Graded"),
            "avgMarks": None,
            "highPerformers": [],
            "needsHelp": [],
            "suggestions": [],
        },
        "engagementAnalytics": {
            "overall": engagement_score,
            "students": [],
            "distribution": [],
            "distributionData": [],
            "dimensionAverages": [],
            "topEngaged": [],
            "leastEngaged": [],
            "byCourse": [],
            "weeklyTrend": weekly_trend,
            "insights": [],
            "note": None,
        },
        "teachingInsights": {
            "weakChapters": weak_topics,
            "weakChaptersCount": len(weak_topics),
            "weakTopics": weak_topics,
            "weakTopicsCount": len(weak_topics),
            "classPerformance": [],
            "averageUnderstanding": None,
            "byCourseUnderstanding": [],
            "learningGaps": [],
            "revisionPriority": weak_topics,
            "topicDifficulty": [],
            "studentsNeedingHelp": attention_items,
            "generatedAt": utcnow().isoformat(),
        },
        "attentionStudents": {
            "items": attention_items,
            "summary": category_summary,
            "byCategory": dict(by_category),
            "total": len(attention_items),
            "critical": sum(1 for s in attention_items if s.get("priority") == "High" and (s.get("risk") or 0) >= 45),
            "high": sum(1 for s in attention_items if s.get("priority") == "High"),
            "avgRisk": round1(sum(s.get("risk") or 0 for s in attention_items) / len(attention_items)) if attention_items else 0,
        },
        "teachingTimeline": {"events": [], "counts": {}, "total": 0},
        "assessment": {
            "questionStats": {
                "total": stats["total"],
                "bySubject": stats["bySubject"],
                "aiGenerated": stats["aiGenerated"],
                "flagged": stats["flagged"],
                "avgAccuracy": None,
                "qualityAvg": None,
                "questions": [],
                "difficultyDistribution": [],
            },
            "coverage": coverage,
            "assessmentHealth": assessment_health,
            "paperLibrary": papers,
            "upcomingAssessments": [],
            "timeline": [],
            "recommendations": [],
            "summary": {
                "questionBank": stats["total"],
                "aiGenerated": stats["aiGenerated"],
                "papersGenerated": len(papers),
                "examDrafts": len(drafts),
                "quizzes": 0,
                "pyqPapers": stats["pyq"],
                "flagged": stats["flagged"],
            },
        },
        "pyqIntelligence": empty_pyq_analysis()["overview"],
        "competitiveQuestionIntelligence": {
            "jee": {},
            "neet": {},
            "total": 0,
            "pyqRecords": [],
            "universityPyq": [],
            "universityPyqCount": 0,
        },
        "reports": {
            "library": {
                "total": len(reports_items),
                "active": len([r for r in reports_items if not r.get("archived")]),
                "archived": len([r for r in reports_items if r.get("archived")]),
                "totalDownloads": sum(r.get("downloads") or 0 for r in reports_items),
                "avgDownloads": 0,
                "byFormat": {},
                "byCategory": {},
                "latest": reports_items[:5],
                "items": reports_items,
            },
            "templates": [],
            "exportOptions": [],
            "exportHistory": [],
            "exportStats": {},
            "schedule": [],
            "recommendations": [],
            "summary": {},
        },
        "students": directory,
        "dashboard": dashboard,
        "aiStudio": {
            "assistantContext": {
                "health": {
                    "teaching": teaching_score,
                    "engagement": engagement_score,
                    "assessment": assessment_score,
                }
            },
            "prompts": [],
            "recommendations": [],
            "history": list_studio_history(db, user),
            "portfolio": {},
            "savedLessonPlans": [],
            "contentTypes": [],
            "evaluationWorkflows": [],
            "resources": [],
            "recentUploads": [],
        },
        "summary": {
            "headline": f"Teaching health {teaching_score}/100 ({teaching_health['grade']})",
            "body": (
                f"{len(students)} students in your institution · {stats['total']} questions · {len(papers)} papers."
                if has_evidence
                else "No teaching records yet. KPIs will fill in from attendance, assignments, questions and papers."
            ),
            "highlights": [
                f"{len(students)} students",
                f"{stats['total']} questions in bank",
                f"{pending_grading} submissions pending grade",
            ],
        },
        "assessmentSummary": {
            "questionBank": stats["total"],
            "aiGenerated": stats["aiGenerated"],
            "papersGenerated": len(papers),
            "examDrafts": len(drafts),
            "quizzes": 0,
            "pyqPapers": stats["pyq"],
            "flagged": stats["flagged"],
        },
        "generatedAt": utcnow().isoformat(),
    }
    datasets = {
        "profile": profile,
        "courses": courses,
        "sections": [],
        "timetable": timetable,
        "teachingSchedule": timetable,
        "teachingCalendar": [],
        "weeklyTeachingHours": 0,
        "announcements": [],
        "attendance": attendance,
        "assignments": assignments,
        "questionBank": {"summary": {"total": stats["total"], "bySubject": stats["bySubject"]}, "questions": []},
        "questionPapers": papers,
        "paperGenerator": {"generatedPapers": papers, "templates": [], "config": {}},
        "lecturePlanner": lessons,
        "studentAnalytics": directory,
        "engagement": {},
        "aiStudio": derived["aiStudio"],
        "research": research,
        "reports": reports_items,
        "settings": settings_payload(db, user, _prefetched_profile=profile),
    }
    result = {"profile": profile, "datasets": datasets, "derived": derived}
    _intel_cache[cache_key] = (time.time(), result)
    return result


def empty_research() -> dict:
    return {
        "summary": {"publications": 0, "citations": 0, "grants": 0, "hIndex": 0},
        "citationsTrend": [],
        "publications": [],
        "grants": [],
        "collaborations": [],
        "gap": "BACKEND GAP — research publications are not persisted yet.",
    }


def empty_exam_builder() -> dict:
    return {"drafts": [], "blueprint": {}}


def empty_quiz_builder() -> dict:
    return {"quizzes": [], "analytics": {}, "questionDistribution": []}


def reports_list(db: Session, user: User) -> list:
    from app.services.reports_runtime import list_reports

    return list_reports(db, user)


def _paper_generator_catalog(db: Session, institution_id: str | None) -> dict:
    """Real Course → Subject → Chapter → Topic catalog for the paper studio.

    Not institution-scoped: subjects, chapters, topics, courses and programs
    are merged across every institution so the studio shows the full catalog.
    The ``institution_id`` argument is accepted for call-site compatibility but
    no longer filters the results. Empty tables produce empty arrays — never a
    prototype/demo fallback.
    """
    programs = [
        p.name
        for p in db.scalars(select(Program).order_by(Program.name)).all()
    ]
    subjects = db.scalars(
        select(Subject).order_by(Subject.code)
    ).all()
    subject_ids = [row.id for row in subjects]
    chapter_rows = (
        db.scalars(
            select(Chapter)
            .where(Chapter.subject_id.in_(subject_ids))
            .order_by(Chapter.sort_order, Chapter.name)
        ).all()
        if subject_ids
        else []
    )
    chapter_ids = [row.id for row in chapter_rows]
    topic_rows = (
        db.scalars(
            select(Topic).where(Topic.chapter_id.in_(chapter_ids)).order_by(Topic.sort_order, Topic.name)
        ).all()
        if chapter_ids
        else []
    )
    topics_by_chapter: dict[str, list[str]] = defaultdict(list)
    for topic in topic_rows:
        topics_by_chapter[topic.chapter_id].append(topic.name)

    raw_subject_catalog = []
    for subject in subjects:
        subject_chapters = [row for row in chapter_rows if row.subject_id == subject.id]
        raw_subject_catalog.append(
            {
                "id": subject.id,
                "code": subject.code,
                "name": subject.name,
                "examMode": subject.exam_mode,
                "examFamily": subject.exam_family,
                "chapters": [
                    {
                        "id": chapter.id,
                        "name": chapter.name,
                        "courseId": chapter.course_id,
                        "topics": topics_by_chapter.get(chapter.id, []),
                    }
                    for chapter in subject_chapters
                ],
            }
        )

    # Merge subjects that share the same display name (e.g. two "Biology" rows
    # coming from different institutions). The studio keys chapters/topics by
    # subject name, so each named subject must expose the UNION of every
    # matching row's chapters — and each chapter the union of its topics —
    # otherwise only one row's chapters would surface. Names are matched
    # case-insensitively; the first row seen keeps its id/code/mode/family.
    subject_catalog = []
    _subject_by_name: dict[str, dict] = {}
    for subject in raw_subject_catalog:
        key = (subject["name"] or "").strip().casefold()
        merged = _subject_by_name.get(key)
        if merged is None:
            merged = {
                "id": subject["id"],
                "code": subject["code"],
                "name": subject["name"],
                "examMode": subject["examMode"],
                "examFamily": subject["examFamily"],
                "chapters": [],
                "_chapter_index": {},  # case-insensitive chapter name -> chapter dict
            }
            _subject_by_name[key] = merged
            subject_catalog.append(merged)
        else:
            # A later row may carry the JEE/NEET family the first row lacked.
            if not merged.get("examFamily") and subject.get("examFamily"):
                merged["examFamily"] = subject["examFamily"]
        for chapter in subject["chapters"]:
            ch_key = (chapter["name"] or "").strip().casefold()
            existing_chapter = merged["_chapter_index"].get(ch_key)
            if existing_chapter is None:
                new_chapter = {
                    "id": chapter["id"],
                    "name": chapter["name"],
                    "courseId": chapter["courseId"],
                    "topics": [],
                    "_topic_index": set(),  # case-insensitive topic names seen
                }
                merged["_chapter_index"][ch_key] = new_chapter
                merged["chapters"].append(new_chapter)
                existing_chapter = new_chapter
            for topic_name in chapter["topics"]:
                tp_key = (topic_name or "").strip().casefold()
                if tp_key and tp_key not in existing_chapter["_topic_index"]:
                    existing_chapter["_topic_index"].add(tp_key)
                    existing_chapter["topics"].append(topic_name)

    # Drop the internal merge helpers so the payload stays clean.
    for subject in subject_catalog:
        subject.pop("_chapter_index", None)
        for chapter in subject["chapters"]:
            chapter.pop("_topic_index", None)

    courses = db.scalars(
        select(Course).order_by(Course.code)
    ).all()
    subject_by_id = {row.id: row for row in subjects}
    course_catalog = []
    for course in courses:
        subject = subject_by_id.get(course.subject_id) if course.subject_id else None
        course_catalog.append(
            {
                "id": course.id,
                "code": course.code,
                "name": course.name,
                "subjectId": subject.id if subject else None,
                "subjectCode": subject.code if subject else None,
                "subjectName": subject.name if subject else None,
            }
        )

    university_subjects = [
        row for row in subject_catalog if (row.get("examMode") or "university").lower() == "university"
    ]
    university_courses = [row for row in course_catalog if row.get("subjectCode")]

    chapters_map: dict[str, list[str]] = {}
    topics_map: dict[str, list[str]] = {}
    for subject in subject_catalog:
        subject_chapter_names = [chapter["name"] for chapter in subject["chapters"]]
        chapters_map[f"{subject['code']} — {subject['name']}"] = subject_chapter_names
        chapters_map.setdefault(subject["name"], subject_chapter_names)
        for chapter in subject["chapters"]:
            topics_map[chapter["name"]] = chapter["topics"]

    def _competitive_family(raw: Any) -> str | None:
        """Normalise a subject's exam_family label to the JEE/NEET buckets.

        Accepts the values used across the schema and the AI pipeline
        ("jee", "JEE_MAIN", "JEE Advanced", "neet-ug", ...). Returns None for
        anything that is not a JEE/NEET family.
        """
        token = str(raw or "").strip().lower().replace("_", " ").replace("-", " ")
        if not token:
            return None
        if token.startswith("jee"):
            return "JEE"
        if token.startswith("neet"):
            return "NEET"
        return None

    # Bucket over the RAW (pre-merge) rows: a subject like Physics/Chemistry
    # legitimately belongs to BOTH JEE and NEET via separate rows. Merging the
    # catalog by name (for the chapter/topic union) must not collapse that
    # dual family membership, or a family would lose subjects.
    competitive_subjects = {"JEE": [], "NEET": []}
    for subject in raw_subject_catalog:
        bucket = _competitive_family(subject.get("examFamily"))
        if bucket:
            competitive_subjects[bucket].append(subject["name"])
    for bucket in competitive_subjects.values():
        # Deterministic, de-duplicated order.
        deduped = sorted({name for name in bucket}, key=str.casefold)
        bucket[:] = deduped

    return {
        "programs": programs,
        "universityTypes": ["Mid Semester", "End Semester", "Full Mock Test", "Practice Test"],
        "competitiveTypes": ["Full Mock Test", "Practice Test"],
        "durations": [60, 90, 120, 150, 180, 200],
        "courseCatalog": course_catalog,
        "courses": [f"{row['code']} — {row['name']}" for row in university_courses],
        "subjectCatalog": subject_catalog,
        "subjects": [f"{row['code']} — {row['name']}" for row in university_subjects],
        "chapters": chapters_map,
        "topics": topics_map,
        "competitiveSubjects": competitive_subjects,
    }


def paper_generator_payload(db: Session, user: User) -> dict:
    papers = list_faculty_papers(db, user)
    return {
        "generatedPapers": papers,
        "items": papers,
        "templates": [],
        "config": _paper_generator_catalog(db, user.institution_id),
        "versionHistory": {},
    }


def _serialize_paper_share(db: Session, row: PaperShare, paper: Paper | None = None) -> dict:
    paper = paper or db.get(Paper, row.paper_id)
    audience = parse_json(row.audience, {})
    return {
        "id": row.id,
        "paperId": row.paper_id,
        "title": paper.title if paper else None,
        "audience": audience.get("audience") or "batch",
        "recipients": audience.get("recipients") or [],
        "message": audience.get("message"),
        "status": "Published" if paper and paper.status == "published" else (paper.status if paper else None),
        "delivery": "institution-students-via-publish",
        "sharedAt": iso(row.created_at),
        "sharedBy": None,
        "sharedById": row.shared_by,
        "source": "sql",
    }


def list_paper_shares(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    query = select(Paper).where(Paper.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(Paper.created_by == user.id)
    papers = {row.id: row for row in db.scalars(query).all()}
    if not papers:
        return []
    rows = db.scalars(select(PaperShare).where(PaperShare.paper_id.in_(list(papers))).order_by(PaperShare.created_at.desc())).all()
    items = []
    for row in rows:
        item = _serialize_paper_share(db, row, papers.get(row.paper_id))
        owner = db.get(User, row.shared_by) if row.shared_by else None
        item["sharedBy"] = owner.full_name if owner else None
        items.append(item)
    return items


def share_faculty_paper(db: Session, user: User, paper_id: str, body: dict | None = None) -> dict:
    """Share a paper from the Paper Library.

    Handles both SQL papers (papers table) and AI-generated papers
    (ai_generated_papers).  If the paper is not found in the SQL papers table,
    falls back to the AI paper share path — this lets the frontend use a single
    endpoint for both paper types without knowing which backend table holds the
    paper.

    SQL papers: published (or published on-the-fly) + PaperShare record.
    AI papers: ai_paper_shares record only (EduX is read-only for AI papers).
    """
    paper = db.get(Paper, paper_id)
    if paper is None:
        # Try AI paper fallback — the frontend share button sends the same
        # endpoint for both SQL and AI papers.
        return share_ai_paper(db, user, paper_id, body)

    # --- SQL paper path ---
    if paper.status != "published":
        payload = publish_sql_paper(db, user, paper_id)
        serialized = payload.get("paper") or {}
    else:
        from app.services.examination import get_faculty_paper as _get
        serialized = _get(db, user, paper_id)

    audience_payload = {
        "audience": (body or {}).get("audience") or "batch",
        "recipients": (body or {}).get("recipients") or [],
        "message": (body or {}).get("message"),
    }
    row = PaperShare(
        paper_id=paper_id,
        shared_by=user.id,
        audience=json.dumps(audience_payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    share = _serialize_paper_share(db, row, paper)
    share["sharedBy"] = user.full_name
    share["title"] = serialized.get("title") if serialized else paper.title
    return {"ok": True, "share": share, "paper": serialized}


# ---------------------------------------------------------------------------
# AI Paper Library — share / list-shares
# ---------------------------------------------------------------------------

def _serialize_ai_paper_share(row: AiPaperShare, paper: AiGeneratedPaper | None = None) -> dict:
    audience = parse_json(row.audience, {})
    return {
        "id": row.id,
        "paperId": row.paper_id,
        "title": paper.title if paper else None,
        "examFamily": paper.exam_family if paper else None,
        "subject": paper.subject_name if paper else None,
        "audience": audience.get("audience") or "batch",
        "recipients": audience.get("recipients") or [],
        "message": audience.get("message"),
        "sharedAt": iso(row.created_at),
        "sharedBy": None,
        "sharedById": row.shared_by,
        "source": "ai",
    }


def share_ai_paper(db: Session, user: User, paper_id: str, body: dict | None = None) -> dict:
    """Record a share of an AI-generated paper.

    AI papers are read-only in EduX (written by the AI microservice), so we
    cannot modify their status.  We simply write a delivery record in
    ai_paper_shares and return a serialized share payload.
    """
    from app.models.ai_papers import AiGeneratedPaper as _AiPaper

    paper = db.get(_AiPaper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "AI paper not found")

    audience_payload = {
        "audience": (body or {}).get("audience") or "batch",
        "recipients": (body or {}).get("recipients") or [],
        "message": (body or {}).get("message"),
    }
    row = AiPaperShare(
        paper_id=paper_id,
        institution_id=user.institution_id,
        shared_by=user.id,
        audience=json.dumps(audience_payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    share = _serialize_ai_paper_share(row, paper)
    share["sharedBy"] = user.full_name
    return {"ok": True, "share": share}


def list_ai_paper_shares(db: Session, user: User) -> list[dict]:
    """List all AI paper shares created by this faculty."""
    if not user.institution_id:
        return []
    query = select(AiPaperShare).where(AiPaperShare.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(AiPaperShare.shared_by == user.id)
    rows = db.scalars(query.order_by(AiPaperShare.created_at.desc())).all()
    paper_ids = list({row.paper_id for row in rows})
    papers: dict[str, AiGeneratedPaper] = {}
    if paper_ids:
        from app.models.ai_papers import AiGeneratedPaper as _AiPaper
        for p in db.scalars(select(_AiPaper).where(_AiPaper.id.in_(paper_ids))).all():
            papers[p.id] = p
    items = []
    for row in rows:
        item = _serialize_ai_paper_share(row, papers.get(row.paper_id))
        owner = db.get(User, row.shared_by) if row.shared_by else None
        item["sharedBy"] = owner.full_name if owner else None
        items.append(item)
    return items


# ---------------------------------------------------------------------------
# Student — Paper Library (papers shared with the student's institution)
# ---------------------------------------------------------------------------

def _ai_exam_label_local(raw: str | None) -> str | None:
    """Normalise AI service exam_family labels to EduX-facing strings."""
    if not raw:
        return None
    token = str(raw).strip().lower().replace("_", " ").replace("-", " ")
    if token.startswith("jee"):
        return "JEE"
    if token.startswith("neet"):
        return "NEET"
    return raw.strip()


def student_paper_library(db: Session, user) -> dict:
    """Return papers shared with the student's institution.

    Includes:
    - SQL papers (papers table) that are Published and belong to the institution
    - AI-generated papers (ai_generated_papers) shared via ai_paper_shares for
      this institution

    The frontend PaperCard contract is honoured for both types.
    """
    institution_id = user.institution_id
    if not institution_id:
        return {"items": [], "count": 0}

    from app.models.ai_papers import AiGeneratedPaper as _AiPaper, AiGeneratedPaperQuestion as _AiQ
    from app.services.examination import serialize_paper_faculty

    items: list[dict] = []

    # --- SQL published papers ---
    sql_papers = db.scalars(
        select(Paper)
        .where(
            Paper.institution_id == institution_id,
            Paper.status == "published",
        )
        .order_by(Paper.created_at.desc())
    ).all()
    for paper in sql_papers:
        try:
            serialized = serialize_paper_faculty(db, paper, include_questions=False)
        except Exception:
            continue
        items.append({**serialized, "source": "sql"})

    # --- AI papers shared with this institution ---
    share_rows = db.scalars(
        select(AiPaperShare)
        .where(AiPaperShare.institution_id == institution_id)
        .order_by(AiPaperShare.created_at.desc())
    ).all()
    shared_paper_ids = list({row.paper_id for row in share_rows})
    # Build a map of paper_id → (faculty_name, department_name) from the sharer
    _paper_faculty_map: dict[str, tuple[str | None, str | None]] = {}
    for share in share_rows:
        if share.paper_id in _paper_faculty_map:
            continue
        faculty_name_ai: str | None = None
        department_name_ai: str | None = None
        if share.shared_by:
            sharer = db.get(User, share.shared_by)
            if sharer:
                faculty_name_ai = sharer.full_name
                fp = db.get(FacultyProfile, sharer.id)
                if fp and fp.department_id:
                    dept = db.get(Department, fp.department_id)
                    department_name_ai = dept.name if dept else None
        _paper_faculty_map[share.paper_id] = (faculty_name_ai, department_name_ai)
    if shared_paper_ids:
        ai_papers = db.scalars(select(_AiPaper).where(_AiPaper.id.in_(shared_paper_ids))).all()
        counts = dict(
            db.execute(
                select(_AiQ.paper_id, func.count(_AiQ.id))
                .where(_AiQ.paper_id.in_(shared_paper_ids))
                .group_by(_AiQ.paper_id)
            ).all()
        )
        for p in ai_papers:
            from datetime import date as _date
            exam_label = _ai_exam_label_local(p.exam_family)
            q_count = counts.get(p.id, 0) or p.question_count or 0
            created = p.created_at.date().isoformat() if p.created_at else _date.today().isoformat()
            _fac_name, _dept_name = _paper_faculty_map.get(p.id, (None, None))
            items.append({
                "id": p.id,
                "paperCode": p.paper_code,
                "title": p.title,
                "course": None,
                "subject": p.subject_name,
                "mode": p.exam_mode or "Competitive",
                "domain": p.exam_mode or "Competitive",
                "exam": exam_label,
                "examFamily": exam_label,
                "examType": "AI Generated",
                "paperType": "AI Generated",
                "chapter": p.chapter_name,
                "topic": p.topic_name,
                "faculty": _fac_name,
                "department": _dept_name,
                "totalMarks": p.total_marks or (q_count * 4),
                "duration": p.duration_minutes or (q_count * 2),
                "questions": q_count,
                "status": (p.status or "draft").title(),
                "generated": created,
                "created": created,
                "modified": created,
                "difficulty": (p.difficulty_mix or {}).get("difficulty", "mixed"),
                "source": "ai",
            })

    # Sort newest first (by created date string — ISO format sorts correctly)
    items.sort(key=lambda x: x.get("created") or "", reverse=True)
    return {"items": items, "count": len(items)}


def list_studio_history(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    rows = db.scalars(
        select(AiTrace)
        .where(
            AiTrace.institution_id == user.institution_id,
            AiTrace.user_id == user.id,
            AiTrace.feature.like("ai_studio%"),
            AiTrace.status == "COMPLETED",
        )
        .order_by(AiTrace.created_at.desc())
    ).all()
    items = []
    for row in rows:
        request = parse_json(row.request, {})
        items.append(
            {
                "id": row.id,
                "kind": request.get("kind") or (row.feature.split(":", 1)[1] if ":" in (row.feature or "") else row.feature),
                "item": request.get("item"),
                "savedAt": iso(row.created_at),
                "status": row.status,
                "source": "sql",
            }
        )
    return items


def save_studio_item(db: Session, user: User, body: dict | None = None) -> dict:
    require_faculty(user)
    payload = body or {}
    kind = str(payload.get("kind") or "content")
    item = payload.get("item")
    if not item:
        row = AiTrace(
            institution_id=user.institution_id,
            user_id=user.id,
            feature=f"ai_studio:{kind}",
            request=json.dumps({"kind": kind, "item": None}),
            response_meta=json.dumps({"reason": "no generated item"}),
            status="FAILED",
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return {"ok": False, "status": "FAILED", "historyEntry": None}
    row = AiTrace(
        institution_id=user.institution_id,
        user_id=user.id,
        feature=f"ai_studio:{kind}",
        request=json.dumps({"kind": kind, "item": item}),
        response_meta=json.dumps({"saved": True}),
        status="COMPLETED",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    entry = {
        "id": row.id,
        "kind": kind,
        "item": item,
        "savedAt": iso(row.created_at),
        "status": "COMPLETED",
        "source": "sql",
    }
    return {"ok": True, "status": "COMPLETED", "historyEntry": entry}


def student_360(db: Session, user: User, student_id: str) -> dict:
    directory = faculty_students_directory(db, user.institution_id)
    student = next((s for s in directory.get("students") or [] if s["id"] == student_id), None)
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
    target = db.get(StudentProfile, student_id)
    if not target or target.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")
    from app.services.spa_exams import attempt_to_dict

    rows = (
        db.query(ExamAttempt)
        .filter(
            ExamAttempt.student_id == student_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.institution_id == user.institution_id,
            ExamAttempt.is_deleted.is_(False),
        )
        .order_by(ExamAttempt.submitted_at.desc())
        .all()
    )

    from app.services.exam_family import normalize_exam_family
    target_family = normalize_exam_family(student.get("examFamily"))
    if target_family:
        filtered_rows = []
        for r in rows:
            mode = (r.exam_mode or "university").lower()
            if mode == "competitive":
                r_fam = normalize_exam_family(r.exam_family)
                if not r_fam and r.exam_name:
                    if "NEET" in r.exam_name.upper():
                        r_fam = "NEET"
                    elif "JEE" in r.exam_name.upper():
                        r_fam = "JEE"
                if target_family == "NEET" and r_fam == "JEE":
                    continue
                if target_family == "JEE" and r_fam == "NEET":
                    continue
            filtered_rows.append(r)
        rows = filtered_rows

    def _enrich(a: dict) -> dict:
        """Flatten nested scoring/summary/timing into the top-level attempt dict
        so ExamHistoryTable can render date, score, accuracy, attemptRate,
        timeEfficiency directly without a client-side engine pass."""
        sc = a.get("scoring") or {}
        sm = a.get("summary") or {}
        tm = a.get("timing") or {}
        a["date"] = (a.get("submittedAt") or a.get("completedAt") or "").split("T")[0] or None
        a["score"] = sc.get("score") if sc.get("score") is not None else sm.get("score")
        a["maxScore"] = sc.get("maxScore") if sc.get("maxScore") is not None else sm.get("maxScore")
        a["accuracy"] = sc.get("accuracy") if sc.get("accuracy") is not None else sm.get("accuracy")
        att_rate = sc.get("attemptRate") if sc.get("attemptRate") is not None else sm.get("attemptRate")
        if att_rate is None:
            tot = sc.get("total") or sm.get("total") or 0
            cor = sc.get("correct") if sc.get("correct") is not None else sm.get("correct")
            inc = sc.get("incorrect") if sc.get("incorrect") is not None else sm.get("incorrect")
            if tot > 0 and cor is not None and inc is not None:
                att_rate = round(((cor + inc) / tot) * 100, 2)
        a["attemptRate"] = att_rate

        time_eff = sc.get("timeEfficiency") if sc.get("timeEfficiency") is not None else sm.get("timeEfficiency")
        if time_eff is None:
            elapsed = tm.get("elapsedSeconds") or a.get("elapsedSeconds") or 0
            cor = sc.get("correct") if sc.get("correct") is not None else sm.get("correct")
            inc = sc.get("incorrect") if sc.get("incorrect") is not None else sm.get("incorrect")
            attempted = (cor or 0) + (inc or 0)
            if elapsed > 0 and attempted > 0:
                pace = elapsed / attempted
                target_pace = 120.0
                ratio = pace / target_pace
                time_eff = round(max(15.0, min(100.0, 100.0 - max(0.0, ratio - 1.0) * 40.0)), 1)
            elif tm.get("timeUsagePct"):
                time_eff = round(min(100.0, tm.get("timeUsagePct") * 1.1), 1)
        a["timeEfficiency"] = time_eff

        a["pct"] = sc.get("pct") if sc.get("pct") is not None else sm.get("pct")
        return a

    attempts = [_enrich(attempt_to_dict(r, db)) for r in rows]
    from app.services.student_360_metrics import analyze_student_360, repair_question_attempts
    from app.services.intelligence_rules import UNIVERSITY_DOMAIN

    repair_question_attempts(db, attempts)
    analysis = analyze_student_360(attempts)
    domain_counts = {
        domain: pack["overviewAll"]["examsCompleted"]
        for domain, pack in analysis["byDomain"].items()
    }
    uni_count = domain_counts.get(UNIVERSITY_DOMAIN, 0)
    jee_count = domain_counts.get("JEE", 0)
    neet_count = domain_counts.get("NEET", 0)
    enrolled_family = student.get("examFamily")
    if enrolled_family in analysis["byDomain"]:
        default_domain = enrolled_family
    else:
        default_domain = max(domain_counts, key=lambda domain: (domain_counts[domain], domain != UNIVERSITY_DOMAIN))
        if not domain_counts[default_domain]:
            default_domain = UNIVERSITY_DOMAIN
    latest = attempts[0] if attempts else None
    batch = next((b for b in directory.get("batches") or [] if b.get("id") == student.get("batchId")), None)
    if batch is None:
        batch = {
            "id": student.get("batchId"),
            "name": student.get("batchName"),
            "domain": student.get("domain"),
            "examFamily": student.get("examFamily"),
            "academicSession": student.get("academicSession"),
            "program": student.get("program"),
            "examLabel": student.get("examFamily") or student.get("domain"),
        }

    pack = analysis["byDomain"][default_domain]

    return {
        "student": student,
        "batch": batch,
        "attempts": attempts,
        "status": pack["status"] or student.get("status") or "No exams",
        "derived": {
            "examsCompleted": pack["overview"]["examsCompleted"],
            "accuracy": pack["overview"]["latestAccuracy"],
            "status": pack["status"],
            "latest": latest,
        },
        "attention": pack["attention"],
        "attentionReason": pack["attentionReason"],
        "dnaEvidence": None,
        "overview": pack["overview"],
        "aiSummary": pack["aiSummary"],
        "byDomain": analysis["byDomain"],
        "strengthsWeaknesses": {
            **analysis["strengthsWeaknesses"],
            "topStrengths": pack["topStrengths"],
            "topWeaknesses": pack["topWeaknesses"],
        },
        "subjects": analysis["subjects"],
        "chapters": analysis["chapters"],
        "question": {"rows": analysis["questionRows"], "time": {}, "behaviour": {}, "errors": [], "errorTotal": 0},
        "comparison": None,
        "defaultDomain": default_domain,
        "uniCount": uni_count,
        "jeeCount": jee_count,
        "neetCount": neet_count,
        "compCount": jee_count + neet_count,
    }


def create_assignment(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    title = str((body or {}).get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Assignment title is required.")
    course_id = (body or {}).get("courseId") or (body or {}).get("course_id")
    if course_id:
        course = db.get(Course, course_id)
        if not course or course.institution_id != user.institution_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    due_raw = (body or {}).get("dueAt") or (body or {}).get("due")
    due_at = None
    if due_raw:
        try:
            due_at = datetime.fromisoformat(str(due_raw).replace("Z", "+00:00"))
        except ValueError:
            due_at = None
    max_marks = (body or {}).get("maxMarks") or (body or {}).get("maxScore") or 100
    requested_status = str((body or {}).get("status") or "").lower()
    publish = (body or {}).get("publish")
    if requested_status == "draft" or publish is False:
        status_value = "draft"
        published_at = None
    else:
        status_value = "published"
        published_at = utcnow()
    row = Assignment(
        institution_id=user.institution_id,
        course_id=course_id,
        faculty_id=user.id,
        title=title,
        body=(body or {}).get("body") or (body or {}).get("description"),
        due_at=due_at,
        max_marks=float(max_marks) if max_marks is not None else None,
        status=status_value,
        published_at=published_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    items = faculty_assignments(db, user.institution_id)
    created = next((item for item in items if item["id"] == row.id), None)
    invalidate_faculty_intelligence_cache(user.institution_id, user.id)
    return {"ok": True, "assignment": created or {"id": row.id, "title": row.title}}


def grade_assignment(db: Session, user: User, assignment_id: str, body: dict) -> dict:
    require_faculty(user)
    assignment = db.get(Assignment, assignment_id)
    if not assignment or assignment.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if assignment.faculty_id and assignment.faculty_id != user.id and user.primary_role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot grade another faculty member's assignment")
    student_id = (body or {}).get("studentId")
    if not student_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "studentId is required")
    student = db.get(StudentProfile, student_id)
    if not student or student.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found")
    sub = db.scalars(
        select(AssignmentSubmission).where(
            AssignmentSubmission.assignment_id == assignment.id,
            AssignmentSubmission.student_id == student_id,
        )
    ).first()
    if sub is None:
        sub = AssignmentSubmission(assignment_id=assignment.id, student_id=student_id, status="graded")
        db.add(sub)
    marks = (body or {}).get("marks")
    if marks is not None:
        sub.marks = float(marks)
    sub.feedback = (body or {}).get("feedback") or sub.feedback
    sub.status = "graded"
    sub.graded_by = user.id
    sub.graded_at = utcnow()
    db.commit()
    db.refresh(sub)
    invalidate_faculty_intelligence_cache(user.institution_id, user.id)
    return {
        "ok": True,
        "submission": {
            "id": sub.id,
            "assignmentId": assignment.id,
            "studentId": student_id,
            "marks": sub.marks,
            "feedback": sub.feedback,
            "status": "Graded",
        },
    }


def mark_attendance(db: Session, user: User, session_id: str, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    session = db.get(AttendanceSession, session_id)
    if not session:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attendance session not found")
    course = db.get(Course, session.course_id)
    if not course or course.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")
    records = (body or {}).get("records") or []
    saved = 0
    for row in records:
        student_id = row.get("studentId") or row.get("id")
        if not student_id:
            continue
        student = db.get(StudentProfile, student_id)
        if not student or student.institution_id != user.institution_id:
            continue
        mark = str(row.get("mark") or ("present" if row.get("present", True) else "absent")).lower()
        if mark not in {"present", "absent", "leave"}:
            mark = "absent"
        existing = db.scalars(
            select(AttendanceRecord).where(
                AttendanceRecord.session_id == session.id,
                AttendanceRecord.student_id == student_id,
            )
        ).first()
        if existing is None:
            db.add(AttendanceRecord(session_id=session.id, student_id=student_id, mark=mark))
        else:
            existing.mark = mark
        saved += 1
    session.marked_by = user.id
    db.commit()
    invalidate_faculty_intelligence_cache(user.institution_id, user.id)
    return {"ok": True, "sessionId": session.id, "saved": saved}


def create_attendance_session(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    course_id = (body or {}).get("courseId")
    course = db.get(Course, course_id) if course_id else None
    if not course or course.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
    raw_date = (body or {}).get("date") or utcnow().date().isoformat()
    try:
        session_date = date.fromisoformat(str(raw_date)[:10])
    except ValueError:
        session_date = utcnow().date()
    session = AttendanceSession(
        course_id=course.id,
        batch_id=(body or {}).get("batchId"),
        marked_by=user.id,
        session_date=session_date,
        topic=(body or {}).get("topic") or "Class session",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"ok": True, "session": {"id": session.id, "courseId": course.id, "date": session.session_date.isoformat(), "topic": session.topic}}


def list_content_sources(db: Session, user: User) -> list[dict]:
    if not user.institution_id:
        return []
    rows = db.scalars(
        select(ContentSource).where(ContentSource.institution_id == user.institution_id).order_by(ContentSource.created_at.desc())
    ).all()
    items = []
    for row in rows:
        analysis = parse_json(row.analysis, {})
        mode = normalize_exam_mode(row.exam_mode) or "university"
        family = normalize_exam_family(row.exam_family, mode=mode)
        items.append(
            {
                "sourceId": row.id,
                "id": row.id,
                "title": row.title,
                "shortTitle": row.title,
                "sourceType": "PDF",
                "domain": title_domain(mode),
                "exam": title_family(family),
                "examFamily": title_family(family),
                "examMode": title_domain(mode),
                "subject": None,
                "chapter": None,
                "pageCount": row.page_count,
                "featured": False,
                "sourceLabel": row.title,
                "questionCountGenerated": 0,
                "approvedQuestionCount": 0,
                "analysisStatus": (
                    "Analyzed" if (row.analysis_status or "").upper() == "ANALYZED" or analysis else
                    ("Failed" if (row.analysis_status or "").upper() == "FAILED" else "Pending")
                ),
                "generationStatus": (row.analysis_status or "PENDING").upper(),
                "analysisError": row.analysis_error,
                "uploadedAt": iso(row.created_at),
                "lastAnalyzedAt": iso(row.updated_at) if analysis else None,
                "topics": analysis.get("topics") or [],
                "analysis": analysis or None,
            }
        )
    return items


def upload_content_source(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    mode = normalize_exam_mode((body or {}).get("domain") or (body or {}).get("examMode")) or "university"
    family = normalize_exam_family((body or {}).get("examFamily") or (body or {}).get("exam"), mode=mode)
    row = ContentSource(
        institution_id=user.institution_id,
        title=str((body or {}).get("name") or (body or {}).get("title") or "Uploaded source"),
        exam_mode=mode,
        exam_family=family,
        object_key=(body or {}).get("objectKey"),
        page_count=(body or {}).get("pageCount"),
        analysis=None,
        extracted_text=(body or {}).get("extractedText") or (body or {}).get("text"),
        analysis_status="PENDING",
        created_by=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    sources = list_content_sources(db, user)
    created = next((item for item in sources if item.get("id") == row.id or item.get("sourceId") == row.id), None)
    return {"ok": True, "source": created or {"sourceId": row.id, "id": row.id, "title": row.title, "analysisStatus": "Pending"}}


def analyze_content_source(db: Session, user: User, source_id: str) -> dict:
    row = db.get(ContentSource, source_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found.")
    analysis = parse_json(row.analysis, {})
    if not analysis:
        analysis = {"status": "Pending", "topics": [], "note": "BACKEND GAP — content intelligence is not computed yet."}
        return {"ok": False, "sourceId": source_id, "analysis": analysis, "gap": "BACKEND GAP — source analysis is not implemented.", "source": {"sourceId": row.id, "title": row.title, "analysisStatus": "Pending"}}
    return {"ok": True, "sourceId": source_id, "analysis": analysis, "source": {"sourceId": row.id, "title": row.title, "analysisStatus": "Analyzed", "analysis": analysis}}


def generate_studio_session(db: Session, user: User, body: dict) -> dict:
    """Persist generated questions via the existing generation spine — never mint fake KV stems."""
    from app.services.question_generation import create_generation, get_generation_questions

    require_faculty(user)
    source_id = (body or {}).get("sourceId")
    settings = (body or {}).get("settings") or {}
    source = db.get(ContentSource, source_id) if source_id else None
    if source_id and (source is None or source.institution_id != user.institution_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found.")
    payload = {
        **settings,
        "domain": settings.get("domain") or (source.exam_mode if source else "University"),
        "examFamily": settings.get("examFamily") or (source.exam_family if source else None),
        "questionCount": settings.get("count") or settings.get("questionCount") or 8,
        "subject": settings.get("subject"),
        "chapter": settings.get("chapter"),
        "difficulty": settings.get("difficulty") or "Medium",
        "questionTypes": [settings.get("qType") or "MCQ"],
        "bloomPreset": settings.get("bloomsLevel") or settings.get("bloom"),
    }
    generated = create_generation(db, user, payload)
    questions = get_generation_questions(db, user, generated["generationId"]).get("questions") or []
    ensure_faculty_profile(db, user)
    session = QuestionStudioSession(
        institution_id=user.institution_id,
        faculty_id=user.id,
        source_id=source.id if source else None,
        settings=json.dumps({**settings, "generationId": generated["generationId"]}),
        status="open",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {
        "ok": True,
        "session": {
            "studioSessionId": session.id,
            "sourceId": source_id,
            "settings": settings,
            "status": generated.get("status") or "open",
            "generationId": generated["generationId"],
            "questions": questions,
            "createdAt": iso(session.created_at),
            "title": source.title if source else "Studio session",
        },
    }


def studio_sessions(db: Session, user: User) -> list[dict]:
    from app.services.studio_lifecycle import serialize_session

    rows = db.scalars(
        select(QuestionStudioSession).where(
            QuestionStudioSession.institution_id == user.institution_id,
            QuestionStudioSession.faculty_id == user.id,
        )
    ).all()
    return [serialize_session(db, user, row) for row in rows]


def approve_studio_question(db: Session, user: User, question_id: str) -> dict:
    question = db.get(Question, question_id)
    if not question or question.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")
    question.status = "approved"
    db.commit()
    db.refresh(question)
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    return {"ok": True, "approved": True, "question": serialize_question_faculty(question, subjects, chapters, topics)}


def weak_topic_questions(db: Session, user: User, *, subject: str | None, chapter: str | None) -> dict:
    bank = list_question_bank(db, user, subject=subject, chapter=chapter, limit=6)
    items = []
    for q in bank.get("questions") or []:
        items.append(
            {
                "id": q.get("id"),
                "text": q.get("text") or q.get("question"),
                "subject": q.get("subject"),
                "chapter": q.get("chapter"),
                "topic": q.get("topic"),
                "difficulty": q.get("difficulty"),
                "type": q.get("type"),
                "status": q.get("status"),
            }
        )
        if len(items) >= 6:
            break
    return {"items": items, "count": len(items), "subject": subject, "chapter": chapter}


def faculty_practice_questions(db: Session, user: User, *, subject: str | None, chapter: str | None, count: int = 8) -> list[dict]:
    return practice_questions_from_bank(db, user, subject=subject, chapter=chapter, count=count)
