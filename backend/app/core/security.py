from datetime import datetime, timedelta, timezone
from typing import Any
import hashlib
import hmac
import os

from jose import JWTError, jwt

from app.core.config import get_settings

# PBKDF2-SHA256 work factor.
# NIST SP 800-132 (2023) recommends ≥ 210,000 iterations for SHA-256.
# 260k balances security and login latency (~0.3s on a modern CPU).
# The stored hash embeds the round count, so existing hashes keep working
# with whatever rounds they were generated with — only new hashes use this.
_PBKDF2_ROUNDS = 260_000


def hash_password(plain: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${_PBKDF2_ROUNDS}${salt.hex()}${dk.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    if hashed.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            import bcrypt
        except ImportError:
            return False
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False
    try:
        algo, rounds, salt_hex, dk_hex = hashed.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(dk.hex(), dk_hex)
    except (ValueError, TypeError):
        return False


def _encode(payload: dict[str, Any], minutes: int | None = None, days: int | None = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expire = now + (timedelta(days=days) if days else timedelta(minutes=minutes or settings.access_token_expire_minutes))
    to_encode = {**payload, "iat": int(now.timestamp()), "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(
    *,
    sub: str,
    institution_id: str | None,
    roles: list[str],
    sid: str | None = None,
    minutes: int | None = None,
) -> str:
    payload: dict[str, Any] = {"sub": sub, "institution_id": institution_id, "roles": roles, "typ": "access"}
    if sid is not None:
        payload["sid"] = sid
    return _encode(payload, minutes=minutes)


def create_refresh_token(*, sub: str) -> str:
    settings = get_settings()
    return _encode({"sub": sub, "typ": "refresh"}, days=settings.refresh_token_expire_days)


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def parse_access_token(token: str) -> tuple[str, str | None]:
    """Return (user_id, sid) from a valid access token. sid may be None for older tokens."""
    try:
        payload = decode_token(token)
        if payload.get("typ") != "access":
            raise JWTError("wrong token type")
        sub = payload["sub"]
        if not sub:
            raise JWTError("missing sub")
        sid = payload.get("sid")
        return str(sub), (str(sid) if sid is not None else None)
    except (JWTError, KeyError, ValueError) as exc:
        raise ValueError("invalid token") from exc


def parse_user_id(token: str) -> str:
    return parse_access_token(token)[0]
