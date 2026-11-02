"""Phase G — seeded question data physically removed from backend SPA data.

Proves (FRONTEND/BACKEND-SEEDED-QUESTION-REMOVAL acceptance):

1. Seed source documents contain no seeded question records.
2. Question-derived statistics are neutral when no real questions exist.
3. The faculty-intelligence summary derives bank scalars from the REAL
   questions table (neutral when empty, real when populated).
4. PYQ analysis contains no seeded question stems.
5. ``seed_spa_documents`` heals existing databases and never reintroduces
   the removed records.
6. The cleanup transform is idempotent, preserves analytics, and never
   touches unaffected documents or the real questions table.
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from app.services.spa_documents import document, seed_spa_documents, spa_key
from app.services.spa_question_cleanup import (
    AFFECTED_DOCUMENTS,
    NEUTRAL_BANK_STATUS,
    clean_document_if_affected,
    clean_spa_document,
)
from app.services.spa_store import kv_put

from test.conftest import auth_header

SPA_DIR = Path(__file__).resolve().parents[1] / "app" / "data" / "spa"

FORBIDDEN_SEED_MARKERS = (
    "CQ-JEE",
    "CQ-NEET",
    "UPYQ-",
    "CQ-JEE Main-PHY-001",
    "Construct MST using Kruskal",
    "0/1 knapsack with DP table",
    "Ridge regression adds which penalty",
    "1254 questions",
    "72.5%",
    "67.5/100",
    "Ford–Fulkerson method, the bottleneck",
)


def _load(name: str) -> dict:
    return json.loads((SPA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _find_lists(doc, key, out=None, path=""):
    """Collect every non-empty list stored under ``key`` anywhere in the doc."""
    out = [] if out is None else out
    if isinstance(doc, dict):
        for k, v in doc.items():
            if k == key and isinstance(v, list) and v:
                out.append((f"{path}.{k}", v))
            _find_lists(v, key, out, f"{path}.{k}")
    elif isinstance(doc, list):
        for i, v in enumerate(doc):
            _find_lists(v, key, out, f"{path}[{i}]")
    return out


# --------------------------------------------------------------------------
# 1. Seed source documents are clean
# --------------------------------------------------------------------------

def test_seed_sources_contain_no_question_record_collections():
    for name in sorted(AFFECTED_DOCUMENTS):
        doc = _load(name)
        for key in ("mostRepeated", "aiPredictedQuestions", "aiImportantQuestions", "pyqRecords", "universityPyq"):
            assert _find_lists(doc, key) == [], f"{name}.{key} still holds records"
        for marker in FORBIDDEN_SEED_MARKERS:
            assert marker not in json.dumps(doc), f"{name} still contains seeded marker: {marker}"


def test_seed_sources_question_banks_are_empty_shells():
    summary = _load("faculty-intelligence-summary")
    bank = summary["datasets"]["questionBank"]
    assert bank["questions"] == []
    assert bank["summary"]["total"] == 0

    admin = _load("admin-catalog")
    assert admin["questionBank"]["questions"] == []
    assert admin["questionBank"]["summary"]["total"] == 0


def test_seed_sources_question_stats_are_neutral():
    summary = _load("faculty-intelligence-summary")
    stats = summary["derived"]["assessment"]["questionStats"]
    assert stats["total"] == 0
    assert stats["questions"] == []
    assert stats["avgAccuracy"] is None
    assert stats["qualityAvg"] is None
    assert stats["difficultyDistribution"] == []

    cqi = summary["derived"]["competitiveQuestionIntelligence"]
    assert cqi["total"] == 0
    assert cqi["pyqRecords"] == []
    assert cqi["universityPyq"] == []
    assert cqi["universityPyqCount"] == 0


def test_seed_sources_pyq_overview_and_patterns_are_honest():
    pyq = _load("pyq")
    overview = pyq["analysis"]["overview"]
    assert overview["totalPapers"] == 0
    assert overview["totalQuestions"] == 0
    # Analytics structures are preserved.
    assert isinstance(pyq["analysis"]["trendAnalytics"]["yearWise"], list)
    assert isinstance(pyq["analysis"]["questionIntelligence"]["frequentTopics"], list)
    assert isinstance(pyq["analysis"]["uploads"], list)
    # Patterns keep their analytics but lose fabricated example stems.
    for pattern in pyq["patterns"]:
        assert "example" not in pattern
        assert "frequency" in pattern and "impact" in pattern


def test_seed_sources_preserve_legitimate_taxonomy_and_blueprints():
    summary = _load("faculty-intelligence-summary")
    # Taxonomy topics (filter options) legitimately mention algorithm names.
    assert "Dijkstra & shortest paths" in summary["datasets"]["paperGenerator"]["config"]["topics"]
    # PYQ trend blueprints (JEE/NEET exam metadata) are preserved.
    trends = summary["datasets"]["pyqTrends"]["competitive"]
    assert trends["NEET UG"]["totalMarks"] == 720
    assert trends["JEE Main"]["totalQuestions"] == 90
    # Unit coverage analytics survive.
    assert summary["datasets"]["questionCoverage"], "coverage analytics must be preserved"


# --------------------------------------------------------------------------
# 2. Transform properties
# --------------------------------------------------------------------------

def test_cleanup_is_idempotent():
    seeded = {
        "datasets": {
            "questionBank": {
                "summary": {"total": 1254, "bySubject": {"CS501": 418}},
                "questions": [{"id": "q1", "text": "Trace Dijkstra's algorithm on a 5-vertex graph"}],
            },
            "competitiveQuestions": [{"id": "CQ-JEE Main-PHY-001", "question": "SEEDED"}],
        },
        "derived": {
            "assessment": {"questionStats": {"total": 1254, "avgAccuracy": 72.5, "questions": [{"id": "q1"}]}},
            "competitiveQuestionIntelligence": {"total": 156, "pyqRecords": [{"id": "CQ-1"}]},
        },
    }
    once, changes = clean_spa_document(deepcopy(seeded))
    assert changes, "first pass must report removals"
    twice, changes_second = clean_spa_document(deepcopy(once))
    assert twice == once
    assert changes_second == []


def test_cleanup_preserves_non_question_data():
    doc = {
        "uploads": [{"id": "up1", "paper": "CS501 — Midsem 2025", "questions": 22}],
        "trendAnalytics": {"yearWise": [{"year": 2024, "questions": 30, "repeated": 4}]},
        "quizBuilder": {"quizzes": [{"id": "qz1", "questions": 10}]},  # int count, not records
        "questionCoverage": [{"course": "CS501", "units": []}],
        "patterns": [{"pattern": "Trace an algorithm", "frequency": 38, "years": "2015–2025", "impact": "High"}],
        "pyqTrends": {"competitive": {"JEE Main": {"totalMarks": 300}}},
        "assignments": [{"id": "a1", "commonMistakes": ["Wrong complexity analysis of Dijkstra variants"]}],
        "questionTags": ["High-Yield"],
    }
    cleaned, changes = clean_spa_document(deepcopy(doc))
    assert cleaned == doc
    assert changes == []


def test_cleanup_never_touches_unaffected_documents():
    exam_agent = {
        "groupLabels": {"JEE": {"label": "JEE Main Mocks"}},
        "items": [{"id": "EA-JEE-PHY-01", "questions": [{"id": "EA-JEE-PHY-01-Q01", "stem": "practice item"}]}],
    }
    assert clean_document_if_affected("exam-agent-exams", deepcopy(exam_agent)) == exam_agent
    student_portal = {"mentor": {"quizBank": [{"q": "practice"}]}}
    assert clean_document_if_affected("student-portal", deepcopy(student_portal)) == student_portal


# --------------------------------------------------------------------------
# 3. Seed heals existing databases and never reintroduces records
# --------------------------------------------------------------------------

def test_seed_heals_existing_seeded_documents(app, db):
    old_doc = _load("pyq")
    old_doc["analysis"]["questionIntelligence"]["mostRepeated"] = [
        {"question": "Trace Dijkstra's algorithm on a 5-vertex graph", "times": 14, "years": [2019]},
    ]
    old_doc["analysis"]["overview"]["totalQuestions"] = 486
    kv_put(db, spa_key("pyq"), old_doc, commit=True)

    result = seed_spa_documents(db)
    assert result["healed"] >= 1

    healed = document(db, "pyq")
    assert healed["analysis"]["questionIntelligence"]["mostRepeated"] == []
    assert healed["analysis"]["overview"]["totalQuestions"] == 0
    # Analytics preserved through the heal.
    assert isinstance(healed["analysis"]["trendAnalytics"]["yearWise"], list)


def test_seed_does_not_reintroduce_removed_records(app, db):
    """Seeding over clean rows AND over a dirty legacy row never reintroduces records."""
    first = seed_spa_documents(db)
    second = seed_spa_documents(db)

    summary = document(db, "faculty-intelligence-summary")
    assert summary["datasets"]["questionBank"]["questions"] == []
    assert summary["derived"]["competitiveQuestionIntelligence"]["pyqRecords"] == []
    assert _find_lists(summary, "mostRepeated") == []
    # Once clean, seeding is a pure no-op for content (skips + no healing).
    assert second["healed"] == 0
    assert second["written"] == 0
    assert first["written"] + first["skipped"] == 23

    # A legacy dirty row (pre-cleanup shape) must be healed, never preserved,
    # and a re-seed must not bring the records back.
    dirty = _load("faculty-intelligence-summary")
    dirty["datasets"]["questionBank"]["questions"] = [
        {"id": "q_seed_legacy", "text": "Legacy seeded stem?", "options": [], "answer": "A"},
    ]
    dirty["datasets"]["questionBank"]["summary"]["total"] = 1254
    kv_put(db, spa_key("faculty-intelligence-summary"), dirty, commit=True)
    healed_run = seed_spa_documents(db)
    assert healed_run["healed"] == 1
    healed = document(db, "faculty-intelligence-summary")
    assert healed["datasets"]["questionBank"]["questions"] == []
    assert healed["datasets"]["questionBank"]["summary"]["total"] == 0
    again = seed_spa_documents(db)
    assert again["healed"] == 0


# --------------------------------------------------------------------------
# 4. Live endpoints
# --------------------------------------------------------------------------

def _scan_for_seed_markers(payload_obj) -> list[str]:
    raw = json.dumps(payload_obj)
    return [m for m in FORBIDDEN_SEED_MARKERS if m in raw]


def test_faculty_intelligence_summary_is_clean_and_reflects_real_bank(client, world):
    response = client.get("/v1/faculty-intelligence/summary", headers=auth_header(world["faculty"]))
    assert response.status_code == 200
    body = response.json()

    assert _scan_for_seed_markers(body) == []
    assert _find_lists(body, "mostRepeated") == []
    assert _find_lists(body, "pyqRecords") == []
    assert body["derived"]["competitiveQuestionIntelligence"]["pyqRecords"] == []

    # Bank scalars derive from the REAL questions table (world seeds 4 questions in inst_a).
    stats = body["derived"]["assessment"]["questionStats"]
    assert stats["total"] == 4
    assert stats["bySubject"], "real questions must surface their subjects"
    assert body["derived"]["dashboard"]["questionBankStatus"] == "4 questions · 0 flagged"


def test_faculty_intelligence_summary_neutral_when_bank_empty(client, db):
    """A faculty whose institution has no real questions sees neutral stats."""
    from app.core.security import create_access_token, hash_password
    from app.models.identity import Institution, Role, User, UserRole

    db.add(Institution(id="inst_empty", slug="empty", name="Empty University"))
    db.flush()
    db.add(User(
        id="u_fac_empty", institution_id="inst_empty", email="fac.empty@test.edu",
        password_hash=hash_password("aurora123"), full_name="Fac Empty", status="active", legacy_role="faculty",
    ))
    role = Role(institution_id="inst_empty", code="faculty", name="Faculty")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id="u_fac_empty", role_id=role.id, institution_id="inst_empty"))
    db.commit()

    token = create_access_token(sub="u_fac_empty", institution_id="inst_empty", roles=["faculty"])
    response = client.get("/v1/faculty-intelligence/summary", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()

    stats = body["derived"]["assessment"]["questionStats"]
    assert stats["total"] == 0
    assert stats["bySubject"] == {}
    assert stats["avgAccuracy"] is None
    assert stats["qualityAvg"] is None
    assert body["derived"]["dashboard"]["questionBankStatus"] == "0 questions · 0 flagged"
    assert body["derived"]["assessmentSummary"]["questionBank"] == 0
    assert body["derived"]["dashboard"]["successCenter"]["assessmentHealth"]["questionBankStatus"] == NEUTRAL_BANK_STATUS or \
        body["derived"]["dashboard"]["successCenter"]["assessmentHealth"]["questionBankStatus"] == "0 questions · 0 flagged"
    assert _scan_for_seed_markers(body) == []


def test_real_question_flows_into_bank_and_summary(client, world, db):
    """Insert one legitimate real Question → bank + summary reflect it → clean up."""
    from app.models.assessment import Question

    question = Question(
        id="q_phaseG_real",
        institution_id="inst_a",
        exam_mode="university",
        stem="REAL phase-G verification question on Red-Black trees?",
        options='["A","B","C","D"]',
        correct_answer="0",
        marks=2,
        negative_marks=0,
        difficulty="medium",
        q_type="mcq",
        concept="Trees",
        status="approved",
    )
    db.add(question)
    db.commit()
    try:
        bank = client.get("/v1/faculty/question-bank", headers=auth_header(world["faculty"])).json()
        assert any(q["id"] == "q_phaseG_real" for q in bank["questions"])
        assert bank["total"] == 5

        summary = client.get("/v1/faculty-intelligence/summary", headers=auth_header(world["faculty"])).json()
        assert summary["derived"]["assessment"]["questionStats"]["total"] == 5
        assert summary["derived"]["dashboard"]["questionBankStatus"] == "5 questions · 0 flagged"
    finally:
        db.delete(question)
        db.commit()

    bank = client.get("/v1/faculty/question-bank", headers=auth_header(world["faculty"])).json()
    assert bank["total"] == 4


def test_pyq_analysis_endpoints_contain_no_seeded_questions(client, world):
    analysis = client.get("/v1/faculty/pyq-analysis", headers=auth_header(world["faculty"])).json()
    assert analysis["questionIntelligence"]["mostRepeated"] == []
    assert analysis["questionIntelligence"]["aiPredictedQuestions"] == []
    assert analysis.get("aiImportantQuestions", []) == []
    assert _scan_for_seed_markers(analysis) == []
    # Analytics structures remain.
    assert isinstance(analysis["trendAnalytics"]["yearWise"], list)

    patterns = client.get("/v1/faculty/pyq-analysis/patterns", headers=auth_header(world["faculty"])).json()
    for pattern in patterns["items"]:
        assert "example" not in pattern


def test_real_question_table_untouched_by_cleanup(client, world):
    """The cleanup only rewrites SPA documents — the questions table is intact."""
    bank = client.get("/v1/faculty/question-bank", headers=auth_header(world["faculty"])).json()
    stems = {q["text"] for q in bank["questions"]}
    assert "University Q1?" in stems and "JEE Physics?" in stems
    assert bank["summary"]["total"] == 4


def test_rbac_unchanged(client, world):
    assert client.get("/v1/faculty-intelligence/summary", headers=auth_header(world["student"])).status_code == 403
    assert client.get("/v1/faculty/pyq-analysis", headers=auth_header(world["student"])).status_code == 403
    assert client.get("/v1/faculty/question-bank", headers=auth_header(world["student"])).status_code == 403
