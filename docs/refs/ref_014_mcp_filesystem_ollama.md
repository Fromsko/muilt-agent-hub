# ref_014 — MCP 文件系统 Server + Ollama 本地模型

> 对应任务：B2 MCP 工具集成（最小可行 demo）
> 来源：
> - https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem（官方文件系统 Server）
> - https://docs.litellm.ai/docs/providers/ollama（LiteLLM Ollama 文档）
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. MCP 文件系统 Server

### 1.1 启动方式

```bash
# 方式 1：npx 直接运行（最简单）
npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/dir

# 方式 2：Docker
docker run -i --rm \
  --mount type=bind,src=/home/user/project,dst=/projects/project \
  mcp/filesystem /projects
```

### 1.2 Windows 特殊处理

```powershell
# Windows 需要 cmd /c
cmd /c npx -y @modelcontextprotocol/server-filesystem C:\coding\02-school
```

### 1.3 暴露的 Tools

| Tool | 功能 | readOnly |
|---|---|---|
| `read_text_file` | 读取文件内容 | ✅ |
| `read_media_file` | 读取图片/音频（base64） | ✅ |
| `read_multiple_files` | 批量读取 | ✅ |
| `write_file` | 写入/覆盖文件 | ❌ |
| `edit_file` | 基于 pattern 的编辑 | ❌ |
| `create_directory` | 创建目录 | ❌ |
| `list_directory` | 列出目录内容 | ✅ |
| `list_directory_with_sizes` | 带大小的目录列表 | ✅ |
| `move_file` | 移动/重命名 | ❌ |
| `search_files` | glob 搜索 | ✅ |
| `directory_tree` | 递归 JSON 树 | ✅ |
| `get_file_info` | 文件元数据 | ✅ |
| `list_allowed_directories` | 列出允许访问的目录 | ✅ |

### 1.4 MCP Client 连接

```python
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

server_params = StdioServerParameters(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        tools = await session.list_tools()
        # tools.tools 包含上述 13 个工具

        # 读文件
        result = await session.call_tool("read_text_file", {"path": "/path/to/file.txt"})
        print(result.content[0].text)
```

---

## 2. Ollama 本地模型集成

### 2.1 前置条件

```bash
# 安装 Ollama（需要本地 GPU 或 CPU）
ollama pull llama3.2       # 拉取模型
ollama serve               # 启动服务（默认 http://localhost:11434）
```

### 2.2 LiteLLM 调用 Ollama

```python
from litellm import acompletion

response = await acompletion(
    model="ollama_chat/llama3.2",       # ollama_chat 走 /api/chat
    messages=[{"role": "user", "content": "Hello"}],
    api_base="http://localhost:11434",
)
```

### 2.3 Ollama Tool Calling

```python
from litellm import completion

tools = [{
    "type": "function",
    "function": {
        "name": "read_text_file",
        "description": "Read contents of a file",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path"}
            },
            "required": ["path"]
        }
    }
}]

response = completion(
    model="ollama_chat/llama3.2",  # 需要支持 tool calling 的模型
    messages=[{"role": "user", "content": "Read /tmp/test.txt"}],
    tools=tools,
    api_base="http://localhost:11434",
)
```

**注意**：不是所有 Ollama 模型都支持 tool calling。`llama3.1+` / `llama3.2` / `qwen2.5` 支持。

### 2.4 在 Key 中配置 Ollama

| 字段 | 值 |
|---|---|
| provider | `ollama` |
| api_key | 任意非空串（Ollama 不校验） |
| api_base | `http://localhost:11434` |
| model | `ollama_chat/llama3.2` |

---

## 3. B2 完整 demo 流程

```
1. 用户启动本地 MCP 文件系统 Server
   npx -y @modelcontextprotocol/server-filesystem ./data

2. 用户在 AgentHub 注册 MCP Server（如果是本地 stdio，需配置命令）
   POST /api/v1/tools { name: "local-fs", server_url: "stdio://npx ..." }

3. AgentHub 发现工具
   GET /api/v1/tools/1/discover
   → 返回 read_text_file, write_file, list_directory, ...

4. 用户创建 Agent，绑定 Tool
   POST /api/v1/agents { prompt_id: 1, key_id: 1, model: "ollama_chat/llama3.2" }
   PUT /api/v1/agents/1/tools [tool_id=1]

5. 对话
   POST /api/v1/agents/1/chat { message: "列出 ./data 目录下的文件" }
   → LiteLLM 返回 tool_call: list_directory(path="./data")
   → AgentHub 代理调 MCP Server
   → 返回结果给 LLM
   → LLM 生成最终回复
```

---

## 4. MCP Server 的两种连接方式

| 方式 | 适用场景 | 实现 |
|---|---|---|
| **Stdio** | 本地 MCP Server（如 filesystem） | `StdioServerParameters` + `stdio_client` |
| **Streamable HTTP** | 远程 MCP Server | `streamablehttp_client` |

对于 B2 demo：文件系统 Server 用 **Stdio** 方式连接。

```python
# app/mcp/manager.py（新文件）

from contextlib import asynccontextmanager
from mcp import ClientSession
from mcp.client.stdio import stdio_client, StdioServerParameters

class MCPToolManager:
    """管理 MCP Server 连接和工具调用"""

    @staticmethod
    @asynccontextmanager
    async def connect_stdio(command: str, args: list[str]):
        server_params = StdioServerParameters(
            command=command,
            args=args,
        )
        async with stdio_client(server_params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    @staticmethod
    @asynccontextmanager
    async def connect_http(url: str, headers: dict | None = None):
        from mcp.client.streamable_http import streamablehttp_client
        async with streamablehttp_client(url, headers=headers) as (read, write, _):
            async with ClientSession(read, write) as session:
                await session.initialize()
                yield session

    @staticmethod
    async def discover_tools(session: ClientSession) -> list[dict]:
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

    @staticmethod
    async def call_tool(session: ClientSession, name: str, arguments: dict) -> str:
        result = await session.call_tool(name, arguments)
        return "\n".join(
            c.text for c in result.content if hasattr(c, 'text')
        )
```
