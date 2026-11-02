"""NTA-style JEE / NEET ranking formulas (batch-scoped, analysis only)."""

from app.services.nta_rank import (
    NtaCandidate,
    bucket_subject,
    competition_ranks_from_scores,
    incorrect_correct_ratio,
    jee_air_ranks,
    jee_subject_percentiles,
    neet_air_ranks,
    nta_percentile,
    ranks_from_sort_keys,
)


def test_nta_percentile_matches_session_formula():
    cohort = [80.0, 80.0, 40.0]
    assert nta_percentile(80, cohort) == 100.0
    assert nta_percentile(40, cohort) == round(100.0 * 1 / 3, 7)


def test_nta_percentile_seven_decimals():
    cohort = [1.0] * 7 + [0.0]
    assert nta_percentile(0, cohort) == 12.5
    assert nta_percentile(1, cohort) == 100.0


def test_identical_math_marks_share_competition_rank():
    ranks = competition_ranks_from_scores({"a": 40, "b": 40, "c": 40, "d": 40, "e": 40, "f": 20})
    assert ranks["a"] == ranks["b"] == ranks["c"] == ranks["d"] == ranks["e"] == 1
    assert ranks["f"] == 6


def test_bucket_subject_aliases():
    assert bucket_subject("Mathematics") == "math"
    assert bucket_subject("Maths") == "math"
    assert bucket_subject("Zoology") == "biology"
    assert bucket_subject("Botany") == "biology"
    assert bucket_subject("Physics") == "physics"


def test_jee_air_breaks_total_tie_on_math_percentile():
    a = NtaCandidate(id="a", total=80, math=40, physics=20, chemistry=20, correct=3)
    b = NtaCandidate(id="b", total=80, math=20, physics=40, chemistry=20, correct=3)
    c = NtaCandidate(id="c", total=40, math=10, physics=15, chemistry=15, correct=3)
    ranks = jee_air_ranks([a, b, c])
    assert ranks["a"] == 1
    assert ranks["b"] == 2
    assert ranks["c"] == 3
    pct = jee_subject_percentiles([a, b, c])
    assert pct["a"]["total"] == pct["b"]["total"] == 100.0
    assert pct["a"]["math"] > pct["b"]["math"]


def test_jee_air_uses_incorrect_correct_ratio_after_percentiles():
    a = NtaCandidate(id="a", total=60, math=20, physics=20, chemistry=20, correct=3, incorrect=0)
    b = NtaCandidate(id="b", total=60, math=20, physics=20, chemistry=20, correct=3, incorrect=2)
    ranks = jee_air_ranks([a, b])
    assert ranks["a"] == 1
    assert ranks["b"] == 2
    assert incorrect_correct_ratio(0, 3) < incorrect_correct_ratio(2, 3)


def test_jee_air_remaining_ties_share_rank():
    a = NtaCandidate(id="a", total=50, math=20, physics=15, chemistry=15, correct=2, incorrect=1)
    b = NtaCandidate(id="b", total=50, math=20, physics=15, chemistry=15, correct=2, incorrect=1)
    c = NtaCandidate(id="c", total=30, math=10, physics=10, chemistry=10, correct=1, incorrect=1)
    ranks = jee_air_ranks([a, b, c])
    assert ranks["a"] == ranks["b"] == 1
    assert ranks["c"] == 3


def test_neet_air_breaks_total_tie_on_biology():
    a = NtaCandidate(id="a", total=200, biology=80, chemistry=60, physics=60, correct=50, incorrect=5)
    b = NtaCandidate(id="b", total=200, biology=100, chemistry=50, physics=50, correct=50, incorrect=5)
    ranks = neet_air_ranks([a, b])
    assert ranks["b"] == 1
    assert ranks["a"] == 2


def test_neet_air_uses_incorrect_ratio_after_subjects():
    a = NtaCandidate(
        id="a", total=180, biology=80, chemistry=50, physics=50, correct=45, incorrect=5,
        correct_biology=20, incorrect_biology=2,
    )
    b = NtaCandidate(
        id="b", total=180, biology=80, chemistry=50, physics=50, correct=45, incorrect=12,
        correct_biology=20, incorrect_biology=2,
    )
    ranks = neet_air_ranks([a, b])
    assert ranks["a"] == 1
    assert ranks["b"] == 2


def test_ranks_from_sort_keys_skip_after_tie():
    ranks = ranks_from_sort_keys([((1,), "a"), ((1,), "b"), ((2,), "c")])
    assert ranks["a"] == ranks["b"] == 1
    assert ranks["c"] == 3
