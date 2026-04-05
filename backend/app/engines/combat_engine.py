from __future__ import annotations
import random
from dataclasses import dataclass
from enum import Enum

from app.utils.json_parsing import parse_json_dict


class CombatOutcome(str, Enum):
    CRIT_FAIL = "CRIT_FAIL"
    FAIL = "FAIL"
    SUCCESS = "SUCCESS"
    CRIT_SUCCESS = "CRIT_SUCCESS"


@dataclass
class ActionEvaluation:
    coherence: float
    creativity: float
    context: float
    final_quality: float


@dataclass
class AntiGriefingResult:
    rejected: bool
    reason: str = ""


class CombatEngine:
    def __init__(self, llm):
        self._llm = llm

    async def anti_griefing_check(self, action: str, language: str = "en") -> AntiGriefingResult:
        messages = [
            {
                "role": "system",
                "content": (
                    "Analyze this combat action for griefing. Return ONLY JSON: "
                    '{"is_meta": bool, "is_physically_impossible": bool, "reason": str}. '
                    "is_meta=true ONLY if the player claims VICTORY by narrative fiat, "
                    "authorial power, or god-modding (e.g. 'I instantly kill everyone'). "
                    "is_meta=false for surrendering, retreating, yielding, or any "
                    "legitimate in-character action — these are valid combat choices. "
                    "is_physically_impossible=true if the action completely defies physics "
                    "(teleportation, omnidirectional attacks, infinite force, etc.). "
                    f"Write the reason in the same language as the player's action ({language})."
                ),
            },
            {"role": "user", "content": action},
        ]
        raw = await self._llm.complete(messages=messages, max_tokens=256)
        data = parse_json_dict(raw)
        if not data:
            return AntiGriefingResult(rejected=False)

        reason = str(data.get("reason", "")).strip()

        _rejection_reasons = {
            "pt-br": {
                "meta": "Meta-gaming: jogador tentou controlar o resultado por autoridade narrativa.",
                "physically_impossible": "Ação fisicamente impossível rejeitada.",
            },
        }
        reasons = _rejection_reasons.get(language, {})
        if data.get("is_meta"):
            return AntiGriefingResult(
                rejected=True,
                reason=reason or reasons.get("meta", "Meta-gaming: player attempted to control the outcome by narrative authority."),
            )
        if data.get("is_physically_impossible"):
            return AntiGriefingResult(
                rejected=True,
                reason=reason or reasons.get("physically_impossible", "Physically impossible action rejected."),
            )
        return AntiGriefingResult(rejected=False)

    async def evaluate_action(
        self,
        action: str,
        npc_name: str,
        npc_power: int,
        language: str = "en",
        npc_realm: str = "",
        npc_tier: str = "",
        npc_sub_tier: int = 2,
        action_type_hint: str = "",
    ) -> ActionEvaluation:
        if language in ("pt", "pt-br"):
            system = (
                "Avalie esta ação de combate em 3 dimensões (0-10 cada). "
                "Retorne APENAS JSON (todos os campos em português): "
                '{"coherence": N, "creativity": N, "context": N}. '
                "coherence: viabilidade física/lógica (um humano pode realmente fazer isso?). "
                "creativity: originalidade tática e detalhamento — NÃO é comprimento do texto. "
                "context: adequação situacional para este oponente. "
                "Uma ação curta mas criativa vence uma ação longa incoerente."
            )
        else:
            system = (
                "Score this combat action on 3 dimensions (0-10 each). "
                "Return ONLY JSON: "
                '{"coherence": N, "creativity": N, "context": N}. '
                "coherence: physical/logical feasibility (can a human actually do this?). "
                "creativity: tactical originality and detail — NOT text length. "
                "context: situational appropriateness for this opponent. "
                "A short creative action beats a long incoherent one."
            )
        _user_prompts = {
            "pt-br": {
                "action_label": "Ação",
                "opponent_label": "Oponente",
                "power_label": "poder",
            },
        }
        up = _user_prompts.get(language, {"action_label": "Action", "opponent_label": "Opponent", "power_label": "power"})
        power_desc = f"{up['power_label']} {npc_power}/10"
        if npc_realm:
            _sub_labels = {1: "Sơ Kỳ", 2: "Trung Kỳ", 3: "Hậu Kỳ"}
            sub_label = _sub_labels.get(max(1, min(3, npc_sub_tier)), "")
            tier_display = f"{npc_tier} {sub_label}".strip() if npc_tier else sub_label
            if tier_display:
                power_desc = f"{tier_display} ({npc_realm}) — {power_desc}"
            else:
                power_desc = f"{npc_realm} — {power_desc}"
        # Build axis context for the prompt
        axis_hint = ""
        if action_type_hint:
            axis_labels = {
                "physical": "physical combat power (martial strength)",
                "combat": "combat power (martial strength)",
                "social": "social influence and status",
                "manipulate": "social manipulation and influence",
                "persuade": "persuasion and social influence",
                "bribe": "financial leverage and wealth",
                "buy": "financial resources and purchasing power",
                "investigate": "investigative and analytical ability",
                "deduce": "deductive reasoning and investigation",
            }
            ax_lbl = axis_labels.get(action_type_hint.lower(), "")
            if ax_lbl:
                axis_hint = f"\nThe opponent's relevant power is their {ax_lbl}."

        messages = [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"{up['action_label']}: {action}\n"
                    f"{up['opponent_label']}: {npc_name} ({power_desc})"
                    f"{axis_hint}"
                ),
            },
        ]
        raw = await self._llm.complete(messages=messages, max_tokens=256)
        data = parse_json_dict(raw)
        if not data:
            coherence = creativity = context = 5.0
        else:
            try:
                coherence = float(data.get("coherence", 5))
                creativity = float(data.get("creativity", 5))
                context = float(data.get("context", 5))
            except (TypeError, ValueError):
                coherence = creativity = context = 5.0

        final_quality = coherence * 0.4 + creativity * 0.4 + context * 0.2
        return ActionEvaluation(
            coherence=coherence,
            creativity=creativity,
            context=context,
            final_quality=final_quality,
        )

    def roll_outcome(self, action_quality: float, npc_power: int) -> CombatOutcome:
        """
        action_quality: 0-10
        npc_power: 1-10
        Calculates outcome probability and rolls.
        """
        q = max(0.0, min(10.0, action_quality)) / 10.0   # normalize 0-1
        d = max(1, min(10, npc_power)) / 10.0             # normalize 0-1

        # Base success probability: quality drives success, difficulty opposes it
        success_prob = q * 0.65 + (1.0 - d) * 0.35

        roll = random.random()

        # Crit fail: only possible when quality is below 0.75 (action_quality < 7.5/10)
        # Both low quality AND high difficulty required
        crit_fail_threshold = max(0.0, (0.75 - q)) * d * 0.4
        # Crit success: only possible when quality is above 0.25 (action_quality > 2.5/10)
        # Requires high quality and low difficulty
        crit_success_threshold = max(0.0, (q - 0.25)) * (1.0 - d) * 0.25

        if roll < crit_fail_threshold:
            return CombatOutcome.CRIT_FAIL
        if roll > (1.0 - crit_success_threshold):
            return CombatOutcome.CRIT_SUCCESS
        if roll < success_prob:
            return CombatOutcome.SUCCESS
        return CombatOutcome.FAIL

    def roll_outcome_with_realm(
        self,
        action_quality: float,
        npc_realm: str,
        npc_tier: str,
        power_resolver,
        npc_sub_tier: int = 2,
    ) -> CombatOutcome:
        """
        Roll combat outcome using realm+tier-based difficulty.
        Uses PowerSystemResolver to compute a comparable power score.
        """
        score = power_resolver.resolve_power_score(npc_realm, npc_tier, sub_tier=npc_sub_tier, power_level=5)
        npc_power = int(round(score))
        npc_power = max(1, min(10, npc_power))
        return self.roll_outcome(action_quality, npc_power)

    # ---------------------------------------------------------------------------
    # Multi-axis combat
    # ---------------------------------------------------------------------------

    ACTION_TYPE_TO_AXIS: dict[str, list[str]] = {
        # Action type → preferred axes (first match wins)
        "physical":     ["tu_luc", "vo_dao", "combat", "primary"],
        "combat":       ["tu_luc", "vo_dao", "combat", "primary"],
        "social":       ["social_rank", "influence", "primary"],
        "manipulate":   ["influence", "social_rank", "connections", "primary"],
        "persuade":     ["influence", "social_rank", "connections", "primary"],
        "bribe":        ["wealth", "influence"],
        "buy":          ["wealth"],
        "trade":        ["wealth"],
        "investigate":  ["investigation", "forensics"],
        "deduce":       ["investigation", "intelligence"],
        "default":      ["primary"],
    }

    async def evaluate_multi_axis_action(
        self,
        action: str,
        npc_name: str,
        npc_progression: dict,       # {axis_id: {raw_value: N, ...}, ...}
        power_system,                 # PowerSystemResolver instance
        action_type_hint: str = "default",  # "combat", "social", "wealth", etc.
        language: str = "en",
    ) -> tuple[ActionEvaluation, CombatOutcome]:
        """
        Evaluate an action using multi-axis power resolution.

        action_type_hint tells the system which axis to use:
          - "combat"/"physical" → primary combat axis
          - "social"/"manipulate" → social rank / influence axis
          - "wealth"/"buy"        → wealth axis
          - "investigate"/"deduce" → investigation axis
          - "default"             → primary axis

        Returns (ActionEvaluation, CombatOutcome).
        """
        # Map action type hint → target axis id
        preferred_ids = self.ACTION_TYPE_TO_AXIS.get(
            action_type_hint.lower(), self.ACTION_TYPE_TO_AXIS["default"]
        )

        # Resolve NPC power from the appropriate axis
        npc_power = 5
        axis_name_for_prompt = "power"
        config = power_system.config if power_system else None

        if config and config.axes:
            npc_power = 5  # default
            for pid in preferred_ids:
                if pid == "primary":
                    primary = next((ax for ax in config.axes if ax.is_primary), config.axes[0])
                    pid = primary.axis_id
                    axis_name_for_prompt = primary.axis_name
                    break
                if pid in npc_progression:
                    prog = npc_progression[pid]
                    raw = prog.get("raw_value", 0) if isinstance(prog, dict) else 0
                    norm = power_system.progression_engine.raw_to_normalized(pid, raw)
                    npc_power = max(1, min(10, int(round(norm * 10))))
                    axis_name_for_prompt = next((ax.axis_name for ax in config.axes if ax.axis_id == pid), pid)
                    break

        evaluation = await self.evaluate_action(
            action=action,
            npc_name=npc_name,
            npc_power=npc_power,
            language=language,
            npc_realm="",    # not used in multi-axis
            npc_tier="",
            npc_sub_tier=2,
        )
        outcome = self.roll_outcome(evaluation.final_quality, npc_power)
        return evaluation, outcome
