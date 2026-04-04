"""
EFCT Calculation Engine — 6-phase composite score computation.

Called ONLY from Celery tasks (efct_score_tasks.py).
Never invoked directly from FastAPI endpoints.

Phase 1: Data collection  (async, parallel fan-out)
Phase 2: Normalization    (sync, per sub-indicator)
Phase 3: Imputation       (async, for missing values)
Phase 4: Category scores  (sync, weighted average per category)
Phase 5: Total score      (sync, weighted average across 15 categories)
Phase 6: Percentile rank  (async, DB query across cohort)
Phase 7: Persist          (async, upsert into data.efct_scores)
"""
import asyncio
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import (
    EfctCategoryWeight, EfctClimateSeries,
    EfctIndicatorMetadata, EfctScore,
)
from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.models.observation import IndicatorObservation
from src.services.efct.imputer import impute
from src.services.efct.normalizer import (
    NormalizationConfig, compute_coverage, normalize, weighted_average,
)

EFCT_CATEGORIES = [
    "efct_carbon", "efct_energy_use", "efct_food", "efct_water_eco",
    "efct_land_use", "efct_waste_eco", "efct_transport_eco", "efct_buildings",
    "efct_green_infra", "efct_biodiversity_eco", "efct_air_eco",
    "efct_climate_risk", "efct_social_eco", "efct_governance", "efct_resilience",
]

CALCULATION_VERSION = "efct_v1"


@dataclass
class IndicatorResult:
    slug: str
    indicator_id: uuid.UUID
    category: str
    raw_value: float | None
    normalized_score: float | None
    weight_in_category: float
    weight_in_total: float
    was_imputed: bool = False
    skipped: bool = False


@dataclass
class CalculationResult:
    municipality_id: uuid.UUID
    period_year: int
    score_total: float | None
    score_percentile: float | None
    rating: str | None
    component_scores: dict = field(default_factory=dict)
    component_weights: dict = field(default_factory=dict)
    coverage_pct: float | None = None
    missing_indicators: list[str] = field(default_factory=list)
    imputation_method: str | None = None
    data_quality_flag: str | None = None
    indicator_results: list[IndicatorResult] = field(default_factory=list)


async def calculate_efct_score(
    municipality_id: uuid.UUID,
    period_year: int,
    session: AsyncSession,
    triggered_by: str = "admin_forced",
    celery_task_id: str | None = None,
) -> CalculationResult:
    """
    Entry point for the full 6-phase EFCT calculation.
    Returns a CalculationResult; the caller (Celery task) persists it.
    """
    # ── Phase 1: Load configuration & raw data ────────────────────────────────
    metadata_map, category_weights = await _load_configuration(session)
    raw_values = await _collect_raw_values(
        municipality_id, period_year, session, metadata_map
    )

    # ── Phase 2 + 3: Normalize + Impute ───────────────────────────────────────
    results = await _normalize_and_impute(
        municipality_id, period_year, raw_values, metadata_map, session
    )

    # ── Phase 4: Category scores ──────────────────────────────────────────────
    component_scores = _compute_category_scores(results, metadata_map)

    # ── Phase 5: Total score ──────────────────────────────────────────────────
    cat_weights_for_calc = {k: v for k, v in category_weights.items()}
    score_total = weighted_average(component_scores, cat_weights_for_calc)

    # Coverage
    real_count = sum(1 for r in results if not r.was_imputed and not r.skipped)
    total_count = sum(1 for r in results if not r.skipped)
    coverage_pct, data_quality_flag = compute_coverage(real_count, total_count)
    missing = [r.slug for r in results if r.was_imputed]
    imputation_method = _dominant_imputation(results, metadata_map)

    rating = EfctScore.rating_from_score(score_total) if score_total is not None else None

    result = CalculationResult(
        municipality_id=municipality_id,
        period_year=period_year,
        score_total=round(score_total, 3) if score_total is not None else None,
        score_percentile=None,  # Filled in Phase 6
        rating=rating,
        component_scores=component_scores,
        component_weights=cat_weights_for_calc,
        coverage_pct=coverage_pct,
        missing_indicators=missing,
        imputation_method=imputation_method,
        data_quality_flag=data_quality_flag,
        indicator_results=results,
    )

    # ── Phase 6: Percentile rank ───────────────────────────────────────────────
    result.score_percentile = await _compute_percentile(
        municipality_id, period_year, score_total, session
    )

    # ── Phase 7: Persist ──────────────────────────────────────────────────────
    await _persist_score(result, session, triggered_by, celery_task_id)

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _load_configuration(
    session: AsyncSession,
) -> tuple[dict[uuid.UUID, EfctIndicatorMetadata], dict[str, float]]:
    """Returns (metadata_map, category_weights) for the active version."""
    meta_rows = (
        await session.execute(
            select(EfctIndicatorMetadata).where(EfctIndicatorMetadata.is_active.is_(True))
        )
    ).scalars().all()
    metadata_map = {m.indicator_id: m for m in meta_rows}

    # Latest active category weights
    weight_rows = (
        await session.execute(
            select(EfctCategoryWeight).where(EfctCategoryWeight.effective_until.is_(None))
        )
    ).scalars().all()
    category_weights = {w.category: float(w.weight) for w in weight_rows}

    # Fill missing categories with equal weight
    if not category_weights:
        eq = round(1.0 / len(EFCT_CATEGORIES), 5)
        category_weights = {cat: eq for cat in EFCT_CATEGORIES}

    return metadata_map, category_weights


