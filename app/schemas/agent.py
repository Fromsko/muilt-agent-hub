"""Agent request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    prompt_id: int
    key_id: int
    model: str = Field(
        min_length=1,
        max_length=100,
        description="LiteLLM model identifier, e.g. 'gpt-4o-mini'",
    )
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=32000)


class AgentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    prompt_id: int | None = None
    key_id: int | None = None
    model: str | None = Field(default=None, min_length=1, max_length=100)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1, le=32000)


class AgentRead(BaseModel):
    id: int
    name: str
    description: str | None
    prompt_id: int
    key_id: int
    model: str
    temperature: float
    max_tokens: int
    created_at: datetime
    updated_at: datetime
