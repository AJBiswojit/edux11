"""+4 / −1 official scoring against the full JEE (75) or NEET (180) paper."""

from __future__ import annotations

import json
from typing import Any

from app.exam_engine.catalog import ExamScheme, map_subject_code


def _load(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _answered_state(evaluation: dict[str, Any], response: dict[str, Any]) -> bool | None:
    """True = correct, False = wrong, None = unattempted."""
    flag = evaluation.get("isCorrect")
    if flag is True:
        return True
    if flag is False:
        return False
    selected = response.get("selected")
    if selected is None:
        selected = response.get("value")
    if selected in (None, "", []):
        return None
    return None if flag is None else bool(flag)


def tally_questions(question_rows: list[dict[str, Any]], scheme: ExamScheme) -> dict[str, Any]:
    from app.services.examination import grade_fill_in_blank, is_fill_in_blank_type

    nca = nwa = nwa_deducted = 0
    subjects = {
        code: {"correct": 0, "wrong": 0, "unattempted": 0, "attended": 0, "score": 0.0}
        for code in scheme.subject_codes
    }
    wrong_deducted_by_subject = {code: 0 for code in scheme.subject_codes}
    for row in question_rows:
        ctx = row.get("academicContext") or {}
        question = row.get("question") or {}
        evaluation = row.get("evaluation") or {}
        response = row.get("response") or {}
        raw_subject = ctx.get("subject") or question.get("subject") or question.get("subjectName")
        code = map_subject_code(
            raw_subject,
            family=scheme.family,
            chapter=ctx.get("chapter") or question.get("chapter"),
            topic=ctx.get("topic") or question.get("topic"),
        )
        q_type = question.get("type") or question.get("qType") or question.get("questionType") or ctx.get("type")
        is_fib = is_fill_in_blank_type(q_type)
        state = _answered_state(evaluation, response)
        if is_fib and state is not None:
            given = response.get("value") if response.get("value") not in (None, "") else response.get("selected")
            expected = (
                evaluation.get("correctAnswer")
                or question.get("correctValue")
                or question.get("correctAnswer")
            )
            if given not in (None, "") and expected not in (None, ""):
                state = grade_fill_in_blank(expected, given)
        if state is True:
            nca += 1
            if code and code in subjects:
                subjects[code]["correct"] += 1
        elif state is False:
            nwa += 1
            if not is_fib:
                nwa_deducted += 1
            if code and code in subjects:
                subjects[code]["wrong"] += 1
                if not is_fib:
                    wrong_deducted_by_subject[code] += 1
    for code, bucket in subjects.items():
        bucket["attended"] = bucket["correct"] + bucket["wrong"]
        bucket["score"] = round(
            bucket["correct"] * scheme.correct_marks + wrong_deducted_by_subject[code] * scheme.wrong_marks,
            2,
        )
        quota = next((s.questions for s in scheme.subjects if s.code == code), 0)
        bucket["unattempted"] = max(0, quota - bucket["attended"])
        bucket["nq"] = quota
    attended = nca + nwa
    nuq = max(0, scheme.total_questions - attended)
    total = nca * scheme.correct_marks + nwa_deducted * scheme.wrong_marks
    max_marks = scheme.max_marks
    percentage = round((total / max_marks) * 100, 2) if max_marks else 0.0
    return {
        "nca": nca,
        "nwa": nwa,
        "nuq": nuq,
        "nq": scheme.total_questions,
        "attended": attended,
        "total": round(total, 2),
        "maxMarks": max_marks,
        "percentage": percentage,
        "subjects": subjects,
        "source": "questions",
    }


def tally_from_scoring_blob(scoring: dict[str, Any], snapshot: dict[str, Any], scheme: ExamScheme) -> dict[str, Any]:
    nca = _int(scoring.get("correct"))
    nwa = _int(scoring.get("incorrect"))
    attended = nca + nwa
    if attended <= 0:
        skipped = _int(scoring.get("unanswered") or scoring.get("skipped"))
        total_qs = _int(scoring.get("total"))
        if total_qs and skipped:
            attended = max(0, total_qs - skipped)
            nca = _int(scoring.get("correct"))
            nwa = max(0, attended - nca)
    nuq = max(0, scheme.total_questions - attended)
    total = nca * scheme.correct_marks + nwa * scheme.wrong_marks
    max_marks = scheme.max_marks
    percentage = round((total / max_marks) * 100, 2) if max_marks else 0.0
    subjects = {
        code: {"correct": 0, "wrong": 0, "unattempted": next((s.questions for s in scheme.subjects if s.code == code), 0), "attended": 0, "score": 0.0, "nq": next((s.questions for s in scheme.subjects if s.code == code), 0)}
        for code in scheme.subject_codes
    }
    code = map_subject_code(snapshot.get("subject"), family=scheme.family)
    if code and code in subjects:
        subjects[code]["correct"] = nca
        subjects[code]["wrong"] = nwa
        subjects[code]["attended"] = attended
        subjects[code]["score"] = round(total, 2)
        quota = subjects[code]["nq"]
        subjects[code]["unattempted"] = max(0, quota - attended)
    return {
        "nca": nca,
        "nwa": nwa,
        "nuq": nuq,
        "nq": scheme.total_questions,
        "attended": attended,
        "total": round(total, 2),
        "maxMarks": max_marks,
        "percentage": percentage,
        "subjects": subjects,
        "source": "scoring",
    }


def score_attempt(attempt, question_rows: list[dict[str, Any]], scheme: ExamScheme) -> dict[str, Any]:
    if question_rows:
        return tally_questions(question_rows, scheme)
    scoring = _load(getattr(attempt, "scoring", None) if not isinstance(attempt, dict) else attempt.get("scoring"))
    snapshot = _load(getattr(attempt, "exam_snapshot", None) if not isinstance(attempt, dict) else attempt.get("exam") or attempt.get("exam_snapshot"))
    return tally_from_scoring_blob(scoring, snapshot, scheme)


ADMIN_GRACE_PERCENT = 15.0


def apply_admin_grace(tally: dict[str, Any], scheme: ExamScheme, percent: float = ADMIN_GRACE_PERCENT) -> dict[str, Any]:
    """Add a flat percentage of official max marks. Admin result sheets only.

    Student-facing scoring is never passed through here, so learners still see
    the raw +4 / −1 total.
    """
    rate = max(0.0, float(percent)) / 100.0
    max_marks = float(tally.get("maxMarks") or scheme.max_marks)
    raw_total = float(tally.get("total") or 0)
    grace_total = round(max_marks * rate, 2)
    adjusted_total = round(min(max_marks, raw_total + grace_total), 2)
    subjects = {}
    for spec in scheme.subjects:
        bucket = dict(tally.get("subjects") or {}).get(spec.code) or {}
        subject_max = spec.questions * scheme.correct_marks
        raw_score = float(bucket.get("score") or 0)
        grace_score = round(subject_max * rate, 2)
        subjects[spec.code] = {
            **bucket,
            "rawScore": round(raw_score, 2),
            "grace": grace_score,
            "score": round(min(subject_max, raw_score + grace_score), 2),
        }
    percentage = round((adjusted_total / max_marks) * 100, 2) if max_marks else 0.0
    return {
        **tally,
        "rawTotal": round(raw_total, 2),
        "rawPercentage": tally.get("percentage"),
        "gracePercent": percent,
        "graceMarks": grace_total,
        "total": adjusted_total,
        "percentage": percentage,
        "subjects": subjects,
    }
