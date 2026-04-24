"""Shared message listing logic used by both internal (JWT) and public (API Token) routes."""

from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import NotFoundError
from app.models.agent import Agent
from app.models.message import Message


async def list_messages(
    agent_id: int,
    user_id: uuid.UUID,
    session: AsyncSession,
    *,
    limit: int = 50,
) -> list[Message]:
    """Return recent messages for *agent_id* owned by *user_id*.

    Raises ``NotFoundError`` if the agent does not exist or is not owned.
    """
    result = await session.execute(select(Agent.id).where(Agent.id == agent_id, Agent.user_id == user_id))
    if result.scalar_one_or_none() is None:
        raise NotFoundError("Agent not found")

    result = await session.execute(
        select(Message).where(Message.agent_id == agent_id).order_by(Message.id.desc()).limit(limit)
    )
    return list(result.scalars().all())
