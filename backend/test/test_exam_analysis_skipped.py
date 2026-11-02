"""Exam-analysis skip counts follow per-question answers, not the scoring blob.

Scoped to analysis_from_attempt so submit scoring, program results, and other
exam services keep their own contracts. Does not write to the database.
"""

from __future__ import annotations

from app.services.spa_exams import analysis_from_attempt


def _attempt(**kwargs):
    base = {
        "id": "a-skip",
        "examTitle": "JEE Mock",
        "examMode": "Competitive",
        "examFamily": "JEE",
        "submittedAt": "2026-01-01T00:00:00",
        "scoring": {"score": 0, "maxScore": 4, "percentage": 0, "correct": 0, "incorrect": 0, "skipped": 0},
        "summary": {},
        "exam": {"durationMinutes": 60, "totalMarks": 4},
        "interactions": {},
        "questionAttempts": [],
    }
    base.update(kwargs)
    return base


def _qa(*, selected, is_correct, status=None, is_skipped=None, value=None, qn=1, subject="Mathematics", correct_answer=None, negative_marks=1):
    response = {"selected": selected, "value": value}
    if status is not None:
        response["status"] = status
    evaluation = {"isCorrect": is_correct, "marksAwarded": 0.0, "maxMarks": 4.0}
    if is_skipped is not None:
        evaluation["isSkipped"] = is_skipped
    question = {"text": "Q", "marks": 4, "options": ["A", "B", "C", "D"], "type": "MCQ", "negativeMarks": negative_marks}
    if correct_answer is not None:
        question["correctAnswer"] = correct_answer
    return {
        "questionId": f"q{qn}",
        "questionNumber": qn,
        "question": question,
        "academicContext": {"subject": subject, "chapter": "Algebra", "topic": "Inequalities"},
        "response": response,
        "timing": {},
        "behaviour": {},
        "evaluation": evaluation,
    }


def test_answered_option_a_is_not_skipped_when_blob_says_unanswered():
    """selected=0 is a real answer. Missing key left isCorrect null and the
    submit blob counted unanswered=1 — analysis must not copy that skip."""
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 0, "maxScore": 4, "correct": 0, "incorrect": 0, "skipped": 1, "unanswered": 1},
            summary={"skipped": 1},
            questionAttempts=[_qa(selected=0, is_correct=None)],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["skipped"] == 0
    assert qi["attempted"] == 1
    assert qi["incorrect"] == 1
    assert qi["correct"] == 0
    assert out["questionReview"][0]["status"] == "Incorrect"
    assert out["questionReview"][0]["selected"] == 0


def test_genuine_skip_still_counts_as_skipped():
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 0, "maxScore": 4, "correct": 0, "incorrect": 0, "skipped": 1},
            questionAttempts=[_qa(selected=None, is_correct=None, status="skipped", is_skipped=True)],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["skipped"] == 1
    assert qi["attempted"] == 0
    assert out["questionReview"][0]["status"] == "Skipped"


def test_empty_typed_value_is_skipped():
    out = analysis_from_attempt(
        _attempt(
            questionAttempts=[_qa(selected=None, is_correct=None, value="  ")],
        )
    )
    assert out["questionIntelligence"]["skipped"] == 1
    assert out["questionReview"][0]["status"] == "Skipped"


def test_kpi_counts_follow_question_rows_not_disagreeing_blob():
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 8, "maxScore": 12, "correct": 1, "incorrect": 1, "skipped": 1},
            questionAttempts=[
                _qa(selected=1, is_correct=True, status="answered", qn=1, subject="Physics"),
                _qa(selected=2, is_correct=False, status="answered", qn=2, subject="Physics"),
                _qa(selected=0, is_correct=None, qn=3, subject="Mathematics"),
            ],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["attempted"] == 3
    assert qi["correct"] == 1
    assert qi["incorrect"] == 2
    assert qi["skipped"] == 0
    statuses = [row["status"] for row in out["questionReview"]]
    assert statuses == ["Correct", "Incorrect", "Incorrect"]


def test_blob_totals_used_only_when_there_are_no_question_rows():
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 40, "maxScore": 100, "correct": 12, "incorrect": 8, "skipped": 5},
            questionAttempts=[],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["correct"] == 12
    assert qi["incorrect"] == 8
    assert qi["skipped"] == 5
    assert qi["attempted"] == 20


def test_ungraded_mcq_awards_plus_marks_when_key_matches_option_a():
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 0, "maxScore": 4, "correct": 0, "incorrect": 0, "skipped": 1},
            exam={"durationMinutes": 60, "totalMarks": 4, "negativeMarking": True},
            questionAttempts=[_qa(selected=0, is_correct=None, correct_answer="a")],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["skipped"] == 0
    assert qi["correct"] == 1
    assert qi["incorrect"] == 0
    assert qi["attempted"] == 1
    assert out["questionReview"][0]["status"] == "Correct"
    assert out["questionReview"][0]["marks"] == 4
    assert out["hero"]["score"] == 4


