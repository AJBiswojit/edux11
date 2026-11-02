"""Phase 3 admin runtime — sqlite verification. Does not claim live PostgreSQL."""

from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone
import json

from app.core.security import hash_password
from app.models.catalog import Course, Department, Batch
from app.models.exams import ExamAttempt, ExamQuestionAttempt
from app.models.identity import Institution, Role, User, UserRole
from app.models.ops import AuditLog, SupportTicket
from app.models.people import FacultyProfile, StudentProfile

from test.conftest import auth_header


FORBIDDEN = ("MIT-P", "Meridian Institute of Technology", "Anil Menon", "Dr. Anil", "Meera Krishnan", "Aarav Sharma")


def _blob(value) -> str:
    return str(value)


def _admin(db, *, inst_id: str, email: str, name: str, user_id: str) -> User:
    existing = db.get(User, user_id)
    if existing:
        return existing
    user = User(
        id=user_id,
        institution_id=inst_id,
        email=email,
        password_hash=hash_password("aurora123"),
        full_name=name,
        first_name=name.split(" ", 1)[0],
        status="active",
        legacy_role="admin",
    )
    db.add(user)
    role = db.query(Role).filter(Role.institution_id == inst_id, Role.code == "admin").first()
    if role is None:
        role = Role(institution_id=inst_id, code="admin", name="Admin")
        db.add(role)
        db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst_id))
    db.commit()
    db.refresh(user)
    return user


def test_admin_identity_from_authenticated_user(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    res = client.get("/v1/admin-intelligence/summary", headers=auth_header(admin))
    assert res.status_code == 200, res.text
    snap = res.json()
    profile = snap["profile"]
    assert profile["userId"] == admin.id
    assert profile["fullName"] == "Admin Alpha"
    assert profile["email"] == "admin.a@test.edu"
    assert profile["name"] == "Alpha University"
    text = _blob(snap)
    for token in FORBIDDEN:
        assert token not in text


def test_empty_admin_institution_stays_empty(client, db):
    inst = Institution(id="inst_empty_admin", slug="empty-admin", name="Empty Admin College")
    db.add(inst)
    db.flush()
    user = User(
        id="u_adm_empty",
        institution_id=inst.id,
        email="empty.admin@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Empty Admin",
        first_name="Empty",
        status="active",
        legacy_role="admin",
    )
    db.add(user)
    role = Role(institution_id=inst.id, code="admin", name="Admin")
    db.add(role)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=inst.id))
    db.commit()

    headers = auth_header(user)
    intel = client.get("/v1/admin-intelligence/summary", headers=headers).json()
    assert intel["profile"]["fullName"] == "Empty Admin"
    assert intel["profile"]["name"] == "Empty Admin College"
    assert intel["derived"]["totals"]["students"] == 0
    assert intel["derived"]["totals"]["faculty"] == 0
    assert intel["derived"]["totals"]["courses"] == 0
    assert intel["derived"]["institutionHealth"]["score"] == 0
    assert intel["derived"]["institutionHealth"]["grade"] == "Building"
    assert intel["derived"]["departments"]["list"] == []
    families = intel["derived"]["examFamilies"]["list"]
    assert [row["code"] for row in families] == ["JEE", "NEET"]
    assert all(row["attempts"] == 0 for row in families)
    assert intel["derived"]["examFamilies"]["overall"]["attempts"] == 0
    assert intel["derived"]["faculty"]["teaching"]["classSuccess"] == []
    assert intel["derived"]["faculty"]["teaching"]["errorGroups"] == []
    assert intel["derived"]["faculty"]["teaching"]["chapterRisk"] == []
    assert intel["datasets"]["people"]["students"] == []
    students = client.get("/v1/admin/students", headers=headers).json()
    assert students["students"] == []
    faculty = client.get("/v1/admin/faculty", headers=headers).json()
    assert faculty["faculty"] == []
    depts = client.get("/v1/admin/departments", headers=headers).json()
    assert depts["departments"] == []
    courses = client.get("/v1/admin/courses", headers=headers).json()
    assert courses["courses"] == []
    programs = client.get("/v1/admin/programs", headers=headers).json()
    assert programs["programs"] == []
    calendar = client.get("/v1/admin/calendar", headers=headers).json()
    assert calendar["events"] == []
    dash = client.get("/v1/admin/dashboard", headers=headers).json()
    assert dash["kpis"][0]["value"] == 0
    revenue = client.get("/v1/admin/revenue", headers=headers).json()
    assert revenue["kpis"] == []
    assert revenue["unavailable"] is True
    cms = client.get("/v1/admin/cms", headers=headers).json()
    assert cms["pages"] == []
    text = _blob(intel) + _blob(students) + _blob(faculty) + _blob(dash)
    for token in FORBIDDEN:
        assert token not in text


