"""Agent model - composition of a prompt + key + model config."""

import uuid
from datetime import datetime, UTC
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.key import Key
    from app.models.message import Message
    from app.models.prompt import Prompt


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Agent(SQLModel, table=True):
    __tablename__ = "agents"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    description: str | None = Field(default=None, max_length=1000)
    prompt_id: int = Field(foreign_key="prompts.id", nullable=False)
    key_id: int = Field(foreign_key="keys.id", nullable=False)
    model: str = Field(max_length=100, nullable=False)  # litellm model name, e.g. "gpt-4o-mini"
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=2048)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)

    prompt: Optional["Prompt"] = Relationship(
        sa_relationship_kwargs={"lazy": "noload", "foreign_keys": "[Agent.prompt_id]"}
    )
    key: Optional["Key"] = Relationship(sa_relationship_kwargs={"lazy": "noload", "foreign_keys": "[Agent.key_id]"})
    messages: list["Message"] = Relationship(
        back_populates="agent",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "lazy": "noload"},
    )
