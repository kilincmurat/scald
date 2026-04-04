"""
Generic async repository — provides typed CRUD operations.

All domain repositories inherit from AsyncRepository[T].
This eliminates boilerplate while keeping type safety.
"""
from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class AsyncRepository(Generic[ModelT]):
    """
    Generic repository pattern for SQLAlchemy 2.0 async sessions.

    Usage:
        class IndicatorRepository(AsyncRepository[Indicator]):
            model = Indicator
    """
    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, id: UUID) -> ModelT | None:
        return await self.session.get(self.model, id)

    async def get_or_raise(self, id: UUID) -> ModelT:
        obj = await self.get(id)
        if obj is None:
            raise ValueError(f"{self.model.__name__} with id={id} not found")
        return obj

    async def list(
        self,
        *,
        offset: int = 0,
        limit: int = 50,
        filters: list[Any] | None = None,
        order_by: list[Any] | None = None,
    ) -> tuple[list[ModelT], int]:
        """Returns (items, total_count) for pagination."""
        q = select(self.model)
        if filters:
            q = q.where(*filters)

        # Total count (before pagination)
        count_q = select(func.count()).select_from(q.subquery())
        total = await self.session.scalar(count_q) or 0

        if order_by:
            q = q.order_by(*order_by)
        q = q.offset(offset).limit(limit)

        result = await self.session.execute(q)
        return list(result.scalars().all()), total

    async def create(self, obj: ModelT) -> ModelT:
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def update(self, obj: ModelT, data: dict[str, Any]) -> ModelT:
        for key, value in data.items():
            setattr(obj, key, value)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.session.delete(obj)
        await self.session.flush()

    async def soft_delete(self, obj: ModelT) -> None:
        """Sets is_active=False instead of physical deletion."""
        obj.is_active = False  # type: ignore[attr-defined]
        await self.session.flush()
