---
tags:
  - windsurf
  - cascade
  - memories
  - rules
  - context
aliases:
  - Windsurf Memories & Rules
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Windsurf Cascade 的 Memories & Rules 系统，用于在对话之间持久化上下文，支持全局规则、工作区规则和企业级系统级规则。

## 核心内容

### Memories & Rules 概述

配置 Cascade 的 memories 和 rules 以在对话之间持久化上下文，包括全局规则、工作区规则和企业级系统级规则。

**Memories** 是在对话之间共享和持久化上下文的系统。

Cascade 中有两种机制：
- **Memories** - 可由 Cascade 自动生成
- **Rules** - 由用户在本地和全局级别手动定义

### 如何管理 Memories

点击 Cascade 右上角滑块菜单中的 `Customizations` 图标即可随时访问和配置 Memories 和 Rules。要编辑现有的 memory，只需点击它，然后点击 `Edit` 按钮。

### Memories

在对话过程中，如果 Cascade 遇到认为值得记住的上下文，可以自动生成并存储 memories。

此外，您可以随时要求 Cascade 创建 memory。只需提示 Cascade "create a memory of ..."。

Cascade 的自动生成 memories 与创建它们的工作区相关联，当 Cascade 认为它们相关时会检索它们。在一个工作区中生成的 memories 不会在另一个工作区中可用。

> [!tip] 创建和使用自动生成的 memories 不消耗 credits

### Rules

用户可以明确定义 Cascade 应遵循的自己的规则。

规则可以在全局级别或工作区级别定义。

- `global_rules.md` - 适用于所有工作区的规则
- `.windsurf/rules` - 与 glob 或自然语言描述关联的工作区级别目录

### Rules 发现

Windsurf 自动从多个位置发现规则以提供灵活的组织：

- **当前工作区和子目录**：当前工作区及其子目录中的所有 `.windsurf/rules` 目录
- **Git 仓库结构**：对于 git 仓库，Windsurf 还会向上搜索到 git 根目录以在父目录中查找规则
- **多工作区支持**：当在同一工作区中打开多个文件夹时，规则会被去重并显示最短的相对路径

### Rules 存储位置

规则可以存储在以下任何位置：

- 当前工作区目录中的 `.windsurf/rules`
- 工作区任何子目录中的 `.windsurf/rules`
- 父目录中直到 git 根目录的 `.windsurf/rules`（对于 git 仓库）

创建新规则时，它将保存在当前工作区的 `.windsurf/rules` 目录中，不一定在 git 根目录。

要开始使用 Rules，点击 Cascade 右上角滑块菜单中的 `Customizations` 图标，然后导航到 `Rules` 面板。在这里，您可以点击 `+ Global` 或 `+ Workspace` 按钮分别在全局或工作区级别创建新规则。

> [!tip] 您可以在 [https://windsurf.com/editor/directory](https://windsurf.com/editor/directory) 找到由 Windsurf 团队策划的示例规则模板以帮助您入门。

规则文件每个限制为 12000 个字符。

### 最佳实践

为了帮助 Cascade 有效地遵循您的规则，请遵循以下最佳实践：

- 保持规则简单、简洁和具体。太长或模糊的规则可能会混淆 Cascade。
- 无需添加通用规则（例如"编写好的代码"），因为这些已经内置在 Cascade 的训练数据中。
- 使用项目符号、编号列表和 markdown 格式化规则。与长段落相比，这些更容易让 Cascade 遵循。

例如：

```
# Coding Guidelines 
- My project's programming language is python
- Use early returns when possible
- Always add documentation when creating new functions and classes
```

- XML 标签可以是一种有效的沟通和分组相似规则的方式。例如：

```
<coding_guidelines>
- My project's programming language is python
- Use early returns when possible
- Always add documentation when creating new functions and classes
</coding_guidelines>
```

### 系统级规则（Enterprise）

企业组织可以部署适用于所有工作区且未经管理员权限无法被最终用户修改的系统级规则。这非常适合强制执行组织范围的编码标准、安全策略和合规性要求。

系统级规则从操作系统特定目录加载：

**macOS:**

```
/Library/Application Support/Windsurf/rules/*.md
```

**Linux/WSL:**

```
/etc/windsurf/rules/*.md
```

**Windows:**

```
C:\ProgramData\Windsurf\rules\*.md
```

将规则文件（作为 `.md` 文件）放在适合您操作系统的目录中。系统将自动从这些目录加载所有 `.md` 文件。

## 相关资源

- [[ref_010_windsurf-skills_latest]] - Windsurf Skills 文档
- [[ref_011_windsurf-agents_latest]] - AGENTS.md 文档
- [[ref_012_windsurf-workflows_latest]] - Workflows 文档
- [Windsurf 官方文档](https://docs.windsurf.com/windsurf/cascade/memories) - Memories & Rules 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：配置指南
