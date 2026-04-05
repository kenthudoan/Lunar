"""
Power System Engine — handles realm/tier resolution and combat comparison.

Provides:
- PowerSystemResolver: resolves NPC power from realm+tier strings
- Combat power comparison using realm order + tier index
- Fallback AI reasoning when no power_system is defined
- Multi-axis adapter: bridges old Realm/Tier API with new PowerSystemConfig
"""

from __future__ import annotations

import logging

from app.db.scenario_store import (
    PowerSystem, Realm, Tier,
    _build_default_systems,
)
from app.engines.power_system_models import (
    PowerSystemConfig,
    PowerAxis,
)
from app.engines.progression_engine import ProgressionEngine as _PE

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Fallback systems for when no power_system is defined
# ---------------------------------------------------------------------------

_FALLBACK_SYSTEMS: list[PowerSystem] | None = None


def _get_fallback_systems() -> list[PowerSystem]:
    global _FALLBACK_SYSTEMS
    if _FALLBACK_SYSTEMS is None:
        _FALLBACK_SYSTEMS = _build_default_systems()
    return _FALLBACK_SYSTEMS


# ---------------------------------------------------------------------------
# Resolver
# ---------------------------------------------------------------------------

class PowerSystemResolver:
    """
    Resolves NPC realm+tier into a comparable numeric value.
    Also generates realm+tier suggestions for the AI when creating NPCs.

    Supports TWO modes:
    - Legacy (Realm/Tier): when initialized with a db-backed PowerSystem
    - Multi-axis (PowerSystemConfig): when initialized with the new config model
    """

    def __init__(
        self,
        power_system: PowerSystem | PowerSystemConfig | None = None,
    ):
        self._legacy_system: PowerSystem | None = None
        self._config: PowerSystemConfig | None = None
        self._pe: _PE | None = None

        # Detect which model we're working with
        if power_system is None:
            pass
        elif isinstance(power_system, PowerSystemConfig):
            self._config = power_system
            self._pe = _PE(power_system)
        elif isinstance(power_system, PowerSystem):
            self._legacy_system = power_system

        self._realm_map: dict[str, Realm] = {}
        self._tier_map: dict[str, Tier] = {}
        if self._legacy_system:
            for realm in self._legacy_system.realms:
                self._realm_map[realm.slug] = realm
                for tier in realm.tiers:
                    self._tier_map[f"{realm.slug}::{tier.slug}"] = tier

    # ------------------------------------------------------------------
    # New: multi-axis config access
    # ------------------------------------------------------------------

    @property
    def config(self) -> PowerSystemConfig | None:
        """Return the multi-axis config if using the new model."""
        return self._config

    @property
    def progression_engine(self) -> _PE | None:
        """Return the ProgressionEngine for multi-axis calculations."""
        return self._pe

    def using_new_model(self) -> bool:
        """True when operating with a PowerSystemConfig (multi-axis)."""
        return self._config is not None

    @property
    def system(self) -> PowerSystem | None:
        return self._legacy_system

    @property
    def realms(self) -> list[Realm]:
        return self._legacy_system.realms if self._legacy_system else []

    def get_realm(self, realm_slug: str) -> Realm | None:
        return self._realm_map.get(realm_slug)

    def get_tier(self, realm_slug: str, tier_slug: str) -> Tier | None:
        return self._tier_map.get(f"{realm_slug}::{tier_slug}")

    # ------------------------------------------------------------------
    # New: multi-axis axis accessor
    # ------------------------------------------------------------------

    def get_visible_axes(self) -> list[PowerAxis]:
        """Return visible axes (multi-axis mode only)."""
        if self._pe:
            return self._pe.get_visible_axes()
        return []

    def get_axis(self, axis_id: str) -> PowerAxis | None:
        """Return a specific axis by id (multi-axis mode only)."""
        if self._pe:
            return self._pe.get_axis(axis_id)
        return None

    def raw_to_display(self, axis_id: str, raw_value: int) -> str:
        """Convert raw value to display string (multi-axis mode)."""
        if self._pe:
            return self._pe.raw_to_display(axis_id, raw_value)
        return str(raw_value)

    def compare_cross_axis(
        self,
        progressions_a: dict[str, int],
        progressions_b: dict[str, int],
    ) -> float:
        """Cross-axis weighted comparison (multi-axis mode)."""
        if self._pe:
            return self._pe.compare_cross_axis(progressions_a, progressions_b)
        return 0.0

    def resolve_power_score(
        self,
        realm_slug: str,
        tier_slug: str,
        raw_value: int | None = None,
        sub_tier: int = 2,
        power_level: int = 5,
    ) -> float:
        """
        Convert realm+tier to a single comparable score (0-10 scale approximation).
        Higher = more powerful.

        sub_tier: 1 (Sơ Kỳ/Early), 2 (Trung Kỳ/Mid), 3 (Hậu Kỳ/Late).
        Within the same rank, higher sub_tier = higher power bonus.

        When a power system is defined, uses the rank's power_value + sub_tier bonus.
        power_level: unused when rank is found; used only as emergency fallback base (1-10).
        """
        # Multi-axis: raw_value passed directly
        if raw_value is not None and self._pe:
            return self._pe.raw_to_normalized(realm_slug, raw_value)

        # Legacy realm/tier lookup
        realm = self.get_realm(realm_slug)
        if not realm:
            base = max(0.0, min(9.9, float(power_level)))
            sub_bonus = (max(1, min(3, sub_tier)) - 1) / 2.0 * 0.9
            return max(0.1, min(9.9, base + sub_bonus))

        tier = self.get_tier(realm_slug, tier_slug)
        if not tier:
            base = max(0.0, min(9.9, float(power_level)))
            sub_bonus = (max(1, min(3, sub_tier)) - 1) / 2.0 * 0.9
            return max(0.1, min(9.9, base + sub_bonus))

        max_tier_index = max(t.tier.index for t in realm.tiers) if realm.tiers else 1
        tier_norm = tier.index / max(max_tier_index, 1)

        max_realm_order = max(r.order for r in self.realms) if self.realms else 1
        realm_norm = (realm.order - 1) / max(max_realm_order - 1, 1)

        combined = realm_norm * 0.7 + tier_norm * 0.3
        return max(0.1, min(9.9, combined * 9.8 + 0.1))

    def compare(
        self,
        realm_a: str,
        tier_a: str,
        realm_b: str,
        tier_b: str,
        raw_a: int | None = None,
        raw_b: int | None = None,
        sub_tier_a: int = 2,
        sub_tier_b: int = 2,
        power_a: int = 5,
        power_b: int = 5,
    ) -> int:
        """
        Compare two realm+tier pairs.
        Returns: -1 (a < b), 0 (equal), 1 (a > b)

        In multi-axis mode (when raw_a/raw_b provided), uses cross-axis comparison.
        sub_tier_a/b: within-rank progression (1=Sơ Kỳ, 2=Trung Kỳ, 3=Hậu Kỳ).
        """
        # Multi-axis: use raw values directly
        if raw_a is not None and raw_b is not None and self._pe:
            diff = self._pe.compare_cross_axis(
                {realm_a: raw_a},  # axis_id → raw_value
                {realm_b: raw_b},
            )
            if diff < -0.5:
                return -1
            if diff > 0.5:
                return 1
            return 0

        # Legacy realm+tier with sub_tier consideration
        score_a = self.resolve_power_score(realm_a, tier_a, sub_tier=sub_tier_a, power_level=power_a)
        score_b = self.resolve_power_score(realm_b, tier_b, sub_tier=sub_tier_b, power_level=power_b)
        diff = score_a - score_b
        if diff < -0.1:
            return -1
        elif diff > 0.1:
            return 1
        return 0

    def get_available_realms(self, max_realm_order: int | None = None) -> list[Realm]:
        """Return realms available at or below a given order (for story progression)."""
        realms = self.realms
        if max_realm_order is not None:
            realms = [r for r in realms if r.order <= max_realm_order]
        return sorted(realms, key=lambda r: r.order)

    def get_tiers_up_to(self, realm_slug: str, max_index: int) -> list[Tier]:
        """Return tiers at or below a given index in a realm."""
        realm = self.get_realm(realm_slug)
        if not realm:
            return []
        return sorted([t for t in realm.tiers if t.index <= max_index], key=lambda t: t.index)

    # ------------------------------------------------------------------
    # AI Prompt builders
    # ------------------------------------------------------------------

    def build_realm_context_for_ai(self) -> str:
        """Build a human-readable prompt section describing all realms and tiers."""
        # Multi-axis mode
        if self._config and self._pe:
            lines = [f"\nPOWER SYSTEM: {self._config.power_system_name}\n"]
            for ax in self._pe.get_visible_axes():
                stage_parts = []
                for s in ax.stages:
                    if s.sub_stages:
                        sub_disp = ", ".join(ss.name for ss in s.sub_stages)
                        stage_parts.append(f"{s.name} [{sub_disp}]")
                    else:
                        stage_parts.append(s.name)
                lines.append(f"  Axis '{ax.axis_name}' ({ax.axis_id}): {', '.join(stage_parts)}")
            return "\n".join(lines)

        # Legacy Realm/Tier mode
        if not self._legacy_system or not self.realms:
            return ""
        lines = [f"\nPOWER SYSTEM: {self._legacy_system.name}\n"]
        for realm in sorted(self.realms, key=lambda r: r.order):
            tiers_str = ", ".join(t.name for t in sorted(realm.tiers, key=lambda t: t.index))
            lines.append(f"  - {realm.name} (order: {realm.order}): {tiers_str}")
        return "\n".join(lines)

    def build_npc_tier_hint_for_ai(
        self,
        max_realm_order: int | None = None,
        max_tier_index: int | None = None,
        max_axis_stage: int | None = None,
        all_axes: bool = False,
    ) -> str:
        """
        Build a hint for the AI on which realm+tier to assign to a new NPC.
        Respects story progression by limiting to lower realms/tiers early on.

        Args:
            max_realm_order: limit to realms up to this order (legacy mode)
            max_tier_index: limit to tiers up to this index (legacy mode)
            max_axis_stage: limit to stages up to this index (multi-axis mode)
            all_axes: if True, include ALL axes (multi-axis mode); otherwise only primary
        """
        # Multi-axis mode
        if self._config and self._pe:
            visible = self._pe.get_visible_axes()
            if not visible:
                return ""
            lines = []
            for ax in visible:
                if ax.axis_id == "phap_khi":
                    continue  # skip AI-only internal axes
                stage_labels = []
                limit = (max_axis_stage + 1) if max_axis_stage is not None else len(ax.stages)
                for i, stage in enumerate(ax.stages[:limit]):
                    if stage.sub_stages:
                        stage_labels.append(f"{stage.name} Sơ/Trung/Hậu")
                    else:
                        stage_labels.append(stage.name)
                primary_tag = " (primary)" if ax.is_primary else ""
                lines.append(
                    f"Axis '{ax.axis_name}' ({ax.axis_id}){primary_tag}: "
                    f"{', '.join(stage_labels)}"
                )
            return "\n" + "\n".join(lines)

        # Legacy Realm/Tier mode
        if not self._legacy_system or not self.realms:
            return ""

        # If no limits, allow any tier
        if max_realm_order is None and max_tier_index is None:
            realm_hint = ", ".join(r.name for r in sorted(self.realms, key=lambda r: r.order))
            return (
                f"\nUse ONLY these realms from the power system: [{realm_hint}].\n"
                f"Each realm has multiple tiers — pick the one most fitting for this NPC."
            )

        # Limit by progression
        available_realms = self.get_available_realms(max_realm_order)
        if not available_realms:
            available_realms = self.realms[:1]

        realm_list = ", ".join(r.name for r in available_realms)
        tier_hint = ""
        if max_tier_index is not None:
            tier_examples = []
            for realm in available_realms:
                low_tiers = realm.tiers[:max_tier_index + 1]
                if low_tiers:
                    tier_examples.append(f"{realm.name}: {low_tiers[0].name}")
                    if len(low_tiers) > 1:
                        tier_examples.append(f"{realm.name}: {low_tiers[-1].name}")
            if tier_examples:
                tier_hint = f"\nPrefer lower tiers. Examples: {', '.join(tier_examples[:6])}"

        return (
            f"\nUse ONLY these realms: [{realm_list}].\n"
            f"Pick a tier appropriate for this NPC's role and the story's current state.{tier_hint}"
        )

    def describe_for_combat(self, realm_slug: str, tier_slug: str, raw_value: int | None = None, sub_tier: int = 2) -> str:
        """
        Human-readable description of a realm+tier for combat prompts.
        In multi-axis mode (raw_value provided), uses the new display format.
        sub_tier: 1=Sơ Kỳ/Early, 2=Trung Kỳ/Mid, 3=Hậu Kỳ/Late.
        """
        # Multi-axis: use raw_to_display
        if raw_value is not None and self._pe:
            return self._pe.raw_to_display(realm_slug, raw_value)

        # Legacy realm/tier lookup by slug
        realm = self.get_realm(realm_slug)
        tier = self.get_tier(realm_slug, tier_slug)
        if not realm or not tier:
            # Show sub_tier when realm/tier not found in system
            if realm_slug:
                _sub_labels = {1: "Sơ Kỳ", 2: "Trung Kỳ", 3: "Hậu Kỳ"}
                label = _sub_labels.get(max(1, min(3, sub_tier)), "")
                return f"{realm_slug} {label}".strip()
            return tier_slug or realm_slug or "Unknown"
        return f"{tier.name} ({realm.name})"

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Serialize to dict for API responses. Supports both legacy and multi-axis formats."""
        # Multi-axis mode
        if self._config:
            from app.engines.power_system_models import axis_to_dict
            return {
                "id": self._config.id,
                "name": self._config.power_system_name,
                "is_locked": self._config.is_locked,
                "mode": "multi_axis",
                "axes": [axis_to_dict(ax) for ax in self._config.axes],
            }

        # Legacy Realm/Tier mode
        if not self._legacy_system:
            return {"id": None, "name": None, "realms": [], "mode": "legacy"}
        return {
            "id": self._legacy_system.id,
            "name": self._legacy_system.name,
            "is_locked": False,
            "mode": "legacy",
            "realms": [
                {
                    "slug": r.slug,
                    "name": r.name,
                    "order": r.order,
                    "description": r.description,
                    "tiers": [
                        {"slug": t.slug, "name": t.name, "index": t.index}
                        for t in r.tiers
                    ],
                }
                for r in self._legacy_system.realms
            ],
        }


# ---------------------------------------------------------------------------
# Fallback: build a custom system from AI reasoning when none defined
# ---------------------------------------------------------------------------

_FALLBACK_REASONING_PROMPTS = {
    "vi": (
        "Nếu kịch bản không định nghĩa hệ thống cấp bậc, hãy suy luận từ setting/tone "
        "và trả về một hệ thống cấp bậc PHÙ HỢP với thế giới này.\n"
        "Trả về JSON: {'realms': [{'slug': str, 'name': str, 'order': int, 'tiers': [{'slug': str, 'name': str, 'index': int}]}]}.\n"
        "Ví dụ tham khảo:\n"
        "- Sci-fi: realm 'cong_nghe' order=1, tiers: [tan_thu(0), ha_nhan(1), trung_nhan(2), cao_nhan(3), dai_su(4), quan_chu(5)]\n"
        "- Fantasy: realm 'vo_dao' order=1, tiers: [dan_thuong(0), chien_binh(1), phap_su(2), that_tu(3), thanh_nhan(4), than_linh(5)]\n"
        "Chỉ trả về JSON, không thêm giải thích."
    ),
    "en": (
        "If the scenario does not define a power system, infer one from the setting/tone "
        "and return a power system APPROPRIATE for this world.\n"
        "Return JSON: {'realms': [{'slug': str, 'name': str, 'order': int, 'tiers': [{'slug': str, 'name': str, 'index': int}]}]}.\n"
        "Reference examples:\n"
        "- Sci-fi: realm 'technology' order=1, tiers: [novice(0), junior(1), mid_level(2), senior(3), master(4), grandmaster(5)]\n"
        "- Fantasy: realm 'martial_arts' order=1, tiers: [commoner(0), warrior(1), mage(2), knight(3), saint(4), divine(5)]\n"
        "Only return JSON, no explanations."
    ),
}


def get_fallback_reasoning_prompt(language: str) -> str:
    return _FALLBACK_REASONING_PROMPTS.get(language, _FALLBACK_REASONING_PROMPTS["en"])
