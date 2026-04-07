import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db.scenario_store import ScenarioStore, StoryCardType
from app.db.event_store import EventStore
from app.middleware.auth import AuthUser, get_current_user
from app.engines.llm_router import LLMRouter, LLMConfig
from app.services.power_system_service import PowerSystemService
from app.config import settings

router = APIRouter()

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _get_store() -> ScenarioStore:
    db_path = os.environ.get("SCENARIO_DB_PATH", os.path.join(_BACKEND_DIR, "scenarios.db"))
    return ScenarioStore(db_path)


def _get_event_store() -> EventStore:
    db_path = os.environ.get("EVENT_DB_PATH", os.path.join(_BACKEND_DIR, "events.db"))
    return EventStore(db_path)


def _get_ps_service() -> PowerSystemService:
    llm = LLMRouter(LLMConfig())
    store = _get_store()
    return PowerSystemService(store, llm)


def _get_graph_engine(campaign_id: str):
    """Get or create a GraphEngine to clear Neo4j data for a campaign."""
    try:
        from app.engines.graph_engine import GraphEngine
        engine = GraphEngine(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password, campaign_id)
        return engine
    except Exception:
        return None


class CreateScenarioRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    protagonist_name: str = Field(default="", max_length=200)
    narrative_pov: str = Field(default="first_person", max_length=50)
    writing_style: str = Field(default="chinh_thong", max_length=50)
    tone_instructions: str = Field(default="", max_length=50000)
    opening_narrative: str = Field(default="", max_length=50000)
    language: str = Field(default="en", max_length=10)
    lore_text: str = Field(default="", max_length=50000)
    power_system_id: str | None = Field(default=None, max_length=20000)  # can be JSON blob for multi-axis


class AddStoryCardRequest(BaseModel):
    card_type: StoryCardType
    name: str = Field(..., min_length=1, max_length=200)
    content: dict = {}


class CampaignData(BaseModel):
    player_name: str


class ImportScenarioRequest(BaseModel):
    version: str
    scenario: CreateScenarioRequest
    story_cards: list[AddStoryCardRequest] = []
    campaigns: list[CampaignData] = []


