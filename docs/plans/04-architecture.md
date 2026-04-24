# 系统架构

## 一、分层视图

```
┌──────────────────────────────────────────────────────────────┐
│                   Client（前端 / 外部系统）                   │
│              Web UI  |  curl / httpx  |  AI SDK              │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTPS / SSE
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    FastAPI (AgentHub API)                    │
│                 全部挂在 /api/v1/ 前缀下                     │
├──────────────────────────────────────────────────────────────┤
│ 路由层  auth | prompts | keys | agents | chat | health       │
│ 认证层  fastapi-users 15.x + JWT Bearer                      │
│ 服务层  所有权校验、加密/解密、消息持久化                     │
│ 数据层  SQLModel + async SQLAlchemy                          │
└──────────┬────────────────────────────────────────┬──────────┘
           │                                        │
           ▼                                        ▼
┌────────────────────┐                ┌────────────────────────┐
│   SQLite (file)    │                │       LiteLLM          │
│   data/app.db      │                │  统一多模型调用层       │
│                    │                │                        │
│ users              │                │ ┌────────┬────────────┐│
│ prompts            │                │ │OpenAI  │Anthropic   ││
│ keys (Fernet)      │                │ │Zhipu   │DeepSeek    ││
│ agents             │                │ │Gemini  │Moonshot    ││
│ messages           │                │ │Ollama  │...          ││
└────────────────────┘                │ └────────┴────────────┘│
                                      └────────────────────────┘
```

## 二、模块依赖关系

```
                       ┌─────────────┐
                       │ User / Auth │  ← 所有模块的基座
                       └──────┬──────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
        ┌────▼─────┐     ┌────▼────┐      ┌────▼────┐
        │ Prompt   │     │  Key    │      │  Tool   │
        │  管理    │     │  管理   │      │ (v0.3)  │
        └────┬─────┘     └────┬────┘      └────┬────┘
             │                │                │
             └───────┬────────┴────────┬───────┘
                     ▼                 │
               ┌───────────┐           │
               │   Agent   │ ◄─────────┘
               │  聚合配置 │
               └─────┬─────┘
                     │
                     ▼
               ┌───────────┐        ┌────────────┐
               │   Chat    │ ──────►│  Message   │
               │  运行时   │        │  对话历史  │
               └───────────┘        └────────────┘
```

**依赖规则：**
- Prompt / Key / Tool 只依赖 User
- Agent 必须引用一个 Prompt 和一个 Key
- Chat 只能基于一个已存在的 Agent

## 三、数据模型

### users（fastapi-users 管理）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | UUID | 主键 |
| email | str unique | 登录账号 |
| hashed_password | str | 密码哈希 |
| is_active | bool | 是否激活 |
| is_superuser | bool | 管理员标记 |
| is_verified | bool | 邮箱验证（MVP 未使用） |

### prompts
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | 自增 |
| user_id | FK users.id | 所有者 |
| name | str(200) | 名称 |
| content | text | 提示词正文 |
| created_at / updated_at | datetime | - |

### keys
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | |
| user_id | FK | |
| name | str(200) | |
| provider | str(50) | openai / anthropic / zhipu / ... |
| api_key_encrypted | str | Fernet 密文 |
| api_base | str(500) 可空 | 自定义端点（如智谱） |
| created_at | datetime | |

### agents
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | |
| user_id | FK | |
| name | str(200) | |
| description | str(1000) 可空 | |
| prompt_id | FK prompts.id | |
| key_id | FK keys.id | |
| model | str(100) | LiteLLM 模型名 |
| temperature | float | 0.0–2.0 |
| max_tokens | int | 1–32000 |
| created_at / updated_at | datetime | |

### messages
| 字段 | 类型 | 说明 |
|---|---|---|
| id | int PK | |
| agent_id | FK agents.id | |
| role | str(20) | "user" \| "assistant" |
| content | text | |
| created_at | datetime | |

## 四、请求生命周期（以 POST /chat 为例）

```
Client
  │ POST /api/v1/agents/1/chat  {message, stream:true}
  │ Header: Authorization: Bearer <JWT>
  ▼
FastAPI Router
  │
  ├─► fastapi-users 解析 JWT → current_active_user: User
  │
  ├─► 查询 Agent where id=1 AND user_id=current_user.id
  │     └─ 404 if not owned
  │
  ├─► 查询 Prompt (by agent.prompt_id)
  ├─► 查询 Key    (by agent.key_id)
  │
  ├─► crypto.decrypt(key.api_key_encrypted)
  │
  ├─► litellm.acompletion(
  │       model=agent.model,
  │       api_key=<decrypted>,
  │       api_base=key.api_base,  # 智谱等自定义端点
  │       messages=[system, user],
  │       stream=True,
  │       ...
  │   )
  │
  ├─► StreamingResponse(
  │       async generator → "data: {json}\n\n"
  │   )
  │
  └─► 完成后开新 session 写 messages 表
      （user 消息 + assistant 完整回复）
```

## 五、安全模型

### 5.1 三道防线

```
┌───────────────────────────────────────────────────────┐
│ 1. 网络层    HTTPS（生产） + CORS 白名单            │
├───────────────────────────────────────────────────────┤
│ 2. 认证层    JWT Bearer（fastapi-users）            │
│              → 每个请求解出 User 对象                │
├───────────────────────────────────────────────────────┤
│ 3. 所有权层  WHERE user_id = current_user.id         │
│              → 跨用户访问一律返回 404                │
└───────────────────────────────────────────────────────┘
```

### 5.2 密钥保护

- **不入明文**：Fernet 对称加密后存 DB
- **不返回明文**：列表/详情均返回 `sk-******XXXX` 脱敏格式
- **只在调用模型时解密**：`chat.py` 内临时 decrypt，用完即丢
- **Fernet Key 管理**：`.env` 持有，`.gitignore` 防泄露

## 六、并发模型

- **全异步**：FastAPI + aiosqlite + litellm.acompletion
- **Session 生命周期**：
  - 请求处理期：通过 `Depends(get_async_session)` 注入，请求结束关闭
  - 后台持久化：独立新建 session（如 chat 完成后写 messages）
- **限制**：SQLite 不支持高并发写，MVP 够用；生产升级到 PostgreSQL

## 七、可扩展点

| 扩展点 | 如何扩 |
|---|---|
| 新模型厂商 | 不用改代码，LiteLLM 支持即可；本地模型走 Ollama |
| 新资源类型 | 按「模型 → Schema → 路由 → 挂载 → 测试」五步走 |
| 切数据库 | 改 `DATABASE_URL`，装对应驱动（asyncpg / aiomysql） |
| 加缓存 | 在 routers 层套 Redis / FastAPI-Cache |
| 异步任务 | 加 Celery/ARQ，Chat 完成后发事件 |

## 八、关键设计取舍

详见 [`07-decisions.md`](./07-decisions.md)。
