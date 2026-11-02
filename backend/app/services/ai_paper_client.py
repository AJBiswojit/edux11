"""Client for the external AI Paper Generation microservice.

The service runs a 3-agent Kimi pipeline and writes generated papers/questions
into the shared DB (ai_generated_papers / ai_generated_paper_questions), keyed on
the paper_id we pass. EduX only *triggers* generation and polls job status here;
readback of the questions is done directly from the DB via the ORM models.

Endpoints used (verified live):
  POST /api/generate/async   -> {job_id, paper_id, status, queue_position,
                                 total_questions, estimated_minutes, resolved_chapters}
  GET  /api/jobs/{id}/status -> {job_id, paper_id, status, questions_generated,
                                 questions_dropped, total_questions, current_chapter,
                                 current_section, elapsed_seconds, error}
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger("ai_paper_client")

# EduX exam-family labels -> AI service enum values.
_EXAM_FAMILY_MAP = {
    "NEET": "NEET",
    "NEET UG": "NEET",
    "JEE": "JEE_MAIN",
    "JEE MAIN": "JEE_MAIN",
    "JEE_MAIN": "JEE_MAIN",
    "JEE ADVANCED": "JEE_ADVANCED",
    "JEE_ADVANCED": "JEE_ADVANCED",
}

_VALID_EXAM_FAMILIES = {"NEET", "JEE_MAIN", "JEE_ADVANCED"}
_VALID_DIFFICULTY = {"easy", "medium", "hard", "mixed"}


class AiPaperClientError(RuntimeError):
    """Raised when the AI service is unreachable or returns an error."""


def map_exam_family(value: str | None) -> str:
    """Normalize an EduX exam-family label to the AI service enum."""
    if not value:
        raise AiPaperClientError("exam_family is required for AI generation")
    key = value.strip().upper()
    mapped = _EXAM_FAMILY_MAP.get(key)
    if not mapped:
        raise AiPaperClientError(
            f"Unsupported exam_family '{value}'. Expected NEET / JEE (Main) / JEE Advanced."
        )
    return mapped


def _base_url() -> str:
    return get_settings().ai_paper_api_url.rstrip("/")


def _timeout() -> float:
    return float(get_settings().ai_paper_api_timeout or 30)


def build_generate_request(
    *,
    paper_id: str,
    exam_family: str,
    subject: str,
    chapters: list[dict],
    total_questions: int,
    difficulty: str = "mixed",
    test_name: str | None = None,
    institution: str = "",
    question_type: str | None = None,
    scope_notes: str | None = None,
) -> dict:
    """Assemble a validated request body for the AI service."""
    diff = (difficulty or "mixed").strip().lower()
    if diff not in _VALID_DIFFICULTY:
        diff = "mixed"

    clean_chapters: list[dict] = []
    for ch in chapters or []:
        name = (ch.get("name") or "").strip()
        if not name:
            continue
        entry: dict = {"name": name}
        if ch.get("count") is not None:
            entry["count"] = int(ch["count"])
        if ch.get("notes"):
            entry["notes"] = str(ch["notes"])
        clean_chapters.append(entry)

    if not clean_chapters:
        raise AiPaperClientError("At least one chapter is required for AI generation")

    body: dict = {
        "paper_id": paper_id,
        "exam_family": map_exam_family(exam_family),
        "subject": (subject or "").strip(),
        "chapters": clean_chapters,
        "total_questions": max(1, min(int(total_questions or 1), 200)),
        "difficulty": diff,
        "institution": institution or "",
    }
    if test_name:
        body["test_name"] = test_name
    if question_type:
        body["question_type"] = question_type
    if scope_notes:
        body["scope_notes"] = scope_notes
    return body


def generate_async(body: dict) -> dict:
    """POST /api/generate/async — queue a generation job. Returns job metadata."""
    url = f"{_base_url()}/api/generate/async"
    try:
        with httpx.Client(timeout=_timeout()) as client:
            resp = client.post(url, json=body)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        log.warning("ai_generate_async_http_error", status=exc.response.status_code, detail=detail)
        raise AiPaperClientError(f"AI service rejected the request: {detail}") from exc
    except httpx.HTTPError as exc:
        log.warning("ai_generate_async_unreachable", error=str(exc))
        raise AiPaperClientError("AI generation service is unreachable") from exc


def job_status(job_id: str) -> dict:
    """GET /api/jobs/{job_id}/status — current progress of a generation job."""
    url = f"{_base_url()}/api/jobs/{job_id}/status"
    try:
        with httpx.Client(timeout=_timeout()) as client:
            resp = client.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        raise AiPaperClientError(f"Job status error: {detail}") from exc
    except httpx.HTTPError as exc:
        log.warning("ai_job_status_unreachable", job_id=job_id, error=str(exc))
        raise AiPaperClientError("AI generation service is unreachable") from exc


async def generate_async_http(body: dict) -> dict:
    """Async version of generate_async — use from async FastAPI route handlers."""
    url = f"{_base_url()}/api/generate/async"
    try:
        async with httpx.AsyncClient(timeout=_timeout()) as client:
            resp = await client.post(url, json=body)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        log.warning("ai_generate_async_http_error", status=exc.response.status_code, detail=detail)
        raise AiPaperClientError(f"AI service rejected the request: {detail}") from exc
    except httpx.HTTPError as exc:
        log.warning("ai_generate_async_unreachable", error=str(exc))
        raise AiPaperClientError("AI generation service is unreachable") from exc


async def job_status_async(job_id: str) -> dict:
    """Async version of job_status — use from async FastAPI route handlers."""
    url = f"{_base_url()}/api/jobs/{job_id}/status"
    try:
        async with httpx.AsyncClient(timeout=_timeout()) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPStatusError as exc:
        detail = _extract_detail(exc.response)
        raise AiPaperClientError(f"Job status error: {detail}") from exc
    except httpx.HTTPError as exc:
        log.warning("ai_job_status_unreachable", job_id=job_id, error=str(exc))
        raise AiPaperClientError("AI generation service is unreachable") from exc


def _extract_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
        if isinstance(data, dict) and "detail" in data:
            return str(data["detail"])
        return str(data)
    except Exception:
        return response.text[:300] if response.text else f"HTTP {response.status_code}"
