"""McpServer 的请求/响应 schema。"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class McpServerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    transport: str = Field(default="http", pattern="^(http|stdio)$")
    server_url: str | None = Field(default=None, max_length=500)
    command_json: str | None = Field(default=None, max_length=2000)
    auth_token: str | None = Field(default=None, max_length=500)


class McpServerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    transport: str | None = Field(default=None, pattern="^(http|stdio)$")
    server_url: str | None = None
    command_json: str | None = None
    auth_token: str | None = None
    enabled: bool | None = None


class McpServerRead(BaseModel):
    id: int
    name: str
    transport: str
    server_url: str | None
    command_json: str | None
    enabled: bool
    created_at: datetime
    updated_at: datetime
    has_auth_token: bool = False


class McpToolInfo(BaseModel):
    name: str
    description: str
    inputSchema: dict[str, Any]
    server_id: int


class AgentToolsUpdate(BaseModel):
    mcp_server_ids: list[int]
