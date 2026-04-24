# ref_011 — Dashboard 接真数据

> 对应任务：A3 仪表盘接真数
> 来源：本项目源码分析
> 可信度：★★★★★ 项目内部
> 最后访问：2026-04-22

---

## 1. 问题现状

Dashboard（`web/src/routes/_auth/dashboard/index.tsx`）当前全是硬编码模拟数据：

- 在线网关 / 每分钟请求量 / 平均响应延迟 / 重点告警 → 来自 `console.ts` mock
- 流量趋势 → 硬编码 `trafficTrend` 数组
- 活动流 → 硬编码 `recentActivities`
- 告警 → 硬编码 `criticalAlerts`

**目标**：替换为项目自己的数据（Prompt / Key / Agent / Message 统计）。

---

## 2. 后端新增端点

### 2.1 GET /api/v1/stats

```python
# app/routers/stats.py（新文件）

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.auth.backend import current_active_user
from app.db import get_async_session
from app.models.agent import Agent
from app.models.key import Key
from app.models.message import Message
from app.models.prompt import Prompt
from app.models.user import User

router = APIRouter()


@router.get("/stats")
async def get_stats(
    user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
):
    # 统计各资源数量
    prompt_count = (
        await session.execute(
            select(func.count(Prompt.id)).where(Prompt.user_id == user.id)
        )
    ).scalar() or 0

    key_count = (
        await session.execute(
            select(func.count(Key.id)).where(Key.user_id == user.id)
        )
    ).scalar() or 0

    agent_count = (
        await session.execute(
            select(func.count(Agent.id)).where(Agent.user_id == user.id)
        )
    ).scalar() or 0

    # 统计最近 7 天对话数
    message_count = (
        await session.execute(
            select(func.count(Message.id))
            .join(Agent, Agent.id == Message.agent_id)
            .where(Agent.user_id == user.id)
        )
    ).scalar() or 0

    # 最近 5 条消息
    recent_result = await session.execute(
        select(Message)
        .join(Agent, Agent.id == Message.agent_id)
        .where(Agent.user_id == user.id)
        .order_by(Message.created_at.desc())
        .limit(5)
    )
    recent_messages = [
        {
            "id": m.id,
            "agent_id": m.agent_id,
            "role": m.role,
            "content_preview": m.content[:80],
            "created_at": m.created_at.isoformat(),
        }
        for m in recent_result.scalars().all()
    ]

    return {
        "prompt_count": prompt_count,
        "key_count": key_count,
        "agent_count": agent_count,
        "message_count": message_count,
        "recent_messages": recent_messages,
    }
```

### 2.2 注册路由

```python
# app/main.py
from app.routers import stats

api_v1.include_router(stats.router)
```

---

## 3. 前端 API 对接

在 `web/src/api/agenthub.ts` 添加：

```typescript
export interface Stats {
  prompt_count: number;
  key_count: number;
  agent_count: number;
  message_count: number;
  recent_messages: Array<{
    id: number;
    agent_id: number;
    role: string;
    content_preview: string;
    created_at: string;
  }>;
}

export const statsApi = {
  get: () => httpClient.get<Stats>('/stats'),
};
```

---

## 4. Dashboard 改造

### 4.1 替换 stats 卡片

```tsx
import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/api/agenthub';
import { Bot, Key, MessageSquare, FileText } from '@/core/icons';

function DashboardPage() {
  const statsQ = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.get(),
  });

  const stats = [
    {
      title: '智能体',
      value: statsQ.data?.agent_count ?? '-',
      icon: Bot,
      tone: 'primary' as const,
      detail: '已创建的智能体数量',
    },
    {
      title: '提示词',
      value: statsQ.data?.prompt_count ?? '-',
      icon: FileText,
      tone: 'success' as const,
      detail: '提示词模板数量',
    },
    {
      title: '密钥',
      value: statsQ.data?.key_count ?? '-',
      icon: Key,
      tone: 'warning' as const,
      detail: '已配置的 API Key',
    },
    {
      title: '对话记录',
      value: statsQ.data?.message_count ?? '-',
      icon: MessageSquare,
      tone: 'info' as const,
      detail: '历史对话消息总数',
    },
  ];

  // ... 渲染不变
}
```

### 4.2 替换活动流

用 `statsQ.data.recent_messages` 替代 `recentActivities` 硬编码。

### 4.3 删除无用组件

| 现有组件 | 处理 |
|---|---|
| `GatewayHealthCard` | 删除（网关概念不属于本项目） |
| `AlertListCard` | 删除或改为"暂无告警" |
| `SystemOverviewCard` | 删除（成功率/限流/证书是模拟概念） |
| `SimpleLineChart` | 改为"最近 7 天对话趋势"（需后端支持时间序列）或删除 |
| `ActivityFeedCard` | 改为展示 recent_messages |
| `console.ts` store | 整个文件可删除 |

---

## 5. 所需包依赖

前端已有 `@tanstack/react-query`，无需新增依赖。
