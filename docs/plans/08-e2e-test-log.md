# 端到端测试日志

> 本文档记录用 playwright-cli 对 Web UI 做真实端到端验证的过程、发现的问题、以及修复步骤。
> 每次测试前后更新此文档，形成可审计的验证记录。

## 一、测试环境

- **后端**：`uv run uvicorn app.main:app --port 8000`（`http://127.0.0.1:8000`）
- **前端**：`bun run dev`（`http://localhost:3000`）
- **工具**：`playwright-cli`（v0.x）— 调用浏览器自动化
- **数据库**：`core/data/app.db`（SQLite）

## 二、测试用例清单

| 用例  | 关注点                     | 期望                                            |
| ----- | -------------------------- | ----------------------------------------------- |
| TC-01 | 后端健康检查               | `GET /api/v1/health` 返回 `{status: ok}`        |
| TC-02 | 注册新账号                 | `POST /api/v1/auth/register` 返回 201           |
| TC-03 | 登录获取 JWT               | `POST /api/v1/auth/jwt/login` 返回 access_token |
| TC-04 | Web 登录页加载             | 页面渲染、表单元素存在                          |
| TC-05 | Web 登录成功跳转 dashboard | token 写入 localStorage，redirect 到 /dashboard |
| TC-06 | 侧边栏菜单                 | 5 项：仪表盘/智能体/提示词/密钥/设置            |
| TC-07 | 提示词页面 CRUD            | 新建、列表、编辑、删除                          |
| TC-08 | 密钥页面 CRUD              | 新建（含智谱预设）、列表、删除                  |
| TC-09 | 智能体页面 CRUD            | 新建（选 Prompt/Key/model）、列表、编辑、删除   |
| TC-10 | 对话页面流式               | SSE token 逐字渲染，写入历史                    |

## 三、验证结果

记录见下文「四、验证历史」。

## 四、验证历史

### 第一轮 — 2026-04-22（playwright-cli 真实浏览器）

| 用例              | 结果 | 备注                                                                                                             |
| ----------------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| TC-01 健康检查    | ✅   | 略（此前 httpx 已验证）                                                                                          |
| TC-02 注册        | ✅   | `POST /auth/register` → 201，返回 UUID                                                                           |
| TC-03 JWT 登录    | ✅   | `POST /auth/jwt/login`（form 编码）→ access_token                                                                |
| TC-04 登录页加载  | ✅   | antd 表单正常渲染，placeholder/标签正确                                                                          |
| TC-05 登录跳转    | ✅   | demo 账户登录后自动跳 `/dashboard`                                                                               |
| TC-06 侧边栏菜单  | ✅   | 5 项菜单（仪表盘/智能体/提示词/密钥/设置），图标就位                                                             |
| TC-07 Prompt CRUD | ✅   | 新建「营销助手」→ 列表显示 id=1，字段完整                                                                        |
| TC-08 Key CRUD    | ✅   | 新建智谱 GLM，选厂商自动填 `api_base`；列表显示脱敏 `370******1RGc`                                              |
| TC-09 Agent CRUD  | ✅   | 新建「营销Bot」→ 关联 Prompt/Key/model=`openai/glm-4.5`                                                          |
| TC-10 流式对话    | ✅   | 发送「你好，用一句话介绍你自己」，6 秒内返回「我是资深营销专家，洞察消费者心理，助力品牌增长。」；刷新后历史保留 |

### 本轮发现并修复的问题

1. **`PageContainer` prop 名错误** — 我之前写成 `description`，组件实际叫 `subtitle`。
   - 修复：`prompts/index.tsx` + `keys/index.tsx` 改用 `subtitle`
2. **`Select mode="tags" maxCount={1}` value 警告** — antd 要求 tags 模式 value 必须是数组。
   - 修复：`agents/index.tsx` 改用 `showSearch + allowClear` 的普通 Select
3. **登录页硬编码 `admin/admin`** — 后端不存在该账号。
   - 暂未处理（保留 placeholder，用户自行注册）
4. **前后端启动时序** — 浏览器加载到一半时两个 dev server 都 crash 过一次，重启后恢复（原因不明，可能 HMR 在文件频繁改动下卡死）。

