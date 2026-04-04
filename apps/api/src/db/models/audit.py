"""
Audit log and document embeddings (AI/RAG support).
AuditLog is append-only — never update or delete rows.
DocumentEmbedding uses pgvector for semantic search.
"""
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from .enums import AuditAction

if TYPE_CHECKING:
    from .user import User


class AuditLog(Base):
    """
    Immutable compliance audit trail.

    Design notes:
      - Uses BIGSERIAL (not UUID) PK for insert performance on high-volume writes
      - Never UPDATE or DELETE rows in this table
      - Partitioned by month in production for efficient pruning
    """
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_entity", "entity_type", "entity_id"),
        Index("ix_audit_user_id", "user_id"),
        Index("ix_audit_created_at_desc", "created_at"),
        {"schema": "core"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    """BIGSERIAL for insert performance. Expected volume: high."""

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.users.id", ondelete="SET NULL"),
        nullable=True,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    """create | update | delete | verify | login | export | import"""

    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    """observation | municipality | user | survey | indicator"""

    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )
    old_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Row snapshot before change. NULL for create actions."""

    new_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """Row snapshot after change. NULL for delete actions."""

    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship(
        back_populates="audit_logs", lazy="select"
    )


class DocumentEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """
    Vector embeddings for the RAG (Retrieval-Augmented Generation) pipeline.
    Used by the AI service to answer queries with local government context.

    pgvector HNSW index (created in migration):
      CREATE INDEX ON core.document_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);

    HNSW is preferred over IVFFlat for SCALD's read-heavy query pattern.
    """
    __tablename__ = "document_embeddings"
    __table_args__ = (
        Index("ix_doc_municipality_id", "municipality_id"),
        Index("ix_doc_document_type", "document_type"),
        Index("ix_doc_locale", "locale"),
        # HNSW vector index is created in raw DDL in the migration (not here)
        {"schema": "core"},
    )

    municipality_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("core.municipalities.id", ondelete="CASCADE"),
        nullable=True,
    )
    """NULL for global/cross-municipal documents."""

    document_type: Mapped[str] = mapped_column(String(50), nullable=False)
    """regulation | report | observation_summary | guidance | news"""

    locale: Mapped[str] = mapped_column(String(5), nullable=False)
    """Language of the source text. One of: tr | en | el | ro | mk"""

    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_chunk: Mapped[str] = mapped_column(Text, nullable=False)
    """The actual text chunk that was embedded (≤ 512 tokens recommended)."""

    # pgvector column — declared as Text here, migration adds the proper type
    # In production: Mapped[list[float]] with Vector(1536) from pgvector.sqlalchemy
    embedding_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Placeholder — replaced by vector(1536) via migration DDL",
    )

    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_file_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    """MinIO object key of the source document."""

    def __repr__(self) -> str:
        return f"<DocumentEmbedding type={self.document_type} locale={self.locale}>"
