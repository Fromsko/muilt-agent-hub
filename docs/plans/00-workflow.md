# 开发工作流

## 一、开发闭环

```
需求确认 → 写计划 → 分阶段实现 → 冒烟测试 → 真实测试 → 写文档 → 提交
```

每个功能都遵循「先跑通最小版，再补完」的原则，避免一次性写太多导致集成困难。

## 二、项目结构约定

```
core/
├─ app/
│  ├─ main.py                # FastAPI 入口 + /api/v1 挂载
│  ├─ config.py              # pydantic-settings 配置
│  ├─ db.py                  # 异步 SQLite 引擎 + init_db
│  ├─ crypto.py              # Fernet 加密/解密/mask
│  ├─ models/                # SQLModel 数据表定义
│  │   ├─ user.py            # fastapi-users SQLAlchemy 基类
│  │   ├─ prompt.py
│  │   ├─ key.py
│  │   ├─ agent.py
│  │   └─ message.py
│  ├─ schemas/               # Pydantic 请求/响应 schema
│  │   ├─ prompt.py
│  │   ├─ key.py
│  │   ├─ agent.py
│  │   └─ chat.py
│  ├─ auth/                  # fastapi-users 集成
│  │   ├─ manager.py         # UserManager
│  │   ├─ backend.py         # JWT backend + FastAPIUsers 实例
│  │   └─ schemas.py         # UserRead / UserCreate / UserUpdate
│  └─ routers/               # API 路由
│      ├─ auth.py            # /auth + /users
│      ├─ prompts.py
│      ├─ keys.py
│      ├─ agents.py
│      ├─ chat.py
│      └─ health.py
├─ data/                     # SQLite 文件（.gitignore）
├─ docs/                     # 本文档目录
├─ smoke_test.py             # CRUD + 隔离冒烟测试
├─ test_zhipu_chat.py        # 智谱 GLM 端到端真实测试
├─ README.md
├─ pyproject.toml            # uv 项目元数据
└─ .env / .env.example
```

## 三、编码规范

### 3.1 路由层
- **永远**用 `Depends(current_active_user)` 注入当前用户
- 查询所有资源都 `WHERE user_id = current_user.id`
- 404 代替 403（不泄露资源是否存在）
- 路径前缀在 `main.py` 统一拼接，不在 router 内写 `/api/v1/`

### 3.2 模型层
- 全部用 SQLModel（跟 Pydantic 共生），不混用纯 SQLAlchemy declarative
- `Base.metadata = SQLModel.metadata` 让 fastapi-users 的 User 和 SQLModel 表共享元数据
- 外键用字符串路径 `foreign_key="users.id"`
- 时间戳字段用 `default_factory=datetime.utcnow`

### 3.3 Schema 层
- 请求用 `XxxCreate` / `XxxUpdate`，响应用 `XxxRead`
- `XxxUpdate` 所有字段都是可选（PATCH 语义）
- 密钥等敏感字段只进不出：`api_key` 只在 Create，`api_key_masked` 只在 Read

### 3.4 异步规范
- 所有 IO 用 `async def`
- DB session 通过 `Depends(get_async_session)` 注入
- 后台持久化（如 chat 结束写 message 表）自己开新 session，别用注入的 session（避免生命周期冲突）

## 四、测试流程

### 4.1 每次改完后的自测三步
```powershell
# 1. 重启服务
taskkill /F /IM python.exe 2>$null
uv run uvicorn app.main:app --port 8000 --reload

# 2. 冒烟测试（无需真实 key）
uv run python smoke_test.py

# 3. 真实对话测试（需 LLM key）
uv run python test_zhipu_chat.py
```

### 4.2 冒烟测试覆盖
- 两用户注册登录
- Prompt / Key / Agent CRUD
- 隔离：B 看不到 A 的数据
- FK 校验：Agent 引用他人 Prompt/Key 返回 400
- messages 历史初始为空

## 五、新增功能的标准步骤

以加一个新模块（比如 `tools`）为例：

1. **模型**：`app/models/tool.py` 定义表结构
2. **Schema**：`app/schemas/tool.py` 定义 Create/Update/Read
3. **路由**：`app/routers/tools.py` 实现 5 个 CRUD 端点
4. **注册**：`app/main.py` 里 `api_v1.include_router(...)`
5. **import 模型**：`app/db.py init_db` 里加 `from app.models import tool`
6. **冒烟测试**：`smoke_test.py` 增加对应段落
7. **文档**：更新 `docs/05-api-reference.md` 和 `docs/03-tasks.md`

## 六、Git 提交规范

使用 Conventional Commits：

```
feat(agents): add agent CRUD endpoints
fix(chat): stop using request-scope session for bg persist
docs(roadmap): add v0.3 MCP plan
refactor(auth): extract jwt strategy to backend module
test(smoke): cover ownership isolation
chore(deps): bump litellm to 1.83.10
```

## 七、环境与工具

- Python 3.11+
- uv 包管理（`uv add` / `uv sync` / `uv run`）
- Windows PowerShell（路径用反斜杠）
- VSCode / Cursor + Ruff

## 八、启动检查清单

启动前确认：
- [ ] `.env` 存在且 `FERNET_KEY` 非空
- [ ] `data/` 目录存在（或第一次启动会自动创建 `app.db`）
- [ ] 端口 8000 没被占用
- [ ] uv 环境已 `uv sync`
