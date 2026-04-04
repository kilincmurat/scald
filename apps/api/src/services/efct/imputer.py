"""
EFCT Imputer — Phase 2b of the calculation pipeline.

When a sub-indicator value is missing (NULL), applies the strategy
defined in EfctIndicatorMetadata.imputation_strategy:

  peer_median       → median of same indicator, same country_code, same year
  national_average  → pre-seeded benchmark from EfctIndicatorMetadata
  zero              → score = 0 for this indicator
  skip              → exclude from weighted average denominator

All DB operations are async; returns (imputed_value, was_imputed) tuples.
"""
import statistics
import uuid
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.observation import IndicatorObservation
from src.db.models.municipality import Municipality

ImputationStrategy = Literal["peer_median", "national_average", "zero", "skip"]


async def impute(
    *,
    indicator_id: uuid.UUID,
    municipality_id: uuid.UUID,
    period_year: int,
    strategy: ImputationStrategy,
    national_average: float | None,
    session: AsyncSession,
) -> tuple[float | None, bool]:
    """
    Returns (imputed_value_or_None, was_imputed).

    - "skip": returns (None, True) — caller excludes from denominator.
    - "zero": returns (0.0, True).
    - "peer_median": queries same country peers; falls back to national_average if <3 peers.
    - "national_average": returns (national_average, True); 0 if also None.
    """
    if strategy == "skip":
        return None, True

    if strategy == "zero":
        return 0.0, True

    if strategy == "national_average":
        return (national_average or 0.0), True

    # peer_median
    peers = await _fetch_peer_values(
        indicator_id=indicator_id,
        municipality_id=municipality_id,
        period_year=period_year,
        session=session,
    )
    if len(peers) >= 3:
        return statistics.median(peers), True

    # Fallback: national_average
    if national_average is not None:
        return national_average, True

    return 0.0, True


async def _fetch_peer_values(
    *,
    indicator_id: uuid.UUID,
    municipality_id: uuid.UUID,
    period_year: int,
    session: AsyncSession,
) -> list[float]:
    """
    Fetches value_raw for the same indicator from all municipalities
    in the same country as municipality_id, excluding itself.
    """
    # Get country code of this municipality
    mun = await session.get(Municipality, municipality_id)
    if mun is None:
        return []
    country_code = mun.country_code

    # Get all municipalities in the same country
    peer_ids_rows = await session.execute(
        select(Municipality.id).where(
            Municipality.country_code == country_code,
            Municipality.id != municipality_id,
            Municipality.is_active.is_(True),
        )
    )
    peer_ids = [r[0] for r in peer_ids_rows.all()]
    if not peer_ids:
        return []

    # Fetch observations for those peers
    obs_rows = await session.execute(
        select(IndicatorObservation.value_raw).where(
            IndicatorObservation.indicator_id == indicator_id,
            IndicatorObservation.municipality_id.in_(peer_ids),
            IndicatorObservation.period_year == period_year,
            IndicatorObservation.value_raw.is_not(None),
        )
    )
    return [float(r[0]) for r in obs_rows.all()]
