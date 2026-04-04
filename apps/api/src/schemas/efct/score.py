"""
EFCT Score Pydantic schemas.

EfctScoreResponse       — full score detail for a single municipality/year
EfctScoreSummary        — compact form for league tables and lists
EfctComponentBreakdown  — per-category breakdown for radar charts
EfctLeagueTableRow      — ranked row for cross-municipality comparison
EfctCompareResponse     — side-by-side comparison of two municipalities
EfctTaskResponse        — Celery task status polling response
"""
import uuid
from datetime import datetime

from pydantic import Field

from src.schemas.base import SCАLDBaseModel


class EfctComponentBreakdown(SCАLDBaseModel):
    """15 categories with their individual scores and sub-indicator coverage."""
    category: str
    """e.g. 'efct_carbon'"""
    score: float | None = Field(None, ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    coverage_pct: float | None = Field(None, ge=0, le=100)
    sub_indicators_total: int
    sub_indicators_real: int
    """How many sub-indicators had actual (non-imputed) data."""

    # Localized display name from category weight description
    name: dict | None = None


class EfctScoreResponse(SCАLDBaseModel):
    """Full score detail for one municipality/year."""
    id: uuid.UUID
    municipality_id: uuid.UUID
    municipality_name: dict | None = None
    period_year: int

    score_total: float | None = Field(None, ge=0, le=100)
    score_percentile: float | None = Field(None, ge=0, le=100)
    rating: str | None = None

    component_scores: dict = Field(default_factory=dict)
    components: list[EfctComponentBreakdown] = Field(default_factory=list)

    coverage_pct: float | None = None
    missing_indicators: list[str] | None = None
    imputation_method: str | None = None
    data_quality_flag: str | None = None

    calculated_at: datetime
    calculation_version: str
    triggered_by: str | None = None
    is_current: bool = True

    created_at: datetime


class EfctScoreSummary(SCАLDBaseModel):
    """Compact form for lists and history queries."""
    id: uuid.UUID
    municipality_id: uuid.UUID
    period_year: int
    score_total: float | None
    rating: str | None
    score_percentile: float | None
    coverage_pct: float | None
    data_quality_flag: str | None
    calculated_at: datetime
    is_current: bool


class EfctLeagueTableRow(SCАLDBaseModel):
    """One row in the cross-municipal ranking table."""
    rank: int
    municipality_id: uuid.UUID
    municipality_name: dict
    country_code: str
    period_year: int
    score_total: float | None
    rating: str | None
    score_percentile: float | None
    coverage_pct: float | None
    # Top 3 highest and lowest component scores for quick insight
    best_category: str | None = None
    best_category_score: float | None = None
    worst_category: str | None = None
    worst_category_score: float | None = None


class EfctCompareResponse(SCАLDBaseModel):
    """Side-by-side comparison of two municipalities."""
    period_year: int
    municipality_a: EfctScoreResponse
    municipality_b: EfctScoreResponse
    # Diff per category: positive = A better than B
    component_diff: dict[str, float] = Field(default_factory=dict)
    score_diff: float | None = None


class EfctTaskResponse(SCАLDBaseModel):
    """Celery task status — returned immediately from POST /recalculate."""
    task_id: str
    status: str
    """pending | running | complete | failed"""
    municipality_id: uuid.UUID
    period_year: int
    queued_at: datetime
    result: EfctScoreSummary | None = None
    error: str | None = None
