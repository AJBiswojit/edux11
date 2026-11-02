"""Seed academic / assessment / ops rows from the SPA mock datasets."""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import ContentSource, Paper, PaperQuestion, Question
from app.models.catalog import AcademicTerm, CalendarEvent, Campus, Chapter, Course, Department, Program, Subject, Topic
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import Institution, User
from app.models.ops import SupportTicket
from app.models.people import Enrollment, StudentProfile
from app.models.teaching import Announcement, Assignment, AssignmentSubmission, AttendanceRecord, AttendanceSession
from app.services.demo_catalog import DEMO_INSTITUTION_ID

REPO_ROOT = Path(__file__).resolve().parents[3]
MOCK = REPO_ROOT / "frontend" / "src" / "mock-data"
INTEL = REPO_ROOT / "frontend" / "src" / "intelligence"

FACULTY_BY_NAME = {
    "Dr. Meera Krishnan": "u_fac_001",
    "Prof. Vikram Rao": "u_fac_002",
    "Dr. Priya Nair": "u_fac_003",
    "Dr. Arvind Kulkarni": "u_fac_004",
    "Prof. Sunita Bose": "u_fac_005",
    "Dr. Farhan Ali": "u_fac_006",
    "Dr. Ritu Agarwal": "u_fac_007",
    "Prof. Aditi Sen": "u_fac_009",
}

COURSES = [
    {"id": "CS501", "code": "CS501", "name": "Data Structures & Algorithms", "credits": 4, "semester": 5, "faculty": "Dr. Meera Krishnan", "exam_mode": "university"},
    {"id": "CS502", "code": "CS502", "name": "Database Management Systems", "credits": 3, "semester": 5, "faculty": "Dr. Arvind Kulkarni", "exam_mode": "university"},
    {"id": "CS503", "code": "CS503", "name": "Operating Systems", "credits": 4, "semester": 5, "faculty": "Dr. Meera Krishnan", "exam_mode": "university"},
    {"id": "CS504", "code": "CS504", "name": "Computer Networks", "credits": 3, "semester": 5, "faculty": "Prof. Vikram Rao", "exam_mode": "university"},
    {"id": "CS505", "code": "CS505", "name": "Machine Learning", "credits": 4, "semester": 5, "faculty": "Dr. Priya Nair", "exam_mode": "university"},
    {"id": "CS506", "code": "CS506", "name": "Theory of Computation", "credits": 3, "semester": 5, "faculty": "Dr. Arvind Kulkarni", "exam_mode": "university"},
    {"id": "EC301", "code": "EC301", "name": "Signals & Systems", "credits": 3, "semester": 5, "faculty": "Prof. Vikram Rao", "exam_mode": "university"},
    {"id": "ME201", "code": "ME201", "name": "Thermodynamics", "credits": 4, "semester": 3, "faculty": "Prof. Sunita Bose", "exam_mode": "university"},
    {"id": "MBA401", "code": "MBA401", "name": "Strategic Management", "credits": 3, "semester": 4, "faculty": "Dr. Ritu Agarwal", "exam_mode": "university"},
    {"id": "CS601", "code": "CS601", "name": "Compiler Design", "credits": 4, "semester": 6, "faculty": "Dr. Arvind Kulkarni", "exam_mode": "university"},
    {"id": "EE401", "code": "EE401", "name": "Power Systems", "credits": 4, "semester": 5, "faculty": "Dr. Farhan Ali", "exam_mode": "university"},
    {"id": "DES201", "code": "DES201", "name": "Design Thinking Studio", "credits": 3, "semester": 3, "faculty": "Prof. Aditi Sen", "exam_mode": "university"},
]

