"""EFCT module — 6 new tables and user role extension

Creates in data schema:
  - data.efct_scores
  - data.efct_submissions
  - data.efct_submission_items
  - data.efct_indicator_metadata
  - data.efct_category_weights
  - data.efct_climate_series

Also:
  - Extends core.users CHECK constraint to include 'municipality_submitter' role
  - Drops and recreates ck_user_role constraint

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-04
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Extend user role CHECK constraint ──────────────────────────────────
    op.drop_constraint("ck_user_role", "users", schema="core")
    op.create_check_constraint(
        "ck_user_role",
        "users",
        "role IN ('admin','analyst','viewer','municipality_submitter')",
        schema="core",
    )

    # ── 2. data.efct_scores ───────────────────────────────────────────────────
    op.create_table(
        "efct_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("score_total", sa.Numeric(6, 3), nullable=True),
        sa.Column("score_percentile", sa.Numeric(5, 2), nullable=True),
        sa.Column("rating", sa.String(2), nullable=True),
        sa.Column("component_scores", postgresql.JSONB, nullable=False,
                  server_default="{}"),
        sa.Column("component_weights", postgresql.JSONB, nullable=False,
                  server_default="{}"),
        sa.Column("coverage_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("missing_indicators", postgresql.JSONB, nullable=True),
        sa.Column("imputation_method", sa.String(50), nullable=True),
        sa.Column("data_quality_flag", sa.String(20), nullable=True),
        sa.Column("calculated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("calculation_version", sa.String(20), nullable=False,
                  server_default="efct_v1"),
        sa.Column("triggered_by", sa.String(30), nullable=True),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("municipality_id", "period_year",
                            name="uq_efct_score_mun_year"),
        sa.CheckConstraint("rating IN ('A','B','C','D','E','F')",
                           name="ck_efct_score_rating"),
        sa.CheckConstraint(
            "data_quality_flag IN ('complete','partial','low_coverage')",
            name="ck_efct_score_quality_flag"),
        sa.CheckConstraint(
            "triggered_by IN ('celery_beat','submission','admin_forced','etl')",
            name="ck_efct_score_trigger"),
        schema="data",
    )
    op.create_index("ix_efct_score_mun_year", "efct_scores",
                    ["municipality_id", "period_year"], schema="data")
    op.create_index("ix_efct_score_year_total", "efct_scores",
                    ["period_year", "score_total"], schema="data")
    op.create_index("ix_efct_score_year_rating", "efct_scores",
                    ["period_year", "rating"], schema="data")
    # Partial index — "current" scores only (superseded_at IS NULL)
    op.execute("""
        CREATE INDEX ix_efct_score_current
        ON data.efct_scores (municipality_id, period_year)
        WHERE superseded_at IS NULL
    """)
    op.create_index("ix_efct_score_components_gin", "efct_scores",
                    ["component_scores"], postgresql_using="gin", schema="data")

    # ── 3. data.efct_submissions ──────────────────────────────────────────────
    op.create_table(
        "efct_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("submission_status", sa.String(20), nullable=False,
                  server_default="draft"),
        sa.Column("submission_round", sa.SmallInteger, nullable=False,
                  server_default="1"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.users.id", ondelete="SET NULL"),
                  nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text, nullable=True),
        sa.Column("rejection_reason", postgresql.JSONB, nullable=True),
        sa.Column("completeness_pct", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("municipality_id", "period_year", "submission_round",
                            name="uq_efct_submission_mun_year_round"),
        sa.CheckConstraint(
            "submission_status IN ('draft','submitted','under_review','approved','rejected')",
            name="ck_efct_submission_status"),
        schema="data",
    )
    op.create_index("ix_efct_sub_municipality_year", "efct_submissions",
                    ["municipality_id", "period_year"], schema="data")
    op.create_index("ix_efct_sub_status", "efct_submissions",
                    ["submission_status"], schema="data")
    op.create_index("ix_efct_sub_submitted_at", "efct_submissions",
                    ["submitted_at"], schema="data")

    # ── 4. data.efct_submission_items ─────────────────────────────────────────
    op.create_table(
        "efct_submission_items",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("data.efct_submissions.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("indicator_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.indicators.id", ondelete="RESTRICT"),
                  nullable=False),
        sa.Column("value_raw", sa.Numeric(18, 6), nullable=True),
        sa.Column("value_notes", sa.Text, nullable=True),
        sa.Column("data_source", sa.String(255), nullable=True),
        sa.Column("supporting_file_key", sa.String(500), nullable=True),
        sa.Column("is_estimated", sa.Boolean, nullable=False,
                  server_default="false"),
        sa.Column("estimation_method", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("submission_id", "indicator_id",
                            name="uq_efct_item_submission_indicator"),
        schema="data",
    )
    op.create_index("ix_efct_item_submission_id", "efct_submission_items",
                    ["submission_id"], schema="data")
    op.create_index("ix_efct_item_indicator_id", "efct_submission_items",
                    ["indicator_id"], schema="data")

    # ── 5. data.efct_indicator_metadata ──────────────────────────────────────
    op.create_table(
        "efct_indicator_metadata",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("indicator_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.indicators.id", ondelete="CASCADE"),
                  nullable=False, unique=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("weight_in_category", sa.Numeric(6, 5), nullable=False),
        sa.Column("weight_in_total", sa.Numeric(6, 5), nullable=False),
        sa.Column("scoring_direction", sa.String(15), nullable=False),
        sa.Column("target_value", sa.Numeric(18, 6), nullable=True),
        sa.Column("benchmark_source", sa.String(100), nullable=True),
        sa.Column("min_value", sa.Numeric(18, 6), nullable=True),
        sa.Column("max_value", sa.Numeric(18, 6), nullable=True),
        sa.Column("imputation_strategy", sa.String(30), nullable=False,
                  server_default="peer_median"),
        sa.Column("version", sa.String(20), nullable=False,
                  server_default="efct_v1"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("indicator_id", name="uq_efct_meta_indicator"),
        sa.CheckConstraint(
            "scoring_direction IN ('higher_better','lower_better','target')",
            name="ck_efct_meta_direction"),
        sa.CheckConstraint(
            "imputation_strategy IN ('peer_median','national_average','zero','skip')",
            name="ck_efct_meta_imputation"),
        schema="data",
    )
    op.create_index("ix_efct_meta_indicator_id", "efct_indicator_metadata",
                    ["indicator_id"], schema="data")
    op.create_index("ix_efct_meta_category", "efct_indicator_metadata",
                    ["category"], schema="data")

    # ── 6. data.efct_category_weights ─────────────────────────────────────────
    op.create_table(
        "efct_category_weights",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("weight", sa.Numeric(6, 5), nullable=False),
        sa.Column("version", sa.String(20), nullable=False),
        sa.Column("effective_from", sa.Date, nullable=False),
        sa.Column("effective_until", sa.Date, nullable=True),
        sa.Column("description", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("category", "version",
                            name="uq_efct_catweight_cat_ver"),
        schema="data",
    )
    op.create_index("ix_efct_catweight_version_from", "efct_category_weights",
                    ["version", "effective_from"], schema="data")

    # ── 7. data.efct_climate_series ───────────────────────────────────────────
    op.create_table(
        "efct_climate_series",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("municipality_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("core.municipalities.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("period_year", sa.SmallInteger, nullable=False),
        sa.Column("temperature_avg_c", sa.Numeric(5, 2), nullable=True),
        sa.Column("temperature_trend_30y", sa.Numeric(6, 4), nullable=True),
        sa.Column("precipitation_mm", sa.Numeric(8, 2), nullable=True),
        sa.Column("precipitation_anomaly_pct", sa.Numeric(7, 3), nullable=True),
        sa.Column("heat_wave_days", sa.SmallInteger, nullable=True),
        sa.Column("extreme_precipitation_days", sa.SmallInteger, nullable=True),
        sa.Column("drought_index", sa.Numeric(5, 3), nullable=True),
        sa.Column("frost_days", sa.SmallInteger, nullable=True),
        sa.Column("source_apis", postgresql.JSONB, nullable=True),
        sa.Column("fetch_status", sa.String(20), nullable=False,
                  server_default="pending"),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("municipality_id", "period_year",
                            name="uq_efct_climate_mun_year"),
        sa.CheckConstraint(
            "fetch_status IN ('pending','partial','complete','failed')",
            name="ck_efct_climate_fetch_status"),
        schema="data",
    )
    op.create_index("ix_efct_climate_mun_year", "efct_climate_series",
                    ["municipality_id", "period_year"], schema="data")
    op.create_index("ix_efct_climate_fetch_status", "efct_climate_series",
                    ["fetch_status"], schema="data")

    # ── 8. updated_at triggers for new tables ─────────────────────────────────
    for table in [
        "efct_submissions", "efct_submission_items",
        "efct_indicator_metadata", "efct_category_weights",
        "efct_climate_series",
    ]:
        op.execute(f"""
            CREATE TRIGGER trg_{table}_updated_at
            BEFORE UPDATE ON data.{table}
            FOR EACH ROW EXECUTE FUNCTION core.set_updated_at()
        """)


def downgrade() -> None:
    for table in [
        "efct_submissions", "efct_submission_items",
        "efct_indicator_metadata", "efct_category_weights",
        "efct_climate_series",
    ]:
        op.execute(
            f"DROP TRIGGER IF EXISTS trg_{table}_updated_at ON data.{table}"
        )

    op.drop_table("efct_climate_series", schema="data")
    op.drop_table("efct_category_weights", schema="data")
    op.drop_table("efct_indicator_metadata", schema="data")
    op.drop_table("efct_submission_items", schema="data")
    op.drop_table("efct_submissions", schema="data")
    op.drop_table("efct_scores", schema="data")

    # Revert user role constraint
    op.drop_constraint("ck_user_role", "users", schema="core")
    op.create_check_constraint(
        "ck_user_role", "users",
        "role IN ('admin','analyst','viewer')",
        schema="core",
    )
