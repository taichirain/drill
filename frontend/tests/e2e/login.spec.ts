import { test, expect } from '@playwright/test';

/**
 * E2E 测试骨架 - 登录流程
 *
 * 运行: npx playwright test
 */

test.describe('Login Flow', () => {
  test('should login with username and password', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.fill('input[placeholder="请输入用户名"]', 'student1');
    await page.fill('input[type="password"]', 'student123');
    await page.click('button:has-text("登录")');
    await expect(page).toHaveURL(/.*exam/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.fill('input[placeholder="请输入用户名"]', 'wrong');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button:has-text("登录")');
    await expect(page.locator('.error')).toContainText('用户名或密码错误');
  });
});
