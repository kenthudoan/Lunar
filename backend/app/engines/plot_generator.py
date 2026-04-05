from __future__ import annotations

import logging
from dataclasses import dataclass

from app.utils.json_parsing import parse_json_dict
from app.utils.lang import lang_name

logger = logging.getLogger(__name__)

_NONE_MARKERS = {"none", "null", "n/a", "skip", "\"none\"", "'none'"}


def _is_none_response(raw: str) -> bool:
    """Check if the LLM decided not to generate anything."""
    return raw.strip().lower() in _NONE_MARKERS


_CONTEXT_RULES = {
    "en": (
        "\n\nCONTEXT RULES — READ CAREFULLY:\n"
        "- The generated content MUST fit naturally into the current scene and narrative moment.\n"
        "- Respect the tone and setting described in the scenario instructions.\n"
        "- Do NOT introduce elements that contradict or overshadow the current scene.\n"
        "- Do NOT reveal major plot secrets or endgame-level threats prematurely.\n"
        "- Do NOT introduce characters or events that belong to a later narrative arc "
        "(e.g., don't introduce academy characters during the family arc, don't introduce "
        "dragons or world-level threats in the early story).\n"
        "- The content should ADD to the current moment, not derail it.\n"
        "- If the current scene is tense/dramatic (combat, confrontation, ceremony), "
        "do NOT interrupt it with unrelated content.\n"
        "\nCRITICAL: If generating something right now would feel forced, unnatural, "
        "or would break the flow of the current scene, respond with ONLY the word: NONE\n"
        "Responding NONE is ALWAYS acceptable and preferred over generating bad content."
    ),
    "vi": (
        "\n\nQUY TẮC NGỮ CẢNH — ĐỌC KỸ:\n"
        "- Nội dung được tạo phải PHÙ HỢP một cách tự nhiên với cảnh hiện tại và khoảnh khắc tường thuật.\n"
        "- Tôn trọng giọng điệu và bối cảnh được mô tả trong hướng dẫn kịch bản.\n"
        "- KHÔNG giới thiệu các yếu tố mâu thuẫn hoặc lấn át cảnh hiện tại.\n"
        "- KHÔNG tiết lộ bí mật cốt truyện chính hoặc mối đe dọa cấp endgame sớm.\n"
        "- KHÔNG giới thiệu nhân vật hoặc sự kiện thuộc về một arc tường thuật sau này.\n"
        "- Nội dung nên BỔ SUNG vào khoảnh khắc hiện tại, không phá hỏng nó.\n"
        "- Nếu cảnh hiện tại căng thẳng/drama (chiến đấu, đối đầu, nghi lễ), "
        "KHÔNG làm gián đoạn nó bằng nội dung không liên quan.\n"
        "\nQUAN TRỌNG: Nếu việc tạo nội dung ngay bây giờ cảm thấy gượng ép, không tự nhiên, "
        "hoặc sẽ phá vỡ luồng của cảnh hiện tại, hãy trả lời CHỈ bằng một từ: NONE\n"
        "Trả lời NONE LUÔN được chấp nhận và được ưu tiên hơn việc tạo nội dung kém."
    ),
    "pt-br": (
        "\n\nREGRAS DE CONTEXTO — LEIA COM ATENÇÃO:\n"
        "- O conteúdo gerado DEVE se encaixar naturalmente na cena e momento narrativo atual.\n"
        "- Respeite o tom e cenário descrito nas instruções do cenário.\n"
        "- NÃO introduza elementos que contradigam ou ofusquem a cena atual.\n"
        "- NÃO revele segredos principais da trama ou ameaças de nível endgame prematuramente.\n"
        "- NÃO introduza personagens ou eventos que pertençam a um arco narrativo posterior.\n"
        "- O conteúdo deve ADICIONAR ao momento atual, não desviá-lo.\n"
        "- Se a cena atual for tensa/dramática (combate, confronto, cerimônia), "
        "NÃO a interrompa com conteúdo não relacionado.\n"
        "\nCRÍTICO: Se gerar algo agora parecer forçado, antinatural, "
        "ou quebrar o fluxo da cena atual, responda apenas com a palavra: NONE\n"
        "Responder NONE é SEMPRE aceitável e preferível a gerar conteúdo ruim."
    ),
}


def _get_context_rules(language: str) -> str:
    return _CONTEXT_RULES.get(language, _CONTEXT_RULES["en"])


