-- Migration: add is_deleted to departments table (soft delete support)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all departments of inst_mit_p as deleted
UPDATE departments SET is_deleted = TRUE WHERE institution_id = 'inst_mit_p';
