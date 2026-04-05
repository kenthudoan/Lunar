from __future__ import annotations
import logging
import re
from enum import Enum
from typing import AsyncIterator

from app.utils.json_parsing import parse_json_dict

logger = logging.getLogger(__name__)


def estimate_tokens(text: str) -> int:
    """Rough token estimate: ~4 chars per token for English, ~3 for CJK-heavy text."""
    if not text:
        return 0
    return max(1, len(text) // 4)


from app.utils.lang import lang_name


class NarrativeMode(str, Enum):
    NARRATIVE = "NARRATIVE"
    COMBAT = "COMBAT"
    META = "META"


_DEFAULT_META = {"mode": "NARRATIVE", "ambush": False, "narrative_time_seconds": 60}

_LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "vi": "Hãy phản hồi bằng tiếng Việt.",
    "pt-br": "Responda em português brasileiro (pt-br).",
}

# ===== POV (Ngôi kể) — đại từ nhân xưng dùng khi kể chuyện =====
_POV_INSTRUCTIONS = {
    "first_person": {
        "en": "Use FIRST PERSON narration ('I', 'my', 'me'). The protagonist speaks and acts as 'I'. Write from the protagonist's direct perspective.",
        "vi": "Dùng NGÔI THỨ NHẤT ('tôi', 'của tôi', 'với tôi'). Nhân vật chính nói và hành động như 'tôi'. Viết từ góc nhìn trực tiếp của nhân vật chính.",
        "pt-br": "Use a narração em PRIMEIRA PESSOA ('eu', 'meu', 'mim'). O protagonista fala e age como 'eu'.",
    },
    "second_person": {
        "en": "Use SECOND PERSON narration ('you', 'your'). Address the reader/player directly as the protagonist.",
        "vi": "Dùng NGÔI THỨ HAI ('bạn', 'của bạn'). Nói trực tiếp với người đọc/người chơi như nhân vật chính.",
        "pt-br": "Use a narração em SEGUNDA PESSOA ('você', 'seu'). Dirija-se diretamente ao leitor/jogador.",
    },
    "third_person": {
        "en": "Use THIRD PERSON narration ('he/she/they', 'his/her/their'). Write about the protagonist from outside.",
        "vi": "Dùng NGÔI THỨ BA ('hắn/cô ấy/họ', 'của hắn/cô ấy'). Viết về nhân vật chính từ bên ngoài.",
        "pt-br": "Use a narração em TERCEIRA PESSOA ('ele/ela', 'dele/dela'). Conte sobre o protagonista de fora.",
    },
    "omniscient": {
        "en": "Use OMNISCIENT narration. You see and know everything — the protagonist's thoughts, NPC's secrets, world events simultaneously. Jump perspectives freely.",
        "vi": "Dùng NGÔI TOÀN BIẾT. Bạn nhìn và biết mọi thứ — suy nghĩ nhân vật chính, bí mật NPC, sự kiện thế giới đồng thời. Nhảy góc nhìn tự do.",
        "pt-br": "Use narração ONISCIENTE. Você vê e sabe de tudo — pensamentos, segredos, eventos mundiais simultaneamente.",
    },
    "multiple_pov": {
        "en": "Use MULTIPLE POV narration. Shift between different characters' perspectives throughout the scene. Show what different characters think and feel.",
        "vi": "Dùng NGÔI ĐA NHÂN VẬT. Chuyển đổi giữa các góc nhìn khác nhau trong suốt cảnh. Cho thấy nhân vật khác nghĩ và cảm nhận gì.",
        "pt-br": "Use narração de MÚLTIPLAS PONTOS DE VISTA. Alterne entre perspectivas de diferentes personagens.",
    },
}

