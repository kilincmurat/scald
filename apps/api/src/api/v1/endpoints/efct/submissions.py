"""
EFCT Submission endpoints — municipal data collection workflow.

POST   /efct/submissions                           — create draft submission
GET    /efct/submissions                           — list submissions (admin or own)
GET    /efct/submissions/{id}                      — get full detail with items
PATCH  /efct/submissions/{id}/items/{item_id}      — update a single sub-indicator value
POST   /efct/submissions/{id}/submit               — municipality submits for review
POST   /efct/submissions/{id}/approve              — reviewer approves
POST   /efct/submissions/{id}/reject               — reviewer rejects
DELETE /efct/submissions/{id}                      — delete a draft (municipality only)
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.efct import (
    EfctIndicatorMetadata,
    EfctSubmission,
    EfctSubmissionItem,
)
from src.db.models.indicator import Indicator
from src.db.models.municipality import Municipality
from src.db.session import get_db
from src.schemas.efct.submission import (
    EfctReviewAction,
    EfctSubmissionCreate,
    EfctSubmissionDetail,
    EfctSubmissionItemPatch,
    EfctSubmissionItemResponse,
    EfctSubmissionResponse,
    EfctSubmitAction,
)

router = APIRouter(prefix="/submissions", tags=["efct-submissions"])


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_submission_or_404(
    submission_id: uuid.UUID,
    db: AsyncSession,
) -> EfctSubmission:
    sub = await db.get(EfctSubmission, submission_id)
    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub


def _item_to_response(
    item: EfctSubmissionItem,
    slug_map: dict[uuid.UUID, str],
    name_map: dict[uuid.UUID, dict],
    unit_map: dict[uuid.UUID, str],
) -> EfctSubmissionItemResponse:
    return EfctSubmissionItemResponse(
        id=item.id,
        submission_id=item.submission_id,
        indicator_id=item.indicator_id,
        indicator_slug=slug_map.get(item.indicator_id),
        indicator_name=name_map.get(item.indicator_id),
        indicator_unit=unit_map.get(item.indicator_id),
        value_raw=float(item.value_raw) if item.value_raw is not None else None,
        value_notes=item.value_notes,
        data_source=item.data_source,
        supporting_file_key=item.supporting_file_key,
        is_estimated=item.is_estimated,
        estimation_method=item.estimation_method,
        updated_at=item.updated_at,
    )


async def _load_indicator_lookups(
    indicator_ids: list[uuid.UUID],
    db: AsyncSession,
) -> tuple[dict, dict, dict]:
    """Returns (slug_map, name_map, unit_map) for given indicator IDs."""
    if not indicator_ids:
        return {}, {}, {}
    rows = (
        await db.execute(
            select(Indicator.id, Indicator.slug, Indicator.name, Indicator.unit)
            .where(Indicator.id.in_(indicator_ids))
        )
    ).all()
    slug_map = {r[0]: r[1] for r in rows}
    name_map = {r[0]: r[2] for r in rows}
    unit_map = {r[0]: r[3] for r in rows}
    return slug_map, name_map, unit_map


def _completeness(items: list[EfctSubmissionItem]) -> float | None:
    if not items:
        return None
    filled = sum(1 for i in items if i.value_raw is not None)
    return round(filled / len(items) * 100, 2)


# ── Create draft ──────────────────────────────────────────────────────────────

@router.post("", response_model=EfctSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    body: EfctSubmissionCreate,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionResponse:
    """
    Creates a new draft submission for a municipality/year.
    Auto-populates one EfctSubmissionItem per active EFCT indicator.
    Raises 409 if a non-rejected draft/submission already exists for this cycle.
    """
    mun = await db.get(Municipality, body.municipality_id)
    if mun is None:
        raise HTTPException(status_code=404, detail="Municipality not found")

    # Check for existing open submission
    existing = (
        await db.execute(
            select(EfctSubmission).where(
                EfctSubmission.municipality_id == body.municipality_id,
                EfctSubmission.period_year == body.period_year,
                EfctSubmission.submission_status.not_in(["rejected"]),
            )
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A submission already exists for this municipality/year (id={existing.id})",
        )

    # Determine submission round
    last_round = (
        await db.execute(
            select(EfctSubmission.submission_round)
            .where(
                EfctSubmission.municipality_id == body.municipality_id,
                EfctSubmission.period_year == body.period_year,
            )
            .order_by(EfctSubmission.submission_round.desc())
            .limit(1)
        )
    ).scalar_one_or_none() or 0

    submission = EfctSubmission(
        municipality_id=body.municipality_id,
        period_year=body.period_year,
        submission_status="draft",
        submission_round=last_round + 1,
        completeness_pct=0.0,
    )
    db.add(submission)
    await db.flush()  # get submission.id

    # Auto-populate items for all active EFCT indicators
    meta_rows = (
        await db.execute(
            select(EfctIndicatorMetadata.indicator_id)
            .where(EfctIndicatorMetadata.is_active.is_(True))
        )
    ).scalars().all()

    for ind_id in meta_rows:
        db.add(EfctSubmissionItem(
            submission_id=submission.id,
            indicator_id=ind_id,
            is_estimated=False,
        ))

    await db.flush()

    return EfctSubmissionResponse(
        id=submission.id,
        municipality_id=submission.municipality_id,
        municipality_name=mun.name,
        period_year=submission.period_year,
        submission_status=submission.submission_status,
        submission_round=submission.submission_round,
        completeness_pct=submission.completeness_pct,
        submitted_at=submission.submitted_at,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )


# ── List submissions ──────────────────────────────────────────────────────────

@router.get("", response_model=list[EfctSubmissionResponse])
async def list_submissions(
    municipality_id: uuid.UUID | None = Query(None),
    period_year: int | None = Query(None),
    submission_status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[EfctSubmissionResponse]:
    query = (
        select(EfctSubmission, Municipality)
        .join(Municipality, Municipality.id == EfctSubmission.municipality_id)
        .order_by(EfctSubmission.created_at.desc())
    )
    if municipality_id:
        query = query.where(EfctSubmission.municipality_id == municipality_id)
    if period_year:
        query = query.where(EfctSubmission.period_year == period_year)
    if submission_status:
        query = query.where(EfctSubmission.submission_status == submission_status)

    rows = (await db.execute(query.offset(offset).limit(limit))).all()
    return [
        EfctSubmissionResponse(
            id=sub.id,
            municipality_id=sub.municipality_id,
            municipality_name=mun.name,
            period_year=sub.period_year,
            submission_status=sub.submission_status,
            submission_round=sub.submission_round,
            completeness_pct=float(sub.completeness_pct)
                if sub.completeness_pct is not None else None,
            submitted_at=sub.submitted_at,
            reviewed_at=sub.reviewed_at,
            created_at=sub.created_at,
            updated_at=sub.updated_at,
        )
        for sub, mun in rows
    ]


# ── Get detail ────────────────────────────────────────────────────────────────

@router.get("/{submission_id}", response_model=EfctSubmissionDetail)
async def get_submission(
    submission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionDetail:
    sub = await _get_submission_or_404(submission_id, db)
    mun = await db.get(Municipality, sub.municipality_id)

    items = (
        await db.execute(
            select(EfctSubmissionItem)
            .where(EfctSubmissionItem.submission_id == submission_id)
            .order_by(EfctSubmissionItem.indicator_id)
        )
    ).scalars().all()

    slug_map, name_map, unit_map = await _load_indicator_lookups(
        [item.indicator_id for item in items], db
    )

    return EfctSubmissionDetail(
        id=sub.id,
        municipality_id=sub.municipality_id,
        municipality_name=mun.name if mun else None,
        period_year=sub.period_year,
        submission_status=sub.submission_status,
        submission_round=sub.submission_round,
        completeness_pct=float(sub.completeness_pct)
            if sub.completeness_pct is not None else None,
        submitted_at=sub.submitted_at,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        submitted_by=sub.submitted_by,
        reviewed_by=sub.reviewed_by,
        review_notes=sub.review_notes,
        rejection_reason=sub.rejection_reason,
        items=[_item_to_response(i, slug_map, name_map, unit_map) for i in items],
        items_total=len(items),
        items_filled=sum(1 for i in items if i.value_raw is not None),
    )


# ── Patch item ────────────────────────────────────────────────────────────────

@router.patch(
    "/{submission_id}/items/{item_id}",
    response_model=EfctSubmissionItemResponse,
)
async def patch_submission_item(
    submission_id: uuid.UUID,
    item_id: uuid.UUID,
    body: EfctSubmissionItemPatch,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionItemResponse:
    """Update a single sub-indicator value in a draft submission."""
    sub = await _get_submission_or_404(submission_id, db)
    if sub.submission_status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft submissions can be edited",
        )

    item = await db.get(EfctSubmissionItem, item_id)
    if item is None or item.submission_id != submission_id:
        raise HTTPException(status_code=404, detail="Submission item not found")

    # Apply patch
    if body.value_raw is not None:
        item.value_raw = body.value_raw  # type: ignore[assignment]
    if body.value_notes is not None:
        item.value_notes = body.value_notes
    if body.data_source is not None:
        item.data_source = body.data_source
    item.is_estimated = body.is_estimated
    if body.estimation_method is not None:
        item.estimation_method = body.estimation_method

    # Recalculate completeness
    all_items = (
        await db.execute(
            select(EfctSubmissionItem)
            .where(EfctSubmissionItem.submission_id == submission_id)
        )
    ).scalars().all()
    sub.completeness_pct = _completeness(all_items)  # type: ignore[assignment]

    await db.flush()

    slug_map, name_map, unit_map = await _load_indicator_lookups([item.indicator_id], db)
    return _item_to_response(item, slug_map, name_map, unit_map)


# ── Submit ────────────────────────────────────────────────────────────────────

@router.post("/{submission_id}/submit", response_model=EfctSubmissionResponse)
async def submit_submission(
    submission_id: uuid.UUID,
    body: EfctSubmitAction,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionResponse:
    sub = await _get_submission_or_404(submission_id, db)
    if sub.submission_status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft submissions can be submitted",
        )

    sub.submission_status = "submitted"
    sub.submitted_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    await db.flush()

    mun = await db.get(Municipality, sub.municipality_id)
    return EfctSubmissionResponse(
        id=sub.id,
        municipality_id=sub.municipality_id,
        municipality_name=mun.name if mun else None,
        period_year=sub.period_year,
        submission_status=sub.submission_status,
        submission_round=sub.submission_round,
        completeness_pct=float(sub.completeness_pct)
            if sub.completeness_pct is not None else None,
        submitted_at=sub.submitted_at,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# ── Approve ───────────────────────────────────────────────────────────────────

@router.post("/{submission_id}/approve", response_model=EfctSubmissionResponse)
async def approve_submission(
    submission_id: uuid.UUID,
    body: EfctReviewAction,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionResponse:
    """
    Approves a submitted submission.
    Automatically triggers EFCT score recalculation via Celery.
    """
    sub = await _get_submission_or_404(submission_id, db)
    if sub.submission_status not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submission must be in 'submitted' or 'under_review' state to approve",
        )

    sub.submission_status = "approved"
    sub.reviewed_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    sub.review_notes = body.notes

    await db.flush()

    # Trigger recalculation
    from src.workers.tasks.efct_score_tasks import recalculate_efct_score
    recalculate_efct_score.apply_async(
        kwargs={
            "municipality_id": str(sub.municipality_id),
            "period_year": sub.period_year,
            "triggered_by": "submission_approved",
        }
    )

    mun = await db.get(Municipality, sub.municipality_id)
    return EfctSubmissionResponse(
        id=sub.id,
        municipality_id=sub.municipality_id,
        municipality_name=mun.name if mun else None,
        period_year=sub.period_year,
        submission_status=sub.submission_status,
        submission_round=sub.submission_round,
        completeness_pct=float(sub.completeness_pct)
            if sub.completeness_pct is not None else None,
        submitted_at=sub.submitted_at,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# ── Reject ────────────────────────────────────────────────────────────────────

@router.post("/{submission_id}/reject", response_model=EfctSubmissionResponse)
async def reject_submission(
    submission_id: uuid.UUID,
    body: EfctReviewAction,
    db: AsyncSession = Depends(get_db),
) -> EfctSubmissionResponse:
    sub = await _get_submission_or_404(submission_id, db)
    if sub.submission_status not in ("submitted", "under_review"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submission must be in 'submitted' or 'under_review' state to reject",
        )
    if not body.rejection_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="rejection_reason is required",
        )

    sub.submission_status = "rejected"
    sub.reviewed_at = datetime.now(timezone.utc)  # type: ignore[assignment]
    sub.review_notes = body.notes
    sub.rejection_reason = body.rejection_reason

    await db.flush()

    mun = await db.get(Municipality, sub.municipality_id)
    return EfctSubmissionResponse(
        id=sub.id,
        municipality_id=sub.municipality_id,
        municipality_name=mun.name if mun else None,
        period_year=sub.period_year,
        submission_status=sub.submission_status,
        submission_round=sub.submission_round,
        completeness_pct=float(sub.completeness_pct)
            if sub.completeness_pct is not None else None,
        submitted_at=sub.submitted_at,
        reviewed_at=sub.reviewed_at,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
    )


# ── Delete draft ──────────────────────────────────────────────────────────────

@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_submission(
    submission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> None:
    sub = await _get_submission_or_404(submission_id, db)
    if sub.submission_status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft submissions can be deleted",
        )
    await db.delete(sub)
    await db.flush()
