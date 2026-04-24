"""OpenKey 管理端 CRUD —— 仅管理员可访问。

管理员为外部用户签发 OpenKey，用于 /v1 OpenAI 兼容网关。
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_superuser
from app.auth.openkey import OPEN_KEY_PREFIX, generate_open_key, hash_key, key_tail
from app.db import get_async_session
from app.models.call_log import CallLog
from app.models.open_key import OpenKey
from app.models.user import User
from app.schemas.open_key import (
    OpenKeyCreate,
    OpenKeyRead,
    OpenKeyReadWithSecret,
    OpenKeyUpdate,
    OpenKeyUsage,
)

router = APIRouter()


def _to_read(ok: OpenKey) -> OpenKeyRead:
    return OpenKeyRead(
        id=ok.id,
        name=ok.name,
        prefix=ok.prefix,
        tail=ok.tail,
        enabled=ok.enabled,
        allowed_agent_ids=ok.allowed_agent_ids or [],
        rate_limit_per_minute=ok.rate_limit_per_minute,
        quota_total=ok.quota_total,
        quota_used=ok.quota_used,
        expires_at=ok.expires_at,
        created_at=ok.created_at,
        last_used_at=ok.last_used_at,
    )


@router.post("", response_model=OpenKeyReadWithSecret, status_code=status.HTTP_201_CREATED)
async def create_open_key(
    payload: OpenKeyCreate,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> OpenKeyReadWithSecret:
    raw = generate_open_key()
    ok = OpenKey(
        admin_user_id=user.id,
        name=payload.name,
        prefix=OPEN_KEY_PREFIX,
        tail=key_tail(raw),
        key_hash=hash_key(raw),
        allowed_agent_ids=payload.allowed_agent_ids,
        rate_limit_per_minute=payload.rate_limit_per_minute,
        quota_total=payload.quota_total,
        expires_at=payload.expires_at,
    )
    session.add(ok)
    await session.commit()
    await session.refresh(ok)
    read = _to_read(ok)
    return OpenKeyReadWithSecret(**read.model_dump(), key=raw)


@router.get("", response_model=list[OpenKeyRead])
async def list_open_keys(
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> list[OpenKeyRead]:
    result = await session.execute(select(OpenKey).order_by(OpenKey.id.desc()))
    return [_to_read(ok) for ok in result.scalars().all()]


@router.patch("/{key_id}", response_model=OpenKeyRead)
async def update_open_key(
    key_id: int,
    payload: OpenKeyUpdate,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> OpenKeyRead:
    result = await session.execute(select(OpenKey).where(OpenKey.id == key_id))
    ok = result.scalar_one_or_none()
    if ok is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OpenKey not found")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(ok, field, value)
    session.add(ok)
    await session.commit()
    await session.refresh(ok)
    return _to_read(ok)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_open_key(
    key_id: int,
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    result = await session.execute(select(OpenKey).where(OpenKey.id == key_id))
    ok = result.scalar_one_or_none()
    if ok is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OpenKey not found")
    await session.delete(ok)
    await session.commit()


@router.get("/{key_id}/usage", response_model=OpenKeyUsage)
async def get_open_key_usage(
    key_id: int,
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(current_superuser),
    session: AsyncSession = Depends(get_async_session),
) -> OpenKeyUsage:
    result = await session.execute(select(OpenKey).where(OpenKey.id == key_id))
    ok = result.scalar_one_or_none()
    if ok is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OpenKey not found")
    since = datetime.now(datetime.UTC) - timedelta(days=days)
    recent_count = (
        await session.execute(
            select(func.count(CallLog.id)).where(
                CallLog.open_key_id == key_id,
                CallLog.created_at >= since,
            )
        )
    ).scalar() or 0
    return OpenKeyUsage(
        open_key_id=ok.id,
        quota_total=ok.quota_total,
        quota_used=ok.quota_used,
        recent_calls=recent_count,
    )
