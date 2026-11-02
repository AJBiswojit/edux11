"""Canonical examination workflow: questions → papers → publish → attempts → scoring."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.models.assessment import (
    AiPaperShare,
    Paper,
    PaperQuestion,
    PaperShare,
    Question,
    QuestionGeneration,
    QuestionGenerationItem,
    QuestionStudioSession,
    QuestionVersion,
)
from app.models.capabilities import MicroAssessment, MicroAssessmentQuestion
from app.models.catalog import Batch, Chapter, Course, Department, Program, Subject, Topic
from app.models.exams import ExamAttempt, ExamQuestionAttempt, ExamSitting, SubmissionJob
from app.models.identity import User
from app.models.people import FacultyProfile, StudentProfile
from app.services.exam_family import normalize_exam_family as canonical_exam_family
from app.services.seed import issue_tokens

STATUS_DRAFT = "draft"
STATUS_PUBLISHED = "published"
STATUS_ARCHIVED = "archived"
LETTER = "ABCD"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def parse_json(raw: str | None, default: Any = None) -> Any:
    if not raw:
        return {} if default is None else default
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {} if default is None else default


def normalize_exam_mode(raw: Any) -> str | None:
    if raw is None or raw == "":
        return None
    value = str(raw).strip().lower()
    if value in {"university", "uni"}:
        return "university"
    if value in {"competitive"}:
        return "competitive"
    return None


def normalize_exam_family(raw: Any, *, mode: str | None = None) -> str | None:
    if mode == "university":
        return None
    family = canonical_exam_family(raw)
    return family.lower() if family else None


def paper_mode_family(paper: Paper) -> tuple[str, str | None]:
    """Identity from the paper's family first; a JEE/NEET family is competitive even if exam_mode was stored as university."""
    family = normalize_exam_family(getattr(paper, "exam_family", None))
    if family:
        return "competitive", family
    mode = normalize_exam_mode(getattr(paper, "exam_mode", None)) or "university"
    return mode, None


def student_enrolled_family(db: Session, user: User) -> str | None:
    profile = db.get(StudentProfile, user.id)
    if not profile:
        return None
    if profile.batch_id:
        batch = db.get(Batch, profile.batch_id)
        family = canonical_exam_family(batch.exam_family) if batch else None
        if family:
            return family
    if profile.program_id:
        program = db.get(Program, profile.program_id)
        if program:
            return (
                canonical_exam_family(program.code)
                or canonical_exam_family(program.name)
                or canonical_exam_family(program.degree_type)
            )
    return None


def paper_visible_to_student(paper: Paper, enrolled_family: str | None) -> bool:
    if not enrolled_family:
        return True
    paper_family = canonical_exam_family(paper.exam_family) or canonical_exam_family(getattr(paper, "title", None))
    return paper_family == enrolled_family


def title_domain(mode: str | None) -> str:
    return "Competitive" if mode == "competitive" else "University"


def title_family(family: str | None) -> str | None:
    if family == "jee":
        return "JEE"
    if family == "neet":
        return "NEET"
    return None


def title_status(raw: str | None) -> str:
    mapping = {STATUS_DRAFT: "Draft", STATUS_PUBLISHED: "Published", STATUS_ARCHIVED: "Archived"}
    key = (raw or STATUS_DRAFT).lower()
    return mapping.get(key, (raw or "Draft").title())


def title_type(q_type: str | None) -> str:
    value = (q_type or "mcq").lower().replace("-", "_").replace(" ", "_")
    if value == "mcq":
        return "MCQ"
    if value in {"fill_in_the_blank", "fill_in_blank", "fib", "numerical", "numeric", "integer"} or "fill_in" in value:
        return "Fill in the Blank"
    return value.upper()


def is_fill_in_blank_type(q_type: str | None) -> bool:
    value = (q_type or "").strip().lower().replace("-", "_").replace(" ", "_")
    return value in {"fill_in_the_blank", "fill_in_blank", "fib", "numerical", "numeric", "integer"} or "fill_in" in value


def _flatten_option(opt: Any) -> str:
    """Convert a structured option record or plain string to a plain text string.

    AI-generated questions store options as ``{key, text, imageUrl}`` records.
    Used only where a plain label is required (legacy print / letter keys).
    """
    if opt is None:
        return ""
    if isinstance(opt, str):
        return opt
    if isinstance(opt, dict):
        # Prefer the human-readable text field; fall back to key then str().
        for field in ("text", "label", "value", "key"):
            v = opt.get(field)
            if v is not None and str(v).strip():
                return str(v).strip()
    return str(opt)


def _unpack_options_payload(raw: Any) -> tuple[Any, str | None]:
    """Return (choices, stem_image_url). choices may be a list or None."""
    if raw is None:
        return None, None
    if isinstance(raw, list):
        return raw, None
    data = parse_json(raw if isinstance(raw, str) else None, None)
    if isinstance(data, dict) and ("choices" in data or "stem_image_url" in data):
        choices = data.get("choices")
        stem = data.get("stem_image_url") or data.get("stemImageUrl")
        if choices is not None and not isinstance(choices, list):
            choices = []
        return choices, (str(stem).strip() if stem else None)
    if isinstance(data, list):
        return data, None
    return [], None


def parse_options(raw: Any) -> list:
    choices, _stem = _unpack_options_payload(raw)
    if choices is None:
        return []
    return choices if isinstance(choices, list) else []


def parse_options_nullable(raw: Any) -> list | None:
    """Like parse_options but preserves JSON null (fill-in-the-blank)."""
    choices, _stem = _unpack_options_payload(raw)
    if choices is None:
        return None
    return choices if isinstance(choices, list) else []


def parse_stem_image_url(raw: Any) -> str | None:
    _choices, stem = _unpack_options_payload(raw)
    return stem


def parse_options_flat(raw: Any) -> list[str]:
    """Like parse_options but always returns a flat list of plain strings."""
    return [_flatten_option(opt) for opt in parse_options(raw)]


def _delivery_option(opt: Any) -> Any:
    """Structured option for student/faculty delivery, with absolute image URLs."""
    from app.services.media_urls import public_media_url

    if opt is None:
        return None
    if isinstance(opt, str):
        return opt
    if isinstance(opt, dict):
        text = opt.get("text")
        if text is None:
            text = opt.get("label") or ""
        return {
            "key": opt.get("key"),
            "text": text if text is not None else "",
            "imageUrl": public_media_url(opt.get("image_url") or opt.get("imageUrl")),
        }
    return str(opt)


_NUMERIC_WITH_UNIT_RE = re.compile(
    r"^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:[a-zA-Z%°Ωμµ][a-zA-Z0-9%°Ωμµ/\^\-²³\s.]*)?$"
)


def _extract_numeric_token(raw: str) -> tuple[float, str] | None:
    """Extract (numeric_value, raw_number_str) from a number with optional unit suffix."""
    cleaned = raw.strip().replace(",", "")
    if not cleaned:
        return None
    try:
        return float(cleaned), cleaned
    except (TypeError, ValueError):
        pass
    m = _NUMERIC_WITH_UNIT_RE.match(cleaned)
    if m:
        token = m.group(1)
        try:
            return float(token), token
        except (TypeError, ValueError):
            return None
    return None


def grade_fill_in_blank(expected: Any, given: Any) -> bool:
    """Compare a typed blank answer: trim; numeric + unit + decimal tolerance; else casefold."""
    if expected is None or given is None:
        return False
    exp = str(expected).strip()
    got = str(given).strip()
    if not exp or not got:
        return False
    if exp.casefold() == got.casefold():
        return True

    exp_parsed = _extract_numeric_token(exp)
    got_parsed = _extract_numeric_token(got)
    if exp_parsed is not None and got_parsed is not None:
        exp_val, exp_tok = exp_parsed
        got_val, got_tok = got_parsed
        if exp_val == got_val:
            return True
        if abs(exp_val - got_val) <= 0.1 + 1e-9 or round(exp_val, 1) == round(got_val, 1):
            return True
        if "." in exp_tok and "." in got_tok and (exp_val >= 0) == (got_val >= 0):
            exp_int, exp_frac = exp_tok.lstrip("+-").split(".", 1)
            got_int, got_frac = got_tok.lstrip("+-").split(".", 1)
            exp_frac = exp_frac.rstrip("0")
            got_frac = got_frac.rstrip("0")
            if int(exp_int or "0") == int(got_int or "0") and exp_frac and got_frac:
                short_f, long_f = (exp_frac, got_frac) if len(exp_frac) <= len(got_frac) else (got_frac, exp_frac)
                if len(short_f) == 1 and len(long_f) == 2 and (long_f.startswith(short_f) or long_f.endswith(short_f)):
                    return True
        return False

    return False


def parse_answer_index(value: Any) -> int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value if value >= 0 else None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    text = str(value).strip()
    if not text:
        return None
    if len(text) == 1 and text.upper() in LETTER:
        return LETTER.index(text.upper())
    if text.isdigit():
        return int(text)
    match = re.match(r"^([A-Da-d])\b", text)
    if match:
        return LETTER.index(match.group(1).upper())
    try:
        return int(float(text))
    except (TypeError, ValueError):
        return None


def question_correct_index(question: Question) -> int | None:
    return parse_answer_index(question.correct_answer)


def grade_selected_mcq(
    selected: Any,
    key: Any,
    *,
    marks: float,
    negative_marks: float,
    negative_marking: bool,
) -> tuple[bool | None, float]:
    """Grade one MCQ the same way as submit: +marks if correct, −neg if wrong.

    Returns (None, 0.0) when the selection or key cannot be parsed — the caller
    must not treat that as a skip if the student did answer.
    """
    sel = parse_answer_index(selected)
    ans = key if isinstance(key, int) and not isinstance(key, bool) else parse_answer_index(key)
    if sel is None or ans is None:
        return None, 0.0
    if sel == ans:
        return True, float(marks)
    awarded = -abs(float(negative_marks or 0)) if negative_marking else 0.0
    return False, awarded


def is_admin(user: User) -> bool:
    return user.primary_role == "admin"


def is_faculty(user: User) -> bool:
    return user.primary_role in {"faculty", "admin"}


def assert_same_institution(user: User, institution_id: str | None) -> None:
    if not user.institution_id or user.institution_id != institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")


def can_manage_paper(user: User, paper: Paper) -> bool:
    if paper.institution_id != user.institution_id:
        return False
    if is_admin(user):
        return True
    return paper.created_by == user.id


def require_paper_manager(user: User, paper: Paper) -> None:
    if not can_manage_paper(user, paper):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this paper")


