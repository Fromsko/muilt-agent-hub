---
tags:
  - ant-design
  - rsbuild
  - react
  - integration
  - ui-library
aliases:
  - Ant Design Rsbuild 集成指南
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> 本文档介绍如何使用 Rsbuild 创建项目并集成 Ant Design 组件库，包括安装、初始化、导入组件和自定义主题。

## 核心内容

### 简介

[Rsbuild](https://rsbuild.dev) 是由 Rspack 驱动的构建工具。本文档将使用 Rsbuild 创建项目并导入 antd。

### 安装和初始化

#### 前置要求

在开始之前，可能需要安装 [yarn](https://github.com/yarnpkg/yarn)、[pnpm](https://pnpm.io) 或 [bun](https://bun.sh)。

#### 创建 Rsbuild 项目

```bash
# 使用 npm
npm create rsbuild

# 使用 yarn
yarn create rsbuild

# 使用 pnpm
pnpm create rsbuild

# 使用 bun
bun create rsbuild
```

在初始化过程中，`create-rsbuild` 会提供一系列模板供选择。需要选择 `React` 模板。

工具会自动创建和初始化环境及依赖。如果在初始化过程中遇到网络错误，请尝试配置代理设置或使用其他 npm registry。

#### 启动项目

```bash
cd demo
npm run dev
```

在浏览器中打开 http://localhost:3000。如果页面上显示 "Rsbuild with React" 的标题，则表示成功。

### 导入 Ant Design

#### 安装 antd

```bash
# 使用 npm
npm install antd --save

# 使用 yarn
yarn add antd

# 使用 pnpm
pnpm install antd --save

# 使用 bun
bun add antd
```

#### 修改 App.tsx

修改 `src/App.tsx`，从 `antd` 导入 Button 组件：

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

现在应该能在页面上看到蓝色的主按钮显示。接下来可以选择 antd 的任何组件来开发应用。访问 Rsbuild 的[官方文档](https://rsbuild.dev)了解其他工作流。

### 自定义主题

参考[自定义主题文档](https://ant.design/docs/react/customize-theme)。使用 ConfigProvider 修改主题：

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

现在已成功使用 Rsbuild 运行 antd 组件，开始构建自己的应用吧！

## 相关资源

- [[ref_001_ant-design-rsbuild_latest]] - Ant Design 与 Rsbuild 综合指南
- [[ref_002_rsbuild_llms_index_latest]] - Rsbuild 完整文档索引
- [[ref_003_rsbuild_testing_latest]] - Rsbuild 测试配置指南
- [Ant Design 官方文档](https://ant.design) - Ant Design 官方网站
- [Rsbuild 官方文档](https://rsbuild.dev) - Rsbuild 官方文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：集成指南
