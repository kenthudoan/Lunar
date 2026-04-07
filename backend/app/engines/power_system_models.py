"""
Power System Data Models — axis/rank progression framework.

Defines the canonical data structures for:
- PowerAxis: one progression dimension (e.g. "Tu Lực", "Tài Chính")
- Stage: one rank within an axis (e.g. "Trúc Cơ kỳ")
- SubStage: optional Sơ/Trung/Hậu Kỳ subdivision
- PowerSystemDraft: AI-generated result from PlotGenerator
- PowerSystemConfig: finalized & immutable config for a campaign
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from app.utils.slug import slugify


# ---------------------------------------------------------------------------
# Axis & Stage type enums
# ---------------------------------------------------------------------------

class AxisType(str, Enum):
    """What kind of progression model an axis uses."""
    CULTIVATION  = "cultivation"   # linear with optional sub-stages (Sơ/Trung/Hậu)
    NUMERIC      = "numeric"        # simple 1-N scale
    NAMED        = "named"          # Novice / Veteran / Master style
    MULTI_BRANCH = "multi_branch"  # branching paths (future)


class StageStyle(str, Enum):
    """How stages within an axis are displayed."""
    EARLY_MID_LATE = "early_mid_late"   # Sơ Kỳ / Trung Kỳ / Hậu Kỳ
    NUMERIC_STEP   = "numeric_step"     # Tier 1 / Tier 2 / Tier 3
    NAMED_STEP     = "named_step"       # Apprentice / Journeyman / Expert
    NONE           = "none"             # no sub-divisions


# ---------------------------------------------------------------------------
# Building blocks
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SubStage:
    """Optional sub-division of a Stage (e.g. Sơ Kỳ / Trung Kỳ / Hậu Kỳ)."""
    key: str      # internal: "so_ky", "trung_ky", "hau_ky"
    name: str     # shown to user: "Sơ Kỳ", "Trung Kỳ", "Hậu Kỳ"


@dataclass(frozen=True)
class Stage:
    """One rank within an axis (e.g. "Trúc Cơ kỳ")."""
    slug: str              # internal key: "truc_co"
    name: str              # human-readable: "Trúc Cơ kỳ"
    order: int             # 1 = lowest, higher = stronger
    stage_style: StageStyle = StageStyle.NONE
    sub_stages: tuple[SubStage, ...] = field(default_factory=tuple)
    weight: float = 1.0  # relative importance vs other stages in same axis
    description: str = ""  # flavour text for this specific stage


@dataclass(frozen=True)
class PowerAxis:
    """One progression dimension (e.g. "Tu Lực", "Tài Chính")."""
    axis_id: str           # unique within a system: "tu_luc", "tai_chinh"
    axis_name: str          # shown to user: "Tu Lực", "Tài Chính"
    axis_type: AxisType
    is_primary: bool      # the "main" progression axis for this system
    description: str = ""   # flavour text explaining what this axis measures
    stages: tuple[Stage, ...] = field(default_factory=tuple)
    display_scale: int = 10    # max value shown in UI (e.g. 10 for cultivation)
    normalization_max: int = 100  # internal raw value ceiling
    visible: bool = True       # player-facing vs internal AI-only
    weight: float = 1.0         # cross-axis weight for comparisons


# ---------------------------------------------------------------------------
# Serialisable dict shapes (used for JSON storage in SQLite)
# ---------------------------------------------------------------------------

def sub_stage_to_dict(s: SubStage) -> dict:
    return {"key": s.key, "name": s.name}


def stage_to_dict(s: Stage) -> dict:
    return {
        "slug": s.slug,
        "name": s.name,
        "order": s.order,
        "stage_style": s.stage_style.value,
        "sub_stages": [sub_stage_to_dict(ss) for ss in s.sub_stages],
        "weight": s.weight,
        "description": s.description,
    }


def axis_to_dict(a: PowerAxis) -> dict:
    return {
        "axis_id": a.axis_id,
        "axis_name": a.axis_name,
        "axis_type": a.axis_type.value,
        "is_primary": a.is_primary,
        "description": a.description,
        "stages": [stage_to_dict(s) for s in a.stages],
        "display_scale": a.display_scale,
        "normalization_max": a.normalization_max,
        "visible": a.visible,
        "weight": a.weight,
    }


def dict_to_sub_stage(d: dict | str) -> SubStage:
    if isinstance(d, str):
        return SubStage(key=slugify(d), name=d)
    return SubStage(key=d["key"], name=d["name"])


def dict_to_stage(d: dict | str) -> Stage:
    if isinstance(d, str):
        d = {"name": d, "order": 1, "stage_style": "none"}
    else:
        d = dict(d)

    # Resolve slug + name from any input format:
    # - new     {slug: "truc_co", name: "Trúc Cơ"}   → slug="truc_co", name="Trúc Cơ"
    # - string  "Trúc Cơ"                            → slug="truc_co", name="Trúc Cơ"
    slug = None
    name = None
    if "slug" in d and "name" in d:
        slug = str(d["slug"])
        name = str(d["name"])
    elif "name" in d:
        slug = slugify(str(d["name"]))
        name = str(d["name"])
    else:
        slug = "stage"
        name = "Stage"

    style_str = d.get("stage_style", "none")
    try:
        style = StageStyle(style_str)
    except ValueError:
        style = StageStyle.NONE
    sub_list = [dict_to_sub_stage(ss) for ss in d.get("sub_stages", [])]
    return Stage(
        slug=slug,
        name=name,
        order=d.get("order", 1),
        stage_style=style,
        sub_stages=tuple(sub_list),
        weight=d.get("weight", 1.0),
        description=d.get("description", ""),
    )


def dict_to_axis(d: dict | str) -> PowerAxis:
    if isinstance(d, str):
        d = {"axis_id": slugify(d), "axis_name": d, "axis_type": "cultivation",
             "is_primary": True, "stages": []}
    else:
        d = dict(d)
        if "axis_name" not in d and "name" in d:
            d["axis_name"] = str(d["name"]).strip()
        if "axis_id" not in d:
            label = d.get("axis_name") or d.get("name") or "axis"
            d["axis_id"] = slugify(str(label))
        if "axis_name" not in d:
            d["axis_name"] = d["axis_id"].replace("_", " ").strip() or "Axis"

    type_str = d.get("axis_type", "cultivation")
    try:
        at = AxisType(type_str)
    except ValueError:
        at = AxisType.CULTIVATION

    axis_stage_style = d.get("stage_style", "none")
    stage_raw = d.get("stages", [])
    stage_list: list[Stage] = []
    for i, s in enumerate(stage_raw):
        if isinstance(s, str):
            stage_list.append(dict_to_stage({
                "name": s,
                "order": i + 1,
                "stage_style": axis_stage_style,
            }))
        elif isinstance(s, dict):
            sd = dict(s)
            if sd.get("order") is None:
                sd["order"] = i + 1
            if (sd.get("stage_style") in (None, "none")) and axis_stage_style not in (None, "none"):
                sd["stage_style"] = axis_stage_style
            stage_list.append(dict_to_stage(sd))

    return PowerAxis(
        axis_id=d["axis_id"],
        axis_name=d["axis_name"],
        axis_type=at,
        is_primary=d.get("is_primary", False),
        description=d.get("description", ""),
        stages=tuple(stage_list),
        display_scale=d.get("display_scale", 10),
        normalization_max=d.get("normalization_max", 100),
        visible=d.get("visible", True),
        weight=d.get("weight", 1.0),
    )


# ---------------------------------------------------------------------------
# Top-level config objects
# ---------------------------------------------------------------------------

@dataclass
class PowerSystemDraft:
    """
    AI-generated power system before user finalisation.
    Produced by PlotGenerator.generate_power_system().
    """
    power_system_name: str
    axes: list[PowerAxis]

    def to_dict(self) -> dict:
        return {
            "power_system_name": self.power_system_name,
            "axes": [axis_to_dict(a) for a in self.axes],
        }

    @staticmethod
    def from_dict(d: dict) -> PowerSystemDraft:
        axes = [dict_to_axis(ax) for ax in d.get("axes", [])]
        return PowerSystemDraft(
            power_system_name=d.get("power_system_name", "Power System"),
            axes=axes,
        )

    def derive_rank_entities(self) -> list[dict]:
        """
        Derive flat rank entities from the primary axis stages.
        One entity per stage: name = stage.name, sub_tiers = sub_stage displays,
        power_value = stage.order. Parent chain is implicit in stage order.
        """
        primary = next((a for a in self.axes if a.is_primary), None)
        if not primary:
            return []

        ranks = []
        sorted_stages = sorted(primary.stages, key=lambda s: s.order)

        for i, stage in enumerate(sorted_stages):
            if stage.sub_stages:
                sub_tiers_str = ", ".join(ss.name for ss in stage.sub_stages)
            elif stage.stage_style == StageStyle.EARLY_MID_LATE:
                sub_tiers_str = "Sơ Kỳ, Trung Kỳ, Hậu Kỳ"
            elif stage.stage_style == StageStyle.NAMED_STEP:
                sub_tiers_str = stage.name
            else:
                sub_tiers_str = ""

            parent = sorted_stages[i - 1].name if i > 0 else ""

            ranks.append({
                "type": "rank",
                "slug": stage.slug,
                "name": stage.name,
                "description": f"{primary.axis_name} — {primary.description}".strip(),
                "sub_tiers": sub_tiers_str,
                "parent": parent,
                "power_value": stage.order,
            })

        return ranks


@dataclass
class PowerSystemConfig:
    """
    Finalised, immutable power system for a campaign.
    Stored in Campaign.power_system_snapshot after campaign start.
    """
    id: str
    scenario_id: str
    power_system_name: str
    axes: tuple[PowerAxis, ...]
    is_locked: bool = False
    created_at: str = ""

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "power_system_name": self.power_system_name,
            "axes": [axis_to_dict(a) for a in self.axes],
            "is_locked": self.is_locked,
            "created_at": self.created_at,
        }

    @staticmethod
    def from_dict(d: dict) -> PowerSystemConfig:
        axes = [dict_to_axis(ax) for ax in d.get("axes", [])]
        return PowerSystemConfig(
            id=d.get("id", ""),
            scenario_id=d.get("scenario_id", ""),
            power_system_name=d.get("power_system_name", "Power System"),
            axes=tuple(axes),
            is_locked=d.get("is_locked", False),
            created_at=d.get("created_at", ""),
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_default_sub_stages() -> tuple[SubStage, SubStage, SubStage]:
    """Sơ / Trung / Hậu Kỳ — the standard cultivation sub-division."""
    return (
        SubStage(key="so_ky",    name="Sơ Kỳ"),
        SubStage(key="trung_ky", name="Trung Kỳ"),
        SubStage(key="hau_ky",   name="Hậu Kỳ"),
    )


def stage_display_string(axis: PowerAxis, stage_idx: int, sub_key: str | None) -> str:
    """
    Build the human-readable display for a stage + optional sub-stage.
    E.g. "Trúc Cơ Trung Kỳ" or just "Trúc Cơ kỳ".
    """
    if stage_idx < 0 or stage_idx >= len(axis.stages):
        return "?"
    stage = axis.stages[stage_idx]
    if sub_key and stage.sub_stages:
        for ss in stage.sub_stages:
            if ss.key == sub_key:
                return f"{stage.name} {ss.name}"
    return stage.name
