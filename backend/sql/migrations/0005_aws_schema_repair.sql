-- ===========================================================================
-- EduX migration 0005 — AWS RDS schema repair (8 model tables)
--
-- TARGET: the live AWS RDS `database-1-restored`, schema "edux", whose
-- `verify_postgres_schema.py` output reports exactly 8 mismatched model
-- tables (this list is the source of truth for this file):
--
--   1. assignments           - missing status / published_at / archived_at
--                              (Phase-4 columns from 0001, never applied there)
--   2. assignment_submissions- missing graded_by / graded_at +
--                              FK (graded_by) -> users(id)
--   3. content_sources       - missing extracted_text / analysis_status /
--                              analysis_error
--   4. files                 - missing bytes
--   5. users                 - password_hash: NOT NULL must relax (SSO users)
--                              role:          NOT NULL must relax (legacy_role
--                                             is Optional in the model)
--                              status:        NULLABLE must tighten
--                              updated_at:    NULLABLE must tighten
--                              missing FK (institution_id) -> institutions(id)
--                              missing UNIQUE (institution_id, email)
--   6. ai_paper_status       - created_at / updated_at are
--                              TIMESTAMP WITH TIME ZONE; the mirrored model
--                              (app/models/ai_papers.py) declares *naive*
--                              DateTime => expected TIMESTAMP WITHOUT TIME ZONE
--   7. ai_generated_papers   - created_at / published_at: same mismatch
--   8. ai_generated_paper_questions - created_at: same mismatch
--
-- WHY 0001/0003 CANNOT REPAIR THESE (verified against the live report):
--   * 0001 predates the VARCHAR(36) id model: it adds graded_by/file_id as
--     native UUID — running it on AWS would fail against users.id VARCHAR(36).
--   * 0003's column list was generated from a 65-table/546-column model
--     snapshot; the Phase-4 columns above are simply absent from it.
--   * 0003 never converts column types (contract: "NEVER ... type rewrite"),
--     so the timestamptz drift stays.
--   * 0003 never relaxes NOT NULL (except exam_attempts.submitted_at), so
--     password_hash / role stay NOT NULL.
--   * 0003's guard leaves a column nullable with WARNING "kept nullable
--     (existing NULLs)" when data blocks SET NOT NULL — that is the AWS
--     users.status / users.updated_at state.
--   * Its unique pass warned "unique constraint not added" — consistent with
--     duplicate (institution_id, email) rows on AWS.
--
-- SAFETY CONTRACT
--   * NO DROP TABLE / TRUNCATE / DELETE / database recreation.
--   * No row's existing values are overwritten. The only UPDATEs in this
--     file fill values for columns that did not exist (new-column backfill
--     with the model default) or fill NULLs in a nullable column BEFORE it
--     is tightened — and those run ONLY under the explicit operator flag
--     -v backfill_nulls=on, after preflight has shown the affected rows.
--   * The 16 non-model/legacy tables (ai_generation_jobs, ai_questions,
--     exams, extracted_questions, import_batches, mcq_options,
--     paper_sections, practice_exam_questions, practice_exams,
--     question_attempts, question_images, question_papers, question_sources,
--     question_studio_questions, question_tags, students) are REFERENCED
--     NOWHERE below; this file touches only the 8 model tables listed above.
--   * Idempotent: every statement is presence-gated; re-running is a no-op.
--   * Sentinels: any hard data problem (duplicate users rows, unexpected
--     state) RAISES and aborts the transaction. Run it all-or-nothing:
--
--     PREFLIGHT FIRST (read-only):
--       cd backend && python scripts/preflight_aws_schema_repair.py
--
--     SAFE RUN (additive columns + relaxed nulls + FK + unique only — the
--     parts that never rewrite existing values):
--       psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
--            -f sql/migrations/0005_aws_schema_repair.sql
--
--     FULL RUN (only after reading the preflight report):
--       psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
--            -v backfill_nulls=on -v apply_ts_type_fix=on \
--            -f sql/migrations/0005_aws_schema_repair.sql
--
--     POST-MIGRATION VERIFICATION (read-only):
--       cd backend && python scripts/verify_postgres_schema.py
--       (expect: SCHEMA VERIFICATION: PASS. If the ts-type fix was skipped,
--        ai_paper_status / ai_generated_papers / ai_generated_paper_questions
--        remain flagged by design; re-run with -v apply_ts_type_fix=on.)
--
--     Requires psql >= 10 (\if meta-commands).
-- ===========================================================================

