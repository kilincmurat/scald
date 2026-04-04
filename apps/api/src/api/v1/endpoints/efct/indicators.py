"""
EFCT Indicator catalog endpoints.

GET /efct/indicators                        — list all 80 sub-indicators with scoring metadata
GET /efct/indicators/{slug}                 — single indicator detail
GET /efct/indicators/categories             — 15 categories with weights and sub-indicators
GET /efct/indicators/categories/{category}  — single category detail
GET /efct/indicators/benchmarks/{category}  — cross-municipal benchmarks for a category
GET /efct/indicators/{slug}/timeseries/{municipality_id} — historical observation points
"""
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import EfctCategoryWeight, EfctIndicatorMetadata, EfctScore
from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.models.observation import IndicatorObservation
from src.db.session import get_db
from src.schemas.efct.indicator import (
    EfctBenchmarkResponse,
    EfctCategoryResponse,
    EfctIndicatorObservationPoint,
    EfctIndicatorResponse,
)

router = APIRouter(prefix="/indicators", tags=["efct-indicators"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_indicator_response(
    indicator: Indicator,
    meta: EfctIndicatorMetadata,
) -> EfctIndicatorResponse:
    return EfctIndicatorResponse(
        id=indicator.id,
        slug=indicator.slug,
        name=indicator.name or {},
        description=indicator.description,
        category=meta.category,
        layer=indicator.layer,
        unit=indicator.unit or "",
        unit_per_capita=indicator.unit_per_capita,
        is_mandatory=indicator.is_mandatory,
        weight_in_category=float(meta.weight_in_category),
        weight_in_total=float(meta.weight_in_total),
        scoring_direction=meta.scoring_direction,
        target_value=float(meta.target_value) if meta.target_value is not None else None,
        benchmark_source=meta.benchmark_source,
        min_value=float(meta.min_value) if meta.min_value is not None else None,
        max_value=float(meta.max_value) if meta.max_value is not None else None,
        imputation_strategy=meta.imputation_strategy,
        version=meta.version,
        is_active=meta.is_active,
        data_source_hint=meta.data_source_hint,
    )


# ── List all indicators ───────────────────────────────────────────────────────

@router.get("", response_model=list[EfctIndicatorResponse])
async def list_indicators(
    category: str | None = Query(None),
    is_active: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> list[EfctIndicatorResponse]:
    """Lists all EFCT sub-indicators with their scoring metadata."""
    query = (
        select(Indicator, EfctIndicatorMetadata)
        .join(EfctIndicatorMetadata, EfctIndicatorMetadata.indicator_id == Indicator.id)
        .where(EfctIndicatorMetadata.is_active.is_(is_active))
        .order_by(EfctIndicatorMetadata.category, Indicator.slug)
    )
    if category:
        query = query.where(EfctIndicatorMetadata.category == category)

    rows = (await db.execute(query)).all()
    return [_build_indicator_response(ind, meta) for ind, meta in rows]


# ── Single indicator ──────────────────────────────────────────────────────────

@router.get("/{slug}", response_model=EfctIndicatorResponse)
async def get_indicator(
    slug: Annotated[str, Path(min_length=2, max_length=100)],
    db: AsyncSession = Depends(get_db),
) -> EfctIndicatorResponse:
    row = (
        await db.execute(
            select(Indicator, EfctIndicatorMetadata)
            .join(EfctIndicatorMetadata, EfctIndicatorMetadata.indicator_id == Indicator.id)
            .where(Indicator.slug == slug)
        )
    ).one_or_none()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Indicator '{slug}' not found")

    ind, meta = row
    return _build_indicator_response(ind, meta)


# ── Category list ─────────────────────────────────────────────────────────────

@router.get("/categories", response_model=list[EfctCategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
) -> list[EfctCategoryResponse]:
    """
    Returns all 15 EFCT categories with their current weights and sub-indicators.
    """
    # Active weights
    weight_rows = (
        await db.execute(
            select(EfctCategoryWeight).where(EfctCategoryWeight.effective_until.is_(None))
        )
    ).scalars().all()
    weight_map = {w.category: float(w.weight) for w in weight_rows}

    # Active indicators grouped by category
    ind_rows = (
        await db.execute(
            select(Indicator, EfctIndicatorMetadata)
            .join(EfctIndicatorMetadata, EfctIndicatorMetadata.indicator_id == Indicator.id)
            .where(EfctIndicatorMetadata.is_active.is_(True))
            .order_by(EfctIndicatorMetadata.category, Indicator.slug)
        )
    ).all()

    # Group by category
    categories: dict[str, list[EfctIndicatorResponse]] = {}
    for ind, meta in ind_rows:
        cat = meta.category
        categories.setdefault(cat, []).append(_build_indicator_response(ind, meta))

    return [
        EfctCategoryResponse(
            category=cat,
            weight=weight_map.get(cat, 0.0),
            sub_indicator_count=len(inds),
            indicators=inds,
        )
        for cat, inds in sorted(categories.items())
    ]


# ── Single category ───────────────────────────────────────────────────────────

@router.get("/categories/{category}", response_model=EfctCategoryResponse)
async def get_category(
    category: str,
    db: AsyncSession = Depends(get_db),
) -> EfctCategoryResponse:
    weight_row = (
        await db.execute(
            select(EfctCategoryWeight).where(
                EfctCategoryWeight.category == category,
                EfctCategoryWeight.effective_until.is_(None),
            )
        )
    ).scalar_one_or_none()

    ind_rows = (
        await db.execute(
            select(Indicator, EfctIndicatorMetadata)
            .join(EfctIndicatorMetadata, EfctIndicatorMetadata.indicator_id == Indicator.id)
            .where(
                EfctIndicatorMetadata.category == category,
                EfctIndicatorMetadata.is_active.is_(True),
            )
            .order_by(Indicator.slug)
        )
    ).all()

    if not ind_rows and weight_row is None:
        raise HTTPException(status_code=404, detail=f"Category '{category}' not found")

    return EfctCategoryResponse(
        category=category,
        weight=float(weight_row.weight) if weight_row else 0.0,
        sub_indicator_count=len(ind_rows),
        indicators=[_build_indicator_response(i, m) for i, m in ind_rows],
    )


# ── Benchmarks ────────────────────────────────────────────────────────────────

@router.get("/benchmarks/{category}", response_model=EfctBenchmarkResponse)
async def get_category_benchmarks(
    category: str,
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
) -> EfctBenchmarkResponse:
    """
    Cross-municipal benchmark statistics for one category in a given year.
    Uses the component_scores JSONB field from current EfctScore records.
    """
    rows = (
        await db.execute(
            select(EfctScore.component_scores, Municipality.country_code, Municipality.id)
            .join(Municipality, Municipality.id == EfctScore.municipality_id)
            .where(
                EfctScore.period_year == year,
                EfctScore.superseded_at.is_(None),
                EfctScore.score_total.is_not(None),
            )
        )
    ).all()

    scores_by_country: dict[str, list[float]] = {}
    all_scores: list[float] = []
    best_score: float | None = None
    best_mun_id: uuid.UUID | None = None
    worst_score: float | None = None

    for comp_scores, country_code, mun_id in rows:
        if not comp_scores or category not in comp_scores:
            continue
        val = float(comp_scores[category])
        all_scores.append(val)
        scores_by_country.setdefault(country_code, []).append(val)

        if best_score is None or val > best_score:
            best_score = val
            best_mun_id = mun_id
        if worst_score is None or val < worst_score:
            worst_score = val

    country_avg: dict[str, float] = {
        cc: round(sum(vs) / len(vs), 3)
        for cc, vs in scores_by_country.items()
    }
    eu_avg = round(sum(all_scores) / len(all_scores), 3) if all_scores else None

    # Best municipality name
    best_mun_name = None
    if best_mun_id:
        best_mun = await db.get(Municipality, best_mun_id)
        best_mun_name = best_mun.name if best_mun else None

    return EfctBenchmarkResponse(
        category=category,
        period_year=year,
        eu_average_score=eu_avg,
        country_average_scores=country_avg,
        best_in_class_score=best_score,
        best_in_class_municipality=best_mun_name,
        worst_in_class_score=worst_score,
        participating_municipalities=len(all_scores),
    )


# ── Indicator time series ─────────────────────────────────────────────────────

@router.get(
    "/{slug}/timeseries/{municipality_id}",
    response_model=list[EfctIndicatorObservationPoint],
)
async def get_indicator_timeseries(
    slug: Annotated[str, Path(min_length=2, max_length=100)],
    municipality_id: uuid.UUID,
    year_from: int = Query(2000, ge=2000),
    year_to: int = Query(2030, le=2100),
    db: AsyncSession = Depends(get_db),
) -> list[EfctIndicatorObservationPoint]:
    """
    Returns annual observation values for one indicator/municipality combination.
    """
    ind = (
        await db.execute(select(Indicator).where(Indicator.slug == slug))
    ).scalar_one_or_none()
    if ind is None:
        raise HTTPException(status_code=404, detail=f"Indicator '{slug}' not found")

    mun = await db.get(Municipality, municipality_id)
    if mun is None:
        raise HTTPException(status_code=404, detail="Municipality not found")

    rows = (
        await db.execute(
            select(IndicatorObservation)
            .where(
                IndicatorObservation.indicator_id == ind.id,
                IndicatorObservation.municipality_id == municipality_id,
                IndicatorObservation.period_year.between(year_from, year_to),
            )
            .order_by(IndicatorObservation.period_year)
        )
    ).scalars().all()

    return [
        EfctIndicatorObservationPoint(
            period_year=obs.period_year,
            value_raw=float(obs.value_raw) if obs.value_raw is not None else None,
            quality_tag=obs.quality_tag,
            source="etl",
        )
        for obs in rows
    ]
