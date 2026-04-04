"""
Layer 3 survey data.
Surveys default to QualityTag.PILOT until validated by an analyst.
respondent_token is an anonymous handle — no PII is stored.
"""
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Index, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import QualityTag, SurveyType

if TYPE_CHECKING:
    from .municipality import Municipality
    from .user import User


class Survey(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Survey campaign envelope — holds metadata, not individual answers."""
    __tablename__ = "surveys"
    __table_args__ = (
        Index("ix_survey_municipality_id", "municipality_id"),
        Index("ix_survey_period_year", "period_year"),
        {"schema": "data"},
    )

    municipality_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[dict] = mapped_column(JSONB, nullable=False)
    """{"tr": "Vatandaş Memnuniyeti 2024", "en": "Citizen Satisfaction 2024", ...}"""

    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    survey_type: Mapped[str] = mapped_column(String(50), nullable=False)
    """citizen_satisfaction | infrastructure_assessment | needs_analysis | ..."""

    period_year: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    started_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    ended_at: Mapped[date | None] = mapped_column(Date, nullable=True)

    total_responses: Mapped[int] = mapped_column(nullable=False, default=0)
    """Denormalized count. Refreshed by trigger or service layer."""

    quality_tag: Mapped[str] = mapped_column(
        String(10), nullable=False, default=QualityTag.PILOT
    )
    """Surveys start as Pilot. Analyst upgrades to Estimated or Verified."""

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(
        back_populates="surveys", lazy="select"
    )
    creator: Mapped["User | None"] = relationship(
        foreign_keys=[created_by], lazy="select"
    )
    responses: Mapped[list["SurveyResponse"]] = relationship(
        back_populates="survey", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<Survey type={self.survey_type} year={self.period_year} responses={self.total_responses}>"


class SurveyResponse(Base, UUIDPrimaryKeyMixin):
    """
    Individual survey responses — one row per question per respondent.
    Normalized form: multiple rows share the same respondent_token.

    Privacy: respondent_token is an anonymous session hash.
    No name, email, or IP address is stored here.
    """
    __tablename__ = "survey_responses"
    __table_args__ = (
        Index("ix_resp_survey_id", "survey_id"),
        Index("ix_resp_survey_question", "survey_id", "question_key"),
        Index("ix_resp_submitted_at", "submitted_at"),
        {"schema": "data"},
    )

    survey_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("data.surveys.id", ondelete="CASCADE"),
        nullable=False,
    )
    respondent_token: Mapped[str] = mapped_column(String(64), nullable=False)
    """Anonymous session identifier. SHA-256 hash of session_id + survey_id."""

    question_key: Mapped[str] = mapped_column(String(100), nullable=False)
    """Machine-stable question identifier (e.g. 'water_service_satisfaction')."""

    question_label: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Snapshot of the question text at submission time (for immutability)."""

    response_numeric: Mapped[float | None] = mapped_column(nullable=True)
    """For scale (1–5), rating, or numeric questions."""

    response_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    """For open-ended free text questions."""

    response_choice: Mapped[str | None] = mapped_column(String(100), nullable=True)
    """For multiple-choice questions (stores the chosen key)."""

    locale: Mapped[str] = mapped_column(String(5), nullable=False, default="tr")
    """Language the respondent used when filling out the survey."""

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=__import__("sqlalchemy", fromlist=["func"]).func.now(),
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    survey: Mapped["Survey"] = relationship(back_populates="responses", lazy="select")
