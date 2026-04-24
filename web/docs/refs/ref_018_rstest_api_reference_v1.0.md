---
tags:
  - rstest
  - api
  - reference
  - testing
aliases:
  - Rstest API 参考
created: 2026-04-19
updated: 2026-04-19
status: active
---

> [!abstract] 概述
> Rstest 提供完整的测试 API，包括断言库、测试函数、Hook、Mock 功能和浏览器模式 API。API 设计兼容 Jest，同时提供现代特性支持。

## 核心内容

### 测试 API

#### test

```typescript
test('description', () => {
  // test code
});
```

修饰符：
- `test.only` - 只运行此测试
- `test.skip` - 跳过此测试
- `test.todo` - 标记为待办
- `test.concurrent` - 并行执行
- `test.each` - 参数化测试

#### describe

```typescript
describe('feature', () => {
  test('case', () => {
    // test code
  });
});
```

修饰符：
- `describe.only` - 只运行此组
- `describe.skip` - 跳过此组
- `describe.concurrent` - 并行执行

### Hooks

```typescript
beforeAll(() => {
  // 所有测试前执行一次
});

afterAll(() => {
  // 所有测试后执行一次
});

beforeEach(() => {
  // 每个测试前执行
});

afterEach(() => {
  // 每个测试后执行
});
```

### 断言 API

#### expect

```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeTruthy();
expect(value).toContain(item);
```

#### 匹配器

- 通用匹配器：`toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`
- 数字匹配器：`toBeGreaterThan`, `toBeLessThan`, `toBeCloseTo`
- 字符串匹配器：`toMatch`, `toContain`
- 数组匹配器：`toContain`, `toHaveLength`
- 对象匹配器：`toHaveProperty`, `toMatchObject`
- Promise 匹配器：`resolves`, `rejects`

### Mock API

#### rs.mock

```typescript
rs.mock('./module', () => ({
  default: 'mocked value',
}));
```

#### rstest.fn

```typescript
const mockFn = rstest.fn();
mockFn('arg1', 'arg2');
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

#### rstest.spyOn

```typescript
const spy = rstest.spyOn(obj, 'method');
spy.mockReturnValue('value');
expect(spy).toHaveBeenCalled();
spy.mockRestore();
```

### 浏览器模式 API

#### Locator

```typescript
import { page } from '@rstest/core';

const button = page.getByRole('button');
await button.click();
```

查询方法：
- `getByRole`, `getByText`, `getByLabel`
- `getByPlaceholder`, `getByAltText`, `getByTestId`

#### 断言

```typescript
await expect(button).toBeVisible();
await expect(text).toHaveText('content');
```

### 工具函数

#### rstest.useFakeTimers

```typescript
rstest.useFakeTimers();
// run timer tests
rstest.useRealTimers();
```

#### rstest.advanceTimersByTime

```typescript
rstest.advanceTimersByTime(1000);
```

## 相关资源

- [[ref_015_rstest_overview_v1.0]] - Rstest 概览
- [[ref_016_rstest_configuration_v1.0]] - 配置指南
- [[ref_017_rstest_react_integration_v1.0]] - React 集成
- [Rstest API 文档](https://rstest.rs/guide/api) - 官方 API 文档

## 来源信息

- 搜索方式：llms-full.txt 文档读取
- 发现时间：2026-04-19
- 可信度评估：高（官方文档）
- 资源类型：API 参考
