---
tags:
  - litellm
  - ai-gateway
  - llm-proxy
  - streaming
  - tool-calling
  - reasoning
  - context-window
aliases:
  - LiteLLM AI 网关参考文档
created: 2026-04-22
updated: 2026-04-22
status: active
---

> [!abstract] 概述
> LiteLLM 是一个开源的 AI 网关/代理服务器，提供统一接口调用 100+ LLM 提供商。支持流式响应、工具调用、思考过程、上下文计算、成本追踪等功能。

## 项目信息

- **官网**：https://www.litellm.ai
- **GitHub**：https://github.com/BerriAI/litellm
- **Stars**：44.2k+
- **协议**：MIT
- **技术栈**：Python SDK + Proxy Server (AI Gateway)

## 核心功能

| 功能 | 说明 |
|------|------|
| **统一 API** | 100+ LLM 使用 OpenAI 格式调用 |
| **流式响应** | SSE 流式输出，支持所有提供商 |
| **工具调用** | OpenAI 格式的 function calling |
| **思考过程** | Responses API 支持 reasoning_content |
| **上下文计算** | 自动 token 计数和成本追踪 |
| **负载均衡** | 多部署点路由和故障转移 |
| **虚拟密钥** | 细粒度访问控制和预算管理 |
| **MCP 支持** | Model Context Protocol 集成 |

## 支持的提供商

### 主要提供商

| 提供商 | 模型前缀 | 支持功能 |
|--------|----------|----------|
| **OpenAI** | `openai/` | 全功能 |
| **Anthropic** | `anthropic/` | 全功能 |
| **Google Gemini** | `gemini/` | 全功能 |
| **Azure OpenAI** | `azure/` | 全功能 |
| **AWS Bedrock** | `bedrock/` | 全功能 |
| **Vertex AI** | `vertex_ai/` | 全功能 |
| **智谱 AI (Z.AI)** | `zai/` | 全功能 |

### 智谱 AI 模型

| 模型 | 上下文窗口 | 特性 |
|------|-----------|------|
| `glm-4.7` | 200K | **最新旗舰**，支持 Reasoning |
| `glm-4.6` | 200K | - |
| `glm-4.5` | 128K | - |
| `glm-4.5v` | 128K | 视觉模型 |
| `glm-4.5-air` | 128K | 轻量版 |
| `glm-4.5-flash` | 128K | **免费** |

## SDK 使用

### 基础调用

