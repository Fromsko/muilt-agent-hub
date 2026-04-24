"""平台 API Token 的 CRUD 端点。

- 新建时返回明文 token，仅此一次。
- 列表 / 查询只返回前缀和末 4 位脱敏。
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.core.exceptions import NotFoundError
from app.auth.platform import (
    TOKEN_PREFIX,
    generate_api_token,
    hash_token,
    token_tail,
)
from app.db import get_async_session
from app.models.api_token import ApiToken
from app.models.user import User
from app.schemas.api_token import (
    ApiTokenCreate,
    ApiTokenRead,
    ApiTokenReadWithSecret,
)

router = APIRouter()


def _to_read(tok: ApiToken) -> ApiTokenRead:
    return ApiTokenRead(
        id=tok.id,
        name=tok.name,
        prefix=tok.prefix,
        tail=tok.tail,
        enabled=tok.enabled,
        expires_at=tok.expires_at,
        created_at=tok.created_at,
        last_used_at=tok.last_used_at,
    )


@router.post("", response_model=ApiTokenReadWithSecret, status_code=status.HTTP_201_CREATED)
async def create_api_token(
    payload: ApiTokenCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ApiTokenReadWithSecret:
    raw = generate_api_token()
    tok = ApiToken(
        user_id=user.id,
        name=payload.name,
        prefix=TOKEN_PREFIX,
        tail=token_tail(raw),
        token_hash=hash_token(raw),
        expires_at=payload.expires_at,
    )
    session.add(tok)
    await session.commit()
    await session.refresh(tok)
    return ApiTokenReadWithSecret(
        id=tok.id,
        name=tok.name,
        prefix=tok.prefix,
        tail=tok.tail,
        enabled=tok.enabled,
        expires_at=tok.expires_at,
        created_at=tok.created_at,
        last_used_at=tok.last_used_at,
        token=raw,
    )


@router.get("", response_model=list[ApiTokenRead])
async def list_api_tokens(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[ApiTokenRead]:
    result = await session.execute(select(ApiToken).where(ApiToken.user_id == user.id).order_by(ApiToken.id.desc()))
    return [_to_read(t) for t in result.scalars().all()]


@router.patch("/{token_id}/enabled", response_model=ApiTokenRead)
async def toggle_enabled(
    token_id: int,
    enabled: bool,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> ApiTokenRead:
    result = await session.execute(select(ApiToken).where(ApiToken.id == token_id, ApiToken.user_id == user.id))
    tok = result.scalar_one_or_none()
    if tok is None:
        raise NotFoundError("API token not found")
    tok.enabled = enabled
    session.add(tok)
    await session.commit()
    await session.refresh(tok)
    return _to_read(tok)


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_token(
    token_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    result = await session.execute(select(ApiToken).where(ApiToken.id == token_id, ApiToken.user_id == user.id))
    tok = result.scalar_one_or_none()
    if tok is None:
        raise NotFoundError("API token not found")
    await session.delete(tok)
    await session.commit()
