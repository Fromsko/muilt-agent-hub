# XState 状态机与事件驱动架构

> 收录时间：2026-04  
> 官网：https://stately.ai  
> 文档：https://stately.ai/docs  
> GitHub：https://github.com/statelyai/xstate  
> 可视化编辑器：https://stately.ai/editor  
> 实时可视化：https://stately.ai/viz  
> 当前版本：XState v5 / @xstate/store v3

---

## 一、XState 是什么

XState 是一个 **状态管理与编排库**，基于以下计算机科学概念：

- **有限状态机 (FSM)** — 系统在有限个状态之间切换
- **状态图 (Statecharts)** — 扩展 FSM，支持层级状态、并行状态、历史状态
- **Actor 模型** — 独立个体间通过消息通信

### 与普通状态管理的本质区别

```
Zustand / Redux:  "数据在这里，你可以随便改"
XState:           "系统现在处于 X 状态，只能响应 Y 事件，执行 Z 动作，转移到 W 状态"
```

| 维度 | Zustand / Redux | XState |
|------|----------------|--------|
| 核心模型 | 数据 Store (自由更新) | 状态机 (约束转移) |
| 状态 | 一坨数据 (any shape) | 有限的、命名的、可枚举的 |
| 更新方式 | 直接 set / dispatch | 只能通过事件 (event) 触发 |
| 非法状态 | 需手动防御 | **结构性不可能** |
| 副作用 | 自行管理 | 声明式 (entry/exit/invoke) |
| 可视化 | ❌ | ✅ 状态图 / 序列图 |
| 适合 | 简单数据存取 | 复杂流程 / 多状态交互 |

---

## 二、XState 生态全景

### 核心包

| 包 | 用途 | 体积 |
|----|------|------|
| **xstate** | 状态机 + Actor 模型 + 状态图（核心） | ~13KB gzip |
| **@xstate/store** | 简单事件驱动 Store（Zustand 替代品） | 极轻 |
| **@xstate/react** | React Hooks：`useActor` / `useMachine` / `useSelector` | — |

### 工具链

| 工具 | 网址 | 用途 |
|------|------|------|
| **Stately Studio** | https://stately.ai/editor | 可视化编辑器：拖拽画状态图 → 导出 XState 代码 |
| **Stately Viz** | https://stately.ai/viz | 实时状态图可视化 |
| **VSCode 扩展** | marketplace: stately-vscode | IDE 内可视化 + 代码片段 |
| **Inspect API** | 内置 | 运行时观察所有 Actor 的生命周期 / 事件 / 状态变化 |

---

## 三、XState v5 核心概念

### 3.1 一切皆 Actor (Everything is an Actor)

v5 最大变化：**从状态机优先 → Actor 优先**

Actor 是什么：
- 有自己的内部状态
- 可以发送和接收事件（消息）
- 可以创建其他 Actor

```tsx
import { createActor, createMachine } from "xstate";

const machine = createMachine({
  id: "toggle",
  initial: "inactive",
  states: {
    inactive: { on: { TOGGLE: "active" } },
    active: { on: { TOGGLE: "inactive" } },
  },
});

const actor = createActor(machine);
actor.subscribe((snapshot) => console.log(snapshot.value));
actor.start();
actor.send({ type: "TOGGLE" }); // → "active"
actor.send({ type: "TOGGLE" }); // → "inactive"
```

### 3.2 多种 Actor 逻辑类型

不仅仅是状态机，任何逻辑都可以成为 Actor：

```tsx
import { fromPromise, fromCallback, fromObservable, fromTransition } from "xstate";

// Promise Actor — 异步操作
const fetchUser = fromPromise(async ({ input }) => {
  const user = await getUser(input.userId);
  return user;
});

// Callback Actor — 事件监听
const listenToMessages = fromCallback(({ sendBack }) => {
  const handler = (event) => sendBack(event);
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
});

// Transition Actor — 类 Reducer
const counter = fromTransition(
  (state, event) => {
    if (event.type === "INC") return { count: state.count + 1 };
    return state;
  },
  { count: 0 },
);

// Observable Actor — RxJS
const interval$ = fromObservable(() => interval(1000));
```

### 3.3 setup() API — 强类型的声明式配置

