from __future__ import annotations

from app.db.scenario_store import ScenarioStore, StoryCard, StoryCardType
from app.utils.json_parsing import parse_json_list
from app.utils.lang import lang_name


class ScenarioService:
    def __init__(self, store: ScenarioStore, llm):
        self.store = store
        self._llm = llm

    async def extract_lore_to_cards(
        self,
        scenario_id: str,
        lore_text: str,
        language: str = "en",
    ) -> list[StoryCard]:
        if not lore_text.strip():
            return []

        lang_hint = ""
        if language and language != "en":
            lang_name_val = lang_name(language)
            lang_hint = f" IMPORTANT: The lore text is in {lang_name_val}. Preserve all names in their original language and write ALL content fields (personality, description, goals, secret, significance) in {lang_name_val}."

        messages = [
            {
                "role": "system",
                "content": (
                    "Extract all named entities from this RPG world lore text. "
                    "Return ONLY a valid JSON array (no markdown): "
                    '[{"type": "NPC|LOCATION|FACTION|ITEM", "name": str, "content": {...}}]. '
                    "For NPC content include: personality, realm (e.g. 'Tu Chân' or 'Ma Đạo' — use DISPLAY NAME, not internal key), tier (e.g. 'Trúc Cơ' — DISPLAY NAME), "
                    "power_level (1-10, derived from realm+tier), secret. "
                    "For LOCATION content include: description. "
                    "For FACTION content include: goals, realm (DISPLAY NAME). "
                    "For ITEM content include: description, significance. "
                    "CRITICAL: All text values must be human-readable DISPLAY NAMES in the world's language (e.g. 'Vũ Khí', 'Núi', 'Môn Phái'). "
                    "Do NOT use underscore_separated keys like 'vu_khi', 'nui', 'tu_chan' as values."
                    + lang_hint
                ),
            },
            {"role": "user", "content": lore_text},
        ]
        raw = await self._llm.complete(messages=messages, max_tokens=2048)
        entities = parse_json_list(raw)
        if entities is None:
            return []

        cards: list[StoryCard] = []
        for entity in entities:
            try:
                card_type = StoryCardType(entity["type"])
                card = self.store.add_story_card(
                    scenario_id=scenario_id,
                    card_type=card_type,
                    name=entity["name"],
                    content=entity.get("content", {}),
                )
                cards.append(card)
            except (KeyError, ValueError, TypeError):
                continue

        return cards
