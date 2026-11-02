-- Additive Phase 4 close-out. Never DROP / TRUNCATE. Safe to re-run on PostgreSQL 16.
-- paper_shares already exists in schema.sql; this is for databases created before that table.
-- Tests use sqlite create_all, not this file. Do not apply to live PostgreSQL without instruction.

SET search_path TO edux, public;

CREATE TABLE IF NOT EXISTS paper_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  shared_by UUID REFERENCES users(id),
  audience JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
