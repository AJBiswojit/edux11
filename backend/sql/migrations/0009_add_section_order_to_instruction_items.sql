-- 0009_add_section_order_to_instruction_items.sql
-- Additive & idempotent: adds section_order to exam_instruction_items
-- and back-fills correct ordering for the seeded JEE and NEET templates.

SET search_path TO edux, public;

-- 1. Add column (no-op if it already exists)
ALTER TABLE edux.exam_instruction_items
    ADD COLUMN IF NOT EXISTS section_order INTEGER NOT NULL DEFAULT 0;

-- 2. Back-fill section_order for JEE (tmpl-jee-main-01)
UPDATE edux.exam_instruction_items SET section_order = 1 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'General Instructions';
UPDATE edux.exam_instruction_items SET section_order = 2 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'Question Structure';
UPDATE edux.exam_instruction_items SET section_order = 3 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'Section Division';
UPDATE edux.exam_instruction_items SET section_order = 4 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'Marking Scheme';
UPDATE edux.exam_instruction_items SET section_order = 5 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'Navigation & Status Palette';
UPDATE edux.exam_instruction_items SET section_order = 6 WHERE template_id = 'tmpl-jee-main-01' AND section_title = 'General CBT Rules';

-- 3. Back-fill section_order for NEET (tmpl-neet-ug-01)
UPDATE edux.exam_instruction_items SET section_order = 1 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'General Instructions';
UPDATE edux.exam_instruction_items SET section_order = 2 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'Question Structure';
UPDATE edux.exam_instruction_items SET section_order = 3 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'Section Division';
UPDATE edux.exam_instruction_items SET section_order = 4 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'Marking Scheme';
UPDATE edux.exam_instruction_items SET section_order = 5 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'Navigation & Status Palette';
UPDATE edux.exam_instruction_items SET section_order = 6 WHERE template_id = 'tmpl-neet-ug-01' AND section_title = 'General CBT Rules';
