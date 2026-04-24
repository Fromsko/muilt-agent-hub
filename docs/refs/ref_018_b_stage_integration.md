# ref_018 — B 阶段补充：双轨认证 + 公开端点 + 前端集成

> 对应任务：B1 + B2 + B3 前端集成补充
> 来源：本项目源码分析 + FastAPI Depends 文档
> 可信度：★★★★★ 项目内部
> 最后访问：2026-04-22

---

## 1. B1 双轨认证的完整实现

### 1.1 问题：现有 chat.py 用 `Depends(current_active_user)`

```python
# 现有代码
@router.post("/{agent_id}/chat")
async def chat(
    agent_id: int,
    payload: ChatRequest,
    user: User = Depends(current_active_user),  # ← 只支持 JWT
):
```

### 1.2 方案：新建 public 路由，用自定义依赖

```python
# app/auth/platform.py

import hashlib
from fastapi import Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.api_token import ApiToken
from app.models.user import User


async def get_current_user_from_api_token(
    authorization: str = Header(None),
    session: AsyncSession = Depends(get_async_session),
) -> User:
    """从 ah_xxx API Token 解析用户"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")

    raw = authorization[7:]
    if not raw.startswith("ah_"):
        raise HTTPException(status_code=401, detail="Not an API token (expected ah_ prefix)")

    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    result = await session.execute(
        select(ApiToken).where(
            ApiToken.token_hash == token_hash,
            ApiToken.enabled == True,
        )
    )
    api_token = result.scalar_one_or_none()
    if api_token is None:
        raise HTTPException(status_code=401, detail="Invalid API token")

    # 更新 last_used_at
    from datetime import datetime
    api_token.last_used_at = datetime.utcnow()
    session.add(api_token)
    await session.commit()

    user_result = await session.execute(select(User).where(User.id == api_token.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    return user
```

### 1.3 公开路由

```python
# app/routers/public.py（新文件）

from fastapi import APIRouter, Depends
from app.auth.platform import get_current_user_from_api_token
from app.models.user import User

router = APIRouter(prefix="/public", tags=["public"])


@router.post("/agents/{agent_id}/chat")
async def public_chat(
    agent_id: int,
    payload: ChatRequest,
    user: User = Depends(get_current_user_from_api_token),  # ← API Token 认证
):
    """公开 chat 端点，复用现有 chat 逻辑"""
    # 方案 1：直接调用 chat_router 的 chat 函数
    # 方案 2：提取共享逻辑到 chat_service.py
    pass
```

### 1.4 推荐：提取 chat_service.py 共享逻辑

```python
# app/services/chat_service.py（新文件）

async def do_chat(
    agent_id: int,
    payload: ChatRequest,
    user: User,
    session: AsyncSession,
) -> StreamingResponse | ChatResponse:
    """chat 核心逻辑，被 internal 和 public 两个路由复用"""
    # 把现有 chat.py 的 chat() 函数内容搬过来
    ...


# app/routers/chat.py 改为：
@router.post("/{agent_id}/chat")
async def chat(agent_id, payload, user=Depends(current_active_user), session=Depends(get_async_session)):
    return await do_chat(agent_id, payload, user, session)

# app/routers/public.py：
@router.post("/agents/{agent_id}/chat")
async def public_chat(agent_id, payload, user=Depends(get_current_user_from_api_token), session=Depends(get_async_session)):
    return await do_chat(agent_id, payload, user, session)
```

---

## 2. B1 前端：API Token 管理页

### 2.1 新路由

```
web/src/routes/_auth/api-tokens/index.tsx
```

### 2.2 菜单注册

```typescript
// web/src/utils/app-menu.ts 追加
{
  key: 'api-tokens',
  label: 'API Token',
  icon: 'Ticket',  // lucide-react 图标
  path: '/api-tokens',
},
```

### 2.3 API 定义

```typescript
// web/src/api/agenthub.ts 追加

export interface ApiTokenRead {
  id: number;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
  enabled: boolean;
}

export interface ApiTokenReadWithToken extends ApiTokenRead {
  token: string;  // 仅创建时返回
}

export const apiTokenApi = {
  list: () => httpClient.get<ApiTokenRead[]>('/api-tokens'),
  create: (name: string) => httpClient.post<ApiTokenReadWithToken>('/api-tokens', { name }),
  remove: (id: number) => httpClient.delete<void>(`/api-tokens/${id}`),
};
```

### 2.4 页面组件要点

```tsx
// 核心 UI：
// 1. 列表 Table：name / prefix / created_at / last_used_at / enabled / 删除按钮
// 2. 新建 Modal：输入 name，提交后弹窗显示明文 token（强调"仅此一次"）
// 3. 复制按钮：点击复制完整 token
// 4. 使用示例：展示 curl 命令

import { CopyOutlined } from '@ant-design/icons';
import { message, Modal, Typography } from 'antd';

// 创建成功后
const handleCreated = (token: string) => {
  Modal.info({
    title: 'Token 已创建',
    content: (
      <>
        <Typography.Paragraph type="danger">
          请立即复制，此 Token 不会再次显示。
        </Typography.Paragraph>
        <Typography.Text copyable>{token}</Typography.Text>
      </>
    ),
  });
};
```

---

## 3. B3 时间序列聚合 SQL

### 3.1 SQLite 按天聚合

```sql
SELECT
  DATE(created_at) AS day,
  COUNT(*) AS calls,
  SUM(prompt_tokens) AS prompt_tokens,
  SUM(completion_tokens) AS completion_tokens,
  AVG(duration_ms) AS avg_duration
FROM call_logs
WHERE user_id = ? AND created_at >= DATE('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY day ASC;
```

