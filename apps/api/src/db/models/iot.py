"""
IoT Layer (Layer 3) — sensor registry and readings.

Design for TimescaleDB readiness:
  - sensor_readings uses composite PK (sensor_id, recorded_at) — no surrogate UUID
  - Partitioned on recorded_at by the migration script
  - To migrate to TimescaleDB: SELECT create_hypertable('iot.sensor_readings', 'recorded_at')
  - sensor_aggregations pre-aggregates hourly/daily rollups for the dashboard

When TimescaleDB is active, add:
  SELECT add_retention_policy('iot.sensor_readings', INTERVAL '2 years');
  SELECT add_continuous_aggregate_policy('iot.sensor_readings_hourly', ...);
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry
from sqlalchemy import (
    Boolean, DateTime, Double, ForeignKey, Index,
    SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import IoTReadingQuality, SensorType

if TYPE_CHECKING:
    from .municipality import Municipality
    from .indicator import Indicator


class IoTSensor(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Registry of physical and virtual sensor devices.
    Every sensor is linked to a municipality and an indicator (what it measures).
    """
    __tablename__ = "sensors"
    __table_args__ = (
        Index("ix_sensor_municipality_id", "municipality_id"),
        Index("ix_sensor_type", "sensor_type"),
        Index("ix_sensor_indicator_id", "indicator_id"),
        Index("ix_sensor_external_id", "external_id"),
        Index("ix_sensor_location_gist", "location", postgresql_using="gist"),
        {"schema": "iot"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    indicator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.indicators.id", ondelete="SET NULL"),
        nullable=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    """Vendor-assigned device ID (e.g. sensor serial number or API device ID)."""

    name: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Localized sensor label: {"tr": "Hava kalitesi #1", "en": "Air quality #1", ...}"""

    sensor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    """air_quality | noise | traffic_counter | waste_fill_level | water_flow | ..."""

    manufacturer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    location: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )
    """Exact sensor position. SRID 4326 (WGS84)."""

    location_description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Human-readable location name in 5 locales."""

    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    """Measurement unit (e.g. µg/m³, dB, vehicles/hour)."""

    sampling_interval_seconds: Mapped[int | None] = mapped_column(nullable=True)
    """How frequently the sensor reports readings."""

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    installed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decommissioned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(
        back_populates="sensors", lazy="select"
    )
    indicator: Mapped["Indicator | None"] = relationship(
        back_populates="sensors", lazy="select"
    )
    readings: Mapped[list["IoTSensorReading"]] = relationship(
        back_populates="sensor", lazy="dynamic"
    )
    aggregations: Mapped[list["IoTSensorAggregation"]] = relationship(
        back_populates="sensor", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<IoTSensor type={self.sensor_type} external_id={self.external_id}>"


class IoTSensorReading(Base):
    """
    High-cardinality raw sensor readings.

    TimescaleDB-ready design:
      - No surrogate UUID primary key (saves ~16 bytes + index per row)
      - Composite PK (sensor_id, recorded_at) is the TimescaleDB hypertable key
      - quality_flag is SMALLINT (not VARCHAR) for storage efficiency at scale

    Migration to TimescaleDB:
      SELECT create_hypertable('iot.sensor_readings', 'recorded_at');
    """
    __tablename__ = "sensor_readings"
    __table_args__ = (
        Index("ix_reading_recorded_at_desc", "recorded_at", postgresql_ops={"recorded_at": "DESC"}),
        {"schema": "iot"},
    )

    sensor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("iot.sensors.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        primary_key=True,
        nullable=False,
    )
    """Partition key for TimescaleDB. Always store in UTC."""

    value: Mapped[float] = mapped_column(Double, nullable=False)
    quality_flag: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=IoTReadingQuality.OK
    )
    """0=OK, 1=Suspect, 2=Invalid. Integer for efficient storage at scale."""

    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Original sensor message payload. Optional, for debugging/re-processing."""

    # ── Relationships ─────────────────────────────────────────────────────────
    sensor: Mapped["IoTSensor"] = relationship(
        back_populates="readings", lazy="select"
    )


class IoTSensorAggregation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Pre-aggregated rollups (hourly, daily, monthly) from raw readings.
    Used by Airflow DAGs to populate Layer 3 entries in indicator_observations.
    """
    __tablename__ = "sensor_aggregations"
    __table_args__ = (
        UniqueConstraint(
            "sensor_id", "period_start", "granularity",
            name="uq_aggregation_sensor_period_granularity",
        ),
        Index("ix_agg_sensor_granularity_start", "sensor_id", "granularity", "period_start"),
        {"schema": "iot"},
    )

    sensor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("iot.sensors.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    granularity: Mapped[str] = mapped_column(String(10), nullable=False)
    """hour | day | month"""

    value_avg: Mapped[float | None] = mapped_column(Double, nullable=True)
    value_min: Mapped[float | None] = mapped_column(Double, nullable=True)
    value_max: Mapped[float | None] = mapped_column(Double, nullable=True)
    value_sum: Mapped[float | None] = mapped_column(Double, nullable=True)
    reading_count: Mapped[int] = mapped_column(nullable=False, default=0)
    """Number of raw readings that contributed to this aggregation."""

    quality_flag: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=IoTReadingQuality.OK
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    sensor: Mapped["IoTSensor"] = relationship(
        back_populates="aggregations", lazy="select"
    )

    def __repr__(self) -> str:
        return (
            f"<IoTSensorAggregation sensor={self.sensor_id} "
            f"granularity={self.granularity} start={self.period_start}>"
        )
