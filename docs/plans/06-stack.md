# 技术栈与官方文档

所有选型均已在 PyPI 和官方文档核实存在，可直接按链接查资料。

## 一、运行环境

| 项 | 值 |
|---|---|
| Python | 3.11+ |
| 操作系统 | Windows 11 开发；Linux 部署（可选） |
| 数据库 | SQLite（MVP）；PostgreSQL（生产可选） |

## 二、包管理

### uv
- **版本**：latest
- **文档**：https://docs.astral.sh/uv/
- **常用命令**：
  ```
  uv init core --python 3.11
  uv add fastapi uvicorn[standard]
  uv sync
  uv run uvicorn app.main:app --reload
  ```

## 三、Web 与 API

### FastAPI
- **版本**：0.136.0（已装）
- **文档**：https://fastapi.tiangolo.com/
- **关键特性用到**：
  - APIRouter（`/api/v1` 前缀组合）
  - Depends 依赖注入
  - StreamingResponse（SSE）
  - CORSMiddleware
  - lifespan 上下文（启动时 init_db）
- **关键文档页**：
  - Bigger applications（路由分层）：https://fastapi.tiangolo.com/tutorial/bigger-applications/
  - Dependencies：https://fastapi.tiangolo.com/tutorial/dependencies/
  - Custom response：https://fastapi.tiangolo.com/advanced/custom-response/

### Uvicorn
- **版本**：0.45.0
- **文档**：https://www.uvicorn.org/

## 四、ORM 与数据库

### SQLModel
- **版本**：0.0.38
- **文档**：https://sqlmodel.tiangolo.com/
- **用法**：所有 5 张业务表都继承 `SQLModel`（带 `table=True`）
- **与异步**：参考 https://sqlmodel.tiangolo.com/tutorial/fastapi/

### SQLAlchemy 2.0（底层）
- **版本**：2.0.49
- **文档**：https://docs.sqlalchemy.org/en/20/
- **异步 API**：https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html

### aiosqlite
- **版本**：0.22.1
- **文档**：https://github.com/omnilib/aiosqlite
- **连接串**：`sqlite+aiosqlite:///./data/app.db`

## 五、认证

### fastapi-users
- **版本**：**15.0.5**（2026-03 最新）
- **文档**：https://fastapi-users.github.io/fastapi-users/latest/
- **安装**：`uv add "fastapi-users[sqlalchemy]"`
- **用到的模块**：
  - `SQLAlchemyBaseUserTableUUID` / `SQLAlchemyUserDatabase`
  - `BaseUserManager` / `UUIDIDMixin`
  - `JWTStrategy` / `BearerTransport` / `AuthenticationBackend`
  - `FastAPIUsers[User, UUID]`
- **关键教程**：
  - Quickstart：https://fastapi-users.github.io/fastapi-users/latest/configuration/overview/
  - SQLAlchemy 集成：https://fastapi-users.github.io/fastapi-users/latest/configuration/databases/sqlalchemy/
  - JWT 策略：https://fastapi-users.github.io/fastapi-users/latest/configuration/authentication/strategies/jwt/

## 六、大模型调用

### LiteLLM —— 核心中间件
- **版本**：1.83.10
- **文档**：https://docs.litellm.ai/docs/
- **关键页面**：
  - 流式：https://docs.litellm.ai/docs/completion/stream
  - 支持的 providers：https://docs.litellm.ai/docs/providers
  - 自定义 api_base（OpenAI 兼容）：https://docs.litellm.ai/docs/providers/openai_compatible
- **已验证**：
  - 智谱 GLM-4.5 via `openai/glm-4.5` + api_base
  - DeepSeek / Anthropic / OpenAI 理论可用

## 七、加密

### cryptography
- **版本**：46.0.7
- **文档**：https://cryptography.io/en/latest/
- **用到的**：`cryptography.fernet.Fernet` 对称加密
- **Fernet 文档**：https://cryptography.io/en/latest/fernet/
- **生成 Key**：
  ```python
  from cryptography.fernet import Fernet
  Fernet.generate_key()
  ```

## 八、配置

### pydantic-settings
- **版本**：2.14.0
- **文档**：https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- **Pydantic V2**：自动从 `.env` 加载，类型校验

### python-dotenv
- **版本**：1.0.1
- **文档**：https://github.com/theskumar/python-dotenv
- **由 pydantic-settings 间接使用**

## 九、其他依赖

| 库 | 版本 | 用途 | 文档 |
|---|---|---|---|
| python-multipart | 0.0.26 | OAuth2 表单登录 | https://github.com/Kludex/python-multipart |
| httpx | 0.28.1 | 测试客户端 | https://www.python-httpx.org/ |
| pyjwt | 2.12.1 | fastapi-users 依赖 | https://pyjwt.readthedocs.io/ |
| bcrypt / argon2-cffi | - | 密码哈希 | - |

## 十、前端（v0.2 规划）

| 库 | 文档 |
|---|---|
| React 18 | https://react.dev/ |
| Vite | https://vite.dev/ |
| TanStack Router | https://tanstack.com/router |
| TanStack Query | https://tanstack.com/query |
| Vercel AI SDK | https://sdk.vercel.ai/docs |
| shadcn/ui | https://ui.shadcn.com/ |
| Tailwind CSS v4 | https://tailwindcss.com/ |

## 十一、选型逻辑

### 为什么 SQLite 不 PostgreSQL
- 毕设演示：零配置，双击即用
- 体积小，可直接打包提交
- 后期切库只需改 `DATABASE_URL`

### 为什么 SQLModel 不纯 SQLAlchemy
- Pydantic + SQLAlchemy 合二为一，少写一半 schema
- FastAPI 原作者出品，集成无痛

### 为什么 fastapi-users 不手写认证
- 节省至少 500 行认证代码
- JWT/密码哈希/重置密码全部送
- 毕设论文可写"基于 fastapi-users 实现安全认证"

### 为什么 LiteLLM 不直接调 OpenAI SDK
- **避免 `if provider == ...` 分支**
- 100+ 模型统一接口，换模型零代码成本
- 论文核心亮点：**多模型适配层**

### 为什么 Fernet 不 AES 原生
- Fernet = AES-128-CBC + HMAC-SHA256（密码学安全组合）
- 密钥格式规范，包含版本和时间戳
- 一行代码加密/解密

## 十二、参考文献（毕设可引）

1. Ramírez, S. (2024). *FastAPI Documentation*. https://fastapi.tiangolo.com/
2. FastAPI Users Contributors. (2026). *FastAPI Users 15.x Documentation*.
3. BerriAI. (2025). *LiteLLM: Call 100+ LLM APIs using the OpenAI format*.
4. OpenAI. (2024). *OpenAI API Reference*.
5. 智谱 AI. (2025). *BigModel 开放平台文档*. https://open.bigmodel.cn/
6. Anthropic. (2024). *Model Context Protocol (MCP) Specification*.
7. Pydantic Services. (2024). *Pydantic V2 Documentation*.
8. SQLAlchemy. (2024). *SQLAlchemy 2.0 Documentation*.
