"""
Shared enumerations for the SCALD data model.
All enums are also registered as PostgreSQL native types via Alembic.
"""
import enum


class DataLayer(int, enum.Enum):
    """Three-tier data architecture layers."""
    CORE = 1      # Mandatory baseline indicators
    EXTENDED = 2  # Optional domain-specific indicators
    PILOT = 3     # Experimental IoT / survey data


class QualityTag(str, enum.Enum):
    """
    Data quality classification applied to every observation.
    Standardization rule #4: every row must carry one of these labels.
    """
    VERIFIED = "Verified"    # Cross-validated, official source
    ESTIMATED = "Estimated"  # Modelled / proxy calculation
    PILOT = "Pilot"          # Experimental, not yet validated


class IndicatorDomain(str, enum.Enum):
    """
    Thematic domain of an indicator.
    Grouped by layer for clarity.
    """
    # Layer 1 — Core (mandatory)
    POPULATION = "population"
    WATER = "water"
    WASTE = "waste"
    ENERGY = "energy"
    TRANSPORTATION = "transportation"
    GREEN_SPACES = "green_spaces"
    CLIMATE = "climate"

    # Layer 2 — Extended (optional)
    AIR_QUALITY = "air_quality"
    FLOOD_RISK = "flood_risk"
    SECTORAL_ENERGY = "sectoral_energy"
    BIODIVERSITY = "biodiversity"

    # Layer 3 — Pilot
    IOT = "iot"
    SURVEY = "survey"

    # EFCT — Ecological Footprint Calculation Tool (15 categories)
    EFCT_CARBON = "efct_carbon"
    EFCT_ENERGY_USE = "efct_energy_use"
    EFCT_FOOD = "efct_food"
    EFCT_WATER_ECO = "efct_water_eco"
    EFCT_LAND_USE = "efct_land_use"
    EFCT_WASTE_ECO = "efct_waste_eco"
    EFCT_TRANSPORT_ECO = "efct_transport_eco"
    EFCT_BUILDINGS = "efct_buildings"
    EFCT_GREEN_INFRA = "efct_green_infra"
    EFCT_BIODIVERSITY_ECO = "efct_biodiversity_eco"
    EFCT_AIR_ECO = "efct_air_eco"
    EFCT_CLIMATE_RISK = "efct_climate_risk"
    EFCT_SOCIAL_ECO = "efct_social_eco"
    EFCT_GOVERNANCE = "efct_governance"
    EFCT_RESILIENCE = "efct_resilience"


class TimeGranularity(str, enum.Enum):
    """
    Temporal resolution of an observation.
    Annual is the minimum standard (standardization rule #2).
    """
    ANNUAL = "annual"
    QUARTERLY = "quarterly"
    MONTHLY = "monthly"
    DAILY = "daily"
    HOURLY = "hourly"    # IoT sensors only


class NormalizationType(str, enum.Enum):
    """
    How a value has been normalized (standardization rule #3).
    Both per_capita and per_area variants are stored alongside raw values.
    """
    ABSOLUTE = "absolute"
    PER_CAPITA = "per_capita"
    PER_AREA = "per_area"
    PER_HOUSEHOLD = "per_household"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"
    MUNICIPALITY_SUBMITTER = "municipality_submitter"  # EFCT data collection


class EfctRating(str, enum.Enum):
    """Letter grade for EFCT composite score (90+=A ... <30=F)."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"


class EfctScoringDirection(str, enum.Enum):
    """Whether a higher indicator value is better, lower is better, or there's a target."""
    HIGHER_BETTER = "higher_better"
    LOWER_BETTER = "lower_better"
    TARGET = "target"


class EfctImputationStrategy(str, enum.Enum):
    """Strategy when a sub-indicator value is missing."""
    PEER_MEDIAN = "peer_median"          # Median of same indicator across country peers
    NATIONAL_AVERAGE = "national_average"
    ZERO = "zero"                        # Score 0 for this indicator
    SKIP = "skip"                        # Exclude from denominator


class EfctSubmissionStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class EfctDataQualityFlag(str, enum.Enum):
    COMPLETE = "complete"        # ≥90% sub-indicators have real data
    PARTIAL = "partial"          # 50–89%
    LOW_COVERAGE = "low_coverage"  # <50%


class EfctFetchStatus(str, enum.Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    COMPLETE = "complete"
    FAILED = "failed"


class EfctTrigger(str, enum.Enum):
    CELERY_BEAT = "celery_beat"
    SUBMISSION = "submission"
    ADMIN_FORCED = "admin_forced"
    ETL = "etl"


class ImportStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"


class FloodRiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTREME = "extreme"


class SensorType(str, enum.Enum):
    AIR_QUALITY = "air_quality"
    NOISE = "noise"
    TRAFFIC_COUNTER = "traffic_counter"
    WASTE_FILL_LEVEL = "waste_fill_level"
    WATER_FLOW = "water_flow"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"


class IoTReadingQuality(int, enum.Enum):
    OK = 0
    SUSPECT = 1
    INVALID = 2


class SurveyType(str, enum.Enum):
    CITIZEN_SATISFACTION = "citizen_satisfaction"
    INFRASTRUCTURE_ASSESSMENT = "infrastructure_assessment"
    NEEDS_ANALYSIS = "needs_analysis"
    ENVIRONMENTAL_PERCEPTION = "environmental_perception"


class AuditAction(str, enum.Enum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VERIFY = "verify"
    LOGIN = "login"
    EXPORT = "export"
    IMPORT = "import"
