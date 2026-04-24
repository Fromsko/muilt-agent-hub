# 参考文档索引

> 更新时间：2026-04-22
> 覆盖范围：v0.3 MCP 集成 + A1-A4 迭代任务

---

## 主题与任务映射

| 编号 | 文件 | 主题 | 对应任务 | 优先级 |
|---|---|---|---|---|
| ref_001 | `ref_001_mcp_overview.md` | MCP 协议总览（架构、原语、传输） | v0.3 理解 MCP | 🔴 高 |
| ref_002 | `ref_002_mcp_python_sdk.md` | Python MCP SDK（FastMCP） | v0.3 `uv add mcp` | 🔴 高 |
| ref_003 | `ref_003_mcp_tools_spec.md` | MCP Tools 规范 | v0.3 Schema 转换 | 🔴 高 |
| ref_004 | `ref_004_litellm_tool_calling.md` | LiteLLM tool calling 全流程 | v0.3 Chat 升级 | 🔴 高 |
| ref_005 | `ref_005_litellm_sse_streaming.md` | SSE 流式扩展 | v0.3 tool_call 事件 | 🟡 中 |
| ref_006 | `ref_006_fastapi_sqlmodel_m2m.md` | SQLModel 多对多关系 | v0.3 agent_tool 表 | 🟡 中 |
| ref_007 | `ref_007_mcp_client_python.md` | Python MCP Client | v0.3 代理调用 | 🔴 高 |
| ref_008 | `ref_008_multi_turn_messages.md` | 多轮对话消息组装策略 | **A1 多轮上下文** | 🔴 高 |
| ref_009 | `ref_009_react_markdown_chat.md` | react-markdown + 代码高亮 + 复制按钮 | **A2 Chat UX** | 🔴 高 |
| ref_010 | `ref_010_abort_controller_streaming.md` | AbortController 停止生成 | **A2 Chat UX** | 🟡 中 |
| ref_011 | `ref_011_dashboard_real_data.md` | Dashboard 接真数据分析 | **A3 仪表盘** | 🟡 中 |
| ref_012 | `ref_012_litellm_key_test.md` | Key 连通性测试方案 | **A4 Key 测试** | 🟡 中 |
| ref_013 | `ref_013_api_token_design.md` | 对外 API Token 设计（hash 存储、prefix、双轨认证） | **B1 对外 API Key** | 🔴 高 |
| ref_014 | `ref_014_mcp_filesystem_ollama.md` | MCP 文件系统 Server + Ollama 本地模型 | **B2 MCP 集成** | 🟡 中 |
| ref_015 | `ref_015_call_logs_analytics.md` | call_logs 表 + 统计查询 + SQLAlchemy event | **B3 调用统计** | 🔴 高 |
| ref_016 | `ref_016_mermaid_diagrams.md` | Mermaid ER/时序/架构/类图 + 论文配图清单 | **B4 论文素材** | 🟡 中 |
| ref_017 | `ref_017_litellm_full_reference.md` | **LiteLLM 全景参考**（acompletion / 模型名 / token计数 / 费用 / 错误处理） | **全阶段核心** | 🔴 高 |
| ref_018 | `ref_018_b_stage_integration.md` | **B 阶段集成补充**（双轨认证 / 公开端点 / chat_service 提取 / 时间序列SQL / 前端菜单） | **B1+B2+B3 集成** | 🔴 高 |

---

## 技术栈聚焦

```
本项目唯一 LLM 调用入口：litellm.acompletion()
├── ref_017 ← 总纲（必读）
├── ref_004 ← tool calling 细节
├── ref_005 ← SSE 流式细节
├── ref_008 ← token 计数用于多轮
└── ref_015 ← 费用计算用于统计
```

---

## 建议阅读顺序

### A1 多轮对话
```
ref_008 → 多轮消息组装策略（滑窗 / token 预算）
  核心改动：app/routers/chat.py 的 _build_messages
```

### A2 Chat UX 增强
```
ref_009 → react-markdown + remark-gfm + rehype-highlight + 复制按钮
ref_010 → AbortController 停止生成按钮
  核心改动：web/src/routes/_auth/chat/$agentId.tsx
```

### A3 仪表盘
```
ref_011 → Dashboard 现状分析 + 真数据端点设计
  核心改动：新增 GET /stats + dashboard/index.tsx 重写
```

### A4 Key 测试
```
ref_012 → LiteLLM 最小化调用验证 + 前端按钮
  核心改动：新增 POST /keys/test
```

### v0.3 MCP 集成（后续）
```
ref_001 → ref_003 → ref_002 → ref_004 → ref_007 → ref_005 → ref_006
```

---

## 各文档摘要

