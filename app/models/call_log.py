"""每次 chat 调用的审计/统计记录。

- 内部（JWT）与外部（API Token）共用 `chat_service.do_chat`，都会写入。
- `duration_ms` / `prompt_tokens` / `completion_tokens` / `status` / `error` 覆盖成功与失败场景。
- 轻量级索引 `(user_id, created_at)` 以支撑按天聚合查询。
"""

import uuid
from datetime import datetime, UTC
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.agent import Agent


def _utcnow() -> datetime:
    return datetime.now(UTC)


class CallLog(SQLModel, table=True):
    __tablename__ = "call_logs"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    agent_id: int | None = Field(default=None, foreign_key="agents.id", index=True)
    model: str = Field(max_length=120, nullable=False)
    channel: str = Field(max_length=16, default="internal", nullable=False)  # internal / public
    stream: bool = Field(default=True, nullable=False)
    duration_ms: int = Field(default=0, nullable=False)
    prompt_tokens: int | None = Field(default=None)
    completion_tokens: int | None = Field(default=None)
    status: str = Field(max_length=16, default="success", nullable=False)  # success / error
    open_key_id: int | None = Field(default=None, foreign_key="open_keys.id", index=True)
    error: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False, index=True)

    agent: Optional["Agent"] = Relationship(
        sa_relationship_kwargs={"lazy": "noload", "foreign_keys": "[CallLog.agent_id]"}
    )