def mode_family_from_body(body: dict) -> tuple[str, str | None]:
    mode = normalize_exam_mode(body.get("domain") or body.get("mode") or body.get("examMode")) or "university"
    family = normalize_exam_family(body.get("examFamily") or body.get("exam") or body.get("exam_family"), mode=mode)
    if mode == "competitive" and family not in {"jee", "neet"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Competitive papers require examFamily JEE or NEET")
    if mode == "university":
        family = None
    return mode, family


def question_compatible(question: Question, mode: str, family: str | None) -> bool:
    q_mode = normalize_exam_mode(question.exam_mode) or "university"
    q_family = normalize_exam_family(question.exam_family, mode=q_mode)
    if q_mode != mode:
        return False
    return q_family == family


def _catalog_maps(db: Session, institution_id: str) -> tuple[dict, dict, dict]:
    subjects = {row.id: row for row in db.scalars(select(Subject).where(Subject.institution_id == institution_id, Subject.is_deleted.is_(False))).all()}
    subject_ids = list(subjects.keys())
    if subject_ids:
        chapters = {row.id: row for row in db.scalars(select(Chapter).where(Chapter.subject_id.in_(subject_ids))).all()}
        chapter_ids = list(chapters.keys())
        topics = {row.id: row for row in db.scalars(select(Topic).where(Topic.chapter_id.in_(chapter_ids))).all()} if chapter_ids else {}
    else:
        chapters = {}
        topics = {}
    return subjects, chapters, topics


def update_question(db: Session, user: User, question_id: str, body: dict) -> dict:
    """Persist edits to a single question the faculty owns.

    Updatable fields: stem (question text), difficulty, status, bloom,
    explanation, options, correct_answer.  Institution membership is
    enforced; cross-institution edits are rejected.

    Returns the serialised question in the same shape as list_question_bank.
    """
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")

    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    if question.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")

    # Only update fields that were explicitly provided in the request body.
    if "text" in body and body["text"] is not None:
        question.stem = str(body["text"]).strip()
    if "difficulty" in body and body["difficulty"] is not None:
        question.difficulty = str(body["difficulty"]).strip().lower()
    if "status" in body and body["status"] is not None:
        question.status = str(body["status"]).strip().lower()
    if "bloom" in body and body["bloom"] is not None:
        question.bloom = str(body["bloom"]).strip()
    if "explanation" in body and body["explanation"] is not None:
        question.explanation = str(body["explanation"]).strip() or None
    if "options" in body and isinstance(body["options"], list):
        question.options = json.dumps(body["options"])
    if "tags" in body and isinstance(body["tags"], list):
        # Tags are not a DB column yet — silently accept but do not persist.
        pass

    db.flush()
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    return serialize_question_faculty(question, subjects, chapters, topics)


def serialize_question_faculty(question: Question, subjects: dict, chapters: dict, topics: dict) -> dict:
    subject = subjects.get(question.subject_id)
    chapter = chapters.get(question.chapter_id) if question.chapter_id else None
    topic = topics.get(question.topic_id) if question.topic_id else None
    mode = normalize_exam_mode(question.exam_mode) or "university"
    family = normalize_exam_family(question.exam_family, mode=mode)
    return {
        "id": question.id,
        "subject": (subject.code if subject else None) or question.exam_mode,
        "subjectName": subject.name if subject else None,
        "chapter": (chapter.name if chapter else None) or question.concept,
        "topic": (topic.name if topic else None) or question.concept,
        "type": title_type(question.q_type),
        "questionType": title_type(question.q_type),
        "difficulty": (question.difficulty or "medium").title(),
        "text": question.stem,
        "question": question.stem,
        "options": parse_options(question.options),
        "status": (question.status or "approved").title(),
        "source": question.source or "Bank",
        "usage": 0,
        "bloom": (question.bloom or "Apply").title() if question.bloom else "Apply",
        "tags": [],
        "domain": title_domain(mode),
        "examFamily": title_family(family),
        "examMode": title_domain(mode),
        "isPyq": bool(question.is_pyq),
        "pyqYear": question.pyq_year,
        "marks": question.marks,
        "negativeMarks": question.negative_marks,
        "correctAnswer": question_correct_index(question),
        "explanation": question.explanation,
    }


def list_question_bank(
    db: Session,
    user: User,
    *,
    domain: str | None = None,
    exam_family: str | None = None,
    course: str | None = None,
    subject: str | None = None,
    chapter: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
    question_type: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 50,
) -> dict:
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")
    page = max(1, int(page or 1))
    limit = min(200, max(1, int(limit or 50)))

    query = select(Question).where(Question.institution_id == user.institution_id)
    if course and course not in {"All", "All courses"}:
        course_rows = db.scalars(
            select(Course).where(
                Course.institution_id == user.institution_id,
                or_(Course.code == course, Course.name == course),
            )
        ).all()
        course_ids = [row.id for row in course_rows]
        subject_ids = [row.subject_id for row in course_rows if row.subject_id]
        chapter_ids = (
            [row.id for row in db.scalars(select(Chapter).where(Chapter.course_id.in_(course_ids))).all()]
            if course_ids
            else []
        )
        if subject_ids or chapter_ids:
            query = query.where(or_(Question.subject_id.in_(subject_ids), Question.chapter_id.in_(chapter_ids)))
        else:
            query = query.where(Question.id == "__none__")
    mode = normalize_exam_mode(domain)
    family = normalize_exam_family(exam_family, mode=mode)
    if mode:
        query = query.where(Question.exam_mode == mode)
        if mode == "university":
            query = query.where(or_(Question.exam_family.is_(None), Question.exam_family == ""))
        elif family:
            query = query.where(func.lower(Question.exam_family) == family)
    elif family:
        query = query.where(func.lower(Question.exam_family) == family)

    if difficulty and difficulty.lower() not in {"mixed", "all"}:
        query = query.where(func.lower(Question.difficulty) == difficulty.strip().lower())
    if question_type and question_type.lower() not in {"all"}:
        qtype = question_type.strip().lower()
        if qtype == "mcq":
            query = query.where(func.lower(Question.q_type) == "mcq")
        else:
            query = query.where(func.lower(Question.q_type) == qtype)
    if search:
        needle = f"%{search.strip()}%"
        query = query.where(or_(Question.stem.ilike(needle), Question.concept.ilike(needle)))

    subject_ids = None
    if subject and subject not in {"All", "All subjects"}:
        rows = db.scalars(
            select(Subject).where(
                Subject.institution_id == user.institution_id,
                or_(Subject.code == subject, Subject.name == subject),
            )
        ).all()
        subject_ids = [row.id for row in rows] or ["__none__"]
        query = query.where(Question.subject_id.in_(subject_ids))

    if chapter and chapter not in {"All", "All chapters"}:
        chapter_ids = [row.id for row in db.scalars(select(Chapter).where(Chapter.name == chapter)).all()]
        if chapter_ids:
            query = query.where(or_(Question.chapter_id.in_(chapter_ids), Question.concept == chapter))
        else:
            query = query.where(Question.concept == chapter)

    if topic and topic not in {"All", "All topics"}:
        topic_ids = [row.id for row in db.scalars(select(Topic).where(Topic.name == topic)).all()]
        if topic_ids:
            query = query.where(or_(Question.topic_id.in_(topic_ids), Question.concept == topic))
        else:
            query = query.where(Question.concept == topic)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows = db.scalars(query.order_by(Question.created_at.desc()).offset((page - 1) * limit).limit(limit)).all()
    subjects, chapters, topics = _catalog_maps(db, user.institution_id)
    items = [serialize_question_faculty(row, subjects, chapters, topics) for row in rows]
    by_subject: dict[str, int] = defaultdict(int)
    for item in items:
        by_subject[item.get("subject") or "General"] += 1
    return {
        "summary": {"total": int(total), "bySubject": dict(by_subject), "page": page, "limit": limit},
        "questions": items,
        "total": int(total),
        "page": page,
        "limit": limit,
    }


def _paper_questions(db: Session, paper_id: str) -> list[PaperQuestion]:
    return db.scalars(select(PaperQuestion).where(PaperQuestion.paper_id == paper_id).order_by(PaperQuestion.sort_order)).all()


def snapshot_question(question: Question, subjects: dict, chapters: dict, topics: dict) -> dict:
    subject = subjects.get(question.subject_id)
    chapter = chapters.get(question.chapter_id) if question.chapter_id else None
    topic = topics.get(question.topic_id) if question.topic_id else None
    mode = normalize_exam_mode(question.exam_mode) or "university"
    family = normalize_exam_family(question.exam_family, mode=mode)
    choices = parse_options_nullable(question.options)
    stem_image = parse_stem_image_url(question.options)
    return {
        "id": question.id,
        "questionId": question.id,
        "stem": question.stem,
        "question": question.stem,
        "text": question.stem,
        # Keep structured options (and null for FIB) so figures survive to delivery.
        "options": [_delivery_option(o) for o in choices] if isinstance(choices, list) else None,
        "stemImageUrl": stem_image,
        "type": title_type(question.q_type),
        "difficulty": (question.difficulty or "medium").title(),
        "subject": (subject.code if subject else None) or question.concept,
        "chapter": (chapter.name if chapter else None) or question.concept,
        "topic": (topic.name if topic else None) or question.concept,
        "marks": question.marks,
        "negativeMarks": 0 if is_fill_in_blank_type(question.q_type) else question.negative_marks,
        "examMode": mode,
        "examFamily": family,
        "concept": question.concept,
        "qType": question.q_type,
        "correctValue": question.correct_answer if is_fill_in_blank_type(question.q_type) else None,
    }


def serialize_delivery_question(link: PaperQuestion, question: Question | None, *, include_answer: bool = False) -> dict:
    from app.services.media_urls import public_media_urls

    snap = parse_json(link.snapshot, {})
    q_type = snap.get("qType") or (question.q_type if question else "mcq")
    options = snap.get("options")
    stem_raw = snap.get("stemImageUrl") or snap.get("stem_image_url")
    if options is None and "options" not in snap and question:
        options = parse_options_nullable(question.options)
        if not stem_raw:
            stem_raw = parse_stem_image_url(question.options)
    # Re-resolve image URLs at read time so PUBLIC_ORIGIN / docker proxy stays correct
    # even for older snapshots that stored relative paths.
    if isinstance(options, list):
        options = [_delivery_option(o) for o in options]
    elif options is not None and not isinstance(options, list):
        options = []
    # FIB: keep null; classic MCQ: never send undefined
    if options is None and not is_fill_in_blank_type(q_type):
        options = []

    stem_urls = public_media_urls(stem_raw) if stem_raw else []
    stem = snap.get("stem") or snap.get("question") or (question.stem if question else "")
    qid = (question.id if question else None) or snap.get("questionId") or snap.get("id") or link.question_id
    payload = {
        "id": qid,
        "questionId": qid,
        "subject": snap.get("subject") or (question.concept if question else ""),
        "chapter": snap.get("chapter") or "",
        "topic": snap.get("topic") or (question.concept if question else ""),
        "difficulty": (snap.get("difficulty") or (question.difficulty if question else "medium") or "medium").title(),
        "question": stem,
        "text": stem,
        "options": options,
        "type": snap.get("type") or title_type(q_type),
        "questionType": q_type,
        "imageUrl": stem_urls[0] if stem_urls else None,
        "stemImageUrls": stem_urls,
        "marks": snap.get("marks") if snap.get("marks") is not None else (question.marks if question else 1),
        "negativeMarks": 0 if is_fill_in_blank_type(q_type) else (snap.get("negativeMarks") if snap.get("negativeMarks") is not None else (question.negative_marks if question else 0)),
    }
    if include_answer and question is not None:
        if is_fill_in_blank_type(q_type):
            payload["correctAnswer"] = question.correct_answer
            payload["correctValue"] = question.correct_answer
        else:
            payload["correctAnswer"] = question_correct_index(question)
    return payload


def _academic_context_for_attempt(question: Question | None, snap: dict, paper: Paper, subjects: dict, chapters: dict, topics: dict) -> dict:
    """Catalog names for persisted attempt rows. Never uses question.concept as the subject."""
    sub = subjects.get(question.subject_id) if question and question.subject_id else None
    ch = chapters.get(question.chapter_id) if question and question.chapter_id else None
    tp = topics.get(question.topic_id) if question and question.topic_id else None
    subject = (sub.name if sub and sub.name else None) or snap.get("subject") or ""
    chapter = (ch.name if ch and ch.name else None) or snap.get("chapter") or ""
    topic = (tp.name if tp and tp.name else None) or snap.get("topic") or ""
    return {
        "subject": subject,
        "chapter": chapter,
        "topic": topic,
        "examMode": paper.exam_mode,
        "examFamily": paper.exam_family,
    }


def serialize_paper_faculty(
    db: Session,
    paper: Paper,
    *,
    include_questions: bool = True,
    _prefetched_links: list | None = None,
    _prefetched_owner: User | None = None,
) -> dict:
    links = _prefetched_links if _prefetched_links is not None else _paper_questions(db, paper.id)
    ids = [link.question_id for link in links]
    blueprint = parse_json(paper.blueprint, {})
    owner = _prefetched_owner if _prefetched_owner is not None else (db.get(User, paper.created_by) if paper.created_by else None)
    mode = normalize_exam_mode(paper.exam_mode) or "university"
    family = normalize_exam_family(paper.exam_family, mode=mode)
    item = {
        "id": paper.id,
        "paperCode": paper.paper_code,
        "title": paper.title,
        "course": blueprint.get("course"),
        "mode": title_domain(mode),
        "domain": title_domain(mode),
        "examType": paper.paper_type or blueprint.get("examType"),
        "paperType": paper.paper_type or blueprint.get("paperType"),
        "exam": title_family(family),
        "examFamily": title_family(family),
        "subject": blueprint.get("subject"),
        "chapter": blueprint.get("chapter"),
        "topic": blueprint.get("topic"),
        "program": blueprint.get("program"),
        "faculty": owner.full_name if owner else None,
        "createdBy": paper.created_by,
        "totalMarks": paper.total_marks,
        "duration": paper.duration_minutes,
        "durationMinutes": paper.duration_minutes,
        "difficulty": blueprint.get("difficulty") or "Mixed",
        "questions": len(links),
        "selectedQuestionIds": ids,
        "status": title_status(paper.status),
        "generated": paper.created_at.date().isoformat() if paper.created_at else None,
        "created": paper.created_at.isoformat() if paper.created_at else None,
        "modified": paper.updated_at.isoformat() if paper.updated_at else None,
        "coverage": blueprint.get("coverage") or 90,
        "sets": blueprint.get("sets") or 1,
        "archived": paper.status == STATUS_ARCHIVED,
        "versions": paper.version,
        "negativeMarking": "Enabled" if paper.negative_marking else "Disabled",
        "interventionId": paper.intervention_id,
        "generationId": blueprint.get("generationId"),
        "questionList": [],
    }
    if include_questions:
        questions = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(ids))).all()} if ids else {}
        item["questionList"] = [serialize_delivery_question(link, questions.get(link.question_id), include_answer=False) for link in links]
    config = blueprint.get("config") if isinstance(blueprint.get("config"), dict) else {}
    requested = blueprint.get("requestedQuestionCount") or blueprint.get("questionCount") or config.get("count") or config.get("questionCount") or config.get("questions")
    try:
        requested_n = int(requested) if requested is not None else None
    except (TypeError, ValueError):
        requested_n = None
    actual = len(links)
    if paper.status == STATUS_ARCHIVED:
        generation_status = "FAILED"
    elif actual == 0:
        generation_status = None
    elif requested_n is not None and actual < requested_n:
        generation_status = "GENERATING"
    else:
        generation_status = "READY"
    item["generationStatus"] = generation_status
    item["requestedQuestionCount"] = requested_n
    item["generatedQuestionCount"] = actual
    item["validQuestionCount"] = actual
    item["ready"] = generation_status == "READY" and actual > 0
    return item


