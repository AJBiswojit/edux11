# 0005 AWS Schema Repair — Runbook & Operation Reference

**Scope:** repair the **8 mismatched model tables** reported by
`python scripts/verify_postgres_schema.py` against AWS RDS
`database-1-restored.cfck4skoe4h0.ap-south-2.rds.amazonaws.com:5432/postgres`,
schema `edux`. Nothing else is touched. The **16 legacy/non-model tables**
(`ai_generation_jobs, ai_questions, exams, extracted_questions, import_batches,
mcq_options, paper_sections, practice_exam_questions, practice_exams,
question_attempts, question_images, question_papers, question_sources,
question_studio_questions, question_tags, students`) are **never referenced**
by the migration; their row counts are recorded by the preflight and the
migration's self-check so you can prove they were untouched.

**Source of truth:** the live verifier output (FAIL, 8 tables):
`ai_generated_paper_questions`, `ai_generated_papers`, `ai_paper_status`,
`assignment_submissions`, `assignments`, `content_sources`, `files`, `users`.

## Why 0001/0003 cannot repair these (reconciliation)

| Existing object | Why it leaves the 8 mismatches |
|---|---|
| `0001_phase4_missing_capabilities.sql` | Never (successfully) applied to this RDS — the Phase-4 columns on `assignments`, `assignment_submissions`, `content_sources`, `files` are exactly the live "missing column" list. And it **cannot simply be re-run**: it declares `graded_by UUID REFERENCES users(id)` / `file_id UUID`, while the live (and model) id type is `VARCHAR(36)` — it would fail or create a re-flagged type mismatch. |
| `ensure_schema()` (every app boot) | Additive identity columns only (users.institution_id etc.) — already done on AWS; does not create Phase-4 columns, never changes nullability or types, adds no FK/UNIQUE. |
| `0003_complete_postgresql_schema.sql` | Its column list was generated from a **65-table/546-column model snapshot** — the Phase-4 columns are not in it. It **never converts types** (contract: "NEVER type rewrite" → timestamptz drift stays), **never relaxes NOT NULL** except `exam_attempts.submitted_at` (→ `password_hash`, `role` stay NOT NULL), its guarded `SET NOT NULL` **kept users.status/updated_at nullable with WARNINGs** ("kept nullable (existing NULLs)") because AWS rows hold NULLs, and its unique pass **warned/failed on users UNIQUE** — consistent with duplicate `(institution_id,email)` rows existing on AWS. |
| `0004_repoint_legacy_foreign_keys.sql` | Only repoints FKs that reference `*_legacy` tables; unrelated to these 8. |

## Files

| File | Purpose |
|---|---|
| `sql/migrations/0005_aws_schema_repair.sql` | The additive, idempotent, presence-gated repair. |
| `scripts/preflight_aws_schema_repair.py` | READ-ONLY preflight: data gates + legacy row counts + exactly which flags you need. Exit 0 = clear, 1 = blocked (human decision), 2 = connection error. |
| `scripts/verify_postgres_schema.py` | Post-migration verification (read-only), the same command that produced the mismatch list. |

## Runbook (operator)

```bash
# 0. Take an RDS snapshot first. The migration is atomic and additive,
#    but the snapshot is your rollback for the one value-rewriting step
#    (timestamptz -> timestamp in section 6).

# 1. PREFLIGHT (read-only; safe against AWS)
cd backend
python scripts/preflight_aws_schema_repair.py

# 2. If BLOCKED: resolve the listed duplicate (institution_id,email) groups.
#    That is a business decision (which account survives, per group).
#    0005 will refuse to run — atomically — while duplicates exist.

# 3. SAFE RUN — additive columns, relaxed nulls, FK, UNIQUE only:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
     -f sql/migrations/0005_aws_schema_repair.sql

# 4. Read the WARNINGs. Then the FULL RUN with only the flags preflight
#    recommended (each one is opt-in):
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -1 \
     -v backfill_nulls=on -v apply_ts_type_fix=on \
     -f sql/migrations/0005_aws_schema_repair.sql

# 5. POST-MIGRATION VERIFICATION (read-only):
python scripts/verify_postgres_schema.py        # expect: SCHEMA VERIFICATION: PASS
python scripts/preflight_aws_schema_repair.py   # expect: repair needed: NO; legacy counts unchanged
```

