// ─────────────────────────────────────────────────────────────────────────────
// mtl-core.js — shared, framework-agnostic core for Mountain Top Ledger.
//
// This file contains ONLY plain JavaScript: no React, no React Native, no DOM,
// no fetch, no storage. That's deliberate — it means the SAME file can be used
// by both the web app (ledger-frontend, React/Vite) and the phone app
// (ledger-app, React Native/Expo) without change.
//
// What belongs here: things currently copy-pasted in both apps — the API
// endpoint paths, shared constants (categories, roles), formatters, and the
// business rules (recurring labels, invoice math). What does NOT belong here:
// anything that touches the screen, the network, or device storage. Each app
// keeps its own transport layer (web uses cookies + localStorage; mobile uses
// AsyncStorage + refresh tokens) and its own UI.
//
// Adoption is incremental: drop this into each app's src/lib/, then replace the
// duplicated pieces one at a time. Nothing breaks until you point code at it.
// ─────────────────────────────────────────────────────────────────────────────

// ── API endpoint paths ───────────────────────────────────────────────────────
// Central definition of every path both apps call. Pass the base URL and org id
// from the app; this just builds the path strings so they can never drift apart.
export const endpoints = {
  // Auth
  login:            () => `/auth/login`,
  register:         () => `/auth/register`,
  refresh:          () => `/auth/refresh`,
  logout:           () => `/auth/logout`,
  me:               () => `/auth/me`,
  forgotPassword:   () => `/auth/forgot-password`,
  resetPassword:    () => `/auth/reset-password`,
  twoFactorSetup:   () => `/auth/2fa/setup`,
  twoFactorEnable:  () => `/auth/2fa/enable`,
  twoFactorDisable: () => `/auth/2fa/disable`,
  twoFactorVerify:  () => `/auth/2fa/verify`,
  twoFactorStatus:  () => `/auth/2fa/status`,

  // Org-scoped
  contacts:   (orgId, type) => `/orgs/${orgId}/contacts${type ? `?type=${type}` : ''}`,
  contact:    (orgId, id)   => `/orgs/${orgId}/contacts/${id}`,
  invoices:   (orgId)       => `/orgs/${orgId}/invoices`,
  invoice:    (orgId, id)   => `/orgs/${orgId}/invoices/${id}`,
  bills:      (orgId)       => `/orgs/${orgId}/bills`,
  bill:       (orgId, id)   => `/orgs/${orgId}/bills/${id}`,
  expenses:   (orgId)       => `/orgs/${orgId}/expenses`,
  expense:    (orgId, id)   => `/orgs/${orgId}/expenses/${id}`,
  receiptScan:(orgId)       => `/orgs/${orgId}/receipts/scan`,
  reportsDashboard: (orgId) => `/orgs/${orgId}/reports/dashboard`,
  settings:   (orgId)       => `/orgs/${orgId}/settings`,
  team:       (orgId)       => `/orgs/${orgId}/team`,
  teamMember: (orgId, uid)  => `/orgs/${orgId}/team/${uid}`,
  quickbooksStatus:     (orgId) => `/orgs/${orgId}/quickbooks/status`,
  quickbooksConnect:    (orgId) => `/orgs/${orgId}/quickbooks/connect`,
  quickbooksDisconnect: (orgId) => `/orgs/${orgId}/quickbooks/disconnect`,
};

// ── Roles ────────────────────────────────────────────────────────────────────
export const ROLE_RANK = { viewer:0, member:1, manager:2, admin:3, owner:4 };
export const ASSIGNABLE_ROLES = ['viewer', 'member', 'manager', 'admin'];
export const ROLE_LABEL = { viewer:'Viewer', member:'Member', manager:'Manager', admin:'Admin', owner:'Owner' };

export function roleAtLeast(role, minRole) {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[minRole] ?? 0);
}

// ── Shared constants ─────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  'Advertising & Marketing','Bank Charges','Equipment','Insurance','Legal & Professional Fees',
  'Meals & Entertainment','Office Supplies','Payroll','Rent & Lease','Software & Subscriptions',
  'Taxes & Licenses','Travel','Utilities','Vehicle','Other',
];

export const BILL_CATEGORIES = [
  'Rent & Lease','Utilities','Insurance','Loan Payment','Supplier Invoice','Equipment Lease',
  'Professional Services','Payroll','Taxes','Software & Subscriptions','Other',
];

export const PAYMENT_METHODS = [
  'Cash','Check','Credit Card','Debit Card','ACH / Bank Transfer','Wire Transfer','PayPal','Venmo','Zelle','Other',
];

// ── Recurring schedules ──────────────────────────────────────────────────────
export const RECURRING_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

export function freqLabel(freq) {
  switch (freq) {
    case 'weekly':    return 'Weekly';
    case 'biweekly':  return 'Every 2 weeks';
    case 'monthly':   return 'Monthly';
    case 'quarterly': return 'Quarterly';
    case 'yearly':    return 'Yearly';
    default:          return '';
  }
}

// ── Formatters ───────────────────────────────────────────────────────────────
export function fmtCurrency(n, currency = 'USD') {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat('en-US', { style:'currency', currency }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

// Normalize any date-ish value to YYYY-MM-DD, or '' if invalid.
export function normalizeDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ── Business rules ───────────────────────────────────────────────────────────
// Client-side preview of invoice totals. The backend remains the source of
// truth on save; use this only for live display while editing.
// lines: [{ quantity, unitPrice, taxable }]
export function invoiceTotals(lines = [], { taxRate = 0, shipping = 0, discount = 0 } = {}) {
  let subtotal = 0;
  let taxableBase = 0;
  for (const l of lines) {
    const amount = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
    subtotal += amount;
    if (l.taxable !== false) taxableBase += amount;
  }
  const tax   = taxableBase * ((Number(taxRate) || 0) / 100);
  const total = subtotal + tax + (Number(shipping) || 0) - (Number(discount) || 0);
  const round = (x) => Math.round(x * 100) / 100;
  return { subtotal: round(subtotal), tax: round(tax), total: round(total) };
}

// Prefer a person's company name, then contact name, then a fallback.
export function displayName(contact) {
  if (!contact) return '';
  return contact.company || contact.contactName || contact.name || contact.email || '';
}
