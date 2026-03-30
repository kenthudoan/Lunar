# backend/app/middleware/auth.py
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.db.user_store import User, UserStore
from app.services.auth_service import decode_token


@dataclass
class AuthUser:
    id: str
    email: str
    username: str
    is_admin: bool


security = HTTPBearer(auto_error=False)


def _get_user_store() -> UserStore:
    import os
    _BACKEND_DIR = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    db_path = os.environ.get("USER_DB_PATH", f"{_BACKEND_DIR}/users.db")
    return UserStore(db_path)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> AuthUser:
    """FastAPI dependency — raises 401 if token is missing or invalid."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    store = _get_user_store()
    try:
        user = store.get_by_id(user_id)
    finally:
        store.close()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthUser(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
    )


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> AuthUser | None:
    """FastAPI dependency — returns None if token is missing, raises 401 if invalid."""
    if credentials is None:
        return None
    try:
        return get_current_user(credentials)
    except HTTPException:
        return None


def require_admin(
    current_user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    """FastAPI dependency — raises 403 if user is not an admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
