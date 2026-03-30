# backend/app/api/routes_auth.py
import os
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from pydantic import BaseModel, EmailStr, Field

from app.config import settings
from app.db.user_store import UserStore
from app.middleware.auth import AuthUser, get_current_user
from app.services.auth_service import (
    create_access_token,
    hash_password,
    verify_password,
)


router = APIRouter()
_bearer = HTTPBearer(auto_error=False)


_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def _get_store() -> UserStore:
    db_path = os.environ.get("USER_DB_PATH", f"{_BACKEND_DIR}/users.db")
    return UserStore(db_path)


# ---- Pydantic models ----


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    is_admin: bool
    avatar: str | None = None
    bio: str | None = None
    created_at: str | None = None


class UpdateProfileRequest(BaseModel):
    username: str | None = Field(None, min_length=2, max_length=50)
    bio: str | None = Field(None, max_length=500)
    avatar: str | None = None


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class UserStatsResponse(BaseModel):
    total_scenarios: int
    total_campaigns: int
    total_events: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


# ---- Routes ----


@router.post("/register", status_code=201, response_model=TokenResponse)
def register(req: RegisterRequest):
    store = _get_store()
    try:
        if store.email_exists(req.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        hashed = hash_password(req.password)
        user = store.create_user(
            email=req.email,
            username=req.username,
            hashed_password=hashed,
            is_admin=False,
        )
    finally:
        store.close()

    token = create_access_token(data={"sub": user.id})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            is_admin=user.is_admin,
            avatar=user.avatar,
            bio=user.bio,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    store = _get_store()
    try:
        user = store.get_by_email(req.email)
    finally:
        store.close()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(data={"sub": user.id})
    store = _get_store()
    try:
        store.update_last_login(user.id)
    finally:
        store.close()
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            is_admin=user.is_admin,
            avatar=user.avatar,
            bio=user.bio,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: AuthUser = Depends(get_current_user)):
    store = _get_store()
    try:
        user = store.get_by_id(current_user.id)
    finally:
        store.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        avatar=user.avatar,
        bio=user.bio,
        created_at=user.created_at,
    )


@router.put("/me", response_model=UserResponse)
def update_me(
    req: UpdateProfileRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    store = _get_store()
    try:
        user = store.update_user(
            current_user.id,
            username=req.username,
            bio=req.bio,
            avatar=req.avatar,
        )
    finally:
        store.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        avatar=user.avatar,
        bio=user.bio,
        created_at=user.created_at,
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    req: ChangePasswordRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    store = _get_store()
    try:
        user = store.get_by_id(current_user.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not verify_password(req.old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )
        store.update_password(current_user.id, hash_password(req.new_password))
    finally:
        store.close()
    return MessageResponse(message="Password changed successfully")


@router.delete("/account", response_model=MessageResponse)
def delete_account(current_user: AuthUser = Depends(get_current_user)):
    store = _get_store()
    try:
        deleted = store.delete_user(current_user.id)
    finally:
        store.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return MessageResponse(message="Account deleted")


@router.get("/me/stats", response_model=UserStatsResponse)
def get_my_stats(current_user: AuthUser = Depends(get_current_user)):
    import os as _os
    from app.db.scenario_store import ScenarioStore
    from app.db.event_store import EventStore

    _BACKEND_DIR = _os.path.dirname(
        _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
    )
    scenario_store = ScenarioStore(_os.environ.get("SCENARIO_DB_PATH", f"{_BACKEND_DIR}/scenarios.db"))
    event_store = EventStore(_os.environ.get("EVENT_DB_PATH", f"{_BACKEND_DIR}/events.db"))

    try:
        scenarios = scenario_store.list_scenarios()
        total_scenarios = sum(1 for s in scenarios if s.user_id == current_user.id)

        total_campaigns = 0
        for s in scenarios:
            if s.user_id == current_user.id:
                total_campaigns += len(scenario_store.get_campaigns(s.id))

        with event_store._conn as conn:
            total_events = conn.execute("SELECT COUNT(*) FROM events").fetchone()[0] or 0
    finally:
        scenario_store.close()
        event_store.close()

    return UserStatsResponse(
        total_scenarios=total_scenarios,
        total_campaigns=total_campaigns,
        total_events=total_events,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: AuthUser = Depends(get_current_user)):
    # Stateless JWT — client discards the token
    return MessageResponse(message="Logged out successfully")
