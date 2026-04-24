---
tags:
  - windsurf
  - cascade
  - worktrees
  - git
  - parallel-tasks
aliases:
  - Windsurf Worktrees
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Windsurf Cascade Worktrees 自动设置 git worktrees 以实现并行 Cascade 任务，允许每个 Cascade 会话拥有自己的会话，在不干扰主工作区的情况下进行编辑、构建和测试代码。

## 核心内容

### Worktrees 概述

自动设置 git worktrees 以实现并行 Cascade 任务。

Windsurf 支持使用 git worktrees 并行运行 Cascade 任务，而不会干扰您的主工作区。

使用 worktrees 时，每个 Cascade 会话都有自己的会话，允许 Cascade 进行编辑、构建和测试代码，而不会干扰您的主工作区。

### 基本工作树使用

开始使用 worktrees 的最简单方法是在 Cascade 输入的右下角切换到"Worktree"模式。

> [!note] 目前，您只能在 Cascade 会话开始时切换到 worktree。开始后的对话无法移动到不同的 worktree。

Cascade 在 worktree 中进行文件更改后，您可以选择点击"merge"将这些更改合并回您的主工作区。

### 位置

Worktree 按 repo 名称组织在 `~/.windsurf/worktrees/<repo_name>` 中。

每个 worktree 都有一个唯一的随机名称。

要查看活动 worktree 列表，您可以从仓库目录中运行 `git worktree list`。

> [!warning] 由于 worktree 位于与原始项目不同的目录中，**依赖相对路径的构建系统或工具**（例如 `../shared-lib` 引用、符号链接依赖或通过路径解析的 monorepo 源依赖）可能会在 worktree 中中断。如果您的项目使用仓库根目录之外的相对路径，请配置 [`post_setup_worktree` hook](./worktrees#setup-hook) 以创建必要的符号链接或将所需文件复制到预期位置。

### Setup Hook

每个 worktree 包含仓库文件的副本，但不包含 `.env` 文件或其他未进行版本控制的包。

如果您想在每个 worktree 中包含其他文件或包，可以使用 `post_setup_worktree` [hook](./hooks#post_setup_worktree) 将它们复制到 worktree 目录。

`post_setup_worktree` hook 在每个 worktree 创建和配置后运行。它在新的 **worktree** 目录中执行。

`$ROOT_WORKSPACE_PATH` 环境变量指向原始工作区路径，可用于访问文件或运行相对于原始仓库的命令。

#### 示例

创建新 worktree 时复制环境文件并安装依赖项。

**配置**（在 `.windsurf/hooks.json` 中）：

```json
{
  "hooks": {
    "post_setup_worktree": [
      {
        "command": "bash $ROOT_WORKSPACE_PATH/hooks/setup_worktree.sh",
        "show_output": true
      }
    ]
  }
}
```

**脚本**（`hooks/setup_worktree.sh`）：

```bash
#!/bin/bash

# Copy environment files from the original workspace
if [ -f "$ROOT_WORKSPACE_PATH/.env" ]; then
    cp "$ROOT_WORKSPACE_PATH/.env" .env
    echo "Copied .env file"
fi

if [ -f "$ROOT_WORKSPACE_PATH/.env.local" ]; then
    cp "$ROOT_WORKSPACE_PATH/.env.local" .env.local
    echo "Copied .env.local file"
fi

# Install dependencies
if [ -f "package.json" ]; then
    npm install
    echo "Installed npm dependencies"
fi

exit 0
```

此 hook 确保每个 worktree 自动具有必要的环境配置和已安装的依赖项。

### 清理

Windsurf 在创建新 worktree 时会自动清理较旧的 worktree 以防止过多的磁盘使用。每个工作区最多可以有 **20** 个 worktree。

Worktree 根据最后访问时间进行清理——最旧的 worktree 首先被删除。此清理按工作区基础进行，确保来自不同仓库的 worktree 保持相互独立。

此外，如果您手动删除 Cascade 对话，Windsurf 将自动删除关联的 worktree。

### 源代码控制面板

默认情况下，Windsurf 不在 SCM 面板中显示由 Cascade 创建的 worktree。

您可以在设置中将 `git.showWindsurfWorktrees` 设置为 `true` 以覆盖此设置并在 SCM 面板中启用 worktree 的可视化。

### Worktree 限制

- 每个工作区最多 20 个 worktree
- 只能在会话开始时切换到 worktree
- 相对路径依赖可能需要额外配置
- Worktree 不包含未版本控制的文件（如 .env）

### 最佳实践

- 使用 post_setup_worktree hook 自动配置环境
- 定期清理不需要的 worktree
- 在 SCM 面板中启用 worktree 可视化以便管理
- 考虑使用 worktree 进行实验性更改而不影响主分支

## 相关资源

- [[ref_009_windsurf-memories_latest]] - Windsurf Memories & Rules
- [[ref_010_windsurf-skills_latest]] - Windsurf Skills
- [[ref_011_windsurf-agents_latest]] - AGENTS.md 文档
- [[ref_012_windsurf-workflows_latest]] - Workflows 文档
- [Windsurf 官方文档](https://docs.windsurf.com/windsurf/cascade/worktrees) - Worktrees 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：配置指南
