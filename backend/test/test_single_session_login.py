"""Verify first-session-wins login restriction for students.

A student may only hold one active session. While one is live, a second login
(another tab / browser / device) is refused. Logging out frees the session.
Non-student roles are unaffected.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.db.session import SessionLocal
from app.models.identity import User


def _login(client, email, password="aurora123"):
    return client.post("/v1/auth/login", json={"email": email, "password": password})


def _reset_session(email):
    """Clear any lingering session state so each test starts from a clean slate."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        user.active_session_id = None
        user.session_expires_at = None
        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _cleanup_student_session(world):
    """These tests log the shared `world` student in, which sets active_session_id.
    Clear it after each test so the sid-less auth_header() tokens used by other
    test modules keep working (single-session enforcement rejects a stale sid)."""
    yield
    _reset_session(world["student"].email)


def test_student_second_login_blocked_while_active(client, world):
    email = world["student"].email
    _reset_session(email)

    first = _login(client, email)
    assert first.status_code == 200, first.text
    assert first.json().get("accessToken")

    # A second login while the first session is still active is refused.
    second = _login(client, email)
    assert second.status_code == 409, second.text
    assert "signed in" in second.json()["detail"].lower()


def test_logout_frees_session_for_relogin(client, world):
    email = world["student"].email
    _reset_session(email)

    first = _login(client, email)
    assert first.status_code == 200, first.text
    token = first.json()["accessToken"]

    # Blocked while active.
    assert _login(client, email).status_code == 409

    # Logout clears the active session...
    out = client.post("/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert out.status_code == 200, out.text

    # ...so the student can log in again.
    again = _login(client, email)
    assert again.status_code == 200, again.text


def test_expired_session_does_not_lock_out(client, world):
    email = world["student"].email
    _reset_session(email)

    first = _login(client, email)
    assert first.status_code == 200, first.text

    # Simulate the previous session's token having expired (student closed the
    # browser without logging out). The stale session must not block a new login.
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).one()
        user.session_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
    finally:
        db.close()

    again = _login(client, email)
    assert again.status_code == 200, again.text


def test_faculty_login_not_restricted(client, world):
    email = world["faculty"].email

    first = _login(client, email)
    assert first.status_code == 200, first.text

    # Non-student roles can log in repeatedly with no single-session block.
    second = _login(client, email)
    assert second.status_code == 200, second.text
