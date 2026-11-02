"""Time-locked results: a student's exam result/report is withheld until the
exam's full duration (started_at + duration_minutes) has elapsed, even when the
student submits early. The attempt is still saved immediately. Faculty are not
gated; demo runs are not gated.
"""

from datetime import datetime, timedelta, timezone

from app.models.exams import ExamAttempt

from test.conftest import auth_header


def _publish_paper(client, faculty, *, title, question_ids, duration=60):
    created = client.post(
        "/v1/faculty/paper-generator/papers",
        json={
            "title": title,
            "domain": "University",
            "examFamily": None,
            "selectedQuestionIds": question_ids,
            "duration": duration,
            "totalMarks": 4,
        },
        headers=auth_header(faculty),
    )
    assert created.status_code == 200, created.text
    paper_id = created.json()["paper"]["id"]
    pub = client.post(f"/v1/faculty/paper-generator/papers/{paper_id}/publish", headers=auth_header(faculty))
    assert pub.status_code == 200, pub.text
    return paper_id


def _start(client, student, paper_id):
    res = client.post(f"/v1/student/exams/{paper_id}/start", json={}, headers=auth_header(student))
    assert res.status_code == 200, res.text
    return res.json()["attemptId"]


def _expire_sitting(db, attempt_id):
    """Move the timed window fully into the past so the result unlocks."""
    from app.models.exams import ExamSitting

    row = db.get(ExamAttempt, attempt_id)
    sitting = db.get(ExamSitting, row.sitting_id)
    sitting.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()


def _submit(client, student, paper_id, attempt_id):
    return client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "attemptId": attempt_id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student),
    )


def test_early_submit_withholds_result(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Gated Early", question_ids=["q_uni_1"], duration=60)
    attempt_id = _start(client, student, paper_id)

    # Submitted "early": started just now, 60-min exam → result still locked.
    res = _submit(client, student, paper_id, attempt_id)
    assert res.status_code == 200, res.text
    attempt = res.json()["attempt"]
    assert attempt["resultsPending"] is True
    assert attempt.get("resultsAvailableAt")
    assert "scoring" not in attempt  # score withheld

    # The read endpoints also withhold it.
    got = client.get(f"/v1/student/exam-agent/attempts/{attempt_id}", headers=auth_header(student)).json()
    assert got["attempt"]["resultsPending"] is True

    analysis = client.get(f"/v1/student/exam-analysis/{attempt_id}", headers=auth_header(student))
    assert analysis.status_code == 425, analysis.text


def test_result_available_after_duration(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Gated Done", question_ids=["q_uni_1"], duration=60)
    attempt_id = _start(client, student, paper_id)

    # The timed window has fully elapsed → result revealed.
    _expire_sitting(db, attempt_id)
    res = _submit(client, student, paper_id, attempt_id)
    assert res.status_code == 200, res.text
    attempt = res.json()["attempt"]
    assert attempt.get("resultsPending") is not True
    assert "scoring" in attempt

    analysis = client.get(f"/v1/student/exam-analysis/{attempt_id}", headers=auth_header(student))
    assert analysis.status_code == 200, analysis.text


def test_intelligence_endpoints_do_not_leak_locked_result(client, world, db):
    """Regression: early submit must NOT reveal score/summary/evaluations via the
    secondary student analytics endpoints (audit-found leak)."""
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Gated No Leak", question_ids=["q_uni_1"], duration=60)
    attempt_id = _start(client, student, paper_id)

    res = _submit(client, student, paper_id, attempt_id)
    assert res.status_code == 200, res.text
    assert res.json()["attempt"]["resultsPending"] is True

    # /intelligence/exam-attempts must show the attempt as pending, no scoring.
    intel = client.get("/v1/intelligence/exam-attempts", headers=auth_header(student)).json()
    row = next((a for a in intel["items"] if a.get("id") == attempt_id or a.get("examId") == paper_id), None)
    assert row is not None
    assert row.get("resultsPending") is True
    assert "scoring" not in row

    # /student/exam-analysis options list must not include the locked attempt's score.
    options = client.get("/v1/student/exam-analysis", headers=auth_header(student)).json()
    leaked = [o for o in options.get("items", []) if o.get("id") == attempt_id]
    assert leaked == [] or all("scoring" not in o for o in leaked)


def test_faculty_not_gated(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Gated Faculty View", question_ids=["q_uni_1"], duration=60)
    attempt_id = _start(client, student, paper_id)
    _submit(client, student, paper_id, attempt_id)  # early, still locked for student

    # Faculty analysis endpoint shows the result immediately.
    fac = client.get(
        f"/v1/faculty/students/{student.id}/exams/{attempt_id}/analysis", headers=auth_header(faculty)
    )
    assert fac.status_code == 200, fac.text
