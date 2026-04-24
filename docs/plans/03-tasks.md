# 任务清单（看板）

细粒度任务跟踪，按版本分组。打勾 `[x]` 表示完成，`[ ]` 表示待做。

## v0.1 — MVP 后端 ✅

### 基础设施
- [x] `uv init core` 初始化项目
- [x] 安装依赖（fastapi/sqlmodel/fastapi-users/litellm/cryptography/pydantic-settings）
- [x] `.env` / `.env.example`
- [x] `.gitignore`
- [x] `app/config.py` 读环境变量

### 数据库
- [x] `app/db.py` 异步 SQLite 引擎
- [x] `Base.metadata = SQLModel.metadata` 共享元数据
- [x] `init_db()` 启动时 create_all
- [x] `get_async_session()` 依赖注入

### 认证
- [x] `app/models/user.py` SQLAlchemyBaseUserTableUUID
- [x] `app/auth/schemas.py` UserRead/Create/Update
- [x] `app/auth/manager.py` UserManager
- [x] `app/auth/backend.py` JWT backend + FastAPIUsers
- [x] `app/routers/auth.py` 挂载 fastapi-users 路由
- [x] 验证：注册 → 登录 → /users/me

### Prompt 模块
- [x] `app/models/prompt.py`
- [x] `app/schemas/prompt.py`
- [x] `app/routers/prompts.py` 5 个 CRUD 端点
- [x] 所有权校验（user_id 过滤）

### Key 模块
- [x] `app/models/key.py`（api_key_encrypted 字段）
- [x] `app/crypto.py`（Fernet encrypt/decrypt/mask）
- [x] `app/schemas/key.py`（写入 api_key，读出 api_key_masked）
- [x] `app/routers/keys.py` 3 个端点

### Agent 模块
- [x] `app/models/agent.py`（含 FK 到 prompts / keys）
- [x] `app/schemas/agent.py`
- [x] `app/routers/agents.py` 5 个 CRUD 端点
- [x] 创建/更新时校验 prompt_id/key_id 归属本人

### Chat 模块
- [x] `app/models/message.py`
- [x] `app/schemas/chat.py`（ChatRequest/Response/MessageRead）
- [x] `app/routers/chat.py`
  - [x] 加载 Agent 上下文
  - [x] 解密 Key
  - [x] LiteLLM `acompletion` 流式 + 非流式
  - [x] SSE 按 `data: {json}\n\n` 协议
  - [x] 完成后用独立 session 写 messages 表
  - [x] 错误处理：模型异常包装成 502
- [x] `GET /agents/{id}/messages` 历史查询

### 挂载 + 入口
- [x] `app/main.py` CORS + lifespan + api_v1 APIRouter 组合
- [x] 健康检查 `/health`
- [x] 根路由 `/`

### 测试
- [x] `smoke_test.py` CRUD + 隔离 + 异常路径
- [x] `test_zhipu_chat.py` 智谱 GLM-4.5 真实调用 ✅
- [x] 验证 stream + non-stream 两种模式

### 文档
- [x] `README.md` 启动说明
- [x] `docs/` 文档中心（本目录）

---

## v0.2 — 前端极简 UI（待启动）

### 项目初始化
- [ ] 新目录 `frontend/`
- [ ] `pnpm create vite` 选 react-ts
- [ ] 装依赖：
  - [ ] `@tanstack/react-router`
  - [ ] `@tanstack/react-query`
  - [ ] `ai`（Vercel AI SDK）
  - [ ] `zod`（表单校验）
  - [ ] shadcn/ui
  - [ ] `react-markdown`

### 基础设施
- [ ] `src/lib/api.ts` axios 封装 + JWT 拦截器
- [ ] `src/routes/__root.tsx` 全局布局
- [ ] `src/contexts/AuthContext.tsx` token 存 localStorage
- [ ] CORS 对齐后端 `CORS_ORIGINS`

### 页面
- [ ] `/login` 登录 + 注册切换
- [ ] `/agents` Agent 列表（卡片）
- [ ] `/agents/new` 创建 Agent（Prompt / Key / 模型选择）
- [ ] `/agents/:id/edit` 编辑
- [ ] `/agents/:id/chat` 对话页面
  - [ ] Vercel AI SDK `useChat` 接 SSE
  - [ ] Markdown 流式渲染
  - [ ] 历史消息加载
- [ ] `/prompts` 提示词列表 + 编辑
- [ ] `/keys` 密钥列表 + 新增

---

## v0.3 — MCP 工具集成（待启动）

### 依赖
- [ ] `uv add mcp`（官方 Python MCP SDK）

### 数据模型
- [ ] `app/models/tool.py`（id, user_id, name, server_url, auth_type, enabled）
- [ ] `app/models/agent_tool.py`（多对多：agent_id + tool_id）

### 路由
- [ ] `POST /api/v1/tools` 注册 MCP Server
- [ ] `GET /api/v1/tools` 列表
- [ ] `DELETE /api/v1/tools/{id}`
- [ ] `GET /api/v1/tools/{id}/discover` 拉取工具清单
- [ ] `PUT /api/v1/agents/{id}/tools` 批量绑定/解绑

### Chat 升级
- [ ] 查询 Agent 的 tools
- [ ] 连接各 MCP Server，收集 tool schema
- [ ] 转为 LiteLLM `tools=[...]` 参数
- [ ] Tool-call 循环处理（最多 5 轮）
- [ ] 在 SSE 中流出 `tool_call_start` / `tool_call_result` 事件

---

## v0.4 — 多轮 + 平台 Key（待启动）

### 多轮对话
- [ ] `app/models/conversation.py`
- [ ] messages 表增加 `conversation_id` FK
- [ ] Chat 请求加 `conversation_id?`
- [ ] 拼装历史（滑窗或 token 截断）

### 平台 API Key
- [ ] `app/models/platform_key.py`（id, user_id, hashed_key, name, enabled）
- [ ] `POST /api/v1/platform-keys`（返回明文一次，之后不可见）
- [ ] `DELETE /api/v1/platform-keys/{id}`
- [ ] `app/auth/platform.py` 平台 Key 验证依赖
- [ ] Chat 路由同时支持 JWT 与 Platform Key

---

## v0.5 — 管理员 + 统计（待启动）

### 权限
- [ ] 在关键端点加 `Depends(current_superuser)`
- [ ] `POST /api/v1/admin/users/{id}/toggle-active`

### 统计
- [ ] `app/models/call_log.py`（user_id/agent_id/model/tokens/duration_ms/cost）
- [ ] Chat 完成后写日志
- [ ] `GET /api/v1/admin/stats` 聚合（日调用量、用户数、模型分布）

### 前端管理页
- [ ] `/admin/users` 用户管理
- [ ] `/admin/dashboard` 数据大盘

---

## 工程化（不分版本）

- [ ] 单元测试 pytest + httpx
- [ ] CI（GitHub Actions）
- [ ] Alembic 迁移脚本
- [ ] Dockerfile + docker-compose
- [ ] 结构化日志（structlog 或 loguru）
- [ ] OpenAPI tags 分组优化
- [ ] 性能测试脚本（locust / k6）

---

## 论文任务（v1.0 阶段）

- [ ] 35+ 张图（架构图、ER图、时序图、流程图、UI截图）
- [ ] 20+ 张表（数据库表、测试用例）
- [ ] 8+ 个模块，每个模块「设计 + 实现 + 测试」三处对应
- [ ] 参考文献 15+ 条
- [ ] 中英文摘要
- [ ] 按张家界学院模板排版（详见 `.cursor/labs/school-template/`）
