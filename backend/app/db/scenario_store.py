import sqlite3
import json
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from threading import Lock


class StoryCardType(str, Enum):
    NPC = "NPC"
    LOCATION = "LOCATION"
    FACTION = "FACTION"
    ITEM = "ITEM"
    LORE = "LORE"


@dataclass
class Scenario:
    id: str
    title: str
    description: str
    tone_instructions: str
    opening_narrative: str
    language: str
    lore_text: str
    created_at: str
    user_id: str | None = None
    is_public: bool = True


@dataclass
class StoryCard:
    id: str
    scenario_id: str
    card_type: StoryCardType
    name: str
    content: dict
    created_at: str


@dataclass
class Campaign:
    id: str
    scenario_id: str
    player_name: str
    created_at: str
    user_id: str | None = None


class ScenarioStore:
    SCHEMA_VERSION = 2

    _MIGRATIONS = {
        1: [
            """CREATE TABLE IF NOT EXISTS scenarios (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                tone_instructions TEXT NOT NULL DEFAULT '',
                opening_narrative TEXT NOT NULL DEFAULT '',
                language TEXT NOT NULL DEFAULT 'en',
                lore_text TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS story_cards (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL REFERENCES scenarios(id),
                card_type TEXT NOT NULL,
                name TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS campaigns (
                id TEXT PRIMARY KEY,
                scenario_id TEXT NOT NULL REFERENCES scenarios(id),
                player_name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )""",
        ],
        2: [
            """ALTER TABLE scenarios ADD COLUMN user_id TEXT""",
            """ALTER TABLE scenarios ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1""",
            """ALTER TABLE campaigns ADD COLUMN user_id TEXT""",
        ],
    }

    def __init__(self, db_path: str = "scenarios.db"):
        self._conn = sqlite3.connect(db_path, check_same_thread=False)
        self._lock = Lock()
        self._migrate()

    def _get_schema_version(self) -> int:
        try:
            row = self._conn.execute(
                "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1"
            ).fetchone()
            return row[0] if row else 0
        except sqlite3.OperationalError:
            return 0

    def _migrate(self):
        with self._lock:
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            current = self._get_schema_version()
            for version in sorted(self._MIGRATIONS.keys()):
                if version <= current:
                    continue
                for sql in self._MIGRATIONS[version]:
                    try:
                        self._conn.execute(sql)
                    except sqlite3.OperationalError as e:
                        # Column already exists — safe to ignore
                        if 'duplicate column' not in str(e).lower():
                            raise
                self._conn.execute(
                    "INSERT INTO schema_version VALUES (?, ?)",
                    (version, datetime.utcnow().isoformat()),
                )
            self._conn.commit()

    def create_scenario(
        self,
        title: str,
        description: str = "",
        tone_instructions: str = "",
        opening_narrative: str = "",
        language: str = "en",
        lore_text: str = "",
        user_id: str | None = None,
    ) -> Scenario:
        scenario = Scenario(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            tone_instructions=tone_instructions,
            opening_narrative=opening_narrative,
            language=language,
            lore_text=lore_text,
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
            is_public=True,
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO scenarios VALUES (?,?,?,?,?,?,?,?,?,?)",
                (scenario.id, scenario.title, scenario.description,
                 scenario.tone_instructions, scenario.opening_narrative,
                 scenario.language, scenario.lore_text, scenario.created_at,
                 scenario.user_id, int(scenario.is_public)),
            )
            self._conn.commit()
        return scenario

    def get_scenario(self, scenario_id: str) -> "Scenario | None":
        row = self._conn.execute(
            "SELECT * FROM scenarios WHERE id=?", (scenario_id,)
        ).fetchone()
        if not row:
            return None
        return Scenario(
            id=row[0], title=row[1], description=row[2], tone_instructions=row[3],
            opening_narrative=row[4], language=row[5], lore_text=row[6],
            created_at=row[7],
            user_id=row[8] if len(row) > 8 else None,
            is_public=bool(row[9]) if len(row) > 9 else True,
        )

    def list_scenarios(self, user_id: str | None = None) -> "list[Scenario]":
        if user_id:
            rows = self._conn.execute(
                "SELECT * FROM scenarios WHERE user_id=? ORDER BY created_at DESC",
                (user_id,),
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM scenarios ORDER BY created_at DESC"
            ).fetchall()
        scenarios = []
        for r in rows:
            scenarios.append(Scenario(
                id=r[0], title=r[1], description=r[2], tone_instructions=r[3],
                opening_narrative=r[4], language=r[5], lore_text=r[6],
                created_at=r[7],
                user_id=r[8] if len(r) > 8 else None,
                is_public=bool(r[9]) if len(r) > 9 else True,
            ))
        return scenarios

    def add_story_card(
        self,
        scenario_id: str,
        card_type: StoryCardType,
        name: str,
        content: dict,
    ) -> StoryCard:
        card = StoryCard(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            card_type=card_type,
            name=name,
            content=content,
            created_at=datetime.utcnow().isoformat(),
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO story_cards VALUES (?,?,?,?,?,?)",
                (card.id, card.scenario_id, card.card_type.value,
                 card.name, json.dumps(card.content), card.created_at),
            )
            self._conn.commit()
        return card

    def get_story_cards(self, scenario_id: str) -> "list[StoryCard]":
        rows = self._conn.execute(
            "SELECT * FROM story_cards WHERE scenario_id=? ORDER BY created_at ASC",
            (scenario_id,),
        ).fetchall()
        return [
            StoryCard(r[0], r[1], StoryCardType(r[2]), r[3], json.loads(r[4]), r[5])
            for r in rows
        ]

    def create_campaign(self, scenario_id: str, player_name: str, user_id: str | None = None) -> Campaign:
        campaign = Campaign(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            player_name=player_name,
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO campaigns VALUES (?,?,?,?,?)",
                (campaign.id, campaign.scenario_id, campaign.player_name, campaign.created_at, campaign.user_id),
            )
            self._conn.commit()
        return campaign

    def get_campaigns(self, scenario_id: str) -> "list[Campaign]":
        rows = self._conn.execute(
            "SELECT * FROM campaigns WHERE scenario_id=? ORDER BY created_at DESC",
            (scenario_id,),
        ).fetchall()
        return [
            Campaign(
                id=r[0], scenario_id=r[1], player_name=r[2], created_at=r[3],
                user_id=r[4] if len(r) > 4 else None,
            )
            for r in rows
        ]

    def get_campaign(self, campaign_id: str) -> "Campaign | None":
        """Get a single campaign by id."""
        row = self._conn.execute(
            "SELECT * FROM campaigns WHERE id=?", (campaign_id,)
        ).fetchone()
        if not row:
            return None
        return Campaign(
            id=row[0], scenario_id=row[1], player_name=row[2], created_at=row[3],
            user_id=row[4] if len(row) > 4 else None,
        )

    def get_user_campaigns(self, user_id: str) -> "list[Campaign]":
        """Get all campaigns belonging to a user."""
        rows = self._conn.execute(
            "SELECT * FROM campaigns WHERE user_id=? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
        return [
            Campaign(
                id=r[0], scenario_id=r[1], player_name=r[2], created_at=r[3],
                user_id=r[4] if len(r) > 4 else None,
            )
            for r in rows
        ]

    def delete_campaign(self, campaign_id: str) -> bool:
        """Delete a campaign by id. Returns True if a row was deleted."""
        with self._lock:
            cursor = self._conn.execute(
                "DELETE FROM campaigns WHERE id=?", (campaign_id,)
            )
            self._conn.commit()
            return cursor.rowcount > 0

    def delete_scenario(self, scenario_id: str) -> bool:
        """Delete a scenario and all its story cards and campaigns."""
        with self._lock:
            self._conn.execute(
                "DELETE FROM story_cards WHERE scenario_id=?", (scenario_id,)
            )
            self._conn.execute(
                "DELETE FROM campaigns WHERE scenario_id=?", (scenario_id,)
            )
            cursor = self._conn.execute(
                "DELETE FROM scenarios WHERE id=?", (scenario_id,)
            )
            self._conn.commit()
            return cursor.rowcount > 0

    def close(self):
        self._conn.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
