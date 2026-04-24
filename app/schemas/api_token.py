"""API Token 的请求/响应 schema。"""

from datetime import datetime

from pydantic import BaseModel, Field


class ApiTokenCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    expires_at: datetime | None = None


class ApiTokenRead(BaseModel):
    id: int
    name: str
    prefix: str
    tail: str
    enabled: bool
    expires_at: datetime | None
    created_at: datetime
    last_used_at: datetime | None


class ApiTokenReadWithSecret(ApiTokenRead):
    """仅在创建成功时返回，明文 token 只出现这一次。"""

    token: str
