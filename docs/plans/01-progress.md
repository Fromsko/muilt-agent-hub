# 当前进度快照

> 更新时间：2026-04-22
> 当前版本：**v0.4.0 — B2 MCP 工具集成（发现 + 绑定 + tool-call 循环）**

## 一、里程碑总览

| 里程碑 | 状态 | 备注 |
|---|---|---|
| Day 1 项目骨架 + 认证 | ✅ 完成 | uv + FastAPI + fastapi-users + JWT |
| Day 2 Prompt / Key CRUD | ✅ 完成 | Fernet 加密、读返回脱敏 |
| Day 3 Agent CRUD | ✅ 完成 | 含 FK 所有权校验 |
| Day 4 Chat + LiteLLM 流式 | ✅ 完成 | SSE + JSON 两种模式 |
| Day 5 抛光 + README | ✅ 完成 | README、.env、smoke_test |
| Day 6 真实模型测试 | ✅ 完成 | **智谱 GLM-4.5 端到端测通** |
| v0.1.1 前端接入 + 登录/注册 + antd v6 清零 | ✅ 完成 | Dashboard + Prompt/Key/Agent/Chat 页 |
| v0.1.1 · A1 多轮对话上下文 | ✅ 完成 | 滑动窗口 max_turns=20，记忆测试通过 |
| v0.1.1 · A2 Chat UX | ✅ 完成 | Markdown + 代码高亮 + 复制 + 停止生成（AbortController） |
| v0.1.1 · A3 仪表盘真数 | ✅ 完成 | `GET /stats` + 最近对话列表 |
| v0.1.1 · A4 Key 连通性测试 | ✅ 完成 | `POST /keys/test` + 前端按钮 + 延迟展示 |
| v0.1.1 · E2E 自动化 | ✅ 完成 | `tests/e2e.ps1` 14 步断言 |
| **v0.2 · B1 对外 API Token** | ✅ 完成 | `ah_` 前缀 + SHA256 + 双轨认证 + /public 路由 + 前端管理页 |
| **v0.2.1 · assistant-ui 聊天界面** | ✅ 完成 | LocalRuntime + gatewayModelAdapter；Thread + MarkdownText + AuiIf 停止按钮 |
| **v0.3 · B3 调用日志统计** | ✅ 完成 | `call_logs` 表 + `GET /stats/daily` + 仪表盘 7 天折线图；internal/public 两路都埋点 |
| **v0.4 · B2 MCP 工具集成** | ✅ 完成 | `mcp_servers` + `agent_tools` + `streamablehttp_client` + `run_tool_loop` 多轮循环；demo FastMCP 端到端验通 17+25=42 |

## 二、已实现端点（全部挂在 `/api/v1/` 下）

### 认证
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/jwt/login`
- `POST /api/v1/auth/jwt/logout`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- 管理员专用：`GET/PATCH/DELETE /api/v1/users/{id}`

### Prompts
- `POST /api/v1/prompts`
- `GET /api/v1/prompts`
- `GET /api/v1/prompts/{id}`
- `PATCH /api/v1/prompts/{id}`
- `DELETE /api/v1/prompts/{id}`

### Keys（加密存储，脱敏返回）
- `POST /api/v1/keys`
- `GET /api/v1/keys`
- `DELETE /api/v1/keys/{id}`

### Agents
- `POST /api/v1/agents`（FK 校验）
- `GET /api/v1/agents`
- `GET /api/v1/agents/{id}`
- `PATCH /api/v1/agents/{id}`
- `DELETE /api/v1/agents/{id}`

### Chat
- `POST /api/v1/agents/{id}/chat`（`stream=true` SSE / `stream=false` JSON，支持 `max_turns` 多轮窗口）
- `GET /api/v1/agents/{id}/messages`

### Stats
- `GET /api/v1/stats`（A3：资源计数 + 最近 5 条消息）
- `GET /api/v1/stats/daily?days=N`（B3：最近 N 天按天聚合 calls/tokens/avg_ms/errors，空白天 0 填充）

### Keys 扩展（A4 新增）
- `POST /api/v1/keys/test`（不落库，LiteLLM 最小化验活）

### API Token（B1 新增）
- `POST /api/v1/api-tokens`（创建，返回明文一次）
- `GET /api/v1/api-tokens`（列表，只返回前缀+末4位）
- `PATCH /api/v1/api-tokens/{id}/enabled?enabled=bool`
- `DELETE /api/v1/api-tokens/{id}`

### Public（B1 新增，用 `ah_` token 鉴权）
- `POST /api/v1/public/agents/{id}/chat`（stream / non-stream 都支持）
- `GET /api/v1/public/agents/{id}/messages`
- `GET /api/v1/public/me`

### MCP Servers（B2 新增）
- `POST /api/v1/mcp-servers`（创建 HTTP / stdio MCP server；`auth_token` 用 Fernet 加密落库）
- `GET /api/v1/mcp-servers`
- `PATCH /api/v1/mcp-servers/{id}`
- `DELETE /api/v1/mcp-servers/{id}`
- `POST /api/v1/mcp-servers/{id}/discover`（一次性拉取工具清单 + JSON Schema，不落库）
- `GET /api/v1/mcp-servers/agents/{agent_id}/tools`（该 Agent 已绑定的 MCP servers）
- `PUT /api/v1/mcp-servers/agents/{agent_id}/tools`（全量覆盖式绑定）

### 其他
- `GET /api/v1/health`
- `GET /`（根路径元信息）
- `GET /docs`（Swagger UI）
- `GET /redoc`

## 三、数据库表

| 表 | 行数（测试后） | 说明 |
|---|---|---|
| users | fastapi-users UUID 主键 | 账号、密码哈希、激活状态 |
| prompts | - | 提示词模板 |
| keys | - | Fernet 加密的 API Key + 可选 api_base |
| agents | - | Prompt + Key + model + 模型参数 |
| messages | - | 对话历史（user / assistant） |
| api_tokens | - | 平台 API Token（SHA256 hash，原文只返回一次） |
| call_logs | - | 每次 chat 的 model / channel / duration_ms / tokens / status/error（B3） |
| mcp_servers | - | MCP 服务连接配置（transport / url / command_json / Fernet 加密 token）（B2） |
| agent_tools | - | Agent ↔ MCP server 多对多绑定表（B2） |

## 四、已验证行为

### ✅ 功能
- 注册 → 登录 → JWT Bearer 成功
- Prompt / Key / Agent / Chat 全链路跑通
- SSE 流式返回 token 逐字推送
- 非流式返回完整 reply + token 用量
- **B2 MCP 工具调用**：绑定 `demo-echo`（`add`/`echo`）后，Agent 指令「调用 add 计算 17+25」→ LLM 返回「四十二」；支持多轮循环（最大 5 轮）

### ✅ 安全
- 密钥 Fernet 加密存储，不入明文
- 响应仅返回 `sk-******XXXX` 脱敏形式
- 用户间数据严格隔离（B 看不到 A 的 prompt/key/agent）
- 跨用户访问返回 404（不泄露存在性）

### ✅ 多模型适配
- 智谱 GLM-4.5 通过 OpenAI 兼容模式调通
- 模型格式：`openai/glm-4.5` + `api_base=https://open.bigmodel.cn/api/paas/v4`
- 适配逻辑零代码，全靠 LiteLLM

