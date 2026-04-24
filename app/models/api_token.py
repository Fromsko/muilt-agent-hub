"""平台级 API Token —— 供外部系统调用 /public 路由使用。

- 原始 token 只在创建时返回一次，DB 只存 SHA-256 hash。
- `prefix` 字段冗余存储便于筛选和脱敏展示。
"""

import uuid
from datetime import datetime, UTC

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ApiToken(SQLModel, table=True):
    __tablename__ = "api_tokens"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    prefix: str = Field(max_length=16, nullable=False, default="ah_")
    tail: str = Field(max_length=8, nullable=False, default="")
    token_hash: str = Field(nullable=False, unique=True, index=True)
    enabled: bool = Field(default=True, nullable=False)
    expires_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    last_used_at: datetime | None = Field(default=None)
