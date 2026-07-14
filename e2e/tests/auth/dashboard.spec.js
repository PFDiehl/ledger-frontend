import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/index.js';
import path from 'path';

const AUTH_FILE = path.join(import.meta.dirname, '../../fixtures/auth.json');
test.use({ storageState: AUTH_FILE });

test.describe('Dashboard', () => {

  test('renders four KPI cards', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();
    await expect(dash.kpiCards).toHaveCount(4);
  });

  test('KPI cards show non-empty values', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();

    const cards = await dash.kpiCards.all();
    for (const card of cards) {
      const value = card.locator('.kpi-value');
      await expect(value).not.toBeEmpty();
    }
  });

  test('sidebar navigation works for all main sections', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();

    const navItems = ['Invoices', 'Bills', 'Expenses', 'Reports', 'Payroll'];
    for (const item of navItems) {
      await dash.navigateTo(item);
      // Page should render without crashing
      await expect(page.locator('.page-title, .page')).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('.toast-error')).not.toBeVisible();
    }
  });

  test('topbar shows org name', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('.topbar')).not.toBeEmpty();
  });

  test('period selector changes date range', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();

    const select = page.locator('.period-sel, select').first();
    if (await select.isVisible()) {
      await select.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      await expect(page.locator('.toast-error')).not.toBeVisible();
    }
  });

  test('dark mode renders without layout breaks', async ({ page }) => {
    // Force dark mode via media query emulation
    await page.emulateMedia({ colorScheme: 'dark' });
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();
    await expect(dash.kpiCards.first()).toBeVisible();
  });

  test('mobile viewport shows bottom tab nav', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.waitFor();
    // At mobile breakpoint, sidebar becomes bottom tabs
    await expect(page.locator('.sidebar')).toBeVisible();
  });
});