@dataclass
class GeneratedNPC:
    name: str
    personality: str
    realm: str        # realm key e.g. "tu_chan" (legacy)
    tier: str         # tier key e.g. "truc_co" (legacy)
    power_level: int  # numeric fallback 1-10 (derived from realm+tier)
    secret: str
    goal: str
    appearance: str


@dataclass
class GeneratedNPCMultiAxis:
    """
    NPC with multi-axis progression.
    Each axis has: {axis_id, stage_name, stage_slug, sub_stage_slug (optional), raw_value}
    """
    name: str
    personality: str
    secret: str
    goal: str
    appearance: str
    # {axis_id: {"stage_name": str, "stage_slug": str, "sub_stage_slug": str|null, "raw_value": int}}
    progression: dict[str, dict]


def generated_npc_to_multi_axis(npc: GeneratedNPC, power_system) -> GeneratedNPCMultiAxis | None:
    """
    Convert a legacy GeneratedNPC (realm/tier) to a multi-axis format
    using the PowerSystemResolver.
    """
    if not power_system or not power_system.config:
        return None
    config = power_system.config
    progression = {}

    # Map legacy realm → primary axis
    primary = next((ax for ax in config.axes if ax.is_primary), None)
    if primary and npc.realm:
        # Try to match realm name to a stage
        matched_stage = None
        matched_sub = None
        for stage in primary.stages:
            if stage.slug.lower() == npc.realm.lower():
                matched_stage = stage
                break

    if matched_stage and primary:
        raw = int(npc.power_level / 10.0 * primary.normalization_max) if primary.normalization_max else int(npc.power_level / 10.0 * 100)
        progression[primary.axis_id] = {
            "stage_name": matched_stage.name,
            "stage_slug": matched_stage.slug,
            "sub_stage_slug": None,
            "raw_value": raw,
        }

    return GeneratedNPCMultiAxis(
        name=npc.name,
        personality=npc.personality,
        secret=npc.secret,
        goal=npc.goal,
        appearance=npc.appearance,
        progression=progression,
    )


@dataclass
class RandomEvent:
    title: str
    description: str
    choices: list[str]


@dataclass
class MicroHook:
    """A small narrative detail for the narrator to weave into the next response."""
    description: str


@dataclass(frozen=True)
class AutoPlotRule:
    kind: str
    min_turns: int
    min_narrative_seconds: int
    cooldown_turns: int
    cooldown_narrative_seconds: int
    max_triggers: int = 999


AUTO_PLOT_RULES: dict[str, AutoPlotRule] = {
    # Micro-hooks: small scene details woven into narrator responses.
    "micro_hook": AutoPlotRule(
        kind="micro_hook",
        min_turns=3,
        min_narrative_seconds=15 * 60,
        cooldown_turns=4,
        cooldown_narrative_seconds=20 * 60,
        max_triggers=12,
    ),
    # Periodic introduction of new social vectors.
    "npc": AutoPlotRule(
        kind="npc",
        min_turns=5,
        min_narrative_seconds=30 * 60,
        cooldown_turns=6,
        cooldown_narrative_seconds=45 * 60,
        max_triggers=8,
    ),
    # Macro-level narrative arcs — future story branches.
    "plot_arc": AutoPlotRule(
        kind="plot_arc",
        min_turns=8,
        min_narrative_seconds=2 * 60 * 60,
        cooldown_turns=9,
        cooldown_narrative_seconds=3 * 60 * 60,
        max_triggers=6,
    ),
}


