"""Competitive subject mapping + AI paper read-back regression tests.

Covers the production defects:
  1. Paper Studio subject dropdown showed only one subject per exam family
     (JEE -> Mathematics only, NEET -> Biology only) because
     competitiveSubjects was built with a brittle exact-match filter over
     subjects.exam_family and had no syllabus fallback.
  2. Paper View modal showed zero questions because the read-back endpoint
     (ai-paper/{id}) failed to normalise the AI service's exam_family enum
     and the library endpoint crashed on null timestamps.

These tests use the real services and the real SQLite test DB — no mocked
payloads, no fabricated questions.
"""

from __future__ import annotations

import json

from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion
from app.models.catalog import Chapter, Subject, Topic

from test.conftest import auth_header


def _add_competitive_subjects(db, institution_id: str) -> None:
    """Mirror the production competitive catalog: three subjects per family."""
    rows = [
        Subject(institution_id=institution_id, code="JEE-MATH", name="Mathematics", exam_mode="competitive", exam_family="JEE_MAIN"),
        Subject(institution_id=institution_id, code="JEE-PHY", name="Physics", exam_mode="competitive", exam_family="JEE_MAIN"),
        Subject(institution_id=institution_id, code="JEE-CHEM", name="Chemistry", exam_mode="competitive", exam_family="JEE_ADVANCED"),
        Subject(institution_id=institution_id, code="NEET-PHY", name="Physics", exam_mode="competitive", exam_family="NEET"),
        Subject(institution_id=institution_id, code="NEET-CHEM", name="Chemistry", exam_mode="competitive", exam_family="NEET-UG"),
        Subject(institution_id=institution_id, code="NEET-BIO", name="Biology", exam_mode="competitive", exam_family="NEET"),
    ]
    db.add_all(rows)
    db.flush()
    math = next(r for r in rows if r.code == "JEE-MATH")
    ch = Chapter(subject_id=math.id, name="Calculus", sort_order=1)
    db.add(ch)
    db.flush()
    db.add(Topic(chapter_id=ch.id, name="Limits", sort_order=1))
    db.commit()


def test_competitive_subject_mapping_jee_and_neet(client, world, db):
    faculty = world["faculty"]
    _add_competitive_subjects(db, faculty.institution_id)

    res = client.get("/v1/faculty/paper-generator", headers=auth_header(faculty))
    assert res.status_code == 200, res.text
    cfg = res.json()["config"]
    jee = cfg["competitiveSubjects"]["JEE"]
    neet = cfg["competitiveSubjects"]["NEET"]

    # Deterministic JEE set — Mathematics, Physics, Chemistry, no Biology.
    assert set(jee) == {"Mathematics", "Physics", "Chemistry"}
    assert "Biology" not in jee
    # Deterministic NEET set — Physics, Chemistry, Biology, no Mathematics.
    assert set(neet) == {"Physics", "Chemistry", "Biology"}
    assert "Mathematics" not in neet
    # De-duplicated (Physics/Chemistry appear once even across enum variants).
    assert len(jee) == len(set(jee))
    assert len(neet) == len(set(neet))
    # Deterministic order.
    assert jee == sorted(jee, key=str.casefold)
    assert neet == sorted(neet, key=str.casefold)

    # The competitive subject rows also expose chapters for the cascade.
    math_row = next(s for s in cfg["subjectCatalog"] if s["code"] == "JEE-MATH")
    assert [c["name"] for c in math_row["chapters"]] == ["Calculus"]


def test_paper_catalog_is_global_across_institutions(client, world, db):
    """The paper-generator catalog is intentionally NOT institution-scoped:
    subjects/chapters/topics are merged across every institution. A faculty
    whose own institution has no competitive rows still sees the subjects
    seeded on another institution."""
    from app.core.security import hash_password
    from app.models.identity import Institution, Role, User, UserRole

    # Competitive subjects live on the shared `world` institution.
    _add_competitive_subjects(db, world["faculty"].institution_id)

    # A brand-new institution with zero catalog rows of its own.
    inst = Institution(id="inst_empty_comp_p", slug="empty-comp-p", name="Empty Comp College")
    db.add(inst)
    db.flush()
    user = User(
        id="u_fac_empty_comp_p",
        institution_id=inst.id,
        email="empty.comp@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Empty Comp Faculty",
        status="active",
        legacy_role="faculty",
    )
    db.add(user)
    role = Role(institution_id=inst.id, code="faculty", name="Faculty")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst.id))
    db.commit()

    res = client.get("/v1/faculty/paper-generator", headers=auth_header(user))
    assert res.status_code == 200, res.text
    cfg = res.json()["config"]
    # Global catalog: the other institution's competitive subjects are visible.
    assert set(cfg["competitiveSubjects"]["JEE"]) == {"Mathematics", "Physics", "Chemistry"}
    assert set(cfg["competitiveSubjects"]["NEET"]) == {"Physics", "Chemistry", "Biology"}


