---
tags:
  - ant-design
  - tailwindcss
  - compatibility
  - css-layer
  - 中文
aliases:
  - Ant Design Tailwind CSS v4 兼容性
created: 2026-04-18
updated: 2026-04-18
status: active
---

> [!abstract] 概述
> Ant Design 样式兼容性文档，重点介绍如何与 Tailwind CSS v4 进行样式层级（@layer）配置，确保样式优先级正确。

## 核心内容

### 样式兼容性说明

Ant Design v6 使用了现代 CSS 特性来提升样式兼容性：
- **:where 选择器** - 降低选择器优先级
- **CSS 逻辑属性** - 支持逻辑方向
- **autoPrefixer** - 自动添加浏览器前缀
- **@layer 样式优先级降权** - 使用 CSS Cascade Layers
- **rem 适配** - 响应式字体大小

### 兼容三方样式库

#### antd 配置 @layer

使用 StyleProvider 时必须包裹 ConfigProvider 以更新图标相关样式：

```tsx
import { StyleProvider } from '@ant-design/cssinjs';

export default () => (
  <StyleProvider layer>
    <ConfigProvider>
      <MyApp />
    </ConfigProvider>
  </StyleProvider>
);
```

#### TailwindCSS 排布 @layer

在开始配置前，需要先启用 @layer 功能。

##### TailwindCSS v3

在 global.css 中，调整 @layer 来控制样式的覆盖顺序，让 tailwind-base 置于 antd 之前：

```css
@layer tailwind-base, antd;

@layer tailwind-base {
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
}
```

##### TailwindCSS v4

在 global.css 中，调整 @layer 来控制样式的覆盖顺序，让 antd 置于恰当位置：

```css
@layer theme, base, antd, components, utilities;

@import 'tailwindcss';
```

#### reset.css 和 antd.css

如果使用了 antd 的 reset.css 样式，需要为其指定 @layer 以防止将 antd 降权的样式覆盖。在 zeroRuntime 场景下如果单独引入 antd.css，也必须为其添加 layer(antd)：

```css
/* reset.css 和 antd.css 都需要指定 layer */
@layer reset, antd;

/* reset 样式 */
@import url(reset.css) layer(reset);

/* antd 样式 */
@import url(antd.css) layer(antd);
```

这样可以确保：
- reset.css 不会覆盖被降权的 antd 样式
- antd.css（zeroRuntime 场景）与 StyleProvider layer 的注入层保持一致
- 三方样式库 / Tailwind / Emotion 等的层级策略依旧生效

#### 其他 CSS-in-JS 库

为 antd 配置完 @layer 后，不需要为其他的 CSS-in-JS 库做任何额外的配置。CSS-in-JS 已经可以完全覆盖 antd 的样式。

#### SSR 场景

在 SSR 场景下，样式往往通过 `<style />` 内联渲染到 HTML 中。此时请务必确保样式顺序中指定 @layer 优先级顺序的样式在 @layer 被使用之前被加载。

❌ **错误的写法**

```html
<head>
  <!-- SSR 注入样式 -->
  <style>
    @layer antd {
      /** ... */
    }
  </style>
  <!-- css 文件中包含 @layer xxx, antd; -->
  <link rel="stylesheet" href="/b9a0m0b9o0o3.css" />
  <!-- or 直接书写 @layer xxx, antd; 在 html 中 -->
  <style>
    @layer xxx, antd;
  </style>
</head>
```

✅ **正确的写法**

```html
<head>
  <!-- css 文件中包含 @layer xxx, antd; -->
  <link rel="stylesheet" href="/b9a0m0b9o0o3.css" />
  <!-- or 直接书写 @layer xxx, antd; 在 html 中 -->
  <style>
    @layer xxx, antd;
  </style>
  <!-- SSR 注入样式 -->
  <style>
    @layer antd {
      /** ... */
    }
  </style>
</head>
```

## 相关资源

- [[ref_005_ant-design_llms-full_latest]] - Ant Design 完整组件文档
- [[ref_003_rsbuild_testing_latest]] - Rsbuild 测试配置
- [Ant Design 官方文档](https://ant.design/docs/react/compatible-style-cn) - 样式兼容文档
- [Tailwind CSS 官方文档](https://tailwindcss.com) - Tailwind CSS 文档

## 来源信息

- 搜索方式：网络资源读取
- 发现时间：2026-04-18
- 可信度评估：高（官方文档）
- 资源类型：兼容性指南（中文）
