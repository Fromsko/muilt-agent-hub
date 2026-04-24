"""Generic CRUD router factory for user-owned resources.

Generates five standard endpoints (create / list / get / update / delete)
for any SQLModel that has ``id`` + ``user_id`` columns, eliminating the
repetitive boilerplate found in agents/prompts/keys/api_tokens/mcp_servers.

Usage::

    from app.core.crud_router import build_crud_router
    router = build_crud_router(
        model_cls=Prompt,
        create_schema=PromptCreate,
        update_schema=PromptUpdate,
        read_schema=PromptRead,
        label="Prompt",
    )
"""

from datetime import datetime, UTC
from typing import Any, TypeVar

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.user import User
from app.services.ownership import ensure_owned

M = TypeVar("M", bound=SQLModel)


def build_crud_router(
    *,
    model_cls: type[M],
    create_schema: type[BaseModel],
    update_schema: type[BaseModel],
    read_schema: type[BaseModel],
    label: str | None = None,
    to_read: Any | None = None,
) -> APIRouter:
    """Return an ``APIRouter`` pre-wired with generic CRUD endpoints.

    Parameters
    ----------
    to_read:
        Optional callable ``(model_instance) -> ReadSchema`` for custom
        serialisation (e.g. masking fields).  When *None*, the raw model
        is returned and FastAPI's ``response_model`` handles conversion.
    """
    name = label or model_cls.__name__
    router = APIRouter()

    @router.post("", response_model=read_schema, status_code=status.HTTP_201_CREATED)
    async def create_resource(
        payload: create_schema,  # type: ignore[valid-type]
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ):
        obj = model_cls(user_id=user.id, **payload.model_dump())
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return to_read(obj) if to_read else obj

    @router.get("", response_model=list[read_schema])  # type: ignore[valid-type]
    async def list_resources(
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ):
        result = await session.execute(
            select(model_cls)
            .where(model_cls.user_id == user.id)  # type: ignore[attr-defined]
            .order_by(model_cls.id.desc())  # type: ignore[attr-defined]
        )
        rows = result.scalars().all()
        return [to_read(r) for r in rows] if to_read else list(rows)

    @router.get("/{resource_id}", response_model=read_schema)
    async def get_resource(
        resource_id: int,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ):
        obj = await ensure_owned(model_cls, resource_id, user.id, session, label=name)
        return to_read(obj) if to_read else obj

    @router.patch("/{resource_id}", response_model=read_schema)
    async def update_resource(
        resource_id: int,
        payload: update_schema,  # type: ignore[valid-type]
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ):
        obj = await ensure_owned(model_cls, resource_id, user.id, session, label=name)
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            setattr(obj, field, value)
        if hasattr(obj, "updated_at"):
            obj.updated_at = datetime.now(UTC)
        session.add(obj)
        await session.commit()
        await session.refresh(obj)
        return to_read(obj) if to_read else obj

    @router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_resource(
        resource_id: int,
        user: User = Depends(current_active_user),
        session: AsyncSession = Depends(get_async_session),
    ) -> None:
        obj = await ensure_owned(model_cls, resource_id, user.id, session, label=name)
        await session.delete(obj)
        await session.commit()

    return router
