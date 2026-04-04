"""Pydantic schemas for IoT Layer 3."""
import uuid
from datetime import datetime

from pydantic import Field

from .base import SCАLDBaseModel, SCАLDBaseResponse
from src.db.models.enums import IoTReadingQuality


class SensorCreate(SCАLDBaseModel):
    municipality_id: uuid.UUID
    indicator_id: uuid.UUID | None = None
    external_id: str | None = Field(None, max_length=100)
    name: dict | None = None  # LocalizedString as dict
    sensor_type: str = Field(..., max_length=50)
    manufacturer: str | None = None
    model: str | None = None
    unit: str = Field(..., max_length=50)
    sampling_interval_seconds: int | None = Field(None, gt=0)
    # GeoJSON point: {"type": "Point", "coordinates": [lon, lat]}
    geojson: dict | None = None


class SensorResponse(SCАLDBaseResponse):
    municipality_id: uuid.UUID
    indicator_id: uuid.UUID | None
    external_id: str | None
    name: dict | None
    sensor_type: str
    manufacturer: str | None
    model: str | None
    unit: str
    sampling_interval_seconds: int | None
    is_active: bool
    installed_at: datetime | None
    decommissioned_at: datetime | None


class SensorReadingIngest(SCАLDBaseModel):
    """Single reading from a sensor. Used for API push ingestion."""
    sensor_id: uuid.UUID
    recorded_at: datetime
    value: float
    quality_flag: IoTReadingQuality = IoTReadingQuality.OK
    raw_payload: dict | None = None


class SensorReadingBatch(SCАLDBaseModel):
    """Batch ingestion — up to 1000 readings per request."""
    readings: list[SensorReadingIngest] = Field(..., min_length=1, max_length=1000)


class SensorReadingResponse(SCАLDBaseModel):
    sensor_id: uuid.UUID
    recorded_at: datetime
    value: float
    quality_flag: int


class AggregationResponse(SCАLDBaseResponse):
    sensor_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    granularity: str
    value_avg: float | None
    value_min: float | None
    value_max: float | None
    value_sum: float | None
    reading_count: int
    quality_flag: int
