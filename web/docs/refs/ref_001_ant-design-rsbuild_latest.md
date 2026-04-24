---
tags:
  - ant-design
  - rsbuild
  - react
  - build-tool
aliases:
  - Ant Design 与 Rsbuild 集成指南
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> 收集 Ant Design 和 Rsbuild 的官方文档资料，包括文档索引、集成指南、测试配置和 Tailwind CSS 集成方法。

## 操作流程

1. 读取 Ant Design 文档索引（llms.txt）
2. 查找 Rsbuild 集成指南（use-with-rsbuild.md）
3. 读取 Rsbuild 完整文档索引（llms-full.txt）
4. 查阅 Rsbuild 测试配置（testing.md）
5. 查阅 Rsbuild Tailwind CSS 集成（tailwindcss.md）

## 关键资料

- [Ant Design 文档索引](https://ant.design/llms.txt) - 包含所有文档和组件的完整索引
- [Rsbuild 与 Ant Design 集成](https://ant.design/docs/react/use-with-rsbuild.md) - 在 Rsbuild 中使用 Ant Design 的步骤
- [Rsbuild 完整文档](https://rsbuild.rs/llms-full.txt) - Rsbuild 的完整文档索引（717 个章节）
- [Rsbuild 测试指南](https://rsbuild.rs/guide/advanced/testing.md) - 单元测试和 E2E 测试配置
- [Rsbuild Tailwind CSS 集成](https://rsbuild.rs/guide/styling/tailwindcss.md) - Tailwind CSS v4 集成方法

## Ant Design 与 Rsbuild 集成

### 安装和初始化

```bash
# 创建 Rsbuild 项目
npm create rsbuild
# 选择 React 模板

# 安装 antd
npm install antd --save
```

### 修改 App.tsx

```tsx
import React from 'react';
import { Button } from 'antd';

const App: React.FC = () => (
  <div className="App">
    <Button type="primary">Button</Button>
  </div>
);

export default App;
```

### 自定义主题

```tsx
import React from 'react';
import { ConfigProvider } from 'antd';

const App: React.FC = () => (
  <ConfigProvider theme={{ token: { colorPrimary: '#00b96b' } }}>
    <MyApp />
  </ConfigProvider>
);

export default App;
```

## Rsbuild 测试配置

### 单元测试（Rstest）

```bash
# 安装
npm add @rstest/core -D

# 配置 package.json
{
  "scripts": {
    "test": "rstest",
    "test:watch": "rstest -w"
  }
}
```

### 编写测试

```ts
// src/utils.ts
export function add(a: number, b: number) {
  return a + b;
}

// src/utils.test.ts
import { expect, test } from '@rstest/core';
import { add } from './utils';

test('should add two numbers correctly', () => {
  expect(add(1, 2)).toBe(3);
  expect(add(-1, 1)).toBe(0);
});
```

### E2E 测试

推荐使用 Playwright 进行端到端测试。

## Rsbuild Tailwind CSS v4 集成

### 安装

```bash
npm add tailwindcss @tailwindcss/postcss -D
```

### 配置 PostCSS

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

### 导入 CSS

```css
/* src/index.css */
@import 'tailwindcss';
```

> [!warning] 注意事项
> Tailwind CSS v4 不能与 CSS 预处理器（Sass、Less、Stylus）一起使用。必须在 `.css` 文件开头放置 `@import 'tailwindcss';` 语句。

### 使用

```html
<h1 class="text-3xl font-bold underline">Hello world!</h1>
```

### VS Code 扩展

安装 Tailwind CSS IntelliSense 插件以获得自动完成功能。

## 相关笔记

无
