# ref_004 — LiteLLM Tool Calling / Function Calling

> 来源：https://docs.litellm.ai/docs/completion/function_call
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. 核心概念

LiteLLM 统一了不同 LLM 厂商的 function calling 接口，遵循 OpenAI 格式。

### 1.1 检查模型支持

```python
import litellm

# 是否支持 function calling
assert litellm.supports_function_calling(model="gpt-4o") == True
assert litellm.supports_function_calling(model="openai/glm-4.5") == True
assert litellm.supports_function_calling(model="ollama/llama2") == False

# 是否支持并行 function calling
assert litellm.supports_parallel_function_calling(model="gpt-4-turbo") == True
```

---

## 2. 完整 Tool Call 流程

### Step 1: 发送 tools 定义

```python
import litellm, json

messages = [{"role": "user", "content": "What's the weather in Tokyo?"}]

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather in a given location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        },
    }
]

response = litellm.completion(
    model="gpt-4o",
    messages=messages,
    tools=tools,
    tool_choice="auto",  # auto | none | required | {"type": "function", "function": {"name": "xxx"}}
)
```

### Step 2: 解析 LLM 响应

```python
response_message = response.choices[0].message
tool_calls = response_message.tool_calls

# tool_calls 是一个列表，可能包含多个并行调用
for tc in tool_calls:
    print(tc.id)                    # "call_xxx"
    print(tc.function.name)         # "get_current_weather"
    print(tc.function.arguments)    # '{"location": "Tokyo", "unit": "celsius"}'
```

### Step 3: 执行函数 + 第二次调用

```python
# 把 assistant 的回复（含 tool_calls）追加到 messages
messages.append(response_message)

for tool_call in tool_calls:
    function_name = tool_call.function.name
    function_args = json.loads(tool_call.function.arguments)

    # 执行本地函数
    result = get_current_weather(**function_args)

    # 把执行结果追加为 tool message
    messages.append({
        "tool_call_id": tool_call.id,
        "role": "tool",
        "name": function_name,
        "content": json.dumps(result),
    })

# 第二次 completion，LLM 看到工具结果后生成最终回复
second_response = litellm.completion(model="gpt-4o", messages=messages)
print(second_response.choices[0].message.content)
```

---

## 3. Tool Choice 选项

| 值 | 行为 |
|---|---|
| `"auto"` | LLM 自主决定是否调用工具（默认） |
| `"none"` | 强制不调用工具 |
| `"required"` | 强制调用至少一个工具 |
| `{"type": "function", "function": {"name": "xxx"}}` | 强制调用指定工具 |

---

## 4. 异步 + 流式 Tool Call

```python
import litellm
import asyncio

async def async_tool_call():
    messages = [{"role": "user", "content": "Weather in Paris?"}]
    tools = [...]

    # 流式模式下的 tool call
    response = await litellm.acompletion(
        model="gpt-4o",
        messages=messages,
        tools=tools,
        stream=True,
    )

    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta.tool_calls:
            for tc in delta.tool_calls:
                # 流式返回时 tool call 信息是增量的
                print(f"Tool: {tc.function.name}, Args chunk: {tc.function.arguments}")

asyncio.run(async_tool_call())
```

### 流式 Tool Call 的特殊处理

流式返回时，`tool_calls` 是**增量拼接**的：
- 第一个 chunk 可能只有 `function.name`
- 后续 chunk 逐步拼接 `function.arguments`
- 需要手动合并：

```python
# 收集流式 tool call 的增量数据
tool_call_chunks = {}  # index -> {id, name, arguments}

async for chunk in response:
    delta = chunk.choices[0].delta
    if delta.tool_calls:
        for tc in delta.tool_calls:
            idx = tc.index
            if idx not in tool_call_chunks:
                tool_call_chunks[idx] = {"id": tc.id, "name": "", "arguments": ""}
            if tc.function.name:
                tool_call_chunks[idx]["name"] = tc.function.name
            if tc.function.arguments:
                tool_call_chunks[idx]["arguments"] += tc.function.arguments
```

---

## 5. Tool Call 循环（Agent 模式）

LLM 可能连续调用多轮工具，需要循环处理：

```python
import litellm
import json

MAX_TOOL_ROUNDS = 5

async def agent_loop(messages, tools, model="gpt-4o"):
    for round_num in range(MAX_TOOL_ROUNDS):
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            tools=tools,
        )

        msg = response.choices[0].message

        if not msg.tool_calls:
            # LLM 不再需要调用工具，返回最终回复
            return msg.content

        # 执行工具调用
        messages.append(msg)
        for tc in msg.tool_calls:
            result = await execute_tool(tc.function.name, json.loads(tc.function.arguments))
            messages.append({
                "tool_call_id": tc.id,
                "role": "tool",
                "name": tc.function.name,
                "content": json.dumps(result),
            })

    # 超过最大轮次
    return "Tool call limit reached"
```

---

## 6. function_to_dict 辅助函数

从 Python 函数 docstring 自动生成工具定义：

```python
import litellm

def get_current_weather(location: str, unit: str = "celsius"):
    """Get the current weather in a given location

    Parameters
    ----------
    location : str
        The city name
    unit : {'celsius', 'fahrenheit'}
        Temperature unit
    """
    pass

tool_def = litellm.utils.function_to_dict(get_current_weather)
print(tool_def)
# {
#   "name": "get_current_weather",
#   "description": "Get the current weather in a given location",
#   "parameters": {
#     "type": "object",
#     "properties": {
#       "location": {"type": "string", "description": "The city name"},
#       "unit": {"type": "string", "enum": ["fahrenheit", "celsius"]}
#     },
#     "required": ["location", "unit"]
#   }
# }
```

---

## 7. 不支持 Function Calling 的模型降级

```python
import litellm

# 将 function 注入 prompt（降级方案）
litellm.add_function_to_prompt = True

response = litellm.completion(
    model="claude-2",  # 或其他不支持原生 function calling 的模型
    messages=messages,
    functions=functions,  # 旧格式
)
```

---

## 8. 对本项目 v0.3 的集成要点

### 8.1 MCP Schema → LiteLLM tools 转换

```python
def convert_mcp_tools_to_litellm(mcp_tools: list[dict]) -> list[dict]:
    """将 MCP tools/list 返回的工具定义转为 LiteLLM tools 格式"""
    litellm_tools = []
    for tool in mcp_tools:
        litellm_tools.append({
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool.get("description", ""),
                "parameters": tool["inputSchema"],
            }
        })
    return litellm_tools
```

### 8.2 在 chat.py 中集成

```python
# 现有 _common_kwargs() 中添加 tools 参数
kwargs = _common_kwargs(agent, key)
kwargs["tools"] = convert_mcp_tools_to_litellm(agent_tools)

# SSE 流式中检测 tool_calls
if delta.tool_calls:
    # 发送 tool_call_start 事件
    yield f"data: {json.dumps({'tool_call_start': {...}})}\n\n"
```

### 8.3 需要注意的问题

| 问题 | 解决方案 |
|---|---|
| 流式 tool_call 增量拼接 | 在后端拼接完整后再转发 MCP Server |
| tool_call 循环可能很慢 | 设 MAX_TOOL_ROUNDS=5，SSE 中流式推送进度 |
| MCP Server 不可用 | 超时处理 + 返回错误给 LLM |
| Tool Schema 兼容性 | MCP JSON Schema ≈ OpenAI JSON Schema，直接透传 |
