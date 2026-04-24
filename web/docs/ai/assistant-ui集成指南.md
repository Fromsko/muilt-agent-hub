# assistant-ui 集成指南

> 适用项目：Gateway Manager (React 19 + Ant Design 6 + TailwindCSS V4 + TanStack Query + Zustand)
> 编写时间：2026-04-22

---

## 一、为什么选择 assistant-ui

### 项目需求匹配

| 需求 | assistant-ui 支持 | 说明 |
|------|------------------|------|
| 思考过程展示 | ✅ Reasoning 组件 | 可折叠的 Chain of Thought |
| 工具调用 | ✅ Tool Calling | 支持 Human-in-the-loop |
| 流式响应 | ✅ 内置 | 逐 token 渲染无抖动 |
| 与 Ant Design 共存 | ✅ | 使用 Tailwind CSS，不冲突 |
| 自定义后端 | ✅ LocalRuntime | 适配现有 chatApi |

### 与其他方案对比

| 方案 | Reasoning | Tool Calling | Ant Design 兼容 | 复杂度 |
|------|-----------|--------------|-----------------|--------|
| **assistant-ui** | ✅ | ✅ | ✅ | 中 |
| shadcn/ui AI | ✅ | ✅ | ❌ 需迁移 | 高 |
| 自行实现 | 需开发 | 需开发 | ✅ | 高 |

---

## 二、安装配置

### 2.1 安装依赖

```bash
# 核心库
bun add @assistant-ui/react @assistant-ui/react-markdown

# Markdown 语法高亮
bun add rehype-highlight

# 类型支持（如需要）
bun add -D @types/rehype-highlight
```

### 2.2 目录结构

```
src/
├── components/
│   └── assistant-ui/          # 新增
│       ├── thread.tsx         # 对话容器
│       ├── reasoning.tsx      # 思考过程
│       ├── tool-fallback.tsx  # 工具调用回退
│       ├── markdown-text.tsx  # Markdown 渲染
│       └── my-runtime-provider.tsx  # Runtime 提供者
├── adapters/
│   └── gateway-model-adapter.ts     # 后端适配器
└── routes/_auth/chat/
    └── $agentId.tsx           # 修改：使用 assistant-ui
```

---

## 三、核心实现

### 3.1 创建 Runtime Provider

**文件**：`src/components/assistant-ui/my-runtime-provider.tsx`

```tsx
"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { gatewayModelAdapter } from "@/adapters/gateway-model-adapter";

export function MyRuntimeProvider({ children }: { children: ReactNode }) {
  const runtime = useLocalRuntime(gatewayModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
```

### 3.2 创建后端适配器

**文件**：`src/adapters/gateway-model-adapter.ts`

```tsx
import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";
import { chatApi } from "@/api/agenthub";
import { useAuthStore } from "@/stores/auth";

export const gatewayModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal, unstable_threadId }) {
    const token = useAuthStore.getState().tokens?.accessToken ?? "";
    
    // 从 threadId 或默认值获取 agentId
    const agentId = unstable_threadId 
      ? Number(unstable_threadId) 
      : 1;

    // 获取最后一条用户消息
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    // 提取文本内容
    const userContent = lastUserMessage.content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n");

    // 使用现有的 chatApi.stream
    const stream = chatApi.stream(agentId, userContent, token, {
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

### 3.3 创建 Thread 组件

**文件**：`src/components/assistant-ui/thread.tsx`

```tsx
"use client";

import { FC } from "react";
import {
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  AuiIf,
} from "@assistant-ui/react";
import { MarkdownText } from "./markdown-text";
import { Reasoning, ReasoningGroup } from "./reasoning";
import { ToolFallback } from "./tool-fallback";
import { Avatar, Button, Flex } from "antd";
import { Bot, Send, Square, User } from "@/core/icons";

const UserMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="flex gap-3 justify-end mb-4">
      <div className="max-w-[78%] px-4 py-2 rounded-xl bg-[#1677ff] text-white">
        <MessagePrimitive.Content components={{ Text: MarkdownText }} />
      </div>
      <Avatar
        style={{ backgroundColor: "#52c41a", flexShrink: 0 }}
        icon={<User size={16} />}
      />
    </MessagePrimitive.Root>
  );
};

const AssistantMessage: FC = () => {
  return (
    <MessagePrimitive.Root className="flex gap-3 mb-4">
      <Avatar
        style={{ backgroundColor: "#1677ff", flexShrink: 0 }}
        icon={<Bot size={16} />}
      />
      <div className="max-w-[78%] px-4 py-2 rounded-xl bg-white border border-gray-200">
        <MessagePrimitive.Parts
          components={{
            Text: MarkdownText,
            Reasoning,
            ReasoningGroup,
            tools: { Fallback: ToolFallback },
          }}
        />
      </div>
    </MessagePrimitive.Root>
  );
};

