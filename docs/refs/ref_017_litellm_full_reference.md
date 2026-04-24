# ref_017 — LiteLLM 全景参考（本项目技术栈核心）

> 对应任务：A1-A4 + B1-B4 全阶段
> 来源：https://docs.litellm.ai/docs/（官方文档多页汇总）
> 可信度：★★★★★ 官方文档
> 最后访问：2026-04-22

---

## 1. LiteLLM 在本项目中的定位

```
AgentHub chat.py
      ↓ acompletion()
   LiteLLM        ← 统一多模型调用层（你唯一需要面对的 API）
      ↓
┌─────┼─────┬──────┬──────┐
OpenAI Zhipu DeepSeek Ollama ...  ← 各厂商 API 格式差异由 LiteLLM 屏蔽
```

**核心原则**：本项目所有 LLM 调用都走 `litellm.acompletion()`，不直接调任何厂商 SDK。

---

## 2. acompletion 完整参数

```python
from litellm import acompletion

response = await acompletion(
    # ── 必填 ──
    model="gpt-4o-mini",              # LiteLLM 模型名（见 §3）
    messages=[                         # OpenAI messages 格式
        {"role": "system", "content": "..."},
        {"role": "user", "content": "..."},
    ],

    # ── 认证 ──
    api_key="sk-xxx",                  # 厂商 API Key（明文，用完即丢）
    api_base="https://api.xxx.com/v1", # 可选，非 OpenAI 原生时需要

    # ── 生成参数 ──
    temperature=0.7,                   # 0.0-2.0
    max_tokens=2048,                   # 最大输出 tokens
    top_p=1.0,                         # nucleus sampling
    stop=["\nUser:"],                  # 停止词

    # ── 流式 ──
    stream=True,                       # True = SSE 流式

    # ── 工具调用（v0.3 / B2）──
    tools=[                            # OpenAI function 格式
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "...",
                "parameters": { "type": "object", "properties": {...} }
            }
        }
    ],
    tool_choice="auto",                # auto | none | required | {"function": {"name": "xxx"}}

    # ── 结构化输出 ──
    # response_format={"type": "json_object"},  # JSON 模式

    # ── 超时 ──
    timeout=30,                        # 秒
)
```

---

## 3. 模型命名规则

| 格式 | 适用厂商 | 示例 |
|---|---|---|
| `gpt-4o-mini` | OpenAI 原生 | 直接写模型名 |
| `openai/glm-4.5` | OpenAI 兼容端点 | `openai/` 前缀 + api_base |
| `openai/moonshot-v1-8k` | Moonshot | 同上 |
| `ollama_chat/llama3.2` | Ollama 本地 | `ollama_chat/` 走 /api/chat |
| `ollama/llama3.2` | Ollama 本地 | `ollama/` 走 /api/generate |
| `deepseek/deepseek-chat` | DeepSeek | 厂商名/模型名 |
| `claude-3-5-sonnet-20241022` | Anthropic 原生 | 直接写 |

**本项目用过的**：
- `openai/glm-4.5`（智谱，已测通）
- `gpt-4o-mini`（OpenAI）

---

## 4. 响应结构

### 4.1 非流式

```python
response = await acompletion(model="gpt-4o", messages=messages, stream=False)

# response 是 litellm.ModelResponse 对象
response.id                    # "chatcmpl-xxx"
response.model                 # "gpt-4o-2024-08-06"
response.choices[0].message.content          # "Hello!"
response.choices[0].message.role             # "assistant"
response.choices[0].finish_reason            # "stop" | "tool_calls" | "length"
response.choices[0].message.tool_calls       # list[ChatCompletionMessageToolCall] | None
response.usage.prompt_tokens                 # int
response.usage.completion_tokens             # int
response.usage.total_tokens                  # int

# LiteLLM 扩展
response._hidden_params["response_cost"]     # float（美元）
```

### 4.2 流式

