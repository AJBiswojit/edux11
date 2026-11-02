"""Domain-scoped student 360 KPIs for the faculty profile page.

Reads canonical attempt scoring plus question rows. Subject labels come from
the question catalog (subject_id / chapter_id / topic_id). Answered state
uses response.selected, which is what exam submit persists. This module is
only called from faculty student_360.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.exam_engine.catalog import display_subject_name
from app.models.assessment import Question
from app.models.catalog import Chapter, Subject, Topic
from app.services.exam_family import normalize_exam_family
from app.services.intelligence_rules import (
    CHAPTER_TREND_POINTS,
    DEVELOPING_ACCURACY,
    DOMAINS,
    FAST_SECONDS,
    HIGH_TIME_SECONDS,
    MIN_EVIDENCE_ATTEMPTED,
    SLOW_SUBJECT_RATIO,
    STRONG_ACCURACY,
    STUDENT_TREND_POINTS,
    UNIVERSITY_DOMAIN,
    subject_sort_key,
)


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def _num(value, default=0.0) -> float:
    if value is None or value == "":
        return float(default)
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _label_subject(raw: str | None, family: str | None) -> str | None:
    return display_subject_name(raw, family=family)


def _selected(response: dict) -> object | None:
    for key in ("selected", "selectedAnswer", "answer", "value"):
        value = response.get(key)
        if value not in (None, "", []):
            return value
    return None


def _time_spent(timing: dict) -> float:
    if not isinstance(timing, dict):
        return 0.0
    for key in ("timeSpent", "seconds", "elapsedSeconds"):
        value = timing.get(key)
        if value not in (None, "", 0, 0.0):
            return _num(value, 0)
    return 0.0


def _domain(attempt: dict) -> str:
    family = normalize_exam_family(attempt.get("examFamily"))
    if family and family in DOMAINS:
        return family
    return UNIVERSITY_DOMAIN


def _blank_attempt(attempt: dict) -> bool:
    return _num(attempt.get("attemptRate"), 0) <= 0


def _trend(accuracies: list[float], threshold: float) -> str:
    if len(accuracies) < 2:
        return "new"
    mid = (len(accuracies) + 1) // 2
    early = accuracies[:mid]
    late = accuracies[mid:] or accuracies[-1:]
    delta = (sum(late) / len(late)) - (sum(early) / len(early))
    if delta >= threshold:
        return "improving"
    if delta <= -threshold:
        return "declining"
    return "stable"


def _student_status(accuracies: list[float]) -> tuple[str, str]:
    if not accuracies:
        return "No exams", "new"
    latest = accuracies[-1]
    trend = _trend(accuracies, STUDENT_TREND_POINTS)
    if latest < DEVELOPING_ACCURACY or trend == "declining":
        status = "Needs Attention"
    elif latest >= STRONG_ACCURACY and trend != "declining":
        status = "Strong"
    elif trend == "improving" and latest >= DEVELOPING_ACCURACY:
        status = "Improving"
    else:
        status = "Stable"
    return status, trend


def _overview(attempts_newest_first: list[dict]) -> dict:
    chrono = list(reversed(attempts_newest_first))
    accuracies = [_num(a.get("accuracy"), 0) for a in chrono if a.get("accuracy") is not None]
    status, trend = _student_status(accuracies)
    delta = round(accuracies[-1] - accuracies[0], 2) if len(accuracies) >= 2 else None
    time_values = [ _num(a.get("timeEfficiency"), 0) for a in attempts_newest_first if a.get("timeEfficiency") is not None]
    return {
        "status": status,
        "trend": trend,
        "latestAccuracy": accuracies[-1] if accuracies else None,
        "avgAccuracy": _mean(accuracies),
        "attemptRate": _mean([_num(a.get("attemptRate"), 0) for a in attempts_newest_first]) if attempts_newest_first else 0.0,
        "timeEfficiency": _mean(time_values) if time_values else 0.0,
        "examsCompleted": len(attempts_newest_first),
        "improvementDelta": delta,
        "latestPct": accuracies[-1] if accuracies else None,
    }


def _attention(overview: dict) -> tuple[bool, str | None]:
    if overview.get("status") != "Needs Attention":
        return False, None
    if overview.get("trend") == "declining":
        return True, "Declining performance trend"
    return True, f"Latest accuracy below {DEVELOPING_ACCURACY:g}%"


def _summary(overview: dict, strengths: list[dict], weaknesses: list[dict], subjects: list[dict]) -> str:
    parts = []
    count = int(overview.get("examsCompleted") or 0)
    latest = overview.get("latestAccuracy")
    latest_label = latest if latest is not None else 0
    delta = overview.get("improvementDelta")
    if count >= 2:
        if delta is not None and delta >= STUDENT_TREND_POINTS:
            parts.append(f"Accuracy has improved by {delta} percentage points across the last {count} assessments.")
        elif delta is not None and delta <= -STUDENT_TREND_POINTS:
            parts.append(f"Performance has declined by {abs(delta)} points over the last {count} assessments.")
        else:
            parts.append(f"Performance has remained stable across the last {count} assessments ({latest_label}% latest accuracy).")
    else:
        noun = "assessment" if count == 1 else "assessments"
        parts.append(f"{count} completed {noun} — more attempts will sharpen this picture.")
    if strengths:
        item = strengths[0]
        parts.append(f"{item['chapter']} is a strong area ({item['accuracy']}% accuracy).")
    if weaknesses:
        item = weaknesses[0]
        extra = ", high time consumption" if item.get("highTime") else ""
        parts.append(f"{item['chapter']} continues to require attention ({item['accuracy']}% accuracy{extra}).")
    timed = [s for s in subjects if _num(s.get("avgTime"), 0) > 0]
    if len(timed) > 1:
        slowest = max(timed, key=lambda s: s["avgTime"])
        fastest = min(timed, key=lambda s: s["avgTime"])
        if slowest["avgTime"] > fastest["avgTime"] * SLOW_SUBJECT_RATIO:
            tone = "comparable" if slowest["accuracy"] >= DEVELOPING_ACCURACY else "lower"
            parts.append(f"{slowest['subject']} consumes significantly more time than other subjects while maintaining {tone} accuracy.")
    return " ".join(parts)


def repair_question_attempts(db: Session, attempts: list[dict]) -> None:
    """Resolve subject/chapter/topic from the question catalog onto the response only."""
    qids = {
        qa.get("questionId")
        for attempt in attempts
        for qa in (attempt.get("questionAttempts") or [])
        if qa.get("questionId")
    }
    questions: dict = {}
    if qids and db is not None:
        questions = {row.id: row for row in db.scalars(select(Question).where(Question.id.in_(qids))).all()}
    subject_ids = {q.subject_id for q in questions.values() if q.subject_id}
    chapter_ids = {q.chapter_id for q in questions.values() if q.chapter_id}
    topic_ids = {q.topic_id for q in questions.values() if q.topic_id}
    subjects = {row.id: row for row in db.scalars(select(Subject).where(Subject.id.in_(subject_ids))).all()} if subject_ids else {}
    chapters = {row.id: row for row in db.scalars(select(Chapter).where(Chapter.id.in_(chapter_ids))).all()} if chapter_ids else {}
    topics = {row.id: row for row in db.scalars(select(Topic).where(Topic.id.in_(topic_ids))).all()} if topic_ids else {}

    for attempt in attempts:
        family = attempt.get("examFamily")
        paper_subject = _label_subject(attempt.get("subject"), family)
        for qa in attempt.get("questionAttempts") or []:
            ctx = qa.get("academicContext") if isinstance(qa.get("academicContext"), dict) else {}
            question_blob = qa.get("question") if isinstance(qa.get("question"), dict) else {}
            raw_subject = ctx.get("subject") or question_blob.get("subject")
            raw_chapter = ctx.get("chapter") or question_blob.get("chapter") or ""
            raw_topic = ctx.get("topic") or question_blob.get("topic") or ""
            catalog = questions.get(qa.get("questionId"))
            catalog_subject = None
            chapter = str(raw_chapter or "")
            topic = str(raw_topic or "")
            if catalog is not None:
                sub = subjects.get(catalog.subject_id) if catalog.subject_id else None
                ch = chapters.get(catalog.chapter_id) if catalog.chapter_id else None
                tp = topics.get(catalog.topic_id) if catalog.topic_id else None
                if sub is not None and sub.name:
                    catalog_subject = sub.name
                if ch is not None and ch.name:
                    chapter = ch.name
                if tp is not None and tp.name:
                    topic = tp.name
            raw_text = str(raw_subject or "").strip()
            if catalog_subject:
                subject = _label_subject(catalog_subject, family) or catalog_subject
            else:
                subject = _label_subject(raw_subject, family) or paper_subject or raw_text
            if (not chapter or chapter == subject) and raw_text and raw_text != subject and _label_subject(raw_text, family) is None:
                chapter = raw_text
            if not topic:
                topic = chapter
            qa["academicContext"] = {**ctx, "subject": subject, "chapter": chapter, "topic": topic}

            response = qa.get("response") if isinstance(qa.get("response"), dict) else {}
            evaluation = qa.get("evaluation") if isinstance(qa.get("evaluation"), dict) else {}
            selected = _selected(response)
            skipped = evaluation.get("isCorrect") is not True and (
                evaluation.get("isSkipped") is True
                or response.get("status") in {"skipped", "unanswered"}
                or selected is None
            )
            if selected is not None:
                response = {**response, "selected": selected, "selectedAnswer": selected}
            if skipped:
                response = {**response, "status": "skipped"}
            evaluation = {**evaluation, "isSkipped": skipped}
            qa["response"] = response
            qa["evaluation"] = evaluation


def _empty_bucket() -> dict:
    return {
        "subjects": {},
        "chapters": {},
        "rows": [],
    }


def _chapter_record(subject: str, chapter: str, agg: dict) -> dict:
    attempted = agg["attempted"]
    accuracy = round(agg["correct"] / attempted * 100, 2) if attempted else 0
    avg_time = round(agg["time"] / attempted, 1) if attempted else 0
    series = [point for _date, point in sorted(agg["series"], key=lambda item: str(item[0] or ""))]
    trend = _trend(series, CHAPTER_TREND_POINTS) if series else "new"
    if accuracy >= STRONG_ACCURACY:
        status = "strong"
        priority = "Low"
    elif accuracy < DEVELOPING_ACCURACY:
        status = "weak"
        priority = "High"
    else:
        status = "developing"
        priority = "Medium"
    return {
        "subject": subject,
        "chapter": chapter,
        "attempts": len(agg["attempt_ids"]),
        "questions": agg["questions"],
        "attempted": attempted,
        "correct": agg["correct"],
        "incorrect": agg["incorrect"],
        "skipped": agg["skipped"],
        "accuracy": accuracy,
        "avgTime": avg_time,
        "trend": trend,
        "status": status,
        "priority": priority,
        "fast": 0 < avg_time <= FAST_SECONDS,
        "highTime": avg_time >= HIGH_TIME_SECONDS,
        "reason": (
            f"Consistently low accuracy across {len(agg['attempt_ids'])} assessment(s)."
            if accuracy < DEVELOPING_ACCURACY
            else "Below-par performance requiring review."
        ),
        "evidence": {
            "attempts": len(agg["attempt_ids"]),
            "questions": agg["questions"],
            "accuracy": accuracy,
            "avgTime": avg_time,
            "incorrect": agg["incorrect"],
            "skipped": agg["skipped"],
            "attempted": attempted,
        },
    }


def _subject_record(name: str, agg: dict) -> dict:
    attempted = agg["attempted"]
    questions = agg["questions"]
    return {
        "subject": name,
        "attempts": len(agg["attempt_ids"]),
        "questions": questions,
        "attempted": attempted,
        "correct": agg["correct"],
        "incorrect": agg["incorrect"],
        "skipped": agg["skipped"],
        "accuracy": round(agg["correct"] / attempted * 100, 2) if attempted else 0,
        "attemptRate": round(attempted / questions * 100, 2) if questions else 0,
        "avgTime": round(agg["time"] / attempted, 1) if attempted else 0,
    }


def _pack(attempts_newest_first: list[dict], subjects: list[dict], strengths: list[dict], weaknesses: list[dict]) -> dict:
    real = [a for a in attempts_newest_first if not _blank_attempt(a)]
    overview = _overview(real)
    overview_all = _overview(attempts_newest_first)
    attention, reason = _attention(overview)
    return {
        "overview": overview,
        "overviewAll": overview_all,
        "aiSummary": _summary(overview, strengths, weaknesses, subjects),
        "aiSummaryAll": _summary(overview_all, strengths, weaknesses, subjects),
        "topStrengths": strengths,
        "topWeaknesses": weaknesses,
        "attention": attention,
        "attentionReason": reason,
        "status": overview["status"],
    }


def analyze_student_360(attempts: list[dict]) -> dict:
    """Build the faculty 360 bundles. `attempts` must already be repaired and newest-first."""
    grouped = {domain: [] for domain in DOMAINS}
    for attempt in attempts:
        grouped[_domain(attempt)].append(attempt)

    buckets = {domain: _empty_bucket() for domain in DOMAINS}
    for domain, domain_attempts in grouped.items():
        bucket = buckets[domain]
        for attempt in domain_attempts:
            family = attempt.get("examFamily")
            for qa in attempt.get("questionAttempts") or []:
                ctx = qa.get("academicContext") if isinstance(qa.get("academicContext"), dict) else {}
                question_blob = qa.get("question") if isinstance(qa.get("question"), dict) else {}
                subject = ctx.get("subject") or ""
                chapter = ctx.get("chapter") or ""
                topic = ctx.get("topic") or chapter
                response = qa.get("response") if isinstance(qa.get("response"), dict) else {}
                evaluation = qa.get("evaluation") if isinstance(qa.get("evaluation"), dict) else {}
                selected = _selected(response)
                skipped = evaluation.get("isSkipped") is True or (evaluation.get("isCorrect") is not True and selected is None)
                if skipped:
                    status = "Skipped"
                elif evaluation.get("isCorrect") is True:
                    status = "Correct"
                else:
                    status = "Incorrect"
                spent = _time_spent(qa.get("timing") if isinstance(qa.get("timing"), dict) else {})
                if subject:
                    sub = bucket["subjects"].setdefault(subject, {"questions": 0, "attempted": 0, "correct": 0, "incorrect": 0, "skipped": 0, "time": 0.0, "attempt_ids": set()})
                    ch = bucket["chapters"].setdefault((subject, chapter), {"questions": 0, "attempted": 0, "correct": 0, "incorrect": 0, "skipped": 0, "time": 0.0, "attempt_ids": set(), "series": {}})
                    for agg in (sub, ch):
                        agg["questions"] += 1
                        agg["attempt_ids"].add(attempt.get("id"))
                        if status == "Correct":
                            agg["correct"] += 1
                            agg["attempted"] += 1
                            agg["time"] += spent
                        elif status == "Skipped":
                            agg["skipped"] += 1
                        else:
                            agg["incorrect"] += 1
                            agg["attempted"] += 1
                            agg["time"] += spent
                    ch["series"].setdefault(attempt.get("id"), {"date": attempt.get("submittedAt") or attempt.get("date") or "", "correct": 0, "attempted": 0})
                    if status != "Skipped":
                        ch["series"][attempt.get("id")]["attempted"] += 1
                        if status == "Correct":
                            ch["series"][attempt.get("id")]["correct"] += 1
                behaviour = qa.get("behaviour") if isinstance(qa.get("behaviour"), dict) else {}
                revisits = behaviour.get("revisits")
                if revisits is None and behaviour.get("visits") is not None:
                    try:
                        revisits = max(0, int(behaviour["visits"]) - 1)
                    except (TypeError, ValueError):
                        revisits = None
                bucket["rows"].append({
                    "attemptId": attempt.get("id"),
                    "date": attempt.get("date"),
                    "examName": attempt.get("examName") or attempt.get("examTitle"),
                    "examMode": attempt.get("examMode"),
                    "examFamily": family,
                    "domain": "university" if domain == UNIVERSITY_DOMAIN else "competitive",
                    "questionNumber": qa.get("questionNumber"),
                    "id": qa.get("questionId"),
                    "subject": subject,
                    "chapter": chapter,
                    "topic": topic,
                    "difficulty": question_blob.get("difficulty"),
                    "type": question_blob.get("type") or question_blob.get("questionType"),
                    "marks": question_blob.get("marks") or 0,
                    "status": status,
                    "timeSpent": spent,
                    "answerChanges": response.get("answerChanges") or 0,
                    "revisits": revisits,
                    "markedForReview": bool(response.get("markedForReview")),
                    "selected": selected,
                    "correctAnswer": evaluation.get("correctAnswer") or question_blob.get("correctAnswer"),
                    "text": question_blob.get("text") or question_blob.get("question"),
                    "options": question_blob.get("options") or [],
                })

    def _finish_chapters(bucket: dict) -> list[dict]:
        records = []
        for (subject, chapter), agg in bucket["chapters"].items():
            series = []
            for point in agg["series"].values():
                if point["attempted"]:
                    series.append((point["date"], round(point["correct"] / point["attempted"] * 100, 2)))
            agg = {**agg, "series": series}
            records.append(_chapter_record(subject, chapter, agg))
        records.sort(key=lambda row: (row["accuracy"], row["subject"], row["chapter"]))
        return records

    def _finish_subjects(bucket: dict, family: str | None) -> list[dict]:
        records = [_subject_record(name, agg) for name, agg in bucket["subjects"].items()]
        records.sort(key=lambda row: subject_sort_key(row["subject"], family))
        return records

    by_domain = {}
    competitive = {domain: [] for domain in DOMAINS if domain != UNIVERSITY_DOMAIN}
    subjects_out = {"university": [], "competitive": {key: [] for key in competitive}}
    chapters_out = {"university": [], "competitive": {key: [] for key in competitive}}
    sw = {
        "university": {"strengths": [], "weaknesses": []},
        "competitive": {key: {"strengths": [], "weaknesses": []} for key in competitive},
    }
    rows = []
    for domain in DOMAINS:
        bucket = buckets[domain]
        family = None if domain == UNIVERSITY_DOMAIN else domain
        subject_rows = _finish_subjects(bucket, family)
        chapter_rows = _finish_chapters(bucket)
        strengths = [c for c in chapter_rows if c["attempted"] >= MIN_EVIDENCE_ATTEMPTED and c["accuracy"] >= STRONG_ACCURACY]
        strengths.sort(key=lambda row: -row["accuracy"])
        weaknesses = [c for c in chapter_rows if c["attempted"] >= MIN_EVIDENCE_ATTEMPTED and c["accuracy"] < DEVELOPING_ACCURACY]
        weaknesses.sort(key=lambda row: row["accuracy"])
        by_domain[domain] = _pack(grouped[domain], subject_rows, strengths, weaknesses)
        if domain == UNIVERSITY_DOMAIN:
            subjects_out["university"] = subject_rows
            chapters_out["university"] = chapter_rows
            sw["university"] = {"strengths": strengths, "weaknesses": weaknesses}
        else:
            subjects_out["competitive"][domain] = subject_rows
            chapters_out["competitive"][domain] = chapter_rows
            sw["competitive"][domain] = {"strengths": strengths, "weaknesses": weaknesses}
        rows.extend(bucket["rows"])

    return {
        "byDomain": by_domain,
        "subjects": subjects_out,
        "chapters": chapters_out,
        "strengthsWeaknesses": sw,
        "questionRows": rows,
    }
