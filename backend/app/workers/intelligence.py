"""Workers that recompute derived intelligence. Never call LLMs for scores."""

from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.intelligence import StudentDnaSnapshot

OFFICIAL_KINDS = {"official", "practice", "sample"}


def rebuild_student_dna(db: Session, student_id: str) -> None:
    attempts = db.scalars(
        select(ExamAttempt).where(
            ExamAttempt.student_id == student_id,
            ExamAttempt.is_demo.is_(False),
            ExamAttempt.is_deleted.is_(False),
            ExamAttempt.attempt_kind.in_(tuple(OFFICIAL_KINDS)),
        )
    ).all()

    buckets: dict[tuple[str, str | None], dict] = defaultdict(lambda: {"attempts": 0, "chapters": defaultdict(lambda: {"n": 0, "correct": 0, "time": 0})})
    for attempt in attempts:
        key = (attempt.exam_mode.lower(), (attempt.exam_family or "").lower() or None)
        buckets[key]["attempts"] += 1
        qas = db.scalars(select(ExamQuestionAttempt).where(ExamQuestionAttempt.attempt_id == attempt.id)).all()
        for qa in qas:
            ctx = json.loads(qa.academic_context or "{}")
            ev = json.loads(qa.evaluation or "{}")
            timing = json.loads(qa.timing or "{}")
            chapter = ctx.get("chapter") or "Unspecified"
            row = buckets[key]["chapters"][chapter]
            row["n"] += 1
            if ev.get("isCorrect"):
                row["correct"] += 1
            row["time"] += int(timing.get("timeSpent") or 0)

    for (mode, family), data in buckets.items():
        payload = {
            "examMode": mode,
            "examFamily": family,
            "attempts": data["attempts"],
            "chapters": [
                {
                    "chapter": ch,
                    "accuracy": round(100 * v["correct"] / v["n"], 1) if v["n"] else None,
                    "questions": v["n"],
                    "avgTime": round(v["time"] / v["n"], 1) if v["n"] else None,
                }
                for ch, v in data["chapters"].items()
            ],
            "computedAt": datetime.now(timezone.utc).isoformat(),
        }
        db.add(
            StudentDnaSnapshot(
                student_id=student_id,
                exam_mode=mode,
                exam_family=family,
                payload=json.dumps(payload),
            )
        )
    db.commit()
