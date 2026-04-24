"""应用日志查询路由：`/api/v1/logs`。

提供查询 + 按级别分组统计，配合前端「日志」页做实时展示。
访问权限：任何已登录用户可查（demo 场景；生产可改为 superuser_only）。
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import case, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.app_log import AppLog
from app.models.user import User

router = APIRouter()


LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")


class LogItem(BaseModel):
    """日志条目对外结构。"""

    id: int
    ts: datetime
    level: str
    logger: str
    message: str
    source: str | None
    user_id: str | None
    trace_id: str | None
    exc_text: str | None
    extra: dict[str, Any] | None


class LogStats(BaseModel):
    """按级别的计数 + 最新 id（给前端做长轮询游标）。"""

    total: int
    by_level: dict[str, int]
    latest_id: int | None


def _to_item(row: AppLog) -> LogItem:
    extra: dict[str, Any] | None = None
    if row.extra_json:
        try:
            extra = json.loads(row.extra_json)
        except Exception:  # noqa: BLE001
            extra = {"_raw": row.extra_json}
    return LogItem(
        id=row.id or 0,
        ts=row.ts,
        level=row.level,
        logger=row.logger,
        message=row.message,
        source=row.source,
        user_id=str(row.user_id) if row.user_id else None,
        trace_id=row.trace_id,
        exc_text=row.exc_text,
        extra=extra,
    )


@router.get("", response_model=list[LogItem])
async def list_logs(
    _user: User = Depends(current_active_user),
    level: str | None = Query(default=None, description="DEBUG/INFO/WARNING/ERROR/CRITICAL"),
    logger: str | None = Query(default=None, description="按 logger 前缀过滤，如 app.chat"),
    search: str | None = Query(default=None, description="message / logger / trace_id 模糊搜索"),
    since_id: int | None = Query(default=None, description="只返回 id 大于该值的日志，长轮询用"),
    limit: int = Query(default=100, ge=1, le=500),
    session: AsyncSession = Depends(get_async_session),
) -> list[LogItem]:
    """查询最近的应用日志。

    - 默认按 id 倒序取 `limit` 条，但返回时正序（老 → 新），方便前端直接 append
    - `since_id` 用于长轮询增量拉取
    """
    stmt = select(AppLog).order_by(desc(AppLog.id)).limit(limit)
    if level and level.upper() in LEVELS:
        stmt = stmt.where(AppLog.level == level.upper())
    if logger:
        stmt = stmt.where(AppLog.logger.like(f"{logger}%"))
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                AppLog.message.ilike(pattern),
                AppLog.logger.ilike(pattern),
                AppLog.trace_id.ilike(pattern),
            )
        )
    if since_id:
        stmt = stmt.where(AppLog.id > since_id)

    rows = (await session.execute(stmt)).scalars().all()
    # 返回时正序（旧 → 新），和前端 append 顺序一致
    return [_to_item(r) for r in reversed(rows)]


@router.get("/stats", response_model=LogStats)
async def log_stats(
    _user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> LogStats:
    """当前 `app_logs` 表的总量 / 各级别计数 / 最新 id。"""
    level_expr = {lvl: func.sum(case((AppLog.level == lvl, 1), else_=0)).label(lvl) for lvl in LEVELS}
    row = (
        await session.execute(
            select(
                func.count().label("total"),
                func.max(AppLog.id).label("latest"),
                *level_expr.values(),
            )
        )
    ).one()
    total = int(row.total or 0)
    latest = int(row.latest) if row.latest is not None else None
    by_level: dict[str, int] = {}
    for lvl in LEVELS:
        raw = getattr(row, lvl, 0) or 0
        by_level[lvl] = int(raw)
    return LogStats(total=total, by_level=by_level, latest_id=latest)
