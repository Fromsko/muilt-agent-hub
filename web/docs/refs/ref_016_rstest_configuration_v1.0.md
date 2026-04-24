---
tags:
  - rstest
  - configuration
  - setup
  - config
aliases:
  - Rstest 配置指南
created: 2026-04-19
updated: 2026-04-19
status: active
---

> [!abstract] 概述
> Rstest 配置文件用于自定义测试行为、环境和构建选项。支持多种配置文件格式，推荐使用 TypeScript 格式以获得类型提示和自动补全。

## 核心内容

### 配置文件格式

Rstest 按以下顺序自动读取项目根目录的配置文件：

- `rstest.config.mjs`
- `rstest.config.ts` （推荐）
- `rstest.config.js`
- `rstest.config.cjs`
- `rstest.config.mts`
- `rstest.config.cts`

### 基础配置

```typescript title="rstest.config.ts"
import { defineConfig } from '@rstest/core';

export default defineConfig({
  testEnvironment: 'node',
});
```

### 测试配置选项

#### 基础选项

- **root**: 项目根目录
- **name**: 项目名称
- **include**: 包含的测试文件模式
- **exclude**: 排除的文件模式
- **setupFiles**: 测试设置文件
- **globalSetup**: 全局设置文件
- **globals**: 启用全局 API
- **testEnvironment**: 测试环境（node/happy-dom/jsdom）
- **testTimeout**: 测试超时时间
- **hookTimeout**: Hook 超时时间

#### 构建配置

- **source**: 源码配置（decorators、assets、define 等）
- **output**: 输出配置（module、externals、distPath 等）
- **resolve**: 解析配置（alias、extensions、conditionNames 等）
- **tools**: 工具配置（rspack、swc、bundlerChain）

### React 项目配置

```typescript title="rstest.config.ts"
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  plugins: [pluginReact()],
  testEnvironment: 'happy-dom',
  setupFiles: ['./rstest.setup.ts'],
});
```

### Rsbuild 配置复用

```typescript title="rstest.config.ts"
import { withRsbuildConfig } from '@rstest/adapter-rsbuild';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRsbuildConfig(),
  testEnvironment: 'happy-dom',
});
```

### 环境配置

#### Node 环境

```typescript
export default defineConfig({
  testEnvironment: 'node',
});
```

#### DOM 环境（happy-dom）

```typescript
export default defineConfig({
  testEnvironment: 'happy-dom',
});
```

#### DOM 环境（jsdom）

```typescript
export default defineConfig({
  testEnvironment: 'jsdom',
});
```

## 相关资源

- [[ref_015_rstest_overview_v1.0]] - Rstest 概览
- [[ref_017_rstest_react_integration_v1.0]] - React 集成
- [Rstest 配置文档](https://rstest.rs/guide/basic/configure-rstest) - 官方配置指南

## 来源信息

- 搜索方式：llms-full.txt 文档读取
- 发现时间：2026-04-19
- 可信度评估：高（官方文档）
- 资源类型：配置指南