```tsx
import { setup, fromPromise, assign } from "xstate";

const fetchData = fromPromise(async ({ input }: { input: { url: string } }) => {
  const res = await fetch(input.url);
  return res.json();
});

const machine = setup({
  types: {
    context: {} as { data: unknown; error: string | null },
    events: {} as { type: "FETCH"; url: string } | { type: "RETRY" },
  },
  actors: { fetchData },
}).createMachine({
  id: "dataLoader",
  initial: "idle",
  context: { data: null, error: null },
  states: {
    idle: {
      on: { FETCH: "loading" },
    },
    loading: {
      invoke: {
        src: "fetchData", // ← 强类型，自动补全
        input: ({ event }) => ({ url: event.url }),
        onDone: {
          target: "success",
          actions: assign({
            data: ({ event }) => event.output, // ← output 强类型
          }),
        },
        onError: {
          target: "failure",
          actions: assign({
            error: ({ event }) => event.error.message,
          }),
        },
      },
    },
    success: { type: "final" },
    failure: {
      on: { RETRY: "loading" },
    },
  },
});
```

### 3.4 深度持久化 (Deep Persistence)

Actor 状态可以递归持久化和恢复，包括所有子 Actor：

```tsx
const actor = createActor(machine);
actor.start();

// 持久化（包括所有 invoked/spawned 子 Actor）
const persistedState = actor.getPersistedSnapshot();
localStorage.setItem("app-state", JSON.stringify(persistedState));

// 恢复
const saved = JSON.parse(localStorage.getItem("app-state")!);
const restoredActor = createActor(machine, { snapshot: saved });
restoredActor.start(); // 从持久化状态恢复，包括子 Actor
```

### 3.5 Inspect API — 运行时全局观测

```tsx
const actor = createActor(machine, {
  inspect: (event) => {
    // '@xstate.actor' — Actor 生命周期
    // '@xstate.snapshot' — 状态快照变化
    // '@xstate.event' — 事件通信
    console.log(event);
  },
});
```

### 3.6 enqueueActions — 复杂动作编排

```tsx
import { enqueueActions } from "xstate";

// 在一个 action 中编排多个子动作
entry: enqueueActions(({ context, enqueue, check }) => {
  enqueue.assign({ count: context.count + 1 });

  if (check({ type: "isAdmin" })) {
    enqueue.sendTo("logger", { type: "LOG", message: "admin action" });
  }

  enqueue("playSound");
});
```

---

## 四、@xstate/store — 简单状态管理

> 当你不需要状态机，只需要事件驱动的 Store 时

### 定位

- Zustand / Redux 的替代品
- 事件驱动（不是 `set()` 直接更新）
- 极轻量
- 可平滑升级为 XState 状态机

### 核心 API

```tsx
import { createStore } from "@xstate/store";

const store = createStore({
  context: { count: 0, name: "David" },
  on: {
    inc: (context) => ({ ...context, count: context.count + 1 }),
    changeName: (context, event: { newName: string }) => ({
      ...context,
      name: event.newName,
    }),
  },
});

// 发送事件
store.send({ type: "inc" });
// 或 fluent API
store.trigger.inc();
store.trigger.changeName({ newName: "Jenny" });
```

### v3 新特性

| 特性 | 说明 |
|------|------|
| **Atoms** | 轻量响应式状态原子，可独立或组合使用 |
| **Effects** | 副作用声明 |
| **Persist** | 内置持久化到 localStorage / sessionStorage / AsyncStorage |
| **Undo/Redo** | 内置撤销/重做，支持事务、跳过、快照策略 |
| **Reset** | 内置重置到初始状态 |
| **Selectors** | 自定义选择器 + 相等性函数 |
| **Immer** | 可选 Immer 集成，简化不可变更新 |

### React 集成

```tsx
import { useSelector } from "@xstate/store-react";

function Counter() {
  const count = useSelector(store, (s) => s.context.count);
  return (
    <div>
      <span>{count}</span>
      <button onClick={() => store.trigger.inc()}>+1</button>
    </div>
  );
}
```

### 从 Store 升级到状态机

