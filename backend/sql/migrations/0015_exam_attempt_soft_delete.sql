-- Migration: add is_deleted to exam_attempts table (soft delete support)
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark specific attempt as deleted
UPDATE exam_attempts SET is_deleted = TRUE WHERE id = '103a301e-cddb-4dc8-b2f0-43b456236ee3';