```python
from litellm import completion
import os

os.environ['ZAI_API_KEY'] = 'your-api-key'

# 智谱 AI
response = completion(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)

# OpenAI
response = completion(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 流式响应

```python
response = completion(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Responses API (支持 Reasoning)

```python
from litellm import responses

# 非流式
response = responses(
    model="zai/glm-4.7",
    input="What is the capital of France?",
    reasoning_effort="medium"
)

print(response.choices[0].message.content)  # 回复内容
print(response.choices[0].message.reasoning_content)  # 思考过程

# 流式
response = responses(
    model="zai/glm-4.7",
    input="What is the capital of France?",
    stream=True
)

for event in response:
    print(event)
```

## 流式响应格式 (SSE)

### Chat Completions 格式

```json
{
    "id": "chatcmpl-xxx",
    "created": 1734366925,
    "model": "glm-4.7",
    "object": "chat.completion.chunk",
    "choices": [{
        "finish_reason": null,
        "index": 0,
        "delta": {
            "content": "Hello",
            "role": "assistant",
            "tool_calls": null
        }
    }]
}
```

### Responses API 格式

```json
{
    "type": "response.output_text.delta",
    "delta": "Hello",
    "response_id": "resp_xxx"
}
```

### WebSocket 模式事件类型

| 事件类型 | 说明 |
|----------|------|
| `response.created` | 响应生成开始 |
| `response.in_progress` | 响应正在生成 |
| `response.output_item.added` | 新输出项添加 |
| `response.output_text.delta` | 增量文本块 |
| `response.output_text.done` | 文本输出完成 |
| `response.completed` | 完整响应完成 |
| `response.failed` | 响应生成失败 |
| `error` | 发生错误 |

## 工具调用 (Tool Calling)

### 基础工具定义

```python
from litellm import completion

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取指定位置的天气",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "城市名称"
                },
                "unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "default": "celsius"
                }
            },
            "required": ["location"]
        }
    }
}]

response = completion(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "北京天气怎么样？"}],
    tools=tools
)

# 处理工具调用
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    print(f"Tool: {tool_call.function.name}")
    print(f"Args: {tool_call.function.arguments}")
```

### 流式工具调用

```python
response = completion(
    model="zai/gpt-4o",
    messages=[{"role": "user", "content": "北京天气怎么样？"}],
    tools=tools,
    stream=True
)

tool_calls = []
for chunk in response:
    if chunk.choices[0].delta.tool_calls:
        for tool_call in chunk.choices[0].delta.tool_calls:
            if tool_call.index >= len(tool_calls):
                tool_calls.append({
                    "id": tool_call.id,
                    "type": "function",
                    "function": {"name": "", "arguments": ""}
                })
            
            if tool_call.function.name:
                tool_calls[tool_call.index]["function"]["name"] = tool_call.function.name
            if tool_call.function.arguments:
                tool_calls[tool_call.index]["function"]["arguments"] += tool_call.function.arguments
```

### MCP 工具集成

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from litellm import experimental_mcp_client
import litellm

server_params = StdioServerParameters(
    command="python",
    args=["mcp_server.py"]
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        
        # 加载 MCP 工具
        tools = await experimental_mcp_client.load_mcp_tools(
            session=session,
            format="openai"
        )
        
        # 使用工具
        response = await litellm.acompletion(
            model="zai/glm-4.7",
            messages=[{"role": "user", "content": "What's 3 + 5?"}],
            tools=tools
        )
```

## 思考过程 (Reasoning)

### 使用 Responses API

```python
from litellm import responses

# 获取思考过程
response = responses(
    model="zai/glm-4.7",
    input="解释量子计算",
    reasoning_effort="medium"  # low, medium, high
)

# 访问思考内容
for item in response.output:
    if item.type == "reasoning":
        print(f"思考过程: {item.content}")
    elif item.type == "message":
        print(f"回复: {item.content}")
```

### 流式思考过程

```python
response = responses(
    model="zai/glm-4.7",
    input="解释量子计算",
    stream=True,
    reasoning_effort="medium"
)

reasoning_content = ""
text_content = ""

for event in response:
    if event.type == "response.reasoning.delta":
        reasoning_content += event.delta
        print(f"思考中: {event.delta}", end="")
    elif event.type == "response.output_text.delta":
        text_content += event.delta
        print(f"回复: {event.delta}", end="")
```

## 上下文窗口计算

### Token 计数

```python
import litellm

# 获取模型信息
model_info = litellm.get_model_info("zai/glm-4.7")
print(f"上下文窗口: {model_info['max_tokens']}")
print(f"输入价格: ${model_info['input_cost_per_token']}/token")
print(f"输出价格: ${model_info['output_cost_per_token']}/token")

# 计算消息的 token 数
from litellm import token_counter

num_tokens = token_counter(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(f"Token 数: {num_tokens}")
```

### 成本追踪

```python
import litellm

# 启用成本追踪
litellm.success_callback = ["langfuse"]

response = completion(
    model="zai/glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)

# 获取成本
print(f"总 Token: {response.usage.total_tokens}")
print(f"成本: ${response._hidden_params.get('response_cost', 0)}")
```

## Proxy Server 配置

### 基础配置

```yaml
# config.yaml
model_list:
  - model_name: glm-4.7
    litellm_params:
      model: zai/glm-4.7
      api_key: os.environ/ZAI_API_KEY
  
  - model_name: glm-4.5-flash
    litellm_params:
      model: zai/glm-4.5-flash
      api_key: os.environ/ZAI_API_KEY

litellm_settings:
  master_key: sk-1234
  database_url: postgres://
```

### 启动 Proxy

```bash
# CLI 启动
litellm --config config.yaml

# Docker 启动
docker run \
  -v $(pwd)/config.yaml:/app/config.yaml \
  -e ZAI_API_KEY=your-key \
  -p 4000:4000 \
  docker.litellm.ai/berriai/litellm:main-latest \
  --config /app/config.yaml
```

### 使用 OpenAI SDK 访问

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-1234",
    base_url="http://localhost:4000"
)

# Chat Completions
response = client.chat.completions.create(
    model="glm-4.7",
    messages=[{"role": "user", "content": "Hello!"}]
)

# Responses API
response = client.responses.create(
    model="glm-4.7",
    input="Hello!"
)
```

## 与 Gateway Manager 集成

### 后端集成方案

```python
# app/api/litellm_gateway.py
from litellm import acompletion
from typing import AsyncGenerator

class LiteLLMGateway:
    def __init__(self, api_key: str, base_url: str = None):
        self.api_key = api_key
        self.base_url = base_url
    
    async def chat_stream(
        self,
        model: str,
        messages: list,
        tools: list = None
    ) -> AsyncGenerator[str, None]:
        """流式聊天"""
        response = await acompletion(
            model=model,
            messages=messages,
            tools=tools,
            stream=True
        )
        
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    async def chat_with_reasoning(
        self,
        model: str,
        messages: list
    ) -> dict:
        """带思考过程的聊天"""
        from litellm import aresponses
        
        response = await aresponses(
            model=model,
            input=messages,
            reasoning_effort="medium"
        )
        
        return {
            "content": response.choices[0].message.content,
            "reasoning": response.choices[0].message.reasoning_content,
            "usage": response.usage
        }
```

### SSE 事件转换

```python
# 将 LiteLLM 流转换为 assistant-ui 兼容格式
async def to_assistant_ui_stream(litellm_stream):
    """转换为 assistant-ui 兼容的流式事件"""
    async for chunk in litellm_stream:
        if chunk.choices[0].delta.content:
            yield {
                "type": "text",
                "content": chunk.choices[0].delta.content
            }
        if chunk.choices[0].delta.tool_calls:
            for tc in chunk.choices[0].delta.tool_calls:
                yield {
                    "type": "tool_call",
                    "tool_name": tc.function.name,
                    "tool_call_id": tc.id,
                    "args": json.loads(tc.function.arguments)
                }
```

## 上下文窗口管理

### 智能上下文截断

```python
from litellm import token_counter

def truncate_messages(
    messages: list,
    model: str,
    max_tokens: int = None
) -> list:
    """智能截断消息以适应上下文窗口"""
    if max_tokens is None:
        model_info = litellm.get_model_info(model)
        max_tokens = model_info['max_tokens'] - 1000  # 保留输出空间
    
    total_tokens = token_counter(model=model, messages=messages)
    
    if total_tokens <= max_tokens:
        return messages
    
    # 保留系统消息和最近的消息
    result = []
    system_msgs = [m for m in messages if m['role'] == 'system']
    other_msgs = [m for m in messages if m['role'] != 'system']
    
    result.extend(system_msgs)
    
    # 从后向前添加消息
    for msg in reversed(other_msgs):
        test_tokens = token_counter(
            model=model,
            messages=result + [msg]
        )
        if test_tokens <= max_tokens:
            result.insert(len(system_msgs), msg)
        else:
            break
    
    return result
```

## 异常处理

```python
import litellm
from litellm import completion

try:
    response = completion(
        model="zai/glm-4.7",
        messages=[{"role": "user", "content": "Hello!"}]
    )
except litellm.AuthenticationError as e:
    print(f"认证失败: {e}")
except litellm.RateLimitError as e:
    print(f"速率限制: {e}")
except litellm.APIError as e:
    print(f"API 错误: {e}")
except litellm.ContextWindowExceededError as e:
    print(f"上下文超出: {e}")
```

## 参考链接

- [LiteLLM 官方文档](https://docs.litellm.ai)
- [GitHub 仓库](https://github.com/BerriAI/litellm)
- [支持的提供商](https://docs.litellm.ai/docs/providers)
- [Responses API 文档](https://docs.litellm.ai/docs/response_api)
- [Proxy Server 配置](https://docs.litellm.ai/docs/simple_proxy)
- [智谱 AI 集成](https://docs.litellm.ai/docs/providers/zai)

## 完整文档导航

### 核心 API

| 端点 | 说明 | 链接 |
|------|------|------|
| `/chat/completions` | 聊天补全 (SSE 流式) | [docs](https://docs.litellm.ai/docs/completion) |
| `/responses` | Responses API (Reasoning) | [docs](https://docs.litellm.ai/docs/response_api) |
| `/responses/compact` | 上下文压缩 | [docs](https://docs.litellm.ai/docs/response_api_compact) |
| `/embeddings` | 向量嵌入 | [docs](https://docs.litellm.ai/docs/embedding/supported_embedding) |
| `/images` | 图片生成 | [docs](https://docs.litellm.ai/docs/image_generation) |
| `/audio/transcriptions` | 语音转文字 | [docs](https://docs.litellm.ai/docs/audio_transcription) |
| `/audio/speech` | 文字转语音 | [docs](https://docs.litellm.ai/docs/text_to_speech) |
| `/rerank` | 重排序 | [docs](https://docs.litellm.ai/docs/rerank) |
| `/mcp` | MCP 协议集成 | [docs](https://docs.litellm.ai/docs/mcp) |
| `/realtime` | 实时语音 | [docs](https://docs.litellm.ai/docs/realtime) |
| `/batches` | 批处理 | [docs](https://docs.litellm.ai/docs/batches) |
| `/assistants` | Assistants API | [docs](https://docs.litellm.ai/docs/assistants) |

### SDK 函数

| 函数 | 说明 |
|------|------|
| `completion()` | 聊天补全 |
| `responses()` | Responses API (Reasoning) |
| `embedding()` | 向量嵌入 |
| `text_completion()` | 文本补全 |
| `image_generation()` | 图片生成 |
| `transcription()` | 语音转文字 |
| `speech()` | 文字转语音 |
| `compress()` | Prompt 压缩 |

### Proxy Server 高级功能

| 功能 | 说明 |
|------|------|
| **虚拟密钥** | 细粒度访问控制和预算管理 |
| **负载均衡** | 多部署点路由 |
| **故障转移** | 自动重试和 fallback |
| **成本追踪** | 按项目/用户/团队追踪花费 |
| **Guardrails** | 输入/输出安全护栏 |
| **缓存** | 响应缓存减少重复调用 |
| **MCP Gateway** | MCP 服务器集成 |
| **流量镜像** | A/B 测试 |
| **自动路由** | 智能选择模型 |
| **预算路由** | 基于预算的提供商选择 |
| **标签路由** | 基于标签的模型选择 |
| **健康检查** | 基于健康状态的路由 |

### 故障排除

| 主题 | 链接 |
|------|------|
| 成本差异调试 | [docs](https://docs.litellm.ai/docs/troubleshoot/cost_discrepancy) |
| MCP 故障排除 | [docs](https://docs.litellm.ai/docs/mcp_troubleshoot) |
| 性能/延迟优化 | [docs](https://docs.litellm.ai/docs/troubleshoot/ui_issues) |
| UI 故障排除 | [docs](https://docs.litellm.ai/docs/troubleshoot/ui_issues) |
| 安全回滚指南 | [docs](https://docs.litellm.ai/docs/troubleshoot/rollback) |
| 问题报告 | [docs](https://docs.litellm.ai/docs/troubleshoot) |

## 与 assistant-ui 集成架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      React 前端                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          assistant-ui (Thread + Reasoning + Tool)         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ChatModelAdapter (适配器层)                   │   │
│  │  - 将 assistant-ui 消息格式 → LiteLLM 请求格式            │   │
│  │  - 将 LiteLLM SSE 流 → assistant-ui content parts         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                           ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────────┐
│                      后端 (FastAPI)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    LiteLLM Gateway                        │   │
│  │  - 统一 OpenAI 格式接口                                    │   │
│  │  - SSE 流式输出                                            │   │
│  │  - 工具调用 (Tool Calling)                                 │   │
│  │  - 思考过程 (Reasoning)                                    │   │
│  │  - 上下文窗口管理                                          │   │
│  │  - 成本追踪                                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐           │
│  │ 智谱AI  │ OpenAI  │Anthropic│ Gemini  │  其他   │           │
│  │ zai/    │ openai/ │anthropic│ gemini/ │  ...    │           │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## 智谱 AI 详细配置

### 环境变量

```bash
ZAI_API_KEY=your-zai-api-key
```

### 支持的模型

| 模型 | 代码 | 上下文 | 价格 (Input/Output per 1M tokens) | 特性 |
|------|------|--------|----------------------------------|------|
| glm-4.7 | `zai/glm-4.7` | 200K | $0.60 / $2.20 | **最新旗舰**, Reasoning |
| glm-4.6 | `zai/glm-4.6` | 200K | $0.60 / $2.20 | - |
| glm-4.5 | `zai/glm-4.5` | 128K | $0.60 / $2.20 | - |
| glm-4.5v | `zai/glm-4.5v` | 128K | $0.60 / $1.80 | 视觉模型 |
| glm-4.5-x | `zai/glm-4.5-x` | 128K | $2.20 / $8.90 | 高级版 |
| glm-4.5-air | `zai/glm-4.5-air` | 128K | $0.20 / $1.10 | 轻量版 |
| glm-4.5-airx | `zai/glm-4.5-airx` | 128K | $1.10 / $4.50 | 快速轻量 |
| glm-4-32b-0414-128k | `zai/glm-4-32b-0414-128k` | 128K | $0.10 / $0.10 | 32B |
| glm-4.5-flash | `zai/glm-4.5-flash` | 128K | **免费** | 免费层 |

### Proxy 配置

```yaml
model_list:
  - model_name: glm-4.7
    litellm_params:
      model: zai/glm-4.7
      api_key: os.environ/ZAI_API_KEY
  
  - model_name: glm-4.5-flash
    litellm_params:
      model: zai/glm-4.5-flash
      api_key: os.environ/ZAI_API_KEY
```

## WebSocket 模式 (低延迟)

LiteLLM 支持 WebSocket 模式，适用于需要低延迟的 Agent 工作流：

| 提供商 | WebSocket 模式 | 说明 |
|--------|---------------|------|
| OpenAI | Native | 直接 wss:// 连接 |
| Azure | Native | 直接 wss:// 连接 |
| Anthropic | Managed | HTTP 流式 over WebSocket |
| 智谱AI | Managed | HTTP 流式 over WebSocket |
| Gemini | Managed | HTTP 流式 over WebSocket |

### WebSocket 事件类型

| 事件 | 说明 |
|------|------|
| `response.created` | 响应开始 |
| `response.in_progress` | 响应生成中 |
| `response.output_text.delta` | 增量文本 |
| `response.output_text.done` | 文本完成 |
| `response.completed` | 响应完成 |
| `response.failed` | 响应失败 |
| `error` | 错误 |

## 相关笔记

- [assistant-ui 集成指南](../ai/assistant-ui集成指南.md)
- [LiteLLM 集成指南](../ai/litellm集成指南.md)
- [流式输出与AI聊天UI.md](../ai/流式输出与AI聊天UI.md)
