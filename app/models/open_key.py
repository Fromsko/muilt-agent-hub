"""OpenKey — 管理员向外部用户分发的 API Key，用于 OpenAI 兼容网关。

与 ApiToken（用户自管、ah_ 前缀）独立：
- 前缀 ok_，DB 只存 SHA-256 hash
- 绑定可调用的 Agent 列表 + 调用限额
- 仅管理员可创建 / 管理
"""

import uuid
from datetime import datetime, UTC

from sqlalchemy import Column
from sqlalchemy.types import JSON
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class OpenKey(SQLModel, table=True):
    __tablename__ = "open_keys"

    id: int | None = Field(default=None, primary_key=True)
    admin_user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    prefix: str = Field(max_length=16, nullable=False, default="ok_")
    tail: str = Field(max_length=8, nullable=False, default="")
    key_hash: str = Field(nullable=False, unique=True, index=True)
    enabled: bool = Field(default=True, nullable=False)

    allowed_agent_ids: list[int] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False, server_default="[]"),
    )

    rate_limit_per_minute: int | None = Field(default=None)
    quota_total: int | None = Field(default=None)
    quota_used: int = Field(default=0, nullable=False)

    expires_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    last_used_at: datetime | None = Field(default=None)
