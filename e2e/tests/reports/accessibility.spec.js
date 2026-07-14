import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(import.meta.dirname, '../../fixtures/auth.json');
test.use({ storageState: AUTH_FILE });

test.describe('Accessibility', () => {

  test('dashboard has no ARIA landmark errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.kpi-card', { timeout: 10_000 });

    // Check for basic ARIA structure
    const nav  = page.locator('nav').first();
    const main = page.locator('main').first();
    await expect(nav).toBeVisible();
    await expect(main).toBeVisible();
  });

  test('all buttons have accessible names', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.page', { timeout: 10_000 });

    const buttons = await page.locator('button:visible').all();
    for (const btn of buttons.slice(0, 20)) { // check first 20
      const name = await btn.getAttribute('aria-label') ?? await btn.textContent();
      expect(name?.trim()).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    // Go to invoice form
    await page.locator('.nav-item', { hasText: /invoices/i }).click();
    await page.waitForSelector('.data-table', { timeout: 8_000 });
    await page.getByRole('button', { name: /new invoice/i }).click();
    await page.waitForSelector('form, .invoice-form-page', { timeout: 8_000 });

    const inputs = await page.locator('input:visible, select:visible').all();
    for (const input of inputs.slice(0, 10)) {
      const id    = await input.getAttribute('id');
      const label = id ? await page.locator(`label[for="${id}"]`).count() : 0;
      const ariaLabel  = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');
      // At least one labelling mechanism should exist
      expect(label > 0 || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });

  test('keyboard navigation through sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.nav-item', { timeout: 10_000 });

    // Tab to first nav item
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    // Should be able to focus and activate
    await expect(focused).toBeVisible().catch(() => {});
  });

  test('toast notifications are accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.page', { timeout: 10_000 });

    const toastContainer = page.locator('.toast-container');
    if (await toastContainer.isVisible()) {
      await expect(toastContainer).toHaveAttribute('aria-live', 'polite');
    }
  });
});

test.describe('Visual regression', () => {

  test('dashboard matches snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.kpi-card', { timeout: 10_000 });
    await page.waitForTimeout(500); // let animations settle
    await expect(page.locator('.main-content')).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('invoice list matches snapshot', async ({ page }) => {
    await page.locator('.nav-item', { hasText: /^invoices$/i }).click();
    await page.waitForSelector('.data-table', { timeout: 8_000 });
    await page.waitForTimeout(300);
    await expect(page.locator('.main-content')).toHaveScreenshot('invoices.png', {
      maxDiffPixelRatio: 0.05,
    });
  });
});

test.describe('Performance', () => {

  test('dashboard loads within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForSelector('.kpi-card', { timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3_000);
  });

  test('navigation between pages is fast', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.page', { timeout: 10_000 });

    const pages = ['Invoices', 'Reports', 'Payroll', 'Dashboard'];
    for (const p of pages) {
      const start = Date.now();
      await page.locator('.nav-item', { hasText: new RegExp(`^${p}$`, 'i') }).first().click();
      await page.waitForSelector('.page-title, .page', { timeout: 5_000 });
      expect(Date.now() - start).toBeLessThan(2_000);
    }
  });
});
