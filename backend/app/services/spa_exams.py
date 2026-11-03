"""Exam-agent, analysis, and practice helpers for the SPA contract."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.people import StudentProfile
from app.services.exam_family import normalize_exam_family
from app.services.mistake_classifier import classify_mistake_from_qa
from app.services.nta_rank import (
    NtaCandidate,
    bucket_subject,
    competition_ranks_from_scores,
    jee_air_ranks,
    jee_subject_percentiles,
    nta_percentile,
    neet_air_ranks,
)
from app.services.spa_payloads import payload


def _results_available_at(row: ExamAttempt, db: Session | None = None) -> datetime | None:
    """When a student may see this attempt's result: the end of the timed exam
    window (the sitting's expiry = started_at + full duration).

    Only attempts taken through a real timed sitting (started via /start) are
    gated. Returns None when there is no timed sitting, so ad-hoc submissions are
    never withheld.
    """
    if not row.sitting_id or db is None:
        return None
    from app.models.exams import ExamSitting

    sitting = db.get(ExamSitting, row.sitting_id)
    if sitting is None or sitting.expires_at is None:
        return None
    expires = sitting.expires_at if sitting.expires_at.tzinfo else sitting.expires_at.replace(tzinfo=timezone.utc)
    return expires


def results_pending(row: ExamAttempt, db: Session | None = None) -> bool:
    """True while a real (non-demo) attempt's result is still time-locked."""
    if row.is_demo:
        return False
    available_at = _results_available_at(row, db)
    if available_at is None:
        return False
    return datetime.now(timezone.utc) < available_at


def visible_attempts(rows: list[ExamAttempt], db: Session | None = None) -> list[ExamAttempt]:
    """Filter out attempts whose results are still time-locked.

    Use this in every student-facing aggregate/analytics view (dashboard,
    performance, exam-analysis options, intelligence) so a time-locked result
    never leaks its score/summary through a secondary endpoint.
    """
    return [r for r in rows if not results_pending(r, db)]


def pending_attempt_payload(row: ExamAttempt, db: Session | None = None) -> dict:
    """Slim, result-free payload returned while an attempt is time-locked.

    Carries identity + when the result unlocks, but never the score, summary,
    interactions or per-question data.
    """
    available_at = _results_available_at(row, db)
    return {
        "id": row.id,
        "studentId": row.student_id,
        "examId": row.exam_id,
        "examName": row.exam_name,
        "examTitle": row.exam_name,
        "submittedAt": row.submitted_at.isoformat() if row.submitted_at else None,
        "resultsPending": True,
        "resultsAvailableAt": available_at.isoformat() if available_at else None,
    }


def exam_catalogue(db: Session | None = None) -> list[dict]:
    from app.db.session import current_db
    from app.services.live_catalog import exam_agent_bundle

    session = db or current_db()
    if session is not None:
        return exam_agent_bundle(session).get("items") or []
    return payload("exam-agent-exams").get("items") or []


def exam_by_id(exam_id: str) -> dict | None:
    for item in exam_catalogue():
        if item.get("id") == exam_id:
            return item
    return None


def attempt_to_dict(row: ExamAttempt, db: Session, *, include_questions: bool = True) -> dict:
    scoring = json.loads(row.scoring or "{}")
    timing = json.loads(row.timing or "{}")
    snapshot = json.loads(row.exam_snapshot or "{}")
    interactions = json.loads(row.interactions or "{}")
    summary = json.loads(row.summary or "{}") if row.summary else {}
    family = normalize_exam_family(row.exam_family) or normalize_exam_family(
        snapshot.get("examFamily") or snapshot.get("type")
    )
    if family:
        exam_mode = "Competitive"
    else:
        exam_mode = (row.exam_mode or "university").title()
        if exam_mode.lower() == "competitive":
            exam_mode = "Competitive"
        else:
            exam_mode = "University"
    out: dict[str, Any] = {
        "id": row.id,
        "studentId": row.student_id,
        "roll": row.roll_no,
        "examId": row.exam_id,
        "examName": row.exam_name,
        "examTitle": row.exam_name,
        "shortTitle": snapshot.get("shortTitle") or row.exam_name,
        "examMode": exam_mode,
        "examFamily": family,
        "examType": snapshot.get("type") or exam_mode,
        "category": snapshot.get("category") or exam_mode,
        "subject": snapshot.get("subject"),
        "mode": "demo" if row.is_demo else (row.attempt_kind or "manual"),
        "source": row.source or "exam-agent",
        "attemptKind": row.attempt_kind,
        "isDemo": row.is_demo,
        "startedAt": row.started_at.isoformat() if row.started_at else None,
        "submittedAt": row.submitted_at.isoformat() if row.submitted_at else None,
        "completedAt": row.submitted_at.isoformat() if row.submitted_at else None,
        "proctorViolations": getattr(row, "proctor_violations", 0) or 0,
        "terminated": bool(getattr(row, "terminated", False)),
        "terminationReason": getattr(row, "termination_reason", None),
        "batchId": row.batch_id,
        "sectionId": row.section_id,
        "interventionId": row.intervention_id,
        "exam": snapshot or None,
        "timing": timing,
        "scoring": scoring,
        "elapsedSeconds": timing.get("elapsedSeconds") or 0,
        "interactions": interactions,
        "summary": summary,
        "mock": False,
    }
    if include_questions:
        qas = db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == row.id).order_by(ExamQuestionAttempt.question_number).all()
        out["questionAttempts"] = [
            {
                "questionId": q.question_id,
                "questionNumber": q.question_number,
                "question": json.loads(q.question_snapshot or "{}"),
                "academicContext": json.loads(q.academic_context or "{}"),
                "response": json.loads(q.response or "{}"),
                "timing": json.loads(q.timing or "{}"),
                "behaviour": json.loads(q.behaviour or "{}"),
                "evaluation": json.loads(q.evaluation or "{}"),
            }
            for q in qas
        ]
    return out


def _pct_from_scoring(scoring_json: str | None) -> float | None:
    """Extract percentage from a scoring JSON string."""
    try:
        s = json.loads(scoring_json or "{}")
    except (json.JSONDecodeError, TypeError):
        return None
    pct = s.get("percentage")
    if pct is not None:
        try:
            return float(pct)
        except (TypeError, ValueError):
            pass
    ms = s.get("maxScore")
    sc = s.get("score")
    if ms and sc is not None:
        try:
            return round(float(sc) / float(ms) * 100, 1)
        except (TypeError, ValueError, ZeroDivisionError):
            pass
    return None


