"""Question generation — real deployed AI agent integration tests.

The deployed agent (app.services.ai_paper_client -> POST /api/generate/async)
is simulated in these tests only: a fake service records the exact request
body EduX sends and writes AiGeneratedPaper / AiGeneratedPaperQuestion rows
into the shared DB exactly like the deployed service does. Everything else
runs against the real services and the real SQLite test DB.

Covered contracts:
  * Generate Paper sends the complete configuration.
  * Backend invokes the AI generation service (no template generator).
  * AI questions are persisted to `questions` + `question_generation_items`.
  * Phase 6 (GET generation/{id}/questions) returns ONLY current-generation
    questions — never the bank, another generation, or historical AI papers.
  * NEET Biology / JEE Physics scope is honoured end-to-end.
  * Regeneration creates a NEW generation identity.
  * Refresh (current generation endpoint) never re-triggers the AI agent.
  * AI failure never falls back to old/sample questions.
  * Existing question-bank records remain untouched.
"""

from __future__ import annotations

import json

import pytest

from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion
from app.models.assessment import Question, QuestionGeneration, QuestionGenerationItem
from app.models.catalog import Chapter, Subject, Topic
from app.services import ai_paper_client
from test.conftest import auth_header

# Test-only catalog ids (cleaned up after every test).
CATALOG_IDS = {
    "subjects": ["t_neet_bio", "t_jee_phy", "t_uni_cs"],
    "chapters": ["t_cell_bio", "t_genetics", "t_mech", "t_electro", "t_uni_graphs"],
    "topics": ["t_cell_struct", "t_genetics_topics", "t_kinematics", "t_electro_topics", "t_dijkstra"],
}


def _seed_catalog(db, institution_id: str) -> dict:
    rows = [
        Subject(id="t_neet_bio", institution_id=institution_id, code="NEET-BIO", name="Biology", exam_mode="competitive", exam_family="NEET"),
        Subject(id="t_jee_phy", institution_id=institution_id, code="JEE-PHY", name="Physics", exam_mode="competitive", exam_family="JEE_MAIN"),
        Subject(id="t_uni_cs", institution_id=institution_id, code="CS501", name="Data Structures", exam_mode="university", exam_family=None),
    ]
    db.add_all(rows)
    db.flush()
    chapters = [
        Chapter(id="t_cell_bio", subject_id="t_neet_bio", name="Cell Biology", sort_order=1),
        Chapter(id="t_genetics", subject_id="t_neet_bio", name="Genetics", sort_order=2),
        Chapter(id="t_mech", subject_id="t_jee_phy", name="Mechanics", sort_order=1),
        Chapter(id="t_electro", subject_id="t_jee_phy", name="Electrodynamics", sort_order=2),
        Chapter(id="t_uni_graphs", subject_id="t_uni_cs", name="Graph Algorithms", sort_order=1),
    ]
    db.add_all(chapters)
    db.flush()
    topics = [
        Topic(id="t_cell_struct", chapter_id="t_cell_bio", name="Cell Structure", sort_order=1),
        Topic(id="t_genetics_topics", chapter_id="t_genetics", name="Mendelian Inheritance", sort_order=1),
        Topic(id="t_kinematics", chapter_id="t_mech", name="Kinematics", sort_order=1),
        Topic(id="t_electro_topics", chapter_id="t_electro", name="Electrostatics", sort_order=1),
        Topic(id="t_dijkstra", chapter_id="t_uni_graphs", name="Dijkstra", sort_order=1),
    ]
    db.add_all(topics)
    db.commit()
    return {"subjects": rows, "chapters": chapters, "topics": topics}


@pytest.fixture(autouse=True)
def cleanup_ai_questions(db):
    """Remove only records created by this module — never production data."""
    yield
    db.query(QuestionGenerationItem).delete()
    db.query(Question).filter(Question.source == "ai").delete()
    db.query(QuestionGeneration).delete()
    db.query(AiGeneratedPaperQuestion).delete()
    db.query(AiGeneratedPaper).delete()
    db.query(Topic).filter(Topic.id.in_(CATALOG_IDS["topics"])).delete(synchronize_session=False)
    db.query(Chapter).filter(Chapter.id.in_(CATALOG_IDS["chapters"])).delete(synchronize_session=False)
    db.query(Subject).filter(Subject.id.in_(CATALOG_IDS["subjects"])).delete(synchronize_session=False)
    db.commit()


@pytest.fixture
def ai_service(fake_ai_service):
    """Alias for the shared conftest fake agent (`fake_ai_service`)."""
    return fake_ai_service


