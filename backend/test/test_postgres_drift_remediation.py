"""Regression test: restored-database schema drift vs. the remediation path.

Root cause being guarded: a restored/legacy PostgreSQL database predating the
Phase-4 schema leaves tables that SQLAlchemy `create_all` never upgrades
(it only creates missing tables), so every ORM query touching the missing
columns (assignment_submissions.graded_by, assignments.status,
timetable_slots.topic, ...) fails with psycopg2.errors.UndefinedColumn and the
API returns HTTP 500 across Student/Faculty/Admin pages.

Remediation path asserted here (exactly what must run on the AWS database):
  1. app start-up -> ensure_schema() + Base.metadata.create_all() (auto-heal)
  2. sql/migrations/0003_complete_postgresql_schema.sql (additive columns etc.)
  3. sql/migrations/0004_repoint_legacy_foreign_keys.sql (FK graph repair)
  4. scripts/verify_postgres_schema.py exits 0 (SCHEMA VERIFICATION: PASS)

Requires a local PostgreSQL via the `pgserver` pip package; the whole module
is SKIPPED when it is not importable (SQLite CI keeps running everything
else). PostgreSQL runs only in a throwaway /tmp data directory — never on a
live/shared server.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import textwrap
import uuid
from pathlib import Path

import pytest

pgserver = pytest.importorskip("pgserver", reason="pgserver not installed — PostgreSQL rehearsal skipped")

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

PGDATA = Path(f"/tmp/edux_drift_test_{uuid.uuid4().hex[:8]}")

LEGACY_DDL = textwrap.dedent(
    """
    CREATE SCHEMA IF NOT EXISTS edux;

    -- legacy users (predates institution scoping columns)
    CREATE TABLE edux.users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255),
      full_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE edux.institutions (
      id VARCHAR(36) PRIMARY KEY,
      slug VARCHAR(120) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(32),
      timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
      academic_year VARCHAR(32),
      attendance_threshold DOUBLE PRECISION DEFAULT 75.0,
      pass_mark DOUBLE PRECISION DEFAULT 40.0,
      settings TEXT DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    INSERT INTO edux.institutions (id, slug, name) VALUES ('inst_t', 't', 'T');

    CREATE TABLE edux.faculty_profiles (
      user_id VARCHAR(36) PRIMARY KEY REFERENCES edux.users(id),
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      department_id VARCHAR(36),
      designation VARCHAR(128),
      specialization VARCHAR(255),
      employee_no VARCHAR(64)
    );
    CREATE TABLE edux.student_profiles (
      user_id VARCHAR(36) PRIMARY KEY REFERENCES edux.users(id),
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      roll_no VARCHAR(32) NOT NULL,
      enrollment_no VARCHAR(64),
      program_id VARCHAR(36),
      department_id VARCHAR(36),
      batch_id VARCHAR(36),
      section VARCHAR(16),
      admission_year INTEGER,
      academic_status VARCHAR(32) DEFAULT 'regular',
      cgpa DOUBLE PRECISION,
      date_of_birth DATE,
      gender VARCHAR(32),
      extra TEXT DEFAULT '{}',
      UNIQUE (institution_id, roll_no)
    );
    CREATE TABLE edux.programs (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      department_id VARCHAR(36),
      code VARCHAR(32) NOT NULL,
      name VARCHAR(255) NOT NULL,
      degree_type VARCHAR(64),
      duration_years INTEGER,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (institution_id, code)
    );
    CREATE TABLE edux.departments (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      code VARCHAR(16) NOT NULL,
      name VARCHAR(255) NOT NULL,
      hod_user_id VARCHAR(36),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (institution_id, code)
    );
    CREATE TABLE edux.subjects (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      department_id VARCHAR(36),
      code VARCHAR(32) NOT NULL,
      name VARCHAR(255) NOT NULL,
      exam_mode VARCHAR(32),
      exam_family VARCHAR(16),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE edux.courses (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      program_id VARCHAR(36),
      subject_id VARCHAR(36),
      code VARCHAR(32) NOT NULL,
      name VARCHAR(255) NOT NULL,
      credits DOUBLE PRECISION,
      semester_no INTEGER,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (institution_id, code)
    );
    CREATE TABLE edux.academic_terms (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      name VARCHAR(64) NOT NULL,
      academic_year VARCHAR(16) NOT NULL,
      is_current BOOLEAN DEFAULT false
    );
    CREATE TABLE edux.batches (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      code VARCHAR(64) NOT NULL,
      name VARCHAR(255) NOT NULL,
      exam_mode VARCHAR(32),
      exam_family VARCHAR(16),
      program_id VARCHAR(36),
      term_id VARCHAR(36),
      section VARCHAR(16),
      UNIQUE (institution_id, code)
    );

    -- legacy colliding "paper-import" tables (no model sentinel columns)
    CREATE TABLE edux.questions (
      id VARCHAR(36) PRIMARY KEY,
      import_ref VARCHAR(64),
      content TEXT,
      answer_key VARCHAR(8),
      max_marks INTEGER,
      imported_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE edux.papers (
      id VARCHAR(36) PRIMARY KEY,
      paper_code VARCHAR(64),
      label VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE edux.exam_attempts (
      id VARCHAR(36) PRIMARY KEY,
      external_student_ref VARCHAR(128),
      paper_id VARCHAR(36) REFERENCES edux.papers(id),
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      score DOUBLE PRECISION
    );

    -- Phase-4 columns missing (the documented production failure)
    CREATE TABLE edux.assignments (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      course_id VARCHAR(36),
      faculty_id VARCHAR(36),
      title VARCHAR(255) NOT NULL,
      body TEXT,
      due_at TIMESTAMPTZ,
      max_marks DOUBLE PRECISION,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE edux.assignment_submissions (
      id VARCHAR(36) PRIMARY KEY,
      assignment_id VARCHAR(36) NOT NULL REFERENCES edux.assignments(id),
      student_id VARCHAR(36) NOT NULL,
      files TEXT DEFAULT '[]',
      submitted_at TIMESTAMPTZ,
      marks DOUBLE PRECISION,
      feedback TEXT,
      status VARCHAR(32) DEFAULT 'pending',
      UNIQUE (assignment_id, student_id)
    );
    INSERT INTO edux.assignments (id, institution_id, title) VALUES ('a1', 'inst_t', 'preserved row');
    INSERT INTO edux.users (id, email, password_hash, full_name) VALUES ('u_stu_1', 'stu@t.edu', 'h', 'Stu One');
    INSERT INTO edux.student_profiles (user_id, institution_id, roll_no) VALUES ('u_stu_1', 'inst_t', 'R1');
    INSERT INTO edux.assignment_submissions (id, assignment_id, student_id, marks)
      VALUES ('s1', 'a1', 'u_stu_1', 42);

    -- surviving child whose FK would be orphaned onto questions_legacy
    CREATE TABLE edux.question_generations (
      id VARCHAR(36) PRIMARY KEY,
      institution_id VARCHAR(36) NOT NULL REFERENCES edux.institutions(id),
      faculty_id VARCHAR(36) NOT NULL,
      status VARCHAR(32) DEFAULT 'GENERATING',
      config TEXT DEFAULT '{}',
      requested_count INTEGER DEFAULT 0,
      generated_count INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE TABLE edux.question_generation_items (
      generation_id VARCHAR(36) NOT NULL REFERENCES edux.question_generations(id),
      question_id VARCHAR(36) NOT NULL REFERENCES edux.questions(id),
      sort_order INTEGER DEFAULT 0,
      PRIMARY KEY (generation_id, question_id)
    );
    """
)


@pytest.fixture(scope="module")
def pg():
    os.environ["DATABASE_URL"] = "postgresql+psycopg2://postgres@/postgres?host=" + str(PGDATA)
    os.environ["DB_SCHEMA"] = "edux"
    try:
        from app.core.config import get_settings
        get_settings.cache_clear()
    except Exception:
        pass
    srv = pgserver.get_server(PGDATA)
    srv.psql(LEGACY_DDL)
    yield srv
    try:
        srv.cleanup()
    finally:
        shutil.rmtree(PGDATA, ignore_errors=True)


def _psql_file(srv, path):
    from pgserver.postgres_server import POSTGRES_BIN_PATH
    env = {**os.environ, "PGOPTIONS": "-c search_path=edux,public"}
    out = subprocess.run(
        [str(POSTGRES_BIN_PATH / "psql"), srv.get_uri(), "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        capture_output=True, text=True, env=env, timeout=120,
    )
    assert out.returncode == 0, f"psql failed: {out.stderr[-2000:]}"
    return out


def test_legacy_drift_reproduces_and_remediation_passes(pg):
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import ProgrammingError

    url = pg.get_uri().replace("postgresql://", "postgresql+psycopg2://")
    engine = create_engine(url, connect_args={"options": "-csearch_path=edux"})

    # 1. reproduce the AWS failure class: model column missing -> UndefinedColumn
    with pytest.raises(ProgrammingError, match="does not exist"):
        with engine.connect() as conn:
            conn.execute(text("SELECT graded_by FROM edux.assignment_submissions LIMIT 1"))

    # 2. app boot-time auto-heal (same code path as app lifespan)
    os.environ["DATABASE_URL"] = url
    os.environ["DB_SCHEMA"] = "edux"
    from app.core.config import get_settings

    get_settings.cache_clear()
    import importlib

    import app.models  # noqa: F401  (register all models incl. ai_papers)
    from app.db.base import Base
    import app.db.session as db_session

    # rebuild engine/schema constants from the rehearsal env (module was first
    # imported under the sqlite conftest env)
    importlib.reload(db_session)
    db_session.ensure_schema()
    Base.metadata.create_all(bind=db_session.engine)

    with engine.connect() as conn:
        legacy_names = set(
            conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema='edux' AND table_name LIKE '%\\_legacy' ESCAPE '\\'")
            ).scalars()
        )
        assert {"questions_legacy", "papers_legacy", "exam_attempts_legacy"} <= legacy_names
        # drift still present after create_all (it never alters existing tables)
        with pytest.raises(ProgrammingError, match="does not exist"):
            conn.execute(text("SELECT graded_by FROM edux.assignment_submissions LIMIT 1"))
            conn.commit()
        conn.rollback()

    # 3. apply the additive migrations exactly as on AWS
    _psql_file(pg, BACKEND_ROOT / "sql/migrations/0003_complete_postgresql_schema.sql")
    _psql_file(pg, BACKEND_ROOT / "sql/migrations/0004_repoint_legacy_foreign_keys.sql")

    with engine.connect() as conn:
        row = conn.execute(text("SELECT graded_by, marks FROM edux.assignment_submissions WHERE id='s1'")).first()
        assert row is not None and row[1] == 42  # data preserved, column now exists

        ref = conn.execute(
            text(
                "SELECT confrelid::regclass::text FROM pg_constraint WHERE conname = 'fk__question_generation_items__question_id'"
            )
        ).scalar()
        assert ref in ("questions", "edux.questions"), f"FK still orphaned: {ref}"

    # 4. full schema verification passes against the remediated database
    env = {**os.environ, "DATABASE_URL": url, "DB_SCHEMA": "edux"}
    out = subprocess.run(
        [sys.executable, str(BACKEND_ROOT / "scripts/verify_postgres_schema.py"), "--database-url", url],
        capture_output=True, text=True, env=env, timeout=180, cwd=str(BACKEND_ROOT),
    )
    tail = (out.stdout or "")[-3000:] + (out.stderr or "")[-1000:]
    assert "SCHEMA VERIFICATION: PASS" in out.stdout, tail