## 五、代码量统计

| 文件 | 行数 |
|---|---|
| app/main.py | ~50 |
| app/config.py | ~20 |
| app/db.py | ~40 |
| app/crypto.py | ~25 |
| app/models/*（5 个） | ~80 |
| app/schemas/*（4 个） | ~80 |
| app/auth/*（4 个） | ~70 |
| app/routers/*（6 个） | ~400 |
| smoke_test.py | ~130 |
| test_zhipu_chat.py | ~120 |
| **后端代码总计** | **≈ 1000 行** |

## 六、验收标准完成情况


- [x] `uv run uvicorn app.main:app --reload` 启动成功
- [x] `http://127.0.0.1:8000/docs` 显示所有端点
- [x] 能注册 → 登录 → 拿 JWT
- [x] 带 JWT 创建 Prompt / Key / Agent
- [x] 调 `/agents/{id}/chat` 能看到真实模型流式返回（智谱 GLM-4.5 验证）
- [x] 非流式模式返回完整 JSON
- [x] messages 表里有对话历史记录
- [x] 两个账号之间数据完全隔离

## 七、B2 MCP 技术细节（v0.4）

### 关键文件
- `app/models/mcp_server.py`：`McpServer` + `AgentTool` 多对多关联
- `app/services/mcp_manager.py`：包装 `streamablehttp_client` / `stdio_client`，提供 `list_tools` 和 `call_tool` 两个原子
- `app/routers/mcp_servers.py`：CRUD + discover + bindings
- `app/services/chat_service.py · run_tool_loop`：用 LiteLLM `tools=` 参数注入，拿到 `tool_calls` 后并发调 MCP，再回写 `role=tool` 消息走下一轮
- `tests/demo_mcp_server.py`：FastMCP 最小样例【`add(a,b)` + `echo(text)`】用于本地 HTTP 9100

### 重要决策
- **流式 → 非流式 降级**：只要 Agent 绑定了工具，该轮 chat 强制走非流式（tool call 需完整 `finish_reason`），在 SSE 和非 SSE 两条路径上都打了补丁
- **Windows httpx 代理旁路**：启动时 `os.environ.setdefault("NO_PROXY", "127.0.0.1,localhost")`，解决系统代理误捕 localhost 的问题
- **Fernet 复用**：`mcp_servers.auth_token` 复用 `app/crypto.py` 的同一密钥，返回时仅露 `has_auth_token: bool`，不外泄实值
- **权限**：MCP server 和绑定都按 `user_id` 范围切片，跨用户访问返 404

### 前端
- `左侧导航 · MCP 工具`：新建 / 开关 / 删除 + 「发现工具」即时拉取清单（Drawer 展示 name / description / inputSchema）
- `智能体 · 编辑器`：「MCP 工具（可选）」多选框，保存时调 `PUT /agents/{aid}/tools`
- `智能体 · 列表`：新增「MCP 工具」列，带扳手图标的「N 个」cyan 标签

### 验证
- `tests/e2e.ps1` 新增 7 条 B2 断言：create/list/update/bind/query/discover/unbind，本地跑 **22 passed, 0 failed**
- 手动回路：「调用 add 工具计算 17+25」→ LLM 返「四十二」

## 八、待补的工程化

- [ ] 单元测试（当前仅冒烟）
- [ ] Alembic 迁移（当前 `create_all`）
- [ ] 日志系统（logging + 结构化）
- [ ] 错误监控（Sentry 可选）
- [ ] Dockerfile
- [ ] CI（GitHub Actions lint + smoke）
