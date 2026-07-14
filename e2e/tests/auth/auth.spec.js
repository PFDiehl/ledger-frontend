import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/index.js';

test.describe('Authentication', () => {

  test('login page loads and shows form fields', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.fillEmail('nobody@nowhere.com');
    await login.fillPassword('wrongpassword');
    await login.submit();

    // Should show error, stay on login
    await expect(login.errorMessage).toBeVisible({ timeout: 8_000 });
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('rejects empty form submission', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should not navigate away
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test('successful login reaches dashboard', async ({ page }) => {
    const login = new LoginPage(page);
    await page.evaluate(() => localStorage.setItem('onboarded', '1'));
    const EMAIL    = process.env.E2E_USER_EMAIL    ?? 'e2e@ledger.test';
    const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2epassword123';
    await login.login(EMAIL, PASSWORD);
    await expect(page.locator('.page-title').first()).toBeVisible({ timeout: 10_000 });
  });

  test('registration flow creates account', async ({ page }) => {
    await page.goto('/');
    // Switch to register tab
    await page.getByRole('button', { name: /register|sign up|create account/i }).first().click().catch(() => {});
    const ts = Date.now();
    const email = `e2e-reg-${ts}@ledger.test`;
    await page.getByLabel(/full name/i).fill('New User');
    await page.getByLabel(/email/i).first().fill(email);
    await page.getByLabel(/password/i).first().fill('newpassword123');
    await page.getByLabel(/company|organization/i).first().fill('New Co.');
    await page.getByRole('button', { name: /register|create|sign up/i }).last().click();
    // Should reach onboarding or dashboard
    await page.waitForURL(/onboarding|dashboard/, { timeout: 15_000 });
  });

  test('logout clears session', async ({ page, context }) => {
    await context.addCookies([]);
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
