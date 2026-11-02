"""Build the admin program result sheet: one row per student, best attempt, ranks."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exam_engine.catalog import scheme_for_family
from app.exam_engine.scoring import ADMIN_GRACE_PERCENT, apply_admin_grace, score_attempt
from app.models.catalog import Program
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import User
from app.models.people import StudentProfile
from app.services.admin_runtime import list_programs
from app.services.exam_family import normalize_exam_family


def _parse(raw: str | None) -> dict[str, Any]:
    try:
        data = json.loads(raw or "{}")
    except (TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _iso_date(value: datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.date().isoformat()


def _scheme_payload(scheme) -> dict[str, Any]:
    return {
        "family": scheme.family,
        "title": scheme.title,
        "nq": scheme.total_questions,
        "correctMarks": scheme.correct_marks,
        "wrongMarks": scheme.wrong_marks,
        "maxMarks": scheme.max_marks,
        "gracePercent": ADMIN_GRACE_PERCENT,
        "subjects": [{"code": s.code, "name": s.name, "questions": s.questions} for s in scheme.subjects],
    }


def resolve_program(db: Session, institution_id: str, program_id: str) -> dict[str, Any]:
    token = str(program_id or "").strip().lower().replace("_", "-")
    direct_family = normalize_exam_family(token.replace("exam-", ""))
    if direct_family and token in {"exam-jee", "exam-neet", "jee", "neet"}:
        scheme = scheme_for_family(direct_family)
        return {
            "id": program_id,
            "name": scheme.title,
            "code": scheme.family,
            "examFamily": scheme.family,
            "scheme": _scheme_payload(scheme),
        }
    programs = list_programs(db, institution_id)
    match = next((p for p in programs if p.get("id") == program_id), None)
    if match is None:
        row = db.get(Program, program_id)
        if row is None or row.institution_id != institution_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Program not found")
        family = normalize_exam_family(row.code) or normalize_exam_family(row.name) or normalize_exam_family(row.degree_type)
        match = {"id": row.id, "name": row.name, "code": row.code, "examFamily": family}
    family = normalize_exam_family(match.get("examFamily") or match.get("code") or match.get("name"))
    scheme = scheme_for_family(family)
    if scheme is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Results are available for JEE and NEET programs only")
    match["examFamily"] = scheme.family
    match["scheme"] = _scheme_payload(scheme)
    return match


def _question_payload(row: ExamQuestionAttempt) -> dict[str, Any]:
    return {
        "question": _parse(row.question_snapshot),
        "academicContext": _parse(row.academic_context),
        "response": _parse(row.response),
        "evaluation": _parse(row.evaluation),
    }


def _pick_best(scored: list[dict[str, Any]]) -> dict[str, Any]:
    def key(item: dict[str, Any]) -> tuple:
        submitted = item.get("submittedAt") or ""
        return (item["attended"], item["total"], submitted)

    return max(scored, key=key)


def _rank(values: list[tuple[str, float]]) -> dict[str, int]:
    ordered = sorted(values, key=lambda pair: (-pair[1], pair[0]))
    ranks: dict[str, int] = {}
    last_score = None
    last_rank = 0
    for index, (student_id, score) in enumerate(ordered, start=1):
        if score != last_score:
            last_rank = index
            last_score = score
        ranks[student_id] = last_rank
    return ranks


def _mean(nums: list[float]) -> float:
    return round(sum(nums) / len(nums), 2) if nums else 0.0


def build_analysis(rows: list[dict[str, Any]], scheme_meta: dict[str, Any], exam_name: str, exam_date: str | None) -> dict[str, Any]:
    n = len(rows)
    percentages = [r["percentage"] for r in rows]
    attended = [r["attended"] for r in rows]
    nca = [r["nca"] for r in rows]
    nwa = [r["nwa"] for r in rows]
    subject_avgs = []
    for subj in scheme_meta["subjects"]:
        code = subj["code"]
        scores = [r["subjects"].get(code, {}).get("score") or 0 for r in rows]
        subject_avgs.append(
            {
                "code": code,
                "name": subj["name"],
                "avgScore": _mean(scores),
                "avgAttended": _mean([r["subjects"].get(code, {}).get("attended") or 0 for r in rows]),
            }
        )
    toppers = rows[:5]
    weak = [r for r in rows if r["percentage"] < 30]
    low_attempt = [r for r in rows if r["nq"] and (r["attended"] / r["nq"]) < 0.5]
    return {
        "title": f"Examination analysis — {exam_name}",
        "examDate": exam_date,
        "students": n,
        "marking": f"+{scheme_meta['correctMarks']} correct / {scheme_meta['wrongMarks']} wrong · {scheme_meta['nq']} official questions · max {scheme_meta['maxMarks']}",
        "averagePercentage": _mean(percentages),
        "highestPercentage": max(percentages) if percentages else 0,
        "lowestPercentage": min(percentages) if percentages else 0,
        "averageAttended": _mean(attended),
        "averageCorrect": _mean(nca),
        "averageWrong": _mean(nwa),
        "attemptRate": round((_mean(attended) / scheme_meta["nq"]) * 100, 2) if scheme_meta.get("nq") else 0,
        "subjects": subject_avgs,
        "toppers": [
            {"rank": r["overallRank"], "rollNo": r["rollNo"], "name": r["name"], "total": r["total"], "percentage": r["percentage"]}
            for r in toppers
        ],
        "below30Count": len(weak),
        "lowAttemptCount": len(low_attempt),
        "notes": [
            f"{n} student{'s' if n != 1 else ''} ranked from the attempt where they answered the most questions.",
            f"Percentage uses official {scheme_meta['family']} paper size ({scheme_meta['nq']} Q × {scheme_meta['correctMarks']} = {scheme_meta['maxMarks']} marks).",
            f"Each student is given an additional {scheme_meta.get('gracePercent', ADMIN_GRACE_PERCENT):g}% of official maximum marks on this admin sheet only.",
            "Students continue to see raw +4/−1 scores. Do not share this grace on student-facing reports.",
            "Unattempted questions (including questions not present on a shorter mock) carry 0 marks.",
        ],
    }


def program_results(db: Session, user: User, program_id: str) -> dict[str, Any]:
    program = resolve_program(db, user.institution_id, program_id)
    scheme = scheme_for_family(program["examFamily"])
    assert scheme is not None

    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.institution_id == user.institution_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ).all()
    family_attempts = [row for row in attempts if normalize_exam_family(row.exam_family) == scheme.family]
    if not family_attempts:
        return {
            "program": program,
            "examName": program.get("name") or scheme.title,
            "examDate": None,
            "scheme": program["scheme"],
            "rows": [],
            "analysis": build_analysis([], program["scheme"], program.get("name") or scheme.title, None),
        }

    attempt_ids = [row.id for row in family_attempts]
    q_rows = db.scalars(select(ExamQuestionAttempt).where(ExamQuestionAttempt.attempt_id.in_(attempt_ids))).all()
    questions_by_attempt: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for qrow in q_rows:
        questions_by_attempt[qrow.attempt_id].append(_question_payload(qrow))

    student_ids = {row.student_id for row in family_attempts}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(student_ids))).all()} if student_ids else {}
    profiles = {
        p.user_id: p
        for p in db.scalars(select(StudentProfile).where(StudentProfile.user_id.in_(student_ids))).all()
    } if student_ids else {}

    scored_by_student: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for attempt in family_attempts:
        tally = apply_admin_grace(
            score_attempt(attempt, questions_by_attempt.get(attempt.id) or [], scheme),
            scheme,
        )
        owner = users.get(attempt.student_id)
        profile = profiles.get(attempt.student_id)
        scored_by_student[attempt.student_id].append(
            {
                "studentId": attempt.student_id,
                "attemptId": attempt.id,
                "examId": attempt.exam_id,
                "examName": attempt.exam_name,
                "rollNo": (profile.roll_no if profile else None) or attempt.roll_no,
                "name": (owner.full_name if owner else None) or attempt.roll_no,
                "submittedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                "submittedDate": _iso_date(attempt.submitted_at),
                **tally,
            }
        )

    best_rows = [_pick_best(items) for items in scored_by_student.values()]
    overall = _rank([(r["studentId"], r["total"]) for r in best_rows])
    subject_ranks = {
        code: _rank([(r["studentId"], (r["subjects"].get(code) or {}).get("score") or 0) for r in best_rows])
        for code in scheme.subject_codes
    }
    for row in best_rows:
        row["overallRank"] = overall[row["studentId"]]
        row["subjectRanks"] = {code: subject_ranks[code][row["studentId"]] for code in scheme.subject_codes}
        for code, bucket in row["subjects"].items():
            bucket["rank"] = row["subjectRanks"][code]

    best_rows.sort(key=lambda r: (r["overallRank"], r["name"] or ""))
    for index, row in enumerate(best_rows, start=1):
        row["slNo"] = index

    exam_name = max((r["examName"] or "" for r in best_rows), key=lambda n: sum(1 for r in best_rows if r["examName"] == n), default=program.get("name") or scheme.title)
    exam_date = max((r["submittedDate"] or "" for r in best_rows), default="") or None

    return {
        "program": program,
        "examName": exam_name or program.get("name") or scheme.title,
        "examDate": exam_date,
        "scheme": program["scheme"],
        "rows": best_rows,
        "analysis": build_analysis(best_rows, program["scheme"], exam_name or scheme.title, exam_date),
    }
