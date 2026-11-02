-- 0007_create_exam_instruction_tables.sql
-- Additive & idempotent migration creating tables for NTA-based exam instructions in edux schema.

CREATE SCHEMA IF NOT EXISTS edux;
SET search_path TO edux, public;

-- 1. Exam Instruction Templates Table
CREATE TABLE IF NOT EXISTS edux.exam_instruction_templates (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    exam_pattern VARCHAR(64) NOT NULL,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_instruction_templates_pattern
    ON edux.exam_instruction_templates (exam_pattern);

-- 2. Exam Instruction Items Table
CREATE TABLE IF NOT EXISTS edux.exam_instruction_items (
    id VARCHAR(36) PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL REFERENCES edux.exam_instruction_templates (id) ON DELETE CASCADE,
    section_title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_instruction_items_template
    ON edux.exam_instruction_items (template_id);
