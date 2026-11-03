"""Local-only live browser-verification seed for the Premium pagination fix.

Creates one published NEET paper, 15 real SQL questions, and one scored
attempt in the repository's documented local SQLite development DB. Uses the
real backend ORM/services and real dev-account records; no production data.
Run from `backend/` with `DATABASE_URL=sqlite:////tmp/edux-live.db`.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select

from app.db.session import SessionLocal, ensure_schema
from app.models.assessment import Paper, PaperQuestion, Question
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import User
from app.services.examination import (
    STATUS_PUBLISHED,
    _catalog_maps,
    snapshot_question,
    submit_exam_attempt,
)

PAPER_ID = 'paper-live-neet-01'
ATTEMPT_ID = 'e389c240-cbe7-4c11-a491-e05b178dbb97'
STUDENT_ID = 'u_dev_student'
FACULTY_ID = 'u_dev_faculty'
SUBJECTS = ['Physics', 'Chemistry', 'Biology']
QUESTION_IDS = [f'q-live-neet-{i:02d}' for i in range(1, 16)]


def main():
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url.startswith('sqlite'):
        raise SystemExit('Refusing to seed a non-SQLite DATABASE_URL')
    ensure_schema()
    db = SessionLocal()
    faculty = db.get(User, FACULTY_ID)
    student = db.get(User, STUDENT_ID)
    if not faculty or not student:
        raise SystemExit('Run scripts/create_dev_accounts first')
    institution_id = student.institution_id
    if faculty.institution_id != institution_id:
        raise SystemExit('Faculty and student dev accounts belong to different institutions')

    # Idempotent local fixture: remove only this paper's local rows.
    existing_attempts = db.scalars(select(ExamAttempt).where(ExamAttempt.exam_id == PAPER_ID)).all()
    for attempt in existing_attempts:
        db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == attempt.id).delete()
        db.query(ExamAttempt).filter(ExamAttempt.id == attempt.id).delete()
    db.query(PaperQuestion).filter(PaperQuestion.paper_id == PAPER_ID).delete()
    db.query(Paper).filter(Paper.id == PAPER_ID).delete()
    db.query(Question).filter(Question.id.in_(QUESTION_IDS)).delete()
    db.commit()

    subjects_map, chapters_map, topics_map = _catalog_maps(db, institution_id)
    for i, qid in enumerate(QUESTION_IDS, start=1):
        subject = SUBJECTS[(i - 1) % len(SUBJECTS)]
        chapter = f'{subject} Core {((i - 1) // 3) + 1}'
        topic = f'{subject} Topic {i:02d}'
        db.add(Question(
            id=qid,
            institution_id=institution_id,
            exam_mode='competitive',
            exam_family='NEET',
            concept=subject,
            stem=(f'NEET calibration question {i}: a multi-stage assertion requires careful comparison '
                  f'of the governing equation, dimensional consistency, limiting behaviour and the '
                  f'experimental boundary conditions. Which conclusion is correct?'),
            q_type='mcq',
            options=json.dumps([
                f'Option A for question {i}',
                f'Option B for question {i}',
                f'Option C for question {i}',
                f'Option D for question {i}',
            ]),
            correct_answer='0',
            explanation=(f'Complete solution for question {i}. The governing relation is derived from '
                         f'the conservation law and the boundary conditions. Check every sign convention, '
                         f'unit and limiting case before selecting the final option.'),
            marks=4,
            negative_marks=1,
            difficulty='medium',
            bloom='application',
            is_pyq=False,
            source='pagination-fix-local-seed',
            status='approved',
            created_by=faculty.id,
        ))
    db.flush()

    paper = Paper(
        id=PAPER_ID,
        institution_id=institution_id,
        paper_code='LIVE-NEET-01',
        title='NEET UG · Full Mock 01',
        exam_mode='competitive',
        exam_family='NEET',
        paper_type='Full Mock',
        duration_minutes=30,
        total_marks=60,
        negative_marking=False,
        blueprint=json.dumps({
            'subject': 'All Subjects',
            'examFamily': 'NEET',
            'examType': 'Full Mock',
            'difficulty': 'Mixed',
            'questionCount': 15,
            'requestedQuestionCount': 15,
            'coverage': 100,
        }),
        status=STATUS_PUBLISHED,
        version=1,
        created_by=faculty.id,
    )
    db.add(paper)
    db.flush()
    for sort_order, qid in enumerate(QUESTION_IDS, start=1):
        question = db.get(Question, qid)
        db.add(PaperQuestion(
            paper_id=PAPER_ID,
            question_id=qid,
            sort_order=sort_order,
            marks_override=None,
            snapshot=json.dumps(snapshot_question(question, subjects_map, chapters_map, topics_map)),
        ))
    db.commit()

    # 8 correct (+32), 4 incorrect (0 with negative marking disabled), 3 skipped.
    answers = []
    interactions = {}
    question_attempts = []
    for i, qid in enumerate(QUESTION_IDS, start=1):
        selected = 0 if i <= 8 else (1 if i <= 12 else None)
        answers.append({'questionId': qid, 'selected': selected})
        interactions[qid] = {'timeSpent': 30 + i * 2}
        question_attempts.append({
            'questionId': qid,
            'response': {'selected': selected, 'status': 'skipped' if selected is None else 'answered'},
            'timing': {'timeSpent': 30 + i * 2},
            'behaviour': {'guess': i in (9, 11)},
        })
    body = {
        'examId': PAPER_ID,
        'attemptId': ATTEMPT_ID,
        'attemptKind': 'practice',
        'isDemo': False,
        'startedAt': (datetime.now(timezone.utc) - timedelta(minutes=45)).isoformat(),
        'elapsedSeconds': 900,
        'answers': answers,
        'questionAttempts': question_attempts,
        'interactions': interactions,
    }
    result = submit_exam_attempt(db, student, body, exam_id=PAPER_ID, attempt_id=None)
    generated_id = result['attempt']['id']
    # Keep the historical verification-script attempt id stable.
    db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == generated_id).update(
        {ExamQuestionAttempt.attempt_id: ATTEMPT_ID}, synchronize_session=False,
    )
    db.query(ExamAttempt).filter(ExamAttempt.id == generated_id).update(
        {ExamAttempt.id: ATTEMPT_ID}, synchronize_session=False,
    )
    db.commit()
    attempt = db.get(ExamAttempt, ATTEMPT_ID)
    scoring = json.loads(attempt.scoring or '{}')
    print(json.dumps({
        'paperId': PAPER_ID,
        'paperTitle': paper.title,
        'questionCount': len(QUESTION_IDS),
        'attemptId': ATTEMPT_ID,
        'studentId': STUDENT_ID,
        'score': scoring.get('score'),
        'maxScore': scoring.get('maxScore'),
        'correct': scoring.get('correct'),
        'incorrect': scoring.get('incorrect'),
        'skipped': scoring.get('unanswered'),
        'questionAttempts': db.query(ExamQuestionAttempt).filter(ExamQuestionAttempt.attempt_id == ATTEMPT_ID).count(),
    }, indent=2))
    db.close()


if __name__ == '__main__':
    main()
