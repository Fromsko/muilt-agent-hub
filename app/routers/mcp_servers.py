"""McpServer CRUD + discover + agent 绑定端点。"""

from datetime import datetime, UTC

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.core.exceptions import BadRequestError, ExternalServiceError, NotFoundError
from app.db import get_async_session
from app.models.agent import Agent
from app.models.mcp_server import AgentTool, McpServer
from app.models.user import User
from app.schemas.mcp_server import (
    AgentToolsUpdate,
    McpServerCreate,
    McpServerRead,
    McpServerUpdate,
    McpToolInfo,
)
from app.services.mcp_manager import discover_tools

router = APIRouter()


def _to_read(mcp: McpServer) -> McpServerRead:
    return McpServerRead(
        id=mcp.id,
        name=mcp.name,
        transport=mcp.transport,
        server_url=mcp.server_url,
        command_json=mcp.command_json,
        enabled=mcp.enabled,
        created_at=mcp.created_at,
        updated_at=mcp.updated_at,
        has_auth_token=bool(mcp.auth_token),
    )


def _validate_payload_for_transport(transport: str, server_url, command_json) -> None:
    if transport == "http":
        if not server_url:
            raise BadRequestError("transport=http 需要提供 server_url")
    elif transport == "stdio":
        if not command_json:
            raise BadRequestError("transport=stdio 需要提供 command_json")


# -------------------- CRUD --------------------


@router.post("", response_model=McpServerRead, status_code=status.HTTP_201_CREATED)
async def create_mcp_server(
    payload: McpServerCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> McpServerRead:
    _validate_payload_for_transport(payload.transport, payload.server_url, payload.command_json)
    mcp = McpServer(
        user_id=user.id,
        name=payload.name,
        transport=payload.transport,
        server_url=payload.server_url,
        command_json=payload.command_json,
        auth_token=payload.auth_token,
    )
    session.add(mcp)
    await session.commit()
    await session.refresh(mcp)
    return _to_read(mcp)


@router.get("", response_model=list[McpServerRead])
async def list_mcp_servers(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[McpServerRead]:
    result = await session.execute(select(McpServer).where(McpServer.user_id == user.id).order_by(McpServer.id.desc()))
    return [_to_read(m) for m in result.scalars().all()]


@router.patch("/{mcp_id}", response_model=McpServerRead)
async def update_mcp_server(
    mcp_id: int,
    payload: McpServerUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> McpServerRead:
    result = await session.execute(select(McpServer).where(McpServer.id == mcp_id, McpServer.user_id == user.id))
    mcp = result.scalar_one_or_none()
    if mcp is None:
        raise NotFoundError("MCP server not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(mcp, k, v)
    mcp.updated_at = datetime.now(UTC)
    _validate_payload_for_transport(mcp.transport, mcp.server_url, mcp.command_json)
    session.add(mcp)
    await session.commit()
    await session.refresh(mcp)
    return _to_read(mcp)


@router.delete("/{mcp_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mcp_server(
    mcp_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> None:
    result = await session.execute(select(McpServer).where(McpServer.id == mcp_id, McpServer.user_id == user.id))
    mcp = result.scalar_one_or_none()
    if mcp is None:
        raise NotFoundError("MCP server not found")
    # 先删关联表，避免 FK 残留
    await session.execute(AgentTool.__table__.delete().where(AgentTool.mcp_server_id == mcp_id))
    await session.delete(mcp)
    await session.commit()


# -------------------- Discover --------------------


@router.post("/{mcp_id}/discover", response_model=list[McpToolInfo])
async def discover(
    mcp_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[McpToolInfo]:
    """连接 MCP server 并拉取工具清单（不落库）。"""
    result = await session.execute(select(McpServer).where(McpServer.id == mcp_id, McpServer.user_id == user.id))
    mcp = result.scalar_one_or_none()
    if mcp is None:
        raise NotFoundError("MCP server not found")
    if not mcp.enabled:
        raise BadRequestError("MCP server is disabled")
    try:
        tools = await discover_tools(mcp)
    except Exception as exc:  # noqa: BLE001
        raise ExternalServiceError(f"发现工具失败: {type(exc).__name__}: {exc}") from exc
    return [
        McpToolInfo(
            name=t["name"],
            description=t["description"],
            inputSchema=t["inputSchema"],
            server_id=t["_server_id"],
        )
        for t in tools
    ]


# -------------------- Agent 绑定工具 --------------------


@router.get("/agents/{agent_id}/tools", response_model=list[McpServerRead])
async def list_agent_bindings(
    agent_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[McpServerRead]:
    agent = (
        await session.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    ).scalar_one_or_none()
    if agent is None:
        raise NotFoundError("Agent not found")
    result = await session.execute(
        select(McpServer)
        .join(AgentTool, AgentTool.mcp_server_id == McpServer.id)
        .where(AgentTool.agent_id == agent_id)
        .order_by(McpServer.id.asc())
    )
    return [_to_read(m) for m in result.scalars().all()]


@router.put("/agents/{agent_id}/tools", response_model=list[McpServerRead])
async def update_agent_bindings(
    agent_id: int,
    payload: AgentToolsUpdate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
) -> list[McpServerRead]:
    """覆盖式设置 Agent 的 MCP server 绑定列表。"""
    agent = (
        await session.execute(select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id))
    ).scalar_one_or_none()
    if agent is None:
        raise NotFoundError("Agent not found")

    if payload.mcp_server_ids:
        owned = await session.execute(
            select(McpServer.id).where(
                McpServer.id.in_(payload.mcp_server_ids),
                McpServer.user_id == user.id,
            )
        )
        owned_ids = {row[0] for row in owned.all()}
        missing = set(payload.mcp_server_ids) - owned_ids
        if missing:
            raise BadRequestError(f"mcp_server_ids not owned: {sorted(missing)}")

    # 先清空旧绑定再重写
    await session.execute(AgentTool.__table__.delete().where(AgentTool.agent_id == agent_id))
    for sid in payload.mcp_server_ids:
        session.add(AgentTool(agent_id=agent_id, mcp_server_id=sid))
    await session.commit()

    # 返回最新状态
    result = await session.execute(
        select(McpServer)
        .join(AgentTool, AgentTool.mcp_server_id == McpServer.id)
        .where(AgentTool.agent_id == agent_id)
        .order_by(McpServer.id.asc())
    )
    return [_to_read(m) for m in result.scalars().all()]
