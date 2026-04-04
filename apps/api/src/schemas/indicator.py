"""
Pydantic schemas for the Indicator catalog.
The slug is the ETL contract — validated to be lowercase snake_case.
"""
import re
import uuid
from datetime import datetime

from pydantic import Field, field_validator

from .base import LocalizedString, SCАLDBaseModel, SCАLDBaseResponse

SLUG_RE = re.compile(r"^[a-z][a-z0-9_]{2,99}$")


class IndicatorBase(SCАLDBaseModel):
    slug: str = Field(..., min_length=3, max_length=100, examples=["water_consumption_total"])
    name: LocalizedString
    description: LocalizedString | None = None
    layer: int = Field(..., ge=1, le=3, description="1=Core, 2=Extended, 3=Pilot")
    domain: str = Field(..., max_length=50)
    unit: str = Field(..., max_length=50, examples=["m3", "tonne", "kWh"])
    unit_per_capita: str | None = Field(None, max_length=50)
    unit_per_area: str | None = Field(None, max_length=50)
    data_source_hint: str | None = None
    is_mandatory: bool = False
    sort_order: int = 0

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError(
                "slug must be lowercase snake_case, start with a letter, 3–100 chars"
            )
        return v


class IndicatorCreate(IndicatorBase):
    pass


class IndicatorUpdate(SCАLDBaseModel):
    """All fields optional for PATCH semantics."""
    name: LocalizedString | None = None
    description: LocalizedString | None = None
    unit: str | None = None
    unit_per_capita: str | None = None
    unit_per_area: str | None = None
    data_source_hint: str | None = None
    is_mandatory: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class IndicatorResponse(SCАLDBaseResponse):
    slug: str
    name: dict
    description: dict | None
    layer: int
    domain: str
    unit: str
    unit_per_capita: str | None
    unit_per_area: str | None
    is_mandatory: bool
    is_active: bool
    sort_order: int

    def localized_name(self, locale: str = "en") -> str:
        return self.name.get(locale) or self.name.get("en", self.slug)


class IndicatorSummary(SCАLDBaseModel):
    """Compact form for embedded lists (e.g. observation detail)."""
    id: uuid.UUID
    slug: str
    name: dict
    layer: int
    domain: str
    unit: str
