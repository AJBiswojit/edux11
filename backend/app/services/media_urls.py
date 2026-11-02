"""Map pipeline-relative image paths under ``backend/media`` to browser URLs.

Stored values look like::

    media/pdf_extract/jee-mathematics/crops/p0001_qQ2_option_1.png

Files are pushed into ``backend/media/`` (same relative tail after the leading
``media/`` segment). The API mounts that directory at ``/media``, so the public
URL is ``{PUBLIC_ORIGIN}/media/pdf_extract/...``.
"""

from __future__ import annotations

from pathlib import Path
from urllib.parse import quote

from app.core.config import get_settings


def media_root() -> Path:
    settings = get_settings()
    raw = (settings.media_dir or "").strip()
    if raw:
        path = Path(raw)
        if not path.is_absolute():
            # Resolve relative to the backend package root (…/backend).
            path = Path(__file__).resolve().parents[2] / path
    else:
        path = Path(__file__).resolve().parents[2] / "media"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _normalize_storage_key(raw: str | None) -> str | None:
    if raw is None:
        return None
    value = str(raw).strip().replace("\\", "/")
    if not value or value.startswith(("http://", "https://", "data:")):
        return None if not value else value  # absolute / data URLs pass through as-is via caller
    value = value.lstrip("/")
    # DB paths are usually "media/pdf_extract/…"; files live under backend/media/pdf_extract/…
    if value.startswith("media/"):
        value = value[len("media/") :]
    # Block path escape
    parts = [p for p in value.split("/") if p and p != "."]
    if any(p == ".." for p in parts):
        return None
    return "/".join(parts)


def is_absolute_or_data_url(raw: str | None) -> bool:
    if not raw:
        return False
    v = str(raw).strip()
    return v.startswith(("http://", "https://", "data:"))


def public_media_url(raw: str | None) -> str | None:
    """Turn a stored path (or absolute URL) into a browser-usable URL."""
    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if is_absolute_or_data_url(text):
        return text
    key = _normalize_storage_key(text)
    if not key:
        return None
    settings = get_settings()
    origin = (settings.public_origin or "").rstrip("/")
    # Encode each path segment but keep slashes
    encoded = "/".join(quote(seg, safe="") for seg in key.split("/"))
    path = f"/media/{encoded}"
    return f"{origin}{path}" if origin else path


def public_media_urls(raw: str | None) -> list[str]:
    """Split pipe-joined stem paths and resolve each to a public URL."""
    if raw is None:
        return []
    text = str(raw).strip()
    if not text:
        return []
    parts = [p.strip() for p in text.split("|") if p.strip()]
    urls: list[str] = []
    for part in parts:
        url = public_media_url(part)
        if url:
            urls.append(url)
    return urls


def option_image_url(option: dict | None) -> str | None:
    if not isinstance(option, dict):
        return None
    return public_media_url(option.get("image_url") or option.get("imageUrl"))
