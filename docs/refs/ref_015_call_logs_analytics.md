# ref_015 — 调用统计（call_logs）

> 对应任务：B3 调用统计
> 来源：
> - https://docs.sqlalchemy.org/en/20/orm/events.html（SQLAlchemy ORM Events）
> - FastAPI middleware 官方文档
> - https://docs.litellm.ai/docs/completion/token_usage（LiteLLM token usage）
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. 数据模型

```python
# app/models/call_log.py

from datetime import datetime
import uuid
from sqlmodel import Field, SQLModel


class CallLog(SQLModel, table=True):
    __tablename__ = "call_logs"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    agent_id: int = Field(foreign_key="agents.id", index=True)
    model: str = Field(max_length=100)
    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)
    duration_ms: int = Field(default=0)  # 耗时毫秒
    status: str = Field(max_length=20, default="ok")  # ok | error
    error_message: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

---

## 2. 记录方式选择

### 方案 A：在 chat.py 中手动记录（推荐，简单直接）

```python
# app/routers/chat.py

import time
from app.models.call_log import CallLog

@router.post("/{agent_id}/chat")
async def chat(...):
    start = time.perf_counter()
    status = "ok"
    error_msg = None
    prompt_tokens = 0
    completion_tokens = 0

    try:
        # ... 现有逻辑 ...
        usage = getattr(response, "usage", None)  # 非流式
        if usage:
            prompt_tokens = getattr(usage, "prompt_tokens", 0)
            completion_tokens = getattr(usage, "completion_tokens", 0)
    except Exception as exc:
        status = "error"
        error_msg = str(exc)[:500]
        raise
    finally:
        duration_ms = int((time.perf_counter() - start) * 1000)
        async with async_session_maker() as log_session:
            log_session.add(CallLog(
                user_id=user.id,
                agent_id=agent_id,
                model=agent.model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                duration_ms=duration_ms,
                status=status,
                error_message=error_msg,
            ))
            await log_session.commit()
```

### 方案 B：FastAPI 中间件

```python
# app/middleware/logging.py

import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class CallLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.endswith("/chat"):
            return await call_next(request)

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        # 写日志（需要从 request 中提取信息）
        # 问题：中间件拿不到 user 对象和 token 信息
        return response
```

**推荐方案 A**：中间件难以获取 agent_id / user / token 信息，手动记录更精准。

---

## 3. 统计查询端点

```python
# app/routers/stats.py

from datetime import datetime, timedelta
from sqlalchemy import func, case
from sqlmodel import select

@router.get("/stats")
async def get_stats(
    days: int = 7,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    # 总调用次数
    total_result = await session.execute(
        select(func.count(CallLog.id))
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
    )
    total_calls = total_result.scalar() or 0

    # 成功/失败
    status_result = await session.execute(
        select(
            func.sum(case((CallLog.status == "ok", 1), else_=0)).label("ok"),
            func.sum(case((CallLog.status == "error", 1), else_=0)).label("error"),
        )
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
    )
    row = status_result.one()

    # Token 汇总
    token_result = await session.execute(
        select(
            func.sum(CallLog.prompt_tokens).label("total_prompt"),
            func.sum(CallLog.completion_tokens).label("total_completion"),
            func.avg(CallLog.duration_ms).label("avg_duration"),
        )
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
    )
    tok_row = token_result.one()

    # 按模型分布
    model_result = await session.execute(
        select(CallLog.model, func.count(CallLog.id).label("count"))
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
        .group_by(CallLog.model)
        .order_by(func.count(CallLog.id).desc())
        .limit(10)
    )
    model_dist = [{"model": r[0], "count": r[1]} for r in model_result.all()]

    # Top N Agent
    agent_result = await session.execute(
        select(CallLog.agent_id, func.count(CallLog.id).label("count"))
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
        .group_by(CallLog.agent_id)
        .order_by(func.count(CallLog.id).desc())
        .limit(5)
    )
    top_agents = [{"agent_id": r[0], "count": r[1]} for r in agent_result.all()]

    return {
        "period_days": days,
        "total_calls": total_calls,
        "ok_count": row.ok or 0,
        "error_count": row.error or 0,
        "total_prompt_tokens": tok_row.total_prompt or 0,
        "total_completion_tokens": tok_row.total_completion or 0,
        "avg_duration_ms": int(tok_row.avg_duration or 0),
        "model_distribution": model_dist,
        "top_agents": top_agents,
    }
```

---

## 4. 管理员端点

```python
@router.get("/admin/stats")
async def admin_stats(
    days: int = 30,
    user: User = Depends(current_superuser),  # 管理员权限
    session: AsyncSession = Depends(get_async_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    # 全局统计（不限 user_id）
    total_result = await session.execute(
        select(func.count(CallLog.id)).where(CallLog.created_at >= since)
    )

    # 按用户分布
    user_result = await session.execute(
        select(CallLog.user_id, func.count(CallLog.id).label("count"))
        .where(CallLog.created_at >= since)
        .group_by(CallLog.user_id)
        .order_by(func.count(CallLog.id).desc())
        .limit(10)
    )

    # 活跃用户数
    active_users = await session.execute(
        select(func.count(func.distinct(CallLog.user_id)))
        .where(CallLog.created_at >= since)
    )

    return {
        "total_calls": total_result.scalar() or 0,
        "active_users": active_users.scalar() or 0,
        "top_users": [{"user_id": str(r[0]), "count": r[1]} for r in user_result.all()],
    }
```

---

## 5. SQLAlchemy Event 机制（可选高级方案）

如果需要更细粒度的追踪（如 Message 写入时自动触发），可以用 SQLAlchemy event：

```python
from sqlalchemy import event
from app.models.message import Message

@event.listens_for(Message, "after_insert")
def after_message_insert(mapper, connection, target):
    """Message 写入后触发（可用于实时统计推送）"""
    # 注意：这里拿到的是 connection（非 ORM session）
    # 可以用于写审计日志、触发 WebSocket 推送等
    pass
```

**但对于 call_logs，推荐方案 A 手动记录**，因为需要 chat 上下文中的 timing / token 信息。

---

## 6. 注意事项

| 问题 | 处理方式 |
|---|---|
| 流式模式拿不到 usage | 后端用 `litellm.token_counter()` 自行计算，或在 `[DONE]` 前附带 usage |
| 日志写入失败不影响 chat | 用独立 session + try/except |
| 历史数据膨胀 | 可加定时任务清理 N 天前的记录 |
| SQLite 并发写 | call_logs 写入频率低，问题不大；生产换 PG |
