# 流式输出与 AI 聊天 UI

> 收录时间：2026-04  
> 覆盖：Streaming Text 渲染、AI Chat 组件库、Typewriter 效果、LLM 响应展示

---

## 一、AI Chat 完整组件库

### 1. shadcn/ui AI Components

- **网址**：https://www.shadcn.io/ai
- **定位**：25+ 专为 AI 对话设计的 React 组件，copy-paste 哲学
- **技术栈**：React + TypeScript + Tailwind CSS + Vercel AI SDK
- **核心组件**：

| 分类 | 组件 | 功能 |
|------|------|------|
| 核心对话 | Message | 用户/助手消息气泡，支持附件 & markdown |
| | Conversation | 自动滚动容器 + scroll-to-bottom 按钮 |
| | Prompt Input | 自适应高度输入框 + 文件附件 + 工具栏 |
| | Model Selector | 可搜索模型下拉 + Provider Logo |
| | Suggestion | 滚动建议条 |
| AI 响应 | Reasoning | 可折叠思考块，带耗时 & 自动收起 |
| | Tool | 函数调用展示：输入/输出/状态指示器 |
| | Sources | 可展开引用列表 |
| | Branch | 在重新生成的响应版本间导航 |
| | Chain of Thought | 分步推理展示 |
| | Inline Citation | 行内编号引用 |
| 加载 & 进度 | Loader | 多尺寸动画加载指示器 |
| | **Shimmer** | Skeleton 脉冲加载（流式内容占位） |
| | Task | 任务列表 + 文件引用 + 完成状态 |
| | **Queue** | 多任务队列 + 进度可视化 |
| | Plan | 可展开计划展示 + 步骤追踪 |
| 代码 & 内容 | Code Block | 语法高亮代码块 |
| | Artifact | 生成物展示 |
| | Image / Web Preview | 图片 & 网页预览 |

### 2. assistant-ui

- **网址**：https://www.assistant-ui.com
- **GitHub**：https://github.com/assistant-ui/assistant-ui
- **定位**：生产级 AI 聊天 React 库，开箱即用
- **核心能力**：
  - Streaming 响应（逐 token 渲染，无抖动）
  - Auto-scroll（真正好用的自动滚动，处理各种边界情况）
  - Markdown + 代码高亮
  - 重试 / 附件 / 语音输入（听写）
  - 键盘快捷键 + 无障碍
  - 消息分支（Branch）
- **集成**：Vercel AI SDK / OpenAI / Anthropic / 自定义后端

### 3. prompt-kit

- **网址**：https://www.prompt-kit.com
- **定位**：模块化 AI Chat 组件，基于 shadcn/ui 设计原则
- **组件列表**：
  - Prompt Input (带 actions / suggestions / autocomplete)
  - Conversation (带 avatars / actions / scroll-to-bottom)
  - Sidebar (聊天历史)
  - Full Chat App (完整组装)
  - Full Chatbot (primitives 级别)
  - Tool Calling (primitives 级别)
- **特点**：Streaming responses + markdown + code blocks，可直接用于生产

### 4. Stream Chat (GetStream)

- **网址**：https://getstream.io/chat/docs/sdk/react
- **定位**：企业级实时聊天 SDK，支持 AI 集成
- **AI 功能**：
  - `StreamedMessageText` — AI 流式消息渲染组件
  - Markdown / 代码高亮 / 表格内置
  - 实时 Chat API + LLM Provider 集成
- **适合**：需要完整实时聊天基础设施的场景

### 5. LlamaIndex chat-ui

- **GitHub**：https://github.com/run-llama/chat-ui
- **定位**：LLM 应用专用 Chat 组件
- **特点**：即插即用，快速为 LLM 应用添加 Chat 界面

### 6. Chatbot UI

- **GitHub**：https://github.com/mckaywrigley/chatbot-ui
- **定位**：开源 ChatGPT 界面克隆
- **技术栈**：Next.js + Supabase + Tailwind CSS
- **注意**：是完整应用而非组件库，提取组件需要较多重构

---

## 二、流式文本渲染 (Streaming Text)

### FlowToken

- **GitHub**：https://github.com/Ephibbs/flowtoken
- **npm**：`@nvq/flowtoken`（社区 fork 含 GitHub 主题语法高亮）
- **功能**：
  - 平滑逐字/逐词展示 LLM 输出
  - 控制显示速度，平衡生成速度的不均匀性
  - 多种动画模式（fade-in / slide / typewriter）
  - 轻量响应式，兼容所有现代浏览器
  - 与 Vercel AI SDK 配合使用

