"""
EFCT — Ecological Footprint Calculation Tool models.

Six new tables, all in the `data` schema:
  1. EfctScore              — materialized composite result per municipality/year
  2. EfctSubmission         — municipal self-report envelope (draft → submitted → approved)
  3. EfctSubmissionItem     — individual sub-indicator values within a submission
  4. EfctIndicatorMetadata  — weights, benchmarks, scoring direction per sub-indicator
  5. EfctCategoryWeight     — versioned 15-category weights
  6. EfctClimateSeries      — pre-processed 30-year climate series per municipality/year
"""
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey,
    Index, Numeric, SmallInteger, String, Text, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import (
    EfctDataQualityFlag, EfctFetchStatus, EfctImputationStrategy,
    EfctRating, EfctScoringDirection, EfctSubmissionStatus, EfctTrigger,
)

if TYPE_CHECKING:
    from .municipality import Municipality
    from .indicator import Indicator
    from .user import User


# ─────────────────────────────────────────────────────────────────────────────
# Table 1: EfctScore
# ─────────────────────────────────────────────────────────────────────────────

class EfctScore(Base, UUIDPrimaryKeyMixin):
    """
    Materialized composite ecological footprint score.

    Produced by the Celery calculation engine — never written directly by the API.
    Superseded rows are retained (superseded_at is set) for audit history.
    """
    __tablename__ = "efct_scores"
    __table_args__ = (
        UniqueConstraint(
            "municipality_id", "period_year",
            name="uq_efct_score_mun_year",
        ),
        CheckConstraint(
            "rating IN ('A','B','C','D','E','F')",
            name="ck_efct_score_rating",
        ),
        CheckConstraint(
            "data_quality_flag IN ('complete','partial','low_coverage')",
            name="ck_efct_score_quality_flag",
        ),
        CheckConstraint(
            "triggered_by IN ('celery_beat','submission','admin_forced','etl')",
            name="ck_efct_score_trigger",
        ),
        Index("ix_efct_score_mun_year", "municipality_id", "period_year"),
        Index("ix_efct_score_year_total", "period_year", "score_total"),
        Index("ix_efct_score_year_rating", "period_year", "rating"),
        Index("ix_efct_score_current",
              "municipality_id", "period_year",
              postgresql_where="superseded_at IS NULL"),
        Index("ix_efct_score_components_gin", "component_scores",
              postgresql_using="gin"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # ── Scores ────────────────────────────────────────────────────────────────
    score_total: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    """Composite 0–100 score."""

    score_percentile: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    """Rank within country_code cohort (0–100)."""

    rating: Mapped[str | None] = mapped_column(String(2), nullable=True)
    """A / B / C / D / E / F — derived from score_total."""

    # ── Component breakdown ───────────────────────────────────────────────────
    component_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    """{"efct_carbon": 72.4, "efct_energy_use": 61.1, ...} — 15 categories."""

    component_weights: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    """Snapshot of weights used in this calculation (for reproducibility)."""

    # ── Coverage & quality ────────────────────────────────────────────────────
    coverage_pct: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    """Percentage of 80 sub-indicators that had real (non-imputed) data."""

    missing_indicators: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    """Array of slugs that were imputed."""

    imputation_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    """Dominant imputation strategy used: peer_median | national_average | mixed."""

    data_quality_flag: Mapped[str | None] = mapped_column(String(20), nullable=True)
    """complete (≥90% real data) | partial (50–89%) | low_coverage (<50%)."""

    # ── Provenance ────────────────────────────────────────────────────────────
    calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    calculation_version: Mapped[str] = mapped_column(
        String(20), nullable=False, default="efct_v1"
    )
    triggered_by: Mapped[str | None] = mapped_column(String(30), nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    superseded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    """NULL = current score. Set when a newer calculation supersedes this row."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=__import__("sqlalchemy", fromlist=["func"]).func.now(),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(lazy="select")

    def __repr__(self) -> str:
        return (
            f"<EfctScore mun={self.municipality_id} year={self.period_year} "
            f"score={self.score_total} rating={self.rating}>"
        )

    @property
    def is_current(self) -> bool:
        return self.superseded_at is None

    @staticmethod
    def rating_from_score(score: float) -> str:
        if score >= 90:
            return "A"
        if score >= 75:
            return "B"
        if score >= 60:
            return "C"
        if score >= 45:
            return "D"
        if score >= 30:
            return "E"
        return "F"


# ─────────────────────────────────────────────────────────────────────────────
# Table 2: EfctSubmission
# ─────────────────────────────────────────────────────────────────────────────

class EfctSubmission(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Municipal data collection envelope.

    Lifecycle: draft → submitted → under_review → approved | rejected
    Approval promotes EfctSubmissionItems into data.indicator_observations.
    """
    __tablename__ = "efct_submissions"
    __table_args__ = (
        UniqueConstraint(
            "municipality_id", "period_year", "submission_round",
            name="uq_efct_submission_mun_year_round",
        ),
        CheckConstraint(
            "submission_status IN ('draft','submitted','under_review','approved','rejected')",
            name="ck_efct_submission_status",
        ),
        Index("ix_efct_sub_municipality_year", "municipality_id", "period_year"),
        Index("ix_efct_sub_status", "submission_status"),
        Index("ix_efct_sub_submitted_at", "submitted_at"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    submission_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=EfctSubmissionStatus.DRAFT
    )
    submission_round: Mapped[int] = mapped_column(
        SmallInteger, nullable=False, default=1
    )
    """Allows re-submission within same year (e.g. after rejection)."""

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """{"tr": "...", "en": "...", "el": "...", "ro": "...", "mk": "..."} — localized."""

    completeness_pct: Mapped[float | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    """Auto-computed on submit: items_filled / 80 × 100."""

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(lazy="select")
    submitter: Mapped["User | None"] = relationship(
        foreign_keys=[submitted_by], lazy="select"
    )
    reviewer: Mapped["User | None"] = relationship(
        foreign_keys=[reviewed_by], lazy="select"
    )
    items: Mapped[list["EfctSubmissionItem"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return (
            f"<EfctSubmission mun={self.municipality_id} year={self.period_year} "
            f"status={self.submission_status} round={self.submission_round}>"
        )


# ─────────────────────────────────────────────────────────────────────────────
# Table 3: EfctSubmissionItem
# ─────────────────────────────────────────────────────────────────────────────

class EfctSubmissionItem(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Single sub-indicator value within a municipal submission.
    One row per (submission, indicator) pair — enforced by unique constraint.
    """
    __tablename__ = "efct_submission_items"
    __table_args__ = (
        UniqueConstraint(
            "submission_id", "indicator_id",
            name="uq_efct_item_submission_indicator",
        ),
        Index("ix_efct_item_submission_id", "submission_id"),
        Index("ix_efct_item_indicator_id", "indicator_id"),
        {"schema": "data"},
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.efct_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    indicator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.indicators.id", ondelete="RESTRICT"),
        nullable=False,
    )
    value_raw: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    value_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    supporting_file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    """MinIO object key for supporting documentation."""

    is_estimated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    estimation_method: Mapped[str | None] = mapped_column(String(100), nullable=True)
    """If is_estimated: how was this value derived?"""

    # ── Relationships ─────────────────────────────────────────────────────────
    submission: Mapped["EfctSubmission"] = relationship(
        back_populates="items", lazy="select"
    )
    indicator: Mapped["Indicator"] = relationship(lazy="select")


# ─────────────────────────────────────────────────────────────────────────────
# Table 4: EfctIndicatorMetadata
# ─────────────────────────────────────────────────────────────────────────────

class EfctIndicatorMetadata(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    EFCT-specific scoring configuration per sub-indicator.
    Extends core.indicators without modifying it.

    weight_in_category and weight_in_total must be maintained in sync
    with EfctCategoryWeight. The app layer enforces that weights within
    a category sum to 1.0 on upsert.
    """
    __tablename__ = "efct_indicator_metadata"
    __table_args__ = (
        UniqueConstraint("indicator_id", name="uq_efct_meta_indicator"),
        CheckConstraint(
            "scoring_direction IN ('higher_better','lower_better','target')",
            name="ck_efct_meta_direction",
        ),
        CheckConstraint(
            "imputation_strategy IN ('peer_median','national_average','zero','skip')",
            name="ck_efct_meta_imputation",
        ),
        Index("ix_efct_meta_indicator_id", "indicator_id"),
        Index("ix_efct_meta_category", "category"),
        {"schema": "data"},
    )

    indicator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.indicators.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    """Redundant copy of indicator.domain for query convenience (e.g. 'efct_carbon')."""

    weight_in_category: Mapped[float] = mapped_column(
        Numeric(6, 5), nullable=False
    )
    """Weight within its 15-category group. All weights in category must sum to 1.0."""

    weight_in_total: Mapped[float] = mapped_column(
        Numeric(6, 5), nullable=False
    )
    """Derived: category_weight × weight_in_category. Pre-computed for calculator."""

    scoring_direction: Mapped[str] = mapped_column(String(15), nullable=False)
    """higher_better | lower_better | target."""

    target_value: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Only for scoring_direction='target'. Score = 100×(1-|val-target|/target)."""

    benchmark_source: Mapped[str | None] = mapped_column(String(100), nullable=True)
    """eu_average | country_average | un_sdg | who_guideline | custom."""

    min_value: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Min for Min-Max normalization."""

    max_value: Mapped[float | None] = mapped_column(Numeric(18, 6), nullable=True)
    """Max for Min-Max normalization."""

    imputation_strategy: Mapped[str] = mapped_column(
        String(30), nullable=False, default=EfctImputationStrategy.PEER_MEDIAN
    )
    version: Mapped[str] = mapped_column(
        String(20), nullable=False, default="efct_v1"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    indicator: Mapped["Indicator"] = relationship(lazy="select")


# ─────────────────────────────────────────────────────────────────────────────
# Table 5: EfctCategoryWeight
# ─────────────────────────────────────────────────────────────────────────────

class EfctCategoryWeight(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Versioned category-level weights for the 15 EFCT domains.
    Allows algorithm to evolve without data migration.
    All 15 category weights for a given version must sum to 1.0.
    """
    __tablename__ = "efct_category_weights"
    __table_args__ = (
        UniqueConstraint("category", "version", name="uq_efct_catweight_cat_ver"),
        Index("ix_efct_catweight_version_from", "version", "effective_from"),
        {"schema": "data"},
    )

    category: Mapped[str] = mapped_column(String(50), nullable=False)
    """One of the 15 efct_* domain strings."""

    weight: Mapped[float] = mapped_column(Numeric(6, 5), nullable=False)
    """0.0–1.0. All 15 weights for a version must sum to 1.0."""

    version: Mapped[str] = mapped_column(String(20), nullable=False)
    """e.g. 'efct_v1', 'efct_v1.1'."""

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_until: Mapped[date | None] = mapped_column(Date, nullable=True)
    """NULL = currently active."""

    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Rationale for this weight in all 5 locales."""


# ─────────────────────────────────────────────────────────────────────────────
# Table 6: EfctClimateSeries
# ─────────────────────────────────────────────────────────────────────────────

class EfctClimateSeries(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Pre-processed 30-year climate series per municipality/year.

    Populated by the Celery climate fetch task from data.climate_api_snapshots.
    Serves as the primary input for the efct_climate_risk component scorer.

    Pre-2000 data (for 30-year baselines back to ~1995) lives here, not in
    data.indicator_observations (whose partition range starts at 2000).
    """
    __tablename__ = "efct_climate_series"
    __table_args__ = (
        UniqueConstraint(
            "municipality_id", "period_year",
            name="uq_efct_climate_mun_year",
        ),
        CheckConstraint(
            "fetch_status IN ('pending','partial','complete','failed')",
            name="ck_efct_climate_fetch_status",
        ),
        Index("ix_efct_climate_mun_year", "municipality_id", "period_year"),
        Index("ix_efct_climate_fetch_status", "fetch_status"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)

    # ── Extracted climate metrics ─────────────────────────────────────────────
    temperature_avg_c: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    temperature_trend_30y: Mapped[float | None] = mapped_column(Numeric(6, 4), nullable=True)
    """Linear regression slope °C/decade over preceding 30 years."""

    precipitation_mm: Mapped[float | None] = mapped_column(Numeric(8, 2), nullable=True)
    precipitation_anomaly_pct: Mapped[float | None] = mapped_column(
        Numeric(7, 3), nullable=True
    )
    """% deviation from 1961–1990 baseline."""

    heat_wave_days: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    """Days with max temperature > 35°C."""

    extreme_precipitation_days: Mapped[int | None] = mapped_column(
        SmallInteger, nullable=True
    )
    """Days with precipitation > 50mm."""

    drought_index: Mapped[float | None] = mapped_column(Numeric(5, 3), nullable=True)
    """Standardized Precipitation-Evapotranspiration Index (SPEI-12)."""

    frost_days: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    """Days with min temperature < 0°C."""

    # ── Provenance ────────────────────────────────────────────────────────────
    source_apis: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    """["open_meteo", "copernicus_era5"] — which APIs contributed to this row."""

    fetch_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=EfctFetchStatus.PENDING
    )
    fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(lazy="select")

    def __repr__(self) -> str:
        return (
            f"<EfctClimateSeries mun={self.municipality_id} "
            f"year={self.period_year} status={self.fetch_status}>"
        )