### 遗留告警（非阻断）

- `antd: List component is deprecated` — Dashboard 页内某处使用
- `antd: Alert message is deprecated, use title` — 登录页 Alert
- `antd: message static function can not consume context` — 全局 `message.success` 调用，建议改用 `App.useApp()` 的 `message`

这些属于 antd v6 迁移告警，不影响功能；后续统一处理。

### 验证数据

- 账号：`demo@agenthub.dev` / `demo12345`
- 创建的资源：Prompt#1「营销助手」、Key#1「智谱 GLM」、Agent#2「营销Bot」
- 真实模型调用：智谱 `glm-4.5` 经 LiteLLM openai/ 前缀代理，流式 token 全量送达前端并持久化到 `messages` 表

### 第二轮 — 2026-04-22（告警清零 + 自动化固化）

本轮对第一轮暴露的问题逐一闭环。

| 项 | 状态 | 产出 |
|---|---|---|
| antd `Alert message=` 告警 | ✅ 清零 | `AlertListCard` 改用 `title` |
| antd `List deprecated` 告警 | ✅ 清零 | `GatewayHealthCard` / `ActivityFeedCard` 换 Flex 手写 |
| antd `message static` 告警 | ✅ 清零 | 5 个页面改用 `App.useApp().message` |
| 登录页默认 admin/admin | ✅ 重构 | 拆成「登录 / 注册」双 Tab，注册后自动登录 |
| E2E 固化 | ✅ 新增 | `tests/e2e.ps1`（11 步断言，覆盖健康/注册/登录/CRUD/数据隔离/Chat） |

**回归结果**

```
pwsh -File tests/e2e.ps1                         # 9 passed, 0 failed（不含真实模型）
$env:ZHIPU_API_KEY=...; pwsh -File tests/e2e.ps1 # 11 passed, 0 failed（含真实模型，reply="好"）
```

**UI 复测（playwright-cli）**

- 登录页双 Tab 正常渲染
- 注册 tab 填入 `ui2-xxx@agenthub.dev` + `uipass12345` + 确认密码 → 点「注册并登录」→ **直接跳转 `/dashboard`**
- Dashboard 页面控制台：**0 errors, 0 warnings**（antd v6 告警清零）

### 本轮额外发现

- **`CORS_ORIGINS` 未包含 3001** — 前端 dev server 在 3000 被占用时会自动切 3001，导致 CORS 预检失败。已补进 `.env`。
- **E2E 脚本中非流式 Chat 字段名** — 初版断言用了 `$r.content`，实际后端 `ChatResponse.reply`，已修正。

### 第三轮 — 2026-04-22（A1-A4 打磨）

新增/改动点：

| 编号 | 内容 | 验证 |
|---|---|---|
| **A1** | `chat.py` 增加 `_get_recent_messages` + `_build_messages(history, max_turns=20)`；`ChatRequest` 加 `max_turns` | E2E `A1 多轮对话上下文连贯`：第1轮说「我叫 Alice」，第2轮问「叫什么名字」→ 回复 `Alice`  |
| **A2** | 新增 `ChatMessage` 组件：react-markdown + remark-gfm + rehype-highlight + CodeBlock（带复制）；chat 页加 AbortController 停止按钮；`chatApi.stream` 支持 `signal` | 手动对照 ref_009/ref_010 实现，依赖已装 |
| **A3** | 新增 `app/routers/stats.py`：`GET /stats`；Dashboard 全面重写，删除网关/告警/成功率 mock，改为资源计数 + 最近对话列表 | E2E `A3 GET /stats`：agents=1 prompts=1 keys=1 msgs=8 |
| **A4** | `app/schemas/key.py` 加 `KeyTestRequest/Response`；`routers/keys.py` 加 `POST /keys/test`（不落库，LiteLLM `hi` 验活，按 api_base 自动猜模型）；前端表单加「测试连通性」按钮 | E2E `A4 POST /keys/test`：智谱 key 连通成功 984ms，model=`glm-4.5-flash` |
| **E2E** | `tests/e2e.ps1` 扩充 3 个新用例：A1 多轮记忆 / A3 stats / A4 连通性 | 14 passed, 0 failed（含真实模型 3 项） |

