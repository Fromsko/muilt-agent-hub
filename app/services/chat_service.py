"""Chat 核心逻辑 —— 被内部 (`/agents/{id}/chat`) 与对外 (`/public/...`) 两个路由共用。"""

import json
import logging
import time
import uuid
from collections.abc import AsyncGenerator

from fastapi.responses import StreamingResponse
from litellm import acompletion
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import ExternalServiceError, NotFoundError
from app.core.logging import current_user_id
from app.crypto import decrypt
from app.db import async_session_maker
from app.models.agent import Agent
from app.models.call_log import CallLog
from app.models.key import Key
from app.models.mcp_server import AgentTool, McpServer
from app.models.message import Message
from app.models.prompt import Prompt
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.mcp_manager import call_tool, discover_tools, to_litellm_tools

log = logging.getLogger("app.chat")
MAX_TOOL_ROUNDS = 5
MAX_LLM_RETRIES = 3

_RETRYABLE_ERRORS = (
    "Timeout",
    "APIError",
    "RateLimitError",
    "ServiceUnavailableError",
    "APIConnectionError",
    "InternalServerError",
)
_NON_RETRYABLE_ERRORS = (
    "AuthenticationError",
    "BadRequestError",
    "NotFoundError",
)


async def _acompletion_with_retry(*, max_retries: int = MAX_LLM_RETRIES, **kwargs):
    """Wrap ``litellm.acompletion`` with exponential back-off retry.

    Retries on transient failures (timeout, rate-limit, 5xx).  Authentication
    and bad-request errors propagate immediately.
    """
    import asyncio

    last_exc: Exception | None = None
    for attempt in range(max_retries + 1):
        try:
            return await acompletion(**kwargs)
        except Exception as exc:  # noqa: BLE001
            exc_name = type(exc).__name__
            if any(n in exc_name for n in _NON_RETRYABLE_ERRORS):
                raise
            last_exc = exc
            if attempt < max_retries:
                wait = min(2**attempt, 30)
                if "RateLimit" in exc_name:
                    wait = min(wait * 4, 60)
                log.warning(
                    "LLM call failed (attempt %d/%d), retrying in %ds: %s",
                    attempt + 1,
                    max_retries + 1,
                    wait,
                    f"{exc_name}: {exc}"[:200],
                )
                await asyncio.sleep(wait)
    raise last_exc  # type: ignore[misc]


async def load_agent_context(agent_id: int, user: User, session: AsyncSession) -> tuple[Agent, Prompt, Key]:
    result = await session.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    agent = result.scalar_one_or_none()
    if agent is None:
        raise NotFoundError("Agent not found")

    prompt = (await session.execute(select(Prompt).where(Prompt.id == agent.prompt_id))).scalar_one_or_none()
    key = (await session.execute(select(Key).where(Key.id == agent.key_id))).scalar_one_or_none()
    if prompt is None or key is None:
        raise ExternalServiceError("Agent references missing prompt or key")
    return agent, prompt, key


async def get_recent_messages(session: AsyncSession, agent_id: int, limit: int) -> list[Message]:
    result = await session.execute(
        select(Message).where(Message.agent_id == agent_id).order_by(Message.id.desc()).limit(limit)
    )
    return list(reversed(result.scalars().all()))


def build_messages(
    system_content: str,
    history: list[Message],
    user_message: str,
    max_turns: int = 20,
) -> list[dict]:
    msgs: list[dict] = [{"role": "system", "content": system_content}]
    recent = history[-(max_turns * 2) :] if max_turns > 0 else []
    for m in recent:
        msgs.append({"role": m.role, "content": m.content})
    msgs.append({"role": "user", "content": user_message})
    return msgs


def common_kwargs(agent: Agent, key: Key) -> dict:
    kwargs: dict = {
        "model": agent.model,
        "api_key": decrypt(key.api_key_encrypted),
        "temperature": agent.temperature,
        "max_tokens": agent.max_tokens,
    }
    if key.api_base:
        kwargs["api_base"] = key.api_base
    return kwargs


async def persist_exchange(agent_id: int, user_msg: str, assistant_msg: str) -> None:
    async with async_session_maker() as session:
        session.add(Message(agent_id=agent_id, role="user", content=user_msg))
        session.add(Message(agent_id=agent_id, role="assistant", content=assistant_msg))
        await session.commit()


async def persist_call_log(
    *,
    user_id: uuid.UUID,
    agent_id: int,
    model: str,
    channel: str,
    stream: bool,
    duration_ms: int,
    prompt_tokens: int | None,
    completion_tokens: int | None,
    status_: str,
    error: str | None,
    open_key_id: int | None = None,
) -> None:
    """统计埋点 —— 失败不影响主流程。"""
    try:
        async with async_session_maker() as session:
            session.add(
                CallLog(
                    user_id=user_id,
                    agent_id=agent_id,
                    model=model,
                    channel=channel,
                    stream=stream,
                    duration_ms=duration_ms,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    status=status_,
                    error=(error or None),
                    open_key_id=open_key_id,
                )
            )
            await session.commit()
    except Exception:  # noqa: BLE001
        pass


