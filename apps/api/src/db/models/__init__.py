"""
SCALD database models.

Import order matters for Alembic autogenerate — all models must be imported
before `Base.metadata` is inspected. This module is the single import point.
"""
from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import (
    AuditAction,
    DataLayer,
    FloodRiskLevel,
    ImportStatus,
    IndicatorDomain,
    IoTReadingQuality,
    NormalizationType,
    QualityTag,
    SensorType,
    SurveyType,
    TimeGranularity,
    UserRole,
)
from .municipality import Municipality
from .indicator import Indicator
from .user import Organization, User
from .observation import (
    BiodiversityRecord,
    ClimateAPISnapshot,
    DataImport,
    FloodRiskZone,
    IndicatorObservation,
)
from .iot import IoTSensor, IoTSensorAggregation, IoTSensorReading
from .survey import Survey, SurveyResponse
from .audit import AuditLog, DocumentEmbedding
from .efct import (
    EfctScore,
    EfctSubmission,
    EfctSubmissionItem,
    EfctIndicatorMetadata,
    EfctCategoryWeight,
    EfctClimateSeries,
)

__all__ = [
    # Base
    "Base",
    "TimestampMixin",
    "UUIDPrimaryKeyMixin",
    "SoftDeleteMixin",
    # Enums
    "AuditAction",
    "DataLayer",
    "FloodRiskLevel",
    "ImportStatus",
    "IndicatorDomain",
    "IoTReadingQuality",
    "NormalizationType",
    "QualityTag",
    "SensorType",
    "SurveyType",
    "TimeGranularity",
    "UserRole",
    # Core schema
    "Municipality",
    "Indicator",
    "Organization",
    "User",
    "AuditLog",
    "DocumentEmbedding",
    # Data schema
    "IndicatorObservation",
    "ClimateAPISnapshot",
    "FloodRiskZone",
    "BiodiversityRecord",
    "DataImport",
    "Survey",
    "SurveyResponse",
    # IoT schema
    "IoTSensor",
    "IoTSensorReading",
    "IoTSensorAggregation",
    # EFCT schema
    "EfctScore",
    "EfctSubmission",
    "EfctSubmissionItem",
    "EfctIndicatorMetadata",
    "EfctCategoryWeight",
    "EfctClimateSeries",
]