SET search_path TO edux, public;

-- psql-variable defaults (let a bare `psql -f` run the conservative path)
\if :{?backfill_nulls}
\else
  \set backfill_nulls off
\endif
\if :{?apply_ts_type_fix}
\else
  \set apply_ts_type_fix off
\endif

-- ===========================================================================
-- 0. HARD GATE — duplicate (institution_id, email) in users aborts everything
--    (requirement: never add the unique constraint over duplicate rows, never
--    delete/merge them here; fail safely with a diagnostic).
-- ===========================================================================
-- Diagnostic for the operator (also produced by the preflight script):
SELECT institution_id, email, count(*) AS row_count, array_agg(id) AS user_ids
FROM edux.users
GROUP BY institution_id, email
HAVING count(*) > 1
ORDER BY row_count DESC;

DO $$
DECLARE
    dup_groups bigint;
BEGIN
    SELECT count(*) INTO dup_groups
    FROM (
        SELECT 1 FROM edux.users
        GROUP BY institution_id, email
        HAVING count(*) > 1
    ) g;
    IF dup_groups > 0 THEN
        RAISE EXCEPTION '0005 abort: % duplicate (institution_id,email) group(s) exist in edux.users. Resolve them by a reviewed business decision (which account to keep) BEFORE re-running. No rows were changed by this migration.', dup_groups
            USING HINT = 'See the duplicate listing printed just above (also: scripts/preflight_aws_schema_repair.py).';
    END IF;
END $$;

-- ===========================================================================
-- 1. assignments — add Phase-4 columns (status NOT NULL, published/archived)
-- ===========================================================================
-- status (VARCHAR(32), NOT NULL, model python-default 'published'):
--   new column => existing rows must receive a value. 'published' is the
--   model's own default and the value 0001 chose; it fills ONLY rows that
--   could never have had a status. Nothing pre-existing is overwritten.
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS status VARCHAR(32);
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE edux.assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='edux' AND table_name='assignments'
          AND column_name='status' AND is_nullable='YES'
    ) THEN
        UPDATE edux.assignments SET status='published' WHERE status IS NULL;
        ALTER TABLE edux.assignments ALTER COLUMN status SET NOT NULL;
        RAISE NOTICE 'assignments.status: backfilled NULLs with model default ''published'' and set NOT NULL';
    END IF;
END $$;

-- ===========================================================================
-- 2. assignment_submissions — add grading columns + FK(graded_by)->users(id)
-- ===========================================================================
-- Both columns are nullable in the model (a submission is ungraded until a
-- faculty grades it). VARCHAR(36) — NOT UUID (0001's UUID form cannot be
-- referenced against users.id VARCHAR(36)).
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS graded_by VARCHAR(36);
ALTER TABLE edux.assignment_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='edux' AND table_name='assignment_submissions' AND column_name='graded_by'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE c.contype='f' AND n.nspname='edux' AND t.relname='assignment_submissions'
          AND (SELECT array_agg(x.attname)
                 FROM unnest(c.conkey) k JOIN pg_attribute x
                   ON x.attrelid=c.conrelid AND x.attnum=k) = ARRAY['graded_by']::name[]
    ) THEN
        -- NOT VALID first: existing rows are all NULL anyway (fresh column),
        -- but the pattern also protects a partially-repaired database.
        ALTER TABLE edux.assignment_submissions
            ADD CONSTRAINT fk__assignment_submissions__graded_by
            FOREIGN KEY (graded_by) REFERENCES edux.users (id) NOT VALID;
        BEGIN
            ALTER TABLE edux.assignment_submissions VALIDATE CONSTRAINT fk__assignment_submissions__graded_by;
            RAISE NOTICE 'assignment_submissions: FK(graded_by)->users(id) added and VALIDATED';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'assignment_submissions: FK(graded_by) left NOT VALID — pre-existing graded_by values reference missing users.ids (%). Existing rows keep working; new rows must satisfy it. Reconcile manually.', SQLERRM;
        END;
    END IF;