class PlotGenerator:
    def __init__(self, llm):
        self._llm = llm

    @staticmethod
    def should_trigger_auto(
        rule: AutoPlotRule,
        turns_since_last: int,
        narrative_seconds_since_last: int,
        trigger_count: int,
    ) -> bool:
        if trigger_count >= rule.max_triggers:
            return False

        if trigger_count == 0:
            return (
                turns_since_last >= rule.min_turns
                and narrative_seconds_since_last >= rule.min_narrative_seconds
            )

        return (
            turns_since_last >= rule.cooldown_turns
            and narrative_seconds_since_last >= rule.cooldown_narrative_seconds
        )

    async def generate_npc(
        self,
        world_context: str,
        language: str = "en",
        recent_narrative: str = "",
        existing_npc_names: list[str] | None = None,
        tone_instructions: str = "",
        power_system_hint: str = "",
        narrative_turns: int = 0,
    ) -> GeneratedNPC | None:
        """
        Generate a compelling NPC.

        Args:
            power_system_hint: realm context string from PowerSystemResolver.build_npc_tier_hint_for_ai()
            narrative_turns: number of turns played — used to limit NPC tier (early game = lower tiers)
        """
        lang_hint = f" Write all text values in {lang_name(language)}." if language and language != "en" else ""
        recent_hint = f"\n\nRecent narrative:\n{recent_narrative}" if recent_narrative else ""
        tone_hint = f"\n\nScenario tone and setting:\n{tone_instructions[:2000]}" if tone_instructions else ""
        dedup_hint = ""
        if existing_npc_names:
            names_str = ", ".join(existing_npc_names[:30])
            dedup_hint = (
                f"\n\nIMPORTANT: These NPCs already exist in the story: [{names_str}]. "
                "Generate a DIFFERENT character with a UNIQUE name. Do NOT reuse or create "
                "variations of existing names."
            )
        system_hint = f"\n{power_system_hint}" if power_system_hint else ""

        # Progressive tier lock: early game only gets tier index 0-2
        tier_limit_hint = ""
        if narrative_turns < 5:
            tier_limit_hint = "\nCRITICAL: This is early game. NPCs should be LOW-level. "
            if power_system_hint:
                tier_limit_hint += "Pick the lowest tier in their realm."
            else:
                tier_limit_hint += "Use power_level 1-3 (novice/beginner level only)."

        messages = [
            {
                "role": "system",
                "content": (
                    "Generate a compelling NPC for this RPG world. "
                    "The NPC should be relevant to the current scene and recent events. "
                    "The NPC should be someone the player could realistically encounter "
                    "in their current location and situation — a merchant, a guard, a traveler, "
                    "a rival, a servant, etc. NOT a major plot character or world-shaking figure. "
                    "Return ONLY valid JSON (no markdown): "
                    '{"name": str, "personality": str, "realm": str, "tier": str, '
                    '"power_level": int (1-10, derived from realm+tier), '
                    '"secret": str, "goal": str, "appearance": str}}. '
                    "IMPORTANT: realm and tier must be human-readable DISPLAY NAMES "
                    "in the world's language (e.g. 'Tu Chân', 'Trúc Cơ', 'Hấp Khí Hậu Kỳ'). "
                    f"Do NOT use underscore keys like 'tu_chan' or 'truc_co'.{lang_hint}"
                    f"{_get_context_rules(language)}"
                    f"{system_hint}{tier_limit_hint}"
                ),
            },
            {"role": "user", "content": f"World context:\n{world_context}{tone_hint}{recent_hint}{dedup_hint}"},
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=2048)
        except Exception:
            logger.exception("NPC generation failed")
            return None
        if _is_none_response(raw):
            logger.info("NPC generation skipped — LLM returned NONE (not appropriate for current scene)")
            return None
        data = parse_json_dict(raw)
        if data:
            try:
                power = max(1, min(10, int(data.get("power_level", 5))))
            except (TypeError, ValueError):
                power = 5
            realm_val = str(data.get("realm", "")).strip()
            tier_val = str(data.get("tier", "")).strip()
            if not realm_val:
                realm_val = "unknown"
            if not tier_val:
                tier_val = "unknown"
            return GeneratedNPC(
                name=data.get("name", "Unknown"),
                personality=data.get("personality", ""),
                realm=realm_val,
                tier=tier_val,
                power_level=power,
                secret=data.get("secret", ""),
                goal=data.get("goal", ""),
                appearance=data.get("appearance", ""),
            )
        else:
            logger.warning("NPC generation returned unparseable response: %s", raw[:200])
            return None

    async def generate_random_event(
        self,
        location: str,
        world_context: str,
        narrative_time: int,
        language: str = "en",
        recent_narrative: str = "",
        tone_instructions: str = "",
    ) -> RandomEvent | None:
        time_desc = (
            f"{narrative_time // 86400} days"
            if narrative_time >= 86400
            else f"{narrative_time // 3600} hours"
            if narrative_time >= 3600
            else f"{narrative_time // 60} minutes"
        )
        lang_hint = f" Write all text values in {lang_name(language)}." if language and language != "en" else ""
        recent_hint = f"\nRecent narrative:\n{recent_narrative}" if recent_narrative else ""
        tone_hint = f"\nScenario tone and setting:\n{tone_instructions[:2000]}" if tone_instructions else ""
        messages = [
            {
                "role": "system",
                "content": (
                    "Generate a contextually appropriate random encounter or event. "
                    "The event should feel natural for the location and moment — "
                    "not forced or out of place. "
                    "Return ONLY valid JSON: "
                    f'{{"title": str, "description": str, "choices": [str, str, str]}}.{lang_hint}'
                    f"{_get_context_rules(language)}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Location: {location}\n"
                    f"World context: {world_context}\n"
                    f"Time elapsed: {time_desc}"
                    f"{tone_hint}"
                    f"{recent_hint}"
                ),
            },
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=2048)
        except Exception:
            logger.exception("Random event generation failed")
            return None
        if _is_none_response(raw):
            logger.info("Random event skipped — LLM returned NONE")
            return None
        data = parse_json_dict(raw)
        if data:
            return RandomEvent(
                title=data.get("title", "Unexpected Event"),
                description=data.get("description", ""),
                choices=data.get("choices", []),
            )
        else:
            logger.warning("Random event returned unparseable response: %s", raw[:200])
            return None

    async def generate_plot_arc(
        self,
        world_context: str,
        language: str = "en",
        recent_narrative: str = "",
        tone_instructions: str = "",
    ) -> str | None:
        lang_hint = f" Write in {lang_name(language)}." if language and language != "en" else ""
        recent_hint = f"\n\nRecent story summary:\n{recent_narrative}" if recent_narrative else ""
        tone_hint = f"\n\nScenario tone and setting:\n{tone_instructions[:2000]}" if tone_instructions else ""
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a story architect for an RPG campaign. Generate a MACRO-LEVEL "
                    "plot arc — a future story branch that will unfold over multiple sessions. "
                    "This is NOT a scene action or something happening right now. "
                    "It is a high-level narrative hook like:\n"
                    "- A villain making moves behind the scenes\n"
                    "- An ally facing a personal crisis\n"
                    "- A political shift in the world\n"
                    "- A new threat emerging far away\n"
                    "- A betrayal being planned\n"
                    "Write 2-3 sentences describing WHAT will happen in the future, "
                    "not what is happening now. Think of it as a TV show's next-episode teaser. "
                    f"No lists or headers.{lang_hint}"
                    f"{_get_context_rules(language)}"
                ),
            },
            {"role": "user", "content": f"World context:\n{world_context}{tone_hint}{recent_hint}"},
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=2048)
        except Exception:
            logger.exception("Plot arc generation failed")
            return None
        if _is_none_response(raw):
            logger.info("Plot arc skipped — LLM returned NONE")
            return None
        return raw

    async def generate_micro_hook(
        self,
        world_context: str,
        recent_narrative: str,
        language: str = "en",
        tone_instructions: str = "",
    ) -> MicroHook | None:
        """Generate a small narrative detail for the narrator to weave into the next response.

        Unlike plot arcs, micro-hooks are scene-level details: a mysterious object,
        an NPC behaving oddly, an environmental clue, a sensory detail that hints
        at something deeper. The narrator integrates these naturally into its text.
        """
        lang_hint = f" Write in {lang_name(language)}." if language and language != "en" else ""
        tone_hint = f"\nScenario tone and setting:\n{tone_instructions[:2000]}" if tone_instructions else ""
        messages = [
            {
                "role": "system",
                "content": (
                    "Generate a small, intriguing narrative detail that the narrator "
                    "should weave into the next response. This is NOT a plot arc or "
                    "a separate event — it is a detail the narrator will incorporate "
                    "naturally into the prose. Examples:\n"
                    "- A strange object is found during the current scene\n"
                    "- An NPC reacts oddly to something\n"
                    "- The environment shows an unusual sign\n"
                    "- A sensory detail hints at a hidden presence\n"
                    "- A character notices something no one else does\n"
                    "Write ONE sentence describing the detail. Be specific to the "
                    f"current scene.{lang_hint}"
                    f"{_get_context_rules(language)}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"World context:\n{world_context}"
                    f"{tone_hint}\n\n"
                    f"Current scene:\n{recent_narrative}"
                ),
            },
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=2048)
        except Exception:
            logger.exception("Micro-hook generation failed")
            return None
        if _is_none_response(raw):
            logger.info("Micro-hook skipped — LLM returned NONE")
            return None
        stripped = raw.strip()
        if stripped:
            return MicroHook(description=stripped)
        return None

    # ---------------------------------------------------------------------------
    # Multi-axis NPC generation
    # ---------------------------------------------------------------------------

    async def generate_npc_multi_axis(
        self,
        world_context: str,
        language: str = "en",
        recent_narrative: str = "",
        existing_npc_names: list[str] | None = None,
        tone_instructions: str = "",
        power_system_hint: str = "",
        narrative_turns: int = 0,
    ) -> GeneratedNPCMultiAxis | None:
        """
        Generate an NPC with multi-axis progression.
        The power_system_hint should include ALL axes (from PowerSystemResolver.build_npc_tier_hint_for_ai).
        """
        lang_hint = f" Write all text values in {lang_name(language)}." if language and language != "en" else ""
        recent_hint = f"\n\nRecent narrative:\n{recent_narrative}" if recent_narrative else ""
        tone_hint = f"\n\nScenario tone and setting:\n{tone_instructions[:2000]}" if tone_instructions else ""
        dedup_hint = ""
        if existing_npc_names:
            names_str = ", ".join(existing_npc_names[:30])
            dedup_hint = (
                f"\n\nIMPORTANT: These NPCs already exist: [{names_str}]. "
                "Generate a DIFFERENT character with a UNIQUE name."
            )

        tier_limit_hint = ""
        if narrative_turns < 5:
            tier_limit_hint = (
                "\nCRITICAL: This is early game. NPCs should be LOW-level. "
                "Pick the lowest or second-lowest stage for each axis."
            )

        axis_guidance = ""
        if power_system_hint:
            axis_guidance = (
                f"\n\n{power_system_hint}"
                "\nFor EACH axis, pick the most fitting stage for this NPC based on their role, personality, and backstory."
                "\nFor example: a merchant NPC → high 'wealth' but low combat. "
                "A street gang leader → high social influence but medium wealth."
            )

        messages = [
            {
                "role": "system",
                "content": (
                    "Generate a compelling NPC for this RPG world. "
                    "Assign values to ALL appropriate axes based on the NPC's background. "
                    "Return ONLY valid JSON (no markdown). "
                    '{"name": str, "personality": str, '
                    '"progression": {"axis_id": {"stage_name": str, "stage_slug": str, "sub_stage_slug": str|null, "raw_value": int (0-100)}, ...}, '
                    '"secret": str, "goal": str, "appearance": str}. '
                    "IMPORTANT: stage_name is the DISPLAY NAME (e.g. 'Trúc Cơ', 'Hấp Khí Hậu Kỳ'). "
                    "stage_slug is the IDENTIFIER (e.g. 'truc_co', 'hap_khi_hau_ky'). "
                    "sub_stage_slug: 'so_ky' for early, 'trung_ky' for mid, 'hau_ky' for late. "
                    "If the NPC does not have a rank on an axis, omit that axis entirely.{lang_hint}"
                    f"{_get_context_rules(language)}"
                    f"{axis_guidance}{tier_limit_hint}"
                ),
            },
            {"role": "user", "content": f"World context:\n{world_context}{tone_hint}{recent_hint}{dedup_hint}"},
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=2048)
        except Exception:
            logger.exception("Multi-axis NPC generation failed")
            return None
        if _is_none_response(raw):
            logger.info("Multi-axis NPC generation skipped — LLM returned NONE")
            return None
        data = parse_json_dict(raw)
        if not data:
            logger.warning("Multi-axis NPC returned unparseable: %s", raw[:200])
            return None

        progression = {}
        raw_prog = data.get("progression", {})
        if isinstance(raw_prog, dict):
            for axis_id, prog_data in raw_prog.items():
                if isinstance(prog_data, dict):
                    progression[str(axis_id)] = {
                        "stage_name": str(prog_data.get("stage_name", "")),
                        "stage_slug": str(prog_data.get("stage_slug", "")),
                        "sub_stage_slug": prog_data.get("sub_stage_slug"),
                        "raw_value": max(0, min(100, int(prog_data.get("raw_value", 50)))),
                    }

        return GeneratedNPCMultiAxis(
            name=str(data.get("name", "Unknown")),
            personality=str(data.get("personality", "")),
            secret=str(data.get("secret", "")),
            goal=str(data.get("goal", "")),
            appearance=str(data.get("appearance", "")),
            progression=progression,
        )
