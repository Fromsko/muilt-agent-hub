# AgentHub

多用户 AI Agent 配置与对话 API 平台。

[![CI](https://github.com/Fromsko/muilt-agent-hub/actions/workflows/build-frontend.yml/badge.svg)](https://github.com/Fromsko/muilt-agent-hub/actions)
[![License](https://img.shields.io/github/license/Fromsko/muilt-agent-hub)](LICENSE)

## 特性

- 🚀 **多模型支持** - 通过 LiteLLM 集成 OpenAI、Claude、DeepSeek、Gemini 等
- 🔐 **安全认证** - JWT 认证，API Key 加密存储
- 💬 **流式对话** - SSE 流式输出，实时响应
- 🎨 **现代化前端** - React + Ant Design + TailwindCSS
- ⚡ **快速构建** - Bun + Rsbuild 高效开发

## 项目结构

```
muilt-agent-hub/
├─ app/                    # Python FastAPI 后端
│  ├─ main.py              # FastAPI 入口 + /api/v1 挂载
│  ├─ config.py            # Settings
│  ├─ db.py                # 异步引擎 + session + init_db
│  ├─ crypto.py            # Fernet 加密/解密/mask
│  ├─ models/              # SQLModel 表模型
│  ├─ schemas/             # Pydantic 请求/响应
│  ├─ auth/                # fastapi-users 集成
│  └─ routers/             # 各模块路由
├─ web/                    # React 前端
│  ├─ src/                 # 源代码
│  ├─ public/              # 静态资源
│  └─ docs/                # 前端开发文档
├─ data/                   # 数据目录（SQLite）
├─ docs/                   # 项目文档
├─ tests/                  # 测试文件
└─ .github/                # GitHub 配置
   └─ workflows/           # CI/CD 工作流
```

## 快速开始

### 后端启动

```bash
# 1. 准备环境
cp .env.example .env

# 2. 安装依赖
uv sync

# 3. 启动服务
uv run uvicorn app.main:app --reload --port 8000

# 4. 打开文档
# http://127.0.0.1:8000/docs
```

### 前端启动

```bash
cd web

# 安装依赖
bun install

# 启动开发服务器
bun run dev
```

## 技术栈

| 层 | 选型 | 官方文档 |
|---|---|---|
| Web 框架 | [FastAPI](https://fastapi.tiangolo.com/) | https://fastapi.tiangolo.com/ |
| ORM | [SQLModel](https://sqlmodel.tiangolo.com/) + [SQLAlchemy 2](https://docs.sqlalchemy.org/) | https://sqlmodel.tiangolo.com/ |
| 数据库 | [SQLite](https://www.sqlite.org/) | https://www.sqlite.org/ |
| 认证 | [fastapi-users](https://fastapi-users.github.io/fastapi-users/) + JWT | https://fastapi-users.github.io/fastapi-users/ |
| 多模型调用 | [LiteLLM](https://docs.litellm.ai/) | https://docs.litellm.ai/ |
| 前端框架 | [React 19](https://react.dev/) | https://react.dev/ |
| 前端构建 | [Rsbuild](https://rsbuild.dev/) + [Bun](https://bun.sh/) | https://rsbuild.dev/ |
| UI 库 | [Ant Design 6](https://ant.design/) | https://ant.design/ |
| 样式 | [TailwindCSS 4](https://tailwindcss.com/) | https://tailwindcss.com/ |
| 包管理(Python) | [uv](https://docs.astral.sh/uv/) | https://docs.astral.sh/uv/ |
| 包管理(JS) | [Bun](https://bun.sh/) | https://bun.sh/ |
| 加密 | [cryptography](https://cryptography.io/) | https://cryptography.io/ |
| 配置 | [pydantic-settings](https://docs.pydantic.dev/) | https://docs.pydantic.dev/ |
| 测试 | [Playwright](https://playwright.dev/) | https://playwright.dev/ |
| CI/CD | [GitHub Actions](https://docs.github.com/actions) | https://docs.github.com/actions |

## API 概览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/register` | 注册 |
| POST | `/auth/jwt/login` | 登录 |
| GET | `/users/me` | 当前用户信息 |
| CRUD | `/prompts` | 提示词管理 |
| CRUD | `/keys` | 模型 API Key |
| CRUD | `/agents` | 智能体管理 |
| POST | `/agents/{id}/chat` | 对话 |
| GET | `/agents/{id}/messages` | 对话历史 |
| GET | `/health` | 健康检查 |

## 核心概念

**Agent = Prompt + Model + Key 的组合**。用户创建提示词、保存模型 API Key、组装成 Agent，然后通过 `/chat` 接口与之对话。

## 设计原则

- **数据隔离**：每个资源的 SQL 查询均强制 `WHERE user_id = current_user.id`
- **写时加密**：API Key 通过 Fernet 对称加密后入库
- **统一版本前缀**：所有业务路由挂在 `/api/v1/` 下
- **流式优先**：对话默认 SSE 流式输出

## 开发

### 运行测试

```bash
# 后端测试
uv run python smoke_test.py

# 前端测试
cd web && bun run test
```

### CI/CD

项目使用 GitHub Actions 自动构建前端：

- 推送到 `main` 分支时自动构建
- 支持手动触发 workflow

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT](LICENSE)

---

<details>
<summary>💝 致谢</summary>

感谢母校(张家界学院) 治好了我的拖延症。

利用这个项目将我的零散知识串起来了，也让我知道后续该如何走下去，不断成长！

</details>
