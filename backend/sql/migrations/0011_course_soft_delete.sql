-- Migration: add is_deleted to courses table (soft delete support)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all courses of inst_mit_p as deleted
UPDATE courses SET is_deleted = TRUE WHERE institution_id = 'inst_mit_p';
