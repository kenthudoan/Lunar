"""
Migration: Set node_type="RANK" on all existing rank entity nodes in Neo4j.

These nodes were created by RankGraph.seed_from_config() with node_type=None
(treated as "ENTITY" by GraphEngine). After this migration they will be correctly
identified as RANK nodes and filtered out of the World Map.

Run once:
    python -m scripts.migrate_rank_nodes

Safe to run multiple times (idempotent).
"""
import asyncio
import os
import sys

# Add backend to path
_backend = os.path.join(os.path.dirname(__file__), "..", "backend")
sys.path.insert(0, os.path.abspath(_backend))

from app.config import settings
from app.engines.graph_engine import GraphEngine


async def migrate():
    print("Connecting to Neo4j...")
    campaigns = set()

    async with GraphEngine(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password, "system") as engine:
        await engine.initialize()
        async with engine._driver.session() as session:
            # Find all campaigns that have WorldNodes
            result = await session.run(
                "MATCH (n:WorldNode) RETURN DISTINCT n.campaign_id AS campaign_id"
            )
            async for record in result:
                cid = record["campaign_id"]
                if cid:
                    campaigns.add(cid)

    print(f"Found {len(campaigns)} campaign(s) with nodes")

    total_updated = 0
    for campaign_id in sorted(campaigns):
        async with GraphEngine(settings.neo4j_uri, settings.neo4j_user, settings.neo4j_password, campaign_id) as engine:
            await engine.initialize()

            # Check how many rank nodes need updating
            async with engine._driver.session() as session:
                # Nodes that have RankEntity label but no node_type or node_type != 'RANK'
                result = await session.run(
                    """
                    MATCH (n:RankEntity)
                    WHERE n.campaign_id = $campaign_id
                    AND (n.node_type IS NULL OR n.node_type <> 'RANK')
                    RETURN count(n) AS cnt
                    """,
                    campaign_id=campaign_id,
                )
                record = await result.single()
                cnt = record["cnt"] if record else 0

                if cnt == 0:
                    print(f"  Campaign {campaign_id[:8]}... — nothing to migrate")
                    continue

                print(f"  Campaign {campaign_id[:8]}... — updating {cnt} rank nodes")
                await session.run(
                    """
                    MATCH (n:RankEntity)
                    WHERE n.campaign_id = $campaign_id
                    AND (n.node_type IS NULL OR n.node_type <> 'RANK')
                    SET n.node_type = 'RANK'
                    """,
                    campaign_id=campaign_id,
                )
                total_updated += cnt

    print(f"\nMigration complete. Total nodes updated: {total_updated}")


if __name__ == "__main__":
    asyncio.run(migrate())
