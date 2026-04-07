import json
import uuid
from dataclasses import dataclass
from enum import Enum

from neo4j import AsyncGraphDatabase

from app.utils.slug import is_slug, slug_to_display


class WorldNodeType(str, Enum):
    NPC = "NPC"
    LOCATION = "LOCATION"
    FACTION = "FACTION"
    ITEM = "ITEM"
    EVENT = "EVENT"
    ENTITY = "ENTITY"  # generic / unclassified entity
    RANK = "RANK"      # rank system nodes (hidden from World Map)


@dataclass
class WorldNode:
    id: str
    node_type: WorldNodeType | None
    name: str
    attributes: dict
    campaign_id: str


@dataclass
class Relationship:
    source_id: str
    target_id: str
    rel_type: str
    strength: float


class GraphEngine:
    def __init__(self, uri: str, user: str, password: str, campaign_id: str):
        self._driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.campaign_id = campaign_id

    async def initialize(self):
        async with self._driver.session() as session:
            await session.run(
                "CREATE CONSTRAINT IF NOT EXISTS FOR (n:WorldNode) REQUIRE n.node_id IS UNIQUE"
            )

    async def add_node(
        self,
        node_type: WorldNodeType | None,
        name: str,
        attributes: dict,
    ) -> WorldNode:
        # ── Entity name normalization ───────────────────────────────────────
        # If the LLM returned a slug instead of a display name, convert it.
        # e.g. "van_hong" → "Van Hong", "kỹ_năng_công_cụ" → "Kỹ Năng Công Cụ"
        # Slug detection: lowercase, underscores, no spaces (e.g. "van_hong", "dungeon_1")
        normalized_name = name.strip()
        if is_slug(name):
            converted = slug_to_display(name)
            if converted != name:
                normalized_name = converted
        # ── Attribute normalization: slug values → display names ──────────
        # realm/tier/sub_tier come from power system slugs in entity extraction.
        # Normalize them so WorldMap shows proper names instead of slugs.
        normalized_attrs = dict(attributes or {})
        for slug_field in ("realm", "tier", "sub_tier", "location_type",
                           "faction_type", "item_type"):
            raw = normalized_attrs.get(slug_field)
            if raw and is_slug(str(raw)):
                converted = slug_to_display(str(raw))
                if converted != str(raw):
                    normalized_attrs[slug_field] = converted
        node_id = str(uuid.uuid4())
        # Normalize node_type: None → WorldNodeType.ENTITY
        _resolved_type = node_type if node_type else WorldNodeType.ENTITY
        async with self._driver.session() as session:
            await session.run(
                """
                CREATE (n:WorldNode {
                    node_id: $node_id,
                    node_type: $node_type,
                    name: $name,
                    campaign_id: $campaign_id,
                    attributes_json: $attributes_json
                })
                """,
                node_id=node_id,
                node_type=_resolved_type.value,
                name=normalized_name,
                campaign_id=self.campaign_id,
                attributes_json=json.dumps(normalized_attrs),
            )
        return WorldNode(
            id=node_id,
            node_type=_resolved_type,
            name=normalized_name,
            attributes=normalized_attrs,
            campaign_id=self.campaign_id,
        )

    async def add_relationship(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        strength: float = 1.0,
    ) -> Relationship:
        # rel_type must be a valid Cypher identifier — sanitize to uppercase alphanumeric
        safe_rel_type = "".join(c for c in rel_type.upper() if c.isalnum() or c == "_")
        async with self._driver.session() as session:
            await session.run(
                f"""
                MATCH (a:WorldNode {{node_id: $source_id, campaign_id: $campaign_id}})
                MATCH (b:WorldNode {{node_id: $target_id, campaign_id: $campaign_id}})
                MERGE (a)-[r:{safe_rel_type}]->(b)
                SET r.strength = $strength, r.campaign_id = $campaign_id
                """,
                source_id=source_id,
                target_id=target_id,
                campaign_id=self.campaign_id,
                strength=strength,
            )
        return Relationship(source_id, target_id, rel_type, strength)

    async def get_npc_power(self, name: str, power_resolver=None) -> int:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:WorldNode {name: $name, campaign_id: $campaign_id, node_type: 'NPC'})
                RETURN n.attributes_json AS attrs
                LIMIT 1
                """,
                name=name,
                campaign_id=self.campaign_id,
            )
            record = await result.single()
            if not record:
                return 5
            attrs = json.loads(record["attrs"])
            realm = attrs.get("realm")
            tier = attrs.get("tier")
            sub_tier = int(attrs.get("sub_tier", 2))
            if realm and power_resolver:
                return int(round(power_resolver.resolve_power_score(realm, tier or "Sơ Kỳ", sub_tier=sub_tier, power_level=5)))
            if realm:
                # Fallback: sub_tier drives power when no power system defined
                sub_bonus = (sub_tier - 1) / 2.0 * 0.9
                return max(1, min(10, int(round(5.0 + sub_bonus))))
            return 5

    async def get_npc_progression(self, name: str) -> dict | None:
        """
        Return the multi-axis progression dict for an NPC.
        Returns {axis_id: {raw_value: N, stage_index: N, sub_stage_key: str|null}, ...}
        or None if the NPC has no progression data.
        """
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:WorldNode {name: $name, campaign_id: $campaign_id, node_type: 'NPC'})
                RETURN n.attributes_json AS attrs
                LIMIT 1
                """,
                name=name,
                campaign_id=self.campaign_id,
            )
            record = await result.single()
            if not record:
                return None
            attrs = json.loads(record["attrs"])
            return attrs.get("progression")  # None if not set

    async def get_npc_realm_tier(self, name: str) -> tuple[str, str, int]:
        """Return (realm_name, tier_name, sub_tier) for an NPC, or ('', '', 2) if unknown."""
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:WorldNode {name: $name, campaign_id: $campaign_id, node_type: 'NPC'})
                RETURN n.attributes_json AS attrs
                LIMIT 1
                """,
                name=name,
                campaign_id=self.campaign_id,
            )
            record = await result.single()
            if not record:
                return "", "", 2
            attrs = json.loads(record["attrs"])
            return attrs.get("realm", ""), attrs.get("tier", ""), int(attrs.get("sub_tier", 2))

    async def get_neighbors(self, node_id: str) -> list[WorldNode]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (a:WorldNode {node_id: $node_id})-[r]-(b:WorldNode)
                RETURN b
                """,
                node_id=node_id,
            )
            nodes = []
            async for record in result:
                b = record["b"]
                raw_type = b.get("node_type")
                try:
                    node_type = WorldNodeType(raw_type) if raw_type else None
                except ValueError:
                    node_type = None
                nodes.append(WorldNode(
                    id=b["node_id"],
                    node_type=node_type,
                    name=b["name"],
                    attributes=json.loads(b.get("attributes_json", "{}")),
                    campaign_id=b["campaign_id"],
                ))
            return nodes

    async def get_all_nodes(self) -> list[WorldNode]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:WorldNode {campaign_id: $campaign_id})
                RETURN n
                """,
                campaign_id=self.campaign_id,
            )
            nodes = []
            async for record in result:
                n = record["n"]
                raw_type = n.get("node_type")
                try:
                    node_type = WorldNodeType(raw_type) if raw_type else WorldNodeType.ENTITY
                except ValueError:
                    node_type = WorldNodeType.ENTITY
                nodes.append(WorldNode(
                    id=n["node_id"],
                    node_type=node_type,
                    name=n["name"],
                    attributes=json.loads(n.get("attributes_json", "{}")),
                    campaign_id=n["campaign_id"],
                ))
            return nodes

    async def get_all_relationships(self) -> list[dict]:
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (a:WorldNode {campaign_id: $campaign_id})-[r]->(b:WorldNode {campaign_id: $campaign_id})
                RETURN a.node_id AS source_id, b.node_id AS target_id, type(r) AS rel_type, r.strength AS strength
                """,
                campaign_id=self.campaign_id,
            )
            rels = []
            async for record in result:
                rels.append({
                    "source_id": record["source_id"],
                    "target_id": record["target_id"],
                    "rel_type": record["rel_type"],
                    "strength": record["strength"] or 1.0,
                })
            return rels

    async def update_node_attributes(
        self, node_id: str, attributes: dict, node_type: str | None = None,
    ) -> None:
        """Merge new attributes into an existing node (preserving old values).
        Optionally update the node_type property as well.

        Slug values in attributes are normalized to display names."""
        # Normalize slug values in attributes
        normalized = dict(attributes or {})
        for slug_field in ("realm", "tier", "sub_tier", "location_type",
                          "faction_type", "item_type"):
            raw = normalized.get(slug_field)
            if raw and is_slug(str(raw)):
                converted = slug_to_display(str(raw))
                if converted != str(raw):
                    normalized[slug_field] = converted
        async with self._driver.session() as session:
            query = """
                MATCH (n:WorldNode {node_id: $node_id, campaign_id: $campaign_id})
                SET n.attributes_json = $attributes_json
            """
            params = {
                "node_id": node_id,
                "campaign_id": self.campaign_id,
                "attributes_json": json.dumps(normalized),
            }
            if node_type:
                query += ", n.node_type = $node_type"
                params["node_type"] = node_type
            await session.run(query, **params)

    async def get_node_by_name(self, name: str) -> dict | None:
        """Find a node by name within the campaign. Returns the attributes dict or None."""
        async with self._driver.session() as session:
            result = await session.run(
                """
                MATCH (n:WorldNode {name: $name, campaign_id: $campaign_id})
                RETURN n.attributes_json AS attrs, n.node_id AS nid
                LIMIT 1
                """,
                name=name,
                campaign_id=self.campaign_id,
            )
            record = await result.single()
            if not record:
                return None
            return {"node_id": record["nid"], **json.loads(record["attrs"])}

    async def set_node_label(self, node_id: str, label: str) -> None:
        """Add a label to an existing node."""
        async with self._driver.session() as session:
            safe_label = "".join(c for c in label if c.isalnum() or c == "_")
            if safe_label:
                await session.run(
                    f"MATCH (n {{node_id: $node_id, campaign_id: $campaign_id}}) SET n:{safe_label}",
                    node_id=node_id,
                    campaign_id=self.campaign_id,
                )

    async def merge_rel_typed(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        properties: dict | None = None,
    ) -> None:
        """Create/merge a typed relationship with optional properties."""
        safe = "".join(c for c in rel_type.upper() if c.isalnum() or c == "_")
        props_str = ""
        if properties:
            prop_pairs = ", ".join(f"r.{k} = ${k}" for k in properties)
            props_str = f" SET {prop_pairs}, r.campaign_id = $campaign_id"
        async with self._driver.session() as session:
            await session.run(
                f"""
                MATCH (a {{node_id: $source_id, campaign_id: $campaign_id}})
                MATCH (b {{node_id: $target_id, campaign_id: $campaign_id}})
                MERGE (a)-[r:{safe}]->(b){props_str}
                """,
                source_id=source_id,
                target_id=target_id,
                campaign_id=self.campaign_id,
                **(properties or {}),
            )

    async def clear_campaign(self, campaign_id: str):
        async with self._driver.session() as session:
            await session.run(
                "MATCH (n:WorldNode {campaign_id: $campaign_id}) DETACH DELETE n",
                campaign_id=campaign_id,
            )

    async def close(self):
        await self._driver.close()
