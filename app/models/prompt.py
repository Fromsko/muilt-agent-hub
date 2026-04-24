"""Prompt model - stores reusable system prompt templates owned by a user."""

import uuid
from datetime import datetime, UTC

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Prompt(SQLModel, table=True):
    __tablename__ = "prompts"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    content: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)
