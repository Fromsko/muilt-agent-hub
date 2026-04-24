---
tags:
  - ant-design
  - mcp
  - ai
  - cli
  - 中文
aliases:
  - Ant Design MCP Server 集成
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Ant Design MCP Server 文档，介绍如何在各种 AI 工具中使用 Model Context Protocol (MCP) 集成 Ant Design 文档和组件信息。

## 核心内容

### 什么是 MCP？

MCP (Model Context Protocol) 是一种标准协议，允许 AI 工具与外部服务和数据源进行交互。

### 官方 MCP Server

Ant Design 提供官方 MCP Server，通过 `antd mcp` 命令启动。

#### 工具

官方 MCP Server 提供的工具包括：
- 文档查询
- 组件信息获取
- 示例代码检索

#### 提示词

内置提示词帮助 AI 更好地理解和使用 Ant Design。

#### 配置

在 AI 工具中配置 MCP Server。

### 在 AI 工具中的使用

#### Cursor

配置文件：`.cursor/mcp.json`

```json
{
  "mcpServers": {
    "antd": {
      "command": "antd",
      "args": ["mcp"]
    }
  }
}
```

#### Windsurf

配置文件：`~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "antd": {
      "command": "antd",
      "args": ["mcp"]
    }
  }
}
```

#### Claude Code

配置文件：`mcpServers`

```json
{
  "mcpServers": {
    "antd": {
      "command": "antd",
      "args": ["mcp"]
    }
  }
}
```

#### Codex

配置文件：`.codex/mcp.json`

```json
{
  "mcpServers": {
    "antd": {
      "command": "antd",
      "args": ["mcp"]
    }
  }
}
```

#### 其他工具

支持所有兼容 MCP 协议的 Agent，包括：
- Gemini API
- Trae AI
- Qoder
- Neovate Code

### 社区 MCP Server

也可以使用社区维护的 MCP server：[@jzone-mcp/antd-components-mcp](https://www.npmjs.com/package/@jzone-mcp/antd-components-mcp)

该 MCP server 提供以下功能：
- list-components - 列出所有可用的 Ant Design 组件
- get-component-docs - 获取指定组件的详细文档
- list-component-examples - 获取组件的代码示例
- get-component-changelog - 获取组件的更新日志

配置：

```json
{
  "mcpServers": {
    "antd-components": {
      "command": "npx",
      "args": ["-y", "@jzone-mcp/antd-components-mcp"]
    }
  }
}
```

### 备选方案：使用 LLMs.txt

如果 AI 工具不支持 MCP，可以使用 LLMs.txt 支持：

- [llms.txt](https://ant.design/llms.txt) - 所有组件的结构化概览
- [llms-full.txt](https://ant.design/llms-full.txt) - 包含示例的完整文档

## 相关资源

- [[ref_005_ant-design_llms-full_latest]] - Ant Design 完整组件文档
- [[ref_008_ant-design-cli-cn_latest]] - Ant Design CLI 文档
- [Model Context Protocol 文档](https://modelcontextprotocol.io/) - MCP 官方文档
- [Ant Design CLI](https://ant.design/docs/react/cli-cn) - CLI 文档
- [@ant-design/cli GitHub 仓库](https://github.com/ant-design/ant-design-cli) - CLI GitHub 仓库

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：集成指南（中文）
