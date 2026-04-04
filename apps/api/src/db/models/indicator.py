"""
Indicator catalog — the shared definition of every metric across all three layers.

Standardization rules implemented here:
  Rule #1: Common indicator definitions via the indicators table (one row per concept)
  Rule #2: Annual minimum granularity is enforced at observation level (see observation.py)
  Rule #3: unit / unit_per_capita / unit_per_area columns express normalization options
  Rule #4: is_mandatory flags Layer 1 indicators; quality_tag is on each observation
"""
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import DataLayer, IndicatorDomain

if TYPE_CHECKING:
    from .observation import IndicatorObservation
    from .iot import IoTSensor


class Indicator(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Shared indicator catalog.

    The `slug` is the ETL contract — Airflow DAGs reference indicators by slug,
    never by UUID, to decouple pipeline code from database IDs.

    JSONB name/description fields use the 5-locale pattern:
      {"tr": "Su tüketimi", "en": "Water consumption", "el": "...", "ro": "...", "mk": "..."}
    """
    __tablename__ = "indicators"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_indicator_slug"),
        Index("ix_ind_layer", "layer"),
        Index("ix_ind_domain", "domain"),
        Index("ix_ind_slug", "slug"),
        Index("ix_ind_name_gin", "name", postgresql_using="gin"),
        {"schema": "core"},
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    """
    Machine-stable identifier. Never rename in production.
    Convention: {domain}_{concept}  e.g. water_consumption_per_capita
    """

    name: Mapped[dict] = mapped_column(JSONB, nullable=False)
    """Display name in all 5 locales."""

    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Longer explanation of what this indicator measures, in all 5 locales."""

    # ── Classification ────────────────────────────────────────────────────────
    layer: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    """Data layer: 1=Core, 2=Extended, 3=Pilot (maps to DataLayer enum)."""

    domain: Mapped[str] = mapped_column(String(50), nullable=False)
    """Thematic domain from IndicatorDomain enum."""

    # ── Units (standardization rule #3) ──────────────────────────────────────
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    """Base measurement unit: m3, tonne, kWh, person, hectare, %, index..."""

    unit_per_capita: Mapped[str | None] = mapped_column(String(50), nullable=True)
    """Unit when expressed per capita. E.g. 'm3/person', 'kWh/person'."""

    unit_per_area: Mapped[str | None] = mapped_column(String(50), nullable=True)
    """Unit when expressed per km². E.g. 'kWh/km2', 'tonne/km2'."""

    # ── Metadata ──────────────────────────────────────────────────────────────
    data_source_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    """Human-readable hint about the typical data source (e.g. 'EUROSTAT, annual survey')."""

    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    """True for all Layer 1 indicators — municipalities must report these."""

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    sort_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=0)
    """Display order within domain category in the UI."""

    # ── Relationships ─────────────────────────────────────────────────────────
    observations: Mapped[list["IndicatorObservation"]] = relationship(
        back_populates="indicator", lazy="dynamic"
    )
    sensors: Mapped[list["IoTSensor"]] = relationship(
        back_populates="indicator", lazy="select"
    )

    def __repr__(self) -> str:
        return f"<Indicator slug={self.slug} layer={self.layer}>"

    def localized_name(self, locale: str = "en") -> str:
        if isinstance(self.name, dict):
            return self.name.get(locale) or self.name.get("en") or self.slug
        return self.slug
