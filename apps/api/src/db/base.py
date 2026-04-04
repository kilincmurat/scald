"""
Single import point for Alembic autogenerate.

Alembic's env.py imports `Base` and `target_metadata` from here.
All models must be imported before `Base.metadata` is read.
"""
from src.db.models import Base  # noqa: F401 — triggers all model registrations
from src.db.models import (     # noqa: F401
    Municipality, Indicator, Organization, User,
    IndicatorObservation, ClimateAPISnapshot, FloodRiskZone,
    BiodiversityRecord, DataImport, Survey, SurveyResponse,
    IoTSensor, IoTSensorReading, IoTSensorAggregation,
    AuditLog, DocumentEmbedding,
    EfctScore, EfctSubmission, EfctSubmissionItem,
    EfctIndicatorMetadata, EfctCategoryWeight, EfctClimateSeries,
)

target_metadata = Base.metadata
