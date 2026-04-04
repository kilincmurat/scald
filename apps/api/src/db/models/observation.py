"""
Core observation tables — the central fact tables for Layers 1, 2, and 3 scalar data.

Design decisions:
  - Single table with `layer` discriminator (not PostgreSQL table inheritance)
  - Partitioned by period_year via DDL in migration (not modelled in SQLAlchemy)
  - Both raw_value and normalized values (per_capita, per_area) stored per row
  - quality_tag CHECK constraint enforces standardization rule #4
  - DataImport provides full ETL lineage per observation batch
"""
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint, Date, DateTime, ForeignKey, Index,
    Numeric, SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import DataLayer, ImportStatus, QualityTag

if TYPE_CHECKING:
    from .indicator import Indicator
    from .municipality import Municipality
    from .user import User


class IndicatorObservation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Central fact table for all scalar indicator measurements across all three layers.

    Standardization rules enforced at this level:
      Rule #2: period_year is always required (minimum annual granularity)
      Rule #3: value_per_capita and value_per_area pre-computed alongside raw value
      Rule #4: quality_tag CHECK constraint (Verified | Estimated | Pilot)
    """
    __tablename__ = "indicator_observations"
    __table_args__ = (
        # Prevents duplicate observations for the same time slot
        UniqueConstraint(
            "indicator_id", "municipality_id", "period_year", "period_month", "period_day",
            name="uq_observation_slot",
        ),
        CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_observation_quality_tag",
        ),
        CheckConstraint("period_year BETWEEN 1990 AND 2100", name="ck_observation_year_range"),
        CheckConstraint(
            "period_month IS NULL OR (period_month BETWEEN 1 AND 12)",
            name="ck_observation_month_range",
        ),
        CheckConstraint("layer IN (1, 2, 3)", name="ck_observation_layer"),
        # Composite indexes for dominant query patterns
        Index("ix_obs_municipality_year", "municipality_id", "period_year"),
        Index("ix_obs_indicator_year", "indicator_id", "period_year"),
        Index("ix_obs_municipality_indicator_year",
              "municipality_id", "indicator_id", "period_year"),
        Index("ix_obs_layer_year", "layer", "period_year"),
        Index("ix_obs_quality_tag", "quality_tag"),
        {"schema": "data"},
    )

    # ── Foreign keys ──────────────────────────────────────────────────────────
    indicator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.indicators.id", ondelete="RESTRICT"),
        nullable=False,
    )
    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Layer discriminator ───────────────────────────────────────────────────
    layer: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    """1=Core, 2=Extended, 3=Pilot. Mirrors core.indicators.layer for fast filtering."""

    # ── Time period (standardization rule #2) ─────────────────────────────────
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    """Always required. Annual is the minimum standard time unit."""

    period_month: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    """Optional. 1–12. For monthly granularity (Layer 3 only)."""

    period_day: Mapped[date | None] = mapped_column(Date, nullable=True)
    """Optional. For daily granularity (Layer 3 surveys with timestamps)."""

    # ── Values (standardization rule #3) ─────────────────────────────────────
    value_raw: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Actual measured value in the indicator's base unit."""

    value_per_capita: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Pre-computed per-capita normalization. NULL if not applicable."""

    value_per_area: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Pre-computed per-km² normalization. NULL if not applicable."""

    # ── Quality and provenance (standardization rule #4) ──────────────────────
    quality_tag: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default=QualityTag.ESTIMATED,
    )
    """Verified | Estimated | Pilot. Enforced by CHECK constraint."""

    data_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    """Institution or URL that provided this data."""

    source_file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    """MinIO object key of the raw uploaded file (links to DataImport)."""

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Verification workflow ─────────────────────────────────────────────────
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    indicator: Mapped["Indicator"] = relationship(
        back_populates="observations", lazy="select"
    )
    municipality: Mapped["Municipality"] = relationship(
        back_populates="observations", lazy="select"
    )
    submitter: Mapped["User | None"] = relationship(
        foreign_keys=[submitted_by],
        back_populates="submitted_observations",
        lazy="select",
    )
    verifier: Mapped["User | None"] = relationship(
        foreign_keys=[verified_by],
        back_populates="verified_observations",
        lazy="select",
    )

    def __repr__(self) -> str:
        return (
            f"<Observation indicator={self.indicator_id} "
            f"mun={self.municipality_id} year={self.period_year} "
            f"quality={self.quality_tag}>"
        )