```python
response = await acompletion(model="gpt-4o", messages=messages, stream=True)

async for chunk in response:
    delta = chunk.choices[0].delta
    delta.content              # 文本增量（可能为 None）
    delta.tool_calls           # 工具调用增量（可能为 None）
    chunk.choices[0].finish_reason  # 最后一个 chunk 非 None
```

### 4.3 流式 tool_calls 增量拼接

```python
tool_calls_accum = {}  # index -> {id, name, arguments}

async for chunk in response:
    delta = chunk.choices[0].delta
    if delta.tool_calls:
        for tc in delta.tool_calls:
            idx = tc.index
            if idx not in tool_calls_accum:
                tool_calls_accum[idx] = {"id": tc.id, "name": "", "arguments": ""}
            if tc.function and tc.function.name:
                tool_calls_accum[idx]["name"] = tc.function.name
            if tc.function and tc.function.arguments:
                tool_calls_accum[idx]["arguments"] += tc.function.arguments
```

---

## 5. Token 计数（A1 多轮对话需要）

```python
import litellm

# 方法 1：计算 messages 的 token 数
count = litellm.token_counter(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Hello"},
    ]
)

# 方法 2：编码/解码
tokens = litellm.encode(model="gpt-4o-mini", text="Hello world")
text = litellm.decode(model="gpt-4o-mini", tokens=tokens)

# 方法 3：获取模型最大 tokens
max_tokens = litellm.get_max_tokens("gpt-4o-mini")  # 16384
```

**用于 A1 token 预算截断**：
```python
def build_messages_with_budget(system, history, user_msg, model, max_input=4000):
    msgs = [{"role": "system", "content": system}]
    current = litellm.token_counter(model=model, messages=msgs)
    for m in reversed(history):
        msg = {"role": m.role, "content": m.content}
        t = litellm.token_counter(model=model, messages=[msg])
        if current + t > max_input:
            break
        msgs.insert(1, msg)
        current += t
    msgs.append({"role": "user", "content": user_msg})
    return msgs
```

---

## 6. 费用计算（B3 调用统计需要）

```python
import litellm

# 方法 1：从 response 中直接读
response = await acompletion(model="gpt-4o", messages=messages)
cost = response._hidden_params["response_cost"]  # 美元，如 0.000015

# 方法 2：手动计算
from litellm import cost_per_token
prompt_cost, completion_cost = cost_per_token(
    model="gpt-4o-mini",
    prompt_tokens=100,
    completion_tokens=50,
)

# 方法 3：从 prompt + completion 字符串算
from litellm import completion_cost
cost = completion_cost(
    model="gpt-4o-mini",
    prompt="Hello",
    completion="Hi there!"
)

# 方法 4：查看模型定价
from litellm import model_cost
info = model_cost["gpt-4o-mini"]
# {'max_tokens': 16384, 'input_cost_per_token': 1.5e-07, 'output_cost_per_token': 6e-07, ...}
```

**用于 B3 CallLog**：
```python
# chat.py finally 块中
usage = getattr(response, "usage", None)
cost = getattr(response, "_hidden_params", {}).get("response_cost", 0)

call_log = CallLog(
    user_id=user.id,
    agent_id=agent_id,
    model=agent.model,
    prompt_tokens=getattr(usage, "prompt_tokens", 0) if usage else 0,
    completion_tokens=getattr(usage, "completion_tokens", 0) if usage else 0,
    cost_usd=cost,  # 新增字段
    duration_ms=duration_ms,
    status=status,
)
```

---

## 7. 模型能力检测

```python
import litellm

# 是否支持 function calling
litellm.supports_function_calling(model="gpt-4o")           # True
litellm.supports_function_calling(model="ollama/llama3.2")   # False（需 ollama_chat/）
litellm.supports_function_calling(model="openai/glm-4.5")    # True

# 是否支持并行 function calling
litellm.supports_parallel_function_calling(model="gpt-4o")   # True

# 是否支持 JSON schema 输出
litellm.supports_response_schema(model="gpt-4o")             # True

# 获取模型支持的 OpenAI 参数
litellm.get_supported_openai_params(model="gpt-4o")
# ['temperature', 'max_tokens', 'tools', 'tool_choice', 'response_format', ...]
```

