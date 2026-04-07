"""
Entity extraction from narrative text.

When the narrator returns a story segment, this engine extracts which world
entities (NPCs, locations, factions, items) the narrator *explicitly mentioned*
by name. Those names are written to the event store as ENTITY_REVEALED events,
and the World Map only shows entities that have been revealed so far.

This gives the player a "discovering the world as you play" experience instead
of a spoiler-filled map on day one.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum

from app.engines.llm_router import LLMRouter

logger = logging.getLogger(__name__)


class EntityKind(str, Enum):
    NPC = "NPC"
    LOCATION = "LOCATION"
    FACTION = "FACTION"
    ITEM = "ITEM"


@dataclass
class ExtractedEntity:
    name: str
    kind: EntityKind
    context: str = ""          # sentence where the entity appeared
    discovered_in: str = ""     # narrative turn / chapter reference


@dataclass
class ExtractionResult:
    entities: list[ExtractedEntity] = field(default_factory=list)
    newly_discovered: list[ExtractedEntity] = field(default_factory=list)

    def as_payload(self) -> dict:
        return {
            "entities": [
                {
                    "name": e.name,
                    "kind": e.kind.value,
                    "context": e.context,
                    "discovered_in": e.discovered_in,
                }
                for e in self.entities
            ],
            "newly_discovered_count": len(self.newly_discovered),
        }


class EntityExtractor:
    """
    Extract world entities mentioned in narrative text.

    The extractor works in two phases:
    1. Rule-based pre-extraction: finds proper-looking names using casing patterns.
    2. LLM-assisted classification: asks the LLM to classify each candidate and
       add entities the rules missed.

    Only entities that are **newly discovered** (not in any prior ENTITY_REVEALED
    event) are returned in `newly_discovered`.
    """

    # Pattern: capitalized word sequences that look like proper names.
    # Excludes common narrative words and numbers.
    PROPER_NAME_RE = re.compile(
        r"""
        \b                                    # word boundary
        (?:
            [A-Z][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]
            (?:[A-Za-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ']{1,30})
            (?:[\s-][A-Z][a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]
            (?:[A-Za-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ']{0,30}))?
            # Optionally a second/third word in a name
        )
        \b
        """,
        re.VERBOSE | re.UNICODE,
    )

    # Words to exclude from name extraction (too common in narrative text).
    STOP_NAMES = {
        "Bạn", "Tôi", "Anh", "Chị", "Em", "Ông", "Bà", "Cô", "Chú", "Cậu",
        "Mình", "Hắn", "Họ", "Người", "Kẻ", "Gã", "Thằng", "Con",
        "Vua", "Trưởng", "Lão", "Tiên", "Thánh", "Quỷ", "Ma",
        "Năm", "Tháng", "Năm", "Ngày", "Giờ", "Phút",
        "Sáng", "Trưa", "Chiều", "Tối", "Đêm",
        "Mùa", "Xuân", "Hạ", "Thu", "Đông",
        "Bắc", "Nam", "Đông", "Tây", "Bắc",
        "Lần", "Lúc", "Nơi", "Đâu", "Khi", "Hôm", "Hôm Nay",
        "Họ", "Việc", "Điều", "Chuyện", "Chỗ", "Vấn Đề",
        "Người", "Mọi", "Tất", "Cả", "Nào", "Đó", "Này",
        "Vậy", "Nên", "Đã", "Có", "Không", "Phải",
        "First", "Second", "Third", "One", "Two", "Three",
        "Day", "Night", "Morning", "Evening", "Afternoon",
        "Chapter", "Scene", "Part", "Book", "Volume",
        "Chương", "Phần", "Mục", "Hồi", "Kỳ",
        "You", "I", "He", "She", "It", "They", "We",
        "The", "A", "An", "This", "That", "These", "Those",
        "King", "Lord", "Lady", "Master", "Mistress", "Saint", "Devil",
        "North", "South", "East", "West",
        "Spring", "Summer", "Fall", "Winter",
    }

    def __init__(self, llm: LLMRouter):
        self._llm = llm

    def _rule_based_extract(self, text: str) -> list[tuple[str, str]]:
        """
        Return a list of (name, sentence) pairs using casing rules.
        Returns only names that look like proper nouns (not narrative prose).
        """
        results: list[tuple[str, str]] = []

        # Split into sentences for context
        sentences = re.split(r'[.!?\n]+', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 5:
                continue

            # Find all proper-looking name patterns
            for match in self.PROPER_NAME_RE.finditer(sentence):
                name = match.group().strip()
                # Skip short names and stop words
                if len(name) < 2:
                    continue
                if name in self.STOP_NAMES:
                    continue
                # Skip if it's all uppercase (likely an acronym or shout)
                if name.isupper() and len(name) < 4:
                    continue
                results.append((name, sentence))

        return results

    async def extract(
        self,
        narrative_text: str,
        already_revealed: set[str],
        language: str = "en",
        turn_label: str = "",
    ) -> ExtractionResult:
        """
        Extract world entities from `narrative_text`.

        Args:
            narrative_text: the narrator's response text.
            already_revealed: lowercase names already in ENTITY_REVEALED events.
            language: "en" or "vi" (used to pick prompt).
            turn_label: e.g. "Chapter 1" or "Turn 3" — stored in discovered_in.

        Returns:
            ExtractionResult with all entities found and only newly discovered ones.
        """
        if not narrative_text or not narrative_text.strip():
            return ExtractionResult()

        candidates = self._rule_based_extract(narrative_text)
        if not candidates:
            return ExtractionResult()

        # Deduplicate by lowercase name
        seen: dict[str, tuple[str, str]] = {}
        for name, sentence in candidates:
            key = name.lower()
            if key not in seen:
                seen[key] = (name, sentence)

        # Filter out already revealed
        candidates_to_classify = [
            (name, sentence) for name, sentence in seen.values()
            if name.lower() not in already_revealed
        ]

        if not candidates_to_classify:
            return ExtractionResult()

        # Build LLM classification prompt
        names_list = "\n".join(f"- {n}" for n, _ in candidates_to_classify)
        prompt = self._build_classification_prompt(names_list, language)

        try:
            response = await self._llm.complete(prompt)
        except Exception as e:
            logger.warning("Entity extraction LLM call failed: %s", e)
            # Fallback: treat all candidates as ITEM (most generic)
            entities = [
                ExtractedEntity(name=name, kind=EntityKind.ITEM, context=sentence, discovered_in=turn_label)
                for name, sentence in candidates_to_classify
            ]
            newly = [e for e in entities if e.name.lower() not in already_revealed]
            return ExtractionResult(entities=entities, newly_discovered=newly)

        # Parse LLM response
        parsed = self._parse_classification_response(response)
        all_entities: list[ExtractedEntity] = []
        newly_discovered: list[ExtractedEntity] = []

        for name, sentence in candidates_to_classify:
            kind = parsed.get(name.lower(), EntityKind.ITEM)
            entity = ExtractedEntity(name=name, kind=kind, context=sentence, discovered_in=turn_label)
            all_entities.append(entity)
            if entity.name.lower() not in already_revealed:
                newly_discovered.append(entity)

        return ExtractionResult(entities=all_entities, newly_discovered=newly_discovered)

    def _build_classification_prompt(self, names_list: str, language: str) -> str:
        if language == "vi":
            return f"""Bạn là trợ lý phân loại thực thể trong truyện.

Danh sách tên riêng xuất hiện trong đoạn văn:
{names_list}

Với mỗi tên, phân loại thành một trong các loại sau:
- NPC: nhân vật có tên riêng (người, thần, quỷ, v.v.)
- LOCATION: địa điểm có tên riêng (thành phố, lâu đài, khu rừng, v.v.)
- FACTION: tổ chức, phe phái, giáo phái có tên riêng
- ITEM: vật phẩm có tên riêng (thanh kiếm, cuốn sách, bùa phép, v.v.)
- Bỏ QUA: không phải thực thể thế giới (chỉ là từ hoa mỹ, sự kiện chung, v.v.)

Trả lời theo định dạng JSON (mảng objects):
[
  {{"name": "Tên", "kind": "NPC|LOCATION|FACTION|ITEM|BỎ QUA", "reason": "giải thích ngắn"}}
]

Chỉ liệt kê những thứ CHẮC CHẮN là thực thể thế giới. Không bịa thêm tên không có trong danh sách."""
        else:
            return f"""You are a world entity classifier for narrative fiction.

Names found in the text:
{names_list}

Classify each into one of:
- NPC: a named character (person, god, spirit, monster, etc.)
- LOCATION: a named place (city, castle, forest, region, etc.)
- FACTION: a named organization, guild, cult, army, etc.
- ITEM: a named object (sword, book, artifact, potion, etc.)
- SKIP: not a world entity (poetic device, generic event, etc.)

Respond in JSON array:
[
  {{"name": "Name", "kind": "NPC|LOCATION|FACTION|ITEM|SKIP", "reason": "brief"}}
]

Only include entities you are CONFIDENT are world entities. Do not invent names."""

    def _parse_classification_response(self, response: str) -> dict[str, EntityKind]:
        """
        Parse the LLM response into a dict: name_lower -> EntityKind.
        Returns SKIP (None) for items to filter out.
        """
        import json as _json

        result: dict[str, EntityKind | None] = {}

        # Try to find JSON array in response
        try:
            # Strip markdown fences if present
            text = response.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:] if lines[0].startswith("```") else lines)
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()

            data = _json.loads(text)
            if not isinstance(data, list):
                return {}

            for item in data:
                if not isinstance(item, dict):
                    continue
                name = str(item.get("name", "")).strip()
                kind_str = str(item.get("kind", "")).strip().upper()
                if not name:
                    continue
                if kind_str == "SKIP" or kind_str == "BỎ QUA":
                    result[name.lower()] = None
                elif kind_str == "NPC":
                    result[name.lower()] = EntityKind.NPC
                elif kind_str == "LOCATION":
                    result[name.lower()] = EntityKind.LOCATION
                elif kind_str == "FACTION":
                    result[name.lower()] = EntityKind.FACTION
                elif kind_str == "ITEM":
                    result[name.lower()] = EntityKind.ITEM
                else:
                    result[name.lower()] = EntityKind.NPC  # default
        except Exception as e:
            logger.debug("Failed to parse entity classification response: %s", e)
            # Return empty — no classification possible
            pass

        return result  # type: ignore[return-value]