def _parse_json_obj(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    try:
        data = json.loads(raw or "{}")
    except (TypeError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _qa_subject_and_marks(qa) -> tuple[str, float]:
    """Subject label + awarded marks from a question-attempt row or dict."""
    subject, marks, _correct, _incorrect = _qa_outcome(qa)
    return subject, marks


def _qa_outcome(qa) -> tuple[str, float, bool, bool]:
    """Subject, marks, correct, incorrect from a question-attempt row or dict."""
    if isinstance(qa, ExamQuestionAttempt):
        ctx = _parse_json_obj(qa.academic_context)
        qsnap = _parse_json_obj(qa.question_snapshot)
        ev = _parse_json_obj(qa.evaluation)
        response = _parse_json_obj(qa.response)
    else:
        ctx = qa.get("academicContext") or {}
        qsnap = qa.get("question") or {}
        ev = qa.get("evaluation") or {}
        response = qa.get("response") or {}
    subject = str(ctx.get("subject") or qsnap.get("subject") or "").strip()
    marks = ev.get("marks")
    if marks is None:
        marks = ev.get("marksAwarded") if ev.get("marksAwarded") is not None else (ev.get("score") or 0)
    try:
        marks_f = float(marks)
    except (TypeError, ValueError):
        marks_f = 0.0
    from app.services.examination import is_fill_in_blank_type

    is_fib = is_fill_in_blank_type(
        qsnap.get("type") or qsnap.get("qType") or qsnap.get("questionType") or ctx.get("type")
    )
    if is_fib and marks_f < 0:
        marks_f = 0.0
    is_skipped_flag = bool(ev.get("isSkipped")) or response.get("status") == "skipped"
    is_answered_flag = (
        ev.get("isCorrect") is not None
        or response.get("status") == "answered"
        or response.get("selected") is not None
        or (response.get("value") is not None and str(response.get("value")).strip() != "")
    )
    skipped = is_skipped_flag or not is_answered_flag
    is_correct = (not skipped) and bool(ev.get("isCorrect"))
    is_incorrect = (not skipped) and (not is_correct)
    return subject, marks_f, is_correct, is_incorrect


def competition_rank(current: float, cohort: list[float]) -> int:
    """1-based rank among cohort; ties share the better rank. Analysis cards only."""
    return sum(1 for score in cohort if score > current) + 1


def _empty_nta_candidate(attempt_id: str) -> NtaCandidate:
    return NtaCandidate(id=attempt_id)


def _credit_question(candidate: NtaCandidate, subject: str, marks: float, is_correct: bool, is_incorrect: bool) -> None:
    if subject:
        candidate.display[subject] = round(candidate.display.get(subject, 0.0) + marks, 2)
    candidate.total = round(candidate.total + marks, 2)
    bucket = bucket_subject(subject)
    if bucket:
        setattr(candidate, bucket, round(float(getattr(candidate, bucket)) + marks, 2))
    if is_correct:
        candidate.correct += 1
        if bucket:
            setattr(candidate, f"correct_{bucket}", int(getattr(candidate, f"correct_{bucket}")) + 1)
    elif is_incorrect:
        candidate.incorrect += 1
        if bucket:
            setattr(candidate, f"incorrect_{bucket}", int(getattr(candidate, f"incorrect_{bucket}")) + 1)


def _score_for(scores: dict[str, float], name: str) -> float | None:
    if name in scores:
        return scores[name]
    lower = name.lower()
    for key, value in scores.items():
        if key.lower() == lower:
            return value
    return None


def _overlay_current_subjects(candidate: NtaCandidate, current_scores: dict[str, float]) -> None:
    """Prefer the analysis subject totals for the attempt being rendered."""
    if not current_scores:
        return
    used = {name.lower() for name in current_scores}
    kept = {name: score for name, score in candidate.display.items() if name.lower() not in used}
    candidate.display = {**kept, **{name: float(score) for name, score in current_scores.items()}}
    candidate.total = round(sum(candidate.display.values()), 2)
    candidate.math = 0.0
    candidate.physics = 0.0
    candidate.chemistry = 0.0
    candidate.biology = 0.0
    for name, score in candidate.display.items():
        bucket = bucket_subject(name)
        if bucket:
            setattr(candidate, bucket, round(float(getattr(candidate, bucket)) + float(score), 2))


def _batch_id_value(*values: Any) -> str | None:
    """First non-empty batch id. Profile stamps win over attempt stamps."""
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return None


def _profile_batch_map(db: Session, student_ids: set[str] | list[str]) -> dict[str, str | None]:
    ids = [sid for sid in student_ids if sid]
    if not ids:
        return {}
    rows = db.scalars(select(StudentProfile).where(StudentProfile.user_id.in_(ids))).all()
    return {p.user_id: p.batch_id for p in rows}


def _resolved_batch_id(attempt: ExamAttempt, profiles: dict[str, str | None]) -> str | None:
    """Live StudentProfile.batch_id, then the attempt snapshot. No hardcoded ids."""
    return _batch_id_value(profiles.get(attempt.student_id), attempt.batch_id)


def _batch_roster_student_ids(db: Session, institution_id: str | None, batch_id: str) -> list[str]:
    """Every student assigned to this batch. AIR / subject N uses this list, not submitters only."""
    query = select(StudentProfile.user_id).where(StudentProfile.batch_id == batch_id)
    if institution_id:
        query = query.where(StudentProfile.institution_id == institution_id)
    return list(db.scalars(query).all())


def _batch_cohort_attempts(db: Session, row: ExamAttempt) -> list[ExamAttempt]:
    """Submitted attempts in the same exam + resolved batch. One attempt per student.

    Used by exam-analysis AIR and subject ranks only. Batch is the student's
    profile assignment, falling back to the attempt stamp. If neither resolves,
    return no peers so every batch on the paper is not mixed into one cohort.
    """
    if not row.exam_id:
        return []
    peers = list(
        db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.exam_id == row.exam_id,
                ExamAttempt.institution_id == row.institution_id,
                ExamAttempt.submitted_at.is_not(None),
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.is_deleted.is_(False),
            )
        ).all()
    )
    student_ids = {p.student_id for p in peers}
    student_ids.add(row.student_id)
    profiles = _profile_batch_map(db, student_ids)
    current_batch = _resolved_batch_id(row, profiles)
    if not current_batch:
        return []
    peers = [p for p in peers if _resolved_batch_id(p, profiles) == current_batch]
    by_student: dict[str, ExamAttempt] = {}
    for peer in sorted(
        peers,
        key=lambda item: item.submitted_at or item.started_at or datetime.min.replace(tzinfo=timezone.utc),
    ):
        by_student[peer.student_id] = peer
    by_student[row.student_id] = row
    return list(by_student.values())


