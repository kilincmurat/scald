"""
Municipality model — the geographic anchor for all SCALD data.
Uses PostGIS geometry types for boundary and centroid storage.
"""
import uuid
from typing import TYPE_CHECKING

from geoalchemy2 import Geometry
from sqlalchemy import Index, Numeric, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from .observation import IndicatorObservation
    from .user import Organization
    from .iot import IoTSensor
    from .survey import Survey


class Municipality(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Represents a local government unit (municipality, district, commune).
    All indicator observations, IoT sensors, and surveys are anchored here.

    JSONB name/region fields follow the 5-locale pattern:
      {"tr": "...", "en": "...", "el": "...", "ro": "...", "mk": "..."}
    """
    __tablename__ = "municipalities"
    __table_args__ = (
        Index("ix_mun_country_code", "country_code"),
        Index("ix_mun_code", "code", unique=True),
        Index("ix_mun_name_gin", "name", postgresql_using="gin"),
        Index("ix_mun_geometry_gist", "geometry", postgresql_using="gist"),
        Index("ix_mun_centroid_gist", "geometry_centroid", postgresql_using="gist"),
        {"schema": "core"},
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    code: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    """Official government code (NUTS-3 or national administrative code)."""

    name: Mapped[dict] = mapped_column(JSONB, nullable=False)
    """Localized names: {"tr": "Ankara", "en": "Ankara", "el": "Αγκυρα", ...}"""

    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    """ISO 3166-1 alpha-2: TR, GR, RO, MK (+ XK for Kosovo if needed)."""

    region: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Optional regional/provincial grouping, same JSONB locale structure."""

    # ── Demographics (denormalized for fast per-capita computation) ───────────
    population_latest: Mapped[int | None] = mapped_column(nullable=True)
    """Most recent population estimate. Refreshed by ETL pipeline."""

    area_km2: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    """Total area in square kilometers. Used for per-area normalization."""

    # ── Geometry ──────────────────────────────────────────────────────────────
    geometry: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326),
        nullable=True,
    )
    """Administrative boundary. SRID 4326 (WGS84)."""

    geometry_centroid: Mapped[bytes | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=True,
    )
    """Precomputed centroid. Faster for map clustering and distance queries."""

    # ── Relationships ─────────────────────────────────────────────────────────
    observations: Mapped[list["IndicatorObservation"]] = relationship(
        back_populates="municipality", lazy="dynamic"
    )
    organizations: Mapped[list["Organization"]] = relationship(
        back_populates="municipality", lazy="select"
    )
    sensors: Mapped[list["IoTSensor"]] = relationship(
        back_populates="municipality", lazy="dynamic"
    )
    surveys: Mapped[list["Survey"]] = relationship(
        back_populates="municipality", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Municipality code={self.code} country={self.country_code}>"

    def localized_name(self, locale: str = "en") -> str:
        if isinstance(self.name, dict):
            return self.name.get(locale) or self.name.get("en") or str(self.name)
        return str(self.name)
