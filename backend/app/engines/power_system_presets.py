"""
Baseline Power System Presets — developer-defined starting points for AI refinement.

AI NEVER generates from scratch. Every generation starts from a preset,
then customises based on the user's lore text.

Presets cover the genres most common in this app:
- tu_chan: Vietnamese Xianxia / cultivation (with Sơ/Trung/Hậu)
- detective: Investigation / mystery (named expertise tiers)
- modern: Urban / social (multi-axis: social, wealth, influence)

Each preset defines:
- suggested_axes: the default axes and their stages
- axis_type, stage_style: how to display progression
- default_display_mode: recommended UI style
- normalization_max: internal raw value ceiling
"""

from __future__ import annotations

from app.engines.power_system_models import (
    AxisType,
    StageStyle,
    SubStage,
    Stage,
    PowerAxis,
)


# ---------------------------------------------------------------------------
# Sub-stage helpers
# ---------------------------------------------------------------------------

def cultivation_subs() -> tuple[SubStage, SubStage, SubStage]:
    """Standard Sơ / Trung / Hậu Kỳ subdivision."""
    return (
        SubStage(key="so_ky",     name="Sơ Kỳ"),
        SubStage(key="trung_ky",  name="Trung Kỳ"),
        SubStage(key="hau_ky",    name="Hậu Kỳ"),
    )

def named_subs(count: int = 3) -> list[SubStage]:
    """Generic named sub-stages: Tier 1, Tier 2, ..."""
    return [SubStage(key=f"tier_{i}", name=f"Tier {i}") for i in range(1, count + 1)]


# ---------------------------------------------------------------------------
# Cultivation / Tu Chian preset
# ---------------------------------------------------------------------------

