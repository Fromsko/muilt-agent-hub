# Python 代码格式化工具指南

## 概述

本文档整理了 Python 代码格式化工具的核心知识，包括 Black、Ruff、Autopep8 的对比和使用方法。

## 格式化工具对比

| 工具 | 语言 | 速度 | 特点 | 推荐度 |
|------|------|------|------|--------|
| **Ruff** | Rust | 极快（30x Black） | Black 兼容、统一工具链 | ⭐⭐⭐⭐⭐ |
| **Black** | Python | 中等 | 观点强硬、社区标准 | ⭐⭐⭐⭐ |
| **Autopep8** | Python | 较快 | 保守修改、可配置 | ⭐⭐⭐ |

## 1. Ruff（推荐）

### 特点

- **极快性能**：比 Black 快 30 倍，比 YAPF 快 100 倍
- **Black 兼容**：>99.9% 的 Black 兼容性
- **统一工具链**：集成 linter + formatter
- **Rust 编写**：高性能和可靠性

### 安装和使用

```bash
pip install ruff
ruff format
```

### 核心优势

1. **性能优先**：格式化大型 Python 项目只需毫秒级
2. **易于采用**：作为 Black 的直接替代品
3. **可配置**：支持引号样式、缩进样式等配置
4. **简化工具链**：一个工具替代多个依赖

### 高级特性

- 支持 Python 3.12 语法
- 内置 Jupyter Notebook 格式化
- VS Code 扩展和 LSP 支持
- 即时格式化保存（format-on-save）

### 配置示例

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

## 2. Black（社区标准）

### 特点

- **观点强硬**：将整个代码库转换为统一风格
- **PEP 8 兼容**：自动符合 Python 代码风格指南
- **零配置**：开箱即用
- **社区广泛采用**：Python 社区事实标准

### 安装和使用

```bash
pip install black
black .
```

### 使用建议

1. **使用尾随逗号**：提高可读性
2. **指定行长度**：默认 88 字符
3. **配合 isort**：处理导入排序

### 配置示例

```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py312']
include = '\.pyi?$'
```

## 3. Autopep8

### 特点

- **保守修改**：只修复不符合 PEP 8 的部分
- **保留输入风格**：尽可能保持原有代码风格
- **高度可配置**：丰富的配置选项

### 缺点

1. **激进排序导入**：可能破坏导入顺序
2. **缩进执行不当**：某些情况下缩进处理不完美
3. **不一致性**：不同文件可能风格不统一

### 安装和使用

```bash
pip install autopep8
autopep8 --in-place --aggressive file.py
```

## 4. 工具选择建议

### 推荐方案

| 场景 | 推荐工具 |
|------|----------|
| **新项目** | Ruff |
| **已有 Black 项目** | Ruff（无缝迁移） |
| **需要最大兼容性** | Black |
| **保守格式化** | Autopep8 |

### 迁移路径

```
Autopep8 → Black → Ruff
```

## 5. 性能对比

根据实际测试：

- **Ruff**：格式化 250,000 行代码（Zulip 项目）只需毫秒级
- **Black**：格式化相同项目需要数秒
- **Autopep8**：介于两者之间

## 6. 最佳实践

### 项目配置

```bash
# 推荐使用 pyproject.toml 统一配置
# Ruff 同时提供 linter 和 formatter
ruff check .    # 代码检查
ruff format .   # 代码格式化
```

### CI/CD 集成

```yaml
# GitHub Actions 示例
- name: Install Ruff
  run: pip install ruff

- name: Run Ruff
  run: ruff check . && ruff format --check .
```

### 编辑器配置

- **VS Code**：安装 `charliermarsh.ruff` 扩展
- **PyCharm**：安装 Ruff 插件
- **Vim/Neovim**：使用 LSP 客户端

## 7. 总结

- **Ruff 是未来**：性能、兼容性、统一工具链
- **Black 是标准**：社区广泛采用，稳定可靠
- **Autopep8 是选择**：需要保守格式化时使用

### 推荐配置

```bash
# 现代 Python 项目推荐工具链
pip install ruff pytest mypy

# 格式化 + 检查 + 类型检查
ruff format .
ruff check .
pytest
mypy .
```

## 参考资料

- [The Ruff Formatter: An extremely fast, Black-compatible Python formatter](https://astral.sh/blog/the-ruff-formatter)
- [Python Auto Formatter: Autopep8 vs. Black](https://builtin.com/data-science/autopep8-vs-black)
- [My Quest for the Best Python Formatter](https://medium.com/@jillvillany_7737/my-quest-for-the-best-python-formatter-cd25a544ef81)
