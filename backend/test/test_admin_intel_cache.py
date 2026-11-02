"""Admin intelligence snapshot cache — serve warm data, rebuild after writes."""

from __future__ import annotations

from app.services import admin_intel_cache
from app.services.admin_intel_cache import FRESH_TTL_SECONDS
from test.test_admin_runtime import _admin
from test.conftest import auth_header


def test_admin_summary_second_hit_is_cached(client, world, db, monkeypatch):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.cache@test.edu", name="Cache Admin", user_id="u_adm_cache")
    headers = auth_header(admin)
    calls = {"n": 0}
    original = admin_intel_cache.admin_runtime.assemble_admin_intelligence

    def counting(db_session, user):
        calls["n"] += 1
        return original(db_session, user)

    monkeypatch.setattr(admin_intel_cache.admin_runtime, "assemble_admin_intelligence", counting)

    first = client.get("/v1/admin-intelligence/summary", headers=headers)
    assert first.status_code == 200, first.text
    second = client.get("/v1/admin-intelligence/summary", headers=headers)
    assert second.status_code == 200
    assert calls["n"] == 1
    assert first.json()["profile"]["userId"] == admin.id
    assert second.json()["profile"]["fullName"] == first.json()["profile"]["fullName"]


def test_admin_write_invalidates_summary_cache(client, world, db, monkeypatch):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.bust@test.edu", name="Bust Admin", user_id="u_adm_bust")
    headers = auth_header(admin)
    calls = {"n": 0}
    original = admin_intel_cache.admin_runtime.assemble_admin_intelligence

    def counting(db_session, user):
        calls["n"] += 1
        return original(db_session, user)

    monkeypatch.setattr(admin_intel_cache.admin_runtime, "assemble_admin_intelligence", counting)

    assert client.get("/v1/admin-intelligence/summary", headers=headers).status_code == 200
    created = client.post(
        "/v1/admin/students",
        json={"email": "cache.new@test.edu", "fullName": "Cache New", "roll": "C100"},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    again = client.get("/v1/admin-intelligence/summary", headers=headers)
    assert again.status_code == 200
    assert calls["n"] == 2
    names = [s["name"] for s in again.json()["datasets"]["people"]["students"]]
    assert "Cache New" in names


def test_fresh_ttl_constant_is_short() -> None:
    assert FRESH_TTL_SECONDS <= 120
