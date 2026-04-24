---
tags:
  - windsurf
  - cascade
  - skills
  - workflows
  - automation
aliases:
  - Windsurf Skills
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Windsurf Cascade Skills 帮助处理复杂的多步骤任务，通过将参考脚本、模板、清单等支持文件打包到文件夹中，让 Cascade 能够一致地执行多步骤工作流。

## 核心内容

### Skills 概述

Skills 帮助 Cascade 处理复杂的多步骤任务。

最困难的工程任务通常不仅仅需要好的提示词。它们可能需要参考脚本、模板、清单和其他支持文件。Skills 让您将所有这些打包到 Cascade 可以调用（读取和使用）的文件夹中。

Skills 是教 Cascade 如何一致地执行多步骤工作流的绝佳方式。

Cascade 使用**渐进式披露**（progressive disclosure）：默认情况下，只有技能的 `name` 和 `description` 会显示给模型。完整的 `SKILL.md` 内容和支持文件**仅在 Cascade 决定调用技能时**（或当您 `@mention` 它时）加载。这即使在定义了许多技能的情况下也能保持上下文窗口精简。

有关 Skills 规范的更多详细信息，请访问 [agentskills.io](https://agentskills.io/home)。

### 如何创建 Skill

#### 使用 UI（最简单）

1. 打开 Cascade 面板
2. 点击面板右上角的三个点以打开自定义菜单
3. 点击 `Skills` 部分
4. 点击 `+ Workspace` 创建工作区（项目特定）技能，或点击 `+ Global` 创建全局技能
5. 命名技能（仅限小写字母、数字和连字符）

#### 手动创建

**工作区技能（项目特定）：**

1. 创建目录：`.windsurf/skills/<skill-name>/`
2. 添加带有 YAML frontmatter 的 `SKILL.md` 文件

**全局技能（在所有工作区中可用）：**

1. 创建目录：`~/.codeium/windsurf/skills/<skill-name>/`
2. 添加带有 YAML frontmatter 的 `SKILL.md` 文件

### SKILL.md 文件格式

每个技能需要一个带有 YAML frontmatter 的 `SKILL.md` 文件，其中包含技能的元数据：

#### 示例技能

```markdown
---
name: deploy-to-production
description: Guides the deployment process to production with safety checks
---

## Pre-deployment Checklist
1. Run all tests
2. Check for uncommitted changes
3. Verify environment variables

## Deployment Steps
Follow these steps to deploy safely...

[Reference supporting files in this directory as needed]
```

#### 必需的 Frontmatter 字段

- **name**：技能的唯一标识符（在 UI 中显示并用于 @-mentions）
- **description**：简短说明，显示给模型以帮助它决定何时调用技能

有效名称示例：`deploy-to-staging`、`code-review`、`setup-dev-environment`

### 添加支持资源

将任何支持文件放在技能文件夹中的 `SKILL.md` 旁边。当调用技能时，这些文件对 Cascade 可用：

```
.windsurf/skills/deploy-to-production/
├── SKILL.md
├── deployment-checklist.md
├── rollback-procedure.md
└── config-template.yaml
```

### 调用 Skills

- **自动调用**：Cascade 根据任务上下文自动决定何时调用技能
- **手动调用**：使用 `@<skill-name>` 语法手动调用特定技能

### Skill 范围

#### 工作区技能
- 存储在 `.windsurf/skills/` 中
- 仅在特定工作区中可用
- 适合项目特定的工作流

#### 全局技能（Enterprise）
- 存储在 `~/.codeium/windsurf/skills/` 中
- 在所有工作区中可用
- 适合跨项目的通用工作流

### 示例用例

- **部署工作流**：自动化部署过程，包括预部署检查清单和回滚程序
- **代码审查指南**：提供一致的代码审查标准和检查清单
- **测试程序**：定义标准测试工作流和测试用例模板

### 最佳实践

- 保持技能名称简洁且具有描述性
- 在描述中清晰说明技能的用途
- 组织支持文件以便于导航
- 使用渐进式披露来保持上下文窗口精简
- 测试技能以确保 Cascade 能够正确理解和执行它们

### Skills vs Rules vs Workflows

- **Skills**：多步骤任务的完整工作流，包含支持文件
- **Rules**：简单的指导原则，应用于所有对话
- **Workflows**：结构化的步骤序列，通过斜杠命令调用

## 相关资源

- [[ref_009_windsurf-memories_latest]] - Windsurf Memories & Rules
- [[ref_011_windsurf-agents_latest]] - AGENTS.md 文档
- [[ref_012_windsurf-workflows_latest]] - Workflows 文档
- [Agentskills.io](https://agentskills.io/home) - Skills 规范文档
- [Windsurf 官方文档](https://docs.windsurf.com/windsurf/cascade/skills) - Skills 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：自动化指南
