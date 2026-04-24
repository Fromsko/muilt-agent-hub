# ref_003 — MCP Tools 规范详解

> 来源：https://modelcontextprotocol.io/specification/2025-11-25/server/tools
> 可信度：★★★★★ 官方规范
> 协议版本：2025-11-25
> 最后访问：2026-04-22

---

## 1. Tools 在 MCP 中的定位

Tools 是 MCP 的**模型控制（model-controlled）**原语——LLM 自主决定何时调用。

> 安全要求：必须始终有**人类在环（human-in-the-loop）**，提供确认机制。

---

## 2. 协议方法

| 方法 | 方向 | 用途 | 返回 |
|---|---|---|---|
| `tools/list` | Client → Server | 发现可用工具 | 工具定义数组（含 Schema） |
| `tools/call` | Client → Server | 执行工具 | 工具执行结果 |
| `notifications/tools/list_changed` | Server → Client | 通知工具列表变更 | 无（通知） |

---

## 3. 能力声明

服务端必须声明 `tools` 能力：

```json
{
  "capabilities": {
    "tools": {
      "listChanged": true  // 是否发送变更通知
    }
  }
}
```

---

## 4. 工具定义结构

```json
{
  "name": "searchFlights",
  "title": "Flight Search",
  "description": "Search for available flights",
  "inputSchema": {
    "type": "object",
    "properties": {
      "origin": { "type": "string", "description": "Departure city" },
      "destination": { "type": "string", "description": "Arrival city" },
      "date": { "type": "string", "format": "date", "description": "Travel date" }
    },
    "required": ["origin", "destination", "date"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "flights": { "type": "array", "items": { "type": "object" } }
    }
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | 工具唯一标识（1-128 字符，推荐 `^[a-zA-Z0-9_.-]+$`） |
| `title` | ❌ | 人类可读的显示名称 |
| `description` | ❌ | 工具功能描述 |
| `inputSchema` | ✅ | JSON Schema 定义输入参数（不能为空） |
| `outputSchema` | ❌ | JSON Schema 定义输出结构 |
| `annotations` | ❌ | 工具行为描述（可信度标注） |

### 命名规范

```
✅ getUser, DATA_EXPORT_v2, admin.tools.list
❌ "my tool"（含空格）, "tool,name"（含逗号）
```

### 无参数工具

```json
{
  "name": "get_current_time",
  "description": "Returns the current server time",
  "inputSchema": {
    "type": "object",
    "additionalProperties": false
  }
}
```

---

## 5. 工具执行结果

### 5.1 非结构化内容

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      { "type": "text", "text": "Weather: 72°F, partly cloudy" },
      { "type": "image", "data": "base64...", "mimeType": "image/png" }
    ],
    "isError": false
  }
}
```

支持的内容类型：

| 类型 | 说明 |
|---|---|
| `text` | 纯文本 |
| `image` | base64 编码图片 |
| `audio` | base64 编码音频 |
| `resource_link` | 指向 Resource 的 URI |
| `resource` | 嵌入的 Resource 内容 |

### 5.2 结构化输出

```json
{
  "result": {
    "content": [
      { "type": "text", "text": "{\"temperature\": 22.5}" }
    ],
    "structuredContent": {
      "temperature": 22.5,
      "conditions": "Partly cloudy",
      "humidity": 65
    }
  }
}
```

### 5.3 执行错误

```json
{
  "result": {
    "content": [
      { "type": "text", "text": "Invalid date: must be in the future" }
    ],
    "isError": true
  }
}
```

---

## 6. 错误处理分层

| 错误类型 | 场景 | 处理方式 |
|---|---|---|
| **Protocol Error** | 未知工具、格式错误 | JSON-RPC error（`-32602`） |
| **Execution Error** | API 失败、参数校验 | `isError: true` + 内容反馈 |

**关键区别**：Execution Error 包含可操作的反馈，LLM 可自我修正重试。

---

## 7. 与 OpenAI Function Calling 格式的映射

这是本项目集成的**核心转换逻辑**：

### MCP Tool → OpenAI Function

```python
def mcp_tool_to_openai(tool: dict) -> dict:
    """将 MCP tool 定义转为 OpenAI function 格式"""
    return {
        "type": "function",
        "function": {
            "name": tool["name"],
            "description": tool.get("description", ""),
            "parameters": tool["inputSchema"],  # 直接透传 JSON Schema
        }
    }
```

### MCP result → OpenAI tool message

```python
def mcp_result_to_tool_message(tool_call_id: str, result: dict) -> dict:
    """将 MCP tools/call 结果转为 OpenAI tool message"""
    text_parts = [c["text"] for c in result["content"] if c["type"] == "text"]
    return {
        "role": "tool",
        "tool_call_id": tool_call_id,
        "content": "\n".join(text_parts),
    }
```

---

## 8. 消息流（完整时序）

```
Client                Server
  │                      │
  │── tools/list ────────►│
  │◄── tools [...] ──────│
  │                      │
  │── tools/call ────────►│
  │◄── result ───────────│
  │                      │
  │                      │  (工具列表变更)
  │◄── list_changed ─────│
  │── tools/list ────────►│
  │◄── updated tools ────│
```

---

## 9. 安全要求

### 服务端 MUST：
- 验证所有工具输入
- 实现访问控制
- 限速工具调用
- 清洗工具输出

### 客户端 SHOULD：
- 敏感操作前提示用户确认
- 调用前展示工具输入（防数据泄露）
- 验证工具结果
- 实现超时机制
- 记录工具使用日志
