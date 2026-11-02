"""Tests for the local development account utility (scripts/create_dev_accounts.py).

Covers:
  1.  Fresh account creation (student / faculty / admin).
  2.  Idempotency — running twice creates no duplicates.
  3.  Existing users are never overwritten (conflicts reported instead).
  4-6. Each account authenticates through the REAL POST /v1/auth/login flow.
  7.  The issued JWT carries the correct role claim.
  8-10. Correct Student / Faculty / Admin role + profile relationships.
  11. All required foreign-key relationships resolve.
  12. The utility performs no destructive operations.

The suite runs against the throwaway sqlite database from ``test/conftest.py``
(never against live PostgreSQL).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import delete, func, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import decode_token, hash_password  # noqa: E402
from app.models.identity import Institution, Role, User, UserRole  # noqa: E402
from app.models.people import FacultyProfile, StudentProfile  # noqa: E402

import scripts.create_dev_accounts as dev  # noqa: E402

EXPECTED = {
    "student": (dev.STUDENT_EMAIL, dev.STUDENT_PASSWORD),
    "faculty": (dev.FACULTY_EMAIL, dev.FACULTY_PASSWORD),
    "admin": (dev.ADMIN_EMAIL, dev.ADMIN_PASSWORD),
}
DEV_EMAILS = [email for email, _ in EXPECTED.values()]


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------
def _statuses(summary: dict) -> dict[str, str]:
    return {r.account.key: r.status for r in summary["results"]}


def _table_counts(db) -> dict[str, int]:
    return {
        "users": db.scalar(select(func.count()).select_from(User)) or 0,
        "user_roles": db.scalar(select(func.count()).select_from(UserRole)) or 0,
        "student_profiles": db.scalar(select(func.count()).select_from(StudentProfile)) or 0,
        "faculty_profiles": db.scalar(select(func.count()).select_from(FacultyProfile)) or 0,
        "roles": db.scalar(select(func.count()).select_from(Role)) or 0,
        "institutions": db.scalar(select(func.count()).select_from(Institution)) or 0,
    }


@pytest.fixture
def clean_dev_accounts(db, app):
    """Give each test a fresh slate by removing the dev accounts and the dev
    institution from the throwaway test database (tests own this sqlite file;
    the UTILITY itself never deletes anything).

    Depends on the session-scoped ``app`` fixture so the schema exists and the
    boot seed has run before any test touches the tables.
    """
    inst = db.scalars(select(Institution).where(Institution.slug == dev.DEV_INSTITUTION_SLUG)).first()
    inst_id = inst.id if inst else None
    user_ids = [
        uid
        for (uid,) in db.execute(select(User.id).where(User.email.in_(DEV_EMAILS))).all()
    ]
    if user_ids:
        db.execute(delete(StudentProfile).where(StudentProfile.user_id.in_(user_ids)))
        db.execute(delete(FacultyProfile).where(FacultyProfile.user_id.in_(user_ids)))
        db.execute(delete(UserRole).where(UserRole.user_id.in_(user_ids)))
        db.execute(delete(User).where(User.id.in_(user_ids)))
    if inst_id:
        db.execute(delete(UserRole).where(UserRole.institution_id == inst_id))
        db.execute(delete(Role).where(Role.institution_id == inst_id))
        db.execute(delete(Institution).where(Institution.id == inst_id))
    db.commit()
    yield


def _dev_user(db, key: str) -> User:
    email, _ = EXPECTED[key]
    return db.scalars(select(User).where(User.email == email)).one()


def _login(client, key: str, role_hint: str | None = None) -> dict:
    email, password = EXPECTED[key]
    payload = {"email": email, "password": password}
    if role_hint:
        payload["role"] = role_hint
    return client.post("/v1/auth/login", json=payload)


# ---------------------------------------------------------------------------
# 1. Fresh creation
# ---------------------------------------------------------------------------
def test_fresh_creation_creates_three_accounts(db, clean_dev_accounts):
    summary = dev.create_dev_accounts(db)

    assert summary["committed"] is True
    assert summary["institution_created"] is True
    assert _statuses(summary) == {"student": "CREATED", "faculty": "CREATED", "admin": "CREATED"}

    student = _dev_user(db, "student")
    assert student.status == "active"
    assert student.institution_id == summary["institution"].id
    faculty = _dev_user(db, "faculty")
    admin = _dev_user(db, "admin")
    assert faculty.institution_id == summary["institution"].id
    assert admin.institution_id == summary["institution"].id


# ---------------------------------------------------------------------------
# 2. Idempotency
# ---------------------------------------------------------------------------
def test_rerun_is_idempotent_and_never_duplicates(db, clean_dev_accounts):
    first = dev.create_dev_accounts(db)
    assert _statuses(first) == {"student": "CREATED", "faculty": "CREATED", "admin": "CREATED"}

    counts_before = _table_counts(db)
    hashes_before = {key: _dev_user(db, key).password_hash for key in EXPECTED}

    second = dev.create_dev_accounts(db)

    assert _statuses(second) == {
        "student": "ALREADY EXISTS",
        "faculty": "ALREADY EXISTS",
        "admin": "ALREADY EXISTS",
    }
    assert _table_counts(db) == counts_before, "rerun must not create any new rows"
    hashes_after = {key: _dev_user(db, key).password_hash for key in EXPECTED}
    assert hashes_after == hashes_before, "rerun must not rehash/overwrite passwords"


# ---------------------------------------------------------------------------
# 3. Existing users are never overwritten
# ---------------------------------------------------------------------------
def test_existing_user_is_reported_as_conflict_and_left_untouched(db, clean_dev_accounts):
    inst, _ = dev.ensure_institution(db)
    db.commit()

    intruder = User(
        id="u_pre_existing",
        institution_id=inst.id,
        email=dev.STUDENT_EMAIL,
        password_hash=hash_password("DifferentPass@123"),
        full_name="Original Name",
        status="active",
        legacy_role="student",
    )
    db.add(intruder)
    db.commit()
    hash_before = intruder.password_hash

    summary = dev.create_dev_accounts(db)

    statuses = _statuses(summary)
    assert statuses["student"] == "CONFLICT"
    assert statuses["faculty"] == "CREATED", "unrelated accounts still get created"
    assert statuses["admin"] == "CREATED"
    assert summary["committed"] is True

    db.expire_all()
    user = _dev_user(db, "student")
    assert user.id == "u_pre_existing"
    assert user.password_hash == hash_before, "password must not be changed"
    assert user.full_name == "Original Name", "profile fields must not be changed"
    assert db.get(StudentProfile, user.id) is None, "no profile silently added"

    conflict = next(r for r in summary["results"] if r.account.key == "student")
    assert any("password" in d for d in conflict.details)


def test_foreign_institution_existing_email_is_conflict(db, clean_dev_accounts):
    other = Institution(slug="other-inst", name="Other Institution")
    db.add(other)
    db.flush()
    db.add(
        User(
            id="u_other_inst",
            institution_id=other.id,
            email=dev.ADMIN_EMAIL,
            password_hash=hash_password("WhateverPass@123"),
            full_name="Other Inst Admin",
            status="active",
        )
    )
    db.commit()

    summary = dev.create_dev_accounts(db)

    statuses = _statuses(summary)
    assert statuses["admin"] == "CONFLICT"
    conflict = next(r for r in summary["results"] if r.account.key == "admin")
    assert any("different institution" in d for d in conflict.details)

    db.expire_all()
    user = _dev_user(db, "admin")
    assert user.id == "u_other_inst"
    assert user.institution_id == other.id


def test_duplicate_email_across_institutions_is_conflict(db, clean_dev_accounts):
    """(institution_id, email) uniqueness permits the same email in a second
    institution — that makes the login lookup ambiguous, so the utility must
    report a conflict instead of silently picking one."""
    dev.create_dev_accounts(db)  # creates admin@edux.dev in the dev institution

    other = Institution(slug="dup-inst", name="Dup Institution")
    db.add(other)
    db.flush()
    db.add(
        User(
            id="u_dup_email",
            institution_id=other.id,
            email=dev.ADMIN_EMAIL,
            password_hash=hash_password("SecondUser@123"),
            full_name="Second Admin",
            status="active",
        )
    )
    db.commit()

    summary = dev.create_dev_accounts(db)

    statuses = _statuses(summary)
    assert statuses["admin"] == "CONFLICT"
    conflict = next(r for r in summary["results"] if r.account.key == "admin")
    assert any("multiple users" in d for d in conflict.details)
    assert summary["committed"] is True

    db.expire_all()
    assert db.get(User, "u_dup_email") is not None, "duplicate must be left untouched"
    assert db.get(User, "u_dev_admin").full_name == "Dev Admin", "original must be left untouched"


# ---------------------------------------------------------------------------
# 4-6. Real login flow (POST /v1/auth/login)
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("key,role", [("student", "student"), ("faculty", "faculty"), ("admin", "admin")])
def test_login_through_real_endpoint(client, db, clean_dev_accounts, key, role):
    dev.create_dev_accounts(db)

    resp = _login(client, key)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["accessToken"]
    assert data["refreshToken"]
    assert data["user"]["role"] == role
    assert data["user"]["email"] == EXPECTED[key][0]


def test_login_rejects_bad_password_and_role_mismatch(client, db, clean_dev_accounts):
    dev.create_dev_accounts(db)

    wrong_password = client.post(
        "/v1/auth/login", json={"email": dev.STUDENT_EMAIL, "password": "NotThePassword@1"}
    )
    assert wrong_password.status_code == 401

    role_hint_match = _login(client, "student", role_hint="student")
    assert role_hint_match.status_code == 200

    role_hint_mismatch = client.post(
        "/v1/auth/login",
        json={"email": dev.STUDENT_EMAIL, "password": dev.STUDENT_PASSWORD, "role": "admin"},
    )
    assert role_hint_mismatch.status_code == 401, "existing role check must still apply"


# ---------------------------------------------------------------------------
# 7. JWT claims
# ---------------------------------------------------------------------------
@pytest.mark.parametrize("key", ["student", "faculty", "admin"])
def test_jwt_carries_correct_role_claim(client, db, clean_dev_accounts, key):
    summary = dev.create_dev_accounts(db)
    inst_id = summary["institution"].id

    token = _login(client, key).json()["accessToken"]
    payload = decode_token(token)

    assert payload["typ"] == "access"
    assert payload["sub"] == _dev_user(db, key).id
    assert payload["institution_id"] == inst_id
    assert key in payload["roles"]


# ---------------------------------------------------------------------------
# 8-10. Relationships (Student / Faculty / Admin)
# ---------------------------------------------------------------------------
def test_student_profile_relationship(db, clean_dev_accounts):
    dev.create_dev_accounts(db)
    student = _dev_user(db, "student")

    profile = db.get(StudentProfile, student.id)
    assert profile is not None
    assert profile.institution_id == student.institution_id
    assert profile.roll_no == dev.STUDENT_ROLL_NO

    link = db.scalars(
        select(UserRole).where(UserRole.user_id == student.id)
    ).one()
    role = db.get(Role, link.role_id)
    assert role.code == "student"
    assert link.institution_id == student.institution_id


def test_faculty_profile_relationship(db, clean_dev_accounts):
    dev.create_dev_accounts(db)
    faculty = _dev_user(db, "faculty")

    profile = db.get(FacultyProfile, faculty.id)
    assert profile is not None
    assert profile.institution_id == faculty.institution_id

    link = db.scalars(select(UserRole).where(UserRole.user_id == faculty.id)).one()
    assert db.get(Role, link.role_id).code == "faculty"


def test_admin_rbac_relationship(db, clean_dev_accounts):
    dev.create_dev_accounts(db)
    admin = _dev_user(db, "admin")

    assert db.get(FacultyProfile, admin.id) is None, "admin has no faculty profile in this backend"
    assert db.get(StudentProfile, admin.id) is None

    links = db.scalars(select(UserRole).where(UserRole.user_id == admin.id)).all()
    codes = {db.get(Role, link.role_id).code for link in links}
    assert "admin" in codes
    assert admin.primary_role == "admin"


# ---------------------------------------------------------------------------
# 11. Foreign-key integrity
# ---------------------------------------------------------------------------
def test_required_foreign_keys_resolve(db, clean_dev_accounts):
    summary = dev.create_dev_accounts(db)
    inst = summary["institution"]

    assert db.get(Institution, inst.id) is not None

    for key in EXPECTED:
        user = _dev_user(db, key)
        assert db.get(Institution, user.institution_id).slug == dev.DEV_INSTITUTION_SLUG
        for link in user.role_links:
            assert db.get(Role, link.role_id) is not None
            assert link.institution_id == inst.id

    student_profile = db.get(StudentProfile, _dev_user(db, "student").id)
    assert db.get(Institution, student_profile.institution_id).id == inst.id
    faculty_profile = db.get(FacultyProfile, _dev_user(db, "faculty").id)
    assert db.get(Institution, faculty_profile.institution_id).id == inst.id

    # roll_no stays unique within the institution even across reruns
    summary2 = dev.create_dev_accounts(db)
    assert all(r.status == "ALREADY EXISTS" for r in summary2["results"])
    rolls = db.scalars(
        select(StudentProfile.roll_no).where(StudentProfile.institution_id == inst.id)
    ).all()
    assert rolls.count(dev.STUDENT_ROLL_NO) == 1


# ---------------------------------------------------------------------------
# 12. No destructive operations
# ---------------------------------------------------------------------------
def test_utility_never_removes_existing_rows(db, clean_dev_accounts):
    # Sentinel user in a foreign institution must survive every utility run.
    sentinel_inst = Institution(slug="sentinel-inst", name="Sentinel")
    db.add(sentinel_inst)
    db.flush()
    sentinel = User(
        id="u_sentinel",
        institution_id=sentinel_inst.id,
        email="sentinel@example.test",
        password_hash=hash_password("SentinelPass@123"),
        full_name="Sentinel User",
        status="active",
    )
    db.add(sentinel)
    db.commit()

    dev.create_dev_accounts(db)
    counts_after_first = _table_counts(db)

    second = dev.create_dev_accounts(db)
    third = dev.create_dev_accounts(db)

    assert _table_counts(db) == counts_after_first, "row counts must never decrease"
    assert all(r.status == "ALREADY EXISTS" for r in second["results"] + third["results"])

    db.expire_all()
    assert db.get(User, "u_sentinel") is not None, "foreign data must be untouched"
    assert db.get(Institution, sentinel_inst.id) is not None


# ---------------------------------------------------------------------------
# Verification helper + CLI entry point
# ---------------------------------------------------------------------------
def test_verify_accounts_uses_real_authenticate(db, clean_dev_accounts):
    dev.create_dev_accounts(db)
    checks = dev.verify_accounts(db)

    assert all(check["ok"] for check in checks)
    by_key = {check["account"].key: check for check in checks}
    for key in EXPECTED:
        assert key in by_key[key]["jwt_roles"]


def test_cli_main_runs_and_reports(client, db, clean_dev_accounts, capsys):
    exit_code = dev.main(["--skip-verify"])
    captured = capsys.readouterr()

    assert exit_code == 0
    assert "EDUX LOCAL DEVELOPMENT ACCOUNTS" in captured.out
    assert captured.out.count("Status: CREATED") == 3

    # A second CLI run is a clean no-op
    exit_code_again = dev.main([])
    captured_again = capsys.readouterr()
    assert exit_code_again == 0
    assert captured_again.out.count("Status: ALREADY EXISTS") == 3
    assert "Login verification" in captured_again.out
