import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.catalog import Batch, Department, Program
from app.models.identity import Institution, Role, User, UserRole
from app.models.people import FacultyProfile, Guardian, GuardianStudent, StudentProfile
from app.services.demo_catalog import (
    AARAV_PROFILE_EXTRA,
    ADMINS,
    BATCHES,
    DEMO_INSTITUTION_ID,
    DEPARTMENTS,
    FACULTY,
    PARENTS,
    faculty_students,
)

EXPECTED_STUDENTS = 126


def seed_if_empty(db: Session) -> None:
    """Permanently disabled. The database holds real institution data; demo
    user/student/faculty seeding must never run again. Kept as a no-op so any
    stray caller is harmless. (Historically: seeded 126 demo students, faculty,
    parents and the academic dataset.)"""
    return None

    # --- dead code below: retained for reference only, never executed ---
    settings = get_settings()  # noqa: F841
    if not settings.seed_demo_users:
        return None

    # Fast-path: if the full student roster already exists, skip the
    # expensive user-upsert loop (saves hundreds of remote-DB round-trips
    # on every restart).  First boot is unaffected.
    existing_students = db.scalar(
        select(func.count()).select_from(StudentProfile)
        .where(StudentProfile.institution_id == DEMO_INSTITUTION_ID)
    ) or 0
    if existing_students >= EXPECTED_STUDENTS:
        from app.services.seed_academic import seed_academic
        try:
            academic = seed_academic(db)
            db.commit()
            return academic
        except Exception:
            db.rollback()
            get_logger("medixo").exception("academic_seed_failed")
            return {"skipped": True, "error": "academic_seed_failed"}

    inst = db.get(Institution, DEMO_INSTITUTION_ID)
    if inst is None:
        inst = Institution(
            id=DEMO_INSTITUTION_ID,
            slug="meridian",
            name="Meridian Institute of Technology",
            short_name="MIT-P",
            academic_year="2026–27",
        )
        db.add(inst)
        db.flush()

    roles: dict[str, Role] = {}
    for code, name in (("student", "Student"), ("faculty", "Faculty"), ("admin", "Administrator"), ("parent", "Parent")):
        role = db.scalars(select(Role).where(Role.institution_id == DEMO_INSTITUTION_ID, Role.code == code)).first()
        if role is None:
            role = Role(institution_id=DEMO_INSTITUTION_ID, code=code, name=name)
            db.add(role)
            db.flush()
        roles[code] = role

    depts: dict[str, Department] = {}
    for row in DEPARTMENTS:
        dept = db.get(Department, row["id"]) or db.scalars(
            select(Department).where(Department.institution_id == DEMO_INSTITUTION_ID, Department.code == row["code"])
        ).first()
        if dept is None:
            dept = Department(id=row["id"], institution_id=DEMO_INSTITUTION_ID, code=row["code"], name=row["name"])
            db.add(dept)
            db.flush()
        depts[row["code"]] = dept

    program = db.scalars(select(Program).where(Program.institution_id == DEMO_INSTITUTION_ID, Program.code == "BTECH-CSE")).first()
    if program is None:
        program = Program(
            id="prog_btech_cse",
            institution_id=DEMO_INSTITUTION_ID,
            department_id=depts["CSE"].id,
            code="BTECH-CSE",
            name="B.Tech — Computer Science",
            degree_type="B.Tech",
            duration_years=4,
        )
        db.add(program)
        db.flush()

    for row in BATCHES:
        if db.get(Batch, row["id"]) is None:
            db.add(
                Batch(
                    id=row["id"],
                    institution_id=DEMO_INSTITUTION_ID,
                    code=row["code"],
                    name=row["name"],
                    exam_mode=row["exam_mode"],
                    exam_family=row["exam_family"],
                    program_id=program.id if row["exam_mode"] == "university" else None,
                    section=row["section"],
                )
            )
    db.flush()

    password_hash = hash_password(settings.demo_password)

    def ensure_role(user_id: str, role_code: str) -> None:
        link = db.scalars(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == roles[role_code].id,
                UserRole.institution_id == DEMO_INSTITUTION_ID,
            )
        ).first()
        if link is None:
            db.add(UserRole(user_id=user_id, role_id=roles[role_code].id, institution_id=DEMO_INSTITUTION_ID))

    def upsert_user(*, user_id: str, email: str, full_name: str, first_name: str, phone: str | None, status: str, role_code: str) -> User:
        user = db.get(User, user_id) or db.scalars(select(User).where(User.email == email.lower())).first()
        if user is None:
            user = User(
                id=user_id,
                institution_id=DEMO_INSTITUTION_ID,
                email=email.lower(),
                phone=phone,
                password_hash=password_hash,
                full_name=full_name,
                first_name=first_name,
                status=status,
                email_verified_at=datetime.now(timezone.utc),
                legacy_role=role_code,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(user)
            db.flush()
        else:
            user.email = email.lower()
            user.full_name = full_name
            user.first_name = first_name
            if not user.institution_id:
                user.institution_id = DEMO_INSTITUTION_ID
            if phone:
                user.phone = phone
            user.status = status
            user.legacy_role = role_code
            db.flush()
        return user

    for row in FACULTY:
        user = upsert_user(
            user_id=row["id"],
            email=row["email"],
            full_name=row["full_name"],
            first_name=row["first_name"],
            phone=row.get("phone"),
            status="active",
            role_code="faculty",
        )
        ensure_role(user.id, "faculty")
        profile = db.get(FacultyProfile, user.id)
        if profile is None:
            db.add(
                FacultyProfile(
                    user_id=user.id,
                    institution_id=DEMO_INSTITUTION_ID,
                    department_id=depts[row["dept"]].id,
                    designation=row["designation"],
                    specialization=row["specialization"],
                    employee_no=row.get("employee_no"),
                )
            )
        else:
            profile.designation = row["designation"]
            profile.specialization = row["specialization"]

    for row in ADMINS:
        user = upsert_user(
            user_id=row["id"],
            email=row["email"],
            full_name=row["full_name"],
            first_name=row["first_name"],
            phone=row.get("phone"),
            status="active",
            role_code="admin",
        )
        ensure_role(user.id, "admin")

    _all_students = faculty_students()
    for row in _all_students:
        extra = {
            "program": row.get("program"),
            "semester": row.get("semester"),
            "attendance": row.get("attendance"),
            "internalMarks": row.get("internal_marks"),
            "academicLabel": row.get("status"),
            "domain": row.get("domain"),
            "examFamily": row.get("exam_family"),
        }
        if row["id"] == "u_stu_001":
            extra.update(AARAV_PROFILE_EXTRA)
            extra["enrollmentNo"] = "ENR-2024-0147"

        user = upsert_user(
            user_id=row["id"],
            email=row["email"],
            full_name=row["name"],
            first_name=row["first_name"],
            phone=row.get("phone"),
            status=row.get("account_status") or "active",
            role_code="student",
        )
        ensure_role(user.id, "student")
        profile = db.get(StudentProfile, user.id)
        if profile is None:
            db.add(
                StudentProfile(
                    user_id=user.id,
                    institution_id=DEMO_INSTITUTION_ID,
                    roll_no=row["roll"],
                    enrollment_no=extra.get("enrollmentNo"),
                    program_id=program.id,
                    department_id=depts["CSE"].id,
                    batch_id=row["batch_id"],
                    section=row.get("section"),
                    admission_year=row.get("admission_year") or 2024,
                    cgpa=row.get("cgpa"),
                    extra=json.dumps(extra),
                )
            )
        else:
            profile.roll_no = row["roll"]
            profile.batch_id = row["batch_id"]
            profile.cgpa = row.get("cgpa")
            profile.section = row.get("section")
            profile.program_id = program.id
            profile.department_id = depts["CSE"].id
            merged = json.loads(profile.extra or "{}")
            merged.update(extra)
            profile.extra = json.dumps(merged)

    db.flush()

    roster_by_id = {row["id"]: row for row in _all_students}
    for row in PARENTS:
        user = upsert_user(
            user_id=row["id"],
            email=row["email"],
            full_name=row["full_name"],
            first_name=row["first_name"],
            phone=row.get("phone"),
            status="active",
            role_code="parent",
        )
        ensure_role(user.id, "parent")
        if db.get(Guardian, user.id) is None:
            db.add(Guardian(user_id=user.id, institution_id=DEMO_INSTITUTION_ID))
            db.flush()
        ward_meta = roster_by_id.get(row["ward_id"]) or {}
        ward = db.get(User, row["ward_id"]) or (
            db.scalars(select(User).where(User.email == str(ward_meta.get("email") or "").lower())).first()
            if ward_meta.get("email")
            else None
        )
        if ward is None or db.get(StudentProfile, ward.id) is None:
            continue
        exists = db.scalars(
            select(GuardianStudent).where(
                GuardianStudent.guardian_id == user.id,
                GuardianStudent.student_id == ward.id,
            )
        ).first()
        if exists is None:
            db.add(GuardianStudent(guardian_id=user.id, student_id=ward.id, relationship=row["relationship"]))

    depts["CSE"].hod_user_id = "u_fac_001"
    db.commit()

    from app.services.seed_academic import seed_academic

    try:
        academic = seed_academic(db)
        db.commit()
        return academic
    except Exception:
        db.rollback()
        get_logger("medixo").exception("academic_seed_failed")
        return {"skipped": True, "error": "academic_seed_failed"}


def user_public(db: Session, user: User) -> dict:
    inst = db.get(Institution, user.institution_id) if user.institution_id else None
    student = db.get(StudentProfile, user.id)
    faculty = db.get(FacultyProfile, user.id)
    extra = json.loads(student.extra or "{}") if student else {}
    dept = db.get(Department, student.department_id) if student and student.department_id else None
    if faculty and faculty.department_id:
        dept = dept or db.get(Department, faculty.department_id)
    return {
        "id": user.id,
        "role": user.primary_role,
        "email": user.email,
        "fullName": user.full_name,
        "firstName": user.first_name,
        "institution": inst.name if inst else None,
        "department": dept.name if dept else None,
        "program": extra.get("program"),
        "semester": extra.get("semester"),
        "rollNo": student.roll_no if student else None,
        "phone": user.phone,
        "designation": faculty.designation if faculty else None,
    }


def student_master_profile(db: Session, user: User) -> dict:
    public = user_public(db, user)
    student = db.get(StudentProfile, user.id)
    extra = json.loads(student.extra or "{}") if student else {}
    names = (user.full_name or "").split(" ", 1)
    return {
        "id": user.id,
        "firstName": user.first_name or (names[0] if names else None),
        "lastName": extra.get("lastName") or (names[1] if len(names) > 1 else None),
        "fullName": user.full_name,
        "gender": extra.get("gender"),
        "dateOfBirth": extra.get("dateOfBirth") or (student.date_of_birth.isoformat() if student and student.date_of_birth else None),
        "bloodGroup": extra.get("bloodGroup"),
        "photo": None,
        "avatarGradient": extra.get("avatarGradient") or "linear-gradient(135deg, #6366f1, #3b82f6)",
        "email": user.email,
        "phone": user.phone,
        "address": {
            "city": extra.get("city"),
            "state": extra.get("state"),
            "pincode": extra.get("pincode"),
            "country": extra.get("country") or "India",
        },
        "institution": public.get("institution"),
        "institutionInfo": {
            "id": user.institution_id,
            "name": public.get("institution"),
            "city": extra.get("city"),
            "state": extra.get("state"),
        },
        "studentId": student.roll_no if student else None,
        "rollNo": student.roll_no if student else None,
        "enrollmentNo": student.enrollment_no if student else extra.get("enrollmentNo"),
        "program": extra.get("program"),
        "branch": public.get("department"),
        "department": public.get("department"),
        "semester": extra.get("semester"),
        "section": student.section if student else None,
        "batch": extra.get("batchLabel"),
        "admissionYear": student.admission_year if student else None,
        "academicStatus": (student.academic_status or "regular").title() if student else None,
        "cgpa": student.cgpa if student else None,
        "attendance": extra.get("attendance"),
        "rank": extra.get("rank"),
        "cohortSize": extra.get("cohortSize"),
    }


def issue_tokens(
    user: User,
    db: Session | None = None,
    *,
    rotate_session: bool = True,
    exam_takeover: bool = False,
) -> dict:
    """Issue access + refresh JWTs.

    Students normally rotate ``active_session_id`` on every issue (login /
    refresh) so only one device stays valid.

    Mid-exam exception: if the student has an open (unsubmitted) attempt, mint
    an access token that lasts until the sitting deadline (+ grace) so a
    30-minute default TTL cannot expire during a multi-hour exam. The session
    id is preserved (refresh / exam start) unless ``exam_takeover`` is set — a
    fresh login rotates it so exactly one device holds the sitting.
    """
    roles = [r.code for r in user.roles]
    sid: str | None = None
    access_minutes: int | None = None
    if db is not None and user.primary_role == "student":
        from app.services.exam_auth import access_minutes_until, open_exam_auth_deadline

        exam_deadline = open_exam_auth_deadline(db, user)
        if exam_deadline is not None:
            # Keep the sitting on one device: refresh / start reuse the current
            # sid; an explicit login takeover issues a new one.
            sid = str(uuid4()) if (exam_takeover or not user.active_session_id) else user.active_session_id
            user.active_session_id = sid
            current_exp = user.session_expires_at
            if current_exp is None or (
                (current_exp.replace(tzinfo=timezone.utc) if current_exp.tzinfo is None else current_exp)
                < exam_deadline
            ):
                user.session_expires_at = exam_deadline
            access_minutes = access_minutes_until(exam_deadline)
            db.commit()
        elif rotate_session:
            sid = str(uuid4())
            user.active_session_id = sid
            user.session_expires_at = datetime.now(timezone.utc) + timedelta(
                minutes=get_settings().access_token_expire_minutes
            )
            db.commit()
        elif user.active_session_id:
            # Explicit non-rotate (e.g. exam start race) without an open sitting.
            sid = user.active_session_id
    return {
        "accessToken": create_access_token(
            sub=user.id,
            institution_id=user.institution_id,
            roles=roles,
            sid=sid,
            minutes=access_minutes,
        ),
        "refreshToken": create_refresh_token(sub=user.id),
    }


def authenticate(db: Session, email: str, password: str, role: str | None) -> User | None:
    identifier = email.strip()

    # If the identifier has no "@" treat it as a roll number.
    # Look up the matching student_profile to get the user_id, then load the user.
    if "@" not in identifier:
        profile = db.scalars(
            select(StudentProfile).where(StudentProfile.roll_no == identifier)
        ).first()
        if profile is None:
            return None
        q = (
            select(User)
            .options(joinedload(User.role_links).joinedload(UserRole.role))
            .where(User.id == profile.user_id)
        )
    else:
        q = (
            select(User)
            .options(joinedload(User.role_links).joinedload(UserRole.role))
            .where(User.email == identifier.lower())
        )

    user = db.scalars(q).unique().first()
    if user is None or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if role and user.primary_role != role:
        return None
    if user.status != "active":
        return None
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    db.refresh(user, attribute_names=["role_links"])
    return user


def demo_counts(db: Session) -> dict:
    students = db.scalar(select(func.count()).select_from(StudentProfile).where(StudentProfile.institution_id == DEMO_INSTITUTION_ID)) or 0
    users = db.scalar(select(func.count()).select_from(User).where(User.institution_id == DEMO_INSTITUTION_ID)) or 0
    return {"students": int(students), "users": int(users), "expectedStudents": EXPECTED_STUDENTS}
