# RPC 轮询与 AI 消息列表渲染

> 收录时间：2026-04  
> 覆盖：轮询模式（短轮询/长轮询/指数退避）、TanStack Query 轮询、消息列表虚拟化渲染、自动滚动

---

## 一、RPC 轮询模式

### 1.1 三种轮询策略

| 模式 | 原理 | 适用场景 |
|------|------|----------|
| **短轮询 (Short Polling)** | 客户端定时请求，服务端立即返回当前状态 | 简单状态检查、不敏感的低频数据 |
| **长轮询 (Long Polling)** | 客户端请求后服务端挂起，有新数据才返回 | 准实时通知、兼容性最好 |
| **指数退避 (Exponential Backoff)** | 失败/无数据时逐步增大间隔：2s → 4s → 8s → 16s | 错误恢复、后端保护 |

### 1.2 短轮询实现

```tsx
// hooks/usePolling.ts
import { useEffect, useRef, useCallback } from "react";

interface UsePollingOptions {
  interval: number;        // 轮询间隔 (ms)
  enabled?: boolean;       // 是否启用
  immediate?: boolean;     // 是否立即执行第一次
}

function usePolling(fn: () => Promise<void>, options: UsePollingOptions) {
  const { interval, enabled = true, immediate = true } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const poll = useCallback(async () => {
    try {
      await fnRef.current();
    } catch (error) {
      console.error("Polling error:", error);
    }
    if (enabled) {
      timerRef.current = setTimeout(poll, interval);
    }
  }, [interval, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (immediate) {
      poll();
    } else {
      timerRef.current = setTimeout(poll, interval);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll, enabled, immediate, interval]);
}
```

### 1.3 指数退避轮询

```tsx
// hooks/useExponentialPolling.ts
function useExponentialPolling(
  fn: () => Promise<boolean>, // 返回 true 表示任务完成
  options: {
    initialInterval?: number;  // 初始间隔 (ms)，默认 1000
    maxInterval?: number;      // 最大间隔 (ms)，默认 30000
    factor?: number;           // 增长因子，默认 2
    jitter?: boolean;          // 是否添加随机抖动
    enabled?: boolean;
  },
) {
  const {
    initialInterval = 1000,
    maxInterval = 30000,
    factor = 2,
    jitter = true,
    enabled = true,
  } = options;

  const intervalRef = useRef(initialInterval);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      try {
        const done = await fn();
        if (done || cancelled) return;
        // 成功但未完成：重置间隔
        intervalRef.current = initialInterval;
      } catch {
        // 失败：增加间隔
        intervalRef.current = Math.min(
          intervalRef.current * factor,
          maxInterval,
        );
      }

      const delay = jitter
        ? intervalRef.current * (0.5 + Math.random())
        : intervalRef.current;

      setTimeout(poll, delay);
    }

    poll();
    return () => { cancelled = true; };
  }, [enabled, fn, initialInterval, maxInterval, factor, jitter]);
}
```

### 1.4 JSON-RPC 任务状态轮询

> 适用于本项目的 RPC 后端：提交任务 → 轮询结果

```tsx
// 场景：提交 EDA 编译任务，轮询编译状态
import { rpcCall } from "@/api/rpc";

async function submitAndPoll(projectId: string) {
  // 1. 提交任务
  const { taskId } = await rpcCall("eda.compile.start", { projectId });

  // 2. 轮询状态
  return new Promise((resolve, reject) => {
    let interval = 1000;
    const maxInterval = 15000;

    async function check() {
      try {
        const result = await rpcCall("eda.compile.status", { taskId });

        if (result.status === "completed") return resolve(result.data);
        if (result.status === "failed") return reject(new Error(result.error));

        // 进行中：继续轮询（退避）
        interval = Math.min(interval * 1.5, maxInterval);
        setTimeout(check, interval);
      } catch (error) {
        interval = Math.min(interval * 2, maxInterval);
        setTimeout(check, interval);
      }
    }

    check();
  });
}
```

---

## 二、TanStack Query 轮询 (推荐方案)

> 如果项目引入 TanStack Query，轮询变得极其简单

### 基本轮询

```tsx
import { useQuery } from "@tanstack/react-query";

function TaskStatus({ taskId }: { taskId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => rpcCall("eda.compile.status", { taskId }),
    refetchInterval: 2000, // 每 2 秒轮询
  });

  if (isLoading) return <Spinner />;
  return <div>状态: {data.status}</div>;
}
```

### 条件停止轮询

```tsx
const { data } = useQuery({
  queryKey: ["task", taskId],
  queryFn: () => rpcCall("eda.compile.status", { taskId }),
  refetchInterval: (query) => {
    // 完成或失败时停止轮询
    const status = query.state.data?.status;
    if (status === "completed" || status === "failed") return false;
    return 2000; // 继续轮询
  },
});
```

### 后台标签页暂停

