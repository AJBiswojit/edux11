"""Persist micro-assessments, assignments to students, and server-scored attempts."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Question
from app.models.capabilities import (
    MicroAssessment,
    MicroAssessmentAttempt,
    MicroAssessmentQuestion,
    MicroAssessmentTarget,
)
from app.models.identity import User
from app.models.people import StudentProfile
from app.services.examination import parse_answer_index, parse_json, parse_options, question_correct_index
from app.services.faculty_runtime import ensure_faculty_profile, iso, require_faculty
from app.services.question_generation import create_generation, get_generation_questions
from app.services.student_runtime import require_student


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _status_title(raw: str | None) -> str:
    mapping = {
        "draft": "Draft",
        "published": "Published",
        "in_progress": "In Progress",
        "completed": "Completed",
        "archived": "Archived",
    }
    key = (raw or "draft").lower()
    return mapping.get(key, (raw or "Draft").replace("_", " ").title())


def _faculty_owns(user: User, row: MicroAssessment) -> None:
    if row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")
    if user.primary_role != "admin" and row.faculty_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this assessment")


def _student_question(question: Question, snapshot: dict | None = None) -> dict:
    snap = snapshot or {}
    options = snap.get("options")
    if options is None:
        options = parse_options(question.options)
    stem = snap.get("question") or snap.get("stem") or question.stem
    qtype = snap.get("questionType") or (question.q_type or "mcq")
    if str(qtype).lower() in {"mcq", "multiple choice"}:
        qtype = "MCQ"
    return {
        "id": question.id,
        "question": stem,
        "questionType": qtype if str(qtype).isupper() or " " in str(qtype) else str(qtype).replace("_", " ").title(),
        "difficulty": (snap.get("difficulty") or question.difficulty or "medium").title(),
        "concept": snap.get("concept") or question.concept,
        "options": options or [],
    }


def _faculty_question(question: Question, snapshot: dict | None = None) -> dict:
    payload = _student_question(question, snapshot)
    payload["correctAnswer"] = question_correct_index(question)
    payload["explanation"] = question.explanation
    payload["marks"] = question.marks
    payload["status"] = (question.status or "approved").title()
    payload["source"] = question.source or "ai"
    return payload


def _links(db: Session, assessment_id: str) -> list[MicroAssessmentQuestion]:
    return list(
        db.scalars(
            select(MicroAssessmentQuestion)
            .where(MicroAssessmentQuestion.assessment_id == assessment_id)
            .order_by(MicroAssessmentQuestion.sort_order)
        ).all()
    )


def _questions_for(db: Session, assessment_id: str, *, include_answers: bool) -> list[dict]:
    links = _links(db, assessment_id)
    ids = [link.question_id for link in links]
    qmap = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(ids))).all()} if ids else {}
    items = []
    for link in links:
        question = qmap.get(link.question_id)
        if not question:
            continue
        snap = parse_json(link.snapshot, {})
        items.append(_faculty_question(question, snap) if include_answers else _student_question(question, snap))
    return items


def _targets(db: Session, assessment_id: str) -> list[MicroAssessmentTarget]:
    return list(db.scalars(select(MicroAssessmentTarget).where(MicroAssessmentTarget.assessment_id == assessment_id)).all())


def _attempts(db: Session, assessment_id: str) -> list[MicroAssessmentAttempt]:
    return list(db.scalars(select(MicroAssessmentAttempt).where(MicroAssessmentAttempt.assessment_id == assessment_id)).all())


def serialize_faculty(db: Session, row: MicroAssessment, *, include_questions: bool = True) -> dict:
    targets = _targets(db, row.id)
    attempts = _attempts(db, row.id)
    submitted = [a for a in attempts if a.submitted_at is not None]
    owner = db.get(User, row.faculty_id)
    questions = _questions_for(db, row.id, include_answers=True) if include_questions else []
    assigned_ids = [t.student_id for t in targets]
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "instructions": row.instructions,
        "subject": row.subject,
        "chapter": row.chapter,
        "topic": row.topic,
        "duration": row.duration_minutes,
        "durationMinutes": row.duration_minutes,
        "deadline": iso(row.deadline_at),
        "status": _status_title(row.status),
        "lifecycleStatus": row.status,
        "faculty": owner.full_name if owner else None,
        "facultyId": row.faculty_id,
        "generationId": row.generation_id,
        "questionCount": len(questions) if include_questions else len(_links(db, row.id)),
        "questions": questions,
        "assignedCount": len(assigned_ids),
        "studentIds": assigned_ids,
        "attemptCount": len(submitted),
        "createdAt": iso(row.created_at),
        "publishedAt": iso(row.published_at),
    }


def serialize_student(db: Session, row: MicroAssessment, user: User, *, include_questions: bool = True) -> dict:
    attempt = db.scalars(
        select(MicroAssessmentAttempt).where(
            MicroAssessmentAttempt.assessment_id == row.id,
            MicroAssessmentAttempt.student_id == user.id,
        )
    ).first()
    owner = db.get(User, row.faculty_id)
    payload = {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "instructions": row.instructions,
        "subject": row.subject,
        "chapter": row.chapter,
        "topic": row.topic,
        "duration": row.duration_minutes,
        "deadline": iso(row.deadline_at),
        "status": _status_title(row.status),
        "faculty": owner.full_name if owner else None,
        "questionCount": len(_links(db, row.id)),
        "attemptStatus": attempt.status if attempt else None,
        "score": parse_json(attempt.scoring, {}).get("percentage") if attempt and attempt.submitted_at else None,
        "submittedAt": iso(attempt.submitted_at) if attempt else None,
    }
    if include_questions:
        payload["questions"] = _questions_for(db, row.id, include_answers=False)
        if any("correctAnswer" in q or "correct_answer" in q for q in payload["questions"]):
            raise RuntimeError("correctAnswer leaked into student micro-assessment")
    return payload


def list_faculty(db: Session, user: User) -> dict:
    require_faculty(user)
    query = select(MicroAssessment).where(MicroAssessment.institution_id == user.institution_id)
    if user.primary_role != "admin":
        query = query.where(MicroAssessment.faculty_id == user.id)
    rows = db.scalars(query.order_by(MicroAssessment.created_at.desc())).all()
    items = [serialize_faculty(db, row, include_questions=False) for row in rows]
    return {"items": items, "count": len(items)}


def get_faculty(db: Session, user: User, assessment_id: str) -> dict:
    require_faculty(user)
    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    # A generation submitted moments ago may have completed by now — link its
    # questions before serialising the assessment.
    _sync_generation_links(db, user, row)
    return {"assessment": serialize_faculty(db, row, include_questions=True)}


def create(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    title = str((body or {}).get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Title is required")
    due_raw = (body or {}).get("deadline") or (body or {}).get("dueAt")
    deadline = None
    if due_raw:
        try:
            deadline = datetime.fromisoformat(str(due_raw).replace("Z", "+00:00"))
        except ValueError:
            deadline = None
    row = MicroAssessment(
        institution_id=user.institution_id,
        faculty_id=user.id,
        title=title,
        description=(body or {}).get("description"),
        instructions=(body or {}).get("instructions"),
        subject=(body or {}).get("subject"),
        chapter=(body or {}).get("chapter"),
        topic=(body or {}).get("topic"),
        duration_minutes=int((body or {}).get("duration") or (body or {}).get("durationMinutes") or 15),
        deadline_at=deadline,
        status="draft",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"ok": True, "assessment": serialize_faculty(db, row)}


def _sync_generation_links(db: Session, user: User, row: MicroAssessment) -> None:
    """Materialise a finished AI generation's questions into the assessment's
    question links (idempotent). The deployed agent writes asynchronously, so
    these links are created as soon as the generation is READY — either during
    `generate_questions` or on the next faculty read of the assessment."""
    if not row.generation_id:
        return
    if _links(db, row.id):
        return
    packed = get_generation_questions(db, user, row.generation_id)
    questions = packed.get("questions") or []
    if not questions:
        return
    for index, item in enumerate(questions, start=1):
        qid = item.get("id")
        if not qid:
            continue
        db.add(
            MicroAssessmentQuestion(
                assessment_id=row.id,
                question_id=qid,
                sort_order=index,
                snapshot=json.dumps(
                    {
                        "question": item.get("question") or item.get("text"),
                        "options": item.get("options") or [],
                        "difficulty": item.get("difficulty"),
                        "questionType": item.get("questionType") or item.get("type"),
                        "concept": item.get("topic") or item.get("chapter"),
                    }
                ),
            )
        )
    db.commit()


def generate_questions(db: Session, user: User, assessment_id: str, body: dict | None = None) -> dict:
    require_faculty(user)
    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    body = body or {}
    count = int(body.get("count") or body.get("questionCount") or 8)
    payload = {
        "domain": body.get("domain") or "University",
        "examFamily": body.get("examFamily"),
        "subject": body.get("subject") or row.subject,
        "chapter": body.get("chapter") or row.chapter,
        "topic": body.get("topic") or row.topic,
        "questionCount": count,
        "difficulty": body.get("difficulty") or "Medium",
        "questionTypes": body.get("questionTypes") or ["MCQ"],
        "bloomPreset": body.get("bloom") or body.get("bloomsLevel"),
    }
    generated = create_generation(db, user, payload)
    if generated.get("status") == "FAILED":
        return {"ok": False, "status": "FAILED", "error": generated.get("error") or generated.get("errorMessage"), "assessment": serialize_faculty(db, row)}
    row.generation_id = generated["generationId"]
    _sync_generation_links(db, user, row)
    questions = _questions_for(db, row.id, include_answers=True)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "generationId": generated["generationId"],
        "status": generated.get("status"),
        "questions": questions,
        "assessment": serialize_faculty(db, row),
    }


def assign_students(db: Session, user: User, assessment_id: str, body: dict) -> dict:
    require_faculty(user)
    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    student_ids = list(body.get("studentIds") or body.get("students") or [])
    saved = []
    for sid in student_ids:
        student = db.get(StudentProfile, sid)
        if not student or student.institution_id != user.institution_id:
            continue
        existing = db.scalars(
            select(MicroAssessmentTarget).where(
                MicroAssessmentTarget.assessment_id == row.id,
                MicroAssessmentTarget.student_id == sid,
            )
        ).first()
        if existing:
            saved.append(sid)
            continue
        db.add(MicroAssessmentTarget(assessment_id=row.id, student_id=sid, assigned_at=utcnow()))
        saved.append(sid)
    db.commit()
    return {"ok": True, "assigned": saved, "assessment": serialize_faculty(db, row, include_questions=False)}


def send_assessment(db: Session, user: User, assessment_id: str, body: dict | None = None) -> dict:
    require_faculty(user)
    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    if body:
        assign_students(db, user, assessment_id, body)
        row = db.get(MicroAssessment, assessment_id)
    if not _links(db, row.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot send an assessment with no questions")
    if not _targets(db, row.id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Assign at least one student before sending")
    row.status = "published"
    row.published_at = utcnow()
    db.commit()
    db.refresh(row)
    return {"ok": True, "assessment": serialize_faculty(db, row)}


def analytics(db: Session, user: User, assessment_id: str) -> dict:
    require_faculty(user)
    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    targets = _targets(db, row.id)
    attempts = [a for a in _attempts(db, row.id) if a.submitted_at is not None]
    scores = []
    for attempt in attempts:
        scoring = parse_json(attempt.scoring, {})
        if scoring.get("percentage") is not None:
            scores.append(float(scoring["percentage"]))
    return {
        "assessmentId": row.id,
        "assigned": len(targets),
        "submitted": len(attempts),
        "averagePct": round(sum(scores) / len(scores), 1) if scores else None,
        "attempts": [
            {
                "id": a.id,
                "studentId": a.student_id,
                "status": a.status,
                "percentage": parse_json(a.scoring, {}).get("percentage"),
                "submittedAt": iso(a.submitted_at),
            }
            for a in attempts
        ],
    }


def list_student(db: Session, user: User) -> dict:
    require_student(db, user)
    targets = db.scalars(select(MicroAssessmentTarget).where(MicroAssessmentTarget.student_id == user.id)).all()
    ids = [t.assessment_id for t in targets]
    if not ids:
        return {"items": [], "count": 0}
    rows = db.scalars(
        select(MicroAssessment).where(
            MicroAssessment.id.in_(ids),
            MicroAssessment.institution_id == user.institution_id,
            MicroAssessment.status.in_(["published", "in_progress", "completed"]),
        )
    ).all()
    items = [serialize_student(db, row, user, include_questions=False) for row in rows]
    return {"items": items, "count": len(items)}


def get_student(db: Session, user: User, assessment_id: str) -> dict:
    require_student(db, user)
    row = db.get(MicroAssessment, assessment_id)
    if not row or row.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    if row.status not in {"published", "in_progress", "completed"}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    target = db.scalars(
        select(MicroAssessmentTarget).where(
            MicroAssessmentTarget.assessment_id == row.id,
            MicroAssessmentTarget.student_id == user.id,
        )
    ).first()
    if not target:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This assessment is not assigned to you")
    return {"assessment": serialize_student(db, row, user, include_questions=True)}


def _score_answers(db: Session, assessment_id: str, answers: dict[str, Any]) -> dict:
    links = _links(db, assessment_id)
    ids = [link.question_id for link in links]
    qmap = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(ids))).all()} if ids else {}
    correct = incorrect = unanswered = 0
    max_score = 0.0
    score = 0.0
    for link in links:
        question = qmap.get(link.question_id)
        if not question:
            continue
        marks = float(question.marks or 1)
        max_score += marks
        raw = answers.get(question.id)
        if raw is None:
            raw = answers.get(str(question.id))
        if raw is None or str(raw).strip() == "":
            unanswered += 1
            continue
        options = parse_options(question.options)
        key = question_correct_index(question)
        selected_idx = parse_answer_index(raw)
        if selected_idx is None and options:
            text = str(raw).strip()
            for index, option in enumerate(options):
                if str(option).strip() == text:
                    selected_idx = index
                    break
        if key is None:
            unanswered += 1
            continue
        if selected_idx == key:
            correct += 1
            score += marks
        else:
            incorrect += 1
    percentage = round((score / max_score) * 100, 2) if max_score else 0.0
    return {
        "score": round(score, 2),
        "maxScore": round(max_score, 2),
        "percentage": percentage,
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": unanswered,
        "total": len(links),
    }


def submit_student(db: Session, user: User, assessment_id: str, body: dict) -> dict:
    require_student(db, user)
    row = db.get(MicroAssessment, assessment_id)
    if not row or row.institution_id != user.institution_id or row.status not in {"published", "in_progress", "completed"}:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    target = db.scalars(
        select(MicroAssessmentTarget).where(
            MicroAssessmentTarget.assessment_id == row.id,
            MicroAssessmentTarget.student_id == user.id,
        )
    ).first()
    if not target:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This assessment is not assigned to you")
    existing = db.scalars(
        select(MicroAssessmentAttempt).where(
            MicroAssessmentAttempt.assessment_id == row.id,
            MicroAssessmentAttempt.student_id == user.id,
        )
    ).first()
    if existing and existing.submitted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Attempt already submitted")
    answers = body.get("answers") if isinstance(body.get("answers"), dict) else {}
    scoring = _score_answers(db, row.id, answers)
    now = utcnow()
    if existing is None:
        existing = MicroAssessmentAttempt(
            assessment_id=row.id,
            student_id=user.id,
            answers=json.dumps(answers),
            scoring=json.dumps(scoring),
            status="completed",
            started_at=now,
            submitted_at=now,
        )
        db.add(existing)
    else:
        existing.answers = json.dumps(answers)
        existing.scoring = json.dumps(scoring)
        existing.status = "completed"
        existing.submitted_at = now
        existing.started_at = existing.started_at or now
    if row.status == "published":
        row.status = "in_progress"
    db.commit()
    db.refresh(existing)
    return {
        "ok": True,
        "attempt": {
            "id": existing.id,
            "assessmentId": row.id,
            "status": "completed",
            "scoring": scoring,
            "submittedAt": iso(existing.submitted_at),
        },
    }


def _studio_question(item: dict) -> dict:
    options = item.get("options") or []
    answer_index = item.get("correctAnswer")
    if isinstance(answer_index, str) and answer_index.isdigit():
        answer_index = int(answer_index)
    return {
        "id": item.get("id"),
        "question": item.get("question") or item.get("text"),
        "options": options,
        "questionType": item.get("questionType") or item.get("type") or "MCQ",
        "difficulty": item.get("difficulty") or "Medium",
        "concept": item.get("topic") or item.get("chapter") or item.get("concept"),
        "correctAnswer": options[answer_index] if isinstance(answer_index, int) and 0 <= answer_index < len(options) else item.get("correctAnswer"),
        "answerIndex": answer_index if isinstance(answer_index, int) else None,
        "explanation": item.get("explanation"),
        "bloom": item.get("bloom"),
        "marks": item.get("marks") or 1,
        "source": item.get("source") or "ai",
    }


def list_sources(db: Session, user: User, params: dict | None = None) -> dict:
    require_faculty(user)
    from app.services.faculty_runtime import list_content_sources

    items = list_content_sources(db, user)
    params = params or {}
    search = str(params.get("search") or "").lower()
    if search:
        items = [s for s in items if search in f"{s.get('title')} {s.get('subject')} {s.get('chapter')}".lower()]
    if params.get("domain") and params.get("domain") not in {"All", ""}:
        items = [s for s in items if str(s.get("examMode") or s.get("domain") or "").lower() == str(params["domain"]).lower()]
    return {"items": items, "count": len(items), "total": len(items)}


def get_source(db: Session, user: User, source_id: str) -> dict:
    require_faculty(user)
    from app.services.faculty_runtime import list_content_sources

    source = next((s for s in list_content_sources(db, user) if s.get("id") == source_id or s.get("sourceId") == source_id), None)
    if not source:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Source not found")
    return {"source": source}


def participants(db: Session, user: User, *, domain: str | None = None, exam_family: str | None = None) -> dict:
    require_faculty(user)
    from app.services.people_directory import faculty_students_directory

    directory = faculty_students_directory(db, user.institution_id)
    students = directory.get("students") or []
    batches = directory.get("batches") or []
    if domain:
        needle = "Competitive" if str(domain).lower() == "competitive" else "University"
        students = [s for s in students if (s.get("domain") or "University") == needle]
        batches = [b for b in batches if (b.get("domain") or "University") == needle]
    if exam_family:
        students = [s for s in students if str(s.get("examFamily") or "").upper() == str(exam_family).upper()]
        batches = [b for b in batches if str(b.get("examFamily") or "").upper() == str(exam_family).upper()]
    return {"students": students, "batches": batches}


def process_source(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    from app.models.assessment import ContentSource
    from app.services.content_analysis import analyze_source, extract_topics
    from app.services.examination import normalize_exam_family, normalize_exam_mode

    source_id = (body or {}).get("sourceId")
    source_body = (body or {}).get("source") or {}
    text = source_body.get("content") or source_body.get("text") or (body or {}).get("text") or ""
    if source_id:
        result = analyze_source(db, user, source_id, {"text": text} if text else None)
        analysis = result.get("analysis") or {}
        if not result.get("ok"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, analysis.get("error") or "No extracted text available for analysis")
        understanding = {
            "chapter": source_body.get("chapter") or analysis.get("chapter") or "—",
            "topic": source_body.get("topic") or (analysis.get("topics") or ["—"])[0],
            "context": source_body.get("subject") or source_body.get("title") or "Uploaded source",
            "concepts": analysis.get("topics") or [],
            "importantFacts": analysis.get("topics") or [],
            "questionOpportunities": analysis.get("topics") or [],
        }
        return {"ok": True, "source": {**(source_body or {}), **(result.get("source") or {})}, "understanding": understanding}
    if not str(text).strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Source text is required")
    mode = normalize_exam_mode(source_body.get("domain") or source_body.get("examMode")) or "university"
    family = normalize_exam_family(source_body.get("examFamily") or source_body.get("exam"), mode=mode)
    row = ContentSource(
        institution_id=user.institution_id,
        title=str(source_body.get("title") or "Custom source"),
        exam_mode=mode,
        exam_family=family,
        extracted_text=text,
        analysis_status="PENDING",
        created_by=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    result = analyze_source(db, user, row.id, {"text": text})
    analysis = result.get("analysis") or {}
    topics = analysis.get("topics") or extract_topics(text)
    understanding = {
        "chapter": source_body.get("chapter") or "—",
        "topic": source_body.get("topic") or (topics[0] if topics else "—"),
        "context": source_body.get("subject") or row.title,
        "concepts": topics,
        "importantFacts": topics,
        "questionOpportunities": topics,
    }
    source = {**(source_body or {}), **(result.get("source") or {}), "id": row.id, "sourceId": row.id, "content": text}
    return {"ok": True, "source": source, "understanding": understanding}


def generate_from_source(db: Session, user: User, body: dict) -> dict:
    require_faculty(user)
    ensure_faculty_profile(db, user)
    source = (body or {}).get("source") or {}
    count = int((body or {}).get("count") or (body or {}).get("questionCount") or 8)
    generated = create_generation(
        db,
        user,
        {
            "domain": source.get("domain") or (body or {}).get("domain") or "University",
            "examFamily": source.get("examFamily") or (body or {}).get("examFamily"),
            "subject": source.get("subject") or (body or {}).get("subject"),
            "chapter": source.get("chapter") or (body or {}).get("chapter"),
            "topic": source.get("topic") or (body or {}).get("topic"),
            "questionCount": count,
            "difficulty": (body or {}).get("difficulty") or "Medium",
            "questionTypes": ["MCQ"],
        },
    )
    if generated.get("status") == "FAILED":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, generated.get("error") or "Question generation failed")
    packed = get_generation_questions(db, user, generated["generationId"])
    questions = [_studio_question(q) for q in (packed.get("questions") or [])]
    concepts: dict[str, int] = {}
    for q in questions:
        key = q.get("concept") or "General"
        concepts[key] = concepts.get(key, 0) + 1
    max_c = max(concepts.values()) if concepts else 1
    coverage = [{"concept": k, "count": v, "percentage": round((v / max_c) * 100)} for k, v in concepts.items()]
    diversity = min(100, len(concepts) * 20)
    return {
        "ok": True,
        "questions": questions,
        "generated": len(questions),
        "generationId": generated["generationId"],
        "conceptCoverage": coverage,
        "questionDiversity": diversity,
        "status": generated.get("status"),
    }


def regenerate_one(db: Session, user: User, body: dict) -> dict:
    packed = generate_from_source(db, user, {**(body or {}), "count": 1})
    question = (packed.get("questions") or [None])[0]
    if not question:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Regeneration failed")
    target = (body or {}).get("target") or {}
    if target.get("id"):
        question = {**question, "id": target.get("id")}
    return {"ok": True, "question": question}


def missing_coverage(db: Session, user: User, body: dict) -> dict:
    packed = generate_from_source(db, user, {**(body or {}), "count": 1})
    return {"ok": True, "questions": packed.get("questions") or [], "coverage": packed.get("conceptCoverage") or []}


def create_and_send(db: Session, user: User, body: dict) -> dict:
    """Studio send: persist assessment, questions, targets, then publish."""
    created = create(db, user, body)
    row_id = created["assessment"]["id"]
    question_ids = [q.get("id") for q in (body.get("questions") or []) if isinstance(q, dict) and q.get("id")]
    if question_ids:
        db.query(MicroAssessmentQuestion).filter(MicroAssessmentQuestion.assessment_id == row_id).delete()
        for index, qid in enumerate(question_ids, start=1):
            question = db.get(Question, qid)
            if not question or question.institution_id != user.institution_id:
                continue
            db.add(MicroAssessmentQuestion(assessment_id=row_id, question_id=qid, sort_order=index, snapshot=json.dumps({"question": question.stem, "options": parse_options(question.options)})))
        db.commit()
    elif not _links(db, row_id):
        generated = generate_questions(db, user, row_id, body)
        if not generated.get("ok"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, generated.get("error") or "Could not generate questions")
    from app.services.people_directory import faculty_students_directory

    student_ids = list(body.get("studentIds") or [])
    batch_ids = list(body.get("batchIds") or [])
    if batch_ids and not student_ids:
        directory = faculty_students_directory(db, user.institution_id)
        student_ids = [s["id"] for s in (directory.get("students") or []) if s.get("batchId") in batch_ids]
    if student_ids:
        assign_students(db, user, row_id, {"studentIds": student_ids})
    sent = send_assessment(db, user, row_id, None)
    assessment = sent["assessment"]
    assessment["target"] = {"studentIds": assessment.get("studentIds") or []}
    assessment["questions"] = assessment.get("questions") or _questions_for(db, row_id, include_answers=True)
    return {
        "ok": True,
        "assessment": assessment,
        "summary": {
            "studentsSelected": len(assessment.get("studentIds") or []),
            "questions": assessment.get("questionCount") or 0,
            "duration": assessment.get("duration"),
        },
    }


def results(db: Session, user: User, assessment_id: str) -> dict:
    packed = analytics(db, user, assessment_id)
    row = db.get(MicroAssessment, assessment_id)
    low = [a for a in packed.get("attempts") or [] if (a.get("percentage") or 100) < 60]
    recommendation = None
    if low:
        recommendation = {
            "title": f"Follow-up for {row.title}" if row else "Follow-up practice",
            "studentIds": [a["studentId"] for a in low],
            "reason": "Formative scores below 60%.",
        }
    return {
        **packed,
        "studentsCompleted": packed.get("submitted") or 0,
        "averageAccuracy": packed.get("averagePct"),
        "interventionRecommendation": recommendation,
    }


def create_intervention_from_assessment(db: Session, user: User, assessment_id: str, body: dict) -> dict:
    from app.services.interventions_sql import create_for_student

    row = db.get(MicroAssessment, assessment_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Micro-assessment not found")
    _faculty_owns(user, row)
    student_ids = list(body.get("studentIds") or [])
    if not student_ids:
        return {"ok": True, "created": False, "reason": "No students supplied"}
    first = student_ids[0]
    profile = db.get(StudentProfile, first)
    owner = db.get(User, first) if profile else None
    student = {"id": first, "name": owner.full_name if owner else None, "domain": "University"}
    created = create_for_student(
        db,
        user,
        first,
        {
            "subject": row.subject,
            "chapter": row.chapter,
            "notes": f"From micro-assessment {row.title}",
            "studentIds": student_ids,
            "title": f"Follow-up — {row.title}",
        },
        student,
    )
    return {**created, "created": True}
