---
tags:
  - rsbuild
  - testing
  - rstest
  - playwright
  - unit-test
  - e2e-test
aliases:
  - Rsbuild 测试配置指南
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Rsbuild 不包含内置的测试框架，但与流行的测试工具无缝集成。本文档介绍如何为 Rsbuild 应用添加单元测试和端到端测试。

## 核心内容

### 测试概述

Rsbuild doesn't include built-in testing frameworks, but integrates seamlessly with popular testing tools.

This guide shows how to add unit testing and end-to-end testing to Rsbuild applications.

### 单元测试 (Unit Testing)

单元测试用于隔离验证单个组件和函数。Rsbuild 可以与以下测试框架配合使用：
- [Rstest](https://rstest.rs) - 基于 Rsbuild 构建的测试框架
- [Vitest](https://vitest.dev/) - Vite 原生测试框架
- [Jest](https://jestjs.io/) - Facebook 测试框架

#### Rstest 框架

[Rstest](https://rstest.rs/) 是基于 Rsbuild 构建的测试框架，为 Rsbuild 应用提供一流支持。它提供与 Jest 兼容的 API，同时原生支持现代特性如 TypeScript 和 ESM。

##### 安装

```bash
npm add @rstest/core -D
```

##### 配置脚本

在 `package.json` 中添加测试脚本：

```json
{
  "scripts": {
    "test": "rstest",
    "test:watch": "rstest -w"
  }
}
```

##### 编写测试

创建测试文件示例：

```ts
// src/utils.ts
export function add(a: number, b: number) {
  return a + b;
}
```

```ts
// src/utils.test.ts
import { expect, test } from '@rstest/core';
import { add } from './utils';

test('should add two numbers correctly', () => {
  expect(add(1, 2)).toBe(3);
  expect(add(-1, 1)).toBe(0);
});
```

##### 运行测试

```bash
# 运行测试
npm run test

# 运行并监听
npm run test:watch
```

##### 示例资源

[rstack-examples](https://github.com/rstackjs/rstack-examples/tree/main/rstest) 仓库包含一系列 Rstest 示例，展示常见使用模式和最佳实践。

### 端到端测试 (End-to-End Testing)

端到端测试验证完整的用户工作流，确保应用在真实浏览器环境中正确运行。

#### 推荐工具

对于 E2E 测试，推荐使用 [Playwright](https://playwright.dev/docs/intro)，这是一个现代端到端测试框架。

## 相关资源

- [[ref_002_rsbuild_llms_index_latest]] - Rsbuild 完整文档索引
- [[ref_004_ant-design-rsbuild-integration_latest]] - Ant Design Rsbuild 集成指南
- [Rstest 官方文档](https://rstest.rs/guide/start/) - Rstest 详细使用指南
- [Playwright 文档](https://playwright.dev/docs/intro) - Playwright 官方文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：技术指南