async def _collect_raw_values(
    municipality_id: uuid.UUID,
    period_year: int,
    session: AsyncSession,
    metadata_map: dict[uuid.UUID, EfctIndicatorMetadata],
) -> dict[uuid.UUID, float | None]:
    """
    Fetches raw values for all EFCT indicators.
    Priority: approved submission item > indicator_observation.
    """
    indicator_ids = list(metadata_map.keys())

    obs_rows = await session.execute(
        select(
            IndicatorObservation.indicator_id,
            IndicatorObservation.value_raw,
        ).where(
            IndicatorObservation.municipality_id == municipality_id,
            IndicatorObservation.period_year == period_year,
            IndicatorObservation.indicator_id.in_(indicator_ids),
        )
    )
    values: dict[uuid.UUID, float | None] = {
        r.indicator_id: (float(r.value_raw) if r.value_raw is not None else None)
        for r in obs_rows.all()
    }

    # Ensure all indicators have an entry (None if no observation)
    for iid in indicator_ids:
        values.setdefault(iid, None)

    return values


async def _normalize_and_impute(
    municipality_id: uuid.UUID,
    period_year: int,
    raw_values: dict[uuid.UUID, float | None],
    metadata_map: dict[uuid.UUID, EfctIndicatorMetadata],
    session: AsyncSession,
) -> list[IndicatorResult]:
    """Runs normalization + imputation for every EFCT indicator."""
    # Resolve indicator slugs for readable results
    slug_map: dict[uuid.UUID, str] = {}
    if metadata_map:
        rows = await session.execute(
            select(Indicator.id, Indicator.slug).where(
                Indicator.id.in_(list(metadata_map.keys()))
            )
        )
        slug_map = {r.id: r.slug for r in rows.all()}

    results: list[IndicatorResult] = []

    for indicator_id, meta in metadata_map.items():
        raw = raw_values.get(indicator_id)
        was_imputed = False
        skipped = False

        if raw is None:
            # Apply imputation
            imputed, was_imputed = await impute(
                indicator_id=indicator_id,
                municipality_id=municipality_id,
                period_year=period_year,
                strategy=meta.imputation_strategy,
                national_average=(
                    float(meta.min_value + meta.max_value) / 2
                    if meta.min_value is not None and meta.max_value is not None
                    else None
                ),
                session=session,
            )
            if meta.imputation_strategy == "skip":
                skipped = True
                normalized = None
            else:
                raw = imputed
                normalized = None
        else:
            normalized = None

        # Normalize
        if raw is not None and not skipped:
            cfg = NormalizationConfig(
                min_value=float(meta.min_value or 0),
                max_value=float(meta.max_value or 100),
                scoring_direction=meta.scoring_direction,
                target_value=float(meta.target_value) if meta.target_value else None,
            )
            try:
                normalized = normalize(raw, cfg)
            except (ValueError, ZeroDivisionError):
                normalized = 0.0

        results.append(IndicatorResult(
            slug=slug_map.get(indicator_id, str(indicator_id)),
            indicator_id=indicator_id,
            category=meta.category,
            raw_value=raw,
            normalized_score=normalized,
            weight_in_category=float(meta.weight_in_category),
            weight_in_total=float(meta.weight_in_total),
            was_imputed=was_imputed,
            skipped=skipped,
        ))

    return results


