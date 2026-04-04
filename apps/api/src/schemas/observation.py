"""
Pydantic schemas for IndicatorObservation — the central fact table.

Standardization rules enforced at schema level:
  Rule #2: period_year is required; period_month/period_day are optional
  Rule #3: value_raw required; value_per_capita / value_per_area computed server-side
  Rule #4: quality_tag validated against QualityTag enum
"""
import uuid
from datetime import date, datetime

from pydantic import Field, field_validator, model_validator

from .base import SCАLDBaseModel, SCАLDBaseResponse
from .indicator import IndicatorSummary
from .municipality import MunicipalitySummary
from src.db.models.enums import QualityTag


class ObservationCreate(SCАLDBaseModel):
    """
    Used by the API endpoint for manual data submission.
    ETL pipelines use ObservationUpsert for bulk operations.
    """
    indicator_id: uuid.UUID
    municipality_id: uuid.UUID
    period_year: int = Field(..., ge=1990, le=2100)
    period_month: int | None = Field(None, ge=1, le=12)
    period_day: date | None = None
    value_raw: float | None = None
    quality_tag: QualityTag = QualityTag.ESTIMATED
    data_source: str | None = Field(None, max_length=255)
    notes: str | None = None

    @model_validator(mode="after")
    def period_day_requires_month(self) -> "ObservationCreate":
        if self.period_day is not None and self.period_month is None:
            raise ValueError("period_month is required when period_day is provided")
        return self


class ObservationUpsert(SCАLDBaseModel):
    """
    Bulk-upsert schema for Airflow DAGs and ETL pipelines.
    Matches the unique constraint (indicator_id, municipality_id,
    period_year, period_month, period_day).
    """
    indicator_slug: str  # ETL uses slug, not UUID
    municipality_code: str  # ETL uses code, not UUID
    layer: int = Field(..., ge=1, le=3)
    period_year: int = Field(..., ge=1990, le=2100)
    period_month: int | None = Field(None, ge=1, le=12)
    period_day: date | None = None
    value_raw: float | None = None
    quality_tag: QualityTag = QualityTag.ESTIMATED
    data_source: str | None = None
    source_file_key: str | None = None
    notes: str | None = None


class ObservationUpdate(SCАLDBaseModel):
    """PATCH — analyst corrections."""
    value_raw: float | None = None
    quality_tag: QualityTag | None = None
    data_source: str | None = None
    notes: str | None = None


class ObservationResponse(SCАLDBaseResponse):
    indicator_id: uuid.UUID
    municipality_id: uuid.UUID
    layer: int
    period_year: int
    period_month: int | None
    period_day: date | None
    value_raw: float | None
    value_per_capita: float | None
    value_per_area: float | None
    quality_tag: str
    data_source: str | None
    notes: str | None
    verified_at: datetime | None
    # Nested summaries — populated via joinedload in repository
    indicator: IndicatorSummary | None = None
    municipality: MunicipalitySummary | None = None


class ObservationDetail(ObservationResponse):
    """Full detail response including submitter/verifier info."""
    submitted_by: uuid.UUID | None
    verified_by: uuid.UUID | None
    source_file_key: str | None


class ObservationFilter(SCАLDBaseModel):
    """Query parameters for filtering observations."""
    municipality_id: uuid.UUID | None = None
    municipality_code: str | None = None
    indicator_id: uuid.UUID | None = None
    indicator_slug: str | None = None
    layer: int | None = Field(None, ge=1, le=3)
    year_from: int | None = Field(None, ge=1990)
    year_to: int | None = Field(None, le=2100)
    quality_tag: QualityTag | None = None
    domain: str | None = None


class TimeSeriesPoint(SCАLDBaseModel):
    """Single data point in a time series response."""
    period_year: int
    period_month: int | None
    value_raw: float | None
    value_per_capita: float | None
    value_per_area: float | None
    quality_tag: str


class TimeSeriesResponse(SCАLDBaseModel):
    """Time series for one indicator × one municipality."""
    indicator: IndicatorSummary
    municipality: MunicipalitySummary
    data: list[TimeSeriesPoint]
