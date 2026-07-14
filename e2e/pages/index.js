// Page Object Models for Ledger E2E tests
// Each class wraps a page with typed, named actions

export class LoginPage {
  constructor(page) { this.page = page; }

  async goto()                { await this.page.goto('/'); }
  async fillEmail(email)      { await this.page.getByLabel(/email/i).fill(email); }
  async fillPassword(pw)      { await this.page.getByLabel(/password/i).fill(pw); }
  async submit()              { await this.page.getByRole('button', { name: /sign in/i }).click(); }

  async login(email, password) {
    await this.goto();
    // Skip onboarding if needed
    await this.page.evaluate(() => localStorage.setItem('onboarded', '1'));
    await this.goto();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
    await this.page.waitForURL(/dashboard|onboarding/, { timeout: 10_000 });
  }

  get errorMessage() { return this.page.getByRole('alert').or(this.page.locator('.auth-error')); }
}

export class DashboardPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.goto('/'); }
  async waitFor() { await this.page.waitForSelector('.kpi-card', { timeout: 10_000 }); }

  get pageTitle()       { return this.page.locator('.page-title').first(); }
  get kpiCards()        { return this.page.locator('.kpi-card'); }
  get revenueCard()     { return this.page.locator('.kpi-card').filter({ hasText: /revenue/i }).first(); }
  get overdueWidget()   { return this.page.locator('.overdue-widget, [data-testid="overdue"]').first(); }
  get activityFeed()    { return this.page.locator('.activity-feed, [data-testid="activity"]').first(); }

  async navigateTo(item) {
    await this.page.locator('.nav-item').filter({ hasText: new RegExp(item, 'i') }).first().click();
  }
}

export class InvoicesPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.goto('/'); await this.page.locator('.nav-item', { hasText: /^invoices$/i }).click(); }
  async waitFor() { await this.page.waitForSelector('.data-table, .invoices-page', { timeout: 10_000 }); }

  get newButton()       { return this.page.getByRole('button', { name: /new invoice/i }); }
  get searchInput()     { return this.page.getByPlaceholder(/search/i); }
  get tableRows()       { return this.page.locator('.data-table tbody tr.table-row'); }
  get firstRow()        { return this.tableRows.first(); }
  filterByStatus(s)     { return this.page.locator('.filter-tab', { hasText: new RegExp(s,'i') }).click(); }

  async createInvoice({ client, description, qty, price, dueDate }) {
    await this.newButton.click();
    await this.page.waitForSelector('.invoice-form-page, form', { timeout: 8_000 });

    // Select or type client
    const clientInput = this.page.getByLabel(/client|bill to/i).first();
    await clientInput.click();
    await clientInput.fill(client);
    await this.page.getByRole('option', { name: new RegExp(client, 'i') }).first().click().catch(() => {});

    // Line item
    await this.page.getByPlaceholder(/description/i).first().fill(description);
    const qtyInput   = this.page.getByLabel(/quantity|qty/i).first();
    const priceInput = this.page.getByLabel(/price|rate/i).first();
    await qtyInput.fill(String(qty));
    await priceInput.fill(String(price));

    if (dueDate) {
      await this.page.getByLabel(/due date/i).first().fill(dueDate);
    }

    await this.page.getByRole('button', { name: /save|create/i }).click();
    await this.page.waitForURL(/invoices/, { timeout: 10_000 }).catch(() => {});
  }
}

export class ExpensesPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.locator('.nav-item', { hasText: /expenses/i }).click(); }
  async waitFor() { await this.page.waitForSelector('.expenses-page, .data-table', { timeout: 8_000 }); }

  get newButton()   { return this.page.getByRole('button', { name: /new expense/i }); }
  get tableRows()   { return this.page.locator('.data-table tbody tr.table-row'); }
  get pendingCount(){ return this.page.locator('.inv-summary-card').filter({ hasText:/pending/i }).locator('.inv-summary-value'); }

  async createExpense({ vendor, category, amount }) {
    await this.newButton.click();
    await this.page.waitForSelector('[role="dialog"], .modal, form', { timeout: 6_000 });
    await this.page.getByLabel(/vendor/i).fill(vendor);
    await this.page.getByLabel(/category/i).selectOption(category);
    await this.page.getByLabel(/amount/i).fill(String(amount));
    await this.page.getByRole('button', { name: /submit/i }).click();
    await this.page.waitForSelector('[role="dialog"]', { state:'hidden', timeout:6_000 }).catch(()=>{});
  }
}

export class ReportsPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.locator('.nav-item', { hasText: /reports/i }).click(); }
  async waitFor() { await this.page.waitForSelector('.reports-page, .report-section', { timeout: 10_000 }); }

  async selectReport(name) {
    await this.page.locator('.filter-tab, button', { hasText: new RegExp(name, 'i') }).first().click();
  }

  get totals() { return this.page.locator('.report-kpi-value, .total-value'); }
}

export class PayrollPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.locator('.nav-item', { hasText: /payroll/i }).click(); }
  async waitFor() { await this.page.waitForSelector('.payroll-page, .data-table', { timeout: 8_000 }); }

  get employeeRows() { return this.page.locator('.data-table tbody tr.table-row'); }
  get newPayRunBtn() { return this.page.getByRole('button', { name: /new pay run/i }); }
}

export class BankingPage {
  constructor(page) { this.page = page; }

  async goto()    { await this.page.locator('.nav-item', { hasText: /bank accounts/i }).click(); }
  async waitFor() { await this.page.waitForSelector('.banking-page, .banking-layout', { timeout: 8_000 }); }

  get accountCards()      { return this.page.locator('.bank-account-card'); }
  get transactionRows()   { return this.page.locator('.data-table tbody tr.table-row'); }
  get connectBankButton() { return this.page.getByRole('button', { name: /connect bank|add account/i }); }
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export async function authenticateAs(page, { email, password } = {}) {
  const u = email    ?? process.env.E2E_USER_EMAIL    ?? 'e2e@ledger.test';
  const p = password ?? process.env.E2E_USER_PASSWORD ?? 'e2epassword123';

  // Store auth state so each test doesn't re-login
  await page.evaluate(() => localStorage.setItem('onboarded', '1'));

  const login = new LoginPage(page);
  await login.login(u, p);
  return login;
}

export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
