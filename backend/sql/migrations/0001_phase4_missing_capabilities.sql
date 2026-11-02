-- Additive Phase 4 schema. Never DROP / TRUNCATE. Safe to re-run on PostgreSQL 16.
-- Applied manually against schema "edux". Tests use sqlite create_all, not this file.

SET search_path TO edux, public;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id);
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS analysis_error TEXT;

ALTER TABLE files ADD COLUMN IF NOT EXISTS bytes BIGINT;

ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES files(id);
ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued';
ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS slot_type TEXT;

CREATE TABLE IF NOT EXISTS question_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id),
  version INT NOT NULL DEFAULT 1,
  stem TEXT NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS micro_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  subject TEXT,
  chapter TEXT,
  topic TEXT,
  duration_minutes INT NOT NULL DEFAULT 15,
  deadline_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  generation_id UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS micro_assessment_questions (
  assessment_id UUID NOT NULL REFERENCES micro_assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  sort_order INT NOT NULL DEFAULT 0,
  snapshot TEXT,
  PRIMARY KEY (assessment_id, question_id)
);

CREATE TABLE IF NOT EXISTS micro_assessment_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES micro_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(user_id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, student_id)
);

CREATE TABLE IF NOT EXISTS micro_assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES micro_assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(user_id),
  answers TEXT NOT NULL DEFAULT '{}',
  scoring TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS research_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  faculty_id UUID NOT NULL REFERENCES faculty_profiles(user_id),
  title TEXT NOT NULL,
  venue TEXT,
  year INT,
  kind TEXT NOT NULL DEFAULT 'paper',
  doi TEXT,
  citations INT NOT NULL DEFAULT 0,
  extra TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intervention_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES student_profiles(user_id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'assigned'
);

CREATE TABLE IF NOT EXISTS intervention_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intervention_effectiveness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  baseline DOUBLE PRECISION,
  observed DOUBLE PRECISION,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
