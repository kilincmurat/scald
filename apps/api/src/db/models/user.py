"""
User and Organization models for authentication and data ownership.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, SoftDeleteMixin, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import UserRole

if TYPE_CHECKING:
    from .municipality import Municipality
    from .observation import IndicatorObservation, DataImport
    from .audit import AuditLog


class Organization(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Represents a municipal government body or agency.
    Users belong to an organization; observations are submitted by users.
    """
    __tablename__ = "organizations"
    __table_args__ = (
        Index("ix_org_municipality_id", "municipality_id"),
        {"schema": "core"},
    )

    municipality_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[dict] = mapped_column(
        # JSONB imported inline to avoid circular base import
        type_=__import__("sqlalchemy.dialects.postgresql", fromlist=["JSONB"]).JSONB,
        nullable=False,
    )
    org_type: Mapped[str] = mapped_column(String(30), nullable=False, default="municipality")
    """Types: municipality | regional_authority | national_agency | research_institute"""

    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    municipality: Mapped["Municipality"] = relationship(
        back_populates="organizations", lazy="select"
    )
    users: Mapped[list["User"]] = relationship(back_populates="organization", lazy="select")


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin, SoftDeleteMixin):
    """
    Application user. Linked to an Organization for data scoping.
    Password is stored as a bcrypt hash via passlib.
    """
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_user_email", "email", unique=True),
        Index("ix_user_org_id", "organization_id"),
        {"schema": "core"},
    )

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    role: Mapped[UserRole] = mapped_column(
        String(30),
        nullable=False,
        default=UserRole.VIEWER,
    )
    preferred_locale: Mapped[str] = mapped_column(String(5), nullable=False, default="tr")
    """One of: tr | en | el | ro | mk"""

    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    organization: Mapped["Organization"] = relationship(
        back_populates="users", lazy="select"
    )
    submitted_observations: Mapped[list["IndicatorObservation"]] = relationship(
        foreign_keys="IndicatorObservation.submitted_by",
        back_populates="submitter",
        lazy="dynamic",
    )
    verified_observations: Mapped[list["IndicatorObservation"]] = relationship(
        foreign_keys="IndicatorObservation.verified_by",
        back_populates="verifier",
        lazy="dynamic",
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(
        back_populates="user", lazy="dynamic"
    )
    imports: Mapped[list["DataImport"]] = relationship(
        back_populates="imported_by_user", lazy="dynamic"
    )

    def __repr__(self) -> str:
        return f"<User email={self.email} role={self.role}>"
