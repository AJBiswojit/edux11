from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.config import Settings, get_settings
from app.core.security import parse_access_token
from app.db.session import get_db
from app.models.identity import User, UserRole

bearer = HTTPBearer(auto_error=False)


def current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        user_id, sid = parse_access_token(creds.credentials)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = (
        db.scalars(
            select(User)
            .options(joinedload(User.role_links).joinedload(UserRole.role))
            .where(User.id == str(user_id))
        )
        .unique()
        .first()
    )
    if user is None or user.status != "active":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    # Single-device enforcement for students: the token's session id must match
    # the one currently stored on the user. A newer login elsewhere rotates the
    # stored id, so this (older) token is refused.
    if user.primary_role == "student" and user.active_session_id and sid != user.active_session_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Signed in on another device")
    return user


def require_roles(*roles: str):
    def checker(user: Annotated[User, Depends(current_user)]) -> User:
        codes = {r.code for r in user.roles}
        if getattr(user, "legacy_role", None):
            codes.add(user.legacy_role)
        codes.add(user.primary_role)
        if not codes.intersection(roles):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user

    return checker


def optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if creds is None or creds.scheme.lower() != "bearer":
        return None
    try:
        return current_user(creds, db)
    except HTTPException:
        return None


SettingsDep = Annotated[Settings, Depends(get_settings)]
DbDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[User, Depends(current_user)]
OptionalUserDep = Annotated[User | None, Depends(optional_user)]
