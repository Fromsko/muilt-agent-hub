"""MCP Server 记录 —— 用户可注册的外部工具服务。

v1 支持两种传输：
- `http`：填 `server_url`（Streamable HTTP / SSE）
- `stdio`：填 `command`（JSON 数组形如 ["npx","-y","@xx/server","--arg"]）

两者二选一；至少留一个非空由路由层校验。
"""

import uuid
from datetime import datetime, UTC

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(UTC)


class McpServer(SQLModel, table=True):
    __tablename__ = "mcp_servers"

    id: int | None = Field(default=None, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(max_length=200, nullable=False)
    transport: str = Field(max_length=16, nullable=False, default="http")  # http | stdio
    server_url: str | None = Field(default=None, max_length=500)
    command_json: str | None = Field(default=None, max_length=2000)  # JSON: ["cmd", ...]
    auth_token: str | None = Field(default=None, max_length=500)  # 可选 Bearer，Fernet 加密
    enabled: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=_utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=_utcnow, nullable=False)


class AgentTool(SQLModel, table=True):
    """Agent ↔ McpServer 的多对多关联表（按 server 粒度绑定，其下所有工具都启用）。"""

    __tablename__ = "agent_tools"

    agent_id: int = Field(foreign_key="agents.id", primary_key=True)
    mcp_server_id: int = Field(foreign_key="mcp_servers.id", primary_key=True)