**最终回归**

```
$env:ZHIPU_API_KEY=...; pwsh -File tests/e2e.ps1
=== AgentHub E2E ===
TC-01 health                ✅
TC-02 register              ✅
TC-03 jwt login             ✅
TC-04 users/me              ✅
TC-05 Prompt CRUD           ✅
TC-06 Key CRUD              ✅
TC-07 Agent CRUD            ✅
TC-08 chat non-stream       ✅ reply: 好
TC-09 list messages         ✅
A3  GET /stats              ✅ agents=1 prompts=1 keys=1 msgs=8
A4  POST /keys/test         ✅ 连通成功 984ms
A1  多轮对话上下文连贯      ✅ round2 reply: Alice
TC-10 数据隔离              ✅
CLEANUP                     ✅
=== 14 passed, 0 failed ===
```

### 第四轮 — 2026-04-22（B1 对外 API Token）

| 项 | 改动 | 验证 |
|---|---|---|
| **数据模型** | 新增 `app/models/api_token.py` + `db.py` init_db 注册；字段：prefix/tail/token_hash/enabled/last_used_at | `api_tokens` 表随 `create_all` 自动建表 |
| **服务抽取** | 新增 `app/services/chat_service.py`：`do_chat(agent_id, payload, user, session)` 作为内部/外部共用入口；`routers/chat.py` 瘦身为 25 行纯路由 | 回归 TC-08 / A1 全部通过 |
| **双轨认证** | 新增 `app/auth/platform.py` — `current_user_by_api_token` 依赖；校验 `Bearer ah_xxx`，SHA256 匹配 + 更新 last_used_at | E2E `B1 /public 拒绝 JWT`：用 JWT 打 `/public/me` 返回 401 |
| **对外路由** | 新增 `app/routers/public.py`：`/public/agents/{id}/chat`、`/public/agents/{id}/messages`、`/public/me` | E2E `B1 /public/agents/{id}/chat (ah_ token)`：reply=「好」，tokens=75+40 |
| **Token CRUD** | 新增 `app/routers/api_tokens.py`：create（返明文一次）/ list（仅脱敏）/ patch enabled / delete | E2E 断言：`token` 以 `ah_` 开头、list 不含明文字段 |
| **前端管理页** | 新增 `web/src/routes/_auth/api-tokens/index.tsx` + 菜单项 + `apiTokenApi`；创建后 Modal 显示明文 + curl 示例 + 复制按钮；列表支持启停开关 | playwright-cli 自动化：登录 → `/api-tokens` → 新建 `demo2` → 弹窗显示 `ah_OdJX-...`；控制台 **0 errors, 0 warnings** |
| **安全** | `token_hash` 唯一索引；Token 禁用后立即 401；lint 同时检查 `list` 响应不含 `token` 字段 | E2E `B1 禁用 token 后 401` 通过 |
| **antd v6 整改** | 本页的 `<Space direction>` → `orientation`，`<Alert message>` → `title` | 最终控制台 0 errors, 0 warnings |

**最终回归（19 步）**

```
$env:ZHIPU_API_KEY=...; pwsh -File tests/e2e.ps1
TC-01..TC-09             ✅ (9)
A3  GET /stats           ✅
A4  POST /keys/test      ✅ 连通成功 437ms
A1  多轮上下文           ✅ round2 reply: Alice
B1  创建 API Token       ✅ ah_ 前缀，list 不含明文
B1  用 ah_ 调 /public/me ✅ email 匹配
B1  /public 拒绝 JWT     ✅ 401
B1  禁用 token 后 401    ✅
B1  /public/chat         ✅ reply='好' tokens=75+40
TC-10 数据隔离 + CLEANUP ✅
=== 19 passed, 0 failed ===
```

**新增已知点**

- 路由 `PATCH /api-tokens/{id}/enabled` 使用 query 参数而不是 body，前端 `httpClient.patch(url, undefined, { params })` 实现到位。
- 菜单图标通过 `icon` 字符串 → `AppIcon` 注册表解析，需要同步在 `core/icons/index.ts` 暴露 `Ticket`。

