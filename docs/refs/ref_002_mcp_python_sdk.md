# ref_002 — MCP Python SDK（FastMCP）

> 来源：https://github.com/modelcontextprotocol/python-sdk
> 可信度：★★★★★ 官方 SDK 仓库
> 版本：v1.x（当前稳定版）
> 最后访问：2026-04-22

---

## 1. 安装

```bash
# uv（推荐，本项目已使用 uv）
uv add "mcp[cli]"

# 或 pip
pip install "mcp[cli]"
```

`[cli]` extras 包含 `mcp` 命令行工具（dev/inspect 功能）。

---

## 2. 核心概念：FastMCP Server

FastMCP 是高层 API，用装饰器快速定义 Server：

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

@mcp.resource("greeting://{name}")
def get_greeting(name: str) -> str:
    return f"Hello, {name}!"

@mcp.prompt()
def review_code(code: str) -> str:
    return f"Please review this code:\n\n{code}"
```

---

## 3. @mcp.tool() 详解

### 3.1 基本用法

```python
@mcp.tool()
def get_weather(city: str, unit: str = "celsius") -> str:
    """Get weather for a city."""
    return f"Weather in {city}: 22°{unit[0].upper()}"
```

- 函数名 → tool `name`
- docstring → tool `description`
- 类型注解 + 参数名 → 自动生成 `inputSchema`（JSON Schema）

### 3.2 Context 对象

```python
from mcp.server.fastmcp import Context, FastMCP
from mcp.server.session import ServerSession

@mcp.tool()
async def long_task(task_name: str, ctx: Context[ServerSession, None], steps: int = 5) -> str:
    await ctx.info(f"Starting: {task_name}")
    for i in range(steps):
        await ctx.report_progress(progress=i+1, total=steps, message=f"Step {i+1}/{steps}")
    return f"Done: {task_name}"
```

Context 提供：
- `ctx.info()` / `ctx.debug()` / `ctx.warning()` / `ctx.error()` — 日志
- `ctx.report_progress()` — 进度通知
- `ctx.read_resource(uri)` — 读取资源
- `ctx.elicit(message, schema)` — 请求用户输入

### 3.3 结构化输出

```python
from pydantic import BaseModel

class WeatherData(BaseModel):
    temperature: float
    condition: str

@mcp.tool()
def get_weather(city: str) -> WeatherData:
    return WeatherData(temperature=22.5, condition="sunny")
```

支持返回类型：Pydantic model、TypedDict、dataclass、`dict[str, T]`、基本类型。

---

## 4. 传输方式

### 4.1 Streamable HTTP（推荐）

```python
mcp = FastMCP("MyServer", stateless_http=True, json_response=True)
mcp.run(transport="streamable-http")
```

配置项：
- `stateless_http=True` — 无状态模式，适合水平扩展
- `json_response=True` — JSON 响应（非 SSE 流式）

### 4.2 挂载到现有 ASGI 应用

```python
import contextlib
from starlette.applications import Starlette
from starlette.routing import Mount
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("MyApp", json_response=True)

@mcp.tool()
def hello() -> str:
    return "Hello!"

@contextlib.asynccontextmanager
async def lifespan(app):
    async with mcp.session_manager.run():
        yield

app = Starlette(
    routes=[Mount("/", app=mcp.streamable_http_app())],
    lifespan=lifespan,
)
```

**关键**：需要 `lifespan` 管理 `session_manager`。

### 4.3 CORS 配置（浏览器客户端）

```python
from starlette.middleware.cors import CORSMiddleware

app = CORSMiddleware(
    starlette_app,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE"],
    expose_headers=["Mcp-Session-Id"],
)
```

---

## 5. MCP Client（Python）

用于**连接到外部 MCP Server**：

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client("http://localhost:8000/mcp") as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # 发现工具
            tools = await session.list_tools()
            for tool in tools.tools:
                print(f"Tool: {tool.name} - {tool.description}")

            # 调用工具
            result = await session.call_tool("get_weather", {"city": "London"})
            print(result.content)

asyncio.run(main())
```

### 5.1 支持的客户端传输

| 函数 | 对应服务端传输 |
|---|---|
| `mcp.client.stdio.stdio_client` | Stdio |
| `mcp.client.streamable_http.streamablehttp_client` | Streamable HTTP |
| `mcp.client.sse.sse_client` | SSE（旧版，已弃用） |

---

## 6. 认证（OAuth 2.1）

```python
from mcp.server.auth.provider import AccessToken, TokenVerifier
from mcp.server.auth.settings import AuthSettings
from mcp.server.fastmcp import FastMCP

class MyTokenVerifier(TokenVerifier):
    async def verify_token(self, token: str) -> AccessToken | None:
        # 自定义 token 验证逻辑
        pass

mcp = FastMCP(
    "MyServer",
    token_verifier=MyTokenVerifier(),
    auth=AuthSettings(
        issuer_url="https://auth.example.com",
        resource_server_url="http://localhost:8000",
        required_scopes=["user"],
    ),
)
```

---

## 7. 生命周期管理（Lifespan）

```python
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass

@dataclass
class AppContext:
    db: Database

@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    db = await Database.connect()
    try:
        yield AppContext(db=db)
    finally:
        await db.disconnect()

mcp = FastMCP("MyApp", lifespan=app_lifespan)

@mcp.tool()
def query(sql: str, ctx: Context) -> str:
    db = ctx.request_context.lifespan_context.db
    return db.query(sql)
```

---

## 8. 对本项目的集成思路

### 方案 A：在 FastAPI 中直接挂载 MCP Server

```python
# app/main.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("AgentHub", json_response=True)

# 将 mcp.streamable_http_app() 挂载到 /mcp 路径
# 在 lifespan 中同时管理 MCP session_manager 和数据库
```

### 方案 B：MCP Client 代理模式（更符合 v0.3 设计）

```
用户 → AgentHub API → MCP Client → 外部 MCP Server
                          ↓
                    LiteLLM (tools=[...])
```

1. 用户注册外部 MCP Server URL
2. AgentHub 用 MCP Client 连接 → `tools/list` 获取工具 Schema
3. 将 Schema 转为 LiteLLM `tools` 参数
4. Chat 时 LLM 触发 tool call → AgentHub 代理调用 MCP Server 的 `tools/call`
5. 返回结果给 LLM 继续推理

---

## 9. 扩展阅读

- MCP Python SDK API 文档：https://modelcontextprotocol.github.io/python-sdk/
- 示例代码：https://github.com/modelcontextprotocol/python-sdk/tree/main/examples
- MCP Inspector（调试工具）：https://modelcontextprotocol.io/docs/tools/inspector.md
