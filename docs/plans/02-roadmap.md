# 版本路线图

从 MVP 到毕业论文交付的完整规划，每个版本都是一个可交付、可演示、可截图的里程碑。

## v0.1 — MVP 后端骨架 ✅ 已发布

**目标**：跑通「注册 → 配置 Agent → 流式对话」主链路

**交付**
- 5 张表：users / prompts / keys / agents / messages
- ~25 个 REST 端点，统一 `/api/v1/` 前缀
- fastapi-users JWT 认证
- Fernet 加密的 Key 存储
- LiteLLM 统一多模型调用（已验证智谱 GLM-4.5）
- SSE 流式 + JSON 非流式
- 冒烟测试 + 真实模型测试脚本
- README + 文档中心

## v0.2 — 前端极简 UI（待启动）

**目标**：有管理后台可以点击操作，不用 Swagger UI 调接口

**交付**
- React 18 + TypeScript + Vite
- 3 个核心页面：
  - `/login` 登录 / 注册
  - `/agents` Agent 列表、创建、编辑（含 Prompt/Key 选择器）
  - `/chat/:agentId` 对话页面（SSE 流式渲染 + Markdown）
- 1 个辅助页：`/keys` + `/prompts` 管理
- 使用 Vercel AI SDK `useChat` 处理流式
- 使用 TanStack Query 管状态
- shadcn/ui 或 Chakra UI 组件
- 打通 CORS 与 JWT 拦截器

**预计工作量**：3–4 天

## v0.3 — MCP 工具集成

**目标**：Agent 能调用外部 MCP Server 提供的工具，从"聊天机器人"升级为"Agent"

**交付**
- 新增表：`tools`（MCP Server 地址 + 元信息）、`agent_tools`（多对多绑定）
- 新增端点：
  - `POST /api/v1/tools` 注册 MCP Server
  - `GET /api/v1/tools/{id}/discover` 拉取工具清单
  - `POST /api/v1/agents/{id}/bind-tools` 绑定
- Chat 路由增强：
  - 用 Python MCP SDK 连接 MCP Server
  - 把工具列表转为 LiteLLM tool schema
  - 处理 tool_call 循环（最多 N 轮）
  - 把工具调用结果在 SSE 中流出
- 前端：工具市场页面 + Agent 编辑时勾选工具

**预计工作量**：5–7 天（最复杂）

## v0.4 — 多轮对话 + 对外 API Key

**目标**：两个关键能力

**4.1 多轮对话上下文**
- 新增表：`conversations`（会话）
- Chat 参数新增 `conversation_id`
- 调用模型时把历史 messages 一起带上
- 滑窗或 tokenizer 截断避免超上下文

**4.2 对外平台 API Key**
- 新增表：`platform_keys`（平台签发给外部的 Key）
- 新增端点：
  - `POST /api/v1/platform-keys` 生成 / `DELETE` 撤销
  - 该 Key 支持作为 Bearer token 直调 `/api/v1/agents/{id}/chat`
- 实现双路认证：JWT（管理后台）+ PlatformKey（外部调用）

**预计工作量**：3–4 天

## v0.5 — 管理员后台 + 调用统计

**目标**：满足毕业论文"三端"架构要求

**交付**
- 新增 is_superuser 判断的端点：
  - `GET /api/v1/admin/users` 用户列表
  - `PATCH /api/v1/admin/users/{id}/toggle-active` 启用/禁用
  - `GET /api/v1/admin/stats` 平台统计
- 新增表：`call_logs`（调用日志：用户/Agent/模型/tokens/耗时）
- Chat 结束后写日志
- 管理员前端页面：用户管理、数据大盘（echarts / recharts）

**预计工作量**：3–4 天

## v1.0 — 论文交付版

**目标**：可评审、可演示、可答辩

**交付**
- 系统功能完全实现
- 全流程录屏 + 截图（35+ 张）
- 完整 ER 图、架构图、流程图、用例图
- 部署到服务器（可选）
- Dockerfile + docker-compose
- 毕业论文 7 章成稿

## 总时间预估

| 版本 | 天数 | 累计 |
|---|---|---|
| v0.1 MVP 后端 | 6 天 ✅ | 6 |
| v0.2 前端 | 4 天 | 10 |
| v0.3 MCP 工具 | 7 天 | 17 |
| v0.4 多轮 + 平台 Key | 4 天 | 21 |
| v0.5 管理员后台 | 4 天 | 25 |
| 论文写作 | 10 天 | 35 |

约 **5 周** 可达论文答辩水平。

## 对应毕业论文章节

| 论文章节 | 对应版本 |
|---|---|
| 第 4 章 系统设计：4.2.1 用户 | v0.1 |
| 4.2.2 提示词 | v0.1 |
| 4.2.3 智能体 | v0.1 |
| 4.2.4 密钥 | v0.1 |
| 4.2.5 对话交互 | v0.1 + v0.4 |
| 4.2.6 工具管理 | v0.3 |
| 4.2.7 管理员 | v0.5 |
| 4.2.8 平台 API | v0.4 |
| 第 5 章 系统实现 | 每个版本对应一节 |
| 第 6 章 测试 | 每节写一个测试表 |

## 范围外（不做）

明确**不做**的东西，避免范围膨胀：

- ❌ 用户支付 / 余额 / 充值
- ❌ RAG 知识库 / 向量检索
- ❌ 模型微调
- ❌ 复杂的 DAG 工作流编排（n8n 那种）
- ❌ 团队 / 组织 / 多租户分层
- ❌ 实时语音对话
- ❌ 邮件通知 / 短信验证码
- ❌ OAuth 第三方登录
