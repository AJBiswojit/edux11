"""Isolation: sqlite file DB for examination tests. Never touches live PostgreSQL."""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

TEST_DB = Path(__file__).resolve().parent / "_exam_core.sqlite"
os.environ["DB_SCHEMA"] = ""
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"

if TEST_DB.exists():
    TEST_DB.unlink()

from app.core.config import get_settings  # noqa: E402

get_settings.cache_clear()

import app.models.ai  # noqa: E402,F401
import app.models.assessment  # noqa: E402,F401
import app.models.catalog  # noqa: E402,F401
import app.models.exams  # noqa: E402,F401
import app.models.identity  # noqa: E402,F401
import app.models.intelligence  # noqa: E402,F401
import app.models.interventions  # noqa: E402,F401
import app.models.ops  # noqa: E402,F401
import app.models.people  # noqa: E402,F401
import app.models.teaching  # noqa: E402,F401
import app.models.capabilities  # noqa: E402,F401
from app.core.security import create_access_token, hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine, get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models.assessment import Question  # noqa: E402
from app.models.identity import Institution, Role, User, UserRole  # noqa: E402
from app.models.people import StudentProfile  # noqa: E402

import pytest  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402


@pytest.fixture(autouse=True)
def _clear_admin_intel_cache():
    from app.services.admin_intel_cache import clear_all

    clear_all()
    yield
    clear_all()


@pytest.fixture(scope="session")
def app():
    Base.metadata.create_all(bind=engine)
    application = create_app()

    def _db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    application.dependency_overrides[get_db] = _db
    yield application
    engine.dispose()
    if TEST_DB.exists():
        try:
            TEST_DB.unlink()
        except OSError:
            pass


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(app):
    return TestClient(app, raise_server_exceptions=True)


def _user(db, *, inst_id: str, email: str, name: str, role: str, user_id: str) -> User:
    user = User(
        id=user_id,
        institution_id=inst_id,
        email=email,
        password_hash=hash_password("aurora123"),
        full_name=name,
        status="active",
        legacy_role=role,
    )
    db.add(user)
    role_row = db.query(Role).filter(Role.institution_id == inst_id, Role.code == role).first()
    if role_row is None:
        role_row = Role(institution_id=inst_id, code=role, name=role.title())
        db.add(role_row)
        db.flush()
    db.add(UserRole(user_id=user.id, role_id=role_row.id, institution_id=inst_id))
    db.flush()
    return user


@pytest.fixture(scope="session")
def world(app):
    db = SessionLocal()
    inst_a = Institution(id="inst_a", slug="alpha", name="Alpha University")
    inst_b = Institution(id="inst_b", slug="beta", name="Beta University")
    db.add_all([inst_a, inst_b])
    db.flush()
    faculty = _user(db, inst_id=inst_a.id, email="faculty.a@test.edu", name="Fac A", role="faculty", user_id="u_fac_a")
    faculty_b = _user(db, inst_id=inst_b.id, email="faculty.b@test.edu", name="Fac B", role="faculty", user_id="u_fac_b")
    student = _user(db, inst_id=inst_a.id, email="stu.a@test.edu", name="Stu A", role="student", user_id="u_stu_a")
    student_b = _user(db, inst_id=inst_b.id, email="stu.b@test.edu", name="Stu B", role="student", user_id="u_stu_b")
    db.add(StudentProfile(user_id=student.id, institution_id=inst_a.id, roll_no="A001"))
    db.add(StudentProfile(user_id=student_b.id, institution_id=inst_b.id, roll_no="B001"))

    questions = [
        Question(
            id="q_uni_1",
            institution_id=inst_a.id,
            exam_mode="university",
            exam_family=None,
            stem="University Q1?",
            options='["A","B","C","D"]',
            correct_answer="0",
            marks=2,
            negative_marks=0,
            difficulty="easy",
            q_type="mcq",
            concept="OS",
            status="approved",
        ),
        Question(
            id="q_uni_2",
            institution_id=inst_a.id,
            exam_mode="university",
            exam_family=None,
            stem="University Q2?",
            options='["A","B","C","D"]',
            correct_answer="1",
            marks=2,
            negative_marks=0,
            difficulty="medium",
            q_type="mcq",
            concept="DBMS",
            status="approved",
        ),
        Question(
            id="q_jee_phy",
            institution_id=inst_a.id,
            exam_mode="competitive",
            exam_family="jee",
            stem="JEE Physics?",
            options='["A","B","C","D"]',
            correct_answer="0",
            marks=4,
            negative_marks=1,
            difficulty="hard",
            q_type="mcq",
            concept="Kinematics",
            status="approved",
        ),
        Question(
            id="q_neet_phy",
            institution_id=inst_a.id,
            exam_mode="competitive",
            exam_family="neet",
            stem="NEET Physics?",
            options='["A","B","C","D"]',
            correct_answer="2",
            marks=4,
            negative_marks=1,
            difficulty="hard",
            q_type="mcq",
            concept="Kinematics",
            status="approved",
        ),
        Question(
            id="q_other_inst",
            institution_id=inst_b.id,
            exam_mode="university",
            exam_family=None,
            stem="Other institution?",
            options='["A","B","C","D"]',
            correct_answer="0",
            marks=1,
            negative_marks=0,
            difficulty="easy",
            q_type="mcq",
            concept="Other",
            status="approved",
        ),
    ]
    db.add_all(questions)
    db.commit()
    for user in (faculty, faculty_b, student, student_b):
        _ = user.primary_role
        _ = user.id
        _ = user.institution_id
        _ = user.email
        _ = user.full_name
    snapshot = {
        "inst_a": inst_a,
        "inst_b": inst_b,
        "faculty": faculty,
        "faculty_b": faculty_b,
        "student": student,
        "student_b": student_b,
    }
    db.close()
    yield snapshot


