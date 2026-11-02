-- Migration: add is_deleted to subjects table (soft delete support)
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all university-mode subjects as deleted
UPDATE subjects SET is_deleted = TRUE WHERE exam_mode = 'university';
