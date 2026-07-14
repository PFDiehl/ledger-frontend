import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(import.meta.dirname, '../fixtures/auth.json');

setup('create test user and authenticate', async ({ page }) => {
  const API = process.env.E2E_API_URL ?? 'http://localhost:3001/api';
  const EMAIL    = process.env.E2E_USER_EMAIL    ?? 'e2e@ledger.test';
  const PASSWORD = process.env.E2E_USER_PASSWORD ?? 'e2epassword123';

  // Register (idempotent — 409 if already exists is fine)
  const registerRes = await page.request.post(`${API}/auth/register`, {
    data: { fullName: 'E2E Tester', email: EMAIL, password: PASSWORD, orgName: 'E2E Test Co.' },
  });

  let token, orgId;

  if (registerRes.ok()) {
    const body = await registerRes.json();
    token  = body.data.accessToken;
    orgId  = body.data.org.id;
  } else {
    // Already exists — login
    const loginRes = await page.request.post(`${API}/auth/login`, {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const body = await loginRes.json();
    token  = body.data.accessToken;
    orgId  = body.data.orgs[0]?.id;
  }

  // Seed a contact
  await page.request.post(`${API}/orgs/${orgId}/contacts`, {
    data:    { name: 'Globex Corp', email: 'billing@globex.com', type: 'customer' },
    headers: { Authorization: `Bearer ${token}` },
  });

  // Seed a draft invoice
  await page.request.post(`${API}/orgs/${orgId}/invoices`, {
    data: {
      contactId: (await page.request.get(`${API}/orgs/${orgId}/contacts`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(j => j.data?.[0]?.id)) ?? '00000000-0000-0000-0000-000000000000',
      issueDate: new Date().toISOString().slice(0,10),
      dueDate:   new Date(Date.now() + 30*864e5).toISOString().slice(0,10),
      lineItems: [{ description: 'E2E test service', quantity: 1, unitPrice: 1000, taxRate: 0 }],
    },
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {}); // ignore if seeding fails

  // Navigate and set localStorage then save storage state
  await page.goto('/');
  await page.evaluate(({ token, orgId }) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('orgId', orgId);
    localStorage.setItem('onboarded', '1');
  }, { token, orgId });

  await page.context().storageState({ path: AUTH_FILE });
});