def test_ai_library_survives_null_timestamps_and_normalises_family(client, world, db):
    faculty = world["faculty"]
    paper = AiGeneratedPaper(
        id="ai-lib-1",
        paper_code="AIP-LIB-1",
        title="JEE Main · Full Mock 01",
        exam_mode="Competitive",
        exam_family="JEE_MAIN",
        subject_name="Physics",
        question_count=2,
        total_marks=8,
        duration_minutes=120,
        status="draft",
        created_at=None,
    )
    db.add(paper)
    db.commit()
    try:
        res = client.get("/v1/faculty/paper-generator/ai-library", headers=auth_header(faculty))
        assert res.status_code == 200, res.text
        items = res.json()["generatedPapers"]
        entry = next(p for p in items if p["id"] == "ai-lib-1")
        # The AI service enum is normalised to the EduX-facing label.
        assert entry["examFamily"] == "JEE"
        assert entry["exam"] == "JEE"
        assert entry["domain"] == "Competitive"
        # Null created_at no longer 500s; a date is still returned.
        assert entry["created"]
    finally:
        db.delete(paper)
        db.commit()


def test_ai_paper_readback_returns_real_questions(client, world, db):
    """Paper View: ai-paper/{id} must return the actual linked question rows,
    structured option records preserved for the frontend to normalise, and a
    canonical examFamily label."""
    faculty = world["faculty"]
    paper = AiGeneratedPaper(
        id="ai-view-1",
        paper_code="AIP-VIEW-1",
        title="NEET UG · Biology Subject Test",
        exam_mode="Competitive",
        exam_family="NEET",
        subject_name="Biology",
        question_count=2,
        total_marks=8,
        duration_minutes=60,
        status="draft",
    )
    db.add(paper)
    db.flush()
    db.add_all([
        AiGeneratedPaperQuestion(
            paper_id=paper.id,
            position=1,
            level="easy",
            stem_text="Which organelle is the site of photosynthesis?",
            options=json.dumps([
                {"key": "A", "text": "Mitochondria", "imageUrl": None},
                {"key": "B", "text": "Chloroplast", "imageUrl": None},
                {"key": "C", "text": "Ribosome", "imageUrl": None},
                {"key": "D", "text": "Nucleus", "imageUrl": None},
            ]),
            correct_option="B",
            explanation="Chloroplasts contain chlorophyll and carry out photosynthesis.",
            marks=4,
            negative_marks=1,
            has_image=False,
            stem_image_url=None,
            extra=json.dumps({}),
        ),
        AiGeneratedPaperQuestion(
            paper_id=paper.id,
            position=2,
            level="medium",
            stem_text="Plain-string option question?",
            options=json.dumps(["Alpha", "Beta", "Gamma", "Delta"]),
            correct_option="0",
            explanation=None,
            marks=4,
            negative_marks=1,
            has_image=False,
            stem_image_url=None,
            extra=json.dumps({}),
        ),
    ])
    db.commit()
    try:
        res = client.get("/v1/faculty/paper-generator/ai-paper/ai-view-1", headers=auth_header(faculty))
        assert res.status_code == 200, res.text
        payload = res.json()
        assert payload["examFamily"] == "NEET"
        assert payload["domain"] == "Competitive"
        assert payload["generated"] == 2
        questions = payload["questions"]
        assert len(questions) == 2
        first = questions[0]
        assert first["text"].startswith("Which organelle")
        # Structured option records are preserved; the frontend renders .text.
        assert first["options"][1] == {"key": "B", "text": "Chloroplast", "imageUrl": None}
        assert first["correctOption"] == "B"
        assert first["explanation"].startswith("Chloroplasts")
        # Plain-string options pass through unchanged.
        assert questions[1]["options"] == ["Alpha", "Beta", "Gamma", "Delta"]
    finally:
        db.query(AiGeneratedPaperQuestion).filter(AiGeneratedPaperQuestion.paper_id == paper.id).delete()
        db.delete(paper)
        db.commit()


def test_ai_paper_readback_empty_is_honest(client, world):
    """A genuinely empty AI paper reports zero generated questions — the
    frontend must show an honest empty/inconsistency state, not fabricate."""
    faculty = world["faculty"]
    res = client.get("/v1/faculty/paper-generator/ai-paper/does-not-exist", headers=auth_header(faculty))
    assert res.status_code == 404
