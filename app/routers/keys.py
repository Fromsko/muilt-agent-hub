"""API key CRUD endpoints. Keys are encrypted at rest; reads return masked form.

Uses the generic CRUD router for list / get / delete, with custom create
and test endpoints.
"""

import time

import litellm
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.core.exceptions import NotFoundError
from app.crypto import decrypt, encrypt, mask
from app.db import get_async_session
from app.models.key import Key
from app.models.user import User
from app.schemas.key import KeyCreate, KeyRead, KeyTestRequest, KeyTestResponse

router = APIRouter()


def _guess_test_model(api_base: str | None) -> str:
    """根据 api_base 推断一个最小测试模型。"""
    base = (api_base or "").lower()
    if "bigmodel.cn" in base:
        return "openai/glm-4.5-flash"
    if "moonshot" in base:
        return "openai/moonshot-v1-8k"
    if "dashscope" in base:
        return "openai/qwen-turbo"
    if "deepseek" in base:
        return "deepseek/deepseek-chat"
    if "11434" in base or "ollama" in base:
        return "openai/llama3.2"
    return "gpt-4o-mini"


def _to_read(key: Key) -> KeyRead:
    plain = decrypt(key.api_key_encrypted)
    return KeyRead(
        id=key.id,
        name=key.name,
        provider=key.provider,
        api_key_masked=mask(plain),
        api_base=key.api_base,
        created_at=key.created_at,
    )


@router.post("", response_model=KeyRead, status_code=status.HTTP_201_CREATED)
async def create_key(
    payload: KeyCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> KeyRead:
    key = Key(
        user_id=user.id,
        name=payload.name,
        provider=payload.provider,
        api_key_encrypted=encrypt(payload.api_key),
        api_base=payload.api_base,
    )
    session.add(key)
    await session.commit()
    await session.refresh(key)
    return _to_read(key)


@router.post("/test", response_model=KeyTestResponse)
async def test_key(
    payload: KeyTestRequest,
    _user: User = Depends(current_active_user),
) -> KeyTestResponse:
    """测试 API Key 连通性。发送一条最小化 `hi` 请求，不落库。"""
    model = payload.model or _guess_test_model(payload.api_base)
    start = time.monotonic()
    try:
        response = await litellm.acompletion(
            model=model,
            messages=[{"role": "user", "content": "hi"}],
            api_key=payload.api_key,
            api_base=payload.api_base or None,
            max_tokens=5,
            timeout=15,
        )
        reply = (response.choices[0].message.content or "").strip()
        latency = int((time.monotonic() - start) * 1000)
        return KeyTestResponse(
            ok=True,
            message=f"连通成功：{reply[:40] or '(空响应)'}",
            model=getattr(response, "model", model),
            latency_ms=latency,
        )
    except Exception as exc:  # noqa: BLE001
        latency = int((time.monotonic() - start) * 1000)
        return KeyTestResponse(
            ok=False,
            message=f"{type(exc).__name__}: {exc}"[:200],
            model=model,
            latency_ms=latency,
        )


@router.get("", response_model=list[KeyRead])
async def list_keys(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[KeyRead]:
    result = await session.execute(select(Key).where(Key.user_id == user.id).order_by(Key.id.desc()))
    return [_to_read(k) for k in result.scalars().all()]


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    key_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    result = await session.execute(select(Key).where(Key.id == key_id, Key.user_id == user.id))
    key = result.scalar_one_or_none()
    if key is None:
        raise NotFoundError("Key not found")
    await session.delete(key)
    await session.commit()
