import re
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class TokenPair(BaseModel):
    accessToken: str
    refreshToken: str


class UserPublic(BaseModel):
    id: str
    role: str
    email: str
    fullName: str
    firstName: Optional[str] = None
    institution: Optional[str] = None
    department: Optional[str] = None
    program: Optional[str] = None
    semester: Optional[str] = None
    rollNo: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None


class LoginRequest(BaseModel):
    # Accepts either a real email address or a plain roll number (no @).
    # The authenticate() function handles both cases.
    email: str = Field(..., min_length=1, max_length=255)
    password: str
    role: Optional[str] = None


class LoginResponse(TokenPair):
    user: UserPublic


class RefreshRequest(BaseModel):
    refreshToken: str


# Regex: optional leading +, then 7–15 digits (allows spaces/dashes between groups)
_PHONE_RE = re.compile(r"^\+?[\d\s\-]{7,20}$")


class RegisterRequest(BaseModel):
    # Drop extra="allow" — unknown fields must not be silently stored in the DB
    model_config = ConfigDict(extra="forbid")

    fullName: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=32)
    password: str = Field(..., min_length=8, max_length=128)
    university: Optional[dict[str, Any]] = None
    competitive: Optional[dict[str, Any]] = None
    gender: Optional[str] = Field(default=None, max_length=64)
    dob: Optional[str] = Field(default=None, max_length=32)  # ISO date string e.g. 2000-05-14

    @field_validator("fullName")
    @classmethod
    def full_name_not_blank(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("fullName must not be blank")
        # Reject purely numeric names or names with only special characters
        if not re.search(r"[A-Za-z\u00C0-\u024F]", stripped):
            raise ValueError("fullName must contain at least one letter")
        return stripped

    @field_validator("phone")
    @classmethod
    def phone_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if stripped and not _PHONE_RE.match(stripped):
            raise ValueError("phone must be a valid phone number (7–20 digits, optional leading +)")
        return stripped or None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one digit")
        if errors:
            raise ValueError(f"password must contain at least: {', '.join(errors)}")
        return v


class OtpRequest(BaseModel):
    email: Optional[EmailStr] = None
    otp: str
    purpose: Optional[str] = None


class ResendOtpRequest(BaseModel):
    email: EmailStr
    purpose: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    # token is the OTP value — required for reset to proceed
    token: str
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        errors = []
        if not re.search(r"[A-Z]", v):
            errors.append("one uppercase letter")
        if not re.search(r"[a-z]", v):
            errors.append("one lowercase letter")
        if not re.search(r"\d", v):
            errors.append("one digit")
        if errors:
            raise ValueError(f"password must contain at least: {', '.join(errors)}")
        return v


class ExamAttemptCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    examId: Optional[str] = None
    examName: Optional[str] = None
    examTitle: Optional[str] = None
    examMode: str = Field(default="University", description="University | Competitive")
    examFamily: Optional[str] = None
    startedAt: Optional[str] = None
    submittedAt: Optional[str] = None
    completedAt: Optional[str] = None
    elapsedSeconds: int = 0
    attemptKind: str = "practice"
    isDemo: bool = False
    interventionId: Optional[str] = None
    examSnapshot: dict[str, Any] = Field(default_factory=dict)
    exam: Optional[dict[str, Any]] = None
    interactions: Any = Field(default_factory=dict)
    questionAttempts: list[dict[str, Any]] = Field(default_factory=list)
    scoring: dict[str, Any] = Field(default_factory=dict)
    timing: dict[str, Any] = Field(default_factory=dict)
    summary: Optional[dict[str, Any]] = None


class MentorChatRequest(BaseModel):
    conversationId: Optional[str] = None
    message: str
    context: Optional[dict[str, Any]] = None