def list_faculty_papers(db: Session, user: User) -> list[dict]:
    """Return only AI-generated papers — those saved from the question-generation workflow.

    A paper is considered AI-generated when its blueprint JSON contains a non-null
    ``generationId`` field, which is written by ``create_sql_paper`` whenever the
    caller supplies a ``generationId`` from a completed ``QuestionGeneration`` job.

    Non-AI / manually-assembled papers (no ``generationId`` in blueprint) are
    intentionally excluded.  An empty result set is returned as ``[]`` — never
    mock data.
    """
    query = select(Paper).where(Paper.institution_id == user.institution_id)
    if not is_admin(user):
        query = query.where(Paper.created_by == user.id)
    rows = db.scalars(query.order_by(Paper.created_at.desc())).all()

    # Filter to AI-generated papers before hitting the DB again.
    ai_papers = [p for p in rows if parse_json(p.blueprint, {}).get("generationId")]
    if not ai_papers:
        return []

    paper_ids = [p.id for p in ai_papers]

    # Batch-fetch all PaperQuestion rows for all papers in one query.
    all_links: list[PaperQuestion] = db.scalars(
        select(PaperQuestion)
        .where(PaperQuestion.paper_id.in_(paper_ids))
        .order_by(PaperQuestion.paper_id, PaperQuestion.sort_order)
    ).all()
    links_by_paper: dict[str, list[PaperQuestion]] = defaultdict(list)
    for link in all_links:
        links_by_paper[link.paper_id].append(link)

    # Batch-fetch all owners in one query.
    owner_ids = list({p.created_by for p in ai_papers if p.created_by})
    owners: dict[str, User] = {}
    if owner_ids:
        for u in db.scalars(select(User).where(User.id.in_(owner_ids))).all():
            owners[u.id] = u

    results = []
    for paper in ai_papers:
        results.append(
            serialize_paper_faculty(
                db,
                paper,
                include_questions=False,
                _prefetched_links=links_by_paper.get(paper.id, []),
                _prefetched_owner=owners.get(paper.created_by) if paper.created_by else None,
            )
        )
    return results


def get_faculty_paper(db: Session, user: User, paper_id: str) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    require_paper_manager(user, paper)
    return serialize_paper_faculty(db, paper, include_questions=True)


def _load_selected_questions(db: Session, user: User, ids: list[str], mode: str, family: str | None) -> list[Question]:
    if not ids:
        return []
    unique: list[str] = []
    seen = set()
    for qid in ids:
        if not qid or qid in seen:
            continue
        seen.add(qid)
        unique.append(str(qid))
    rows = db.scalars(select(Question).where(Question.id.in_(unique), Question.institution_id == user.institution_id)).all()
    by_id = {row.id: row for row in rows}
    ordered = []
    missing = []
    incompatible = []
    for qid in unique:
        question = by_id.get(qid)
        if question is None:
            missing.append(qid)
            continue
        if not question_compatible(question, mode, family):
            incompatible.append(qid)
            continue
        ordered.append(question)
    if missing:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Unknown or unauthorized question ids: {', '.join(missing[:8])}")
    if incompatible:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Selected questions are not compatible with this paper's domain/exam family",
        )
    return ordered


def _resolve_generation_id(db: Session, user: User, generation_id: str | None) -> str | None:
    """Validate that a generationId belongs to this faculty/institution and return it.

    Returns None if generation_id is absent, blank, or does not exist in the DB —
    ensuring only real, persisted QuestionGeneration records are stamped onto papers.
    """
    if not generation_id or not str(generation_id).strip():
        return None
    gen = db.get(QuestionGeneration, str(generation_id).strip())
    if gen is None:
        return None
    if gen.institution_id != user.institution_id:
        return None
    if not is_admin(user) and gen.faculty_id != user.id:
        return None
    return gen.id


def create_sql_paper(db: Session, user: User, body: dict) -> dict:
    title = str(body.get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paper name is required.")
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")
    exists = db.scalars(
        select(Paper).where(Paper.institution_id == user.institution_id, func.lower(Paper.title) == title.lower())
    ).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, f'A paper named "{title}" already exists — choose a different name.')
    mode, family = mode_family_from_body(body)
    ids = body.get("selectedQuestionIds") or []
    if not isinstance(ids, list):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "selectedQuestionIds must be an array of question ids")
    questions = _load_selected_questions(db, user, ids, mode, family)
    duration = int(body.get("duration") or body.get("durationMinutes") or 120)
    # Fall back to the sum of question marks whenever the client omits totalMarks
    # OR sends a falsy value (0 / "" / null). An explicit 0 must never be stored
    # for a paper that has scorable questions, or the report shows 0 / 0.
    total_marks = body.get("totalMarks") or None
    if not total_marks:
        total_marks = sum(q.marks or 0 for q in questions) or 0
    negative = body.get("negativeMarking")
    if isinstance(negative, str):
        negative_marking = negative.lower() in {"enabled", "true", "yes", "1"}
    else:
        negative_marking = bool(negative) if negative is not None else mode == "competitive"
    paper = Paper(
        institution_id=user.institution_id,
        paper_code=body.get("paperCode") or f"PAPER-{uuid4().hex[:8].upper()}",
        title=title,
        exam_mode=mode,
        exam_family=family,
        paper_type=body.get("paperType") or body.get("examType"),
        duration_minutes=duration,
        total_marks=float(total_marks or 0),
        negative_marking=negative_marking,
        blueprint=json.dumps(
            {
                "course": body.get("course"),
                "subject": body.get("subject"),
                "chapter": body.get("chapter"),
                "topic": body.get("topic"),
                "program": body.get("program"),
                "difficulty": body.get("difficulty") or "Mixed",
                "examType": body.get("examType"),
                "paperType": body.get("paperType"),
                "bloomPreset": body.get("bloomPreset"),
                "weightagePreset": body.get("weightagePreset"),
                "coPreset": body.get("coPreset"),
                "pyqPreference": body.get("pyqPreference"),
                "examPattern": body.get("examPattern"),
                "coverage": body.get("coverage") or 90,
                "sets": body.get("sets") or 1,
                "config": body.get("config"),
                "questionCount": body.get("questions") or body.get("questionCount") or len(questions),
                "requestedQuestionCount": body.get("requestedQuestionCount") or body.get("questions") or body.get("questionCount") or len(questions),
                # AI-generation provenance: set when paper is assembled from a QuestionGeneration
                # job.  Absent (None) means a manually-created / non-AI paper — those are excluded
                # from the Paper Library by list_faculty_papers().
                "generationId": _resolve_generation_id(db, user, body.get("generationId")),
            }
        ),
        status=STATUS_DRAFT,
        version=1,
        intervention_id=body.get("interventionId"),
        created_by=user.id,
    )
    try:
        db.add(paper)
        db.flush()
        subjects, chapters, topics = _catalog_maps(db, user.institution_id)
        for index, question in enumerate(questions, start=1):
            db.add(
                PaperQuestion(
                    paper_id=paper.id,
                    question_id=question.id,
                    sort_order=index,
                    marks_override=None,
                    snapshot=json.dumps(snapshot_question(question, subjects, chapters, topics)),
                )
            )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    db.refresh(paper)
    return {"ok": True, "paper": serialize_paper_faculty(db, paper)}


def _attempts_for_paper(db: Session, paper_id: str) -> list[ExamAttempt]:
    sitting_ids = list(db.scalars(select(ExamSitting.id).where(ExamSitting.paper_id == paper_id)))
    clauses = [ExamAttempt.exam_id == paper_id]
    if sitting_ids:
        clauses.append(ExamAttempt.sitting_id.in_(sitting_ids))
    return list(db.scalars(select(ExamAttempt).where(or_(*clauses))).all())


def _delete_paper_runtime(db: Session, paper_id: str) -> set[str]:
    """Remove sittings, attempts, marks, shares, and queued submissions for one paper.

    Returns student ids whose DNA snapshots must be rebuilt from remaining exams.
    """
    attempts = _attempts_for_paper(db, paper_id)
    affected_students = {a.student_id for a in attempts}
    attempt_ids = [a.id for a in attempts]
    if attempt_ids:
        db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id.in_(attempt_ids)).delete(synchronize_session=False)
        db.query(ExamAttempt).filter(ExamAttempt.id.in_(attempt_ids)).delete(synchronize_session=False)
    db.query(SubmissionJob).filter(SubmissionJob.exam_id == paper_id).delete(synchronize_session=False)
    db.query(ExamSitting).filter(ExamSitting.paper_id == paper_id).delete(synchronize_session=False)
    db.query(PaperShare).filter(PaperShare.paper_id == paper_id).delete(synchronize_session=False)
    return affected_students


