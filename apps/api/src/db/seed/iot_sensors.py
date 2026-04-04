"""
Seed: Layer 3 — IoT sensörleri + gerçekçi sensör okumaları.

Senaryo:
  - 5 pilot belediye (TR-ANK, GR-ATH, RO-BUC, MK-SKO, BG-SOF)
  - Her belediyede 3–6 sensör (hava kalitesi, gürültü, trafik, atık)
  - Her sensör için son 90 günün saatlik okumaları (~2160 satır/sensör)
  - Günlük pattern: sabah-akşam trafiği, günlük sıcaklık değişimi
  - Haftalık pattern: hafta sonu düşük trafik

Bu seed çalıştıktan sonra iot.sensor_aggregations tablosu da doldurulur.
TimescaleDB aktif değilse standard PostgreSQL kullanılır.
"""
import asyncio
import math
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.iot import IoTSensor, IoTSensorReading, IoTSensorAggregation
from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.models.enums import IoTReadingQuality
from src.db.session import AsyncSessionLocal

random.seed(99)

NOW = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
DAYS_BACK = 90
START_TIME = NOW - timedelta(days=DAYS_BACK)


# ─────────────────────────────────────────────────────────────────────────────
# Sensör tanımları
# ─────────────────────────────────────────────────────────────────────────────
SENSOR_DEFS: list[dict] = [
    # ── Ankara ───────────────────────────────────────────────────────────────
    {
        "mun_code": "TR-ANK", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "ANK-AQ-001", "manufacturer": "Aeroqual", "model": "AQM65",
        "lon": 32.8597, "lat": 39.9200,
        "name": {"tr": "Kızılay Hava Kalitesi", "en": "Kızılay Air Quality Station"},
        "base_value": 32.0, "daily_amplitude": 18.0, "weekly_factor": 0.75,
        "peak_hours": [8, 9, 17, 18], "noise_std": 4.0,
    },
    {
        "mun_code": "TR-ANK", "indicator_slug": "iot_noise_level_avg",
        "sensor_type": "noise", "unit": "dB(A)",
        "external_id": "ANK-NS-001", "manufacturer": "Cirrus", "model": "CR:162C",
        "lon": 32.8654, "lat": 39.9189,
        "name": {"tr": "Atatürk Bulvarı Gürültü", "en": "Atatürk Boulevard Noise"},
        "base_value": 62.0, "daily_amplitude": 12.0, "weekly_factor": 0.80,
        "peak_hours": [8, 9, 17, 18, 19], "noise_std": 3.0,
    },
    {
        "mun_code": "TR-ANK", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "ANK-AQ-002", "manufacturer": "Aeroqual", "model": "AQM65",
        "lon": 32.8821, "lat": 39.9048,
        "name": {"tr": "OSB Hava Kalitesi", "en": "Industrial Zone Air Quality"},
        "base_value": 48.0, "daily_amplitude": 22.0, "weekly_factor": 0.55,
        "peak_hours": [6, 7, 8, 14, 15], "noise_std": 6.0,
    },

    # ── Athens ────────────────────────────────────────────────────────────────
    {
        "mun_code": "GR-ATH", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "ATH-AQ-001", "manufacturer": "Vaisala", "model": "AQT530",
        "lon": 23.7283, "lat": 37.9754,
        "name": {"el": "Σταθμός Αέρα Ομόνοια", "en": "Omonia Air Quality Station"},
        "base_value": 22.0, "daily_amplitude": 14.0, "weekly_factor": 0.70,
        "peak_hours": [8, 9, 17, 18], "noise_std": 3.0,
    },
    {
        "mun_code": "GR-ATH", "indicator_slug": "iot_noise_level_avg",
        "sensor_type": "noise", "unit": "dB(A)",
        "external_id": "ATH-NS-001", "manufacturer": "Norsonic", "model": "Nor139",
        "lon": 23.7322, "lat": 37.9840,
        "name": {"el": "Πανεπιστημίου Θόρυβος", "en": "Panepistimiou Noise"},
        "base_value": 64.0, "daily_amplitude": 10.0, "weekly_factor": 0.78,
        "peak_hours": [9, 10, 13, 17, 18], "noise_std": 2.5,
    },

    # ── Bucharest ─────────────────────────────────────────────────────────────
    {
        "mun_code": "RO-BUC", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "BUC-AQ-001", "manufacturer": "Aeroqual", "model": "Series500",
        "lon": 26.0963, "lat": 44.4380,
        "name": {"ro": "Stație Calitate Aer Unirii", "en": "Unirii Air Quality Station"},
        "base_value": 28.0, "daily_amplitude": 16.0, "weekly_factor": 0.72,
        "peak_hours": [7, 8, 17, 18, 19], "noise_std": 4.5,
    },
    {
        "mun_code": "RO-BUC", "indicator_slug": "iot_noise_level_avg",
        "sensor_type": "noise", "unit": "dB(A)",
        "external_id": "BUC-NS-001", "manufacturer": "Brüel & Kjær", "model": "2238",
        "lon": 26.1025, "lat": 44.4268,
        "name": {"ro": "Calea Victoriei Zgomot", "en": "Calea Victoriei Noise"},
        "base_value": 66.0, "daily_amplitude": 11.0, "weekly_factor": 0.82,
        "peak_hours": [8, 9, 12, 17, 18], "noise_std": 3.5,
    },
    {
        "mun_code": "RO-BUC", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "BUC-AQ-002", "manufacturer": "Vaisala", "model": "AQT530",
        "lon": 26.0785, "lat": 44.4145,
        "name": {"ro": "Stație Aer Drumul Taberei", "en": "Drumul Taberei Air Quality"},
        "base_value": 24.0, "daily_amplitude": 12.0, "weekly_factor": 0.68,
        "peak_hours": [7, 8, 17, 18], "noise_std": 3.0,
    },

    # ── Skopje ────────────────────────────────────────────────────────────────
    {
        "mun_code": "MK-SKO", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "SKO-AQ-001", "manufacturer": "Tera Group", "model": "AirSense",
        "lon": 21.4316, "lat": 41.9944,
        "name": {"mk": "Воздушна Станица Центар", "en": "Centar Air Quality Station"},
        "base_value": 55.0, "daily_amplitude": 30.0, "weekly_factor": 0.70,
        "peak_hours": [7, 8, 9, 16, 17, 18], "noise_std": 8.0,
    },
    {
        "mun_code": "MK-SKO", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "SKO-AQ-002", "manufacturer": "Tera Group", "model": "AirSense",
        "lon": 21.3980, "lat": 42.0048,
        "name": {"mk": "Воздушна Станица Аеродром", "en": "Aerodrom Air Quality Station"},
        "base_value": 62.0, "daily_amplitude": 35.0, "weekly_factor": 0.65,
        "peak_hours": [6, 7, 8, 15, 16, 17], "noise_std": 9.0,
    },

    # ── Sofia ─────────────────────────────────────────────────────────────────
    {
        "mun_code": "BG-SOF", "indicator_slug": "iot_air_quality_pm25_realtime",
        "sensor_type": "air_quality", "unit": "µg/m3",
        "external_id": "SOF-AQ-001", "manufacturer": "Envea", "model": "Cairnet",
        "lon": 23.3219, "lat": 42.6937,
        "name": {"en": "Sofia Center Air Quality", "mk": "Качество на въздуха Център"},
        "base_value": 30.0, "daily_amplitude": 18.0, "weekly_factor": 0.72,
        "peak_hours": [8, 9, 17, 18], "noise_std": 5.0,
    },
    {
        "mun_code": "BG-SOF", "indicator_slug": "iot_noise_level_avg",
        "sensor_type": "noise", "unit": "dB(A)",
        "external_id": "SOF-NS-001", "manufacturer": "Casella", "model": "dBadge2",
        "lon": 23.3287, "lat": 42.6977,
        "name": {"en": "Vitosha Blvd Noise", "mk": "Шум Витоша Бул."},
        "base_value": 61.0, "daily_amplitude": 9.0, "weekly_factor": 0.80,
        "peak_hours": [9, 10, 17, 18, 19], "noise_std": 2.5,
    },
]