# ===== Writing Style (Phong cách viết) =====
_WRITING_STYLE_INSTRUCTIONS = {
    "chinh_thong": {
        "en": "STYLE: Orthodox — formal, precise, literary. Use complete sentences, rich vocabulary, balanced pacing. Suitable for epic narratives.",
        "vi": "PHONG CÁCH: Chính Thống — trang trọng, chính xác, văn chương. Dùng câu hoàn chỉnh, từ vựng phong phú, nhịp điệu cân bằng. Phù hợp cho sử thi.",
        "pt-br": "ESTILO: Ortodoxo — formal, preciso, literário. Frases completas, vocabulário rico, ritmo equilibrado.",
    },
    "hao_sang": {
        "en": "STYLE: Heroic Splendor — grand, sweeping, larger-than-life. Exaggerate conflicts, elevate heroes, dramatic declarations. Like classical epics.",
        "vi": "PHONG CÁCH: Hào Sảng — hùng tráng, mãnh liệt, vượt đời thực. Phóng đại xung đột, tôn anh hùng, tuyên bố kịch tính. Như sử thi cổ điển.",
        "pt-br": "ESTILO: Esplendor Heróico — grandioso, dramático, maior que a vida. Conflitos exagerados, heróis elevados.",
    },
    "lanh_khot": {
        "en": "STYLE: Cold & Brutal — detached, terse, unflinching. No sentimentality. Consequences are immediate and severe. Watch suffering unfold without commentary.",
        "vi": "PHONG CÁCH: Lãnh Khốc — khách quan, ngắn gọn, không khoan nhượng. Không cảm xúc. Hậu quả tức thì và nghiêm khắc. Chứng kiến đau khổ không bình luận.",
        "pt-br": "ESTILO: Frio & Brutal — objetivo, breve, implacável. Sem sentimentalismo. Consequências imediatas.",
    },
    "tho_mong": {
        "en": "STYLE: Dreamlike & Poetic — lyrical, atmospheric, contemplative. Use metaphor, sensory detail, emotional undercurrent. Let moments breathe.",
        "vi": "PHONG CÁCH: Thơ Mộng — trữ tình, giàu không khí, suy tư. Dùng ẩn dụ, chi tiết giác quan, dòng cảm xúc ngầm. Để khoảnh khắc thở.",
        "pt-br": "ESTILO: Onírico & Poético — lírico, atmosférico, contemplativo. Metáforas, detalhes sensoriais, emoção subjacente.",
    },
    "hai_huoc": {
        "en": "STYLE: Humorous & Light — witty, playful, self-aware. Include light jokes, pop culture references, character's internal commentary. Keep tension but stay entertaining.",
        "vi": "PHONG CÁCH: Hài Hước — hóm hỉnh, vui vẻ, tự nhận thức. Thêm trò đùa nhẹ, tham chiếu văn hóa đại chúng, bình luận nội tâm. Giữ căng thẳng nhưng vui vẻ.",
        "pt-br": "ESTILO: Humorístico & Leve — espirituoso, brincalhão, autoconsciente. Piadas leves, referências culturais.",
    },
    "kich_tinh": {
        "en": "STYLE: Dramatic Tension — suspenseful, fast-paced, cliffhangers. Build tension constantly. End scenes at critical moments. Reveal secrets dramatically.",
        "vi": "PHONG CÁCH: Kịch Tính — hồi hồp, nhanh, cliffhanger. Xây dựng căng thẳng liên tục. Kết thúc cảnh tại khoảnh khắc quan trọng. Tiết lộ bí mật một cách kịch tính.",
        "pt-br": "ESTILO: Tensão Dramática — suspense, ritmo acelerado, cliffhangers. Construa tensão constantemente.",
    },
}