def _delete_unused_generations(db: Session, generation_ids: set[str]) -> None:
    """Drop generation jobs that nothing else still points at."""
    for gid in {g for g in generation_ids if g}:
        if db.query(QuestionGenerationItem).filter(QuestionGenerationItem.generation_id == gid).count():
            continue
        if db.query(MicroAssessment).filter(MicroAssessment.generation_id == gid).count():
            continue
        if db.query(QuestionStudioSession).filter(QuestionStudioSession.settings.contains(gid)).count():
            continue
        db.query(QuestionGeneration).filter(QuestionGeneration.id == gid).delete(synchronize_session=False)


def _purge_paper_owned_questions(db: Session, paper: Paper, question_ids: list[str]) -> None:
    """Delete generated questions that only this paper used.

    Bank questions and questions still referenced by other papers or
    micro-assessments are left untouched so other exams keep their content
    and KPIs.
    """
    if not question_ids:
        return
    still_on_papers = set(
        db.scalars(select(PaperQuestion.question_id).where(PaperQuestion.question_id.in_(question_ids))).all()
    )
    still_on_micro = set(
        db.scalars(
            select(MicroAssessmentQuestion.question_id).where(MicroAssessmentQuestion.question_id.in_(question_ids))
        ).all()
    )
    candidates = set(question_ids) - still_on_papers - still_on_micro
    if not candidates:
        return
    owned = set(
        db.scalars(select(Question.id).where(Question.id.in_(candidates), Question.source == "ai")).all()
    )
    if not owned:
        return

    generation_ids = set(
        db.scalars(
            select(QuestionGenerationItem.generation_id).where(QuestionGenerationItem.question_id.in_(owned))
        ).all()
    )
    blueprint_gid = parse_json(paper.blueprint, {}).get("generationId")
    if blueprint_gid:
        generation_ids.add(str(blueprint_gid))

    # Generation-item and version rows must go first — they FK onto questions.
    db.query(QuestionGenerationItem).filter(QuestionGenerationItem.question_id.in_(owned)).delete(synchronize_session=False)
    db.query(QuestionVersion).filter(QuestionVersion.question_id.in_(owned)).delete(synchronize_session=False)
    db.query(Question).filter(Question.id.in_(owned)).delete(synchronize_session=False)
    _delete_unused_generations(db, generation_ids)


def _invalidate_exam_aggregates(user: User) -> None:
    """Drop cached faculty/admin dashboards so remaining-exam KPIs recompute."""
    try:
        from app.services.faculty_runtime import invalidate_faculty_intelligence_cache
        invalidate_faculty_intelligence_cache(user.institution_id)
    except Exception:
        pass
    try:
        from app.services.admin_intel_cache import invalidate_institution
        invalidate_institution(user.institution_id)
    except Exception:
        pass


def delete_sql_paper(db: Session, user: User, paper_id: str) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        from app.models.ai_papers import AiGeneratedPaper, AiGeneratedPaperQuestion
        ai_paper = db.get(AiGeneratedPaper, paper_id)
        if not ai_paper:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
        affected_students = _delete_paper_runtime(db, paper_id)
        db.query(AiPaperShare).filter(AiPaperShare.paper_id == paper_id).delete(synchronize_session=False)
        db.query(AiGeneratedPaperQuestion).filter(AiGeneratedPaperQuestion.paper_id == paper_id).delete(synchronize_session=False)
        db.delete(ai_paper)
        db.commit()
        _rebuild_dna_for_students(db, affected_students)
        _invalidate_exam_aggregates(user)
        return {"ok": True, "deleted": paper_id}

    require_paper_manager(user, paper)
    try:
        affected_students = _delete_paper_runtime(db, paper.id)
        question_ids = list(
            db.scalars(select(PaperQuestion.question_id).where(PaperQuestion.paper_id == paper.id))
        )
        db.query(PaperQuestion).filter(PaperQuestion.paper_id == paper.id).delete(synchronize_session=False)
        _purge_paper_owned_questions(db, paper, question_ids)
        db.query(Paper).filter(Paper.parent_paper_id == paper.id).update(
            {Paper.parent_paper_id: None}, synchronize_session=False
        )
        db.delete(paper)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    _rebuild_dna_for_students(db, affected_students)
    _invalidate_exam_aggregates(user)
    return {"ok": True, "deleted": paper_id}


def _rebuild_dna_for_students(db: Session, student_ids: set[str]) -> None:
    """Recompute StudentDnaSnapshot for each affected student after attempt deletion.

    The snapshot aggregates accuracy/timing across all attempts — deleting a paper's
    attempts makes the old snapshot stale, so we rebuild it from the remaining data.
    Errors are silently swallowed so a snapshot rebuild failure never blocks the delete.
    """
    if not student_ids:
        return
    from app.workers.intelligence import rebuild_student_dna
    from app.models.intelligence import StudentDnaSnapshot
    for sid in student_ids:
        try:
            # Drop the old snapshot rows for this student before rebuilding.
            db.query(StudentDnaSnapshot).filter(StudentDnaSnapshot.student_id == sid).delete(synchronize_session=False)
            db.commit()
            rebuild_student_dna(db, sid)
        except Exception:
            pass


def duplicate_sql_paper(db: Session, user: User, paper_id: str) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    require_paper_manager(user, paper)
    copy = Paper(
        institution_id=paper.institution_id,
        paper_code=f"PAPER-{uuid4().hex[:8].upper()}",
        title=f"{paper.title} (copy)",
        exam_mode=paper.exam_mode,
        exam_family=paper.exam_family,
        subject_id=paper.subject_id,
        course_id=paper.course_id,
        paper_type=paper.paper_type,
        duration_minutes=paper.duration_minutes,
        total_marks=paper.total_marks,
        negative_marking=paper.negative_marking,
        blueprint=paper.blueprint,
        status=STATUS_DRAFT,
        version=1,
        parent_paper_id=paper.id,
        intervention_id=paper.intervention_id,
        created_by=user.id,
    )
    db.add(copy)
    db.flush()
    for link in _paper_questions(db, paper.id):
        db.add(
            PaperQuestion(
                paper_id=copy.id,
                question_id=link.question_id,
                sort_order=link.sort_order,
                marks_override=link.marks_override,
                snapshot=link.snapshot,
            )
        )
    db.commit()
    db.refresh(copy)
    return {"ok": True, "paper": serialize_paper_faculty(db, copy, include_questions=False)}


def archive_sql_paper(db: Session, user: User, paper_id: str, archived: bool | None) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    require_paper_manager(user, paper)
    if archived is None:
        archived = paper.status != STATUS_ARCHIVED
    if archived:
        paper.status = STATUS_ARCHIVED
    elif paper.status == STATUS_ARCHIVED:
        paper.status = STATUS_DRAFT
    db.commit()
    db.refresh(paper)
    return {"ok": True, "paper": serialize_paper_faculty(db, paper, include_questions=False)}


def regenerate_sql_paper(db: Session, user: User, paper_id: str) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    require_paper_manager(user, paper)
    if paper.status == STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Published papers cannot be regenerated")
    paper.version = (paper.version or 1) + 1
    db.commit()
    db.refresh(paper)
    return {"ok": True, "paper": serialize_paper_faculty(db, paper, include_questions=False)}


def publish_sql_paper(db: Session, user: User, paper_id: str) -> dict:
    paper = db.get(Paper, paper_id)
    if not paper:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Paper not found")
    require_paper_manager(user, paper)
    if paper.status == STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Paper is already published")
    if paper.status == STATUS_ARCHIVED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Archived papers cannot be published")
    links = _paper_questions(db, paper.id)
    if not links:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paper has no questions")
    blueprint = parse_json(paper.blueprint, {})
    config = blueprint.get("config") if isinstance(blueprint.get("config"), dict) else {}
    requested = blueprint.get("requestedQuestionCount") or blueprint.get("questionCount") or config.get("count") or config.get("questionCount")
    try:
        requested_n = int(requested) if requested is not None else None
    except (TypeError, ValueError):
        requested_n = None
    if requested_n is not None and len(links) < requested_n:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Paper is incomplete: {len(links)} valid questions, {requested_n} requested",
        )
    mode = normalize_exam_mode(paper.exam_mode) or "university"
    family = normalize_exam_family(paper.exam_family, mode=mode)
    ids = [link.question_id for link in links]
    questions = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(ids))).all()}
    missing = [qid for qid in ids if qid not in questions]
    if missing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paper references questions that no longer exist")
    for question in questions.values():
        if question.institution_id != paper.institution_id or not question_compatible(question, mode, family):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paper contains questions incompatible with its domain/exam family")
    paper.status = STATUS_PUBLISHED
    db.commit()
    db.refresh(paper)
    return {"ok": True, "paper": serialize_paper_faculty(db, paper)}


def exam_type_of(paper: Paper) -> str:
    _mode, family = paper_mode_family(paper)
    return title_family(family) or "University"


def _fetch_instruction_sections(db: Session, exam_family: str | None) -> list[dict]:
    """Return ordered instruction sections from edux.exam_instruction_templates/items.
    Sections are ordered by their earliest created_at (i.e. seed insertion order).
    Returns [] if no template exists for the given exam_family.
    """
    if not exam_family:
        return []
    pattern = exam_family.lower()
    try:
        rows = db.execute(
            text(
                """
                SELECT i.section_title, i.content, i.sequence_order
                FROM edux.exam_instruction_templates t
                JOIN edux.exam_instruction_items i ON i.template_id = t.id
                WHERE t.exam_pattern = :pattern AND t.is_active = TRUE
                ORDER BY i.section_order, i.sequence_order
                """
            ),
            {"pattern": pattern},
        ).fetchall()
    except Exception:
        return []
    # Group by section_title while preserving the ORDER BY order
    sections: dict[str, list[str]] = {}
    for section_title, content, _seq in rows:
        if section_title not in sections:
            sections[section_title] = []
        sections[section_title].append(content)
    return [{"title": title, "items": items} for title, items in sections.items()]


def serialize_student_exam(db: Session, paper: Paper, *, include_questions: bool = False, include_answers: bool = False) -> dict:
    mode, family = paper_mode_family(paper)
    links = _paper_questions(db, paper.id)
    questions_payload = []
    if include_questions:
        qmap = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_([link.question_id for link in links]))).all()} if links else {}
        questions_payload = [serialize_delivery_question(link, qmap.get(link.question_id), include_answer=include_answers) for link in links]
        for q in questions_payload:
            if "correctAnswer" in q or "correct_answer" in q:
                raise RuntimeError("correctAnswer leaked into student delivery serializer")
    # Resolve faculty name and department from the paper creator
    faculty_name = None
    department_name = None
    if paper.created_by:
        owner = db.get(User, paper.created_by)
        if owner:
            faculty_name = owner.full_name
            faculty_profile = db.get(FacultyProfile, owner.id)
            if faculty_profile and faculty_profile.department_id:
                dept = db.get(Department, faculty_profile.department_id)
                department_name = dept.name if dept else None
    item = {
        "id": paper.id,
        "title": paper.title,
        "type": exam_type_of(paper),
        "category": title_domain(mode),
        "domain": title_domain(mode),
        "examFamily": title_family(family),
        "examMode": title_domain(mode),
        "status": "Upcoming",
        "paperStatus": title_status(paper.status),
        "duration": paper.duration_minutes,
        "durationMinutes": paper.duration_minutes,
        "totalMarks": paper.total_marks,
        "negativeMarking": paper.negative_marking,
        "questionCount": len(links),
        "description": "",
        "subject": parse_json(paper.blueprint, {}).get("subject"),
        "faculty": faculty_name,
        "department": department_name,
    }
    if include_questions:
        item["questions"] = questions_payload
        if questions_payload:
            item["marksPerQuestion"] = questions_payload[0].get("marks") or 0
            item["negativeMarksPerQuestion"] = questions_payload[0].get("negativeMarks") or 0
        # Attach NTA-style instruction sections from DB (jee / neet only)
        item["instructionSections"] = _fetch_instruction_sections(db, family)
    else:
        item["questions"] = len(links)
    return item


