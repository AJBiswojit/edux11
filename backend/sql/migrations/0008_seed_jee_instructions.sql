-- 0008_seed_jee_instructions.sql
-- Idempotent seed: JEE (Main) examination instructions across 6 sections.

SET search_path TO edux, public;

-- ── Template ─────────────────────────────────────────────────────────────────
INSERT INTO edux.exam_instruction_templates (id, title, exam_pattern, language, is_active)
VALUES (
    'tmpl-jee-main-01',
    'JEE (Main) Examination Instructions',
    'jee',
    'en',
    TRUE
)
ON CONFLICT (id) DO UPDATE
    SET title      = EXCLUDED.title,
        is_active  = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- ── Items ─────────────────────────────────────────────────────────────────────

-- 1. General Instructions
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-gen-01', 'tmpl-jee-main-01', 'General Instructions',
     'Read all instructions carefully before starting the examination.', 1),
    ('jee-gen-02', 'tmpl-jee-main-01', 'General Instructions',
     'The examination is conducted in Computer Based Test (CBT) mode.', 2),
    ('jee-gen-03', 'tmpl-jee-main-01', 'General Instructions',
     'Keep track of the examination timer throughout the test.', 3),
    ('jee-gen-04', 'tmpl-jee-main-01', 'General Instructions',
     'Do not communicate with or seek assistance from another candidate.', 4),
    ('jee-gen-05', 'tmpl-jee-main-01', 'General Instructions',
     'Do not use unauthorized books, notes, mobile phones, electronic devices or external resources.', 5)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;

-- 2. Question Structure
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-qs-01', 'tmpl-jee-main-01', 'Question Structure',
     'The examination covers Physics, Chemistry and Mathematics.', 1),
    ('jee-qs-02', 'tmpl-jee-main-01', 'Question Structure',
     'Read each question carefully before selecting your answer.', 2),
    ('jee-qs-03', 'tmpl-jee-main-01', 'Question Structure',
     'Select the appropriate option for each question.', 3),
    ('jee-qs-04', 'tmpl-jee-main-01', 'Question Structure',
     'For numerical-value questions, enter the required numerical answer carefully.', 4)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;

-- 3. Section Division
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-sd-01', 'tmpl-jee-main-01', 'Section Division',
     'The examination is divided into: Physics, Chemistry and Mathematics.', 1),
    ('jee-sd-02', 'tmpl-jee-main-01', 'Section Division',
     'Questions may include Multiple Choice Questions (MCQs) and Numerical Value Questions, according to the configured examination pattern.', 2)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;

-- 4. Marking Scheme
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-ms-01', 'tmpl-jee-main-01', 'Marking Scheme',
     'Marks are awarded for correct responses according to the configured examination pattern.', 1),
    ('jee-ms-02', 'tmpl-jee-main-01', 'Marking Scheme',
     'Incorrect answers carry negative marking where applicable.', 2),
    ('jee-ms-03', 'tmpl-jee-main-01', 'Marking Scheme',
     'Unanswered questions receive no marks.', 3),
    ('jee-ms-04', 'tmpl-jee-main-01', 'Marking Scheme',
     'The applicable marking scheme will be displayed before the examination begins.', 4)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;

-- 5. Navigation & Status Palette
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-nav-01', 'tmpl-jee-main-01', 'Navigation & Status Palette',
     'Use Save & Next to save your response and move to the next question.', 1),
    ('jee-nav-02', 'tmpl-jee-main-01', 'Navigation & Status Palette',
     'Use Mark for Review to revisit a question later.', 2),
    ('jee-nav-03', 'tmpl-jee-main-01', 'Navigation & Status Palette',
     'You may change a response before final submission by selecting another answer and saving it.', 3),
    ('jee-nav-04', 'tmpl-jee-main-01', 'Navigation & Status Palette',
     'The Question Palette displays the status of each question: Answered, Not Answered, Marked for Review, Answered & Marked for Review, Not Visited.', 4)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;

-- 6. General CBT Rules
INSERT INTO edux.exam_instruction_items (id, template_id, section_title, content, sequence_order)
VALUES
    ('jee-cbt-01', 'tmpl-jee-main-01', 'General CBT Rules',
     'Do not attempt to access external websites, applications or unauthorized resources.', 1),
    ('jee-cbt-02', 'tmpl-jee-main-01', 'General CBT Rules',
     'Do not attempt to manipulate or interfere with the examination system.', 2),
    ('jee-cbt-03', 'tmpl-jee-main-01', 'General CBT Rules',
     'Before submitting, review your answered and marked-for-review questions.', 3),
    ('jee-cbt-04', 'tmpl-jee-main-01', 'General CBT Rules',
     'Click Final Submit only when you are sure you have completed the examination.', 4),
    ('jee-cbt-05', 'tmpl-jee-main-01', 'General CBT Rules',
     'Leaving the exam window is not allowed. Do not refresh, switch tabs, minimize, or move away from the exam screen unnecessarily. If you perform any of the mentioned above things then your exam will be auto submitted and this will be flagged in your exam report.', 5)
ON CONFLICT (id) DO UPDATE
    SET content        = EXCLUDED.content,
        section_title  = EXCLUDED.section_title,
        sequence_order = EXCLUDED.sequence_order,
        updated_at     = CURRENT_TIMESTAMP;
