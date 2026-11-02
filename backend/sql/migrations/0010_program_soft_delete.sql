-- Migration: add is_deleted to programs table (soft delete support)
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all programs of inst_mit_p as deleted
UPDATE programs SET is_deleted = TRUE WHERE institution_id = 'inst_mit_p';
