-- Migration: Add faculty-controlled exam resume fields to exam_attempts
-- When a student is disconnected and the exam auto-submits (terminated=true),
-- faculty can grant resume. This clears submitted_at and lets the student
-- continue from their saved progress.

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS resume_granted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resume_granted_by VARCHAR(36) REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS resume_granted_at TIMESTAMPTZ;

-- Index for quick lookup of resume-granted attempts per student
CREATE INDEX IF NOT EXISTS idx_exam_attempts_resume
  ON exam_attempts (student_id, resume_granted)
  WHERE resume_granted = TRUE;

-- Index for faculty querying terminated attempts
CREATE INDEX IF NOT EXISTS idx_exam_attempts_terminated
  ON exam_attempts (institution_id, terminated)
  WHERE terminated = TRUE;
