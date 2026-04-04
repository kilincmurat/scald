"""
ObservationRepository — domain-specific queries for the central fact table.

Key query patterns:
  1. Time series: one indicator × one municipality × year range
  2. Cross-municipal: one indicator × all municipalities × one year
  3. Dashboard snapshot: all Layer 1 indicators × one municipality × latest year
  4. Bulk upsert: ETL pipeline inserts (slug + code resolution)
"""
from uuid import UUID

from sqlalchemy import and_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.models.observation import IndicatorObservation
from src.db.models.enums import QualityTag
from src.db.repositories.base import AsyncRepository
from src.schemas.observation import ObservationUpsert


class ObservationRepository(AsyncRepository[IndicatorObservation]):
    model = IndicatorObservation

    async def get_time_series(
        self,
        municipality_id: UUID,
        indicator_id: UUID,
        year_from: int,
        year_to: int,
        quality_tag: QualityTag | None = None,
    ) -> list[IndicatorObservation]:
        """Ordered time series for one indicator × one municipality."""
        filters = [
            IndicatorObservation.municipality_id == municipality_id,
            IndicatorObservation.indicator_id == indicator_id,
            IndicatorObservation.period_year >= year_from,
            IndicatorObservation.period_year <= year_to,
        ]
        if quality_tag:
            filters.append(IndicatorObservation.quality_tag == quality_tag)

        q = (
            select(IndicatorObservation)
            .where(and_(*filters))
            .order_by(
                IndicatorObservation.period_year,
                IndicatorObservation.period_month,
            )
        )
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_cross_municipal(
        self,
        indicator_id: UUID,
        period_year: int,
        quality_tag: QualityTag | None = None,
        country_code: str | None = None,
    ) -> list[IndicatorObservation]:
        """
        All municipalities for one indicator in one year.
        Used for benchmarking / league table views.
        """
        q = (
            select(IndicatorObservation)
            .options(joinedload(IndicatorObservation.municipality))
            .where(
                IndicatorObservation.indicator_id == indicator_id,
                IndicatorObservation.period_year == period_year,
            )
        )
        if quality_tag:
            q = q.where(IndicatorObservation.quality_tag == quality_tag)
        if country_code:
            q = q.join(Municipality).where(Municipality.country_code == country_code)

        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def get_dashboard_snapshot(
        self,
        municipality_id: UUID,
        period_year: int,
        layer: int | None = None,
    ) -> list[IndicatorObservation]:
        """
        All indicators for one municipality in one year.
        Used by the dashboard overview page.
        Includes indicator metadata via joinedload.
        """
        q = (
            select(IndicatorObservation)
            .options(joinedload(IndicatorObservation.indicator))
            .where(
                IndicatorObservation.municipality_id == municipality_id,
                IndicatorObservation.period_year == period_year,
            )
        )
        if layer is not None:
            q = q.where(IndicatorObservation.layer == layer)

        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def upsert_from_etl(
        self,
        items: list[ObservationUpsert],
        session: AsyncSession | None = None,
    ) -> tuple[int, int]:
        """
        Bulk upsert from Airflow ETL.
        Resolves indicator_slug → indicator_id and municipality_code → municipality_id.
        Returns (inserted, updated) counts.
        """
        db = session or self.session

        # Batch resolve slugs and codes
        slugs = {i.indicator_slug for i in items}
        codes = {i.municipality_code for i in items}

        slug_map: dict[str, UUID] = {
            row.slug: row.id
            for row in (
                await db.execute(
                    select(Indicator.slug, Indicator.id).where(Indicator.slug.in_(slugs))
                )
            ).all()
        }
        code_map: dict[str, UUID] = {
            row.code: row.id
            for row in (
                await db.execute(
                    select(Municipality.code, Municipality.id).where(
                        Municipality.code.in_(codes)
                    )
                )
            ).all()
        }

        inserted = updated = 0
        for item in items:
            indicator_id = slug_map.get(item.indicator_slug)
            municipality_id = code_map.get(item.municipality_code)
            if not indicator_id or not municipality_id:
                continue  # unknown slug/code — skip silently (caller logs errors)

            # Check existing
            existing = await db.scalar(
                select(IndicatorObservation.id).where(
                    IndicatorObservation.indicator_id == indicator_id,
                    IndicatorObservation.municipality_id == municipality_id,
                    IndicatorObservation.period_year == item.period_year,
                    IndicatorObservation.period_month == item.period_month,
                    IndicatorObservation.period_day == item.period_day,
                )
            )

            if existing:
                await db.execute(
                    update(IndicatorObservation)
                    .where(IndicatorObservation.id == existing)
                    .values(
                        value_raw=item.value_raw,
                        quality_tag=item.quality_tag,
                        data_source=item.data_source,
                        source_file_key=item.source_file_key,
                        notes=item.notes,
                    )
                )
                updated += 1
            else:
                db.add(IndicatorObservation(
                    indicator_id=indicator_id,
                    municipality_id=municipality_id,
                    layer=item.layer,
                    period_year=item.period_year,
                    period_month=item.period_month,
                    period_day=item.period_day,
                    value_raw=item.value_raw,
                    quality_tag=item.quality_tag,
                    data_source=item.data_source,
                    source_file_key=item.source_file_key,
                    notes=item.notes,
                ))
                inserted += 1

        await db.flush()
        return inserted, updated