def auth_header(user: User) -> dict[str, str]:
    token = create_access_token(sub=user.id, institution_id=user.institution_id, roles=[user.primary_role])
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# Test-only competitive catalog (used by flows that need real subject scope).  #
# --------------------------------------------------------------------------- #
COMPETITIVE_CATALOG_ID = {
    "subjects": ["t_neet_bio", "t_jee_phy"],
    "chapters": ["t_cell_bio", "t_genetics", "t_mech", "t_electro"],
    "topics": ["t_cell_struct", "t_genetics_topics", "t_kinematics", "t_electro_topics"],
}


@pytest.fixture
def competitive_catalog(db, request):
    """Seed a small NEET/JEE catalog for the faculty institution; auto-cleanup."""
    from app.models.catalog import Chapter, Subject, Topic

    inst_id = request.getfixturevalue("world")["faculty"].institution_id
    rows = [
        Subject(id="t_neet_bio", institution_id=inst_id, code="NEET-BIO", name="Biology", exam_mode="competitive", exam_family="NEET"),
        Subject(id="t_jee_phy", institution_id=inst_id, code="JEE-PHY", name="Physics", exam_mode="competitive", exam_family="JEE_MAIN"),
    ]
    db.add_all(rows)
    db.flush()
    chapters = [
        Chapter(id="t_cell_bio", subject_id="t_neet_bio", name="Cell Biology", sort_order=1),
        Chapter(id="t_genetics", subject_id="t_neet_bio", name="Genetics", sort_order=2),
        Chapter(id="t_mech", subject_id="t_jee_phy", name="Mechanics", sort_order=1),
        Chapter(id="t_electro", subject_id="t_jee_phy", name="Electrodynamics", sort_order=2),
    ]
    db.add_all(chapters)
    db.flush()
    topics = [
        Topic(id="t_cell_struct", chapter_id="t_cell_bio", name="Cell Structure", sort_order=1),
        Topic(id="t_genetics_topics", chapter_id="t_genetics", name="Mendelian Inheritance", sort_order=1),
        Topic(id="t_kinematics", chapter_id="t_mech", name="Kinematics", sort_order=1),
        Topic(id="t_electro_topics", chapter_id="t_electro", name="Electrostatics", sort_order=1),
    ]
    db.add_all(topics)
    db.commit()

    def _cleanup():
        db.query(Topic).filter(Topic.id.in_(COMPETITIVE_CATALOG_ID["topics"])).delete(synchronize_session=False)
        db.query(Chapter).filter(Chapter.id.in_(COMPETITIVE_CATALOG_ID["chapters"])).delete(synchronize_session=False)
        db.query(Subject).filter(Subject.id.in_(COMPETITIVE_CATALOG_ID["subjects"])).delete(synchronize_session=False)
        db.commit()

    request.addfinalizer(_cleanup)
    return {"subjects": rows, "chapters": chapters, "topics": topics}