### 第五轮 — 2026-04-22（assistant-ui 聊天界面接入）

**依赖新增（`web/package.json`）**

- `@assistant-ui/react@0.12.25`
- `@assistant-ui/react-markdown@0.12.9`

（`react-markdown / rehype-highlight / remark-gfm / highlight.js` 早已存在，复用）

**新增文件**

| 文件 | 作用 |
|---|---|
| `web/src/adapters/gateway-model-adapter.ts` | `makeGatewayModelAdapter({ agentId, getToken, maxTurns })` — 把 `chatApi.stream` 的 `AsyncGenerator<string>` 桥接成 assistant-ui 的 `ChatModelAdapter`，每次 yield 累计文本作为 `{ content: [{ type: 'text', text }] }` |
| `web/src/components/assistant-ui/markdown-text.tsx` | `TextMessagePartComponent` —— react-markdown + rehype-highlight 渲染，代码块带复制按钮（复用 `extractTextFromNode` 递归取文本） |
| `web/src/components/assistant-ui/thread.tsx` | `ThreadPrimitive.Root/Viewport/Messages` + `ComposerPrimitive.Root/Input/Send/Cancel`；用 `AuiIf condition={s => s.thread.isRunning}` 切换发送/停止按钮；样式沿用 Ant Design（Avatar/Button/Flex）避免引入 Tailwind 独立类 |
| `web/src/components/assistant-ui/my-runtime-provider.tsx` | `useLocalRuntime(adapter, { initialMessages })` —— 把后端 `/messages` 返回的历史消息（按 id 升序）喂给 assistant-ui 的 Thread；`agentId` 变化时通过 `key={agentId}` 触发重建 |
| `web/src/routes/_auth/chat/$agentId.tsx`（重写） | 把旧的手写对话循环彻底替换成 `<MyRuntimeProvider><Thread /></MyRuntimeProvider>`；历史 + agent 元数据仍通过 TanStack Query 预取 |

**关键实现点**

1. **`ComposerPrimitive.Input` 本身就是 react-textarea-autosize**，不需要 `asChild`+`<textarea>` 包一层（ref_019 示例是旧 API，实测 0.12.25 直接用 `minRows/maxRows/submitMode` 就行）。
2. **停止按钮通过 `ComposerPrimitive.Cancel asChild`** 包住 `<Button danger>`，assistant-ui 自动处理 `abortSignal`，我们的 `chatApi.stream` 已经支持 `options.signal`，打通。
3. **消息渲染分工**：用户消息走 `MessagePrimitive.Content`（纯文本），助手消息走 `MessagePrimitive.Parts components={{ Text: MarkdownText }}`，后者才会对不同 part 类型分发；为后续 B2 的 `Reasoning / tools` 插槽留好位置。
4. **Ant Design 共存**：全部样式通过 inline style + antd 组件，没有引入任何 `@assistant-ui/react-ui` 的 Tailwind 主题。

**验证（playwright-cli 自动化）**

```
1) 注册 aui-1776820699@agenthub.dev                   ✅ → /dashboard
2) 页面内 fetch 创建 prompts/keys(zhipu)/agents        ✅ agentId=5
3) goto /chat/5                                         ✅
   → 消息列表正确渲染：
     用户气泡（蓝底白字，右对齐，绿色 User 头像）
     助手气泡（白底黑字，蓝色 Bot 头像）
     历史 4 轮全部按升序显示
4) 输入「用一个字回答：你叫什么？」→ 点【发送】           ✅
   → AuiIf 切换为【停止】按钮
   → 流式生成，最终助手回复「我」
   → 完成后按钮切回【发送】
5) 控制台：0 errors, 3 warnings（全部是 rsbuild dev CSS preload 提示，与代码无关）
```

**截图存档**：`web/.playwright-cli/page-2026-04-22T01-21-53-318Z.png`（留痕用）。

**仍待延伸**

- [ ] 后端推送 `{"type":"reasoning","content":"..."}` 事件 → `MessagePrimitive.Parts components.Reasoning` 自动生效。
- [ ] 后端推送 `{"type":"tool_call_start","tool_name":"..."}` → `components.tools.Fallback` 自动生效。
- [ ] 旧组件 `web/src/components/ChatMessage/` 已无人引用，可留作 fallback 或直接删除（保留，下一轮再清理）。

