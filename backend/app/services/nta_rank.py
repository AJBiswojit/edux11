"""NTA-style JEE / NEET ranking for EduX exam analysis.

National AIR cannot be produced here (EduX has no all-India cohort). These
formulas run on the exam + batch cohort only and feed the analysis dashboard.
Program results, comparison blocks, and other ranking surfaces stay untouched.

JEE Main (NTA session formula):
  Percentile = 100 * (candidates with raw score <= yours) / N, 7 d.p.
  AIR inter-se: total percentile -> Mathematics -> Physics -> Chemistry ->
  lesser incorrect/correct ratios (overall, then Math, Physics, Chemistry).
  Remaining ties share rank.

NEET-UG (NTA merit):
  AIR by total marks, then Biology -> Chemistry -> Physics ->
  lesser incorrect/correct ratios (overall, then Bio, Chem, Physics).
  Remaining ties share rank (no random expert/committee step).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


JEE_SUBJECTS = ("math", "physics", "chemistry")
NEET_SUBJECTS = ("biology", "chemistry", "physics")


@dataclass
class NtaCandidate:
    id: str
    total: float = 0.0
    math: float = 0.0
    physics: float = 0.0
    chemistry: float = 0.0
    biology: float = 0.0
    correct: int = 0
    incorrect: int = 0
    correct_math: int = 0
    incorrect_math: int = 0
    correct_physics: int = 0
    incorrect_physics: int = 0
    correct_chemistry: int = 0
    incorrect_chemistry: int = 0
    correct_biology: int = 0
    incorrect_biology: int = 0
    display: dict[str, float] = field(default_factory=dict)


def bucket_subject(name: str | None) -> str | None:
    """Map a paper subject label onto an NTA bucket."""
    label = str(name or "").strip().lower()
    if not label:
        return None
    if "math" in label:
        return "math"
    if "phys" in label:
        return "physics"
    if "chem" in label:
        return "chemistry"
    if "bio" in label or "botan" in label or "zool" in label:
        return "biology"
    return None


def nta_percentile(raw_score: float, cohort_scores: list[float]) -> float:
    """NTA session percentile, rounded to 7 decimal places."""
    n = len(cohort_scores)
    if n <= 0:
        return 0.0
    le = sum(1 for score in cohort_scores if score <= raw_score)
    return round(100.0 * le / n, 7)


def incorrect_correct_ratio(incorrect: int, correct: int) -> float:
    """Lesser ratio is better. Unanswered-only candidates compare as 0."""
    if correct <= 0:
        return float("inf") if incorrect > 0 else 0.0
    return incorrect / correct


def ranks_from_sort_keys(items: list[tuple[Any, str]]) -> dict[str, int]:
    """Competition ranks: equal keys share a place; the next place skips."""
    ordered = sorted(items, key=lambda item: item[0])
    ranks: dict[str, int] = {}
    prev_key: Any = object()
    prev_rank = 0
    for index, (key, candidate_id) in enumerate(ordered, start=1):
        if key == prev_key:
            ranks[candidate_id] = prev_rank
        else:
            ranks[candidate_id] = index
            prev_rank = index
            prev_key = key
    return ranks


def competition_ranks_from_scores(scores_by_id: dict[str, float]) -> dict[str, int]:
    """1-based ranks from a single score; higher is better; ties share."""
    return ranks_from_sort_keys([(-float(score), cid) for cid, score in scores_by_id.items()])


def _percentiles(scores_by_id: dict[str, float]) -> dict[str, float]:
    cohort = list(scores_by_id.values())
    return {cid: nta_percentile(score, cohort) for cid, score in scores_by_id.items()}


def jee_subject_percentiles(candidates: list[NtaCandidate]) -> dict[str, dict[str, float]]:
    """Per-candidate NTA percentiles for total + JEE subjects."""
    if not candidates:
        return {}
    pct_total = _percentiles({c.id: c.total for c in candidates})
    pct_math = _percentiles({c.id: c.math for c in candidates})
    pct_physics = _percentiles({c.id: c.physics for c in candidates})
    pct_chemistry = _percentiles({c.id: c.chemistry for c in candidates})
    return {
        c.id: {
            "total": pct_total[c.id],
            "math": pct_math[c.id],
            "physics": pct_physics[c.id],
            "chemistry": pct_chemistry[c.id],
        }
        for c in candidates
    }


def jee_air_ranks(candidates: list[NtaCandidate]) -> dict[str, int]:
    """Batch-scoped JEE AIR using NTA percentile inter-se merit."""
    percentiles = jee_subject_percentiles(candidates)
    items = []
    for candidate in candidates:
        pct = percentiles[candidate.id]
        items.append(
            (
                (
                    -pct["total"],
                    -pct["math"],
                    -pct["physics"],
                    -pct["chemistry"],
                    incorrect_correct_ratio(candidate.incorrect, candidate.correct),
                    incorrect_correct_ratio(candidate.incorrect_math, candidate.correct_math),
                    incorrect_correct_ratio(candidate.incorrect_physics, candidate.correct_physics),
                    incorrect_correct_ratio(candidate.incorrect_chemistry, candidate.correct_chemistry),
                ),
                candidate.id,
            )
        )
    return ranks_from_sort_keys(items)


def neet_air_ranks(candidates: list[NtaCandidate]) -> dict[str, int]:
    """Batch-scoped NEET AIR using NTA marks + official tie-breakers."""
    items = []
    for candidate in candidates:
        items.append(
            (
                (
                    -candidate.total,
                    -candidate.biology,
                    -candidate.chemistry,
                    -candidate.physics,
                    incorrect_correct_ratio(candidate.incorrect, candidate.correct),
                    incorrect_correct_ratio(candidate.incorrect_biology, candidate.correct_biology),
                    incorrect_correct_ratio(candidate.incorrect_chemistry, candidate.correct_chemistry),
                    incorrect_correct_ratio(candidate.incorrect_physics, candidate.correct_physics),
                ),
                candidate.id,
            )
        )
    return ranks_from_sort_keys(items)
