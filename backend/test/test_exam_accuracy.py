"""EduX multi-factor exam accuracy — isolated from official marks scoring."""

from __future__ import annotations

from types import SimpleNamespace

from app.exam_engine.accuracy import (
    DEFAULT_EXAM_ACCURACY_CONFIG,
    calculate_exam_accuracy,
    exam_accuracy_config_for_paper,
    questions_from_scored_details,
)

JEE_MARKING = {"correct": 4, "negative": 1}


def _result(**kwargs):
    return calculate_exam_accuracy(**kwargs)


def test_config_is_not_exam_family_hardcoded():
    assert DEFAULT_EXAM_ACCURACY_CONFIG["marking"]["correct"] == 1.0
    assert DEFAULT_EXAM_ACCURACY_CONFIG["marking"]["negative"] == 0.0
    paper = SimpleNamespace(negative_marking=True)
    details = [
        {"question": {"marks": 4, "negativeMarks": 1}, "evaluation": {"maxMarks": 4}},
        {"question": {"marks": 4, "negativeMarks": 1}, "evaluation": {"maxMarks": 4}},
    ]
    config = exam_accuracy_config_for_paper(paper, details)
    assert config["marking"]["correct"] == 4
    assert config["marking"]["negative"] == 1
    uni = exam_accuracy_config_for_paper(SimpleNamespace(negative_marking=False), [
        {"question": {"marks": 2, "negativeMarks": 0}, "evaluation": {"maxMarks": 2}},
    ])
    assert uni["marking"]["correct"] == 2
    assert uni["marking"]["negative"] == 0


def test_case_a_low_attempt_is_not_100():
    result = _result(
        correct_answers=3,
        wrong_answers=0,
        attempted_questions=3,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    assert result["accuracy"] != 100
    assert result["questionCoverage"] == 0.03
    assert result["answerPerformance"] == 0.03
    assert result["accuracy"] == 17.55


def test_case_b_mixed_performance_components():
    result = _result(
        correct_answers=60,
        wrong_answers=20,
        attempted_questions=80,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    assert result["netScore"] == 220
    assert result["answerPerformance"] == 0.55
    assert result["difficultyPerformance"] == 0.6
    assert result["questionCoverage"] == 0.8
    assert result["timeEfficiency"] == 1.0
    assert result["accuracy"] == 66.5


def test_case_c_strong_performance():
    result = _result(
        correct_answers=75,
        wrong_answers=15,
        attempted_questions=90,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    assert result["netScore"] == 285
    assert result["answerPerformance"] == 0.7125
    assert result["questionCoverage"] == 0.9
    assert result["accuracy"] == 79.13


def test_case_d_all_wrong_answer_and_difficulty_are_zero():
    result = _result(
        correct_answers=0,
        wrong_answers=100,
        attempted_questions=100,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    assert result["netScore"] == -100
    assert result["answerPerformance"] == 0
    assert result["difficultyPerformance"] == 0
    assert result["questionCoverage"] == 1
    # Coverage/time still mix in; the old correct/attempted formula would be 0.
    assert result["accuracy"] == 30.0


def test_case_e_all_correct_is_100():
    result = _result(
        correct_answers=100,
        wrong_answers=0,
        attempted_questions=100,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    assert result["answerPerformance"] == 1
    assert result["difficultyPerformance"] == 1
    assert result["questionCoverage"] == 1
    assert result["accuracy"] == 100


def test_published_weights_are_used():
    mix = calculate_exam_accuracy(
        correct_answers=60,
        wrong_answers=20,
        attempted_questions=80,
        total_questions=100,
        marking_scheme=JEE_MARKING,
        weights={"answer": 0.50, "difficulty": 0.20, "time": 0.15, "coverage": 0.15},
    )
    # 100 * (0.50*0.55 + 0.20*0.60 + 0.15*1.0 + 0.15*0.80) = 66.5
    assert mix["accuracy"] == 66.5


def test_edge_cases_never_nan():
    empty = calculate_exam_accuracy(questions=[], total_questions=0)
    assert empty["accuracy"] == 0
    none_attempted = calculate_exam_accuracy(
        correct_answers=0, wrong_answers=0, attempted_questions=0, total_questions=10, marking_scheme=JEE_MARKING
    )
    assert none_attempted["accuracy"] == 0
    missing = calculate_exam_accuracy(
        questions=[{"isCorrect": True}, {"isCorrect": False, "difficulty": None, "actualTimeSeconds": None}],
        marking_scheme=JEE_MARKING,
    )
    assert 0 <= missing["accuracy"] <= 100
    zero_time = calculate_exam_accuracy(
        questions=[{"isCorrect": True, "actualTimeSeconds": 0, "difficulty": "easy"}],
        marking_scheme=JEE_MARKING,
    )
    assert zero_time["timeEfficiency"] == 1
    invalid = calculate_exam_accuracy(questions=[None, "bad", {}], marking_scheme=JEE_MARKING)
    assert invalid["accuracy"] >= 0


def test_custom_weights_change_result_without_formula_change():
    kwargs = dict(
        correct_answers=60,
        wrong_answers=20,
        attempted_questions=80,
        total_questions=100,
        marking_scheme=JEE_MARKING,
    )
    default = calculate_exam_accuracy(**kwargs)
    coverage_first = calculate_exam_accuracy(**kwargs, weights={"answer": 0, "difficulty": 0, "time": 0, "coverage": 1})
    assert coverage_first["accuracy"] == 80
    assert default["accuracy"] != coverage_first["accuracy"]


def test_time_efficiency_clamps_when_faster_than_expected():
    questions = [
        {"isCorrect": True, "difficulty": "easy", "actualTimeSeconds": 10, "expectedTimeSeconds": 60, "marks": 4},
        {"isCorrect": True, "difficulty": "easy", "actualTimeSeconds": 10, "expectedTimeSeconds": 60, "marks": 4},
    ]
    result = calculate_exam_accuracy(questions=questions, marking_scheme=JEE_MARKING)
    assert result["timeEfficiency"] == 1


def test_unattempted_does_not_boost_difficulty():
    questions = [
        {"isCorrect": True, "difficulty": "hard", "marks": 4},
        {"isCorrect": None, "attempted": False, "difficulty": "easy", "marks": 4},
    ]
    result = calculate_exam_accuracy(questions=questions, marking_scheme=JEE_MARKING)
    assert result["difficultyPerformance"] == round(2.0 / (2.0 + 1.0), 4)


def test_questions_from_scored_details_and_paper_config():
    details = [
        {
            "question": {"difficulty": "Hard", "marks": 4, "negativeMarks": 1},
            "evaluation": {"isCorrect": True, "isSkipped": False, "marksAwarded": 4, "maxMarks": 4},
            "timing": {"timeSpent": 40},
        },
        {
            "question": {"difficulty": "Easy", "marks": 4, "negativeMarks": 1},
            "evaluation": {"isCorrect": False, "isSkipped": False, "marksAwarded": -1, "maxMarks": 4},
            "timing": {"timeSpent": 90},
        },
        {
            "question": {"difficulty": "Medium", "marks": 4, "negativeMarks": 1},
            "evaluation": {"isCorrect": None, "isSkipped": True, "marksAwarded": 0, "maxMarks": 4},
            "timing": {},
        },
    ]
    paper = SimpleNamespace(negative_marking=True)
    result = calculate_exam_accuracy(
        questions=questions_from_scored_details(details),
        exam_config=exam_accuracy_config_for_paper(paper, details),
    )
    assert result["netScore"] == 3
    assert result["questionCoverage"] == round(2 / 3, 4)
    assert 0 < result["accuracy"] < 100