def test_ungraded_mcq_deducts_negative_marks_when_option_is_wrong():
    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 0, "maxScore": 4, "correct": 0, "incorrect": 0, "skipped": 1},
            exam={"durationMinutes": 60, "totalMarks": 4, "negativeMarking": True},
            questionAttempts=[_qa(selected=2, is_correct=None, correct_answer="a")],
        )
    )
    qi = out["questionIntelligence"]
    assert qi["skipped"] == 0
    assert qi["correct"] == 0
    assert qi["incorrect"] == 1
    assert out["questionReview"][0]["status"] == "Incorrect"
    assert out["questionReview"][0]["marks"] == -1
    assert out["hero"]["score"] == -1


def test_grade_selected_mcq_plus_four_or_minus_one():
    from app.services.examination import grade_selected_mcq

    assert grade_selected_mcq(0, "a", marks=4, negative_marks=1, negative_marking=True) == (True, 4.0)
    assert grade_selected_mcq(2, "a", marks=4, negative_marks=1, negative_marking=True) == (False, -1.0)
    assert grade_selected_mcq(None, "a", marks=4, negative_marks=1, negative_marking=True) == (None, 0.0)


def test_question_review_includes_hint_for_every_question_right_or_wrong():
    qa_right = _qa(selected=1, is_correct=True, status="answered", qn=1, subject="Physics", correct_answer=1)
    qa_right["question"]["explanation"] = "Use F = ma to find acceleration."
    qa_wrong = _qa(selected=2, is_correct=False, status="answered", qn=2, subject="Chemistry", correct_answer=0)
    qa_wrong["question"]["explanation"] = "Molarity equals moles divided by volume in litres."
    qa_skip = _qa(selected=None, is_correct=None, status="skipped", is_skipped=True, qn=3, subject="Mathematics", correct_answer=3)

    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 3, "maxScore": 12, "correct": 1, "incorrect": 1, "skipped": 1},
            questionAttempts=[qa_right, qa_wrong, qa_skip],
        )
    )
    rows = out["questionReview"]
    assert len(rows) == 3
    assert rows[0]["status"] == "Correct"
    assert rows[0]["hint"] == "Use F = ma to find acceleration."
    assert rows[0]["explanation"] == "Use F = ma to find acceleration."
    assert rows[1]["status"] == "Incorrect"
    assert rows[1]["hint"] == "Molarity equals moles divided by volume in litres."
    assert rows[1]["explanation"] == "Molarity equals moles divided by volume in litres."
    assert rows[1]["mistakeCategory"] is not None
    assert rows[1]["mistakeHint"] is not None
    assert rows[2]["status"] == "Skipped"
    assert rows[2]["hint"]  # fallback hint populated even when explanation is absent


def test_regrade_ungraded_mcq_attempts_awards_marks(db, world):
    import json
    from datetime import datetime, timezone

    from app.models.assessment import Paper, Question
    from app.models.exams import ExamAttempt, ExamQuestionAttempt
    from app.services.examination import regrade_ungraded_mcq_attempts

    now = datetime.now(timezone.utc)
    inst_id = world["inst_a"].id
    student_id = world["student"].id
    question = Question(
        id="q_regrade_empty_key",
        institution_id=inst_id,
        exam_mode="competitive",
        exam_family="jee",
        stem="Inequality?",
        options='["A","B","C","D"]',
        correct_answer="",
        marks=4,
        negative_marks=1,
        q_type="mcq",
        status="approved",
    )
    paper = Paper(
        id="p_regrade_empty_key",
        institution_id=inst_id,
        paper_code="regrade-empty-key",
        title="Regrade Paper",
        exam_mode="competitive",
        exam_family="jee",
        duration_minutes=60,
        total_marks=4,
        negative_marking=True,
        status="published",
    )
    db.add_all([question, paper])
    db.flush()
    attempt = ExamAttempt(
        institution_id=inst_id,
        student_id=student_id,
        roll_no="T001",
        exam_id=paper.id,
        exam_name=paper.title,
        exam_mode="competitive",
        exam_family="jee",
        started_at=now,
        submitted_at=now,
        exam_snapshot="{}",
        timing="{}",
        scoring=json.dumps({"score": 0, "maxScore": 4, "correct": 0, "incorrect": 0, "skipped": 1, "unanswered": 1, "total": 1}),
        summary=json.dumps({"score": 0, "correct": 0, "incorrect": 0, "skipped": 1}),
    )
    db.add(attempt)
    db.flush()
    qa_row = ExamQuestionAttempt(
        attempt_id=attempt.id,
        question_id=question.id,
        question_number=1,
        question_snapshot=json.dumps({"marks": 4, "type": "MCQ"}),
        academic_context=json.dumps({"subject": "Mathematics"}),
        response=json.dumps({"selected": 0}),
        timing="{}",
        behaviour="{}",
        evaluation=json.dumps({"isCorrect": None, "marksAwarded": 0.0, "maxMarks": 4.0}),
    )
    db.add(qa_row)
    db.flush()
    try:
        assert regrade_ungraded_mcq_attempts(db)["rows"] == 0

        question.correct_answer = "a"
        db.flush()
        stats = regrade_ungraded_mcq_attempts(db)
        assert stats["rows"] == 1
        assert stats["correct"] == 1
        db.refresh(attempt)
        scoring = json.loads(attempt.scoring)
        assert scoring["score"] == 4
        assert scoring["correct"] == 1
        assert scoring["skipped"] == 0
        db.refresh(qa_row)
        ev = json.loads(qa_row.evaluation)
        assert ev["isCorrect"] is True
        assert ev["marksAwarded"] == 4.0
    finally:
        db.query(ExamQuestionAttempt).filter_by(attempt_id=attempt.id).delete()
        db.query(ExamAttempt).filter_by(id=attempt.id).delete()
        db.query(Paper).filter_by(id=paper.id).delete()
        db.query(Question).filter_by(id=question.id).delete()
        db.commit()