### 3.2 SQLAlchemy 实现

```python
from sqlalchemy import func, cast, Date

@router.get("/stats/daily")
async def get_daily_stats(
    days: int = 7,
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    since = datetime.utcnow() - timedelta(days=days)

    result = await session.execute(
        select(
            cast(CallLog.created_at, Date).label("day"),
            func.count(CallLog.id).label("calls"),
            func.sum(CallLog.prompt_tokens).label("prompt_tokens"),
            func.sum(CallLog.completion_tokens).label("completion_tokens"),
        )
        .where(CallLog.user_id == user.id, CallLog.created_at >= since)
        .group_by(cast(CallLog.created_at, Date))
        .order_by(cast(CallLog.created_at, Date))
    )

    return [
        {
            "day": str(r.day),
            "calls": r.calls or 0,
            "prompt_tokens": r.prompt_tokens or 0,
            "completion_tokens": r.completion_tokens or 0,
        }
        for r in result.all()
    ]
```

### 3.3 对接 SimpleLineChart

`SimpleLineChart` 接受 `data: {label: string, value: number}[]`：

```tsx
import { SimpleLineChart } from '@/components/SimpleLineChart';

// 从 statsQ.data 转换
const chartData = (dailyStats ?? []).map(d => ({
  label: d.day.slice(5),  // "04-22"
  value: d.calls,
}));

<SimpleLineChart
  title="最近 7 天对话趋势"
  subtitle="按天统计对话调用次数"
  data={chartData}
  color={token.colorPrimary}
/>
```

---

## 4. B2 Chat 工具调用完整 SSE 流

### 4.1 完整时序

```python
# app/routers/chat.py 改造后的 SSE 函数

async def sse_with_tools(agent, prompt, key, payload, user):
    # 1. 查询 agent 绑定的 tools
    agent_tools = await get_agent_tools(agent.id, session)  # list[MCPTool]

    # 2. 连接 MCP Server 获取 tool schema
    litellm_tools = []
    for tool in agent_tools:
        async with MCPToolManager.connect(tool.server_url) as mcp_session:
            schemas = await MCPToolManager.discover_tools(mcp_session)
            litellm_tools.extend(schemas)

    # 3. 查询历史（A1 多轮）
    history = await get_recent_messages(session, agent.id, limit=40)
    messages = _build_messages(prompt.content, history, payload.message)

    # 4. 第一轮 acompletion
    kwargs = _common_kwargs(agent, key)
    if litellm_tools:
        kwargs["tools"] = litellm_tools

    for round_num in range(MAX_TOOL_ROUNDS):
        response = await acompletion(messages=messages, stream=True, **kwargs)

        tool_call_chunks = {}
        full_reply = ""

        async for chunk in response:
            delta = chunk.choices[0].delta

            if delta.content:
                full_reply += delta.content
                yield f"data: {json.dumps({'delta': delta.content})}\n\n"

            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    if idx not in tool_call_chunks:
                        tool_call_chunks[idx] = {"id": tc.id, "name": "", "arguments": ""}
                    if tc.function and tc.function.name:
                        tool_call_chunks[idx]["name"] = tc.function.name
                    if tc.function and tc.function.arguments:
                        tool_call_chunks[idx]["arguments"] += tc.function.arguments

        # 没有 tool call，结束
        if not tool_call_chunks:
            break

        # 把 assistant 回复（含 tool_calls）加入 messages
        # ... 执行 tool calls ...
        for tc_data in tool_call_chunks.values():
            yield f"data: {json.dumps({'tool_call_start': {'name': tc_data['name']}})}\n\n"
            result = await call_mcp_tool(tc_data["name"], json.loads(tc_data["arguments"]))
            yield f"data: {json.dumps({'tool_call_result': {'name': tc_data['name'], 'result': result}})}\n\n"
            # 加入 messages 继续下一轮
            ...

    yield "data: [DONE]\n\n"
```

### 4.2 前端 tool_call 事件处理

```tsx
// web/src/api/agenthub.ts stream() 扩展

interface StreamEvent {
  delta?: string;
  tool_call_start?: { name: string; call_id: string };
  tool_call_result?: { name: string; call_id: string; result: string };
  error?: string;
}

// 解析时区分事件类型
const obj: StreamEvent = JSON.parse(payload);
if (obj.delta) yield { type: 'delta', content: obj.delta };
if (obj.tool_call_start) yield { type: 'tool_start', ...obj.tool_call_start };
if (obj.tool_call_result) yield { type: 'tool_result', ...obj.tool_call_result };
```

---

## 5. 主路由注册

```python
# app/main.py 追加

from app.routers import public as public_router_module
from app.routers import api_tokens as api_tokens_router_module

api_v1.include_router(public_router_module.router, tags=["public"])
api_v1.include_router(api_tokens_router_module.router, prefix="/api-tokens", tags=["api-tokens"])

# 注册新模型到 init_db
# app/db.py 追加
from app.models import api_token  # noqa: F401
```

---

## 6. 前端菜单 + 路由总结

| 菜单项 | 路径 | 新增/已有 |
|---|---|---|
| 仪表盘 | `/dashboard` | 已有（改造） |
| 智能体 | `/agents` | 已有 |
| 提示词 | `/prompts` | 已有 |
| 模型密钥 | `/keys` | 已有 |
| **API Token** | `/api-tokens` | **新增** |
| 设置 | `/settings` | 已有 |
