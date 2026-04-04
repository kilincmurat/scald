"""
EFCT Climate endpoints — 30-year climate data series and trend analysis.

GET  /efct/climate/{municipality_id}           — paginated year series
GET  /efct/climate/{municipality_id}/trend     — pre-computed 30-year trend statistics
GET  /efct/climate/{municipality_id}/status    — fetch coverage status (missing years, etc.)
POST /efct/climate/{municipality_id}/refresh   — trigger Celery history backfill
POST /efct/climate/{municipality_id}/fetch-year — trigger single-year fetch
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import EfctClimateSeries
from src.db.models.municipality import Municipality
from src.db.session import get_db
from src.schemas.efct.climate import (
    EfctClimateFetchStatusResponse,
    EfctClimateSeriesResponse,
    EfctClimateTrendResponse,
)
from src.services.efct.climate_fetcher import compute_trends

router = APIRouter(prefix="/climate", tags=["efct-climate"])

CLIMATE_YEAR_FROM = 1993


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_municipality_or_404(
    municipality_id: uuid.UUID,
    db: AsyncSession,
) -> Municipality:
    mun = await db.get(Municipality, municipality_id)
    if mun is None:
        raise HTTPException(status_code=404, detail="Municipality not found")
    return mun


def _series_to_response(row: EfctClimateSeries) -> EfctClimateSeriesResponse:
    return EfctClimateSeriesResponse(
        id=row.id,
        municipality_id=row.municipality_id,
        period_year=row.period_year,
        temperature_avg_c=float(row.temperature_avg_c)
            if row.temperature_avg_c is not None else None,
        temperature_trend_30y=float(row.temperature_trend_30y)
            if row.temperature_trend_30y is not None else None,
        precipitation_mm=float(row.precipitation_mm)
            if row.precipitation_mm is not None else None,
        precipitation_anomaly_pct=None,  # computed separately if needed
        heat_wave_days=row.heat_wave_days,
        extreme_precipitation_days=row.extreme_precipitation_days,
        drought_index=float(row.drought_index) if row.drought_index is not None else None,
        frost_days=row.frost_days,
        source_apis=row.source_apis,
        fetch_status=row.fetch_status,
        fetched_at=row.fetched_at,
        updated_at=row.updated_at,
    )


# ── Year series ───────────────────────────────────────────────────────────────

@router.get("/{municipality_id}", response_model=list[EfctClimateSeriesResponse])
async def get_climate_series(
    municipality_id: uuid.UUID,
    year_from: int = Query(CLIMATE_YEAR_FROM, ge=1940),
    year_to: int = Query(2030, le=2100),
    db: AsyncSession = Depends(get_db),
) -> list[EfctClimateSeriesResponse]:
    """
    Returns the annual climate series for a municipality within the year range.
    Only returns rows with fetch_status='complete'.
    """
    await _get_municipality_or_404(municipality_id, db)

    rows = (
        await db.execute(
            select(EfctClimateSeries)
            .where(
                EfctClimateSeries.municipality_id == municipality_id,
                EfctClimateSeries.period_year.between(year_from, year_to),
                EfctClimateSeries.fetch_status == "complete",
            )
            .order_by(EfctClimateSeries.period_year)
        )
    ).scalars().all()

    return [_series_to_response(r) for r in rows]


# ── Trend statistics ──────────────────────────────────────────────────────────

@router.get("/{municipality_id}/trend", response_model=EfctClimateTrendResponse)
async def get_climate_trend(
    municipality_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EfctClimateTrendResponse:
    """
    Returns pre-computed 30-year trend statistics derived from efct_climate_series.
    Requires at least 3 complete years of data.
    """
    await _get_municipality_or_404(municipality_id, db)

    trends = await compute_trends(municipality_id, db)

    if "error" in trends:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": trends["error"],
                "years_available": trends.get("years_available", 0),
                "message": "Insufficient climate data to compute trends",
            },
        )

    return EfctClimateTrendResponse(
        municipality_id=municipality_id,
        years_available=trends["years_available"],
        year_from=trends["year_from"],
        year_to=trends["year_to"],
        temp_mean_recent=trends.get("temp_mean_recent"),
        temp_trend_per_decade=trends.get("temp_trend_per_decade"),
        temp_anomaly_vs_baseline=None,
        precip_trend_pct_per_decade=trends.get("precip_trend_pct_per_decade"),
        precip_anomaly_mean=None,
        heat_wave_days_trend=trends.get("heat_wave_days_trend"),
        drought_frequency_index=trends.get("drought_frequency_index"),
        climate_risk_score=None,
    )


# ── Coverage status ───────────────────────────────────────────────────────────

@router.get("/{municipality_id}/status", response_model=EfctClimateFetchStatusResponse)
async def get_climate_status(
    municipality_id: uuid.UUID,
    year_from: int = Query(CLIMATE_YEAR_FROM, ge=1940),
    year_to: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> EfctClimateFetchStatusResponse:
    """
    Returns fetch coverage for a municipality — which years are complete, missing, etc.
    """
    await _get_municipality_or_404(municipality_id, db)

    if year_to is None:
        year_to = datetime.now(timezone.utc).year

    requested_years = set(range(year_from, year_to + 1))

    rows = (
        await db.execute(
            select(EfctClimateSeries.period_year, EfctClimateSeries.fetch_status)
            .where(
                EfctClimateSeries.municipality_id == municipality_id,
                EfctClimateSeries.period_year.between(year_from, year_to),
            )
        )
    ).all()

    status_map = {r[0]: r[1] for r in rows}
    complete_years = {yr for yr, st in status_map.items() if st == "complete"}
    partial_years = {yr for yr, st in status_map.items() if st == "partial"}
    missing_years = sorted(requested_years - set(status_map.keys()))

    last_fetched = (
        await db.execute(
            select(func.max(EfctClimateSeries.fetched_at))
            .where(EfctClimateSeries.municipality_id == municipality_id)
        )
    ).scalar_one_or_none()

    total = len(requested_years)
    coverage_pct = round(len(complete_years) / total * 100, 2) if total > 0 else 0.0

    overall_status = "complete"
    if missing_years:
        overall_status = "partial" if complete_years else "not_started"

    return EfctClimateFetchStatusResponse(
        municipality_id=municipality_id,
        total_years_requested=total,
        years_complete=len(complete_years),
        years_partial=len(partial_years),
        years_missing=len(missing_years),
        coverage_pct=coverage_pct,
        missing_years=missing_years,
        last_fetched_at=last_fetched,
        fetch_status=overall_status,
    )


# ── Trigger full history backfill ─────────────────────────────────────────────

@router.post(
    "/{municipality_id}/refresh",
    status_code=status.HTTP_202_ACCEPTED,
)
async def refresh_climate_history(
    municipality_id: uuid.UUID,
    year_from: int = Query(CLIMATE_YEAR_FROM, ge=1940),
    year_to: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Triggers a full Celery climate history backfill for a municipality.
    Uses lat/lon from the municipalities table.
    """
    mun = await _get_municipality_or_404(municipality_id, db)

    if mun.latitude is None or mun.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Municipality has no lat/lon coordinates; cannot fetch climate data",
        )

    if year_to is None:
        year_to = datetime.now(timezone.utc).year

    from src.workers.tasks.efct_climate_tasks import fetch_climate_history_for_municipality
    task = fetch_climate_history_for_municipality.apply_async(
        kwargs={
            "municipality_id": str(municipality_id),
            "lat": float(mun.latitude),
            "lon": float(mun.longitude),
            "year_from": year_from,
            "year_to": year_to,
        }
    )

    return {
        "task_id": task.id,
        "status": "pending",
        "municipality_id": str(municipality_id),
        "year_from": year_from,
        "year_to": year_to,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Trigger single-year fetch ──────────────────────────────────────────────────

@router.post(
    "/{municipality_id}/fetch-year",
    status_code=status.HTTP_202_ACCEPTED,
)
async def fetch_climate_year(
    municipality_id: uuid.UUID,
    year: int = Query(..., ge=1940, le=2100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Triggers a Celery task to fetch (or refresh) climate data for a single year.
    """
    mun = await _get_municipality_or_404(municipality_id, db)

    if mun.latitude is None or mun.longitude is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Municipality has no lat/lon coordinates",
        )

    from src.workers.tasks.efct_climate_tasks import fetch_climate_incremental
    task = fetch_climate_incremental.apply_async(
        kwargs={
            "municipality_id": str(municipality_id),
            "lat": float(mun.latitude),
            "lon": float(mun.longitude),
            "year": year,
        }
    )

    return {
        "task_id": task.id,
        "status": "pending",
        "municipality_id": str(municipality_id),
        "year": year,
        "queued_at": datetime.now(timezone.utc).isoformat(),
    }