- Requires `psql >= 10` (`\if`).
- `-1` runs the whole file in ONE transaction; `ON_ERROR_STOP=1` makes any
  error abort everything. Either it all applies, or nothing does.
- Run as the RDS master user (or a role owning schema `edux`).
- Do **not** run it from application startup code — it is an operator tool
  (per project constraint, it is never auto-applied).

## Every operation, explained

### Gate 0 — duplicate users abort (HARD STOP, no data changed)
`SELECT` lists duplicate `(institution_id,email)` groups; a `DO` block
`RAISE EXCEPTION`s if any exist → whole transaction rolls back.
*Why:* UNIQUE over duplicates would either fail mid-migration or tempt a
scripted merge. Neither is acceptable — the duplicate set is a data-ownership
decision. (Requirement 8.)

### Section 1 — `assignments` (+status, +published_at, +archived_at)
- `ADD COLUMN IF NOT EXISTS published_at/archived_at TIMESTAMPTZ` — nullable, no default, zero risk.
- `ADD COLUMN IF NOT EXISTS status VARCHAR(32)`: existing rows then receive the **model default `'published'`** (the same value 0001 chose for this backfill) via a guarded `UPDATE … WHERE status IS NULL`, then `ALTER … SET NOT NULL`. This fills only rows that could never have had a value; nothing existing is overwritten. Idempotent: re-runs see `NOT NULL` and skip.