END $$;

-- ===========================================================================
-- 3. content_sources — add analysis columns
-- ===========================================================================
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS analysis_status VARCHAR(32);
ALTER TABLE edux.content_sources ADD COLUMN IF NOT EXISTS analysis_error TEXT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='edux' AND table_name='content_sources'
          AND column_name='analysis_status' AND is_nullable='YES'
    ) THEN
        -- model default 'PENDING' (a source whose analysis never ran)
        UPDATE edux.content_sources SET analysis_status='PENDING' WHERE analysis_status IS NULL;
        ALTER TABLE edux.content_sources ALTER COLUMN analysis_status SET NOT NULL;
        RAISE NOTICE 'content_sources.analysis_status: backfilled NULLs with ''PENDING'' and set NOT NULL';
    END IF;
END $$;

-- ===========================================================================
-- 4. files — add bytes (INTEGER, nullable — unknown size is legitimate)
-- ===========================================================================
-- Model: `bytes: Mapped[Optional[int]]` (SQLAlchemy Integer => PG integer).
-- Do NOT follow 0001's BIGINT: it would re-flag a type mismatch.
ALTER TABLE edux.files ADD COLUMN IF NOT EXISTS bytes INTEGER;

-- ===========================================================================
-- 5. users — realign nullability, add FK, add UNIQUE
-- ===========================================================================

-- 5a. RELAX password_hash and role (both Optional in the model).
--     Relaxing a NOT NULL can never lose or change data. Required because
--     the restored table predates SSO/linked-login accounts and predates
--     the "legacy_role is advisory only" semantics of the current model.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='edux' AND table_name='users'
                 AND column_name='password_hash' AND is_nullable='NO') THEN
        ALTER TABLE edux.users ALTER COLUMN password_hash DROP NOT NULL;
        RAISE NOTICE 'users.password_hash: NOT NULL relaxed (model: Optional)';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='edux' AND table_name='users'
                 AND column_name='role' AND is_nullable='NO') THEN
        ALTER TABLE edux.users ALTER COLUMN role DROP NOT NULL;
        RAISE NOTICE 'users.role: NOT NULL relaxed (model legacy_role: Optional)';
    END IF;
END $$;

-- 5b/5c. TIGHTEN status and updated_at to NOT NULL.
--     Model says both are required (status py-default 'active'; updated_at is
--     TimestampMixin, server_default now()). Existing NULLs must be resolved
--     first — that is a data decision, so it only happens under the explicit
--     operator flag -v backfill_nulls=on. Without the flag the columns stay
--     nullable, a WARNING names the exact counts, and the post-verify report
--     will keep flagging users — deliberately loud, never silent.
\if :backfill_nulls
DO $$
DECLARE n bigint;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='edux' AND table_name='users'
                 AND column_name='status' AND is_nullable='YES') THEN
        UPDATE edux.users SET status='active' WHERE status IS NULL;
        GET DIAGNOSTICS n = ROW_COUNT;
        ALTER TABLE edux.users ALTER COLUMN status SET NOT NULL;
        RAISE NOTICE 'users.status: filled % NULL row(s) with model default ''active'', set NOT NULL', n;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='edux' AND table_name='users'
                 AND column_name='updated_at' AND is_nullable='YES') THEN
        -- preserve each row's own creation instant; now() only as last resort
        UPDATE edux.users SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;
        GET DIAGNOSTICS n = ROW_COUNT;
        ALTER TABLE edux.users ALTER COLUMN updated_at SET NOT NULL;
        RAISE NOTICE 'users.updated_at: filled % NULL row(s) with COALESCE(created_at, now()), set NOT NULL', n;
    END IF;