class NarratorEngine:
    def __init__(self, llm):
        self._llm = llm

    async def detect_mode(self, player_input: str, story_context: str = "") -> tuple[NarrativeMode, dict]:
        context_hint = ""
        if story_context:
            context_hint = f" Recent story context: {story_context}"
        messages = [
            {
                "role": "system",
                "content": (
                    "Classify the player's action and return ONLY JSON: "
                    '{"mode": "NARRATIVE|COMBAT|META", "ambush": bool, "narrative_time_seconds": int, '
                    '"opponent_name": str, "opponent_power": int, '
                    '"action_type": "combat"|"social"|"wealth"|"investigate"|"default"}. '
                    "COMBAT: action initiates or continues a fight. "
                    "META: player speaks to the AI narrator directly (out of character). "
                    "NARRATIVE: everything else (exploration, dialogue, travel, etc.). "
                    "ambush: true ONLY if an NPC attacks the player by surprise (not player-initiated). "
                    "narrative_time_seconds: realistic story time this action takes in seconds. "
                    "opponent_name: if COMBAT, the name or description of the opponent being fought (e.g. 'Kael Noir', 'four-legged creature', 'bandit'). Empty string if not COMBAT. "
                    "opponent_power: if COMBAT, estimate the opponent's power level 1-10. "
                    "If a WORLD POWER SCALE is provided in the context, use those NPCs as anchors "
                    "to calibrate the opponent relative to the world. "
                    "Use 3 if truly uncertain. 0 if not COMBAT. "
                    "action_type: the relevant power axis for resolution — "
                    '"combat" for physical fighting, "social" for persuasion/manipulation, '
                    '"wealth" for buying/bribing, "investigate" for deduction, '
                    '"default" for general narrative actions.'
                    + context_hint
                ),
            },
            {"role": "user", "content": player_input},
        ]
        try:
            raw = await self._llm.complete(messages=messages, max_tokens=256)
        except Exception:
            return self._heuristic_detect_mode(player_input)

        data = parse_json_dict(raw)
        if not data:
            return self._heuristic_detect_mode(player_input)

        mode_raw = str(data.get("mode", "NARRATIVE")).upper()
        try:
            mode = NarrativeMode(mode_raw)
        except ValueError:
            mode = NarrativeMode.NARRATIVE

        try:
            seconds = int(data.get("narrative_time_seconds", 60))
        except (TypeError, ValueError):
            seconds = 60

        opponent_name = str(data.get("opponent_name", "")).strip()
        try:
            opponent_power = max(1, min(10, int(data.get("opponent_power", 3))))
        except (TypeError, ValueError):
            opponent_power = 3

        action_type = str(data.get("action_type", "default")).strip().lower()
        valid_action_types = {"combat", "social", "wealth", "investigate", "default"}
        if action_type not in valid_action_types:
            action_type = "default"

        return mode, {
            "mode": mode.value,
            "ambush": bool(data.get("ambush", False)),
            "narrative_time_seconds": seconds,
            "opponent_name": opponent_name,
            "opponent_power": opponent_power,
            "action_type": action_type,
        }

    @staticmethod
    def _length_instruction(max_tokens: int) -> str:
        """Return a length constraint instruction scaled to the token budget.

        Uses approximate word counts (1 token ≈ 0.6 words for Portuguese) to give the model
        a concrete, hard-to-ignore limit for the narrative_text field only.
        """
        # Approximate word budget for narrative (tokens * 0.75 words/token)
        word_budget = int(max_tokens * 0.6)
        if max_tokens <= 512:
            return (
                f"HARD LENGTH LIMIT: The 'narrative_text' field MUST be under {word_budget} words "
                f"(~{max_tokens} tokens). This is 1-2 short paragraphs. "
                "Be concise but complete. Always end at a natural stopping point. "
                "Going over this limit is a FAILURE — trim ruthlessly."
            )
        if max_tokens <= 1000:
            return (
                f"HARD LENGTH LIMIT: The 'narrative_text' field MUST be under {word_budget} words "
                f"(~{max_tokens} tokens). This is 2-4 paragraphs. "
                "Focus on the most important narrative beats. Always end at a natural stopping point. "
                "Going over this limit is a FAILURE — trim ruthlessly."
            )
        if max_tokens <= 1500:
            return (
                f"HARD LENGTH LIMIT: The 'narrative_text' field MUST be under {word_budget} words "
                f"(~{max_tokens} tokens). This is 4-6 paragraphs. "
                "Always end at a natural stopping point with a clear prompt for the player. "
                "Going over this limit is a FAILURE — trim ruthlessly."
            )
        if max_tokens <= 3000:
            return (
                f"LENGTH GUIDELINE: Aim for under {word_budget} words (~{max_tokens} tokens) "
                "in the 'narrative_text' field. Write rich prose but don't ramble. "
                "Always end at a natural stopping point."
            )
        return ""

    _NARRATOR_RULES = {
        "en": (
            "\nNARRATOR RULES:\n"
            "- Write immersive, evocative prose. Never break character.\n"
            "- React meaningfully to player choices. Consequences are real.\n"
            "- The world is alive — NPCs have their own agendas and memories.\n"
            "- ALWAYS use FULL character names (first + last) in narration. You may use short names in dialogue spoken by characters, but the narration itself must use full names.\n"
            "- When mentioning a character by name in narration, prefix their name with @ (e.g. @Satoru Gojo). This applies to ALL named characters and NPCs. Do NOT use @ in dialogue lines spoken by characters, only in narration text.\n"
            "- Stay consistent with the established tone.\n"
            "- Do NOT summarize. Narrate in present tense.\n"
            "- End each response at a natural pause, not mid-action.\n"
            "- ALWAYS finish your response with a complete sentence. Never stop mid-word or mid-sentence.\n"
            "{length_instruction}"
            "- When the player ACQUIRES an item, emit: [ITEM_ADD:item_name|category|source_description]\n"
            "- When an item is CONSUMED or EXPENDED, emit: [ITEM_USE:item_name]\n"
            "- When an item is LOST, STOLEN, or DESTROYED, emit: [ITEM_LOSE:item_name]\n"
            "- Categories: weapon, armor, consumable, quest, tool, misc\n"
            "- If the player tries to use an item NOT in their inventory, reject the action narratively.\n"
            "- Place item tags at the end of the relevant sentence, inline with the narrative.\n"
            "- IMPORTANT: If you mention an item from the WORLD LORE / story cards that the player is carrying or using for the FIRST TIME in the story (e.g. a keepsake, a weapon described in the scenario), emit [ITEM_ADD] for it so it appears in the inventory. Story card items that the player already has but haven't been registered yet MUST be tagged.\n"
        ),
        "pt-br": (
            "\nREGRAS DO NARRADOR:\n"
            "- Escreva prosa imersiva e evocativa. Nunca quebre o personagem.\n"
            "- Reaja de forma significativa às escolhas do jogador. Consequências são reais.\n"
            "- O mundo é vivo — NPCs têm suas próprias agendas e memórias.\n"
            "- SEMPRE use nomes COMPLETOS dos personagens (nome + sobrenome) na narração. Nomes curtos são permitidos apenas em diálogos falados pelos personagens, mas a narração em si deve usar nomes completos.\n"
            "- Ao mencionar um personagem pelo nome na narração, prefixe com @ (ex: @Satoru Gojo). Isso se aplica a TODOS os personagens e NPCs nomeados. NÃO use @ em falas de diálogo dos personagens, apenas no texto narrativo.\n"
            "- Mantenha consistência com o tom estabelecido.\n"
            "- NÃO resuma. Narre no tempo presente.\n"
            "- Termine cada resposta em uma pausa natural, não no meio de uma ação.\n"
            "- SEMPRE termine sua resposta com uma frase completa. Nunca pare no meio de uma palavra ou frase.\n"
            "{length_instruction}"
            "- Quando o jogador ADQUIRIR um item, emita: [ITEM_ADD:nome_item|categoria|descrição_origem]\n"
            "- Quando um item for CONSUMIDO ou GASTO, emita: [ITEM_USE:nome_item]\n"
            "- Quando um item for PERDIDO, ROUBADO ou DESTRUÍDO, emita: [ITEM_LOSE:nome_item]\n"
            "- Categorias: weapon, armor, consumable, quest, tool, misc\n"
            "- Se o jogador tentar usar um item que NÃO está no inventário, rejeite a ação narrativamente.\n"
            "- Coloque as tags de item no final da frase relevante, inline com a narrativa.\n"
            "- IMPORTANTE: Se você mencionar um item do WORLD LORE / story cards que o jogador está carregando ou usando PELA PRIMEIRA VEZ na história (ex: um amuleto, uma arma descrita no cenário), emita [ITEM_ADD] para que apareça no inventário. Itens de story cards que o jogador já possui mas ainda não foram registrados DEVEM ser taggeados.\n"
        ),
    }

    def _build_narrator_rules(self, max_tokens: int, language: str = "en") -> str:
        """Build the static narrator rules block in the appropriate language."""
        length_instruction = self._length_instruction(max_tokens)
        length_line = f"- {length_instruction}\n" if length_instruction else ""
        template = self._NARRATOR_RULES.get(language, self._NARRATOR_RULES["en"])
        return template.format(length_instruction=length_line)

    def build_system_prompt(
        self,
        tone_instructions: str = "",
        protagonist_name: str = "",
        narrative_pov: str = "first_person",
        writing_style: str = "chinh_thong",
        memory_context: str = "",
        language: str = "en",
        inventory_context: str = "",
        max_tokens: int = 2000,
        narrator_hints: str = "",
        graph_context: str = "",
        npc_context: str = "",
        journal_context: str = "",
        story_cards_context: str = "",
        power_system_context: str = "",
    ) -> str:
        lang_instruction = _LANGUAGE_INSTRUCTIONS.get(
            language,
            f"Respond in the language: {lang_name(language)}.",
        )
        pov_key = narrative_pov if narrative_pov in _POV_INSTRUCTIONS else "first_person"
        pov_instruction = _POV_INSTRUCTIONS[pov_key].get(
            language, _POV_INSTRUCTIONS[pov_key]["en"]
        )
        style_key = writing_style if writing_style in _WRITING_STYLE_INSTRUCTIONS else "chinh_thong"
        style_instruction = _WRITING_STYLE_INSTRUCTIONS[style_key].get(
            language, _WRITING_STYLE_INSTRUCTIONS[style_key]["en"]
        )
        sections = [
            f"You are an AI narrator for an interactive RPG story. {lang_instruction}",
        ]
        if protagonist_name:
            sections.append(f"\nPROTAGONIST NAME: {protagonist_name}")
        sections.append(f"\nNARRATIVE PERSPECTIVE:\n{pov_instruction}")
        sections.append(f"\n{style_instruction}")
        if tone_instructions:
            sections.append(f"\nTONE AND STYLE:\n{tone_instructions}")
        if power_system_context:
            sections.append(f"\nPOWER SYSTEM:\n{power_system_context}")
        if memory_context:
            sections.append(f"\nWORLD MEMORY:\n{memory_context}")
        if inventory_context:
            sections.append(f"\nPLAYER INVENTORY:\n{inventory_context}")
        if npc_context:
            sections.append(f"\n{npc_context}")
        if journal_context:
            sections.append(f"\n{journal_context}")
        if narrator_hints:
            sections.append(narrator_hints)
        if graph_context:
            sections.append(f"\nWORLD RELATIONSHIPS (who knows who, connections between entities):\n{graph_context}")
        if story_cards_context:
            sections.append(f"\n{story_cards_context}")

        sections.append(self._build_narrator_rules(max_tokens, language))
        return "\n".join(sections)

    def build_system_prompt_parts(
        self,
        tone_instructions: str = "",
        protagonist_name: str = "",
        narrative_pov: str = "first_person",
        writing_style: str = "chinh_thong",
        memory_context: str = "",
        language: str = "en",
        inventory_context: str = "",
        max_tokens: int = 2000,
        narrator_hints: str = "",
        graph_context: str = "",
        npc_context: str = "",
        journal_context: str = "",
        story_cards_context: str = "",
        power_system_context: str = "",
    ) -> tuple[str, str]:
        """Build system prompt split into (static, dynamic) parts for prompt caching.

        Static part: role + language + pov + style + tone + narrator rules + power system (fixed per scenario).
        Dynamic part: memory, inventory, NPCs, journal, hints, graph, story cards (changes per action).
        """
        lang_instruction = _LANGUAGE_INSTRUCTIONS.get(
            language,
            f"Respond in the language: {lang_name(language)}.",
        )
        pov_key = narrative_pov if narrative_pov in _POV_INSTRUCTIONS else "first_person"
        pov_instruction = _POV_INSTRUCTIONS[pov_key].get(
            language, _POV_INSTRUCTIONS[pov_key]["en"]
        )
        style_key = writing_style if writing_style in _WRITING_STYLE_INSTRUCTIONS else "chinh_thong"
        style_instruction = _WRITING_STYLE_INSTRUCTIONS[style_key].get(
            language, _WRITING_STYLE_INSTRUCTIONS[style_key]["en"]
        )

        # Static: same for every action in this scenario
        static_sections = [
            f"You are an AI narrator for an interactive RPG story. {lang_instruction}",
        ]
        if protagonist_name:
            static_sections.append(f"\nPROTAGONIST NAME: {protagonist_name}")
        static_sections.append(f"\nNARRATIVE PERSPECTIVE:\n{pov_instruction}")
        static_sections.append(f"\n{style_instruction}")
        if tone_instructions:
            static_sections.append(f"\nTONE AND STYLE:\n{tone_instructions}")
        if power_system_context:
            static_sections.append(f"\nPOWER SYSTEM:\n{power_system_context}")
        static_sections.append(self._build_narrator_rules(max_tokens, language))
        static_part = "\n".join(static_sections)

        # Dynamic: changes every action
        dynamic_sections: list[str] = []
        if memory_context:
            dynamic_sections.append(f"\nWORLD MEMORY:\n{memory_context}")
        if inventory_context:
            dynamic_sections.append(f"\nPLAYER INVENTORY:\n{inventory_context}")
        if npc_context:
            dynamic_sections.append(f"\n{npc_context}")
        if journal_context:
            dynamic_sections.append(f"\n{journal_context}")
        if narrator_hints:
            dynamic_sections.append(narrator_hints)
        if graph_context:
            dynamic_sections.append(f"\nWORLD RELATIONSHIPS (who knows who, connections between entities):\n{graph_context}")
        if story_cards_context:
            dynamic_sections.append(f"\n{story_cards_context}")

        dynamic_part = "\n".join(dynamic_sections)
        return static_part, dynamic_part

    def build_meta_prompt(
        self,
        language: str,
        inventory_context: str = "",
        journal_context: str = "",
        npc_context: str = "",
    ) -> str:
        lang_instruction = _LANGUAGE_INSTRUCTIONS.get(
            language,
            f"Respond in the language: {lang_name(language)}.",
        )
        sections = [
            f"You are a Game Master assistant for this RPG campaign. {lang_instruction}",
            "\nMETA MODE RULES:",
            "- Respond OUT-OF-CHARACTER. You are a helpful game master, not a narrator.",
            "- Be factual and direct. No narrative prose, no 'you feel', no scene-setting.",
            "- Reference action numbers and locations when citing events.",
            "- Use bullet points and structured formatting.",
            "- Answer questions about game state using the structured data below.",
        ]
        if inventory_context:
            sections.append(f"\n{inventory_context}")
        if journal_context:
            sections.append(f"\nJOURNAL (recent entries):\n{journal_context}")
        if npc_context:
            sections.append(f"\nACTIVE NPCs:\n{npc_context}")
        return "\n".join(sections)

    @staticmethod
    def _dynamic_history_slice(history: list[dict], context_window: int, system_tokens: int) -> list[dict]:
        """Return as many recent history messages as fit within the context budget.

        Budget allocation:
        - system_tokens: already consumed by the system prompt
        - output reserve: 2500 tokens (narrative + JSON overhead)
        - remaining budget goes to history, newest messages first
        """
        output_reserve = 2500
        budget = context_window - system_tokens - output_reserve
        if budget <= 0:
            return history[-4:]  # absolute minimum: keep last 2 exchanges

        selected: list[dict] = []
        used = 0
        for msg in reversed(history):
            msg_tokens = estimate_tokens(msg.get("content", ""))
            if used + msg_tokens > budget:
                break
            selected.append(msg)
            used += msg_tokens
        selected.reverse()
        # Always keep at least 4 messages (2 exchanges) for coherence
        if len(selected) < 4 and len(history) >= 4:
            selected = history[-4:]
        return selected

    async def stream_narrative(
        self,
        player_input: str,
        system_prompt: str,
        history: list[dict],
        context_window: int = 64_000,
        language: str = "en",
        stream_delivery_speed: str = "instant",
    ) -> AsyncIterator[str]:
        """Stream narrative with optional delivery speed control.

        stream_delivery_speed controls how fast chunks are emitted from this
        generator (not how fast the LLM generates — that's always full speed):
          - instant  : chunks emitted as fast as possible (no throttle)
          - fast     : ~5ms delay between chunks
          - normal   : ~20ms delay between chunks
          - slow     : ~100ms delay between chunks
          - typewriter: ~60ms delay (word-grouped for authentic feel)
        """
        import asyncio

        _DELIVERY_DELAYS = {
            "instant":     0.0,
            "fast":        0.005,
            "normal":      0.02,
            "slow":        0.1,
            "typewriter":  0.065,
        }
        delay = _DELIVERY_DELAYS.get(stream_delivery_speed, 0.0)
        is_typewriter = stream_delivery_speed == "typewriter"

        system_tokens = estimate_tokens(system_prompt)
        history_slice = self._dynamic_history_slice(history, context_window, system_tokens)
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history_slice)
        messages.append({"role": "user", "content": player_input})

        # Debug logging: log full LLM request context
        logger.debug(
            "=== NARRATOR STREAM REQUEST ===\n"
            "System prompt (%d tokens, %d chars):\n%s\n"
            "History slice: %d messages (of %d total)\n"
            "Player input: %s\n"
            "Context window: %d, stream_delivery_speed: %s",
            system_tokens, len(system_prompt), system_prompt,
            len(history_slice), len(history),
            player_input,
            context_window,
            stream_delivery_speed,
        )
        if logger.isEnabledFor(logging.DEBUG):
            for idx, msg in enumerate(history_slice):
                content = msg.get("content", "")
                logger.debug(
                    "  History[%d] role=%s len=%d: %s",
                    idx, msg.get("role", "?"), len(content),
                    content[:200] + ("..." if len(content) > 200 else ""),
                )

        full_response = ""

        if delay <= 0:
            # No throttle — fast path, emit chunks directly as they arrive
            try:
                async for chunk in self._llm.stream(messages=messages):
                    full_response += chunk
                    yield chunk
            except Exception:
                yield self._fallback_narrative(player_input, language=language)
        else:
            # Throttled path: collect chunks into a word buffer and release
            # word groups at a fixed interval — gives authentic typewriter pacing.
            word_buf = ""
            last_word_boundary = 0
            pos = 0

            try:
                async for chunk in self._llm.stream(messages=messages):
                    full_response += chunk
                    word_buf += chunk

                    if is_typewriter:
                        # Emit at word boundaries (space, newline, punctuation)
                        # Find the last safe break point
                        emit_up_to = len(word_buf)
                        for check_pos in range(len(word_buf) - 1, -1, -1):
                            ch = word_buf[check_pos]
                            if ch in (' ', '\n', '\t', '.', ',', '!', '?', ';', ':', '—', '-'):
                                emit_up_to = check_pos + 1
                                break

                        if emit_up_to > last_word_boundary:
                            chunk_to_emit = word_buf[last_word_boundary:emit_up_to]
                            last_word_boundary = emit_up_to
                            if chunk_to_emit:
                                await asyncio.sleep(delay)
                                yield chunk_to_emit
                    else:
                        # Simple time-based throttle: emit whatever we have after delay
                        await asyncio.sleep(delay)
                        to_emit = word_buf[last_word_boundary:]
                        last_word_boundary = len(word_buf)
                        if to_emit:
                            yield to_emit

            except Exception:
                # Flush any remaining buffer before fallback
                remaining = word_buf[last_word_boundary:]
                if remaining:
                    yield remaining
                yield self._fallback_narrative(player_input, language=language)
                return

            # Drain any remaining buffered text after stream completes
            remaining = word_buf[last_word_boundary:]
            if remaining:
                yield remaining

        # Debug logging: log full response
        logger.debug(
            "=== NARRATOR STREAM RESPONSE ===\n"
            "Response length: %d chars\n%s",
            len(full_response),
            full_response[:500] + ("..." if len(full_response) > 500 else ""),
        )

    _SINGLE_CALL_FORMAT = (
        "\n\n=== RESPONSE FORMAT ===\n"
        "You MUST return ONLY valid JSON (no markdown fences) with this exact schema:\n"
        "{\n"
        '  "mode": "NARRATIVE|COMBAT|META",\n'
        '  "narrative_time_seconds": <int, realistic story time this action takes>,\n'
        '  "ambush": <bool, true only if NPC attacks player by surprise>,\n'
        '  "narrative_text": "<your full narrative prose response — MUST respect the word limit from LENGTH instructions>",\n'
        '  "npc_thoughts": [{"name": "<full NPC name>", "thoughts": {"feeling": "...", "goal": "...", "opinion_of_player": "...", "secret_plan": "..."}}],\n'
        '  "entities": [{"name": "<full name>", "type": "NPC|LOCATION|FACTION|ITEM|EVENT", "attributes": {}}],\n'
        '  "relationships": [{"source": "<full name>", "target": "<full name>", "rel_type": "KNOWS|MET|ALLIED_WITH|GUARDS|LOCATED_IN|etc"}],\n'
        '  "world_changes": "<brief description of background world changes, or empty string if none>"\n'
        "}\n\n"
        "IMPORTANT RULES FOR THIS FORMAT:\n"
        "- narrative_text: Write your full immersive narrative here. All narrator rules still apply.\n"
        "- mode: COMBAT if action is a fight, META if player speaks out-of-character, NARRATIVE otherwise.\n"
        "- npc_thoughts: Only include NPCs that APPEAR or are MENTIONED in this scene.\n"
        "- entities/relationships: Extract named entities from your narrative. Use FULL canonical names.\n"
        "- world_changes: Only if significant time passes or major events affect the wider world. Empty string otherwise.\n"
        "- The narrative_text must be complete, immersive prose — not a summary.\n"
        "- CRITICAL: The narrative_text MUST stay within the word/token limit specified in the LENGTH instructions above. "
        "The other JSON fields (npc_thoughts, entities, etc.) do NOT count toward that limit — only narrative_text does."
    )

    async def complete_single_call(
        self,
        player_input: str,
        static_prompt: str,
        dynamic_prompt: str,
        history: list[dict],
        canonical_names: list[str] | None = None,
        max_tokens: int = 2000,
        context_window: int = 200_000,
        language: str = "en",
    ) -> dict:
        """Single LLM call that returns narrative + all side-effect data as JSON.

        Uses Anthropic prompt caching: the static part (role + tone + rules + format)
        is marked with cache_control so it's cached across actions in the same scenario.
        The dynamic part (memory, NPCs, etc.) changes every action and is not cached.
        History window is dynamically sized based on the provider's context window.
        """
        names_hint = ""
        if canonical_names:
            names_str = ", ".join(canonical_names[:40])
            names_hint = (
                f"\nKNOWN ENTITIES (use these exact names for entity extraction): [{names_str}]"
            )

        # Static part: role + tone + narrator rules + JSON format (cached per scenario)
        cached_text = static_prompt + self._SINGLE_CALL_FORMAT

        # Dynamic part: memory + NPCs + hints + entity names (changes every action)
        dynamic_text = dynamic_prompt + names_hint

        # Dynamic history window based on context budget
        system_tokens = estimate_tokens(cached_text) + estimate_tokens(dynamic_text)
        history_slice = self._dynamic_history_slice(history, context_window, system_tokens)

        # Build messages with cache_control on the static block
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": cached_text,
                        "cache_control": {"type": "ephemeral"},
                    },
                    {
                        "type": "text",
                        "text": dynamic_text,
                    },
                ],
            },
        ]
        messages.extend(history_slice)
        messages.append({"role": "user", "content": player_input})

        # Debug logging: log full single-call LLM request context
        logger.debug(
            "=== NARRATOR SINGLE-CALL REQUEST ===\n"
            "Static prompt (%d chars): %s\n"
            "Dynamic prompt (%d chars): %s\n"
            "History slice: %d messages (of %d total)\n"
            "Player input: %s\n"
            "Context window: %d, max_tokens: %d",
            len(cached_text), cached_text[:300] + ("..." if len(cached_text) > 300 else ""),
            len(dynamic_text), dynamic_text[:500] + ("..." if len(dynamic_text) > 500 else ""),
            len(history_slice), len(history),
            player_input,
            context_window, max_tokens,
        )
        if logger.isEnabledFor(logging.DEBUG):
            for idx, msg in enumerate(history_slice):
                content = msg.get("content", "")
                logger.debug(
                    "  History[%d] role=%s len=%d: %s",
                    idx, msg.get("role", "?"), len(content),
                    content[:200] + ("..." if len(content) > 200 else ""),
                )

        try:
            # User's narrative budget + 1500 tokens overhead for JSON metadata
            api_max_tokens = max_tokens + 1500
            raw = await self._llm.complete(messages=messages, max_tokens=api_max_tokens)

            # Debug logging: log full response
            logger.debug(
                "=== NARRATOR SINGLE-CALL RESPONSE ===\n"
                "Response length: %d chars\n%s",
                len(raw) if raw else 0,
                (raw or "")[:500] + ("..." if raw and len(raw) > 500 else ""),
            )

            parsed = parse_json_dict(raw)
            if parsed and parsed.get("narrative_text"):
                return parsed
            # JSON parsed but no narrative_text — log for debugging
            if parsed:
                logger.warning("Single-call: JSON parsed but missing narrative_text. Keys: %s", list(parsed.keys()))
            else:
                logger.warning(
                    "Single-call: Failed to parse JSON from LLM response (length=%d). First 500 chars: %s",
                    len(raw) if raw else 0,
                    (raw or "")[:500],
                )
        except Exception:
            logger.warning("Single-call narrative failed, using fallback", exc_info=True)

        # Fallback: return minimal structure with fallback narrative
        return {
            "mode": "NARRATIVE",
            "narrative_time_seconds": 60,
            "ambush": False,
            "narrative_text": self._fallback_narrative(player_input, language=language),
            "npc_thoughts": [],
            "entities": [],
            "relationships": [],
            "world_changes": "",
        }

    @staticmethod
    def _heuristic_detect_mode(player_input: str) -> tuple[NarrativeMode, dict]:
        text = player_input.lower()

        combat_markers = (
            "fight", "attack", "kill", "hit", "strike", "punch", "kick",
            "defend", "block", "dodge", "parry", "shoot", "stab",
            "battle", "combat", "war", "warfare", "destroy", "eliminate",
        )
        social_markers = (
            "persuade", "convince", "manipulate", "bribe", "threaten", "intimidate",
            "seduce", "negotiate", "charm", "deceive", "lie", "argue", "debate",
            "inspire", "command", "order",
        )
        wealth_markers = ("buy", "purchase", "pay", "afford", "bribe", "bid", "bet", "invest", "own", "rich")
        investigate_markers = ("investigate", "deduce", "analyze", "examine", "search", "inspect", "discover", "find", "notice", "observe")
        meta_markers = ("ooc", "meta", "as ai", "narrator", "system")

        combat = any(w in text for w in combat_markers)
        social = any(w in text for w in social_markers)
        wealth = any(w in text for w in wealth_markers)
        investigate = any(w in text for w in investigate_markers)

        if combat:
            mode = NarrativeMode.COMBAT
            action_type = "combat"
        elif social:
            action_type = "social"
        elif wealth:
            action_type = "wealth"
        elif investigate:
            action_type = "investigate"
        else:
            action_type = "default"

        mode = NarrativeMode.NARRATIVE
        if any(marker in text for marker in combat_markers):
            mode = NarrativeMode.COMBAT
        elif any(marker in text for marker in meta_markers):
            mode = NarrativeMode.META

        seconds = NarratorEngine._extract_narrative_seconds(text)
        return mode, {
            "mode": mode.value,
            "ambush": False,
            "narrative_time_seconds": seconds,
            "opponent_name": "",
            "opponent_power": 3,
            "action_type": action_type,
        }

    @staticmethod
    def _extract_narrative_seconds(text: str) -> int:
        patterns = [
            (r"(\\d+)\\s*(day|days|dia|dias)", 86400),
            (r"(\\d+)\\s*(hour|hours|hora|horas)", 3600),
            (r"(\\d+)\\s*(minute|minutes|minuto|minutos)", 60),
            (r"(\\d+)\\s*(week|weeks|semana|semanas)", 604800),
        ]
        for pattern, multiplier in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    value = int(match.group(1))
                    return max(60, value * multiplier)
                except ValueError:
                    continue
        return 60

    @staticmethod
    def _fallback_narrative(player_input: str, language: str = "en") -> str:
        _fallback_map = {
            "vi": (
                "Thế giới thay đổi theo hành động của bạn. "
                f"Bạn tiến với ý định: {player_input} "
                "Sự căng thẳng dâng cao khi hậu quả bắt đầu hiển hiện."
            ),
            "pt-br": (
                "O mundo muda em resposta à sua ação. "
                f"Você prossegue com intenção: {player_input} "
                "A tensão aumenta enquanto as consequências começam a se desenrolar."
            ),
        }
        return _fallback_map.get(
            language,
            (
                "The world shifts in response to your action. "
                f"You proceed with intent: {player_input} "
                "Tension rises as the consequences begin to unfold."
            ),
        )
