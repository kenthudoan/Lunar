"""
Rank Advancer — decides when a character advances ranks.

The advancer is called after every narrator response.
It evaluates whether the narrative content justifies a stage advance.

Design principles:
- The narrator NEVER auto-advances a rank. The advancer evaluates.
- A stage advance requires the LLM to explicitly decide it based on narrative events.
- No raw_value or XP tracking — advancement is purely narrative-driven.
- Requirements on each rank entity (items, combat wins, narrative days) are checked
  BEFORE the LLM is asked about advancement. Unmet requirements gate the decision.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum

if False:
    pass


logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

class AdvanceTrigger(str, Enum):
    """Why a rank advance occurred."""
    NARRATIVE_MILESTONE = "narrative_milestone"  # story moment triggered it
    COMBAT_VICTORY       = "combat_victory"        # defeating a strong opponent
    ITEM_CONSUMED       = "item_consumed"         # ate a pill / absorbed a treasure
    TIME_PASSAGE        = "time_passage"           # long cultivation (world tick)
    QUEST_COMPLETE      = "quest_complete"         # storyline achievement
    MANUEL              = "manual"                 # player triggered via UI


@dataclass
class RankAdvance:
    """Result of a rank advance decision."""
    character_id: str          # "PLAYER" or NPC name
    from_entity_name: str       # e.g. "Hấp Khí Hậu Kỳ"
    to_entity_name: str         # e.g. "Trúc Cơ Sơ Kỳ"
    trigger: AdvanceTrigger
    reason: str                 # human-readable description for the journal/narrative
    narrative: str             # LLM-written breakthrough scene

    def to_dict(self) -> dict:
        return {
            "character_id": self.character_id,
            "from_entity": self.from_entity_name,
            "to_entity": self.to_entity_name,
            "trigger": self.trigger.value,
            "reason": self.reason,
            "narrative": self.narrative,
        }


@dataclass
class RankProgress:
    """Current rank progress snapshot for one character."""
    character_id: str
    current_entity_name: str    # e.g. "Hấp Khí Trung Kỳ"
    current_tier_value: int     # used for combat comparisons
    next_entity_name: str | None  # None if at max
    requirements_met: float     # 0.0–1.0: how close to next rank
    narrative_days_since_last: int


@dataclass
class RankDecision:
    """LLM's decision after evaluating narrative + state."""
    should_advance: bool
    trigger: AdvanceTrigger
    reason: str
    narrative: str = ""           # breakthrough scene if should_advance
    failed_requirements: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

def _build_rank_context_prompt(
    character_name: str,
    current_rank: str,
    next_rank: str | None,
    tier_value: int,
    requirements_met: float,
    narrative: str,
    player_input: str,
) -> str:
    """
    Build the prompt that asks the LLM whether a rank advance occurred.
    """
    if next_rank is None:
        next_block = "  - next_rank: N/A (already at maximum)"
    else:
        next_block = f"""\
  - next_rank: {next_rank}
  - advancement_readiness: {requirements_met * 100:.0f}%"""

    return f"""\
You are the narrator of a cultivation game. After the player's action and your narrative response,
determine if the character has ADVANCED to a new rank.

## Character
  - name: {character_name}
  - current_rank: {current_rank}
  - tier_value: {tier_value}/10 (used for combat comparisons){next_block}

## Requirements Hint (may not be fully met yet — use your judgment)
  - readiness: {requirements_met * 100:.0f}%
  - High readiness (≥70%) + strong narrative event → advance likely.
  - Medium readiness (40–69%) + exceptional narrative → advance possible.
  - Low readiness (<40%) → advance only for story-defining moments.

## Player Action
{player_input[:800]}

## Narrative
{narrative[:3000]}

Return ONLY JSON with this shape:
{{
  "should_advance": true or false,
  "trigger": "narrative_milestone" or "combat_victory" or "item_consumed" or "time_passage" or "quest_complete",
  "reason": "one sentence explaining why",
  "failed_requirements": ["requirement that was not met but override granted", ...],
  "narrative": "2-3 sentences describing the breakthrough scene (only if should_advance is true)"
}}

Rules:
- Only advance if the narrative genuinely describes a breakthrough, not just normal action.
- A combat win against a weak opponent does NOT warrant an advance unless the narrative says so.
- Time passage alone (years of sitting and cultivating) CAN warrant an advance if readiness is high.
- Returning to the same rank is NEVER an advance.
"""