def _generate(client, faculty, body):
    res = client.post("/v1/faculty/question-bank/generate", json=body, headers=auth_header(faculty))
    return res


def _settle(client, faculty, generation_id):
    """Drive the polling path until READY/FAILED (status endpoint syncs jobs)."""
    res = client.get(f"/v1/faculty/question-bank/generations/{generation_id}", headers=auth_header(faculty))
    assert res.status_code == 200, res.text
    return res.json()


def test_generate_paper_sends_complete_configuration_to_deployed_agent(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    body = {
        "title": "NEET Biology Sunday Mock",
        "domain": "Competitive",
        "examFamily": "NEET",
        "mode": "Competitive",
        "exam": "NEET",
        "subject": "Biology",
        "chapter": "All chapters",
        "topic": "All topics",
        "questionCount": 4,
        "count": 4,
        "difficulty": "Mixed",
        "questionTypes": ["MCQ"],
        "qTypes": ["MCQ"],
        "bloomPreset": "Balanced",
        "weightagePreset": "Balanced chapters",
        "coPreset": "Balanced CO coverage",
        "pyqPreference": "Include PYQs",
        "negativeMarking": "Enabled",
        "examPattern": "Standard",
        "program": None,
        "course": "NEET · Biology",
        "paperType": "Full Mock Test",
        "examType": "Full Mock Test",
        "totalMarks": 180,
        "duration": 180,
    }
    res = _generate(client, faculty, body)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["generationId"]
    assert data["status"] == "PROCESSING"

    # The EXACT configuration reached the deployed agent.
    assert len(ai_service["requests"]) == 1
    sent = ai_service["requests"][0]
    assert sent["exam_family"] == "NEET"
    assert sent["subject"] == "Biology"
    assert [c["name"] for c in sent["chapters"]] == ["Cell Biology", "Genetics"]
    assert sent["total_questions"] == 4
    assert sent["difficulty"] == "mixed"
    notes = json.loads(sent["scope_notes"])
    assert notes["mode"] == "competitive"
    assert notes["examFamily"] == "NEET"
    assert notes["subject"] == "Biology"
    assert notes["questionTypes"] == ["MCQ"]
    assert notes["negativeMarking"] == "Enabled"
    assert notes["examPattern"] == "Standard"


def test_ai_questions_persist_and_phase6_returns_only_current_generation(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "All chapters", "topic": "All topics",
        "questionCount": 4, "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    data = res.json()
    gen_id = data["generationId"]
    ai_service["write_output"]()

    status = _settle(client, faculty, gen_id)
    assert status["status"] == "READY"
    assert status["generatedCount"] == 4

    gen = db.get(QuestionGeneration, gen_id)
    assert gen is not None
    assert len(db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == gen_id).all()) == 4
    ai_questions = db.query(Question).filter(Question.source == "ai", Question.institution_id == faculty.institution_id).all()
    assert len(ai_questions) == 4
    for q in ai_questions:
        assert q.exam_mode == "competitive"
        assert q.exam_family == "neet"
        assert q.subject_id == "t_neet_bio"
        assert q.institution_id == faculty.institution_id
        assert q.created_by == faculty.id
        assert q.stem.startswith("AI [Biology")

    # Phase 6 query — only THIS generation, ordered.
    q_res = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty))
    payload = q_res.json()
    assert payload["total"] == 4
    item_ids = [i.question_id for i in db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == gen_id).all()]
    assert set(q["id"] for q in payload["questions"]) == set(item_ids)
    for q in payload["questions"]:
        assert q["subjectName"] == "Biology"
        assert q["subject"] == "NEET-BIO"
        assert q["examFamily"] == "NEET"
        assert q["domain"] == "Competitive"
        assert q["source"] == "ai"
        assert q["difficulty"] == "Medium"
        assert q["marks"] == 4


