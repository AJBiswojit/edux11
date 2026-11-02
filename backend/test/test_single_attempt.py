"""One attempt per exam: once a student submits a real attempt, they cannot
start or submit that exam again. Demo runs are exempt (they are simulations).
"""

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


def _submit(client, student, paper_id, *, is_demo=False):
    return client.post(
        "/v1/student/exam-agent/attempts",
        json={
            "examId": paper_id,
            "isDemo": is_demo,
            "questionAttempts": [{"questionId": "q_uni_1", "response": {"selected": 0}}],
        },
        headers=auth_header(student),
    )


def test_second_attempt_is_blocked(client, world):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Once Only Quiz", question_ids=["q_uni_1"])

    first = _submit(client, student, paper_id)
    assert first.status_code == 200, first.text

    # Second real submission is refused.
    second = _submit(client, student, paper_id)
    assert second.status_code == 409, second.text
    assert "already attempted" in second.json()["detail"].lower()

    # Starting again is also refused.
    started = client.post(f"/v1/student/exams/{paper_id}/start", json={}, headers=auth_header(student))
    assert started.status_code == 409, started.text


def test_attempted_exam_stays_visible_but_flagged(client, world):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Flag After Attempt", question_ids=["q_uni_1"])

    # Visible and not-yet-attempted before submitting.
    before = client.get("/v1/student/exam-agent/exams", headers=auth_header(student)).json()
    row = next(x for x in before["items"] if x["id"] == paper_id)
    assert row["attempted"] is False

    assert _submit(client, student, paper_id).status_code == 200

    # After submitting: still listed, but flagged attempted (UI locks Start).
    agent_list = client.get("/v1/student/exam-agent/exams", headers=auth_header(student)).json()
    row = next(x for x in agent_list["items"] if x["id"] == paper_id)
    assert row["attempted"] is True

    hub_list = client.get("/v1/student/exams", headers=auth_header(student)).json()
    assert any(x["id"] == paper_id for x in hub_list["items"])

    # Detail is still viewable, and carries the attempted flag.
    detail = client.get(f"/v1/student/exams/{paper_id}", headers=auth_header(student))
    assert detail.status_code == 200, detail.text
    assert detail.json()["exam"]["attempted"] is True


def test_demo_allowed_until_exam_completed(client, world):
    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Demo Then Lock Quiz", question_ids=["q_uni_1"])

    # Demo runs on a not-yet-completed exam are allowed and may repeat.
    assert _submit(client, student, paper_id, is_demo=True).status_code == 200
    assert _submit(client, student, paper_id, is_demo=True).status_code == 200

    # A real attempt completes the exam.
    assert _submit(client, student, paper_id).status_code == 200

    # Now the exam is completed: BOTH real and demo re-entry are blocked.
    assert _submit(client, student, paper_id).status_code == 409
    assert _submit(client, student, paper_id, is_demo=True).status_code == 409
    started = client.post(
        f"/v1/student/exams/{paper_id}/start", json={"isDemo": True}, headers=auth_header(student)
    )
    assert started.status_code == 409, started.text


def test_soft_deleted_exam_attempt_is_ignored(client, world, db):
    from app.models.exams import ExamAttempt

    faculty = world["faculty"]
    student = world["student"]
    paper_id = _publish_paper(client, faculty, title="Soft Delete Quiz", question_ids=["q_uni_1"])

    res = _submit(client, student, paper_id)
    assert res.status_code == 200
    attempt_id = res.json()["id"]

    # Before soft-delete: visible to student and faculty 360
    stu_attempts = client.get("/v1/student/exam-agent/attempts", headers=auth_header(student)).json()["items"]
    assert any(a["id"] == attempt_id for a in stu_attempts)

    fac_360 = client.get(f"/v1/faculty/students/{student.id}/360", headers=auth_header(faculty)).json()
    assert any(a["id"] == attempt_id for a in fac_360.get("attempts", []))

    # Mark attempt as soft deleted (is_deleted = True)
    row = db.get(ExamAttempt, attempt_id)
    row.is_deleted = True
    db.commit()

    # After soft-delete: excluded from student attempt lists
    stu_attempts_after = client.get("/v1/student/exam-agent/attempts", headers=auth_header(student)).json()["items"]
    assert not any(a["id"] == attempt_id for a in stu_attempts_after)

    # Excluded from single attempt lookups
    detail_res = client.get(f"/v1/student/exam-agent/attempts/{attempt_id}", headers=auth_header(student))
    assert detail_res.status_code == 404

    analysis_res = client.get(f"/v1/student/exam-analysis/{attempt_id}", headers=auth_header(student))
    assert analysis_res.status_code == 404

    # Excluded from faculty Student 360 & attempt analysis
    fac_360_after = client.get(f"/v1/faculty/students/{student.id}/360", headers=auth_header(faculty)).json()
    assert not any(a["id"] == attempt_id for a in fac_360_after.get("attempts", []))

    fac_analysis_res = client.get(f"/v1/faculty/students/{student.id}/exams/{attempt_id}/analysis", headers=auth_header(faculty))
    assert fac_analysis_res.status_code == 404