def _build_requirements_display(requirements: dict) -> str:
    """Format requirements dict for prompt display."""
    if not requirements:
        return "  - requirements: none (any narrative event may trigger advance)"

    lines = ["  - requirements:"]
    for key, value in requirements.items():
        if isinstance(value, list):
            lines.append(f"    {key}: {', '.join(str(v) for v in value)}")
        else:
            lines.append(f"    {key}: {value}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# RankAdvancer
# ---------------------------------------------------------------------------

from typing import TYPE_CHECKING, Any

from app.utils.json_parsing import parse_json_dict

if TYPE_CHECKING:
    from app.engines.llm_router import LLMRouter
    from app.engines.rank_graph import RankGraph


class RankAdvancer:
    """
    Decides when a character advances ranks after each narrator response.

    Flow:
        evaluate(narrative, player_input) →
            1. Load current rank + next rank from RankGraph
            2. Compute requirements_met_pct
            3. Ask LLM: should advance?
            4. If yes: generate breakthrough narrative
            5. Return RankAdvance + update RankGraph

    This class is purely evaluation — it does NOT modify state.
    Callers (GameSession) are responsible for applying the result.
    """

    def __init__(self, llm: LLMRouter, rank_graph: RankGraph):
        self._llm = llm
        self._rg = rank_graph

    # ── Public API ─────────────────────────────────────────────────────────

    async def evaluate(
        self,
        character_id: str,
        campaign_id: str,
        narrative: str,
        player_input: str,
        narrative_seconds_delta: int = 0,
        is_combat: bool = False,
    ) -> RankAdvance | None:
        """
        Evaluate whether a character should advance a rank.

        Args:
            character_id: "PLAYER" or NPC name
            campaign_id: current campaign
            narrative: the full narrator response text
            player_input: the action that triggered this response
            narrative_seconds_delta: days that passed in this turn (for time requirements)
            is_combat: True if this was a combat turn (increments combat_wins on victory)

        Returns:
            RankAdvance if the LLM decides to advance, None otherwise.
        """
        # Load current rank state
        current = await self._rg.get_character_rank(character_id, campaign_id)
        if not current:
            logger.debug("RankAdvancer: no character rank state for %s in %s", character_id, campaign_id)
            return None

        current_entity = await self._rg.get_rank_entity(current["current_entity_name"], campaign_id)
        if not current_entity:
            return None

        current_name = current_entity["name"]
        current_tier = current_entity.get("tier_value", 5)

        # Load next rank
        next_entity = await self._rg.get_next_rank(character_id, campaign_id)
        next_name = next_entity["name"] if next_entity else None

        # Update progress counters
        if narrative_seconds_delta > 0:
            days = narrative_seconds_delta // 86400  # convert seconds to days
            if days > 0:
                await self._rg.increment_narrative_days(character_id, campaign_id, days)

        if is_combat:
            # Check if player won (heuristic: "defeat" / "kill" / "victory" in narrative)
            narrative_lower = narrative.lower()
            victory_keywords = ["defeated", "victory", "killed", "slain", "đánh bại", "chiến thắng", "tiêu diệt"]
            if any(kw in narrative_lower for kw in victory_keywords):
                await self._rg.increment_combat_wins(character_id, campaign_id)

        # Recompute requirements after counters updated
        reqs_met = await self._rg.get_requirements_met_pct(character_id, campaign_id)

        if next_name is None:
            logger.debug("RankAdvancer: %s already at max rank (%s)", character_id, current_name)
            return None

        # Build evaluation prompt
        reqs_display = _build_requirements_display(next_entity.get("requirements", {}))

        prompt = self._build_evaluate_prompt(
            character_id=character_id,
            current_rank=current_name,
            next_rank=next_name,
            current_tier=current_tier,
            next_tier=next_entity.get("tier_value", current_tier + 1),
            requirements_met=reqs_met,
            requirements_display=reqs_display,
            narrative=narrative,
            player_input=player_input,
        )

        messages = [
            {"role": "system", "content": "You are a fair narrator arbiter. Return ONLY valid JSON."},
            {"role": "user", "content": prompt},
        ]

        try:
            raw = await self._llm.complete(messages=messages, max_tokens=512)
        except Exception:
            logger.warning("RankAdvancer LLM call failed", exc_info=True)
            return None

        decision = self._parse_decision(raw)
        if not decision or not decision.should_advance:
            logger.debug(
                "RankAdvancer: no advance for %s (should_advance=%s)",
                character_id,
                decision.should_advance if decision else None,
            )
            return None

        # Build breakthrough narrative
        breakthrough_narrative = decision.narrative or await self._generate_breakthrough_narrative(
            character_id=character_id,
            current_rank=current_name,
            next_rank=next_name,
            next_tier=next_entity.get("tier_value", current_tier + 1),
            trigger=decision.trigger,
            requirements_display=reqs_display,
        )

        return RankAdvance(
            character_id=character_id,
            from_entity_name=current_name,
            to_entity_name=next_name,
            trigger=decision.trigger,
            reason=decision.reason,
            narrative=breakthrough_narrative,
        )

    # ── Prompt building ──────────────────────────────────────────────────

    def _build_evaluate_prompt(
        self,
        character_id: str,
        current_rank: str,
        next_rank: str,
        current_tier: int,
        next_tier: int,
        requirements_met: float,
        requirements_display: str,
        narrative: str,
        player_input: str,
    ) -> str:
        """Build the LLM evaluation prompt."""
        readiness_pct = requirements_met * 100

        if requirements_met >= 0.7:
            readiness_label = "HIGH (≥70%)"
        elif requirements_met >= 0.4:
            readiness_label = "MEDIUM (40–69%)"
        else:
            readiness_label = "LOW (<40%)"

        trigger_options = (
            "narrative_milestone | combat_victory | item_consumed | time_passage | quest_complete"
        )

        return f"""\
You are the rank-advancement arbiter for a cultivation game.

After each narrative, decide whether the character has genuinely ADVANCED to a new rank.
Only a true breakthrough — not normal activity — warrants an advance.

## Character State
  - name: {character_id}
  - current_rank: {current_rank}
  - current_tier_value: {current_tier}/10
  - next_rank: {next_rank}
  - next_tier_value: {next_tier}/10
  - advance_readiness: {readiness_label} ({readiness_pct:.0f}%)

{requirements_display}

## Readiness Rules
  - HIGH (≥70%): strong narrative event → advance likely
  - MEDIUM (40–69%): exceptional breakthrough narrative → advance possible
  - LOW (<40%): ONLY the most defining story moment → advance rare

## Player Action
{player_input[:800]}

## Narrative Response
{narrative[:4000]}

Return ONLY JSON:
{{
  "should_advance": true or false,
  "trigger": "{trigger_options}",
  "reason": "one sentence explaining why",
  "failed_requirements": ["unmet requirement names if any were overridden", ...],
  "narrative": "3-5 sentences describing the breakthrough scene. Be vivid and specific to this character's journey. (only if should_advance is true)"
}}

IMPORTANT: should_advance=true should be rare and meaningful. A normal combat win does NOT guarantee an advance.
"""

    async def _generate_breakthrough_narrative(
        self,
        character_id: str,
        current_rank: str,
        next_rank: str,
        next_tier: int,
        trigger: AdvanceTrigger,
        requirements_display: str,
    ) -> str:
        """Generate a vivid breakthrough scene when the LLM decides to advance."""
        trigger_hints = {
            AdvanceTrigger.COMBAT_VICTORY: "The breakthrough came as a climactic moment of combat, turning certain defeat into overwhelming victory.",
            AdvanceTrigger.ITEM_CONSUMED: "The breakthrough was triggered by absorbing a powerful spiritual treasure or pill.",
            AdvanceTrigger.TIME_PASSAGE: "The breakthrough came after years of quiet cultivation, a gradual accumulation finally reaching critical mass.",
            AdvanceTrigger.QUEST_COMPLETE: "The breakthrough came as the reward for achieving a legendary quest or completing a great destiny.",
            AdvanceTrigger.NARRATIVE_MILESTONE: "The breakthrough was a defining story moment, the culmination of a personal arc.",
        }
        hint = trigger_hints.get(trigger, "")

        prompt = f"""\
Write a vivid, immersive 3-5 sentence breakthrough scene for a cultivation game.
The character "{character_id}" is advancing from "{current_rank}" to "{next_rank}".

{hint}

{requirements_display}

Requirements are now MET. Write the scene as a dramatic turning point.
Do NOT name the next rank explicitly in the scene.
Use sensory details: what does the character feel, see, hear?
End the scene at the moment of breakthrough — not after.

Return ONLY the narrative text, no JSON, no quotes around it.
"""

        try:
            return await self._llm.complete(messages=[
                {"role": "system", "content": "You are a master narrator. Write immersive prose."},
                {"role": "user", "content": prompt},
            ], max_tokens=384)
        except Exception:
            logger.warning("Breakthrough narrative generation failed", exc_info=True)
            return (
                f"The breakthrough is complete. {character_id} has transcended {current_rank} "
                f"and emerged at the threshold of {next_rank}. "
                "The heavens rumble — a new chapter begins."
            )

    def _parse_decision(self, raw: str) -> RankDecision | None:
        """Parse LLM JSON output into a RankDecision."""
        data = parse_json_dict(raw)
        if not data:
            return None

        should_advance = bool(data.get("should_advance", False))

        trigger_str = str(data.get("trigger", ""))
        try:
            trigger = AdvanceTrigger(trigger_str)
        except ValueError:
            trigger = AdvanceTrigger.NARRATIVE_MILESTONE

        return RankDecision(
            should_advance=should_advance,
            trigger=trigger,
            reason=str(data.get("reason", "")),
            narrative=str(data.get("narrative", "")),
            failed_requirements=list(data.get("failed_requirements", [])),
        )

    # ── Seed support ─────────────────────────────────────────────────────

    async def seed_and_init(
        self,
        campaign_id: str,
        power_system_config: Any,
        player_start_entity: str | None = None,
    ) -> list[str]:
        """
        Convenience: seed rank entities from a PowerSystemConfig
        and initialise the PLAYER's rank state.

        Returns the list of created entity names.
        """
        from app.engines.rank_graph import RankGraph
        if not isinstance(self._rg, RankGraph):
            raise TypeError("rank_graph must be a RankGraph instance")

        created = await self._rg.seed_from_config(
            campaign_id=campaign_id,
            config=power_system_config,
            start_entity=player_start_entity,
        )
        if created and player_start_entity is None:
            player_start_entity = created[0]

        if player_start_entity:
            await self._rg.init_character_rank(
                character_id="PLAYER",
                campaign_id=campaign_id,
                start_entity=player_start_entity,
            )

        return created