def list_published_exams(db: Session, user: User, *, include_questions: bool = False) -> dict:
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")
    papers = db.scalars(
        select(Paper)
        .where(Paper.institution_id == user.institution_id, Paper.status == STATUS_PUBLISHED)
        .order_by(Paper.created_at.desc())
    ).all()
    # One attempt per exam: keep completed exams visible but flag them so the UI
    # can lock the "Start exam" action. Re-entry is refused server-side anyway.
    attempted = _attempted_exam_ids(db, user)

    # Resumable: student has an open (submitted_at IS NULL) attempt that was
    # terminated and then resume-granted by faculty/admin.
    resumable_exam_ids: set[str] = set()
    if user.primary_role == "student":
        open_attempts = db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.student_id == user.id,
                ExamAttempt.submitted_at.is_(None),
                ExamAttempt.is_deleted.is_(False),
                ExamAttempt.terminated.is_(True),
                ExamAttempt.resume_granted.is_(True),
            )
        ).all()
        resumable_exam_ids = {a.exam_id for a in open_attempts if a.exam_id}

    enrolled_family = student_enrolled_family(db, user) if user.primary_role == "student" else None
    items = []
    for paper in papers:
        if not paper_visible_to_student(paper, enrolled_family):
            continue
        item = serialize_student_exam(db, paper, include_questions=include_questions, include_answers=False)
        item["attempted"] = paper.id in attempted
        item["resumable"] = paper.id in resumable_exam_ids
        items.append(item)
    return {"items": items, "groupLabels": {}}


def get_published_exam(db: Session, user: User, exam_id: str, *, include_questions: bool = True) -> dict:
    paper = db.get(Paper, exam_id)
    if not paper or paper.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    if paper.status != STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    if user.primary_role == "student" and not paper_visible_to_student(paper, student_enrolled_family(db, user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    exam = serialize_student_exam(db, paper, include_questions=include_questions, include_answers=False)
    exam["attempted"] = user.primary_role == "student" and _already_attempted(db, user, paper.id)
    return {"exam": exam}


def _require_student(db: Session, user: User) -> StudentProfile:
    profile = db.get(StudentProfile, user.id)
    if not profile:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student profile required")
    if profile.institution_id != user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cross-institution access is not allowed")
    return profile


def _already_attempted(db: Session, user: User, exam_id: str) -> bool:
    """A student may attempt any exam only once. True once a real (non-demo)
    attempt for this exam has been submitted. Demo runs never count."""
    return db.scalars(
        select(ExamAttempt.id).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.exam_id == exam_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ).first() is not None


def _attempted_exam_ids(db: Session, user: User) -> set[str]:
    """Set of exam ids the student has already submitted (non-demo)."""
    rows = db.scalars(
        select(ExamAttempt.exam_id).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_not(None),
        )
    ).all()
    return {r for r in rows if r}


def start_exam(db: Session, user: User, exam_id: str, *, attempt_kind: str = "practice", is_demo: bool = False) -> dict:
    profile = _require_student(db, user)
    paper = db.get(Paper, exam_id)
    if not paper or paper.institution_id != user.institution_id or paper.status != STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    if not paper_visible_to_student(paper, student_enrolled_family(db, user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    # Once an exam is completed (a real attempt submitted), block re-entry for
    # BOTH real and demo runs. A demo on a not-yet-completed exam stays allowed
    # (demo runs never mark an exam completed).
    if _already_attempted(db, user, paper.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already attempted this exam")
    existing = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.exam_id == paper.id,
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_(None),
        )
    ).first()
    exam_payload = serialize_student_exam(db, paper, include_questions=True, include_answers=False)
    if existing:
        # Pin auth to this open sitting so the 30m access token cannot expire mid-exam.
        tokens = issue_tokens(user, db, rotate_session=False)
        # Include saved interactions so a resumed exam pre-populates previous answers.
        saved_interactions = parse_json(existing.interactions, {})
        saved_timing = parse_json(existing.timing, {})
        return {
            "ok": True,
            "id": existing.id,
            "attemptId": existing.id,
            "exam": exam_payload,
            "questions": exam_payload["questions"],
            "savedInteractions": saved_interactions,
            "savedElapsedSeconds": saved_timing.get("elapsedSeconds") or 0,
            "remainingSeconds": _attempt_remaining_seconds(db, existing),
            "resumeGranted": existing.resume_granted,
            **tokens,
            "sessionExpiresAt": user.session_expires_at.isoformat() if user.session_expires_at else None,
        }
    started = utcnow()
    sitting = ExamSitting(
        institution_id=user.institution_id,
        paper_id=paper.id,
        student_id=user.id,
        attempt_kind=attempt_kind,
        started_at=started,
        expires_at=started + timedelta(minutes=paper.duration_minutes or 120),
    )
    db.add(sitting)
    db.flush()
    mode, family = paper_mode_family(paper)
    attempt = ExamAttempt(
        institution_id=user.institution_id,
        sitting_id=sitting.id,
        student_id=user.id,
        roll_no=profile.roll_no,
        batch_id=profile.batch_id,
        exam_id=paper.id,
        exam_name=paper.title,
        exam_mode=mode,
        exam_family=family,
        source="exam_agent",
        attempt_kind=attempt_kind,
        is_demo=is_demo,
        started_at=started,
        submitted_at=None,
        exam_snapshot=json.dumps({k: v for k, v in exam_payload.items() if k != "questions"}),
        timing=json.dumps({}),
        scoring=json.dumps({}),
        interactions=json.dumps({}),
        summary=json.dumps({}),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    # After the sitting exists, mint a long-lived access token for this device.
    tokens = issue_tokens(user, db, rotate_session=False)
    return {
        "ok": True,
        "id": attempt.id,
        "attemptId": attempt.id,
        "exam": exam_payload,
        "questions": exam_payload["questions"],
        **tokens,
        "sessionExpiresAt": user.session_expires_at.isoformat() if user.session_expires_at else None,
    }


def save_exam_progress(db: Session, user: User, exam_id: str, body: dict) -> dict:
    """Layer 2 durability: persist an in-progress attempt's answers server-side.

    Upserts the live ``interactions`` (and elapsed time) into the student's open
    (unsubmitted) ExamAttempt so a lost device / EC2 restart never loses work.
    Single-owner, latest-write-wins — the open attempt belongs to exactly one
    student. Never touches a submitted attempt. Returns the saved interactions so
    a fresh device with an empty localStorage can resume from the server.
    """
    profile = _require_student(db, user)
    paper = db.get(Paper, exam_id)
    if not paper or paper.institution_id != user.institution_id or paper.status != STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    if not paper_visible_to_student(paper, student_enrolled_family(db, user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")

    interactions = body.get("interactions")
    if not isinstance(interactions, dict):
        interactions = {}
    try:
        elapsed_seconds = max(0, int(body.get("elapsedSeconds") or 0))
    except (TypeError, ValueError):
        elapsed_seconds = 0

    attempt = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.exam_id == paper.id,
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_(None),
        )
    ).first()

    if attempt is None:
        # No open attempt yet (student never hit /start) — create a minimal one
        # so progress has a durable home.
        mode, family = paper_mode_family(paper)
        snapshot = {k: v for k, v in serialize_student_exam(db, paper, include_questions=False).items()}
        attempt = ExamAttempt(
            institution_id=user.institution_id,
            student_id=user.id,
            roll_no=profile.roll_no,
            batch_id=profile.batch_id,
            exam_id=paper.id,
            exam_name=paper.title,
            exam_mode=mode,
            exam_family=family,
            source="exam_agent",
            attempt_kind="practice",
            started_at=utcnow(),
            submitted_at=None,
            exam_snapshot=json.dumps(snapshot),
            timing=json.dumps({"elapsedSeconds": elapsed_seconds}),
            scoring=json.dumps({}),
            interactions=json.dumps(interactions),
            summary=json.dumps({}),
        )
        db.add(attempt)
    else:
        attempt.interactions = json.dumps(interactions)
        timing_payload = parse_json(attempt.timing, {}) or {}
        if not isinstance(timing_payload, dict):
            timing_payload = {}
        timing_payload["elapsedSeconds"] = elapsed_seconds
        attempt.timing = json.dumps(timing_payload)
    db.commit()
    db.refresh(attempt)
    return {"ok": True, "attemptId": attempt.id, "savedAt": utcnow().isoformat()}


def load_exam_progress(db: Session, user: User, exam_id: str) -> dict:
    """Return any server-saved progress for the student's open attempt.

    Used to resume on a fresh device / cleared browser where the local draft
    (Layer 1) is gone. Returns empty interactions when there is no open attempt.
    """
    _require_student(db, user)
    paper = db.get(Paper, exam_id)
    if not paper or paper.institution_id != user.institution_id or paper.status != STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    attempt = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.exam_id == paper.id,
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.submitted_at.is_(None),
        )
    ).first()
    if attempt is None:
        return {"ok": True, "hasProgress": False, "interactions": {}, "elapsedSeconds": 0}
    interactions = parse_json(attempt.interactions, {})
    elapsed = parse_json(attempt.timing, {}).get("elapsedSeconds") or 0
    return {
        "ok": True,
        "hasProgress": bool(interactions),
        "attemptId": attempt.id,
        "interactions": interactions,
        "elapsedSeconds": elapsed,
        "remainingSeconds": _attempt_remaining_seconds(db, attempt),
    }


def _extract_choice(payload: Any) -> Any:
    """Pull a chosen option / typed value out of a per-question payload.

    Shapes: ``selected`` (MCQ index), ``value`` / ``textAnswer`` (fill-in),
    ``selectedAnswer`` (canonical), or ``answer`` (legacy). A bare scalar is
    treated as the choice itself.
    """
    if isinstance(payload, dict):
        for key in ("selected", "value", "textAnswer", "selectedAnswer", "answer"):
            if key in payload and payload[key] is not None:
                return payload[key]
        return None
    return payload


def _answers_from_body(body: dict) -> dict[str, Any]:
    """Extract a {questionId: selectedIndex|typedValue} mapping from any submission shape.

    The exam-agent frontend sends answers in two forms (sometimes both):

    1. ``questionAttempts`` array — each row has ``response.selectedAnswer``
       (the canonical Phase-0 field name) or ``response.selected`` (legacy).

    2. ``interactions`` dict — keyed DIRECTLY by question ID:
       ``{ "<uuid>": { "selected": 0, "timeSpent": 45, ... } }``
       (no nested "questions" or "byQuestion" wrapper).

    Fill-in-the-blank uses ``value`` (string) instead of a numeric ``selected``.
    """
    collected: dict[str, Any] = {}

    def record(qid: Any, value: Any) -> None:
        # Only ever fill in a real choice; never let a None from one source
        # clobber a real choice recorded by another (order-independent).
        if qid is None:
            return
        key = str(qid)
        if value is None:
            collected.setdefault(key, None)
        else:
            collected[key] = value

    for row in body.get("answers") or []:
        if isinstance(row, dict):
            # Prefer explicit value for blanks when both are present.
            val = row.get("value")
            if val is None:
                val = _extract_choice(row)
            record(row.get("questionId"), val)

    for row in body.get("questionAttempts") or []:
        if not isinstance(row, dict):
            continue
        qid = row.get("questionId") or (row.get("question") or {}).get("id")
        response = row.get("response") if isinstance(row.get("response"), dict) else {}
        value = _extract_choice(response)
        if value is None:
            value = _extract_choice(row)
        record(qid, value)

    interactions = body.get("interactions") or {}
    if isinstance(interactions, dict):
        per_q = interactions.get("questions") or interactions.get("byQuestion")
        if per_q is None and interactions and all(isinstance(v, dict) for v in interactions.values()):
            # Exam-agent sends interactions keyed directly by question id:
            #   {"<qid>": {"selected": 3, "timeSpent": ...}, ...}
            # (no "questions"/"byQuestion" wrapper). Treat the top-level map as
            # the per-question payload so the chosen option reaches the scorer.
            per_q = interactions
        per_q = per_q or {}
        if isinstance(per_q, dict):
            for qid, payload in per_q.items():
                record(qid, _extract_choice(payload))
        elif isinstance(per_q, list):
            for payload in per_q:
                if isinstance(payload, dict):
                    record(payload.get("questionId"), _extract_choice(payload))
    return collected


def _payload_seconds(payload: Any) -> float | None:
    """Read dwell seconds from a timing/interaction payload. None if absent."""
    if not isinstance(payload, dict):
        return None
    for key in ("timeSpent", "seconds", "elapsedSeconds", "time"):
        raw = payload.get(key)
        if raw in (None, ""):
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue
        if value == value:  # not NaN
            return max(0.0, value)
    raw = payload.get("minutes")
    if raw in (None, ""):
        return None
    try:
        value = float(raw) * 60.0
    except (TypeError, ValueError):
        return None
    return max(0.0, value) if value == value else None


def _timings_from_body(body: dict) -> dict[str, float]:
    """Extract {questionId: timeSpentSeconds} from the same shapes as answers."""
    collected: dict[str, float] = {}

    def record(qid: Any, seconds: float | None) -> None:
        if qid is None or seconds is None:
            return
        collected[str(qid)] = seconds

    for row in body.get("questionAttempts") or []:
        if not isinstance(row, dict):
            continue
        qid = row.get("questionId") or (row.get("question") or {}).get("id")
        timing = row.get("timing") if isinstance(row.get("timing"), dict) else row
        record(qid, _payload_seconds(timing))

    interactions = body.get("interactions") or {}
    if isinstance(interactions, dict):
        per_q = interactions.get("questions") or interactions.get("byQuestion")
        if per_q is None and interactions and all(isinstance(v, dict) for v in interactions.values()):
            per_q = interactions
        per_q = per_q or {}
        if isinstance(per_q, dict):
            for qid, payload in per_q.items():
                record(qid, _payload_seconds(payload))
        elif isinstance(per_q, list):
            for payload in per_q:
                if isinstance(payload, dict):
                    record(payload.get("questionId"), _payload_seconds(payload))
    return collected


def score_paper_attempt(
    db: Session,
    paper: Paper,
    answers: dict[str, Any],
    *,
    timings: dict[str, Any] | None = None,
) -> tuple[dict, list[dict]]:
    links = _paper_questions(db, paper.id)
    ids = [link.question_id for link in links]
    questions = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(ids))).all()} if ids else {}
    subjects_map, chapters_map, topics_map = _catalog_maps(db, paper.institution_id)
    correct = incorrect = unanswered = 0
    score = 0.0
    max_score = 0.0
    negative_total = 0.0
    details: list[dict] = []
    for index, link in enumerate(links, start=1):
        question = questions.get(link.question_id)
        snap = parse_json(link.snapshot, {})
        q_type = snap.get("qType") or (question.q_type if question else "mcq")
        is_fib = is_fill_in_blank_type(q_type)
        marks = float(link.marks_override if link.marks_override is not None else (snap.get("marks") if snap.get("marks") is not None else (question.marks if question else 1)) or 0)
        raw_neg = snap.get("negativeMarks") if snap.get("negativeMarks") is not None else (question.negative_marks if question else 0)
        neg = 0.0 if is_fib else float(raw_neg or (1.0 if paper.negative_marking else 0.0))
        max_score += marks
        raw_answer = answers.get(link.question_id) if link.question_id in answers else answers.get(str(link.question_id))
        if raw_answer is None:
            raw_answer = answers.get(snap.get("id"))
        awarded = 0.0
        is_correct = None
        selected_out: Any = None

        if is_fib:
            expected = (question.correct_answer if question else None) or snap.get("correctValue")
            given = None if raw_answer is None or raw_answer == "" else raw_answer
            selected_out = None if given is None else str(given).strip()
            if selected_out is None or selected_out == "":
                unanswered += 1
                is_correct = None
            elif expected is None or str(expected).strip() == "":
                unanswered += 1
            elif grade_fill_in_blank(expected, selected_out):
                correct += 1
                awarded = marks
                is_correct = True
            else:
                incorrect += 1
                awarded = 0.0
                is_correct = False
        else:
            selected = parse_answer_index(raw_answer)
            selected_out = selected
            key = question_correct_index(question) if question else None
            if selected is None:
                unanswered += 1
                is_correct = None
            elif key is None:
                unanswered += 1
            elif selected == key:
                correct += 1
                awarded = marks
                is_correct = True
            else:
                incorrect += 1
                awarded = -neg if paper.negative_marking else 0.0
                if awarded < 0:
                    negative_total += abs(awarded)
                is_correct = False
        score += awarded
        delivery = serialize_delivery_question(link, question, include_answer=False)
        details.append(
            {
                "questionId": link.question_id,
                "questionNumber": index,
                "question": delivery,
                "academicContext": _academic_context_for_attempt(
                    question, snap, paper, subjects_map, chapters_map, topics_map
                ),
                "response": {
                    "selected": selected_out,
                    "selectedAnswer": selected_out,
                    "value": selected_out if is_fill_in_blank_type(q_type) else None,
                    "status": "skipped" if selected_out in (None, "") else "answered",
                },
                "timing": {},
                "behaviour": {},
                "evaluation": {
                    "isCorrect": is_correct,
                    "isSkipped": selected_out in (None, ""),
                    "marksAwarded": awarded,
                    "maxMarks": marks,
                    "correctAnswer": expected if is_fill_in_blank_type(q_type) else key,
                },
            }
        )
    if timings:
        for row in details:
            qid = row.get("questionId")
            spent = timings.get(qid)
            if spent is None and qid is not None:
                spent = timings.get(str(qid))
            if spent is not None:
                row["timing"] = {**(row.get("timing") or {}), "timeSpent": spent}
    # Deferred: app.exam_engine.__init__ imports program_results, which would
    # circular-import examination through admin_runtime if loaded at module import.
    from app.exam_engine.accuracy import (
        calculate_exam_accuracy,
        exam_accuracy_config_for_paper,
        questions_from_scored_details,
    )
    accuracy_result = calculate_exam_accuracy(
        questions=questions_from_scored_details(details),
        exam_config=exam_accuracy_config_for_paper(paper, details),
    )
    percentage = round((score / max_score) * 100, 2) if max_score else 0.0
    attempted = correct + incorrect
    total_q = len(links)
    attempt_rate = round((attempted / total_q * 100), 2) if total_q else 0.0
    scoring = {
        "score": round(score, 2),
        "maxScore": round(max_score, 2),
        "percentage": percentage,
        "correct": correct,
        "incorrect": incorrect,
        "unanswered": unanswered,
        "skipped": unanswered,
        "accuracy": accuracy_result["accuracy"],
        "attemptRate": attempt_rate,
        "negativeMarks": round(negative_total, 2),
        "total": total_q,
        "accuracyComponents": {
            "answerPerformance": accuracy_result["answerPerformance"],
            "difficultyPerformance": accuracy_result["difficultyPerformance"],
            "timeEfficiency": accuracy_result["timeEfficiency"],
            "questionCoverage": accuracy_result["questionCoverage"],
            "netScore": accuracy_result["netScore"],
        },
    }
    return scoring, details


