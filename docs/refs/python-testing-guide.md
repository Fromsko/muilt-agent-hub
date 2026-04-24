# Python 测试框架指南

## 概述

本文档整理了 Python 测试框架的核心知识，包括 unittest、pytest 的使用方法和最佳实践。

## 为什么测试很重要

- **早期发现 bug**：在部署前捕获错误
- **确保代码可靠性**：防止回归问题
- **节省调试时间**：使重构更安全
- **鼓励更好的代码设计**

## 1. unittest（内置框架）

Python 自带的测试框架，适合初学者和简单项目。

### 基础示例

```python
import unittest

def add(a, b):
    return a + b

class TestMathOperations(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)  # 通过
        self.assertEqual(add(-1, 1), 0)  # 通过

if __name__ == "__main__":
    unittest.main()
```

### 特点

- 内置无需安装
- 基于 xUnit 框架
- 提供丰富的断言方法
- 支持测试套件和测试运行器

## 2. pytest（推荐框架）

更简单、更强大的测试框架，适合现代 Python 项目。

### 安装

```bash
pip install pytest
```

### 基础示例

```python
import pytest

def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5  # 测试通过
    assert add(-1, 1) == 0  # 测试通过
```

### 运行测试

```bash
# 运行单个文件
pytest test_math.py

# 运行所有测试
pytest

# 显示详细输出
pytest -v

# 首次失败时停止
pytest -x
```

## 3. pytest 高级特性

### 3.1 Fixtures（测试夹具）

用于准备测试数据，在测试前自动运行。

```python
import pytest

@pytest.fixture
def sample_data():
    return {"name": "Alice", "age": 30}

def test_person_data(sample_data):
    assert sample_data["name"] == "Alice"
    assert sample_data["age"] == 30
```

### 3.2 参数化测试

用多组数据运行同一个测试，避免重复代码。

```python
import pytest

@pytest.mark.parametrize("a, b, expected", [
    (2, 3, 5),
    (-1, 1, 0),
    (0, 0, 0)
])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

**优点**：
- 避免重复相似的测试用例
- 高效地用不同输入值运行测试

## 4. Mocking（模拟外部依赖）

测试依赖外部服务的代码时，使用 mock 避免真实调用。

```python
from unittest.mock import patch
import requests

def fetch_data(url):
    response = requests.get(url)
    return response.json()

@patch("requests.get")
def test_fetch_data(mock_get):
    mock_get.return_value.json.return_value = {"status": "success"}
    assert fetch_data("https://api.example.com") == {"status": "success"}
```

**为什么使用 Mock**：
- 防止测试中缓慢的 API 调用
- 确保测试不依赖外部系统
- 帮助模拟不同的响应

## 5. 测试最佳实践

### AAA 模式

遵循 **Arrange（准备）、Act（执行）、Assert（断言）** 模式

### 其他建议

- **独立的测试函数**：不要在一个函数中测试所有内容
- **有意义的测试名称**：如 `test_addition_returns_correct_value`
- **测试独立性**：一个测试不应依赖另一个测试
- **频繁运行测试**：早期发现 bug
- **使用 pytest**：简单而强大的测试管理

## 6. 框架对比

| 特性 | unittest | pytest |
|------|----------|--------|
| 安装 | 内置 | 需要安装 |
| 语法 | 冗长 | 简洁 |
| Fixtures | setUp/tearDown | @pytest.fixture |
| 参数化测试 | 复杂 | 简单 |
| 插件生态 | 有限 | 丰富 |
| 学习曲线 | 较陡 | 平缓 |

## 推荐方案

- **新项目**：使用 pytest
- **简单脚本**：可以使用 unittest
- **大型项目**：pytest + fixtures + 参数化测试

## 参考资料

- [Python Testing – Unit Tests, Pytest, and Best Practices](https://dev.to/nkpydev/python-testing-unit-tests-pytest-and-best-practices-45gl)
- [3 Python Unit Testing Frameworks to Know About in 2025](https://zencoder.ai/blog/python-unit-testing-frameworks)
- [Unit Testing in Python: Complete Guide with Examples](https://www.glukhov.org/post/2025/10/unit-testing-in-python/)
