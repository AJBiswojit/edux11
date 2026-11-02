-- MediXO EduX — PostgreSQL 16 schema (enterprise, multi-tenant)
-- Companion to docs/backend/ARCHITECTURE.md
-- Conventions: UUID PKs, institution_id on tenant tables, timestamptz, soft delete where needed.
-- Isolation: all types/tables live in schema "edux". Extensions stay in public.
-- Do not ALTER DATABASE search_path (shared RDS may host other schemas).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- embeddings for RAG (pgvector)

CREATE SCHEMA IF NOT EXISTS edux;
SET search_path TO edux, public;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
CREATE TYPE exam_mode AS ENUM ('university', 'competitive');
CREATE TYPE exam_family AS ENUM ('jee', 'neet', 'gate', 'cuet', 'cat', 'ssc', 'upsc');
CREATE TYPE attempt_kind AS ENUM ('official', 'practice', 'sample', 'intervention_practice', 'intervention_retest');
CREATE TYPE attempt_source AS ENUM ('exam_agent', 'paper_share', 'imported', 'manual');
CREATE TYPE paper_status AS ENUM ('draft', 'generated', 'published', 'archived');
CREATE TYPE question_status AS ENUM ('draft', 'review', 'approved', 'rejected', 'archived');
CREATE TYPE bloom_level AS ENUM ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create');
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE attendance_mark AS ENUM ('present', 'absent', 'leave', 'holiday');
CREATE TYPE intervention_status AS ENUM (
  'detected', 'recommended', 'approved', 'planned', 'assigned',
  'in_progress', 'completed', 'retest_pending', 'evaluating',
  'resolved', 'improving', 'persistent', 'dismissed'
);
CREATE TYPE intervention_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE studio_q_status AS ENUM ('draft', 'approved', 'rejected');
CREATE TYPE ticket_status AS ENUM ('open', 'pending', 'resolved', 'closed');
CREATE TYPE otp_purpose AS ENUM ('register', 'reset', 'verify_email');

-- ---------------------------------------------------------------------------
-- Platform (no tenant)
-- ---------------------------------------------------------------------------
CREATE TABLE institutions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          CITEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  short_name    TEXT,
  type          TEXT,
  timezone      TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  academic_year TEXT,
  attendance_threshold NUMERIC(5,2) NOT NULL DEFAULT 75,
  pass_mark     NUMERIC(5,2) NOT NULL DEFAULT 40,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campuses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL,
  city            TEXT,
  student_count   INT,
  UNIQUE (institution_id, name)
);

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id), -- null = platform operator
  email           CITEXT NOT NULL,
  phone           TEXT,
  password_hash   TEXT,
  full_name       TEXT NOT NULL,
  first_name      TEXT,
  avatar_url      TEXT,
  status          user_status NOT NULL DEFAULT 'pending',
  email_verified_at TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, email)
);

CREATE TABLE roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id), -- null = system role
  code            TEXT NOT NULL, -- student | faculty | admin | parent | hod
  name            TEXT NOT NULL,
  UNIQUE (institution_id, code)
);

CREATE TABLE permissions (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code  TEXT UNIQUE NOT NULL, -- e.g. papers.publish, interventions.assign
  description TEXT
);

CREATE TABLE role_permissions (
  role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  PRIMARY KEY (user_id, role_id, institution_id)
);

CREATE TABLE auth_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent      TEXT,
  ip              INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_challenges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT NOT NULL,
  purpose         otp_purpose NOT NULL,
  code_hash       TEXT NOT NULL,
  attempts        INT NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ NOT NULL,
  consumed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE registration_drafts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id),
  email           CITEXT NOT NULL,
  phone           TEXT,
  payload         JSONB NOT NULL, -- step1 + academic context
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Academic catalog
-- ---------------------------------------------------------------------------
CREATE TABLE departments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  hod_user_id     UUID REFERENCES users(id),
  UNIQUE (institution_id, code)
);

CREATE TABLE programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  degree_type     TEXT, -- B.Tech, etc.
  duration_years  INT,
  UNIQUE (institution_id, code)
);

CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  code            TEXT NOT NULL,
  name            TEXT NOT NULL,
  exam_mode       exam_mode NOT NULL DEFAULT 'university',
  exam_family     exam_family, -- competitive subjects
  UNIQUE (institution_id, code, exam_mode)
);

CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  program_id      UUID REFERENCES programs(id),
  subject_id      UUID REFERENCES subjects(id),
  code            TEXT NOT NULL, -- CS501
  name            TEXT NOT NULL,
  credits         NUMERIC(4,1),
  semester_no     INT,
  UNIQUE (institution_id, code)
);

