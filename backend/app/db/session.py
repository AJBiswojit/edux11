import re
from collections.abc import Generator
from contextvars import ContextVar

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

_current_db: ContextVar[Session | None] = ContextVar("current_db", default=None)

from app.core.config import get_settings

settings = get_settings()


def _postgres_schema() -> str | None:
    schema = (settings.db_schema or "").strip()
    if not schema:
        return None
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
        raise ValueError(f"Invalid DB_SCHEMA: {schema!r}")
    return schema


_schema = _postgres_schema()
connect_args: dict = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    connect_args["timeout"] = 30
else:
    connect_args["connect_timeout"] = 10
    if _schema:
        connect_args["options"] = f"-csearch_path={_schema}"

engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


@event.listens_for(engine, "connect")
def _on_connect(dbapi_connection, _connection_record) -> None:
    if engine.dialect.name == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()
        return
    if not _schema:
        return
    cursor = dbapi_connection.cursor()
    cursor.execute(f'SET search_path TO "{_schema}"')
    cursor.close()


def _sqlite_table_columns(conn, table_name: str) -> set[str]:
    rows = conn.execute(text(f'PRAGMA table_info("{table_name}")')).mappings().all()
    return {row["name"] for row in rows}


def _sqlite_literal_default(col) -> str | None:
    default = col.default
    if default is None or not getattr(default, "is_scalar", False):
        return None
    arg = default.arg
    if arg is None or callable(arg):
        return None
    if isinstance(arg, bool):
        return "1" if arg else "0"
    if isinstance(arg, (int, float)):
        return str(arg)
    if isinstance(arg, str):
        return "'" + arg.replace("'", "''") + "'"
    return None


def _sqlite_column_ddl(col) -> str:
    type_sql = str(col.type.compile(dialect=engine.dialect))
    literal = _sqlite_literal_default(col)
    if literal is not None:
        return f"{type_sql} DEFAULT {literal}"
    return type_sql


def _ensure_sqlite_schema() -> None:
    """Add any ORM columns missing from an existing SQLite file. create_all never ALTERs."""
    import app.models  # noqa: F401 — register tables on Base.metadata
    from app.db.base import Base

    with engine.begin() as conn:
        existing = {
            row[0]
            for row in conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            )
        }
        for table in Base.metadata.tables.values():
            name = table.name
            if name not in existing:
                continue
            present = _sqlite_table_columns(conn, name)
            for col in table.columns:
                if col.name in present:
                    continue
                conn.execute(text(f'ALTER TABLE "{name}" ADD COLUMN "{col.name}" {_sqlite_column_ddl(col)}'))


def ensure_schema() -> None:
    """Create the configured schema and add missing identity columns. Never touches other schemas."""
    if engine.dialect.name == "sqlite":
        _ensure_sqlite_schema()
        return
    if engine.dialect.name != "postgresql" or not _schema:
        return
    with engine.begin() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{_schema}"'))
        # Single-device login support: idempotent column add. Runs before the
        # fast-path guard below so existing (already-aligned) databases still
        # gain the column.
        if _table_exists(conn, "users"):
            conn.execute(
                text(f'ALTER TABLE "{_schema}"."users" ADD COLUMN IF NOT EXISTS "active_session_id" VARCHAR(36)')
            )
            conn.execute(
                text(f'ALTER TABLE "{_schema}"."users" ADD COLUMN IF NOT EXISTS "session_expires_at" TIMESTAMPTZ')
            )
        # Proctoring columns on exam_attempts — additive, must run before the
        # fast-path guard so already-aligned databases still gain them.
        _align_proctoring_columns(conn)
        # Postgres submission queue table — new table, must run before the
        # fast-path guard so already-aligned databases still gain it.
        _align_submission_jobs(conn)
        # Fast-path: if users.role already exists, alignment was completed
        # on a prior boot — skip the expensive DDL inspection queries.
        already_aligned = bool(
            conn.execute(
                text(
                    """
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = :schema
                      AND table_name = 'users'
                      AND column_name = 'role'
                    """
                ),
                {"schema": _schema},
            ).scalar()
        )
        if already_aligned:
            return
        _align_users_table(conn)
        _align_ops_tables(conn)
        _align_colliding_assessment_tables(conn)
        _align_exam_attempts(conn)
        _align_ai_paper_shares(conn)


