"""Message model - stores chat exchanges bound to an agent."""

from datetime import datetime, UTC
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from app.models.agent import Agent


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: int | None = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agents.id", index=True, nullable=False)
    role: str = Field(max_length=20, nullable=False)  # "user" | "assistant"
    content: str = Field(nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)

    agent: Optional["Agent"] = Relationship(
        back_populates="messages",
        sa_relationship_kwargs={"lazy": "noload"},
    )