CULTIVATION_AXES: list[PowerAxis] = [
    # ── Primary: Tu Lực (Main Cultivation Path) ──────────────────────────
    PowerAxis(
        axis_id="tu_luc",
        axis_name="Tu Lực",
        axis_type=AxisType.CULTIVATION,
        is_primary=True,
        description="Sức mạnh tu luyện nội công — theo đuổi trần thượng và vĩnh hằng",
        stages=(
            Stage(slug="hap_khi",    name="Hấp Khí",      order=1, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="truc_co",    name="Trúc Cơ",       order=2, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="ket_dan",    name="Kết Đan",       order=3, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="nguyen_anh", name="Nguyên Anh",    order=4, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="hoa_than",   name="Hóa Thần",      order=5, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="luyen_hu",   name="Luyện Hư",      order=6, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="hop_the",    name="Hợp Thể",       order=7, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="dai_thua",   name="Đại Thừa",     order=8, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
        ),
        display_scale=10,
        normalization_max=100,
        visible=True,
        weight=1.0,
    ),
    # ── Secondary: Luyện Đan (Alchemy) ────────────────────────────────
    PowerAxis(
        axis_id="luyen_dan",
        axis_name="Luyện Đan",
        axis_type=AxisType.CULTIVATION,
        is_primary=False,
        description="Nghệ thuật luyện đan — biến linh thảo thành tinh hoa",
        stages=(
            Stage(slug="so_cap",      name="Sơ cấp",      order=1, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="trung_cap",   name="Trung cấp",   order=2, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="cao_cap",     name="Cao cấp",     order=3, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="dan_duoc_su", name="Đan Dược Sư", order=4, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="dan_thanh",   name="Đan Thánh",   order=5, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
        ),
        display_scale=10,
        normalization_max=80,
        visible=True,
        weight=0.7,
    ),
    # ── Secondary: Võ Đạo (Martial Arts — physical combat) ───────────
    PowerAxis(
        axis_id="vo_dao",
        axis_name="Võ Đạo",
        axis_type=AxisType.CULTIVATION,
        is_primary=False,
        description="Võ nghệ thân thể — cường thân, khai thể",
        stages=(
            Stage(slug="tan_thu",    name="Tân Thủ",    order=1, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="ha_nhan",    name="Hạ Nhân",    order=2, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="trung_nhan", name="Trung Nhân",  order=3, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="cao_nhan",   name="Cao Nhân",    order=4, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="dai_su",    name="Đại Sư",      order=5, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="quan_chu",   name="Quân Chủ",    order=6, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
        ),
        display_scale=10,
        normalization_max=80,
        visible=True,
        weight=0.6,
    ),
    # ── Internal: Pháp Khí (Artifact Refinement — AI only) ─────────────
    PowerAxis(
        axis_id="phap_khi",
        axis_name="Pháp Khí",
        axis_type=AxisType.CULTIVATION,
        is_primary=False,
        description="Nghệ thuật luyện chế pháp khí — bạn đồng minh hay vũ khí nguy hiểm",
        stages=(
            Stage(slug="so_nhap",      name="Sơ Nhập",          order=1, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="luyen_khi_su", name="Luyện Khí Sư",     order=2, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="dai_su",        name="Đại Sư",            order=3, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
            Stage(slug="ton_su",       name="Luyện Khí Tông Sư",order=4, stage_style=StageStyle.EARLY_MID_LATE,
                  sub_stages=cultivation_subs()),
        ),
        display_scale=10,
        normalization_max=80,
        visible=False,   # AI-only — player won't see this axis
        weight=0.4,
    ),
]


# ---------------------------------------------------------------------------
# Detective / Investigation preset
# ---------------------------------------------------------------------------

DETECTIVE_AXES: list[PowerAxis] = [
    # ── Primary: Investigation ─────────────────────────────────────────
    PowerAxis(
        axis_id="investigation",
        axis_name="Điều Tra",
        axis_type=AxisType.NAMED,
        is_primary=True,
        description="Kỹ năng phát hiện manh mối, suy luận, và lật mở bí ẩn",
        stages=(
            Stage(slug="novice",  name="Tân Binh",    order=1, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="junior",   name="Sơ Cấp",     order=2, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="senior",   name="Trung Cấp",  order=3, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="expert",   name="Cao Cấp",    order=4, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="master",   name="Bậc Thầy",   order=5, stage_style=StageStyle.NAMED_STEP),
        ),
        display_scale=10,
        normalization_max=100,
        visible=True,
        weight=1.0,
    ),
    # ── Secondary: Forensics / Evidence Analysis ────────────────────────
    PowerAxis(
        axis_id="forensics",
        axis_name="Khám Nghiệm",
        axis_type=AxisType.NUMERIC,
        is_primary=False,
        description="Phân tích dấu vết, hiện trường, và chứng cứ vật lý",
        stages=(
            Stage(slug="lvl1", name="1", order=1, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl2", name="2", order=2, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl3", name="3", order=3, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl4", name="4", order=4, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl5", name="5", order=5, stage_style=StageStyle.NUMERIC_STEP),
        ),
        display_scale=5,
        normalization_max=50,
        visible=True,
        weight=0.8,
    ),
    # ── Secondary: Connections / Network ────────────────────────────────
    PowerAxis(
        axis_id="connections",
        axis_name="Quan Hệ",
        axis_type=AxisType.NAMED,
        is_primary=False,
        description="Mạng lưới liên lạc, nguồn tin, và ảnh hưởng xã hội",
        stages=(
            Stage(slug="nobody",    name="Vô Danh",        order=1, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="known",     name="Có Tiếng",        order=2, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="connected",  name="Được Biết",       order=3, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="influential",name="Có Ảnh Hưởng",   order=4, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="kingmaker", name="Người Định Đoạt", order=5, stage_style=StageStyle.NAMED_STEP),
        ),
        display_scale=10,
        normalization_max=80,
        visible=True,
        weight=0.5,
    ),
]


# ---------------------------------------------------------------------------
# Modern / Urban preset
# ---------------------------------------------------------------------------

MODERN_AXES: list[PowerAxis] = [
    # ── Primary: Social Standing ────────────────────────────────────────
    PowerAxis(
        axis_id="social_rank",
        axis_name="Địa Vị Xã Hội",
        axis_type=AxisType.NAMED,
        is_primary=True,
        description="Vị trí trong cấu trúc xã hội — từ vô danh đến người nắm quyền",
        stages=(
            Stage(slug="anonymous",   name="Vô Danh",        order=1, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="known",        name="Có Tiếng",        order=2, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="influential",  name="Có Ảnh Hưởng",   order=3, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="powerful",     name="Quyền Lực",       order=4, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="dominant",     name="Thống Trị",        order=5, stage_style=StageStyle.NAMED_STEP),
        ),
        display_scale=10,
        normalization_max=100,
        visible=True,
        weight=1.0,
    ),
    # ── Secondary: Wealth ───────────────────────────────────────────────
    PowerAxis(
        axis_id="wealth",
        axis_name="Tài Chính",
        axis_type=AxisType.NUMERIC,
        is_primary=False,
        description="Tài sản, thu nhập, và khả năng chi trả",
        stages=(
            Stage(slug="lvl1", name="1", order=1, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl2", name="2", order=2, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl3", name="3", order=3, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl4", name="4", order=4, stage_style=StageStyle.NUMERIC_STEP),
            Stage(slug="lvl5", name="5", order=5, stage_style=StageStyle.NUMERIC_STEP),
        ),
        display_scale=10,
        normalization_max=80,
        visible=True,
        weight=0.8,
    ),
    # ── Secondary: Influence / Reputation ───────────────────────────────
    PowerAxis(
        axis_id="influence",
        axis_name="Ảnh Hưởng",
        axis_type=AxisType.NAMED,
        is_primary=False,
        description="Mức độ tác động lên người khác — từ thuyết phục đến cưỡng ép",
        stages=(
            Stage(slug="invisible", name="Vô Hình",        order=1, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="noticeable",name="Đáng Chú Ý",     order=2, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="significant",name="Đáng Kể",       order=3, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="major",     name="Trọng Yếu",      order=4, stage_style=StageStyle.NAMED_STEP),
            Stage(slug="dominant",  name="Chi Phối",        order=5, stage_style=StageStyle.NAMED_STEP),
        ),
        display_scale=10,
        normalization_max=80,
        visible=True,
        weight=0.6,
    ),
]


# ---------------------------------------------------------------------------
# Preset registry
# ---------------------------------------------------------------------------

BASELINE_PRESETS: dict[str, dict] = {
    # ── Tu Chân / Xianxia ──────────────────────────────────────────────
    "tu_chan": {
        "description": "Hệ thống tu luyện nội công cổ xưa. Có Sơ/Trung/Hậu Kỳ. Gồm Tu Lực, Luyện Đan, Võ Đạo.",
        "suggested_genres": ["tu_tien_co_dien", "ma_dao_ta_tu", "phe_vat_nghich_thien", "thuong_co_bi_canh"],
        "axes": CULTIVATION_AXES,
        "default_display_mode": "tiered",
    },

    # ── Detective / Mystery ─────────────────────────────────────────────
    "detective": {
        "description": "Thám tử / bí ẩn. Expertise theo cấp bậc có tên. Gồm Điều Tra, Khám Nghiệm, Quan Hệ.",
        "suggested_genres": [],
        "axes": DETECTIVE_AXES,
        "default_display_mode": "named",
    },

    # ── Modern / Urban ──────────────────────────────────────────────────
    "modern": {
        "description": "Hiện đại / đô thị. Multi-axis: Địa Vị, Tài Chính, Ảnh Hưởng.",
        "suggested_genres": [],
        "axes": MODERN_AXES,
        "default_display_mode": "multi_axis",
    },
}


# ---------------------------------------------------------------------------
# Preset lookup helpers
# ---------------------------------------------------------------------------

def get_preset(preset_key: str) -> dict | None:
    """Return a preset dict by key, or None."""
    return BASELINE_PRESETS.get(preset_key)


def get_preset_axes(preset_key: str) -> list[PowerAxis]:
    """Return the axes for a preset, or cultivation axes as fallback."""
    preset = get_preset(preset_key)
    if preset:
        return preset["axes"]
    return CULTIVATION_AXES


def guess_preset_from_genre(genre_id: str) -> str:
    """
    Map a ScenarioBuilder genre ID to a power system preset key.
    Called by the frontend when user picks a genre before power system generation.
    """
    TIEN_HIEP_GENRES = {
        "tu_tien_co_dien", "ma_dao_ta_tu", "phe_vat_nghich_thien",
        "thuong_co_bi_canh",
    }
    if genre_id in TIEN_HIEP_GENRES:
        return "tu_chan"
    if genre_id in {"detective", "mystery", "thriller"}:
        return "detective"
    if genre_id in {"modern", "urban", "contemporary", "slice_of_life", "romance", "urban_supernatural"}:
        return "modern"
    return "tu_chan"   # sensible default


def build_system_prompt_for_axis(ax: PowerAxis, language: str = "vi") -> str:
    """
    Build a natural-language description of an axis for AI prompts.
    Used by PlotGenerator when generating NPCs or world events.
    """
    stage_lines = []
    for stage in ax.stages:
        if stage.sub_stages:
            subs = " / ".join(ss.name for ss in stage.sub_stages)
            stage_lines.append(f"  - {stage.name} [{subs}]")
        else:
            stage_lines.append(f"  - {stage.name}")

    stage_text = "\n".join(stage_lines)
    return (
        f"Axis '{ax.axis_name}' ({ax.axis_id}):\n"
        f"{stage_text}\n"
        f"Display scale: {ax.display_scale}/10 | Weight: {ax.weight}"
    )


def build_full_preset_prompt(preset_key: str, language: str = "vi") -> str:
    """
    Build the full preset system prompt for AI generation.
    Includes all axes formatted as a numbered list for easy reading.
    """
    preset = get_preset(preset_key)
    if not preset:
        return ""

    lines = [
        f"POWER SYSTEM PRESET: {preset_key.upper()}",
        f"Description: {preset['description']}",
        "",
        "AXES:",
    ]
    for i, ax in enumerate(preset["axes"], 1):
        primary_tag = " [PRIMARY]" if ax.is_primary else ""
        visibility_tag = "" if ax.visible else " [INTERNAL/AI-ONLY]"
        lines.append(f"{i}. {ax.axis_name}{primary_tag}{visibility_tag}")
        lines.append(f"   {ax.description}")
        for stage in ax.stages:
            if stage.sub_stages:
                subs = " / ".join(ss.name for ss in stage.sub_stages)
                lines.append(f"   - {stage.name} [{subs}]")
            else:
                lines.append(f"   - {stage.name}")

    return "\n".join(lines)