```tsx
const { data } = useQuery({
  queryKey: ["task", taskId],
  queryFn: () => fetchTaskStatus(taskId),
  refetchInterval: 2000,
  refetchIntervalInBackground: false, // 标签页不可见时停止轮询
});
```

---

## 三、轮询 vs SSE vs WebSocket 选型

```
┌────────────────────────────────────────────────────────┐
│  你需要什么？                                          │
├────────────────────────────────────────────────────────┤
│  检查任务状态（低频、可容忍延迟）                       │
│  → 短轮询 / TanStack Query refetchInterval             │
├────────────────────────────────────────────────────────┤
│  AI 流式输出（单向、服务端推送 token）                  │
│  → SSE (EventSource) / Vercel AI SDK                   │
├────────────────────────────────────────────────────────┤
│  实时协作 / 双向通信                                    │
│  → WebSocket / Socket.IO                               │
├────────────────────────────────────────────────────────┤
│  本项目 RPC 后端                                       │
│  → JSON-RPC 短轮询 + 指数退避（已有 rpc 封装可复用）   │
│  → 未来可升级为 WebSocket 推送                          │
└────────────────────────────────────────────────────────┘
```

---

## 四、AI 消息列表渲染

### 4.1 方案对比

| 库 | 网址 | 特点 | 定价 |
|----|------|------|------|
| **React Virtuoso** | https://virtuoso.dev | 最成熟的虚拟化列表，专有 MessageList 组件 | 开源 (列表) / 商业 (MessageList) |
| **VirtuosoMessageList** | https://virtuoso.dev/message-list/ | 专为聊天/AI 对话设计的虚拟化消息列表 | 商业许可 |
| **react-virtualized** | npm: react-virtualized | 经典虚拟化库，CellMeasurer + AutoSizer | 免费开源 |
| **@tanstack/react-virtual** | npm: @tanstack/react-virtual | TanStack 出品，极轻量虚拟化 Hook | 免费开源 |
| **Stream VirtualizedMessageList** | getstream.io | GetStream SDK 内置虚拟化消息列表 | 商业 |

### 4.2 VirtuosoMessageList 核心特性

> 专为 AI 聊天场景设计

- **虚拟化渲染** — 只渲染可见消息，千条消息无压力
- **声明式滚动控制** — 通过 data prop 控制滚动位置 + 平滑动画
- **新消息自动滚动** — 可配置的自动滚动行为（用户手动滚动时暂停）
- **可定制组件** — header / footer / sticky header / loading / scroll-to-bottom
- **无样式** — 轻松集成任何设计系统

### 4.3 自动滚动逻辑（自实现）

> 不用商业库时的核心逻辑

```tsx
function useAutoScroll(containerRef: RefObject<HTMLDivElement>) {
  const isUserScrollingRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // 判断是否在底部附近（容忍 50px）
  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }, [containerRef]);

  // 用户滚动时记录位置
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      isNearBottomRef.current = checkNearBottom();
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [containerRef, checkNearBottom]);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, [containerRef]);

  // 新消息到达时：如果用户在底部附近，自动滚动
  const onNewMessage = useCallback(() => {
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [scrollToBottom]);

  return { scrollToBottom, onNewMessage, isNearBottom: isNearBottomRef };
}
```

### 4.4 Streaming 消息渲染模式

> AI 流式输出时的消息列表渲染策略

```
方式 1：逐 token 追加到消息内容
  messages = [...history, { role: 'assistant', content: partialText }]
  → 每次 token 更新 partialText → re-render 最后一条消息
  → 问题：频繁 re-render

方式 2：ref 直接操作 DOM（ChatGPT 方式）
  → 用 ref 拿到最后一条消息的 DOM
  → 直接 textContent += token（不走 React state）
  → 流结束后同步到 state
  → 性能最好，但实现复杂

方式 3：FlowToken 库
  → 缓冲 tokens，批量平滑展示
  → 内置动画效果
  → 兼顾性能和体验

推荐：方式 3 (FlowToken) 或 方式 2 (ref) 用于 streaming 阶段
     流结束后同步到 React state + Markdown 全量解析
```

---

## 五、参考链接

- [Polling in React](https://dev.to/tangoindiamango/polling-in-react-3h8a)
- [TanStack Query Auto Refetching](https://tanstack.com/query/v4/docs/framework/react/examples/auto-refetching)
- [Polling in React: TanStack Query Guide](https://cnayanajith.com/blog/polling-react-tanstack-query)
- [Backoff and Retry — Polling](https://btholt.github.io/complete-intro-to-realtime/backoff-and-retry/)
- [AWS: Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [React Virtuoso](https://virtuoso.dev)
- [VirtuosoMessageList](https://virtuoso.dev/message-list/)
- [Virtuoso Scroll to Bottom Tutorial](https://virtuoso.dev/virtuoso-message-list/tutorial/scroll-to-bottom-button/)
