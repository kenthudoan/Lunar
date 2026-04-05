import sqlite3
import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from threading import Lock


# ----------------------------------------------------------------------
# Power System — Realm & Tier definitions
# ----------------------------------------------------------------------


@dataclass
class Tier:
    slug: str           # internal key, e.g. "luyen_khi"
    name: str           # human-readable, e.g. "Luyện Khí kỳ"
    index: int          # 0-based position within the realm


@dataclass
class Realm:
    slug: str           # internal key, e.g. "tu_chan"
    name: str           # human-readable, e.g. "Tu Chân"
    order: int          # 1 = lowest realm, higher = more powerful
    tiers: list[Tier] = field(default_factory=list)
    description: str = ""


@dataclass
class PowerSystem:
    id: str
    name: str
    realms: list[Realm]
    is_default: bool = False
    created_at: str = ""


# ---------------------------------------------------------------------------
# Default power systems shipped with the application
# ---------------------------------------------------------------------------

_DEFAULT_SYSTEMS: list[dict] = [
    {
        "id": "cultivation",
        "name": "Tu Chân (Cultivation)",
        "is_default": True,
        "realms": [
            {
                "slug": "tu_chan",
                "name": "Tu Chân",
                "order": 1,
                "description": "Hệ thống tu luyện nội công cổ xưa",
                "tiers": [
                    {"slug": "luyen_khi", "name": "Luyện Khí kỳ", "index": 0},
                    {"slug": "truc_co", "name": "Trúc Cơ kỳ", "index": 1},
                    {"slug": "ket_dan", "name": "Kết Đan kỳ", "index": 2},
                    {"slug": "nguyen_anh", "name": "Nguyên Anh kỳ", "index": 3},
                    {"slug": "hoa_than", "name": "Hóa Thần kỳ", "index": 4},
                    {"slug": "luyen_hu", "name": "Luyện Hư kỳ", "index": 5},
                    {"slug": "hop_the", "name": "Hợp Thể kỳ", "index": 6},
                    {"slug": "dai_thua", "name": "Đại Thừa kỳ", "index": 7},
                ],
            },
            {
                "slug": "luyen_dan",
                "name": "Luyện Đan",
                "order": 2,
                "description": "Hệ thống luyện đan dược phẩm",
                "tiers": [
                    {"slug": "so_cap", "name": "Sơ cấp", "index": 0},
                    {"slug": "trung_cap", "name": "Trung cấp", "index": 1},
                    {"slug": "cao_cap", "name": "Cao cấp", "index": 2},
                    {"slug": "dan_duoc_su", "name": "Đan Dược Sư", "index": 3},
                    {"slug": "dan_thanh", "name": "Đan Thánh", "index": 4},
                ],
            },
            {
                "slug": "phap_khi",
                "name": "Luyện Khí (Pháp Khí)",
                "order": 2,
                "description": "Hệ thống ngũ hành pháp khí",
                "tiers": [
                    {"slug": "so_nhap", "name": "Sơ nhập", "index": 0},
                    {"slug": "luyen_khi_su", "name": "Luyện Khí Sư", "index": 1},
                    {"slug": "dai_su", "name": "Đại Sư", "index": 2},
                    {"slug": "ton_su", "name": "Luyện Khí Tông Sư", "index": 3},
                ],
            },
            {
                "slug": "phu_luc",
                "name": "Phù Lục",
                "order": 3,
                "description": "Hệ thống phù chú linh thuật",
                "tiers": [
                    {"slug": "so_nhap", "name": "Sơ nhập", "index": 0},
                    {"slug": "phu_su", "name": "Phù Sư", "index": 1},
                    {"slug": "dai_su", "name": "Phù Lục Đại Sư", "index": 2},
                    {"slug": "ton_su", "name": "Phù Lục Tông Sư", "index": 3},
                ],
            },
            {
                "slug": "tran_phap",
                "name": "Trận Pháp",
                "order": 3,
                "description": "Hệ thống trận pháp cấm chế",
                "tiers": [
                    {"slug": "so_nhap", "name": "Sơ nhập", "index": 0},
                    {"slug": "tran_su", "name": "Trận Sư", "index": 1},
                    {"slug": "dai_su", "name": "Trận Pháp Đại Sư", "index": 2},
                    {"slug": "ton_su", "name": "Trận Pháp Tông Sư", "index": 3},
                ],
            },
        ],
    },
    {
        "id": "martial",
        "name": "Võ Đạo (Martial)",
        "is_default": True,
        "realms": [
            {
                "slug": "vo_cong",
                "name": "Võ Công",
                "order": 1,
                "description": "Hệ thống võ nghệ thân thể",
                "tiers": [
                    {"slug": "tan_thu", "name": "Tân Thủ", "index": 0},
                    {"slug": "ha_nhan", "name": "Hạ Nhân", "index": 1},
                    {"slug": "trung_nhan", "name": "Trung Nhân", "index": 2},
                    {"slug": "cao_nhan", "name": "Cao Nhân", "index": 3},
                    {"slug": "dai_su", "name": "Đại Sư", "index": 4},
                    {"slug": "quan_chu", "name": "Quân Chủ", "index": 5},
                ],
            },
            {
                "slug": "kiem_dao",
                "name": "Kiếm Đạo",
                "order": 2,
                "description": "Hệ thống kiếm pháp tinh anh",
                "tiers": [
                    {"slug": "kiem_si", "name": "Kiếm Sĩ", "index": 0},
                    {"slug": "kiem_quan", "name": "Kiếm Quân", "index": 1},
                    {"slug": "kiem_thanh", "name": "Kiếm Thánh", "index": 2},
                    {"slug": "kiem_tong", "name": "Kiếm Tông", "index": 3},
                ],
            },
        ],
    },
]