def _table_exists(conn, table_name: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = :schema AND table_name = :table
                """
            ),
            {"schema": _schema, "table": table_name},
        ).scalar()
    )


def _align_users_table(conn) -> None:
    """Additive only: restored edux.users is older and lacks institution_id and related columns."""
    if not _table_exists(conn, "users"):
        return

    columns = conn.execute(
        text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = 'users'
            """
        ),
        {"schema": _schema},
    ).scalars().all()
    present = set(columns)

    additions = [
        ("institution_id", "VARCHAR(36)"),
        ("phone", "VARCHAR(32)"),
        ("first_name", "VARCHAR(80)"),
        ("avatar_url", "VARCHAR(512)"),
        ("status", "VARCHAR(20) DEFAULT 'active'"),
        ("email_verified_at", "TIMESTAMPTZ"),
        ("last_login_at", "TIMESTAMPTZ"),
        ("updated_at", "TIMESTAMPTZ DEFAULT now()"),
        ("role", "VARCHAR(32) DEFAULT 'student'"),
    ]
    for name, ddl in additions:
        if name in present:
            continue
        conn.execute(text(f'ALTER TABLE "{_schema}"."users" ADD COLUMN IF NOT EXISTS "{name}" {ddl}'))

    if "created_at" in present:
        conn.execute(text(f'ALTER TABLE "{_schema}"."users" ALTER COLUMN created_at SET DEFAULT now()'))
    if "updated_at" in present:
        conn.execute(text(f'ALTER TABLE "{_schema}"."users" ALTER COLUMN updated_at SET DEFAULT now()'))

    for source_table in ("user_roles", "student_profiles", "faculty_profiles"):
        if not _table_exists(conn, source_table):
            continue
        conn.execute(
            text(
                f"""
                UPDATE "{_schema}"."users" AS u
                SET institution_id = src.institution_id
                FROM "{_schema}"."{source_table}" AS src
                WHERE u.institution_id IS NULL AND src.user_id = u.id
                """
            )
        )


def _align_ops_tables(conn) -> None:
    """Keep document/CMS tables compatible with large JSON payloads."""
    if _table_exists(conn, "app_kv"):
        conn.execute(text(f'ALTER TABLE "{_schema}"."app_kv" ALTER COLUMN payload TYPE TEXT'))
    if _table_exists(conn, "attendance_sessions"):
        conn.execute(text(f'ALTER TABLE "{_schema}"."attendance_sessions" ADD COLUMN IF NOT EXISTS topic VARCHAR(255)'))


def _table_columns(conn, table_name: str) -> set[str]:
    return set(
        conn.execute(
            text(
                """
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = :schema AND table_name = :table
                """
            ),
            {"schema": _schema, "table": table_name},
        ).scalars().all()
    )


def _row_count(conn, table_name: str) -> int:
    return int(conn.execute(text(f'SELECT count(*) FROM "{_schema}"."{table_name}"')).scalar() or 0)


def _ident(name: str) -> str:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        raise ValueError(f"Invalid identifier: {name!r}")
    return name


