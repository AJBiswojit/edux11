"""EduX exam accuracy — multi-factor score independent of official marks.

Official JEE/NEET +4/−1 totals stay in ``exam_engine.scoring``. This module
only computes the ``accuracy`` percentage persisted on an exam attempt.

Marking, difficulty weights, expected times, and mix weights come from
``exam_config`` (derived from the paper/questions at call time). Nothing
exam-family-specific is hardcoded in the formula.
"""

from __future__ import annotations

import math
from collections import Counter
from copy import deepcopy
from typing import Any

DEFAULT_EXAM_ACCURACY_CONFIG: dict[str, dict[str, float]] = {
    "marking": {"correct": 1.0, "negative": 0.0},
    "weights": {"answer": 0.50, "difficulty": 0.20, "time": 0.15, "coverage": 0.15},
    "difficulty": {"easy": 1.0, "medium": 1.5, "hard": 2.0},
    "expectedTime": {"easy": 60.0, "medium": 90.0, "hard": 150.0},
}

_DIFFICULTY_ALIASES = {
    "easy": "easy",
    "e": "easy",
    "medium": "medium",
    "med": "medium",
    "moderate": "medium",
    "hard": "hard",
    "h": "hard",
    "difficult": "hard",
}

_EMPTY_RESULT = {
    "accuracy": 0.0,
    "answerPerformance": 0.0,
    "difficultyPerformance": 0.0,
    "timeEfficiency": 0.0,
    "questionCoverage": 0.0,
    "netScore": 0.0,
}


