"""OpenKey 请求/响应 Schema。"""

from datetime import datetime

from pydantic import BaseModel, Field


class OpenKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    allowed_agent_ids: list[int] = Field(default_factory=list)
    rate_limit_per_minute: int | None = Field(default=None, ge=1)
    quota_total: int | None = Field(default=None, ge=1)
    expires_at: datetime | None = None


class OpenKeyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    enabled: bool | None = None
    allowed_agent_ids: list[int] | None = None
    rate_limit_per_minute: int | None = Field(default=None, ge=1)
    quota_total: int | None = Field(default=None, ge=1)
    expires_at: datetime | None = None


class OpenKeyRead(BaseModel):
    id: int
    name: str
    prefix: str
    tail: str
    enabled: bool
    allowed_agent_ids: list[int]
    rate_limit_per_minute: int | None
    quota_total: int | None
    quota_used: int
    expires_at: datetime | None
    created_at: datetime
    last_used_at: datetime | None


class OpenKeyReadWithSecret(OpenKeyRead):
    """仅在创建成功时返回，明文 key 只出现这一次。"""

    key: str


class OpenKeyUsage(BaseModel):
    open_key_id: int
    quota_total: int | None
    quota_used: int
    recent_calls: int
