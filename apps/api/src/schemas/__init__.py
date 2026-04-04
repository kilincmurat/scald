"""
Pydantic v2 schemas — public API surface.
"""
from .base import LocalizedString, PaginatedResponse, SCАLDBaseModel, SCАLDBaseResponse
from .indicator import (
    IndicatorCreate, IndicatorResponse, IndicatorSummary, IndicatorUpdate,
)
from .municipality import (
    MunicipalityCreate, MunicipalityResponse, MunicipalitySummary, MunicipalityUpdate,
)
from .observation import (
    ObservationCreate, ObservationDetail, ObservationFilter,
    ObservationResponse, ObservationUpdate, ObservationUpsert,
    TimeSeriesPoint, TimeSeriesResponse,
)
from .iot import (
    AggregationResponse, SensorCreate, SensorReadingBatch,
    SensorReadingIngest, SensorReadingResponse, SensorResponse,
)
from .auth import LoginRequest, TokenResponse, UserCreate, UserResponse, UserUpdate

__all__ = [
    # base
    "LocalizedString", "PaginatedResponse", "SCАLDBaseModel", "SCАLDBaseResponse",
    # indicator
    "IndicatorCreate", "IndicatorResponse", "IndicatorSummary", "IndicatorUpdate",
    # municipality
    "MunicipalityCreate", "MunicipalityResponse", "MunicipalitySummary", "MunicipalityUpdate",
    # observation
    "ObservationCreate", "ObservationDetail", "ObservationFilter",
    "ObservationResponse", "ObservationUpdate", "ObservationUpsert",
    "TimeSeriesPoint", "TimeSeriesResponse",
    # iot
    "AggregationResponse", "SensorCreate", "SensorReadingBatch",
    "SensorReadingIngest", "SensorReadingResponse", "SensorResponse",
    # auth
    "LoginRequest", "TokenResponse", "UserCreate", "UserResponse", "UserUpdate",
]
