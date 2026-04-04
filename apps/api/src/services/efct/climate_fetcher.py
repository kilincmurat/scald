"""
EFCT Climate Fetcher — 30-year climate data from external APIs.

Three sources:
  1. Open-Meteo ERA5 reanalysis (free, no key, 1940–present)
  2. World Bank Climate Change Knowledge Portal (REST, no key)
  3. [Optional] Copernicus CDS (requires API key, async job submission)

Called from Celery tasks. Results are stored in:
  - data.climate_api_snapshots  (raw payload archive, existing table)
  - data.efct_climate_series    (processed series, new EFCT table)
"""
import asyncio
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import EfctClimateSeries
from src.db.models.observation import ClimateAPISnapshot
from src.core.config.settings import settings

# ── API clients ───────────────────────────────────────────────────────────────

OPEN_METEO_URL = "https://archive-api.open-meteo.com/v1/archive"
WORLDBANK_URL = "https://climateknowledgeportal.worldbank.org/api/data"

_HTTP_TIMEOUT = 30.0


async def fetch_year(
    municipality_id: uuid.UUID,
    year: int,
    lat: float,
    lon: float,
    session: AsyncSession,
) -> EfctClimateSeries | None:
    """
    Fetch climate data for one municipality/year from Open-Meteo.
    Archives raw payload to climate_api_snapshots.
    Returns an EfctClimateSeries instance (not yet persisted).
    """
    raw = await _fetch_open_meteo(lat, lon, year)
    if raw is None:
        return None

    # Archive raw payload
    snapshot = ClimateAPISnapshot(
        municipality_id=municipality_id,
        source_api="open_meteo",
        fetched_at=datetime.now(timezone.utc),
        period_year=year,
        temperature_avg_c=raw.get("temperature_avg_c"),
        temperature_min_c=raw.get("temperature_min_c"),
        temperature_max_c=raw.get("temperature_max_c"),
        precipitation_mm=raw.get("precipitation_mm"),
        wind_speed_avg_ms=raw.get("wind_speed_avg_ms"),
        humidity_avg_pct=raw.get("humidity_avg_pct"),
        extreme_weather_days=raw.get("extreme_weather_days"),
        raw_payload=raw,
        quality_tag="Verified",
    )
    session.add(snapshot)

    return EfctClimateSeries(
        municipality_id=municipality_id,
        period_year=year,
        temperature_avg_c=raw.get("temperature_avg_c"),
        precipitation_mm=raw.get("precipitation_mm"),
        heat_wave_days=raw.get("heat_wave_days"),
        extreme_precipitation_days=raw.get("extreme_precipitation_days"),
        frost_days=raw.get("frost_days"),
        source_apis=["open_meteo"],
        fetch_status="complete",
        fetched_at=datetime.now(timezone.utc),
    )


async def fetch_history(
    municipality_id: uuid.UUID,
    lat: float,
    lon: float,
    year_from: int,
    year_to: int,
    session: AsyncSession,
) -> dict[int, str]:
    """
    Fetch full year range. Returns {year: status} map.
    Skips years that already have a 'complete' record.
    """
    # Find already-complete years
    existing = await session.execute(
        select(EfctClimateSeries.period_year, EfctClimateSeries.fetch_status).where(
            EfctClimateSeries.municipality_id == municipality_id,
            EfctClimateSeries.period_year.between(year_from, year_to),
        )
    )
    done = {r.period_year for r in existing.all() if r.fetch_status == "complete"}

    statuses: dict[int, str] = {}
    for year in range(year_from, year_to + 1):
        if year in done:
            statuses[year] = "skipped"
            continue

        series = await fetch_year(municipality_id, year, lat, lon, session)
        if series is None:
            statuses[year] = "failed"
            continue

        # Check existing row
        existing_row = await session.scalar(
            select(EfctClimateSeries.id).where(
                EfctClimateSeries.municipality_id == municipality_id,
                EfctClimateSeries.period_year == year,
            )
        )
        if existing_row:
            # Update existing
            from sqlalchemy import update
            await session.execute(
                update(EfctClimateSeries)
                .where(EfctClimateSeries.id == existing_row)
                .values(
                    temperature_avg_c=series.temperature_avg_c,
                    precipitation_mm=series.precipitation_mm,
                    heat_wave_days=series.heat_wave_days,
                    extreme_precipitation_days=series.extreme_precipitation_days,
                    frost_days=series.frost_days,
                    source_apis=series.source_apis,
                    fetch_status="complete",
                    fetched_at=series.fetched_at,
                )
            )
        else:
            session.add(series)

        statuses[year] = "complete"
        await session.flush()

    return statuses