PROGRAMS = [
    {"id": "prog_btech_cse", "code": "BTECH-CSE", "name": "B.Tech — Computer Science", "dept": "CSE", "years": 4},
    {"id": "prog_btech_ece", "code": "BTECH-ECE", "name": "B.Tech — Electronics & Communication", "dept": "ECE", "years": 4},
    {"id": "prog_btech_me", "code": "BTECH-ME", "name": "B.Tech — Mechanical", "dept": "ME", "years": 4},
    {"id": "prog_btech_ee", "code": "BTECH-EE", "name": "B.Tech — Electrical", "dept": "EE", "years": 4},
    {"id": "prog_mba", "code": "MBA-GM", "name": "MBA — General Management", "dept": "MBA", "years": 2},
    {"id": "prog_bdes", "code": "BDES", "name": "B.Des — Design & Media", "dept": "DES", "years": 4},
    {"id": "prog_btech_ce", "code": "BTECH-CE", "name": "B.Tech — Civil", "dept": "CE", "years": 4},
    {"id": "prog_msc_ds", "code": "MSC-DS", "name": "M.Sc — Data Science", "dept": "MATH", "years": 2},
]

ASSIGNMENTS = [
    {"id": "as1", "course": "CS501", "title": "DSA Assignment 4 — Graph Algorithms", "due": "2026-08-06T23:59:00+00:00", "max": 20, "body": "Implement Dijkstra, Bellman-Ford and Floyd-Warshall.", "status": "pending", "progress": 40},
    {"id": "as2", "course": "CS505", "title": "ML Mini-Project — Sentiment Analysis", "due": "2026-08-11T23:59:00+00:00", "max": 50, "body": "Build a sentiment classifier; compare logistic regression vs BERT-tiny.", "status": "pending", "progress": 25},
    {"id": "as3", "course": "CS502", "title": "DBMS Quiz 3 — Transactions & Concurrency", "due": "2026-08-14T18:00:00+00:00", "max": 10, "body": "ACID, isolation levels, 2PL.", "status": "pending", "progress": 0},
    {"id": "as4", "course": "CS503", "title": "OS Assignment 3 — CPU Scheduling", "due": "2026-07-30T23:59:00+00:00", "max": 20, "body": "CPU scheduling Gantt charts.", "status": "graded", "score": 17, "feedback": "Excellent analysis of starvation in SJF."},
    {"id": "as5", "course": "CS504", "title": "CN Lab Record 5 — Socket Programming", "due": "2026-07-28T23:59:00+00:00", "max": 20, "body": "TCP chat implementation.", "status": "graded", "score": 18, "feedback": "Clean TCP chat implementation."},
    {"id": "as6", "course": "CS501", "title": "DSA Quiz 2 — Trees", "due": "2026-07-27T18:00:00+00:00", "max": 10, "body": "AVL and BST.", "status": "graded", "score": 9.5, "feedback": "Top 8% of class."},
    {"id": "as7", "course": "CS506", "title": "ToC Problem Set 2 — Regular Languages", "due": "2026-07-24T23:59:00+00:00", "max": 20, "body": "Pumping lemma.", "status": "graded", "score": 15, "feedback": "Pumping lemma proofs need more rigour."},
    {"id": "as8", "course": "CS505", "title": "ML Quiz 1 — Regression", "due": "2026-07-20T18:00:00+00:00", "max": 10, "body": "Gradient descent.", "status": "graded", "score": 8.5, "feedback": "Solid."},
]

TICKETS = [
    {"id": "st1", "title": "Cannot upload assignment file — 403 error", "status": "resolved", "body": "Technical"},
    {"id": "st2", "title": "Attendance record correction — Jul 30, Networks", "status": "pending", "body": "Records"},
    {"id": "st3", "title": "How do I export my certificate PDF?", "status": "resolved", "body": "How-to"},
    {"id": "st4", "title": "AI tutor response in Hindi not rendering properly", "status": "open", "body": "Technical"},
]

CALENDAR = [
    {"id": "ac1", "date": "2026-08-06", "title": "DSA Assignment 4 due", "kind": "deadline"},
    {"id": "ac2", "date": "2026-08-08", "title": "Smart Campus Hackathon", "kind": "event"},
    {"id": "ac3", "date": "2026-08-14", "title": "DBMS Quiz 3", "kind": "exam"},
    {"id": "ac4", "date": "2026-08-15", "title": "Midsem timetable release", "kind": "academic"},
    {"id": "ac6", "date": "2026-08-18", "title": "Microsoft placement drive", "kind": "placement"},
    {"id": "ac7", "date": "2026-08-19", "title": "Midsem examinations begin", "kind": "exam"},
    {"id": "ac8", "date": "2026-08-23", "title": "Midsem examinations end", "kind": "exam"},
    {"id": "ac9", "date": "2026-08-24", "title": "Parent–Teacher Meeting", "kind": "event"},
    {"id": "ac12", "date": "2026-09-15", "title": "Fee — 2nd installment due", "kind": "finance"},
]

