---
tags:
  - ant-design
  - cli
  - ai
  - skills
  - 中文
aliases:
  - Ant Design CLI 工具
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Ant Design CLI 文档，介绍命令行工具的使用方法、命令列表以及在 AI 工具中的集成方式。

## 核心内容

### 什么是 Ant Design CLI？

Ant Design CLI 是 Ant Design 官方提供的命令行工具，用于快速查询组件文档、分析项目等操作。

### 亮点

- 快速查询组件文档
- 项目分析功能
- AI 工具集成支持
- Skills 协议兼容

### 安装

```bash
npm install -g @ant-design/cli
# or
pnpm add -g @ant-design/cli
# or
yarn global add @ant-design/cli
```

### 快速开始

```bash
antd --help
```

### 命令

#### 知识查询

查询组件文档、API、示例等信息。

#### 项目分析

分析项目中 Ant Design 的使用情况，包括：
- 组件使用统计
- 版本兼容性检查
- 最佳实践建议

#### 全局参数

- `--help` - 显示帮助信息
- `--version` - 显示版本号
- `--config` - 指定配置文件

#### MCP Server

启动 MCP Server 以供 AI 工具使用：

```bash
antd mcp
```

### 在 AI 工具中的使用

CLI 内置 Skill 文件，指导 Code Agent 在正确的时机调用正确的命令：

```bash
npx skills add ant-design/ant-design-cli
```

支持的 AI 工具包括：
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- [Cursor](https://docs.cursor.com/zh/context/@-symbols/@-docs)
- [Codex](https://github.com/openai/codex)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)

支持所有兼容 [skills](https://github.com/nicepkg/agent-skills) 协议的 Agent。

## 相关资源

- [[ref_007_ant-design-mcp-cn_latest]] - Ant Design MCP Server 文档
- [[ref_005_ant-design_llms-full_latest]] - Ant Design 完整组件文档
- [@ant-design/cli GitHub 仓库](https://github.com/ant-design/ant-design-cli) - CLI GitHub 仓库
- [@ant-design/cli npm 地址](https://www.npmjs.com/package/@ant-design/cli) - npm 包地址
- [Ant Design LLMs.txt 指南](https://ant.design/docs/react/llms-cn) - LLMs.txt 指南

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：工具文档（中文）