END $$;
\else
DO $$
DECLARE s_nulls bigint; u_nulls bigint; s_state text; u_state text;
BEGIN
    SELECT count(*) INTO s_nulls FROM edux.users WHERE status IS NULL;
    SELECT count(*) INTO u_nulls FROM edux.users WHERE updated_at IS NULL;
    SELECT is_nullable INTO s_state FROM information_schema.columns
     WHERE table_schema='edux' AND table_name='users' AND column_name='status';
    SELECT is_nullable INTO u_state FROM information_schema.columns
     WHERE table_schema='edux' AND table_name='users' AND column_name='updated_at';

    IF s_state='YES' AND s_nulls=0 THEN
        ALTER TABLE edux.users ALTER COLUMN status SET NOT NULL;
        RAISE NOTICE 'users.status: no NULLs present — set NOT NULL';
    ELSIF s_state='YES' THEN
        RAISE WARNING 'users.status: % row(s) hold NULL — NOT tightened. Re-run with -v backfill_nulls=on to fill them (''active'') first, or UPDATE them yourself. users will stay flagged by the verifier until this is resolved.', s_nulls;
    END IF;

    IF u_state='YES' AND u_nulls=0 THEN
        ALTER TABLE edux.users ALTER COLUMN updated_at SET NOT NULL;
        RAISE NOTICE 'users.updated_at: no NULLs present — set NOT NULL';
    ELSIF u_state='YES' THEN
        RAISE WARNING 'users.updated_at: % row(s) hold NULL — NOT tightened. Re-run with -v backfill_nulls=on to fill them (COALESCE(created_at, now())) first, or UPDATE them yourself. users will stay flagged by the verifier until this is resolved.', u_nulls;
    END IF;
END $$;
\endif

-- 5d. ADD FK (institution_id) -> institutions(id). NOT NULL-violating rows are
--     impossible (column is nullable); orphan VALUES are possible (restored
--     users pointing at institution ids that were never restored). The FK is
--     therefore added NOT VALID and validation is attempted: orphans keep the
--     constraint NOT VALID (existing rows keep working, new writes are
--     enforced) and a WARNING reports the count.
SELECT count(*) AS orphan_users_institution_ids
FROM edux.users u
WHERE u.institution_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM edux.institutions i WHERE i.id = u.institution_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='edux' AND table_name='users' AND column_name='institution_id')
       AND EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='edux' AND table_name='institutions')
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint c
             JOIN pg_class t ON t.oid=c.conrelid
             JOIN pg_namespace n ON n.oid=t.relnamespace
             JOIN pg_class p ON p.oid=c.confrelid
            WHERE c.contype='f' AND n.nspname='edux' AND t.relname='users'
              AND p.relname='institutions'
              AND (SELECT array_agg(x.attname)
                     FROM unnest(c.conkey) k JOIN pg_attribute x
                       ON x.attrelid=c.conrelid AND x.attnum=k) = ARRAY['institution_id']::name[]
       ) THEN
        ALTER TABLE edux.users
            ADD CONSTRAINT fk__users__institution_id
            FOREIGN KEY (institution_id) REFERENCES edux.institutions (id) NOT VALID;
        BEGIN
            ALTER TABLE edux.users VALIDATE CONSTRAINT fk__users__institution_id;
            RAISE NOTICE 'users: FK(institution_id)->institutions(id) added and VALIDATED';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'users: FK(institution_id) left NOT VALID — orphan institution ids exist (%). Existing rows keep working; new rows must reference a real institution. Reconcile manually.', SQLERRM;
        END;
    END IF;
END $$;