```tsx
// 之前：Store
const store = createStore({
  context: { count: 0 },
  on: {
    inc: (context, event: { by: number }) => ({
      ...context,
      count: context.count + event.by,
    }),
  },
});

// 之后：State Machine（只需小改）
import { createMachine, assign } from "xstate";

const machine = createMachine({
  context: { count: 0 },
  on: {
    inc: {
      actions: assign({
        count: ({ context, event }) => context.count + event.by,
      }),
    },
  },
});
```

---

## 五、React Hooks (@xstate/react)

| Hook | 用途 |
|------|------|
| `useActor(logic)` | 从任意 Actor 逻辑创建 Actor，返回 `[snapshot, send, actorRef]` |
| `useMachine(machine)` | `useActor` 的别名，专用于状态机 |
| `useSelector(actorRef, selector)` | 从 Actor 中选取数据（避免无关 re-render） |
| `useActorRef(logic)` | 只获取 actorRef，不订阅状态（性能优化） |
| `createActorContext(logic)` | 创建 React Context，让整个子树共享一个 Actor |

### createActorContext 模式（全局状态）

```tsx
import { createActorContext } from "@xstate/react";

const AppMachineContext = createActorContext(appMachine);

// Provider
function App() {
  return (
    <AppMachineContext.Provider>
      <Dashboard />
    </AppMachineContext.Provider>
  );
}

// Consumer
function Dashboard() {
  const status = AppMachineContext.useSelector((s) => s.value);
  const actorRef = AppMachineContext.useActorRef();
  return <button onClick={() => actorRef.send({ type: "START" })}>{status}</button>;
}
```

---

## 六、适用场景分析

### ✅ XState 最擅长

| 场景 | 原因 |
|------|------|
| **多步骤表单 / 向导** | 明确的步骤流转、前进/后退/跳过/验证 |
| **异步工作流** | loading → success/failure → retry，状态不会乱 |
| **AI 聊天流程** | idle → streaming → thinking → tool-calling → done，多并行状态 |
| **认证流程** | logged-out → logging-in → logged-in → refreshing → expired |
| **WebSocket 连接** | disconnected → connecting → connected → reconnecting |
| **拖拽 / 手势** | idle → hovering → dragging → dropped |
| **播放器 / 编辑器** | 复杂的 play/pause/seek/buffer 状态组合 |
| **后端编排** | 工作流、审批流、saga 模式 |

### ❌ XState 过度杀伤

| 场景 | 更好选择 |
|------|----------|
| 简单 toggle (开/关) | `useState` |
| 纯数据存取 (CRUD Store) | Zustand / @xstate/store |
| 服务端缓存 | TanStack Query |
| 表单字段值 | React Hook Form / 受控组件 |

### ⚠️ 常见误用

> Reddit 社区经验总结

1. **不是所有状态都需要状态机** — 简单数据用 Store，复杂流程用 Machine
2. **学习曲线陡峭** — 需要理解状态图概念，不能直接上手
3. **过度建模** — 不需要把每个按钮状态都建模为状态机
4. **v5 actor-first 思维** — 不再是"状态机库"，而是"Actor 编排库"

---

## 七、XState vs Zustand — 选型决策树

```
你的状态有明确的"阶段"吗？（idle → loading → success → error）
  │
  ├─ 否 → 只是数据存取（列表/计数器/表单值）
  │        → 用 Zustand 或 @xstate/store
  │
  └─ 是 → 状态之间有约束吗？（不能从 error 直接到 success）
           │
           ├─ 否 → 约束简单，用 Zustand + 手动 guard
           │
           └─ 是 → 用 XState 状态机
                    │
                    ├─ 有多个并行的独立逻辑？→ Actor 模型
                    ├─ 需要可视化 / 团队协作？→ Stately Studio
                    └─ 需要持久化 / 恢复？→ Deep Persistence
```

### 本项目策略

```
┌─────────────────────────────────────────────────┐
│  Zustand (已使用)                                │
│  → 用户 Auth 状态、UI 偏好、简单全局数据         │
│  → 可选迁移到 @xstate/store 获得事件驱动 + 撤销  │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  XState Machine (按需引入)                       │
│  → AI 聊天流程 (streaming 状态管理)              │
│  → EDA 工作流 (编译 → 布局 → 布线 → 验证)       │
│  → WebSocket 连接管理                            │
│  → 复杂多步操作 (向导/审批)                      │
└─────────────────────────────────────────────────┘
```

