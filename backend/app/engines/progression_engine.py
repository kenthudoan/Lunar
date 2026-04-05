"""
ProgressionEngine — core logic for multi-axis power system calculations.

Handles:
- Raw value ↔ normalized value ↔ display string conversion
- Single-axis comparisons
- Cross-axis weighted comparisons
- Stage gating / threshold checks
- XP progress tracking within a stage
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from app.engines.power_system_models import (
    PowerSystemConfig,
    PowerAxis,
    StageStyle,
    axis_to_dict,
)

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stage-breakpoint calculator
# ---------------------------------------------------------------------------

@dataclass
class StageBreakpoint:
    """One contiguous band of raw values that maps to a single stage."""
    axis_id: str
    stage_index: int       # which stage this band maps to
    sub_stage_slug: str | None
    raw_min: int           # inclusive
    raw_max: int           # inclusive

    def contains(self, raw: int) -> bool:
        return self.raw_min <= raw <= self.raw_max


def build_breakpoints(axis: PowerAxis) -> list[StageBreakpoint]:
    """
    Build a flat list of raw-value bands for every stage + sub-stage.
    Bands are contiguous and non-overlapping.

    Example for cultivation axis with 8 stages, 3 sub-stages each:
      [0-12] → stage 0 (Sơ),  [13-25] → stage 0 (Trung),  [26-37] → stage 0 (Hậu)
      [38-50] → stage 1 (Sơ), ...
    """
    if not axis.stages:
        return []

    total_bands = sum(
        len(s.sub_stages) if s.sub_stages else 1
        for s in axis.stages
    )
    if total_bands == 0:
        total_bands = len(axis.stages)

    band_size = axis.normalization_max / total_bands
    breakpoints: list[StageBreakpoint] = []

    for stage_idx, stage in enumerate(axis.stages):
        if stage.sub_stages:
            for sub in stage.sub_stages:
                offset = len(breakpoints)
                raw_min = int(offset * band_size)
                raw_max = int((offset + 1) * band_size) - 1
                breakpoints.append(StageBreakpoint(
                    axis_id=axis.axis_id,
                    stage_index=stage_idx,
                    sub_stage_slug=sub.key,
                    raw_min=raw_min,
                    raw_max=raw_max,
                ))
        else:
            # No sub-stages: entire stage occupies its proportional band
            offset = len(breakpoints)
            raw_min = int(offset * band_size)
            raw_max = int((offset + 1) * band_size) - 1
            breakpoints.append(StageBreakpoint(
                axis_id=axis.axis_id,
                stage_index=stage_idx,
                sub_stage_slug=None,
                raw_min=raw_min,
                raw_max=raw_max,
            ))

    return breakpoints


# ---------------------------------------------------------------------------
# ProgressionEngine
# ---------------------------------------------------------------------------

class ProgressionEngine:
    """
    Core calculator for a locked PowerSystemConfig.
    All instances are stateless after construction — pass runtime state
    (dict[str, CharacterProgression]) as needed.
    """

    def __init__(self, config: PowerSystemConfig):
        self.config = config
        self._axis_map: dict[str, PowerAxis] = {ax.axis_id: ax for ax in config.axes}
        self._breakpoints: dict[str, list[StageBreakpoint]] = {
            ax.axis_id: build_breakpoints(ax) for ax in config.axes
        }

    # ------------------------------------------------------------------
    # Axis queries
    # ------------------------------------------------------------------

    def get_primary_axis(self) -> PowerAxis | None:
        for ax in self.config.axes:
            if ax.is_primary:
                return ax
        return self.config.axes[0] if self.config.axes else None

    def get_visible_axes(self) -> list[PowerAxis]:
        return [ax for ax in self.config.axes if ax.visible]

    def get_axis(self, axis_id: str) -> PowerAxis | None:
        return self._axis_map.get(axis_id)

    def get_all_axes(self) -> list[PowerAxis]:
        return list(self.config.axes)

    # ------------------------------------------------------------------
    # Raw ↔ Normalized conversion
    # ------------------------------------------------------------------

    def raw_to_normalized(self, axis_id: str, raw_value: int) -> float:
        """
        Convert internal raw value (0-normalization_max) to display scale (0-display_scale).
        Used for cross-axis comparisons.
        """
        ax = self._axis_map.get(axis_id)
        if not ax:
            return raw_value / 10.0  # fallback 0-100 → 0-10
        return (raw_value / ax.normalization_max) * ax.display_scale

    def normalized_to_raw(self, axis_id: str, normalized: float) -> int:
        """Inverse of raw_to_normalized. Rarely needed at runtime."""
        ax = self._axis_map.get(axis_id)
        if not ax:
            return int(normalized * 10)
        return int((normalized / ax.display_scale) * ax.normalization_max)

    def raw_to_display(self, axis_id: str, raw_value: int) -> str:
        """Convert raw value → human-readable stage string."""
        ax = self._axis_map.get(axis_id)
        if not ax:
            return str(raw_value)

        bp = self._breakpoints.get(axis_id, [])
        for stage_bp in bp:
            if stage_bp.contains(raw_value):
                return self._stage_display(ax, stage_bp.stage_index, stage_bp.sub_stage_slug)
        # Edge case: max value
        if bp:
            last = bp[-1]
            return self._stage_display(ax, last.stage_index, last.sub_stage_slug)
        return str(raw_value)

    def _stage_display(self, axis: PowerAxis, stage_idx: int, sub_key: str | None) -> str:
        if stage_idx < 0 or stage_idx >= len(axis.stages):
            return "?"
        stage = axis.stages[stage_idx]
        if sub_key and stage.sub_stages:
            for ss in stage.sub_stages:
                if ss.key == sub_key:
                    return f"{stage.name} {ss.name}"
        return stage.name

    def raw_to_stage_index(self, axis_id: str, raw_value: int) -> int:
        """Convert raw value → 0-based stage index (first matching breakpoint)."""
        bp_list = self._breakpoints.get(axis_id, [])
        for bp in bp_list:
            if bp.contains(raw_value):
                return bp.stage_index
        if bp_list:
            return bp_list[-1].stage_index
        return 0

    def raw_to_sub_stage_slug(self, axis_id: str, raw_value: int) -> str | None:
        """Convert raw value → sub-stage slug (e.g. 'so_ky') or None."""
        bp_list = self._breakpoints.get(axis_id, [])
        for bp in bp_list:
            if bp.contains(raw_value):
                return bp.sub_stage_slug
        return None

    # ------------------------------------------------------------------
    # Breakpoint / threshold helpers
    # ------------------------------------------------------------------

    def get_stage_breakpoint(self, axis_id: str, stage_index: int) -> StageBreakpoint | None:
        """Get the raw-value band for a specific stage (ignoring sub-stages)."""
        bp_list = self._breakpoints.get(axis_id, [])
        for bp in bp_list:
            if bp.stage_index == stage_index:
                return bp
        return None

    def get_threshold_raw(self, axis_id: str, stage_index: int) -> int:
        """
        Minimum raw value needed to ENTER a given stage.
        Used for gating checks (e.g. "you need raw >= 50 to enter Kết Đan").
        """
        bp = self.get_stage_breakpoint(axis_id, stage_index)
        if bp:
            return bp.raw_min
        ax = self._axis_map.get(axis_id)
        if not ax or not ax.stages:
            return 0
        if stage_index <= 0:
            return 0
        if stage_index >= len(ax.stages):
            return ax.normalization_max
        # Proportional fallback
        band_size = ax.normalization_max / len(ax.stages)
        return int(band_size * stage_index)

    def get_xp_progress(self, axis_id: str, raw_value: int) -> float:
        """
        Return 0.0-1.0 progress within the current stage band.
        Used for progress bars in the UI.
        """
        bp_list = self._breakpoints.get(axis_id, [])
        for bp in bp_list:
            if bp.contains(raw_value):
                band_size = bp.raw_max - bp.raw_min + 1
                if band_size <= 1:
                    return 1.0
                offset = raw_value - bp.raw_min
                return round(offset / (band_size - 1), 3)
        return 0.0

    # ------------------------------------------------------------------
    # Stage advancement
    # ------------------------------------------------------------------

    def advance_sub_stage(self, axis_id: str, raw_value: int) -> tuple[int, str | None]:
        """
        Given a raw value, determine the NEXT sub_stage (for UI "advance" button or narrative).
        Returns (stage_index, sub_stage_slug or None).
        """
        bp_list = self._breakpoints.get(axis_id, [])
        current_bp = None
        for bp in bp_list:
            if bp.contains(raw_value):
                current_bp = bp
                break
        if not current_bp:
            return 0, None
        idx = bp_list.index(current_bp)
        if idx + 1 < len(bp_list):
            next_bp = bp_list[idx + 1]
            return next_bp.stage_index, next_bp.sub_stage_slug
        return current_bp.stage_index, current_bp.sub_stage_slug

    # ------------------------------------------------------------------
    # Comparisons
    # ------------------------------------------------------------------

    def compare_single_axis(self, axis_id: str, raw_a: int, raw_b: int) -> int:
        """
        Compare two raw values on the same axis.
        Returns: -1 (a < b), 0 (≈ equal), 1 (a > b)
        Threshold: 0.5 on the normalized scale.
        """
        na = self.raw_to_normalized(axis_id, raw_a)
        nb = self.raw_to_normalized(axis_id, raw_b)
        diff = na - nb
        if diff < -0.5:
            return -1
        if diff > 0.5:
            return 1
        return 0

    def compare_cross_axis(
        self,
        progressions_a: dict[str, int],   # axis_id → raw_value
        progressions_b: dict[str, int],  # axis_id → raw_value
    ) -> float:
        """
        Weighted comparison across all visible axes.
        Returns a net score: positive = a is stronger, negative = b is stronger.
        Magnitude indicates how much stronger (in display-scale units).

        Formula: sum((norm_a - norm_b) * weight) / sum(weights)
        """
        visible = self.get_visible_axes()
        if not visible:
            return 0.0

        total_weight = 0.0
        weighted_diff = 0.0

        for ax in visible:
            raw_a = progressions_a.get(ax.axis_id, 0)
            raw_b = progressions_b.get(ax.axis_id, 0)
            norm_a = self.raw_to_normalized(ax.axis_id, raw_a)
            norm_b = self.raw_to_normalized(ax.axis_id, raw_b)
            diff = norm_a - norm_b
            weighted_diff += diff * ax.weight
            total_weight += ax.weight

        if total_weight == 0:
            return 0.0
        return round(weighted_diff / total_weight, 2)

    def dominates(
        self,
        progressions_a: dict[str, int],
        progressions_b: dict[str, int],
        margin: float = 0.5,
    ) -> bool:
        """
        Returns True if A is meaningfully stronger than B across all visible axes.
        """
        return self.compare_cross_axis(progressions_a, progressions_b) > margin

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Serialize config for API responses."""
        return {
            "id": self.config.id,
            "power_system_name": self.config.power_system_name,
            "is_locked": self.config.is_locked,
            "axes": [axis_to_dict(ax) for ax in self.config.axes],
        }
