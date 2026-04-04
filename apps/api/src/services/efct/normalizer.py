"""
EFCT Score Normalizer — Phase 2 of the calculation pipeline.

Converts raw indicator values to 0–100 scores using:
  1. Min-Max normalization
  2. Direction inversion (lower_better → invert)
  3. Target-based scoring (score = 100×(1-|val-target|/target))

All functions are pure (no DB access) and fully synchronous.
"""
from dataclasses import dataclass


@dataclass
class NormalizationConfig:
    min_value: float
    max_value: float
    scoring_direction: str   # higher_better | lower_better | target
    target_value: float | None = None


def normalize(
    value: float,
    cfg: NormalizationConfig,
) -> float:
    """
    Normalize a raw indicator value to a 0–100 score.

    Clamps the result to [0, 100].
    Raises ValueError if config is inconsistent (e.g. target=None for target direction).
    """
    if cfg.scoring_direction == "target":
        return _target_score(value, cfg)
    return _minmax_score(value, cfg)


def _minmax_score(value: float, cfg: NormalizationConfig) -> float:
    span = cfg.max_value - cfg.min_value
    if span == 0:
        return 50.0  # Undefined range → neutral score

    score = (value - cfg.min_value) / span * 100.0
    score = _clamp(score)

    if cfg.scoring_direction == "lower_better":
        score = 100.0 - score

    return round(score, 4)


def _target_score(value: float, cfg: NormalizationConfig) -> float:
    if cfg.target_value is None or cfg.target_value == 0:
        raise ValueError("target_value must be non-zero for 'target' scoring direction")

    deviation = abs(value - cfg.target_value) / cfg.target_value
    score = max(0.0, 100.0 * (1.0 - deviation))
    return round(score, 4)


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def weighted_average(scores: dict[str, float], weights: dict[str, float]) -> float:
    """
    Compute weighted average of scores dict using weights dict.
    Skips categories missing from scores (not counted in denominator).
    """
    total_weight = 0.0
    weighted_sum = 0.0
    for key, weight in weights.items():
        if key in scores and scores[key] is not None:
            weighted_sum += scores[key] * weight
            total_weight += weight

    if total_weight == 0:
        return 0.0
    return round(weighted_sum / total_weight, 4)


def compute_coverage(
    real_count: int,
    total_count: int,
) -> tuple[float, str]:
    """
    Returns (coverage_pct, data_quality_flag).
    complete ≥90%, partial 50–89%, low_coverage <50%.
    """
    if total_count == 0:
        return 0.0, "low_coverage"

    pct = round(real_count / total_count * 100, 2)
    if pct >= 90:
        flag = "complete"
    elif pct >= 50:
        flag = "partial"
    else:
        flag = "low_coverage"

    return pct, flag
