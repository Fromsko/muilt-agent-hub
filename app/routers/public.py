"""对外公开的 chat 端点，用平台 API Token (ah_xxx) 认证。

只暴露 token 所属用户的 agent；行为与内部 `/agents/{id}/chat` 一致。
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.platform import current_user_by_api_token
from app.db import get_async_session
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import ChatRequest, MessageRead
from app.services.chat_service import do_chat
from app.services.message_service import list_messages

router = APIRouter()


@router.post("/agents/{agent_id}/chat")
async def public_chat(
    agent_id: int,
    payload: ChatRequest,
    user: User = Depends(current_user_by_api_token),
    session: AsyncSession = Depends(get_async_session),
):
    """通过 `Authorization: Bearer ah_xxx` 调用 Agent。"""
    return await do_chat(agent_id, payload, user, session, channel="public")


@router.get("/agents/{agent_id}/messages", response_model=list[MessageRead])
async def public_list_messages(
    agent_id: int,
    limit: int = 50,
    user: User = Depends(current_user_by_api_token),
    session: AsyncSession = Depends(get_async_session),
) -> list[Message]:
    return await list_messages(agent_id, user.id, session, limit=limit)


@router.get("/me")
async def public_me(user: User = Depends(current_user_by_api_token)) -> dict:
    """便于外部验证 token 是否有效。"""
    return {"id": str(user.id), "email": user.email, "is_active": user.is_active}
