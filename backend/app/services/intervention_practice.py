"""Intervention practice / retest attempts persist as exam_attempts."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Question
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import User
from app.models.interventions import Intervention, InterventionStudent
from app.models.people import StudentProfile
from app.services.examination import parse_answer_index, parse_json, question_correct_index, title_domain, title_family
from app.services.faculty_runtime import iso
from app.services import interventions_sql
from app.services.student_runtime import practice_questions_from_bank

KIND_PRACTICE = "intervention_practice"
KIND_RETEST = "intervention_retest"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_student(db: Session, user: User) -> StudentProfile:
    profile = db.get(StudentProfile, user.id)
    if not profile:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student profile required")
    if profile.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")
    return profile


def student_sql_row(db: Session, user: User, intervention_id: str) -> Intervention | None:
    row = db.get(Intervention, intervention_id)
    if not row or row.institution_id != user.institution_id:
        return None
    member = db.scalars(
        select(InterventionStudent).where(
            InterventionStudent.intervention_id == row.id,
            InterventionStudent.student_id == user.id,
        )
    ).first()
    if not member:
        return None
    return row


def derived_student_intervention(db: Session, user: User, intervention_id: str) -> dict | None:
    from app.services.student_runtime import assemble_student_intelligence

    snap = assemble_student_intelligence(db, user)
    return next((row for row in (snap["derived"].get("interventions") or []) if row.get("id") == intervention_id), None)


def resolve_student_view(db: Session, user: User, intervention_id: str) -> dict:
    row = student_sql_row(db, user, intervention_id)
    if row:
        return interventions_sql.serialize_sql(db, row)
    derived = derived_student_intervention(db, user, intervention_id)
    if derived:
        return derived
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found.")


def score_bank_attempts(db: Session, user: User, question_attempts: list) -> tuple[dict, list[dict]]:
    correct = incorrect = unanswered = 0
    score = 0.0
    max_score = 0.0
    details: list[dict] = []
    for index, row in enumerate(question_attempts or [], start=1):
        if not isinstance(row, dict):
            continue
        qid = row.get("questionId") or (row.get("question") or {}).get("id")
        question = db.get(Question, qid) if qid else None
        if not question or question.institution_id != user.institution_id:
            continue
        marks = float(question.marks or 1)
        max_score += marks
        response = row.get("response") if isinstance(row.get("response"), dict) else {}
        selected = parse_answer_index(response.get("selected") if response else None)
        if selected is None:
            selected = parse_answer_index(row.get("selected") or row.get("answer"))
        key = question_correct_index(question)
        awarded = 0.0
        is_correct = None
        if selected is None:
            unanswered += 1
        elif key is None:
            unanswered += 1
        elif selected == key:
            correct += 1
            awarded = marks
            is_correct = True
        else:
            incorrect += 1
            is_correct = False
        score += awarded
        options = parse_json(question.options, [])
        details.append(
            {
                "questionId": question.id,
                "questionNumber": index,
                "question": {
                    "id": question.id,
                    "question": question.stem,
                    "options": options if isinstance(options, list) else [],
                },
                "academicContext": {
                    "subject": question.concept,
                    "chapter": question.concept,
                    "topic": question.concept,
                },
                "response": {"selected": selected},
                "timing": row.get("timing") if isinstance(row.get("timing"), dict) else {},
                "behaviour": row.get("behaviour") if isinstance(row.get("behaviour"), dict) else {},
                "evaluation": {"isCorrect": is_correct, "marksAwarded": awarded, "maxMarks": marks},
            }
        )
    attempted = correct + incorrect
    scoring = {
        "score": round(score, 2),
        "maxScore": round(max_score, 2),
        "percentage": round((score / max_score) * 100, 2) if max_score else 0.0,
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": unanswered,
        "skipped": unanswered,
        "accuracy": round((correct / attempted) * 100, 2) if attempted else 0.0,
        "total": len(details),
    }
    return scoring, details


def _advance_sql_status(db: Session, user: User, row: Intervention, kind: str) -> str:
    current = interventions_sql.to_ui_status(row.status)
    if kind == "retest":
        target = "Evaluating"
    elif current == "Assigned":
        target = "In Progress"
    elif current == "In Progress":
        target = "Completed"
    else:
        return current
    if not interventions_sql.can_transition(current, target):
        return current
    result = interventions_sql.transition_sql(db, user, row.id, target, f"student {kind} attempt")
    return result["status"]


def submit_practice(db: Session, user: User, intervention_id: str, body: dict) -> dict:
    profile = _require_student(db, user)
    sql_row = student_sql_row(db, user, intervention_id)
    derived = None if sql_row else derived_student_intervention(db, user, intervention_id)
    if sql_row is None and derived is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Intervention not found.")

    kind = str((body or {}).get("kind") or "practice")
    attempt_kind = KIND_RETEST if kind == "retest" else KIND_PRACTICE
    if sql_row:
        ser = interventions_sql.serialize_sql(db, sql_row)
        subject = ser.get("subject")
        chapter = ser.get("chapter")
        domain = ser.get("domain") or "University"
        family = ser.get("examFamily")
        title = ser.get("title") or "Intervention practice"
        exam_mode = "competitive" if str(domain).lower() == "competitive" else "university"
        exam_family = (str(family).lower() if family else None)
    else:
        subject = derived.get("affectedSubject") or derived.get("subject")
        chapter = derived.get("chapter")
        domain = derived.get("domain") or "University"
        family = derived.get("examFamily")
        title = derived.get("title") or "Intervention practice"
        exam_mode = "university"
        exam_family = None

    scoring, details = score_bank_attempts(db, user, (body or {}).get("questionAttempts") or [])
    now = utcnow()
    started = (body or {}).get("startedAt")
    try:
        started_at = datetime.fromisoformat(str(started).replace("Z", "+00:00")) if started else now
    except ValueError:
        started_at = now
    snapshot = {
        "kind": kind,
        "subject": subject,
        "chapter": chapter,
        "derivedInterventionId": None if sql_row else intervention_id,
        "title": title,
    }
    summary = {
        "score": scoring["score"],
        "maxScore": scoring["maxScore"],
        "pct": scoring["percentage"],
        "accuracy": scoring["accuracy"],
        "correct": scoring["correct"],
        "incorrect": scoring["incorrect"],
        "skipped": scoring["unanswered"],
    }
    attempt = ExamAttempt(
        institution_id=user.institution_id,
        student_id=user.id,
        roll_no=profile.roll_no,
        batch_id=profile.batch_id,
        exam_id=None,
        exam_name=title,
        exam_mode=exam_mode,
        exam_family=exam_family,
        source="exam_agent",
        attempt_kind=attempt_kind,
        is_demo=False,
        intervention_id=sql_row.id if sql_row else None,
        started_at=started_at,
        submitted_at=now,
        exam_snapshot=json.dumps(snapshot),
        timing=json.dumps((body or {}).get("timing") or {}),
        scoring=json.dumps(scoring),
        interactions=json.dumps({}),
        summary=json.dumps(summary),
    )
    db.add(attempt)
    db.flush()
    for row in details:
        db.add(
            ExamQuestionAttempt(
                attempt_id=attempt.id,
                question_id=row["questionId"],
                question_number=row["questionNumber"],
                question_snapshot=json.dumps(row["question"]),
                academic_context=json.dumps(row["academicContext"]),
                response=json.dumps(row["response"]),
                timing=json.dumps(row["timing"] or {}),
                behaviour=json.dumps(row["behaviour"] or {}),
                evaluation=json.dumps(row["evaluation"]),
            )
        )
    db.commit()
    db.refresh(attempt)

    ui_status = None
    if sql_row:
        ui_status = _advance_sql_status(db, user, sql_row, kind)
    elif derived:
        ui_status = derived.get("status") or "Active"

    return {
        "ok": True,
        "attempt": {
            "id": attempt.id,
            "interventionId": sql_row.id if sql_row else intervention_id,
            "studentId": user.id,
            "kind": kind,
            "domain": title_domain(exam_mode),
            "examFamily": title_family(exam_family),
            "subject": subject,
            "chapter": chapter,
            "score": scoring["score"],
            "maxScore": scoring["maxScore"],
            "accuracy": scoring["accuracy"],
            "incorrect": scoring["incorrect"],
            "startedAt": iso(attempt.started_at),
            "submittedAt": iso(attempt.submitted_at),
            "mode": "intervention-retest" if kind == "retest" else "intervention-practice",
            "source": "exam_attempts",
        },
        "status": ui_status,
    }


def student_practice_payload(db: Session, user: User, intervention_id: str) -> dict:
    iv = resolve_student_view(db, user, intervention_id)
    subject = iv.get("chapter") or iv.get("subject") or iv.get("affectedSubject")
    if iv.get("type") == "attendance":
        subject = iv.get("affectedSubject") or subject
    questions = practice_questions_from_bank(db, user, subject=subject, chapter=iv.get("chapter"), count=8)
    return {
        "items": questions,
        "questions": questions,
        "count": len(questions),
        "requested": 8,
        "sufficient": len(questions) >= 5,
        "interventionId": iv["id"],
        "practiceType": "drill",
        "durationMinutes": 20,
        "whyAssigned": iv.get("reason") or iv.get("notes"),
        "chapter": iv.get("chapter"),
        "subject": iv.get("affectedSubject") or iv.get("subject"),
    }


def student_retest_payload(db: Session, user: User, intervention_id: str) -> dict:
    row = student_sql_row(db, user, intervention_id)
    if not row or (row.status or "") != "retest_pending":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No re-test assigned for this intervention.")
    ser = interventions_sql.serialize_sql(db, row)
    questions = practice_questions_from_bank(db, user, subject=ser.get("subject"), chapter=ser.get("chapter"), count=10)
    return {
        "retest": {
            "id": f"rt_{row.id[:8]}",
            "interventionId": row.id,
            "title": f"Re-test — {ser.get('chapter') or ser.get('title')}",
            "chapter": ser.get("chapter"),
            "subject": ser.get("subject"),
            "domain": ser.get("domain"),
            "examFamily": ser.get("examFamily"),
            "questions": questions,
            "count": len(questions),
            "createdAt": iso(row.updated_at),
            "mode": "intervention-retest",
            "source": "sql",
        }
    }


def list_attempts(db: Session, intervention_id: str) -> list[ExamAttempt]:
    return db.scalars(
        select(ExamAttempt)
        .where(ExamAttempt.intervention_id == intervention_id, ExamAttempt.is_demo.is_(False), ExamAttempt.is_deleted.is_(False))
        .order_by(ExamAttempt.submitted_at.asc())
    ).all()
