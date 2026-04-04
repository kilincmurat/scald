"""Pydantic schemas for Municipality."""
import uuid

from pydantic import Field, field_validator

from .base import LocalizedString, SCАLDBaseModel, SCАLDBaseResponse

ALLOWED_COUNTRY_CODES = {"TR", "GR", "RO", "MK", "AL", "BA", "RS", "BG"}


class MunicipalityBase(SCАLDBaseModel):
    code: str = Field(..., min_length=2, max_length=20)
    name: LocalizedString
    country_code: str = Field(..., min_length=2, max_length=2)
    region: LocalizedString | None = None
    population_latest: int | None = Field(None, ge=0)
    area_km2: float | None = Field(None, gt=0)

    @field_validator("country_code")
    @classmethod
    def validate_country_code(cls, v: str) -> str:
        v = v.upper()
        if v not in ALLOWED_COUNTRY_CODES:
            raise ValueError(f"country_code must be one of {ALLOWED_COUNTRY_CODES}")
        return v


class MunicipalityCreate(MunicipalityBase):
    pass


class MunicipalityUpdate(SCАLDBaseModel):
    name: LocalizedString | None = None
    region: LocalizedString | None = None
    population_latest: int | None = None
    area_km2: float | None = None
    is_active: bool | None = None


class MunicipalityResponse(SCАLDBaseResponse):
    code: str
    name: dict
    country_code: str
    region: dict | None
    population_latest: int | None
    area_km2: float | None
    is_active: bool
    # geometry omitted from default response — use dedicated /geometry endpoint


class MunicipalitySummary(SCАLDBaseModel):
    """Compact form for lists and dropdowns."""
    id: uuid.UUID
    code: str
    name: dict
    country_code: str
