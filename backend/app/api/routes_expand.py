import logging
import os
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.engines.expander import ScenarioExpander
from app.engines.llm_router import LLMRouter, LLMConfig
from app.middleware.auth import AuthUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _get_llm() -> LLMRouter:
    return LLMRouter(LLMConfig())


_expander = ScenarioExpander(_get_llm())


class ExpandRequest(BaseModel):
    title: str = Field(default="")
    description: str = Field(default="")
    language: str = Field(default="en")
    genre_id: str | None = Field(default=None)
    lore_text: str = Field(default="")


@router.post("/expand")
async def expand_scenario(
    req: ExpandRequest,
    _current_user: AuthUser = Depends(get_current_user),
):
    """
    Given title, description, and optional genre from Step 1, call the AI to generate
    the complete world: tone, opening, lore, entities, and multi-axis power system.

    A SINGLE LLM call via ScenarioExpander produces:
    - suggestions (tone, narrative, lore)
    - entities (factions, locations, NPCs, items, secrets)
    - power_system (multi-axis rank systems auto-generated to fit the world)

    The power_system field contains ALL rank systems (axes), each with stages
    and sub-stages — AI-generated to be logically consistent with the world.
    """
    try:
        result = await _expander.expand(
            title=req.title,
            description=req.description,
            language=req.language,
            genre_id=req.genre_id,
            lore_text=req.lore_text,
        )
    except Exception:
        logger.exception("Expander failed during expand")
        result = {"entities": [], "suggestions": {}, "power_system": {}}

    return result
