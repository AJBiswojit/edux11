"""Question Studio per-question lifecycle with version snapshots."""

from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.assessment import Question, QuestionGenerationItem, QuestionStudioSession, QuestionVersion
from app.models.identity import User
from app.services.examination import _catalog_maps, parse_json, serialize_question_faculty
from app.services.faculty_runtime import iso, parse_json as _parse, require_faculty
from app.services.question_generation import create_generation, get_generation_questions


def _session_or_404(db: Session, user: User, session_id: str) -> QuestionStudioSession:
    row = db.get(QuestionStudioSession, session_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found.")
    if user.primary_role != "admin" and row.faculty_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this session")
    return row


def _question_in_session(db: Session, session: QuestionStudioSession, question_id: str) -> Question:
    question = db.get(Question, question_id)
    if not question or question.institution_id != session.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")
    settings = parse_json(session.settings, {})
    generation_id = settings.get("generationId")
    if generation_id:
        link = db.scalars(
            select(QuestionGenerationItem).where(
                QuestionGenerationItem.generation_id == generation_id,
                QuestionGenerationItem.question_id == question_id,
            )
        ).first()
        if not link:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Question is not part of this session")
    return question


def _next_version(db: Session, question_id: str) -> int:
    current = db.scalar(select(func.max(QuestionVersion.version)).where(QuestionVersion.question_id == question_id)) or 0
    return int(current) + 1


def snapshot_version(db: Session, question: Question, user: User) -> QuestionVersion:
    row = QuestionVersion(
        question_id=question.id,
        version=_next_version(db, question.id),
        stem=question.stem,
        options=question.options,
        correct_answer=question.correct_answer,
        explanation=question.explanation,
        status=question.status or "draft",
        created_by=user.id,
    )
    db.add(row)
    db.flush()
    return row


def session_questions(db: Session, user: User, session: QuestionStudioSession) -> list[dict]:
    settings = parse_json(session.settings, {})
    generation_id = settings.get("generationId")
    if not generation_id:
        return []
    packed = get_generation_questions(db, user, generation_id)
    return packed.get("questions") or []


def serialize_session(db: Session, user: User, session: QuestionStudioSession) -> dict:
    settings = parse_json(session.settings, {})
    questions = session_questions(db, user, session)
    return {
        "studioSessionId": session.id,
        "sourceId": session.source_id,
        "settings": settings,
        "status": session.status,
        "generationId": settings.get("generationId"),
        "questions": questions,
        "createdAt": iso(session.created_at),
    }


def edit_question(db: Session, user: User, session_id: str, question_id: str, body: dict) -> dict:
    require_faculty(user)
    session = _session_or_404(db, user, session_id)
    question = _question_in_session(db, session, question_id)
    snapshot_version(db, question, user)
    if body.get("question") or body.get("stem") or body.get("text"):
        question.stem = str(body.get("question") or body.get("stem") or body.get("text"))
    if "options" in body:
        options = body.get("options")
        question.options = json.dumps(options) if not isinstance(options, str) else options
    if body.get("correctAnswer") is not None or body.get("correct_answer") is not None:
        question.correct_answer = str(body.get("correctAnswer") if body.get("correctAnswer") is not None else body.get("correct_answer"))
    if "explanation" in body:
        question.explanation = body.get("explanation")
    if body.get("difficulty"):
        question.difficulty = str(body.get("difficulty")).lower()
    db.commit()
    db.refresh(question)
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    return {"ok": True, "question": serialize_question_faculty(question, subjects, chapters, topics)}


def regenerate_question(db: Session, user: User, session_id: str, question_id: str, body: dict | None = None) -> dict:
    require_faculty(user)
    session = _session_or_404(db, user, session_id)
    question = _question_in_session(db, session, question_id)
    snapshot_version(db, question, user)
    settings = parse_json(session.settings, {})
    payload = {
        **(body or {}),
        "domain": (body or {}).get("domain") or settings.get("domain") or question.exam_mode,
        "examFamily": (body or {}).get("examFamily") or settings.get("examFamily") or question.exam_family,
        "subject": (body or {}).get("subject") or settings.get("subject"),
        "chapter": (body or {}).get("chapter") or settings.get("chapter") or question.concept,
        "topic": (body or {}).get("topic") or settings.get("topic") or question.concept,
        "questionCount": 1,
        "difficulty": (body or {}).get("difficulty") or question.difficulty or "Medium",
        "questionTypes": [(body or {}).get("qType") or question.q_type or "MCQ"],
    }
    generated = create_generation(db, user, payload)
    if generated.get("status") == "FAILED" or not generated.get("questionIds"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, generated.get("error") or "Regeneration failed")
    new_id = generated["questionIds"][0]
    fresh = db.get(Question, new_id)
    if not fresh:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Regeneration produced no question")
    question.stem = fresh.stem
    question.options = fresh.options
    question.correct_answer = fresh.correct_answer
    question.explanation = fresh.explanation
    question.difficulty = fresh.difficulty
    question.q_type = fresh.q_type
    question.source = "ai"
    # Keep the session linked to the stable question id; drop the throwaway row.
    db.delete(fresh)
    db.commit()
    db.refresh(question)
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    return {"ok": True, "question": serialize_question_faculty(question, subjects, chapters, topics)}


def delete_question(db: Session, user: User, session_id: str, question_id: str) -> dict:
    require_faculty(user)
    session = _session_or_404(db, user, session_id)
    question = _question_in_session(db, session, question_id)
    snapshot_version(db, question, user)
    settings = parse_json(session.settings, {})
    generation_id = settings.get("generationId")
    if generation_id:
        db.query(QuestionGenerationItem).filter(
            QuestionGenerationItem.generation_id == generation_id,
            QuestionGenerationItem.question_id == question_id,
        ).delete()
    question.status = "archived"
    db.commit()
    return {"ok": True, "deleted": question_id}


def reject_question(db: Session, user: User, session_id: str, question_id: str) -> dict:
    require_faculty(user)
    session = _session_or_404(db, user, session_id)
    question = _question_in_session(db, session, question_id)
    snapshot_version(db, question, user)
    question.status = "rejected"
    db.commit()
    db.refresh(question)
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    return {"ok": True, "rejected": True, "question": serialize_question_faculty(question, subjects, chapters, topics)}
