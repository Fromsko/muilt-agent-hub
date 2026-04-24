"""内部 chat 端点（JWT 认证）。核心逻辑已抽到 `app.services.chat_service`。"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ChatRequest, MessageRead
from app.services.chat_service import do_chat
from app.services.message_service import list_messages as _list_messages

router = APIRouter()


@router.post("/{agent_id}/chat")
async def chat(
    agent_id: int,
    payload: ChatRequest,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    return await do_chat(agent_id, payload, user, session)


@router.get("/{agent_id}/messages", response_model=list[MessageRead])
async def list_messages(
    agent_id: int,
    limit: int = 50,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[Message]:
    return await _list_messages(agent_id, user.id, session, limit=limit)