CREATE TABLE chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id),
  name            TEXT NOT NULL,
  unit_no         INT,
  sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  sort_order      INT NOT NULL DEFAULT 0
);

CREATE TABLE academic_terms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL, -- Semester 5
  academic_year   TEXT NOT NULL,
  starts_on       DATE,
  ends_on         DATE,
  is_current      BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  code            TEXT NOT NULL, -- CSE-2026-A | JEE-2027-A
  name            TEXT NOT NULL,
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  program_id      UUID REFERENCES programs(id),
  term_id         UUID REFERENCES academic_terms(id),
  section         TEXT,
  UNIQUE (institution_id, code)
);

CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  title           TEXT NOT NULL,
  kind            TEXT NOT NULL, -- exam, holiday, deadline, lecture
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  payload         JSONB NOT NULL DEFAULT '{}'
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
CREATE TABLE student_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  roll_no         TEXT NOT NULL,
  enrollment_no   TEXT,
  program_id      UUID REFERENCES programs(id),
  department_id   UUID REFERENCES departments(id),
  batch_id        UUID REFERENCES batches(id),
  section         TEXT,
  admission_year  INT,
  academic_status TEXT NOT NULL DEFAULT 'regular',
  cgpa            NUMERIC(4,2),
  date_of_birth   DATE,
  gender          TEXT,
  extra           JSONB NOT NULL DEFAULT '{}', -- competitive targets, etc.
  UNIQUE (institution_id, roll_no)
);

CREATE TABLE student_competitive_tracks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  exam_family     exam_family NOT NULL,
  target_year     INT,
  prep_status     TEXT,
  UNIQUE (student_id, exam_family)
);

CREATE TABLE faculty_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  department_id   UUID REFERENCES departments(id),
  designation     TEXT,
  specialization  TEXT,
  employee_no     TEXT
);

CREATE TABLE batch_faculty (
  batch_id        UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  faculty_id      UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'instructor', -- instructor | mentor | coordinator
  PRIMARY KEY (batch_id, faculty_id)
);

CREATE TABLE enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  course_id       UUID NOT NULL REFERENCES courses(id),
  term_id         UUID REFERENCES academic_terms(id),
  status          TEXT NOT NULL DEFAULT 'active',
  UNIQUE (student_id, course_id, term_id)
);

CREATE TABLE guardians (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  institution_id  UUID NOT NULL REFERENCES institutions(id)
);