def test_neet_biology_and_jee_physics_scope(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "Genetics", "topic": "Mendelian Inheritance",
        "questionCount": 3, "difficulty": "Medium", "questionTypes": ["MCQ"],
    })
    gen_id = res.json()["generationId"]
    ai_service["write_output"]()
    status = _settle(client, faculty, gen_id)
    assert status["status"] == "READY"
    sent = ai_service["requests"][0]
    assert sent["subject"] == "Biology"
    assert [c["name"] for c in sent["chapters"]] == ["Genetics"]
    assert "Mendelian Inheritance" in sent["chapters"][0]["notes"]
    payload = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    assert len(payload["questions"]) == 3
    for q in payload["questions"]:
        assert q["subjectName"] == "Biology"
        assert q["examFamily"] == "NEET"
        assert q["chapter"] == "Genetics"
        assert q["topic"] == "Mendelian Inheritance"

    # JEE Physics — completely separate generation identity and scope.
    res2 = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "JEE", "subject": "Physics",
        "chapter": "Mechanics", "topic": "Kinematics",
        "questionCount": 3, "difficulty": "Hard", "questionTypes": ["MCQ", "Integer"],
    })
    gen2 = res2.json()["generationId"]
    assert gen2 != gen_id
    ai_service["write_output"]()
    _settle(client, faculty, gen2)
    payload2 = client.get(f"/v1/faculty/question-bank/generations/{gen2}/questions", headers=auth_header(faculty)).json()
    assert len(payload2["questions"]) == 3
    for q in payload2["questions"]:
        assert q["subjectName"] == "Physics"
        assert q["examFamily"] == "JEE"
        assert q["chapter"] == "Mechanics"
        assert q["topic"] == "Kinematics"

    # Neither generation leaks into the other.
    first = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    assert all(q["examFamily"] == "NEET" for q in first["questions"])


def test_regeneration_creates_new_generation_identity(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)
    body = {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "Genetics", "topic": "Mendelian Inheritance",
        "questionCount": 2, "difficulty": "Easy", "questionTypes": ["MCQ"],
    }
    first = _generate(client, faculty, body).json()
    first_id = first["generationId"]
    ai_service["write_output"]()
    _settle(client, faculty, first_id)

    second = _generate(client, faculty, {**body, "questionCount": 3}).json()
    second_id = second["generationId"]
    assert second_id != first_id
    ai_service["write_output"]()
    _settle(client, faculty, second_id)

    first_items = set(i.question_id for i in db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == first_id).all())
    second_items = set(i.question_id for i in db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == second_id).all())
    assert len(first_items) == 2
    assert len(second_items) == 3
    assert first_items.isdisjoint(second_items), "regeneration must never reuse the previous generation's questions"

    # Phase 6 for the new generation shows ONLY the new questions.
    payload = client.get(f"/v1/faculty/question-bank/generations/{second_id}/questions", headers=auth_header(faculty)).json()
    assert set(q["id"] for q in payload["questions"]) == second_items
    assert payload["questions"][0]["topic"] == "Mendelian Inheritance"


def test_refresh_recovery_never_triggers_ai_again(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "JEE", "subject": "Physics",
        "chapter": "Mechanics", "topic": "Kinematics", "questionCount": 3,
        "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    gen_id = res.json()["generationId"]
    ai_service["write_output"]()
    _settle(client, faculty, gen_id)
    submitted_before = len(ai_service["requests"])
    generations_before = db.query(QuestionGeneration).count()

    # Refresh: the current-generation endpoint restores the persisted session.
    current = client.get("/v1/faculty/question-bank/generations/current", headers=auth_header(faculty)).json()
    assert current["generation"]["id"] == gen_id
    assert current["generation"]["status"] == "READY"
    assert len(ai_service["requests"]) == submitted_before, "refresh must not re-submit to the AI agent"
    assert db.query(QuestionGeneration).count() == generations_before

    # Questions are restored for that exact generation.
    payload = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    assert payload["total"] == 3


def test_ai_failure_never_falls_back_to_old_questions(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "Cell Biology", "topic": "Cell Structure", "questionCount": 3,
        "difficulty": "Medium", "questionTypes": ["MCQ"],
    })
    gen_id = res.json()["generationId"]
    job_id = ai_service["jobs"].keys().__iter__().__next__()
    ai_service["status_overrides"][job_id] = {
        "job_id": job_id, "paper_id": ai_service["jobs"][job_id]["paper_id"],
        "status": "failed", "questions_generated": 0, "questions_dropped": 0,
        "total_questions": 3, "current_chapter": None, "elapsed_seconds": 1,
        "error": "AI agent exploded",
    }

    status = _settle(client, faculty, gen_id)
    assert status["status"] == "FAILED"
    assert "AI agent exploded" in (status.get("errorMessage") or "")

    # NO question rows, NO links — old bank questions are not substituted.
    assert db.query(Question).filter(Question.source == "ai").count() == 0
    assert db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == gen_id).count() == 0
    payload = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    assert payload["total"] == 0
    assert payload["questions"] == []
    # Pre-existing bank records are still there (untouched).
    assert db.query(Question).filter(Question.institution_id == faculty.institution_id).count() >= 3