ANNOUNCEMENTS = [
    {"id": "ann1", "title": "Midsem timetable released", "body": "Semester 5 midsems run 19–23 Aug 2026."},
    {"id": "ann2", "title": "DSA Assignment 4 due 6 Aug", "body": "Graph algorithms problem set — submit on the portal."},
    {"id": "ann3", "title": "ML mini-project checkpoint", "body": "Sentiment analysis baseline due 11 Aug."},
]

ATTENDANCE_SESSIONS = [
    {"id": "att_cs501_20260801", "course": "CS501", "batch": "batch_uni_cse_a", "date": "2026-08-01", "topic": "Network flows", "present": 16},
    {"id": "att_cs503_20260731", "course": "CS503", "batch": "batch_uni_cse_b", "date": "2026-07-31", "topic": "Deadlocks", "present": 15},
    {"id": "att_cs501_20260730", "course": "CS501", "batch": "batch_uni_cse_a", "date": "2026-07-30", "topic": "Bellman-Ford", "present": 17},
    {"id": "att_cs503_20260728", "course": "CS503", "batch": "batch_uni_cse_b", "date": "2026-07-28", "topic": "Synchronisation", "present": 14},
]

Q_RE = re.compile(
    r"q\(\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*\[(.*?)\],\s*(\d+)\s*\)",
    re.S,
)


def _parse_options(raw: str) -> list[str]:
    return [p.strip().strip("'").replace("\\'", "'") for p in re.findall(r"'((?:\\'|[^'])*)'", raw)]


def parse_exam_agent() -> list[dict]:
    path = MOCK / "exam-agent.js"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    exams: list[dict] = []
    for m in re.finditer(
        r"id:\s*'(EA-[^']+)'\s*,\s*type:\s*'([^']+)'\s*,\s*category:\s*'([^']+)'\s*,\s*title:\s*'((?:\\'|[^'])*)'",
        text,
    ):
        exam_id, exam_type, category, title = m.group(1), m.group(2), m.group(3), m.group(4).replace("\\'", "'")
        chunk = text[m.start() : m.start() + 12000]
        dur = re.search(r"durationMinutes:\s*(\d+)", chunk)
        subj = re.search(r"subjectCode:\s*'([^']*)'", chunk)
        subject = re.search(r"\n\s*subject:\s*'((?:\\'|[^'])*)'", chunk)
        marks = re.search(r"marksPerQuestion:\s*([\d.]+)", chunk)
        neg = re.search(r"negativeMarksPerQuestion:\s*([\d.]+)", chunk)
        qblock = chunk
        questions = []
        for qm in Q_RE.finditer(qblock):
            questions.append(
                {
                    "subject": qm.group(1).replace("\\'", "'"),
                    "chapter": qm.group(2).replace("\\'", "'"),
                    "topic": qm.group(3).replace("\\'", "'"),
                    "difficulty": qm.group(4),
                    "stem": qm.group(5).replace("\\'", "'"),
                    "options": _parse_options(qm.group(6)),
                    "correct": int(qm.group(7)),
                }
            )
            if exam_type == "University" and len(questions) >= 12:
                break
            if exam_type != "University" and len(questions) >= 15:
                break
        exams.append(
            {
                "id": exam_id,
                "type": exam_type,
                "category": category,
                "title": title,
                "duration": int(dur.group(1)) if dur else 40,
                "subject_code": (subj.group(1) if subj else None) or None,
                "subject": subject.group(1).replace("\\'", "'") if subject else None,
                "marks": float(marks.group(1)) if marks else 1,
                "negative": float(neg.group(1)) if neg else 0,
                "questions": questions,
            }
        )
    return exams


