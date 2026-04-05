"""
RankGraph — Neo4j-backed rank entity management.

Stores rank entities (RealmStage nodes) and character rank state in Neo4j.
Used by RankAdvancer to query progression state and advance ranks.

Schema:
  (e:RankEntity {name, axis_id, stage_key, sub_stage_key,
                  stage_order, tier_value, description,
                  advance_hint, requirements_json,
                  requirements_met_pct})
  ADVANCES_TO(e1) → e2   (one per entity)
  REQUIRES(e) → ITEM/FACTION  (for item/lore gating)

  (c:CharacterRank {character_id, current_entity_name,
                     last_advance_at, narrative_days_count})
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.engines.power_system_models import PowerSystemConfig, PowerAxis, Stage

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _stage_order_value(stage_order: int, sub_stage_key: str | None) -> float:
    """
    Convert stage_order + sub_stage_key to a sortable float.
    Sub-stages: so_ky=0.0, trung_ky=0.33, hau_ky=0.66
    """
    base = float(stage_order)
    sub_offset = {"so_ky": 0.0, "trung_ky": 0.33, "hau_ky": 0.66}.get(
        sub_stage_key or "", 0.0
    )
    return base + sub_offset


def _build_requirements(requirements: dict | None, stage_style: str) -> dict:
    """
    Build default requirements from a stage.
    Returns a requirements dict with narrative_days, combat_wins, etc.
    """
    reqs = dict(requirements) if requirements else {}
    # Default: at least 20 narrative days of passage to advance
    reqs.setdefault("min_narrative_days", 20)
    return reqs


# ---------------------------------------------------------------------------
# RankGraph
# ---------------------------------------------------------------------------

class RankGraph:
    """
    Manages RankEntity nodes and CharacterRank state in Neo4j.

    Usage:
        rg = RankGraph(graph_engine)
        await rg.seed_from_config(campaign_id, power_system_config)
        current = await rg.get_current_rank("PLAYER")
        next_entity = await rg.get_next_rank("PLAYER")
        if await rg.can_advance("PLAYER"):
            result = await advancer.evaluate(...)
            if result.should_advance:
                await rg.advance_rank("PLAYER", result)
    """

    RANK_ENTITY_LABEL = "RankEntity"
    CHARACTER_RANK_LABEL = "CharacterRank"
    ADVANCES_TO_REL = "ADVANCES_TO"

    def __init__(self, graph_engine):
        self._graph = graph_engine

    # ── Seeding ────────────────────────────────────────────────────────────

    async def seed_from_config(
        self,
        campaign_id: str,
        config: PowerSystemConfig,
        start_entity: str | None = None,
    ) -> list[str]:
        """
        Create RankEntity nodes from a PowerSystemConfig.

        For each axis:
          - Each stage + sub_stage combo = one entity
          - Entities are linked ADVANCES_TO in order
          - The first entity becomes the starting rank for new characters

        Returns list of created entity names.
        """
        created: list[str] = []
        prev_entity_name: str | None = None

        for axis in config.axes:
            if not axis.visible:
                continue  # skip internal/AI-only axes

            prev_name_in_axis: str | None = None

            # Stages in order
            sorted_stages = sorted(axis.stages, key=lambda s: s.order)
            for stage_idx, stage in enumerate(sorted_stages):
                sub_stages = list(stage.sub_stages) if stage.sub_stages else [None]

                for sub_idx, sub in enumerate(sub_stages):
                    sub_key = sub.key if sub else None
                    sub_display = sub.name if sub else stage.name

                    entity_name = (
                        f"{stage.name} {sub_display}"
                        if sub and sub.key != "none"
                        else stage.name
                    )

                    tier_value = self._calc_tier_value(stage.order, len(sorted_stages), len(sub_stages), sub_idx)
                    reqs = _build_requirements(None, stage.stage_style.value)
                    reqs_display = _build_requirements_display(reqs)

                    await self._graph.add_node(
                        node_type=None,  # Will set label separately
                        name=entity_name,
                        attributes={
                            "axis_id": axis.axis_id,
                            "axis_name": axis.axis_name,
                            "stage_key": stage.slug,
                            "sub_stage_key": sub_key,
                            "stage_order": stage.order,
                            "tier_value": tier_value,
                            "description": stage.description or f"{axis.axis_name} — {stage.name}",
                            "requirements_json": json.dumps(reqs),
                            "requirements_met_pct": 0.0,
                            "advance_hint": (
                                reqs.get("advance_hint", "")
                                or f"Ngươi đã sẵn sàng bước vào {entity_name}. "
                                  "Hãy mô tả cảnh đột phá."
                            ),
                            "campaign_id": campaign_id,
                        },
                    )

                    # Set label via update
                    await self._merge_rank_entity(entity_name, campaign_id, attributes={
                        "axis_id": axis.axis_id,
                        "axis_name": axis.axis_name,
                            "stage_key": stage.slug,
                        "sub_stage_key": sub_key,
                        "stage_order": stage.order,
                        "tier_value": tier_value,
                        "description": stage.description or f"{axis.axis_name} — {stage.name}",
                        "requirements_json": json.dumps(reqs),
                        "requirements_met_pct": 0.0,
                        "advance_hint": (
                            reqs.get("advance_hint", "")
                            or f"Ngươi đã sẵn sàng bước vào {entity_name}. "
                              "Hãy mô tả cảnh đột phá."
                        ),
                    })

                    # Link to previous entity
                    if prev_name_in_axis:
                        await self._graph.add_relationship(
                            source_id=await self._find_entity_id(prev_name_in_axis, campaign_id),
                            target_id=await self._find_entity_id(entity_name, campaign_id),
                            rel_type="ADVANCES_TO",
                            strength=1.0,
                        )

                    prev_name_in_axis = entity_name
                    created.append(entity_name)

                    # First entity overall = starting rank for new characters
                    if start_entity is None and prev_entity_name is None:
                        start_entity = entity_name

                    prev_entity_name = entity_name

        logger.info("Seeded %d rank entities for campaign %s", len(created), campaign_id)
        return created

    async def _merge_rank_entity(
        self, name: str, campaign_id: str, attributes: dict,
    ) -> None:
        """Set label + properties on an existing or new RankEntity node."""
        await self._graph.update_node_attributes(
            node_id=await self._find_entity_id(name, campaign_id),
            attributes={
                **attributes,
                "_campaign_id": campaign_id,  # used for matching in Cypher
            },
        )
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (n {name: $name, campaign_id: $campaign_id})
                SET n:RankEntity
                """,
                name=name,
                campaign_id=campaign_id,
            )

    async def _find_entity_id(self, name: str, campaign_id: str) -> str:
        """Find the node_id for a RankEntity by name."""
        async with self._graph._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:RankEntity {name: $name, campaign_id: $campaign_id})
                RETURN n.node_id AS nid
                LIMIT 1
                """,
                name=name,
                campaign_id=campaign_id,
            )
            record = await result.single()
            if record:
                return record["nid"]
            # fallback: try WorldNode label
            result2 = await session.run(
                """
                MATCH (n:WorldNode {name: $name, campaign_id: $campaign_id})
                RETURN n.node_id AS nid
                LIMIT 1
                """,
                name=name,
                campaign_id=campaign_id,
            )
            record2 = await result2.single()
            if record2:
                return record2["nid"]
            return name  # fallback — shouldn't happen

    def _calc_tier_value(
        self,
        stage_order: int,
        total_stages: int,
        total_subs: int,
        sub_idx: int,
    ) -> int:
        """
        Calculate tier value (1-10) for a rank entity.
        Higher order stages = higher tier values.
        Sub-stages modulate within a stage.
        """
        stage_contribution = (stage_order / max(total_stages, 1)) * 8.0
        sub_contribution = (sub_idx / max(total_subs - 1, 1)) * 1.0 if total_subs > 1 else 0.0
        tier = int(round(min(10.0, max(1.0, stage_contribution + sub_contribution + 1.0))))
        return tier

    # ── Character rank state ─────────────────────────────────────────────────

    async def init_character_rank(
        self,
        character_id: str,
        campaign_id: str,
        start_entity: str,
    ) -> None:
        """
        Initialise or reset a character's rank state.
        Called when a campaign starts or a new NPC is introduced.
        """
        attrs = {
            "character_id": character_id,
            "current_entity_name": start_entity,
            "narrative_days_count": 0,
            "combat_wins_count": 0,
            "items_used": "[]",       # JSON array of item names used
            "milestones_achieved": "[]",  # JSON array of milestone IDs
            "last_advance_at": 0,    # narrative_seconds at last advance
        }
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MERGE (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c += $attrs, c:CharacterRank
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                attrs=attrs,
            )

    async def get_character_rank(self, character_id: str, campaign_id: str) -> dict | None:
        """
        Return the CharacterRank state dict for a character.
        Returns None if not initialised.
        """
        async with self._graph._driver.session() as session:
            result = await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                RETURN c
                """,
                character_id=character_id,
                campaign_id=campaign_id,
            )
            record = await result.single()
            if not record:
                return None
            c = record["c"]
            return {
                "character_id": c.get("character_id"),
                "current_entity_name": c.get("current_entity_name", ""),
                "narrative_days_count": int(c.get("narrative_days_count", 0)),
                "combat_wins_count": int(c.get("combat_wins_count", 0)),
                "items_used": json.loads(c.get("items_used", "[]")),
                "milestones_achieved": json.loads(c.get("milestones_achieved", "[]")),
                "last_advance_at": int(c.get("last_advance_at", 0)),
            }

    async def get_rank_entity(self, entity_name: str, campaign_id: str) -> dict | None:
        """Return the full attributes of a RankEntity."""
        async with self._graph._driver.session() as session:
            result = await session.run(
                """
                MATCH (e:RankEntity {name: $name, campaign_id: $campaign_id})
                RETURN e
                """,
                name=entity_name,
                campaign_id=campaign_id,
            )
            record = await result.single()
            if not record:
                return None
            e = record["e"]
            return {
                "name": e.get("name"),
                "axis_id": e.get("axis_id"),
                "axis_name": e.get("axis_name"),
                "stage_key": e.get("stage_key"),
                "sub_stage_key": e.get("sub_stage_key"),
                "stage_order": int(e.get("stage_order", 0)),
                "tier_value": int(e.get("tier_value", 5)),
                "description": e.get("description", ""),
                "requirements": json.loads(e.get("requirements_json", "{}")),
                "advance_hint": e.get("advance_hint", ""),
            }

    async def get_next_rank(self, character_id: str, campaign_id: str) -> dict | None:
        """
        Return the next RankEntity after the character's current rank.
        Returns None if already at max.
        """
        current = await self.get_character_rank(character_id, campaign_id)
        if not current:
            return None
        current_name = current["current_entity_name"]

        async with self._graph._driver.session() as session:
            result = await session.run(
                """
                MATCH (cur:RankEntity {name: $current, campaign_id: $campaign_id})
                     -[r:ADVANCES_TO]->(next:RankEntity)
                RETURN next
                """,
                current=current_name,
                campaign_id=campaign_id,
            )
            record = await result.single()
            if not record:
                return None
            e = record["next"]
            return {
                "name": e.get("name"),
                "axis_id": e.get("axis_id"),
                "stage_key": e.get("stage_key"),
                "sub_stage_key": e.get("sub_stage_key"),
                "stage_order": int(e.get("stage_order", 0)),
                "tier_value": int(e.get("tier_value", 5)),
                "description": e.get("description", ""),
                "requirements": json.loads(e.get("requirements_json", "{}")),
                "advance_hint": e.get("advance_hint", ""),
            }

    async def advance_rank(
        self,
        character_id: str,
        campaign_id: str,
        new_entity_name: str,
        narrative_seconds: int,
    ) -> dict | None:
        """
        Advance a character to a new rank entity.
        Updates CharacterRank state and returns the new entity data.
        """
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c.current_entity_name = $new_entity,
                    c.last_advance_at = $narrative_seconds
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                new_entity=new_entity_name,
                narrative_seconds=narrative_seconds,
            )
        return await self.get_rank_entity(new_entity_name, campaign_id)

    async def increment_narrative_days(
        self,
        character_id: str,
        campaign_id: str,
        days: int,
    ) -> None:
        """Add narrative days (e.g. from a world tick) to a character."""
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c.narrative_days_count = c.narrative_days_count + $days
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                days=days,
            )

    async def increment_combat_wins(
        self,
        character_id: str,
        campaign_id: str,
        wins: int = 1,
    ) -> None:
        """Add combat wins to a character."""
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c.combat_wins_count = c.combat_wins_count + $wins
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                wins=wins,
            )

    async def add_used_item(
        self,
        character_id: str,
        campaign_id: str,
        item_name: str,
    ) -> None:
        """Record that a character used an item."""
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c.items_used = c.items_used + ' ' + $item_name
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                item_name=item_name,
            )

    async def add_milestone(
        self,
        character_id: str,
        campaign_id: str,
        milestone_id: str,
    ) -> None:
        """Record that a character achieved a milestone."""
        async with self._graph._driver.session() as session:
            await session.run(
                """
                MATCH (c:CharacterRank {character_id: $character_id, campaign_id: $campaign_id})
                SET c.milestones_achieved = c.milestones_achieved + ' ' + $milestone_id
                """,
                character_id=character_id,
                campaign_id=campaign_id,
                milestone_id=milestone_id,
            )

    async def get_requirements_met_pct(
        self,
        character_id: str,
        campaign_id: str,
    ) -> float:
        """
        Compute how many requirements for the next rank are already met.
        Returns 0.0–1.0 (used by RankAdvancer to gate decisions).
        """
        state = await self.get_character_rank(character_id, campaign_id)
        if not state:
            return 0.0

        next_ent = await self.get_next_rank(character_id, campaign_id)
        if not next_ent:
            return 1.0  # at max

        reqs = next_ent.get("requirements", {})
        met = 0.0
        total = 0.0

        min_days = reqs.get("min_narrative_days", 0)
        if min_days > 0:
            total += 1.0
            met += min(1.0, state["narrative_days_count"] / min_days)

        min_wins = reqs.get("min_combat_wins", 0)
        if min_wins > 0:
            total += 1.0
            met += min(1.0, state["combat_wins_count"] / min_wins)

        required_items = reqs.get("required_items", [])
        if required_items:
            total += 1.0
            used = set(state["items_used"])
            met += sum(1 for item in required_items if item in used) / len(required_items)

        required_milestones = reqs.get("required_milestones", [])
        if required_milestones:
            total += 1.0
            achieved = set(state["milestones_achieved"])
            met += sum(1 for m in required_milestones if m in achieved) / len(required_milestones)

        if total == 0:
            return 1.0  # no requirements = always advanceable
        return min(1.0, met / total)

    async def get_player_tier(self, campaign_id: str) -> int:
        """Return the player's current tier_value (1-10) for combat comparisons."""
        state = await self.get_character_rank("PLAYER", campaign_id)
        if not state:
            return 5
        entity = await self.get_rank_entity(state["current_entity_name"], campaign_id)
        if not entity:
            return 5
        return entity.get("tier_value", 5)

    async def get_all_rank_entities(self, campaign_id: str) -> list[dict]:
        """Return all RankEntity nodes for a campaign, ordered by stage_order."""
        async with self._graph._driver.session() as session:
            result = await session.run(
                """
                MATCH (e:RankEntity {campaign_id: $campaign_id})
                RETURN e
                ORDER BY e.stage_order, e.sub_stage_key
                """,
                campaign_id=campaign_id,
            )
            entities = []
            async for record in result:
                e = record["e"]
                entities.append({
                    "name": e.get("name"),
                    "axis_id": e.get("axis_id"),
                    "stage_key": e.get("stage_key"),
                    "sub_stage_key": e.get("sub_stage_key"),
                    "stage_order": int(e.get("stage_order", 0)),
                    "tier_value": int(e.get("tier_value", 5)),
                    "description": e.get("description", ""),
                    "requirements": json.loads(e.get("requirements_json", "{}")),
                    "advance_hint": e.get("advance_hint", ""),
                })
            return entities


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

def _build_requirements_display(requirements: dict) -> str:
    """Format requirements dict for a prompt."""
    if not requirements:
        return ""
    lines = []
    if "min_narrative_days" in requirements:
        lines.append(f"  - At least {requirements['min_narrative_days']} narrative days of cultivation")
    if "min_combat_wins" in requirements:
        lines.append(f"  - At least {requirements['min_combat_wins']} combat victories")
    if "required_items" in requirements:
        lines.append(f"  - Must have used: {', '.join(requirements['required_items'])}")
    if "required_milestones" in requirements:
        lines.append(f"  - Required milestones: {', '.join(requirements['required_milestones'])}")
    if "narrative_tags" in requirements:
        lines.append(f"  - Narrative themes: {', '.join(requirements['narrative_tags'])}")
    return "\n".join(lines)
