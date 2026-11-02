"""Exam analysis timing: per-question dwell, not the paper timer.

Scoped to analysis_from_attempt / persist helpers so other exam services
keep their own scoring and timer contracts.
"""

from __future__ import annotations

from app.services.examination import _timing_for_persist
from app.services.spa_exams import _question_time_seconds, analysis_from_attempt


def test_question_time_prefers_stored_timing_over_interactions():
    seconds = _question_time_seconds(
        {"timeSpent": 30},
        {"q1": {"timeSpent": 90}},
        "q1",
        1,
    )
    assert seconds == 30


def test_question_time_falls_back_to_interactions_when_timing_empty():
    seconds = _question_time_seconds(
        {},
        {"q1": {"timeSpent": 90}},
        "q1",
        1,
    )
    assert seconds == 90


def test_question_time_does_not_use_bare_attempt_elapsed_seconds():
    seconds = _question_time_seconds(
        {},
        {"elapsedSeconds": 3600},
        "q1",
        1,
    )
    assert seconds == 0


def test_analysis_uses_interaction_time_when_question_timing_empty():
    attempt = {
        "id": "a1",
        "examTitle": "Mock Test",
        "examMode": "University",
        "submittedAt": "2026-01-01T00:00:00",
        "scoring": {"score": 4, "maxScore": 4, "percentage": 100, "correct": 1, "incorrect": 0, "skipped": 0},
        "summary": {},
        "exam": {"durationMinutes": 60, "totalMarks": 4},
        "interactions": {"q1": {"selected": 0, "timeSpent": 90}},
        "questionAttempts": [
            {
                "questionId": "q1",
                "questionNumber": 1,
                "question": {"text": "Q", "marks": 4, "options": ["A", "B"], "type": "MCQ"},
                "academicContext": {"subject": "Physics", "chapter": "Kinematics", "topic": "Motion"},
                "response": {"selected": 0, "status": "answered"},
                "timing": {},
                "behaviour": {},
                "evaluation": {"isCorrect": True, "marks": 4, "correctAnswer": 0},
            }
        ],
    }
    out = analysis_from_attempt(attempt)
    assert out["subjects"][0]["time"] == 1.5
    assert out["questionReview"][0]["time"] == 1.5
    assert out["timeIntelligence"]["avgTimePerQuestion"] == 1.5
    assert out["chapters"][0]["time"] == 1.5
    assert out["topics"][0]["topic"] == "Motion"
    assert out["topics"][0]["chapter"] == "Kinematics"


def test_analysis_keeps_explicit_question_timing():
    attempt = {
        "id": "a2",
        "examTitle": "Mock Test",
        "examMode": "University",
        "submittedAt": "2026-01-01T00:00:00",
        "scoring": {"score": 4, "maxScore": 4, "percentage": 100},
        "summary": {},
        "exam": {"durationMinutes": 60, "totalMarks": 4},
        "interactions": {"q1": {"timeSpent": 90}},
        "questionAttempts": [
            {
                "questionId": "q1",
                "questionNumber": 1,
                "question": {"text": "Q", "marks": 4, "type": "MCQ"},
                "academicContext": {"subject": "Physics", "chapter": "Kinematics", "topic": "Motion"},
                "response": {"selected": 0, "status": "answered"},
                "timing": {"timeSpent": 30},
                "behaviour": {},
                "evaluation": {"isCorrect": True, "marks": 4, "correctAnswer": 0},
            }
        ],
    }
    out = analysis_from_attempt(attempt)
    assert out["questionReview"][0]["time"] == 0.5


def test_persist_copies_interaction_time_only_when_question_timing_missing():
    filled = _timing_for_persist(
        {"questionId": "q1", "timing": {}},
        {},
        {"q1": {"timeSpent": 45, "firstViewedAt": "t0"}},
    )
    assert filled["timeSpent"] == 45
    assert filled["firstViewedAt"] == "t0"

    kept = _timing_for_persist(
        {"questionId": "q1", "timing": {"timeSpent": 12}},
        {"timing": {"timeSpent": 12}},
        {"q1": {"timeSpent": 99}},
    )
    assert kept["timeSpent"] == 12