def parse_studio_sources() -> list[dict]:
    path = INTEL / "faculty" / "datasets" / "question-studio-sources.js"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r"sourceId:\s*'([^']+)'", text):
        chunk = text[m.start() : m.start() + 2500]
        title = re.search(r"title:\s*'((?:\\'|[^'])*)'", chunk)
        domain = re.search(r"domain:\s*'([^']+)'", chunk)
        exam = re.search(r"exam:\s*'((?:\\'|[^'])*)'", chunk)
        subject = re.search(r"subject:\s*'((?:\\'|[^'])*)'", chunk)
        pages = re.search(r"pageCount:\s*(\d+)", chunk)
        out.append(
            {
                "id": m.group(1),
                "title": title.group(1).replace("\\'", "'") if title else m.group(1),
                "domain": domain.group(1) if domain else "University",
                "exam": exam.group(1).replace("\\'", "'") if exam else "",
                "subject": subject.group(1).replace("\\'", "'") if subject else "",
                "pages": int(pages.group(1)) if pages else 0,
            }
        )
    return out


def parse_seed_attempts() -> list[dict]:
    path = MOCK / "exam-attempt-seeds.js"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    out = []
    for m in re.finditer(
        r"id:\s*'(seed-ea-[^']+)'\s*,\s*examId:\s*'([^']+)'[\s\S]{0,250}?submittedAt:\s*'([^']+)'\s*,\s*startedAt:\s*'([^']+)'[\s\S]{0,400}?spec:\s*\[([^\]]+)\]",
        text,
    ):
        spec = [s.strip().strip("'") for s in m.group(5).split(",") if s.strip()]
        correct = sum(1 for s in spec if s.startswith("c"))
        n = len(spec) or 1
        out.append(
            {
                "id": m.group(1),
                "exam_id": m.group(2),
                "submitted": m.group(3),
                "started": m.group(4),
                "spec": spec,
                "accuracy": round(100 * correct / n, 1),
                "correct": correct,
                "n": n,
            }
        )
    return out


