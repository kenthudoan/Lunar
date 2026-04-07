"""
Choice Generator Engine — AI-generated contextual action suggestions.

Design: 9 fixed-category choices, 1 LLM call, diversity guarantee.
Each of the 9 slots is pre-assigned to a distinct narrative archetype,
ensuring every result is maximally different from the others.
"""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field

from app.utils.json_parsing import parse_json_dict

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------
# 9 Fixed Categories — each must appear exactly once per call
# --------------------------------------------------------------------
CATEGORIES = [
    {
        "id": "COMBAT",
        "icon": "⚔",
        "label": {"en": "Combat / Physical", "vi": "Chiến đấu / Hành động", "pt-br": "Combate / Físico"},
        "description": {
            "en": "Attack, defend, flee, or use physical force.",
            "vi": "Tấn công, phòng thủ, bỏ chạy, hoặc dùng vũ lực.",
            "pt-br": "Atacar, defender, fugir ou usar força física.",
        },
    },
    {
        "id": "DIALOGUE",
        "icon": "💬",
        "label": {"en": "Dialogue / Negotiate", "vi": "Đối thoại / Thương lượng", "pt-br": "Diálogo / Negociar"},
        "description": {
            "en": "Talk, persuade, lie, ask, or charm your way through.",
            "vi": "Nói chuyện, thuyết phục, nói dối, hỏi hanh, hoặc dụ dỗ.",
            "pt-br": "Conversar, persuadir, mentir, perguntar ou usar charme.",
        },
    },
    {
        "id": "INVESTIGATE",
        "icon": "🔍",
        "label": {"en": "Investigate / Observe", "vi": "Điều tra / Quan sát", "pt-br": "Investigar / Observar"},
        "description": {
            "en": "Search, examine, gather clues, look for details.",
            "vi": "Tìm kiếm, khám xét, thu thập manh mối, nhìn kỹ chi tiết.",
            "pt-br": "Procurar, examinar, coletar pistas, observar detalhes.",
        },
    },
    {
        "id": "EVADE",
        "icon": "🏃",
        "label": {"en": "Evade / Avoid", "vi": "Né tránh / Tránh né", "pt-br": "Evadir / Evitar"},
        "description": {
            "en": "Hide, sneak away, postpone, or dodge the situation.",
            "vi": "Trốn, lén đi, hoãn lại, hoặc lách khỏi tình huống.",
            "pt-br": "Esconder-se, sair às escondidas, adiar ou esquivar da situação.",
        },
    },
    {
        "id": "ITEM",
        "icon": "📦",
        "label": {"en": "Use Item / Resource", "vi": "Dùng vật phẩm / Tài nguyên", "pt-br": "Usar Item / Recurso"},
        "description": {
            "en": "Use an object, spend money, trade, or access what you have.",
            "vi": "Dùng đồ vật, tiêu tiền, trao đổi, hoặc sử dụng những gì bạn có.",
            "pt-br": "Usar um objeto, gastar dinheiro, negociar ou acessar o que tem.",
        },
    },
    {
        "id": "SOCIAL",
        "icon": "👥",
        "label": {"en": "Socialize / Connect", "vi": "Giao lưu / Kết nối", "pt-br": "Socializar / Conectar"},
        "description": {
            "en": "Make a friend, ask for help, build a relationship.",
            "vi": "Kết bạn, nhờ vả, xây dựng mối quan hệ.",
            "pt-br": "Fazer amigos, pedir ajuda, construir um relacionamento.",
        },
    },
    {
        "id": "ENVIRONMENT",
        "icon": "🔧",
        "label": {"en": "Interact with Environment", "vi": "Can thiệp môi trường", "pt-br": "Interagir com o Ambiente"},
        "description": {
            "en": "Break, fix, build, push, climb, or alter the surroundings.",
            "vi": "Phá vỡ, sửa chữa, xây dựng, đẩy, leo trèo, hoặc thay đổi xung quanh.",
            "pt-br": "Quebrar, consertar, construir, empurrar, subir ou alterar o ambiente.",
        },
    },
    {
        "id": "STEALTH",
        "icon": "🤫",
        "label": {"en": "Stealth / Secretive", "vi": "Lén lút / Bí mật", "pt-br": "Furtividade / Secreto"},
        "description": {
            "en": "Sneak, eavesdrop, pickpocket, sabotage, or spy.",
            "vi": "Lén lút, nghe lén, móc túi, phá hoại, hoặc do thám.",
            "pt-br": "Esgueirar-se, espionar, furtar, sabotar ou bisbilhotar.",
        },
    },
    {
        "id": "EMOTION",
        "icon": "😢",
        "label": {"en": "Emotional Reaction", "vi": "Phản ứng cảm xúc", "pt-br": "Reação Emocional"},
        "description": {
            "en": "Threaten, cry, laugh, beg, intimidate, or show vulnerability.",
            "vi": "Đe dọa, khóc, cười, van xin, hù dọa, hoặc tỏ ra yếu đuối.",
            "pt-br": "Ameaçar, chorar, rir, implorar, intimidar ou mostrar vulnerabilidade.",
        },
    },
]