# --------------------------------------------------------------------------- #
# Fake deployed AI agent for tests (never used by production runtime).         #
# --------------------------------------------------------------------------- #
@pytest.fixture
def fake_ai_service(monkeypatch, db, request):
    """Simulate the deployed AI generation microservice.

    Records the exact request bodies EduX sends and — after `write_output()` is
    called — writes AiGeneratedPaper / AiGeneratedPaperQuestion rows into the
    shared DB exactly like the deployed service does. `set_job_status(job_id,
    payload)` overrides a job's status to simulate agent failures. Rows written
    by the fixture are removed when the test ends.

    Set `state["write_on_submit"] = True` before a request to simulate an agent
    that writes its output during submission (used by flows that expect the
    generation to be synchronously ready, e.g. Question Studio / Micro
    assessments).
    """
    from app.services import ai_paper_client

    state = {
        "requests": [],
        "jobs": {},
        "status_overrides": {},
        "written": set(),
        "counter": {"n": 0},
    }

    def _write_output():
        from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion

        for job_id, request_body in state["jobs"].items():
            if job_id in state["written"]:
                continue
            state["written"].add(job_id)
            paper_id = request_body["paper_id"]
            total = int(request_body.get("total_questions") or 1)
            db.add(AiGeneratedPaper(
                id=paper_id,
                paper_code=f"FAKE-AIP-{job_id}-{request_body['paper_id'][:8]}",
                title=request_body.get("test_name") or "Fake AI paper",
                exam_mode="Competitive",
                exam_family=request_body.get("exam_family"),
                subject_name=request_body.get("subject"),
                question_count=total,
                status="draft",
            ))
            db.flush()
            chapters = request_body.get("chapters") or [{"name": request_body.get("subject")}]
            for i in range(1, total + 1):
                chapter = chapters[(i - 1) % len(chapters)]
                notes = chapter.get("notes") or ""
                topic = notes.split(",")[0].strip() if notes else None
                db.add(AiGeneratedPaperQuestion(
                    paper_id=paper_id,
                    position=i,
                    level="medium",
                    stem_text=f"AI [{request_body.get('subject')} · {chapter['name']} · {topic or 'general'}] question {i}?",
                    options=[
                        {"key": "A", "text": f"Option A for {chapter['name']}", "imageUrl": None},
                        {"key": "B", "text": f"Option B for {chapter['name']}", "imageUrl": None},
                        {"key": "C", "text": f"Option C for {chapter['name']}", "imageUrl": None},
                        {"key": "D", "text": f"Option D for {chapter['name']}", "imageUrl": None},
                    ],
                    correct_option="A",
                    explanation="Real AI-generated explanation.",
                    marks=4,
                    negative_marks=1,
                    has_image=False,
                    stem_image_url=None,
                    extra={
                        "chapter_name": chapter["name"],
                        "topic_name": topic,
                        "question_type": request_body.get("question_type") or "MCQ",
                    },
                ))
        db.commit()

    def _generate_async(request_body):
        state["counter"]["n"] += 1
        job_id = f"fake-job-{state['counter']['n']}"
        state["requests"].append(request_body)
        state["jobs"][job_id] = request_body
        return {
            "job_id": job_id,
            "paper_id": request_body["paper_id"],
            "status": "queued",
            "queue_position": 0,
            "total_questions": int(request_body.get("total_questions") or 1),
            "estimated_minutes": 1,
            "resolved_chapters": request_body.get("chapters", []),
        }

    def _job_status(job_id):
        override = state["status_overrides"].get(job_id)
        if override:
            return override
        body = state["jobs"][job_id]
        total = int(body.get("total_questions") or 1)
        if job_id not in state["written"]:
            # No questions written yet — the agent is still working.
            return {
                "job_id": job_id,
                "paper_id": body["paper_id"],
                "status": "running",
                "questions_generated": 0,
                "questions_dropped": 0,
                "total_questions": total,
                "current_chapter": None,
                "elapsed_seconds": 1,
                "error": None,
            }
        return {
            "job_id": job_id,
            "paper_id": body["paper_id"],
            "status": "completed",
            "questions_generated": total,
            "questions_dropped": 0,
            "total_questions": total,
            "current_chapter": None,
            "elapsed_seconds": 1,
            "error": None,
        }

    def _set_job_status(job_id, payload):
        state["status_overrides"][job_id] = payload

    def _cleanup():
        from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion

        for job_id in state["written"]:
            paper_id = state["jobs"][job_id]["paper_id"]
            db.query(AiGeneratedPaperQuestion).filter(
                AiGeneratedPaperQuestion.paper_id == paper_id
            ).delete()
            paper = db.get(AiGeneratedPaper, paper_id)
            if paper:
                db.delete(paper)
        db.commit()

    request.addfinalizer(_cleanup)

    state["write_output"] = _write_output
    state["set_job_status"] = _set_job_status
    monkeypatch.setattr(ai_paper_client, "generate_async", _generate_async)
    monkeypatch.setattr(ai_paper_client, "job_status", _job_status)
    return state


def settle_generation(client, user, generation_id: str) -> dict:
    """Poll the generation status endpoint until the backend syncs the job."""
    res = client.get(
        f"/v1/faculty/question-bank/generations/{generation_id}", headers=auth_header(user)
    )
    assert res.status_code == 200, res.text
    return res.json()
