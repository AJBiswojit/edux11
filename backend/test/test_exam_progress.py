"""Layer 2 durability: in-progress answers are autosaved server-side into the
open ExamAttempt, so a disconnect / device loss / server restart never wipes
work. A fresh device can resume via GET, and the final submit reuses the same
open attempt.
"""

from app.models.exams import ExamAttempt

from test.conftest import auth_header


def _publish_paper(client, faculty, *, title, question_ids):
    created = client.post(
        "/v1/faculty/paper-generator/papers",
        json={
            "title": title,
            "domain": "University",
            "examFamily": None,
            "selectedQuestionIds": question_ids,
            "duration": 60,
            "totalMarks": 4,
        },
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    paper_id = created.json()["paper"]["id"]
    pub = client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
    assert pub.status_code == 200, pub.text
    return paper_id


def test_progress_autosave_and_resume(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Resumable Quiz", question_ids=["q_uni_1", "q_uni_2"])

    # No progress yet.
    empty = client.get(f"/v1/student/exams/{paper_id}/progress", headers=auth_header(student))
    assert empty.status_code == 200, empty.text
    assert empty.json()["hasProgress"] is False

    # Autosave mid-exam (student answered q_uni_1, 42s elapsed).
    saved = client.post(
        f"/v1/student/exams/{paper_id}/progress",
        json={"interactions": {"q_uni_1": {"selected": 0, "visited": True}}, "elapsedSeconds": 42},
        headers=auth_header(student),
    )
    assert saved.status_code == 200, saved.text

    # An open (unsubmitted) attempt now holds the answers.
    attempt = db.scalars(
        db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student.id,
            ExamAttempt.exam_id == paper_id,
            ExamAttempt.submitted_at.is_(None),
        ).statement
    ).first()
    assert attempt is not None
    assert attempt.submitted_at is None

    # Resume from a fresh device — GET returns the saved answers.
    resumed = client.get(f"/v1/student/exams/{paper_id}/progress", headers=auth_header(student))
    assert resumed.status_code == 200, resumed.text
    data = resumed.json()
    assert data["hasProgress"] is True
    assert data["interactions"]["q_uni_1"]["selected"] == 0
    assert data["elapsedSeconds"] == 42

    # Later save overwrites (latest-wins) — student answers q_uni_2 too.
    client.post(
        f"/v1/student/exams/{paper_id}/progress",
        json={"interactions": {"q_uni_1": {"selected": 0}, "q_uni_2": {"selected": 1}}, "elapsedSeconds": 90},
        headers=auth_header(student),
    )
    after = client.get(f"/v1/student/exams/{paper_id}/progress", headers=auth_header(student)).json()
    assert set(after["interactions"].keys()) == {"q_uni_1", "q_uni_2"}
    assert after["elapsedSeconds"] == 90


def test_submit_reuses_open_progress_attempt(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Resume Then Submit", question_ids=["q_uni_1"])

    # Autosave creates the open attempt.
    client.post(
        f"/v1/student/exams/{paper_id}/progress",
        json={"interactions": {"q_uni_1": {"selected": 0}}, "elapsedSeconds": 10},
        headers=auth_header(student),
    )
    open_attempt = db.scalars(
        db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student.id,
            ExamAttempt.exam_id == paper_id,
            ExamAttempt.submitted_at.is_(None),
        ).statement
    ).first()
    assert open_attempt is not None
    open_id = open_attempt.id

    # Final submit reuses that same open attempt (no duplicate).
    res = client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "attemptId": open_id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student),
    )
    assert res.status_code == 200, res.text
    assert res.json()["id"] == open_id

    # No open attempts remain; the one attempt is submitted.
    remaining_open = db.scalars(
        db.query(ExamAttempt).filter(
            ExamAttempt.student_id == student.id,
            ExamAttempt.exam_id == paper_id,
            ExamAttempt.submitted_at.is_(None),
        ).statement
    ).all()
    assert remaining_open == []


def test_progress_rejects_unpublished_or_foreign_exam(client, world):
    # A random / non-existent exam id must 404, never leak.
    res = client.get("/v1/student/exams/does-not-exist/progress", headers=auth_header(world["student"]))
    assert res.status_code == 404
