"""
Celery application factory for SCALD API.

Broker:  Redis (configured via settings.REDIS_URL)
Backend: Redis (task results + status polling)

Beat schedule:
  - Daily incremental climate fetch: 02:00 UTC
  - Weekly full EFCT recalculation for all municipalities: Sunday 03:00 UTC

Usage:
  celery -A src.workers.tasks.celery_app worker -l info -Q efct,climate,default
  celery -A src.workers.tasks.celery_app beat  -l info
"""
from celery import Celery
from celery.schedules import crontab
from kombu import Exchange, Queue

from src.core.config.settings import settings

# ── App factory ───────────────────────────────────────────────────────────────

celery_app = Celery(
    "scald",
    broker=str(settings.REDIS_URL),
    backend=str(settings.REDIS_URL),
    include=[
        "src.workers.tasks.efct_score_tasks",
        "src.workers.tasks.efct_climate_tasks",
    ],
)

# ── Configuration ─────────────────────────────────────────────────────────────

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # Timezone
    timezone="UTC",
    enable_utc=True,
    # Result TTL: keep results for 24h for task status polling
    result_expires=86400,
    # Task routing
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
    # Retry defaults
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    # Max retries before failure
    task_max_retries=3,
)

# ── Queues ────────────────────────────────────────────────────────────────────

celery_app.conf.task_queues = (
    Queue("default",  Exchange("default"),  routing_key="default"),
    Queue("efct",     Exchange("efct"),     routing_key="efct"),
    Queue("climate",  Exchange("climate"),  routing_key="climate"),
)

celery_app.conf.task_routes = {
    "src.workers.tasks.efct_score_tasks.*":   {"queue": "efct"},
    "src.workers.tasks.efct_climate_tasks.*": {"queue": "climate"},
}

# ── Beat schedule ─────────────────────────────────────────────────────────────

celery_app.conf.beat_schedule = {
    # Incremental climate data fetch for all active municipalities, every day at 02:00 UTC
    "efct-climate-incremental-daily": {
        "task": "src.workers.tasks.efct_climate_tasks.fetch_climate_incremental_all",
        "schedule": crontab(hour=2, minute=0),
        "args": (),
    },
    # Full EFCT score recalculation for all municipalities, every Sunday at 03:00 UTC
    "efct-score-recalculate-weekly": {
        "task": "src.workers.tasks.efct_score_tasks.recalculate_all_efct_scores",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),
        "kwargs": {"triggered_by": "scheduled"},
    },
}
