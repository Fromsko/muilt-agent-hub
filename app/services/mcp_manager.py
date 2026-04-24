"""MCP Client 封装 —— 统一 HTTP (Streamable) / stdio 两种连接方式。

设计：
- HTTP 连接使用 **连接池**（LRU 缓存 + TTL），避免频繁握手。
- stdio 仍为一次性连接（进程生命周期难以跨请求持有）。
- `tools/list` 返回原生 MCP `Tool`，直接用 `to_litellm_tools` 转成 LiteLLM 期望的 JSON Schema。
"""

from __future__ import annotations

import asyncio
import json
import logging
import shlex
import time
from contextlib import asynccontextmanager
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.streamable_http import streamablehttp_client

from app.models.mcp_server import McpServer

log = logging.getLogger("app.mcp")

_POOL_TTL_SECONDS = 300  # 5 min max idle before forced reconnect


class _PoolEntry:
    __slots__ = ("session", "cm_stack", "created_at", "lock")

    def __init__(self, session: ClientSession, cm_stack, created_at: float):
        self.session = session
        self.cm_stack = cm_stack
        self.created_at = created_at
        self.lock = asyncio.Lock()


_pool: dict[int, _PoolEntry] = {}
_pool_lock = asyncio.Lock()


async def _close_entry(entry: _PoolEntry) -> None:
    try:
        await entry.cm_stack.__aexit__(None, None, None)
    except Exception:  # noqa: BLE001
        pass


async def cleanup_pool() -> None:
    """Shutdown all pooled connections.  Called from ``app.main`` lifespan."""
    async with _pool_lock:
        for sid, entry in list(_pool.items()):
            await _close_entry(entry)
        _pool.clear()
    log.info("MCP connection pool cleaned up")


def parse_command(command_json: str) -> tuple[str, list[str]]:
    """把数据库里的 `command_json` 解析为 `(command, args)`。

    支持两种格式：
    - JSON 数组：`["npx", "-y", "@modelcontextprotocol/server-filesystem", "/tmp"]`
    - 单行字符串：`npx -y @modelcontextprotocol/server-filesystem /tmp`
    """
    text = (command_json or "").strip()
    if not text:
        raise ValueError("command is empty")
    if text.startswith("["):
        parts: list[str] = json.loads(text)
    else:
        parts = shlex.split(text, posix=False)
    if not parts:
        raise ValueError("command parsed to empty list")
    return parts[0], parts[1:]


async def _get_pooled_http_session(mcp: McpServer) -> _PoolEntry:
    """Return a pooled HTTP session, creating a new one if absent or expired."""
    sid = mcp.id
    now = time.monotonic()

    async with _pool_lock:
        entry = _pool.get(sid)
        if entry and (now - entry.created_at) < _POOL_TTL_SECONDS:
            return entry
        if entry:
            await _close_entry(entry)
            _pool.pop(sid, None)

    headers: dict[str, str] | None = None
    if mcp.auth_token:
        headers = {"Authorization": f"Bearer {mcp.auth_token}"}
    cm = streamablehttp_client(mcp.server_url, headers=headers)
    read, write, _ = await cm.__aenter__()
    sess_cm = ClientSession(read, write)
    session = await sess_cm.__aenter__()
    await session.initialize()

    class _Stack:
        async def __aexit__(self, *a):
            try:
                await sess_cm.__aexit__(*a)
            except Exception:  # noqa: BLE001
                pass
            try:
                await cm.__aexit__(*a)
            except Exception:  # noqa: BLE001
                pass

    entry = _PoolEntry(session, _Stack(), time.monotonic())
    async with _pool_lock:
        _pool[sid] = entry
    log.info("MCP pool: new HTTP session for server=%s", sid)
    return entry


async def _evict_pooled(mcp_id: int) -> None:
    async with _pool_lock:
        entry = _pool.pop(mcp_id, None)
    if entry:
        await _close_entry(entry)


@asynccontextmanager
async def mcp_session(mcp: McpServer):
    """根据记录类型打开一个 `ClientSession`，上下文退出时自动关闭。

    HTTP 连接使用连接池复用；stdio 仍为一次性连接。
    """
    if mcp.transport == "http":
        if not mcp.server_url:
            raise ValueError(f"mcp server #{mcp.id} missing server_url")
        try:
            entry = await _get_pooled_http_session(mcp)
            async with entry.lock:
                yield entry.session
        except Exception:
            await _evict_pooled(mcp.id)
            raise
        return

    if mcp.transport == "stdio":
        if not mcp.command_json:
            raise ValueError(f"mcp server #{mcp.id} missing command_json")
        command, args = parse_command(mcp.command_json)
        params = StdioServerParameters(command=command, args=args)
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session
        return

    raise ValueError(f"unsupported transport: {mcp.transport}")


async def discover_tools(mcp: McpServer) -> list[dict[str, Any]]:
    """拉取工具列表，直接返回给前端/LiteLLM 的 JSON-Schema 结构。

    为了在数据库外带 `server_id` 维度做分发，返回里注入 `_server_id`，
    后续 chat 发工具调用时凭此找回对应 MCP。
    """
    try:
        async with mcp_session(mcp) as session:
            result = await session.list_tools()
    except Exception as exc:  # noqa: BLE001
        log.warning(
            "discover_tools failed: server=%s (%s) %s: %s",
            mcp.id,
            mcp.transport,
            type(exc).__name__,
            exc,
            extra={"mcp_server_id": mcp.id, "transport": mcp.transport},
        )
        raise
    out: list[dict[str, Any]] = []
    for t in result.tools:
        out.append(
            {
                "name": t.name,
                "description": t.description or "",
                "inputSchema": t.inputSchema,
                "_server_id": mcp.id,
            }
        )
    log.info(
        "discover_tools ok: server=%s tools=%d",
        mcp.id,
        len(out),
        extra={
            "mcp_server_id": mcp.id,
            "transport": mcp.transport,
            "tool_count": len(out),
        },
    )
    return out


def to_litellm_tools(mcp_tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """把 `discover_tools` 的产物转成 LiteLLM `tools=[...]` 参数。"""
    out: list[dict[str, Any]] = []
    for t in mcp_tools:
        out.append(
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description") or "",
                    "parameters": t.get("inputSchema") or {"type": "object", "properties": {}},
                },
            }
        )
    return out


async def call_tool(mcp: McpServer, tool_name: str, arguments: dict) -> str:
    """调用工具并把结果文本拼接成纯字符串返回给 LLM。"""
    async with mcp_session(mcp) as session:
        result = await session.call_tool(tool_name, arguments)

    texts: list[str] = []
    for c in result.content:
        txt = getattr(c, "text", None)
        if txt is not None:
            texts.append(txt)
    if result.isError:
        detail = "\n".join(texts) or "unknown error"
        raise RuntimeError(f"MCP tool `{tool_name}` error: {detail}")
    return "\n".join(texts)