def apply_batch_subject_ranks(db: Session | None, row: ExamAttempt | None, subjects: list[dict]) -> dict[str, Any]:
    """Fill subject ranks and return batch-scoped overall AIR metadata.

    JEE uses NTA session percentiles + official inter-se merit.
    NEET uses NTA marks + official tie-breakers.
    University / other papers keep simple competition rank on subject marks.
    Cohort is every student in the resolved batch (profile, then attempt
    stamp), not only those who submitted this paper. Non-submitters count as
    zero for AIR and subject rank. Isolated to the exam-analysis dashboard.
    Does not change comparison contracts beyond batch average, program
    results, or other ranking surfaces.
    """
    empty = {"overallRank": None, "ntaPercentile": None, "method": None, "cohortSize": 0}
    if not db or row is None or not subjects:
        return empty
    peers = _batch_cohort_attempts(db, row)
    if not peers:
        return empty
    current_batch = _resolved_batch_id(row, _profile_batch_map(db, {row.student_id}))
    roster_ids = _batch_roster_student_ids(db, row.institution_id, current_batch) if current_batch else []
    if row.student_id not in roster_ids:
        roster_ids.append(row.student_id)
    attempt_by_student = {p.student_id: p for p in peers}
    attempt_by_student[row.student_id] = row
    candidates: dict[str, NtaCandidate] = {}
    for student_id in roster_ids:
        attempt = attempt_by_student.get(student_id)
        candidate_id = attempt.id if attempt else f"absent:{student_id}"
        candidates[candidate_id] = _empty_nta_candidate(candidate_id)
    family = normalize_exam_family(getattr(row, "exam_family", None))
    method = "JEE-NTA" if family == "JEE" else "NEET-NTA" if family == "NEET" else "batch"
    attempt_ids = [attempt_by_student[sid].id for sid in roster_ids if sid in attempt_by_student]
    if attempt_ids:
        q_rows = db.scalars(
            select(ExamQuestionAttempt).where(ExamQuestionAttempt.attempt_id.in_(attempt_ids))
        ).all()
        for qa in q_rows:
            subject, marks, is_correct, is_incorrect = _qa_outcome(qa)
            if not subject:
                continue
            candidate = candidates.setdefault(qa.attempt_id, _empty_nta_candidate(qa.attempt_id))
            _credit_question(candidate, subject, marks, is_correct, is_incorrect)
    current_scores = {
        str(item.get("name") or "").strip(): float(item.get("score") or 0)
        for item in subjects
        if str(item.get("name") or "").strip()
    }
    current = candidates.setdefault(row.id, _empty_nta_candidate(row.id))
    _overlay_current_subjects(current, current_scores)
    for candidate in candidates.values():
        for name in current_scores:
            if _score_for(candidate.display, name) is None:
                candidate.display[name] = 0.0

    cohort_n = len(roster_ids)
    cohort_list = list(candidates.values())
    appeared = [c for c in cohort_list if not str(c.id).startswith("absent:")]
    jee_pct = jee_subject_percentiles(appeared) if family == "JEE" else {}

    for item in subjects:
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        current_score = float(item.get("score") or 0)
        scores_by_id: dict[str, float] = {}
        for candidate in cohort_list:
            value = _score_for(candidate.display, name)
            scores_by_id[candidate.id] = 0.0 if value is None else value
        if not scores_by_id:
            continue
        item["rank"] = competition_ranks_from_scores(scores_by_id).get(row.id) or competition_rank(
            current_score, list(scores_by_id.values())
        )
        item["rankCohort"] = cohort_n
        item["rankMethod"] = method
        if family == "JEE":
            appeared_scores = [float(_score_for(c.display, name) or 0) for c in appeared]
            item["ntaPercentile"] = nta_percentile(current_score, appeared_scores or [current_score])

    overall_rank = None
    overall_pct = None
    if family == "JEE":
        overall_rank = jee_air_ranks(cohort_list).get(row.id)
        overall_pct = jee_pct.get(row.id, {}).get("total")
    elif family == "NEET":
        overall_rank = neet_air_ranks(cohort_list).get(row.id)
    return {
        "overallRank": overall_rank,
        "ntaPercentile": overall_pct,
        "method": method,
        "cohortSize": cohort_n,
    }


def _build_comparison(db: Session, row: ExamAttempt, current_pct: float) -> dict:
    """Build comparison block with real data from peer and historical attempts."""
    dash = "—"
    cell = lambda label: {"label": label, "score": dash, "percentile": dash, "name": dash}

    prev_test = cell("Previous test")
    prev_month = cell("Previous month")
    batch_avg = cell("Batch average")
    inst_avg = cell("Institute average")
    top_perf = cell("Top performer")
    deltas: list[dict] = []

    student_id = row.student_id
    submitted = row.submitted_at

    current_mode = (row.exam_mode or "university").lower()
    current_family = normalize_exam_family(row.exam_family)

    # --- Previous test ---
    prev_rows = db.scalars(
        select(ExamAttempt)
        .where(
            ExamAttempt.student_id == student_id,
            ExamAttempt.submitted_at.is_not(None),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.id != row.id,
            ExamAttempt.submitted_at < submitted if submitted else ExamAttempt.id != row.id,
        )
        .order_by(ExamAttempt.submitted_at.desc())
        .limit(10)
    ).all()

    prev_row = None
    for pr in prev_rows:
        if current_mode == "competitive" and current_family:
            pr_fam = normalize_exam_family(pr.exam_family)
            if not pr_fam and pr.exam_name:
                if "NEET" in pr.exam_name.upper():
                    pr_fam = "NEET"
                elif "JEE" in pr.exam_name.upper():
                    pr_fam = "JEE"
            if current_family == "NEET" and pr_fam == "JEE":
                continue
            if current_family == "JEE" and pr_fam == "NEET":
                continue
        prev_row = pr
        break

    if prev_row:
        pct = _pct_from_scoring(prev_row.scoring)
        if pct is not None:
            prev_test["score"] = f"{pct}%"
            prev_test["percentile"] = None
            d = round(current_pct - pct, 1)
            deltas.append({"label": "vs Previous test", "value": f"{'+' if d >= 0 else ''}{d}%", "up": d >= 0})

    # --- Previous month average ---
    if submitted:
        month_ago = submitted - timedelta(days=30)
        month_rows = db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.student_id == student_id,
                ExamAttempt.submitted_at.is_not(None),
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.is_deleted.is_(False),
                ExamAttempt.id != row.id,
                ExamAttempt.submitted_at >= month_ago,
                ExamAttempt.submitted_at < submitted,
            )
        ).all()
        filtered_month = []
        for mr in month_rows:
            if current_mode == "competitive" and current_family:
                mr_fam = normalize_exam_family(mr.exam_family)
                if not mr_fam and mr.exam_name:
                    if "NEET" in mr.exam_name.upper():
                        mr_fam = "NEET"
                    elif "JEE" in mr.exam_name.upper():
                        mr_fam = "JEE"
                if current_family == "NEET" and mr_fam == "JEE":
                    continue
                if current_family == "JEE" and mr_fam == "NEET":
                    continue
            filtered_month.append(mr)
        pcts = [p for r in filtered_month if (p := _pct_from_scoring(r.scoring)) is not None]
        if pcts:
            avg = round(sum(pcts) / len(pcts), 1)
            prev_month["score"] = f"{avg}%"
            prev_month["percentile"] = None
            d = round(current_pct - avg, 1)
            deltas.append({"label": "vs Previous month", "value": f"{'+' if d >= 0 else ''}{d}%", "up": d >= 0})

    # --- Batch & institute averages, top performer ---
    # Primary: same sitting. Fallback: all submitted attempts for the same exam_id
    # within the institution (covers self-paced / no-sitting attempts).
    sitting_id = row.sitting_id
    if sitting_id:
        peers = db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.sitting_id == sitting_id,
                ExamAttempt.submitted_at.is_not(None),
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.is_deleted.is_(False),
            )
        ).all()
    elif row.exam_id:
        peers = db.scalars(
            select(ExamAttempt).where(
                ExamAttempt.exam_id == row.exam_id,
                ExamAttempt.institution_id == row.institution_id,
                ExamAttempt.submitted_at.is_not(None),
                ExamAttempt.is_demo.is_(False),
                ExamAttempt.is_deleted.is_(False),
            )
        ).all()
    else:
        peers = []

    if peers:
        peer_pcts = [(p, r) for r in peers if (p := _pct_from_scoring(r.scoring)) is not None]
        if peer_pcts:
            all_pcts = [p for p, _ in peer_pcts]
            avg_all = round(sum(all_pcts) / len(all_pcts), 1)
            inst_avg["score"] = f"{avg_all}%"
            rank = sum(1 for p in all_pcts if p > current_pct) + 1
            inst_avg["percentile"] = round((1 - rank / len(all_pcts)) * 100, 1) if len(all_pcts) > 1 else 100.0
            d = round(current_pct - avg_all, 1)
            deltas.append({"label": "vs Institute avg", "value": f"{'+' if d >= 0 else ''}{d}%", "up": d >= 0})

            # Batch-specific: same profile-first resolve as analysis AIR / subject ranks.
            # Unresolved batch → no batch average (never fall back to the whole paper).
            profiles = _profile_batch_map(db, {row.student_id, *[r.student_id for _, r in peer_pcts]})
            current_batch = _resolved_batch_id(row, profiles)
            if current_batch:
                batch_pcts = [p for p, r in peer_pcts if _resolved_batch_id(r, profiles) == current_batch]
            else:
                batch_pcts = []
            if batch_pcts:
                avg_b = round(sum(batch_pcts) / len(batch_pcts), 1)
                batch_avg["score"] = f"{avg_b}%"
                b_rank = sum(1 for p in batch_pcts if p > current_pct) + 1
                batch_avg["percentile"] = round((1 - b_rank / len(batch_pcts)) * 100, 1) if len(batch_pcts) > 1 else 100.0
                batch_avg["cohortSize"] = len(batch_pcts)
                d = round(current_pct - avg_b, 1)
                deltas.append({"label": "vs Batch avg", "value": f"{'+' if d >= 0 else ''}{d}%", "up": d >= 0})

            # Top performer
            best_pct, best_row = max(peer_pcts, key=lambda x: x[0])
            top_perf["score"] = f"{best_pct}%"
            top_perf["name"] = best_row.roll_no or None
            top_perf["percentile"] = None

    return {
        "previousTest": prev_test,
        "previousMonth": prev_month,
        "batchAverage": batch_avg,
        "instituteAverage": inst_avg,
        "topPerformer": top_perf,
        "deltas": deltas,
    }


