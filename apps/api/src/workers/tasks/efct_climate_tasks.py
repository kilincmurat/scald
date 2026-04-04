"""
EFCT Climate Celery tasks.

Tasks:
  fetch_climate_history_for_municipality  — full 30-year backfill for one municipality
  fetch_climate_incremental               — fetch latest year for one municipality
  fetch_climate_incremental_all           — Beat-triggered daily fan-out for all active municipalities
"""
import asyncio
import uuid
from datetime import datetime, timezone

from celery import Task
from celery.utils.log import get_task_logger
from sqlalchemy import select

from src.workers.tasks.celery_app import celery_app
from src.db.session import AsyncSessionLocal
from src.services.efct.climate_fetcher import fetch_history, fetch_year

logger = get_task_logger(__name__)

# 30-year baseline window
CLIMATE_YEAR_FROM = 1993
CLIMATE_YEAR_TO_OFFSET = 0  # current year - 0 (i.e., up to and including this year)


class _BaseTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error("Task %s [%s] FAILED: %s", self.name, task_id, exc, exc_info=einfo)


# ── Full history backfill ─────────────────────────────────────────────────────

@celery_app.task(
    base=_BaseTask,
    bind=True,
    name="src.workers.tasks.efct_climate_tasks.fetch_climate_history_for_municipality",
    max_retries=2,
    default_retry_delay=120,
    queue="climate",
    time_limit=600,  # 10 minutes — fetches up to 30 years
    soft_time_limit=540,
)
def fetch_climate_history_for_municipality(
    self,
    municipality_id: str,
    lat: float,
    lon: float,
    year_from: int = CLIMATE_YEAR_FROM,
    year_to: int | None = None,
) -> dict:
    """
    Fetches 30-year climate history from Open-Meteo for one municipality.
    Skips years already marked 'complete' in efct_climate_series.

    Returns {year: status} map.
    """
    if year_to is None:
        year_to = datetime.now(timezone.utc).year

    logger.info(
        "Climate history fetch started: municipality=%s years=%d-%d",
        municipality_id, year_from, year_to,
    )

    async def _run() -> dict:
        async with AsyncSessionLocal() as session:
            statuses = await fetch_history(
                municipality_id=uuid.UUID(municipality_id),
                lat=lat,
                lon=lon,
                year_from=year_from,
                year_to=year_to,
                session=session,
            )
            await session.commit()
            return statuses

    try:
        statuses = asyncio.run(_run())
        complete = sum(1 for s in statuses.values() if s == "complete")
        skipped = sum(1 for s in statuses.values() if s == "skipped")
        failed = sum(1 for s in statuses.values() if s == "failed")
        logger.info(
            "Climate history done: municipality=%s complete=%d skipped=%d failed=%d",
            municipality_id, complete, skipped, failed,
        )
        return {
            "municipality_id": municipality_id,
            "year_from": year_from,
            "year_to": year_to,
            "complete": complete,
            "skipped": skipped,
            "failed": failed,
            "statuses": statuses,
        }
    except Exception as exc:
        logger.error("Climate history fetch failed: municipality=%s: %s", municipality_id, exc)
        raise self.retry(exc=exc, countdown=120 * (self.request.retries + 1))


# ── Incremental single-year fetch ─────────────────────────────────────────────

@celery_app.task(
    base=_BaseTask,
    bind=True,
    name="src.workers.tasks.efct_climate_tasks.fetch_climate_incremental",
    max_retries=3,
    default_retry_delay=60,
    queue="climate",
)
def fetch_climate_incremental(
    self,
    municipality_id: str,
    lat: float,
    lon: float,
    year: int | None = None,
) -> dict:
    """
    Fetches (or refreshes) climate data for a single year.
    Defaults to the previous calendar year if year is not provided.
    """
    if year is None:
        year = datetime.now(timezone.utc).year - 1

    async def _run() -> dict:
        async with AsyncSessionLocal() as session:
            series = await fetch_year(
                municipality_id=uuid.UUID(municipality_id),
                year=year,
                lat=lat,
                lon=lon,
                session=session,
            )
            await session.commit()
            if series is None:
                return {"municipality_id": municipality_id, "year": year, "status": "failed"}
            return {
                "municipality_id": municipality_id,
                "year": year,
                "status": "complete",
                "temperature_avg_c": float(series.temperature_avg_c)
                    if series.temperature_avg_c is not None else None,
                "precipitation_mm": float(series.precipitation_mm)
                    if series.precipitation_mm is not None else None,
            }

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error(
            "Climate incremental fetch failed: municipality=%s year=%d: %s",
            municipality_id, year, exc,
        )
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


# ── Beat-triggered fan-out ────────────────────────────────────────────────────

@celery_app.task(
    base=_BaseTask,
    bind=True,
    name="src.workers.tasks.efct_climate_tasks.fetch_climate_incremental_all",
    max_retries=1,
    queue="climate",
)
def fetch_climate_incremental_all(self) -> dict:
    """
    Daily Beat task: dispatches fetch_climate_incremental for every active municipality.
    Reads lat/lon from the municipalities table.
    """
    from src.db.models.municipality import Municipality

    async def _get_municipalities() -> list[dict]:
        async with AsyncSessionLocal() as session:
            rows = await session.execute(
                select(Municipality.id, Municipality.latitude, Municipality.longitude)
                .where(
                    Municipality.is_active.is_(True),
                    Municipality.latitude.is_not(None),
                    Municipality.longitude.is_not(None),
                )
            )
            return [
                {"id": str(r[0]), "lat": float(r[1]), "lon": float(r[2])}
                for r in rows.all()
            ]

    try:
        municipalities = asyncio.run(_get_municipalities())
    except Exception as exc:
        logger.error("Failed to fetch municipalities for climate fan-out: %s", exc)
        raise self.retry(exc=exc)

    year = datetime.now(timezone.utc).year - 1
    dispatched = 0
    for mun in municipalities:
        fetch_climate_incremental.apply_async(
            kwargs={
                "municipality_id": mun["id"],
                "lat": mun["lat"],
                "lon": mun["lon"],
                "year": year,
            }
        )
        dispatched += 1

    logger.info("Climate fan-out complete: %d tasks dispatched for year %d", dispatched, year)
    return {"dispatched": dispatched, "year": year}
