from datetime import datetime, timedelta, timezone
import json
import hashlib

from fastapi import APIRouter, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.core.deps import DbDep, OptionalUserDep, SettingsDep, UserDep
from app.core.logging import log_event
from app.core.security import decode_token, hash_password
from app.models.identity import OtpChallenge, RegistrationDraft, Role, User, UserRole
from app.models.people import StudentProfile
from app.schemas.auth import LoginRequest, LoginResponse, OtpRequest, RefreshRequest, RegisterRequest, ResendOtpRequest, ResetPasswordRequest, TokenPair
from app.services.exam_auth import open_exam_auth_deadline
from app.services.live_catalog import registration_options as live_registration_options
from app.services.seed import DEMO_INSTITUTION_ID, authenticate, issue_tokens, user_public
# OtpChallenge / RegistrationDraft still used by forgot-password, reset-password, verify-email routes.

router = APIRouter(prefix="/auth", tags=["auth"])


def _otp_hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: DbDep):
    user = authenticate(db, body.email, body.password, body.role)
    if not user:
        log_event("medixo.auth", "warning", "login_failed", email=body.email, role=body.role)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email, password, or role")
    # First-session-wins for students: refuse a new login while an existing
    # session is still active. This blocks a second tab or browser on any
    # device until the student logs out or the current session expires.
    mid_exam = False
    if user.primary_role == "student" and user.active_session_id and user.session_expires_at:
        expires = user.session_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires > datetime.now(timezone.utc):
            # Mid-exam recovery beats the session lock: a student whose device
            # or token is gone must be able to sign back in and resume the open
            # sitting. The new login takes over the session, so the previous
            # token stops working and only one device holds the exam.
            mid_exam = open_exam_auth_deadline(db, user) is not None
            if not mid_exam:
                log_event("medixo.auth", "warning", "login_blocked_active_session", user_id=user.id, email=body.email)
                raise HTTPException(status.HTTP_409_CONFLICT, "Already signed in elsewhere. Log out from the other session first.")
            log_event("medixo.auth", "info", "login_exam_session_takeover", user_id=user.id, email=body.email)
    tokens = issue_tokens(user, db, exam_takeover=mid_exam)
    log_event("medixo.auth", "info", "login_ok", user_id=user.id, email=user.email, role=body.role)
    if (body.role or user.primary_role) == "admin":
        from app.services.admin_intel_cache import schedule_warm_user

        schedule_warm_user(user.id)
    return {**tokens, "user": user_public(db, user)}


@router.get("/me")
def me(db: DbDep, user: UserDep):
    return user_public(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: DbDep):
    try:
        payload = decode_token(body.refreshToken)
        if payload.get("typ") != "refresh":
            raise JWTError("not refresh")
        user = db.get(User, payload["sub"])
    except (JWTError, KeyError, ValueError):
        user = None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.scalars(select(User).options(joinedload(User.role_links).joinedload(UserRole.role)).where(User.id == user.id)).unique().one()
    # Mid-exam: issue_tokens detects the open sitting and keeps sid + long TTL,
    # so refreshing never kicks the student off their exam device.
    return issue_tokens(user, db)


