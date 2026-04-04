"""
Seed: IndicatorObservation — Layer 1 (Core) + Layer 2 (Extended).

Strateji:
  - Her belediye için 2015–2024 yıl aralığı (10 yıllık time-series)
  - Veriler: ülke/belediye büyüklüğüne göre kalibre edilmiş gerçekçi aralıklar
  - Trend: hafif iyileşme eğilimi (iklim politikaları sonucu)
  - Kalite etiketi: 2015–2020 → Estimated, 2021–2023 → Verified, 2024 → Estimated
  - per_capita + per_area normalizasyonu hesaplanarak depolanır
  - Layer 2 verisi: yalnızca büyük belediyeler (nüfus > 200k)

Seed, indicators.py'nin çalıştırılmış olduğunu varsayar.
"""
import asyncio
import math
import random
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.models.observation import IndicatorObservation
from src.db.models.enums import QualityTag
from src.db.session import AsyncSessionLocal

random.seed(42)  # Tekrar üretilebilir veri

YEARS = list(range(2015, 2025))


def quality_for_year(year: int) -> str:
    if year <= 2020:
        return QualityTag.ESTIMATED
    if year <= 2023:
        return QualityTag.VERIFIED
    return QualityTag.ESTIMATED


def trend(base: float, year: int, rate: float = -0.015, noise: float = 0.04) -> float:
    """
    Lineer trend + Gaussian gürültü.
    rate < 0 → iyileşme (azalma), rate > 0 → artış
    """
    delta_year = year - 2015
    value = base * (1 + rate) ** delta_year
    value *= 1 + random.gauss(0, noise)
    return max(value, 0.0)


# ─────────────────────────────────────────────────────────────────────────────
# Belediye başına kalibrasyon sabitleri
# Her belediyeye göre gerçekçi taban değerler
# ─────────────────────────────────────────────────────────────────────────────
MUN_PARAMS: dict[str, dict[str, Any]] = {
    # code: {alan (km2), nüfus(2015), ülke profili (iklim/gelişmişlik)}
    "TR-ANK": {"pop_2015": 5300000, "area": 25706, "climate": "continental",
               "dev": "upper_middle"},
    "TR-IZM": {"pop_2015": 4100000, "area": 11891, "climate": "mediterranean",
               "dev": "upper_middle"},
    "TR-BUR": {"pop_2015": 2900000, "area": 10804, "climate": "temperate",
               "dev": "upper_middle"},
    "TR-GAZ": {"pop_2015": 1900000, "area": 6222, "climate": "semi_arid",
               "dev": "middle"},
    "GR-ATH": {"pop_2015": 650000, "area": 38.96, "climate": "mediterranean",
               "dev": "high"},
    "GR-THE": {"pop_2015": 315000, "area": 19.88, "climate": "mediterranean",
               "dev": "high"},
    "GR-PAT": {"pop_2015": 168000, "area": 73.01, "climate": "mediterranean",
               "dev": "high"},
    "GR-HER": {"pop_2015": 170000, "area": 109.03, "climate": "mediterranean",
               "dev": "high"},
    "RO-BUC": {"pop_2015": 1800000, "area": 228, "climate": "continental",
               "dev": "high"},
    "RO-CLJ": {"pop_2015": 310000, "area": 179.5, "climate": "continental",
               "dev": "high"},
    "RO-TIM": {"pop_2015": 310000, "area": 129.8, "climate": "continental",
               "dev": "high"},
    "RO-IAS": {"pop_2015": 280000, "area": 94.4, "climate": "continental",
               "dev": "upper_middle"},
    "MK-SKO": {"pop_2015": 530000, "area": 571.46, "climate": "continental",
               "dev": "upper_middle"},
    "MK-BIT": {"pop_2015": 72000, "area": 798, "climate": "continental",
               "dev": "middle"},
    "MK-OHR": {"pop_2015": 40000, "area": 389, "climate": "mediterranean",
               "dev": "middle"},
    "MK-STI": {"pop_2015": 42000, "area": 583, "climate": "continental",
               "dev": "middle"},
    "AL-TIR": {"pop_2015": 860000, "area": 41.8, "climate": "mediterranean",
               "dev": "middle"},
    "AL-DUR": {"pop_2015": 190000, "area": 339, "climate": "mediterranean",
               "dev": "middle"},
    "BG-SOF": {"pop_2015": 1310000, "area": 492.3, "climate": "continental",
               "dev": "high"},
    "BG-PLO": {"pop_2015": 344000, "area": 101.9, "climate": "continental",
               "dev": "high"},
}

# Gelişmişlik seviyesine göre referans değerler
_DEV_PROFILES = {
    "high":          {"water_loss": 15, "recycling": 55, "renewable": 30, "pm25": 18},
    "upper_middle":  {"water_loss": 28, "recycling": 32, "renewable": 18, "pm25": 28},
    "middle":        {"water_loss": 42, "recycling": 18, "renewable": 12, "pm25": 38},
}


def _profile(code: str) -> dict:
    return _DEV_PROFILES[MUN_PARAMS[code]["dev"]]


