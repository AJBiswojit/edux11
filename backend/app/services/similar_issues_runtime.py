"""Similar-issue groups derived from SQL exam evidence.

Never seed demo chapters. Empty attempts / DNA → empty groups.
Intervention *decisions* persist separately via interventions_sql.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import User
from app.models.intelligence import StudentDnaSnapshot
from app.services.examination import title_domain, title_family
from app.services.people_directory import faculty_students_directory
from app.services.spa_issues import intervention_from_group

WEAK_ACCURACY = 70.0
MIN_QUESTIONS = 2
MIN_GROUP = 2


def empty_pack() -> dict:
    return {
        "groups": [],
        "individuals": [],
        "count": 0,
        "individualCount": 0,
        "demoExcluded": True,
        "note": "Derived from exam attempts and DNA. Empty when there is no weak-chapter evidence.",
    }


def group_id_for(domain: str, family: str | None, subject: str, chapter: str) -> str:
    fingerprint = f"{domain}|{family or ''}|{subject}|{chapter}"
    return "sig-" + hashlib.sha1(fingerprint.encode("utf-8")).hexdigest()[:12]


def _round1(value: float | None) -> float:
    return round(float(value or 0) * 10) / 10


def _parse(raw: str | None) -> dict:
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    return data if isinstance(data, dict) else {}


def _issue_type(avg_accuracy: float) -> str:
    if avg_accuracy < 45:
        return "Persistent Weakness"
    if avg_accuracy < 55:
        return "Low Accuracy"
    return "Performance Gap"


def similar_issues_for_faculty(db: Session, user: User) -> dict:
    if not user.institution_id:
        return empty_pack()
    directory = faculty_students_directory(db, user.institution_id)
    students = {s["id"]: s for s in (directory.get("students") or []) if s.get("id")}
    if not students:
        return empty_pack()

    # student_id -> (domain, family, subject, chapter) -> stats
    stats: dict[str, dict[tuple, dict]] = defaultdict(lambda: defaultdict(lambda: {
        "n": 0,
        "correct": 0,
        "incorrect": 0,
        "skipped": 0,
        "time": 0,
        "exams": set(),
        "accuracy": None,
    }))

    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.institution_id == user.institution_id,
            ExamAttempt.student_id.in_(list(students)),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
            ExamAttempt.created_at >= datetime.utcnow() - timedelta(days=365),
        )
    ).all()
    attempt_ids = [a.id for a in attempts]
    qas_by_attempt: dict[str, list[ExamQuestionAttempt]] = defaultdict(list)
    if attempt_ids:
        for qa in db.scalars(select(ExamQuestionAttempt).where(ExamQuestionAttempt.attempt_id.in_(attempt_ids))).all():
            qas_by_attempt[qa.attempt_id].append(qa)

    for attempt in attempts:
        mode = (attempt.exam_mode or "university").lower()
        family = (attempt.exam_family or "").upper() or None
        domain = title_domain(mode)
        family_label = title_family((attempt.exam_family or "").lower() if attempt.exam_family else None)
        for qa in qas_by_attempt.get(attempt.id, []):
            ctx = _parse(qa.academic_context)
            ev = _parse(qa.evaluation)
            timing = _parse(qa.timing)
            chapter = ctx.get("chapter") or ctx.get("topic") or ctx.get("concept")
            if not chapter:
                continue
            subject = ctx.get("subject") or chapter
            key = (domain, family_label if mode == "competitive" else None, subject, chapter)
            bucket = stats[attempt.student_id][key]
            bucket["n"] += 1
            bucket["exams"].add(attempt.id)
            is_correct = ev.get("isCorrect")
            if is_correct is True:
                bucket["correct"] += 1
            elif is_correct is False:
                bucket["incorrect"] += 1
            else:
                bucket["skipped"] += 1
            bucket["time"] += int(timing.get("timeSpent") or timing.get("elapsedSeconds") or 0)

    # DNA fills chapters that have no question-level rows (same worker output).
    dna_rows = db.scalars(select(StudentDnaSnapshot).where(StudentDnaSnapshot.student_id.in_(list(students)))).all()
    for row in dna_rows:
        if row.student_id not in students:
            continue
        payload = _parse(row.payload)
        mode = (row.exam_mode or "university").lower()
        domain = title_domain(mode)
        family_label = title_family((row.exam_family or "").lower() if row.exam_family else None)
        for chapter in payload.get("chapters") or []:
            name = chapter.get("chapter") or chapter.get("topic")
            if not name:
                continue
            subject = chapter.get("subject") or name
            key = (domain, family_label if mode == "competitive" else None, subject, name)
            if stats[row.student_id][key]["n"]:
                continue
            n = int(chapter.get("questions") or 0)
            acc = chapter.get("accuracy")
            if n < MIN_QUESTIONS or acc is None:
                continue
            accuracy = float(acc)
            correct = (n * accuracy) / 100
            stats[row.student_id][key]["n"] = n
            stats[row.student_id][key]["correct"] = correct
            stats[row.student_id][key]["incorrect"] = max(n - correct, 0)
            stats[row.student_id][key]["accuracy"] = accuracy
            stats[row.student_id][key]["time"] = int((chapter.get("avgTime") or 0) * n)
            stats[row.student_id][key]["exams"] = set()

    # Collect weak students per fingerprint.
    weak: dict[tuple, list[dict]] = defaultdict(list)
    for student_id, chapters in stats.items():
        student = students.get(student_id)
        if not student:
            continue
        for key, bucket in chapters.items():
            n = bucket["n"]
            if n < MIN_QUESTIONS:
                continue
            attempted = bucket["correct"] + bucket["incorrect"]
            accuracy = _round1((bucket["correct"] / attempted) * 100) if attempted else None
            if accuracy is None or accuracy >= WEAK_ACCURACY:
                continue
            avg_time = _round1(bucket["time"] / n) if n else None
            weak[key].append(
                {
                    "studentId": student_id,
                    "roll": student.get("roll"),
                    "name": student.get("name"),
                    "batchId": student.get("batchId") or student.get("batchName") or "",
                    "batchName": student.get("batchName"),
                    "accuracy": accuracy,
                    "avgTime": avg_time,
                    "incorrect": bucket["incorrect"],
                    "skipped": bucket["skipped"],
                    "questions": n,
                    "exams": len(bucket["exams"]) or 1,
                }
            )

    groups: list[dict] = []
    individuals: list[dict] = []
    for (domain, family, subject, chapter), members in weak.items():
        members = sorted(members, key=lambda m: (m.get("accuracy") or 0, m.get("name") or ""))
        if len(members) < MIN_GROUP:
            if members:
                m = members[0]
                individuals.append(
                    {
                        "studentId": m["studentId"],
                        "roll": m.get("roll"),
                        "name": m.get("name"),
                        "batchId": m.get("batchId") or m.get("batchName") or "",
                        "domain": domain,
                        "examFamily": family,
                        "subject": subject,
                        "chapter": chapter,
                        "issueType": _issue_type(m["accuracy"]),
                        "severity": "Medium",
                        "accuracy": m["accuracy"],
                        "avgTime": m.get("avgTime"),
                        "trend": "stable",
                        "evidence": {
                            "attempts": m.get("exams") or 1,
                            "questions": m["questions"],
                            "accuracy": m["accuracy"],
                            "avgTime": m.get("avgTime"),
                            "incorrect": m.get("incorrect") or 0,
                            "skipped": m.get("skipped") or 0,
                        },
                        "lastExam": None,
                    }
                )
            continue
        avg_acc = _round1(sum(m["accuracy"] for m in members) / len(members))
        times = [m["avgTime"] for m in members if m.get("avgTime") is not None]
        avg_time = _round1(sum(times) / len(times)) if times else None
        total_incorrect = sum(m.get("incorrect") or 0 for m in members)
        total_skipped = sum(m.get("skipped") or 0 for m in members)
        total_questions = sum(m.get("questions") or 0 for m in members)
        affected_exams = sum(m.get("exams") or 0 for m in members)
        issue_type = _issue_type(avg_acc)
        gid = group_id_for(domain, family, subject, chapter)
        groups.append(
            {
                "id": gid,
                "groupId": gid,
                "domain": domain,
                "examFamily": family,
                "examMode": domain,
                "subject": subject,
                "chapter": chapter,
                "issueType": issue_type,
                "severity": "High" if avg_acc < 55 else "Medium",
                "similarityScore": None,
                "studentCount": len(members),
                "students": members,
                "studentIds": [m["studentId"] for m in members],
                "batchIds": sorted({m.get("batchId") for m in members if m.get("batchId")}),
                "batches": sorted({m.get("batchName") or m.get("batchId") for m in members if m.get("batchName") or m.get("batchId")}),
                "avgAccuracy": avg_acc,
                "avgTime": avg_time,
                "totalIncorrect": total_incorrect,
                "totalSkipped": total_skipped,
                "totalQuestions": total_questions,
                "affectedExams": affected_exams,
                "maxPersistence": max((m.get("exams") or 1) for m in members),
                "trend": "Persistent" if avg_acc < 45 else "Stable",
                "priority": "High" if len(members) >= 5 or avg_acc < 55 else "Medium",
                "evidence": {
                    "students": len(members),
                    "subject": subject,
                    "chapter": chapter,
                    "issueType": issue_type,
                    "avgAccuracy": avg_acc,
                    "avgTime": avg_time,
                    "questions": total_questions,
                    "incorrect": total_incorrect,
                    "skipped": total_skipped,
                    "affectedExams": affected_exams,
                    "source": "exam_attempts",
                },
                "whyDetected": (
                    f"{len(members)} students showed {avg_acc}% average accuracy in {chapter} ({subject}) "
                    f"across {total_questions} scored questions."
                ),
                "recommendation": {
                    "title": "Concept revision + targeted practice",
                    "detail": f"{issue_type} in {chapter} — {avg_acc}% average accuracy.",
                    "actions": [
                        {"label": "Concept revision", "detail": f"Revisit {chapter} fundamentals ({subject})."},
                        {"label": "Targeted practice", "detail": f"Practice {chapter} questions from the question bank."},
                    ],
                },
                "note": "Derived from exam_attempts / DNA. Not a seeded grouping.",
            }
        )

    groups.sort(key=lambda g: (g.get("avgAccuracy") or 0, g.get("chapter") or ""))
    return {
        "groups": groups,
        "individuals": individuals,
        "count": len(groups),
        "individualCount": len(individuals),
        "demoExcluded": True,
        "note": "Derived from exam attempts and DNA. Empty when there is no weak-chapter evidence.",
    }


def similar_issues_for_admin(db: Session, institution_id: str) -> dict:
    """Same grouping logic as similar_issues_for_faculty but scoped to all institution students."""
    if not institution_id:
        return empty_pack()
    from app.services.admin_runtime import students_payload
    directory = students_payload(db, institution_id)
    students = {s["id"]: s for s in (directory.get("students") or []) if s.get("id")}
    if not students:
        return empty_pack()

    stats: dict[str, dict[tuple, dict]] = defaultdict(lambda: defaultdict(lambda: {
        "n": 0, "correct": 0, "incorrect": 0, "skipped": 0, "time": 0, "exams": set(), "accuracy": None,
    }))

    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.institution_id == institution_id,
            ExamAttempt.student_id.in_(list(students)),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
            ExamAttempt.created_at >= datetime.utcnow() - timedelta(days=365),
        )
    ).all()
    attempt_ids = [a.id for a in attempts]
    qas_by_attempt: dict[str, list[ExamQuestionAttempt]] = defaultdict(list)
    if attempt_ids:
        for qa in db.scalars(select(ExamQuestionAttempt).where(ExamQuestionAttempt.attempt_id.in_(attempt_ids))).all():
            qas_by_attempt[qa.attempt_id].append(qa)

    for attempt in attempts:
        mode = (attempt.exam_mode or "university").lower()
        family_label = title_family((attempt.exam_family or "").lower() if attempt.exam_family else None)
        domain = title_domain(mode)
        for qa in qas_by_attempt.get(attempt.id, []):
            ctx = _parse(qa.academic_context)
            ev = _parse(qa.evaluation)
            timing = _parse(qa.timing)
            chapter = ctx.get("chapter") or ctx.get("topic") or ctx.get("concept")
            if not chapter:
                continue
            subject = ctx.get("subject") or chapter
            key = (domain, family_label if mode == "competitive" else None, subject, chapter)
            bucket = stats[attempt.student_id][key]
            bucket["n"] += 1
            bucket["exams"].add(attempt.id)
            is_correct = ev.get("isCorrect")
            if is_correct is True:
                bucket["correct"] += 1
            elif is_correct is False:
                bucket["incorrect"] += 1
            else:
                bucket["skipped"] += 1
            bucket["time"] += int(timing.get("timeSpent") or timing.get("elapsedSeconds") or 0)

    dna_rows = db.scalars(select(StudentDnaSnapshot).where(StudentDnaSnapshot.student_id.in_(list(students)))).all()
    for row in dna_rows:
        if row.student_id not in students:
            continue
        payload = _parse(row.payload)
        mode = (row.exam_mode or "university").lower()
        domain = title_domain(mode)
        family_label = title_family((row.exam_family or "").lower() if row.exam_family else None)
        for chapter in payload.get("chapters") or []:
            name = chapter.get("chapter") or chapter.get("topic")
            if not name:
                continue
            subject = chapter.get("subject") or name
            key = (domain, family_label if mode == "competitive" else None, subject, name)
            if stats[row.student_id][key]["n"]:
                continue
            n = int(chapter.get("questions") or 0)
            acc = chapter.get("accuracy")
            if n < MIN_QUESTIONS or acc is None:
                continue
            accuracy = float(acc)
            correct = (n * accuracy) / 100
            stats[row.student_id][key]["n"] = n
            stats[row.student_id][key]["correct"] = correct
            stats[row.student_id][key]["incorrect"] = max(n - correct, 0)
            stats[row.student_id][key]["accuracy"] = accuracy
            stats[row.student_id][key]["time"] = int((chapter.get("avgTime") or 0) * n)
            stats[row.student_id][key]["exams"] = set()

    weak: dict[tuple, list[dict]] = defaultdict(list)
    for student_id, chapters in stats.items():
        student = students.get(student_id)
        if not student:
            continue
        for key, bucket in chapters.items():
            n = bucket["n"]
            if n < MIN_QUESTIONS:
                continue
            attempted = bucket["correct"] + bucket["incorrect"]
            accuracy = _round1((bucket["correct"] / attempted) * 100) if attempted else None
            if accuracy is None or accuracy >= WEAK_ACCURACY:
                continue
            avg_time = _round1(bucket["time"] / n) if n else None
            weak[key].append({
                "studentId": student_id,
                "roll": student.get("roll"),
                "name": student.get("name"),
                "batchId": student.get("batchId") or student.get("batchName") or "",
                "batchName": student.get("batchName"),
                "accuracy": accuracy,
                "avgTime": avg_time,
                "incorrect": bucket["incorrect"],
                "skipped": bucket["skipped"],
                "questions": n,
                "exams": len(bucket["exams"]) or 1,
            })

    groups: list[dict] = []
    individuals: list[dict] = []
    for (domain, family, subject, chapter), members in weak.items():
        members = sorted(members, key=lambda m: (m.get("accuracy") or 0, m.get("name") or ""))
        if len(members) < MIN_GROUP:
            if members:
                m = members[0]
                individuals.append({
                    "studentId": m["studentId"],
                    "roll": m.get("roll"),
                    "name": m.get("name"),
                    "batchId": m.get("batchId") or m.get("batchName") or "",
                    "domain": domain,
                    "examFamily": family,
                    "subject": subject,
                    "chapter": chapter,
                    "issueType": _issue_type(m["accuracy"]),
                    "severity": "Medium",
                    "accuracy": m["accuracy"],
                    "avgTime": m.get("avgTime"),
                    "trend": "stable",
                    "evidence": {
                        "attempts": m.get("exams") or 1,
                        "questions": m["questions"],
                        "accuracy": m["accuracy"],
                        "avgTime": m.get("avgTime"),
                        "incorrect": m.get("incorrect") or 0,
                        "skipped": m.get("skipped") or 0,
                    },
                    "lastExam": None,
                })
            continue
        avg_acc = _round1(sum(m["accuracy"] for m in members) / len(members))
        times = [m["avgTime"] for m in members if m.get("avgTime") is not None]
        avg_time = _round1(sum(times) / len(times)) if times else None
        total_incorrect = sum(m.get("incorrect") or 0 for m in members)
        total_skipped = sum(m.get("skipped") or 0 for m in members)
        total_questions = sum(m.get("questions") or 0 for m in members)
        affected_exams = sum(m.get("exams") or 0 for m in members)
        issue_type = _issue_type(avg_acc)
        gid = group_id_for(domain, family, subject, chapter)
        groups.append({
            "id": gid,
            "groupId": gid,
            "domain": domain,
            "examFamily": family,
            "subject": subject,
            "chapter": chapter,
            "issueType": issue_type,
            "severity": "High" if avg_acc < 55 else "Medium",
            "studentCount": len(members),
            "students": members,
            "studentIds": [m["studentId"] for m in members],
            "batchIds": sorted({m.get("batchId") for m in members if m.get("batchId")}),
            "batches": sorted({m.get("batchName") or m.get("batchId") for m in members if m.get("batchName") or m.get("batchId")}),
            "avgAccuracy": avg_acc,
            "avgTime": avg_time,
            "totalIncorrect": total_incorrect,
            "totalSkipped": total_skipped,
            "totalQuestions": total_questions,
            "affectedExams": affected_exams,
            "maxPersistence": max((m.get("exams") or 1) for m in members),
            "trend": "Persistent" if avg_acc < 45 else "Stable",
            "priority": "High" if len(members) >= 5 or avg_acc < 55 else "Medium",
            "evidence": {
                "students": len(members), "subject": subject, "chapter": chapter,
                "issueType": issue_type, "avgAccuracy": avg_acc, "avgTime": avg_time,
                "questions": total_questions, "incorrect": total_incorrect,
                "skipped": total_skipped, "affectedExams": affected_exams, "source": "exam_attempts",
            },
            "whyDetected": (
                f"{len(members)} students showed {avg_acc}% average accuracy in {chapter} ({subject}) "
                f"across {total_questions} scored questions."
            ),
            "recommendation": {
                "title": "Concept revision + targeted practice",
                "detail": f"{issue_type} in {chapter} — {avg_acc}% average accuracy.",
                "actions": [
                    {"label": "Concept revision", "detail": f"Revisit {chapter} fundamentals ({subject})."},
                    {"label": "Targeted practice", "detail": f"Practice {chapter} questions from the question bank."},
                ],
            },
            "note": "Derived from exam_attempts / DNA. Not a seeded grouping.",
        })

    groups.sort(key=lambda g: (g.get("avgAccuracy") or 0, g.get("chapter") or ""))
    return {
        "groups": groups,
        "individuals": individuals,
        "count": len(groups),
        "individualCount": len(individuals),
        "demoExcluded": True,
        "note": "Derived from exam attempts and DNA. Empty when there is no weak-chapter evidence.",
    }


def find_group(packed: dict, group_id: str) -> dict | None:
    return next((g for g in (packed.get("groups") or []) if g.get("id") == group_id), None)


def derived_intervention(group: dict) -> dict:
    payload = intervention_from_group(group, None)
    payload["persisted"] = False
    payload["source"] = "derived"
    return payload
