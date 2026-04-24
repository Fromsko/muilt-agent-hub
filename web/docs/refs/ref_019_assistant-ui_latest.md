---
tags:
  - assistant-ui
  - ai-chat
  - react
  - streaming
  - tool-calling
  - reasoning
aliases:
  - assistant-ui AI 聊天组件库参考
created: 2026-04-22
updated: 2026-04-22
status: active
---

> [!abstract] 概述
> assistant-ui 是一个开源的 TypeScript/React 库，用于快速构建生产级 AI 聊天体验。支持流式响应、自动滚动、附件、工具调用、思考过程展示等功能。

## 项目信息

- **官网**：https://www.assistant-ui.com
- **GitHub**：https://github.com/assistant-ui/assistant-ui
- **Stars**：9.6k+
- **协议**：MIT
- **技术栈**：React + TypeScript + Tailwind CSS

## 核心特性

| 特性 | 说明 |
|------|------|
| **流式响应** | 逐 token 渲染，无抖动 |
| **自动滚动** | 智能滚动处理各种边界情况 |
| **Markdown** | 内置 Markdown 渲染 + 代码高亮 |
| **附件** | 支持文件和图片上传 |
| **工具调用** | 支持函数调用 + Human-in-the-loop |
| **思考过程** | 可折叠的 Chain of Thought 展示 |
| **消息分支** | 支持消息版本切换 |
| **无障碍** | WCAG 无障碍支持 |
| **键盘快捷键** | 内置键盘快捷键支持 |

## 安装

```bash
# 基础安装
bun add @assistant-ui/react @assistant-ui/react-markdown

# 如果使用 Vercel AI SDK
bun add @assistant-ui/react-ai-sdk ai

# 如果使用 shadcn/ui 风格组件
npx shadcn@latest add thread
npx shadcn@latest add reasoning
```

## 核心组件

### Thread（对话容器）

主聊天容器，包含消息列表、输入框和自动滚动。

```tsx
import { Thread } from "@/components/assistant-ui/thread";

export default function Chat() {
  return <Thread />;
}
```

### Reasoning（思考过程）

可折叠的思考过程展示组件。

```tsx
import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";

// 在 MessagePrimitive.Parts 中使用
<MessagePrimitive.Parts
  components={{
    Reasoning,
    ReasoningGroup,
  }}
/>
```

### ToolFallback（工具调用回退）

工具调用的默认 UI 组件。

```tsx
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";

<MessagePrimitive.Parts
  components={{
    tools: { Fallback: ToolFallback },
  }}
/>
```

## Runtime 架构

### LocalRuntime（本地运行时）

最简单的方式连接自定义后端，管理所有聊天状态。

```tsx
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";

const MyModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });

    const data = await response.json();
    yield {
      content: [{ type: "text", text: data.text }],
    };
  },
};

function MyRuntimeProvider({ children }) {
  const runtime = useLocalRuntime(MyModelAdapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### 流式响应实现

```tsx
const MyModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const stream = await fetch("/api/chat/stream", {
      method: "POST",
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });

    const reader = stream.body.getReader();
    const decoder = new TextDecoder();
    let text = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      text += decoder.decode(value, { stream: true });
      yield {
        content: [{ type: "text", text }],
      };
    }
  },
};
```

## 工具调用（Tool Calling）

### 使用 Tools() API 注册工具

```tsx
import { useAui, Tools, type Toolkit } from "@assistant-ui/react";
import { z } from "zod";

const myToolkit: Toolkit = {
  getWeather: {
    description: "获取指定位置的天气",
    parameters: z.object({
      location: z.string().describe("城市名称"),
      unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
    }),
    execute: async ({ location, unit }) => {
      return await fetchWeatherAPI(location, unit);
    },
    render: ({ args, result }) => {
      if (!result) return <div>正在获取天气...</div>;
      return (
        <div>
          <h3>{args.location}</h3>
          <p>{result.temperature}° {args.unit}</p>
        </div>
      );
    },
  },
};