### Section 2 — `assignment_submissions` (+graded_by, +graded_at, +FK)
- Both columns nullable, `VARCHAR(36)` / `TIMESTAMPTZ` (deliberately **not**
  0001's `UUID`: live `users.id` is `VARCHAR(36)`).
- FK `fk__assignment_submissions__graded_by → users(id)` added **NOT VALID**
  then `VALIDATE CONSTRAINT` attempted. ALL current values are NULL (fresh
  column) so validation passes; the NOT-VALID-first pattern also protects a
  partially repaired database — on failure the constraint stays NOT VALID
  with a WARNING (existing rows keep working, new writes enforced) instead of
  aborting.

### Section 3 — `content_sources` (+extracted_text, +analysis_status, +analysis_error)
Same pattern as Section 1; backfill default `'PENDING'` (a source whose
analysis never ran — the model default), then `SET NOT NULL`.

### Section 4 — `files` (+bytes)
`ADD COLUMN IF NOT EXISTS bytes INTEGER` — **note: `INTEGER`, not 0001's
`BIGINT`**: the model is `Mapped[Optional[int]]` (SQLAlchemy `Integer`), so
`BIGINT` would re-flag a type mismatch.

### Section 5 — `users`
| Op | Why | Data risk |
|---|---|---|
| `password_hash DROP NOT NULL` | Model `Optional` (SSO/linked-login users can have no password). | None — relaxing a constraint never changes data. |
| `role DROP NOT NULL` | `legacy_role` is Optional and advisory (roles come from `user_roles`). | None. |
| `status SET NOT NULL` | Model requires it. | **Gated (req. 9):** if NULL rows exist, the step is skipped with a loud WARNING — unless you pass `-v backfill_nulls=on`, which fills NULLs with the model default `'active'` and reports the row count. Never deletes or rewrites non-NULL values. |
| `updated_at SET NOT NULL` | `TimestampMixin` requires it. | Same gate; backfill is `COALESCE(created_at, now())` — each row keeps its own creation instant; `now()` is only the last resort for a row with both NULL. |
| `+FK institution_id → institutions(id)` | Model FK; live DB lacks it. | NOT VALID + VALIDATE attempt. If AWS has **orphan institution ids**, the FK stays NOT VALID (existing rows keep working; new writes enforced) and a WARNING reports it — the verifier counts the FK as present, and preflight tells you the orphan count beforehand. |
| `+UNIQUE (institution_id, email)` | Model constraint; live DB lacks it. | Runs only after Gate 0 proved zero duplicates, so it cannot fail on data. NULL `institution_id` rows are distinct per SQL standard — they cannot collide. Skipped if an equivalent pair-unique (constraint or index) exists. |

### Section 6 — AI tables: `timestamptz` → `timestamp without time zone`
Columns: `ai_paper_status.{created_at,updated_at}`,
`ai_generated_papers.{created_at,published_at}`,
`ai_generated_paper_questions.created_at`.

- The mirrored models (`app/models/ai_papers.py`) declare **naive** `DateTime`
  with `server_default=func.now()`. On a UTC session (RDS zone = UTC,
  `TimeZone=UTC` default), a naive-UTC writer reading/writing these columns
  sees identical wall-clock values before and after conversion:
  `… AT TIME ZONE 'UTC'` is value-preserving **iff** every writer used UTC
  semantics. PostgreSQL normalizes timestamptz and does **not** retain
  per-row zone info, so **no query can prove this for historical rows** —
  hence requirement 10: this step prints a data profile (row counts, nulls,
  min/max per column) and then runs **only with `-v apply_ts_type_fix=on`**.
  Without the flag it is skipped with an explicit notice; the verifier will
  keep flagging these 3 tables **by design** until you opt in.
- The conversion rewrites the 3 tables (small: AI pipeline intake/output),
  takes a brief `ACCESS EXCLUSIVE` lock per table, and is **not**
  auto-rollback-able — your RDS snapshot from step 0 is the rollback.
- The note in `ai_papers.py`: these tables are shared with the external AI
  microservice. Coordinate the opt-in run so the service writes naive-UTC
  (it already does — the models were mirrored from the service's own DDL).

### Section 7 — self-check (read-only)
Five result sets: remaining missing columns / nullability / ts-type drift
(expect 0 rows each after a full run), the 3 expected constraints (expect 3
rows), and the 16 legacy tables' row counts to compare against the
preflight's **identical** numbers.

## Explicit warnings — operations that cannot (or must not) be automated

1. **Duplicate `(institution_id,email)` resolution** — 100 % manual. Gate 0
   aborts the migration; preflight lists the groups with row ids. Merging or
   deleting accounts is a business decision, never scripted here.
2. **NULL `users.status` / `users.updated_at`** — needs `-v backfill_nulls=on`
   (documented fills: `'active'`, `COALESCE(created_at, now())`), or your own
   `UPDATE`. Without it the columns stay nullable and the verifier stays red —
   loud, never silent.
3. **`timestamptz → timestamp` on the AI tables** — needs
   `-v apply_ts_type_fix=on` plus writer-semantics confirmation (see §6).
4. **Orphan `users.institution_id`** — FK added NOT VALID and stays NOT VALID
   with a WARNING until you reconcile those rows (insert missing institutions
   or null/reassign the user rows). Not automated: choosing an institution is
   a data decision.
5. **Existing non-NULL data is never overwritten anywhere in this file.**
   The only `UPDATE`s fill values for brand-new columns or gated NULL backfills.

## Rehearsal evidence (local, no AWS writes)

Validated against a throwaway PostgreSQL 16 cluster rebuilt to reproduce the
live verifier report **line-for-line** (8 tables, identical issue lines):
preflight BLOCKED → gate-0 abort left zero statements applied (single
transaction) → after manual duplicate resolution, conservative run repaired
Tables 1–5c → verifier then showed only the two gated categories → full run
with both flags → **`SCHEMA VERIFICATION: PASS`** → timestamp round-trip
lossless to the microsecond (`…24.501191+00` → `…24.501191`) → all fixture
row counts unchanged (no deletes anywhere) → re-running 0005 with all flags
is a zero-warning no-op (idempotent) → running against the already-healed
replica changed nothing and stayed PASS.