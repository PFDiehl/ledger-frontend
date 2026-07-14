// Base API client — wraps fetch with auth headers, token refresh, and error handling

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

let accessToken = null;
let orgId       = null;

export function setAccessToken(token) { accessToken = token; try { if(token) localStorage.setItem('accessToken', token); else localStorage.removeItem('accessToken'); } catch(e) {} }
export function setOrgId(id)          { orgId = id; }
export function clearAuth()           { accessToken = null; orgId = null; }

async function refreshToken() {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method:      'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Session expired');
  const { data } = await res.json();
  accessToken = data.accessToken;
  return accessToken;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
    ...(orgId       && { 'x-org-id': orgId }),
    ...options.headers,
  };

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });

  // Auto-refresh on 401
  if (res.status === 401 && accessToken) {
    try {
      await refreshToken();
      headers.Authorization = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    } catch {
      clearAuth();
      window.location.href = '/login';
      return;
    }
  }

  if (res.status === 204) return null;

  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body.message ?? 'Request failed');
    err.code    = body.code;
    err.status  = res.status;
    err.errors  = body.errors;
    throw err;
  }

  return body;
}

export const api = {
  get:    (path, params)  => request(path + (params ? '?' + new URLSearchParams(params) : ''), { method: 'GET' }),
  post:   (path, body)    => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)    => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)    => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)          => request(path, { method: 'DELETE' }),
};

// ── Scoped helpers ────────────────────────────
// Automatically prefix with /orgs/:orgId

export function orgApi(id) {
  const base = `/orgs/${id}`;
  return {
    // Contacts
    contacts:       (params)       => api.get(`${base}/contacts`, params),
    contact:        (id)           => api.get(`${base}/contacts/${id}`),
    createContact:  (data)         => api.post(`${base}/contacts`, data),
    updateContact:  (id, data)     => api.put(`${base}/contacts/${id}`, data),
    deleteContact:  (id)           => api.delete(`${base}/contacts/${id}`),

    // Invoices
    invoices:        (params)       => api.get(`${base}/invoices`, params),
    invoice:         (id)           => api.get(`${base}/invoices/${id}`),
    createInvoice:   (data)         => api.post(`${base}/invoices`, data),
    updateInvoice:   (id, data)     => api.put(`${base}/invoices/${id}`, data),
    sendInvoice:     (id)           => api.post(`${base}/invoices/${id}/send`),
    payInvoice:      (id, data)     => api.post(`${base}/invoices/${id}/payment`, data),
    voidInvoice:     (id, reason)   => api.post(`${base}/invoices/${id}/void`, { reason }),

    // Bills
    bills:           (params)       => api.get(`${base}/bills`, params),
    bill:            (id)           => api.get(`${base}/bills/${id}`),
    createBill:      (data)         => api.post(`${base}/bills`, data),
    updateBill:      (id, data)     => api.put(`${base}/bills/${id}`, data),
    approveBill:     (id)           => api.post(`${base}/bills/${id}/approve`),
    payBill:         (id, data)     => api.post(`${base}/bills/${id}/payment`, data),

    // Accounts (Chart of Accounts)
    accounts:        ()             => api.get(`${base}/accounts`),
    account:         (id)           => api.get(`${base}/accounts/${id}`),
    createAccount:   (data)         => api.post(`${base}/accounts`, data),
    updateAccount:   (id, data)     => api.put(`${base}/accounts/${id}`, data),
    deleteAccount:   (id)           => api.delete(`${base}/accounts/${id}`),

    // Banking
    bankAccounts:    ()             => api.get(`${base}/banking/accounts`),
    transactions:    (acctId, p)    => api.get(`${base}/banking/accounts/${acctId}/transactions`, p),
    categorizeTxn:   (acctId, id, d) => api.patch(`${base}/banking/accounts/${acctId}/transactions/${id}`, d),
    importTxns:      (acctId, data) => api.post(`${base}/banking/accounts/${acctId}/transactions/import`, data),

    // Reports
    dashboardKPIs:   (params)       => api.get(`${base}/reports/dashboard`, params),
    pl:              (params)       => api.get(`${base}/reports/pl`, params),
    balanceSheet:    (params)       => api.get(`${base}/reports/balance-sheet`, params),
    agedAR:          ()             => api.get(`${base}/reports/aged-ar`),
  };
}