const Composer: FC = () => {
  return (
    <ComposerPrimitive.Root className="flex gap-2">
      <ComposerPrimitive.Input
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-[#1677ff]"
        placeholder="输入消息，Enter 发送，Shift+Enter 换行"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <Button type="primary" icon={<Send size={16} />}>
            发送
          </Button>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button danger icon={<Square size={16} />}>
            停止
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
};

const ThreadWelcome: FC = () => {
  return (
    <Flex
      vertical
      align="center"
      justify="center"
      className="h-full text-gray-400"
    >
      <Bot size={48} />
      <p className="mt-3">还没有对话。在下方输入框开始第一句话吧。</p>
    </Flex>
  );
};

export const Thread: FC = () => {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full">
      <ThreadPrimitive.Viewport className="flex-1 overflow-auto p-4 bg-[#fafafa]">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>

        <ThreadPrimitive.Messages
          components={{
            User: UserMessage,
            Assistant: AssistantMessage,
          }}
        />

        <div className="min-h-8" />
      </ThreadPrimitive.Viewport>

      <ThreadPrimitive.ViewportFooter className="p-4 border-t border-gray-200 bg-white">
        <Composer />
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Root>
  );
};
```

### 3.4 创建 Reasoning 组件

**文件**：`src/components/assistant-ui/reasoning.tsx`

```tsx
"use client";

import { FC, useState } from "react";
import {
  ReasoningPrimitive,
  useAuiState,
  type ReasoningGroupComponent,
} from "@assistant-ui/react";
import { Button, Collapse } from "antd";
import { ChevronRight, Loader2 } from "lucide-react";

const { Panel } = Collapse;

export const Reasoning: FC = ({ children }) => {
  return (
    <ReasoningPrimitive.Root className="my-2">
      <ReasoningPrimitive.Content>
        <ReasoningPrimitive.Text className="text-sm text-gray-600">
          {children}
        </ReasoningPrimitive.Text>
      </ReasoningPrimitive.Content>
    </ReasoningPrimitive.Root>
  );
};

export const ReasoningGroup: ReasoningGroupComponent = ({
  children,
  startIndex,
  endIndex,
}) => {
  const isReasoningStreaming = useAuiState((s) => {
    if (s.message.status?.type !== "running") return false;
    const lastIndex = s.message.parts.length - 1;
    if (lastIndex < 0) return false;
    const lastType = s.message.parts[lastIndex]?.type;
    if (lastType !== "reasoning") return false;
    return lastIndex >= startIndex && lastIndex <= endIndex;
  });

  const [isOpen, setIsOpen] = useState(isReasoningStreaming);

  return (
    <Collapse
      className="my-2 bg-gray-50 border border-gray-200 rounded-lg"
      activeKey={isOpen ? ["reasoning"] : []}
      onChange={() => setIsOpen(!isOpen)}
    >
      <Panel
        key="reasoning"
        header={
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {isReasoningStreaming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronRight
                size={14}
                className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
              />
            )}
            <span>思考过程</span>
          </div>
        }
      >
        <div className="text-sm text-gray-600 whitespace-pre-wrap">
          {children}
        </div>
      </Panel>
    </Collapse>
  );
};
```

### 3.5 创建 ToolFallback 组件

**文件**：`src/components/assistant-ui/tool-fallback.tsx`

```tsx
"use client";

import { FC } from "react";
import { Card, Spin, Typography, Tag } from "antd";
import { CheckCircle, Clock, ErrorCircle } from "@/core/icons";

const { Text, Paragraph } = Typography;

interface ToolFallbackProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status?: {
    type: "pending" | "running" | "completed" | "error";
  };
}

