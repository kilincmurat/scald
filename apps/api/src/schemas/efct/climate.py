"""EFCT Climate Series Pydantic schemas."""
import uuid
from datetime import datetime

from pydantic import Field

from src.schemas.base import SCАLDBaseModel


class EfctClimateSeriesResponse(SCАLDBaseModel):
    """One year of processed climate data for a municipality."""
    id: uuid.UUID
    municipality_id: uuid.UUID
    period_year: int
    temperature_avg_c: float | None
    temperature_trend_30y: float | None = Field(
        None, description="°C/decade linear trend over preceding 30 years"
    )
    precipitation_mm: float | None
    precipitation_anomaly_pct: float | None = Field(
        None, description="% deviation from 1961–1990 baseline"
    )
    heat_wave_days: int | None
    extreme_precipitation_days: int | None
    drought_index: float | None = Field(
        None, description="SPEI-12 index (negative = drought)"
    )
    frost_days: int | None
    source_apis: list[str] | None
    fetch_status: str
    fetched_at: datetime | None
    updated_at: datetime


class EfctClimateTrendResponse(SCАLDBaseModel):
    """Pre-computed trend statistics for the climate risk component."""
    municipality_id: uuid.UUID
    years_available: int
    year_from: int
    year_to: int
    # Temperature
    temp_mean_recent: float | None = Field(None, description="Mean of last 10 years (°C)")
    temp_trend_per_decade: float | None = Field(None, description="°C warming per decade")
    temp_anomaly_vs_baseline: float | None
    # Precipitation
    precip_trend_pct_per_decade: float | None
    precip_anomaly_mean: float | None
    # Extremes
    heat_wave_days_trend: float | None = Field(
        None, description="Change in heat wave days per decade"
    )
    drought_frequency_index: float | None
    # Risk score inputs (0–100, used directly by calculator)
    climate_risk_score: float | None = Field(
        None, ge=0, le=100,
        description="Pre-computed climate risk sub-score for efct_climate_risk category"
    )


class EfctClimateFetchStatusResponse(SCАLDBaseModel):
    """Coverage of 30-year climate data for a municipality."""
    municipality_id: uuid.UUID
    total_years_requested: int
    years_complete: int
    years_partial: int
    years_missing: int
    coverage_pct: float
    missing_years: list[int] = Field(default_factory=list)
    last_fetched_at: datetime | None
    fetch_status: str