---

## 八、EDA 项目适用示例

### AI 聊天流程状态机

```tsx
const chatMachine = setup({
  types: {
    context: {} as {
      messages: Message[];
      currentResponse: string;
      error: string | null;
    },
    events: {} as
      | { type: "SEND_PROMPT"; text: string }
      | { type: "TOKEN_RECEIVED"; token: string }
      | { type: "STREAM_COMPLETE" }
      | { type: "STREAM_ERROR"; error: string }
      | { type: "RETRY" }
      | { type: "CANCEL" },
  },
}).createMachine({
  id: "chat",
  initial: "idle",
  context: { messages: [], currentResponse: "", error: null },
  states: {
    idle: {
      on: {
        SEND_PROMPT: {
          target: "streaming",
          actions: assign({
            messages: ({ context, event }) => [
              ...context.messages,
              { role: "user", content: event.text },
            ],
            currentResponse: "",
            error: null,
          }),
        },
      },
    },
    streaming: {
      on: {
        TOKEN_RECEIVED: {
          actions: assign({
            currentResponse: ({ context, event }) =>
              context.currentResponse + event.token,
          }),
        },
        STREAM_COMPLETE: {
          target: "idle",
          actions: assign({
            messages: ({ context }) => [
              ...context.messages,
              { role: "assistant", content: context.currentResponse },
            ],
            currentResponse: "",
          }),
        },
        STREAM_ERROR: {
          target: "error",
          actions: assign({ error: ({ event }) => event.error }),
        },
        CANCEL: {
          target: "idle",
          actions: assign({ currentResponse: "" }),
        },
      },
    },
    error: {
      on: {
        RETRY: "streaming",
        SEND_PROMPT: {
          target: "streaming",
          actions: assign({
            messages: ({ context, event }) => [
              ...context.messages,
              { role: "user", content: event.text },
            ],
            error: null,
          }),
        },
      },
    },
  },
});
```

### EDA 编译工作流状态机

```tsx
const edaWorkflowMachine = setup({
  types: {
    context: {} as {
      projectId: string;
      progress: number;
      logs: string[];
      result: unknown;
    },
  },
}).createMachine({
  id: "edaWorkflow",
  initial: "idle",
  states: {
    idle: { on: { START: "compiling" } },
    compiling: {
      on: {
        COMPILE_DONE: "placing",
        COMPILE_ERROR: "failed",
      },
    },
    placing: {
      on: {
        PLACE_DONE: "routing",
        PLACE_ERROR: "failed",
      },
    },
    routing: {
      on: {
        ROUTE_DONE: "verifying",
        ROUTE_ERROR: "failed",
      },
    },
    verifying: {
      on: {
        VERIFY_PASS: "completed",
        VERIFY_FAIL: "failed",
      },
    },
    completed: { type: "final" },
    failed: {
      on: {
        RETRY: "idle",
        FIX_AND_RETRY: "compiling",
      },
    },
  },
});
```

---

## 九、参考链接

### 官方
- [XState 文档](https://stately.ai/docs)
- [XState v5 发布博客](https://stately.ai/blog/2023-12-01-xstate-v5)
- [@xstate/store 文档](https://stately.ai/docs/xstate-store)
- [@xstate/react 文档](https://stately.ai/docs/xstate-react)
- [Stately Studio 可视化编辑器](https://stately.ai/editor)
- [XState Visualizer](https://stately.ai/viz)
- [XState VSCode 扩展](https://marketplace.visualstudio.com/items?itemName=statelyai.stately-vscode)

### 社区
- [GitHub: statelyai/xstate](https://github.com/statelyai/xstate)
- [XState 全局状态管理 (React)](https://stately.ai/blog/2024-02-12-xstate-react-global-state)
- [XState Store 介绍](https://stately.ai/blog/2024-04-10-xstate-store)
- [State Machines in React: XState for Complex UI Logic](https://dev.to/patoliyainfotech/state-machines-in-react-xstate-for-complex-ui-logic-3lbc)
- [XState in React: No useState or useEffect](https://www.frontendundefined.com/posts/monthly/xstate-in-react/)
- [xstate-wizards: 多步表单向导](https://github.com/xstate-wizards/xstate-wizards)
