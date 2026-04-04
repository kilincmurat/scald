"""EFCT Indicator catalog Pydantic schemas."""
import uuid
from datetime import datetime

from pydantic import Field

from src.schemas.base import SCАLDBaseModel


class EfctIndicatorResponse(SCАLDBaseModel):
    """Full EFCT sub-indicator detail with scoring metadata."""
    id: uuid.UUID
    slug: str
    name: dict
    description: dict | None
    category: str
    layer: int
    unit: str
    unit_per_capita: str | None
    is_mandatory: bool
    # Scoring metadata from EfctIndicatorMetadata
    weight_in_category: float
    weight_in_total: float
    scoring_direction: str
    target_value: float | None
    benchmark_source: str | None
    min_value: float | None
    max_value: float | None
    imputation_strategy: str
    version: str
    is_active: bool
    data_source_hint: str | None


class EfctCategoryResponse(SCАLDBaseModel):
    """One of the 15 EFCT categories with its sub-indicators and weight."""
    category: str
    name: dict | None = None
    weight: float = Field(..., ge=0, le=1)
    sub_indicator_count: int
    indicators: list[EfctIndicatorResponse] = Field(default_factory=list)


class EfctBenchmarkResponse(SCАLDBaseModel):
    """Benchmark values for a category across reference groups."""
    category: str
    period_year: int
    eu_average_score: float | None
    country_average_scores: dict[str, float] = Field(default_factory=dict)
    """{"TR": 58.2, "GR": 71.4, ...}"""
    best_in_class_score: float | None
    best_in_class_municipality: dict | None = None
    worst_in_class_score: float | None
    participating_municipalities: int


class EfctIndicatorObservationPoint(SCАLDBaseModel):
    """One data point in an indicator time series."""
    period_year: int
    value_raw: float | None
    quality_tag: str
    source: str | None = Field(
        None,
        description="'submission' | 'etl' | 'imputed'"
    )