def _pop(code: str, year: int) -> int:
    """Yaklaşık nüfus (yıllık %0.8 büyüme)."""
    base = MUN_PARAMS[code]["pop_2015"]
    return int(base * (1.008 ** (year - 2015)))


def _area(code: str) -> float:
    return MUN_PARAMS[code]["area"]


def generate_observations(code: str) -> list[dict]:
    """Bir belediye için tüm yıllara ait gözlem sözlükleri üretir."""
    p = _profile(code)
    rows: list[dict] = []

    for year in YEARS:
        pop = _pop(code, year)
        area = _area(code)
        q = quality_for_year(year)

        def obs(slug: str, layer: int, raw: float,
                per_cap_raw: float | None = None,
                per_area_raw: float | None = None) -> dict:
            per_cap = (raw / pop) if per_cap_raw is None and pop > 0 else per_cap_raw
            per_ar = (raw / area) if per_area_raw is None and area > 0 else per_area_raw
            return {
                "indicator_slug": slug, "layer": layer,
                "period_year": year, "quality_tag": q,
                "value_raw": round(raw, 4),
                "value_per_capita": round(per_cap, 6) if per_cap else None,
                "value_per_area": round(per_ar, 4) if per_ar else None,
                "data_source": "EUROSTAT / National Statistical Office",
            }

        # ── Layer 1: Population ──────────────────────────────────────────
        rows.append(obs("population_total", 1, pop,
                        per_cap_raw=1.0, per_area_raw=round(pop / area, 2)))
        rows.append(obs("population_density", 1, round(pop / area, 2),
                        per_cap_raw=None, per_area_raw=None))
        growth = trend(1.008, year, rate=0.0, noise=0.005) - 1
        rows.append(obs("population_growth_rate", 1, round(growth * 100, 3),
                        per_cap_raw=None, per_area_raw=None))

        # ── Layer 1: Water ────────────────────────────────────────────────
        water_total = trend(pop * 58.0, year, rate=-0.012)  # m3/year
        rows.append(obs("water_consumption_total", 1, water_total))
        rows.append(obs("water_loss_rate", 1,
                        trend(p["water_loss"], year, rate=-0.025, noise=0.03),
                        per_cap_raw=None, per_area_raw=None))
        rows.append(obs("wastewater_treatment_rate", 1,
                        min(100, trend(72, year, rate=0.018, noise=0.02)),
                        per_cap_raw=None, per_area_raw=None))

        # ── Layer 1: Waste ────────────────────────────────────────────────
        waste_total = trend(pop * 0.38, year, rate=0.005)  # tonne/year
        rows.append(obs("municipal_solid_waste_total", 1, waste_total))
        rows.append(obs("recycling_rate", 1,
                        min(80, trend(p["recycling"], year, rate=0.04, noise=0.03)),
                        per_cap_raw=None, per_area_raw=None))
        rows.append(obs("landfill_diversion_rate", 1,
                        min(95, trend(p["recycling"] + 10, year, rate=0.035, noise=0.03)),
                        per_cap_raw=None, per_area_raw=None))

        # ── Layer 1: Energy ───────────────────────────────────────────────
        energy_total = trend(pop * 4.2, year, rate=-0.018)  # MWh/year
        rows.append(obs("energy_consumption_total", 1, energy_total))
        rows.append(obs("renewable_energy_share", 1,
                        min(70, trend(p["renewable"], year, rate=0.055, noise=0.04)),
                        per_cap_raw=None, per_area_raw=None))
        ghg = trend(pop * 2.1, year, rate=-0.022)  # tCO2e/year
        rows.append(obs("ghg_emissions_total", 1, ghg))

        # ── Layer 1: Transportation ───────────────────────────────────────
        rides = trend(pop * 85.0, year, rate=0.012)
        rows.append(obs("public_transport_ridership", 1, rides))
        cycle_km = trend(area * 0.08, year, rate=0.06, noise=0.05)
        rows.append(obs("cycling_infrastructure_km", 1, cycle_km))
        accident_rate = trend(28.0, year, rate=-0.025, noise=0.04)
        rows.append(obs("road_accident_rate", 1, accident_rate,
                        per_cap_raw=None, per_area_raw=None))

        # ── Layer 1: Green Spaces ─────────────────────────────────────────
        green_ha = trend(area * 0.18 * 100, year, rate=0.008)  # hectare
        rows.append(obs("green_space_area_total", 1, green_ha,
                        per_cap_raw=round(green_ha * 10000 / pop, 2)))  # m2/person
        rows.append(obs("green_space_accessibility_pct", 1,
                        min(100, trend(54, year, rate=0.015, noise=0.02)),
                        per_cap_raw=None, per_area_raw=None))
        rows.append(obs("tree_canopy_coverage_pct", 1,
                        min(60, trend(22, year, rate=0.01, noise=0.02)),
                        per_cap_raw=None, per_area_raw=None))

        # ── Layer 1: Climate (API-sourced) ────────────────────────────────
        climate = MUN_PARAMS[code]["climate"]
        base_temp = {"mediterranean": 18.2, "continental": 12.4,
                     "temperate": 14.1, "semi_arid": 17.8}[climate]
        rows.append(obs("avg_annual_temperature", 1,
                        round(trend(base_temp, year, rate=0.004, noise=0.008), 2),
                        per_cap_raw=None, per_area_raw=None))
        base_precip = {"mediterranean": 520, "continental": 580,
                       "temperate": 680, "semi_arid": 340}[climate]
        rows.append(obs("annual_precipitation_mm", 1,
                        round(trend(base_precip, year, rate=-0.008, noise=0.06), 1),
                        per_cap_raw=None, per_area_raw=None))
        rows.append(obs("extreme_weather_days", 1,
                        round(trend(12, year, rate=0.025, noise=0.08)),
                        per_cap_raw=None, per_area_raw=None))

    # ── Layer 2: yalnızca büyük belediyeler (nüfus > 200k) ──────────────
    if MUN_PARAMS[code]["pop_2015"] > 200_000:
        for year in YEARS:
            q = quality_for_year(year)
            p2 = _profile(code)

            def obs2(slug: str, raw: float,
                     per_cap_raw: float | None = None,
                     per_area_raw: float | None = None) -> dict:
                return {
                    "indicator_slug": slug, "layer": 2,
                    "period_year": year, "quality_tag": q,
                    "value_raw": round(raw, 4),
                    "value_per_capita": round(per_cap_raw, 6) if per_cap_raw else None,
                    "value_per_area": round(per_area_raw, 4) if per_area_raw else None,
                    "data_source": "EEA / National Environmental Agency",
                }

            # Air quality
            rows.append(obs2("pm25_annual_avg",
                             trend(p2["pm25"], year, rate=-0.03, noise=0.05)))
            rows.append(obs2("pm10_annual_avg",
                             trend(p2["pm25"] * 1.8, year, rate=-0.025, noise=0.05)))
            rows.append(obs2("no2_annual_avg",
                             trend(p2["pm25"] * 1.4, year, rate=-0.028, noise=0.05)))
            rows.append(obs2("air_quality_exceedance_days",
                             max(0, trend(35, year, rate=-0.04, noise=0.08))))

            # Flood risk (static — değişkenlik az)
            flood_pct = trend(8.5, year, rate=0.002, noise=0.01)
            rows.append(obs2("flood_risk_area_pct", flood_pct))
            rows.append(obs2("flood_affected_population_pct",
                             trend(6.2, year, rate=0.002, noise=0.01)))

            # Sectoral energy
            pop = _pop(code, year)
            area = _area(code)
            total_e = trend(pop * 4.2, year, rate=-0.018)
            rows.append(obs2("residential_energy_consumption", total_e * 0.35))
            rows.append(obs2("commercial_energy_consumption", total_e * 0.28))
            rows.append(obs2("transport_energy_consumption", total_e * 0.30))
            rows.append(obs2("municipal_buildings_energy_intensity",
                             trend(185, year, rate=-0.025, noise=0.03)))

            # Biodiversity
            rows.append(obs2("protected_area_pct",
                             min(35, trend(12, year, rate=0.008, noise=0.02))))
            rows.append(obs2("species_richness_index",
                             trend(64, year, rate=-0.005, noise=0.02)))
            rows.append(obs2("invasive_species_count",
                             round(trend(18, year, rate=0.03, noise=0.05))))

    return rows