def _build_trajectory(db: Session | None, student_id: str | None) -> list[dict]:
    """Return the student's last 10 exam scores for the trajectory chart."""
    if not db or not student_id:
        return []

    from app.models.catalog import Batch, Program
    student_family = None
    profile = db.get(StudentProfile, student_id)
    if profile:
        batch = db.get(Batch, profile.batch_id) if profile.batch_id else None
        program = db.get(Program, profile.program_id) if profile.program_id else None
        raw_family = batch.exam_family if batch else (program.exam_family if program else None)
        student_family = normalize_exam_family(raw_family)

    rows = db.scalars(
        select(ExamAttempt)
        .where(
            ExamAttempt.student_id == student_id,
            ExamAttempt.submitted_at.is_not(None),
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
        )
        .order_by(ExamAttempt.submitted_at.desc())
        .limit(20)
    ).all()
    trajectory = []
    for r in reversed(rows):
        if student_family and (r.exam_mode or "").lower() == "competitive":
            r_fam = normalize_exam_family(r.exam_family)
            if not r_fam and r.exam_name:
                if "NEET" in r.exam_name.upper():
                    r_fam = "NEET"
                elif "JEE" in r.exam_name.upper():
                    r_fam = "JEE"
            if student_family == "NEET" and r_fam == "JEE":
                continue
            if student_family == "JEE" and r_fam == "NEET":
                continue
        pct = _pct_from_scoring(r.scoring)
        if pct is not None:
            label = r.exam_name[:20] if r.exam_name else "Exam"
            trajectory.append({"exam": label, "score": pct})
        if len(trajectory) >= 10:
            break
    return trajectory