def _index_exists(conn, index_name: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT 1 FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = :schema AND c.relname = :name AND c.relkind = 'i'
                """
            ),
            {"schema": _schema, "name": index_name},
        ).scalar()
    )


def _constraint_exists(conn, table_name: str, constraint_name: str) -> bool:
    return bool(
        conn.execute(
            text(
                """
                SELECT 1 FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = :schema AND t.relname = :table AND c.conname = :name
                """
            ),
            {"schema": _schema, "table": table_name, "name": constraint_name},
        ).scalar()
    )


def _drop_if_empty(conn, table_name: str) -> bool:
    if not _table_exists(conn, table_name):
        return False
    if _row_count(conn, table_name):
        return False
    conn.execute(text(f'DROP TABLE "{_schema}"."{_ident(table_name)}"'))
    return True


def _rename_constraints_and_indexes(conn, table_name: str, old_table: str) -> None:
    """Avoid schema-wide name clashes when create_all builds the EduX tables."""
    table_name = _ident(table_name)
    old_table = _ident(old_table)
    prefix = f"{old_table}_legacy"

    constraints = conn.execute(
        text(
            """
            SELECT c.conname FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = :schema AND t.relname = :table
            """
        ),
        {"schema": _schema, "table": table_name},
    ).scalars().all()
    for conname in constraints:
        if conname.startswith(f"{old_table}_legacy"):
            continue
        if conname.startswith(old_table):
            new_name = prefix + conname[len(old_table) :]
        else:
            new_name = f"{prefix}_{conname}"
        if new_name == conname or _constraint_exists(conn, table_name, new_name):
            continue
        conn.execute(
            text(
                f'ALTER TABLE "{_schema}"."{table_name}" RENAME CONSTRAINT "{_ident(conname)}" TO "{_ident(new_name)}"'
            )
        )

    indexes = conn.execute(
        text(
            """
            SELECT indexname FROM pg_indexes
            WHERE schemaname = :schema AND tablename = :table
            """
        ),
        {"schema": _schema, "table": table_name},
    ).scalars().all()
    for idx in indexes:
        if not _index_exists(conn, idx):
            continue
        if idx.startswith(f"{old_table}_legacy") or idx.startswith("ix_") and f"{old_table}_legacy" in idx:
            continue
        if idx.startswith(old_table):
            new_name = prefix + idx[len(old_table) :]
        elif old_table in idx:
            new_name = idx.replace(old_table, f"{old_table}_legacy", 1)
        else:
            new_name = f"{prefix}_{idx}"
        if new_name == idx or _index_exists(conn, new_name):
            continue
        conn.execute(text(f'ALTER INDEX "{_schema}"."{_ident(idx)}" RENAME TO "{_ident(new_name)}"'))


def _align_colliding_assessment_tables(conn) -> None:
    """Move restored paper-import tables aside so EduX questions/papers/attempts can be created."""
    colliding = (
        ("questions", "stem"),
        ("papers", "institution_id"),
        ("exam_attempts", "institution_id"),
    )
    to_rename = []
    for table_name, sentinel in colliding:
        if not _table_exists(conn, table_name):
            continue
        if sentinel in _table_columns(conn, table_name):
            continue
        dest = f"{table_name}_legacy"
        if _table_exists(conn, dest):
            continue
        to_rename.append((table_name, dest))

    if not to_rename:
        return

    for child in ("paper_questions", "exam_sittings", "exam_question_attempts"):
        _drop_if_empty(conn, child)

    for table_name, dest in to_rename:
        conn.execute(text(f'ALTER TABLE "{_schema}"."{_ident(table_name)}" RENAME TO "{_ident(dest)}"'))
        _rename_constraints_and_indexes(conn, dest, table_name)


def _align_exam_attempts(conn) -> None:
    """In-progress sittings need nullable submitted_at. Additive only — never drops data."""
    if not _table_exists(conn, "exam_attempts"):
        return
    conn.execute(text(f'ALTER TABLE "{_schema}"."exam_attempts" ALTER COLUMN submitted_at DROP NOT NULL'))
    _align_proctoring_columns(conn)


def _align_proctoring_columns(conn) -> None:
    """Proctoring: track tab-switch violations and auto-termination. Additive only."""
    if not _table_exists(conn, "exam_attempts"):
        return
    conn.execute(text(f'ALTER TABLE "{_schema}"."exam_attempts" ADD COLUMN IF NOT EXISTS "proctor_violations" INTEGER DEFAULT 0'))
    conn.execute(text(f'ALTER TABLE "{_schema}"."exam_attempts" ADD COLUMN IF NOT EXISTS "terminated" BOOLEAN DEFAULT FALSE'))
    conn.execute(text(f'ALTER TABLE "{_schema}"."exam_attempts" ADD COLUMN IF NOT EXISTS "termination_reason" VARCHAR(255)'))


def _align_ai_paper_shares(conn) -> None:
    """Create ai_paper_shares table if it doesn't exist yet (additive migration)."""
    if _table_exists(conn, "ai_paper_shares"):
        return
    conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS "{_schema}"."ai_paper_shares" (
                id          VARCHAR(36) NOT NULL PRIMARY KEY,
                paper_id    VARCHAR(36) NOT NULL,
                institution_id VARCHAR(36),
                shared_by   VARCHAR(36),
                audience    TEXT NOT NULL DEFAULT '{{}}',
                created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    conn.execute(
        text(
            f'CREATE INDEX IF NOT EXISTS ix_ai_paper_shares_paper_id ON "{_schema}"."ai_paper_shares" (paper_id)'
        )
    )
    conn.execute(
        text(
            f'CREATE INDEX IF NOT EXISTS ix_ai_paper_shares_institution_id ON "{_schema}"."ai_paper_shares" (institution_id)'
        )
    )


def _align_submission_jobs(conn) -> None:
    """Create the Postgres-backed exam submission queue table (additive)."""
    if _table_exists(conn, "submission_jobs"):
        return
    conn.execute(
        text(
            f"""
            CREATE TABLE IF NOT EXISTS "{_schema}"."submission_jobs" (
                id                VARCHAR(36) NOT NULL PRIMARY KEY,
                student_id        VARCHAR(36) NOT NULL,
                institution_id    VARCHAR(36),
                exam_id           VARCHAR(36) NOT NULL,
                attempt_id        VARCHAR(36),
                body              TEXT NOT NULL,
                status            VARCHAR(16) NOT NULL DEFAULT 'queued',
                attempt_count     INTEGER NOT NULL DEFAULT 0,
                result_attempt_id VARCHAR(36),
                error             VARCHAR(512),
                retry_after       TIMESTAMPTZ,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    conn.execute(text(f'CREATE INDEX IF NOT EXISTS ix_submission_jobs_status ON "{_schema}"."submission_jobs" (status)'))
    conn.execute(text(f'CREATE INDEX IF NOT EXISTS ix_submission_jobs_student_id ON "{_schema}"."submission_jobs" (student_id)'))
    conn.execute(text(f'CREATE INDEX IF NOT EXISTS ix_submission_jobs_attempt_id ON "{_schema}"."submission_jobs" (attempt_id)'))


def current_db() -> Session | None:
    return _current_db.get()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    token = _current_db.set(db)
    try:
        yield db
    finally:
        try:
            _current_db.reset(token)
        except ValueError:
            _current_db.set(None)
        db.close()