def _parse_json_obj(raw: Any) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw or "{}")
    except (TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _rollup_attempt_scoring_from_rows(attempt: ExamAttempt, rows: list[ExamQuestionAttempt]) -> None:
    """Rebuild scoring/summary totals from persisted question evaluations. No deletes."""
    scoring = _parse_json_obj(attempt.scoring)
    correct = incorrect = unanswered = 0
    score = 0.0
    negative_total = 0.0
    for row in rows:
        ev = _parse_json_obj(row.evaluation)
        resp = _parse_json_obj(row.response)
        awarded = ev.get("marksAwarded")
        if awarded is None:
            awarded = ev.get("marks") or 0
        try:
            awarded_f = float(awarded)
        except (TypeError, ValueError):
            awarded_f = 0.0
        score += awarded_f
        if awarded_f < 0:
            negative_total += abs(awarded_f)
        if ev.get("isCorrect") is True:
            correct += 1
        elif ev.get("isCorrect") is False:
            incorrect += 1
        else:
            unanswered += 1
    total = len(rows) or int(scoring.get("total") or 0)
    max_score = scoring.get("maxScore") or 0
    try:
        max_score_f = float(max_score)
    except (TypeError, ValueError):
        max_score_f = 0.0
    attempted = correct + incorrect
    scoring["score"] = round(score, 2)
    scoring["correct"] = correct
    scoring["incorrect"] = incorrect
    scoring["unanswered"] = unanswered
    scoring["skipped"] = unanswered
    scoring["negativeMarks"] = round(negative_total, 2)
    scoring["percentage"] = round((score / max_score_f) * 100, 2) if max_score_f else scoring.get("percentage") or 0
    scoring["attemptRate"] = round((attempted / total) * 100, 2) if total else 0.0
    if not scoring.get("total"):
        scoring["total"] = total
    attempt.scoring = json.dumps(scoring)
    summary = _parse_json_obj(attempt.summary)
    summary["score"] = scoring["score"]
    summary["maxScore"] = scoring.get("maxScore")
    summary["pct"] = scoring["percentage"]
    summary["correct"] = correct
    summary["incorrect"] = incorrect
    summary["skipped"] = unanswered
    summary["attemptRate"] = scoring["attemptRate"]
    attempt.summary = json.dumps(summary)


def regrade_ungraded_mcq_attempts(db: Session) -> dict:
    """Grade MCQ rows left isCorrect=null once the question now has a parseable key.

    Uses the same +marks / −neg rules as submit. Updates evaluation JSON and
    attempt scoring in place. Does not delete rows or invent keys.
    """
    rows = db.execute(
        text(
            """
            SELECT eqa.id
            FROM exam_question_attempts eqa
            JOIN questions q ON q.id = eqa.question_id
            WHERE (eqa.evaluation LIKE :null_sp OR eqa.evaluation LIKE :null_tight)
              AND trim(COALESCE(q.correct_answer, '')) <> ''
            """
        ),
        {"null_sp": '%"isCorrect": null%', "null_tight": '%"isCorrect":null%'},
    ).all()
    ids = [row[0] for row in rows]
    if not ids:
        return {"rows": 0, "attempts": 0, "correct": 0, "incorrect": 0}

    qas = db.scalars(select(ExamQuestionAttempt).where(ExamQuestionAttempt.id.in_(ids))).all()
    q_ids = {qa.question_id for qa in qas if qa.question_id}
    questions = {q.id: q for q in db.scalars(select(Question).where(Question.id.in_(q_ids))).all()} if q_ids else {}
    attempt_ids = {qa.attempt_id for qa in qas}
    attempts = {a.id: a for a in db.scalars(select(ExamAttempt).where(ExamAttempt.id.in_(attempt_ids))).all()}
    paper_ids = {a.exam_id for a in attempts.values() if a.exam_id}
    papers = {p.id: p for p in db.scalars(select(Paper).where(Paper.id.in_(paper_ids))).all()} if paper_ids else {}

    n_correct = n_incorrect = n_updated = 0
    touched_attempts: set[str] = set()
    for qa in qas:
        question = questions.get(qa.question_id)
        if question is None or is_fill_in_blank_type(question.q_type):
            continue
        key = question_correct_index(question)
        if key is None:
            continue
        resp = _parse_json_obj(qa.response)
        ev = _parse_json_obj(qa.evaluation)
        if ev.get("isCorrect") is not None:
            continue
        selected = resp.get("selected")
        if selected is None:
            selected = resp.get("selectedAnswer")
            if selected is None:
                selected = resp.get("value")
        if selected in (None, ""):
            continue
        attempt = attempts.get(qa.attempt_id)
        paper = papers.get(attempt.exam_id) if attempt and attempt.exam_id else None
        negative_on = bool(paper.negative_marking) if paper is not None else (
            str(attempt.exam_mode or "").lower() == "competitive" if attempt else False
        )
        marks = ev.get("maxMarks")
        if marks is None:
            marks = question.marks
        neg = question.negative_marks
        graded, awarded = grade_selected_mcq(
            selected,
            key,
            marks=float(marks or 0),
            negative_marks=float(neg or 0),
            negative_marking=negative_on,
        )
        if graded is None:
            continue
        ev["isCorrect"] = graded
        ev["isSkipped"] = False
        ev["marksAwarded"] = awarded
        ev["maxMarks"] = float(marks or 0)
        ev["correctAnswer"] = key
        resp["status"] = "answered"
        if resp.get("selected") is None:
            resp["selected"] = selected
        qa.evaluation = json.dumps(ev)
        qa.response = json.dumps(resp)
        n_updated += 1
        touched_attempts.add(qa.attempt_id)
        if graded:
            n_correct += 1
        else:
            n_incorrect += 1

    for attempt_id in touched_attempts:
        attempt = attempts.get(attempt_id)
        if attempt is None:
            continue
        all_rows = (
            db.query(ExamQuestionAttempt)
            .filter(ExamQuestionAttempt.attempt_id == attempt_id)
            .all()
        )
        _rollup_attempt_scoring_from_rows(attempt, all_rows)

    db.flush()
    return {
        "rows": n_updated,
        "attempts": len(touched_attempts),
        "correct": n_correct,
        "incorrect": n_incorrect,
    }


def _timing_for_persist(row: dict, extra: dict, interactions: dict) -> dict:
    """Keep submitted question timing; if empty, copy dwell from interactions."""
    timing = extra.get("timing") if isinstance(extra.get("timing"), dict) else (row.get("timing") or {})
    if not isinstance(timing, dict):
        timing = {}
    has_time = any(
        timing.get(k) not in (None, "", 0, 0.0)
        for k in ("timeSpent", "seconds", "elapsedSeconds", "time", "minutes")
    )
    if has_time:
        return timing
    qid = str(row.get("questionId") or "")
    inter = None
    if isinstance(interactions, dict):
        inter = interactions.get(qid) or interactions.get(row.get("questionId"))
        if not isinstance(inter, dict):
            nested = interactions.get("questions") or interactions.get("byQuestion")
            if isinstance(nested, dict):
                inter = nested.get(qid) or nested.get(row.get("questionId"))
    if isinstance(inter, dict):
        spent = inter.get("timeSpent")
        if spent is None:
            spent = inter.get("seconds")
        if spent not in (None, "", 0, 0.0):
            merged = dict(timing)
            merged["timeSpent"] = spent
            if inter.get("firstViewedAt") and not merged.get("firstViewedAt"):
                merged["firstViewedAt"] = inter.get("firstViewedAt")
            if inter.get("lastViewedAt") and not merged.get("lastViewedAt"):
                merged["lastViewedAt"] = inter.get("lastViewedAt")
            return merged
    return timing


def _persist_question_rows(db: Session, attempt_id: str, details: list[dict], body: dict) -> None:
    incoming = {str(row.get("questionId")): row for row in (body.get("questionAttempts") or []) if isinstance(row, dict)}
    interactions = body.get("interactions") if isinstance(body.get("interactions"), dict) else {}
    db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == attempt_id).delete()

    for row in details:
        extra = incoming.get(str(row["questionId"])) or {}
        timing = _timing_for_persist(row, extra, interactions)
        behaviour = extra.get("behaviour") if isinstance(extra.get("behaviour"), dict) else row["behaviour"]
        db.add(
            ExamQuestionAttempt(
                attempt_id=attempt_id,
                question_id=row["questionId"],
                question_number=row["questionNumber"],
                question_snapshot=json.dumps(row["question"]),
                academic_context=json.dumps(row["academicContext"]),
                response=json.dumps(row["response"]),
                timing=json.dumps(timing or {}),
                behaviour=json.dumps(behaviour or {}),
                evaluation=json.dumps(row["evaluation"]),
            )

        )
   