-- 5e. ADD UNIQUE (institution_id, email). Gate 0 already aborted on
--     duplicates, so this cannot fail on existing data. NULLs in
--     institution_id are distinct (SQL standard), so restored users without
--     an institution cannot collide.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON t.oid=c.conrelid
          JOIN pg_namespace n ON n.oid=t.relnamespace
         WHERE n.nspname='edux' AND t.relname='users' AND c.contype IN ('u','p')
           AND (SELECT array_agg(x.attname ORDER BY x.attname)
                  FROM unnest(c.conkey) k JOIN pg_attribute x
                    ON x.attrelid=c.conrelid AND x.attnum=k) = ARRAY['email','institution_id']::name[]
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_index i
          JOIN pg_class t ON t.oid=i.indrelid
          JOIN pg_namespace n ON n.oid=t.relnamespace
         WHERE n.nspname='edux' AND t.relname='users' AND i.indisunique
           AND (SELECT array_agg(x.attname ORDER BY x.attname)
                  FROM unnest(i.indkey) k JOIN pg_attribute x
                    ON x.attrelid=t.oid AND x.attnum=k) = ARRAY['email','institution_id']::name[]
    ) THEN
        ALTER TABLE edux.users
            ADD CONSTRAINT uq__users__institution_id_email
            UNIQUE (institution_id, email);
        RAISE NOTICE 'users: UNIQUE (institution_id, email) added';
    END IF;
END $$;

-- ===========================================================================
-- 6. ai_paper_status / ai_generated_papers / ai_generated_paper_questions —
--    timestamp WITH time zone -> WITHOUT time zone (mirrored models declare
--    naive DateTime).
--
--    THIS STEP CANNOT SAFELY BE AUTOMATED UNCONDITIONALLY:
--    timestamptz stores an instant; dropping the zone re-interprets each
--    value as wall-clock. That is value-preserving only if every writer used
--    UTC-session semantics (app models write naive UTC; RDS sessions are TZ
--    UTC; the AI microservice writes naive UTC as the models' server_default
--    func.now() implies). PostgreSQL does not retain per-row zone info, so
--    no query can PROVE this for history — a human must confirm it. Hence
--    this section runs only with -v apply_ts_type_fix=on, after printing the
--    data profile below (also in the preflight report).
-- ===========================================================================
SELECT 'ai_paper_status' AS tbl, 'created_at' AS col, count(*) AS rows, count(created_at) AS non_null,
       min(created_at) AS earliest, max(created_at) AS latest
  FROM edux.ai_paper_status
UNION ALL
SELECT 'ai_paper_status', 'updated_at', count(*), count(updated_at), min(updated_at), max(updated_at)
  FROM edux.ai_paper_status
UNION ALL
SELECT 'ai_generated_papers', 'created_at', count(*), count(created_at), min(created_at), max(created_at)
  FROM edux.ai_generated_papers
UNION ALL
SELECT 'ai_generated_papers', 'published_at', count(*), count(published_at), min(published_at), max(published_at)
  FROM edux.ai_generated_papers
UNION ALL
SELECT 'ai_generated_paper_questions', 'created_at', count(*), count(created_at), min(created_at), max(created_at)
  FROM edux.ai_generated_paper_questions;

\if :apply_ts_type_fix
DO $$
DECLARE
    r record;
    c_udt text;
BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('ai_paper_status',               'created_at'),
        ('ai_paper_status',               'updated_at'),
        ('ai_generated_papers',           'created_at'),
        ('ai_generated_papers',           'published_at'),
        ('ai_generated_paper_questions',  'created_at')
    ) AS f(tbl, col) LOOP
        SELECT udt_name INTO c_udt FROM information_schema.columns
         WHERE table_schema='edux' AND table_name=r.tbl AND column_name=r.col;
        IF c_udt = 'timestamptz' THEN
            RAISE NOTICE 'converting %.% : timestamptz -> timestamp (USING % AT TIME ZONE ''UTC'')', r.tbl, r.col, r.col;
            EXECUTE format(
                'ALTER TABLE edux.%I ALTER COLUMN %I TYPE timestamp without time zone USING %I AT TIME ZONE ''UTC''',
                r.tbl, r.col, r.col
            );
        ELSIF c_udt = 'timestamp' THEN
            NULL; -- already repaired (idempotent re-run)
        ELSE
            RAISE WARNING 'unexpected type % for %.% — skipped (no data changed)', c_udt, r.tbl, r.col;
        END IF;
    END LOOP;