def _categories_for_language(language: str) -> list[dict]:
    lang = language if language in {"en", "vi", "pt-br"} else "en"
    return [
        {
            "slot": i + 1,
            "id": cat["id"],
            "icon": cat["icon"],
            "label": cat["label"][lang],
            "description": cat["description"][lang],
        }
        for i, cat in enumerate(CATEGORIES)
    ]


# --------------------------------------------------------------------
# Dataclasses
# --------------------------------------------------------------------

@dataclass
class Choice:
    """Một lựa chọn hành động cho người chơi."""
    slot: int          # 1-9, fixed category slot
    category_id: str  # COMBAT, DIALOGUE, INVESTIGATE, etc.
    icon: str          # emoji
    label: str         # tiêu đề ngắn gọn, hành động cụ thể trong scene hiện tại
    hint: str          # 1 câu giải thích ngắn tại sao nên chọn


@dataclass
class ChoiceSet:
    """Bộ 9 lựa chọn cho người chơi."""
    choices: list[Choice]
    generated_at_turn: int
    generated_at_narrative_time: int


# --------------------------------------------------------------------
# Prompt builder
# --------------------------------------------------------------------

def _build_system_prompt(language: str) -> str:
    lang = language if language in {"en", "vi", "pt-br"} else "en"

    lang_note = {
        "en": "Write all text in English.",
        "vi": "Viết tất cả bằng tiếng Việt.",
        "pt-br": "Escreva todo o texto em português brasileiro.",
    }[lang]

    return (
        "You are a narrative action suggestion engine for an interactive RPG.\n"
        "After the narrator describes what happened, generate exactly 9 action suggestions "
        "— one for each of the 9 fixed categories listed below.\n\n"
        f"{lang_note}\n\n"
        "IMPORTANT RULES:\n"
        "- You MUST produce exactly ONE suggestion per category (all 9 slots are required)\n"
        "- Each label must be a SHORT, SPECIFIC action appropriate to the current scene "
        "(5-12 words max), not a generic category name\n"
        "- The hint must be ONE sentence (under 60 chars) explaining why this choice "
        "matters right now in the story\n"
        "- Every slot must be filled — do NOT skip any slot\n"
        "- Each action must be meaningfully different from the others\n"
        "- Actions must feel like natural, compelling next steps in THIS EXACT scene\n"
        "- Return ONLY valid JSON: "
        '{"choices": [{"slot": 1, "label": "...", "hint": "..."}, ...]}\n'
        "Do not include any text outside the JSON."
    )


def _build_user_prompt(
    history: list[dict],
    narrative_response: str,
    language: str,
) -> str:
    lang = language if language in {"en", "vi", "pt-br"} else "en"
    cats = _categories_for_language(language)

    history_note = {
        "en": "Recent conversation (for context):\n",
        "vi": "Cuộc trò chuyện gần đây (để hiểu ngữ cảnh):\n",
        "pt-br": "Conversa recente (para contexto):\n",
    }[lang]

    parts = [f"{'='*60}\n"]
    parts.append(history_note)
    for msg in (history[-5:] if history else []):
        role = msg.get("role", "?")
        content = msg.get("content", "")
        if len(content) > 400:
            content = content[:400] + "..."
        parts.append(f"[{role}] {content}\n")

    parts.append(f"\n{'='*60}\n")
    parts.append("Latest narrator response:\n")
    parts.append(f"{'-'*40}\n")
    parts.append(f"{narrative_response}\n")
    parts.append(f"{'-'*40}\n\n")

    parts.append("Your task: Fill all 9 slots with a SPECIFIC action for each category.\n\n")
    parts.append("Slots:\n")
    for cat in cats:
        parts.append(
            f"  Slot {cat['slot']} [{cat['id']}] {cat['icon']} — {cat['label']}\n"
            f"    → {cat['description']}\n"
        )

    parts.append(
        f"\n{'-'*60}\n"
        "Output ONLY JSON with exactly 9 choices, one per slot. "
        "Do not add any text outside the JSON block.\n"
    )

    return "".join(parts)


