# Python CI/CD 流水线配置指南

## 概述

本文档详细介绍了 Python 项目的 CI/CD 流水线配置，包括 GitHub Actions、Pre-commit Hooks、自动化测试、代码格式化和 Linting 的完整集成方案。

## 核心工具链

```
Pre-commit Hooks (本地) → GitHub Actions (远程) → 自动修复和提交
```

### 工具组合

- **pytest**：单元测试
- **ruff**：Linting + 格式化（推荐）
- **black**：代码格式化
- **mypy**：类型检查
- **pre-commit**：本地 Git 钩子

## 1. Pre-commit Hooks（本地检查）

### 安装

```bash
pip install pre-commit ruff black
```

### 配置文件 `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-yaml
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: check-added-large-files
  
  - repo: https://github.com/psf/black
    rev: 24.1.1
    hooks:
      - id: black
        language_version: python3.12
  
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.15
    hooks:
      - id: ruff
        args: [--fix]
  
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-all]
```

### 安装和运行

```bash
# 安装钩子
pre-commit install

# 手动运行所有检查
pre-commit run --all-files

# 运行特定钩子
pre-commit run black --all-files
```

## 2. GitHub Actions 流水线配置

### 基础流水线（Linting + 格式化）

```yaml
name: Python Code Quality

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ruff black mypy
      
      - name: Lint with Ruff
        run: ruff check .
      
      - name: Format check with Black
        run: black --check .
      
      - name: Type check with MyPy
        run: mypy .
```

### 完整流水线（测试 + Linting + 格式化）

```yaml
name: Python CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov
      
      - name: Run tests
        run: |
          pytest --cov=./app --cov-report=xml --cov-report=html
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install ruff black mypy
      
      - name: Lint with Ruff
        run: ruff check .
      
      - name: Format check with Black
        run: black --check .
      
      - name: Type check with MyPy
        run: mypy .
```

## 3. 自动修复和提交

### 使用 Ruff 自动修复

```yaml
name: Lint and Auto-fix

on:
  push:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Install Ruff
        run: pip install ruff
      
      - name: Run Ruff check and fix
        run: |
          ruff check .
          ruff fix .
      
      - name: Auto-commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'style: auto-fix by ruff'
          commit_user_name: 'github-actions[bot]'
          commit_user_email: 'github-actions[bot]@users.noreply.github.com'
```

### 使用 Ruff GitHub Action

```yaml
name: Lint with Ruff Action

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      
      - name: Run Ruff
        uses: chartboost/ruff-action@v1
        with:
          args: --check .
          fix_args: --fix .
      
      - name: Auto-commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'style: auto-fix by ruff'
```

## 4. Ruff 配置

### `ruff.toml` 或 `.ruff.toml`

```toml
line-length = 120
target-version = "py312"

[lint]
select = [
  "E",      # pycodestyle errors
  "W",      # pycodestyle warnings
  "F",      # pyflakes
  "I",      # isort
  "B",      # flake8-bugbear
  "C4",     # flake8-comprehensions
  "UP",     # pyupgrade
]
ignore = [
  "E501",   # line too long (handled by black)
]

[format]
quote-style = "double"
indent-style = "space"
skip-magic-trailing-comma = false
line-ending = "auto"
```

## 5. Black 配置

### `pyproject.toml`

```toml
[tool.black]
line-length = 120
target-version = ['py312']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''
```

## 6. Pytest 配置

### `pytest.ini` 或 `pyproject.toml`

```toml
[tool.pytest.ini_options]
minversion = "7.0"
addopts = "-ra -q --strict-markers"
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
  "slow: marks tests as slow (deselect with '-m \"not slow\"')",
  "integration: marks tests as integration tests",
]
```

### 测试覆盖率配置

```toml
[tool.coverage.run]
source = ["app"]
omit = [
  "*/tests/*",
  "*/migrations/*",
]

[tool.coverage.report]
exclude_lines = [
  "pragma: no cover",
  "def __repr__",
  "raise AssertionError",
  "raise NotImplementedError",
]
```

## 7. 推荐流水线策略

### 开发流程

```
1. 本地开发 → Pre-commit hooks 检查
2. 提交代码 → GitHub Actions 运行
3. 自动修复 → 自动提交格式化修复
4. 通过检查 → 合并到主分支
```

### 分支策略

- **main**：生产环境，需要完整测试
- **develop**：开发环境，需要基础测试
- **feature/***：功能分支，可选检查

### 检查优先级

1. **必需**：pytest（单元测试）
2. **必需**：ruff check（Linting）
3. **必需**：black --check（格式化检查）
4. **可选**：mypy（类型检查）
5. **可选**：pytest-cov（覆盖率报告）

## 8. 高级配置

### 缓存优化

```yaml
- name: Set up Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'  # 缓存 pip 依赖

- name: Cache Ruff
  uses: actions/cache@v3
  with:
    path: ~/.cache/ruff
    key: ${{ runner.os }}-ruff-${{ hashFiles('**/pyproject.toml') }}
```

### 并行执行

```yaml
jobs:
  test:
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
        os: [ubuntu-latest, windows-latest, macos-latest]
```

### 条件执行

```yaml
on:
  push:
    paths:
      - 'app/**/*.py'
      - 'tests/**/*.py'
      - 'pyproject.toml'
```

## 9. 故障排查

### 常见问题

1. **Pre-commit 钩子失败**
   - 运行 `pre-commit run --all-files` 手动检查
   - 检查 Python 版本兼容性

2. **GitHub Actions 缓存问题**
   - 清除缓存：在 Actions 设置中删除缓存
   - 更新 cache key

3. **自动提交失败**
   - 检查 `GITHUB_TOKEN` 权限
   - 确保分支保护设置允许自动提交

## 10. 最佳实践

### 工具选择建议

| 场景 | 推荐工具 |
|------|----------|
| **新项目** | Ruff（Linting + 格式化） |
| **现有 Black 项目** | Ruff（兼容模式） |
| **需要类型检查** | MyPy |
| **需要覆盖率** | pytest-cov |

### 配置建议

- **统一配置**：使用 `pyproject.toml` 统一管理
- **版本锁定**：在 CI 中固定工具版本
- **快速失败**：Linting 失败则停止流水线
- **自动修复**：启用自动提交减少手动工作

### 性能优化

- **并行测试**：使用 pytest-xdist
- **增量检查**：Ruff 支持增量检查
- **缓存依赖**：缓存 pip 和工具缓存

## 参考资料

- [Streamlining Your Python Workflow with Black, Ruff, GitHub Actions, and Pre-Commit Hooks](https://dev.to/pratyushcode/streamlining-your-python-workflow-with-black-ruff-github-actions-and-pre-commit-hooks-nk2)
- [Automate Python Linting and Code Style Enforcement with Ruff and GitHub Actions](https://dev.to/ken_mwaura1/automate-python-linting-and-code-style-enforcement-with-ruff-and-github-actions-2kk1)
- [Building and testing Python - GitHub Docs](https://docs.github.com/en/actions/tutorials/build-and-test-code/python)
