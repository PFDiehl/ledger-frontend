import { test, expect } from '@playwright/test';
import { InvoicesPage, today } from '../pages/index.js';
import path from 'path';

const AUTH_FILE = path.join(import.meta.dirname, '../../fixtures/auth.json');

test.use({ storageState: AUTH_FILE });

test.describe('Invoice management', () => {

  test('invoices page loads with table', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();
    await expect(page.locator('.data-table, .invoices-page')).toBeVisible();
  });

  test('filter tabs change visible invoices', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();

    // Click each filter tab, should not error
    for (const tab of ['Draft', 'Sent', 'Paid', 'Overdue']) {
      await page.locator('.filter-tab', { hasText: new RegExp(tab, 'i') }).first().click();
      await page.waitForTimeout(300);
      // No error toast should appear
      await expect(page.locator('.toast-error')).not.toBeVisible();
    }
  });

  test('search filters invoice list', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();

    await inv.searchInput.fill('globex');
    await page.waitForTimeout(500);

    const rows = await inv.tableRows.all();
    for (const row of rows) {
      const text = await row.textContent();
      expect(text?.toLowerCase()).toContain('globex');
    }
  });

  test('new invoice button opens form', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();
    await inv.newButton.click();
    await expect(page.locator('.invoice-form-page, form')).toBeVisible({ timeout: 8_000 });
  });

  test('invoice form validates required fields', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();
    await inv.newButton.click();
    await page.waitForSelector('.invoice-form-page, form', { timeout: 8_000 });

    // Submit empty form
    await page.getByRole('button', { name: /save|create/i }).first().click();

    // Should show validation errors or stay on form
    await expect(page.locator('.invoice-form-page, form')).toBeVisible();
    await expect(page).not.toHaveURL(/invoices\/[a-f0-9-]{36}$/);
  });

  test('invoice row click opens detail view', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();

    const rows = await inv.tableRows.all();
    if (rows.length > 0) {
      await rows[0].click();
      await expect(page.locator('.invoice-detail-page, .invoice-doc')).toBeVisible({ timeout: 8_000 });
      await expect(page.locator('.back-btn')).toBeVisible();
    }
  });

  test('back button returns to invoice list', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();

    const rows = await inv.tableRows.all();
    if (rows.length > 0) {
      await rows[0].click();
      await page.locator('.back-btn').first().click();
      await expect(page.locator('.data-table')).toBeVisible({ timeout: 8_000 });
    }
  });

  test('invoice summary strip shows numeric values', async ({ page }) => {
    const inv = new InvoicesPage(page);
    await inv.goto();
    await inv.waitFor();

    const summaryValues = page.locator('.inv-summary-value');
    const count = await summaryValues.count();
    expect(count).toBeGreaterThan(0);

    // Each value should be non-empty
    for (let i = 0; i < Math.min(count, 4); i++) {
      const text = await summaryValues.nth(i).textContent();
      expect(text?.trim()).toBeTruthy();
    }
  });
});
