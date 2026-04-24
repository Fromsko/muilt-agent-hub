"""Prompt request/response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class PromptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)


class PromptUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)


class PromptRead(BaseModel):
    id: int
    name: str
    content: str
    created_at: datetime
    updated_at: datetime
