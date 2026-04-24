import { expect, test, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'AI Agent Platform' })).toBeVisible();
  await page.getByRole('textbox', { name: '用户名' }).fill('admin');
  await page.locator('input[placeholder="密码"]').fill('admin');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function loginAsNonAdmin(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'AI Agent Platform' })).toBeVisible();
  await page.getByRole('textbox', { name: '用户名' }).fill('viewer');
  await page.locator('input[placeholder="密码"]').fill('viewer');
  await page.getByRole('button', { name: /登\s*录/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe('ai agent platform e2e', () => {
  test('redirects guests to login and can sign in', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    await login(page);
    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible();
    await expect(page.getByText('活跃用户')).toBeVisible();
  });

  test('supports user management CRUD and filtering', async ({ page }) => {
    await login(page);

    await page.getByRole('menuitem', { name: /用户管理/ }).click();
    await expect(page).toHaveURL(/\/users(\?|$)/);
    await expect(page.getByRole('heading', { name: '用户管理' })).toBeVisible();

    await page.getByRole('button', { name: '新建用户' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '名称' }).fill('Playwright User');
    await dialog.getByRole('textbox', { name: /邮箱/ }).fill('playwright@aap.dev');
    const roleCombobox = dialog.getByRole('combobox');
    await roleCombobox.click();
    await roleCombobox.press('ArrowDown');
    await roleCombobox.press('Enter');
    await dialog.getByRole('textbox', { name: /密码/ }).fill('secret123');
    await dialog.getByRole('button', { name: 'OK' }).click();

    await expect(page.getByText('创建成功')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Playwright User' })).toBeVisible();

    await page.getByPlaceholder('搜索用户名/邮箱').fill('Playwright User');
    await expect(page).toHaveURL(/keyword=Playwright\+User/);
    await expect(page.getByRole('cell', { name: 'Playwright User' })).toBeVisible();

    const userRow = page.locator('tr', { hasText: 'Playwright User' });
    await userRow.getByRole('button', { name: '编辑' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByRole('textbox', { name: '名称' }).fill('Playwright User Updated');
    await editDialog.getByRole('button', { name: 'OK' }).click();

    await expect(page.getByText('更新成功')).toBeVisible();

    await page.getByPlaceholder('搜索用户名/邮箱').fill('Playwright User Updated');
    await expect(page).toHaveURL(/keyword=Playwright\+User\+Updated/, { timeout: 10000 });
    await expect(page.getByRole('cell', { name: 'Playwright User Updated' })).toBeVisible({ timeout: 10000 });

    const updatedRow = page.locator('tr', { hasText: 'Playwright User Updated' });
    await updatedRow.getByRole('button', { name: '删除' }).click();
    await page.getByRole('button', { name: 'OK' }).click();

    await expect(page.getByText('删除成功')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Playwright User Updated' })).toHaveCount(0);

    await page.getByPlaceholder('搜索用户名/邮箱').fill('');
    const roleFilter = page.locator('.ant-select').filter({ has: page.getByText('角色筛选') }).first();
    await roleFilter.click();
    await page.getByText('观察者', { exact: true }).click();
    await expect(page).toHaveURL(/role=viewer/);

    const filteredRows = page.locator('.ant-table-tbody tr');
    await expect(filteredRows.first()).toContainText('viewer');
  });

  test('non-admin user cannot access user management menu', async ({ page }) => {
    await loginAsNonAdmin(page);

    await expect(page.getByRole('heading', { name: '仪表盘' })).toBeVisible();
    await expect(page.getByText('活跃用户')).toBeVisible();

    await expect(page.getByRole('menuitem', { name: /用户管理/ })).not.toBeVisible();

    await page.goto('/users');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('persists settings interactions and supports logout', async ({ page }) => {
    await login(page);

    await page.getByRole('button', { name: '切换主题' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('menuitem', { name: /系统管理/ }).click();
    await page.getByRole('menuitem', { name: /系统设置/ }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: '系统设置' })).toBeVisible();

    await page.locator('.ant-select').filter({ has: page.getByText('Light') }).first().click();
    await page.getByText('Dark', { exact: true }).click();
    await page.locator('.ant-select').filter({ has: page.getByText('简体中文') }).first().click();
    await page.getByText('English', { exact: true }).click();

    await page.reload();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.locator('.ant-select').filter({ has: page.getByText('Dark') }).first()).toBeVisible();
    await expect(page.locator('.ant-select').filter({ has: page.getByText('English') }).first()).toBeVisible();

    await page.locator('aside').getByText('Admin', { exact: true }).click();
    await page.getByRole('menuitem', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
