from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime

from app.utils.json_parsing import parse_json_dict
from app.utils.lang import lang_name


@dataclass
class NpcThought:
    key: str
    value: str
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class NpcMind:
    name: str
    campaign_id: str
    thoughts: dict[str, NpcThought] = field(default_factory=dict)
    aliases: list[str] = field(default_factory=list)
    realm: str = ""     # e.g. "tu_chan" (legacy single-axis)
    tier: str = ""     # e.g. "truc_co" (legacy single-axis)
    # Multi-axis progression: {axis_id: {"stage_name": str, "stage_slug": str, "raw_value": int, "sub_stage_slug": str|null}}
    progression: dict[str, dict] = field(default_factory=dict)

    def set_thought(self, key: str, value: str):
        self.thoughts[key] = NpcThought(key=key, value=value)

    def get_thought(self, key: str) -> str | None:
        t = self.thoughts.get(key)
        return t.value if t else None

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "campaign_id": self.campaign_id,
            "aliases": self.aliases,
            "realm": self.realm,
            "tier": self.tier,
            "progression": self.progression,
            "thoughts": {
                k: {"value": t.value, "updated_at": t.updated_at}
                for k, t in self.thoughts.items()
            },
        }

    @staticmethod
    def from_dict(d: dict) -> NpcMind:
        thoughts = {}
        for k, v in d.get("thoughts", {}).items():
            thoughts[k] = NpcThought(key=k, value=v.get("value", ""), updated_at=v.get("updated_at", ""))
        mind = NpcMind(
            name=d.get("name", ""),
            campaign_id=d.get("campaign_id", ""),
            aliases=d.get("aliases", []),
            realm=d.get("realm", ""),
            tier=d.get("tier", ""),
            progression=d.get("progression", {}),
            thoughts=thoughts,
        )
        return mind

    def set_progression(self, progression: dict[str, dict]):
        """Update the multi-axis progression."""
        self.progression = progression

    def get_progression(self) -> dict[str, dict]:
        """Return the multi-axis progression dict."""
        return self.progression