export const ToolFallback: FC<ToolFallbackProps> = ({
  toolName,
  args,
  result,
  status,
}) => {
  const getStatusIcon = () => {
    switch (status?.type) {
      case "running":
        return <Spin size="small" />;
      case "completed":
        return <CheckCircle size={14} className="text-green-500" />;
      case "error":
        return <ErrorCircle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  return (
    <Card
      size="small"
      className="my-2 bg-gray-50 border border-gray-200"
      title={
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <Text strong className="text-sm">
            工具调用: {toolName}
          </Text>
          <Tag color={status?.type === "completed" ? "green" : "default"}>
            {status?.type || "pending"}
          </Tag>
        </div>
      }
    >
      <div className="space-y-2">
        <div>
          <Text type="secondary" className="text-xs">
            参数:
          </Text>
          <Paragraph
            code
            className="text-xs mt-1 !mb-0"
          >
            {JSON.stringify(args, null, 2)}
          </Paragraph>
        </div>
        {result !== undefined && (
          <div>
            <Text type="secondary" className="text-xs">
              结果:
            </Text>
            <Paragraph
              code
              className="text-xs mt-1 !mb-0"
            >
              {typeof result === "object"
                ? JSON.stringify(result, null, 2)
                : String(result)}
            </Paragraph>
          </div>
        )}
      </div>
    </Card>
  );
};
```

### 3.6 创建 MarkdownText 组件

**文件**：`src/components/assistant-ui/markdown-text.tsx`

```tsx
"use client";

import { FC } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github.css";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

function extractTextFromNode(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    return extractTextFromNode(
      (node as { props: { children?: React.ReactNode } }).props.children
    );
  }
  return "";
}

const CodeBlock: FC<CodeBlockProps> = ({ children, className }) => {
  const code = extractTextFromNode(children).replace(/\n$/, "");
  const lang = className?.replace("language-", "") ?? "";

  return (
    <div className="relative my-2">
      {lang && (
        <span className="absolute top-1 left-3 text-xs text-gray-500 font-mono">
          {lang}
        </span>
      )}
      <pre className={`rounded-lg bg-gray-900 text-gray-100 p-4 pt-6 overflow-x-auto`}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownText: FC<{ children: string }> = ({ children }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        pre: ({ children }) => <>{children}</>,
        code: ({ children, className }) => {
          const match = /language-(\w+)/.exec(className ?? "");
          return match ? (
            <CodeBlock className={className}>{children}</CodeBlock>
          ) : (
            <code className="px-1 py-0.5 bg-gray-100 rounded text-sm">
              {children}
            </code>
          );
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
```

---

## 四、集成到聊天页面

### 4.1 修改聊天页面

**文件**：`src/routes/_auth/chat/$agentId.tsx`

```tsx
import { agentApi } from "@/api/agenthub";
import { PageContainer } from "@/components/PageContainer";
import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "@/components/assistant-ui/my-runtime-provider";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Alert, Spin } from "antd";

export const Route = createFileRoute('/_auth/chat/$agentId')({
  component: ChatPage,
  staticData: { breadcrumb: '对话' },
});

function ChatPage() {
  const { agentId } = Route.useParams();
  const agentIdNum = Number(agentId);

  const agentQ = useQuery({
    queryKey: ['agent', agentIdNum],
    queryFn: () => agentApi.get(agentIdNum),
    enabled: Number.isFinite(agentIdNum),
  });

  if (!Number.isFinite(agentIdNum)) {
    return <Alert type="error" title="无效的 Agent ID" />;
  }

  if (agentQ.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <PageContainer
      title={agentQ.data ? `与「${agentQ.data.name}」对话` : '对话'}
      subtitle={
        agentQ.data ? (
          <span>
            模型：<code>{agentQ.data.model}</code>　·　温度：{agentQ.data.temperature}
          </span>
        ) : undefined
      }
    >
      <MyRuntimeProvider>
        <Thread />
      </MyRuntimeProvider>
    </PageContainer>
  );
}
```

---

## 五、后端 API 扩展（可选）

### 5.1 支持 Reasoning 的 SSE 格式

如果后端需要支持思考过程展示，可扩展 SSE 事件格式：

```typescript
// 新的 SSE 事件格式
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

### 5.2 适配器扩展

```tsx
// 支持 reasoning 的适配器
const gatewayModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    // ... 获取消息 ...

    const stream = chatApi.stream(agentId, userContent, token, {
      signal: abortSignal,
    });

    let textContent = "";
    let reasoningContent = "";

    for await (const event of stream) {
      switch (event.type) {
        case "text":
          textContent += event.content;
          break;
        case "reasoning":
          reasoningContent += event.content;
          break;
      }

      yield {
        content: [
          ...(reasoningContent
            ? [{ type: "reasoning" as const, text: reasoningContent }]
            : []),
          ...(textContent
            ? [{ type: "text" as const, text: textContent }]
            : []),
        ],
      };
    }
  },
};
```

---

## 六、样式调整

### 6.1 与 Ant Design 主题一致

```tsx
// 在 Thread 组件中使用 Ant Design 的颜色变量
<div className="bg-[var(--ant-color-bg-container)]">
  <div className="text-[var(--ant-color-text)]">
  <div className="border-[var(--ant-color-border)]">
```

### 6.2 暗色模式支持

```tsx
// 使用 data-theme 属性
[data-theme="dark"] {
  .thread-viewport {
    background: var(--ant-color-bg-elevated);
  }
}
```

---

## 七、迁移检查清单

- [ ] 安装 `@assistant-ui/react` 和 `@assistant-ui/react-markdown`
- [ ] 创建 `src/components/assistant-ui/` 目录
- [ ] 实现 `gateway-model-adapter.ts`
- [ ] 实现 Thread、Reasoning、ToolFallback 组件
- [ ] 修改聊天页面使用 `MyRuntimeProvider`
- [ ] 测试流式响应是否正常
- [ ] 测试代码块渲染是否正常
- [ ] （可选）后端支持 reasoning 事件
- [ ] （可选）后端支持 tool_call 事件

---

## 八、参考链接

- [assistant-ui 官方文档](https://www.assistant-ui.com/docs)
- [LocalRuntime 文档](https://www.assistant-ui.com/docs/runtimes/custom/local)
- [Reasoning 组件](https://www.assistant-ui.com/docs/ui/reasoning)
- [Tools 指南](https://www.assistant-ui.com/docs/guides/tools)
- [Thread 组件](https://www.assistant-ui.com/docs/ui/thread)
- [参考文档](../docs/refs/ref_019_assistant-ui_latest.md)