def seed_academic(db: Session) -> dict:
    inst = db.get(Institution, DEMO_INSTITUTION_ID)
    if inst is None:
        return {"skipped": True}

    # Fast-path: if courses and papers are already seeded, skip all the
    # expensive per-row existence checks against the remote database.
    # First boot is unaffected.
    _existing_courses = db.scalar(
        select(func.count()).select_from(Course)
        .where(Course.institution_id == DEMO_INSTITUTION_ID)
    ) or 0
    _existing_papers = db.scalar(
        select(func.count()).select_from(Paper)
        .where(Paper.institution_id == DEMO_INSTITUTION_ID)
    ) or 0
    if _existing_courses >= len(COURSES) and _existing_papers > 0:
        return {
            "skipped": True,
            "already_seeded": True,
            "courses": _existing_courses,
            "papers": _existing_papers,
        }

    settings = json.loads(inst.settings_json or "{}")
    settings["registrationOptions"] = {
        "note": "ported from frontend/src/mock-data/registration.js",
        "degrees": [
            "B.Tech — Computer Science",
            "B.Tech — Electronics & Communication",
            "B.Tech — Mechanical",
            "B.Tech — Civil",
            "B.Tech — Electrical",
            "MBA",
            "B.Des — Design & Media",
        ],
        "targetExams": ["JEE Main", "NEET UG", "GATE", "CAT"],
    }
    inst.settings_json = json.dumps(settings)

    if db.get(Campus, "campus_pune") is None:
        db.add(Campus(id="campus_pune", institution_id=DEMO_INSTITUTION_ID, name="Pune Campus", city="Pune", student_count=126))

    term = db.get(AcademicTerm, "term_2026_sem5")
    if term is None:
        term = AcademicTerm(id="term_2026_sem5", institution_id=DEMO_INSTITUTION_ID, name="Semester 5", academic_year="2026–27", is_current=True)
        db.add(term)
        db.flush()

    depts = {d.code: d for d in db.scalars(select(Department).where(Department.institution_id == DEMO_INSTITUTION_ID)).all()}
    for row in PROGRAMS:
        if db.get(Program, row["id"]) is None:
            dept = depts.get(row["dept"])
            db.add(
                Program(
                    id=row["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    department_id=dept.id if dept else None,
                    code=row["code"],
                    name=row["name"],
                    degree_type=row["name"].split("—")[0].strip(),
                    duration_years=row["years"],
                )
            )
    db.flush()

    subjects: dict[str, Subject] = {}
    dept_for_course = {
        "CS": "CSE",
        "EC": "ECE",
        "ME": "ME",
        "EE": "EE",
        "MB": "MBA",
        "DE": "DES",
    }
    for row in COURSES:
        sub = db.get(Subject, row["id"]) or db.scalars(
            select(Subject).where(Subject.institution_id == DEMO_INSTITUTION_ID, Subject.code == row["code"])
        ).first()
        if sub is None:
            prefix = row["code"][:2]
            dcode = "MBA" if row["code"].startswith("MBA") else "DES" if row["code"].startswith("DES") else dept_for_course.get(prefix, "CSE")
            sub = Subject(
                id=row["id"],
                institution_id=DEMO_INSTITUTION_ID,
                department_id=depts[dcode].id if dcode in depts else depts["CSE"].id,
                code=row["code"],
                name=row["name"],
                exam_mode=row["exam_mode"],
            )
            db.add(sub)
            db.flush()
        subjects[row["code"]] = sub
        if db.get(Course, row["id"]) is None:
            db.add(
                Course(
                    id=row["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    program_id="prog_btech_cse" if row["code"].startswith("CS") else None,
                    subject_id=sub.id,
                    code=row["code"],
                    name=row["name"],
                    credits=row["credits"],
                    semester_no=row["semester"],
                )
            )
    db.flush()

    aarav = db.get(StudentProfile, "u_stu_001")
    if aarav is None:
        aarav_user = db.scalars(select(User).where(User.email == "aarav.sharma@medixoedux.edu")).first()
        if aarav_user is not None:
            aarav = db.get(StudentProfile, aarav_user.id)
    aarav_id = aarav.user_id if aarav else None
    if aarav:
        extra = json.loads(aarav.extra or "{}")
        extra["attendance"] = 92.4
        extra["attendanceDetail"] = {
            "overall": 92.4,
            "required": 75,
            "totalClasses": 300,
            "classesAttended": 277,
        }
        aarav.extra = json.dumps(extra)
        for code in ("CS501", "CS502", "CS503", "CS504", "CS505", "CS506"):
            exists = db.scalars(select(Enrollment).where(Enrollment.student_id == aarav_id, Enrollment.course_id == code)).first()
            if exists is None:
                db.add(Enrollment(id=f"enr_aarav_{code}", student_id=aarav_id, course_id=code, term_id=term.id, status="active"))

    for row in ASSIGNMENTS:
        if db.get(Assignment, row["id"]) is None:
            due = datetime.fromisoformat(row["due"])
            db.add(
                Assignment(
                    id=row["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    course_id=row["course"],
                    faculty_id=FACULTY_BY_NAME.get(next((c["faculty"] for c in COURSES if c["code"] == row["course"]), ""), "u_fac_001"),
                    title=row["title"],
                    body=row["body"],
                    due_at=due,
                    max_marks=row["max"],
                )
            )
            db.flush()
        if aarav:
            sub = db.scalars(select(AssignmentSubmission).where(AssignmentSubmission.assignment_id == row["id"], AssignmentSubmission.student_id == aarav_id)).first()
            if sub is None:
                db.add(
                    AssignmentSubmission(
                        id=f"sub_{row['id']}",
                        assignment_id=row["id"],
                        student_id=aarav_id,
                        status=row.get("status") or "pending",
                        marks=row.get("score"),
                        feedback=row.get("feedback"),
                        submitted_at=datetime.now(timezone.utc) if row.get("status") == "graded" else None,
                    )
                )

    students_by_batch: dict[str, list[StudentProfile]] = {}
    for profile in db.scalars(select(StudentProfile).where(StudentProfile.institution_id == DEMO_INSTITUTION_ID)).all():
        if profile.batch_id:
            students_by_batch.setdefault(profile.batch_id, []).append(profile)
    for row in ATTENDANCE_SESSIONS:
        session = db.get(AttendanceSession, row["id"])
        if session is None:
            session = AttendanceSession(
                id=row["id"],
                course_id=row["course"],
                batch_id=row["batch"],
                marked_by=FACULTY_BY_NAME.get("Dr. Meera Krishnan"),
                session_date=date.fromisoformat(row["date"]),
                topic=row["topic"],
            )
            db.add(session)
            db.flush()
        for index, profile in enumerate(sorted(students_by_batch.get(row["batch"], []), key=lambda item: item.roll_no)):
            existing = db.get(AttendanceRecord, {"session_id": session.id, "student_id": profile.user_id})
            if existing is None:
                db.add(AttendanceRecord(session_id=session.id, student_id=profile.user_id, mark="present" if index < row["present"] else "absent"))

    for row in TICKETS:
        if db.get(SupportTicket, row["id"]) is None and aarav_id:
            db.add(SupportTicket(id=row["id"], institution_id=DEMO_INSTITUTION_ID, requester_id=aarav_id, title=row["title"], body=row["body"], status=row["status"]))

    for row in CALENDAR:
        if db.get(CalendarEvent, row["id"]) is None:
            starts = datetime.fromisoformat(row["date"] + "T09:00:00+00:00")
            db.add(CalendarEvent(id=row["id"], institution_id=DEMO_INSTITUTION_ID, title=row["title"], kind=row["kind"], starts_at=starts, payload="{}"))

    for row in ANNOUNCEMENTS:
        if db.get(Announcement, row["id"]) is None:
            db.add(Announcement(id=row["id"], institution_id=DEMO_INSTITUTION_ID, author_id="u_fac_001", title=row["title"], body=row["body"]))

    chapter_ids: dict[tuple[str, str], str] = {}
    exams = parse_exam_agent()
    for exam in exams:
        mode = "university" if exam["type"] == "University" else "competitive"
        family = None
        if exam["type"] == "JEE":
            family = "jee"
        elif exam["type"] == "NEET":
            family = "neet"
        subj = subjects.get(exam["subject_code"] or "")
        if db.get(Paper, exam["id"]) is None:
            db.add(
                Paper(
                    id=exam["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    paper_code=exam["id"],
                    title=exam["title"],
                    exam_mode=mode,
                    exam_family=family,
                    subject_id=subj.id if subj else None,
                    course_id=exam["subject_code"] if exam["subject_code"] in subjects else None,
                    paper_type="practice",
                    duration_minutes=exam["duration"],
                    total_marks=exam["marks"] * max(len(exam["questions"]), 1),
                    negative_marking=exam["negative"] > 0,
                    blueprint=json.dumps({"source": "exam-agent.js", "type": exam["type"]}),
                    status="published",
                    created_by="u_fac_001",
                )
            )
            db.flush()
        for i, qq in enumerate(exam["questions"], start=1):
            qid = f"{exam['id']}-Q{i:02d}"
            ch_key = (exam["id"], qq["chapter"])
            if ch_key not in chapter_ids and subj:
                cid = f"ch_{exam['id']}_{i}"
                if db.get(Chapter, cid) is None:
                    db.add(Chapter(id=cid, subject_id=subj.id, course_id=exam["subject_code"], name=qq["chapter"], sort_order=i))
                    db.flush()
                chapter_ids[ch_key] = cid
                if db.get(Topic, f"tp_{cid}") is None:
                    db.add(Topic(id=f"tp_{cid}", chapter_id=cid, name=qq["topic"], sort_order=i))
            if db.get(Question, qid) is None:
                db.add(
                    Question(
                        id=qid,
                        institution_id=DEMO_INSTITUTION_ID,
                        exam_mode=mode,
                        exam_family=family,
                        subject_id=subj.id if subj else None,
                        chapter_id=chapter_ids.get(ch_key),
                        concept=qq["topic"],
                        stem=qq["stem"],
                        q_type="mcq",
                        options=json.dumps(qq["options"]),
                        correct_answer=str(qq["correct"]),
                        marks=exam["marks"],
                        negative_marks=exam["negative"],
                        difficulty=qq["difficulty"].lower(),
                        status="approved",
                        source="exam-agent",
                        created_by="u_fac_001",
                    )
                )
                db.flush()
            if db.get(PaperQuestion, {"paper_id": exam["id"], "question_id": qid}) is None:
                existing = db.scalars(select(PaperQuestion).where(PaperQuestion.paper_id == exam["id"], PaperQuestion.question_id == qid)).first()
                if existing is None:
                    db.add(PaperQuestion(paper_id=exam["id"], question_id=qid, sort_order=i, snapshot=json.dumps(qq)))

    for src in parse_studio_sources():
        if db.get(ContentSource, src["id"]) is None:
            mode = "competitive" if src["domain"] == "Competitive" else "university"
            family = "neet" if "NEET" in src["exam"] else ("jee" if "JEE" in src["exam"] else None)
            db.add(
                ContentSource(
                    id=src["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    title=src["title"],
                    exam_mode=mode,
                    exam_family=family,
                    page_count=src["pages"],
                    analysis=json.dumps({"exam": src["exam"], "subject": src["subject"], "source": "question-studio-sources.js"}),
                    created_by="u_fac_001",
                )
            )

    papers_by_id = {e["id"]: e for e in exams}
    for seed in parse_seed_attempts():
        if db.get(ExamAttempt, seed["id"]) is None:
            exam = papers_by_id.get(seed["exam_id"], {})
            mode = "university" if exam.get("type") == "University" else "competitive"
            family = "jee" if exam.get("type") == "JEE" else ("neet" if exam.get("type") == "NEET" else None)
            started = datetime.fromisoformat(seed["started"].replace("Z", "+00:00"))
            submitted = datetime.fromisoformat(seed["submitted"].replace("Z", "+00:00"))
            scoring = {"accuracy": seed["accuracy"], "correct": seed["correct"], "total": seed["n"], "source": "exam-attempt-seeds.js"}
            if not aarav_id:
                continue
            db.add(
                ExamAttempt(
                    id=seed["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    student_id=aarav_id,
                    roll_no="21CS114",
                    exam_id=seed["exam_id"],
                    exam_name=exam.get("title") or seed["exam_id"],
                    exam_mode=mode,
                    exam_family=family,
                    source="imported",
                    attempt_kind="practice",
                    is_demo=False,
                    started_at=started,
                    submitted_at=submitted,
                    exam_snapshot=json.dumps({"examId": seed["exam_id"]}),
                    timing=json.dumps({"elapsedSeconds": int((submitted - started).total_seconds())}),
                    scoring=json.dumps(scoring),
                    interactions=json.dumps({"spec": seed["spec"]}),
                )
            )
            db.flush()
            exam_qs = exam.get("questions") or []
            for i, token in enumerate(seed["spec"]):
                if i >= len(exam_qs):
                    break
                qq = exam_qs[i]
                kind = token[0] if token else "s"
                is_correct = kind == "c"
                skipped = kind == "s"
                db.add(
                    ExamQuestionAttempt(
                        attempt_id=seed["id"],
                        question_id=f"{seed['exam_id']}-Q{i+1:02d}",
                        question_number=i + 1,
                        question_snapshot=json.dumps({"stem": qq.get("stem"), "options": qq.get("options")}),
                        academic_context=json.dumps({"subject": qq.get("subject"), "chapter": qq.get("chapter"), "topic": qq.get("topic")}),
                        response=json.dumps({"status": "skipped" if skipped else "answered"}),
                        timing=json.dumps({}),
                        behaviour=json.dumps({}),
                        evaluation=json.dumps({"isCorrect": is_correct, "isSkipped": skipped}),
                    )
                )

    db.flush()
    return {
        "exams": len(exams),
        "questions": sum(len(e["questions"]) for e in exams),
        "sources": len(parse_studio_sources()),
        "seedAttempts": len(parse_seed_attempts()),
        "courses": len(COURSES),
        "assignments": len(ASSIGNMENTS),
    }
