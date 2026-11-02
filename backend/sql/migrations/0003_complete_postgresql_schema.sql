-- ===========================================================================
-- EduX migration 0003 — COMPLETE PostgreSQL schema (structure only)
-- Generated from the CURRENT SQLAlchemy models (backend/app/models/**)
--   65 tables / 546 columns / 134 foreign keys / 40 indexes / 15 uniques
--
-- SOURCE OF TRUTH: SQLAlchemy models. This file brings a local PostgreSQL
-- database (schema "edux") fully in sync with the FastAPI backend runtime.
--
-- SAFETY CONTRACT
--   * Structure only. ZERO application/seed data (no users, no questions,
--     no demo numbers).
--   * Additive & idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT
--     EXISTS / CREATE INDEX IF NOT EXISTS; safe to re-run.
--   * NEVER: DROP TABLE, TRUNCATE, DELETE, data rewrite, type rewrite.
--   * Wrong-typed or incompatible existing objects are SKIPPED with a
--     WARNING (visible via psql and in the PostgreSQL server log) so a
--     human can decide — data is never touched. Run
--     backend/scripts/verify_postgres_schema.py afterwards for a report.
--
-- TYPES follow the models exactly:
--   * identifiers: VARCHAR(36) (app generates UUID strings in Python)
--   * timestamps: TIMESTAMPTZ   * JSON payloads: TEXT (app stores JSON strings)
--   * enums-as-strings: VARCHAR(n)  * floats: DOUBLE PRECISION
--   * A legacy database created from sql/schema.sql (native UUID/CITEXT/
--     JSONB/ENUM columns) is NOT converted here — see the report doc.
--
-- Run:  psql "postgresql://postgres:<pwd>@localhost:5432/<db>" -f backend/sql/migrations/0003_complete_postgresql_schema.sql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema + optional extensions (best effort, never fatal)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS edux;
SET search_path TO edux, public;

-- Extensions are NOT required by the current models (UUIDs are VARCHAR(36)
-- strings generated in Python). pgcrypto is created opportunistically for
-- parity with sql/schema.sql; failure is intentionally ignored.
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgcrypto extension unavailable (%) — not required by models', SQLERRM;
END $$;

-- No PostgreSQL ENUM, composite, array or JSONB types are defined by the
-- current models. All enumerations are VARCHAR columns validated by the app.

-- ---------------------------------------------------------------------------
-- 2. Tables (dependency order: parents first). Foreign keys are attached in
--    section 6 so that legacy type drift can never abort this file.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS edux.app_kv (
    key VARCHAR(191) NOT NULL,
    payload TEXT NOT NULL DEFAULT 'null',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (key)
);

CREATE TABLE IF NOT EXISTS edux.contact_inquiries (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    institution VARCHAR(255),
    topic VARCHAR(128),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.institutions (
    id VARCHAR(36) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(32),
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    academic_year VARCHAR(32),
    attendance_threshold DOUBLE PRECISION NOT NULL DEFAULT 75.0,
    pass_mark DOUBLE PRECISION NOT NULL DEFAULT 40.0,
    settings TEXT DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS edux.newsletter_subscribers (
    id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.otp_challenges (
    id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.academic_terms (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    name VARCHAR(64) NOT NULL,
    academic_year VARCHAR(16) NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.ai_prompt_templates (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    code VARCHAR(64) NOT NULL,
    version INTEGER NOT NULL,
    body TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (institution_id, code, version)
);

CREATE TABLE IF NOT EXISTS edux.calendar_events (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    payload TEXT DEFAULT '{}',
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.campuses (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(128),
    student_count INTEGER,
    PRIMARY KEY (id),
    UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS edux.institution_health_snapshots (
    institution_id VARCHAR(36) NOT NULL,
    overall DOUBLE PRECISION NOT NULL,
    academic DOUBLE PRECISION NOT NULL,
    student_success DOUBLE PRECISION NOT NULL,
    attendance DOUBLE PRECISION NOT NULL,
    assessment DOUBLE PRECISION NOT NULL,
    faculty DOUBLE PRECISION NOT NULL,
    outcomes DOUBLE PRECISION NOT NULL,
    payload TEXT NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (institution_id)
);

CREATE TABLE IF NOT EXISTS edux.issue_groups (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    fingerprint TEXT NOT NULL,
    similarity_score DOUBLE PRECISION,
    evidence TEXT NOT NULL,
    why_detected TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.registration_drafts (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    payload TEXT NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.roles (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(64) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS edux.users (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(80),
    avatar_url VARCHAR(512),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    role VARCHAR(32) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (institution_id, email)
);

CREATE TABLE IF NOT EXISTS edux.ai_conversations (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    channel VARCHAR(32) NOT NULL,
    title VARCHAR(255),
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.ai_traces (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    feature VARCHAR(64) NOT NULL,
    request TEXT NOT NULL,
    response_meta TEXT,
    latency_ms INTEGER,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.announcements (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    author_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    audience TEXT DEFAULT '{}',
    pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.audit_logs (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    actor_id VARCHAR(36),
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    before TEXT,
    after TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.auth_sessions (
    id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.departments (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    code VARCHAR(16) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_user_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS edux.files (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36),
    owner_id VARCHAR(36),
    bucket VARCHAR(64) NOT NULL,
    object_key VARCHAR(512) NOT NULL,
    mime VARCHAR(128),
    bytes INTEGER,
    purpose VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.guardians (
    user_id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS edux.question_generations (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'GENERATING',
    config TEXT NOT NULL DEFAULT '{}',
    requested_count INTEGER NOT NULL DEFAULT 0,
    generated_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.support_tickets (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    requester_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.user_roles (
    user_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_id, role_id, institution_id)
);

CREATE TABLE IF NOT EXISTS edux.ai_messages (
    id VARCHAR(36) NOT NULL,
    conversation_id VARCHAR(36) NOT NULL,
    role VARCHAR(16) NOT NULL,
    content TEXT NOT NULL,
    citations TEXT,
    prompt_id VARCHAR(36),
    model_id VARCHAR(64),
    tokens_in INTEGER,
    tokens_out INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.faculty_profiles (
    user_id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36),
    designation VARCHAR(128),
    specialization VARCHAR(255),
    employee_no VARCHAR(64),
    PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS edux.generated_reports (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    owner_id VARCHAR(36),
    scope VARCHAR(64) NOT NULL DEFAULT 'faculty',
    template_code VARCHAR(128) NOT NULL DEFAULT 'custom',
    payload TEXT NOT NULL DEFAULT '{}',
    object_key VARCHAR(512),
    file_id VARCHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.programs (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    degree_type VARCHAR(64),
    duration_years INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS edux.subjects (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    department_id VARCHAR(36),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL DEFAULT 'university',
    exam_family VARCHAR(16),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.batches (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    program_id VARCHAR(36),
    term_id VARCHAR(36),
    section VARCHAR(16),
    PRIMARY KEY (id),
    UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS edux.content_sources (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    subject_id VARCHAR(36),
    object_key VARCHAR(512),
    page_count INTEGER,
    analysis TEXT,
    extracted_text TEXT,
    analysis_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    analysis_error TEXT,
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.courses (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    program_id VARCHAR(36),
    subject_id VARCHAR(36),
    code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    credits DOUBLE PRECISION,
    semester_no INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS edux.interventions (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    group_id VARCHAR(36),
    faculty_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'detected',
    priority VARCHAR(16) NOT NULL DEFAULT 'medium',
    objectives TEXT,
    recommended_action TEXT,
    expected_outcome TEXT,
    practice_config TEXT,
    evidence TEXT NOT NULL,
    notes TEXT,
    approved_by VARCHAR(36),
    approved_at TIMESTAMP WITH TIME ZONE,
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.micro_assessments (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    subject VARCHAR(128),
    chapter VARCHAR(255),
    topic VARCHAR(255),
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    deadline_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    generation_id VARCHAR(36),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.research_publications (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    title VARCHAR(512) NOT NULL,
    venue VARCHAR(255),
    year INTEGER,
    kind VARCHAR(32) NOT NULL DEFAULT 'paper',
    doi VARCHAR(128),
    citations INTEGER NOT NULL DEFAULT 0,
    extra TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.assignments (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36),
    faculty_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    due_at TIMESTAMP WITH TIME ZONE,
    max_marks DOUBLE PRECISION,
    status VARCHAR(32) NOT NULL DEFAULT 'published',
    published_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.attendance_sessions (
    id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    batch_id VARCHAR(36),
    marked_by VARCHAR(36),
    session_date DATE NOT NULL,
    topic VARCHAR(255),
    PRIMARY KEY (id),
    UNIQUE (course_id, batch_id, session_date)
);

CREATE TABLE IF NOT EXISTS edux.chapters (
    id VARCHAR(36) NOT NULL,
    subject_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    unit_no INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.intervention_effectiveness (
    id VARCHAR(36) NOT NULL,
    intervention_id VARCHAR(36) NOT NULL,
    metric VARCHAR(64) NOT NULL,
    baseline DOUBLE PRECISION,
    observed DOUBLE PRECISION,
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.intervention_status_history (
    id VARCHAR(36) NOT NULL,
    intervention_id VARCHAR(36) NOT NULL,
    from_status VARCHAR(32),
    to_status VARCHAR(32) NOT NULL,
    changed_by VARCHAR(36),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.lesson_plans (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36),
    payload TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.papers (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    paper_code VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    subject_id VARCHAR(36),
    course_id VARCHAR(36),
    paper_type VARCHAR(64),
    duration_minutes INTEGER NOT NULL,
    total_marks DOUBLE PRECISION NOT NULL,
    negative_marking BOOLEAN NOT NULL DEFAULT false,
    blueprint TEXT NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    parent_paper_id VARCHAR(36),
    intervention_id VARCHAR(36),
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (institution_id, paper_code)
);

CREATE TABLE IF NOT EXISTS edux.question_studio_sessions (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36) NOT NULL,
    source_id VARCHAR(36),
    settings TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.source_chunks (
    id VARCHAR(36) NOT NULL,
    source_id VARCHAR(36) NOT NULL,
    page_no INTEGER,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    text TEXT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.student_profiles (
    user_id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    roll_no VARCHAR(32) NOT NULL,
    enrollment_no VARCHAR(64),
    program_id VARCHAR(36),
    department_id VARCHAR(36),
    batch_id VARCHAR(36),
    section VARCHAR(16),
    admission_year INTEGER,
    academic_status VARCHAR(32) NOT NULL DEFAULT 'regular',
    cgpa DOUBLE PRECISION,
    date_of_birth DATE,
    gender VARCHAR(32),
    extra TEXT DEFAULT '{}',
    PRIMARY KEY (user_id),
    UNIQUE (institution_id, roll_no)
);

CREATE TABLE IF NOT EXISTS edux.timetable_slots (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    faculty_id VARCHAR(36),
    course_id VARCHAR(36),
    batch_id VARCHAR(36),
    room VARCHAR(64),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    topic VARCHAR(255),
    slot_type VARCHAR(32),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.assignment_submissions (
    id VARCHAR(36) NOT NULL,
    assignment_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    files TEXT DEFAULT '[]',
    submitted_at TIMESTAMP WITH TIME ZONE,
    marks DOUBLE PRECISION,
    feedback TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    graded_by VARCHAR(36),
    graded_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (id),
    UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS edux.attendance_records (
    session_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    mark VARCHAR(16) NOT NULL,
    PRIMARY KEY (session_id, student_id)
);

CREATE TABLE IF NOT EXISTS edux.enrollments (
    id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    course_id VARCHAR(36) NOT NULL,
    term_id VARCHAR(36),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.exam_sittings (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    paper_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    attempt_kind VARCHAR(32) NOT NULL DEFAULT 'practice',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    server_seed VARCHAR(64),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.guardian_students (
    guardian_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    relationship VARCHAR(64),
    PRIMARY KEY (guardian_id, student_id)
);

CREATE TABLE IF NOT EXISTS edux.intervention_students (
    id VARCHAR(36) NOT NULL,
    intervention_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status VARCHAR(32) NOT NULL DEFAULT 'assigned',
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.micro_assessment_attempts (
    id VARCHAR(36) NOT NULL,
    assessment_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    answers TEXT NOT NULL DEFAULT '{}',
    scoring TEXT NOT NULL DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.micro_assessment_targets (
    id VARCHAR(36) NOT NULL,
    assessment_id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id),
    UNIQUE (assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS edux.paper_shares (
    id VARCHAR(36) NOT NULL,
    paper_id VARCHAR(36) NOT NULL,
    shared_by VARCHAR(36),
    audience TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.student_dna_snapshots (
    id VARCHAR(36) NOT NULL,
    student_id VARCHAR(36) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    payload TEXT NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.topics (
    id VARCHAR(36) NOT NULL,
    chapter_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.exam_attempts (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    sitting_id VARCHAR(36),
    student_id VARCHAR(36) NOT NULL,
    roll_no VARCHAR(32) NOT NULL,
    batch_id VARCHAR(36),
    section_id VARCHAR(16),
    exam_id VARCHAR(36),
    exam_name VARCHAR(255) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    source VARCHAR(32) NOT NULL DEFAULT 'exam_agent',
    attempt_kind VARCHAR(32) NOT NULL DEFAULT 'practice',
    is_demo BOOLEAN NOT NULL DEFAULT false,
    intervention_id VARCHAR(36),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    exam_snapshot TEXT NOT NULL,
    timing TEXT NOT NULL,
    scoring TEXT NOT NULL,
    interactions TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.questions (
    id VARCHAR(36) NOT NULL,
    institution_id VARCHAR(36) NOT NULL,
    exam_mode VARCHAR(32) NOT NULL,
    exam_family VARCHAR(16),
    subject_id VARCHAR(36),
    chapter_id VARCHAR(36),
    topic_id VARCHAR(36),
    concept VARCHAR(255),
    stem TEXT NOT NULL,
    q_type VARCHAR(32) NOT NULL DEFAULT 'mcq',
    options TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    marks DOUBLE PRECISION NOT NULL DEFAULT 1,
    negative_marks DOUBLE PRECISION NOT NULL DEFAULT 0,
    difficulty VARCHAR(16),
    bloom VARCHAR(32),
    is_pyq BOOLEAN NOT NULL DEFAULT false,
    pyq_year INTEGER,
    source VARCHAR(64),
    quality_score DOUBLE PRECISION,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.exam_question_attempts (
    id VARCHAR(36) NOT NULL,
    attempt_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36),
    question_number INTEGER NOT NULL,
    question_snapshot TEXT NOT NULL,
    academic_context TEXT NOT NULL,
    response TEXT NOT NULL,
    timing TEXT NOT NULL,
    behaviour TEXT NOT NULL,
    evaluation TEXT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS edux.micro_assessment_questions (
    assessment_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    snapshot TEXT,
    PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS edux.paper_questions (
    paper_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    sort_order INTEGER NOT NULL,
    marks_override DOUBLE PRECISION,
    snapshot TEXT NOT NULL,
    PRIMARY KEY (paper_id, question_id)
);

CREATE TABLE IF NOT EXISTS edux.question_generation_items (
    generation_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (generation_id, question_id)
);

CREATE TABLE IF NOT EXISTS edux.question_versions (
    id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    stem TEXT NOT NULL,
    options TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    created_by VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);


-- ---------------------------------------------------------------------------
-- 3. Column compatibility for PRE-EXISTING tables (no-ops after section 2).
--    Model defaults are included so NOT NULL columns can be added safely to
--    populated tables (mirrors migration 0001 / app ensure_schema()).
--    Columns that are NOT NULL in the model WITHOUT a default are added
--    nullable and tightened in section 4.
-- ---------------------------------------------------------------------------

-- app_kv
ALTER TABLE edux.app_kv ADD COLUMN IF NOT EXISTS key VARCHAR(191);
ALTER TABLE edux.app_kv ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT 'null';
ALTER TABLE edux.app_kv ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- contact_inquiries
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS institution VARCHAR(255);
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS topic VARCHAR(128);
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE edux.contact_inquiries ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- institutions
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS slug VARCHAR(120);
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS short_name VARCHAR(32);
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata';
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32);
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS attendance_threshold DOUBLE PRECISION NOT NULL DEFAULT 75.0;
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS pass_mark DOUBLE PRECISION NOT NULL DEFAULT 40.0;
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS settings TEXT DEFAULT '{}';
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.institutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- newsletter_subscribers
ALTER TABLE edux.newsletter_subscribers ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.newsletter_subscribers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE edux.newsletter_subscribers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- otp_challenges
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS purpose VARCHAR(32);
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS code_hash VARCHAR(255);
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.otp_challenges ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- academic_terms
ALTER TABLE edux.academic_terms ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.academic_terms ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.academic_terms ADD COLUMN IF NOT EXISTS name VARCHAR(64);
ALTER TABLE edux.academic_terms ADD COLUMN IF NOT EXISTS academic_year VARCHAR(16);
ALTER TABLE edux.academic_terms ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;

-- ai_prompt_templates
ALTER TABLE edux.ai_prompt_templates ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.ai_prompt_templates ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.ai_prompt_templates ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE edux.ai_prompt_templates ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE edux.ai_prompt_templates ADD COLUMN IF NOT EXISTS body TEXT;

-- calendar_events
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS kind VARCHAR(32);
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.calendar_events ADD COLUMN IF NOT EXISTS payload TEXT DEFAULT '{}';

-- campuses
ALTER TABLE edux.campuses ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.campuses ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.campuses ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.campuses ADD COLUMN IF NOT EXISTS city VARCHAR(128);
ALTER TABLE edux.campuses ADD COLUMN IF NOT EXISTS student_count INTEGER;

-- institution_health_snapshots
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS overall DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS academic DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS student_success DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS attendance DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS assessment DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS faculty DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS outcomes DOUBLE PRECISION;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS payload TEXT;
ALTER TABLE edux.institution_health_snapshots ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- issue_groups
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS similarity_score DOUBLE PRECISION;
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS why_detected TEXT;
ALTER TABLE edux.issue_groups ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- registration_drafts
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS payload TEXT;
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.registration_drafts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- roles
ALTER TABLE edux.roles ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.roles ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.roles ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE edux.roles ADD COLUMN IF NOT EXISTS name VARCHAR(64);

-- users
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS first_name VARCHAR(80);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(512);
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS role VARCHAR(32) DEFAULT 'student';
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- ai_conversations
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS channel VARCHAR(32);
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.ai_conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- ai_traces
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS feature VARCHAR(64);
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS request TEXT;
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS response_meta TEXT;
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS latency_ms INTEGER;
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS status VARCHAR(32);
ALTER TABLE edux.ai_traces ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- announcements
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS author_id VARCHAR(36);
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT '{}';
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- audit_logs
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS actor_id VARCHAR(36);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(64);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(64);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS resource_id VARCHAR(64);
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS before TEXT;
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS after TEXT;
ALTER TABLE edux.audit_logs ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- auth_sessions
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS user_agent VARCHAR(255);
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.auth_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- departments
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS code VARCHAR(16);
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS hod_user_id VARCHAR(36);
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- files
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS bucket VARCHAR(64);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS object_key VARCHAR(512);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS mime VARCHAR(128);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS bytes INTEGER;
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS purpose VARCHAR(64);
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- guardians
ALTER TABLE edux.guardians ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.guardians ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);

-- question_generations
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'GENERATING';
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS config TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS requested_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS generated_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.question_generations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- support_tickets
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS requester_id VARCHAR(36);
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'open';
ALTER TABLE edux.support_tickets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- user_roles
ALTER TABLE edux.user_roles ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.user_roles ADD COLUMN IF NOT EXISTS role_id VARCHAR(36);
ALTER TABLE edux.user_roles ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);

-- ai_messages
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(36);
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS role VARCHAR(16);
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS citations TEXT;
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS prompt_id VARCHAR(36);
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS model_id VARCHAR(64);
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS tokens_in INTEGER;
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS tokens_out INTEGER;
ALTER TABLE edux.ai_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- faculty_profiles
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS department_id VARCHAR(36);
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS designation VARCHAR(128);
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
ALTER TABLE edux.faculty_profiles ADD COLUMN IF NOT EXISTS employee_no VARCHAR(64);

-- generated_reports
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS owner_id VARCHAR(36);
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS scope VARCHAR(64) NOT NULL DEFAULT 'faculty';
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS template_code VARCHAR(128) NOT NULL DEFAULT 'custom';
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS object_key VARCHAR(512);
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS file_id VARCHAR(36);
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'queued';
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.generated_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- programs
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS department_id VARCHAR(36);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS degree_type VARCHAR(64);
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS duration_years INTEGER;
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.programs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- subjects
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS department_id VARCHAR(36);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32) NOT NULL DEFAULT 'university';
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- batches
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS code VARCHAR(64);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS program_id VARCHAR(36);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS term_id VARCHAR(36);
ALTER TABLE edux.batches ADD COLUMN IF NOT EXISTS section VARCHAR(16);

-- content_sources
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS subject_id VARCHAR(36);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS object_key VARCHAR(512);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS page_count INTEGER;
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS analysis TEXT;
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(32) NOT NULL DEFAULT 'PENDING';
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS analysis_error TEXT;
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- courses
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS program_id VARCHAR(36);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS subject_id VARCHAR(36);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS code VARCHAR(32);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS credits DOUBLE PRECISION;
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS semester_no INTEGER;
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- interventions
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS group_id VARCHAR(36);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'detected';
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS priority VARCHAR(16) NOT NULL DEFAULT 'medium';
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS objectives TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS recommended_action TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS expected_outcome TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS practice_config TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS approved_by VARCHAR(36);
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.interventions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- micro_assessments
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS subject VARCHAR(128);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS chapter VARCHAR(255);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 15;
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'draft';
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS generation_id VARCHAR(36);
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.micro_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- research_publications
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS title VARCHAR(512);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS venue VARCHAR(255);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS kind VARCHAR(32) NOT NULL DEFAULT 'paper';
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS doi VARCHAR(128);
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS citations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS extra TEXT;
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.research_publications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- assignments
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS max_marks DOUBLE PRECISION;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'published';
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- attendance_sessions
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36);
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS marked_by VARCHAR(36);
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS session_date DATE;
ALTER TABLE edux.attendance_sessions ADD COLUMN IF NOT EXISTS topic VARCHAR(255);

-- chapters
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS subject_id VARCHAR(36);
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS unit_no INTEGER;
ALTER TABLE edux.chapters ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- intervention_effectiveness
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS intervention_id VARCHAR(36);
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS metric VARCHAR(64);
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS baseline DOUBLE PRECISION;
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS observed DOUBLE PRECISION;
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE edux.intervention_effectiveness ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- intervention_status_history
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS intervention_id VARCHAR(36);
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS from_status VARCHAR(32);
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS to_status VARCHAR(32);
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS changed_by VARCHAR(36);
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE edux.intervention_status_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- lesson_plans
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS payload TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.lesson_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- papers
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS paper_code VARCHAR(64);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS subject_id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS paper_type VARCHAR(64);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS total_marks DOUBLE PRECISION;
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS negative_marking BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS blueprint TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'draft';
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS parent_paper_id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS intervention_id VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- question_studio_sessions
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS source_id VARCHAR(36);
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS settings TEXT;
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'open';
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.question_studio_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- source_chunks
ALTER TABLE edux.source_chunks ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.source_chunks ADD COLUMN IF NOT EXISTS source_id VARCHAR(36);
ALTER TABLE edux.source_chunks ADD COLUMN IF NOT EXISTS page_no INTEGER;
ALTER TABLE edux.source_chunks ADD COLUMN IF NOT EXISTS chunk_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.source_chunks ADD COLUMN IF NOT EXISTS text TEXT;

-- student_profiles
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS user_id VARCHAR(36);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS roll_no VARCHAR(32);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS enrollment_no VARCHAR(64);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS program_id VARCHAR(36);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS department_id VARCHAR(36);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS section VARCHAR(16);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS admission_year INTEGER;
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS academic_status VARCHAR(32) NOT NULL DEFAULT 'regular';
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS cgpa DOUBLE PRECISION;
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(32);
ALTER TABLE edux.student_profiles ADD COLUMN IF NOT EXISTS extra TEXT DEFAULT '{}';

-- timetable_slots
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS faculty_id VARCHAR(36);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS room VARCHAR(64);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
ALTER TABLE edux.timetable_slots ADD COLUMN IF NOT EXISTS slot_type VARCHAR(32);

-- assignment_submissions
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS assignment_id VARCHAR(36);
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS files TEXT DEFAULT '[]';
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS marks DOUBLE PRECISION;
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS graded_by VARCHAR(36);
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE;

-- attendance_records
ALTER TABLE edux.attendance_records ADD COLUMN IF NOT EXISTS session_id VARCHAR(36);
ALTER TABLE edux.attendance_records ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.attendance_records ADD COLUMN IF NOT EXISTS mark VARCHAR(16);

-- enrollments
ALTER TABLE edux.enrollments ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.enrollments ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.enrollments ADD COLUMN IF NOT EXISTS course_id VARCHAR(36);
ALTER TABLE edux.enrollments ADD COLUMN IF NOT EXISTS term_id VARCHAR(36);
ALTER TABLE edux.enrollments ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'active';

-- exam_sittings
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS paper_id VARCHAR(36);
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS attempt_kind VARCHAR(32) NOT NULL DEFAULT 'practice';
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.exam_sittings ADD COLUMN IF NOT EXISTS server_seed VARCHAR(64);

-- guardian_students
ALTER TABLE edux.guardian_students ADD COLUMN IF NOT EXISTS guardian_id VARCHAR(36);
ALTER TABLE edux.guardian_students ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.guardian_students ADD COLUMN IF NOT EXISTS relationship VARCHAR(64);

-- intervention_students
ALTER TABLE edux.intervention_students ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.intervention_students ADD COLUMN IF NOT EXISTS intervention_id VARCHAR(36);
ALTER TABLE edux.intervention_students ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.intervention_students ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.intervention_students ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'assigned';

-- micro_assessment_attempts
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS assessment_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS answers TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS scoring TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'in_progress';
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.micro_assessment_attempts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- micro_assessment_targets
ALTER TABLE edux.micro_assessment_targets ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.micro_assessment_targets ADD COLUMN IF NOT EXISTS assessment_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_targets ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_targets ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- paper_shares
ALTER TABLE edux.paper_shares ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.paper_shares ADD COLUMN IF NOT EXISTS paper_id VARCHAR(36);
ALTER TABLE edux.paper_shares ADD COLUMN IF NOT EXISTS shared_by VARCHAR(36);
ALTER TABLE edux.paper_shares ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT '{}';
ALTER TABLE edux.paper_shares ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- student_dna_snapshots
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS payload TEXT;
ALTER TABLE edux.student_dna_snapshots ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- topics
ALTER TABLE edux.topics ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.topics ADD COLUMN IF NOT EXISTS chapter_id VARCHAR(36);
ALTER TABLE edux.topics ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE edux.topics ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- exam_attempts
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS sitting_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS student_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS roll_no VARCHAR(32);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS batch_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS section_id VARCHAR(16);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS exam_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS exam_name VARCHAR(255);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'exam_agent';
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS attempt_kind VARCHAR(32) NOT NULL DEFAULT 'practice';
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS intervention_id VARCHAR(36);
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS exam_snapshot TEXT;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS timing TEXT;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS scoring TEXT;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS interactions TEXT;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE edux.exam_attempts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- questions
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS institution_id VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS exam_mode VARCHAR(32);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS exam_family VARCHAR(16);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS subject_id VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS chapter_id VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS topic_id VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS concept VARCHAR(255);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS stem TEXT;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS q_type VARCHAR(32) NOT NULL DEFAULT 'mcq';
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS options TEXT;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS marks DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS negative_marks DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(16);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS bloom VARCHAR(32);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS is_pyq BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS pyq_year INTEGER;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS source VARCHAR(64);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION;
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'approved';
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- exam_question_attempts
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS attempt_id VARCHAR(36);
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS question_id VARCHAR(36);
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS question_number INTEGER;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS question_snapshot TEXT;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS academic_context TEXT;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS response TEXT;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS timing TEXT;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS behaviour TEXT;
ALTER TABLE edux.exam_question_attempts ADD COLUMN IF NOT EXISTS evaluation TEXT;

-- micro_assessment_questions
ALTER TABLE edux.micro_assessment_questions ADD COLUMN IF NOT EXISTS assessment_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_questions ADD COLUMN IF NOT EXISTS question_id VARCHAR(36);
ALTER TABLE edux.micro_assessment_questions ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE edux.micro_assessment_questions ADD COLUMN IF NOT EXISTS snapshot TEXT;

-- paper_questions
ALTER TABLE edux.paper_questions ADD COLUMN IF NOT EXISTS paper_id VARCHAR(36);
ALTER TABLE edux.paper_questions ADD COLUMN IF NOT EXISTS question_id VARCHAR(36);
ALTER TABLE edux.paper_questions ADD COLUMN IF NOT EXISTS sort_order INTEGER;
ALTER TABLE edux.paper_questions ADD COLUMN IF NOT EXISTS marks_override DOUBLE PRECISION;
ALTER TABLE edux.paper_questions ADD COLUMN IF NOT EXISTS snapshot TEXT;

-- question_generation_items
ALTER TABLE edux.question_generation_items ADD COLUMN IF NOT EXISTS generation_id VARCHAR(36);
ALTER TABLE edux.question_generation_items ADD COLUMN IF NOT EXISTS question_id VARCHAR(36);
ALTER TABLE edux.question_generation_items ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- question_versions
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS id VARCHAR(36);
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS question_id VARCHAR(36);
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS stem TEXT;
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS options TEXT;
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS correct_answer TEXT;
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'draft';
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS created_by VARCHAR(36);
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();
ALTER TABLE edux.question_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();


-- ---------------------------------------------------------------------------
-- 4. NOT NULL enforcement (model nullability). Guarded: refuses to fail —
--    if existing rows hold NULLs the column stays nullable and a WARNING is
--    raised for manual follow-up. Never rewrites or deletes rows.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('app_kv','key'),
        ('app_kv','payload'),
        ('app_kv','updated_at'),
        ('contact_inquiries','id'),
        ('contact_inquiries','created_at'),
        ('institutions','id'),
        ('institutions','slug'),
        ('institutions','name'),
        ('institutions','timezone'),
        ('institutions','attendance_threshold'),
        ('institutions','pass_mark'),
        ('institutions','created_at'),
        ('institutions','updated_at'),
        ('newsletter_subscribers','id'),
        ('newsletter_subscribers','email'),
        ('newsletter_subscribers','created_at'),
        ('otp_challenges','id'),
        ('otp_challenges','email'),
        ('otp_challenges','purpose'),
        ('otp_challenges','code_hash'),
        ('otp_challenges','attempts'),
        ('otp_challenges','expires_at'),
        ('otp_challenges','created_at'),
        ('academic_terms','id'),
        ('academic_terms','institution_id'),
        ('academic_terms','name'),
        ('academic_terms','academic_year'),
        ('academic_terms','is_current'),
        ('ai_prompt_templates','id'),
        ('ai_prompt_templates','code'),
        ('ai_prompt_templates','version'),
        ('ai_prompt_templates','body'),
        ('calendar_events','id'),
        ('calendar_events','institution_id'),
        ('calendar_events','title'),
        ('calendar_events','kind'),
        ('campuses','id'),
        ('campuses','institution_id'),
        ('campuses','name'),
        ('institution_health_snapshots','institution_id'),
        ('institution_health_snapshots','overall'),
        ('institution_health_snapshots','academic'),
        ('institution_health_snapshots','student_success'),
        ('institution_health_snapshots','attendance'),
        ('institution_health_snapshots','assessment'),
        ('institution_health_snapshots','faculty'),
        ('institution_health_snapshots','outcomes'),
        ('institution_health_snapshots','payload'),
        ('institution_health_snapshots','computed_at'),
        ('issue_groups','id'),
        ('issue_groups','institution_id'),
        ('issue_groups','fingerprint'),
        ('issue_groups','evidence'),
        ('issue_groups','created_at'),
        ('registration_drafts','id'),
        ('registration_drafts','email'),
        ('registration_drafts','payload'),
        ('registration_drafts','created_at'),
        ('roles','id'),
        ('roles','code'),
        ('roles','name'),
        ('users','id'),
        ('users','email'),
        ('users','full_name'),
        ('users','status'),
        ('users','created_at'),
        ('users','updated_at'),
        ('ai_conversations','id'),
        ('ai_conversations','institution_id'),
        ('ai_conversations','user_id'),
        ('ai_conversations','channel'),
        ('ai_conversations','pinned'),
        ('ai_conversations','created_at'),
        ('ai_traces','id'),
        ('ai_traces','institution_id'),
        ('ai_traces','feature'),
        ('ai_traces','request'),
        ('ai_traces','status'),
        ('ai_traces','created_at'),
        ('announcements','id'),
        ('announcements','institution_id'),
        ('announcements','title'),
        ('announcements','pinned'),
        ('announcements','created_at'),
        ('audit_logs','id'),
        ('audit_logs','action'),
        ('audit_logs','resource_type'),
        ('audit_logs','occurred_at'),
        ('auth_sessions','id'),
        ('auth_sessions','user_id'),
        ('auth_sessions','refresh_token_hash'),
        ('auth_sessions','expires_at'),
        ('auth_sessions','created_at'),
        ('departments','id'),
        ('departments','institution_id'),
        ('departments','code'),
        ('departments','name'),
        ('departments','created_at'),
        ('departments','updated_at'),
        ('files','id'),
        ('files','bucket'),
        ('files','object_key'),
        ('files','created_at'),
        ('guardians','user_id'),
        ('guardians','institution_id'),
        ('question_generations','id'),
        ('question_generations','institution_id'),
        ('question_generations','faculty_id'),
        ('question_generations','status'),
        ('question_generations','config'),
        ('question_generations','requested_count'),
        ('question_generations','generated_count'),
        ('question_generations','created_at'),
        ('question_generations','updated_at'),
        ('support_tickets','id'),
        ('support_tickets','institution_id'),
        ('support_tickets','requester_id'),
        ('support_tickets','title'),
        ('support_tickets','status'),
        ('support_tickets','created_at'),
        ('user_roles','user_id'),
        ('user_roles','role_id'),
        ('user_roles','institution_id'),
        ('ai_messages','id'),
        ('ai_messages','conversation_id'),
        ('ai_messages','role'),
        ('ai_messages','content'),
        ('ai_messages','created_at'),
        ('faculty_profiles','user_id'),
        ('faculty_profiles','institution_id'),
        ('generated_reports','id'),
        ('generated_reports','institution_id'),
        ('generated_reports','scope'),
        ('generated_reports','template_code'),
        ('generated_reports','payload'),
        ('generated_reports','status'),
        ('generated_reports','archived'),
        ('generated_reports','created_at'),
        ('programs','id'),
        ('programs','institution_id'),
        ('programs','code'),
        ('programs','name'),
        ('programs','created_at'),
        ('programs','updated_at'),
        ('subjects','id'),
        ('subjects','institution_id'),
        ('subjects','code'),
        ('subjects','name'),
        ('subjects','exam_mode'),
        ('subjects','created_at'),
        ('subjects','updated_at'),
        ('batches','id'),
        ('batches','institution_id'),
        ('batches','code'),
        ('batches','name'),
        ('batches','exam_mode'),
        ('content_sources','id'),
        ('content_sources','institution_id'),
        ('content_sources','title'),
        ('content_sources','exam_mode'),
        ('content_sources','analysis_status'),
        ('content_sources','created_at'),
        ('content_sources','updated_at'),
        ('courses','id'),
        ('courses','institution_id'),
        ('courses','code'),
        ('courses','name'),
        ('courses','created_at'),
        ('courses','updated_at'),
        ('interventions','id'),
        ('interventions','institution_id'),
        ('interventions','title'),
        ('interventions','status'),
        ('interventions','priority'),
        ('interventions','evidence'),
        ('interventions','created_at'),
        ('interventions','updated_at'),
        ('micro_assessments','id'),
        ('micro_assessments','institution_id'),
        ('micro_assessments','faculty_id'),
        ('micro_assessments','title'),
        ('micro_assessments','duration_minutes'),
        ('micro_assessments','status'),
        ('micro_assessments','created_at'),
        ('micro_assessments','updated_at'),
        ('research_publications','id'),
        ('research_publications','institution_id'),
        ('research_publications','faculty_id'),
        ('research_publications','title'),
        ('research_publications','kind'),
        ('research_publications','citations'),
        ('research_publications','created_at'),
        ('research_publications','updated_at'),
        ('assignments','id'),
        ('assignments','institution_id'),
        ('assignments','title'),
        ('assignments','status'),
        ('assignments','created_at'),
        ('attendance_sessions','id'),
        ('attendance_sessions','course_id'),
        ('attendance_sessions','session_date'),
        ('chapters','id'),
        ('chapters','subject_id'),
        ('chapters','name'),
        ('chapters','sort_order'),
        ('intervention_effectiveness','id'),
        ('intervention_effectiveness','intervention_id'),
        ('intervention_effectiveness','metric'),
        ('intervention_effectiveness','recorded_at'),
        ('intervention_status_history','id'),
        ('intervention_status_history','intervention_id'),
        ('intervention_status_history','to_status'),
        ('intervention_status_history','created_at'),
        ('lesson_plans','id'),
        ('lesson_plans','institution_id'),
        ('lesson_plans','faculty_id'),
        ('lesson_plans','payload'),
        ('lesson_plans','created_at'),
        ('papers','id'),
        ('papers','institution_id'),
        ('papers','paper_code'),
        ('papers','title'),
        ('papers','exam_mode'),
        ('papers','duration_minutes'),
        ('papers','total_marks'),
        ('papers','negative_marking'),
        ('papers','blueprint'),
        ('papers','status'),
        ('papers','version'),
        ('papers','created_at'),
        ('papers','updated_at'),
        ('question_studio_sessions','id'),
        ('question_studio_sessions','institution_id'),
        ('question_studio_sessions','faculty_id'),
        ('question_studio_sessions','settings'),
        ('question_studio_sessions','status'),
        ('question_studio_sessions','created_at'),
        ('question_studio_sessions','updated_at'),
        ('source_chunks','id'),
        ('source_chunks','source_id'),
        ('source_chunks','chunk_index'),
        ('source_chunks','text'),
        ('student_profiles','user_id'),
        ('student_profiles','institution_id'),
        ('student_profiles','roll_no'),
        ('student_profiles','academic_status'),
        ('timetable_slots','id'),
        ('timetable_slots','institution_id'),
        ('timetable_slots','starts_at'),
        ('timetable_slots','ends_at'),
        ('assignment_submissions','id'),
        ('assignment_submissions','assignment_id'),
        ('assignment_submissions','student_id'),
        ('assignment_submissions','status'),
        ('attendance_records','session_id'),
        ('attendance_records','student_id'),
        ('attendance_records','mark'),
        ('enrollments','id'),
        ('enrollments','student_id'),
        ('enrollments','course_id'),
        ('enrollments','status'),
        ('exam_sittings','id'),
        ('exam_sittings','institution_id'),
        ('exam_sittings','paper_id'),
        ('exam_sittings','student_id'),
        ('exam_sittings','attempt_kind'),
        ('exam_sittings','started_at'),
        ('exam_sittings','expires_at'),
        ('guardian_students','guardian_id'),
        ('guardian_students','student_id'),
        ('intervention_students','id'),
        ('intervention_students','intervention_id'),
        ('intervention_students','student_id'),
        ('intervention_students','assigned_at'),
        ('intervention_students','status'),
        ('micro_assessment_attempts','id'),
        ('micro_assessment_attempts','assessment_id'),
        ('micro_assessment_attempts','student_id'),
        ('micro_assessment_attempts','answers'),
        ('micro_assessment_attempts','scoring'),
        ('micro_assessment_attempts','status'),
        ('micro_assessment_attempts','created_at'),
        ('micro_assessment_attempts','updated_at'),
        ('micro_assessment_targets','id'),
        ('micro_assessment_targets','assessment_id'),
        ('micro_assessment_targets','student_id'),
        ('micro_assessment_targets','assigned_at'),
        ('paper_shares','id'),
        ('paper_shares','paper_id'),
        ('paper_shares','audience'),
        ('paper_shares','created_at'),
        ('student_dna_snapshots','id'),
        ('student_dna_snapshots','student_id'),
        ('student_dna_snapshots','exam_mode'),
        ('student_dna_snapshots','payload'),
        ('student_dna_snapshots','computed_at'),
        ('topics','id'),
        ('topics','chapter_id'),
        ('topics','name'),
        ('topics','sort_order'),
        ('exam_attempts','id'),
        ('exam_attempts','institution_id'),
        ('exam_attempts','student_id'),
        ('exam_attempts','roll_no'),
        ('exam_attempts','exam_name'),
        ('exam_attempts','exam_mode'),
        ('exam_attempts','source'),
        ('exam_attempts','attempt_kind'),
        ('exam_attempts','is_demo'),
        ('exam_attempts','started_at'),
        ('exam_attempts','exam_snapshot'),
        ('exam_attempts','timing'),
        ('exam_attempts','scoring'),
        ('exam_attempts','created_at'),
        ('questions','id'),
        ('questions','institution_id'),
        ('questions','exam_mode'),
        ('questions','stem'),
        ('questions','q_type'),
        ('questions','correct_answer'),
        ('questions','marks'),
        ('questions','negative_marks'),
        ('questions','is_pyq'),
        ('questions','status'),
        ('questions','created_at'),
        ('questions','updated_at'),
        ('exam_question_attempts','id'),
        ('exam_question_attempts','attempt_id'),
        ('exam_question_attempts','question_number'),
        ('exam_question_attempts','question_snapshot'),
        ('exam_question_attempts','academic_context'),
        ('exam_question_attempts','response'),
        ('exam_question_attempts','timing'),
        ('exam_question_attempts','behaviour'),
        ('exam_question_attempts','evaluation'),
        ('micro_assessment_questions','assessment_id'),
        ('micro_assessment_questions','question_id'),
        ('micro_assessment_questions','sort_order'),
        ('paper_questions','paper_id'),
        ('paper_questions','question_id'),
        ('paper_questions','sort_order'),
        ('paper_questions','snapshot'),
        ('question_generation_items','generation_id'),
        ('question_generation_items','question_id'),
        ('question_generation_items','sort_order'),
        ('question_versions','id'),
        ('question_versions','question_id'),
        ('question_versions','version'),
        ('question_versions','stem'),
        ('question_versions','correct_answer'),
        ('question_versions','status'),
        ('question_versions','created_at'),
        ('question_versions','updated_at')
    ) AS f(tbl, col) LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'edux' AND table_name = r.tbl AND column_name = r.col
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'edux' AND table_name = r.tbl AND column_name = r.col
              AND is_nullable = 'NO'
        ) THEN
            BEGIN
                EXECUTE format('ALTER TABLE edux.%I ALTER COLUMN %I SET NOT NULL', r.tbl, r.col);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'kept nullable (existing NULLs): %.%', r.tbl, r.col;
            END;
        END IF;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 5. Nullability relaxation the models require (in-progress exam attempts
--    legitimately have NULL submitted_at). Mirrors app ensure_schema().
--    Loosening a constraint can never lose data.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ALTER TABLE edux.exam_attempts ALTER COLUMN submitted_at DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'exam_attempts.submitted_at: %', SQLERRM;
END $$;


-- ---------------------------------------------------------------------------
-- 6. Foreign keys (134, from model relationships). Each one is added only if:
--    * both tables and columns exist,
--    * column types are IDENTICAL (legacy UUID tables are skipped, warned),
--    * no equivalent FK already exists (matched by columns, not by name).
--    Existing rows are validated; a violation is reported, never deleted.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r record;
    con_name text;
    same_type boolean;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('academic_terms','institution_id','institutions','id'),
        ('ai_prompt_templates','institution_id','institutions','id'),
        ('calendar_events','institution_id','institutions','id'),
        ('campuses','institution_id','institutions','id'),
        ('institution_health_snapshots','institution_id','institutions','id'),
        ('issue_groups','institution_id','institutions','id'),
        ('registration_drafts','institution_id','institutions','id'),
        ('roles','institution_id','institutions','id'),
        ('users','institution_id','institutions','id'),
        ('ai_conversations','user_id','users','id'),
        ('ai_conversations','institution_id','institutions','id'),
        ('ai_traces','user_id','users','id'),
        ('ai_traces','institution_id','institutions','id'),
        ('announcements','author_id','users','id'),
        ('announcements','institution_id','institutions','id'),
        ('audit_logs','institution_id','institutions','id'),
        ('audit_logs','actor_id','users','id'),
        ('auth_sessions','user_id','users','id'),
        ('departments','hod_user_id','users','id'),
        ('departments','institution_id','institutions','id'),
        ('files','owner_id','users','id'),
        ('files','institution_id','institutions','id'),
        ('guardians','user_id','users','id'),
        ('guardians','institution_id','institutions','id'),
        ('question_generations','faculty_id','users','id'),
        ('question_generations','institution_id','institutions','id'),
        ('support_tickets','institution_id','institutions','id'),
        ('support_tickets','requester_id','users','id'),
        ('user_roles','institution_id','institutions','id'),
        ('user_roles','user_id','users','id'),
        ('user_roles','role_id','roles','id'),
        ('ai_messages','prompt_id','ai_prompt_templates','id'),
        ('ai_messages','conversation_id','ai_conversations','id'),
        ('faculty_profiles','department_id','departments','id'),
        ('faculty_profiles','institution_id','institutions','id'),
        ('faculty_profiles','user_id','users','id'),
        ('generated_reports','institution_id','institutions','id'),
        ('generated_reports','file_id','files','id'),
        ('generated_reports','owner_id','users','id'),
        ('programs','department_id','departments','id'),
        ('programs','institution_id','institutions','id'),
        ('subjects','institution_id','institutions','id'),
        ('subjects','department_id','departments','id'),
        ('batches','term_id','academic_terms','id'),
        ('batches','institution_id','institutions','id'),
        ('batches','program_id','programs','id'),
        ('content_sources','created_by','users','id'),
        ('content_sources','institution_id','institutions','id'),
        ('content_sources','subject_id','subjects','id'),
        ('courses','institution_id','institutions','id'),
        ('courses','program_id','programs','id'),
        ('courses','subject_id','subjects','id'),
        ('interventions','group_id','issue_groups','id'),
        ('interventions','approved_by','users','id'),
        ('interventions','faculty_id','faculty_profiles','user_id'),
        ('interventions','institution_id','institutions','id'),
        ('micro_assessments','faculty_id','faculty_profiles','user_id'),
        ('micro_assessments','generation_id','question_generations','id'),
        ('micro_assessments','institution_id','institutions','id'),
        ('research_publications','faculty_id','faculty_profiles','user_id'),
        ('research_publications','institution_id','institutions','id'),
        ('assignments','course_id','courses','id'),
        ('assignments','faculty_id','faculty_profiles','user_id'),
        ('assignments','institution_id','institutions','id'),
        ('attendance_sessions','batch_id','batches','id'),
        ('attendance_sessions','marked_by','faculty_profiles','user_id'),
        ('attendance_sessions','course_id','courses','id'),
        ('chapters','course_id','courses','id'),
        ('chapters','subject_id','subjects','id'),
        ('intervention_effectiveness','intervention_id','interventions','id'),
        ('intervention_status_history','changed_by','users','id'),
        ('intervention_status_history','intervention_id','interventions','id'),
        ('lesson_plans','institution_id','institutions','id'),
        ('lesson_plans','course_id','courses','id'),
        ('lesson_plans','faculty_id','faculty_profiles','user_id'),
        ('papers','subject_id','subjects','id'),
        ('papers','parent_paper_id','papers','id'),
        ('papers','institution_id','institutions','id'),
        ('papers','created_by','users','id'),
        ('papers','course_id','courses','id'),
        ('question_studio_sessions','faculty_id','faculty_profiles','user_id'),
        ('question_studio_sessions','source_id','content_sources','id'),
        ('question_studio_sessions','institution_id','institutions','id'),
        ('source_chunks','source_id','content_sources','id'),
        ('student_profiles','institution_id','institutions','id'),
        ('student_profiles','department_id','departments','id'),
        ('student_profiles','program_id','programs','id'),
        ('student_profiles','user_id','users','id'),
        ('student_profiles','batch_id','batches','id'),
        ('timetable_slots','institution_id','institutions','id'),
        ('timetable_slots','course_id','courses','id'),
        ('timetable_slots','faculty_id','faculty_profiles','user_id'),
        ('timetable_slots','batch_id','batches','id'),
        ('assignment_submissions','graded_by','users','id'),
        ('assignment_submissions','assignment_id','assignments','id'),
        ('assignment_submissions','student_id','student_profiles','user_id'),
        ('attendance_records','session_id','attendance_sessions','id'),
        ('attendance_records','student_id','student_profiles','user_id'),
        ('enrollments','student_id','student_profiles','user_id'),
        ('enrollments','term_id','academic_terms','id'),
        ('enrollments','course_id','courses','id'),
        ('exam_sittings','student_id','student_profiles','user_id'),
        ('exam_sittings','paper_id','papers','id'),
        ('exam_sittings','institution_id','institutions','id'),
        ('guardian_students','guardian_id','guardians','user_id'),
        ('guardian_students','student_id','student_profiles','user_id'),
        ('intervention_students','student_id','student_profiles','user_id'),
        ('intervention_students','intervention_id','interventions','id'),
        ('micro_assessment_attempts','student_id','student_profiles','user_id'),
        ('micro_assessment_attempts','assessment_id','micro_assessments','id'),
        ('micro_assessment_targets','assessment_id','micro_assessments','id'),
        ('micro_assessment_targets','student_id','student_profiles','user_id'),
        ('paper_shares','shared_by','users','id'),
        ('paper_shares','paper_id','papers','id'),
        ('student_dna_snapshots','student_id','student_profiles','user_id'),
        ('topics','chapter_id','chapters','id'),
        ('exam_attempts','batch_id','batches','id'),
        ('exam_attempts','sitting_id','exam_sittings','id'),
        ('exam_attempts','student_id','student_profiles','user_id'),
        ('exam_attempts','institution_id','institutions','id'),
        ('questions','created_by','users','id'),
        ('questions','chapter_id','chapters','id'),
        ('questions','institution_id','institutions','id'),
        ('questions','subject_id','subjects','id'),
        ('questions','topic_id','topics','id'),
        ('exam_question_attempts','attempt_id','exam_attempts','id'),
        ('micro_assessment_questions','assessment_id','micro_assessments','id'),
        ('micro_assessment_questions','question_id','questions','id'),
        ('paper_questions','question_id','questions','id'),
        ('paper_questions','paper_id','papers','id'),
        ('question_generation_items','generation_id','question_generations','id'),
        ('question_generation_items','question_id','questions','id'),
        ('question_versions','question_id','questions','id'),
        ('question_versions','created_by','users','id')
    ) AS f(tbl, col, rtbl, rcol) LOOP
        con_name := format('fk__%s__%s', r.tbl, r.col);
        SELECT format_type(a.atttypid, a.atttypmod) = format_type(b.atttypid, b.atttypmod)
          INTO same_type
          FROM pg_attribute a
          JOIN pg_class ta ON ta.oid = a.attrelid
          JOIN pg_namespace na ON na.oid = ta.relnamespace
          CROSS JOIN pg_attribute b
          JOIN pg_class tb ON tb.oid = b.attrelid
          JOIN pg_namespace nb ON nb.oid = tb.relnamespace
         WHERE na.nspname = 'edux' AND ta.relname = r.tbl AND a.attname = r.col AND NOT a.attisdropped
           AND nb.nspname = 'edux' AND tb.relname = r.rtbl AND b.attname = r.rcol AND NOT b.attisdropped;
        IF same_type IS NULL THEN
            RAISE WARNING 'FK skipped (table/column missing): % (%) -> % (%)', r.tbl, r.col, r.rtbl, r.rcol;
        ELSIF NOT same_type THEN
            RAISE WARNING 'FK skipped (incompatible legacy column type): % (%) -> % (%) — see verify_postgres_schema.py', r.tbl, r.col, r.rtbl, r.rcol;
        ELSIF EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'edux' AND t.relname = r.tbl AND c.contype = 'f'
              AND (SELECT array_agg(x.attname ORDER BY x.attnum)
                     FROM unnest(c.conkey) k
                     JOIN pg_attribute x ON x.attrelid = c.conrelid AND x.attnum = k) = ARRAY[r.col]::name[]
        ) THEN
            NULL; -- equivalent FK already present
        ELSE
            BEGIN
                EXECUTE format('ALTER TABLE edux.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES edux.%I(%I)',
                               r.tbl, con_name, r.col, r.rtbl, r.rcol);
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'FK not added (%) (%) -> (%): %', r.tbl, r.col, r.rtbl, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 7. Unique constraints (matched by column list, name-agnostic). Skipped
--    safely when an equivalent unique constraint or unique index exists.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('institutions', ARRAY['slug']::name[]),
        ('ai_prompt_templates', ARRAY['institution_id', 'code', 'version']::name[]),
        ('campuses', ARRAY['institution_id', 'name']::name[]),
        ('roles', ARRAY['institution_id', 'code']::name[]),
        ('users', ARRAY['institution_id', 'email']::name[]),
        ('departments', ARRAY['institution_id', 'code']::name[]),
        ('programs', ARRAY['institution_id', 'code']::name[]),
        ('batches', ARRAY['institution_id', 'code']::name[]),
        ('courses', ARRAY['institution_id', 'code']::name[]),
        ('attendance_sessions', ARRAY['course_id', 'batch_id', 'session_date']::name[]),
        ('papers', ARRAY['institution_id', 'paper_code']::name[]),
        ('student_profiles', ARRAY['institution_id', 'roll_no']::name[]),
        ('assignment_submissions', ARRAY['assignment_id', 'student_id']::name[]),
        ('micro_assessment_targets', ARRAY['assessment_id', 'student_id']::name[])
    ) AS f(tbl, cols) LOOP
        IF EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'edux' AND t.relname = r.tbl
              AND c.contype IN ('u', 'p')
              AND (SELECT array_agg(x.attname ORDER BY x.attnum)
                     FROM unnest(c.conkey) k
                     JOIN pg_attribute x ON x.attrelid = c.conrelid AND x.attnum = k) @> r.cols
        ) OR EXISTS (
            SELECT 1 FROM pg_index i
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'edux' AND t.relname = r.tbl AND i.indisunique
              AND (SELECT array_agg(x.attname ORDER BY x.attnum)
                     FROM unnest(i.indkey) k
                     JOIN pg_attribute x ON x.attrelid = t.oid AND x.attnum = k) @> r.cols
        ) THEN
            NULL; -- equivalent uniqueness already enforced
        ELSE
            BEGIN
                EXECUTE format('ALTER TABLE edux.%I ADD CONSTRAINT %I UNIQUE (%s)',
                               r.tbl,
                               format('uq__%s__%s', r.tbl, array_to_string(r.cols, '_')),
                               array_to_string(r.cols, ', '));
            EXCEPTION WHEN OTHERS THEN
                RAISE WARNING 'unique constraint not added (%) (%): %', r.tbl, r.cols, SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- 8. Indexes (exact model index set: ix_edux_<table>_<column>). Existing
--    indexes are never dropped; equivalent coverage is left untouched.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_edux_contact_inquiries_email ON edux.contact_inquiries (email);
CREATE UNIQUE INDEX IF NOT EXISTS ix_edux_newsletter_subscribers_email ON edux.newsletter_subscribers (email);
CREATE INDEX IF NOT EXISTS ix_edux_otp_challenges_email ON edux.otp_challenges (email);
CREATE INDEX IF NOT EXISTS ix_edux_registration_drafts_email ON edux.registration_drafts (email);
CREATE INDEX IF NOT EXISTS ix_edux_users_email ON edux.users (email);
CREATE INDEX IF NOT EXISTS ix_edux_ai_traces_feature ON edux.ai_traces (feature);
CREATE INDEX IF NOT EXISTS ix_edux_auth_sessions_user_id ON edux.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS ix_edux_question_generations_institution_id ON edux.question_generations (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_question_generations_faculty_id ON edux.question_generations (faculty_id);
CREATE INDEX IF NOT EXISTS ix_edux_ai_messages_conversation_id ON edux.ai_messages (conversation_id);
CREATE INDEX IF NOT EXISTS ix_edux_generated_reports_institution_id ON edux.generated_reports (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessments_institution_id ON edux.micro_assessments (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessments_faculty_id ON edux.micro_assessments (faculty_id);
CREATE INDEX IF NOT EXISTS ix_edux_research_publications_institution_id ON edux.research_publications (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_research_publications_faculty_id ON edux.research_publications (faculty_id);
CREATE INDEX IF NOT EXISTS ix_edux_intervention_effectiveness_intervention_id ON edux.intervention_effectiveness (intervention_id);
CREATE INDEX IF NOT EXISTS ix_edux_intervention_status_history_intervention_id ON edux.intervention_status_history (intervention_id);
CREATE INDEX IF NOT EXISTS ix_edux_lesson_plans_institution_id ON edux.lesson_plans (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_lesson_plans_faculty_id ON edux.lesson_plans (faculty_id);
CREATE INDEX IF NOT EXISTS ix_edux_source_chunks_source_id ON edux.source_chunks (source_id);
CREATE INDEX IF NOT EXISTS ix_edux_student_profiles_roll_no ON edux.student_profiles (roll_no);
CREATE INDEX IF NOT EXISTS ix_edux_timetable_slots_institution_id ON edux.timetable_slots (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_intervention_students_intervention_id ON edux.intervention_students (intervention_id);
CREATE INDEX IF NOT EXISTS ix_edux_intervention_students_student_id ON edux.intervention_students (student_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessment_attempts_student_id ON edux.micro_assessment_attempts (student_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessment_attempts_assessment_id ON edux.micro_assessment_attempts (assessment_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessment_targets_student_id ON edux.micro_assessment_targets (student_id);
CREATE INDEX IF NOT EXISTS ix_edux_micro_assessment_targets_assessment_id ON edux.micro_assessment_targets (assessment_id);
CREATE INDEX IF NOT EXISTS ix_edux_paper_shares_paper_id ON edux.paper_shares (paper_id);
CREATE INDEX IF NOT EXISTS ix_edux_student_dna_snapshots_student_id ON edux.student_dna_snapshots (student_id);
CREATE INDEX IF NOT EXISTS ix_edux_exam_attempts_intervention_id ON edux.exam_attempts (intervention_id);
CREATE INDEX IF NOT EXISTS ix_edux_exam_attempts_exam_family ON edux.exam_attempts (exam_family);
CREATE INDEX IF NOT EXISTS ix_edux_exam_attempts_student_id ON edux.exam_attempts (student_id);
CREATE INDEX IF NOT EXISTS ix_edux_exam_attempts_exam_mode ON edux.exam_attempts (exam_mode);
CREATE INDEX IF NOT EXISTS ix_edux_exam_attempts_institution_id ON edux.exam_attempts (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_questions_exam_mode ON edux.questions (exam_mode);
CREATE INDEX IF NOT EXISTS ix_edux_questions_exam_family ON edux.questions (exam_family);
CREATE INDEX IF NOT EXISTS ix_edux_questions_institution_id ON edux.questions (institution_id);
CREATE INDEX IF NOT EXISTS ix_edux_exam_question_attempts_attempt_id ON edux.exam_question_attempts (attempt_id);
CREATE INDEX IF NOT EXISTS ix_edux_question_versions_question_id ON edux.question_versions (question_id);

-- ---------------------------------------------------------------------------
-- 9. POST-MIGRATION VERIFICATION (read-only SELECTs; safe to re-run).
--    Expected counts for the CURRENT backend: 65 model tables, 546 columns,
--    134 FKs. Any row returned by the "missing"/"mismatch" queries is a gap.
--    For a structured PASS/FAIL report run:
--      python backend/scripts/verify_postgres_schema.py
-- ---------------------------------------------------------------------------
SELECT '--- SECTION 9: VERIFICATION (read-only) ---' AS step;

-- 9.1 All 65 expected model tables exist in schema edux (expect count = 65)
SELECT count(*) AS model_tables_present
FROM pg_tables
WHERE schemaname = 'edux'
  AND tablename IN (
    'academic_terms','ai_conversations','ai_messages','ai_prompt_templates','ai_traces',
    'announcements','app_kv','assignment_submissions','assignments','attendance_records',
    'attendance_sessions','audit_logs','auth_sessions','batches','calendar_events',
    'campuses','chapters','contact_inquiries','content_sources','courses',
    'departments','enrollments','exam_attempts','exam_question_attempts','exam_sittings',
    'faculty_profiles','files','generated_reports','guardian_students','guardians',
    'institutions','institution_health_snapshots','intervention_effectiveness',
    'intervention_status_history','intervention_students','interventions','issue_groups',
    'lesson_plans','micro_assessment_attempts','micro_assessment_questions',
    'micro_assessment_targets','micro_assessments','newsletter_subscribers','otp_challenges',
    'paper_questions','paper_shares','papers','programs','question_generation_items',
    'question_generations','question_studio_sessions','question_versions','questions',
    'registration_drafts','research_publications','roles','source_chunks',
    'student_dna_snapshots','student_profiles','subjects','support_tickets',
    'timetable_slots','topics','user_roles','users'
  );

-- 9.2 The original production error: these MUST both return exactly 1 row each.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'edux' AND table_name = 'assignment_submissions'
  AND column_name IN ('graded_by', 'graded_at')
ORDER BY column_name;

-- 9.3 Missing model columns (expect 0 rows). List = all 546 expected columns.
WITH expected(table_name, column_name) AS (VALUES
    ('academic_terms','id'),
    ('academic_terms','institution_id'),
    ('academic_terms','name'),
    ('academic_terms','academic_year'),
    ('academic_terms','is_current'),
    ('ai_conversations','id'),
    ('ai_conversations','institution_id'),
    ('ai_conversations','user_id'),
    ('ai_conversations','channel'),
    ('ai_conversations','title'),
    ('ai_conversations','pinned'),
    ('ai_conversations','created_at'),
    ('ai_messages','id'),
    ('ai_messages','conversation_id'),
    ('ai_messages','role'),
    ('ai_messages','content'),
    ('ai_messages','citations'),
    ('ai_messages','prompt_id'),
    ('ai_messages','model_id'),
    ('ai_messages','tokens_in'),
    ('ai_messages','tokens_out'),
    ('ai_messages','created_at'),
    ('ai_prompt_templates','id'),
    ('ai_prompt_templates','institution_id'),
    ('ai_prompt_templates','code'),
    ('ai_prompt_templates','version'),
    ('ai_prompt_templates','body'),
    ('ai_traces','id'),
    ('ai_traces','institution_id'),
    ('ai_traces','user_id'),
    ('ai_traces','feature'),
    ('ai_traces','request'),
    ('ai_traces','response_meta'),
    ('ai_traces','latency_ms'),
    ('ai_traces','status'),
    ('ai_traces','created_at'),
    ('announcements','id'),
    ('announcements','institution_id'),
    ('announcements','author_id'),
    ('announcements','title'),
    ('announcements','body'),
    ('announcements','audience'),
    ('announcements','pinned'),
    ('announcements','created_at'),
    ('app_kv','key'),
    ('app_kv','payload'),
    ('app_kv','updated_at'),
    ('assignment_submissions','id'),
    ('assignment_submissions','assignment_id'),
    ('assignment_submissions','student_id'),
    ('assignment_submissions','files'),
    ('assignment_submissions','submitted_at'),
    ('assignment_submissions','marks'),
    ('assignment_submissions','feedback'),
    ('assignment_submissions','status'),
    ('assignment_submissions','graded_by'),
    ('assignment_submissions','graded_at'),
    ('assignments','id'),
    ('assignments','institution_id'),
    ('assignments','course_id'),
    ('assignments','faculty_id'),
    ('assignments','title'),
    ('assignments','body'),
    ('assignments','due_at'),
    ('assignments','max_marks'),
    ('assignments','status'),
    ('assignments','published_at'),
    ('assignments','archived_at'),
    ('assignments','created_at'),
    ('attendance_records','session_id'),
    ('attendance_records','student_id'),
    ('attendance_records','mark'),
    ('attendance_sessions','id'),
    ('attendance_sessions','course_id'),
    ('attendance_sessions','batch_id'),
    ('attendance_sessions','marked_by'),
    ('attendance_sessions','session_date'),
    ('attendance_sessions','topic'),
    ('audit_logs','id'),
    ('audit_logs','institution_id'),
    ('audit_logs','actor_id'),
    ('audit_logs','action'),
    ('audit_logs','resource_type'),
    ('audit_logs','resource_id'),
    ('audit_logs','before'),
    ('audit_logs','after'),
    ('audit_logs','occurred_at'),
    ('auth_sessions','id'),
    ('auth_sessions','user_id'),
    ('auth_sessions','refresh_token_hash'),
    ('auth_sessions','user_agent'),
    ('auth_sessions','expires_at'),
    ('auth_sessions','revoked_at'),
    ('auth_sessions','created_at'),
    ('batches','id'),
    ('batches','institution_id'),
    ('batches','code'),
    ('batches','name'),
    ('batches','exam_mode'),
    ('batches','exam_family'),
    ('batches','program_id'),
    ('batches','term_id'),
    ('batches','section'),
    ('calendar_events','id'),
    ('calendar_events','institution_id'),
    ('calendar_events','title'),
    ('calendar_events','kind'),
    ('calendar_events','starts_at'),
    ('calendar_events','ends_at'),
    ('calendar_events','payload'),
    ('campuses','id'),
    ('campuses','institution_id'),
    ('campuses','name'),
    ('campuses','city'),
    ('campuses','student_count'),
    ('chapters','id'),
    ('chapters','subject_id'),
    ('chapters','course_id'),
    ('chapters','name'),
    ('chapters','unit_no'),
    ('chapters','sort_order'),
    ('contact_inquiries','id'),
    ('contact_inquiries','name'),
    ('contact_inquiries','email'),
    ('contact_inquiries','institution'),
    ('contact_inquiries','topic'),
    ('contact_inquiries','message'),
    ('contact_inquiries','created_at'),
    ('content_sources','id'),
    ('content_sources','institution_id'),
    ('content_sources','title'),
    ('content_sources','exam_mode'),
    ('content_sources','exam_family'),
    ('content_sources','subject_id'),
    ('content_sources','object_key'),
    ('content_sources','page_count'),
    ('content_sources','analysis'),
    ('content_sources','extracted_text'),
    ('content_sources','analysis_status'),
    ('content_sources','analysis_error'),
    ('content_sources','created_by'),
    ('content_sources','created_at'),
    ('content_sources','updated_at'),
    ('courses','id'),
    ('courses','institution_id'),
    ('courses','program_id'),
    ('courses','subject_id'),
    ('courses','code'),
    ('courses','name'),
    ('courses','credits'),
    ('courses','semester_no'),
    ('courses','created_at'),
    ('courses','updated_at'),
    ('departments','id'),
    ('departments','institution_id'),
    ('departments','code'),
    ('departments','name'),
    ('departments','hod_user_id'),
    ('departments','created_at'),
    ('departments','updated_at'),
    ('enrollments','id'),
    ('enrollments','student_id'),
    ('enrollments','course_id'),
    ('enrollments','term_id'),
    ('enrollments','status'),
    ('exam_attempts','id'),
    ('exam_attempts','institution_id'),
    ('exam_attempts','sitting_id'),
    ('exam_attempts','student_id'),
    ('exam_attempts','roll_no'),
    ('exam_attempts','batch_id'),
    ('exam_attempts','section_id'),
    ('exam_attempts','exam_id'),
    ('exam_attempts','exam_name'),
    ('exam_attempts','exam_mode'),
    ('exam_attempts','exam_family'),
    ('exam_attempts','source'),
    ('exam_attempts','attempt_kind'),
    ('exam_attempts','is_demo'),
    ('exam_attempts','intervention_id'),
    ('exam_attempts','started_at'),
    ('exam_attempts','submitted_at'),
    ('exam_attempts','exam_snapshot'),
    ('exam_attempts','timing'),
    ('exam_attempts','scoring'),
    ('exam_attempts','interactions'),
    ('exam_attempts','summary'),
    ('exam_attempts','created_at'),
    ('exam_question_attempts','id'),
    ('exam_question_attempts','attempt_id'),
    ('exam_question_attempts','question_id'),
    ('exam_question_attempts','question_number'),
    ('exam_question_attempts','question_snapshot'),
    ('exam_question_attempts','academic_context'),
    ('exam_question_attempts','response'),
    ('exam_question_attempts','timing'),
    ('exam_question_attempts','behaviour'),
    ('exam_question_attempts','evaluation'),
    ('exam_sittings','id'),
    ('exam_sittings','institution_id'),
    ('exam_sittings','paper_id'),
    ('exam_sittings','student_id'),
    ('exam_sittings','attempt_kind'),
    ('exam_sittings','started_at'),
    ('exam_sittings','expires_at'),
    ('exam_sittings','submitted_at'),
    ('exam_sittings','server_seed'),
    ('faculty_profiles','user_id'),
    ('faculty_profiles','institution_id'),
    ('faculty_profiles','department_id'),
    ('faculty_profiles','designation'),
    ('faculty_profiles','specialization'),
    ('faculty_profiles','employee_no'),
    ('files','id'),
    ('files','institution_id'),
    ('files','owner_id'),
    ('files','bucket'),
    ('files','object_key'),
    ('files','mime'),
    ('files','bytes'),
    ('files','purpose'),
    ('files','created_at'),
    ('generated_reports','id'),
    ('generated_reports','institution_id'),
    ('generated_reports','owner_id'),
    ('generated_reports','scope'),
    ('generated_reports','template_code'),
    ('generated_reports','payload'),
    ('generated_reports','object_key'),
    ('generated_reports','file_id'),
    ('generated_reports','status'),
    ('generated_reports','archived'),
    ('generated_reports','created_at'),
    ('guardian_students','guardian_id'),
    ('guardian_students','student_id'),
    ('guardian_students','relationship'),
    ('guardians','user_id'),
    ('guardians','institution_id'),
    ('institution_health_snapshots','institution_id'),
    ('institution_health_snapshots','overall'),
    ('institution_health_snapshots','academic'),
    ('institution_health_snapshots','student_success'),
    ('institution_health_snapshots','attendance'),
    ('institution_health_snapshots','assessment'),
    ('institution_health_snapshots','faculty'),
    ('institution_health_snapshots','outcomes'),
    ('institution_health_snapshots','payload'),
    ('institution_health_snapshots','computed_at'),
    ('institutions','id'),
    ('institutions','slug'),
    ('institutions','name'),
    ('institutions','short_name'),
    ('institutions','timezone'),
    ('institutions','academic_year'),
    ('institutions','attendance_threshold'),
    ('institutions','pass_mark'),
    ('institutions','settings'),
    ('institutions','created_at'),
    ('institutions','updated_at'),
    ('intervention_effectiveness','id'),
    ('intervention_effectiveness','intervention_id'),
    ('intervention_effectiveness','metric'),
    ('intervention_effectiveness','baseline'),
    ('intervention_effectiveness','observed'),
    ('intervention_effectiveness','notes'),
    ('intervention_effectiveness','recorded_at'),
    ('intervention_status_history','id'),
    ('intervention_status_history','intervention_id'),
    ('intervention_status_history','from_status'),
    ('intervention_status_history','to_status'),
    ('intervention_status_history','changed_by'),
    ('intervention_status_history','note'),
    ('intervention_status_history','created_at'),
    ('intervention_students','id'),
    ('intervention_students','intervention_id'),
    ('intervention_students','student_id'),
    ('intervention_students','assigned_at'),
    ('intervention_students','status'),
    ('interventions','id'),
    ('interventions','institution_id'),
    ('interventions','group_id'),
    ('interventions','faculty_id'),
    ('interventions','title'),
    ('interventions','status'),
    ('interventions','priority'),
    ('interventions','objectives'),
    ('interventions','recommended_action'),
    ('interventions','expected_outcome'),
    ('interventions','practice_config'),
    ('interventions','evidence'),
    ('interventions','notes'),
    ('interventions','approved_by'),
    ('interventions','approved_at'),
    ('interventions','assigned_at'),
    ('interventions','completed_at'),
    ('interventions','created_at'),
    ('interventions','updated_at'),
    ('issue_groups','id'),
    ('issue_groups','institution_id'),
    ('issue_groups','fingerprint'),
    ('issue_groups','similarity_score'),
    ('issue_groups','evidence'),
    ('issue_groups','why_detected'),
    ('issue_groups','created_at'),
    ('lesson_plans','id'),
    ('lesson_plans','institution_id'),
    ('lesson_plans','faculty_id'),
    ('lesson_plans','course_id'),
    ('lesson_plans','payload'),
    ('lesson_plans','created_at'),
    ('micro_assessment_attempts','id'),
    ('micro_assessment_attempts','assessment_id'),
    ('micro_assessment_attempts','student_id'),
    ('micro_assessment_attempts','answers'),
    ('micro_assessment_attempts','scoring'),
    ('micro_assessment_attempts','status'),
    ('micro_assessment_attempts','started_at'),
    ('micro_assessment_attempts','submitted_at'),
    ('micro_assessment_attempts','created_at'),
    ('micro_assessment_attempts','updated_at'),
    ('micro_assessment_questions','assessment_id'),
    ('micro_assessment_questions','question_id'),
    ('micro_assessment_questions','sort_order'),
    ('micro_assessment_questions','snapshot'),
    ('micro_assessment_targets','id'),
    ('micro_assessment_targets','assessment_id'),
    ('micro_assessment_targets','student_id'),
    ('micro_assessment_targets','assigned_at'),
    ('micro_assessments','id'),
    ('micro_assessments','institution_id'),
    ('micro_assessments','faculty_id'),
    ('micro_assessments','title'),
    ('micro_assessments','description'),
    ('micro_assessments','instructions'),
    ('micro_assessments','subject'),
    ('micro_assessments','chapter'),
    ('micro_assessments','topic'),
    ('micro_assessments','duration_minutes'),
    ('micro_assessments','deadline_at'),
    ('micro_assessments','status'),
    ('micro_assessments','generation_id'),
    ('micro_assessments','published_at'),
    ('micro_assessments','created_at'),
    ('micro_assessments','updated_at'),
    ('newsletter_subscribers','id'),
    ('newsletter_subscribers','email'),
    ('newsletter_subscribers','created_at'),
    ('otp_challenges','id'),
    ('otp_challenges','email'),
    ('otp_challenges','purpose'),
    ('otp_challenges','code_hash'),
    ('otp_challenges','attempts'),
    ('otp_challenges','expires_at'),
    ('otp_challenges','consumed_at'),
    ('otp_challenges','created_at'),
    ('paper_questions','paper_id'),
    ('paper_questions','question_id'),
    ('paper_questions','sort_order'),
    ('paper_questions','marks_override'),
    ('paper_questions','snapshot'),
    ('paper_shares','id'),
    ('paper_shares','paper_id'),
    ('paper_shares','shared_by'),
    ('paper_shares','audience'),
    ('paper_shares','created_at'),
    ('papers','id'),
    ('papers','institution_id'),
    ('papers','paper_code'),
    ('papers','title'),
    ('papers','exam_mode'),
    ('papers','exam_family'),
    ('papers','subject_id'),
    ('papers','course_id'),
    ('papers','paper_type'),
    ('papers','duration_minutes'),
    ('papers','total_marks'),
    ('papers','negative_marking'),
    ('papers','blueprint'),
    ('papers','status'),
    ('papers','version'),
    ('papers','parent_paper_id'),
    ('papers','intervention_id'),
    ('papers','created_by'),
    ('papers','created_at'),
    ('papers','updated_at'),
    ('programs','id'),
    ('programs','institution_id'),
    ('programs','department_id'),
    ('programs','code'),
    ('programs','name'),
    ('programs','degree_type'),
    ('programs','duration_years'),
    ('programs','created_at'),
    ('programs','updated_at'),
    ('question_generation_items','generation_id'),
    ('question_generation_items','question_id'),
    ('question_generation_items','sort_order'),
    ('question_generations','id'),
    ('question_generations','institution_id'),
    ('question_generations','faculty_id'),
    ('question_generations','status'),
    ('question_generations','config'),
    ('question_generations','requested_count'),
    ('question_generations','generated_count'),
    ('question_generations','error_message'),
    ('question_generations','created_at'),
    ('question_generations','updated_at'),
    ('question_studio_sessions','id'),
    ('question_studio_sessions','institution_id'),
    ('question_studio_sessions','faculty_id'),
    ('question_studio_sessions','source_id'),
    ('question_studio_sessions','settings'),
    ('question_studio_sessions','status'),
    ('question_studio_sessions','created_at'),
    ('question_studio_sessions','updated_at'),
    ('question_versions','id'),
    ('question_versions','question_id'),
    ('question_versions','version'),
    ('question_versions','stem'),
    ('question_versions','options'),
    ('question_versions','correct_answer'),
    ('question_versions','explanation'),
    ('question_versions','status'),
    ('question_versions','created_by'),
    ('question_versions','created_at'),
    ('question_versions','updated_at'),
    ('questions','id'),
    ('questions','institution_id'),
    ('questions','exam_mode'),
    ('questions','exam_family'),
    ('questions','subject_id'),
    ('questions','chapter_id'),
    ('questions','topic_id'),
    ('questions','concept'),
    ('questions','stem'),
    ('questions','q_type'),
    ('questions','options'),
    ('questions','correct_answer'),
    ('questions','explanation'),
    ('questions','marks'),
    ('questions','negative_marks'),
    ('questions','difficulty'),
    ('questions','bloom'),
    ('questions','is_pyq'),
    ('questions','pyq_year'),
    ('questions','source'),
    ('questions','quality_score'),
    ('questions','status'),
    ('questions','created_by'),
    ('questions','created_at'),
    ('questions','updated_at'),
    ('registration_drafts','id'),
    ('registration_drafts','institution_id'),
    ('registration_drafts','email'),
    ('registration_drafts','phone'),
    ('registration_drafts','payload'),
    ('registration_drafts','verified_at'),
    ('registration_drafts','created_at'),
    ('research_publications','id'),
    ('research_publications','institution_id'),
    ('research_publications','faculty_id'),
    ('research_publications','title'),
    ('research_publications','venue'),
    ('research_publications','year'),
    ('research_publications','kind'),
    ('research_publications','doi'),
    ('research_publications','citations'),
    ('research_publications','extra'),
    ('research_publications','created_at'),
    ('research_publications','updated_at'),
    ('roles','id'),
    ('roles','institution_id'),
    ('roles','code'),
    ('roles','name'),
    ('source_chunks','id'),
    ('source_chunks','source_id'),
    ('source_chunks','page_no'),
    ('source_chunks','chunk_index'),
    ('source_chunks','text'),
    ('student_dna_snapshots','id'),
    ('student_dna_snapshots','student_id'),
    ('student_dna_snapshots','exam_mode'),
    ('student_dna_snapshots','exam_family'),
    ('student_dna_snapshots','payload'),
    ('student_dna_snapshots','computed_at'),
    ('student_profiles','user_id'),
    ('student_profiles','institution_id'),
    ('student_profiles','roll_no'),
    ('student_profiles','enrollment_no'),
    ('student_profiles','program_id'),
    ('student_profiles','department_id'),
    ('student_profiles','batch_id'),
    ('student_profiles','section'),
    ('student_profiles','admission_year'),
    ('student_profiles','academic_status'),
    ('student_profiles','cgpa'),
    ('student_profiles','date_of_birth'),
    ('student_profiles','gender'),
    ('student_profiles','extra'),
    ('subjects','id'),
    ('subjects','institution_id'),
    ('subjects','department_id'),
    ('subjects','code'),
    ('subjects','name'),
    ('subjects','exam_mode'),
    ('subjects','exam_family'),
    ('subjects','created_at'),
    ('subjects','updated_at'),
    ('support_tickets','id'),
    ('support_tickets','institution_id'),
    ('support_tickets','requester_id'),
    ('support_tickets','title'),
    ('support_tickets','body'),
    ('support_tickets','status'),
    ('support_tickets','created_at'),
    ('timetable_slots','id'),
    ('timetable_slots','institution_id'),
    ('timetable_slots','faculty_id'),
    ('timetable_slots','course_id'),
    ('timetable_slots','batch_id'),
    ('timetable_slots','room'),
    ('timetable_slots','starts_at'),
    ('timetable_slots','ends_at'),
    ('timetable_slots','topic'),
    ('timetable_slots','slot_type'),
    ('topics','id'),
    ('topics','chapter_id'),
    ('topics','name'),
    ('topics','sort_order'),
    ('user_roles','user_id'),
    ('user_roles','role_id'),
    ('user_roles','institution_id'),
    ('users','id'),
    ('users','institution_id'),
    ('users','email'),
    ('users','phone'),
    ('users','password_hash'),
    ('users','full_name'),
    ('users','first_name'),
    ('users','avatar_url'),
    ('users','status'),
    ('users','email_verified_at'),
    ('users','last_login_at'),
    ('users','role'),
    ('users','created_at'),
    ('users','updated_at')
)
SELECT e.table_name, e.column_name AS missing_column
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'edux' AND c.table_name = e.table_name AND c.column_name = e.column_name
WHERE c.column_name IS NULL;

-- 9.4 Foreign keys present (expect count = 134 or more — legacy extras are OK)
SELECT count(*) AS fk_constraints_in_edux
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'edux' AND c.contype = 'f';

-- 9.5 Row counts must remain ZERO-change for existing data; new tables empty.
--     (informational: this migration inserts no rows anywhere)
SELECT 'assignment_submissions' AS table_name, count(*) AS rows FROM edux.assignment_submissions
UNION ALL SELECT 'users', count(*) FROM edux.users
UNION ALL SELECT 'questions', count(*) FROM edux.questions
UNION ALL SELECT 'exam_attempts', count(*) FROM edux.exam_attempts;

-- 9.6 Key model indexes exist (expect 1 row each)
SELECT indexname FROM pg_indexes
WHERE schemaname = 'edux'
  AND indexname IN (
    'ix_edux_users_email','ix_edux_student_profiles_roll_no','ix_edux_questions_institution_id',
    'ix_edux_questions_exam_mode','ix_edux_exam_attempts_student_id','ix_edux_exam_attempts_institution_id',
    'ix_edux_exam_question_attempts_attempt_id','ix_edux_ai_messages_conversation_id',
    'ix_edux_ai_traces_feature','ix_edux_auth_sessions_user_id'
  )
ORDER BY indexname;

-- 9.7 Model type-drift detector (expect 0 rows): columns whose actual type is
--     not VARCHAR(36)/TEXT/TIMESTAMPTZ/DATE/INTEGER/BOOLEAN/DOUBLE PRECISION as modeled.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'edux'
  AND table_name IN (
    'users','student_profiles','faculty_profiles','institutions','roles','user_roles',
    'courses','subjects','programs','departments','batches','assignments','assignment_submissions',
    'attendance_sessions','attendance_records','questions','papers','paper_questions',
    'exam_attempts','exam_question_attempts','exam_sittings','student_dna_snapshots',
    'interventions','intervention_students','ai_conversations','ai_messages','ai_traces',
    'generated_reports','files','audit_logs','support_tickets','calendar_events',
    'question_versions','question_generations','content_sources','source_chunks',
    'micro_assessments','lesson_plans','timetable_slots','research_publications',
    'paper_shares','enrollments','academic_terms','announcements','app_kv'
  )
  AND data_type IN ('uuid','jsonb','json','USER-DEFINED','inet','citext','ARRAY')
ORDER BY table_name, column_name;

-- END OF MIGRATION 0003 — structure only, no data seeded.