def _compute_category_scores(
    results: list[IndicatorResult],
    metadata_map: dict[uuid.UUID, EfctIndicatorMetadata],
) -> dict[str, float]:
    """Weighted average of sub-indicator scores within each category."""
    cat_scores: dict[str, list[tuple[float, float]]] = {}
    for r in results:
        if r.skipped or r.normalized_score is None:
            continue
        cat_scores.setdefault(r.category, []).append(
            (r.normalized_score, r.weight_in_category)
        )

    component_scores: dict[str, float] = {}
    for cat, score_weights in cat_scores.items():
        total_w = sum(w for _, w in score_weights)
        if total_w == 0:
            component_scores[cat] = 0.0
        else:
            component_scores[cat] = round(
                sum(s * w for s, w in score_weights) / total_w, 3
            )
    return component_scores


async def _compute_percentile(
    municipality_id: uuid.UUID,
    period_year: int,
    score_total: float | None,
    session: AsyncSession,
) -> float | None:
    """
    Computes percentile rank within the same country_code cohort.
    Returns None if fewer than 3 municipalities have scores.
    """
    if score_total is None:
        return None

    # Get country of this municipality
    mun = await session.get(Municipality, municipality_id)
    if mun is None:
        return None

    # All current scores in same country
    rows = await session.execute(
        select(EfctScore.score_total, EfctScore.municipality_id)
        .join(Municipality, Municipality.id == EfctScore.municipality_id)
        .where(
            Municipality.country_code == mun.country_code,
            EfctScore.period_year == period_year,
            EfctScore.superseded_at.is_(None),
            EfctScore.score_total.is_not(None),
        )
    )
    all_scores = [float(r.score_total) for r in rows.all()]

    if len(all_scores) < 2:
        return None

    below = sum(1 for s in all_scores if s < score_total)
    return round(below / len(all_scores) * 100, 2)


def _dominant_imputation(
    results: list[IndicatorResult],
    metadata_map: dict[uuid.UUID, EfctIndicatorMetadata],
) -> str | None:
    imputed = [r for r in results if r.was_imputed]
    if not imputed:
        return None
    strategies = [
        metadata_map[r.indicator_id].imputation_strategy
        for r in imputed
        if r.indicator_id in metadata_map
    ]
    if not strategies:
        return None
    # Return most common strategy
    return max(set(strategies), key=strategies.count)


async def _persist_score(
    result: CalculationResult,
    session: AsyncSession,
    triggered_by: str,
    celery_task_id: str | None,
) -> None:
    """
    Upserts the score row:
      1. Mark existing current row as superseded
      2. Insert new row
    """
    now = datetime.now(timezone.utc)

    # Supersede existing current score
    await session.execute(
        update(EfctScore)
        .where(
            EfctScore.municipality_id == result.municipality_id,
            EfctScore.period_year == result.period_year,
            EfctScore.superseded_at.is_(None),
        )
        .values(superseded_at=now)
    )

    new_score = EfctScore(
        municipality_id=result.municipality_id,
        period_year=result.period_year,
        score_total=result.score_total,
        score_percentile=result.score_percentile,
        rating=result.rating,
        component_scores=result.component_scores,
        component_weights=result.component_weights,
        coverage_pct=result.coverage_pct,
        missing_indicators=result.missing_indicators,
        imputation_method=result.imputation_method,
        data_quality_flag=result.data_quality_flag,
        calculated_at=now,
        calculation_version=CALCULATION_VERSION,
        triggered_by=triggered_by,
        celery_task_id=celery_task_id,
    )
    session.add(new_score)
    await session.flush()