### Vercel AI SDK

- **网址**：https://ai-sdk.dev
- **核心 API**：
  - `streamText()` — 服务端流式生成
  - `useChat()` — 客户端 React Hook，管理消息状态 + 流式渲染
  - RSC Streaming — React Server Components 流式传输
- **特点**：行业标准，支持 OpenAI / Anthropic / Google / Mistral 等所有主流 Provider
- **参考**：[Real-time AI in Next.js](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)

### ChatGPT 式流式渲染原理

> 来源：Reddit r/reactjs 讨论

- ChatGPT 不会每个 token 都触发 re-render
- 使用 **refs/streams 缓冲** chunks，批量更新 DOM
- 关键技术：`requestAnimationFrame` 批处理 + `ref` 直接操作
- Markdown 解析使用增量式解析器（不是每次全量解析）

---

## 三、Typewriter / 打字机效果

| 方案 | 来源 | 特点 |
|------|------|------|
| **Motion `<Typewriter>`** | https://motion.dev/docs/react-typewriter | Motion+ 付费组件，可控速度/方差/光标样式/闪烁 |
| **shadcn Typing Text** | https://www.shadcn.io/text/typing-text | 逐字打字 + 闪烁光标，支持单字符串或循环数组 |
| **react-typing-effect** | npm: `react-typing-effect` | 纯 React 组件，打字 + 擦除 + 光标 |
| **TypeIt** | https://macarthur.me/posts/streaming-text-with-typeit/ | 支持 LLM 流式场景的打字效果 |
| **自定义实现** | `useEffect` + `setInterval` | 最灵活，适合深度定制 |

---

## 四、AI Chat UI 选型对比 (2026)

| 名称 | Streaming | Citations | Feedback | Tool Call | 无障碍 | 定价 |
|------|-----------|-----------|----------|-----------|--------|------|
| shadcn/ui AI | ✅ | ✅ inline + footnote | ✅ | ✅ | ✅ | 免费 |
| assistant-ui | ✅ | ✅ | ✅ | ✅ | ✅ WCAG | 免费开源 |
| prompt-kit | ✅ | — | — | ✅ | ✅ | 免费 |
| thefrontkit Chat Kit | ✅ token-by-token | ✅ inline + footnote | ✅ thumbs/ratings/text | ✅ | ✅ WCAG AA | $79+ |
| Vercel AI SDK | ✅ (SDK only) | — | — | — | Basic | 免费 |
| Stream Chat | ✅ | — | — | — | ✅ | 付费 (免费层) |
| Chatbot UI | ✅ | — | — | — | Basic | 免费 |

---

## 五、实践建议

### 选择策略

```
需要 AI 聊天的完整界面 → assistant-ui 或 shadcn/ui AI
只需要流式文本渲染 → FlowToken + Vercel AI SDK
需要打字机效果（非 AI） → shadcn Typing Text 或 react-typing-effect
企业级实时聊天 + AI → Stream Chat
```

### 关键实现模式

1. **流式渲染**：使用 `ref` + `requestAnimationFrame` 批量更新，避免每 token re-render
2. **Markdown 增量解析**：使用 streaming-friendly 的 markdown 解析器（如 `marked` 的 streaming mode）
3. **Auto-scroll**：监听内容变化 + 判断用户是否主动滚动（scrollTop + clientHeight ≈ scrollHeight）
4. **消息恢复**：结合 Zustand persist 持久化对话历史，刷新后恢复

---

## 六、参考链接

- [React Components for Conversational AI](https://www.shadcn.io/ai)
- [assistant-ui — AI Chat Interface Library](https://github.com/assistant-ui/assistant-ui)
- [prompt-kit Chat UI](https://www.prompt-kit.com/chat-ui)
- [FlowToken — Animate LLM Streaming Text](https://github.com/Ephibbs/flowtoken)
- [Vercel AI SDK — streamText](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
- [Streaming React Components — AI SDK RSC](https://ai-sdk.dev/docs/ai-sdk-rsc/streaming-react-components)
- [Best AI Chat UI Kits in 2026](https://thefrontkit.com/blogs/best-ai-chat-ui-kits-2026)
- [Real-time AI in Next.js: Streaming with Vercel AI SDK](https://blog.logrocket.com/nextjs-vercel-ai-sdk-streaming/)
