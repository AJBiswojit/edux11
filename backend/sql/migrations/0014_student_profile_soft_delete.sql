-- Migration: add is_deleted to student_profiles table (soft delete support)
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark specific students as deleted by roll_no
UPDATE student_profiles SET is_deleted = TRUE
WHERE roll_no IN ('XO001', 'XO002', 'XO003', 'XO004', 'XO005', 'XO006', 'XO007', 'XO008', 'XO009');