def test_grade_fill_in_blank_tolerates_units_and_decimal_rounding():
    from app.services.examination import grade_fill_in_blank

    # Unit suffixes
    assert grade_fill_in_blank("18", "18 S") is True
    assert grade_fill_in_blank("18", "18s") is True
    assert grade_fill_in_blank("18", "18 m/s") is True
    assert grade_fill_in_blank("18 S", "18") is True

    # Decimal rounding & tolerance (1.16 / 1.66 / 1.56 vs 1.6)
    assert grade_fill_in_blank("1.6", "1.16") is True
    assert grade_fill_in_blank("1.6", "1.66") is True
    assert grade_fill_in_blank("1.6", "1.56") is True
    assert grade_fill_in_blank("1.6", "1.16 S") is True

    # Distinct wrong answers must still fail
    assert grade_fill_in_blank("18", "19") is False
    assert grade_fill_in_blank("1.6", "1.3") is False
    assert grade_fill_in_blank("2.25", "2.75") is False


def test_fill_in_blank_has_no_negative_marking_in_analysis_and_scoring():
    from app.exam_engine.catalog import JEE_MAIN_2026
    from app.exam_engine.scoring import tally_questions

    qa_fib_wrong = _qa(
        selected=None,
        value="99",
        is_correct=False,
        status="answered",
        qn=1,
        subject="Physics",
        correct_answer="18",
        negative_marks=1,
    )
    qa_fib_wrong["question"]["type"] = "Fill in the Blank"
    qa_fib_wrong["question"]["qType"] = "fill_in_the_blank"
    qa_fib_wrong["question"]["options"] = None
    qa_fib_wrong["evaluation"]["marksAwarded"] = -1.0

    qa_fib_unit_right = _qa(
        selected=None,
        value="18 S",
        is_correct=False,
        status="answered",
        qn=2,
        subject="Physics",
        correct_answer="18",
        negative_marks=1,
    )
    qa_fib_unit_right["question"]["type"] = "Fill in the Blank"
    qa_fib_unit_right["question"]["qType"] = "fill_in_the_blank"
    qa_fib_unit_right["question"]["options"] = None

    qa_mcq_wrong = _qa(
        selected=2,
        is_correct=False,
        status="answered",
        qn=3,
        subject="Chemistry",
        correct_answer=0,
        negative_marks=1,
    )
    qa_mcq_wrong["evaluation"]["marksAwarded"] = -1.0

    out = analysis_from_attempt(
        _attempt(
            scoring={"score": 0, "maxScore": 12, "correct": 0, "incorrect": 3, "skipped": 0},
            exam={"durationMinutes": 60, "totalMarks": 12, "negativeMarking": True},
            questionAttempts=[qa_fib_wrong, qa_fib_unit_right, qa_mcq_wrong],
        )
    )
    rows = out["questionReview"]
    # Q1: wrong FIB -> 0 marks (no negative marking)
    assert rows[0]["status"] == "Incorrect"
    assert rows[0]["marks"] == 0
    # Q2: "18 S" vs "18" -> Correct (+4 marks)
    assert rows[1]["status"] == "Correct"
    assert rows[1]["marks"] == 4
    # Q3: wrong MCQ -> -1 mark
    assert rows[2]["status"] == "Incorrect"
    assert rows[2]["marks"] == -1
    # Total score = 0 + 4 - 1 = 3, negative marks = 1 (only from MCQ)
    assert out["hero"]["score"] == 3
    assert out["questionIntelligence"]["negativeMarks"] == 1

    # Also verify exam_engine.scoring.tally_questions
    tally = tally_questions([qa_fib_wrong, qa_fib_unit_right, qa_mcq_wrong], JEE_MAIN_2026)
    assert tally["nca"] == 1
    assert tally["nwa"] == 2
    assert tally["total"] == 3.0
    assert tally["subjects"]["PHY"]["score"] == 4.0
    assert tally["subjects"]["CHM"]["score"] == -1.0