def _finite(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def _clamp(value: float, low: float, high: float) -> float:
    if not math.isfinite(value):
        return low
    return min(high, max(low, value))


def _clamp01(value: float) -> float:
    return _clamp(value, 0.0, 1.0)


def _pick(source: dict[str, Any] | None, *keys: str, default: Any = None) -> Any:
    if not isinstance(source, dict):
        return default
    for key in keys:
        if key in source and source[key] is not None:
            return source[key]
    return default


def _typical(values: list[float], fallback: float) -> float:
    cleaned = [v for v in values if math.isfinite(v)]
    if not cleaned:
        return fallback
    counted = Counter(cleaned)
    return counted.most_common(1)[0][0]


def _difficulty_key(raw: Any, default: str = "medium") -> str:
    if raw is None or str(raw).strip() == "":
        return default
    token = str(raw).strip().lower()
    if token in DEFAULT_EXAM_ACCURACY_CONFIG["difficulty"]:
        return token
    return _DIFFICULTY_ALIASES.get(token, default)


def merge_exam_accuracy_config(*overrides: dict[str, Any] | None) -> dict[str, dict[str, float]]:
    """Deep-merge config sections. Null/invalid entries are ignored."""
    merged = deepcopy(DEFAULT_EXAM_ACCURACY_CONFIG)
    for blob in overrides:
        if not isinstance(blob, dict):
            continue
        sections = {
            "marking": blob.get("marking") if isinstance(blob.get("marking"), dict) else blob.get("markingScheme"),
            "weights": blob.get("weights"),
            "difficulty": blob.get("difficulty") if isinstance(blob.get("difficulty"), dict) else blob.get("difficultyWeights"),
            "expectedTime": blob.get("expectedTime") if isinstance(blob.get("expectedTime"), dict) else blob.get("expected_time"),
        }
        for section, extra in sections.items():
            if not isinstance(extra, dict):
                continue
            for raw_key, raw_value in extra.items():
                if raw_value is None:
                    continue
                key = str(raw_key).strip()
                if section in {"difficulty", "expectedTime"}:
                    key = _difficulty_key(key, default=str(raw_key).strip().lower())
                elif section == "marking" and key in {"negativeMarks", "negative_marks", "wrong"}:
                    key = "negative"
                elif section == "marking" and key in {"correctMarks", "correct_marks", "p"}:
                    key = "correct"
                number = _finite(raw_value, default=float("nan"))
                if not math.isfinite(number):
                    continue
                merged[section][key] = number
    return merged


def exam_accuracy_config_for_paper(paper: Any, details: list[dict[str, Any]] | None = None) -> dict[str, dict[str, float]]:
    """Build config from the paper's own marks — never from a family default."""
    config = merge_exam_accuracy_config()
    marks: list[float] = []
    negatives: list[float] = []
    for row in details or []:
        question = row.get("question") if isinstance(row.get("question"), dict) else {}
        evaluation = row.get("evaluation") if isinstance(row.get("evaluation"), dict) else {}
        mark = _pick(evaluation, "maxMarks", "max_marks", default=_pick(question, "marks"))
        neg = _pick(question, "negativeMarks", "negative_marks")
        if mark is not None:
            marks.append(_finite(mark, default=float("nan")))
        if neg is not None:
            negatives.append(_finite(neg, default=float("nan")))
    if marks:
        config["marking"]["correct"] = _typical(marks, config["marking"]["correct"])
    negative_enabled = bool(getattr(paper, "negative_marking", False)) if paper is not None else any(n > 0 for n in negatives)
    if negative_enabled and negatives:
        config["marking"]["negative"] = abs(_typical(negatives, 0.0))
    else:
        config["marking"]["negative"] = 0.0
    return config


def questions_from_scored_details(details: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in details or []:
        if not isinstance(row, dict):
            continue
        question = row.get("question") if isinstance(row.get("question"), dict) else {}
        evaluation = row.get("evaluation") if isinstance(row.get("evaluation"), dict) else {}
        timing = row.get("timing") if isinstance(row.get("timing"), dict) else {}
        is_correct = evaluation.get("isCorrect")
        skipped = bool(evaluation.get("isSkipped"))
        attempted = is_correct is True or is_correct is False
        rows.append(
            {
                "difficulty": _pick(question, "difficulty"),
                "expectedTimeSeconds": _pick(question, "expectedTimeSeconds", "expectedTime", "expected_time"),
                "actualTimeSeconds": _pick(timing, "timeSpent", "seconds", "elapsedSeconds", "time"),
                "isCorrect": is_correct,
                "attempted": attempted and not skipped,
                "marks": _pick(evaluation, "maxMarks", "max_marks", default=_pick(question, "marks")),
                "negativeMarks": _pick(question, "negativeMarks", "negative_marks"),
                "marksAwarded": _pick(evaluation, "marksAwarded", "marks_awarded"),
            }
        )
    return rows


def _question_attempted(item: dict[str, Any]) -> bool:
    if item.get("attempted") is True:
        return True
    if item.get("attempted") is False:
        return False
    flag = item.get("isCorrect")
    return flag is True or flag is False


def _expected_time_for(item: dict[str, Any], config: dict[str, dict[str, float]]) -> float:
    explicit = _pick(item, "expectedTimeSeconds", "expectedTime", "expected_time")
    if explicit not in (None, ""):
        seconds = _finite(explicit, default=float("nan"))
        if math.isfinite(seconds) and seconds > 0:
            return seconds
    key = _difficulty_key(_pick(item, "difficulty"))
    return _finite(config["expectedTime"].get(key), default=config["expectedTime"]["medium"])


def calculate_exam_accuracy(
    *,
    questions: list[dict[str, Any]] | None = None,
    correct_answers: int | None = None,
    wrong_answers: int | None = None,
    attempted_questions: int | None = None,
    total_questions: int | None = None,
    total_time_seconds: float | None = None,
    marking_scheme: dict[str, Any] | None = None,
    weights: dict[str, Any] | None = None,
    exam_config: dict[str, Any] | None = None,
) -> dict[str, float]:
    """Return EduX exam accuracy (0–100) and the four normalized components."""
    config = merge_exam_accuracy_config(
        exam_config,
        {"marking": marking_scheme, "weights": weights} if (marking_scheme or weights) else None,
    )
    rows = [row for row in (questions or []) if isinstance(row, dict)]

    if rows:
        total_q = len(rows)
        correct = sum(1 for row in rows if row.get("isCorrect") is True)
        wrong = sum(1 for row in rows if row.get("isCorrect") is False)
        attempted = sum(1 for row in rows if _question_attempted(row))
    else:
        correct = max(0, int(correct_answers or 0))
        wrong = max(0, int(wrong_answers or 0))
        attempted = max(0, int(attempted_questions if attempted_questions is not None else correct + wrong))
        total_q = max(0, int(total_questions if total_questions is not None else attempted))

    if total_q <= 0:
        return dict(_EMPTY_RESULT)

    correct_marks = abs(_finite(config["marking"].get("correct"), default=1.0))
    negative_marks = abs(_finite(config["marking"].get("negative"), default=0.0))

    if rows:
        net_score = 0.0
        max_score = 0.0
        weighted_correct = 0.0
        total_difficulty = 0.0
        expected_time = 0.0
        actual_time = 0.0
        timed_attempted = 0
        for row in rows:
            marks = _finite(_pick(row, "marks", "maxMarks", "max_marks"), default=correct_marks)
            if marks < 0:
                marks = correct_marks
            max_score += marks
            weight = _finite(config["difficulty"].get(_difficulty_key(_pick(row, "difficulty"))), default=config["difficulty"]["medium"])
            total_difficulty += weight
            awarded = _pick(row, "marksAwarded", "marks_awarded")
            if awarded is not None:
                net_score += _finite(awarded)
            elif row.get("isCorrect") is True:
                net_score += marks
                weighted_correct += weight
            elif row.get("isCorrect") is False:
                neg = _pick(row, "negativeMarks", "negative_marks")
                net_score -= abs(_finite(neg, default=negative_marks))
            if row.get("isCorrect") is True and awarded is not None:
                weighted_correct += weight
            if _question_attempted(row):
                expected_time += _expected_time_for(row, config)
                spent = _pick(row, "actualTimeSeconds", "timeSpent", "seconds")
                if spent not in (None, ""):
                    actual_time += max(0.0, _finite(spent))
                    timed_attempted += 1
        if total_time_seconds not in (None, "") and timed_attempted == 0:
            actual_time = max(0.0, _finite(total_time_seconds))
            timed_attempted = attempted
    else:
        net_score = (correct * correct_marks) - (wrong * negative_marks)
        max_score = total_q * correct_marks
        medium_weight = _finite(config["difficulty"].get("medium"), default=1.5)
        total_difficulty = total_q * medium_weight
        weighted_correct = correct * medium_weight
        expected_time = attempted * _finite(config["expectedTime"].get("medium"), default=90.0)
        actual_time = max(0.0, _finite(total_time_seconds)) if total_time_seconds not in (None, "") else 0.0
        timed_attempted = attempted if total_time_seconds not in (None, "") else 0

    answer_performance = _clamp01(net_score / max_score) if max_score > 0 else 0.0
    difficulty_performance = _clamp01(weighted_correct / total_difficulty) if total_difficulty > 0 else 0.0
    question_coverage = _clamp01(attempted / total_q) if total_q > 0 else 0.0

    if attempted <= 0:
        time_efficiency = 0.0
    elif actual_time <= 0 or not math.isfinite(actual_time):
        # Missing/zero dwell: do not divide by zero, and do not penalize absent telemetry.
        time_efficiency = 1.0 if expected_time > 0 else 0.0
    else:
        time_efficiency = _clamp01(expected_time / actual_time)

    mix = config["weights"]
    composite = (
        _finite(mix.get("answer")) * answer_performance
        + _finite(mix.get("difficulty")) * difficulty_performance
        + _finite(mix.get("time")) * time_efficiency
        + _finite(mix.get("coverage")) * question_coverage
    )
    accuracy = round(_clamp(composite * 100.0, 0.0, 100.0), 2)
    return {
        "accuracy": accuracy,
        "answerPerformance": round(answer_performance, 4),
        "difficultyPerformance": round(difficulty_performance, 4),
        "timeEfficiency": round(time_efficiency, 4),
        "questionCoverage": round(question_coverage, 4),
        "netScore": round(net_score, 2),
    }