def test_ai_service_unreachable_returns_error_without_fabrication(client, world, db, monkeypatch):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    def _unreachable(_body):
        raise ai_paper_client.AiPaperClientError("AI generation service is unreachable")

    monkeypatch.setattr(ai_paper_client, "generate_async", _unreachable)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "JEE", "subject": "Physics",
        "chapter": "Mechanics", "questionCount": 3, "difficulty": "Medium", "questionTypes": ["MCQ"],
    })
    assert res.status_code == 502
    assert "unreachable" in res.json()["detail"]
    assert db.query(Question).filter(Question.source == "ai").count() == 0
    gen = db.query(QuestionGeneration).order_by(QuestionGeneration.created_at.desc()).first()
    assert gen is not None and gen.status == "FAILED"
    assert gen.generated_count == 0


def test_historical_ai_papers_do_not_leak_into_current_generation(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    # A historical AI paper (written directly into the shared tables, never
    # linked to any QuestionGeneration) must NOT appear in Phase 6.
    db.add(AiGeneratedPaper(
        id="hist-paper-1", paper_code="AIP-HIST-1", title="History paper",
        exam_mode="Competitive", exam_family="NEET", subject_name="Biology",
        question_count=2, status="draft",
    ))
    db.flush()
    db.add_all([
        AiGeneratedPaperQuestion(
            paper_id="hist-paper-1", position=1, level="easy",
            stem_text="Historical AI Biology question 1", options=[], correct_option="0",
            extra={"chapter_name": "Cell Biology", "topic_name": "Cell Structure"},
            marks=4, negative_marks=1,
        ),
        AiGeneratedPaperQuestion(
            paper_id="hist-paper-1", position=2, level="easy",
            stem_text="Historical AI Biology question 2", options=[], correct_option="0",
            extra={"chapter_name": "Genetics", "topic_name": "Mendelian Inheritance"},
            marks=4, negative_marks=1,
        ),
    ])
    db.commit()

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "Cell Biology", "questionCount": 2, "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    gen_id = res.json()["generationId"]
    ai_service["write_output"]()
    _settle(client, faculty, gen_id)
    payload = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    assert payload["total"] == 2
    assert all(not q["text"].startswith("Historical AI") for q in payload["questions"])


def test_existing_bank_records_untouched(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)
    from sqlalchemy import or_
    before = db.query(Question).filter(or_(Question.source.is_(None), Question.source != "ai")).count()
    before_texts = {(q.id, q.stem) for q in db.query(Question).all()}

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "All chapters", "questionCount": 3, "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    gen_id = res.json()["generationId"]
    ai_service["write_output"]()
    _settle(client, faculty, gen_id)

    after_bank = db.query(Question).filter(or_(Question.source.is_(None), Question.source != "ai")).count()
    assert after_bank == before, "existing bank questions must never be modified or deleted"
    assert {(q.id, q.stem) for q in db.query(Question).all()} >= before_texts


def test_student_cannot_generate(client, world):
    student = world["student"]
    res = client.get("/v1/faculty/question-bank/generations", headers=auth_header(student))
    assert res.status_code == 403
    res2 = client.post("/v1/faculty/question-bank/generate", json={"domain": "University", "questionCount": 2}, headers=auth_header(student))
    assert res2.status_code == 403


def test_paper_creation_uses_real_generated_ids(client, world, db, ai_service):
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)
    gen_res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET", "subject": "Biology",
        "chapter": "Cell Biology", "questionCount": 2, "difficulty": "Easy", "questionTypes": ["MCQ"],
    }).json()
    gen_id = gen_res["generationId"]
    ai_service["write_output"]()
    _settle(client, faculty, gen_id)
    payload = client.get(f"/v1/faculty/question-bank/generations/{gen_id}/questions", headers=auth_header(faculty)).json()
    q_ids = [q["id"] for q in payload["questions"]]
    assert len(q_ids) == 2

    paper_res = client.post("/v1/faculty/paper-generator/papers", json={
        "title": "Generated Paper Test",
        "domain": "Competitive",
        "examFamily": "NEET",
        "selectedQuestionIds": q_ids,
        "duration": 60,
        "totalMarks": 8,
        "generationId": gen_id,
    }, headers=auth_header(faculty))
    assert paper_res.status_code == 200, paper_res.text
    paper = paper_res.json()["paper"]
    assert set(paper["selectedQuestionIds"]) == set(q_ids)
    # A paper built from the current generation carries the generation link.
    lib = client.get("/v1/faculty/paper-generator", headers=auth_header(faculty)).json()
    entry = next((p for p in lib.get("generatedPapers", []) if p["id"] == paper["id"]), None)
    assert entry is not None