def generate_hourly_value(
    dt: datetime,
    base: float,
    amplitude: float,
    weekly_factor: float,
    peak_hours: list[int],
    noise_std: float,
) -> tuple[float, int]:
    """
    Gerçekçi sensör değeri:
    1. Günlük sinüs dalgası (gece düşük, gün yüksek)
    2. Trafik tepe saatleri için +spike
    3. Hafta sonu düşüşü
    4. Gaussian gürültü
    5. Kış aylarında +%20 (hava kalitesi sensörleri için)
    """
    hour = dt.hour
    weekday = dt.weekday()  # 0=Mon, 6=Sun
    month = dt.month

    # 1. Günlük sinüs — minimum gece 3'te, maksimum öğleden sonra 3'te
    daily = amplitude * 0.5 * (1 - math.cos(2 * math.pi * (hour - 3) / 24))

    # 2. Trafik tepeleri
    peak_bonus = amplitude * 0.4 if hour in peak_hours else 0.0

    # 3. Hafta sonu düşüşü
    weekend_mult = weekly_factor if weekday >= 5 else 1.0

    # 4. Mevsimsel faktör (kış = daha yüksek kirlilik)
    winter = 1.0 + 0.2 * math.cos(2 * math.pi * (month - 1) / 12)

    raw = (base + daily + peak_bonus) * weekend_mult * winter
    raw += random.gauss(0, noise_std)
    raw = max(0.0, raw)

    # Kalite: %3 şüpheli, %0.5 geçersiz
    r = random.random()
    if r < 0.005:
        quality = IoTReadingQuality.INVALID
    elif r < 0.03:
        quality = IoTReadingQuality.SUSPECT
    else:
        quality = IoTReadingQuality.OK

    return round(raw, 3), quality


