# ref_008 — 多轮对话消息组装策略

> 对应任务：A1 多轮对话上下文
> 来源：OpenAI API Messages Format + LangChain Conversational Memory 模式
> 可信度：★★★★☆ 行业通用模式
> 最后访问：2026-04-22

---

## 1. 问题现状

当前 `chat.py:48-52` 的 `_build_messages` 只发送 system + 本轮 user：

```python
def _build_messages(system_content: str, user_message: str) -> list[dict]:
    return [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_message},
    ]
```

**问题**：LLM 看不到历史对话，无法做上下文关联。

---

## 2. OpenAI Messages 格式

```python
messages = [
    {"role": "system", "content": "你是一个客服助手"},      # 系统提示
    {"role": "user", "content": "你好"},                    # 用户第 1 轮
    {"role": "assistant", "content": "你好！有什么可以帮助你的？"},  # 助手第 1 轮
    {"role": "user", "content": "帮我查下订单状态"},          # 用户第 2 轮
    {"role": "assistant", "content": "请提供订单号"},         # 助手第 2 轮
    {"role": "user", "content": "12345"},                   # 用户第 3 轮（当前）
]
```

---

## 3. 多轮策略选项

### 策略 A：滑动窗口（推荐，简单有效）

取最近 N 轮对话 + system prompt：

```python
def _build_messages(
    system_content: str,
    history: list[Message],  # 从 messages 表查出的历史
    user_message: str,
    max_turns: int = 20,     # 最多保留 20 轮（40 条消息）
) -> list[dict]:
    msgs = [{"role": "system", "content": system_content}]

    # history 按时间升序，取最近 max_turns*2 条
    recent = history[-(max_turns * 2):]
    for m in recent:
        msgs.append({"role": m.role, "content": m.content})

    # 追加当前用户消息
    msgs.append({"role": "user", "content": user_message})
    return msgs
```

**优点**：实现简单，延迟低
**缺点**：可能截断关键早期信息

### 策略 B：Token 预算截断（更精确）

按 token 数截断，保留最新的：

```python
import litellm

def _build_messages_with_token_budget(
    system_content: str,
    history: list[Message],
    user_message: str,
    model: str,
    max_input_tokens: int = 4000,
) -> list[dict]:
    msgs = [{"role": "system", "content": system_content}]
    current_tokens = litellm.token_counter(model=model, messages=msgs)

    # 从最新往最旧遍历
    for m in reversed(history):
        msg = {"role": m.role, "content": m.content}
        msg_tokens = litellm.token_counter(model=model, messages=[msg])
        if current_tokens + msg_tokens > max_input_tokens:
            break
        msgs.insert(1, msg)  # 插到 system 后面
        current_tokens += msg_tokens

    msgs.append({"role": "user", "content": user_message})
    return msgs
```

### 策略 C：摘要压缩（高级）

对早期对话生成摘要，替换为单条 system 消息。适合超长会话，但增加一次 LLM 调用成本。

---

## 4. 数据库查询

```python
# 从 messages 表按 agent_id 查询最近 N 条
from sqlmodel import select
from sqlalchemy import desc

async def get_recent_messages(
    session: AsyncSession,
    agent_id: int,
    limit: int = 40,
) -> list[Message]:
    result = await session.execute(
        select(Message)
        .where(Message.agent_id == agent_id)
        .order_by(Message.id.desc())  # 新的在前
        .limit(limit)
    )
    return list(reversed(result.scalars().all()))  # 翻转回时间正序
```

---

## 5. 本项目改动点

| 文件 | 改动 |
|---|---|
| `app/routers/chat.py:48-52` | `_build_messages` 增加 `history` 参数 |
| `app/routers/chat.py:74-83` | `chat()` 入口处查询 history |
| `app/schemas/chat.py` | `ChatRequest` 可选加 `max_turns` 参数 |
| `app/models/message.py` | 无需改动 |

### 改动后核心逻辑

```python
@router.post("/{agent_id}/chat")
async def chat(...):
    agent, prompt, key = await _load_agent_context(agent_id, user, session)

    # 查询历史
    history = await get_recent_messages(session, agent_id, limit=40)

    # 组装多轮消息
    messages = _build_messages(prompt.content, history, payload.message)

    # 后续调用 LiteLLM 不变...
```

---

## 6. 注意事项

| 问题 | 处理方式 |
|---|---|
| 多轮消息超过模型 context window | 策略 B token 预算截断 |
| system prompt 位置 | 始终在 messages 第一条 |
| 非 user/assistant 角色 | messages 表只有 user/assistant，无需处理 |
| 流式模式下的 history 查询 | 在 SSE 开始前查询，不影响流式性能 |
