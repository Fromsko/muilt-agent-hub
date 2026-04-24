"""Agent CRUD endpoints."""

from datetime import datetime, UTC

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.agent import Agent
from app.models.key import Key
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentRead, AgentUpdate
from app.services.ownership import ensure_owned

router = APIRouter()


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED)
async def create_agent(
    payload: AgentCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> Agent:
    await ensure_owned(Prompt, payload.prompt_id, user.id, session, label="Prompt")
    await ensure_owned(Key, payload.key_id, user.id, session, label="Key")
    agent = Agent(user_id=user.id, **payload.model_dump())
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.get("", response_model=list[AgentRead])
async def list_agents(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[Agent]:
    result = await session.execute(select(Agent).where(Agent.user_id == user.id).order_by(Agent.id.desc()))
    return list(result.scalars().all())


@router.get("/{agent_id}", response_model=AgentRead)
async def get_agent(
    agent_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> Agent:
    return await ensure_owned(Agent, agent_id, user.id, session, label="Agent")


@router.patch("/{agent_id}", response_model=AgentRead)
async def update_agent(
    agent_id: int,
    payload: AgentUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> Agent:
    agent = await ensure_owned(Agent, agent_id, user.id, session, label="Agent")
    data = payload.model_dump(exclude_unset=True)
    if "prompt_id" in data:
        await ensure_owned(Prompt, data["prompt_id"], user.id, session, label="Prompt")
    if "key_id" in data:
        await ensure_owned(Key, data["key_id"], user.id, session, label="Key")
    for field, value in data.items():
        setattr(agent, field, value)
    agent.updated_at = datetime.now(UTC)
    session.add(agent)
    await session.commit()
    await session.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    agent = await ensure_owned(Agent, agent_id, user.id, session, label="Agent")
    await session.delete(agent)
    await session.commit()
