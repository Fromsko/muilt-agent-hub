# ref_006 — FastAPI + SQLModel 多对多关系

> 来源：https://sqlmodel.tiangolo.com/tutorial/many-to-many/
> 可信度：★★★★★ 官方文档
> 作者：Sebastián Ramírez（FastAPI 作者）
> 最后访问：2026-04-22

> 补充来源：https://sqlmodel.tiangolo.com/tutorial/fastapi/
> 可信度：★★★★★ 官方文档

---

## 1. 多对多关系模式

SQLModel 多对多需要一个**关联表（link table）**。

### 1.1 本项目 v0.3 需要

```
Agent ←──M:N──→ Tool
  │                │
  └── agent_tool ──┘   （关联表）
```

---

## 2. 模型定义

```python
from datetime import datetime
from sqlmodel import Field, Relationship, SQLModel


# ============ Tool ============

class ToolBase(SQLModel):
    name: str = Field(max_length=128)
    server_url: str
    auth_type: str = Field(default="none", max_length=32)  # none | bearer | api_key
    enabled: bool = True


class Tool(ToolBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # 反向关系
    agents: list["Agent"] = Relationship(
        back_populates="tools",
        link_model="AgentTool",
    )


class ToolCreate(ToolBase):
    pass


class ToolRead(ToolBase):
    id: int
    user_id: str
    created_at: datetime


# ============ Agent（需要修改现有模型）============

# 在现有 Agent 模型中添加关系
class Agent(SQLModel, table=True):
    # ... 现有字段 ...

    # 新增多对多关系
    tools: list[Tool] = Relationship(
        back_populates="agents",
        link_model="AgentTool",
    )


# ============ 关联表 ============

class AgentTool(SQLModel, table=True):
    """Agent-Tool 多对多关联表"""
    agent_id: int = Field(foreign_key="agents.id", primary_key=True)
    tool_id: int = Field(foreign_key="tools.id", primary_key=True)
```

---

## 3. 路由实现

### 3.1 注册 MCP Server

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.tool import Tool, ToolCreate, ToolRead
from app.models.user import User

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("", response_model=ToolRead)
async def create_tool(
    payload: ToolCreate,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    tool = Tool(**payload.model_dump(), user_id=user.id)
    session.add(tool)
    await session.commit()
    await session.refresh(tool)
    return tool


@router.get("", response_model=list[ToolRead])
async def list_tools(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Tool).where(Tool.user_id == user.id)
    )
    return list(result.scalars().all())


@router.delete("/{tool_id}", status_code=204)
async def delete_tool(
    tool_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(Tool).where(Tool.id == tool_id, Tool.user_id == user.id)
    )
    tool = result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    await session.delete(tool)
    await session.commit()
```

### 3.2 发现工具清单

```python
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession


@router.get("/{tool_id}/discover")
async def discover_tools(
    tool_id: int,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    """连接到 MCP Server，拉取可用工具清单"""
    result = await session.execute(
        select(Tool).where(Tool.id == tool_id, Tool.user_id == user.id)
    )
    tool = result.scalar_one_or_none()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")

    try:
        async with streamablehttp_client(tool.server_url) as (read, write, _):
            async with ClientSession(read, write) as mcp_session:
                await mcp_session.initialize()
                tools_result = await mcp_session.list_tools()
                return [
                    {
                        "name": t.name,
                        "description": t.description,
                        "inputSchema": t.inputSchema,
                    }
                    for t in tools_result.tools
                ]
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to MCP Server: {exc}",
        )
```

### 3.3 Agent 绑定工具

```python
from app.models.agent_tool import AgentTool


@router.put("/agents/{agent_id}/tools")
async def bind_tools(
    agent_id: int,
    tool_ids: list[int],
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    """为 Agent 绑定/解绑工具"""
    # 验证 agent 所有权
    agent = await session.execute(
        select(Agent).where(Agent.id == agent_id, Agent.user_id == user.id)
    )
    if agent.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 验证所有 tool_ids 归属
    for tid in tool_ids:
        t = await session.execute(
            select(Tool).where(Tool.id == tid, Tool.user_id == user.id)
        )
        if t.scalar_one_or_none() is None:
            raise HTTPException(status_code=400, detail=f"Tool {tid} not found")

    # 删除旧绑定
    await session.execute(
        AgentTool.__table__.delete().where(AgentTool.agent_id == agent_id)
    )

    # 添加新绑定
    for tid in tool_ids:
        session.add(AgentTool(agent_id=agent_id, tool_id=tid))

    await session.commit()
    return {"agent_id": agent_id, "tool_ids": tool_ids}
```

---

## 4. 会话操作：查询关联

```python
# 查询 Agent 关联的所有 Tools
result = await session.execute(
    select(Tool)
    .join(AgentTool)
    .where(AgentTool.agent_id == agent_id)
)
agent_tools = result.scalars().all()

# 或者通过关系直接加载（需要 eager load）
from sqlalchemy.orm import selectinload

result = await session.execute(
    select(Agent)
    .where(Agent.id == agent_id)
    .options(selectinload(Agent.tools))
)
agent = result.scalar_one()
print(agent.tools)  # 直接访问
```

---

## 5. 与本项目现有模型的兼容

| 现有模型 | 需要修改 |
|---|---|
| `app/models/agent.py` | 添加 `tools: list[Tool] = Relationship(...)` |
| `app/db.py` 的 `init_db()` | 添加 `from app.models import tool, agent_tool` |
| `app/main.py` | 注册 `api_v1.include_router(tools_router)` |

### 关键注意点

| 问题 | 说明 |
|---|---|
| 联合主键 | `AgentTool` 用 `(agent_id, tool_id)` 作联合主键 |
| 级联删除 | 删除 Tool 时需先清理 `AgentTool` 记录 |
| 所有权校验 | 绑定时必须验证 agent 和 tool 都属于当前用户 |
| 延迟加载 | 异步模式下需要 `selectinload` 避免 N+1 |
