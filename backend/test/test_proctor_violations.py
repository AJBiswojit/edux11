"""Proctoring: tab-switch violations are persisted on the exam attempt and
surfaced on both the student report and the faculty analysis view.

The live runner counts each time the student leaves the exam window and sends
proctorViolations / terminated / terminationReason with the submission. On the
4th violation the frontend auto-submits with terminated=True.
"""

from app.models.assessment import Paper, PaperQuestion, Question
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


def test_terminated_attempt_flags_report_and_faculty_view(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Proctored Quiz Terminated", question_ids=["q_uni_1", "q_uni_2"])

    # Student is auto-submitted after the 4th tab-switch (3 warnings + 1).
    res = client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
            "proctorViolations": 4,
            "terminated": True,
            "terminationReason": "Auto-submitted: left the exam window 4 times",
        },
        headers=auth_header(student),
    )
    assert res.status_code == 200, res.text
    attempt = res.json()["attempt"]
    attempt_id = res.json()["id"]

    # Persisted on the attempt row.
    row = db.get(ExamAttempt, attempt_id)
    assert row.proctor_violations == 4
    assert row.terminated is True
    assert "left the exam window" in (row.termination_reason or "")

    # Surfaced on the student-facing report payload.
    assert attempt["proctorViolations"] == 4
    assert attempt["terminated"] is True
    assert attempt["terminationReason"]

    # Faculty sees the same violation data on their analysis view.
    fac = client.get(
        f"/v1/faculty/students/{student.id}/exams/{attempt_id}/analysis",
        headers=auth_header(faculty),
    )
    assert fac.status_code == 200, fac.text
    body = fac.json()
    assert body.get("proctorViolations") == 4
    assert body.get("terminated") is True


def test_clean_attempt_has_no_violations(client, world, db):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Proctored Quiz Clean", question_ids=["q_uni_1"])

    res = client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student),
    )
    assert res.status_code == 200, res.text
    attempt = res.json()["attempt"]
    assert attempt["proctorViolations"] == 0
    assert attempt["terminated"] is False
    assert attempt["terminationReason"] is None