@router.post("/forgot-password")
def forgot_password(body: dict, db: DbDep):
    email = str(body.get("email") or "").lower()
    code = "482193"
    db.add(
        OtpChallenge(
            email=email,
            purpose="reset",
            code_hash=_otp_hash(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()
    return {"ok": True, "message": "If an account exists for that email, a reset link has been sent.", "verificationId": "otp_reset", "demoOtp": code}


@router.post("/verify-otp")
def verify_otp(body: OtpRequest, db: DbDep):
    q = select(OtpChallenge).where(OtpChallenge.consumed_at.is_(None)).order_by(OtpChallenge.created_at.desc())
    if body.email:
        q = q.where(OtpChallenge.email == body.email.lower())
    rows = db.scalars(q).all()
    row = next((r for r in rows if r.code_hash == _otp_hash(body.otp)), None)
    if not row:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OTP. Check the code and try again.")
    expires = row.expires_at if row.expires_at.tzinfo else row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OTP expired")
    row.consumed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "token": "otp_verified"}


@router.post("/resend-otp")
def resend_otp(body: ResendOtpRequest, db: DbDep):
    """Re-issue a fresh OTP for the given email and purpose."""
    email = (body.email or "").lower().strip()
    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email is required to resend an OTP")
    purpose = (body.purpose or "register").strip()
    code = "482193"
    db.add(
        OtpChallenge(
            email=email,
            purpose=purpose,
            code_hash=_otp_hash(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=10),
        )
    )
    db.commit()
    return {"ok": True, "message": "OTP re-sent.", "demoOtp": code}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: DbDep):
    """
    Change a user's password.  Requires a valid, unconsumed 'reset' OTP
    (issued by /forgot-password) passed as `token` in the request body.
    """
    email = body.email.lower().strip()

    # --- validate the reset OTP before touching any password ---
    q = (
        select(OtpChallenge)
        .where(
            OtpChallenge.email == email,
            OtpChallenge.purpose == "reset",
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.code_hash == _otp_hash(body.token),
        )
        .order_by(OtpChallenge.created_at.desc())
    )
    otp_row = db.scalars(q).first()
    if not otp_row:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset code")
    expires = otp_row.expires_at if otp_row.expires_at.tzinfo else otp_row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Reset code has expired — request a new one")

    # Mark the OTP consumed *before* committing the password change
    otp_row.consumed_at = datetime.now(timezone.utc)

    user = db.scalars(select(User).where(User.email == email)).first()
    if user:
        user.password_hash = hash_password(body.password)
    db.commit()
    return {"ok": True, "message": "Password updated. You can now sign in."}


@router.post("/verify-email")
def verify_email(body: OtpRequest, db: DbDep):
    """Verify an email address using an OTP challenge (purpose='register' or 'email')."""
    email = (body.email or "").lower().strip()
    q = (
        select(OtpChallenge)
        .where(
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.code_hash == _otp_hash(body.otp),
        )
        .order_by(OtpChallenge.created_at.desc())
    )
    if email:
        q = q.where(OtpChallenge.email == email)
    otp_row = db.scalars(q).first()
    if not otp_row:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code incorrect.")
    expires = otp_row.expires_at if otp_row.expires_at.tzinfo else otp_row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code has expired — request a new one")
    otp_row.consumed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "verified": True}


@router.get("/registration/options")
def registration_options(db: DbDep):
    return live_registration_options(db)


@router.get("/registration/status")
def registration_status(email: str, db: DbDep):
    email = email.lower().strip()
    user = db.scalars(select(User).where(User.email == email)).first()
    if user:
        return {"registered": True, "verified": True}
    draft = db.scalars(select(RegistrationDraft).where(RegistrationDraft.email == email).order_by(RegistrationDraft.created_at.desc())).first()
    if not draft:
        return {"registered": False}
    return {"registered": True, "verified": bool(draft.verified_at)}


def _extract_first_name(full_name: str, fallback: str = "Student") -> str:
    """Return the first whitespace-separated token of full_name, or fallback."""
    parts = (full_name or "").strip().split()
    return parts[0] if parts else fallback


@router.post("/register")
def register(body: RegisterRequest, db: DbDep, settings: SettingsDep):
    """Direct registration — creates user immediately and returns tokens. No OTP required."""
    email = body.email.lower().strip()

    # Block if an account already exists for this email
    if db.scalars(select(User).where(User.email == email)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account already exists for this email — try signing in instead.")

    role = db.scalars(
        select(Role).where(Role.code == "student", Role.institution_id == DEMO_INSTITUTION_ID)
    ).first()

    full_name = (body.fullName or "Student").strip() or "Student"
    user = User(
        institution_id=DEMO_INSTITUTION_ID,
        email=email,
        phone=body.phone,
        password_hash=hash_password(body.password),
        full_name=full_name,
        first_name=_extract_first_name(full_name),
        status="active",
        email_verified_at=datetime.now(timezone.utc),
        legacy_role="student",
    )
    db.add(user)
    db.flush()

    if role:
        db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=DEMO_INSTITUTION_ID))

    uni = body.university or {}
    db.add(
        StudentProfile(
            user_id=user.id,
            institution_id=DEMO_INSTITUTION_ID,
            roll_no=f"REG-{user.id[:8].upper()}",
            extra=json.dumps(
                {
                    "program": uni.get("degree"),
                    "semester": uni.get("semester"),
                    "university": uni,
                    "competitive": body.competitive,
                    "gender": body.gender,
                    "dateOfBirth": body.dob,
                }
            ),
        )
    )
    db.commit()

    user = db.scalars(
        select(User)
        .options(joinedload(User.role_links).joinedload(UserRole.role))
        .where(User.id == user.id)
    ).unique().one()
    log_event("medixo.auth", "info", "register_ok", user_id=user.id, email=email)
    return {"ok": True, **issue_tokens(user, db), "user": user_public(db, user)}


