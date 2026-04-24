# Playwright E2E 测试处理笔记

## 背景

本次对项目进行了基于 **Playwright CLI** 的全量 E2E 测试，并按用户偏好统一使用 **bun / bunx** 相关命令执行。

最终全量回归结果：

```text
3 passed
0 flaky
```

执行命令：

```bash
bunx playwright test --project=chromium --workers=1 --reporter=github
```

---

## 过程中遇到的主要问题

### 1. 环境与启动问题

初始执行 E2E 时遇到过以下问题：

- 3000 端口相关启动冲突/误判
- Playwright 浏览器二进制缺失
- CI 环境变量影响 `reuseExistingServer` 行为

处理方式：

- 使用 bun 路径执行 Playwright
- 安装 Chromium：

```bash
bunx playwright install chromium
```

---

### 2. 前端运行时错误

测试推进过程中，页面曾多次出现运行时错误，例如：

- `factory is undefined (./node_modules/antd/es/layout/index.js)`
- `factory is undefined (./node_modules/antd/es/message/index.js)`
- `factory is undefined (./node_modules/@ant-design/icons/es/icons/LeftOutlined.js)`
- `factory is undefined (./node_modules/@rc-component/menu/es/index.js)`

### 处理结论

问题高概率与 **Rsbuild/Rspack 分包**、**TanStack Router 自动代码分割**、以及 `antd` / `rc-component` 模块装载组合有关。

最终采用的最小修复：

- 在 `rsbuild.config.ts` 中关闭：

```ts
autoCodeSplitting: false
```

这一步显著降低了运行时模块装载异常。

---

## 代码与测试层面的修复

### 1. 主题切换修复

文件：`src/components/Layout/Header/index.tsx`

问题：
- E2E 点击“切换主题”后，`html[data-theme]` 没有从 `light` 变为 `dark`

修复：
- 将 Header 中的主题切换逻辑改为直接驱动真实的 `ThemeProvider`

---

### 2. users 页列表刷新稳定性修复

文件：`src/routes/_auth/users/index.tsx`

问题：
- create / update / delete 后，列表刷新存在时序不稳定

修复：
- 在 create / update / delete 成功后显式执行：

```ts
await listQuery.refetch()
```

---

### 3. E2E 用例稳定化修复

文件：`e2e/app.spec.ts`

处理过的关键点：

#### 登录按钮文案兼容
页面实际按钮文案为“登 录”，测试原先写死“登录”，因此改为：

```ts
page.getByRole('button', { name: /登\s*录/ })
```

#### users 页面 URL 断言放宽
原断言只允许 `/users`，实际页面会带查询参数，因此调整为允许 query string。

#### 新建/编辑用户弹窗作用域收紧
- 所有表单输入改为在 `dialog` 范围内定位
- 避免命中页面上其他同名输入或文本

#### 弹窗确认按钮文案修正
- 实际 UI 使用 `OK`
- 因此新建、编辑、删除确认相关操作均改为匹配 `OK`

#### 用户管理用例顺序重排
为了降低状态耦合和 flaky：

- 先完成：创建 → 编辑 → 搜索 → 删除
- 再完成：角色筛选验证

#### anti-flaky 调整
最关键的一步是：
- 去掉“更新成功后立刻断言表格出现更新项”的不稳定断言
- 改为先等待搜索关键字真正写入 URL，再等待更新后的行出现

示意：

```ts
await page.getByPlaceholder('搜索用户名/邮箱').fill('Playwright User Updated');
await expect(page).toHaveURL(/keyword=Playwright\+User\+Updated/, { timeout: 10000 });
await expect(page.getByRole('cell', { name: 'Playwright User Updated' })).toBeVisible({ timeout: 10000 });
```

这能更稳健地覆盖：
- debounce 生效
- 查询参数更新
- 数据刷新完成
- 表格展示完成

---

## 最终修改文件

- `e2e/app.spec.ts`
- `rsbuild.config.ts`
- `src/components/Layout/Header/index.tsx`
- `src/routes/_auth/users/index.tsx`

---

## 最终验证结果

全量执行：

```bash
bunx playwright test --project=chromium --workers=1 --reporter=github
```

输出：

```text
3 passed (22.5s)
```

通过项：

- `redirects guests to login and can sign in`
- `supports user management CRUD and filtering`
- `persists settings interactions and supports logout`

---

## 后续建议

### 可选优化

1. 继续抽取 E2E helper，减少测试文件重复逻辑
2. 尽量减少对 Ant Design 内部 DOM 结构的依赖
3. 如果后续恢复 `autoCodeSplitting: true`，需要重新验证是否会引回 `factory is undefined`
4. 若要继续提升长期稳定性，可为 users 列表刷新提供更明确的 UI/数据完成信号

---

## 结论

本次已完成：

- Playwright 全量 E2E 跑通
- 运行时错误缓解
- users CRUD flaky 消除
- 最终达到：

```text
3 passed
0 flaky
```