function MyRuntimeProvider({ children }) {
  const runtime = useLocalRuntime(MyModelAdapter);
  const aui = useAui({
    tools: Tools({ toolkit: myToolkit }),
  });

  return (
    <AssistantRuntimeProvider aui={aui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### 工具类型

| 类型 | 说明 |
|------|------|
| `frontend` | 在浏览器中执行（默认） |
| `human` | 需要用户输入/确认 |
| `backend` | 在服务器端执行 |

### Human-in-the-Loop

```tsx
const confirmationToolkit: Toolkit = {
  sendEmail: {
    type: "human",
    description: "发送邮件（需要确认）",
    parameters: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
    render: ({ args, interrupt, resume }) => {
      if (interrupt) {
        return (
          <div>
            <p>确认发送邮件到 {args.to}？</p>
            <button onClick={() => resume(true)}>确认</button>
            <button onClick={() => resume(false)}>取消</button>
          </div>
        );
      }
      return <div>准备发送...</div>;
    },
  },
};
```

## 思考过程展示（Reasoning）

### 组件结构

| 组件 | 说明 |
|------|------|
| `Reasoning.Root` | 可折叠容器 |
| `Reasoning.Trigger` | 触发按钮（带图标、标签、动画） |
| `Reasoning.Content` | 动画折叠内容 |
| `Reasoning.Text` | 文本容器（支持 Markdown） |
| `Reasoning.Fade` | 底部渐变遮罩 |

### 变体（Variant）

```tsx
<Reasoning.Root variant="outline">...</Reasoning.Root>  // 默认：圆角边框
<Reasoning.Root variant="ghost">...</Reasoning.Root>    // 无额外样式
<Reasoning.Root variant="muted">...</Reasoning.Root>    // 静音背景
```

## 适配器（Adapters）

| 适配器 | 说明 |
|--------|------|
| `AttachmentAdapter` | 文件/图片上传 |
| `ThreadHistoryAdapter` | 对话历史持久化 |
| `SpeechSynthesisAdapter` | 文字转语音 |
| `FeedbackAdapter` | 用户反馈（点赞/点踩） |
| `SuggestionAdapter` | 后续建议生成 |

### 附件适配器示例

```tsx
const attachmentAdapter: AttachmentAdapter = {
  accept: "image/*,application/pdf",
  async add({ file }) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const { id, url } = await response.json();
    return {
      id,
      type: file.type.startsWith("image/") ? "image" : "document",
      name: file.name,
      contentType: file.type,
      file,
      url,
      status: { type: "requires-action", reason: "composer-send" },
    };
  },
};
```

## 与 Ant Design 集成

assistant-ui 使用 Tailwind CSS，可以与 Ant Design 共存：

```tsx
import { ConfigProvider } from "antd";
import { AssistantRuntimeProvider } from "@assistant-ui/react";

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff" } }}>
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </ConfigProvider>
  );
}
```

## 与项目的 Chat API 集成

### 适配器实现

```tsx
import { chatApi } from "@/api/agenthub";
import { useAuthStore } from "@/stores/auth";

const GatewayModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const token = useAuthStore.getState().tokens?.accessToken ?? "";
    const lastMessage = messages[messages.length - 1];
    const agentId = 1; // 从路由参数获取

    const stream = chatApi.stream(agentId, lastMessage.content, token, {
      signal: abortSignal,
    });

    let content = "";
    for await (const delta of stream) {
      content += delta;
      yield {
        content: [{ type: "text", text: content }],
      };
    }
  },
};
```

## 后端 API 扩展需求

### 当前 API 格式

```typescript
// SSE 事件格式
interface StreamEvent {
  delta: string;  // 仅文本增量
}
```

### 支持 Reasoning + Tool Calling 的格式

```typescript
// 扩展后的 SSE 事件格式
interface StreamEvent {
  type: "text" | "reasoning" | "tool_call" | "tool_result";
  content?: string;
  tool_name?: string;
  tool_call_id?: string;
  tool_input?: object;
  tool_output?: object;
  status?: "pending" | "running" | "completed" | "error";
}
```

## 参考链接

- [assistant-ui 官方文档](https://www.assistant-ui.com/docs)
- [GitHub 仓库](https://github.com/assistant-ui/assistant-ui)
- [Reasoning 组件文档](https://www.assistant-ui.com/docs/ui/reasoning)
- [Tools 指南](https://www.assistant-ui.com/docs/guides/tools)
- [LocalRuntime 文档](https://www.assistant-ui.com/docs/runtimes/custom/local)
- [Thread 组件文档](https://www.assistant-ui.com/docs/ui/thread)

## 相关笔记

- [流式输出与AI聊天UI.md](../ai/流式输出与AI聊天UI.md)
- [AI组件库与UI资源汇总.md](../ai/AI组件库与UI资源汇总.md)