def submit_exam_attempt(db: Session, user: User, body: dict, *, exam_id: str | None = None, attempt_id: str | None = None) -> dict:
    profile = _require_student(db, user)
    paper_id = exam_id or body.get("examId") or (body.get("exam") or {}).get("id") or (body.get("examSnapshot") or {}).get("id")
    if not paper_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "examId is required")
    paper = db.get(Paper, paper_id)
    if not paper or paper.institution_id != user.institution_id or paper.status != STATUS_PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")
    if not paper_visible_to_student(paper, student_enrolled_family(db, user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Exam not found")

    # One attempt per exam: once completed, block any further submission
    # (real or demo). Demo submissions on a not-yet-completed exam still pass,
    # since _already_attempted only counts real submitted attempts.
    if _already_attempted(db, user, paper.id):
        raise HTTPException(status.HTTP_409_CONFLICT, "You have already attempted this exam")

    attempt = None
    attempt_id = attempt_id or body.get("attemptId") or body.get("id")
    if attempt_id:
        attempt = db.get(ExamAttempt, attempt_id)
    if attempt is None:
        attempt = db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.student_id == user.id,
                ExamAttempt.exam_id == paper.id,
                ExamAttempt.is_deleted.is_(False),
                ExamAttempt.submitted_at.is_(None),
            )
        ).first()
    if attempt and attempt.student_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot access another student's attempt")
    if attempt and attempt.submitted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Attempt already submitted")

    answers = _answers_from_body(body)
    scoring, details = score_paper_attempt(db, paper, answers, timings=_timings_from_body(body))
    submitted = utcnow()
    started = body.get("startedAt")
    try:
        started_at = datetime.fromisoformat(str(started).replace("Z", "+00:00")) if started else (attempt.started_at if attempt else submitted)
    except ValueError:
        started_at = attempt.started_at if attempt else submitted
    mode, family = paper_mode_family(paper)
    snapshot = {k: v for k, v in serialize_student_exam(db, paper, include_questions=False).items()}
    summary = {
        "score": scoring["score"],
        "maxScore": scoring["maxScore"],
        "pct": scoring["percentage"],
        "accuracy": scoring["accuracy"],
        "attemptRate": scoring.get("attemptRate", 0.0),
        "correct": scoring["correct"],
        "incorrect": scoring["incorrect"],
        "skipped": scoring["unanswered"],
    }
    # Proctoring: tab-switch/leave-window violations recorded by the live runner.
    try:
        proctor_violations = max(0, int(body.get("proctorViolations") or 0))
    except (TypeError, ValueError):
        proctor_violations = 0
    terminated = bool(body.get("terminated"))
    termination_reason = (str(body.get("terminationReason")) if body.get("terminationReason") else None) if terminated else None
    if attempt is None:
        attempt = ExamAttempt(
            institution_id=user.institution_id,
            student_id=user.id,
            roll_no=profile.roll_no,
            batch_id=profile.batch_id,
            exam_id=paper.id,
            exam_name=paper.title,
            exam_mode=mode,
            exam_family=family,
            source="exam_agent",
            attempt_kind=body.get("attemptKind") or ("demo" if body.get("isDemo") else "practice"),
            is_demo=bool(body.get("isDemo")),
            intervention_id=body.get("interventionId"),
            started_at=started_at,
            submitted_at=submitted,
            proctor_violations=proctor_violations,
            terminated=terminated,
            termination_reason=termination_reason,
            exam_snapshot=json.dumps(snapshot),
            timing=json.dumps(body.get("timing") or {"elapsedSeconds": body.get("elapsedSeconds") or 0}),
            scoring=json.dumps(scoring),
            interactions=json.dumps(body.get("interactions") or {}),
            summary=json.dumps(summary),
        )
        db.add(attempt)
        db.flush()
    else:
        if attempt.student_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You cannot access another student's attempt")
        attempt.submitted_at = submitted
        attempt.scoring = json.dumps(scoring)
        attempt.summary = json.dumps(summary)
        if profile.batch_id:
            attempt.batch_id = profile.batch_id
        timing_payload = body.get("timing") or parse_json(attempt.timing, {}) or {}
        if not isinstance(timing_payload, dict):
            timing_payload = {}
        if body.get("elapsedSeconds") is not None:
            timing_payload = {**timing_payload, "elapsedSeconds": body.get("elapsedSeconds")}
        attempt.timing = json.dumps(timing_payload)
        attempt.interactions = json.dumps(body.get("interactions") or parse_json(attempt.interactions, {}))
        attempt.exam_snapshot = json.dumps(snapshot)
        attempt.is_demo = bool(body.get("isDemo")) if "isDemo" in body else attempt.is_demo
        # Keep the highest violation count seen and never clear a termination.
        attempt.proctor_violations = max(attempt.proctor_violations or 0, proctor_violations)
        if terminated:
            attempt.terminated = True
            attempt.termination_reason = termination_reason
    _persist_question_rows(db, attempt.id, details, body)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    from app.workers.intelligence import rebuild_student_dna

    rebuild_student_dna(db, user.id)
    saved = db.get(ExamAttempt, attempt.id)
    from app.services.spa_exams import attempt_to_dict, pending_attempt_payload, results_pending

    # The attempt is fully saved above. But if the exam's full duration hasn't
    # elapsed yet, withhold the result from an early finisher — reveal only the
    # unlock time. Faculty/admin and demo runs are never gated here.
    if user.primary_role == "student" and results_pending(saved, db):
        return {"ok": True, "id": saved.id, "attempt": pending_attempt_payload(saved, db)}

    result = {"ok": True, "id": saved.id, "attempt": attempt_to_dict(saved, db)}
    # Never echo client-supplied score as authority.
    if result["attempt"].get("scoring") != scoring:
        result["attempt"]["scoring"] = scoring
        result["attempt"]["summary"] = summary
    return result


def strip_correct_from_mapping(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: strip_correct_from_mapping(v) for k, v in value.items() if k not in {"correctAnswer", "correct_answer", "answer_key", "correct_option"}}
    if isinstance(value, list):
        return [strip_correct_from_mapping(v) for v in value]
    return value


# ---------------------------------------------------------------------------
# Faculty-controlled exam resume
# ---------------------------------------------------------------------------

def _attempt_remaining_seconds(db: Session, attempt: ExamAttempt) -> int:
    """Compute seconds remaining for an attempt. Prefers ExamSitting.expires_at
    (authoritative after a resume grant), falls back to duration - elapsed."""
    if attempt.sitting_id:
        sitting = db.get(ExamSitting, attempt.sitting_id)
        if sitting and sitting.expires_at:
            return max(0, int((sitting.expires_at - utcnow()).total_seconds()))
    paper = db.get(Paper, attempt.exam_id) if attempt.exam_id else None
    total = (paper.duration_minutes * 60) if paper and paper.duration_minutes else 7200
    elapsed = (parse_json(attempt.timing, {}).get("elapsedSeconds")) or 0
    return max(0, total - int(elapsed))


def _student_name(db: Session, student_id: str) -> str:
    u = db.get(User, student_id) if student_id else None
    return u.full_name if u and u.full_name else "Unknown"


