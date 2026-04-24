---
tags:
  - windsurf
  - cascade
  - agents
  - directory-scoped
  - instructions
aliases:
  - Windsurf AGENTS.md
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Windsurf AGENTS.md 文件提供目录范围的 Cascade 指令，根据文件在项目中的位置自动应用指令，特别适合提供目录特定的编码指南、架构决策或项目约定。

## 核心内容

### AI Commit Messages

通过单击 Windsurf 中的 sparkle (✨) 图标，AI 自动分析代码更改并生成有意义的 git 提交消息。

所有付费用户无限制使用！

#### 工作原理

准备提交更改时：

1. 在 Git 面板中暂存文件
2. 点击提交消息字段旁边的 sparkle (✨) 图标
3. 审查生成的消息并根据需要进行编辑
4. 完成提交

AI 分析最近的代码更改并创建描述您所做内容的有意义的提交消息。

#### 最佳实践

为了获得更好的结果：

- 应用提交范围的通用最佳实践：将小的、有意义的更改单元组合在一起
- 提交前审查消息

#### 限制

- 大型或复杂的提交可能导致更通用的消息
- 专业术语可能无法完美捕获
- 生成的消息是建议，可能需要编辑

#### 隐私

您的代码和提交消息保持私密。我们不存储您的代码更改或使用它们来训练我们的模型。

### AGENTS.md 概述

创建 AGENTS.md 文件以向 Cascade 提供目录范围的指令。指令根据文件在项目中的位置自动应用。

AGENTS.md 文件提供了一种简单的方法，为 Cascade 提供上下文感知的指令，这些指令根据文件在项目中的位置自动应用。这对于提供目录特定的编码指南、架构决策或项目约定特别有用。

### 工作原理

当您创建 `AGENTS.md` 文件（或 `agents.md`）时，Windsurf 会自动发现它并将其输入到驱动 `.windsurf/rules/` 的相同 [Rules](/windsurf/cascade/memories#rules) 引擎中——只是激活模式从文件的位置推断而不是 frontmatter：

- **根目录**：被视为**始终开启**的规则——完整内容包含在 Cascade 的每条消息的系统提示中
- **子目录**：被视为具有自动生成的模式 `<directory>/**` 的 **glob** 规则——仅当 Cascade 在该目录内读取或编辑文件时才应用内容

这种基于位置的定位使 `AGENTS.md` 成为提供有针对性的指导的理想选择，而不会使单个全局配置文件变得杂乱。

### 创建 AGENTS.md 文件

只需在所需目录中创建名为 `AGENTS.md` 或 `agents.md` 的文件。该文件使用纯 markdown，不需要特殊的 frontmatter。

#### 示例结构

```
my-project/
├── AGENTS.md                    # 整个项目的全局指令
├── frontend/
│   ├── AGENTS.md                # 前端代码的特定指令
│   └── src/
│       └── components/
│           └── AGENTS.md        # 组件的特定指令
├── backend/
│   └── AGENTS.md                # 后端代码的特定指令
└── docs/
    └── AGENTS.md                # 文档的指令
```

#### 示例内容

以下是 React 组件目录的示例 `AGENTS.md` 文件：

```markdown
# Component Guidelines

When working with components in this directory:

- Use functional components with hooks
- Follow the naming convention: ComponentName.tsx for components, useHookName.ts for hooks
- Each component should have a corresponding test file: ComponentName.test.tsx
- Use CSS modules for styling: ComponentName.module.css
- Export components as named exports, not default exports

## File Structure

Each component folder should contain:
- The main component file
- A test file
- A styles file (if needed)
- An index.ts for re-exports
```

### 发现和定位

#### 自动定位

Windsurf 自动从多个位置发现 AGENTS.md 文件：

- **当前工作区和子目录**：当前工作区及其子目录中的所有 `AGENTS.md` 或 `agents.md` 文件
- **Git 仓库结构**：对于 git 仓库，Windsurf 还会向上搜索到 git 根目录以在父目录中查找文件
- **多工作区支持**：当在同一工作区中打开多个文件夹时，文件会被去重并显示最短的相对路径

#### 自动定位

根据文件位置自动应用指令：

- 根目录的 AGENTS.md 应用于整个项目
- 子目录中的 AGENTS.md 仅应用于该目录及其子目录中的文件

### 最佳实践

#### 内容指南

- 保持指令简洁且针对特定目录
- 使用项目符号和编号列表以提高可读性
- 包含特定于该目录的编码约定和最佳实践
- 避免重复通用规则（这些应该放在全局规则中）

#### 与 Rules 的比较

- **AGENTS.md**：基于文件位置的目录范围指令
- **Rules**：全局或 glob 模式的规则，需要显式配置

AGENTS.md 更适合提供目录特定的指导，而 Rules 更适合全局配置。

## 相关资源

- [[ref_009_windsurf-memories_latest]] - Windsurf Memories & Rules
- [[ref_010_windsurf-skills_latest]] - Windsurf Skills
- [[ref_012_windsurf-workflows_latest]] - Workflows 文档
- [Windsurf 官方文档](https://docs.windsurf.com/windsurf/cascade/agents-md) - AGENTS.md 文档
- [Windsurf 官方文档](https://docs.windsurf.com/windsurf/ai-commit-message) - AI Commit Messages 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：配置指南
