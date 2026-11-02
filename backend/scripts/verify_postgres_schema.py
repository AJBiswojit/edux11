#!/usr/bin/env python3
"""EduX PostgreSQL schema verifier — READ-ONLY.

Compares the actual PostgreSQL schema (information_schema / pg_catalog) against
the CURRENT SQLAlchemy model metadata (backend/app/models/**) and prints a
per-table status report ending in SCHEMA VERIFICATION: PASS or FAIL.

Guarantees:
  * read-only — only SELECTs against information_schema / pg_catalog
  * no INSERT / UPDATE / DELETE / DROP / TRUNCATE / DDL of any kind
  * never imports or executes seed logic

Usage (from backend/):
    python scripts/verify_postgres_schema.py
    python scripts/verify_postgres_schema.py --database-url postgresql+psycopg2://...
    python scripts/verify_postgres_schema.py --verbose

Exit code 0 = PASS, 1 = FAIL, 2 = could not connect.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))


def _setup_env(database_url: str | None) -> None:
    os.environ.setdefault("DB_SCHEMA", "edux")
    if database_url:
        os.environ["DATABASE_URL"] = database_url


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify EduX PostgreSQL schema against SQLAlchemy models (read-only)")
    parser.add_argument("--database-url", default=None, help="Override DATABASE_URL (default: backend/.env)")
    parser.add_argument("--schema", default=None, help="Override DB_SCHEMA (default: backend/.env, usually 'edux')")
    parser.add_argument("--verbose", action="store_true", help="Also print INFO-level notes")
    parser.add_argument("--json", action="store_true", help="Emit a machine-readable JSON report")
    args = parser.parse_args()

    _setup_env(args.database_url)
    if args.schema:
        os.environ["DB_SCHEMA"] = args.schema

    from sqlalchemy import create_engine, text
    from sqlalchemy.dialects import postgresql

    from app.core.config import get_settings
    from app.db.base import Base
    # Import every model module explicitly (same registration as app.main).
    import app.models.ai  # noqa: F401
    import app.models.assessment  # noqa: F401
    import app.models.capabilities  # noqa: F401
    import app.models.catalog  # noqa: F401
    import app.models.exams  # noqa: F401
    import app.models.identity  # noqa: F401
    import app.models.intelligence  # noqa: F401
    import app.models.interventions  # noqa: F401
    import app.models.ops  # noqa: F401
    import app.models.people  # noqa: F401
    import app.models.teaching  # noqa: F401

    settings = get_settings()
    db_url = settings.database_url
    schema = (settings.db_schema or "").strip() or "edux"

    if not db_url.startswith("postgresql"):
        print(f"ERROR: DATABASE_URL must point at PostgreSQL, got: {db_url!r}", file=sys.stderr)
        return 2

    connect_args = {"options": f"-csearch_path={schema}"} if schema else {}
    try:
        engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args)
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: could not build engine: {exc}", file=sys.stderr)
        return 2

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"ERROR: could not connect to {db_url.split('@')[-1]}: {exc}", file=sys.stderr)
        return 2

    dialect = postgresql.dialect()
    meta = Base.metadata

    # ---------------------------------------------------------------- expected
    expected_tables: dict[str, dict] = {}
    for table in meta.sorted_tables:
        cols = {}
        for c in table.columns:
            compiled = c.type.compile(dialect)
            if compiled.upper() in ("FLOAT", "FLOAT(53)", "DOUBLE PRECISION"):
                exp_type = "double precision"
                exp_len = None
            elif compiled.upper().startswith("VARCHAR"):
                exp_type = "character varying"
                exp_len = int(compiled[compiled.index("(") + 1 : compiled.index(")")])
            else:
                exp_type = compiled.lower()
                exp_len = None
            cols[c.name] = {"type": exp_type, "length": exp_len, "nullable": c.nullable}
        fks = sorted(
            (
                tuple(fk.parent.name for fk in constraint.elements),
                constraint.elements[0].column.table.name,
                tuple(el.column.name for el in constraint.elements),
            )
            for constraint in table.foreign_key_constraints
        )
        uniques = sorted(
            tuple(c.name for c in con.columns)
            for con in table.constraints
            if con.__class__.__name__ == "UniqueConstraint"
        )
        for c in table.columns:
            if c.unique and tuple([c.name]) not in uniques:
                uniques.append((c.name,))
        uniques = sorted(set(uniques))
        indexes = sorted(
            ({"name": ix.name, "cols": tuple(c.name for c in ix.columns), "unique": bool(ix.unique)} for ix in table.indexes),
            key=lambda i: i["name"],
        )
        expected_tables[table.name] = {
            "columns": cols,
            "fks": fks,
            "uniques": uniques,
            "indexes": indexes,
            "pk": tuple(c.name for c in table.primary_key.columns),
        }

    # ---------------------------------------------------------------- actual
    with engine.connect() as conn:
        actual_tables = {
            r.table_name
            for r in conn.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_schema = :s AND table_type = 'BASE TABLE'"),
                {"s": schema},
            )
        }
        actual_cols: dict[str, dict] = {}
        for r in conn.execute(
            text(
                """
                SELECT table_name, column_name, data_type, udt_name,
                       COALESCE(character_maximum_length, 0) AS maxlen, is_nullable
                FROM information_schema.columns WHERE table_schema = :s
                """
            ),
            {"s": schema},
        ):
            actual_cols.setdefault(r.table_name, {})[r.column_name] = {
                "data_type": r.data_type,
                "udt_name": r.udt_name,
                "maxlen": r.maxlen or 0,
                "is_nullable": r.is_nullable,
            }

        def constraints_of(kind: str):
            rows = conn.execute(
                text(
                    """
                    SELECT t.relname AS table_name, c.conname,
                           (SELECT array_agg(x.attname ORDER BY k.ord)
                              FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                              JOIN pg_attribute x ON x.attrelid = c.conrelid AND x.attnum = k.attnum) AS cols,
                           c.confrelid::regclass::text AS ref_table,
                           (SELECT array_agg(x.attname ORDER BY k.ord)
                              FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
                              JOIN pg_attribute x ON x.attrelid = c.confrelid AND x.attnum = k.attnum) AS ref_cols
                    FROM pg_constraint c
                    JOIN pg_class t ON t.oid = c.conrelid
                    JOIN pg_namespace n ON n.oid = t.relnamespace
                    WHERE n.nspname = :s AND c.contype = :k
                    """
                ),
                {"s": schema, "k": kind},
            )
            out: dict[str, list] = {}
            for r in rows:
                out.setdefault(r.table_name, []).append(
                    {"name": r.conname, "cols": tuple(r.cols or ()), "ref_table": r.ref_table, "ref_cols": tuple(r.ref_cols or ())}
                )
            return out

        actual_fks = constraints_of("f")
        actual_uqs = constraints_of("u")
        actual_pks = constraints_of("p")

        actual_indexes: dict[str, list] = {}
        for r in conn.execute(
            text(
                """
                SELECT t.relname AS table_name, i.indexrelid::regclass::text AS index_name,
                       indisunique,
                       (SELECT array_agg(x.attname ORDER BY k.ord)
                          FROM unnest(i.indkey::smallint[]) WITH ORDINALITY AS k(attnum, ord)
                          JOIN pg_attribute x ON x.attrelid = t.oid AND x.attnum = k.attnum) AS cols
                FROM pg_index i
                JOIN pg_class t ON t.oid = i.indrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = :s
                """
            ),
            {"s": schema},
        ):
            actual_indexes.setdefault(r.table_name, []).append(
                {"name": r.index_name.split(".")[-1], "cols": tuple(r.cols or ()), "unique": bool(r.indisunique)}
            )

    # ---------------------------------------------------------------- compare
    report: dict[str, dict] = {}
    problems = 0
    for tname, exp in sorted(expected_tables.items()):
        entry: dict = {"status": "OK", "issues": [], "notes": []}
        if tname not in actual_tables:
            entry["status"] = "MISSING TABLE"
            entry["issues"].append("table does not exist")
            report[tname] = entry
            problems += 1
            continue

        acols = actual_cols.get(tname, {})
        for cname, ec in exp["columns"].items():
            if cname not in acols:
                entry["issues"].append(f"missing column {cname}")
                continue
            a = acols[cname]
            if a["data_type"] != ec["type"]:
                extra = f" (udt={a['udt_name']})" if a["data_type"] == "USER-DEFINED" else ""
                entry["issues"].append(
                    f"column {cname}: type mismatch expected {ec['type']} got {a['data_type']}{extra}"
                )
            elif ec["length"] is not None and a["maxlen"] != ec["length"]:
                entry["issues"].append(f"column {cname}: length mismatch expected {ec['length']} got {a['maxlen'] or 'unbounded'}")
            want_nullable = "YES" if ec["nullable"] else "NO"
            if a["is_nullable"] != want_nullable:
                entry["issues"].append(
                    f"column {cname}: nullability expected {'NULLABLE' if ec['nullable'] else 'NOT NULL'}"
                    f" got {'NULLABLE' if a['is_nullable'] == 'YES' else 'NOT NULL'}"
                )

        # primary key
        apk = next((c["cols"] for c in actual_pks.get(tname, [])), None)
        if apk != exp["pk"]:
            entry["issues"].append(f"primary key expected {exp['pk']} got {apk}")

        # foreign keys (matched by columns, name-agnostic)
        for cols, rtbl, rcols in exp["fks"]:
            ref = f"{rtbl}({','.join(rcols)})"
            found = any(
                f["cols"] == tuple(cols) and f["ref_table"].split(".")[-1] == rtbl and f["ref_cols"] == tuple(rcols)
                for f in actual_fks.get(tname, [])
            )
            if not found:
                entry["issues"].append(f"missing FK ({','.join(cols)}) -> {ref}")

        # unique constraints / unique indexes (column-set, name-agnostic)
        for cols in exp["uniques"]:
            found = any(u["cols"] == tuple(cols) for u in actual_uqs.get(tname, [])) or any(
                ix["unique"] and ix["cols"] == tuple(cols) for ix in actual_indexes.get(tname, [])
            )
            if not found:
                entry["issues"].append(f"missing UNIQUE constraint on ({','.join(cols)})")

        # indexes: pass if any index on the table covers the expected columns
        # as its leading columns (a wider existing index also satisfies it)
        def covers(actual_cols, expected_cols):
            return tuple(actual_cols[: len(expected_cols)]) == tuple(expected_cols)

        for ix in exp["indexes"]:
            covered = any(
                covers(a["cols"], ix["cols"]) and (not ix["unique"] or a["unique"])
                for a in actual_indexes.get(tname, [])
            )
            if not covered:
                entry["issues"].append(f"missing index ({','.join(ix['cols'])}) [{ix['name']}]")

        if entry["issues"]:
            entry["status"] = "MISMATCH"
            problems += 1
        report[tname] = entry

    extra_tables = sorted(set(actual_tables) - set(expected_tables) - {f"{t}_legacy" for t in expected_tables})

    # ---------------------------------------------------------------- output
    if args.json:
        import json

        print(json.dumps({"schema": schema, "problems": problems, "tables": report, "extra_tables": extra_tables}, indent=2))
    else:
        print(f"EduX PostgreSQL schema verification")
        print(f"  target   : {db_url.split('@')[-1]}")
        print(f"  schema   : {schema}")
        print(f"  expected : {len(expected_tables)} tables / "
              f"{sum(len(t['columns']) for t in expected_tables.values())} columns / "
              f"{sum(len(t['fks']) for t in expected_tables.values())} FKs")
        print()
        print(f"{'TABLE':<32}STATUS")
        for tname, entry in report.items():
            print(f"{tname:<32}{entry['status']}")
            for i in entry["issues"]:
                print(f"{'':<32}  - {i}")
            if args.verbose:
                for n in entry["notes"]:
                    print(f"{'':<32}  · {n}")
        if extra_tables:
            print()
            print(f"NOTE: {len(extra_tables)} non-model tables exist in schema '{schema}' (left untouched):")
            for t in extra_tables:
                print(f"  - {t}")
        print()
        if problems == 0:
            print("SCHEMA VERIFICATION: PASS")
        else:
            print(f"SCHEMA VERIFICATION: FAIL ({problems} table(s) with problems)")
            print("Fix hints: re-run backend/sql/migrations/0003_complete_postgresql_schema.sql,")
            print("then check server logs for WARNING lines the migration intentionally raised")
            print("about incompatible legacy objects (type drift is never auto-converted).")
    return 0 if problems == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
