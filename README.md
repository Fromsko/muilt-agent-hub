# AgentHub Core

多用户 AI Agent 配置与对话 API 平台。所有接口统一挂在 `/api/v1/` 前缀下。

## 技术栈

| 层 | 选型 | 文档 |
|---|---|---|
| Web 框架 | FastAPI | https://fastapi.tiangolo.com/ |
| ORM | SQLModel + SQLAlchemy 2 | https://sqlmodel.tiangolo.com/ |
| 数据库 | SQLite（`data/app.db`） | - |
| 认证 | fastapi-users 15.x + JWT | https://fastapi-users.github.io/fastapi-users/ |
| 多模型调用 | LiteLLM | https://docs.litellm.ai/ |
| 密钥加密 | cryptography.Fernet | https://cryptography.io/en/latest/fernet/ |
| 配置 | pydantic-settings | https://docs.pydantic.dev/latest/concepts/pydantic_settings/ |
| 包管理 | uv | https://docs.astral.sh/uv/ |

## 启动

```powershell
# 1. 准备环境
copy .env.example .env
# .env 里 FERNET_KEY 已预填；生产环境请用以下命令重新生成
uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 2. 启动
uv run uvicorn app.main:app --reload --port 8000

# 3. 打开文档
# http://127.0.0.1:8000/docs
```

## 核心概念

**Agent = Prompt + Model + Key 的组合**。用户创建提示词、保存模型 API Key、组装成 Agent，然后通过 `/chat` 接口与之对话。

## API 速览（统一 `/api/v1` 前缀）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/register` | 注册 |
| POST | `/auth/jwt/login` | 登录（form: username/password），返回 JWT |
| GET | `/users/me` | 当前用户信息 |
| CRUD | `/prompts` | 提示词管理 |
| CRUD | `/keys` | 模型 API Key（写入加密，读返回脱敏） |
| CRUD | `/agents` | 智能体管理 |
| POST | `/agents/{id}/chat` | 对话（默认 SSE 流式；`{"stream":false}` 切为 JSON） |
| GET | `/agents/{id}/messages` | 对话历史 |
| GET | `/health` | 健康检查 |

## 快速验证

```powershell
uv run python smoke_test.py
```

会自动：注册两个账号 → 创建 Prompt/Key/Agent → 验证隔离 → 清理。

## Chat 调用示例（Python）

```python
import httpx

BASE = "http://127.0.0.1:8000/api/v1"
with httpx.Client() as c:
    c.post(f"{BASE}/auth/register", json={"email": "a@b.com", "password": "pass1234"})
    tok = c.post(f"{BASE}/auth/jwt/login", data={"username": "a@b.com", "password": "pass1234"}).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    p = c.post(f"{BASE}/prompts", headers=h, json={"name": "assistant", "content": "You are concise."}).json()
    k = c.post(f"{BASE}/keys", headers=h, json={"name": "oai", "provider": "openai", "api_key": "sk-YOUR_KEY"}).json()
    a = c.post(f"{BASE}/agents", headers=h, json={"name": "bot", "prompt_id": p["id"], "key_id": k["id"], "model": "gpt-4o-mini"}).json()

    # 非流式
    r = c.post(f"{BASE}/agents/{a['id']}/chat", headers=h, json={"message": "hi", "stream": False})
    print(r.json()["reply"])

    # 流式
    with c.stream("POST", f"{BASE}/agents/{a['id']}/chat", headers=h, json={"message": "hi"}) as s:
        for line in s.iter_lines():
            print(line)
```

LiteLLM 支持的模型名速查：https://docs.litellm.ai/docs/providers

常用: `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, `deepseek/deepseek-chat`, `gemini/gemini-2.0-flash`。

## 目录结构

```
core/
├─ app/
│  ├─ main.py              # FastAPI 入口 + /api/v1 挂载
│  ├─ config.py            # Settings
│  ├─ db.py                # 异步引擎 + session + init_db
│  ├─ crypto.py            # Fernet 加密/解密/mask
│  ├─ models/              # SQLModel 表模型
│  ├─ schemas/             # Pydantic 请求/响应
│  ├─ auth/                # fastapi-users 集成
│  └─ routers/             # 各模块路由
├─ data/app.db             # SQLite 数据文件（自动生成）
├─ smoke_test.py           # 端到端冒烟测试
├─ .env.example
└─ pyproject.toml
```

## 设计原则

- **数据隔离**：每个资源的 SQL 查询均强制 `WHERE user_id = current_user.id`，跨用户访问返回 404
- **写时加密**：API Key 通过 Fernet 对称加密后入库，仅 Chat 路由在调用模型时解密
- **统一版本前缀**：所有业务路由挂在 `/api/v1/` 下，未来升级不破坏旧客户端
- **流式优先**：对话默认 SSE；前端可一次接收 token 流提升体感

## 下阶段规划

- v0.2 前端 React（登录 / Agent / 对话 三页）
- v0.3 MCP 工具集成
- v0.4 多轮对话上下文 + 对外 API Key（第三方调用）
- v0.5 管理员后台 + 调用统计
