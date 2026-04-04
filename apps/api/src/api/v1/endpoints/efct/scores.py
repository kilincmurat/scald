"""
EFCT Score endpoints.

GET  /efct/scores/{municipality_id}              — current score for a municipality
GET  /efct/scores/{municipality_id}/history      — score history (all superseded rows)
GET  /efct/scores/{municipality_id}/year/{year}  — score for a specific year
POST /efct/scores/{municipality_id}/recalculate  — trigger async recalculation
GET  /efct/scores/league-table                   — ranked cross-municipal table
GET  /efct/scores/compare                        — side-by-side two municipalities
GET  /efct/scores/tasks/{task_id}                — Celery task status polling
"""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import EfctScore
from src.db.models.municipality import Municipality
from src.db.session import get_db
from src.schemas.efct.score import (
    EfctCompareResponse,
    EfctLeagueTableRow,
    EfctScoreResponse,
    EfctScoreSummary,
    EfctTaskResponse,
)
from src.workers.tasks.celery_app import celery_app

router = APIRouter(prefix="/scores", tags=["efct-scores"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _score_to_response(score: EfctScore, mun: Municipality | None) -> EfctScoreResponse:
    return EfctScoreResponse(
        id=score.id,
        municipality_id=score.municipality_id,
        municipality_name=mun.name if mun else None,
        period_year=score.period_year,
        score_total=float(score.score_total) if score.score_total is not None else None,
        score_percentile=float(score.score_percentile)
            if score.score_percentile is not None else None,
        rating=score.rating,
        component_scores=score.component_scores or {},
        components=[],  # populated separately when needed
        coverage_pct=float(score.coverage_pct) if score.coverage_pct is not None else None,
        missing_indicators=score.missing_indicators,
        imputation_method=score.imputation_method,
        data_quality_flag=score.data_quality_flag,
        calculated_at=score.calculated_at,
        calculation_version=score.calculation_version,
        triggered_by=score.triggered_by,
        is_current=score.superseded_at is None,
        created_at=score.created_at,
    )


async def _get_municipality_or_404(
    municipality_id: uuid.UUID,
    session: AsyncSession,
) -> Municipality:
    mun = await session.get(Municipality, municipality_id)
    if mun is None:
        raise HTTPException(status_code=404, detail="Municipality not found")
    return mun


# ── Current score ─────────────────────────────────────────────────────────────

@router.get("/{municipality_id}", response_model=EfctScoreResponse)
async def get_current_score(
    municipality_id: uuid.UUID,
    year: int | None = Query(None, ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
) -> EfctScoreResponse:
    """
    Returns the current EFCT score for a municipality.
    If `year` is provided, returns the current score for that year.
    Otherwise returns the most recently calculated score across all years.
    """
    mun = await _get_municipality_or_404(municipality_id, db)

    query = (
        select(EfctScore)
        .where(
            EfctScore.municipality_id == municipality_id,
            EfctScore.superseded_at.is_(None),
        )
        .order_by(EfctScore.period_year.desc())
    )
    if year is not None:
        query = query.where(EfctScore.period_year == year)

    score = (await db.execute(query.limit(1))).scalar_one_or_none()
    if score is None:
        raise HTTPException(status_code=404, detail="No score found for this municipality")

    return _score_to_response(score, mun)


@router.get("/{municipality_id}/year/{year}", response_model=EfctScoreResponse)
async def get_score_for_year(
    municipality_id: uuid.UUID,
    year: int,
    db: AsyncSession = Depends(get_db),
) -> EfctScoreResponse:
    mun = await _get_municipality_or_404(municipality_id, db)

    score = (
        await db.execute(
            select(EfctScore).where(
                EfctScore.municipality_id == municipality_id,
                EfctScore.period_year == year,
                EfctScore.superseded_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    if score is None:
        raise HTTPException(
            status_code=404,
            detail=f"No score for municipality {municipality_id} year {year}",
        )
    return _score_to_response(score, mun)


# ── Score history ─────────────────────────────────────────────────────────────

@router.get("/{municipality_id}/history", response_model=list[EfctScoreSummary])
async def get_score_history(
    municipality_id: uuid.UUID,
    year: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[EfctScoreSummary]:
    """All score records for a municipality (including superseded), newest first."""
    await _get_municipality_or_404(municipality_id, db)

    query = (
        select(EfctScore)
        .where(EfctScore.municipality_id == municipality_id)
        .order_by(EfctScore.calculated_at.desc())
        .limit(limit)
    )
    if year is not None:
        query = query.where(EfctScore.period_year == year)

    rows = (await db.execute(query)).scalars().all()
    return [
        EfctScoreSummary(
            id=s.id,
            municipality_id=s.municipality_id,
            period_year=s.period_year,
            score_total=float(s.score_total) if s.score_total is not None else None,
            rating=s.rating,
            score_percentile=float(s.score_percentile)
                if s.score_percentile is not None else None,
            coverage_pct=float(s.coverage_pct) if s.coverage_pct is not None else None,
            data_quality_flag=s.data_quality_flag,
            calculated_at=s.calculated_at,
            is_current=s.superseded_at is None,
        )
        for s in rows
    ]


# ── Recalculate (async) ────────────────────────────────────────────────────────

@router.post(
    "/{municipality_id}/recalculate",
    response_model=EfctTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_recalculation(
    municipality_id: uuid.UUID,
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
) -> EfctTaskResponse:
    """
    Enqueues an EFCT score recalculation for the given municipality and year.
    Returns a task_id for status polling via GET /efct/scores/tasks/{task_id}.
    """
    await _get_municipality_or_404(municipality_id, db)

    from src.workers.tasks.efct_score_tasks import recalculate_efct_score
    task = recalculate_efct_score.apply_async(
        kwargs={
            "municipality_id": str(municipality_id),
            "period_year": year,
            "triggered_by": "api_request",
        }
    )

    return EfctTaskResponse(
        task_id=task.id,
        status="pending",
        municipality_id=municipality_id,
        period_year=year,
        queued_at=datetime.now(timezone.utc),
    )


# ── Task status polling ───────────────────────────────────────────────────────

@router.get("/tasks/{task_id}", response_model=EfctTaskResponse)
async def get_task_status(task_id: str) -> EfctTaskResponse:
    """
    Polls a Celery task for its current status.
    Status values: pending | running | complete | failed
    """
    result: AsyncResult = celery_app.AsyncResult(task_id)
    state_map = {
        "PENDING": "pending",
        "STARTED": "running",
        "SUCCESS": "complete",
        "FAILURE": "failed",
        "RETRY": "running",
        "REVOKED": "failed",
    }
    task_status = state_map.get(result.state, "pending")

    summary = None
    error_msg = None

    if result.state == "SUCCESS" and isinstance(result.result, dict):
        r = result.result
        summary = EfctScoreSummary(
            id=uuid.uuid4(),  # placeholder — the real id is in the DB
            municipality_id=uuid.UUID(r["municipality_id"]),
            period_year=r["period_year"],
            score_total=r.get("score_total"),
            rating=r.get("rating"),
            score_percentile=r.get("score_percentile"),
            coverage_pct=r.get("coverage_pct"),
            data_quality_flag=r.get("data_quality_flag"),
            calculated_at=datetime.fromisoformat(r["calculated_at"]),
            is_current=True,
        )
    elif result.state == "FAILURE":
        error_msg = str(result.result)

    # Extract metadata from task kwargs if available
    kwargs = result.kwargs or {}
    municipality_id = kwargs.get("municipality_id", str(uuid.uuid4()))
    period_year = kwargs.get("period_year", 0)

    return EfctTaskResponse(
        task_id=task_id,
        status=task_status,
        municipality_id=uuid.UUID(municipality_id) if municipality_id else uuid.uuid4(),
        period_year=period_year,
        queued_at=datetime.now(timezone.utc),
        result=summary,
        error=error_msg,
    )


# ── League table ──────────────────────────────────────────────────────────────

@router.get("/league-table", response_model=list[EfctLeagueTableRow])
async def get_league_table(
    year: int = Query(..., ge=2000, le=2100),
    country_code: str | None = Query(None, max_length=3),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[EfctLeagueTableRow]:
    """
    Ranked list of municipalities by EFCT score for a given year.
    Optionally filtered by country_code.
    """
    query = (
        select(EfctScore, Municipality)
        .join(Municipality, Municipality.id == EfctScore.municipality_id)
        .where(
            EfctScore.period_year == year,
            EfctScore.superseded_at.is_(None),
            EfctScore.score_total.is_not(None),
        )
        .order_by(EfctScore.score_total.desc())
    )
    if country_code:
        query = query.where(Municipality.country_code == country_code.upper())

    rows = (await db.execute(query.offset(offset).limit(limit))).all()

    table: list[EfctLeagueTableRow] = []
    for rank_offset, (score, mun) in enumerate(rows, start=offset + 1):
        # Best and worst category from component_scores
        comp = score.component_scores or {}
        best_cat = max(comp, key=comp.get) if comp else None
        worst_cat = min(comp, key=comp.get) if comp else None

        table.append(
            EfctLeagueTableRow(
                rank=rank_offset,
                municipality_id=score.municipality_id,
                municipality_name=mun.name or {},
                country_code=mun.country_code,
                period_year=score.period_year,
                score_total=float(score.score_total) if score.score_total is not None else None,
                rating=score.rating,
                score_percentile=float(score.score_percentile)
                    if score.score_percentile is not None else None,
                coverage_pct=float(score.coverage_pct)
                    if score.coverage_pct is not None else None,
                best_category=best_cat,
                best_category_score=comp.get(best_cat) if best_cat else None,
                worst_category=worst_cat,
                worst_category_score=comp.get(worst_cat) if worst_cat else None,
            )
        )
    return table


# ── Compare two municipalities ────────────────────────────────────────────────

@router.get("/compare", response_model=EfctCompareResponse)
async def compare_municipalities(
    municipality_a: uuid.UUID,
    municipality_b: uuid.UUID,
    year: int = Query(..., ge=2000, le=2100),
    db: AsyncSession = Depends(get_db),
) -> EfctCompareResponse:
    """Side-by-side comparison of two municipalities for a given year."""
    async def _fetch(mun_id: uuid.UUID) -> tuple[EfctScore, Municipality]:
        mun = await _get_municipality_or_404(mun_id, db)
        score = (
            await db.execute(
                select(EfctScore).where(
                    EfctScore.municipality_id == mun_id,
                    EfctScore.period_year == year,
                    EfctScore.superseded_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if score is None:
            raise HTTPException(
                status_code=404,
                detail=f"No score for municipality {mun_id} year {year}",
            )
        return score, mun

    score_a, mun_a = await _fetch(municipality_a)
    score_b, mun_b = await _fetch(municipality_b)

    resp_a = _score_to_response(score_a, mun_a)
    resp_b = _score_to_response(score_b, mun_b)

    # Compute per-category diff (A - B)
    comp_a = score_a.component_scores or {}
    comp_b = score_b.component_scores or {}
    all_cats = set(comp_a) | set(comp_b)
    component_diff = {
        cat: round((comp_a.get(cat) or 0.0) - (comp_b.get(cat) or 0.0), 3)
        for cat in all_cats
    }

    score_diff = None
    if score_a.score_total is not None and score_b.score_total is not None:
        score_diff = round(float(score_a.score_total) - float(score_b.score_total), 3)

    return EfctCompareResponse(
        period_year=year,
        municipality_a=resp_a,
        municipality_b=resp_b,
        component_diff=component_diff,
        score_diff=score_diff,
    )