### ref_008 — 多轮对话消息组装
- 三种策略对比：滑动窗口（推荐）/ Token 预算截断 / 摘要压缩
- `_build_messages` 改造方案：查询 messages 表 → 拼装 history → 追加当前消息
- 数据库查询 `get_recent_messages` 实现
- 注意事项：token 超限、system prompt 位置

### ref_009 — Chat Markdown 渲染
- `react-markdown` + `remark-gfm` + `rehype-highlight` 安装和用法
- 自定义 `CodeBlock` 组件：语言标签 + 复制按钮
- `MessageBubble` 改造：用户消息 pre-wrap，助手消息 Markdown 渲染
- 流式时的降级处理（流式中纯文本，完成后切换 Markdown）
- Token 用量展示方案

### ref_010 — 停止生成
- `AbortController` + `fetch(signal)` 原理
- `chatApi.stream` 增加 `signal` 参数
- `ChatPage` 中管理 controller 状态
- UI 按钮：发送 ↔ 停止 切换
- 后端无需修改，`finally` 保证持久化

### ref_011 — Dashboard 接真数
- 现状分析：所有数据来自 `console.ts` mock
- 后端 `GET /stats`：统计 prompt/key/agent/message 数量 + 最近消息
- 前端改造：`statsApi.get()` + `useQuery` 替换硬编码
- 删除无用组件：GatewayHealthCard、AlertListCard、SystemOverviewCard

### ref_012 — Key 连通性测试
- 后端 `POST /keys/test`：用 `litellm.acompletion` 发 "hi" 验活
- 根据 `api_base` 自动推断测试模型
- 前端按钮 + 结果 Tag 展示
- 安全考虑：不存储测试 Key、超时 15s

### B 阶段

### ref_013 — 对外 API Token 设计
- Token 格式 `ah_` + 32 位随机串（`secrets.token_urlsafe`）
- SHA-256 hash 存储，原始 token 仅创建时返回一次
- `ApiToken` 模型：prefix / token_hash / last_used_at / enabled
- 双轨认证依赖：同时支持 JWT 和 `ah_xxx` API Token
- CRUD 路由 + `ApiTokenReadWithToken` 创建时附带明文

### ref_014 — MCP 文件系统 Server + Ollama
- `@modelcontextprotocol/server-filesystem` 启动方式（npx / Docker）
- 暴露的 13 个工具（read/write/list/search/edit）
- Ollama 本地模型配置（`ollama_chat/llama3.2` + `api_base`）
- B2 demo 完整流程：注册 → 发现 → 绑定 → 对话代理调用
- MCPToolManager 封装类（Stdio / HTTP 两种连接）

### ref_015 — 调用统计
- `CallLog` 模型：user_id / agent_id / model / tokens / duration / status
- 推荐方案 A：chat.py 中手动记录（比 middleware 更精准）
- GET /stats 端点：按用户维度聚合（总数/成功/失败/token/耗时/模型分布/Top Agent）
- GET /admin/stats 端点：管理员全局视角
- SQLAlchemy event 机制简介（可选，用于 Message 写入钩子）

### ref_016 — Mermaid 图表语法
- ER 图：当前表结构 + B1 api_tokens 扩展 + v0.3 tool 扩展
- 时序图：Chat 流 / MCP 工具调用流 / API Token 认证流
- 架构图：系统分层 + 模块依赖
- 类图：核心类关系
- 论文配图清单：10 张图的内容和来源

### ref_017 — LiteLLM 全景参考（⭐ 核心）
- `acompletion()` 完整参数表（model / messages / api_key / tools / stream / timeout）
- 模型命名规则：原生 vs `openai/` 前缀 vs `ollama_chat/`
- 响应结构：非流式 / 流式 / tool_calls 增量拼接
- `token_counter()` — A1 多轮 token 预算截断
- `response._hidden_params["response_cost"]` — B3 费用统计
- `supports_function_calling()` — B2 模型能力检测
- 错误类型：AuthenticationError / RateLimitError / ContextWindowExceeded
- 各任务与 LiteLLM 能力的关联速查表

### ref_018 — B 阶段集成补充（⭐ 实现指南）
- B1 双轨认证完整实现：`get_current_user_from_api_token` 依赖 + 公开路由
- B1 `chat_service.py` 提取：internal/public 两个路由复用同一套逻辑
- B1 前端 Token 管理页：列表 / 创建弹窗 / 复制 / 使用示例
- B3 时间序列 SQL：SQLite `DATE(created_at)` 按天聚合 + SQLAlchemy 写法
- B3 对接 SimpleLineChart：`{label, value}[]` 格式转换
- B2 完整 SSE 工具调用流程：4 步循环 + 前端事件解析
- 路由注册汇总 + 前端菜单新增 API Token 项
