#!/usr/bin/env python3
"""EduX AWS schema-repair PREFLIGHT — READ-ONLY.

Runs the data-level gates that migration
`sql/migrations/0005_aws_schema_repair.sql` depends on, against the database
in `backend/.env` (or --database-url). It NEVER writes: only SELECTs.

What it checks (same 8 model tables the migration repairs):
  * presence/type/nullability of every column the migration adds or tightens
  * users: duplicate (institution_id, email) groups ............ HARD BLOCKER
  * users: NULL status / NULL updated_at counts ................ needs -v backfill_nulls=on
  * users: orphan institution_id values (FK will stay NOT VALID). informational
  * ai_* tables: timestamp column types + data profile ......... needs -v apply_ts_type_fix=on
  * FK/UNIQUE already present (idempotence — re-running is safe)
  * the 16 legacy/non-model tables + exact row counts .......... MUST NOT CHANGE
    (compare these numbers with the migration's section 7.5 output afterwards)

Exit codes:
  0  no blockers — run 0005; use the psql variables this report recommends
  1  human decision required first (duplicates / unexpected state) — the
     migration is designed to abort in the same situation, nothing would run
  2  could not connect / bad configuration

Usage (from backend/):
    python scripts/preflight_aws_schema_repair.py
    python scripts/preflight_aws_schema_repair.py --database-url postgresql+psycopg2://...
    python scripts/preflight_aws_schema_repair.py --json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

LEGACY_TABLES = [
    "ai_generation_jobs", "ai_questions", "exams", "extracted_questions",
    "import_batches", "mcq_options", "paper_sections", "practice_exam_questions",
    "practice_exams", "question_attempts", "question_images", "question_papers",
    "question_sources", "question_studio_questions", "question_tags", "students",
]

# (table, column, expected-state-after-full-repair)
ADDITIVE_COLUMNS = [
    ("assignments", "status", "varchar(32) NOT NULL"),
    ("assignments", "published_at", "timestamptz NULL"),
    ("assignments", "archived_at", "timestamptz NULL"),
    ("assignment_submissions", "graded_by", "varchar(36) NULL + FK->users(id)"),
    ("assignment_submissions", "graded_at", "timestamptz NULL"),
    ("content_sources", "extracted_text", "text NULL"),
    ("content_sources", "analysis_status", "varchar(32) NOT NULL"),
    ("content_sources", "analysis_error", "text NULL"),
    ("files", "bytes", "integer NULL"),
]

TS_COLUMNS = [
    ("ai_paper_status", "created_at"),
    ("ai_paper_status", "updated_at"),
    ("ai_generated_papers", "created_at"),
    ("ai_generated_papers", "published_at"),
    ("ai_generated_paper_questions", "created_at"),
]


def _setup_env(database_url: str | None) -> None:
    os.environ.setdefault("DB_SCHEMA", "edux")
    if database_url:
        os.environ["DATABASE_URL"] = database_url


def main() -> int:
    parser = argparse.ArgumentParser(description="EduX 0005 preflight (read-only)")
    parser.add_argument("--database-url", default=None)
    parser.add_argument("--schema", default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    _setup_env(args.database_url)
    if args.schema:
        os.environ["DB_SCHEMA"] = args.schema

    from sqlalchemy import create_engine, text

    from app.core.config import get_settings

    settings = get_settings()
    db_url = settings.database_url
    schema = (settings.db_schema or "").strip() or "edux"
    if not db_url.startswith("postgresql"):
        print(f"ERROR: DATABASE_URL must point at PostgreSQL, got: {db_url!r}", file=sys.stderr)
        return 2

    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        connect_args={"options": f"-csearch_path={schema} -cstatement_timeout=60000"},
    )
    try:
        conn = engine.connect()
    except Exception as exc:
        print(f"ERROR: could not connect: {exc}", file=sys.stderr)
        return 2

    report: dict = {"schema": schema, "blockers": [], "recommendations": [], "gates": {}}
    R = report["gates"]

    def q1(sql, **params):
        return conn.execute(text(sql), params).mappings().all()

    def scalar(sql, params=None, **kw):
        return conn.execute(text(sql), params or kw).scalar()

    # -- 1. additive columns already present? (idempotence) ------------------
    col_state = {}
    for tbl, col, want in ADDITIVE_COLUMNS:
        row = conn.execute(
            text(
                "SELECT data_type, udt_name, character_maximum_length AS maxlen, is_nullable "
                "FROM information_schema.columns "
                "WHERE table_schema=:s AND table_name=:t AND column_name=:c"
            ),
            {"s": schema, "t": tbl, "c": col},
        ).mappings().first()
        col_state[f"{tbl}.{col}"] = {
            "present": row is not None,
            "actual": (f"{row['data_type']}"
                       + (f"({row['maxlen']})" if row["maxlen"] else "")
                       + f" {'NULL' if row['is_nullable'] == 'YES' else 'NOT NULL'}") if row else None,
            "want": want,
        }
    R["additive_columns"] = col_state

    # -- 2. users gates -------------------------------------------------------
    users: dict = {}
    dups = q1(
        f"SELECT institution_id, email, count(*) AS n, array_agg(id ORDER BY id) AS ids "
        f"FROM {schema}.users GROUP BY 1,2 HAVING count(*) > 1 ORDER BY n DESC, email LIMIT 25"
    )
    users["duplicate_groups"] = [dict(r) for r in dups]
    users["duplicate_group_count"] = scalar(
        f"SELECT count(*) FROM (SELECT 1 FROM {schema}.users GROUP BY institution_id, email "
        f"HAVING count(*) > 1) g"
    )
    if users["duplicate_group_count"]:
        report["blockers"].append(
            f"users: {users['duplicate_group_count']} duplicate (institution_id,email) group(s) — "
            "0005 gate 0 will abort; decide per group which account survives, THEN re-run"
        )
    users["null_status_rows"] = scalar(f"SELECT count(*) FROM {schema}.users WHERE status IS NULL")
    users["null_updated_at_rows"] = scalar(f"SELECT count(*) FROM {schema}.users WHERE updated_at IS NULL")
    users["null_institution_id_rows"] = scalar(
        f"SELECT count(*) FROM {schema}.users WHERE institution_id IS NULL"
    )
    users["orphan_institution_id_rows"] = scalar(
        f"SELECT count(*) FROM {schema}.users u WHERE u.institution_id IS NOT NULL "
        f"AND NOT EXISTS (SELECT 1 FROM {schema}.institutions i WHERE i.id = u.institution_id)"
    )
    for col, want in (("password_hash", "YES"), ("role", "YES"), ("status", "NO"), ("updated_at", "NO")):
        users[f"{col}_is_nullable"] = scalar(
            "SELECT is_nullable FROM information_schema.columns "
            "WHERE table_schema=:s AND table_name='users' AND column_name=:c",
            {"s": schema, "c": col},
        )
        users[f"{col}_want_nullable"] = want
    if users["null_status_rows"]:
        report["recommendations"].append(
            f"users.status: {users['null_status_rows']} NULL row(s) — run 0005 with -v backfill_nulls=on "
            "(fills them with 'active') or UPDATE them yourself first"
        )
    if users["null_updated_at_rows"]:
        report["recommendations"].append(
            f"users.updated_at: {users['null_updated_at_rows']} NULL row(s) — run 0005 with "
            "-v backfill_nulls=on (fills COALESCE(created_at, now())) or UPDATE them yourself first"
        )
    if users["orphan_institution_id_rows"]:
        report["recommendations"].append(
            f"users.institution_id: {users['orphan_institution_id_rows']} row(s) reference institution ids "
            "absent from institutions — the FK will be added NOT VALID and stay NOT VALID until reconciled"
        )
    users["fk_institution_present"] = bool(scalar(
        "SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid "
        "JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_class p ON p.oid=c.confrelid "
        "WHERE c.contype='f' AND n.nspname=:s AND t.relname='users' AND p.relname='institutions'",
        {"s": schema},
    ))
    users["unique_institution_email_present"] = bool(scalar(
        "SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid "
        "JOIN pg_namespace n ON n.oid=t.relnamespace "
        "WHERE n.nspname=:s AND t.relname='users' AND c.contype='u' "
        "AND (SELECT array_agg(x.attname ORDER BY x.attname) FROM unnest(c.conkey) k "
        "     JOIN pg_attribute x ON x.attrelid=c.conrelid AND x.attnum=k) "
        "    = ARRAY['email','institution_id']::name[]",
        {"s": schema},
    ))
    R["users"] = users

    # -- 3. grading FK --------------------------------------------------------
    R["assignment_submissions_fk_graded_by_present"] = bool(scalar(
        "SELECT count(*) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid "
        "JOIN pg_namespace n ON n.oid=t.relnamespace WHERE c.contype='f' AND n.nspname=:s "
        "AND t.relname='assignment_submissions' "
        "AND (SELECT array_agg(x.attname) FROM unnest(c.conkey) k "
        "     JOIN pg_attribute x ON x.attrelid=c.conrelid AND x.attnum=k) = ARRAY['graded_by']::name[]",
        {"s": schema},
    ))

    # -- 4. AI timestamp drift + data profile ---------------------------------
    ts = []
    needs_ts_fix = False
    for tbl, col in TS_COLUMNS:
        udt = scalar(
            "SELECT udt_name FROM information_schema.columns "
            "WHERE table_schema=:s AND table_name=:t AND column_name=:c",
            {"s": schema, "t": tbl, "c": col},
        )
        prof = {"table": tbl, "column": col, "udt": udt}
        if udt is not None:
            row = conn.execute(
                text(
                    f"SELECT count(*) AS rows, count({col}) AS non_null, "
                    f"min({col})::text AS earliest, max({col})::text AS latest FROM {schema}.{tbl}"
                )
            ).mappings().first()
            prof.update(dict(row))
        if udt == "timestamptz":
            needs_ts_fix = True
        ts.append(prof)
    R["timestamp_columns"] = ts
    if needs_ts_fix:
        report["recommendations"].append(
            "ai_* timestamp columns are timestamptz; models declare naive UTC DateTime. "
            "Confirm all writers used naive-UTC semantics (RDS sessions are TZ=UTC), then run "
            "0005 with -v apply_ts_type_fix=on. Without it, these 3 tables stay flagged — by design."
        )

    # -- 5. legacy/non-model inventory (compare post-migration) ---------------
    legacy = []
    for tname in LEGACY_TABLES:
        exists = bool(scalar(
            "SELECT count(*) FROM information_schema.tables WHERE table_schema=:s AND table_name=:t",
            {"s": schema, "t": tname},
        ))
        rows = None
        if exists:
            try:
                rows = scalar(f'SELECT count(*) FROM "{schema}"."{tname}"')
            except Exception as exc:  # statement_timeout etc — fall back to estimate
                conn.rollback()
                rows = f"estimate:{scalar('SELECT reltuples::bigint FROM pg_class WHERE relname=:t', {'t': tname})} ({exc.__class__.__name__})"
        legacy.append({"table": tname, "exists": bool(exists), "rows": rows})
    R["legacy_tables"] = legacy

    conn.close()
    engine.dispose()

    # -- verdict --------------------------------------------------------------
    needs_repair = (
        any(not v["present"] or v["actual"] != v["want"] for k, v in col_state.items())
        or needs_ts_fix
        or not users["fk_institution_present"]
        or not users["unique_institution_email_present"]
        or not R["assignment_submissions_fk_graded_by_present"]
        or any(users[f"{c}_is_nullable"] != users[f"{c}_want_nullable"] and users[f"{c}_is_nullable"] is not None
               for c in ("password_hash", "role", "status", "updated_at"))
    )
    report["needs_repair"] = bool(needs_repair)

    if args.json:
        print(json.dumps(report, indent=2, default=str))
    else:
        print("EduX 0005 preflight (READ-ONLY)")
        print(f"  schema : {schema}")
        print(f"  repair needed: {'YES' if needs_repair else 'NO (already model-clean)'}")
        print("\n[gate] users")
        print(f"  duplicate (institution_id,email) groups : {users['duplicate_group_count']}")
        for d in users["duplicate_groups"]:
            print(f"    · {d['email']!r} @ institution {d['institution_id']!r}: {d['n']} rows, ids={d['ids']}")
        print(f"  NULL status={users['null_status_rows']} | NULL updated_at={users['null_updated_at_rows']}"
              f" | NULL institution_id={users['null_institution_id_rows']}"
              f" | orphan institution_id={users['orphan_institution_id_rows']}")
        print(f"  fk institution present: {users['fk_institution_present']}"
              f" | unique (institution_id,email) present: {users['unique_institution_email_present']}")
        for c in ("password_hash", "role", "status", "updated_at"):
            print(f"  {c}: nullable={users[f'{c}_is_nullable']} (want {users[f'{c}_want_nullable']})")
        print("\n[gate] additive columns")
        for k, v in col_state.items():
            tag = "ok" if v["present"] and v["actual"] == v["want"] else ("missing" if not v["present"] else "differs")
            print(f"  {k}: {tag} — actual={v['actual']} want={v['want']}")
        print(f"  assignment_submissions FK(graded_by): {'present' if R['assignment_submissions_fk_graded_by_present'] else 'missing'}")
        print("\n[gate] ai_* timestamp columns")
        for p in ts:
            print(f"  {p['table']}.{p['column']}: udt={p['udt']}"
                  f"{' rows=' + str(p.get('rows')) + ' non_null=' + str(p.get('non_null')) + ' range=[' + str(p.get('earliest')) + ' .. ' + str(p.get('latest')) + ']' if p.get('rows') is not None else ''}")
        print("\n[gate] legacy/non-model tables (record these counts; must be identical after 0005)")
        for lt in legacy:
            print(f"  {lt['table']}: exists={lt['exists']} rows={lt['rows']}")
        if report["blockers"]:
            print("\nBLOCKERS (must be resolved by a human decision before 0005 can pass):")
            for b in report["blockers"]:
                print(f"  ✗ {b}")
        if report["recommendations"]:
            print("\nRECOMMENDATIONS:")
            for r in report["recommendations"]:
                print(f"  → {r}")
        print(f"\nPREFLIGHT: {'BLOCKED' if report['blockers'] else 'CLEAR'}")

    return 1 if report["blockers"] else 0


if __name__ == "__main__":
    sys.exit(main())