def test_multiple_subjects_fan_out_into_one_generation(client, world, db, ai_service):
    """Ticking multiple subjects sends one AI job per subject (the AI service
    takes a single subject per request), split from one requested total, all
    grouped under one generation identity."""
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "NEET",
        # NEET Biology is the only NEET-family subject in the seeded catalog;
        # send it as a LIST to exercise the array path end-to-end.
        "subject": ["Biology"],
        "chapter": ["Cell Biology", "Genetics"],
        "topic": "All topics",
        "questionCount": 4, "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    assert res.status_code == 200, res.text
    gen_id = res.json()["generationId"]

    # One subject resolved -> one job, carrying BOTH ticked chapters.
    assert len(ai_service["requests"]) == 1
    sent = ai_service["requests"][0]
    assert sent["subject"] == "Biology"
    assert [c["name"] for c in sent["chapters"]] == ["Cell Biology", "Genetics"]
    assert sent["total_questions"] == 4

    ai_service["write_output"]()
    status = _settle(client, faculty, gen_id)
    assert status["status"] == "READY"


def test_multiple_chapters_reach_ai_request_as_array(client, world, db, ai_service):
    """A subset of ticked chapters (not 'All chapters') must all reach the AI
    request's chapters array — no silent collapse to a single chapter."""
    faculty = world["faculty"]
    _seed_catalog(db, faculty.institution_id)

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "JEE", "subject": "Physics",
        "chapter": ["Mechanics", "Electrodynamics"],
        "topic": "All topics",
        "questionCount": 6, "difficulty": "Medium", "questionTypes": ["MCQ"],
    })
    assert res.status_code == 200, res.text
    sent = ai_service["requests"][0]
    assert sent["subject"] == "Physics"
    assert [c["name"] for c in sent["chapters"]] == ["Mechanics", "Electrodynamics"]

    gen_id = res.json()["generationId"]
    ai_service["write_output"]()
    assert _settle(client, faculty, gen_id)["status"] == "READY"


def test_combined_subjects_fan_out_with_per_subject_chapters(client, world, db, ai_service):
    """Ticking TWO subjects in the same family with chapters from BOTH produces
    one AI job per subject, each carrying only its OWN chapters, and the
    combined questions materialise under one generation."""
    faculty = world["faculty"]
    seeded = _seed_catalog(db, faculty.institution_id)
    # Add a second JEE-family subject so two subjects can be combined in one
    # (single-family) generation. Physics already exists as JEE_MAIN.
    db.add(Subject(id="t_jee_chem", institution_id=faculty.institution_id, code="JEE-CHEM", name="Chemistry", exam_mode="competitive", exam_family="JEE_MAIN"))
    db.flush()
    db.add(Chapter(id="t_thermo", subject_id="t_jee_chem", name="Thermodynamics", sort_order=1))
    db.commit()
    CATALOG_IDS["subjects"].append("t_jee_chem")
    CATALOG_IDS["chapters"].append("t_thermo")

    res = _generate(client, faculty, {
        "domain": "Competitive", "examFamily": "JEE",
        "subject": ["Physics", "Chemistry"],
        # One chapter from each subject — each job must receive only its own.
        "chapter": ["Mechanics", "Thermodynamics"],
        "topic": "All topics",
        "questionCount": 6, "difficulty": "Mixed", "questionTypes": ["MCQ"],
    })
    assert res.status_code == 200, res.text
    gen_id = res.json()["generationId"]

    # Two subjects -> two AI jobs, each scoped to its own chapter only.
    assert len(ai_service["requests"]) == 2
    by_subject = {r["subject"]: r for r in ai_service["requests"]}
    assert set(by_subject) == {"Physics", "Chemistry"}
    assert [c["name"] for c in by_subject["Physics"]["chapters"]] == ["Mechanics"]
    assert [c["name"] for c in by_subject["Chemistry"]["chapters"]] == ["Thermodynamics"]
    # The requested total is split across the two subjects (3 + 3 = 6).
    assert by_subject["Physics"]["total_questions"] + by_subject["Chemistry"]["total_questions"] == 6

    ai_service["write_output"]()
    status = _settle(client, faculty, gen_id)
    assert status["status"] == "READY"
    # Combined questions from both jobs land under the one generation.
    items = db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == gen_id).all()
    assert len(items) == status["generatedCount"] > 0
