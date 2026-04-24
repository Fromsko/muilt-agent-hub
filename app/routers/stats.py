"""统计汇总端点，用于仪表盘。"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.agent import Agent
from app.models.call_log import CallLog
from app.models.key import Key
from app.models.message import Message
from app.models.prompt import Prompt
from app.models.user import User

router = APIRouter()


class RecentMessage(BaseModel):
    id: int
    agent_id: int
    role: str
    content_preview: str
    created_at: datetime


class StatsResponse(BaseModel):
    prompt_count: int
    key_count: int
    agent_count: int
    message_count: int
    recent_messages: list[RecentMessage]


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> StatsResponse:
    """返回当前用户的资源计数 + 最近 5 条消息预览。"""
    prompt_count = (await session.execute(select(func.count(Prompt.id)).where(Prompt.user_id == user.id))).scalar() or 0

    key_count = (await session.execute(select(func.count(Key.id)).where(Key.user_id == user.id))).scalar() or 0

    agent_count = (await session.execute(select(func.count(Agent.id)).where(Agent.user_id == user.id))).scalar() or 0

    message_count = (
        await session.execute(
            select(func.count(Message.id)).join(Agent, Agent.id == Message.agent_id).where(Agent.user_id == user.id)
        )
    ).scalar() or 0

    recent_result = await session.execute(
        select(Message)
        .join(Agent, Agent.id == Message.agent_id)
        .where(Agent.user_id == user.id)
        .order_by(Message.id.desc())
        .limit(5)
    )
    recent_messages = [
        RecentMessage(
            id=m.id,
            agent_id=m.agent_id,
            role=m.role,
            content_preview=m.content[:80],
            created_at=m.created_at,
        )
        for m in recent_result.scalars().all()
    ]

    return StatsResponse(
        prompt_count=prompt_count,
        key_count=key_count,
        agent_count=agent_count,
        message_count=message_count,
        recent_messages=recent_messages,
    )


class DailyStatsItem(BaseModel):
    day: str  # "YYYY-MM-DD"
    calls: int
    prompt_tokens: int
    completion_tokens: int
    avg_duration_ms: int
    error_count: int


@router.get("/stats/daily", response_model=list[DailyStatsItem])
async def get_daily_stats(
    days: int = Query(default=7, ge=1, le=90),
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[DailyStatsItem]:
    """最近 N 天按天聚合当前用户的 chat 调用。

    - 空白天用 0 填充，前端可以直接画折线图。
    - `call_logs` 为空时仍返回 N 条 0 记录，避免前端判空。
    """
    # 使用 datetime 过滤（不做 DB 端 Date 投影），day 维度在 Python 聚合。
    # 这样对 SQLite（`created_at` 是 TEXT + 微秒）和 Postgres 一视同仁。
    today = datetime.now(datetime.UTC).date()
    since_date = today - timedelta(days=days - 1)
    since_dt = datetime.combine(since_date, datetime.min.time())

    result = await session.execute(
        select(
            CallLog.created_at,
            CallLog.prompt_tokens,
            CallLog.completion_tokens,
            CallLog.duration_ms,
            CallLog.status,
        ).where(
            CallLog.user_id == user.id,
            CallLog.created_at >= since_dt,
        )
    )

    agg: dict[str, dict] = {}
    for row in result.all():
        created_at, pt, ct, dur, st = row
        day_key = created_at.date().isoformat()
        bucket = agg.setdefault(
            day_key,
            {"calls": 0, "pt": 0, "ct": 0, "dur_sum": 0, "errors": 0},
        )
        bucket["calls"] += 1
        bucket["pt"] += int(pt or 0)
        bucket["ct"] += int(ct or 0)
        bucket["dur_sum"] += int(dur or 0)
        if st == "error":
            bucket["errors"] += 1

    out: list[DailyStatsItem] = []
    for i in range(days):
        d = since_date + timedelta(days=i)
        key = d.isoformat()
        if key in agg:
            bucket = agg[key]
            out.append(
                DailyStatsItem(
                    day=key,
                    calls=bucket["calls"],
                    prompt_tokens=bucket["pt"],
                    completion_tokens=bucket["ct"],
                    avg_duration_ms=int(bucket["dur_sum"] / bucket["calls"]) if bucket["calls"] > 0 else 0,
                    error_count=bucket["errors"],
                )
            )
        else:
            out.append(
                DailyStatsItem(
                    day=key,
                    calls=0,
                    prompt_tokens=0,
                    completion_tokens=0,
                    avg_duration_ms=0,
                    error_count=0,
                )
            )
    return out
