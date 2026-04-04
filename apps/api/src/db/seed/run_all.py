"""
SCALD Tam Seed Orchestrator

Sıralı çalıştırma (bağımlılık sırası önemlidir):
  1. indicators      → core.indicators (ETL sözleşmesi)
  2. municipalities  → core.municipalities (coğrafi temel)
  3. users           → core.organizations + core.users
  4. observations    → data.indicator_observations (L1 + L2)
  5. iot_sensors     → iot.sensors + iot.sensor_readings + iot.sensor_aggregations
  6. surveys         → data.surveys + data.survey_responses

Kullanım:
    poetry run python -m src.db.seed.run_all
    poetry run python -m src.db.seed.run_all --only indicators municipalities
    poetry run python -m src.db.seed.run_all --skip iot surveys
"""
import argparse
import asyncio
import time

from src.db.seed.indicators import seed_indicators
from src.db.seed.municipalities import seed_municipalities
from src.db.seed.users import seed_users
from src.db.seed.observations import seed_observations
from src.db.seed.iot_sensors import seed_iot
from src.db.seed.surveys import seed_surveys
from src.db.session import AsyncSessionLocal

STEPS = ["indicators", "municipalities", "users", "observations", "iot", "surveys"]


async def run(only: list[str] | None = None, skip: list[str] | None = None) -> None:
    active = only if only else STEPS
    if skip:
        active = [s for s in active if s not in skip]

    print(f"\n{'='*60}")
    print("  SCALD Database Seed")
    print(f"  Steps: {', '.join(active)}")
    print(f"{'='*60}\n")

    total_start = time.perf_counter()

    async with AsyncSessionLocal() as session:

        if "indicators" in active:
            t = time.perf_counter()
            from src.db.seed.indicators import INDICATOR_CATALOG
            n = await seed_indicators(session)
            print(f"[1/6] indicators       → {n:>5} new  "
                  f"({len(INDICATOR_CATALOG)} total)  "
                  f"[{time.perf_counter()-t:.1f}s]")

        if "municipalities" in active:
            t = time.perf_counter()
            from src.db.seed.municipalities import MUNICIPALITIES
            n = await seed_municipalities(session)
            print(f"[2/6] municipalities   → {n:>5} new  "
                  f"({len(MUNICIPALITIES)} total)  "
                  f"[{time.perf_counter()-t:.1f}s]")

        if "users" in active:
            t = time.perf_counter()
            orgs, users = await seed_users(session)
            print(f"[3/6] users            → {orgs:>3} orgs, {users:>3} users  "
                  f"[{time.perf_counter()-t:.1f}s]")

        if "observations" in active:
            t = time.perf_counter()
            n = await seed_observations(session)
            print(f"[4/6] observations     → {n:>6} rows  "
                  f"(Layer 1+2, 10 years)  "
                  f"[{time.perf_counter()-t:.1f}s]")

        if "iot" in active:
            t = time.perf_counter()
            sensors, readings, aggs = await seed_iot(session)
            print(f"[5/6] iot              → {sensors:>3} sensors, "
                  f"{readings:>6} readings, "
                  f"{aggs:>5} daily aggs  "
                  f"[{time.perf_counter()-t:.1f}s]")

        if "surveys" in active:
            t = time.perf_counter()
            surveys, responses = await seed_surveys(session)
            print(f"[6/6] surveys          → {surveys:>3} surveys, "
                  f"{responses:>6} responses  "
                  f"[{time.perf_counter()-t:.1f}s]")

    elapsed = time.perf_counter() - total_start
    print(f"\n{'='*60}")
    print(f"  Seed tamamlandı — {elapsed:.1f} saniye")
    print(f"{'='*60}\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="SCALD seed orchestrator")
    parser.add_argument(
        "--only", nargs="+", choices=STEPS,
        help="Yalnızca belirtilen adımları çalıştır",
    )
    parser.add_argument(
        "--skip", nargs="+", choices=STEPS,
        help="Belirtilen adımları atla",
    )
    args = parser.parse_args()
    asyncio.run(run(only=args.only, skip=args.skip))


if __name__ == "__main__":
    main()
