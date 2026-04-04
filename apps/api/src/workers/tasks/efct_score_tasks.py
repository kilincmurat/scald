"""
EFCT Score Celery tasks.

Tasks:
  recalculate_efct_score         — single municipality/year recalculation
  recalculate_all_efct_scores    — fan-out over all active municipalities

All tasks are async-capable via asyncio.run() wrapper because the
calculation engine uses SQLAlchemy async sessions internally.
"""
import asyncio
import uuid
from datetime import datetime, timezone

from celery import Task
from celery.utils.log import get_task_logger

from src.workers.tasks.celery_app import celery_app
from src.db.session import AsyncSessionLocal
from src.services.efct.calculator import calculate_efct_score

logger = get_task_logger(__name__)


class _BaseTask(Task):
    """Base class: ensures uncaught exceptions are logged."""
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(
            "Task %s [%s] FAILED: %s", self.name, task_id, exc, exc_info=einfo
        )


# ── Single municipality task ──────────────────────────────────────────────────

@celery_app.task(
    base=_BaseTask,
    bind=True,
    name="src.workers.tasks.efct_score_tasks.recalculate_efct_score",
    max_retries=3,
    default_retry_delay=60,
    queue="efct",
)
def recalculate_efct_score(
    self,
    municipality_id: str,
    period_year: int,
    triggered_by: str = "admin_forced",
) -> dict:
    """
    Calculates and persists the EFCT score for one municipality/year.

    Returns a summary dict usable by EfctTaskResponse.result.
    """
    task_id = self.request.id
    logger.info(
        "EFCT score calculation started: municipality=%s year=%d task=%s",
        municipality_id, period_year, task_id,
    )

    async def _run() -> dict:
        async with AsyncSessionLocal() as session:
            result = await calculate_efct_score(
                municipality_id=uuid.UUID(municipality_id),
                period_year=period_year,
                session=session,
                triggered_by=triggered_by,
                celery_task_id=task_id,
            )
            await session.commit()
            return {
                "municipality_id": str(result.municipality_id),
                "period_year": result.period_year,
                "score_total": result.score_total,
                "score_percentile": result.score_percentile,
                "rating": result.rating,
                "coverage_pct": result.coverage_pct,
                "data_quality_flag": result.data_quality_flag,
                "missing_indicators": result.missing_indicators,
                "calculated_at": datetime.now(timezone.utc).isoformat(),
            }

    try:
        return asyncio.run(_run())
    except Exception as exc:
        logger.error(
            "EFCT score calculation failed: municipality=%s year=%d: %s",
            municipality_id, period_year, exc,
        )
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


# ── Fan-out task ──────────────────────────────────────────────────────────────

@celery_app.task(
    base=_BaseTask,
    bind=True,
    name="src.workers.tasks.efct_score_tasks.recalculate_all_efct_scores",
    max_retries=1,
    queue="efct",
)
def recalculate_all_efct_scores(
    self,
    period_year: int | None = None,
    triggered_by: str = "scheduled",
) -> dict:
    """
    Fan-out: dispatches recalculate_efct_score for every active municipality.

    If period_year is None, defaults to the previous calendar year.
    Returns a summary with the number of tasks dispatched.
    """
    from sqlalchemy import select
    from src.db.models.municipality import Municipality

    if period_year is None:
        period_year = datetime.now(timezone.utc).year - 1

    async def _get_active_municipalities() -> list[str]:
        async with AsyncSessionLocal() as session:
            rows = await session.execute(
                select(Municipality.id).where(Municipality.is_active.is_(True))
            )
            return [str(r[0]) for r in rows.all()]

    try:
        municipality_ids = asyncio.run(_get_active_municipalities())
    except Exception as exc:
        logger.error("Failed to fetch active municipalities: %s", exc)
        raise self.retry(exc=exc)

    dispatched = 0
    for mun_id in municipality_ids:
        recalculate_efct_score.apply_async(
            kwargs={
                "municipality_id": mun_id,
                "period_year": period_year,
                "triggered_by": triggered_by,
            }
        )
        dispatched += 1

    logger.info(
        "EFCT fan-out complete: %d tasks dispatched for year %d",
        dispatched, period_year,
    )
    return {
        "dispatched": dispatched,
        "period_year": period_year,
        "triggered_by": triggered_by,
    }
