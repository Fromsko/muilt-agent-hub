# ref_007 — Python MCP Client 连接外部 Server

> 来源：https://github.com/modelcontextprotocol/python-sdk（README.md → Writing MCP Clients）
> 可信度：★★★★★ 官方 SDK
> 版本：v1.x
> 最后访问：2026-04-22

> 补充来源：https://modelcontextprotocol.io/docs/develop/build-client
> 可信度：★★★★★ 官方教程

---

## 1. MCP Client 的角色

在本项目 v0.3 中，AgentHub 后端充当 **MCP Client**，连接用户注册的外部 MCP Server。

```
用户浏览器 → AgentHub API → (MCP Client) → 外部 MCP Server
                                  ↓
                             LiteLLM → LLM
```

---

## 2. 安装

```bash
uv add mcp
```

核心导入：

```python
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from mcp.client.stdio import stdio_client, StdioServerParameters
```

---

## 3. Streamable HTTP 客户端（推荐）

适用于远程 MCP Server（用户注册的 server_url）：

```python
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def list_tools_from_server(server_url: str) -> list[dict]:
    """连接到 MCP Server 并获取工具列表"""
    async with streamablehttp_client(server_url) as (read, write, _):
        async with ClientSession(read, write) as session:
            # 1. 初始化握手
            init_result = await session.initialize()
            print(f"Server: {init_result.serverInfo.name} v{init_result.serverInfo.version}")
            print(f"Capabilities: {init_result.capabilities}")

            # 2. 列出工具
            tools_result = await session.list_tools()
            return [
                {
                    "name": t.name,
                    "description": t.description,
                    "inputSchema": t.inputSchema,
                }
                for t in tools_result.tools
            ]

# 使用
tools = asyncio.run(list_tools_from_server("http://localhost:3001/mcp"))
```

---

## 4. Stdio 客户端（本地 Server）

适用于本地 MCP Server（通过命令行启动）：

```python
import asyncio
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

async def run_local_server():
    server_params = StdioServerParameters(
        command="python",
        args=["my_mcp_server.py"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            for t in tools.tools:
                print(f"  {t.name}: {t.description}")

asyncio.run(run_local_server())
```

---

## 5. ClientSession 核心方法

### 5.1 生命周期

```python
await session.initialize()  # 发送 initialize 请求，完成能力协商
```

### 5.2 工具操作

```python
# 列出所有工具
result = await session.list_tools()
# result.tools → list[Tool]
#   Tool.name: str
#   Tool.description: str | None
#   Tool.inputSchema: dict  ← JSON Schema

# 调用工具
result = await session.call_tool("get_weather", {"city": "London"})
# result.content → list[TextContent | ImageContent | ...]
# result.isError → bool
```

### 5.3 资源操作

```python
result = await session.list_resources()
result = await session.read_resource("file:///path/to/file")
```

### 5.4 提示词操作

```python
result = await session.list_prompts()
result = await session.get_prompt("review_code", {"code": "print('hello')"})
```

---

## 6. 认证（Bearer Token）

如果外部 MCP Server 需要认证：

```python
import httpx
from mcp.client.streamable_http import streamablehttp_client

# 通过自定义 headers 传递 token
async def connect_with_auth(server_url: str, token: str):
    # streamablehttp_client 支持自定义 headers
    async with streamablehttp_client(
        server_url,
        headers={"Authorization": f"Bearer {token}"},
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            ...
```

---

## 7. 完整的代理调用流程

```python
import json
import asyncio
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


class MCPProxy:
    """代理 MCP Server 调用，用于 AgentHub 集成"""

    def __init__(self, server_url: str, auth_token: str | None = None):
        self.server_url = server_url
        self.auth_token = auth_token

    async def _get_session(self):
        """创建并初始化 session"""
        headers = {}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        return streamablehttp_client(self.server_url, headers=headers)

    async def discover_tools(self) -> list[dict]:
        """获取 MCP Server 提供的工具列表（转为 OpenAI 格式）"""
        async with self._get_session() as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.list_tools()
                return [
                    {
                        "type": "function",
                        "function": {
                            "name": t.name,
                            "description": t.description or "",
                            "parameters": t.inputSchema,
                        }
                    }
                    for t in result.tools
                ]

    async def call_tool(self, name: str, arguments: dict) -> str:
        """调用工具并返回文本结果"""
        async with self._get_session() as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                result = await session.call_tool(name, arguments)

                if result.isError:
                    texts = [c.text for c in result.content if hasattr(c, 'text')]
                    raise RuntimeError(f"Tool error: {' '.join(texts)}")

                texts = [c.text for c in result.content if hasattr(c, 'text')]
                return "\n".join(texts)


# 使用示例
async def main():
    proxy = MCPProxy("http://localhost:3001/mcp")

    # 1. 发现工具
    tools = await proxy.discover_tools()
    print(f"Found {len(tools)} tools")

    # 2. 调用工具
    result = await proxy.call_tool("get_weather", {"city": "London"})
    print(f"Result: {result}")

asyncio.run(main())
```

---

## 8. 错误处理

```python
try:
    async with streamablehttp_client(server_url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("my_tool", {"arg": "value"})
except Exception as exc:
    # 可能的异常：
    # - ConnectionError: 连接失败
    # - McpError: MCP 协议错误
    # - TimeoutError: 超时
    print(f"MCP call failed: {exc}")
```

---

## 9. 对本项目 v0.3 的集成

### 9.1 在 chat.py 中使用

```python
# 在 chat 升级中
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def call_mcp_tool(server_url: str, tool_name: str, arguments: dict) -> str:
    async with streamablehttp_client(server_url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool(tool_name, arguments)
            return "\n".join(c.text for c in result.content if hasattr(c, 'text'))
```

### 9.2 生命周期管理

每次调用都创建新连接（简单但有开销）。生产环境可考虑连接池：

```python
# 连接池方案（可选优化）
from contextlib import asynccontextmanager

class MCPConnectionPool:
    def __init__(self):
        self._connections: dict[str, tuple] = {}

    @asynccontextmanager
    async def get_session(self, server_url: str):
        # 复用或创建连接
        ...
```

---

## 10. 扩展阅读

- MCP Client 概念：https://modelcontextprotocol.io/docs/learn/client-concepts
- MCP Python SDK API：https://modelcontextprotocol.github.io/python-sdk/
- 示例客户端代码：https://github.com/modelcontextprotocol/python-sdk/tree/main/examples/snippets/clients
