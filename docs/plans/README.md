# AgentHub 核心文档中心

本目录是 AgentHub 后端项目的权威文档，记录设计决策、开发流程、任务状态与未来规划。

## 文档索引

| 文档 | 说明 | 适合谁看 |
|---|---|---|
| [00-workflow.md](./00-workflow.md) | 开发工作流、分支策略、发布节奏 | 开发者 |
| [01-progress.md](./01-progress.md) | 当前进度快照、已完成 / 已验证清单 | 所有人 |
| [02-roadmap.md](./02-roadmap.md) | 版本路线图 v0.1 → v1.0 | 产品 / 论文 |
| [03-tasks.md](./03-tasks.md) | 细粒度任务清单（看板） | 开发者 |
| [04-architecture.md](./04-architecture.md) | 系统架构、数据模型、依赖图 | 开发 / 评审 |
| [05-api-reference.md](./05-api-reference.md) | 所有 `/api/v1/*` 端点签名 | 前端 / 调用方 |
| [06-stack.md](./06-stack.md) | 技术栈与官方文档索引 | 新人 |
| [07-decisions.md](./07-decisions.md) | 关键技术决策与取舍记录 | 评审 / 论文 |

## 项目一句话

> **AgentHub** 是一个多用户的 AI Agent 配置与对话 API 平台：用户在平台上配置 Prompt、模型密钥、工具，组装成智能体，通过 REST API（含 SSE 流式）与之对话。

## 快速链接

- 根目录 README：`../README.md`（启动说明）
- 冒烟测试：`../smoke_test.py`
- 真实模型测试：`../test_zhipu_chat.py`
- 项目计划原始稿：`C:\Users\Administrator\.windsurf\plans\agenthub-mvp-a5bec7.md`