async def load_agent_tools(agent_id: int, user_id: uuid.UUID, session: AsyncSession) -> list[McpServer]:
    """返回 Agent 当前绑定且启用的 MCP server 列表（按 id 升序）。"""
    result = await session.execute(
        select(McpServer)
        .join(AgentTool, AgentTool.mcp_server_id == McpServer.id)
        .where(
            AgentTool.agent_id == agent_id,
            McpServer.user_id == user_id,
            McpServer.enabled == True,  # noqa: E712
        )
        .order_by(McpServer.id.asc())
    )
    return list(result.scalars().all())


async def collect_litellm_tools(
    mcp_servers: list[McpServer],
) -> tuple[list[dict], dict[str, McpServer]]:
    """并发 discover 所有 server 的工具并合并。

    返回 `(litellm_tools, name_to_server)`：LLM 报 `tool_call.function.name`
    时用 name_to_server[name] 找回对应的 McpServer。
    """
    name_to_server: dict[str, McpServer] = {}
    all_tools: list[dict] = []
    for mcp in mcp_servers:
        try:
            ts = await discover_tools(mcp)
        except Exception:  # noqa: BLE001
            continue  # 失败的 server 忽略，不影响其它
        for t in ts:
            name = t["name"]
            # 名字冲突时后者覆盖（极少见，先简单处理）
            name_to_server[name] = mcp
            all_tools.append(t)
    return to_litellm_tools(all_tools), name_to_server


async def run_tool_loop(
    messages: list[dict],
    kwargs: dict,
    litellm_tools: list[dict],
    name_to_server: dict[str, McpServer],
) -> tuple[str, int | None, int | None, list[dict]]:
    """按 OpenAI tool-call 协议循环调用模型 + MCP 工具，直到模型不再请求工具。

    返回 `(final_reply, prompt_tokens, completion_tokens, tool_events)`。
    `tool_events` 是一个 `{name, args, result, error}` 列表，供日志/前端展示。
    """
    total_pt: int | None = None
    total_ct: int | None = None
    tool_events: list[dict] = []

    for _ in range(MAX_TOOL_ROUNDS):
        response = await _acompletion_with_retry(
            messages=messages,
            stream=False,
            tools=litellm_tools,
            tool_choice="auto",
            **kwargs,
        )
        msg = response.choices[0].message
        usage = getattr(response, "usage", None)
        if usage:
            pt = getattr(usage, "prompt_tokens", 0) or 0
            ct = getattr(usage, "completion_tokens", 0) or 0
            total_pt = (total_pt or 0) + int(pt)
            total_ct = (total_ct or 0) + int(ct)

        tool_calls = getattr(msg, "tool_calls", None) or []

        if not tool_calls:
            return (msg.content or "", total_pt, total_ct, tool_events)

        # 把 assistant 回复（含 tool_calls）加入对话，然后逐个执行
        messages.append(
            {
                "role": "assistant",
                "content": msg.content or "",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ],
            }
        )
        for tc in tool_calls:
            name = tc.function.name
            try:
                args = json.loads(tc.function.arguments or "{}")
            except json.JSONDecodeError:
                args = {}
            server = name_to_server.get(name)
            event: dict = {"name": name, "args": args}
            if server is None:
                err = f"no MCP server bound for tool `{name}`"
                event["error"] = err
                tool_events.append(event)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": name,
                        "content": json.dumps({"error": err}),
                    }
                )
                continue
            try:
                result_text = await call_tool(server, name, args)
                event["result"] = result_text[:500]
                log.info(
                    "tool call ok: %s(%s) -> %s",
                    name,
                    args,
                    result_text[:120],
                    extra={
                        "tool_name": name,
                        "tool_args": args,
                        "mcp_server_id": server.id,
                    },
                )
            except Exception as exc:  # noqa: BLE001
                err = f"{type(exc).__name__}: {exc}"[:500]
                event["error"] = err
                result_text = json.dumps({"error": err})
                log.warning(
                    "tool call failed: %s(%s) -> %s",
                    name,
                    args,
                    err,
                    extra={
                        "tool_name": name,
                        "tool_args": args,
                        "mcp_server_id": server.id,
                    },
                )
            tool_events.append(event)
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": name,
                    "content": result_text,
                }
            )

    # 用光轮次仍未收敛，把最后一条 assistant 的内容（可能为空）返回
    return (
        "（已达到工具调用轮次上限，最终回复截断）",
        total_pt,
        total_ct,
        tool_events,
    )