def grant_exam_resume(db: Session, faculty_user: User, attempt_id: str) -> dict:
    """Faculty reopens a terminated exam attempt so the student can resume.

    Clears ``submitted_at`` so ``start_exam()`` returns the existing attempt.
    The student gets their leftover time (duration - elapsed when terminated).
    """
    attempt = db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    if attempt.institution_id != faculty_user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not in your institution")
    if not attempt.terminated:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This attempt was not terminated — only terminated exams can be resumed")
    if attempt.submitted_at is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Attempt is already open (not submitted)")
    if attempt.resume_granted:
        raise HTTPException(status.HTTP_409_CONFLICT, "Resume has already been granted for this attempt")

    remaining = _attempt_remaining_seconds(db, attempt)
    if remaining <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No time remaining — the student's exam time was fully used before termination")

    # Reopen the attempt: clear submitted_at so start_exam() returns it.
    attempt.submitted_at = None
    attempt.resume_granted = True
    attempt.resume_granted_by = faculty_user.id
    attempt.resume_granted_at = utcnow()

    # Update the sitting's expires_at so the timer is correct on resume.
    if attempt.sitting_id:
        sitting = db.get(ExamSitting, attempt.sitting_id)
        if sitting:
            sitting.expires_at = utcnow() + timedelta(seconds=remaining)

    db.commit()
    db.refresh(attempt)

    return {
        "ok": True,
        "attemptId": attempt.id,
        "studentName": _student_name(db, attempt.student_id),
        "examName": attempt.exam_name,
        "remainingSeconds": remaining,
        "resumeGrantedAt": attempt.resume_granted_at.isoformat() if attempt.resume_granted_at else None,
    }


# ---------------------------------------------------------------------------
# Admin variants — same as faculty resume but institution check uses admin role
# ---------------------------------------------------------------------------

def admin_grant_exam_resume(db: Session, admin_user: User, attempt_id: str) -> dict:
    """Admin reopens a terminated exam attempt so the student can resume.

    Identical to ``grant_exam_resume`` but accepts admin users (not just faculty).
    The student resumes with their leftover time and all previous answers intact.
    """
    # Reuse the faculty implementation — it only checks institution membership,
    # which admins also satisfy.
    return grant_exam_resume(db, admin_user, attempt_id)


def admin_restart_exam(db: Session, admin_user: User, attempt_id: str) -> dict:
    """Admin lets a student restart a terminated exam completely from scratch.

    The old terminated attempt is soft-deleted so it no longer blocks re-entry
    (``_already_attempted`` checks ``is_deleted``).  The student must call the
    normal ``POST /student/exams/{exam_id}/start`` to create the fresh attempt.
    """
    attempt = db.get(ExamAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Attempt not found")
    if attempt.institution_id != admin_user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not in your institution")
    if not attempt.terminated:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "This attempt was not terminated — only terminated exams can be restarted",
        )
    if attempt.is_deleted:
        raise HTTPException(status.HTTP_409_CONFLICT, "Attempt is already deleted")

    exam_id = attempt.exam_id
    exam_name = attempt.exam_name
    student_name = _student_name(db, attempt.student_id)
    sitting_id = attempt.sitting_id

    # Hard-delete child question rows first (FK constraint).
    db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == attempt.id).delete(synchronize_session=False)

    # Hard-delete the attempt itself.
    db.delete(attempt)

    # Hard-delete the sitting if it exists (no other attempts reference it).
    if sitting_id:
        sitting = db.get(ExamSitting, sitting_id)
        if sitting:
            db.delete(sitting)

    db.commit()

    return {
        "ok": True,
        "attemptId": attempt_id,
        "studentName": student_name,
        "examId": exam_id,
        "examName": exam_name,
        "message": "Attempt permanently removed. The student can now start the exam from scratch.",
    }


def admin_list_terminated_attempts(db: Session, admin_user: User) -> list[dict]:
    """Return all terminated exam attempts for the admin's institution."""
    return list_terminated_attempts(db, admin_user)


def list_terminated_attempts(db: Session, faculty_user: User) -> list[dict]:
    """Return all terminated exam attempts for students in the faculty's institution."""
    # Exclude attempts belonging to soft-deleted student profiles.
    deleted_student_ids = {
        p.user_id
        for p in db.scalars(
            select(StudentProfile).where(
                StudentProfile.institution_id == faculty_user.institution_id,
                StudentProfile.is_deleted.is_(True),
            )
        ).all()
    }
    rows = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.institution_id == faculty_user.institution_id,
            ExamAttempt.terminated.is_(True),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.student_id.not_in(deleted_student_ids) if deleted_student_ids else True,
        ).order_by(ExamAttempt.submitted_at.desc().nullslast())
    ).all()

    results = []
    for attempt in rows:
        interactions = parse_json(attempt.interactions, {})
        answered = sum(1 for v in interactions.values() if isinstance(v, dict) and v.get("selected") is not None)
        snapshot = parse_json(attempt.exam_snapshot, {})

        results.append({
            "attemptId": attempt.id,
            "studentId": attempt.student_id,
            "studentName": _student_name(db, attempt.student_id),
            "rollNo": attempt.roll_no,
            "examId": attempt.exam_id,
            "examName": attempt.exam_name,
            "examMode": attempt.exam_mode,
            "terminationReason": attempt.termination_reason,
            "terminatedAt": attempt.submitted_at.isoformat() if attempt.submitted_at else None,
            "startedAt": attempt.started_at.isoformat() if attempt.started_at else None,
            "elapsedSeconds": parse_json(attempt.timing, {}).get("elapsedSeconds") or 0,
            "remainingSeconds": _attempt_remaining_seconds(db, attempt),
            "answeredQuestions": answered,
            "totalQuestions": snapshot.get("totalQuestions") or snapshot.get("questionCount") or 0,
            "proctorViolations": attempt.proctor_violations,
            "resumeGranted": attempt.resume_granted,
            "resumeGrantedAt": attempt.resume_granted_at.isoformat() if attempt.resume_granted_at else None,
        })
    return results


def get_active_exam(db: Session, user: User) -> dict:
    """Return the student's active (unsubmitted) exam attempt for cross-device resume."""
    _require_student(db, user)
    attempt = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == user.id,
            ExamAttempt.submitted_at.is_(None),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
        )
    ).first()

    if attempt is None:
        return {"hasActiveExam": False}

    return {
        "hasActiveExam": True,
        "attemptId": attempt.id,
        "examId": attempt.exam_id,
        "examName": attempt.exam_name,
        "remainingSeconds": _attempt_remaining_seconds(db, attempt),
        "resumeGranted": attempt.resume_granted,
    }


# ---------------------------------------------------------------------------
# Paper merge — combine subject-wise papers into a single examination paper
# ---------------------------------------------------------------------------

def merge_papers(db: Session, user: User, body: dict) -> dict:
    """Merge multiple subject-wise papers into a single exam paper.

    Input: { title, paperIds, duration, totalMarks, negativeMarking, examMode, examFamily }
    Creates a new Paper in draft status with all questions from the source papers,
    maintaining subject-group ordering. Source papers can be in any non-archived status.
    """
    title = str(body.get("title") or "").strip()
    if not title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paper title is required")
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")

    paper_ids = body.get("paperIds") or []
    if not isinstance(paper_ids, list) or len(paper_ids) < 2:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "At least 2 paper IDs are required to merge")

    # Check title uniqueness
    exists = db.scalars(
        select(Paper).where(Paper.institution_id == user.institution_id, func.lower(Paper.title) == title.lower())
    ).first()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, f'A paper named "{title}" already exists')

    # Load and validate all source papers
    source_papers = []
    for pid in paper_ids:
        p = db.get(Paper, pid)
        if not p:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Paper {pid} not found")
        if p.institution_id != user.institution_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Paper {pid} is not in your institution")
        source_papers.append(p)

    # Collect all questions from source papers in order
    all_pqs: list[PaperQuestion] = []
    source_meta = []
    for p in source_papers:
        pqs = db.scalars(
            select(PaperQuestion).where(PaperQuestion.paper_id == p.id).order_by(PaperQuestion.sort_order)
        ).all()
        all_pqs.extend(pqs)
        bp = parse_json(p.blueprint, {})
        source_meta.append({
            "id": p.id,
            "title": p.title,
            "subject": bp.get("subject"),
            "questionCount": len(pqs),
        })

    if not all_pqs:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No questions found in the selected papers")

    mode, family = mode_family_from_body(body)
    if not mode:
        mode = source_papers[0].exam_mode
    if not family:
        family = source_papers[0].exam_family

    duration = int(body.get("duration") or body.get("durationMinutes") or sum(p.duration_minutes or 0 for p in source_papers) or 180)
    total_marks = body.get("totalMarks") or sum(p.total_marks or 0 for p in source_papers) or 0
    negative = body.get("negativeMarking")
    if isinstance(negative, str):
        negative_marking = negative.lower() in {"enabled", "true", "yes", "1"}
    elif negative is not None:
        negative_marking = bool(negative)
    else:
        negative_marking = any(p.negative_marking for p in source_papers)

    merged = Paper(
        institution_id=user.institution_id,
        paper_code=f"MERGED-{uuid4().hex[:8].upper()}",
        title=title,
        exam_mode=mode,
        exam_family=family,
        duration_minutes=duration,
        total_marks=float(total_marks),
        negative_marking=negative_marking,
        blueprint=json.dumps({
            "merged": True,
            "generationId": "merged",
            "sourcePapers": source_meta,
            "questionCount": len(all_pqs),
        }),
        status=STATUS_DRAFT,
        version=1,
        created_by=user.id,
    )
    db.add(merged)
    db.flush()

    # Copy questions into the merged paper with sequential sort_order
    for idx, pq in enumerate(all_pqs):
        db.add(PaperQuestion(
            paper_id=merged.id,
            question_id=pq.question_id,
            sort_order=idx + 1,
            marks_override=pq.marks_override,
            snapshot=pq.snapshot,
        ))

    db.commit()
    db.refresh(merged)

    return {
        "ok": True,
        "paper": {
            "id": merged.id,
            "title": merged.title,
            "status": title_status(merged.status),
            "questionCount": len(all_pqs),
            "duration": merged.duration_minutes,
            "totalMarks": merged.total_marks,
            "sourcePapers": source_meta,
        },
    }


def list_published_papers(db: Session, user: User) -> list[dict]:
    """List all non-archived papers in the institution (for the merge wizard)."""
    if not user.institution_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Institution required")
    rows = db.scalars(
        select(Paper).where(
            Paper.institution_id == user.institution_id,
            Paper.status != STATUS_ARCHIVED,
        ).order_by(Paper.created_at.desc())
    ).all()

    if not rows:
        return []

    paper_ids = [p.id for p in rows]

    # Batch-fetch question counts for all papers in one query.
    counts: dict[str, int] = dict(
        db.execute(
            select(PaperQuestion.paper_id, func.count())
            .where(PaperQuestion.paper_id.in_(paper_ids))
            .group_by(PaperQuestion.paper_id)
        ).all()
    )

    # Batch-fetch all owners in one query.
    owner_ids = list({p.created_by for p in rows if p.created_by})
    owners: dict[str, User] = {}
    if owner_ids:
        for u in db.scalars(select(User).where(User.id.in_(owner_ids))).all():
            owners[u.id] = u

    results = []
    for p in rows:
        bp = parse_json(p.blueprint, {})
        creator = owners.get(p.created_by) if p.created_by else None
        results.append({
            "id": p.id,
            "title": p.title,
            "subject": bp.get("subject"),
            "examMode": p.exam_mode,
            "examFamily": p.exam_family,
            "questionCount": counts.get(p.id, 0),
            "questions": counts.get(p.id, 0),
            "duration": p.duration_minutes,
            "totalMarks": p.total_marks,
            "negativeMarking": p.negative_marking,
            "createdBy": creator.full_name if creator and creator.full_name else None,
            "createdAt": p.created_at.isoformat() if p.created_at else None,
            "status": p.status,
            "isMerged": bp.get("merged", False),
        })
    return results