def _as_nonneg_float(value, default: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return default
    return n if n > 0 else default


def _interaction_for_question(interactions: dict | None, qid: Any, qn: Any = None) -> dict | None:
    """Per-question interaction record. Does not read attempt-level timers."""
    if not isinstance(interactions, dict):
        return None
    keys: list[Any] = []
    if qid is not None:
        keys.extend([qid, str(qid)])
    if qn is not None:
        keys.extend([qn, str(qn)])
    for key in keys:
        hit = interactions.get(key)
        if isinstance(hit, dict):
            return hit
    nested = interactions.get("questions") or interactions.get("byQuestion")
    if isinstance(nested, dict):
        for key in keys:
            hit = nested.get(key)
            if isinstance(hit, dict):
                return hit
    return None


def _question_time_seconds(timing: dict | None, interactions: dict | None, qid: Any, qn: Any = None) -> float:
    """Dwell for one question, in seconds.

    Prefers ``questionAttempts[].timing``. When that is empty (legacy or
    interactions-only submits), falls back to ``interactions[qid].timeSpent``.
    Never uses the attempt-level paper timer as a per-question value.
    """
    timing = timing if isinstance(timing, dict) else {}
    for key in ("timeSpent", "seconds", "time"):
        n = _as_nonneg_float(timing.get(key), 0.0)
        if n > 0:
            return n
    n = _as_nonneg_float(timing.get("elapsedSeconds"), 0.0)
    if n > 0:
        return n
    minutes = _as_nonneg_float(timing.get("minutes"), 0.0)
    if minutes > 0:
        return minutes * 60.0
    inter = _interaction_for_question(interactions, qid, qn)
    if isinstance(inter, dict):
        for key in ("timeSpent", "seconds", "time"):
            n = _as_nonneg_float(inter.get(key), 0.0)
            if n > 0:
                return n
    return 0.0


def _resolve_selected(response: dict, qa: dict, interactions: dict, qn: int) -> Any:
    """Resolve the student's selected answer from response / questionAttempt / interactions.

    Returns None when genuinely unknown — never fabricates a value.
    """
    sel = response.get("selected")
    if sel is None:
        sel = response.get("answer") if response.get("answer") is not None else response.get("value")
    if sel is None:
        sel = qa.get("selected") if qa.get("selected") is not None else (qa.get("selectedAnswer") if qa.get("selectedAnswer") is not None else qa.get("answer"))
    if sel is None:
        q_id = str(qa.get("questionId") or "")
        inter = (interactions.get(q_id) if isinstance(interactions, dict) else None) or (interactions.get(str(qn)) if isinstance(interactions, dict) else None)
        if isinstance(inter, dict):
            sel = inter.get("selected") if inter.get("selected") is not None else (inter.get("answer") if inter.get("answer") is not None else inter.get("value"))
        elif inter is not None:
            sel = inter
    return sel


def _has_selected_answer(selected: Any) -> bool:
    """True when the student submitted a real choice or typed value.

    Index 0 (option A) is a real answer. Empty / whitespace strings are not.
    Display-only — does not change stored scoring or other exam services.
    """
    if selected is None:
        return False
    if isinstance(selected, str) and not selected.strip():
        return False
    return True


def _analysis_is_skipped(ev: dict, response: dict, selected: Any) -> bool:
    """Skip flag for the exam-analysis dashboard.

    A submitted answer is never skipped, even when submit-time scoring stored
    the row as unanswered (missing answer key, isCorrect null, etc.).
    """
    if _has_selected_answer(selected):
        return False
    if bool(ev.get("isSkipped")) or response.get("status") == "skipped":
        return True
    answered = ev.get("isCorrect") is not None or response.get("status") == "answered"
    return not answered


def _analysis_negative_marking(snapshot: dict, scoring: dict, attempt: dict) -> bool:
    for src in (snapshot, scoring, attempt):
        if not isinstance(src, dict):
            continue
        raw = src.get("negativeMarking")
        if raw is None:
            raw = src.get("negative_marking")
        if raw is None:
            continue
        if isinstance(raw, bool):
            return raw
        text = str(raw).strip().lower()
        if text in {"enabled", "true", "yes", "1"}:
            return True
        if text in {"disabled", "false", "no", "0"}:
            return False
    mode = str(attempt.get("examMode") or snapshot.get("category") or "")
    return mode.lower() == "competitive"


def _analysis_correct_answer(ev: dict, qsnap: dict, db_q: Any, is_fib: bool) -> Any:
    correct_ans = ev.get("correctAnswer")
    if correct_ans is None:
        correct_ans = (
            ev.get("correct_answer")
            or qsnap.get("correctAnswer")
            or qsnap.get("correct_answer")
            or qsnap.get("correctOption")
            or qsnap.get("correct_option")
        )
    if correct_ans is None and db_q is not None:
        from app.services.examination import question_correct_index as _qci

        correct_ans = db_q.correct_answer if is_fib else _qci(db_q)
    return correct_ans


def analysis_from_attempt(attempt: dict, *, db: Session | None = None, attempt_row: ExamAttempt | None = None) -> dict:
    """Full AnalysisDashboard shape from a live attempt. Never SPA. Missing cohort stats stay null."""
    scoring = attempt.get("scoring") or {}
    summary = attempt.get("summary") or {}
    questions = attempt.get("questionAttempts") or []
    snapshot = attempt.get("exam") or {}
    interactions = attempt.get("interactions") or {}
    mode = attempt.get("examMode") or snapshot.get("category") or "University"
    is_university = str(mode).lower() != "competitive"
    max_score = scoring.get("maxScore") or snapshot.get("totalMarks") or 0
    score = scoring.get("score")
    if score is None:
        score = summary.get("score") or 0
    try:
        percentage = round(float(scoring.get("percentage") if scoring.get("percentage") is not None else summary.get("pct") or 0), 1)
    except (TypeError, ValueError):
        percentage = 0.0
    attempted_n = 0
    correct_n = 0
    incorrect_n = 0
    skipped_n = 0
    guess_n = 0
    _neg_per_q = scoring.get("wrongMarks") or scoring.get("negativePerQuestion") or snapshot.get("wrongMarks") or -1
    negative = scoring.get("negativeMarks") or scoring.get("negative") or 0
    _negative_accumulated = 0.0  # sum of deducted marks from per-question loop
    by_chapter: dict[str, dict] = {}
    by_subject: dict[str, dict] = {}
    by_topic: dict[str, dict] = {}
    by_diff: dict[str, dict] = {}
    mistake_cats: dict[str, int] = {}
    mistake_list = []
    question_review = []
    times: list[tuple[str, float]] = []
    subjects_seen: list[str] = []

    def _num(value, default=0.0):
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    # Batch-load Question models so we can always resolve correctAnswer and
    # explanation/hint from the live DB record — works for old attempts too.
    _q_ids = [qa.get("questionId") for qa in questions if qa.get("questionId")]
    _db_questions: dict[str, Any] = {}
    _ai_questions: dict[str, Any] = {}
    if db and _q_ids:
        from sqlalchemy import select as _sel
        from app.models.assessment import Question as _Q
        _db_questions = {
            str(q.id): q for q in db.scalars(_sel(_Q).where(_Q.id.in_(_q_ids))).all()
        }
        _missing_exp_ids = [
            str(qid)
            for qid in _q_ids
            if str(qid) not in _db_questions or not getattr(_db_questions[str(qid)], "explanation", None)
        ]
        if _missing_exp_ids:
            try:
                from sqlalchemy import or_ as _or
                from app.models.ai_papers import AiGeneratedPaperQuestion as _AiQ
                for _aq in db.scalars(
                    _sel(_AiQ).where(
                        _or(_AiQ.id.in_(_missing_exp_ids), _AiQ.question_id.in_(_missing_exp_ids))
                    )
                ).all():
                    if _aq.id:
                        _ai_questions[str(_aq.id)] = _aq
                    if _aq.question_id:
                        _ai_questions[str(_aq.question_id)] = _aq
            except Exception:
                pass

    # Pre-compute median answered-question time (seconds) so the classifier can
    # use it as a relative speed signal for every incorrect question.
    _pre_times_sec: list[float] = []
    for _qa in questions:
        _ev = _qa.get("evaluation") or {}
        _resp = _qa.get("response") or {}
        _beh = _qa.get("behaviour") or {}
        _tim = _qa.get("timing") or {}
        _skipped_pre = _analysis_is_skipped(
            _ev,
            _resp,
            _resolve_selected(_resp, _qa, interactions, _qa.get("questionNumber")),
        )
        if not _skipped_pre:
            _t = _question_time_seconds(
                _tim,
                interactions,
                _qa.get("questionId"),
                _qa.get("questionNumber"),
            )
            if _t > 0:
                _pre_times_sec.append(_t)
    _pre_times_sec.sort()
    _median_time_sec: float = (
        _pre_times_sec[len(_pre_times_sec) // 2] if _pre_times_sec else 0.0
    )

    for qa in questions:
        ctx = qa.get("academicContext") or {}
        qsnap = qa.get("question") or {}
        ev = qa.get("evaluation") or {}
        timing = qa.get("timing") or {}
        behaviour = qa.get("behaviour") or {}
        response = qa.get("response") or {}
        chapter = ctx.get("chapter") or qsnap.get("chapter") or "Unspecified"
        subject = ctx.get("subject") or qsnap.get("subject") or attempt.get("subject") or "General"
        topic = ctx.get("topic") or qsnap.get("topic") or chapter
        difficulty = (ctx.get("difficulty") or qsnap.get("difficulty") or "Medium")
        qn = qa.get("questionNumber") or len(question_review) + 1
        selected = _resolve_selected(response, qa, interactions, qn)
        skipped = _analysis_is_skipped(ev, response, selected)

        from app.services.examination import (
            grade_fill_in_blank,
            grade_selected_mcq,
            is_fill_in_blank_type,
            parse_answer_index,
        )

        db_q = _db_questions.get(str(qa.get("questionId") or ""))
        q_type_raw = qsnap.get("type") or qsnap.get("qType") or qsnap.get("questionType") or (db_q.q_type if db_q is not None else "MCQ")
        is_fib = is_fill_in_blank_type(q_type_raw)
        correct_ans = _analysis_correct_answer(ev, qsnap, db_q, is_fib)

        max_marks = ev.get("maxMarks")
        if max_marks is None:
            max_marks = qsnap.get("marks") or (db_q.marks if db_q is not None else None)
        marks = ev.get("marks")
        if marks is None:
            marks = ev.get("marksAwarded") if ev.get("marksAwarded") is not None else (ev.get("score") or 0)
        stored_correct = ev.get("isCorrect")
        if not skipped and is_fib:
            if correct_ans is not None and str(correct_ans).strip() != "":
                stored_correct = grade_fill_in_blank(correct_ans, selected)
                marks = (_num(max_marks) if _num(max_marks) > 0 else 4) if stored_correct else 0
            elif not stored_correct and _num(marks) < 0:
                marks = 0
        elif not skipped and stored_correct is None and not is_fib:
            neg = qsnap.get("negativeMarks")
            if neg is None and db_q is not None:
                neg = db_q.negative_marks
            if neg is None:
                neg = abs(_neg_per_q) if _neg_per_q else 0
            if _num(max_marks) > 0:
                graded, awarded = grade_selected_mcq(
                    selected,
                    correct_ans,
                    marks=_num(max_marks),
                    negative_marks=_num(neg),
                    negative_marking=_analysis_negative_marking(snapshot, scoring, attempt),
                )
                if graded is not None:
                    stored_correct = graded
                    marks = awarded
        is_correct = bool(stored_correct)
        guessed = bool(behaviour.get("guess") or behaviour.get("guessed") or behaviour.get("isGuess"))
        time_min = (
            _question_time_seconds(
                timing,
                interactions,
                qa.get("questionId"),
                qn,
            )
            / 60
        )
        times.append((f"Q{qn}", round(time_min, 2)))
        # Initialise mistake fields — overwritten below for Incorrect questions
        cat: str = ""
        _hint: str = ""
        if skipped:
            skipped_n += 1
            status = "Skipped"
        else:
            attempted_n += 1
            if is_correct:
                correct_n += 1
                status = "Correct"
            else:
                incorrect_n += 1
                status = "Incorrect"
                # accumulate the deducted marks for this wrong answer (never for FIB)
                _q_marks_val = _num(marks)
                if not is_fib:
                    if _q_marks_val < 0:
                        _negative_accumulated += -_q_marks_val
                    elif _neg_per_q and _neg_per_q < 0:
                        _negative_accumulated += -float(_neg_per_q)
                # ---- Rule-based mistake classification ----
                _manual_cat = behaviour.get("errorType") or ev.get("errorType")
                if _manual_cat:
                    cat = _manual_cat
                    _hint = ev.get("reason") or f"Review this question ({topic})."
                else:
                    _db_q = _db_questions.get(str(qa.get("questionId") or ""))
                    cat, _hint = classify_mistake_from_qa(
                        qa,
                        median_time_sec=_median_time_sec,
                        db_question=_db_q,
                    )
                mistake_cats[cat] = mistake_cats.get(cat, 0) + 1
                mistake_list.append({
                    "q": f"Q{qn}",
                    "topic": topic,
                    "subject": subject,
                    "mistakeCategory": cat,
                    "hint": _hint,
                    "detail": ev.get("reason") or f"{cat} · {topic}",
                })
        if guessed:
            guess_n += 1
        ch = by_chapter.setdefault(chapter, {"chapter": chapter, "subject": subject, "n": 0, "correct": 0, "marks": 0, "time": 0.0, "attempted": 0})
        ch["n"] += 1
        ch["time"] += time_min
        ch["marks"] += _num(marks)
        if not skipped:
            ch["attempted"] += 1
            if is_correct:
                ch["correct"] += 1
        sub = by_subject.setdefault(subject, {"name": subject, "n": 0, "correct": 0, "score": 0.0, "maxMarks": 0.0, "time": 0.0, "strong": [], "weak": []})
        sub["n"] += 1
        sub["time"] += time_min
        sub["score"] += _num(marks)
        sub["maxMarks"] += _num(qsnap.get("marks") or ev.get("maxMarks") or 1)
        if is_correct:
            sub["correct"] += 1
            if topic not in sub["strong"]:
                sub["strong"].append(topic)
        elif not skipped:
            if topic not in sub["weak"]:
                sub["weak"].append(topic)
        if subject not in subjects_seen:
            subjects_seen.append(subject)
        top = by_topic.setdefault(topic, {"topic": topic, "subject": subject, "chapter": chapter, "n": 0, "correct": 0})
        generic_chapter = {topic, subject, "Unspecified", ""}
        if top.get("chapter") in generic_chapter and chapter not in generic_chapter:
            top["chapter"] = chapter
        top["n"] += 1
        if is_correct:
            top["correct"] += 1
        diff = by_diff.setdefault(difficulty, {"level": difficulty, "n": 0, "correct": 0, "attempted": 0, "time": 0.0})
        diff["n"] += 1
        diff["time"] += time_min
        if not skipped:
            diff["attempted"] += 1
            if is_correct:
                diff["correct"] += 1
        sel = selected
        if not is_fib:
            if sel is not None and not isinstance(sel, (dict, list)):
                parsed_sel = parse_answer_index(sel)
                if parsed_sel is not None:
                    sel = parsed_sel
            if correct_ans is not None and not isinstance(correct_ans, (dict, list)):
                parsed_correct = parse_answer_index(correct_ans)
                if parsed_correct is not None:
                    correct_ans = parsed_correct

        # Safe inference: only infer sel == correct_ans when we KNOW the answer
        # is correct (status == "Correct"). Never fabricate a fake wrong answer.
        if not skipped and status == "Correct":
            if sel is None:
                sel = correct_ans
            elif correct_ans is None:
                correct_ans = sel

        ai_q = _ai_questions.get(str(qa.get("questionId") or ""))
        q_explanation = (
            qsnap.get("hint")
            or qsnap.get("explanation")
            or qsnap.get("solution")
            or (getattr(db_q, "explanation", None) if db_q is not None else None)
            or (
                (getattr(ai_q, "explanation", None) or getattr(ai_q, "solution", None))
                if ai_q is not None
                else None
            )
            or ev.get("explanation")
            or ev.get("hint")
            or ev.get("solution")
        )
        if isinstance(q_explanation, str):
            q_explanation = q_explanation.strip() or None

        if q_explanation:
            q_hint = q_explanation
        elif status == "Incorrect" and _hint:
            q_hint = _hint
        elif status == "Correct":
            q_hint = (
                f"Correctly solved ({difficulty} · {topic}). "
                f"Key concept from {chapter} ({subject}) — review related variations and formulas in {topic} to maintain mastery."
            )
        else:
            q_hint = (
                f"Question was skipped ({difficulty} · {topic}). "
                f"Review the core concepts and formulas in {chapter} ({subject}) and practise similar problems."
            )

        question_review.append(
            {
                "q": f"Q{qn}",
                "subject": subject,
                "chapter": chapter,
                "topic": topic,
                "difficulty": difficulty,
                "type": (qsnap.get("type") or ctx.get("type") or "MCQ"),
                "status": status,
                "marks": marks,
                "time": round(time_min, 2),
                "selected": sel,
                "correctAnswer": correct_ans,
                "text": qsnap.get("text") or qsnap.get("question") or None,
                # Structured options keep their own figures; the stem figure
                # fields are carried explicitly so the PDF export can embed
                # the original examination figure for this question.
                "options": qsnap.get("options") or [],
                "imageUrl": qsnap.get("imageUrl"),
                "stemImageUrls": qsnap.get("stemImageUrls") or [],
                "stemImageUrl": qsnap.get("stemImageUrl"),
                "hint": q_hint,
                "explanation": q_explanation,
                # Mistake analysis — populated for Incorrect answers only
                "mistakeCategory": cat if status == "Incorrect" else None,
                "mistakeHint": _hint if status == "Incorrect" else None,
            }
        )

    total_q = max(len(questions), 1)

    sc_correct = scoring.get("correct") or summary.get("correct") or 0
    sc_incorrect = scoring.get("incorrect") or summary.get("incorrect") or 0
    sc_skipped = scoring.get("skipped") or scoring.get("unanswered") or summary.get("skipped") or 0
    loop_total = correct_n + incorrect_n + skipped_n
    if loop_total == 0:
        # No per-question rows — only then use stored scoring totals.
        # When rows exist, KPI chips must match questionReview. The submit
        # blob can mark an answered question as unanswered if the key was
        # missing; overwriting here desynced Skipped from the subject cards.
        if sc_correct:
            correct_n = int(sc_correct)
        if sc_incorrect:
            incorrect_n = int(sc_incorrect)
        if sc_skipped:
            skipped_n = int(sc_skipped)
    if attempted_n == 0:
        attempted_n = correct_n + incorrect_n

    # Recompute score and negative from the per-question marks that were
    # accumulated in the loop above. This guarantees displayed score == actual
    # calculated score, regardless of how the stored blob was saved.
    # Each question's ev["marks"] is the true awarded value (+marks or -neg or 0)
    # so summing by_subject gives the correct total without any rounding drift.
    # Fall back to the stored blob only when there were no per-question rows.
    if by_subject:
        score = round(sum(v["score"] for v in by_subject.values()), 2)
        # Prefer the authoritative negativeMarks from the scoring blob (written
        # by the engine at submit time). Fall back to the per-question accumulator
        # only when the blob has no stored value.
        sc_negative = scoring.get("negativeMarks") or scoring.get("negative") or summary.get("negativeMarks") or 0
        if sc_negative:
            negative = round(float(sc_negative), 2)
        elif _negative_accumulated > 0:
            negative = round(_negative_accumulated, 2)
        else:
            negative = round(sum(-v["score"] for v in by_subject.values() if v["score"] < 0), 2)
    # else: score and negative remain as read from scoring blob at top of function

    attempt_ratio = round(100 * attempted_n / total_q, 1)
    success_rate = round(100 * correct_n / attempted_n, 1) if attempted_n else 0
    chapters = []
    for v in by_chapter.values():
        acc = round(100 * v["correct"] / v["n"], 1) if v["n"] else 0
        mastery = "Strong" if acc >= 75 else "Average" if acc >= 60 else "Weak" if acc >= 40 else "Critical"
        chapters.append(
            {
                "chapter": v["chapter"],
                "subject": v["subject"],
                "accuracy": acc,
                "marks": round(v["marks"], 1),
                "time": round(v["time"], 1),
                "attempted": round(100 * v["attempted"] / v["n"], 1) if v["n"] else 0,
                "mastery": mastery,
                "questions": v["n"],
            }
        )
    subjects = []
    for v in by_subject.values():
        acc = round(100 * v["correct"] / v["n"], 1) if v["n"] else 0
        subjects.append(
            {
                "name": v["name"],
                "score": round(v["score"], 1),
                "maxMarks": round(v["maxMarks"], 1) or 0,
                "accuracy": acc,
                "time": round(v["time"], 1),
                "rank": None,
                "difficulty": "Medium",
                "strongAreas": v["strong"][:3] or ["—"],
                "weakAreas": v["weak"][:3] or ["—"],
            }
        )
    rank_meta: dict[str, Any] = {}
    if db and attempt_row is not None:
        rank_meta = apply_batch_subject_ranks(db, attempt_row, subjects) or {}
    topics = []
    for v in by_topic.values():
        mastery = round(100 * v["correct"] / v["n"], 1) if v["n"] else 0
        level = "Strong" if mastery >= 75 else "Average" if mastery >= 60 else "Weak" if mastery >= 40 else "Critical"
        topics.append({"topic": v["topic"], "subject": v["subject"], "chapter": v.get("chapter") or "", "level": level, "mastery": mastery})
    difficulty = []
    for level in ("Easy", "Medium", "Hard"):
        v = by_diff.get(level) or {"n": 0, "correct": 0, "attempted": 0, "time": 0.0}
        difficulty.append(
            {
                "level": level,
                "accuracy": round(100 * v["correct"] / v["n"], 1) if v["n"] else 0,
                "attempted": v["attempted"],
                "time": round(v["time"], 1),
            }
        )
    timed = [t for t in times if t[1] > 0]
    fastest = min(timed, key=lambda t: t[1]) if timed else ("—", 0)
    slowest = max(timed, key=lambda t: t[1]) if timed else ("—", 0)
    avg_time = round(sum(t[1] for t in times) / total_q, 2) if questions else 0
    duration = snapshot.get("durationMinutes") or snapshot.get("duration") or 0
    try:
        duration = float(str(duration).replace(" hrs", "").replace("hr", "").replace("min", "").strip() or 0)
    except (TypeError, ValueError):
        duration = 0
    used_total = sum(t[1] for t in times)
    # Each section is shown against the whole paper duration, not an
    # equal-split slice (e.g. 180 min, not 60 min per subject).
    whole_time = duration if duration else used_total
    time_distribution = []
    for sub in subjects:
        used = sub["time"]
        allocated = whole_time if whole_time else max(used, 1)
        time_distribution.append(
            {
                "section": sub["name"],
                "used": round(used, 1),
                "allocated": round(allocated, 1) or 1,
                "efficiency": round(100 * used / allocated, 1) if allocated else 0,
            }
        )

    weak_chapters = [c["chapter"] for c in chapters if c["accuracy"] < 65 or (c["attempted"] < 40 and c["questions"] >= 2)]
    weak_topics = [t["topic"] for t in topics if t["mastery"] < 65]
    grade = None
    if percentage >= 90:
        grade = "A+"
    elif percentage >= 80:
        grade = "A"
    elif percentage >= 70:
        grade = "B+"
    elif percentage >= 60:
        grade = "B"
    elif percentage >= 50:
        grade = "C"
    else:
        grade = "D" if questions else "—"
    dash = "—"
    comparison_cell = {"label": dash, "score": dash, "percentile": dash, "name": dash}

    # Cognitive quadrants: classify each answered question by speed × correctness
    # (fast/slow split at the median answered time) from the data already tracked.
    answered = [q for q in question_review if q["status"] in ("Correct", "Incorrect")]
    answered_times = sorted(q["time"] for q in answered)
    median_time = answered_times[len(answered_times) // 2] if answered_times else 0.0
    cognitive_quadrants = {
        "fastCorrect": sum(1 for q in answered if q["status"] == "Correct" and q["time"] <= median_time),
        "slowCorrect": sum(1 for q in answered if q["status"] == "Correct" and q["time"] > median_time),
        "fastIncorrect": sum(1 for q in answered if q["status"] == "Incorrect" and q["time"] <= median_time),
        "slowIncorrect": sum(1 for q in answered if q["status"] == "Incorrect" and q["time"] > median_time),
        "medianTimeMinutes": round(median_time, 2),
    }

    # Pull batch stats from comparison so the score card can display them without
    # the frontend needing to read two separate sections.
    _cmp = _build_comparison(db, attempt_row, percentage) if db and attempt_row else None
    _batch = (_cmp or {}).get("batchAverage", {})
    _batch_percentile = _batch.get("percentile")          # e.g. 83.3 (batch-level)
    _batch_avg_score = _batch.get("score")                # e.g. "72.5%" (string)
    _batch_cohort = _batch.get("cohortSize")              # e.g. 42

    hero = {
        "score": score,
        "maxScore": max_score,
        "percentage": percentage,
        "grade": grade,
        "rank": None,
        "batchRank": rank_meta.get("overallRank"),
        "cohortSize": rank_meta.get("cohortSize"),
        "ntaPercentile": rank_meta.get("ntaPercentile"),
        "rankMethod": rank_meta.get("method"),
        "confidenceIndex": round(success_rate, 1),
        "badge": "Completed" if attempt.get("submittedAt") else "In progress",
        "aiSummary": f"{correct_n} correct of {len(questions)} questions ({percentage}%)." if questions else "No question-level evidence for this attempt.",
        "readinessScore": round(percentage, 1),
        "healthScore": round(percentage, 1),
        # Batch intelligence — populated only when the attempt has a sitting_id
        # and at least one peer has submitted.
        "batchPercentile": _batch_percentile,
        "batchAvgScore": _batch_avg_score,
        "batchCohortSize": _batch_cohort,
    }
    meta = {
        "examId": attempt.get("examId"),
        "examName": attempt.get("examTitle") or attempt.get("examName"),
        "pattern": attempt.get("examFamily") or ("University" if is_university else "Competitive"),
        "hallNumber": snapshot.get("hallNumber"),
        "course": snapshot.get("subject") or attempt.get("subject"),
        "faculty": snapshot.get("faculty"),
        "semester": snapshot.get("semester"),
        "academicYear": snapshot.get("academicYear"),
        "date": (attempt.get("submittedAt") or "")[:10] or None,
        "duration": snapshot.get("durationMinutes") or snapshot.get("duration"),
        "venue": snapshot.get("venue"),
        "seatNumber": snapshot.get("seatNumber"),
        "totalMarks": max_score,
        "passingMarks": snapshot.get("passingMarks"),
        "resultStatus": "Declared" if attempt.get("submittedAt") else "Pending",
        "examStatus": "Completed" if attempt.get("submittedAt") else "In progress",
        "admitCard": None,
    }
    return {
        "attempt": attempt,
        "attemptId": attempt.get("id"),
        "examId": attempt.get("examId"),
        "examTitle": attempt.get("examTitle") or attempt.get("examName"),
        "examMode": attempt.get("examMode"),
        "examFamily": attempt.get("examFamily"),
        "proctorViolations": attempt.get("proctorViolations") or 0,
        "terminated": bool(attempt.get("terminated")),
        "terminationReason": attempt.get("terminationReason"),
        "scoring": scoring,
        "summary": summary,
        "chapters": chapters,
        "accuracy": scoring.get("accuracy") or summary.get("accuracy") or success_rate,
        "source": "exam-agent",
        "hero": hero,
        "meta": meta,
        "cognitiveQuadrants": cognitive_quadrants,
        "questionIntelligence": {
            "attempted": attempted_n,
            "attemptRatio": attempt_ratio,
            "correct": correct_n,
            "successRate": success_rate,
            "correctMarks": round(score + negative, 2),
            "incorrect": incorrect_n,
            "guessAttempts": guess_n,
            "skipped": skipped_n,
            "negativeMarks": negative,
        },
        "timeIntelligence": {
            "distribution": time_distribution,
            "avgTimePerQuestion": avg_time,
            "fastestQuestion": {"q": fastest[0], "time": fastest[1]},
            "slowestQuestion": {"q": slowest[0], "time": slowest[1]},
            "navigationCount": 0,
            "timeManagementScore": round(min(100, percentage), 1),
        },
        "subjects": subjects,
        "topics": topics,
        "questionReview": question_review,
        "mistakeList": mistake_list,
        "mistakes": [{"category": k, "count": v} for k, v in mistake_cats.items()] or [],
        "difficulty": difficulty,
        "comparison": _cmp if _cmp is not None else {
            "previousTest": {**comparison_cell, "label": "Previous test"},
            "previousMonth": {**comparison_cell, "label": "Previous month"},
            "batchAverage": {**comparison_cell, "label": "Batch average"},
            "instituteAverage": {**comparison_cell, "label": "Institute average", "score": None, "percentile": None},
            "topPerformer": {**comparison_cell, "label": "Top performer", "name": None, "score": None},
            "deltas": [],
        },
        "recommendations": {
            "weakChapters": weak_chapters,
            "weakTopics": weak_topics,
            "priorityRevision": [{"topic": t, "timeframe": "This week", "priority": "High"} for t in weak_topics[:4]],
            "suggestedPYQs": [],
            "practiceQuestions": [],
            "mockTests": [],
            "lectures": [],
        },
        "prediction": {
            "trajectory": _build_trajectory(db, attempt_row.student_id if attempt_row else None),
            "neetScore": (
                round((percentage / 100) * float(max_score), 1)
                if not is_university and max_score and percentage > 0
                else None
            ),
        },
    }


def practice_questions(*, subject: str | None, chapter: str | None, count: int = 8) -> list[dict]:
    items: list[dict] = []
    needle = (chapter or subject or "").lower()
    for exam in exam_catalogue():
        for q in exam.get("questions") or []:
            blob = f"{q.get('chapter', '')} {q.get('subject', '')} {q.get('topic', '')}".lower()
            if needle and needle not in blob:
                continue
            items.append(
                {
                    "id": q.get("id"),
                    "question": q.get("question") or q.get("text"),
                    "options": q.get("options"),
                    "answer": q.get("correctAnswer"),
                    "subject": q.get("subject"),
                    "chapter": q.get("chapter"),
                    "topic": q.get("topic"),
                    "difficulty": q.get("difficulty"),
                    "questionType": q.get("type") or "MCQ",
                    "isPyq": False,
                    "source": "exam-agent",
                }
            )
            if len(items) >= count:
                return items
    if items:
        return items[:count]
    for exam in exam_catalogue():
        for q in exam.get("questions") or []:
            items.append(
                {
                    "id": q.get("id"),
                    "question": q.get("question") or q.get("text"),
                    "options": q.get("options"),
                    "answer": q.get("correctAnswer"),
                    "subject": q.get("subject"),
                    "chapter": q.get("chapter"),
                    "topic": q.get("topic"),
                    "difficulty": q.get("difficulty"),
                    "questionType": q.get("type") or "MCQ",
                    "isPyq": False,
                    "source": "exam-agent",
                }
            )
            if len(items) >= count:
                return items
    return items
