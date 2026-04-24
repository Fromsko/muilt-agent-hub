"""Chat request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    stream: bool = True
    max_turns: int = Field(
        default=20,
        ge=0,
        le=100,
        description="保留的最大历史轮数（1 轮 = 1 user + 1 assistant）。0 关闭历史。",
    )


class ChatResponse(BaseModel):
    """Non-streaming response."""

    agent_id: int
    reply: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None


class MessageRead(BaseModel):
    id: int
    agent_id: int
    role: str
    content: str
    created_at: datetime
