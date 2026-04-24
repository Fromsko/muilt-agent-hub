"""Reusable ownership check — query a resource and verify it belongs to the
current user, raising the appropriate exception when not found or not owned."""

from __future__ import annotations

import uuid
from typing import TypeVar

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.core.exceptions import NotFoundError

T = TypeVar("T", bound=SQLModel)


async def ensure_owned(
    model_cls: type[T],
    resource_id: int,
    user_id: uuid.UUID,
    session: AsyncSession,
    *,
    label: str | None = None,
) -> T:
    """Fetch *model_cls* row by PK and verify ``user_id`` ownership.

    Raises ``NotFoundError`` when the row does not exist **or** does not
    belong to *user_id* (intentionally vague to avoid information leakage).
    """
    name = label or model_cls.__name__
    stmt = select(model_cls).where(
        model_cls.id == resource_id,  # type: ignore[attr-defined]
        model_cls.user_id == user_id,  # type: ignore[attr-defined]
    )
    result = await session.execute(stmt)
    obj = result.scalar_one_or_none()
    if obj is None:
        raise NotFoundError(f"{name} not found")
    return obj
