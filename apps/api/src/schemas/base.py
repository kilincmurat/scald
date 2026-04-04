"""
Shared Pydantic v2 base schemas and JSONB locale helpers.

LocalizedString is the shared type for all JSONB name/description fields.
It validates that at least 'en' or 'tr' is present, and allows partial translations.
"""
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

SUPPORTED_LOCALES = {"tr", "en", "el", "ro", "mk"}


class LocalizedString(BaseModel):
    """
    Represents a JSONB field with translations for all 5 supported locales.
    At least one locale value is required.
    """
    model_config = ConfigDict(extra="forbid")

    tr: str | None = None
    en: str | None = None
    el: str | None = None
    ro: str | None = None
    mk: str | None = None

    @field_validator("*", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str | None) -> str | None:
        return v.strip() if isinstance(v, str) else v

    def get(self, locale: str, fallback: str = "en") -> str:
        """Return value for locale, falling back to fallback locale, then any non-None."""
        val = getattr(self, locale, None)
        if val:
            return val
        fallback_val = getattr(self, fallback, None)
        if fallback_val:
            return fallback_val
        # Last resort: first non-None value
        for loc in SUPPORTED_LOCALES:
            v = getattr(self, loc, None)
            if v:
                return v
        return ""

    def to_dict(self) -> dict[str, str]:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class SCАLDBaseModel(BaseModel):
    """Project-wide Pydantic base with orm_mode enabled."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class SCАLDBaseResponse(SCАLDBaseModel):
    """Base for all response schemas — includes id and timestamps."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class PaginatedResponse(SCАLDBaseModel):
    """Generic pagination envelope."""
    total: int
    page: int
    page_size: int
    pages: int
    items: list  # type: ignore[type-arg]