class NpcMindEngine:
    def __init__(self, llm):
        self._llm = llm
        self._minds: dict[str, dict[str, NpcMind]] = {}  # campaign_id -> {npc_name -> NpcMind}

    def get_mind(self, campaign_id: str, npc_name: str) -> NpcMind | None:
        return self._minds.get(campaign_id, {}).get(npc_name.lower())

    def get_all_minds(self, campaign_id: str) -> list[NpcMind]:
        return list(self._minds.get(campaign_id, {}).values())

    def get_npc_progression(self, campaign_id: str, npc_name: str) -> dict | None:
        """Return multi-axis progression for an NPC, or None."""
        mind = self.get_mind(campaign_id, npc_name)
        return mind.progression if mind else None

    def set_npc_progression(self, campaign_id: str, npc_name: str, progression: dict[str, dict]) -> None:
        """Update multi-axis progression for an NPC."""
        mind = self.get_mind(campaign_id, npc_name)
        if mind:
            mind.set_progression(progression)

    async def set_npc_realm_tier(
        self,
        campaign_id: str,
        npc_name: str,
        realm: str,
        tier: str,
        sub_tier: int = 0,
        axis_id: str | None = None,
        stage_slug: str | None = None,
        stage_name: str | None = None,
        sub_stage_slug: str | None = None,
    ) -> None:
        """Update the realm/tier (legacy) and multi-axis progression.

        Args:
            realm: display name of the axis (e.g. "Tu Lực")
            tier: display name of the current stage (e.g. "Trúc Cơ")
            axis_id: internal axis key (e.g. "tu_luc") — used as progression key
            stage_slug: internal stage slug (e.g. "truc_co") — for lookups
            stage_name: display name of the stage (e.g. "Trúc Cơ Sơ Kỳ") — shown in UI
            sub_stage_slug: internal sub-stage slug (e.g. "so_ky")
        """
        mind = self._ensure_mind(campaign_id, npc_name)
        mind.realm = realm
        mind.tier = tier
        prog_key = axis_id if axis_id else (realm or "primary")
        display_name = stage_name if stage_name else tier
        mind.progression[prog_key] = {
            "stage_name": display_name,
            "stage_slug": stage_slug,
            "raw_value": sub_tier * 100,
            "sub_stage_slug": sub_stage_slug,
        }

    def _find_alias_match(self, campaign_id: str, name: str) -> NpcMind | None:
        """Check if name is already a known alias of an existing NPC."""
        minds = self._minds.get(campaign_id, {})
        name_lower = name.lower()
        for mind in minds.values():
            if name_lower in [a.lower() for a in mind.aliases]:
                return mind
        return None

    def _find_fuzzy_candidates(self, campaign_id: str, name: str, threshold: float = 0.6) -> list[NpcMind]:
        """Find existing NPCs with fuzzy-similar names.

        Uses two tiers:
        1. Substring containment — guaranteed candidate (e.g. "Gojo" in "Satoru Gojo")
        2. Fuzzy ratio >= threshold — probable candidate
        All candidates go through LLM confirmation.
        """
        from difflib import SequenceMatcher
        minds = self._minds.get(campaign_id, {})
        name_lower = name.lower()
        candidates = []
        seen_keys: set[str] = set()
        for key, mind in minds.items():
            if key == name_lower:
                continue
            # Tier 1: substring containment — guaranteed candidate (e.g. "Gojo" in "Satoru Gojo")
            all_names = [key] + [a.lower() for a in mind.aliases]
            substring_match = any(
                name_lower in n or n in name_lower
                for n in all_names
                if len(n) >= 2 and len(name_lower) >= 2  # avoid single-char matches
            )
            if substring_match and key not in seen_keys:
                candidates.append(mind)
                seen_keys.add(key)
                continue
            # Tier 2: fuzzy ratio
            ratio = SequenceMatcher(None, name_lower, key).ratio()
            if ratio >= threshold and key not in seen_keys:
                candidates.append(mind)
                seen_keys.add(key)
            else:
                for alias in mind.aliases:
                    if SequenceMatcher(None, name_lower, alias.lower()).ratio() >= threshold and key not in seen_keys:
                        candidates.append(mind)
                        seen_keys.add(key)
                        break
        return candidates

    async def _confirm_same_character(
        self, name_a: str, name_b: str, context_a: str = "", context_b: str = "", language: str = "en"
    ) -> bool:
        """Ask LLM if two names refer to the same character, with optional context."""
        _confirm_prompts = {
            "vi": {
                "system": (
                    "Bạn xác định xem hai tên nhân vật có chỉ cùng một nhân vật trong game RPG hay không. "
                    "Cân nhắc thứ tự tên (ví dụ 'Họ Tên' = 'Tên Họ'), biệt danh, danh hiệu và tên rút gọn. "
                    "Trả lời CHỈ 'CÓ' hoặc 'KHÔNG'."
                ),
                "question": "Hai nhân vật này có phải là cùng một người không?\nTên A: {name_a}\nTên B: {name_b}{context}",
            },
            "pt-br": {
                "system": (
                    "Você determina se dois nomes de personagens referem-se ao mesmo personagem em um RPG. "
                    "Considere variações de ordem de nomes (ex: 'Nome Sobrenome' = 'Sobrenome Nome'), "
                    "apelidos, títulos e nomes parciais. "
                    "Responda APENAS 'SIM' ou 'NÃO'."
                ),
                "question": "Estes são o mesmo personagem?\nNome A: {name_a}\nNome B: {name_b}{context}",
            },
        }
        conf = _confirm_prompts.get(language, {
            "system": (
                "You determine if two character names refer to the same character in an RPG. "
                "Consider name order variations (e.g. 'FirstName LastName' = 'LastName FirstName'), "
                "nicknames, titles, and partial names. "
                "Answer ONLY 'YES' or 'NO'."
            ),
            "question": "Are these the same character?\nName A: {name_a}\nName B: {name_b}{context}",
        })
        context_info = ""
        if context_a:
            context_info += f"\nContext for '{name_a}': {context_a}"
        if context_b:
            context_info += f"\nContext for '{name_b}': {context_b}"
        messages = [
            {"role": "system", "content": conf["system"]},
            {
                "role": "user",
                "content": conf["question"].format(name_a=name_a, name_b=name_b, context=context_info),
            },
        ]
        raw = await self._llm.complete(messages=messages, max_tokens=16)
        return raw.strip().upper().startswith("YES")

    def _ensure_mind(self, campaign_id: str, npc_name: str) -> NpcMind:
        # Strip @ prefix that narration uses for mentions (e.g. "@Yuji Itadori" → "Yuji Itadori")
        npc_name = npc_name.lstrip("@").strip()
        if campaign_id not in self._minds:
            self._minds[campaign_id] = {}
        key = npc_name.lower()
        if key not in self._minds[campaign_id]:
            alias_match = self._find_alias_match(campaign_id, npc_name)
            if alias_match:
                return alias_match
            self._minds[campaign_id][key] = NpcMind(name=npc_name, campaign_id=campaign_id)
        return self._minds[campaign_id][key]

    async def _ensure_mind_async(self, campaign_id: str, npc_name: str, language: str = "en") -> NpcMind:
        """Like _ensure_mind but with fuzzy matching + LLM confirmation."""
        # Strip @ prefix that narration uses for mentions
        npc_name = npc_name.lstrip("@").strip()
        if campaign_id not in self._minds:
            self._minds[campaign_id] = {}
        key = npc_name.lower()
        if key in self._minds[campaign_id]:
            return self._minds[campaign_id][key]

        alias_match = self._find_alias_match(campaign_id, npc_name)
        if alias_match:
            return alias_match

        candidates = self._find_fuzzy_candidates(campaign_id, npc_name)
        for candidate in candidates:
            if await self._confirm_same_character(npc_name, candidate.name, language=language):
                if npc_name.lower() not in [a.lower() for a in candidate.aliases]:
                    candidate.aliases.append(npc_name)
                if len(npc_name) > len(candidate.name):
                    old_key = candidate.name.lower()
                    candidate.name = npc_name
                    # Re-key: move entry from short name to full name
                    minds = self._minds[campaign_id]
                    if old_key in minds:
                        del minds[old_key]
                    minds[npc_name.lower()] = candidate
                return candidate

        self._minds[campaign_id][key] = NpcMind(name=npc_name, campaign_id=campaign_id)
        return self._minds[campaign_id][key]

    async def update_npc_thoughts(
        self,
        campaign_id: str,
        narrative_text: str,
        world_context: str,
        language: str = "en",
    ) -> list[NpcMind]:
        """Analyze narrative and update NPC thoughts based on recent events."""
        _NPC_MIND_PROMPTS = {
            "en": (
                "You analyze RPG narrative text and extract NPC internal thoughts. "
                "For each NPC mentioned, determine what they are privately thinking. "
                "Return ONLY valid JSON (no markdown): "
                '{"npcs": [{"name": str, "thoughts": {"feeling": str, "goal": str, '
                '"opinion_of_player": str, "secret_plan": str}}]}. '
                "Include ALL NPCs that actively appear in the narrative — speaking, acting, "
                "reacting, observing, or being directly described. Also include NPCs that are "
                "physically present in the scene even if they are silent observers — their "
                "internal reaction to what is happening matters. Do NOT skip NPCs just because "
                "others are more prominent in the scene. Aim for completeness over brevity. "
                "Do NOT include NPCs that are only mentioned by other characters or "
                "referenced in memories/flashbacks — only those physically present "
                "in the current scene. "
                "Thoughts should reflect their personality and recent events. "
                "Preserve NPC names exactly as they appear in the narrative."
            ),
            "vi": (
                "Bạn phân tích văn bản tường thuật RPG và trích xuất suy nghĩ nội tâm của NPC. "
                "Với mỗi NPC được đề cập, xác định họ đang nghĩ gì một cách riêng tư. "
                "Trả về CHỈ JSON hợp lệ (không có markdown): "
                '{"npcs": [{"name": str, "thoughts": {"feeling": str, "goal": str, '
                '"opinion_of_player": str, "secret_plan": str}}]}. '
                "Bao gồm TẤT CẢ NPC xuất hiện tích cực trong tường thuật — nói chuyện, hành động, "
                "phản ứng, quan sát, hoặc được mô tả trực tiếp. Cũng bao gồm NPC có mặt "
                "vật lý trong cảnh ngay cả khi họ là người quan sát im lặng — phản ứng nội tâm của họ "
                "với những gì đang xảy ra là quan trọng. KHÔNG bỏ qua NPC chỉ vì "
                "người khác nổi bật hơn trong cảnh. Ưu tiên sự đầy đủ hơn sự ngắn gọn. "
                "KHÔNG bao gồm NPC chỉ được nhắc đến bởi nhân vật khác hoặc "
                "tham chiếu trong ký ức/flashback — chỉ những người có mặt vật lý "
                "trong cảnh hiện tại. "
                "Suy nghĩ nên phản ánh tính cách và sự kiện gần đây của họ. "
                "Giữ nguyên tên NPC chính xác như chúng xuất hiện trong tường thuật. "
                "Viết tất cả giá trị suy nghĩ bằng tiếng Việt."
            ),
            "pt-br": (
                "Você analisa texto narrativo de RPG e extrai os pensamentos internos dos NPCs. "
                "Para cada NPC mencionado, determine o que eles estão pensando em privado. "
                "Retorne APENAS JSON válido (sem markdown): "
                '{"npcs": [{"name": str, "thoughts": {"feeling": str, "goal": str, '
                '"opinion_of_player": str, "secret_plan": str}}]}. '
                "Inclua TODOS os NPCs que aparecem ativamente na narrativa — falando, agindo, "
                "reagindo, observando, ou sendo diretamente descritos. Também inclua NPCs que "
                "estão fisicamente presentes na cena mesmo que sejam observadores silenciosos — "
                "a reação interna deles ao que está acontecendo importa. NÃO pule NPCs só porque "
                "outros são mais proeminentes na cena. Priorize completude sobre brevidade. "
                "NÃO inclua NPCs que são apenas mencionados por outros personagens ou "
                "referenciados em memórias/flashbacks — apenas aqueles fisicamente presentes "
                "na cena atual. "
                "Os pensamentos devem refletir a personalidade deles e eventos recentes. "
                "Preserve os nomes dos NPCs exatamente como aparecem na narrativa. "
                "Escreva todos os valores de pensamento em português brasileiro."
            ),
        }

        prompt_text = _NPC_MIND_PROMPTS.get(language, _NPC_MIND_PROMPTS["en"])

        messages = [
            {
                "role": "system",
                "content": prompt_text,
            },
            {
                "role": "user",
                "content": f"World context:\n{world_context}\n\nRecent narrative:\n{narrative_text}",
            },
        ]
        raw = await self._llm.complete(messages=messages, max_tokens=4096)
        updated = []
        data = parse_json_dict(raw) or {}
        for npc_data in data.get("npcs", []):
            name = npc_data.get("name", "").lstrip("@").strip()
            if not name:
                continue

            # Check for known alias first (no LLM call needed)
            alias_match = self._find_alias_match(campaign_id, name)
            if alias_match:
                mind = alias_match
            else:
                # Check fuzzy match against existing names
                candidates = self._find_fuzzy_candidates(campaign_id, name)
                merged = False
                for candidate in candidates:
                    if await self._confirm_same_character(name, candidate.name, language=language):
                        if name.lower() not in [a.lower() for a in candidate.aliases]:
                            candidate.aliases.append(name)
                        if len(name) > len(candidate.name):
                            old_key = candidate.name.lower()
                            candidate.name = name
                            # Re-key: move entry from short name to full name
                            minds = self._minds[campaign_id]
                            if old_key in minds:
                                del minds[old_key]
                            minds[name.lower()] = candidate
                        mind = candidate
                        merged = True
                        break
                if not merged:
                    mind = self._ensure_mind(campaign_id, name)

            for key, value in npc_data.get("thoughts", {}).items():
                if value:
                    mind.set_thought(key, str(value))
            updated.append(mind)
        return updated