class ClimateAPISnapshot(Base, UUIDPrimaryKeyMixin):
    """
    Climate data fetched from external APIs (Open-Meteo, Copernicus, World Bank).

    Typed columns hold extracted values; raw_payload preserves the full
    API response for future re-processing without re-fetching.
    """
    __tablename__ = "climate_api_snapshots"
    __table_args__ = (
        CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_climate_quality_tag",
        ),
        Index("ix_climate_municipality_year", "municipality_id", "period_year"),
        Index("ix_climate_fetched_at", "fetched_at"),
        Index("ix_climate_source_api", "source_api"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_api: Mapped[str] = mapped_column(String(100), nullable=False)
    """open_meteo | copernicus_era5 | worldbank_climate | meteomatics"""

    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    period_month: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    # ── Extracted typed columns ───────────────────────────────────────────────
    temperature_avg_c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    temperature_min_c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    temperature_max_c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    precipitation_mm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    wind_speed_avg_ms: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    humidity_avg_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    extreme_weather_days: Mapped[int | None] = mapped_column(nullable=True)

    raw_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Full API response payload. Enables re-extraction without API re-calls."""

    quality_tag: Mapped[str] = mapped_column(
        String(10), nullable=False, default=QualityTag.VERIFIED
    )


class FloodRiskZone(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Layer 2 — spatial flood risk zones with PostGIS geometry.
    Risk zones are geographic rather than scalar time-series data.
    """
    __tablename__ = "flood_risk_zones"
    __table_args__ = (
        CheckConstraint(
            "risk_level IN ('low', 'medium', 'high', 'extreme')",
            name="ck_flood_risk_level",
        ),
        CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_flood_quality_tag",
        ),
        Index("ix_flood_municipality_id", "municipality_id"),
        Index("ix_flood_risk_level", "risk_level"),
        Index("ix_flood_geometry_gist", "geometry", postgresql_using="gist"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    zone_name: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    """low | medium | high | extreme"""

    geometry: Mapped[bytes | None] = mapped_column(
        __import__("geoalchemy2", fromlist=["Geometry"]).Geometry(
            geometry_type="MULTIPOLYGON", srid=4326
        ),
        nullable=True,
    )
    area_km2: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    affected_population_est: Mapped[int | None] = mapped_column(nullable=True)
    data_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    """NULL means this zone assessment is still current."""
    quality_tag: Mapped[str] = mapped_column(
        String(10), nullable=False, default=QualityTag.ESTIMATED
    )


class BiodiversityRecord(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Layer 2 — biodiversity metrics that require multiple columns per record.
    Cannot fit into the single value_raw pattern of IndicatorObservation.
    """
    __tablename__ = "biodiversity_records"
    __table_args__ = (
        CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_biodiversity_quality_tag",
        ),
        Index("ix_biodiv_municipality_year", "municipality_id", "period_year"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    survey_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    """flora | fauna | habitat | combined"""

    species_count: Mapped[int | None] = mapped_column(nullable=True)
    protected_species_count: Mapped[int | None] = mapped_column(nullable=True)
    invasive_species_count: Mapped[int | None] = mapped_column(nullable=True)
    habitat_area_ha: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    """Hectares of protected habitat within the municipality."""

    protected_area_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    """% of municipality area under protection."""

    green_corridor_km: Mapped[float | None] = mapped_column(Numeric(10, 3), nullable=True)
    data_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quality_tag: Mapped[str] = mapped_column(
        String(10), nullable=False, default=QualityTag.ESTIMATED
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class DataImport(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Tracks every ETL run and manual upload.
    Provides full lineage: from source file → to observation rows.
    """
    __tablename__ = "data_imports"
    __table_args__ = (
        Index("ix_import_municipality_id", "municipality_id"),
        Index("ix_import_status", "status"),
        Index("ix_import_created_at", "created_at"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="SET NULL"),
        nullable=True,
    )
    imported_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    """manual_upload | airflow_dag | api_push"""

    dag_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    """MinIO object key."""

    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    indicator_domain: Mapped[str | None] = mapped_column(String(50), nullable=True)
    period_year: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    rows_inserted: Mapped[int] = mapped_column(nullable=False, default=0)
    rows_updated: Mapped[int] = mapped_column(nullable=False, default=0)
    rows_failed: Mapped[int] = mapped_column(nullable=False, default=0)
    error_log: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    """Array of {row, error} objects for failed rows."""

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ImportStatus.PENDING
    )
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    imported_by_user: Mapped["User | None"] = relationship(
        foreign_keys=[imported_by], back_populates="imports", lazy="select"
    )