def _build_default_systems() -> list[PowerSystem]:
    """Parse _DEFAULT_SYSTEMS dict into PowerSystem dataclasses."""
    systems = []
    for sys_def in _DEFAULT_SYSTEMS:
        realms = []
        for r_def in sys_def.get("realms", []):
            tiers = [
                Tier(slug=t["slug"], name=t["name"], index=t["index"])
                for t in r_def.get("tiers", [])
            ]
            realms.append(Realm(
                slug=r_def["slug"],
                name=r_def["name"],
                order=r_def["order"],
                description=r_def.get("description", ""),
                tiers=tiers,
            ))
        systems.append(PowerSystem(
            id=sys_def["id"],
            name=sys_def["name"],
            realms=realms,
            is_default=sys_def.get("is_default", False),
            created_at=datetime.utcnow().isoformat(),
        ))
    return systems


# ---------------------------------------------------------------------------
# Story Card types
# ---------------------------------------------------------------------------


class StoryCardType(str, Enum):
    NPC = "NPC"
    LOCATION = "LOCATION"
    FACTION = "FACTION"
    RANK = "RANK"
    ITEM = "ITEM"
    LORE = "LORE"


@dataclass
class Scenario:
    id: str
    title: str
    description: str
    protagonist_name: str
    narrative_pov: str
    writing_style: str
    tone_instructions: str
    opening_narrative: str
    language: str
    lore_text: str
    created_at: str
    user_id: str | None = None
    is_public: bool = True
    power_system_id: str | None = None   # null = use default system


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
    power_system_snapshot: str = ""   # JSON snapshot cloned from scenario on campaign start