# --------------------------------------------------------------------
# Choice Generator
# --------------------------------------------------------------------

class ChoiceGenerator:
    """
    Sinh 9 lựa chọn hành động theo 9 fixed categories, 1 LLM call duy nhất.

    Mỗi slot cố định 1 category → đảm bảo diversity tuyệt đối.
    Cache theo context hash để tránh gọi lại khi context lặp.
    """

    def __init__(self, llm):
        self._llm = llm
        self._cache: dict[str, ChoiceSet] = {}
        self._max_cache = 50

    async def generate(
        self,
        history: list[dict],
        narrative_response: str,
        turn_count: int,
        narrative_time_seconds: int,
        language: str = "en",
        model: str | None = None,
    ) -> ChoiceSet | None:
        """
        Sinh 9 lựa chọn — một cho mỗi fixed category.
        """
        # --- Cache check ---
        cache_key = self._hash_context(history, narrative_response)
        cached = self._cache.get(cache_key)
        if cached and (turn_count - cached.generated_at_turn) <= 2:
            logger.debug("Choice cache HIT %s", cache_key[:8])
            return cached

        # --- Build prompt ---
        system_prompt = _build_system_prompt(language)
        user_prompt = _build_user_prompt(history, narrative_response, language)
        cats = _categories_for_language(language)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # --- LLM call ---
        call_kwargs = {"messages": messages, "max_tokens": 1200}
        if model:
            call_kwargs["model"] = model

        try:
            raw = await self._llm.complete(**call_kwargs)
        except Exception:
            logger.exception("Choice generation LLM call failed")
            return None

        # --- Parse ---
        data = parse_json_dict(raw)
        if not data or "choices" not in data:
            logger.warning("Choice generation returned unparseable response: %s", raw[:300])
            return None

        choices_raw = data["choices"]
        if not isinstance(choices_raw, list):
            logger.warning("Choice generation: choices field is not a list")
            return None

        # Build lookup: slot → raw data
        raw_by_slot: dict[int, dict] = {}
        for item in choices_raw:
            if not isinstance(item, dict):
                continue
            slot = int(item.get("slot", 0))
            if 1 <= slot <= 9:
                raw_by_slot[slot] = item

        # Build Choice list — one per slot
        choices: list[Choice] = []
        for cat in cats:
            slot = cat["slot"]
            raw_item = raw_by_slot.get(slot, {})

            # Guard: raw_item must be a dict — if the JSON parse was partial/malformed,
            # raw_item could be a string or other type. Fall back to default.
            if not isinstance(raw_item, dict):
                raw_item = {}

            label = str(raw_item.get("label", cat["label"])).strip()

            # hint default: safely resolve category description (cat["description"]
            # is a dict like {"en": "...", "vi": "..."})
            _cat_desc = cat["description"]
            _hint_default = ""
            if isinstance(_cat_desc, dict):
                _hint_default = _cat_desc.get(language) or _cat_desc.get("en", "")
            hint = str(raw_item.get("hint", _hint_default)).strip()

            if not label:
                label = cat["label"]

            choices.append(Choice(
                slot=slot,
                category_id=cat["id"],
                icon=cat["icon"],
                label=label,
                hint=hint,
            ))

        result = ChoiceSet(
            choices=choices,
            generated_at_turn=turn_count,
            generated_at_narrative_time=narrative_time_seconds,
        )

        # --- Cache ---
        self._prune_cache()
        self._cache[cache_key] = result
        logger.debug("ChoiceSet cached (%d choices) key=%s", len(choices), cache_key[:8])
        return result

    # ------------------------------------------------------------------
    # Utilities
    # ------------------------------------------------------------------

    def _hash_context(self, history: list[dict], narrative_response: str) -> str:
        parts = []
        for msg in (history[-3:] if history else []):
            parts.append(msg.get("content", "")[:200])
        parts.append((narrative_response or "")[:500])
        return hashlib.sha256("||".join(parts).encode("utf-8")).hexdigest()

    def _prune_cache(self) -> None:
        if len(self._cache) >= self._max_cache:
            keys = list(self._cache.keys())[: self._max_cache // 2]
            for k in keys:
                del self._cache[k]

    def invalidate_cache(self) -> None:
        self._cache.clear()

    def get_current_choices(self) -> ChoiceSet | None:
        if not self._cache:
            return None
        return list(self._cache.values())[-1]

    def is_stale(self, choice_set: ChoiceSet, current_turn: int) -> bool:
        """Return True when the cached choice set was generated for a different turn."""
        return choice_set.generated_at_turn != current_turn
