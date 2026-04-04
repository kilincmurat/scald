"""Initial SCALD schema — three-tier data architecture

Creates:
  - PostgreSQL extensions: postgis, pgvector, uuid-ossp
  - Schemas: core, data, iot
  - All tables across three schemas
  - Composite/partial indexes and CHECK constraints
  - Year-range partitions on data.indicator_observations (2000–2030)
  - pgvector HNSW index on core.document_embeddings

Revision ID: 0001
Revises:
Create Date: 2026-04-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
import geoalchemy2
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _quality_tag_check(table: str) -> str:
    return f"ck_{table}_quality_tag"


# ---------------------------------------------------------------------------
# UPGRADE
# ---------------------------------------------------------------------------

def upgrade() -> None:
    # ── 1. Extensions ───────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")  # fast LIKE / ILIKE

    # ── 2. Schemas ──────────────────────────────────────────────────────────
    op.execute("CREATE SCHEMA IF NOT EXISTS core")
    op.execute("CREATE SCHEMA IF NOT EXISTS data")
    op.execute("CREATE SCHEMA IF NOT EXISTS iot")

    # ── 3. core.municipalities ──────────────────────────────────────────────
    op.create_table(
        "municipalities",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("code", sa.String(20), nullable=False, unique=True),
        sa.Column("name", postgresql.JSONB, nullable=False),
        sa.Column("country_code", sa.String(2), nullable=False),
        sa.Column("region", postgresql.JSONB, nullable=True),
        sa.Column("population_latest", sa.Integer, nullable=True),
        sa.Column("area_km2", sa.Numeric(12, 4), nullable=True),
        sa.Column("geometry",
                  geoalchemy2.types.Geometry("MULTIPOLYGON", srid=4326,
                                             spatial_index=False),
                  nullable=True),
        sa.Column("geometry_centroid",
                  geoalchemy2.types.Geometry("POINT", srid=4326,
                                             spatial_index=False),
                  nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        schema="core",
    )
    op.create_index("ix_mun_code", "municipalities", ["code"],
                    unique=True, schema="core")
    op.create_index("ix_mun_country_code", "municipalities", ["country_code"], schema="core")
    op.create_index("ix_mun_geometry_gist", "municipalities", ["geometry"],
                    postgresql_using="gist", schema="core")
    op.create_index("ix_mun_centroid_gist", "municipalities", ["geometry_centroid"],
                    postgresql_using="gist", schema="core")
    op.create_index("ix_mun_name_gin", "municipalities", ["name"],
                    postgresql_using="gin", schema="core")

    # ── 4. core.indicators ──────────────────────────────────────────────────
    op.create_table(
        "indicators",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("name", postgresql.JSONB, nullable=False),
        sa.Column("description", postgresql.JSONB, nullable=True),
        sa.Column("layer", sa.SmallInteger, nullable=False),
        sa.Column("domain", sa.String(50), nullable=False),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("unit_per_capita", sa.String(50), nullable=True),
        sa.Column("unit_per_area", sa.String(50), nullable=True),
        sa.Column("data_source_hint", sa.Text, nullable=True),
        sa.Column("is_mandatory", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("sort_order", sa.SmallInteger, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("layer IN (1, 2, 3)", name="ck_indicator_layer"),
        schema="core",
    )
    op.create_index("ix_ind_slug", "indicators", ["slug"], unique=True, schema="core")
    op.create_index("ix_ind_layer", "indicators", ["layer"], schema="core")
    op.create_index("ix_ind_domain", "indicators", ["domain"], schema="core")
    op.create_index("ix_ind_name_gin", "indicators", ["name"],
                    postgresql_using="gin", schema="core")

    # ── 5. core.organizations ───────────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("name", postgresql.JSONB, nullable=False),
        sa.Column("org_type", sa.String(30), nullable=False,
                  server_default="municipality"),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        schema="core",
    )
    op.create_index("ix_org_municipality_id", "organizations",
                    ["municipality_id"], schema="core")

    # ── 6. core.users ───────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.organizations.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("role", sa.String(30), nullable=False, server_default="viewer"),
        sa.Column("preferred_locale", sa.String(5), nullable=False, server_default="tr"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "role IN ('admin', 'analyst', 'viewer')",
            name="ck_user_role",
        ),
        sa.CheckConstraint(
            "preferred_locale IN ('tr', 'en', 'el', 'ro', 'mk')",
            name="ck_user_locale",
        ),
        schema="core",
    )
    op.create_index("ix_user_email", "users", ["email"], unique=True, schema="core")
    op.create_index("ix_user_org_id", "users", ["organization_id"], schema="core")

    # ── 7. data.indicator_observations (partitioned by period_year) ─────────
    #
    # We create the parent table without data, then attach range partitions.
    # SQLAlchemy writes to the parent; PostgreSQL routes to the correct child.
    # Partition range: 2000–2030 + a catch-all default partition.
    #
    op.execute("""
        CREATE TABLE data.indicator_observations (
            id              UUID        NOT NULL DEFAULT gen_random_uuid(),
            indicator_id    UUID        NOT NULL
                REFERENCES core.indicators(id) ON DELETE RESTRICT,
            municipality_id UUID        NOT NULL
                REFERENCES core.municipalities(id) ON DELETE CASCADE,
            layer           SMALLINT    NOT NULL,
            period_year     SMALLINT    NOT NULL,
            period_month    SMALLINT,
            period_day      DATE,
            value_raw       NUMERIC(18,6),
            value_per_capita NUMERIC(18,6),
            value_per_area  NUMERIC(18,6),
            quality_tag     VARCHAR(10) NOT NULL DEFAULT 'Estimated',
            data_source     VARCHAR(255),
            source_file_key VARCHAR(500),
            notes           TEXT,
            submitted_by    UUID REFERENCES core.users(id) ON DELETE SET NULL,
            verified_by     UUID REFERENCES core.users(id) ON DELETE SET NULL,
            verified_at     TIMESTAMPTZ,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_obs_quality_tag
                CHECK (quality_tag IN ('Verified', 'Estimated', 'Pilot')),
            CONSTRAINT ck_obs_layer
                CHECK (layer IN (1, 2, 3)),
            CONSTRAINT ck_obs_year_range
                CHECK (period_year BETWEEN 1990 AND 2100),
            CONSTRAINT ck_obs_month_range
                CHECK (period_month IS NULL OR period_month BETWEEN 1 AND 12),
            PRIMARY KEY (id, period_year)
        ) PARTITION BY RANGE (period_year)
    """)

    # Year partitions — one per year 2000-2030
    for year in range(2000, 2031):
        op.execute(f"""
            CREATE TABLE data.indicator_observations_y{year}
            PARTITION OF data.indicator_observations
            FOR VALUES FROM ({year}) TO ({year + 1})
        """)
    # Default partition for data outside 2000-2030 range
    op.execute("""
        CREATE TABLE data.indicator_observations_default
        PARTITION OF data.indicator_observations DEFAULT
    """)

    # Unique constraint on parent (applies across all partitions)
    op.execute("""
        CREATE UNIQUE INDEX uq_observation_slot
        ON data.indicator_observations
        (indicator_id, municipality_id, period_year, period_month, period_day)
    """)
    op.execute("""
        CREATE INDEX ix_obs_municipality_year
        ON data.indicator_observations (municipality_id, period_year)
    """)
    op.execute("""
        CREATE INDEX ix_obs_indicator_year
        ON data.indicator_observations (indicator_id, period_year)
    """)
    op.execute("""
        CREATE INDEX ix_obs_municipality_indicator_year
        ON data.indicator_observations (municipality_id, indicator_id, period_year)
    """)
    op.execute("""
        CREATE INDEX ix_obs_layer_year
        ON data.indicator_observations (layer, period_year)
    """)
    # Partial index — dashboard "official report" view uses only Verified data
    op.execute("""
        CREATE INDEX ix_obs_verified_only
        ON data.indicator_observations (municipality_id, period_year)
        WHERE quality_tag = 'Verified'
    """)

    # ── 8. data.climate_api_snapshots ───────────────────────────────────────
    op.create_table(
        "climate_api_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("source_api", sa.String(100), nullable=False),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("period_month", sa.SmallInteger, nullable=True),
        sa.Column("temperature_avg_c", sa.Numeric(5, 2), nullable=True),
        sa.Column("temperature_min_c", sa.Numeric(5, 2), nullable=True),
        sa.Column("temperature_max_c", sa.Numeric(5, 2), nullable=True),
        sa.Column("precipitation_mm", sa.Numeric(8, 2), nullable=True),
        sa.Column("wind_speed_avg_ms", sa.Numeric(6, 2), nullable=True),
        sa.Column("humidity_avg_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("extreme_weather_days", sa.Integer, nullable=True),
        sa.Column("raw_payload", postgresql.JSONB, nullable=True),
        sa.Column("quality_tag", sa.String(10), nullable=False,
                  server_default="Verified"),
        sa.CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_climate_quality_tag",
        ),
        schema="data",
    )
    op.create_index("ix_climate_municipality_year", "climate_api_snapshots",
                    ["municipality_id", "period_year"], schema="data")
    op.create_index("ix_climate_fetched_at", "climate_api_snapshots",
                    ["fetched_at"], schema="data")
    op.create_index("ix_climate_source_api", "climate_api_snapshots",
                    ["source_api"], schema="data")

    # ── 9. data.flood_risk_zones ─────────────────────────────────────────────
    op.create_table(
        "flood_risk_zones",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("zone_name", postgresql.JSONB, nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("geometry",
                  geoalchemy2.types.Geometry("MULTIPOLYGON", srid=4326,
                                             spatial_index=False),
                  nullable=True),
        sa.Column("area_km2", sa.Numeric(12, 4), nullable=True),
        sa.Column("affected_population_est", sa.Integer, nullable=True),
        sa.Column("data_source", sa.String(255), nullable=True),
        sa.Column("valid_from", sa.Date, nullable=True),
        sa.Column("valid_until", sa.Date, nullable=True),
        sa.Column("quality_tag", sa.String(10), nullable=False,
                  server_default="Estimated"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "risk_level IN ('low', 'medium', 'high', 'extreme')",
            name="ck_flood_risk_level",
        ),
        sa.CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_flood_quality_tag",
        ),
        schema="data",
    )
    op.create_index("ix_flood_municipality_id", "flood_risk_zones",
                    ["municipality_id"], schema="data")
    op.create_index("ix_flood_risk_level", "flood_risk_zones",
                    ["risk_level"], schema="data")
    op.create_index("ix_flood_geometry_gist", "flood_risk_zones", ["geometry"],
                    postgresql_using="gist", schema="data")

    # ── 10. data.biodiversity_records ────────────────────────────────────────
    op.create_table(
        "biodiversity_records",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("survey_type", sa.String(50), nullable=True),
        sa.Column("species_count", sa.Integer, nullable=True),
        sa.Column("protected_species_count", sa.Integer, nullable=True),
        sa.Column("invasive_species_count", sa.Integer, nullable=True),
        sa.Column("habitat_area_ha", sa.Numeric(12, 4), nullable=True),
        sa.Column("protected_area_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("green_corridor_km", sa.Numeric(10, 3), nullable=True),
        sa.Column("data_source", sa.String(255), nullable=True),
        sa.Column("quality_tag", sa.String(10), nullable=False,
                  server_default="Estimated"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_biodiversity_quality_tag",
        ),
        schema="data",
    )
    op.create_index("ix_biodiv_municipality_year", "biodiversity_records",
                    ["municipality_id", "period_year"], schema="data")

    # ── 11. data.data_imports ────────────────────────────────────────────────
    op.create_table(
        "data_imports",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("imported_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("source_type", sa.String(30), nullable=False),
        sa.Column("dag_run_id", sa.String(255), nullable=True),
        sa.Column("file_key", sa.String(500), nullable=True),
        sa.Column("file_name", sa.String(255), nullable=True),
        sa.Column("indicator_domain", sa.String(50), nullable=True),
        sa.Column("period_year", sa.SmallInteger, nullable=True),
        sa.Column("rows_inserted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rows_updated", sa.Integer, nullable=False, server_default="0"),
        sa.Column("rows_failed", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error_log", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending','processing','success','partial','failed')",
            name="ck_import_status",
        ),
        sa.CheckConstraint(
            "source_type IN ('manual_upload','airflow_dag','api_push')",
            name="ck_import_source_type",
        ),
        schema="data",
    )
    op.create_index("ix_import_municipality_id", "data_imports",
                    ["municipality_id"], schema="data")
    op.create_index("ix_import_status", "data_imports", ["status"], schema="data")
    op.create_index("ix_import_created_at", "data_imports",
                    ["created_at"], schema="data")

    # ── 12. data.surveys ─────────────────────────────────────────────────────
    op.create_table(
        "surveys",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("title", postgresql.JSONB, nullable=False),
        sa.Column("description", postgresql.JSONB, nullable=True),
        sa.Column("survey_type", sa.String(50), nullable=False),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("started_at", sa.Date, nullable=True),
        sa.Column("ended_at", sa.Date, nullable=True),
        sa.Column("total_responses", sa.Integer, nullable=False, server_default="0"),
        sa.Column("quality_tag", sa.String(10), nullable=False,
                  server_default="Pilot"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "quality_tag IN ('Verified', 'Estimated', 'Pilot')",
            name="ck_survey_quality_tag",
        ),
        schema="data",
    )
    op.create_index("ix_survey_municipality_id", "surveys",
                    ["municipality_id"], schema="data")
    op.create_index("ix_survey_period_year", "surveys", ["period_year"], schema="data")

    # ── 13. data.survey_responses ────────────────────────────────────────────
    op.create_table(
        "survey_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("survey_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("data.surveys.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("respondent_token", sa.String(64), nullable=False),
        sa.Column("question_key", sa.String(100), nullable=False),
        sa.Column("question_label", postgresql.JSONB, nullable=True),
        sa.Column("response_numeric", sa.Numeric(10, 4), nullable=True),
        sa.Column("response_text", sa.Text, nullable=True),
        sa.Column("response_choice", sa.String(100), nullable=True),
        sa.Column("locale", sa.String(5), nullable=False, server_default="tr"),
        sa.Column("submitted_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "locale IN ('tr','en','el','ro','mk')",
            name="ck_response_locale",
        ),
        schema="data",
    )
    op.create_index("ix_resp_survey_id", "survey_responses",
                    ["survey_id"], schema="data")
    op.create_index("ix_resp_survey_question", "survey_responses",
                    ["survey_id", "question_key"], schema="data")
    op.create_index("ix_resp_submitted_at", "survey_responses",
                    ["submitted_at"], schema="data")

    # ── 14. iot.sensors ──────────────────────────────────────────────────────
    op.create_table(
        "sensors",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("indicator_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.indicators.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("name", postgresql.JSONB, nullable=True),
        sa.Column("sensor_type", sa.String(50), nullable=False),
        sa.Column("manufacturer", sa.String(100), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("location",
                  geoalchemy2.types.Geometry("POINT", srid=4326,
                                             spatial_index=False),
                  nullable=True),
        sa.Column("location_description", postgresql.JSONB, nullable=True),
        sa.Column("unit", sa.String(50), nullable=False),
        sa.Column("sampling_interval_seconds", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("installed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decommissioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        schema="iot",
    )
    op.create_index("ix_sensor_municipality_id", "sensors",
                    ["municipality_id"], schema="iot")
    op.create_index("ix_sensor_type", "sensors", ["sensor_type"], schema="iot")
    op.create_index("ix_sensor_indicator_id", "sensors",
                    ["indicator_id"], schema="iot")
    op.create_index("ix_sensor_external_id", "sensors",
                    ["external_id"], schema="iot")
    op.create_index("ix_sensor_location_gist", "sensors", ["location"],
                    postgresql_using="gist", schema="iot")

    # ── 15. iot.sensor_readings (TimescaleDB-ready, no surrogate UUID PK) ───
    op.execute("""
        CREATE TABLE iot.sensor_readings (
            sensor_id    UUID         NOT NULL
                REFERENCES iot.sensors(id) ON DELETE CASCADE,
            recorded_at  TIMESTAMPTZ  NOT NULL,
            value        DOUBLE PRECISION NOT NULL,
            quality_flag SMALLINT     NOT NULL DEFAULT 0,
            raw_payload  JSONB,
            CONSTRAINT ck_reading_quality_flag
                CHECK (quality_flag IN (0, 1, 2)),
            PRIMARY KEY (sensor_id, recorded_at)
        )
    """)
    # DESC index — "latest N readings" queries
    op.execute("""
        CREATE INDEX ix_reading_recorded_at_desc
        ON iot.sensor_readings (recorded_at DESC)
    """)

    # ── 16. iot.sensor_aggregations ─────────────────────────────────────────
    op.create_table(
        "sensor_aggregations",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("sensor_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("iot.sensors.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("granularity", sa.String(10), nullable=False),
        sa.Column("value_avg", sa.Double, nullable=True),
        sa.Column("value_min", sa.Double, nullable=True),
        sa.Column("value_max", sa.Double, nullable=True),
        sa.Column("value_sum", sa.Double, nullable=True),
        sa.Column("reading_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("quality_flag", sa.SmallInteger, nullable=False,
                  server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("sensor_id", "period_start", "granularity",
                            name="uq_aggregation_sensor_period_granularity"),
        sa.CheckConstraint(
            "granularity IN ('hour','day','month')",
            name="ck_aggregation_granularity",
        ),
        schema="iot",
    )
    op.create_index("ix_agg_sensor_granularity_start", "sensor_aggregations",
                    ["sensor_id", "granularity", "period_start"], schema="iot")

    # ── 17. core.audit_log (BIGSERIAL PK, append-only) ───────────────────────
    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("old_values", postgresql.JSONB, nullable=True),
        sa.Column("new_values", postgresql.JSONB, nullable=True),
        sa.Column("ip_address", postgresql.INET, nullable=True),
        sa.Column("user_agent", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "action IN ('create','update','delete','verify','login','export','import')",
            name="ck_audit_action",
        ),
        schema="core",
    )
    op.create_index("ix_audit_entity", "audit_log",
                    ["entity_type", "entity_id"], schema="core")
    op.create_index("ix_audit_user_id", "audit_log", ["user_id"], schema="core")
    op.create_index("ix_audit_created_at_desc", "audit_log",
                    ["created_at"], schema="core")

    # ── 18. core.document_embeddings (pgvector RAG) ──────────────────────────
    op.execute("""
        CREATE TABLE core.document_embeddings (
            id               UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            municipality_id  UUID    REFERENCES core.municipalities(id) ON DELETE CASCADE,
            document_type    VARCHAR(50) NOT NULL,
            locale           VARCHAR(5)  NOT NULL,
            title            TEXT,
            content_chunk    TEXT        NOT NULL,
            embedding        vector(1536),
            source_url       TEXT,
            source_file_key  VARCHAR(500),
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_embedding_locale
                CHECK (locale IN ('tr','en','el','ro','mk')),
            CONSTRAINT ck_embedding_document_type
                CHECK (document_type IN (
                    'regulation','report','observation_summary',
                    'guidance','news'
                ))
        )
    """)
    op.create_index("ix_doc_municipality_id", "document_embeddings",
                    ["municipality_id"], schema="core")
    op.create_index("ix_doc_document_type", "document_embeddings",
                    ["document_type"], schema="core")
    op.create_index("ix_doc_locale", "document_embeddings",
                    ["locale"], schema="core")
    # HNSW index for cosine similarity (preferred over IVFFlat for read-heavy RAG)
    op.execute("""
        CREATE INDEX ix_doc_embedding_hnsw
        ON core.document_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
    """)

    # ── 19. updated_at auto-update trigger (shared function) ─────────────────
    op.execute("""
        CREATE OR REPLACE FUNCTION core.set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    _tables_with_updated_at = [
        ("core", "municipalities"),
        ("core", "indicators"),
        ("core", "organizations"),
        ("core", "users"),
        ("core", "document_embeddings"),
        ("data", "climate_api_snapshots"),
        ("data", "flood_risk_zones"),
        ("data", "biodiversity_records"),
        ("data", "data_imports"),
        ("data", "surveys"),
        ("iot", "sensors"),
        ("iot", "sensor_aggregations"),
    ]
    for schema, table in _tables_with_updated_at:
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON {schema}.{table}
            FOR EACH ROW EXECUTE FUNCTION core.set_updated_at()
        """)

    # indicator_observations is partitioned — trigger must be on each partition
    # The Airflow DAGs call now() explicitly, so a trigger is not added here.


# ---------------------------------------------------------------------------
# DOWNGRADE
# ---------------------------------------------------------------------------

def downgrade() -> None:
    # Drop in reverse dependency order

    # Triggers
    _tables_with_updated_at = [
        ("core", "municipalities"), ("core", "indicators"),
        ("core", "organizations"), ("core", "users"),
        ("core", "document_embeddings"), ("data", "climate_api_snapshots"),
        ("data", "flood_risk_zones"), ("data", "biodiversity_records"),
        ("data", "data_imports"), ("data", "surveys"),
        ("iot", "sensors"), ("iot", "sensor_aggregations"),
    ]
    for schema, table in _tables_with_updated_at:
        op.execute(
            f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON {schema}.{table}"
        )
    op.execute("DROP FUNCTION IF EXISTS core.set_updated_at()")

    # IoT
    op.drop_table("sensor_aggregations", schema="iot")
    op.execute("DROP TABLE IF EXISTS iot.sensor_readings")
    op.drop_table("sensors", schema="iot")

    # Data
    op.execute("DROP TABLE IF EXISTS core.document_embeddings")
    op.drop_table("audit_log", schema="core")
    op.drop_table("survey_responses", schema="data")
    op.drop_table("surveys", schema="data")
    op.drop_table("data_imports", schema="data")
    op.drop_table("biodiversity_records", schema="data")
    op.drop_table("flood_risk_zones", schema="data")
    op.drop_table("climate_api_snapshots", schema="data")
    op.execute("DROP TABLE IF EXISTS data.indicator_observations")

    # Core
    op.drop_table("users", schema="core")
    op.drop_table("organizations", schema="core")
    op.drop_table("indicators", schema="core")
    op.drop_table("municipalities", schema="core")

    op.execute("DROP SCHEMA IF EXISTS iot CASCADE")
    op.execute("DROP SCHEMA IF EXISTS data CASCADE")
    op.execute("DROP SCHEMA IF EXISTS core CASCADE")