class ScenarioStore:
    SCHEMA_VERSION = 6

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
        3: [
            """ALTER TABLE scenarios ADD COLUMN power_system_id TEXT""",
            """CREATE TABLE IF NOT EXISTS power_systems (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                realms_json TEXT NOT NULL DEFAULT '[]',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )""",
        ],
        4: [
            """ALTER TABLE scenarios ADD COLUMN protagonist_name TEXT NOT NULL DEFAULT ''""",
            """ALTER TABLE scenarios ADD COLUMN narrative_pov TEXT NOT NULL DEFAULT 'first_person'""",
            """ALTER TABLE scenarios ADD COLUMN writing_style TEXT NOT NULL DEFAULT 'chinh_thong'""",
        ],
        5: [
            """ALTER TABLE campaigns ADD COLUMN power_system_snapshot TEXT NOT NULL DEFAULT ''""",
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

        # Python-level JSON data migrations (run after schema migrations)
        if current < 6:
            self._migrate_power_systems_json()

    def _migrate_power_systems_json(self):
        """Migrate power_systems realms_json and campaign snapshots from old
        {name,display} → new {slug,name} format."""
        with self._lock:
            rows = self._conn.execute("SELECT id, realms_json FROM power_systems").fetchall()
            for sys_id, realms_json in rows:
                try:
                    realms = json.loads(realms_json)
                    changed = False
                    for realm in realms:
                        if "name" in realm and "display" in realm:
                            realm["slug"] = realm.pop("name")
                            realm["name"] = realm.pop("display")
                            changed = True
                        if "tiers" in realm:
                            for tier in realm["tiers"]:
                                if "name" in tier and "display" in tier:
                                    tier["slug"] = tier.pop("name")
                                    tier["name"] = tier.pop("display")
                                    changed = True
                    if changed:
                        self._conn.execute(
                            "UPDATE power_systems SET realms_json=? WHERE id=?",
                            (json.dumps(realms, ensure_ascii=False), sys_id),
                        )
                except (json.JSONDecodeError, TypeError):
                    pass

            # Also migrate campaign snapshots
            camp_rows = self._conn.execute(
                "SELECT id, power_system_snapshot FROM campaigns WHERE power_system_snapshot != ''"
            ).fetchall()
            for camp_id, snapshot in camp_rows:
                if not snapshot or not snapshot.startswith("{"):
                    continue
                try:
                    data = json.loads(snapshot)
                    changed = False
                    if "realms" in data:
                        for realm in data["realms"]:
                            if "name" in realm and "display" in realm:
                                realm["slug"] = realm.pop("name")
                                realm["name"] = realm.pop("display")
                                changed = True
                            if "tiers" in realm:
                                for tier in realm["tiers"]:
                                    if "name" in tier and "display" in tier:
                                        tier["slug"] = tier.pop("name")
                                        tier["name"] = tier.pop("display")
                                        changed = True
                    if changed:
                        self._conn.execute(
                            "UPDATE campaigns SET power_system_snapshot=? WHERE id=?",
                            (json.dumps(data, ensure_ascii=False), camp_id),
                        )
                except (json.JSONDecodeError, TypeError):
                    pass

            self._conn.commit()

    def create_scenario(
        self,
        title: str,
        description: str = "",
        protagonist_name: str = "",
        narrative_pov: str = "first_person",
        writing_style: str = "chinh_thong",
        tone_instructions: str = "",
        opening_narrative: str = "",
        language: str = "en",
        lore_text: str = "",
        user_id: str | None = None,
        power_system_id: str | None = None,
    ) -> Scenario:
        scenario = Scenario(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            protagonist_name=protagonist_name,
            narrative_pov=narrative_pov,
            writing_style=writing_style,
            tone_instructions=tone_instructions,
            opening_narrative=opening_narrative,
            language=language,
            lore_text=lore_text,
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
            is_public=True,
            power_system_id=power_system_id,
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO scenarios VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (scenario.id, scenario.title, scenario.description,
                 scenario.tone_instructions, scenario.opening_narrative,
                 scenario.language, scenario.lore_text, scenario.created_at,
                 scenario.user_id, int(scenario.is_public),
                 scenario.power_system_id, scenario.protagonist_name,
                 scenario.narrative_pov, scenario.writing_style),
            )
            self._conn.commit()
        return scenario

    def _row_to_scenario(self, row: tuple) -> Scenario:
        """Convert a scenarios table row (from SELECT *) to a Scenario dataclass.
        Uses column names to avoid breakage when migrations change column order."""
        cols = [d[1] for d in self._conn.execute("PRAGMA table_info(scenarios)").fetchall()]
        r = dict(zip(cols, row))
        return Scenario(
            id=r["id"],
            title=r.get("title", ""),
            description=r.get("description", ""),
            protagonist_name=r.get("protagonist_name", ""),
            narrative_pov=r.get("narrative_pov", "first_person"),
            writing_style=r.get("writing_style", "chinh_thong"),
            tone_instructions=r.get("tone_instructions", ""),
            opening_narrative=r.get("opening_narrative", ""),
            language=r.get("language", "en"),
            lore_text=r.get("lore_text", ""),
            created_at=r.get("created_at", ""),
            user_id=r.get("user_id"),
            is_public=bool(r.get("is_public", True)),
            power_system_id=r.get("power_system_id"),
        )

    def get_scenario(self, scenario_id: str) -> "Scenario | None":
        row = self._conn.execute(
            "SELECT * FROM scenarios WHERE id=?", (scenario_id,)
        ).fetchone()
        if not row:
            return None
        return self._row_to_scenario(row)

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
        return [self._row_to_scenario(r) for r in rows]

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

    def update_story_card(
        self,
        card_id: str,
        name: str | None = None,
        content: dict | None = None,
    ) -> "StoryCard | None":
        """Update a story card. Returns the updated card, or None if not found."""
        row = self._conn.execute("SELECT * FROM story_cards WHERE id=?", (card_id,)).fetchone()
        if not row:
            return None
        updated_name = name if name is not None else row[3]
        updated_content = json.loads(row[4]) if content is None else content
        with self._lock:
            self._conn.execute(
                "UPDATE story_cards SET name=?, content=? WHERE id=?",
                (updated_name, json.dumps(updated_content), card_id),
            )
            self._conn.commit()
        return StoryCard(row[0], row[1], StoryCardType(row[2]), updated_name, updated_content, row[5])

    def delete_story_card(self, card_id: str) -> bool:
        """Delete a story card. Returns True if a row was deleted."""
        with self._lock:
            cursor = self._conn.execute("DELETE FROM story_cards WHERE id=?", (card_id,))
            self._conn.commit()
            return cursor.rowcount > 0

    def create_campaign(
        self,
        scenario_id: str,
        player_name: str,
        user_id: str | None = None,
        power_system_snapshot: str = "",
    ) -> Campaign:
        campaign = Campaign(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            player_name=player_name,
            created_at=datetime.utcnow().isoformat(),
            user_id=user_id,
            power_system_snapshot=power_system_snapshot,
        )
        with self._lock:
            self._conn.execute(
                "INSERT INTO campaigns VALUES (?,?,?,?,?,?)",
                (campaign.id, campaign.scenario_id, campaign.player_name,
                 campaign.created_at, campaign.user_id, campaign.power_system_snapshot),
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
                power_system_snapshot=r[5] if len(r) > 5 else "",
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
            power_system_snapshot=row[5] if len(row) > 5 else "",
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
                power_system_snapshot=r[5] if len(r) > 5 else "",
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

    def update_scenario(
        self,
        scenario_id: str,
        title: str | None = None,
        description: str | None = None,
        protagonist_name: str | None = None,
        narrative_pov: str | None = None,
        writing_style: str | None = None,
        tone_instructions: str | None = None,
        opening_narrative: str | None = None,
        language: str | None = None,
        lore_text: str | None = None,
        power_system_id: str | None = None,
    ) -> "Scenario | None":
        """
        Update an existing scenario. Only non-None fields are updated.
        Returns the updated Scenario, or None if not found.
        """
        existing = self.get_scenario(scenario_id)
        if not existing:
            return None
        updated = Scenario(
            id=existing.id,
            title=title if title is not None else existing.title,
            description=description if description is not None else existing.description,
            protagonist_name=protagonist_name if protagonist_name is not None else existing.protagonist_name,
            narrative_pov=narrative_pov if narrative_pov is not None else existing.narrative_pov,
            writing_style=writing_style if writing_style is not None else existing.writing_style,
            tone_instructions=tone_instructions if tone_instructions is not None else existing.tone_instructions,
            opening_narrative=opening_narrative if opening_narrative is not None else existing.opening_narrative,
            language=language if language is not None else existing.language,
            lore_text=lore_text if lore_text is not None else existing.lore_text,
            created_at=existing.created_at,
            user_id=existing.user_id,
            is_public=existing.is_public,
            power_system_id=power_system_id if power_system_id is not None else existing.power_system_id,
        )
        with self._lock:
            self._conn.execute(
                """UPDATE scenarios SET
                    title=?, description=?, protagonist_name=?, narrative_pov=?,
                    writing_style=?, tone_instructions=?,
                    opening_narrative=?, language=?, lore_text=?,
                    power_system_id=?
                   WHERE id=?""",
                (updated.title, updated.description,
                 updated.protagonist_name, updated.narrative_pov,
                 updated.writing_style, updated.tone_instructions,
                 updated.opening_narrative, updated.language,
                 updated.lore_text, updated.power_system_id, updated.id),
            )
            self._conn.commit()
        return updated

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

    # ------------------------------------------------------------------
    # Power System CRUD
    # ------------------------------------------------------------------

    def _seed_default_power_systems(self):
        """Seed default power systems on first run."""
        for sys_def in _DEFAULT_SYSTEMS:
            existing = self._conn.execute(
                "SELECT id FROM power_systems WHERE id=?", (sys_def["id"],)
            ).fetchone()
            if existing:
                continue
            realms_json = json.dumps(sys_def.get("realms", []))
            self._conn.execute(
                "INSERT INTO power_systems VALUES (?,?,?,?,?)",
                (sys_def["id"], sys_def["name"], realms_json,
                 int(sys_def.get("is_default", False)),
                 datetime.utcnow().isoformat()),
            )
        self._conn.commit()

    def get_power_systems(self) -> list[PowerSystem]:
        """Return all power systems including defaults."""
        self._seed_default_power_systems()
        rows = self._conn.execute(
            "SELECT id, name, realms_json, is_default, created_at FROM power_systems"
        ).fetchall()
        systems = []
        for r in rows:
            realms_data = json.loads(r[2])
            realms = []
            for rd in realms_data:
                tiers = [
                    Tier(slug=t["slug"], name=t["name"], index=t["index"])
                    for t in rd.get("tiers", [])
                ]
                realms.append(Realm(
                    slug=rd["slug"],
                    name=rd["name"],
                    order=rd["order"],
                    description=rd.get("description", ""),
                    tiers=tiers,
                ))
            systems.append(PowerSystem(
                id=r[0], name=r[1], realms=realms,
                is_default=bool(r[3]), created_at=r[4],
            ))
        return systems

    def get_power_system(self, system_id: str) -> "PowerSystem | None":
        """Return a specific power system by id. Falls back to first default."""
        self._seed_default_power_systems()
        row = self._conn.execute(
            "SELECT id, name, realms_json, is_default, created_at FROM power_systems WHERE id=?",
            (system_id,),
        ).fetchone()
        if not row:
            return None
        realms_data = json.loads(row[2])
        realms = []
        for rd in realms_data:
            tiers = [
                Tier(slug=t["slug"], name=t["name"], index=t["index"])
                for t in rd.get("tiers", [])
            ]
            realms.append(Realm(
                slug=rd["slug"],
                name=rd["name"],
                order=rd["order"],
                description=rd.get("description", ""),
                tiers=tiers,
            ))
        return PowerSystem(
            id=row[0], name=row[1], realms=realms,
            is_default=bool(row[3]), created_at=row[4],
        )

    def get_default_power_system(self) -> "PowerSystem | None":
        """Return the first default power system, or None."""
        systems = self.get_power_systems()
        defaults = [s for s in systems if s.is_default]
        return defaults[0] if defaults else (systems[0] if systems else None)

    def create_power_system(self, name: str, realms: list[dict]) -> PowerSystem:
        """Create a custom power system. Persisted as is_default=False.
        Input realms dicts use {slug, name, ...} for tier/realm keys."""
        system_id = str(uuid.uuid4())
        # Normalize: support legacy {name,display} and new {slug,name} input
        normalized_realms = []
        for rd in realms:
            normalized_tiers = []
            for t in rd.get("tiers", []):
                if "name" in t and "display" in t:
                    normalized_tiers.append({"slug": t["name"], "name": t["display"], "index": t.get("index", 0)})
                elif "slug" in t and "name" in t:
                    normalized_tiers.append({"slug": t["slug"], "name": t["name"], "index": t.get("index", 0)})
                else:
                    normalized_tiers.append(t)
            if "slug" in rd and "name" in rd:
                normalized_realms.append({
                    "slug": rd["slug"], "name": rd["name"],
                    "order": rd["order"], "description": rd.get("description", ""),
                    "tiers": normalized_tiers,
                })
            elif "name" in rd and "display" in rd:
                normalized_realms.append({
                    "slug": rd["name"], "name": rd["display"],
                    "order": rd["order"], "description": rd.get("description", ""),
                    "tiers": normalized_tiers,
                })
            else:
                normalized_realms.append({**rd, "tiers": normalized_tiers})
        realms_json = json.dumps(normalized_realms)
        with self._lock:
            self._conn.execute(
                "INSERT INTO power_systems VALUES (?,?,?,?,?)",
                (system_id, name, realms_json, 0, datetime.utcnow().isoformat()),
            )
            self._conn.commit()
        realms_parsed = []
        for rd in normalized_realms:
            tiers = [
                Tier(slug=t["slug"], name=t["name"], index=t["index"])
                for t in rd.get("tiers", [])
            ]
            realms_parsed.append(Realm(
                slug=rd["slug"], name=rd["name"],
                order=rd["order"], description=rd.get("description", ""),
                tiers=tiers,
            ))
        return PowerSystem(
            id=system_id, name=name, realms=realms_parsed,
            is_default=False, created_at=datetime.utcnow().isoformat(),
        )

    def delete_power_system(self, system_id: str) -> bool:
        """Delete a custom (non-default) power system."""
        existing = self._conn.execute(
            "SELECT is_default FROM power_systems WHERE id=?", (system_id,)
        ).fetchone()
        if not existing or existing[0]:
            return False  # cannot delete default systems
        with self._lock:
            cursor = self._conn.execute(
                "DELETE FROM power_systems WHERE id=? AND is_default=0", (system_id,)
            )
            self._conn.commit()
            return cursor.rowcount > 0

    def get_campaign_snapshot(self, campaign_id: str) -> str:
        """Return the locked power system snapshot for a campaign."""
        row = self._conn.execute(
            "SELECT power_system_snapshot FROM campaigns WHERE id=?", (campaign_id,)
        ).fetchone()
        return row[0] if row else ""

    def save_campaign_snapshot(self, campaign_id: str, snapshot: str) -> bool:
        """Save the power system snapshot into a campaign (one-time on creation)."""
        with self._lock:
            cursor = self._conn.execute(
                "UPDATE campaigns SET power_system_snapshot=? WHERE id=? AND power_system_snapshot=''",
                (snapshot, campaign_id),
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
