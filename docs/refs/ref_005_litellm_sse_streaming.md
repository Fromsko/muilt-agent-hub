# ref_005 — LiteLLM 流式 + SSE 集成

> 来源：https://docs.litellm.ai/docs/completion/stream
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

> 补充来源：本项目 `app/routers/chat.py`（已有实现）
> 可信度：★★★★★ 项目源码

---

## 1. LiteLLM 流式基础

### 1.1 同步流式

```python
from litellm import completion

response = completion(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True,
)
for chunk in response:
    print(chunk.choices[0].delta.content or "", end="")
```

### 1.2 异步流式

```python
from litellm import acompletion

async def stream():
    response = await acompletion(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello"}],
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta.content or ""
        print(delta, end="")
```

### 1.3 合并流式 chunks

```python
import litellm

response = completion(model="gpt-4o", messages=[...], stream=True)
chunks = list(response)
full = litellm.stream_chunk_builder(chunks, messages=messages)
# full 是一个完整的 ModelResponse
```

---

## 2. 本项目现有 SSE 实现

### 2.1 当前 chat.py 的 SSE 模式

```python
# app/routers/chat.py:86-108
async def sse() -> AsyncGenerator[str, None]:
    full = ""
    try:
        response = await acompletion(messages=messages, stream=True, **kwargs)
        async for chunk in response:
            delta = ""
            try:
                delta = chunk.choices[0].delta.content or ""
            except (AttributeError, IndexError):
                delta = ""
            if delta:
                full += delta
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        yield "data: [DONE]\n\n"
    except Exception as exc:
        err = {"error": type(exc).__name__, "message": str(exc)}
        yield f"data: {json.dumps(err)}\n\n"
        yield "data: [DONE]\n\n"
    finally:
        if full:
            await _persist_exchange(agent_id, payload.message, full)

return StreamingResponse(sse(), media_type="text/event-stream")
```

### 2.2 前端 SSE 解析（agenthub.ts）

```typescript
// web/src/api/agenthub.ts:127-180
async *stream(agentId, message, token): AsyncGenerator<string> {
  const resp = await fetch(url, { method: 'POST', headers: {...}, body: JSON.stringify({message, stream: true}) });
  const reader = resp.body.getReader();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, idx).trim();
      if (frame.startsWith('data:')) {
        const payload = frame.slice(5).trim();
        if (payload === '[DONE]') return;
        const obj = JSON.parse(payload);
        if (obj.delta) yield obj.delta;
      }
    }
  }
}
```

---

## 3. 扩展 SSE 协议：支持 Tool Call 事件

### 3.1 现有协议

```
data: {"delta": "Hello"}\n\n
data: {"delta": " world"}\n\n
data: [DONE]\n\n
```

### 3.2 扩展协议（v0.3 需要）

```
data: {"delta": "Let me check the weather"}\n\n
data: {"tool_call_start": {"call_id": "call_abc", "name": "get_weather", "arguments_preview": "{\"city\": \"..."}}\n\n
data: {"tool_call_result": {"call_id": "call_abc", "name": "get_weather", "result": "22°C, sunny"}}\n\n
data: {"delta": "The weather in Tokyo is 22°C and sunny."}\n\n
data: [DONE]\n\n
```

### 3.3 事件类型定义

| 事件 | payload 字段 | 说明 |
|---|---|---|
| 文本增量 | `{delta: string}` | LLM 输出的文本 token |
| 工具调用开始 | `{tool_call_start: {...}}` | LLM 开始调用工具 |
| 工具调用结果 | `{tool_call_result: {...}}` | 工具执行完成，返回结果 |
| 流结束 | `[DONE]` | 对话结束 |
| 错误 | `{error: string, message: string}` | 发生错误 |

---

## 4. 带 Tool Call 的流式处理伪码

```python
async def sse_with_tools() -> AsyncGenerator[str, None]:
    for round_num in range(MAX_TOOL_ROUNDS):
        response = await acompletion(
            messages=messages,
            tools=tools,
            stream=True,
            **kwargs,
        )

        tool_call_chunks = {}  # 收集增量 tool_call

        async for chunk in response:
            delta = chunk.choices[0].delta

            # 文本增量
            if delta.content:
                yield f"data: {json.dumps({'delta': delta.content})}\n\n"

            # tool call 增量
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_call_chunks:
                        tool_call_chunks[idx] = {
                            "id": tc.id,
                            "name": "",
                            "arguments": "",
                        }
                    if tc.function.name:
                        tool_call_chunks[idx]["name"] = tc.function.name
                    if tc.function.arguments:
                        tool_call_chunks[idx]["arguments"] += tc.function.arguments

        # 如果没有 tool call，对话结束
        if not tool_call_chunks:
            yield "data: [DONE]\n\n"
            return

        # 执行 tool calls
        for tc_data in tool_call_chunks.values():
            # 通知前端：工具开始执行
            yield f"data: {json.dumps({'tool_call_start': {'call_id': tc_data['id'], 'name': tc_data['name']}})}\n\n"

            # 调用 MCP Server
            result = await call_mcp_tool(tc_data["name"], json.loads(tc_data["arguments"]))

            # 通知前端：工具执行完成
            result_text = extract_text(result)
            yield f"data: {json.dumps({'tool_call_result': {'call_id': tc_data['id'], 'name': tc_data['name'], 'result': result_text}})}\n\n"

            # 追加到 messages 继续对话
            messages.append({"role": "assistant", "tool_calls": [...]})
            messages.append({"role": "tool", "tool_call_id": tc_data["id"], "content": result_text})

    yield "data: [DONE]\n\n"
```

---

## 5. FastAPI StreamingResponse 注意事项

| 问题 | 解决方案 |
|---|---|
| 响应被缓冲 | `StreamingResponse` 默认不缓冲 |
| 中间件修改响应 | 避免在 SSE 路由上加 `GZipMiddleware` |
| CORS | 需要允许 `text/event-stream` Content-Type |
| 连接超时 | 使用 keep-alive 或心跳 |

```python
from fastapi.responses import StreamingResponse

return StreamingResponse(
    sse(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # 禁用 nginx 缓冲
    },
)
```

---

## 6. 与本项目的关联

| 现有代码 | v0.3 需要修改 |
|---|---|
| `chat.py:86-108` SSE 函数 | 扩展支持 tool_call 事件 |
| `chat.py:48-52` `_build_messages` | 支持多轮 tool call 消息序列 |
| `chat.py:55-64` `_common_kwargs` | 添加 `tools` 参数 |
| `chat.py:67-71` `_persist_exchange` | 需要持久化 tool_call 消息（role=tool） |
| `agenthub.ts:127-180` stream() | 前端解析 `tool_call_start`/`tool_call_result` 事件 |
