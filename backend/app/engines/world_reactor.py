from __future__ import annotations
from enum import Enum


class TickType(str, Enum):
    MICRO = "MICRO"
    MINOR = "MINOR"
    MODERATE = "MODERATE"
    MAJOR = "MAJOR"
    HEAVY = "HEAVY"


# Thresholds in narrative seconds
_THRESHOLDS = [
    (3600, TickType.MICRO),       # < 1 hour
    (86400, TickType.MINOR),      # 1 hour – 1 day
    (604800, TickType.MODERATE),  # 1 day – 1 week
    (2592000, TickType.MAJOR),    # 1 week – 1 month
]

_TICK_PROMPTS = {
    TickType.MINOR: {
        "en": (
            "Briefly describe NPC movements and minor news spreading through the region. "
            "Keep it to 2-3 sentences of narrative prose."
        ),
        "vi": (
            "Mô tả ngắn gọn sự di chuyển của NPC và tin đồn lan truyền khắp vùng. "
            "Giữ 2-3 câu văn tường thuật."
        ),
        "pt-br": (
            "Descreva brevemente movimentos de NPCs e pequenas notícias se espalhando pela região. "
            "Mantenha 2-3 frases de prosa narrativa."
        ),
    },
    TickType.MODERATE: {
        "en": (
            "Describe faction decisions, spreading rumors, and moderate world shifts. "
            "3-4 sentences of narrative prose."
        ),
        "vi": (
            "Mô tả các quyết định phe phái, tin đồn lan truyền và những thay đổi vừa phải trên thế giới. "
            "3-4 câu văn tường thuật."
        ),
        "pt-br": (
            "Descreva decisões de facções, rumores se espalhando e mudanças moderadas no mundo. "
            "3-4 frases de prosa narrativa."
        ),
    },
    TickType.MAJOR: {
        "en": (
            "Describe significant political shifts, important NPC life events, and notable world changes. "
            "4-5 sentences of narrative prose."
        ),
        "vi": (
            "Mô tả những thay đổi chính trị quan trọng, sự kiện đời tư của NPC và những thay đổi đáng chú ý trên thế giới. "
            "4-5 câu văn tường thuật."
        ),
        "pt-br": (
            "Descreva mudanças políticas significativas, eventos importantes na vida de NPCs e mudanças notáveis no mundo. "
            "4-5 frases de prosa narrativa."
        ),
    },
    TickType.HEAVY: {
        "en": (
            "Describe major world transformations: wars begun or ended, alliances forged, deaths of notable figures, "
            "and sweeping changes to the political landscape. 5-6 sentences of narrative prose."
        ),
        "vi": (
            "Mô tả những biến đổi lớn của thế giới: chiến tranh bắt đầu hoặc kết thúc, liên minh được hình thành, "
            "cái chết của những nhân vật quan trọng và những thay đổi toàn diện trên chính trị. "
            "5-6 câu văn tường thuật."
        ),
        "pt-br": (
            "Descreva transformações mundiais maiores: guerras iniciadas ou terminadas, alianças forjadas, "
            "mortes de figuras notáveis e mudanças abrangentes na paisagem política. "
            "5-6 frases de prosa narrativa."
        ),
    },
}


def _get_tick_prompt(tick_type: TickType, language: str) -> str:
    """Get tick prompt localized for language."""
    prompt_map = _TICK_PROMPTS.get(tick_type, {})
    return prompt_map.get(language, prompt_map.get("en", ""))


from app.utils.lang import lang_name


class WorldReactor:
    def __init__(self, llm):
        self._llm = llm

    def classify_tick(self, narrative_seconds: int) -> TickType:
        for threshold, tick_type in _THRESHOLDS:
            if narrative_seconds < threshold:
                return tick_type
        return TickType.HEAVY

    async def process_tick(
        self,
        campaign_id: str,
        narrative_seconds: int,
        world_context: str,
        language: str = "en",
    ) -> str:
        tick_type = self.classify_tick(narrative_seconds)
        if tick_type == TickType.MICRO:
            return ""

        prompt_instruction = _get_tick_prompt(tick_type, language)
        hours = narrative_seconds // 3600
        time_desc = (
            f"{narrative_seconds // 60} minutes" if narrative_seconds < 3600
            else f"{hours} hours" if hours < 24
            else f"{hours // 24} days"
        )

        lang_hint = ""
        if language and language != "en":
            lang_hint = f" Write your response in {lang_name(language)}."

        messages = [
            {
                "role": "system",
                "content": (
                    f"You are a world simulation engine for an AI RPG. {prompt_instruction} "
                    "Write only world changes as narrative facts. No player perspective. "
                    f"No dialogue. Present tense.{lang_hint}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"World context:\n{world_context}\n\n"
                    f"Narrative time elapsed: {time_desc}. "
                    "What changes in the world during this time?"
                ),
            },
        ]
        try:
            return await self._llm.complete(messages=messages, max_tokens=512)
        except Exception:
            return self._fallback_world_change(tick_type, time_desc, language=language)

    @staticmethod
    def _fallback_world_change(tick_type: TickType, time_desc: str, language: str = "en") -> str:
        _fallbacks = {
            "vi": {
                TickType.MINOR: "Qua {time}, tin đồn lan truyền và các đội tuần tra thay đổi nhẹ khắp vùng.",
                TickType.MODERATE: "Qua {time}, các phe phái thay đổi nguồn lực và lòng trung thành địa phương bắt đầu chuyển dịch.",
                TickType.MAJOR: "Qua {time}, áp lực chính trị tái định hình liên minh và các lãnh đạo chủ chốt điều chỉnh kế hoạch.",
            },
            "pt-br": {
                TickType.MINOR: "Ao longo de {time}, rumores se espalham e padrões de patrulha mudam sutilmente na região.",
                TickType.MODERATE: "Ao longo de {time}, facções reposicionam recursos e lealdades locais começam a mudar.",
                TickType.MAJOR: "Durante {time}, pressão política remodela alianças e líderes importantes ajustam seus planos.",
            },
        }
        lang_fallbacks = _fallbacks.get(language, {})
        fallback = lang_fallbacks.get(
            tick_type,
            {
                TickType.MINOR: "Over {time}, rumors spread and patrol patterns subtly change across the region.",
                TickType.MODERATE: "Across {time}, factions reposition resources and local loyalties begin to shift.",
                TickType.MAJOR: "During {time}, political pressure reshapes alliances and key leaders adjust their plans.",
            }.get(tick_type, ""),
        )
        return fallback.replace("{time}", time_desc) if "{time}" in fallback else f"{fallback} {time_desc}."
