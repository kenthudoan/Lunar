# backend/app/api/routes_admin.py
import os

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from pydantic import Field

from app.db.user_store import UserStore
from app.db.scenario_store import ScenarioStore
from app.db.event_store import EventStore
from app.middleware.auth import AuthUser, get_current_user, require_admin
from app.config import settings


router = APIRouter()


_BACKEND_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)


def _get_user_store() -> UserStore:
    db_path = os.environ.get("USER_DB_PATH", f"{_BACKEND_DIR}/users.db")
    return UserStore(db_path)


def _get_scenario_store() -> ScenarioStore:
    db_path = os.environ.get("SCENARIO_DB_PATH", f"{_BACKEND_DIR}/scenarios.db")
    return ScenarioStore(db_path)


def _get_event_store() -> EventStore:
    db_path = os.environ.get("EVENT_DB_PATH", f"{_BACKEND_DIR}/events.db")
    return EventStore(db_path)


def _get_graph_engine(campaign_id: str):
    """Get a GraphEngine to clear Neo4j data for a campaign."""
    try:
        from app.engines.graph_engine import GraphEngine
        engine = GraphEngine(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password, campaign_id)
        return engine
    except Exception:
        return None


# ---- Response models ----


class AdminStats(BaseModel):
    total_users: int
    total_scenarios: int
    total_campaigns: int
    total_events: int


class UserListItem(BaseModel):
    id: str
    email: str
    username: str
    is_admin: bool
    is_active: bool | None = True
    created_at: str
    avatar: str | None = None
    bio: str | None = None
    last_login: str | None = None


class UserDetail(BaseModel):
    id: str
    email: str
    username: str
    is_admin: bool
    created_at: str
    avatar: str | None = None
    bio: str | None = None
    last_login: str | None = None
    stats: "UserDetailStats"


class UserDetailStats(BaseModel):
    total_scenarios: int
    total_campaigns: int


class UserUpdateRequest(BaseModel):
    username: str | None = Field(None, min_length=2, max_length=50)
    is_admin: bool | None = None


class MessageResponse(BaseModel):
    message: str


# ---- Admin stats ----


@router.get("/stats", response_model=AdminStats)
def admin_stats(_: AuthUser = Depends(require_admin)):
    user_store = _get_user_store()
    scenario_store = _get_scenario_store()
    event_store = _get_event_store()

    try:
        total_users = user_store.count_users()
        scenarios = scenario_store.list_scenarios()
        total_scenarios = len(scenarios)

        total_campaigns = 0
        with scenario_store._conn as conn:
            row = conn.execute("SELECT COUNT(*) FROM campaigns").fetchone()
            total_campaigns = row[0] if row else 0

        with event_store._conn as conn:
            row = conn.execute("SELECT COUNT(*) FROM events").fetchone()
            total_events = row[0] if row else 0
    finally:
        user_store.close()
        scenario_store.close()
        event_store.close()

    return AdminStats(
        total_users=total_users,
        total_scenarios=total_scenarios,
        total_campaigns=total_campaigns,
        total_events=total_events,
    )


# ---- User management ----


@router.get("/users", response_model=list[UserListItem])
def list_users(_: AuthUser = Depends(require_admin)):
    store = _get_user_store()
    try:
        users = store.list_users(limit=200, offset=0)
    finally:
        store.close()
    return [
        UserListItem(
            id=u.id,
            email=u.email,
            username=u.username,
            is_admin=u.is_admin,
            is_active=True,
            created_at=u.created_at,
            avatar=u.avatar,
            bio=u.bio,
            last_login=u.last_login,
        )
        for u in users
    ]


@router.get("/users/{user_id}", response_model=UserDetail)
def get_user(user_id: str, _: AuthUser = Depends(require_admin)):
    store = _get_user_store()
    scenario_store = _get_scenario_store()
    try:
        user = store.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        scenarios = scenario_store.list_scenarios()
        user_scenarios = [s for s in scenarios if s.user_id == user_id]
        total_campaigns = sum(len(scenario_store.get_campaigns(s.id)) for s in user_scenarios)
        return UserDetail(
            id=user.id,
            email=user.email,
            username=user.username,
            is_admin=user.is_admin,
            created_at=user.created_at,
            avatar=user.avatar,
            bio=user.bio,
            last_login=user.last_login,
            stats=UserDetailStats(
                total_scenarios=len(user_scenarios),
                total_campaigns=total_campaigns,
            ),
        )
    finally:
        store.close()
        scenario_store.close()


@router.patch("/users/{user_id}", response_model=UserListItem)
def update_user(
    user_id: str,
    req: UserUpdateRequest,
    current_admin: AuthUser = Depends(require_admin),
):
    store = _get_user_store()
    try:
        user = store.update_user(user_id, username=req.username)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if req.is_admin is not None:
            store._conn.execute(
                "UPDATE users SET is_admin=? WHERE id=?",
                (1 if req.is_admin else 0, user_id),
            )
            store._conn.commit()
            user = store.get_by_id(user_id)
    finally:
        store.close()
    return UserListItem(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        is_active=True,
        created_at=user.created_at,
        avatar=user.avatar,
        bio=user.bio,
        last_login=user.last_login,
    )


@router.delete("/users/{user_id}", response_model=MessageResponse)
def delete_user(user_id: str, current_admin: AuthUser = Depends(require_admin)):
    if current_admin.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )

    store = _get_user_store()
    try:
        deleted = store.delete_user(user_id)
    finally:
        store.close()

    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")

    return MessageResponse(message="User deleted successfully")


# ---- Scenario management ----


@router.get("/scenarios", response_model=list)
def list_all_scenarios(_: AuthUser = Depends(require_admin)):
    store = _get_scenario_store()
    try:
        return [s.__dict__ for s in store.list_scenarios()]
    finally:
        store.close()


@router.delete("/scenarios/{scenario_id}", response_model=MessageResponse)
def delete_scenario(scenario_id: str, _: AuthUser = Depends(require_admin)):
    store = _get_scenario_store()
    event_store = _get_event_store()
    try:
        campaigns = store.get_campaigns(scenario_id)
        deleted = store.delete_scenario(scenario_id)
    finally:
        store.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Scenario not found")
    try:
        for c in campaigns:
            event_store.delete_by_campaign(c.id)
    finally:
        event_store.close()
    # Clear Neo4j world graph for all campaigns of this scenario
    for c in campaigns:
        graph = _get_graph_engine(c.id)
        if graph:
            try:
                import asyncio
                asyncio.get_event_loop().run_until_complete(graph.clear_campaign(c.id))
            except Exception:
                pass
    return MessageResponse(message="Scenario deleted successfully")


# ---- Campaign management ----


@router.delete("/campaigns/{campaign_id}", response_model=MessageResponse)
def delete_campaign(campaign_id: str, _: AuthUser = Depends(require_admin)):
    store = _get_scenario_store()
    event_store = _get_event_store()
    try:
        deleted = store.delete_campaign(campaign_id)
    finally:
        store.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")
    try:
        event_store.delete_by_campaign(campaign_id)
    finally:
        event_store.close()
    # Clear Neo4j world graph for this campaign
    graph = _get_graph_engine(campaign_id)
    if graph:
        try:
            import asyncio
            asyncio.get_event_loop().run_until_complete(graph.clear_campaign(campaign_id))
        except Exception:
            pass
    return MessageResponse(message="Campaign deleted successfully")
