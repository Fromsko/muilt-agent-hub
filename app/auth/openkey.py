"""OpenKey 认证依赖 — 供 /v1 OpenAI 兼容网关使用。

与 JWT / ApiToken(ah_) 完全独立：
- 前缀 ok_，DB 只存 SHA-256 hash
- 内含限额校验：quota、expires_at、rate_limit
- 频率限制使用内存滑动窗口（单实例限定）
"""

import hashlib
import secrets
import time
from collections import defaultdict
from datetime import datetime, UTC

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_async_session
from app.models.open_key import OpenKey
from app.models.user import User

OPEN_KEY_PREFIX = "ok_"

# 内存滑动窗口：key_id -> list[timestamp]
_rate_windows: dict[int, list[float]] = defaultdict(list)


def generate_open_key() -> str:
    return f"{OPEN_KEY_PREFIX}{secrets.token_urlsafe(32)}"


def hash_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def key_tail(raw: str, n: int = 4) -> str:
    return raw[-n:] if len(raw) >= n else raw


def _check_rate_limit(key_id: int, limit_per_minute: int) -> None:
    """内存滑动窗口限频。单实例部署有效，多实例需 Redis。"""
    now = time.monotonic()
    window = _rate_windows[key_id]
    cutoff = now - 60.0
    _rate_windows[key_id] = [t for t in window if t > cutoff]
    if len(_rate_windows[key_id]) >= limit_per_minute:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: {limit_per_minute} requests/min",
        )
    _rate_windows[key_id].append(now)


async def current_openkey(
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> tuple[OpenKey, User]:
    """解析 Authorization: Bearer ok_xxx，返回 (OpenKey, User) 元组。

    校验链：token 存在 -> hash 匹配 -> enabled -> 未过期 -> quota -> rate limit
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    raw = authorization[7:].strip()
    if not raw.startswith(OPEN_KEY_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected OpenKey with '{OPEN_KEY_PREFIX}' prefix",
            headers={"WWW-Authenticate": "Bearer"},
        )

    digest = hash_key(raw)
    result = await session.execute(
        select(OpenKey).where(OpenKey.key_hash == digest, OpenKey.enabled == True)  # noqa: E712
    )
    open_key = result.scalar_one_or_none()
    if open_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or disabled OpenKey",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if open_key.expires_at and open_key.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="OpenKey has expired",
        )

    if open_key.quota_total is not None and open_key.quota_used >= open_key.quota_total:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="OpenKey quota exhausted",
        )

    if open_key.rate_limit_per_minute is not None:
        _check_rate_limit(open_key.id, open_key.rate_limit_per_minute)

    open_key.last_used_at = datetime.now(UTC)
    session.add(open_key)
    try:
        await session.commit()
    except Exception:  # noqa: BLE001
        await session.rollback()

    user_result = await session.execute(select(User).where(User.id == open_key.admin_user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner admin user inactive",
        )
    return open_key, user


async def increment_quota(open_key_id: int, session: AsyncSession) -> None:
    """原子递增 quota_used，避免并发写冲突。"""
    await session.execute(update(OpenKey).where(OpenKey.id == open_key_id).values(quota_used=OpenKey.quota_used + 1))
    await session.commit()
