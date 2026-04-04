"""EFCT Submission Pydantic schemas — municipal data collection interface."""
import uuid
from datetime import datetime

from pydantic import Field, field_validator

from src.schemas.base import SCАLDBaseModel


class EfctSubmissionItemPatch(SCАLDBaseModel):
    """PATCH a single sub-indicator value in a draft submission."""
    value_raw: float | None = None
    value_notes: str | None = None
    data_source: str | None = Field(None, max_length=255)
    is_estimated: bool = False
    estimation_method: str | None = Field(None, max_length=100)


class EfctSubmissionItemResponse(SCАLDBaseModel):
    id: uuid.UUID
    submission_id: uuid.UUID
    indicator_id: uuid.UUID
    indicator_slug: str | None = None
    indicator_name: dict | None = None
    indicator_unit: str | None = None
    value_raw: float | None
    value_notes: str | None
    data_source: str | None
    supporting_file_key: str | None
    is_estimated: bool
    estimation_method: str | None
    updated_at: datetime


class EfctSubmissionCreate(SCАLDBaseModel):
    """Create a new draft submission for a municipality/year."""
    municipality_id: uuid.UUID
    period_year: int = Field(..., ge=2000, le=2100)


class EfctSubmissionResponse(SCАLDBaseModel):
    """Summary of a submission (list view)."""
    id: uuid.UUID
    municipality_id: uuid.UUID
    municipality_name: dict | None = None
    period_year: int
    submission_status: str
    submission_round: int
    completeness_pct: float | None
    submitted_at: datetime | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class EfctSubmissionDetail(EfctSubmissionResponse):
    """Full detail including all items."""
    submitted_by: uuid.UUID | None
    reviewed_by: uuid.UUID | None
    review_notes: str | None
    rejection_reason: dict | None
    items: list[EfctSubmissionItemResponse] = Field(default_factory=list)
    items_total: int = 0
    items_filled: int = 0


class EfctSubmitAction(SCАLDBaseModel):
    """Body for POST /submissions/{id}/submit — optional declaration."""
    declaration: str | None = Field(
        None,
        description="Belediye yetkilisinin veri doğruluk beyanı",
        max_length=1000,
    )


class EfctReviewAction(SCАLDBaseModel):
    """Body for POST /submissions/{id}/approve or /reject."""
    notes: str | None = Field(None, max_length=2000)
    rejection_reason: dict | None = None
    """Required for reject: {"tr": "...", "en": "...", ...}"""

    @field_validator("rejection_reason")
    @classmethod
    def at_least_one_locale(cls, v: dict | None) -> dict | None:
        if v is not None and not any(v.values()):
            raise ValueError("rejection_reason must have at least one non-empty locale")
        return v
