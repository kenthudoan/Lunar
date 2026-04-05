"""
PowerSystemService — orchestrates power system generation, validation, and campaign cloning.

Responsibilities:
1. Generate power system draft entirely from user lore (AI, no presets)
2. Validate user-edited power system config
3. Clone finalized config into campaign snapshot (immutable)
4. Load campaign snapshot at runtime
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from app.db.scenario_store import ScenarioStore
from app.engines.llm_router import LLMRouter
from app.engines.power_system_models import (
    PowerSystemConfig,
    PowerSystemDraft,
    PowerAxis,
    dict_to_axis,
    axis_to_dict,
)
from app.utils.json_parsing import parse_json_dict

logger = logging.getLogger(__name__)


_SCRATCH_SYSTEM_PROMPT = {
    "vi": (
        "Bạn là một nhà thiết kế hệ thống game. Dựa vào LORE của người chơi, "
        "hãy SÁNG TẠO ra một HỆ THỐNG CẤP BẬC hoàn toàn mới, phù hợp nhất với thế giới đó.\n\n"
        "QUY TẮC — tuân thủ NGHIÊM NGẶT:\n"
        "1. KHÔNG dùng preset có sẵn. Tạo hệ thống MỚI hoàn toàn, lấy cảm hứng từ lore.\n"
        "2. Tên hệ thống (power_system_name) phải gợi bầu không khí thế giới.\n"
        "3. Mỗi axis đo lường một KHÍA CẠNH KHÁC NHAU của sức mạnh/trình độ trong thế giới này.\n"
        "   Gợi ý axes: sức mạnh chiến đấu, tài chính, địa vị xã hội, quan hệ, ảnh hưởng, ma thuật, kỹ năng chuyên môn...\n"
        "   KHÔNG tạo axis trùng lặp về bản chất.\n"
        "4. Số lượng axes: tùy lore — thường 3-7; thế giới phức tạp có thể 8-12+ trục khác nhau. "
        "Tránh trùng lặp; không có giới hạn cứng phía trên nếu lore cần nhiều khía cạnh.\n"
        "5. Số lượng stages: 4-8 stages mỗi axis.\n"
        "6. Stage style:\n"
        "   - 'early_mid_late': mỗi stage có 3 sub_stage (Sơ Kỳ, Trung Kỳ, Hậu Kỳ — hoặc tên tương đương).\n"
        "   - 'named_step': mỗi stage là một cấp bậc có tên riêng (ví dụ: Tân Thủ, Chiến Binh, Đại Sư).\n"
        "   - 'numeric_step': đơn giản là Tier 1, Tier 2...\n"
        "7. Đánh dấu đúng 1 axis là is_primary=true (trục quan trọng nhất).\n"
        "8. Trục visible=true: người chơi nhìn thấy. visible=false: AI-only (nội bộ).\n"
        "9. Weight: 1.0 = trục chính, 0.3-0.8 = trục phụ.\n"
        "10. Viết mô tả ngắn cho mỗi axis.\n\n"
        "Trả về CHỈ JSON (không markdown, không giải thích):\n"
        '{"power_system_name": str, "axes": [...]}'
        "\n\nLORE:\n"
    ),
    "en": (
        "You are a game system designer. Based on the user's LORE, "
        "CREATE a COMPLETELY NEW power system that fits this world perfectly.\n\n"
        "RULES — follow STRICTLY:\n"
        "1. Do NOT use any preset. Invent a BRAND NEW system inspired by the lore.\n"
        "2. The power_system_name should evoke the world's atmosphere.\n"
        "3. Each axis measures a DIFFERENT ASPECT of power/ability in this world.\n"
        "   Suggestions: combat prowess, wealth, social standing, connections, influence, "
        "magic, professional skill...\n"
        "   Do NOT create axes that are essentially the same thing.\n"
        "4. Number of axes: depends on lore — often 3-7; complex worlds may need 8-12+ distinct axes. "
        "Avoid redundancy; there is no hard cap if the world truly needs many dimensions.\n"
        "5. Number of stages: 4-8 stages per axis.\n"
        "6. Stage style:\n"
        "   - 'early_mid_late': each stage has 3 sub-stages (Early, Mid, Late — or equivalent names).\n"
        "   - 'named_step': each stage is a named tier (e.g. Novice, Warrior, Master).\n"
        "   - 'numeric_step': simply Tier 1, Tier 2...\n"
        "7. Mark exactly ONE axis as is_primary=true.\n"
        "8. visible=true: player-facing. visible=false: AI-only (internal).\n"
        "9. weight: 1.0 = primary axis, 0.3-0.8 = secondary axes.\n"
        "10. Write a short description for each axis.\n\n"
        "Return ONLY JSON (no markdown, no explanation):\n"
        '{"power_system_name": str, "axes": [...]}'
        "\n\nLORE:\n"
    ),
}


class PowerSystemService:
    """Service layer for power system lifecycle management."""

    def __init__(self, store: ScenarioStore, llm: LLMRouter):
        self._store = store
        self._llm = llm

    # ------------------------------------------------------------------
    # AI Generation (always from scratch — no presets)
    # ------------------------------------------------------------------

    async def generate_draft(
        self,
        lore_text: str,
        language: str = "vi",
        *,
        title: str = "",
        description: str = "",
        genre_id: str | None = None,
    ) -> PowerSystemDraft | None:
        """
        Generate a power system draft from lore OR from title+description+genre.
        AI invents everything — axes, stages, sub-stages — with no preset constraints.
        """
        # Build rich context: prefer lore_text, fall back to title+description+genre
        if lore_text and lore_text.strip():
            context = lore_text.strip()
        elif title or description:
            parts = []
            if title:
                parts.append(f"Tên thế giới: {title}")
            if description:
                parts.append(f"Mô tả thế giới: {description}")
            if genre_id:
                parts.append(f"Thể loại: {genre_id}")
            context = "\n".join(parts)
        else:
            logger.warning("Power system generation skipped: no lore, title, or description provided")
            return None

        lang_hint = ""
        if language and language != "en":
            from app.utils.lang import lang_name
            lang_hint = f" Write ALL display names in {lang_name(language)}."

        base_prompt = _SCRATCH_SYSTEM_PROMPT.get(language, _SCRATCH_SYSTEM_PROMPT["en"])
        # Inject lang_hint where the placeholder sits in the base prompt string
        prompt = base_prompt.replace("{lang_hint}", lang_hint)

        messages = [
            {"role": "system", "content": prompt},
            {"role": "user",   "content": context},
        ]

        try:
            raw = await self._llm.complete(messages=messages, max_tokens=4096)
        except Exception:
            logger.exception("Power system generation failed")
            return None

        if not raw or not raw.strip():
            logger.warning("Power system generation returned empty response from LLM")
            return None

        data = parse_json_dict(raw)
        if not data:
            logger.warning("Power system generation returned invalid JSON: %s", raw[:200] if raw else "EMPTY")
            return None

        return self._build_draft_from_dict(data)

    def _build_draft_from_dict(self, data: dict, genre_id: str | None = None) -> PowerSystemDraft | None:
        """Parse AI JSON output into a PowerSystemDraft."""
        try:
            axes_data = data.get("axes", [])
            if not axes_data:
                logger.warning("Power system generation produced no axes: %s", data)
                return None

            axes: list[PowerAxis] = []
            for ax_dict in axes_data:
                try:
                    ax = dict_to_axis(ax_dict)
                    axes.append(ax)
                except (KeyError, TypeError, ValueError) as e:
                    logger.warning("Skipping invalid axis: %s | raw: %s", e, ax_dict)
                    continue

            if not axes:
                logger.warning("All axes failed to parse from AI output: %s", data)
                return None

            # Ensure exactly one primary
            has_primary = any(a.is_primary for a in axes)
            if not has_primary:
                axes[0] = PowerAxis(
                    **{**axes[0].__dict__, "is_primary": True}
                )

            return PowerSystemDraft(
                power_system_name=data.get("power_system_name", "Power System"),
                axes=axes,
            )
        except Exception:
            logger.exception("Failed to build draft from AI output")
            return None

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def validate_config(self, config_dict: dict) -> tuple[bool, list[str]]:
        """
        Validate a power system config dict.
        Returns (is_valid, list_of_errors).
        """
        errors: list[str] = []

        axes_data = config_dict.get("axes", [])
        if not axes_data:
            errors.append("At least one axis is required.")
            return False, errors

        axis_ids_seen: set[str] = set()
        for i, ax in enumerate(axes_data):
            axis_id = ax.get("axis_id", "")
            if not axis_id:
                errors.append(f"Axis {i}: 'axis_id' is required.")
            elif axis_id in axis_ids_seen:
                errors.append(f"Duplicate axis_id: '{axis_id}'.")
            axis_ids_seen.add(axis_id)

            stages = ax.get("stages", [])
            if not stages:
                errors.append(f"Axis '{axis_id}': at least one stage is required.")
                continue

            stage_slugs_seen: set[str] = set()
            for j, st in enumerate(stages):
                # Resolve stage slug: new format {slug} → slug, legacy format {name} → name
                stage_slug = st.get("slug") or st.get("name", "")
                if not stage_slug:
                    errors.append(f"Axis '{axis_id}': stage {j} requires a 'slug' (or legacy 'name').")
                elif stage_slug in stage_slugs_seen:
                    errors.append(f"Axis '{axis_id}': duplicate stage slug '{stage_slug}'.")
                stage_slugs_seen.add(stage_slug)

            # Stage style validation
            style = st.get("stage_style", "none")
            sub_stages = st.get("sub_stages", [])
            if style == "early_mid_late" and len(sub_stages) != 3:
                errors.append(
                    f"Axis '{axis_id}', stage '{stage_slug}': "
                    f"'early_mid_late' style requires exactly 3 sub_stages."
                )

            # Scale validation
            display_scale = ax.get("display_scale", 10)
            norm_max = ax.get("normalization_max", 100)
            if display_scale <= 0:
                errors.append(f"Axis '{axis_id}': 'display_scale' must be > 0.")
            if norm_max < display_scale:
                errors.append(
                    f"Axis '{axis_id}': 'normalization_max' ({norm_max}) "
                    f"should be >= 'display_scale' ({display_scale})."
                )

        return len(errors) == 0, errors

    # ------------------------------------------------------------------
    # Config serialization
    # ------------------------------------------------------------------

    def draft_to_config(
        self,
        draft: PowerSystemDraft,
        scenario_id: str,
    ) -> PowerSystemConfig:
        """Convert a draft to an immutable config for storage."""
        return PowerSystemConfig(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            power_system_name=draft.power_system_name,
            axes=tuple(draft.axes),
            is_locked=False,
            created_at=datetime.utcnow().isoformat(),
        )

    def config_to_dict(self, config: PowerSystemConfig) -> dict:
        return config.to_dict()

    def dict_to_config(self, d: dict) -> PowerSystemConfig:
        return PowerSystemConfig.from_dict(d)

    # ------------------------------------------------------------------
    # Campaign snapshot management
    # ------------------------------------------------------------------

    def load_campaign_snapshot(self, campaign_id: str) -> PowerSystemConfig | None:
        """Load and parse the locked snapshot from a campaign."""
        snapshot_json = self._store.get_campaign_snapshot(campaign_id)
        if not snapshot_json:
            return None
        try:
            data = json.loads(snapshot_json)
            return self.dict_to_config(data)
        except (json.JSONDecodeError, KeyError):
            logger.warning("Failed to parse campaign snapshot for %s", campaign_id)
            return None

    def clone_to_campaign(
        self,
        campaign_id: str,
        config: PowerSystemConfig,
    ) -> bool:
        """
        Clone a finalized config into a campaign as an immutable snapshot.
        """
        locked = PowerSystemConfig(
            id=config.id,
            scenario_id=config.scenario_id,
            power_system_name=config.power_system_name,
            axes=config.axes,
            is_locked=True,
            created_at=config.created_at,
        )
        snapshot_json = json.dumps(locked.to_dict(), ensure_ascii=False)
        return self._store.save_campaign_snapshot(campaign_id, snapshot_json)