### 第六轮 — 2026-04-22（B3 调用日志 + 仪表盘 7 天折线图）

**新增文件 / 改动**

| 文件 | 作用 |
|---|---|
| `app/models/call_log.py` | 新表 `call_logs`：`user_id / agent_id / model / channel(internal\|public) / stream / duration_ms / prompt_tokens / completion_tokens / status(success\|error) / error / created_at` |
| `app/db.py` | `init_db` 注册 `call_log` 模型 |
| `app/services/chat_service.py` | 新增 `persist_call_log(...)`；`do_chat(..., *, channel='internal')` 在 stream/非流式成功/失败四条路径全部埋点；`time.perf_counter` 计耗时；埋点写入失败不影响主流程 |
| `app/routers/public.py` | `public_chat` 调用 `do_chat(..., channel='public')` |
| `app/routers/stats.py` | 新增 `GET /stats/daily?days=N`（1-90）：过滤 `created_at >= since_dt`，Python 端按日期 bucket，**7 天全返回**（空白天 0 填充）。为保留 SQL-端扩展可能，`case((status=='error',1), else_=0)` 的语法已验通 |
| `web/src/api/agenthub.ts` | `statsApi.daily(days)` + `DailyStatsItem` |
| `web/src/routes/_auth/dashboard/index.tsx` | 接入 `<SimpleLineChart>`：左 2/3 折线图 + 右 1/3 最近对话，顶部摘要「总 N 次 · K tokens · E 失败」 |

**技术决策**

1. **为什么 Python 侧 bucket 而不是 SQL `cast(Date)`**：SQLite 的 `created_at` 是带微秒的 TEXT，SQLAlchemy `cast(..., Date)` 会触发 `str_to_date` 报 `TypeError: fromisoformat: argument must be str`。Python 端分桶既通用又可读，性能对于 N<=90 天完全够用。
2. **`func.case(...)` vs `sqlalchemy.case(...)`**：前者不存在，必须用顶层 `case`；踩了一坑后已在埋点路径里验证。
3. **埋点写入的容错**：`persist_call_log` 整段包 `try/except`，连接池异常或短时锁冲突都不会影响用户请求。
4. **UUID 存储差异**：`users.id` 带连字符、`prompts.user_id/call_logs.user_id` 为无连字符 hex；SQLAlchemy binding 层自动归一化，ORM 层 `CallLog.user_id == user.id` 工作正常。

**E2E 扩展（`tests/e2e.ps1`）**

新增 2 个步骤：

- `B3 GET /stats/daily?days=7 返回 7 条`：校验行数、6 个字段齐全、日期升序。
- `B3 chat 后 daily 今日 calls 增加`：对比前后 `calls`，断言 `c1 == c0 + 1`。

**最终回归**

```
$env:ZHIPU_API_KEY=...; pwsh -File tests/e2e.ps1
TC-01..TC-09                 ✅ (9)
A1 / A3 / A4                 ✅ (3)
B1 × 5                        ✅
B3 GET /stats/daily?days=7    ✅ days=7, last day=2026-04-22 calls=4
B3 chat 后 calls 增加         ✅ today calls: 4 -> 5
TC-10 + CLEANUP               ✅
=== 21 passed, 0 failed ===
```

**数据库直查证据**（跑 smoke + 1 条 public chat 后）

```
id | agent | model                | ch       | ms    | pt | ct | status
1  | 6     | openai/glm-4.5-flash | internal | 4556  | 16 | 64 | success
2  | 6     | openai/glm-4.5-flash | public   | 40385 | 25 | 44 | success
3  | 6     | openai/glm-4.5-flash | public   | 3469  | 35 | 64 | success
```

**UI 证据**

截图：`web/.playwright-cli/page-2026-04-22T01-37-35-435Z.png`

Dashboard 顶部 4 张指标卡 + 左侧「最近 7 天调用趋势」折线图（04-16~04-21 平地，04-22 跳到 3 次） + 右侧「最近对话」列表；控制台 **0 errors / 0 warnings**。
