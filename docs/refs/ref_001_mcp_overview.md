# ref_001 — MCP 协议总览

> 来源：https://modelcontextprotocol.io/docs/learn/architecture
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. MCP 是什么

Model Context Protocol (MCP) 是一个**开放标准协议**，定义了 AI 应用（客户端）与外部数据/工具源（服务端）之间的**上下文交换**方式。

**核心定位**：MCP 只负责「协议层」的上下文交换，不决定 AI 应用如何使用 LLM 或管理上下文。

---

## 2. 架构模型

```
┌─────────────────────────────┐
│        MCP Host（AI 应用）     │
│  ┌───────────┐ ┌───────────┐ │
│  │ MCP Client│ │ MCP Client│ │   ← 每个 Server 一个 Client
│  └─────┬─────┘ └─────┬─────┘ │
└────────┼─────────────┼───────┘
         │             │
    ┌────▼────┐   ┌────▼────┐
    │MCP Server│   │MCP Server│   ← 本地（stdio）或远程（HTTP）
    │ A (本地)  │   │ B (远程)  │
    └──────────┘   └──────────┘
```

**参与者**：

| 角色 | 说明 |
|---|---|
| **MCP Host** | AI 应用本身（如 Claude Desktop、VS Code、本项目的 Agent） |
| **MCP Client** | Host 内部为每个 Server 创建的连接管理组件 |
| **MCP Server** | 提供工具/资源/提示词的独立程序 |

---

## 3. 双层架构

### 3.1 数据层（Data Layer）

基于 **JSON-RPC 2.0**，定义消息语义：

- **生命周期管理**：连接初始化、能力协商、连接终止
- **服务端特性**：Tools（可执行函数）、Resources（只读数据源）、Prompts（交互模板）
- **客户端特性**：Sampling（请求 LLM 补全）、Elicitation（请求用户输入）
- **通知**：实时更新（如工具列表变更）

### 3.2 传输层（Transport Layer）

| 传输方式 | 适用场景 | 特点 |
|---|---|---|
| **Stdio** | 本地进程通信 | 无网络开销，适合同机部署 |
| **Streamable HTTP** | 远程服务 | HTTP POST + 可选 SSE 流式，支持标准 HTTP 认证 |

---

## 4. 三个核心原语（服务端暴露）

### 4.1 Tools（工具）

- **控制者**：Model（LLM 自主决定调用）
- **语义**：类似 REST API 的 POST 端点，执行操作、产生副作用
- **方法**：`tools/list`（发现）、`tools/call`（执行）
- **示例**：搜索航班、发送消息、查询数据库

### 4.2 Resources（资源）

- **控制者**：Application（应用决定如何获取和使用）
- **语义**：类似 REST API 的 GET 端点，只读数据
- **方法**：`resources/list`、`resources/read`
- **示例**：文件内容、数据库 Schema、API 文档

### 4.3 Prompts（提示词模板）

- **控制者**：User（用户主动触发）
- **语义**：可复用的交互模板，可引用 Tools 和 Resources
- **方法**：`prompts/list`、`prompts/get`
- **示例**：「规划假期」模板，引导 AI 完成多步骤任务

---

## 5. 消息格式（JSON-RPC 2.0）

### 初始化握手

```json
// Client → Server: initialize
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "elicitation": {} },
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  }
}

// Server → Client: 响应能力
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": {}
    },
    "serverInfo": { "name": "my-server", "version": "1.0.0" }
  }
}

// Client → Server: notifications/initialized
{ "jsonrpc": "2.0", "method": "notifications/initialized" }
```

### 工具调用

```json
// Client → Server: tools/call
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "weather_current",
    "arguments": { "location": "San Francisco", "units": "imperial" }
  }
}

// Server → Client: 结果
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      { "type": "text", "text": "Current weather: 68°F, partly cloudy" }
    ]
  }
}
```

---

## 6. 对本项目 v0.3 的关联

| MCP 概念 | 对应本项目 | 说明 |
|---|---|---|
| MCP Server URL | `app/models/tool.py` → `server_url` 字段 | 用户注册外部 MCP Server 的地址 |
| `tools/list` | `GET /api/v1/tools/{id}/discover` | 拉取远程 MCP Server 提供的工具清单 |
| `tools/call` | Chat 升级中的 tool-call 循环 | LiteLLM 触发 tool call → 代理转发到 MCP Server |
| Tool Schema | 转为 LiteLLM `tools=[...]` 参数 | MCP JSON Schema → OpenAI function 格式 |
| 多对多绑定 | `app/models/agent_tool.py` | Agent ↔ Tool 多对多关系 |

---

## 7. 关键术语速查

| 术语 | 解释 |
|---|---|
| JSON-RPC 2.0 | MCP 底层通信协议，请求-响应 + 通知模式 |
| Capability Negotiation | 初始化时双方声明支持的功能 |
| listChanged | Server 声明「工具列表变更时会主动通知」 |
| Streamable HTTP | 新推荐的远程传输方式，替代旧 SSE 传输 |
| Stdio | 通过 stdin/stdout 的本地传输方式 |

---

## 8. 扩展阅读

- MCP 官方规范：https://modelcontextprotocol.io/specification/2025-11-25/
- MCP 示例 Servers：https://modelcontextprotocol.io/examples.md
- MCP 设计原则：https://modelcontextprotocol.io/community/design-principles.md