---

## 8. Callback 系统（B3 可选方案）

LiteLLM 内置 callback 机制，可以在每次 completion 后自动触发：

```python
import litellm

# 设置成功/失败回调
litellm.success_callback = ["langfuse"]  # 内置集成
litellm.failure_callback = ["sentry"]

# 自定义回调（最适合本项目）
from litellm import CustomLogger

class AgentHubLogger(CustomLogger):
    def log_success_event(self, kwargs, response_obj, start_time, end_time):
        """每次成功调用后触发"""
        model = kwargs.get("model", "")
        usage = getattr(response_obj, "usage", None)
        cost = getattr(response_obj, "_hidden_params", {}).get("response_cost", 0)
        duration = (end_time - start_time) * 1000
        # 写入 call_logs 表
        ...

    def log_failure_event(self, kwargs, response_obj, start_time, end_time):
        """每次失败调用后触发"""
        ...

litellm.callbacks = [AgentHubLogger()]
```

**注意**：callback 是全局的，且异步写 DB 需要自己处理事件循环。对于本项目，**方案 A（chat.py 中手动记录）更简单可控**。callback 适合需要跨多个调用点统一日志的场景。

---

## 9. 错误处理

```python
from litellm import acompletion
import litellm.exceptions

try:
    response = await acompletion(model="gpt-4o", messages=messages)
except litellm.exceptions.AuthenticationError as e:
    # API Key 无效
    print(f"Auth failed: {e}")
except litellm.exceptions.RateLimitError as e:
    # 限速
    print(f"Rate limited: {e}")
except litellm.exceptions.ContextWindowExceededError as e:
    # 超出 context window（A1 多轮需要注意）
    print(f"Context too long: {e}")
except litellm.exceptions.ServiceUnavailableError as e:
    # 服务不可用
    print(f"Service unavailable: {e}")
except litellm.exceptions.Timeout as e:
    # 超时
    print(f"Timeout: {e}")
except Exception as e:
    # 其他错误
    print(f"Unknown: {type(e).__name__}: {e}")
```

**本项目的处理方式**（chat.py:100-102）：
```python
except Exception as exc:
    err = {"error": type(exc).__name__, "message": str(exc)}
    yield f"data: {json.dumps(err)}\n\n"
```

---

## 10. 与本项目各任务的关联速查

| 任务 | 涉及的 LiteLLM 能力 | Ref |
|---|---|---|
| A1 多轮 | `token_counter()` 预算截断 | §5 |
| A2 Chat UX | `stream=True` + response 结构 | §4 |
| A3 Dashboard | `response.usage` 统计 | §4.1 |
| A4 Key 测试 | `acompletion(model, api_key, max_tokens=5)` | §2 |
| B1 API Token | 不涉及 LiteLLM，纯认证层 | - |
| B2 MCP | `tools=[...]` + `tool_choice` + tool_calls 解析 | §2 + §4.3 |
| B3 调用统计 | `_hidden_params["response_cost"]` + `usage` | §6 |
| B4 论文素材 | 不涉及 LiteLLM | - |

---

## 11. 关键环境变量

```bash
# .env 中已有的
FERNET_KEY=xxx          # 加密 Key
JWT_SECRET=xxx          # JWT 密钥

# LiteLLM 相关（按需设置）
OPENAI_API_KEY=sk-xxx   # 如果用 OpenAI 原生
LITELLM_LOG=DEBUG       # 开启 LiteLLM 调试日志
LITELLM_LOCAL_MODEL_COST_MAP=True  # 离线模式，不拉取远程定价
```
