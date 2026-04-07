import logging
import os
from dataclasses import asdict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings

from app.services.game_session import GameSession
from app.engines.narrator_engine import NarratorEngine
from app.engines.memory_engine import MemoryEngine, CrystalTier
from app.engines.world_reactor import WorldReactor
from app.engines.journal_engine import JournalEngine, JournalCategory
from app.engines.combat_engine import CombatEngine
from app.engines.plot_generator import PlotGenerator
from app.engines.npc_mind_engine import NpcMindEngine
from app.engines.inventory_engine import InventoryEngine
from app.engines.llm_router import LLMRouter, LLMConfig, LLMProvider
from app.engines.power_system import PowerSystemResolver
from app.engines.power_system_models import PowerSystemConfig
from app.services.power_system_service import PowerSystemService
from app.db.event_store import EventStore, EventType
from app.db.scenario_store import ScenarioStore
from app.middleware.auth import AuthUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

# Ensure API keys from config are available in os.environ for litellm
if not os.environ.get("ANTHROPIC_API_KEY") and settings.anthropic_api_key:
    os.environ["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
if not os.environ.get("DEEPSEEK_API_KEY") and settings.deepseek_api_key:
    os.environ["DEEPSEEK_API_KEY"] = settings.deepseek_api_key
if not os.environ.get("OPENAI_API_KEY") and settings.openai_api_key:
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_event_store = EventStore(os.environ.get("EVENT_DB_PATH", os.path.join(_BACKEND_DIR, "events.db")))
_llm = LLMRouter(LLMConfig())
_narrator = NarratorEngine(llm=_llm)
_memory = MemoryEngine(event_store=_event_store, llm=_llm)
_world_reactor = WorldReactor(llm=_llm)
_journal = JournalEngine(llm=_llm, event_store=_event_store)
_combat = CombatEngine(llm=_llm)
_plot_generator = PlotGenerator(llm=_llm)
_npc_minds = NpcMindEngine(llm=_llm)
_inventory = InventoryEngine(event_store=_event_store)
from app.engines.choice_generator import ChoiceGenerator
_choice_generator = ChoiceGenerator(llm=_llm)
_sessions: dict[str, GameSession] = {}
_graph_engines: dict = {}

_SCENARIO_DB_PATH = os.environ.get(
    "SCENARIO_DB_PATH", os.path.join(_BACKEND_DIR, "scenarios.db")
)


def _load_story_cards_for_campaign(campaign_id: str):
    """Look up the scenario_id from the campaign and load its story cards."""
    try:
        store = ScenarioStore(_SCENARIO_DB_PATH)
        # Find the campaign's scenario_id
        conn = store._conn
        row = conn.execute(
            "SELECT scenario_id FROM campaigns WHERE id=?", (campaign_id,)
        ).fetchone()
        if not row:
            return []
        scenario_id = row[0]
        return store.get_story_cards(scenario_id)
    except Exception:
        logger.debug("Could not load story cards for campaign %s", campaign_id)
        return []


def _load_scenario_for_campaign(campaign_id: str):
    """Load scenario for a campaign: tone, protagonist_name, pov, style, language, opening, power_system."""
    try:
        store = ScenarioStore(_SCENARIO_DB_PATH)
        conn = store._conn
        row = conn.execute(
            "SELECT s.tone_instructions, s.protagonist_name, s.narrative_pov, s.writing_style, "
            "s.language, s.opening_narrative, s.power_system_id "
            "FROM scenarios s JOIN campaigns c ON c.scenario_id = s.id "
            "WHERE c.id=?",
            (campaign_id,),
        ).fetchone()
        if not row:
            return "", "", "first_person", "chinh_thong", "en", "", None

        ps_id_raw = row[6] if len(row) > 6 else None
        power_system = None

        if ps_id_raw:
            # Check for multi-axis JSON config first
            if isinstance(ps_id_raw, str) and ps_id_raw.startswith("{"):
                try:
                    import json as _json
                    ps_data = _json.loads(ps_id_raw)
                    from app.engines.power_system_models import PowerSystemConfig
                    config = PowerSystemConfig.from_dict(ps_data)
                    power_system = PowerSystemResolver(config)
                    logger.info("Loaded multi-axis power system config for campaign %s", campaign_id)
                except Exception as e:
                    logger.warning("Failed to parse multi-axis config, falling back: %s", e)
                    ps_raw = store.get_power_system(ps_id_raw)
                    if ps_raw:
                        power_system = PowerSystemResolver(ps_raw)
            else:
                # Legacy: power_system_id is a preset key string
                ps_raw = store.get_power_system(ps_id_raw)
                if ps_raw:
                    power_system = PowerSystemResolver(ps_raw)

        if power_system is None:
            ps_raw = store.get_default_power_system()
            if ps_raw:
                power_system = PowerSystemResolver(ps_raw)

        return (
            row[0] or "",           # tone_instructions
            row[1] or "",           # protagonist_name
            row[2] or "first_person",  # narrative_pov
            row[3] or "chinh_thong",   # writing_style
            row[4] or "en",        # language
            row[5] or "",          # opening_narrative
            power_system,           # power_system (resolver)
        )
    except Exception:
        logger.debug("Could not load scenario for campaign %s", campaign_id)
        return "", "", "first_person", "chinh_thong", "en", "", None


def _ensure_session(campaign_id: str) -> GameSession:
    """Get or create a GameSession, ensuring all in-memory state is rebuilt.

    This is used by GET endpoints that need rebuilt data (NPC minds, journal,
    crystals, inventory) without requiring a player action first.
    """
    if campaign_id in _sessions:
        return _sessions[campaign_id]

    tone, protagonist_name, narrative_pov, writing_style, language, opening, power_system = \
        _load_scenario_for_campaign(campaign_id)
    story_cards = _load_story_cards_for_campaign(campaign_id)
    graph = _get_graph_engine(campaign_id)
    graphiti = _get_graphiti_engine()
    if graphiti:
        _memory.set_graphiti(graphiti)

    session = GameSession(
        campaign_id=campaign_id,
        scenario_tone=tone,
        protagonist_name=protagonist_name,
        narrative_pov=narrative_pov,
        writing_style=writing_style,
        language=language,
        narrator=_narrator,
        memory=_memory,
        world_reactor=_world_reactor,
        journal=_journal,
        event_store=_event_store,
        combat_engine=_combat,
        graph_engine=graph,
        npc_minds=_npc_minds,
        graphiti_engine=graphiti,
        plot_generator=_plot_generator,
        inventory_engine=_inventory,
        choice_generator=_choice_generator,
        opening_narrative=opening,
        story_cards=story_cards,
        power_system=power_system,
    )
    _sessions[campaign_id] = session
    return session

_graphiti_engine = None


def _get_graphiti_engine():
    global _graphiti_engine
    if _graphiti_engine is not None:
        return _graphiti_engine
    try:
        from app.engines.graphiti_engine import GraphitiEngine
        _graphiti_engine = GraphitiEngine(
            settings.neo4j_uri,
            settings.neo4j_user,
            settings.neo4j_password,
            openai_key=settings.openai_api_key,
        )
        return _graphiti_engine
    except Exception:
        logger.info("Graphiti not available, running without temporal graph")
        return None


async def _fallback_graph_search(campaign_id: str, query: str, limit: int = 10) -> list[dict]:
    """Fallback keyword search over Neo4j world graph when Graphiti has no results."""
    graph = _get_graph_engine(campaign_id)
    if not graph:
        return []

    try:
        await graph.initialize()
        nodes = await graph.get_all_nodes()
        relationships = await graph.get_all_relationships()
    except Exception:
        logger.warning("Fallback world graph search failed for campaign %s", campaign_id, exc_info=True)
        return []

    term = query.strip().lower()
    if not term:
        return []

    node_lookup = {getattr(n, "id", ""): n for n in nodes}
    matched_nodes = []
    for node in nodes:
        name = str(getattr(node, "name", ""))
        attrs = getattr(node, "attributes", {}) or {}
        attr_text = " ".join(str(v) for v in attrs.values())
        haystack = f"{name} {attr_text}".lower()
        if term in haystack:
            matched_nodes.append(node)

    facts: list[dict] = []
    seen: set[str] = set()
    for node in matched_nodes:
        node_type = getattr(node, "node_type", None)
        node_type_value = node_type.value if hasattr(node_type, "value") else str(node_type or "NODE")
        node_fact = f"{getattr(node, 'name', 'Unknown')} [{node_type_value}]"
        if node_fact not in seen:
            facts.append({"fact": node_fact, "valid_at": None, "invalid_at": None})
            seen.add(node_fact)
            if len(facts) >= limit:
                break

        for rel in relationships:
            source = node_lookup.get(rel.get("source_id"))
            target = node_lookup.get(rel.get("target_id"))
            if not source or not target:
                continue
            if getattr(source, "id", None) != getattr(node, "id", None) and getattr(target, "id", None) != getattr(node, "id", None):
                continue

            rel_fact = (
                f"{getattr(source, 'name', 'Unknown')} "
                f"-{rel.get('rel_type', 'RELATED_TO')}-> "
                f"{getattr(target, 'name', 'Unknown')}"
            )
            if rel_fact in seen:
                continue

            facts.append({"fact": rel_fact, "valid_at": None, "invalid_at": None})
            seen.add(rel_fact)
            if len(facts) >= limit:
                break
        if len(facts) >= limit:
            break

    return facts[:limit]


class PlayerActionRequest(BaseModel):
    campaign_id: str = Field(..., min_length=1, max_length=64)
    scenario_tone: str = Field(default="", max_length=10000)
    protagonist_name: str = Field(default="", max_length=200)
    narrative_pov: str = Field(default="first_person", max_length=50)
    writing_style: str = Field(default="chinh_thong", max_length=50)
    language: str = Field(default="en", max_length=10)
    action: str = Field(..., min_length=1, max_length=10000)
    opening_narrative: str = Field(default="", max_length=20000)
    max_tokens: int = Field(default=2000, ge=256, le=8192)
    provider: str = Field(default="deepseek", max_length=20)
    model: str = Field(default="deepseek-chat", max_length=64)
    temperature: float = Field(default=0.85, ge=0.0, le=2.0)
    stream_delivery_speed: str = Field(default="instant", max_length=20)  # instant|fast|normal|slow|typewriter


class SettingsRequest(BaseModel):
    provider: str = "deepseek"
    model: str = "deepseek-chat"
    temperature: float = 0.85
    max_tokens: int = 2000


class GenerateRequest(BaseModel):
    type: str  # "npc", "event", "plot"
    language: str = "en"


class InjectPlotRequest(BaseModel):
    type: str      # "npc", "event", "plot"
    data: dict     # the generated content from /generate
    language: str = "en"


class TimeskipRequest(BaseModel):
    seconds: int


class InventoryActionRequest(BaseModel):
    name: str
    action: str  # "use" or "discard"


class AddInventoryRequest(BaseModel):
    name: str
    category: str = "misc"
    source: str = "player"


class UpdateProgressionRequest(BaseModel):
    character_id: str
    axis_id: str
    stage_slug: str | None = None  # internal slug (e.g. "truc_co"), for lookups
    stage_name: str | None = None  # display name (e.g. "Trúc Cơ Sơ Kỳ"), for UI
    stage_index: int = 0
    raw_value: int = 0
    sub_stage_slug: str | None = None
    xp_progress: float = 0.0


def _get_graph_engine(campaign_id: str):
    """Get or create a GraphEngine for the given campaign."""
    if campaign_id in _graph_engines:
        return _graph_engines[campaign_id]
    try:
        from app.engines.graph_engine import GraphEngine
        engine = GraphEngine(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password, campaign_id)
        _graph_engines[campaign_id] = engine
        return engine
    except Exception:
        logger.info("GraphEngine not available for campaign %s", campaign_id)
        return None


def _require_campaign_access(campaign_id: str, current_user: AuthUser) -> None:
    """Verify the current user owns this campaign (or is admin). Raises 403 otherwise."""
    store = ScenarioStore(_SCENARIO_DB_PATH)
    try:
        campaign = store.get_campaign(campaign_id)
    finally:
        store.close()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.user_id and campaign.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to access this campaign")


@router.post("/action")
async def player_action(req: PlayerActionRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(req.campaign_id, current_user)
    session = _ensure_session(req.campaign_id)

    # Guard: prevent concurrent streams for the same campaign
    if session._streaming:
        raise HTTPException(409, "A stream is already in progress for this campaign")

    # Update session with request-specific values that may differ per action
    session.scenario_tone = req.scenario_tone or session.scenario_tone
    session.protagonist_name = req.protagonist_name or session.protagonist_name
    session.narrative_pov = req.narrative_pov or session.narrative_pov
    session.writing_style = req.writing_style or session.writing_style
    session.language = req.language or session.language
    # Apply user's LLM settings per-request
    try:
        _llm.config.primary_provider = LLMProvider(req.provider)
    except ValueError:
        pass
    _llm.config.primary_model = req.model
    _llm.config.temperature = req.temperature
    _llm.config.max_tokens = req.max_tokens

    async def event_stream():
        try:
            async for chunk in session.process_action(req.action, max_tokens=req.max_tokens, stream_delivery_speed=req.stream_delivery_speed):
                # SSE requires each data line to be prefixed with "data:".
                # This preserves paragraph breaks/newlines in streamed prose.
                text = str(chunk).replace("\r\n", "\n").replace("\r", "\n")
                for line in text.split("\n"):
                    yield f"data: {line}\n"
                yield "\n"
            yield "data: [DONE]\n\n"
        finally:
            # Ensure _streaming is cleared even if an unexpected error occurs
            session._streaming = False

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/{campaign_id}/pending-action")
async def get_pending_action(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """Check if the last PLAYER_ACTION is missing its NARRATOR_RESPONSE.
    Returns the pending action text if found, else null."""
    _require_campaign_access(campaign_id, current_user)
    player_events = _event_store.get_by_type(campaign_id, EventType.PLAYER_ACTION)
    if not player_events:
        return {"pending": False, "action": None, "user_message_index": None}
    last_player = sorted(player_events, key=lambda e: e.created_at)[-1]
    # Check if there's a NARRATOR_RESPONSE after this action
    narrator_responses = _event_store.get_by_type(campaign_id, EventType.NARRATOR_RESPONSE)
    has_response = any(
        r.created_at > last_player.created_at for r in narrator_responses
    )
    if has_response:
        return {"pending": False, "action": None, "user_message_index": None}
    # Index in GET /history `messages` for this PLAYER_ACTION (for Play UI "live" chapter).
    timeline = sorted(
        player_events + narrator_responses,
        key=lambda e: e.created_at,
    )
    user_message_index = None
    idx = 0
    for ev in timeline:
        if ev.event_type not in (EventType.PLAYER_ACTION, EventType.NARRATOR_RESPONSE):
            continue
        if ev.event_type == EventType.PLAYER_ACTION and ev.id == last_player.id:
            user_message_index = idx
        idx += 1
    return {
        "pending": True,
        "action": last_player.payload.get("text", ""),
        "action_id": last_player.id,
        "created_at": last_player.created_at,
        "user_message_index": user_message_index,
    }


@router.get("/{campaign_id}/history")
async def get_history(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """Return PLAYER_ACTION and NARRATOR_RESPONSE events to rebuild chat UI."""
    # Must verify campaign still exists — otherwise deleted campaigns return empty messages
    # and the client mistakes them for a brand-new play session (shows pre-game Continue).
    _require_campaign_access(campaign_id, current_user)
    events = _event_store.get_by_type(campaign_id, EventType.PLAYER_ACTION) + \
             _event_store.get_by_type(campaign_id, EventType.NARRATOR_RESPONSE)
    events.sort(key=lambda e: e.created_at)
    messages = []
    for ev in events:
        text = ev.payload.get("text", "")
        if ev.event_type == EventType.PLAYER_ACTION:
            messages.append({"role": "user", "content": text})
        else:
            messages.append({"role": "assistant", "content": text})
    return {"messages": messages}


@router.get("/{campaign_id}/scenario")
async def get_campaign_scenario(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """Return scenario metadata for the Play UI (title, opening, tone, protagonist, pov, style) after a full page reload."""
    _require_campaign_access(campaign_id, current_user)
    store = ScenarioStore(_SCENARIO_DB_PATH)
    try:
        campaign = store.get_campaign(campaign_id)
        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")
        scenario = store.get_scenario(campaign.scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        return {
            "id": scenario.id,
            "title": scenario.title,
            "description": scenario.description,
            "protagonist_name": scenario.protagonist_name,
            "narrative_pov": scenario.narrative_pov,
            "writing_style": scenario.writing_style,
            "tone_instructions": scenario.tone_instructions,
            "opening_narrative": scenario.opening_narrative,
            "language": scenario.language,
        }
    finally:
        store.close()


@router.post("/{campaign_id}/rewind")
async def rewind(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    """Delete the last player action + AI response and return updated history."""
    deleted = _event_store.delete_last_pair(campaign_id)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="No actions to rewind")

    # If there's a live session, rewind its in-memory state
    if campaign_id in _sessions:
        _sessions[campaign_id].rewind()

    # Return updated message history (same format as GET /history)
    events = _event_store.get_by_type(campaign_id, EventType.PLAYER_ACTION) + \
             _event_store.get_by_type(campaign_id, EventType.NARRATOR_RESPONSE)
    events.sort(key=lambda e: e.created_at)
    messages = []
    for ev in events:
        text = ev.payload.get("text", "")
        if ev.event_type == EventType.PLAYER_ACTION:
            messages.append({"role": "user", "content": text})
        else:
            messages.append({"role": "assistant", "content": text})
    return {"messages": messages, "deleted": deleted}


@router.get("/{campaign_id}/choices")
async def get_choices(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """Return the current cached choices for this campaign, or null if none."""
    _require_campaign_access(campaign_id, current_user)
    session = _ensure_session(campaign_id)
    if session._choice_generator is None:
        return {"choices": None, "stale": False}
    cached = session._choice_generator.get_current_choices()
    if cached is None:
        return {"choices": None, "stale": False}
    is_stale = session._choice_generator.is_stale(cached, session._turn_count)
    return {
        "choices": [
            {
                "slot": c.slot,
                "category_id": c.category_id,
                "icon": c.icon,
                "label": c.label,
                "hint": c.hint,
            }
            for c in cached.choices
        ],
        "stale": is_stale,
        "generated_at_turn": cached.generated_at_turn,
        "current_turn": session._turn_count,
    }


@router.get("/{campaign_id}/journal")
async def get_journal(campaign_id: str, current_user: AuthUser = Depends(get_current_user), category: str | None = None):
    _require_campaign_access(campaign_id, current_user)
    _ensure_session(campaign_id)
    if category:
        try:
            cat = JournalCategory(category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid journal category: {category}")
        entries = _journal.get_by_category(campaign_id, cat)
    else:
        entries = _journal.get_journal(campaign_id)
    return [asdict(e) for e in entries]


def _resolve_stage_name(slug_or_name: str, power_system) -> str:
    """Resolve a stage slug → display name using power system config.
    If already a display name (has spaces), return as-is."""
    if not slug_or_name or not power_system:
        return slug_or_name
    v = str(slug_or_name).strip()
    if ' ' in v or not v.replace('_', '').isascii():
        return v
    import unicodedata, re
    def _slug(t):
        t = unicodedata.normalize('NFD', t)
        t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
        t = t.lower().replace('đ', 'd').replace('Đ', 'D').replace(' ', '_')
        return re.sub(r'[^a-z0-9_]', '', t)
    norm = _slug(v)
    for axis in power_system.axes:
        for stage in axis.stages or []:
            if stage.slug and _slug(stage.slug) == norm:
                return stage.name
            for sub in stage.sub_stages or []:
                if sub.key and _slug(sub.key) == norm:
                    return f"{stage.name} {sub.name}"
    return v


def _collect_latest_npc_thought_payloads(campaign_id: str) -> dict[str, dict]:
    """Latest NPC_THOUGHT payload per NPC name (lowercase key)."""
    latest: dict[str, dict] = {}
    for ev in _event_store.get_by_type(campaign_id, EventType.NPC_THOUGHT):
        name = (ev.payload.get("name") or "").strip()
        if name:
            latest[name.lower()] = ev.payload
    return latest


def _axis_display_name(ps_config: PowerSystemConfig | None, axis_id: str) -> str:
    if not ps_config or not axis_id:
        return axis_id or ""
    for ax in ps_config.axes:
        if ax.axis_id == axis_id:
            return ax.axis_name
    return axis_id


def _realm_tier_from_npc_thought_payload(
    payload: dict | None,
    ps_config: PowerSystemConfig | None,
) -> tuple[str, str]:
    """Fill missing realm/tier display strings from NPC_THOUGHT payload + progression."""
    if not payload:
        return "", ""
    realm = str(payload.get("realm") or "").strip()
    tier = str(payload.get("tier") or "").strip()
    prog = payload.get("progression")
    if not isinstance(prog, dict) or not prog:
        return realm, tier

    primary_ax = None
    if ps_config:
        for ax in ps_config.axes:
            if ax.is_primary:
                primary_ax = ax.axis_id
                break
    axis_ids: list[str] = []
    if primary_ax and primary_ax in prog:
        axis_ids.append(primary_ax)
    axis_ids.extend(k for k in prog if k not in axis_ids)

    for aid in axis_ids:
        pdata = prog.get(aid)
        if not isinstance(pdata, dict):
            continue
        name = str(pdata.get("stage_name") or "").strip()
        slug = str(pdata.get("stage_slug") or "").strip()
        sub_slug = str(pdata.get("sub_stage_slug") or "").strip()
        tier_candidate = name
        if ps_config:
            if slug and (not name or (name.replace("_", "").isascii() and " " not in name)):
                tier_candidate = _resolve_stage_name(slug, ps_config)
            elif name and (name.replace("_", "").isascii() and " " not in name):
                tier_candidate = _resolve_stage_name(name, ps_config)
        if not tier_candidate and slug:
            tier_candidate = _resolve_stage_name(slug, ps_config) if ps_config else slug
        if sub_slug and ps_config:
            sub_disp = _resolve_stage_name(sub_slug, ps_config)
            if sub_disp:
                tier_candidate = f"{tier_candidate} {sub_disp}".strip() if tier_candidate else sub_disp
        if tier_candidate or slug or name:
            if not tier:
                tier = tier_candidate or name or slug
            if not realm:
                realm = _axis_display_name(ps_config, aid)
            break

    if not realm and prog and ps_config:
        first_axis = next(iter(prog.keys()))
        realm = _axis_display_name(ps_config, first_axis)
    return realm, tier


def _enrich_npc_node_attributes_for_world_map(
    attrs: dict,
    npc_name: str,
    thought_by_npc: dict[str, dict],
    ps_config: PowerSystemConfig | None,
) -> dict:
    """When Neo4j has empty realm/tier, backfill from latest NPC mind event."""
    out = dict(attrs or {})
    key = npc_name.lower().strip()
    payload = thought_by_npc.get(key)
    if not payload:
        for pl in thought_by_npc.values():
            aliases = pl.get("aliases") or []
            if any(key == str(a).lower().strip() for a in aliases):
                payload = pl
                break
    r, t = _realm_tier_from_npc_thought_payload(payload, ps_config)
    if not (out.get("realm") or "").strip() and r:
        out["realm"] = r
    if not (out.get("tier") or "").strip() and t:
        out["tier"] = t
    return out


@router.get("/{campaign_id}/npc-minds")
async def get_npc_minds(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    session = _ensure_session(campaign_id)
    minds = session._npc_minds.get_all_minds(campaign_id) if session._npc_minds else []

    # Merge latest CHARACTER_PROGRESSION per (character_id, axis_id) into each mind
    prog_events = _event_store.get_by_type(campaign_id, EventType.CHARACTER_PROGRESSION)
    latest_prog: dict[str, dict] = {}
    for ev in prog_events:
        char_id = ev.payload.get("character_id", "")
        axis_id = ev.payload.get("axis_id", "")
        if char_id and axis_id:
            key = (char_id, axis_id)
            if key not in latest_prog:
                latest_prog[key] = {
                    "stage_index": ev.payload.get("stage_index"),
                    "stage_slug": ev.payload.get("stage_slug"),
                    "stage_name": ev.payload.get("stage_name"),
                    "raw_value": ev.payload.get("raw_value"),
                    "sub_stage_slug": ev.payload.get("sub_stage_slug"),
                    "xp_progress": ev.payload.get("xp_progress"),
                }

    # Fetch power system snapshot from campaign for slug → display name resolution
    power_system = None
    try:
        ps_store = ScenarioStore(_SCENARIO_DB_PATH)
        campaign = ps_store.get_campaign(campaign_id)
        if campaign and campaign.power_system_snapshot:
            import json
            ps_data = json.loads(campaign.power_system_snapshot)
            power_system = PowerSystemConfig.from_dict(ps_data)
        ps_store.close()
    except Exception:
        pass

    result = []
    for m in minds:
        d = m.to_dict()
        merged: dict[str, dict] = dict(m.progression)
        for (char_id, axis_id), prog_data in latest_prog.items():
            if char_id.lower() == m.name.lower() or char_id.lower() in [a.lower() for a in m.aliases]:
                if axis_id not in merged:
                    merged[axis_id] = {}
                for key, val in prog_data.items():
                    if val is not None and val != "":
                        merged[axis_id][key] = val
        # Resolve slugs → display names in merged progression
        if power_system:
            for axis_id, prog_data in merged.items():
                name = prog_data.get("stage_name", "")
                slug = prog_data.get("stage_slug", "")
                # If stage_name is empty or looks like a slug, resolve from slug
                if slug and (not name or (name.replace('_', '').isascii() and ' ' not in name)):
                    prog_data["stage_name"] = _resolve_stage_name(slug, power_system)
                # If stage_name still empty, try slug itself
                elif name and (name.replace('_', '').isascii() and ' ' not in name):
                    prog_data["stage_name"] = _resolve_stage_name(name, power_system)
                # Resolve sub_stage_slug → sub_stage_name
                sub_slug = prog_data.get("sub_stage_slug", "")
                if sub_slug:
                    prog_data["sub_stage_name"] = _resolve_stage_name(sub_slug, power_system)
        d["progression"] = merged
        result.append(d)

    return result


@router.get("/{campaign_id}/npc-minds/debug")
async def get_npc_minds_debug(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """DEBUG: return raw NPC minds data for inspection."""
    _require_campaign_access(campaign_id, current_user)
    session = _ensure_session(campaign_id)
    minds = session._npc_minds.get_all_minds(campaign_id) if session._npc_minds else []
    prog_events = _event_store.get_by_type(campaign_id, EventType.CHARACTER_PROGRESSION)
    thought_events = _event_store.get_by_type(campaign_id, EventType.NPC_THOUGHT)
    # Show protagonist progression
    protagonist_mind = None
    for m in minds:
        if m.name.lower() in [session.protagonist_name.lower(), "player"]:
            protagonist_mind = {
                "name": m.name,
                "realm": m.realm,
                "tier": m.tier,
                "progression_keys": list(m.progression.keys()),
                "progression_sample": {k: v for k, v in list(m.progression.items())[:2]},
            }
    return {
        "minds_count": len(minds),
        "minds_names": [m.name for m in minds],
        "protagonist": protagonist_mind,
        "prog_events_count": len(prog_events),
        "thought_events_count": len(thought_events),
    }


@router.get("/{campaign_id}/characters")
async def get_characters(campaign_id: str, current_user: AuthUser = Depends(get_current_user), q: str = ""):
    _require_campaign_access(campaign_id, current_user)
    """List all known characters/entities for @-mention autocomplete.

    Returns NPCs from NpcMindEngine + entities from GraphEngine (if available).
    Optional query parameter `q` filters by substring match.
    """
    _ensure_session(campaign_id)
    characters: list[dict] = []
    seen_names: set[str] = set()

    # NPCs from mind engine (primary source — has thoughts and aliases)
    session = _sessions.get(campaign_id)
    npc_minds = session._npc_minds if session and session._npc_minds else None
    for mind in (npc_minds.get_all_minds(campaign_id) if npc_minds else []):
        name_lower = mind.name.lower()
        if name_lower in seen_names:
            continue
        seen_names.add(name_lower)
        characters.append({
            "name": mind.name,
            "aliases": mind.aliases,
            "type": "NPC",
        })

    # Entities from graph engine (if available)
    session = _sessions.get(campaign_id)
    if session and hasattr(session, "_graph") and session._graph:
        try:
            nodes = await session._graph.get_all_nodes()
            for node in nodes:
                name_lower = node.name.lower()
                if name_lower in seen_names:
                    continue
                seen_names.add(name_lower)
                characters.append({
                    "name": node.name,
                    "aliases": [],
                    "type": node.node_type.value if hasattr(node.node_type, "value") else str(node.node_type),
                })
        except Exception:
            pass

    # Filter by query if provided
    if q:
        q_lower = q.lower()
        characters = [
            c for c in characters
            if q_lower in c["name"].lower()
            or any(q_lower in a.lower() for a in c.get("aliases", []))
        ]

    return characters


@router.get("/{campaign_id}/memory-crystals")
async def get_memory_crystals(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    _ensure_session(campaign_id)
    crystals = _memory.get_crystals(campaign_id)
    return [
        {
            "tier": c.tier.value,
            "content": c.content,
            "event_count": c.event_count,
        }
        for c in crystals
    ]


@router.post("/{campaign_id}/crystallize")
async def crystallize_memory(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    _, _, _, _, language, _, _ = _load_scenario_for_campaign(campaign_id)
    crystal = await _memory.crystallize(campaign_id, CrystalTier.SHORT, language=language)
    return {
        "tier": crystal.tier.value,
        "content": crystal.content,
        "event_count": crystal.event_count,
    }


@router.post("/{campaign_id}/generate")
async def generate_content(campaign_id: str, req: GenerateRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    world_ctx = _memory.build_context_window(campaign_id)
    # Load power system for this campaign
    _, _, _, _, language, _, power_system = _load_scenario_for_campaign(campaign_id)
    narrative_turns = _event_store.get_total_narrative_time(campaign_id) // 300  # rough turn estimate
    if req.type == "npc":
        power_hint = ""
        if power_system:
            power_hint = power_system.build_npc_tier_hint_for_ai(
                max_realm_order=max(1, narrative_turns // 5) if narrative_turns else 1,
                max_tier_index=min(2, narrative_turns // 3) if narrative_turns else 0,
            )
        npc = await _plot_generator.generate_npc(
            world_ctx,
            language=req.language or language,
            power_system_hint=power_hint,
            narrative_turns=narrative_turns,
        )
        return asdict(npc)
    elif req.type == "event":
        total_time = _event_store.get_total_narrative_time(campaign_id)
        event = await _plot_generator.generate_random_event("current", world_ctx, total_time, language=req.language)
        return asdict(event)
    elif req.type == "plot":
        arc = await _plot_generator.generate_plot_arc(world_ctx, language=req.language)
        return {"text": arc}
    return {"error": "Unknown type"}


@router.post("/{campaign_id}/inject-plot")
async def inject_plot(campaign_id: str, req: InjectPlotRequest, current_user: AuthUser = Depends(get_current_user)):
    """
    Write a PLOT_GENERATION event so the narrator becomes aware of the injected content.
    Also logs a WORLD_EVENT journal entry for the player to see.
    """
    _require_campaign_access(campaign_id, current_user)

    plot_type = req.type
    data = req.data

    # Get language for localized GM notes
    session_language = _sessions[campaign_id].language if campaign_id in _sessions else req.language
    _gm_note_labels = {
        "vi": {"introducing": "Đang giới thiệu", "unexpected_event": "Sự kiện bất ngờ", "plot_arc": "Cung truyện", "gm_note": "[GHI CHÚ GM]"},
        "pt-br": {"introducing": "Introduzindo", "unexpected_event": "Evento Inesperado", "plot_arc": "Arco Narrativo", "gm_note": "[NOTA DO GM]"},
    }
    gm = _gm_note_labels.get(session_language, {"introducing": "Introducing:", "unexpected_event": "Unexpected Event", "plot_arc": "Plot Arc", "gm_note": "[GM NOTE]"})

    # Build a human-readable summary for the event log
    if plot_type == "npc":
        summary_text = f"{gm['introducing']}: {data.get('name','Unknown NPC')} — {data.get('appearance','')}"
        narrative_summary = (
            f"{gm['gm_note']} Nhân vật mới tên {data.get('name','Unknown')} "
            f"(sức mạnh {data.get('power_level','?')}/10) đã xuất hiện. "
            f"{data.get('personality','')} Mục tiêu: {data.get('goal','')} Bí mật: {data.get('secret','')}"
        )
        entities = [data.get("name", "")]
    elif plot_type == "event":
        summary_text = data.get("title", gm['unexpected_event'])
        narrative_summary = f"{gm['gm_note']} Sự kiện thế giới: {data.get('title','')} — {data.get('description','')}"
        entities = data.get("entities", [])
    else:  # plot
        summary_text = gm['plot_arc']
        narrative_summary = f"{gm['gm_note']} Cung truyện đã được gieo: {data.get('text', data.get('summary', ''))}"
        entities = []

    _event_store.append(
        campaign_id=campaign_id,
        event_type=EventType.PLOT_GENERATION,
        payload={
            "kind": plot_type,
            "source": "manual",
            "data": data,
            "narrative_text": narrative_summary,
        },
        narrative_time_delta=0,
        location="plot",
        entities=entities,
    )

    # Also log to journal so the player sees something happened
    try:
        await _journal.evaluate_and_log(campaign_id, summary_text, session_language)
    except Exception:
        logger.warning("Failed to log inject-plot to journal", exc_info=True)

    logger.info("Plot injected: type=%s campaign=%s", plot_type, campaign_id)
    return {"status": "injected", "type": plot_type, "summary": summary_text}


@router.post("/{campaign_id}/inject-npc-seed")
async def inject_npc_seed(campaign_id: str, req: GenerateRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    """Generate an NPC and inject it as a pending seed in the active session."""
    if campaign_id not in _sessions:
        raise HTTPException(404, "No active session for this campaign")
    session = _sessions[campaign_id]
    world_ctx = _memory.build_context_window(campaign_id)
    existing_names = []
    if session._npc_minds:
        existing_names = [m.name for m in session._npc_minds.get_all_minds(campaign_id)]
    power_hint = ""
    if session._power_system:
        power_hint = session._power_system.build_npc_tier_hint_for_ai(
            max_realm_order=max(1, session._turn_count // 5),
            max_tier_index=min(2, session._turn_count // 3),
        )
    npc = await _plot_generator.generate_npc(
        world_ctx,
        language=req.language,
        existing_npc_names=existing_names,
        power_system_hint=power_hint,
        narrative_turns=session._turn_count,
    )
    from dataclasses import asdict as _asdict
    npc_data = _asdict(npc)
    session._pending_npc_seed = npc_data
    session._pending_npc_introduced = False
    return {"status": "injected", "npc": npc_data}


@router.post("/{campaign_id}/timeskip")
async def timeskip(campaign_id: str, req: TimeskipRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    _event_store.append(
        campaign_id=campaign_id,
        event_type=EventType.TIMESKIP,
        payload={"seconds": req.seconds},
        narrative_time_delta=req.seconds,
        location="world",
        entities=[],
    )
    world_ctx = _memory.build_context_window(campaign_id)
    session_language = _sessions[campaign_id].language if campaign_id in _sessions else "en"
    world_changes = await _world_reactor.process_tick(
        campaign_id=campaign_id,
        narrative_seconds=req.seconds,
        world_context=world_ctx,
        language=session_language,
    )
    if world_changes:
        _event_store.append(
            campaign_id=campaign_id,
            event_type=EventType.WORLD_TICK,
            payload={"text": world_changes},
            narrative_time_delta=0,
            location="world",
            entities=[],
        )
        try:
            await _journal.evaluate_and_log(campaign_id, world_changes, session_language)
        except Exception:
            logger.warning("Failed to log timeskip world changes into journal", exc_info=True)
    _timeskip_fallback = {
        "vi": "Thời gian trôi qua yên lặng.",
        "pt-br": "O tempo passa silenciosamente.",
    }
    return {"summary": world_changes or _timeskip_fallback.get(session_language, "Time passes quietly.")}


@router.get("/{campaign_id}/inventory")
async def get_inventory(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    _ensure_session(campaign_id)
    items = _inventory.get_inventory(campaign_id)
    return [{"name": i.name, "category": i.category, "source": i.source, "status": i.status} for i in items]


@router.post("/{campaign_id}/inventory")
async def update_inventory(campaign_id: str, req: InventoryActionRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    if req.action == "use":
        _inventory.use_item(campaign_id, req.name)
    elif req.action == "discard":
        _inventory.lose_item(campaign_id, req.name)
    return {"status": "ok"}


@router.post("/{campaign_id}/inventory/add")
async def add_inventory_item(campaign_id: str, req: AddInventoryRequest, current_user: AuthUser = Depends(get_current_user)):
    _require_campaign_access(campaign_id, current_user)
    _ensure_session(campaign_id)
    _inventory.add_item(campaign_id, req.name, req.category, req.source)
    items = _inventory.get_inventory(campaign_id)
    return [{"name": i.name, "category": i.category, "source": i.source, "status": i.status} for i in items]


@router.get("/{campaign_id}/graph-search")
async def graph_search(campaign_id: str, current_user: AuthUser = Depends(get_current_user), q: str = ""):
    _require_campaign_access(campaign_id, current_user)
    if not q:
        return {"facts": []}

    facts: list[dict] = []
    engine = _get_graphiti_engine()
    if engine:
        facts = await engine.search(campaign_id, q)

    if not facts:
        facts = await _fallback_graph_search(campaign_id, q)

    return {"facts": facts}


async def _sync_story_cards_to_graph(campaign_id: str) -> int:
    """
    Write all story cards from the campaign's scenario into Neo4j.
    Returns the number of nodes created.
    Skipped card types: RANK (rank systems are not world entities).
    """
    from app.db.scenario_store import StoryCardType
    from app.engines.graph_engine import WorldNodeType

    TYPE_MAP = {
        StoryCardType.NPC:       WorldNodeType.NPC,
        StoryCardType.LOCATION:  WorldNodeType.LOCATION,
        StoryCardType.FACTION:   WorldNodeType.FACTION,
        StoryCardType.ITEM:      WorldNodeType.ITEM,
        StoryCardType.LORE:      WorldNodeType.EVENT,
        # RANK is intentionally skipped — it belongs in the power system panel
    }

    try:
        store = ScenarioStore(_SCENARIO_DB_PATH)
        campaign = store.get_campaign(campaign_id)
        if not campaign:
            store.close()
            return 0
        cards = store.get_story_cards(campaign.scenario_id)
        store.close()
    except Exception:
        logger.warning("Could not load story cards for campaign %s", campaign_id)
        return 0

    if not cards:
        return 0

    engine = _get_graph_engine(campaign_id)
    if not engine:
        return 0

    try:
        await engine.initialize()
    except Exception as e:
        logger.warning("Could not initialize graph engine for campaign %s: %s", campaign_id, e)
        return 0

    node_ids: dict[str, str] = {}   # card_name → neo4j_node_id
    created = 0

    for card in cards:
        mapped_type = TYPE_MAP.get(card.card_type)
        if not mapped_type:
            continue  # RANK etc.

        attrs = dict(card.content) if card.content else {}
        # Pull a short summary for the graph label if description is missing
        if not attrs.get("description"):
            for key in ("summary", "goal", "appearance", "history"):
                if attrs.get(key):
                    attrs["description"] = str(attrs[key])[:200]
                    break

        try:
            node = await engine.add_node(mapped_type, card.name, attrs)
            node_ids[card.name.lower()] = node.id
            created += 1
        except Exception as e:
            logger.debug("Could not add node %s: %s", card.name, e)

    # Build relationships from content fields
    REL_FIELD_MAP = [
        # (source_type, target_type, field_name, rel_type)
        ("leader",  "NPC",      "leader"),
        ("members", "NPC",      "MEMBER_OF"),
        ("founder", "NPC",      "FOUNDED_BY"),
        ("ruler",   "NPC",      "RULED_BY"),
        ("faction", "FACTION",  "PART_OF"),
        ("location","LOCATION", "LOCATED_AT"),
        ("home",    "LOCATION", "HOME_OF"),
    ]

    for card in cards:
        attrs = dict(card.content) if card.content else {}
        mapped_type = TYPE_MAP.get(card.card_type)
        if not mapped_type:
            continue

        source_id = node_ids.get(card.name.lower())
        if not source_id:
            continue

        for field_key, target_type, rel_type in REL_FIELD_MAP:
            raw = attrs.get(field_key)
            if not raw:
                continue
            names = [n.strip() for n in str(raw).split(",")]
            for name in names:
                target_id = node_ids.get(name.lower())
                if not target_id or target_id == source_id:
                    continue
                try:
                    await engine.add_relationship(source_id, target_id, rel_type, 1.0)
                except Exception:
                    pass

    logger.info("Synced %d story cards to Neo4j for campaign %s", created, campaign_id)
    return created


@router.get("/{campaign_id}/world-graph")
async def get_world_graph(campaign_id: str, current_user: AuthUser = Depends(get_current_user)):
    """
    Return the world graph — all entities extracted from narrative so far.

    Neo4j is populated incrementally each turn by _extract_entities_to_graph()
    in GameSession. The map grows as the player reads the story.
    """
    _require_campaign_access(campaign_id, current_user)
    try:
        engine = _get_graph_engine(campaign_id)
        if not engine:
            return {"nodes": [], "links": []}
        await engine.initialize()
        nodes = await engine.get_all_nodes()
        rels = await engine.get_all_relationships()

        # Load power system config for node enrichment
        ps_config = None
        try:
            ps_store = ScenarioStore(_SCENARIO_DB_PATH)
            campaign = ps_store.get_campaign(campaign_id)
            ps_store.close()
            if campaign and campaign.power_system_snapshot:
                import json as _json
                ps_config = PowerSystemConfig.from_dict(_json.loads(campaign.power_system_snapshot))
        except Exception:
            pass

        thought_by_npc = _collect_latest_npc_thought_payloads(campaign_id)

        # ── Filter: hide RANK nodes (rank system graph) and ENTITY nodes (unknown type) ──
        # These are seeded automatically and should not appear in the World Map
        HIDDEN_TYPES = {"RANK", "ENTITY"}
        visible_node_ids: set[str] = {
            n.id for n in nodes
            if n.node_type and n.node_type.value not in HIDDEN_TYPES
        }

        return {
            "nodes": [
                {
                    "id": n.id,
                    "name": n.name,
                    "node_type": n.node_type.value,
                    "attributes": (
                        _enrich_npc_node_attributes_for_world_map(
                            n.attributes, n.name, thought_by_npc, ps_config
                        )
                        if n.node_type and n.node_type.value == "NPC"
                        else (n.attributes or {})
                    ),
                }
                for n in nodes
                if n.node_type and n.node_type.value not in HIDDEN_TYPES
            ],
            "links": [
                {
                    "source": r["source_id"],
                    "target": r["target_id"],
                    "rel_type": r["rel_type"],
                    "strength": r["strength"],
                }
                for r in rels
                if r["source_id"] in visible_node_ids and r["target_id"] in visible_node_ids
            ],
        }
    except Exception as e:
        logger.warning("Failed to fetch world graph for campaign %s: %s", campaign_id, e)
        return {"nodes": [], "links": []}


# ---------------------------------------------------------------------------
# Power System / Progression endpoints
# ---------------------------------------------------------------------------

@router.get("/{campaign_id}/power-system/debug")
def get_campaign_power_system_debug(
    campaign_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """DEBUG: return power system config for this campaign."""
    _require_campaign_access(campaign_id, current_user)
    store = ScenarioStore(_SCENARIO_DB_PATH)
    try:
        row = store._conn.execute(
            "SELECT s.power_system_id FROM scenarios s JOIN campaigns c ON c.scenario_id = s.id WHERE c.id=?",
            (campaign_id,),
        ).fetchone()
        ps_id = row[0] if row else None
        snapshot = store.get_campaign_snapshot(campaign_id)
        # Check if it's JSON with axes
        import json as _json
        has_axes = False
        if ps_id and isinstance(ps_id, str) and ps_id.startswith("{"):
            try:
                parsed = _json.loads(ps_id)
                has_axes = "axes" in parsed and len(parsed.get("axes", [])) > 0
            except Exception:
                pass
        return {
            "power_system_id": ps_id[:100] if ps_id else None,
            "campaign_snapshot": snapshot[:100] if snapshot else None,
            "has_axes_in_ps_id": has_axes,
            "is_json": isinstance(ps_id, str) and ps_id.startswith("{") if ps_id else False,
        }
    finally:
        store.close()


@router.get("/{campaign_id}/power-system")
def get_campaign_power_system(
    campaign_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Return the locked power system config for this campaign.
    Returns the multi-axis config with axes array, or null.
    """
    _require_campaign_access(campaign_id, current_user)
    store = ScenarioStore(_SCENARIO_DB_PATH)
    try:
        snapshot = store.get_campaign_snapshot(campaign_id)
        if not snapshot:
            return None
        # If it's a preset key, fetch the preset info
        if not snapshot.startswith("{"):
            from app.engines.power_system_presets import get_preset
            from app.engines.power_system_models import axis_to_dict
            preset = get_preset(snapshot)
            if preset and "axes" in preset:
                return {
                    "mode": "multi_axis",
                    "axes": [axis_to_dict(a) for a in preset["axes"]],
                }
            return None
        # Multi-axis JSON blob
        try:
            import json as _json
            data = _json.loads(snapshot)
            return {"mode": "multi_axis", "axes": data.get("axes", [])}
        except Exception:
            return None
    finally:
        store.close()


@router.get("/{campaign_id}/power-system/progressions")
def get_character_progressions(
    campaign_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Return all character progressions stored in the event store.
    Stored as CHARACTER_PROGRESSION events.
    """
    _require_campaign_access(campaign_id, current_user)
    events = _event_store.get_by_type(campaign_id, EventType.CHARACTER_PROGRESSION)
    return [
        {
            "character_id": e.payload.get("character_id"),
            "axis_id": e.payload.get("axis_id"),
            "stage_slug": e.payload.get("stage_slug"),
            "stage_name": e.payload.get("stage_name"),
            "stage_index": e.payload.get("stage_index"),
            "raw_value": e.payload.get("raw_value"),
            "sub_stage_slug": e.payload.get("sub_stage_slug"),
            "xp_progress": e.payload.get("xp_progress", 0.0),
        }
        for e in events
    ]


@router.post("/{campaign_id}/power-system/progressions")
def update_character_progression(
    campaign_id: str,
    req: UpdateProgressionRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Store a character progression snapshot in the event store.
    Body: { character_id, axis_id, stage_slug, stage_name, stage_index, raw_value, sub_stage_slug, xp_progress }
    """
    _require_campaign_access(campaign_id, current_user)
    _event_store.append(
        campaign_id=campaign_id,
        event_type=EventType.CHARACTER_PROGRESSION,
        payload={
            "character_id": req.character_id,
            "axis_id": req.axis_id,
            "stage_slug": req.stage_slug,
            "stage_name": req.stage_name,
            "stage_index": req.stage_index,
            "raw_value": req.raw_value,
            "sub_stage_slug": req.sub_stage_slug,
            "xp_progress": req.xp_progress,
        },
        narrative_time_delta=0,
        location="system",
        entities=[req.character_id],
    )
    return {"status": "ok"}

