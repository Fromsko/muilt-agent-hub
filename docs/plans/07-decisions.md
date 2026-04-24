# 关键技术决策记录（ADR）

记录项目演进过程中做出的重要选择及其背景、替代方案和取舍。论文第 4 章系统设计可直接引用。

## ADR-001：采用 `/api/v1/` 前缀做 API 版本化

**背景**：需要一个长期演进的 REST API，未来可能破坏性变更。

**决策**：
- 所有业务路由挂在 `/api/v1/` 下
- 在 `app/main.py` 用一个顶层 `APIRouter(prefix="/api/v1")` 统一挂载
- 未来新版本可在 `/api/v2/` 并存

**替代方案**：
- ❌ 直接挂 `/auth`、`/prompts`：无版本控制，升级即破坏
- ❌ Header 版本化（`API-Version: 1`）：对客户端不友好，无法浏览器直接调

**影响**：
- 前端 baseUrl 固定为 `/api/v1`
- Swagger UI 自动按此前缀生成文档
- 未来迁移只需新增 v2 router，不动 v1

---

## ADR-002：SQLite + aiosqlite 作为 MVP 数据库

**背景**：毕设需要零配置、可打包、可演示。

**决策**：使用 SQLite + aiosqlite（异步驱动）。

**替代方案**：
- ❌ PostgreSQL：需 Docker 或单机安装，毕设演示障碍
- ❌ MySQL：同上，且 async 驱动成熟度一般

**取舍**：
- 优点：零配置、单文件、可直接进 git（非 repo 中）
- 缺点：并发写性能差、不支持复杂 JSON 查询
- 生产迁移路径：只改 `DATABASE_URL=postgresql+asyncpg://...`，代码零修改

---

## ADR-003：SQLModel 与 fastapi-users 的元数据共享

**背景**：fastapi-users 用 SQLAlchemy Declarative Base，而 SQLModel 用自己的 metadata；如果分开，SQLModel 表的外键 `foreign_key="users.id"` 在 `create_all` 时找不到 users 表。

**决策**：
```python
class Base(DeclarativeBase):
    metadata = SQLModel.metadata
```

**替代方案**：
- ❌ 两份 metadata 分别 create_all：FK 无法跨表解析（实测失败）
- ❌ 把 User 也写成 SQLModel：会丢失 fastapi-users 的 UUID 基类能力
- ❌ 手写 SQL DDL：违背 ORM 初衷

**影响**：
- 所有表共享一个 metadata，FK 正常工作
- `init_db()` 只需调一次 `SQLModel.metadata.create_all(...)`

---

## ADR-004：使用 LiteLLM 作为多模型适配层

**背景**：项目要支持多个 LLM 厂商（OpenAI / Claude / 智谱 / DeepSeek / Ollama...），手写适配代价高。

**决策**：统一用 `litellm.acompletion(...)` 调用所有模型。

**替代方案**：
- ❌ 为每个厂商单独集成 SDK：代码爆炸，维护成本高
- ❌ 用 OpenAI SDK 硬适配：不支持 Claude 的 messages 差异
- ❌ 自建 adapter 层：重复造轮子

**优点**：
- 100+ 模型无缝切换，换模型零代码成本
- 统一的流式协议、错误格式、用量统计
- OpenAI 兼容端点（国产厂商）通过 `openai/<model>` + `api_base` 无缝接入

**毕业论文价值**：可作为第 2 章 / 第 4 章的核心创新点。

---

## ADR-005：API Key 使用 Fernet 对称加密

**背景**：用户会保存 OpenAI / 智谱等真实 API Key，泄露后果严重。

**决策**：
- 写入时用 Fernet 加密（AES-128-CBC + HMAC-SHA256）
- 读取时永远只返回 `sk-******XXXX` 脱敏形式
- 解密只发生在 `chat.py` 调模型的瞬间，立即丢弃明文

**替代方案**：
- ❌ 明文存储：安全事故
- ❌ bcrypt 哈希：不可逆，无法调用模型
- ❌ 非对称加密（RSA）：性能差，且无共享私钥的必要

**密钥管理**：
- `FERNET_KEY` 存在 `.env`，`.gitignore` 排除
- 生产环境建议用环境变量或 KMS 管理
- Key 泄露时可重新加密所有记录（ADR 待补）

---

## ADR-006：SSE 做流式输出，不用 WebSocket

**背景**：对话需要逐 token 返回。

**决策**：FastAPI `StreamingResponse` + `text/event-stream`。

**替代方案**：
- ❌ WebSocket：双向通信，对本场景过度（只需服务器推送）
- ❌ 长轮询：延迟高，体验差

**优点**：
- HTTP 原生，代理友好
- 浏览器 EventSource 内置支持
- Vercel AI SDK `useChat` 默认协议

**实现细节**：
- 每个 chunk 发 `data: {"delta": "token"}\n\n`
- 结束发 `data: [DONE]\n\n`
- 错误发 `data: {"error": ...}` 后紧跟 `[DONE]`

---

## ADR-007：用户数据隔离用 WHERE 过滤，不用 RLS

**背景**：多用户平台，严禁跨用户访问。

**决策**：所有 CRUD 的 SQL 查询强制 `WHERE user_id = current_user.id`，跨用户返回 404（不泄露存在性）。

**替代方案**：
- ❌ Row-Level Security（PostgreSQL 特性）：SQLite 不支持
- ❌ 在 Python 层 filter：性能浪费

**强化**：
- 创建 Agent 时额外校验 `prompt_id / key_id` 归属本人（防 IDOR）
- 冒烟测试 `smoke_test.py` 显式覆盖"B 访问 A 资源返回 404"场景

---

## ADR-008：不在 MVP 中做多轮对话上下文

**背景**：多轮对话要管理 conversation + 滑窗 + token 截断，复杂度高。

**决策**：
- MVP 只做单轮（system + 当前 user message）
- 多轮放到 v0.4

**理由**：
- 先跑通主链路，避免早期复杂化
- messages 表已建，v0.4 只需加 `conversation_id` 和 Chat 参数即可升级

---

## ADR-009：不做用户余额/计费

**背景**：最初方案有"调用配额"和"余额"概念。

**决策**：**明确不做**。

**理由**：
- 引入余额即要引入支付，超出毕设范围
- 支付会让评审要求更多合规内容
- 多用户隔离 + 速率限制即可满足"平台化"叙事

---

## ADR-010：取消用户注册登录的疑问 → 最终保留

**背景**：曾考虑把用户体系砍掉，做成纯 API 服务。

**决策**：保留用户体系，改用"普通用户 + 管理员"二层模型。

**理由**：
- 保留评审熟悉的 CRUD 外壳
- 论文章节数量合理（5 模块 × 2 角色）
- API 平台的定位依然成立（v0.4 加平台 Key 给外部调）

## ADR-011：fastapi-users 15.x，不降级

**背景**：fastapi-users 14/15 版本 API 微调。

**决策**：使用 15.0.5（最新稳定版，2026-03 发布）。

**理由**：
- 社区活跃
- 文档最新
- 毕业论文引用"最新版本"更有亮点

## ADR 模板

新增 ADR 时请遵循：

```markdown
## ADR-XXX：简短标题

**背景**：为什么要做这个决策？

**决策**：选择了什么。

**替代方案**：其他考虑过但放弃的。

**影响**：后续代码与扩展性的影响。
```