END $$;
\else
SELECT 'timestamp type conversion SKIPPED for ai_paper_status/ai_generated_papers/ai_generated_paper_questions'
     AS warning_step_6,
       're-run with -v apply_ts_type_fix=on after confirming writers use naive-UTC semantics'
     AS how_to_apply;
\endif

-- ===========================================================================
-- 7. SELF-CHECK (read-only). Expectations AFTER a full run (all flags on):
--    each query returns 0 rows. On a conservative run (no flags) the skipped
--    items are listed here so nothing is silent.
-- ===========================================================================
\echo '--- 7.1 missing additive columns (expect 0 rows) ---'
SELECT want.tbl, want.col
FROM (VALUES
    ('assignments','status'), ('assignments','published_at'), ('assignments','archived_at'),
    ('assignment_submissions','graded_by'), ('assignment_submissions','graded_at'),
    ('content_sources','extracted_text'), ('content_sources','analysis_status'), ('content_sources','analysis_error'),
    ('files','bytes')
) AS want(tbl, col)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='edux' AND table_name=want.tbl AND column_name=want.col
);

\echo '--- 7.2 nullability still diverging (expect 0 rows after a full run) ---'
SELECT want.tbl, want.col, c.is_nullable AS actual
FROM (VALUES
    ('assignments','status','NO'), ('content_sources','analysis_status','NO'),
    ('users','status','NO'), ('users','updated_at','NO'),
    ('users','password_hash','YES'), ('users','role','YES')
) AS want(tbl, col, want_nullable)
JOIN information_schema.columns c
  ON c.table_schema='edux' AND c.table_name=want.tbl AND c.column_name=want.col
WHERE c.is_nullable <> want.want_nullable;

\echo '--- 7.3 timestamp type still diverging (expect 0 rows after ts fix) ---'
SELECT c.table_name, c.column_name, c.udt_name
FROM information_schema.columns c
WHERE c.table_schema='edux'
  AND (c.table_name, c.column_name) IN (
        ('ai_paper_status','created_at'), ('ai_paper_status','updated_at'),
        ('ai_generated_papers','created_at'), ('ai_generated_papers','published_at'),
        ('ai_generated_paper_questions','created_at'))
  AND c.udt_name <> 'timestamp';

\echo '--- 7.4 expected FKs + UNIQUE present (expect 3 rows) ---'
SELECT c.conname, t.relname AS tbl, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='edux'
  AND ((t.relname='assignment_submissions' AND c.contype='f'
        AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (graded_by)%')
   OR  (t.relname='users' AND c.contype='f'
        AND pg_get_constraintdef(c.oid) LIKE 'FOREIGN KEY (institution_id)%')
   OR  (t.relname='users' AND c.contype='u'
        AND pg_get_constraintdef(c.oid) LIKE 'UNIQUE (institution_id, email)%'))
ORDER BY 2, 1;

\echo '--- 7.5 legacy/non-model tables must still hold exactly their pre-run rows (compare with preflight output) ---'
SELECT relname AS legacy_table, n_live_tup AS approx_rows
FROM pg_stat_user_tables
WHERE schemaname='edux'
  AND relname IN ('ai_generation_jobs','ai_questions','exams','extracted_questions',
                  'import_batches','mcq_options','paper_sections','practice_exam_questions',
                  'practice_exams','question_attempts','question_images','question_papers',
                  'question_sources','question_studio_questions','question_tags','students')
ORDER BY 1;