async def seed_observations(session: AsyncSession) -> int:
    # Slug → id map
    slug_map = {
        row.slug: row.id
        for row in (
            await session.execute(select(Indicator.slug, Indicator.id))
        ).all()
    }
    # Code → (id, population, area) map
    mun_rows = (
        await session.execute(
            select(Municipality.code, Municipality.id,
                   Municipality.population_latest, Municipality.area_km2)
        )
    ).all()
    mun_map = {r.code: r for r in mun_rows}

    inserted = 0
    for code in MUN_PARAMS:
        if code not in mun_map:
            continue
        mun = mun_map[code]
        observations = generate_observations(code)

        for row in observations:
            slug = row["indicator_slug"]
            indicator_id = slug_map.get(slug)
            if not indicator_id:
                continue

            # Idempotency check
            exists = await session.scalar(
                select(IndicatorObservation.id).where(
                    IndicatorObservation.indicator_id == indicator_id,
                    IndicatorObservation.municipality_id == mun.id,
                    IndicatorObservation.period_year == row["period_year"],
                    IndicatorObservation.period_month.is_(None),
                    IndicatorObservation.period_day.is_(None),
                )
            )
            if exists:
                continue

            session.add(IndicatorObservation(
                indicator_id=indicator_id,
                municipality_id=mun.id,
                layer=row["layer"],
                period_year=row["period_year"],
                period_month=None,
                period_day=None,
                value_raw=row["value_raw"],
                value_per_capita=row["value_per_capita"],
                value_per_area=row["value_per_area"],
                quality_tag=row["quality_tag"],
                data_source=row["data_source"],
            ))
            inserted += 1

            # Batch flush every 500 rows
            if inserted % 500 == 0:
                await session.flush()

    await session.commit()
    return inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        count = await seed_observations(session)
        print(f"Seeded {count} observations")


if __name__ == "__main__":
    asyncio.run(main())
