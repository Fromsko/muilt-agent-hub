---
tags:
  - rstest
  - react
  - testing
  - integration
aliases:
  - Rstest React 集成指南
created: 2026-04-19
updated: 2026-04-19
status: active
---

> [!abstract] 概述
> Rstest 提供完整的 React 测试支持，包括 Node 环境测试（使用 happy-dom/jsdom）和浏览器模式测试。支持组件测试、Hook 测试和 Rsbuild 配置复用。

## 核心内容

### Node 环境测试

#### 安装依赖

```bash
bun add @rstest/core @rsbuild/plugin-react @testing-library/react @testing-library/jest-dom happy-dom -D
```

#### 配置 rstest

```typescript title="rstest.config.ts"
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  plugins: [pluginReact()],
  testEnvironment: 'happy-dom',
});
```

#### 设置测试匹配器（可选）

```typescript title="rstest.setup.ts"
import { afterEach, expect } from '@rstest/core';
import { cleanup } from '@testing-library/react';
import * as jestDomMatchers from '@testing-library/jest-dom/matchers';

expect.extend(jestDomMatchers);

afterEach(() => {
  cleanup();
});
```

#### 组件测试

```typescript title="src/App.test.tsx"
import { expect, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders greeting', () => {
  render(<App />);
  expect(screen.getByText('Hello World')).toBeInTheDocument();
});
```

### Rsbuild 配置复用

#### 安装适配器

```bash
bun add @rstest/adapter-rsbuild -D
```

#### 配置复用

```typescript title="rstest.config.ts"
import { withRsbuildConfig } from '@rstest/adapter-rsbuild';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRsbuildConfig(),
  testEnvironment: 'happy-dom',
  setupFiles: ['./rstest.setup.ts'],
});
```

### 浏览器模式测试

#### 安装依赖

```bash
bun add @rstest/browser-react -D
```

#### 组件测试

```typescript title="src/Counter.test.tsx"
import { render } from '@rstest/browser-react';
import { expect, test } from '@rstest/core';
import { Counter } from './Counter';

test('renders and increments', async () => {
  const { container } = await render(<Counter />);

  expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('0');

  container.querySelector('button')!.click();
  expect(container.querySelector('[data-testid="count"]')?.textContent).toBe('1');
});
```

#### Hook 测试

```typescript title="src/useCounter.test.tsx"
import { renderHook } from '@rstest/browser-react';
import { expect, test } from '@rstest/core';
import { useCounter } from './useCounter';

test('useCounter increments', async () => {
  const { result, act } = await renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  await act(() => result.current.increment());
  expect(result.current.count).toBe(1);
});
```

### Mock 模块

```typescript
import { expect, rs, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

rs.mock('./api', () => ({
  fetchUser: () => Promise.resolve({ name: 'John Doe' }),
}));

test('renders user name', async () => {
  render(<UserProfile userId="1" />);
  expect(await screen.findByText('John Doe')).toBeInTheDocument();
});
```

## 相关资源

- [[ref_015_rstest_overview_v1.0]] - Rstest 概览
- [[ref_016_rstest_configuration_v1.0]] - 配置指南
- [[ref_018_rstest_api_reference_v1.0]] - API 参考
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - 官方文档

## 来源信息

- 搜索方式：llms-full.txt 文档读取
- 发现时间：2026-04-19
- 可信度评估：高（官方文档）
- 资源类型：集成指南
