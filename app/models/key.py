"""Model API key storage - encrypted at rest via Fernet."""

import uuid
from datetime import datetime, UTC

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Key(SQLModel, table=True):
    __tablename__ = "keys"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    provider: str = Field(max_length=50, nullable=False)  # openai / anthropic / deepseek / ...
    api_key_encrypted: str = Field(nullable=False)
    api_base: str | None = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
