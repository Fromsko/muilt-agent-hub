"""平台 API Token 认证依赖 —— 供 `/public` 路由使用。

与 JWT 并存但独立：
- JWT 依赖：`app.auth.backend.current_active_user`（浏览器 / 管理端）
- Token 依赖：本模块 `current_user_by_api_token`（外部系统 curl / SDK）

Token 格式：`ah_{secrets.token_urlsafe(24)}`，DB 只存 SHA-256 hash。
"""

import hashlib
import secrets
from datetime import datetime, UTC

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_async_session
from app.models.api_token import ApiToken
from app.models.user import User

TOKEN_PREFIX = "ah_"


def generate_api_token() -> str:
    """生成一枚新的平台 API Token。"""
    return f"{TOKEN_PREFIX}{secrets.token_urlsafe(24)}"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def token_tail(token: str, n: int = 4) -> str:
    return token[-n:] if len(token) >= n else token


async def current_user_by_api_token(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    """解析 `Authorization: Bearer ah_xxx` 头，返回对应 User。

    不与 JWT 混用——调用方必须使用平台 token 前缀。
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    raw = authorization[7:].strip()
    if not raw.startswith(TOKEN_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected API token with '{TOKEN_PREFIX}' prefix",
            headers={"WWW-Authenticate": "Bearer"},
        )

    digest = hash_token(raw)
    result = await session.execute(
        select(ApiToken).where(
            ApiToken.token_hash == digest,
            ApiToken.enabled == True,  # noqa: E712
        )
    )
    api_token = result.scalar_one_or_none()
    if api_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or disabled API token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if api_token.expires_at and api_token.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 刷新 last_used_at（best-effort，失败不阻塞请求）
    api_token.last_used_at = datetime.now(UTC)
    session.add(api_token)
    try:
        await session.commit()
    except Exception:  # noqa: BLE001
        await session.rollback()

    user_result = await session.execute(select(User).where(User.id == api_token.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner user inactive",
        )
    return user
