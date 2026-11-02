-- ===========================================================================
-- EduX migration 0004 — repoint foreign keys orphaned onto *_legacy tables
--
-- Context: at startup, app.db.session.ensure_schema() moves restored
-- "paper-import" tables (questions / papers / exam_attempts and, when empty,
-- their children) aside as *_legacy so the canonical EduX tables can be
-- created. PostgreSQL keeps follower constraints intact through the rename,
-- so any FK on a SURVIVING table (e.g. question_generation_items.question_id)
-- silently keeps pointing at <table>_legacy instead of the canonical table.
-- Migration 0003's FK pass cannot repair this: it intentionally skips any
-- column that already carries an FK (matched by columns, regardless of the
-- referenced table).
--
-- Symptom if left unrepaired: ForeignKeyViolation at runtime
--   INSERT/UPDATE ... violates foreign key constraint
--   "... is not present in table \"<table>_legacy\""
-- because rows are looked up in the legacy artifact, not the live table.
--
-- SAFETY CONTRACT (same as 0003):
--   * Metadata only. No row is inserted, updated or deleted.
--   * Stale FK constraints are dropped and recreated NOT VALID against the
--     canonical table, then VALIDATE is attempted. A constraint that fails
--     validation stays NOT VALID (existing rows keep working; new rows must
--     satisfy it) and is reported with a WARNING for a human to reconcile.
--   * A canonical FK already present is never touched.
--   * Tables genuinely owned by other products stay untouched: a FK is only
--     repointed when a same-named canonical table exists in schema "edux"
--     whose columns match the referenced ones name-for-name and type-for-type.
--
-- Run AFTER 0003 and one application start (so ensure_schema has moved the
-- colliding tables and the canonical ones exist):
--   psql "$DATABASE_URL" -f backend/sql/migrations/0004_repoint_legacy_foreign_keys.sql
-- ===========================================================================

SET search_path TO edux, public;

DO $$
DECLARE
    r            record;
    target_table name;
    con_new      name;
    cols_ok      boolean;
    had_valid    boolean;
BEGIN
    FOR r IN
        SELECT
            c.conname                                   AS conname,
            child.relname                               AS child_table,
            parent.relname                              AS legacy_parent,
            regexp_replace(parent.relname, '_legacy$', '') AS canonical_parent,
            (SELECT array_agg(x.attname ORDER BY k.ord)
               FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute x ON x.attrelid = c.conrelid AND x.attnum = k.attnum) AS child_cols,
            (SELECT array_agg(x.attname ORDER BY k.ord)
               FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
               JOIN pg_attribute x ON x.attrelid = c.confrelid AND x.attnum = k.attnum) AS parent_cols
        FROM pg_constraint c
        JOIN pg_class child   ON child.oid = c.conrelid
        JOIN pg_namespace cn  ON cn.oid = child.relnamespace
        JOIN pg_class parent  ON parent.oid = c.confrelid
        WHERE c.contype = 'f'
          AND cn.nspname = 'edux'
          AND parent.relname LIKE '%\_legacy'
          -- legacy artifact tables keep their internal constraint graph exactly
          -- as restored; only SURVIVING tables are repointed
          AND child.relname NOT LIKE '%\_legacy'
    LOOP
        target_table := r.canonical_parent;

        -- canonical table must exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'edux' AND table_name = target_table
        ) THEN
            RAISE WARNING 'fk % on % points at % but canonical table % is missing — skipped',
                r.conname, r.child_table, r.legacy_parent, target_table;
            CONTINUE;
        END IF;

        -- every referenced column must exist on the canonical table with an
        -- identical type (never repoint across type drift)
        SELECT count(*) = array_length(r.parent_cols, 1) INTO cols_ok
        FROM (
            SELECT x.attname, format_type(x.atttypid, x.atttypmod) AS t
            FROM pg_attribute x
            JOIN pg_class t ON t.oid = x.attrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'edux' AND t.relname = target_table AND x.attname = ANY (r.parent_cols)
        ) target
        JOIN (
            SELECT x.attname, format_type(x.atttypid, x.atttypmod) AS t
            FROM pg_attribute x
            JOIN pg_class t ON t.oid = x.attrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'edux' AND t.relname = r.legacy_parent AND x.attname = ANY (r.parent_cols)
        ) legacy ON legacy.attname = target.attname AND legacy.t = target.t;

        IF NOT cols_ok THEN
            RAISE WARNING 'fk % on % referenced columns differ between % and % — skipped',
                r.conname, r.child_table, r.legacy_parent, target_table;
            CONTINUE;
        END IF;

        -- if an equivalent FK to the canonical table already exists, drop only
        -- the stale one (it is redundant) — still metadata-only
        had_valid := EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_class p ON p.oid = c.confrelid
            WHERE n.nspname = 'edux'
              AND t.relname = r.child_table
              AND p.relname = target_table
              AND c.contype = 'f'
              AND (SELECT array_agg(x.attname ORDER BY k.ord)
                     FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                     JOIN pg_attribute x ON x.attrelid = c.conrelid AND x.attnum = k.attnum) = r.child_cols
        );

        IF had_valid THEN
            EXECUTE format('ALTER TABLE edux.%I DROP CONSTRAINT %I', r.child_table, r.conname);
            RAISE NOTICE 'fk % on % repointed: dropped redundant constraint on % (canonical FK already present)',
                r.conname, r.child_table, r.legacy_parent;
            CONTINUE;
        END IF;

        con_new := format('fk__%s__%s', r.child_table, array_to_string(r.child_cols, '_'));

        EXECUTE format('ALTER TABLE edux.%I DROP CONSTRAINT %I', r.child_table, r.conname);
        EXECUTE format(
            'ALTER TABLE edux.%I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES edux.%I (%s) NOT VALID',
            r.child_table, con_new,
            (SELECT string_agg(quote_ident(c), ', ') FROM unnest(r.child_cols) c),
            target_table,
            (SELECT string_agg(quote_ident(c), ', ') FROM unnest(r.parent_cols) c)
        );
        RAISE NOTICE 'fk % on % repointed from % to % (NOT VALID)', con_new, r.child_table, r.legacy_parent, target_table;

        BEGIN
            EXECUTE format('ALTER TABLE edux.%I VALIDATE CONSTRAINT %I', r.child_table, con_new);
            RAISE NOTICE 'fk % validated — all existing rows conform', con_new;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'fk % left NOT VALID (%): pre-existing rows reference legacy data; reconcile manually — no data was changed', con_new, SQLERRM;
        END;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Self-check: no FK in schema "edux" should reference a *_legacy table anymore
-- (0 rows expected, or only rows this migration reported as WARNING above).
-- ---------------------------------------------------------------------------
SELECT c.conname, child.relname AS child_table, parent.relname AS points_at
FROM pg_constraint c
JOIN pg_class child  ON child.oid = c.conrelid
JOIN pg_namespace cn ON cn.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = c.confrelid
WHERE c.contype = 'f' AND cn.nspname = 'edux' AND parent.relname LIKE '%\_legacy'
ORDER BY 1;