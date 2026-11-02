"""Content-source analysis. Empty text → FAILED. Never invent sample topics."""

from __future__ import annotations

import json
import re
from collections import Counter

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.assessment import ContentChunk, ContentSource
from app.models.identity import User
from app.services.examination import normalize_exam_family, normalize_exam_mode, parse_json, title_domain, title_family
from app.services.faculty_runtime import iso, require_faculty


FAILED = "FAILED"
ANALYZED = "ANALYZED"
PENDING = "PENDING"


def _serialize_source(row: ContentSource) -> dict:
    analysis = parse_json(row.analysis, {})
    mode = normalize_exam_mode(row.exam_mode) or "university"
    family = normalize_exam_family(row.exam_family, mode=mode)
    status = (row.analysis_status or PENDING).upper()
    ui = "Analyzed" if status == ANALYZED else ("Failed" if status == FAILED else "Pending")
    return {
        "sourceId": row.id,
        "id": row.id,
        "title": row.title,
        "shortTitle": row.title,
        "sourceType": "PDF",
        "domain": title_domain(mode),
        "exam": title_family(family),
        "examFamily": title_family(family),
        "examMode": title_domain(mode),
        "subject": analysis.get("subject"),
        "chapter": analysis.get("chapter"),
        "pageCount": row.page_count,
        "featured": False,
        "sourceLabel": row.title,
        "questionCountGenerated": 0,
        "approvedQuestionCount": 0,
        "analysisStatus": ui,
        "generationStatus": status,
        "uploadedAt": iso(row.created_at),
        "lastAnalyzedAt": iso(row.updated_at) if status == ANALYZED else None,
        "topics": analysis.get("topics") or [],
        "analysis": analysis or None,
        "analysisError": row.analysis_error,
    }


def extract_topics(text: str, *, limit: int = 8) -> list[str]:
    tokens = re.findall(r"[A-Za-z][A-Za-z-]{3,}", text or "")
    stop = {
        "this", "that", "with", "from", "have", "were", "been", "will", "your", "their", "about",
        "which", "when", "into", "also", "than", "then", "them", "these", "those", "such", "using",
        "chapter", "section", "figure", "table", "question", "answer", "example",
    }
    counts = Counter(tok.lower() for tok in tokens if tok.lower() not in stop)
    return [word.replace("-", " ").title() for word, _ in counts.most_common(limit)]


def persist_chunks(db: Session, source_id: str, text: str) -> int:
    db.query(ContentChunk).filter(ContentChunk.source_id == source_id).delete()
    parts = [part.strip() for part in re.split(r"\n{2,}", text) if part.strip()]
    if not parts:
        parts = [text.strip()] if text.strip() else []
    for index, part in enumerate(parts[:40]):
        db.add(ContentChunk(source_id=source_id, page_no=None, chunk_index=index, text=part[:4000]))
    return len(parts[:40])


def analyze_source(db: Session, user: User, source_id: str, body: dict | None = None) -> dict:
    require_faculty(user)
    row = db.get(ContentSource, source_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found.")
    incoming = (body or {}).get("text") or (body or {}).get("extractedText") or row.extracted_text or ""
    text = str(incoming or "").strip()
    if not text:
        row.analysis_status = FAILED
        row.analysis_error = "No extracted text available for analysis"
        row.analysis = json.dumps({"status": FAILED, "topics": [], "error": row.analysis_error})
        db.commit()
        db.refresh(row)
        source = _serialize_source(row)
        return {"ok": False, "sourceId": source_id, "analysis": parse_json(row.analysis, {}), "source": source, "status": FAILED}
    persist_chunks(db, row.id, text)
    topics = extract_topics(text)
    analysis = {
        "status": ANALYZED,
        "topics": topics,
        "wordCount": len(text.split()),
        "chunkCount": db.query(ContentChunk).filter(ContentChunk.source_id == row.id).count(),
        "note": "Topics extracted from uploaded source text.",
    }
    row.extracted_text = text
    row.analysis = json.dumps(analysis)
    row.analysis_status = ANALYZED
    row.analysis_error = None
    db.commit()
    db.refresh(row)
    source = _serialize_source(row)
    return {"ok": True, "sourceId": source_id, "analysis": analysis, "source": source, "status": ANALYZED}