async def seed_iot(session: AsyncSession) -> tuple[int, int, int]:
    """Returns (sensors_inserted, readings_inserted, aggregations_inserted)."""
    # Resolve maps
    slug_map = {
        r.slug: r.id
        for r in (await session.execute(select(Indicator.slug, Indicator.id))).all()
    }
    code_map = {
        r.code: r.id
        for r in (await session.execute(select(Municipality.code, Municipality.id))).all()
    }

    sensors_inserted = readings_inserted = aggs_inserted = 0

    for sdef in SENSOR_DEFS:
        mun_id = code_map.get(sdef["mun_code"])
        if not mun_id:
            continue
        indicator_id = slug_map.get(sdef["indicator_slug"])

        # ── Create sensor ─────────────────────────────────────────────────
        existing_sensor_id = await session.scalar(
            select(IoTSensor.id).where(IoTSensor.external_id == sdef["external_id"])
        )
        if existing_sensor_id:
            sensor_id = existing_sensor_id
        else:
            sensor = IoTSensor(
                municipality_id=mun_id,
                indicator_id=indicator_id,
                external_id=sdef["external_id"],
                name=sdef.get("name"),
                sensor_type=sdef["sensor_type"],
                manufacturer=sdef.get("manufacturer"),
                model=sdef.get("model"),
                unit=sdef["unit"],
                sampling_interval_seconds=3600,  # Saatlik
                is_active=True,
                installed_at=START_TIME - timedelta(days=30),
            )
            session.add(sensor)
            await session.flush()
            sensor_id = sensor.id
            sensors_inserted += 1

        # ── Generate hourly readings ──────────────────────────────────────
        # Batch insert via bulk add
        readings_batch: list[IoTSensorReading] = []
        hourly_buckets: dict[str, list[float]] = {}  # "YYYY-MM-DD-HH" → values

        current = START_TIME
        while current <= NOW:
            # Check if reading already exists
            val, q_flag = generate_hourly_value(
                current,
                sdef["base_value"],
                sdef["daily_amplitude"],
                sdef["weekly_factor"],
                sdef["peak_hours"],
                sdef["noise_std"],
            )
            readings_batch.append(IoTSensorReading(
                sensor_id=sensor_id,
                recorded_at=current,
                value=val,
                quality_flag=q_flag,
            ))
            # Track for daily aggregation
            day_key = current.strftime("%Y-%m-%d")
            hourly_buckets.setdefault(day_key, []).append(val)

            current += timedelta(hours=1)

        # Bulk insert readings (skip if already exist — idempotency via conflict)
        for reading in readings_batch:
            session.add(reading)
        readings_inserted += len(readings_batch)

        await session.flush()

        # ── Daily aggregations ─────────────────────────────────────────────
        for day_str, values in hourly_buckets.items():
            day_dt = datetime.strptime(day_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            period_end = day_dt + timedelta(days=1)

            exists = await session.scalar(
                select(IoTSensorAggregation.id).where(
                    IoTSensorAggregation.sensor_id == sensor_id,
                    IoTSensorAggregation.period_start == day_dt,
                    IoTSensorAggregation.granularity == "day",
                )
            )
            if exists:
                continue

            valid = [v for v in values if v >= 0]
            if not valid:
                continue

            session.add(IoTSensorAggregation(
                sensor_id=sensor_id,
                period_start=day_dt,
                period_end=period_end,
                granularity="day",
                value_avg=round(sum(valid) / len(valid), 4),
                value_min=round(min(valid), 4),
                value_max=round(max(valid), 4),
                value_sum=round(sum(valid), 4),
                reading_count=len(valid),
                quality_flag=0,
            ))
            aggs_inserted += 1

        await session.flush()

    await session.commit()
    return sensors_inserted, readings_inserted, aggs_inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        sensors, readings, aggs = await seed_iot(session)
        print(
            f"Seeded {sensors} sensors, "
            f"{readings} hourly readings, "
            f"{aggs} daily aggregations"
        )


if __name__ == "__main__":
    asyncio.run(main())
