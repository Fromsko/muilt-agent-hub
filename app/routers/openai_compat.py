"""OpenAI 兼容网关 — /v1/chat/completions & /v1/models

外部系统使用 OpenKey (ok_xxx) 认证，请求/响应格式兼容 OpenAI API。
model 字段使用 "agent-{id}" 映射到内部 Agent。
"""

import json
import re
import time
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.openkey import current_openkey, increment_quota
from app.db import get_async_session
from app.models.agent import Agent
from app.models.open_key import OpenKey
from app.models.user import User
from app.schemas.chat import ChatRequest
from app.services.chat_service import do_chat

router = APIRouter()

_MODEL_PATTERN = re.compile(r"^agent-(\d+)$")


# ---- Request / Response schemas (OpenAI 兼容) ----


class OaiMessage(BaseModel):
    role: str
    content: str


class OaiChatRequest(BaseModel):
    model: str
    messages: list[OaiMessage]
    stream: bool = False
    temperature: float | None = None
    max_tokens: int | None = None


class OaiChoice(BaseModel):
    index: int = 0
    message: OaiMessage
    finish_reason: str = "stop"


class OaiUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class OaiChatResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[OaiChoice]
    usage: OaiUsage


class OaiModel(BaseModel):
    id: str
    object: str = "model"
    created: int = 0
    owned_by: str = "agenthub"


class OaiModelList(BaseModel):
    object: str = "list"
    data: list[OaiModel]


# ---- Helpers ----


def _parse_agent_id(model: str) -> int:
    """从 model 字段解析 agent_id。接受 "agent-123" 或纯数字 "123"。"""
    m = _MODEL_PATTERN.match(model)
    if m:
        return int(m.group(1))
    if model.isdigit():
        return int(model)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid model format: '{model}'. Use 'agent-<id>' or '<id>'.",
    )


# ---- Endpoints ----


@router.post("/chat/completions")
async def chat_completions(
    payload: OaiChatRequest,
    openkey_user: tuple[OpenKey, User] = Depends(current_openkey),
    session: AsyncSession = Depends(get_async_session),
):
    open_key, user = openkey_user
    agent_id = _parse_agent_id(payload.model)

    if open_key.allowed_agent_ids and agent_id not in open_key.allowed_agent_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Agent {agent_id} is not allowed for this OpenKey",
        )

    result = await session.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id} not found",
        )

    user_message = ""
    for msg in reversed(payload.messages):
        if msg.role == "user":
            user_message = msg.content
            break
    if not user_message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No user message found in messages array",
        )

    chat_req = ChatRequest(
        message=user_message,
        stream=payload.stream,
        max_turns=20,
    )

    try:
        chat_result = await do_chat(agent_id, chat_req, user, session, channel="openkey")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Model call failed: {type(exc).__name__}: {exc}",
        ) from exc

    await increment_quota(open_key.id, session)

    if isinstance(chat_result, StreamingResponse):
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"

        async def _openai_sse() -> AsyncGenerator[str, None]:
            async for chunk_bytes in chat_result.body_iterator:
                chunk_str = chunk_bytes if isinstance(chunk_bytes, str) else chunk_bytes.decode()
                for line in chunk_str.split("\n"):
                    line = line.strip()
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        yield "data: [DONE]\n\n"
                        return
                    try:
                        obj = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if "error" in obj:
                        yield f"data: {json.dumps({'error': obj['error']})}\n\n"
                        yield "data: [DONE]\n\n"
                        return
                    delta_content = obj.get("delta", "")
                    oai_chunk = {
                        "id": completion_id,
                        "object": "chat.completion.chunk",
                        "created": int(time.time()),
                        "model": payload.model,
                        "choices": [
                            {
                                "index": 0,
                                "delta": {"content": delta_content} if delta_content else {},
                                "finish_reason": None,
                            }
                        ],
                    }
                    yield f"data: {json.dumps(oai_chunk)}\n\n"
            stop_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": payload.model,
                "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
            }
            yield f"data: {json.dumps(stop_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(_openai_sse(), media_type="text/event-stream")

    return OaiChatResponse(
        id=f"chatcmpl-{uuid.uuid4().hex[:12]}",
        created=int(time.time()),
        model=payload.model,
        choices=[
            OaiChoice(
                message=OaiMessage(role="assistant", content=chat_result.reply),
            )
        ],
        usage=OaiUsage(
            prompt_tokens=chat_result.prompt_tokens or 0,
            completion_tokens=chat_result.completion_tokens or 0,
            total_tokens=(chat_result.prompt_tokens or 0) + (chat_result.completion_tokens or 0),
        ),
    )


@router.get("/models", response_model=OaiModelList)
async def list_models(
    openkey_user: tuple[OpenKey, User] = Depends(current_openkey),
    session: AsyncSession = Depends(get_async_session),
) -> OaiModelList:
    open_key, user = openkey_user

    query = select(Agent).where(Agent.user_id == user.id)
    if open_key.allowed_agent_ids:
        query = query.where(Agent.id.in_(open_key.allowed_agent_ids))
    query = query.order_by(Agent.id.asc())

    result = await session.execute(query)
    agents = result.scalars().all()

    return OaiModelList(data=[OaiModel(id=f"agent-{a.id}", created=int(a.created_at.timestamp())) for a in agents])