async def compute_trends(
    municipality_id: uuid.UUID,
    session: AsyncSession,
) -> dict:
    """
    Computes 30-year trend statistics from efct_climate_series.
    Used by GET /efct/climate/{municipality_id}/trend.
    """
    rows = (
        await session.execute(
            select(EfctClimateSeries)
            .where(
                EfctClimateSeries.municipality_id == municipality_id,
                EfctClimateSeries.fetch_status == "complete",
            )
            .order_by(EfctClimateSeries.period_year)
        )
    ).scalars().all()

    if len(rows) < 3:
        return {"error": "insufficient_data", "years_available": len(rows)}

    temps = [(r.period_year, float(r.temperature_avg_c)) for r in rows
             if r.temperature_avg_c is not None]
    precips = [(r.period_year, float(r.precipitation_mm)) for r in rows
               if r.precipitation_mm is not None]

    return {
        "years_available": len(rows),
        "year_from": rows[0].period_year,
        "year_to": rows[-1].period_year,
        "temp_mean_recent": _mean([t for _, t in temps[-10:]]) if temps else None,
        "temp_trend_per_decade": _linear_trend(temps),
        "precip_trend_pct_per_decade": _precip_trend(precips),
        "heat_wave_days_trend": _mean_trend(
            [(r.period_year, float(r.heat_wave_days))
             for r in rows if r.heat_wave_days is not None]
        ),
        "drought_frequency_index": _mean(
            [float(r.drought_index) for r in rows
             if r.drought_index is not None and float(r.drought_index) < -1.0]
        ),
    }


# ── Open-Meteo client ──────────────────────────────────────────────────────────

async def _fetch_open_meteo(lat: float, lon: float, year: int) -> dict | None:
    """Fetches annual aggregates from Open-Meteo ERA5 reanalysis."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": f"{year}-01-01",
        "end_date": f"{year}-12-31",
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "precipitation_sum",
            "wind_speed_10m_max",
        ]),
        "timezone": "UTC",
    }
    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, Exception):
        return None

    daily = data.get("daily", {})
    temps_max = [t for t in (daily.get("temperature_2m_max") or []) if t is not None]
    temps_min = [t for t in (daily.get("temperature_2m_min") or []) if t is not None]
    temps_mean = [t for t in (daily.get("temperature_2m_mean") or []) if t is not None]
    precip = [p for p in (daily.get("precipitation_sum") or []) if p is not None]

    return {
        "temperature_avg_c": _mean(temps_mean),
        "temperature_min_c": min(temps_min) if temps_min else None,
        "temperature_max_c": max(temps_max) if temps_max else None,
        "precipitation_mm": sum(precip) if precip else None,
        "wind_speed_avg_ms": None,
        "humidity_avg_pct": None,
        "heat_wave_days": sum(1 for t in temps_max if t > 35),
        "extreme_precipitation_days": sum(1 for p in precip if p > 50),
        "frost_days": sum(1 for t in temps_min if t < 0),
        "extreme_weather_days": sum(1 for t in temps_max if t > 35)
                               + sum(1 for p in precip if p > 50),
    }


# ── Math helpers ──────────────────────────────────────────────────────────────

def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 4)


def _linear_trend(xy: list[tuple[int, float]]) -> float | None:
    """Returns slope in units/decade via least-squares."""
    if len(xy) < 3:
        return None
    n = len(xy)
    xs = [x for x, _ in xy]
    ys = [y for _, y in xy]
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den = sum((x - mean_x) ** 2 for x in xs)
    if den == 0:
        return None
    slope_per_year = num / den
    return round(slope_per_year * 10, 4)  # per decade


def _precip_trend(xy: list[tuple[int, float]]) -> float | None:
    """Relative trend in % per decade."""
    trend = _linear_trend(xy)
    if trend is None or not xy:
        return None
    mean_precip = _mean([y for _, y in xy])
    if not mean_precip:
        return None
    return round(trend / mean_precip * 100, 4)


def _mean_trend(xy: list[tuple[int, float]]) -> float | None:
    return _linear_trend(xy)