CREATE TABLE guardian_students (
  guardian_id     UUID NOT NULL REFERENCES guardians(user_id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
  relationship    TEXT,
  PRIMARY KEY (guardian_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Teaching ops
-- ---------------------------------------------------------------------------
CREATE TABLE timetable_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  faculty_id      UUID REFERENCES faculty_profiles(user_id),
  course_id       UUID REFERENCES courses(id),
  batch_id        UUID REFERENCES batches(id),
  room            TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL
);

CREATE TABLE attendance_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID REFERENCES timetable_slots(id),
  course_id       UUID NOT NULL REFERENCES courses(id),
  batch_id        UUID REFERENCES batches(id),
  marked_by       UUID REFERENCES faculty_profiles(user_id),
  session_date    DATE NOT NULL,
  topic           TEXT,
  UNIQUE (course_id, batch_id, session_date)
);

CREATE TABLE attendance_records (
  session_id      UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  mark            attendance_mark NOT NULL,
  PRIMARY KEY (session_id, student_id)
);

CREATE TABLE assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  course_id       UUID REFERENCES courses(id),
  faculty_id      UUID REFERENCES faculty_profiles(user_id),
  title           TEXT NOT NULL,
  body            TEXT,
  due_at          TIMESTAMPTZ,
  max_marks       NUMERIC(6,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignment_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  files           JSONB NOT NULL DEFAULT '[]',
  submitted_at    TIMESTAMPTZ,
  marks           NUMERIC(6,2),
  feedback        TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  author_id       UUID REFERENCES users(id),
  title           TEXT NOT NULL,
  body            TEXT,
  audience        JSONB NOT NULL DEFAULT '{}', -- roles, batch_ids
  pinned          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Assessment: questions, PYQ, papers, studio
-- ---------------------------------------------------------------------------
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  subject_id      UUID REFERENCES subjects(id),
  chapter_id      UUID REFERENCES chapters(id),
  topic_id        UUID REFERENCES topics(id),
  concept         TEXT,
  stem            TEXT NOT NULL,
  q_type          TEXT NOT NULL DEFAULT 'mcq', -- mcq, numerical, assertion, theory
  options         JSONB, -- [{key, text}]
  correct_answer  JSONB NOT NULL, -- index, letter, or text
  explanation     TEXT,
  marks           NUMERIC(6,2) NOT NULL DEFAULT 1,
  negative_marks  NUMERIC(6,2) NOT NULL DEFAULT 0,
  difficulty      difficulty,
  bloom           bloom_level,
  co_code         TEXT, -- course outcome
  is_pyq          BOOLEAN NOT NULL DEFAULT false,
  pyq_year        INT,
  pyq_session     TEXT,
  source          TEXT, -- 'bank' | 'AI Question Studio' | 'import'
  quality_score   NUMERIC(5,2),
  quality_factors JSONB,
  status          question_status NOT NULL DEFAULT 'approved',
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX questions_bank_idx ON questions (institution_id, exam_mode, exam_family, subject_id, status);
CREATE INDEX questions_stem_trgm ON questions USING gin (stem gin_trgm_ops);

CREATE TABLE question_embeddings (
  question_id     UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  embedding       VECTOR(1536) NOT NULL,
  model           TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE content_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  title           TEXT NOT NULL,
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  subject_id      UUID REFERENCES subjects(id),
  object_key      TEXT, -- S3
  page_count      INT,
  analysis        JSONB, -- topics, concepts, recommended distribution
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE source_chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       UUID NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
  page_no         INT,
  chunk_index     INT NOT NULL,
  text            TEXT NOT NULL,
  embedding       VECTOR(1536),
  UNIQUE (source_id, chunk_index)
);

CREATE TABLE question_studio_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  faculty_id      UUID NOT NULL REFERENCES faculty_profiles(user_id),
  source_id       UUID REFERENCES content_sources(id),
  settings        JSONB NOT NULL, -- count, difficulty mix, types, marks
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE studio_generated_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES question_studio_sessions(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES questions(id), -- set on approve
  payload         JSONB NOT NULL, -- draft stem/options before promote
  status          studio_q_status NOT NULL DEFAULT 'draft',
  quality_score   NUMERIC(5,2),
  source_ref      TEXT -- protected citation; not faculty-editable
);

CREATE TABLE papers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  paper_code      TEXT NOT NULL,
  title           TEXT NOT NULL,
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  subject_id      UUID REFERENCES subjects(id),
  course_id       UUID REFERENCES courses(id),
  paper_type      TEXT, -- midsem, jee_mock, ...
  duration_minutes INT NOT NULL,
  total_marks     NUMERIC(8,2) NOT NULL,
  negative_marking BOOLEAN NOT NULL DEFAULT false,
  blueprint       JSONB NOT NULL DEFAULT '{}',
  status          paper_status NOT NULL DEFAULT 'draft',
  version         INT NOT NULL DEFAULT 1,
  parent_paper_id UUID REFERENCES papers(id), -- duplicate / regenerate
  intervention_id UUID, -- re-test papers
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (institution_id, paper_code)
);

CREATE TABLE paper_questions (
  paper_id        UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  sort_order      INT NOT NULL,
  marks_override  NUMERIC(6,2),
  snapshot        JSONB NOT NULL, -- frozen stem/options/answer at paper save
  PRIMARY KEY (paper_id, question_id)
);

CREATE TABLE paper_shares (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id        UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  shared_by       UUID REFERENCES users(id),
  audience        JSONB NOT NULL, -- batch_ids, student_ids
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quizzes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  paper_id        UUID REFERENCES papers(id),
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  published_at    TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- Exam runtime + canonical attempts
-- ---------------------------------------------------------------------------
CREATE TABLE exam_sittings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  paper_id        UUID NOT NULL REFERENCES papers(id),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  attempt_kind    attempt_kind NOT NULL DEFAULT 'practice',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  submitted_at    TIMESTAMPTZ,
  server_seed     TEXT, -- shuffle / demo behaviour
  UNIQUE (paper_id, student_id, started_at)
);

CREATE TABLE exam_attempt_events (
  id              BIGSERIAL PRIMARY KEY,
  sitting_id      UUID NOT NULL REFERENCES exam_sittings(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL,
  event_type      TEXT NOT NULL, -- view, select, deselect, mark_review, heartbeat
  payload         JSONB NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  sitting_id      UUID REFERENCES exam_sittings(id),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  roll_no         TEXT NOT NULL,
  batch_id        UUID REFERENCES batches(id),
  section_id      TEXT,
  exam_id         UUID, -- paper or exam catalog id
  exam_name       TEXT NOT NULL,
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  source          attempt_source NOT NULL DEFAULT 'exam_agent',
  attempt_kind    attempt_kind NOT NULL DEFAULT 'practice',
  is_demo         BOOLEAN NOT NULL DEFAULT false,
  intervention_id UUID,
  started_at      TIMESTAMPTZ NOT NULL,
  submitted_at    TIMESTAMPTZ NOT NULL,
  exam_snapshot   JSONB NOT NULL, -- marks, duration, difficulty, subject, course
  timing          JSONB NOT NULL,
  scoring         JSONB NOT NULL, -- derived, recomputable
  interactions    JSONB, -- raw map for backward compat with SPA
  summary         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX exam_attempts_intel_idx ON exam_attempts (institution_id, student_id, exam_mode, exam_family, is_demo, attempt_kind);

CREATE TABLE exam_question_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id     UUID,
  question_number INT NOT NULL,
  question_snapshot JSONB NOT NULL, -- text, type, difficulty, options, answers, marks
  academic_context JSONB NOT NULL, -- subject, chapter, topic, concept
  response        JSONB NOT NULL,
  timing          JSONB NOT NULL,
  behaviour       JSONB NOT NULL,
  evaluation      JSONB NOT NULL -- isCorrect, isSkipped, classification
);

CREATE INDEX eqa_attempt_idx ON exam_question_attempts (attempt_id);

-- ---------------------------------------------------------------------------
-- Interventions
-- ---------------------------------------------------------------------------
CREATE TABLE issue_groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  fingerprint     JSONB NOT NULL, -- domain, family, subject, chapter, issue_type
  similarity_score NUMERIC(5,2),
  evidence        JSONB NOT NULL,
  why_detected    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE issue_group_members (
  group_id        UUID NOT NULL REFERENCES issue_groups(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  PRIMARY KEY (group_id, student_id)
);

CREATE TABLE interventions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  group_id        UUID REFERENCES issue_groups(id),
  faculty_id      UUID REFERENCES faculty_profiles(user_id),
  title           TEXT NOT NULL,
  status          intervention_status NOT NULL DEFAULT 'detected',
  priority        intervention_priority NOT NULL DEFAULT 'medium',
  objectives      JSONB,
  recommended_action TEXT,
  expected_outcome TEXT,
  practice_config JSONB,
  evidence        JSONB NOT NULL, -- immutable
  notes           TEXT,
  approved_by     UUID REFERENCES users(id),
  approved_at     TIMESTAMPTZ,
  assigned_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE intervention_students (
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  PRIMARY KEY (intervention_id, student_id)
);

CREATE TABLE intervention_status_history (
  id              BIGSERIAL PRIMARY KEY,
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  from_status     intervention_status,
  to_status       intervention_status NOT NULL,
  actor_id        UUID REFERENCES users(id),
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- practice/retest attempts: exam_attempts.attempt_kind + intervention_id

CREATE TABLE intervention_effectiveness (
  intervention_id UUID PRIMARY KEY REFERENCES interventions(id) ON DELETE CASCADE,
  before_metrics  JSONB NOT NULL,
  practice_metrics JSONB,
  retest_metrics  JSONB,
  deltas          JSONB NOT NULL,
  outcome         TEXT NOT NULL, -- resolved | improving | persistent
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Intelligence snapshots (derived)
-- ---------------------------------------------------------------------------
CREATE TABLE student_dna_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  payload         JSONB NOT NULL, -- strengths, weaknesses, examEvidence, status
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX dna_unique ON student_dna_snapshots (student_id, exam_mode, COALESCE(exam_family, 'none'));

CREATE TABLE student_360_snapshots (
  student_id      UUID PRIMARY KEY REFERENCES student_profiles(user_id),
  payload         JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_readiness (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES student_profiles(user_id),
  exam_catalog_id UUID NOT NULL,
  exam_mode       exam_mode NOT NULL,
  exam_family     exam_family,
  score           NUMERIC(5,2) NOT NULL,
  payload         JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, exam_catalog_id)
);

CREATE TABLE faculty_intelligence_snapshots (
  faculty_id      UUID PRIMARY KEY REFERENCES faculty_profiles(user_id),
  payload         JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE institution_health_snapshots (
  institution_id  UUID PRIMARY KEY REFERENCES institutions(id),
  overall         NUMERIC(5,2) NOT NULL,
  academic        NUMERIC(5,2) NOT NULL,
  student_success NUMERIC(5,2) NOT NULL,
  attendance      NUMERIC(5,2) NOT NULL,
  assessment      NUMERIC(5,2) NOT NULL,
  faculty         NUMERIC(5,2) NOT NULL,
  outcomes        NUMERIC(5,2) NOT NULL,
  payload         JSONB NOT NULL,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE generated_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  owner_id        UUID REFERENCES users(id),
  scope           TEXT NOT NULL, -- student | faculty | executive
  template_code   TEXT NOT NULL,
  payload         JSONB NOT NULL,
  object_key      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- AI platform
-- ---------------------------------------------------------------------------
CREATE TABLE ai_models (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT NOT NULL, -- openai, anthropic, azure, local
  model_name      TEXT NOT NULL,
  purpose         TEXT NOT NULL, -- chat, generate_question, embed, classify
  is_active       BOOLEAN NOT NULL DEFAULT true,
  config          JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE ai_prompt_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id), -- null = platform default
  code            TEXT NOT NULL,
  version         INT NOT NULL,
  body            TEXT NOT NULL,
  UNIQUE (institution_id, code, version)
);

CREATE TABLE ai_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  channel         TEXT NOT NULL, -- mentor, teaching_studio, executive, support
  title           TEXT,
  pinned          BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL, -- user | assistant | system | tool
  content         TEXT NOT NULL,
  citations       JSONB,
  prompt_id       UUID REFERENCES ai_prompt_templates(id),
  model_id        UUID REFERENCES ai_models(id),
  tokens_in       INT,
  tokens_out      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_traces (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  user_id         UUID REFERENCES users(id),
  feature         TEXT NOT NULL, -- mentor, paper_gen, question_studio, executive, lesson_plan
  request         JSONB NOT NULL,
  response_meta   JSONB,
  latency_ms      INT,
  status          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_quotas (
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  feature         TEXT NOT NULL,
  period          DATE NOT NULL, -- month bucket
  tokens_used     BIGINT NOT NULL DEFAULT 0,
  request_count   BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (institution_id, feature, period)
);

CREATE TABLE lesson_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  faculty_id      UUID NOT NULL REFERENCES faculty_profiles(user_id),
  course_id       UUID REFERENCES courses(id),
  payload         JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- CMS, support, finance, governance
-- ---------------------------------------------------------------------------
CREATE TABLE cms_pages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  published       BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blog_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  excerpt         TEXT,
  body_md         TEXT,
  published_at    TIMESTAMPTZ
);

CREATE TABLE contact_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT,
  email           CITEXT,
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE newsletter_subscribers (
  email           CITEXT PRIMARY KEY,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE forum_topics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  author_id       UUID REFERENCES users(id),
  category        TEXT,
  title           TEXT NOT NULL,
  body            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE forum_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES users(id),
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  requester_id    UUID NOT NULL REFERENCES users(id),
  title           TEXT NOT NULL,
  body            TEXT,
  status          ticket_status NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  student_id      UUID REFERENCES student_profiles(user_id),
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  status          TEXT NOT NULL,
  due_on          DATE,
  paid_at         TIMESTAMPTZ
);

CREATE TABLE scholarships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL,
  amount          NUMERIC(12,2),
  criteria        JSONB
);

CREATE TABLE audit_logs (
  id              BIGSERIAL PRIMARY KEY,
  institution_id  UUID REFERENCES institutions(id),
  actor_id        UUID REFERENCES users(id),
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  before          JSONB,
  after           JSONB,
  ip              INET,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_lookup ON audit_logs (institution_id, occurred_at DESC);

CREATE TABLE api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID NOT NULL REFERENCES institutions(id),
  name            TEXT NOT NULL,
  key_hash        TEXT NOT NULL,
  scopes          TEXT[] NOT NULL DEFAULT '{}',
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id  UUID REFERENCES institutions(id),
  owner_id        UUID REFERENCES users(id),
  bucket          TEXT NOT NULL,
  object_key      TEXT NOT NULL,
  mime            TEXT,
  bytes           BIGINT,
  purpose         TEXT, -- assignment, source, avatar, report
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  body            TEXT,
  kind            TEXT,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- RLS helper (enable per table in migrations)
-- SELECT set_config('app.institution_id', '<uuid>', true);
-- CREATE POLICY tenant_iso ON <table> USING (institution_id = current_setting('app.institution_id')::uuid);
-- ---------------------------------------------------------------------------