async def do_chat(
    agent_id: int,
    payload: ChatRequest,
    user: User,
    session: AsyncSession,
    *,
    channel: str = "internal",
) -> StreamingResponse | ChatResponse:
    """被内部 / 对外两条路由共用的核心 chat 执行逻辑。

    `channel` 用于埋点记录是 `internal`(JWT) 还是 `public`(API Token)。
    """
    # 把当前用户写入 log 的 ContextVar，这样同一个请求里所有 app.* 日志都会带 user_id
    current_user_id.set(user.id)
    log.info(
        "chat start: agent=%s channel=%s stream=%s",
        agent_id,
        channel,
        payload.stream,
        extra={"agent_id": agent_id, "channel": channel, "stream": payload.stream},
    )
    agent, prompt, key = await load_agent_context(agent_id, user, session)
    history = await get_recent_messages(session, agent_id, limit=max(payload.max_turns, 1) * 2)
    messages = build_messages(prompt.content, history, payload.message, max_turns=payload.max_turns)
    kwargs = common_kwargs(agent, key)

    # B2：Agent 若绑定 MCP server，提前 discover 工具清单
    mcp_servers = await load_agent_tools(agent_id, user.id, session)
    litellm_tools: list[dict] = []
    name_to_server: dict[str, McpServer] = {}
    if mcp_servers:
        litellm_tools, name_to_server = await collect_litellm_tools(mcp_servers)

    # 工具绑定时当前只支持非流式（流式 tool call 放 B2-v2）
    if payload.stream and litellm_tools:
        # 前端会自动重试非流式，这里简单降级：把 stream 置 false
        payload = payload.model_copy(update={"stream": False})

    if payload.stream:

        async def sse() -> AsyncGenerator[str, None]:
            full = ""
            started_at = time.perf_counter()
            err_msg: str | None = None
            try:
                response = await acompletion(messages=messages, stream=True, **kwargs)
                async for chunk in response:
                    delta = ""
                    try:
                        delta = chunk.choices[0].delta.content or ""
                    except (AttributeError, IndexError):
                        delta = ""
                    if delta:
                        full += delta
                        yield f"data: {json.dumps({'delta': delta})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as exc:  # noqa: BLE001
                err_msg = f"{type(exc).__name__}: {exc}"[:500]
                err = {"error": type(exc).__name__, "message": str(exc)}
                yield f"data: {json.dumps(err)}\n\n"
                yield "data: [DONE]\n\n"
            finally:
                duration_ms = int((time.perf_counter() - started_at) * 1000)
                if full:
                    await persist_exchange(agent_id, payload.message, full)
                await persist_call_log(
                    user_id=user.id,
                    agent_id=agent_id,
                    model=agent.model,
                    channel=channel,
                    stream=True,
                    duration_ms=duration_ms,
                    prompt_tokens=None,
                    completion_tokens=None,
                    status_="error" if err_msg else "success",
                    error=err_msg,
                )

        return StreamingResponse(sse(), media_type="text/event-stream")

    started_at = time.perf_counter()
    try:
        if litellm_tools:
            reply, prompt_tokens, completion_tokens, tool_events = await run_tool_loop(
                messages=messages,
                kwargs=kwargs,
                litellm_tools=litellm_tools,
                name_to_server=name_to_server,
            )
            response = None  # 标记：走了 tool loop 分支
        else:
            response = await _acompletion_with_retry(messages=messages, stream=False, **kwargs)
            tool_events = []
    except Exception as exc:  # noqa: BLE001
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        log.error(
            "chat failed: agent=%s %s (%dms)",
            agent_id,
            f"{type(exc).__name__}: {exc}"[:200],
            duration_ms,
            extra={
                "agent_id": agent_id,
                "channel": channel,
                "duration_ms": duration_ms,
            },
            exc_info=True,
        )
        await persist_call_log(
            user_id=user.id,
            agent_id=agent_id,
            model=agent.model,
            channel=channel,
            stream=False,
            duration_ms=duration_ms,
            prompt_tokens=None,
            completion_tokens=None,
            status_="error",
            error=f"{type(exc).__name__}: {exc}"[:500],
        )
        raise ExternalServiceError(f"Model call failed: {type(exc).__name__}: {exc}") from exc

    duration_ms = int((time.perf_counter() - started_at) * 1000)
    if response is not None:
        reply = response.choices[0].message.content or ""
        usage = getattr(response, "usage", None)
        prompt_tokens = getattr(usage, "prompt_tokens", None) if usage else None
        completion_tokens = getattr(usage, "completion_tokens", None) if usage else None
    # else：tool loop 已经填好 reply/prompt_tokens/completion_tokens
    await persist_exchange(agent_id, payload.message, reply)
    _ = tool_events  # 保留变量，供后续 SSE/日志扩展
    await persist_call_log(
        user_id=user.id,
        agent_id=agent_id,
        model=agent.model,
        channel=channel,
        stream=False,
        duration_ms=duration_ms,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        status_="success",
        error=None,
    )
    log.info(
        "chat ok: agent=%s tokens=%s/%s (%dms)",
        agent_id,
        prompt_tokens,
        completion_tokens,
        duration_ms,
        extra={
            "agent_id": agent_id,
            "channel": channel,
            "duration_ms": duration_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "tool_rounds": len(tool_events),
        },
    )
    return ChatResponse(
        agent_id=agent_id,
        reply=reply,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
