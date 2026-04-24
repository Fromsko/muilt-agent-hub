"""Key request/response schemas. API key is write-only; read returns masked."""

from datetime import datetime

from pydantic import BaseModel, Field


class KeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    provider: str = Field(
        min_length=1,
        max_length=50,
        description="openai | anthropic | deepseek | gemini | ...",
    )
    api_key: str = Field(min_length=1, description="Plain API key, will be encrypted at rest")
    api_base: str | None = Field(default=None, max_length=500)


class KeyRead(BaseModel):
    id: int
    name: str
    provider: str
    api_key_masked: str
    api_base: str | None
    created_at: datetime


class KeyTestRequest(BaseModel):
    """测试 Key 连通性，表单尚未提交也可以发起（不落库）。"""

    api_key: str = Field(min_length=1)
    api_base: str | None = None
    model: str | None = Field(default=None, description="留空则根据 api_base 自动推断一个最小模型")


class KeyTestResponse(BaseModel):
    ok: bool
    message: str
    model: str | None = None
    latency_ms: int | None = None
