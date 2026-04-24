"""结构化应用日志表。

- 仅持久 `app.*` 命名空间的 `INFO` 以上级别，过滤框架噪音。
- 落库走异步队列 + 后台消费者，`logging.Handler.emit` 保持非阻塞。
- `trace_id` / `user_id` 通过 ContextVar 在请求中间件里注入。
"""

import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class AppLog(SQLModel, table=True):
    __tablename__ = "app_logs"

    id: int | None = Field(default=None, primary_key=True)
    ts: datetime = Field(nullable=False, index=True)
    level: str = Field(max_length=16, nullable=False, index=True)
    logger: str = Field(max_length=128, nullable=False, index=True)
    message: str = Field(nullable=False)
    source: str | None = Field(default=None, max_length=256)
    user_id: uuid.UUID | None = Field(default=None, index=True, nullable=True)
    trace_id: str | None = Field(default=None, max_length=64, index=True)
    exc_text: str | None = Field(default=None)
    extra_json: str | None = Field(default=None)