class UpdateScenarioRequest(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    protagonist_name: str | None = Field(default=None, max_length=200)
    narrative_pov: str | None = Field(default=None, max_length=50)
    writing_style: str | None = Field(default=None, max_length=50)
    tone_instructions: str | None = Field(default=None, max_length=50000)
    opening_narrative: str | None = Field(default=None, max_length=50000)
    language: str | None = Field(default=None, max_length=10)
    lore_text: str | None = Field(default=None, max_length=50000)
    power_system_id: str | None = Field(default=None, max_length=20000)


class CreatePowerSystemRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    realms: list[dict] = Field(..., min_length=1)


class GeneratePowerSystemRequest(BaseModel):
    lore_text: str = Field(default="", max_length=50000)
    language: str = Field(default="vi", max_length=10)


class SavePowerSystemConfigRequest(BaseModel):
    """Save a finalized (user-edited) power system config into a scenario."""
    power_system_name: str = Field(..., max_length=200)
    axes: list[dict] = Field(..., min_length=1)


class ApplyPowerSystemToScenarioRequest(BaseModel):
    """Apply an existing power system (from a preset or custom) to a scenario."""
    preset_key: str | None = Field(default=None, max_length=50)
    config_dict: dict | None = Field(default=None)


@router.post("/", status_code=201)
def create_scenario(req: CreateScenarioRequest, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.create_scenario(
            title=req.title,
            description=req.description,
            protagonist_name=req.protagonist_name,
            narrative_pov=req.narrative_pov,
            writing_style=req.writing_style,
            tone_instructions=req.tone_instructions,
            opening_narrative=req.opening_narrative,
            language=req.language,
            lore_text=req.lore_text,
            user_id=current_user.id,
            power_system_id=req.power_system_id,
        )
    return scenario.__dict__


@router.get("/")
def list_scenarios(current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        return [s.__dict__ for s in store.list_scenarios(user_id=current_user.id)]


@router.post("/import", status_code=201)
def import_scenario(req: ImportScenarioRequest, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.create_scenario(
            title=req.scenario.title,
            description=req.scenario.description,
            protagonist_name=getattr(req.scenario, 'protagonist_name', ''),
            narrative_pov=getattr(req.scenario, 'narrative_pov', 'first_person'),
            writing_style=getattr(req.scenario, 'writing_style', 'chinh_thong'),
            tone_instructions=req.scenario.tone_instructions,
            opening_narrative=req.scenario.opening_narrative,
            language=req.scenario.language,
            lore_text=req.scenario.lore_text,
            user_id=current_user.id,
        )
        for card in req.story_cards:
            store.add_story_card(scenario.id, card.card_type, card.name, card.content)
        for campaign in req.campaigns:
            store.create_campaign(scenario.id, campaign.player_name, user_id=current_user.id)
    return scenario.__dict__


# ---------------------------------------------------------------------------
# Power System endpoints
# ---------------------------------------------------------------------------


@router.get("/power-systems", response_model=list)
def list_power_systems(current_user: AuthUser = Depends(get_current_user)):
    """Return all available power systems (defaults + custom)."""
    with _get_store() as store:
        return store.get_power_systems()


@router.post("/power-systems", status_code=201)
def create_power_system(req: CreatePowerSystemRequest, current_user: AuthUser = Depends(get_current_user)):
    """Create a custom power system for a user."""
    with _get_store() as store:
        ps = store.create_power_system(req.name, req.realms)
    return {
        "id": ps.id,
        "name": ps.name,
        "is_default": ps.is_default,
        "realms": [
            {
                "slug": r.slug,
                "name": r.name,
                "order": r.order,
                "description": r.description,
                "tiers": [{"slug": t.slug, "name": t.name, "index": t.index} for t in r.tiers],
            }
            for r in ps.realms
        ],
    }


@router.delete("/power-systems/{system_id}", status_code=200)
def delete_power_system(system_id: str, current_user: AuthUser = Depends(get_current_user)):
    """Delete a custom (non-default) power system."""
    with _get_store() as store:
        deleted = store.delete_power_system(system_id)
    if not deleted:
        raise HTTPException(status_code=400, detail="Cannot delete default power systems")
    return {"status": "ok"}


@router.get("/{scenario_id}")
def get_scenario(scenario_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario.__dict__


class UpdateStoryCardRequest(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    content: dict | None = None


class DeleteStoryCardRequest(BaseModel):
    pass


@router.post("/{scenario_id}/story-cards", status_code=201)
def add_story_card(scenario_id: str, req: AddStoryCardRequest, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to modify this scenario")
        card = store.add_story_card(scenario_id, req.card_type, req.name, req.content)
    return card.__dict__


@router.put("/{scenario_id}/story-cards/{card_id}", status_code=200)
def update_story_card(scenario_id: str, card_id: str, req: UpdateStoryCardRequest, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to modify this scenario")
        updated = store.update_story_card(card_id, name=req.name, content=req.content)
        if not updated:
            raise HTTPException(status_code=404, detail="Story card not found")
    return updated.__dict__


@router.delete("/{scenario_id}/story-cards/{card_id}", status_code=200)
def delete_story_card(scenario_id: str, card_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to modify this scenario")
        deleted = store.delete_story_card(card_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Story card not found")
    return {"status": "ok"}


@router.get("/{scenario_id}/story-cards")
def get_story_cards(scenario_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        return [c.__dict__ for c in store.get_story_cards(scenario_id)]


@router.post("/{scenario_id}/campaigns", status_code=201)
def create_campaign(scenario_id: str, req: CampaignData, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")

        # Clone power system from scenario into campaign snapshot
        snapshot = scenario.power_system_id or ""

        campaign = store.create_campaign(
            scenario_id,
            req.player_name,
            user_id=current_user.id,
            power_system_snapshot=snapshot,
        )

    return {
        "campaign": campaign.__dict__,
        "scenario": {
            "id": scenario.id,
            "title": scenario.title,
            "description": scenario.description,
            "protagonist_name": scenario.protagonist_name,
            "narrative_pov": scenario.narrative_pov,
            "writing_style": scenario.writing_style,
            "tone_instructions": scenario.tone_instructions,
            "opening_narrative": scenario.opening_narrative,
            "language": scenario.language,
            "power_system_snapshot": snapshot,
        },
    }


@router.get("/{scenario_id}/campaigns")
def get_campaigns(scenario_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        campaigns = store.get_campaigns(scenario_id) if scenario else None
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return [c.__dict__ for c in campaigns]


@router.get("/{scenario_id}/export")
def export_scenario(scenario_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        story_cards = store.get_story_cards(scenario_id) if scenario else []
        campaigns = store.get_campaigns(scenario_id) if scenario else []
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return {
        "version": "2.0",
        "exported_at": datetime.utcnow().isoformat(),
        "scenario": {
            "title": scenario.title,
            "description": scenario.description,
            "protagonist_name": scenario.protagonist_name,
            "narrative_pov": scenario.narrative_pov,
            "writing_style": scenario.writing_style,
            "tone_instructions": scenario.tone_instructions,
            "opening_narrative": scenario.opening_narrative,
            "language": scenario.language,
            "lore_text": scenario.lore_text,
            "power_system": scenario.power_system_id or None,
        },
        "story_cards": [
            {"card_type": c.card_type.value, "name": c.name, "content": c.content}
            for c in story_cards
        ],
        "campaigns": [
            {"player_name": c.player_name}
            for c in campaigns
        ],
    }


@router.delete("/{scenario_id}/campaigns/{campaign_id}", status_code=200)
def delete_campaign(scenario_id: str, campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        campaign = store.get_campaign(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        if campaign.user_id and campaign.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this campaign")
        deleted = store.delete_campaign(campaign_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Campaign not found")
    event_store = _get_event_store()
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
    return {"status": "ok"}


@router.delete("/{scenario_id}", status_code=200)
def delete_scenario(scenario_id: str, current_user: AuthUser = Depends(get_current_user)):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to delete this scenario")
        campaigns = store.get_campaigns(scenario_id)
        deleted = store.delete_scenario(scenario_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scenario not found")
    event_store = _get_event_store()
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
    return {"status": "ok"}


@router.put("/{scenario_id}", status_code=200)
def update_scenario(
    scenario_id: str,
    req: UpdateScenarioRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to edit this scenario")
        updated = store.update_scenario(
            scenario_id,
            title=req.title,
            description=req.description,
            protagonist_name=req.protagonist_name,
            narrative_pov=req.narrative_pov,
            writing_style=req.writing_style,
            tone_instructions=req.tone_instructions,
            opening_narrative=req.opening_narrative,
            language=req.language,
            lore_text=req.lore_text,
            power_system_id=req.power_system_id,
        )
    return updated.__dict__


# ---------------------------------------------------------------------------
# Multi-axis Power System endpoints
# ---------------------------------------------------------------------------


@router.post("/power-system/generate")
async def generate_power_system(
    req: GeneratePowerSystemRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Generate a power system draft entirely from user lore.
    AI invents everything — axes, stages, sub-stages — with no preset.
    """
    service = _get_ps_service()
    draft = await service.generate_draft(
        lore_text=req.lore_text,
        language=req.language,
    )
    if draft is None:
        raise HTTPException(status_code=500, detail="Power system generation failed")
    return draft.to_dict()


@router.post("/{scenario_id}/power-system/save")
def save_power_system_config(
    scenario_id: str,
    req: SavePowerSystemConfigRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Save a finalized power system config into a scenario.
    Called when user clicks 'Save' in the Power System editor.
    The config is stored as JSON in the scenario record.
    """
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        if scenario.user_id and scenario.user_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized")

    service = _get_ps_service()
    # Validate
    config_dict = {
        "power_system_name": req.power_system_name,
        "axes": req.axes,
    }
    valid, errors = service.validate_config(config_dict)
    if not valid:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    # Store as JSON in scenario.power_system_id (reuse the field as JSON blob)
    config_json = json.dumps(config_dict, ensure_ascii=False)
    with _get_store() as store:
        updated = store.update_scenario(scenario_id, power_system_id=config_json)

    return {"status": "saved", "power_system_id": config_json}


@router.get("/{scenario_id}/power-system")
def get_scenario_power_system(
    scenario_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Return the power system config stored in a scenario."""
    with _get_store() as store:
        scenario = store.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        ps_id = scenario.power_system_id or ""
        if not ps_id:
            return None
        # power_system_id can be a preset key (string) or JSON blob
        if ps_id.startswith("{"):
            try:
                return json.loads(ps_id)
            except json.JSONDecodeError:
                return None
        # It's a preset key
        service = _get_ps_service()
        info = service.get_preset_info(ps_id)
        return info
