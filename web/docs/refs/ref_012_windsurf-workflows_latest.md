---
tags:
  - windsurf
  - cascade
  - workflows
  - automation
  - slash-commands
aliases:
  - Windsurf Workflows
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Windsurf Cascade Workflows 允许创建可重用的 Cascade 工作流作为 markdown 文件，通过斜杠命令自动化重复性任务，如部署、PR 评审和代码格式化。

## 核心内容

### Workflows 概述

创建可重用的 Cascade 工作流作为 markdown 文件，通过斜杠命令自动化重复性任务，如部署、PR 评审和代码格式化。

Workflows 使用户能够定义一系列步骤来引导 Cascade 完成重复性任务集，例如部署服务或响应 PR 评论。

这些工作流保存为 markdown 文件，使用户和他们的团队能够以简单可重复的方式运行关键流程。

保存后，工作流可以通过格式为 `/[name-of-workflow]` 的斜杠命令在 Cascade 中调用。

### 工作原理

规则通常通过在提示级别提供持久、可重用的上下文来为大型语言模型提供指导。

工作流通过在轨迹级别提供结构化的步骤或提示序列来扩展这一概念，引导模型通过一系列相互关联的任务或操作。

要执行工作流，用户只需在 Cascade 中使用 `/[workflow-name]` 命令调用它。

> [!tip] 您可以从工作流中调用其他工作流！<br /><br />例如，/workflow-1 可以包含"Call /workflow-2"和"Call /workflow-3"之类的指令。

调用后，Cascade 按顺序处理工作流中定义的每个步骤，执行指定的操作或生成响应。

### 如何创建 Workflow

要开始使用工作流，点击 Cascade 右上角滑块菜单中的 `Customizations` 图标，然后导航到 `Workflows` 面板。在这里，您可以点击 `+ Workflow` 按钮创建新工作流。

工作流保存为 `.windsurf/workflows/` 目录中的 markdown 文件，包含标题、描述和一系列 Cascade 应遵循的特定步骤。

### Workflow 发现

Windsurf 自动从多个位置发现工作流以提供灵活的组织：

- **当前工作区和子目录**：当前工作区及其子目录中的所有 `.windsurf/workflows/` 目录
- **Git 仓库结构**：对于 git 仓库，Windsurf 还会向上搜索到 git 根目录以在父目录中查找工作流
- **多工作区支持**：当在同一工作区中打开多个文件夹时，工作流会被去重并显示最短的相对路径

### Workflow 存储位置

工作流可以存储在以下任何位置：

- 当前工作区目录中的 `.windsurf/workflows/`
- 工作区任何子目录中的 `.windsurf/workflows/`
- 父目录中直到 git 根目录的 `.windsurf/workflows/`（对于 git 仓库）

创建新工作流时，它将保存在当前工作区的 `.windsurf/workflows/` 目录中，不一定在 git 根目录。

工作流文件每个限制为 12000 个字符。

### 使用 Cascade 生成 Workflow

您还可以要求 Cascade 为您生成工作流！这对于涉及特定 CLI 工具的一系列步骤的工作流特别有效。

### Workflow 结构

典型的 workflow 文件包含：

```markdown
---
title: Workflow Name
description: Brief description of what this workflow does
---

## Step 1
Instructions for step 1...

## Step 2
Instructions for step 2...

## Step 3
Instructions for step 3...
```

### 调用 Workflows

- **斜杠命令**：在 Cascade 输入中使用 `/workflow-name` 语法
- **嵌套调用**：工作流可以调用其他工作流
- **顺序执行**：步骤按定义顺序执行

### 示例用例

- **部署工作流**：自动化部署过程，包括预检查、部署和验证
- **PR 评审工作流**：标准化代码审查流程和检查清单
- **代码格式化工作流**：应用一致的代码格式化规则
- **测试工作流**：运行特定测试套件并报告结果

### 与 Skills 的区别

- **Skills**：打包的多步骤任务，包含支持文件，通过 @mention 或自动调用
- **Workflows**：结构化的步骤序列，通过斜杠命令调用，适合重复性流程

### 最佳实践

- 保持工作流简洁且专注于特定任务
- 使用清晰的步骤标题和说明
- 测试工作流以确保它们按预期工作
- 考虑创建可重用的小型工作流，可以组合成更大的工作流
- 为工作流使用描述性名称以便于发现

## 相关资源

- [[ref_009_windsurf-memories_latest]] - Windsurf Memories & Rules
- [[ref_010_windsurf-skills_latest]] - Windsurf Skills
- [[ref_011_windsurf-agents_latest]] - AGENTS.md 文档
- [Windsurf 官方文档](https://docs.windsurf.com/plugins/cascade/workflows) - Workflows 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：自动化指南