def test_admin_cross_institution_isolation(client, world, db):
    admin_a = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    admin_b = _admin(db, inst_id=world["inst_b"].id, email="admin.b@test.edu", name="Admin Beta", user_id="u_adm_b")
    bank_a = client.get("/v1/admin/question-bank", headers=auth_header(admin_a)).json()
    bank_b = client.get("/v1/admin/question-bank", headers=auth_header(admin_b)).json()
    ids_a = {q["id"] for q in bank_a["questions"]}
    ids_b = {q["id"] for q in bank_b["questions"]}
    assert "q_other_inst" not in ids_a
    assert "q_uni_1" not in ids_b
    assert "q_other_inst" in ids_b
    students_a = client.get("/v1/admin/students", headers=auth_header(admin_a)).json()
    assert all(s["id"] != world["student_b"].id for s in students_a["students"])
    users_b = client.get("/v1/admin/users", headers=auth_header(admin_b)).json()
    emails_b = {u["email"] for u in users_b["users"]}
    assert "admin.a@test.edu" not in emails_b
    assert "stu.a@test.edu" not in emails_b


def test_admin_create_student_and_faculty_persist(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    headers = auth_header(admin)
    created = client.post(
        "/v1/admin/students",
        json={"email": "new.stu@test.edu", "fullName": "New Student", "roll": "A900"},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    student_id = created.json()["student"]["id"]
    row = db.get(StudentProfile, student_id)
    assert row is not None
    assert row.institution_id == world["inst_a"].id
    listing = client.get("/v1/admin/students", headers=headers).json()
    assert any(s["id"] == student_id for s in listing["students"])
    created_row = next(s for s in listing["students"] if s["id"] == student_id)
    assert created_row["examsCompleted"] == 0
    assert created_row["analysisStatus"] == "No exams"

    fac = client.post(
        "/v1/admin/faculty",
        json={"email": "new.fac@test.edu", "fullName": "New Faculty", "status": "active"},
        headers=headers,
    )
    assert fac.status_code == 200, fac.text
    faculty_id = fac.json()["faculty"]["id"]
    profile = db.get(FacultyProfile, faculty_id)
    assert profile is not None
    faculty_list = client.get("/v1/admin/faculty", headers=headers).json()
    assert any(f["id"] == faculty_id for f in faculty_list["faculty"])


def test_admin_students_list_uses_exam_attempts_for_jee_neet(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    now = datetime.now(timezone.utc)
    db.add(
        ExamAttempt(
            institution_id=world["inst_a"].id,
            student_id=world["student"].id,
            roll_no="A001",
            exam_name="JEE Main Mock",
            exam_mode="competitive",
            exam_family="JEE_MAIN",
            started_at=now,
            submitted_at=now,
            exam_snapshot="{}",
            timing="{}",
            scoring='{"accuracy": 81, "score": 162, "maxScore": 200}',
            is_demo=False,
        )
    )
    db.commit()
    listing = client.get("/v1/admin/students", headers=auth_header(admin)).json()
    row = next(s for s in listing["students"] if s["id"] == world["student"].id)
    assert listing["totals"]["JEE"] >= 1
    assert "JEE" in (row.get("examFamilies") or [])
    assert row["batchType"] == "JEE"
    assert row["examsCompleted"] >= 1
    assert row["analysisStatus"] == "Ready"
    assert row["status"] == "Excellent"
    assert row["latestAccuracy"] == 81
    three60 = client.get(f"/v1/faculty/students/{world['student'].id}/360", headers=auth_header(admin))
    assert three60.status_code == 200, three60.text
    body = three60.json()
    assert body["jeeCount"] >= 1
    assert body["attempts"]
    assert body["attempts"][0]["examFamily"] == "JEE"


def test_admin_intelligence_exam_families_overall_performance(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    now = datetime.now(timezone.utc)
    db.add_all(
        [
            ExamAttempt(
                institution_id=world["inst_a"].id,
                student_id=world["student"].id,
                roll_no="A001",
                exam_name="JEE Physics Chapter Test",
                exam_mode="competitive",
                exam_family="jee",
                started_at=now,
                submitted_at=now,
                exam_snapshot='{"subject": "Physics"}',
                timing="{}",
                scoring='{"accuracy": 80}',
                is_demo=False,
            ),
            ExamAttempt(
                institution_id=world["inst_a"].id,
                student_id=world["student"].id,
                roll_no="A001",
                exam_name="JEE Chemistry Chapter Test",
                exam_mode="competitive",
                exam_family="jee",
                started_at=now,
                submitted_at=now,
                exam_snapshot='{"subject": "Chemistry"}',
                timing="{}",
                scoring='{"accuracy": 50}',
                is_demo=False,
            ),
            ExamAttempt(
                institution_id=world["inst_a"].id,
                student_id=world["student"].id,
                roll_no="A001",
                exam_name="NEET Biology Chapter Test",
                exam_mode="competitive",
                exam_family="neet",
                started_at=now,
                submitted_at=now,
                exam_snapshot='{"subject": "Biology"}',
                timing="{}",
                scoring='{"accuracy": 90}',
                is_demo=False,
            ),
        ]
    )
    db.commit()
    intel = client.get("/v1/admin-intelligence/summary", headers=auth_header(admin)).json()
    families = {row["code"]: row for row in intel["derived"]["examFamilies"]["list"]}
    assert set(families) == {"JEE", "NEET"}
    assert [s["name"] for s in families["JEE"]["subjects"]] == ["Physics", "Chemistry", "Mathematics"]
    assert [s["name"] for s in families["NEET"]["subjects"]] == ["Physics", "Chemistry", "Biology"]
    physics = next(s for s in families["JEE"]["subjects"] if s["name"] == "Physics")
    chemistry = next(s for s in families["JEE"]["subjects"] if s["name"] == "Chemistry")
    maths = next(s for s in families["JEE"]["subjects"] if s["name"] == "Mathematics")
    biology = next(s for s in families["NEET"]["subjects"] if s["name"] == "Biology")
    assert physics["attempts"] >= 1
    assert physics["accuracy"] == 80
    assert chemistry["attempts"] >= 1
    assert chemistry["accuracy"] == 50
    assert maths["attempts"] == 0
    assert biology["attempts"] >= 1
    assert biology["accuracy"] == 90
    assert families["NEET"]["accuracy"] == 90
    assert intel["derived"]["examFamilies"]["overall"]["attempts"] >= 3


def test_admin_catalog_and_settings_mutations(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    headers = auth_header(admin)
    dept = client.post("/v1/admin/departments", json={"code": "CSE", "name": "Computer Science"}, headers=headers)
    assert dept.status_code == 200, dept.text
    dept_id = dept.json()["department"]["id"]
    assert db.get(Department, dept_id) is not None
    course = client.post("/v1/admin/courses", json={"code": "CS101A", "name": "Intro CS"}, headers=headers)
    assert course.status_code == 200, course.text
    assert db.get(Course, course.json()["course"]["id"]) is not None
    event = client.post("/v1/admin/calendar", json={"title": "Orientation", "date": "2026-09-01", "type": "academic"}, headers=headers)
    assert event.status_code == 200, event.text
    cal = client.get("/v1/admin/calendar", headers=headers).json()
    assert any(e["title"] == "Orientation" for e in cal["events"])
    saved = client.patch(
        "/v1/admin/settings",
        json={"institution": {"name": "Alpha University North"}, "features": {"enableAiTutor": True}},
        headers=headers,
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["institution"]["name"] == "Alpha University North"
    inst = db.get(Institution, world["inst_a"].id)
    db.refresh(inst)
    assert inst.name == "Alpha University North"
    ticket = client.post("/v1/admin/support", json={"title": "Need help", "body": "Printer down"}, headers=headers)
    assert ticket.status_code == 200, ticket.text
    assert db.get(SupportTicket, ticket.json()["ticket"]["id"]) is not None
    logs = client.get("/v1/admin/audit-logs", headers=headers).json()
    assert logs["logs"]
    assert db.query(AuditLog).filter(AuditLog.institution_id == world["inst_a"].id).count() >= 1


def test_admin_invite_and_status(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    headers = auth_header(admin)
    invited = client.post(
        "/v1/admin/users/invite",
        json={"emails": ["invitee@test.edu"], "role": "faculty"},
        headers=headers,
    )
    assert invited.status_code == 200, invited.text
    assert invited.json()["count"] == 1
    user_id = invited.json()["invited"][0]["id"]
    target = db.get(User, user_id)
    assert target.status == "invited"
    patched = client.patch(f"/v1/admin/users/{user_id}/status", json={"status": "active"}, headers=headers)
    assert patched.status_code == 200, patched.text
    db.refresh(target)
    assert target.status == "active"


def test_admin_report_ready_is_downloadable(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    headers = auth_header(admin)
    created = client.post(
        "/v1/admin/reports",
        json={"title": "Institution review", "format": "PDF", "category": "Executive", "summary": "Live counts only."},
        headers=headers,
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["ok"] is True
    report = body["report"]
    assert report["generationStatus"] == "READY"
    assert report["downloadable"] is True
    listing = client.get("/v1/admin/reports", headers=headers).json()
    assert any(item["id"] == report["id"] for item in listing["items"])
    download = client.get(f"/v1/admin/reports/{report['id']}/download", headers=headers)
    assert download.status_code == 200, download.text
    assert download.headers["content-type"].startswith("application/pdf")
    assert download.content[:4] == b"%PDF"


def test_admin_p3_surfaces_stay_empty(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    headers = auth_header(admin)
    for path, key in (
        ("/v1/admin/revenue", "invoices"),
        ("/v1/admin/scholarships", "items"),
        ("/v1/admin/cms", "pages"),
        ("/v1/admin/api-config", "keys"),
        ("/v1/admin/data-tools", "exports"),
        ("/v1/admin/permissions", "modules"),
        ("/v1/admin/placements", "drives"),
    ):
        body = client.get(path, headers=headers).json()
        assert body.get("unavailable") is True
        assert body.get(key) == []


def test_admin_http_does_not_consume_spa_snapshots():
    """Admin HTTP path is assembler-only — no spa_documents / payload(\"admin-…\")."""
    root = Path(__file__).resolve().parents[1]
    admin_api = (root / "app/api/v1/admin.py").read_text(encoding="utf-8")
    runtime = (root / "app/services/admin_runtime.py").read_text(encoding="utf-8")
    for source in (admin_api, runtime):
        assert "spa_documents" not in source
        assert "from app.services.spa" not in source
        assert 'payload("' not in source
        assert "payload('" not in source


def test_faculty_teaching_intelligence_class_errors_and_chapter_risk(client, world, db):
    admin = _admin(db, inst_id=world["inst_a"].id, email="admin.a@test.edu", name="Admin Alpha", user_id="u_adm_a")
    now = datetime.now(timezone.utc)
    batch = Batch(
        id="batch_jee_a",
        institution_id=world["inst_a"].id,
        code="JEE-A",
        name="JEE Batch A",
        exam_mode="competitive",
        exam_family="jee",
    )
    db.add(batch)
    peer = User(
        id="u_stu_a2",
        institution_id=world["inst_a"].id,
        email="stu.a2@test.edu",
        password_hash=hash_password("aurora123"),
        full_name="Stu A2",
        first_name="Stu",
        status="active",
        legacy_role="student",
    )
    db.add(peer)
    role = db.query(Role).filter(Role.institution_id == world["inst_a"].id, Role.code == "student").first()
    db.add(UserRole(user_id=peer.id, role_id=role.id, institution_id=world["inst_a"].id))
    db.add(StudentProfile(user_id=peer.id, institution_id=world["inst_a"].id, roll_no="A002", batch_id=batch.id))
    profile_a = db.get(StudentProfile, world["student"].id)
    profile_a.batch_id = batch.id
    attempts = []
    for student, roll in ((world["student"], "A001"), (peer, "A002")):
        attempt = ExamAttempt(
            institution_id=world["inst_a"].id,
            student_id=student.id,
            roll_no=roll,
            batch_id=batch.id,
            exam_name="Physics chapter test",
            exam_mode="competitive",
            exam_family="jee",
            started_at=now,
            submitted_at=now,
            exam_snapshot='{"subject": "Physics"}',
            timing="{}",
            scoring='{"accuracy": 25}',
            is_demo=False,
        )
        db.add(attempt)
        db.flush()
        attempts.append(attempt)
        for i, error in enumerate(("Concept error", "Calculation error")):
            db.add(
                ExamQuestionAttempt(
                    attempt_id=attempt.id,
                    question_id=f"q_{roll}_{i}",
                    question_number=i + 1,
                    question_snapshot=json.dumps({"subject": "Physics", "chapter": "Kinematics"}),
                    academic_context=json.dumps({"subject": "Physics", "chapter": "Kinematics"}),
                    response=json.dumps({"selected": 1, "status": "answered"}),
                    timing="{}",
                    behaviour=json.dumps({"errorType": error}),
                    evaluation=json.dumps({"isCorrect": False, "errorType": error}),
                )
            )
    db.commit()

    intel = client.get("/v1/admin-intelligence/summary", headers=auth_header(admin)).json()
    teaching = intel["derived"]["faculty"]["teaching"]
    classes = {row["class"]: row for row in teaching["classSuccess"]}
    assert "JEE Batch A" in classes
    assert classes["JEE Batch A"]["atRisk"] == 2
    assert classes["JEE Batch A"]["avg"] == 25
    assert classes["JEE Batch A"]["passRate"] == 0
    detail = client.get("/v1/admin-intelligence/teaching", headers=auth_header(admin)).json()
    cats = {row["category"]: row for row in detail["errorGroups"]}
    assert cats["Concept error"]["count"] == 2
    assert cats["Calculation error"]["count"] == 2
    risk = next(row for row in detail["chapterRisk"] if row["chapter"] == "Kinematics")
    assert risk["class"] == "JEE Batch A"
    assert risk["subject"] == "Physics"
    assert risk["studentsAtRisk"] == 2
    names = {row["name"] for row in risk["students"]}
    assert names == {"Stu A", "Stu A2"}
    assert risk["avgAccuracy"] == 0
    assert detail["summary"]["chaptersNeedingImprovement"] >= 1

