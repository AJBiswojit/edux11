"""Create the three LOCAL DEVELOPMENT accounts (student / faculty / admin).

These are REAL records in the existing database (PostgreSQL per ``backend/.env``,
or SQLite when ``DATABASE_URL`` points at SQLite). They authenticate through the
EXISTING backend login flow (``POST /v1/auth/login`` → ``app.services.seed.authenticate``
→ PBKDF2 password verification → existing JWT issuing). No mock auth, no fake
tokens, no bypassed RBAC.

Usage (from ``backend/``):

    python -m scripts.create_dev_accounts [--skip-verify]

Behaviour:
  * Idempotent — safe to run any number of times. Existing dev accounts are
    reported as ALREADY EXISTS and never modified.
  * Non-destructive — only INSERTs of missing records. Never drops, truncates,
    updates or deletes anything.
  * Transactional — every account (user + role link + profile) is created inside
    a SAVEPOINT; if anything fails the whole run rolls back and nothing is left
    half-created.
  * Conflict-safe — if the student dev address etc. already exists but is
    incompatible with the expected development setup (wrong institution, wrong
    role, missing profile, different password), the conflict is REPORTED and the
    record is left untouched.

Minimum records created (mirrors the audited models — nothing more):
  * one Institution  (``edux-local-dev``)            — required FK of UserRole/profiles
  * three Role rows  (student / faculty / admin)     — required by UserRole
  * three User rows  + UserRole links
  * one StudentProfile (institution_id + roll_no are the required fields)
  * one FacultyProfile (institution_id is the only required field)

``Department`` / ``Batch`` / ``Program`` / ``Course`` are all NULLABLE on the
StudentProfile model, so per the "minimum valid records" rule they are NOT
created. Admin has no profile model in this backend — an admin is a User with
an ``admin`` Role link, exactly like the existing seed creates it.
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

# ---------------------------------------------------------------------------
# Existing backend architecture only — same config, models and helpers the API
# itself uses. Nothing here invents a parallel mechanism.
# ---------------------------------------------------------------------------
from app.core.security import decode_token, hash_password, verify_password
from app.db.base import Base
from app.db.session import SessionLocal, engine, ensure_schema
from app.models import (  # noqa: F401 — registers every model on Base.metadata
    Institution,
    Role,
    StudentProfile,
    User,
    UserRole,
    FacultyProfile,
)
from app.services.seed import authenticate, issue_tokens

# ---------------------------------------------------------------------------
# Local development identity constants. These are LOCAL DEV credentials only.
# They must never be used in production (see docs/LOCAL-DEVELOPMENT-ACCOUNTS.md).
#
# NOTE on the domain: the existing login endpoint validates emails with pydantic
# ``EmailStr`` (email-validator), which REJECTS special-use domains such as
# ``.local`` / ``.localhost`` / ``.test`` with HTTP 422 before any database
# lookup. ``student@edux.local`` therefore could never pass through the real
# POST /v1/auth/login, so the dev accounts use ``edux.dev`` — accepted by the
# unmodified login schema. Do not "fix" this by loosening auth validation.
# ---------------------------------------------------------------------------
DEV_INSTITUTION_SLUG = "edux-local-dev"
DEV_INSTITUTION_NAME = "EduX Local Development"

# The login validators (app/schemas/auth.py) require min 8 chars with at least
# one uppercase letter, one lowercase letter and one digit — all three passwords
# below satisfy that existing policy.
STUDENT_EMAIL = "student@edux.dev"
STUDENT_PASSWORD = "EduxStudent@123"
FACULTY_EMAIL = "faculty@edux.dev"
FACULTY_PASSWORD = "EduxFaculty@123"
ADMIN_EMAIL = "admin@edux.dev"
ADMIN_PASSWORD = "EduxAdmin@123"

STUDENT_ROLL_NO = "DEV-STU-001"


@dataclass
class DevAccount:
    key: str
    role_code: str
    email: str
    password: str
    user_id: str
    full_name: str
    first_name: str

    def label(self) -> str:
        return self.key.capitalize()


DEV_ACCOUNTS: list[DevAccount] = [
    DevAccount(
        key="student",
        role_code="student",
        email=STUDENT_EMAIL,
        password=STUDENT_PASSWORD,
        user_id="u_dev_student",
        full_name="Dev Student",
        first_name="Dev",
    ),
    DevAccount(
        key="faculty",
        role_code="faculty",
        email=FACULTY_EMAIL,
        password=FACULTY_PASSWORD,
        user_id="u_dev_faculty",
        full_name="Dev Faculty",
        first_name="Dev",
    ),
    DevAccount(
        key="admin",
        role_code="admin",
        email=ADMIN_EMAIL,
        password=ADMIN_PASSWORD,
        user_id="u_dev_admin",
        full_name="Dev Admin",
        first_name="Dev",
    ),
]


@dataclass
class AccountResult:
    account: DevAccount
    status: str  # CREATED | ALREADY EXISTS | CONFLICT | FAILED
    details: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Supporting records (institution + roles) — reused when present.
# ---------------------------------------------------------------------------
def ensure_institution(db: Session) -> tuple[Institution, bool]:
    """Return the dev institution, creating it only if missing. (created?)"""
    inst = db.scalars(select(Institution).where(Institution.slug == DEV_INSTITUTION_SLUG)).first()
    if inst is not None:
        return inst, False
    inst = Institution(
        slug=DEV_INSTITUTION_SLUG,
        name=DEV_INSTITUTION_NAME,
        short_name="EduX-Dev",
        academic_year=None,
    )
    db.add(inst)
    db.flush()
    return inst, True


def ensure_roles(db: Session, inst: Institution) -> dict[str, tuple[Role, bool]]:
    """Return the three dev roles keyed by code, creating missing ones."""
    roles: dict[str, tuple[Role, bool]] = {}
    names = {"student": "Student", "faculty": "Faculty", "admin": "Administrator"}
    for code in ("student", "faculty", "admin"):
        role = db.scalars(
            select(Role).where(Role.institution_id == inst.id, Role.code == code)
        ).first()
        created = False
        if role is None:
            role = Role(institution_id=inst.id, code=code, name=names[code])
            db.add(role)
            db.flush()
            created = True
        roles[code] = (role, created)
    return roles


def _users_by_email(db: Session, email: str) -> list[User]:
    """Global email lookup — the same lookup the login flow performs.

    Returns all matches because ``users`` only enforces ``(institution_id,
    email)`` uniqueness: the same email may legitimately exist in more than one
    institution, which makes the login flow's ``.first()`` ambiguous.
    """
    return db.scalars(
        select(User)
        .options(joinedload(User.role_links).joinedload(UserRole.role))
        .where(User.email == email.lower())
    ).unique().all()


def _has_role(db: Session, user: User, role_id: str, institution_id: str) -> bool:
    return (
        db.scalars(
            select(UserRole).where(
                UserRole.user_id == user.id,
                UserRole.role_id == role_id,
                UserRole.institution_id == institution_id,
            )
        ).first()
        is not None
    )


# ---------------------------------------------------------------------------
# Per-account creation / inspection
# ---------------------------------------------------------------------------
def inspect_or_create(db: Session, account: DevAccount, inst: Institution, role: Role) -> AccountResult:
    matches = _users_by_email(db, account.email)

    # Same email in more than one institution makes the login flow's
    # first-match lookup ambiguous — report instead of guessing.
    if len(matches) > 1:
        return AccountResult(
            account=account,
            status="CONFLICT",
            details=[
                f"{account.email} already exists on multiple users "
                f"({', '.join(sorted(u.id for u in matches))}) — "
                "login by email alone is ambiguous; remove the duplicates manually"
            ],
        )

    existing = matches[0] if matches else None
    if existing is None:
        user = User(
            id=account.user_id,
            institution_id=inst.id,
            email=account.email,
            password_hash=hash_password(account.password),
            full_name=account.full_name,
            first_name=account.first_name,
            status="active",
            email_verified_at=datetime.now(timezone.utc),
            legacy_role=account.role_code,
        )
        db.add(user)
        db.flush()  # assign PK before linking
        db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst.id))
        if account.role_code == "student":
            db.add(
                StudentProfile(
                    user_id=user.id,
                    institution_id=inst.id,
                    roll_no=STUDENT_ROLL_NO,
                    admission_year=datetime.now(timezone.utc).year,
                )
            )
        elif account.role_code == "faculty":
            db.add(
                FacultyProfile(
                    user_id=user.id,
                    institution_id=inst.id,
                    designation="Local Development Faculty",
                )
            )
        db.flush()
        return AccountResult(account=account, status="CREATED")

    # ---- existing user: inspect compatibility, never modify ---------------
    problems: list[str] = []
    if existing.id != account.user_id:
        problems.append(f"existing user id is '{existing.id}' (expected '{account.user_id}') — informational")
    if existing.institution_id != inst.id:
        problems.append(
            f"belongs to a different institution (institution_id={existing.institution_id!r}, "
            f"expected the '{DEV_INSTITUTION_SLUG}' institution)"
        )
    if not _has_role(db, existing, role.id, inst.id):
        problems.append(f"has no '{account.role_code}' role link in the dev institution")
    if existing.status != "active":
        problems.append(f"status is '{existing.status}' (login requires 'active')")
    if account.role_code == "student" and db.get(StudentProfile, existing.id) is None:
        problems.append("has no StudentProfile row")
    if account.role_code == "faculty" and db.get(FacultyProfile, existing.id) is None:
        problems.append("has no FacultyProfile row")
    if not existing.password_hash or not verify_password(account.password, existing.password_hash):
        problems.append("password does not match the documented development password (left unchanged)")

    if problems:
        return AccountResult(
            account=account,
            status="CONFLICT",
            details=[f"{account.email} already exists but is incompatible:", *problems],
        )
    return AccountResult(account=account, status="ALREADY EXISTS")


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def create_dev_accounts(db: Session) -> dict:
    """Create (or report) all dev accounts in one all-or-nothing transaction."""
    inst, inst_created = ensure_institution(db)
    roles = ensure_roles(db, inst)

    results: list[AccountResult] = []
    for account in DEV_ACCOUNTS:
        savepoint = db.begin_nested()  # per-account SAVEPOINT
        try:
            result = inspect_or_create(db, account, inst, roles[account.role_code][0])
            db.flush()
        except Exception as exc:  # noqa: BLE001 — surface, never half-persist
            savepoint.rollback()
            results.append(AccountResult(account=account, status="FAILED", details=[repr(exc)]))
            continue
        savepoint.commit()
        results.append(result)

    failed = [r for r in results if r.status == "FAILED"]
    if failed:
        db.rollback()  # nothing persisted — no partially created users
        committed = False
    else:
        db.commit()
        committed = True

    return {
        "institution": inst,
        "institution_created": inst_created,
        "roles_created": [code for code, (_, created) in roles.items() if created],
        "results": results,
        "committed": committed,
    }


def verify_accounts(db: Session) -> list[dict]:
    """Authenticate each dev account through the REAL login implementation and
    check the JWT role claim issued by the existing security module."""
    checks: list[dict] = []
    for account in DEV_ACCOUNTS:
        user = authenticate(db, account.email, account.password, account.role_code)
        entry = {
            "account": account,
            "ok": user is not None,
            "user_id": user.id if user else None,
            "jwt_roles": None,
        }
        if user is not None:
            token = issue_tokens(user)["accessToken"]
            payload = decode_token(token)
            entry["jwt_roles"] = payload.get("roles")
            entry["ok"] = account.role_code in (payload.get("roles") or [])
        checks.append(entry)
    return checks


# ---------------------------------------------------------------------------
# Console output
# ---------------------------------------------------------------------------
def _print_report(summary: dict, checks: list[dict] | None) -> None:
    inst: Institution = summary["institution"]
    line = "=" * 56
    print(line)
    print("EDUX LOCAL DEVELOPMENT ACCOUNTS")
    print(line)
    print(
        f"Institution: {inst.name} ({inst.slug})"
        f" — {'CREATED' if summary['institution_created'] else 'REUSED'}"
    )
    if summary["roles_created"]:
        print(f"Roles created: {', '.join(summary['roles_created'])}")
    print()

    for result in summary["results"]:
        print(result.account.label())
        print(f"  Email: {result.account.email}")
        print(f"  Status: {result.status}")
        for detail in result.details:
            print(f"    - {detail}")
        print()

    if checks is not None:
        print("Login verification (existing authenticate() + JWT implementation):")
        for check in checks:
            mark = "OK" if check["ok"] else "FAILED"
            print(
                f"  [{mark}] {check['account'].email}"
                + (f" -> JWT roles {check['jwt_roles']}" if check["jwt_roles"] is not None else "")
            )
        print()

    if not summary["committed"]:
        print("NOTHING WAS SAVED — the run failed and was rolled back.")
        return
    if all(r.status == "ALREADY EXISTS" for r in summary["results"]):
        print("All development accounts already exist — nothing was changed.")
    else:
        print("Development accounts are ready.")
    print("(Passwords are documented in docs/LOCAL-DEVELOPMENT-ACCOUNTS.md — not printed here.)")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.create_dev_accounts",
        description="Create the three local development accounts (idempotent, non-destructive).",
    )
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip the post-creation login verification step.",
    )
    args = parser.parse_args(argv)

    # Windows consoles occasionally default to a legacy code page; keep the
    # report rendering safe without changing any behaviour.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    # Same additive schema bootstrap the API performs on startup
    # (app/main.py::_boot_schema) — creates nothing destructive.
    ensure_schema()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        summary = create_dev_accounts(db)
        checks = None
        if summary["committed"] and not args.skip_verify:
            checks = verify_accounts(db)
        _print_report(summary, checks)
        ok = summary["committed"] and (checks is None or all(c["ok"] for c in checks))
        conflicts = any(r.status == "CONFLICT" for r in summary["results"])
        return 0 if ok and not conflicts else 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
