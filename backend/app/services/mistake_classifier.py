"""Rule-based mistake analysis engine.

Classifies an incorrect answer into one of seven error categories and returns
a short, student-facing hint explaining *why* that category was chosen.

Categories
----------
Conceptual Error        – Student understands the procedure but has the
                          underlying concept wrong (e.g. confused formula
                          definitions, wrong law applied).
Calculation Error       – Correct approach, arithmetic/algebra slip (typically
                          fast wrong answers on numerical questions).
Formula Error           – Wrong formula used or a formula mis-recalled/applied
                          (numeric/Apply-level Bloom in STEM subjects).
Question Interpretation Error – Student solved a different (often simpler)
                          version of the question; misread what was asked.
Unit Error              – Answer is conceptually and numerically correct except
                          for the unit / dimension (common in Physics/Chemistry).
Knowledge Gap           – Student genuinely does not know the material; slow,
                          possibly guessed, hard question.
Incomplete Reasoning    – Student started correctly but did not carry the
                          reasoning through to the final step (partial work,
                          multi-step questions).

Signal sources (all optional — engine degrades gracefully when absent)
----------------------------------------------------------------------
  subject          str   e.g. "Physics", "Mathematics"
  topic            str   e.g. "Kinematics"
  chapter          str
  difficulty       str   "Easy" | "Medium" | "Hard"
  bloom            str   Bloom's taxonomy level from the Question model
  q_type           str   "mcq" | "fill_in_the_blank" | ...
  is_fib           bool  True when q_type is fill-in-the-blank
  time_seconds     float seconds the student spent on this question
  median_time_sec  float median time across *all answered* questions this exam
  is_guess         bool  student flagged as a guess
  selected         any   0-based index or string of chosen answer
  correct_answer   any   0-based index or string of correct answer
  option_count     int   number of options available (default 4)
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Public constants — the seven category labels
# ---------------------------------------------------------------------------

CAT_CONCEPTUAL = "Conceptual Error"
CAT_CALCULATION = "Calculation Error"
CAT_FORMULA = "Formula Error"
CAT_INTERPRETATION = "Question Interpretation Error"
CAT_UNIT = "Unit Error"
CAT_KNOWLEDGE_GAP = "Knowledge Gap"
CAT_INCOMPLETE = "Incomplete Reasoning"

ALL_CATEGORIES = (
    CAT_CONCEPTUAL,
    CAT_CALCULATION,
    CAT_FORMULA,
    CAT_INTERPRETATION,
    CAT_UNIT,
    CAT_KNOWLEDGE_GAP,
    CAT_INCOMPLETE,
)

# ---------------------------------------------------------------------------
# Subject / topic vocabulary used by the rule engine
# ---------------------------------------------------------------------------

# Subjects where unit errors are frequent
_UNIT_HEAVY_SUBJECTS: frozenset[str] = frozenset(
    {"physics", "chemistry", "physical chemistry", "engineering", "mechanics",
     "thermodynamics", "electrostatics", "electromagnetism", "optics",
     "fluid mechanics", "heat transfer"}
)

# Topics / keywords that strongly suggest formula usage
_FORMULA_KEYWORDS: tuple[str, ...] = (
    "formula", "law", "theorem", "equation", "principle", "rule",
    "derivation", "expression", "relation", "identity",
    # common topic fragments
    "ohm", "faraday", "newton", "boyle", "charles", "bernoulli",
    "kirchhoff", "snell", "gauss", "ampere", "coulomb",
    "integration", "differentiation", "derivative", "integral",
    "binomial", "trigonometr", "trigonometry", "logarithm",
    "quadratic", "determinant", "matrix", "vector", "coordinate",
    "probability", "permutation", "combination",
    "stoichiometry", "molarity", "molality", "concentration",
    "kinematics", "dynamics", "momentum", "energy", "work", "power",
    "wave", "oscillation", "resonance", "doppler",
    "periodic table", "oxidation", "reduction", "balancing",
)

# Topics / keywords where interpretation mistakes are common
_INTERPRETATION_KEYWORDS: tuple[str, ...] = (
    "application", "word problem", "scenario", "data interpretation",
    "passage", "comprehension", "assertion", "reason",
    "match the following", "matching", "sequence", "order", "arrange",
    "statement", "exception", "incorrect", "not correct",
    "except", "which of the following is not",
)

# Subjects where conceptual errors dominate (theory-heavy)
_THEORY_SUBJECTS: frozenset[str] = frozenset(
    {"biology", "zoology", "botany", "history", "geography", "civics",
     "political science", "economics", "sociology", "psychology",
     "english", "literature", "philosophy",
     "computer science", "programming", "data structures", "algorithms",
     "accounting", "business studies", "commerce",
     "environmental science", "general studies"}
)

# Bloom's levels that indicate formula / application vs recall
_BLOOM_APPLICATION: frozenset[str] = frozenset(
    {"apply", "application", "analyze", "analysis", "evaluate", "evaluation",
     "create", "synthesis", "synthesize"}
)
_BLOOM_RECALL: frozenset[str] = frozenset(
    {"remember", "recall", "memorize", "memorization", "knowledge",
     "understand", "understanding", "comprehension", "comprehend"}
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise(value: Any) -> str:
    """Lower-case string; empty string when None."""
    if value is None:
        return ""
    return str(value).strip().lower()


def _contains_any(text: str, keywords: tuple[str, ...] | frozenset[str]) -> bool:
    for kw in keywords:
        if kw in text:
            return True
    return False


def _answer_distance(selected: Any, correct: Any, option_count: int) -> int | None:
    """Return the absolute index distance between chosen and correct MCQ option.

    Returns None when either value cannot be resolved to an integer index.
    A distance of 1 means adjacent options — often a sign of a near-miss or
    unit / sign error rather than a full conceptual misunderstanding.
    """
    try:
        s = int(selected)
        c = int(correct)
        if 0 <= s < option_count and 0 <= c < option_count:
            return abs(s - c)
    except (TypeError, ValueError):
        pass
    return None


def _is_numeric_subject(subject_norm: str, topic_norm: str, chapter_norm: str) -> bool:
    """True when the question is likely to involve numerical computation."""
    numeric_subjects = frozenset(
        {"mathematics", "maths", "math", "physics", "chemistry",
         "statistics", "accountancy", "accounting", "economics",
         "engineering mathematics", "quantitative aptitude", "engineering"}
    )
    numeric_topics = (
        "calculat", "numer", "arithmet", "algebra", "equation",
        "integral", "differentiat", "solv", "find the value",
        "compute", "evaluat", "simplif",
    )
    if _contains_any(subject_norm, numeric_subjects):
        return True
    combined = f"{topic_norm} {chapter_norm}"
    if _contains_any(combined, numeric_topics):
        return True
    return False


def _is_multi_step(topic_norm: str, chapter_norm: str) -> bool:
    """True when the topic/chapter typically requires multi-step reasoning."""
    multi_step_tokens = (
        "proof", "derivation", "problem solving", "application",
        "multi-step", "multistep", "complex", "combined",
        "system of", "simultaneous", "circuit", "network",
        "reaction mechanism", "organic", "synthesis",
        "paragraph", "passage", "comprehension", "case study",
    )
    combined = f"{topic_norm} {chapter_norm}"
    return _contains_any(combined, multi_step_tokens)


# ---------------------------------------------------------------------------
# Score computation — each rule adds or subtracts a weighted score for each
# category.  The category with the highest score wins.
# ---------------------------------------------------------------------------

def _score_categories(
    *,
    subject: str | None,
    topic: str | None,
    chapter: str | None,
    difficulty: str | None,
    bloom: str | None,
    q_type: str | None,
    is_fib: bool,
    time_seconds: float,
    median_time_sec: float,
    is_guess: bool,
    selected: Any,
    correct_answer: Any,
    option_count: int,
) -> dict[str, float]:
    """Return a score dict for each category (higher = more likely)."""

    scores: dict[str, float] = {cat: 0.0 for cat in ALL_CATEGORIES}

    # Normalised signals
    sub_n = _normalise(subject)
    top_n = _normalise(topic)
    chap_n = _normalise(chapter)
    diff_n = _normalise(difficulty)   # "easy" | "medium" | "hard"
    bloom_n = _normalise(bloom)

    is_numeric = _is_numeric_subject(sub_n, top_n, chap_n)
    is_theory = _contains_any(sub_n, _THEORY_SUBJECTS)
    is_unit_heavy = _contains_any(sub_n, _UNIT_HEAVY_SUBJECTS)
    is_multi = _is_multi_step(top_n, chap_n)

    # Time signals (relative to median)
    # Guard: treat 0 / missing as "unknown"
    has_time = time_seconds > 0 and median_time_sec > 0
    if has_time:
        time_ratio = time_seconds / median_time_sec   # <1 = fast, >1 = slow
    else:
        time_ratio = 1.0   # neutral

    fast = has_time and time_ratio < 0.6   # spent less than 60 % of median
    slow = has_time and time_ratio > 1.6   # spent more than 160 % of median

    # Option distance
    distance = _answer_distance(selected, correct_answer, option_count)

    # -----------------------------------------------------------------------
    # Rule 1 — KNOWLEDGE GAP
    #   Hard question + slow + no guess flag + (theory or recall-level Bloom)
    # -----------------------------------------------------------------------
    if diff_n == "hard":
        scores[CAT_KNOWLEDGE_GAP] += 3.0
    if diff_n == "medium" and slow:
        scores[CAT_KNOWLEDGE_GAP] += 1.5
    if slow:
        scores[CAT_KNOWLEDGE_GAP] += 2.0
    if is_theory and diff_n in ("medium", "hard"):
        scores[CAT_KNOWLEDGE_GAP] += 1.0
    if bloom_n and _contains_any(bloom_n, _BLOOM_RECALL):
        scores[CAT_KNOWLEDGE_GAP] += 1.0
    # Guess + hard → knowledge gap, not just a careless slip
    if is_guess and diff_n == "hard":
        scores[CAT_KNOWLEDGE_GAP] += 2.0

    # -----------------------------------------------------------------------
    # Rule 2 — CALCULATION ERROR
    #   Numeric subject + fast (or medium speed) + not a guess
    #   The idea: student knew how to approach but made an arithmetic slip.
    # -----------------------------------------------------------------------
    if is_numeric and not is_guess:
        scores[CAT_CALCULATION] += 2.0
    if fast and is_numeric:
        scores[CAT_CALCULATION] += 2.5
    if is_numeric and diff_n == "easy":
        scores[CAT_CALCULATION] += 1.5   # easy numeric wrong = likely a slip
    if is_numeric and diff_n == "medium" and not slow:
        scores[CAT_CALCULATION] += 1.0
    # Adjacent option (distance 1) in a numeric MCQ often = sign/factor error
    if distance == 1 and is_numeric:
        scores[CAT_CALCULATION] += 1.5

    # -----------------------------------------------------------------------
    # Rule 3 — FORMULA ERROR
    #   Formula-keyword topic/chapter + numeric + (Apply/Analyze Bloom)
    # -----------------------------------------------------------------------
    combined_text = f"{top_n} {chap_n}"
    if _contains_any(combined_text, _FORMULA_KEYWORDS):
        scores[CAT_FORMULA] += 2.5
    if is_numeric and bloom_n and _contains_any(bloom_n, _BLOOM_APPLICATION):
        scores[CAT_FORMULA] += 2.0
    if is_unit_heavy and is_numeric and not fast:
        scores[CAT_FORMULA] += 1.0
    # Wrong formula → typically a medium-speed mistake (not too fast, not too slow)
    if has_time and 0.7 <= time_ratio <= 1.8 and is_numeric:
        scores[CAT_FORMULA] += 1.0

    # -----------------------------------------------------------------------
    # Rule 4 — UNIT ERROR
    #   Physics/Chemistry + numeric + distance 1 in MCQ (close option chosen)
    #   Unit errors produce an answer that is numerically "near" the correct one.
    # -----------------------------------------------------------------------
    if is_unit_heavy and is_numeric:
        scores[CAT_UNIT] += 1.5
    if distance == 1 and is_unit_heavy:
        scores[CAT_UNIT] += 2.5
    if distance is not None and distance <= 2 and is_unit_heavy and is_numeric:
        scores[CAT_UNIT] += 1.5
    # FIB in a unit-heavy subject: off-by-factor answers are common
    if is_fib and is_unit_heavy:
        scores[CAT_UNIT] += 2.0

    # -----------------------------------------------------------------------
    # Rule 5 — QUESTION INTERPRETATION ERROR
    #   Interpretation-keyword in topic + not guess + not very slow
    #   Also: answered very fast on a medium/hard question (misread what was asked)
    # -----------------------------------------------------------------------
    if _contains_any(combined_text, _INTERPRETATION_KEYWORDS):
        scores[CAT_INTERPRETATION] += 2.5
    if fast and diff_n in ("medium", "hard") and not is_guess:
        scores[CAT_INTERPRETATION] += 2.0
    # Distance == 0 for MCQ is impossible (they'd be correct); distance == option_count-1
    # (completely opposite option) often means the student answered the negation.
    if distance is not None and distance == option_count - 1:
        scores[CAT_INTERPRETATION] += 2.0
    if has_time and time_ratio < 0.4:   # extremely fast = almost certainly misread
        scores[CAT_INTERPRETATION] += 1.5

    # -----------------------------------------------------------------------
    # Rule 6 — INCOMPLETE REASONING
    #   Multi-step topic + slow + not guess + medium/hard
    # -----------------------------------------------------------------------
    if is_multi:
        scores[CAT_INCOMPLETE] += 2.0
    if is_multi and slow:
        scores[CAT_INCOMPLETE] += 2.0
    if is_multi and diff_n in ("medium", "hard") and not is_guess:
        scores[CAT_INCOMPLETE] += 1.5
    if is_numeric and is_multi and slow:
        scores[CAT_INCOMPLETE] += 1.0

    # -----------------------------------------------------------------------
    # Rule 7 — CONCEPTUAL ERROR
    #   Theory subject + recall-bloom + not fast (not a careless slip)
    #   Also a fallback for theory subjects where no other rule fires strongly.
    # -----------------------------------------------------------------------
    if is_theory:
        scores[CAT_CONCEPTUAL] += 2.0
    if bloom_n and _contains_any(bloom_n, _BLOOM_RECALL):
        scores[CAT_CONCEPTUAL] += 1.5
    if not is_numeric and not fast and not is_guess:
        scores[CAT_CONCEPTUAL] += 1.5
    if diff_n == "medium" and not fast and not slow and not is_numeric:
        scores[CAT_CONCEPTUAL] += 1.0
    # When a student chose the "opposite" option in a theory subject, they likely
    # had the concept inverted.
    if distance is not None and distance == option_count - 1 and is_theory:
        scores[CAT_CONCEPTUAL] += 2.0

    # -----------------------------------------------------------------------
    # Tiebreaker boosts: de-conflict similar scores
    # -----------------------------------------------------------------------

    # Guess flag → prefer Knowledge Gap over Calculation/Formula
    if is_guess:
        scores[CAT_KNOWLEDGE_GAP] += 1.0
        scores[CAT_CALCULATION] -= 1.0
        scores[CAT_FORMULA] -= 0.5

    # Very easy question answered wrongly → Calculation slip or misread (not gap)
    if diff_n == "easy" and not is_guess:
        scores[CAT_KNOWLEDGE_GAP] -= 2.0
        scores[CAT_CALCULATION] += 0.5
        scores[CAT_INTERPRETATION] += 0.5

    # FIB questions: unit errors and calculation errors are most common; conceptual
    # errors are harder to infer without seeing what the student typed.
    if is_fib:
        scores[CAT_FORMULA] += 0.5
        scores[CAT_CALCULATION] += 0.5
        scores[CAT_CONCEPTUAL] -= 0.5

    return scores


# ---------------------------------------------------------------------------
# Hint builder — one actionable sentence per category
# ---------------------------------------------------------------------------

_HINTS: dict[str, str] = {
    CAT_CONCEPTUAL: (
        "Review the underlying concept — the core idea behind this topic seems "
        "unclear. Re-read the definition and work through examples before retrying."
    ),
    CAT_CALCULATION: (
        "Your approach looks right but a computational slip derailed the answer. "
        "Double-check each arithmetic step and watch for sign/factor errors."
    ),
    CAT_FORMULA: (
        "The wrong formula or relationship was applied here. Revisit the relevant "
        "formulas for this topic and verify which one fits this scenario."
    ),
    CAT_INTERPRETATION: (
        "It appears the question was misread or answered for a slightly different "
        "scenario. Re-read the question carefully — note any 'not', 'except', or "
        "negation words."
    ),
    CAT_UNIT: (
        "The numerical approach is likely correct but the unit or scale used in "
        "the final step is off. Verify unit conversions and dimensional consistency."
    ),
    CAT_KNOWLEDGE_GAP: (
        "This topic needs more study time. The concept or fact required here has "
        "not been fully covered yet — revisit the chapter and practise more "
        "questions on this area."
    ),
    CAT_INCOMPLETE: (
        "The reasoning started correctly but stopped short of the final answer. "
        "Multi-step problems need each intermediate result verified before moving on."
    ),
}


def _build_hint(
    category: str,
    *,
    subject: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
) -> str:
    """Return the base hint for a category, optionally personalised with context."""
    base = _HINTS.get(category, "Review this question and understand why the correct answer is right.")
    # Append a light contextual note when useful
    if topic:
        topic_str = str(topic).strip()
        if category == CAT_KNOWLEDGE_GAP and topic_str:
            return f"{base} Focus specifically on: {topic_str}."
        if category in (CAT_FORMULA, CAT_CALCULATION) and topic_str:
            return f"{base} Topic: {topic_str}."
    return base


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_mistake(
    *,
    subject: str | None = None,
    topic: str | None = None,
    chapter: str | None = None,
    difficulty: str | None = None,
    bloom: str | None = None,
    q_type: str | None = None,
    is_fib: bool = False,
    time_seconds: float = 0.0,
    median_time_sec: float = 0.0,
    is_guess: bool = False,
    selected: Any = None,
    correct_answer: Any = None,
    option_count: int = 4,
) -> tuple[str, str]:
    """Classify an incorrect answer and return (category, hint).

    Parameters
    ----------
    subject, topic, chapter : str or None
        Academic context from the question's academicContext / snapshot.
    difficulty : "Easy" | "Medium" | "Hard" or None
    bloom : Bloom's taxonomy level string or None (from Question.bloom)
    q_type : question type string (e.g. "mcq", "fill_in_the_blank")
    is_fib : True when the question is a fill-in-the-blank type
    time_seconds : seconds spent on this question (0 = unknown)
    median_time_sec : median seconds across all answered questions this attempt
    is_guess : True when the student flagged the answer as a guess
    selected : the student's selected option index (0-based int) or answer string
    correct_answer : the correct option index or answer string
    option_count : number of options in the MCQ (default 4)

    Returns
    -------
    (category_label, hint_string)
    """
    scores = _score_categories(
        subject=subject,
        topic=topic,
        chapter=chapter,
        difficulty=difficulty,
        bloom=bloom,
        q_type=q_type,
        is_fib=is_fib,
        time_seconds=time_seconds,
        median_time_sec=median_time_sec,
        is_guess=is_guess,
        selected=selected,
        correct_answer=correct_answer,
        option_count=option_count,
    )

    # Pick the category with the highest score; break ties with the order of ALL_CATEGORIES
    best_cat = max(ALL_CATEGORIES, key=lambda c: scores[c])

    # Safety: if best score is 0 or negative, fall back to Conceptual Error
    if scores[best_cat] <= 0:
        best_cat = CAT_CONCEPTUAL

    hint = _build_hint(best_cat, subject=subject, topic=topic, difficulty=difficulty)
    return best_cat, hint


def classify_mistake_from_qa(
    qa: dict,
    *,
    median_time_sec: float = 0.0,
    db_question: Any = None,
) -> tuple[str, str]:
    """Convenience wrapper that accepts the raw questionAttempt dict from
    ``attempt_to_dict`` / ``analysis_from_attempt``.

    Parameters
    ----------
    qa : dict
        One entry from ``attempt["questionAttempts"]`` — must contain the
        ``academicContext``, ``question`` (snapshot), ``evaluation``,
        ``response``, ``timing``, and ``behaviour`` sub-dicts.
    median_time_sec : float
        Median time (seconds) across all answered questions for this attempt.
        Compute *before* calling this for each question.
    db_question : Question model instance or None
        The live Question ORM row for this question.  When supplied, bloom-level
        is read from ``db_question.bloom``; otherwise it is read from the snapshot.
    """
    ctx = qa.get("academicContext") or {}
    qsnap = qa.get("question") or {}
    ev = qa.get("evaluation") or {}
    timing_d = qa.get("timing") or {}
    behaviour = qa.get("behaviour") or {}
    response = qa.get("response") or {}

    subject = ctx.get("subject") or qsnap.get("subject")
    topic = ctx.get("topic") or qsnap.get("topic")
    chapter = ctx.get("chapter") or qsnap.get("chapter")
    difficulty = (ctx.get("difficulty") or qsnap.get("difficulty") or "Medium")

    bloom = qsnap.get("bloom") or qsnap.get("bloomLevel")
    if bloom is None and db_question is not None:
        bloom = getattr(db_question, "bloom", None)

    q_type = qsnap.get("type") or qsnap.get("qType") or ctx.get("type") or "mcq"

    # is_fib — inline heuristic matching examination.is_fill_in_blank_type()
    # (avoids importing examination.py which pulls the full app/DB stack)
    _q_type_norm = str(q_type or "").strip().lower().replace("-", "_").replace(" ", "_")
    is_fib = _q_type_norm in {"fill_in_the_blank", "fill_in_blank", "fib"} or "fill_in" in _q_type_norm

    # Time spent (seconds)
    time_seconds = float(
        timing_d.get("timeSpent")
        or timing_d.get("seconds")
        or timing_d.get("elapsedSeconds")
        or timing_d.get("time")
        or 0
    )

    is_guess = bool(
        behaviour.get("guess")
        or behaviour.get("guessed")
        or behaviour.get("isGuess")
    )

    selected = (
        response.get("selected")
        if response.get("selected") is not None
        else response.get("value")
    )
    correct_answer = ev.get("correctAnswer") or ev.get("correct_answer")

    # Option count from snapshot
    options = qsnap.get("options") or []
    option_count = len(options) if isinstance(options, list) and options else 4

    return classify_mistake(
        subject=subject,
        topic=topic,
        chapter=chapter,
        difficulty=difficulty,
        bloom=bloom,
        q_type=q_type,
        is_fib=is_fib,
        time_seconds=time_seconds,
        median_time_sec=median_time_sec,
        is_guess=is_guess,
        selected=selected,
        correct_answer=correct_answer,
        option_count=option_count,
    )