@router.post("/register/verify")
def register_verify(body: OtpRequest, db: DbDep, settings: SettingsDep):
    email = (body.email or "").lower().strip()
    if not email:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email is required")

    # --- validate OTP against the database row (expiry + consume) ---
    otp_row = db.scalars(
        select(OtpChallenge)
        .where(
            OtpChallenge.email == email,
            OtpChallenge.purpose == "register",
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.code_hash == _otp_hash(body.otp),
        )
        .order_by(OtpChallenge.created_at.desc())
    ).first()
    if not otp_row:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification code")
    expires = otp_row.expires_at if otp_row.expires_at.tzinfo else otp_row.expires_at.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification code has expired — request a new one")
    otp_row.consumed_at = datetime.now(timezone.utc)

    # Idempotent: if the user was already created return tokens immediately
    existing = db.scalars(
        select(User)
        .options(joinedload(User.role_links).joinedload(UserRole.role))
        .where(User.institution_id == DEMO_INSTITUTION_ID, User.email == email)
    ).unique().first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account already exists for this email — try signing in instead.")

    # Load registration data from the stored draft (created at /register step)
    draft = db.scalars(
        select(RegistrationDraft)
        .where(RegistrationDraft.email == email, RegistrationDraft.verified_at.is_(None))
        .order_by(RegistrationDraft.created_at.desc())
    ).first()
    if not draft:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Registration session not found — please start registration again")
    draft_data = json.loads(draft.payload or "{}")

    role = db.scalars(
        select(Role).where(Role.code == "student", Role.institution_id == DEMO_INSTITUTION_ID)
    ).first()

    full_name = (draft_data.get("fullName") or "Student").strip() or "Student"
    user = User(
        institution_id=DEMO_INSTITUTION_ID,
        email=email,
        phone=draft_data.get("phone"),
        password_hash=hash_password(draft_data["password"]),
        full_name=full_name,
        first_name=_extract_first_name(full_name),
        status="active",
        email_verified_at=datetime.now(timezone.utc),
        legacy_role="student",
    )
    db.add(user)
    db.flush()

    if role:
        db.add(UserRole(user_id=user.id, role_id=role.id, institution_id=DEMO_INSTITUTION_ID))

    uni = draft_data.get("university") or {}
    db.add(
        StudentProfile(
            user_id=user.id,
            institution_id=DEMO_INSTITUTION_ID,
            roll_no=f"REG-{user.id[:8].upper()}",
            extra=json.dumps(
                {
                    "program": uni.get("degree"),
                    "semester": uni.get("semester"),
                    "university": uni,
                    "competitive": draft_data.get("competitive"),
                    "gender": draft_data.get("gender"),
                    "dateOfBirth": draft_data.get("dob"),
                }
            ),
        )
    )

    # Mark draft as verified and commit everything
    draft.verified_at = datetime.now(timezone.utc)
    db.commit()

    user = db.scalars(
        select(User)
        .options(joinedload(User.role_links).joinedload(UserRole.role))
        .where(User.id == user.id)
    ).unique().one()
    log_event("medixo.auth", "info", "register_ok", user_id=user.id, email=email)
    return {"ok": True, **issue_tokens(user, db), "user": user_public(db, user)}


@router.post("/profile-setup")
def profile_setup(body: dict, db: DbDep):
    from app.models.people import StudentProfile
    from app.services.seed import user_public

    email = str(body.get("email") or "").lower().strip()
    user = None
    if email:
        user = db.scalars(select(User).options(joinedload(User.role_links).joinedload(UserRole.role)).where(User.email == email)).unique().first()
    if user is None:
        return {"ok": True, "user": body}
    if body.get("fullName"):
        user.full_name = body["fullName"]
        user.first_name = _extract_first_name(body["fullName"], fallback=user.first_name or "Student")
    if body.get("phone"):
        user.phone = body["phone"]
    profile = db.get(StudentProfile, user.id)
    if profile:
        extra = json.loads(profile.extra or "{}")
        extra.update({k: v for k, v in body.items() if k not in {"password", "email"}})
        profile.extra = json.dumps(extra)
    db.commit()
    db.refresh(user)
    return {"ok": True, "user": user_public(db, user)}


@router.post("/change-password")
def change_password(body: dict, db: DbDep, user: UserDep):
    """
    Change the authenticated user's password.
    Requires the current (old) password for verification.
    No OTP needed — the user must already be logged in.
    """
    old_password = str(body.get("oldPassword") or "")
    new_password = str(body.get("newPassword") or "")

    if not old_password or not new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "oldPassword and newPassword are required")

    if len(new_password) < 8:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "New password must be at least 8 characters")

    from app.core.security import verify_password
    if not verify_password(old_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")

    if old_password == new_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "New password must be different from the current password")

    user.password_hash = hash_password(new_password)
    db.commit()
    log_event("medixo.auth", "info", "change_password_ok", user_id=user.id, email=user.email)
    return {"ok": True, "message": "Password updated successfully"}


@router.post("/logout")
def logout(db: DbDep, user: OptionalUserDep):
    # Clear the student's active session so the device fully signs out.
    if user is not None and user.active_session_id:
        user.active_session_id = None
        user.session_expires_at = None
        db.commit()
    return {"ok": True}
