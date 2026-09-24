import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setRefreshToken, setOrgId, clearAuth, refreshSession } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [orgs,    setOrgs]    = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [org,     setOrgState] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ledger_org')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Restore session on mount by attempting a token refresh
  useEffect(() => {
    (async () => {
      try {
        await refreshSession();
        const me = await api.get('/auth/me');
        setUser(me.data.user);
        setOrgs(me.data.orgs);
        setTenants(me.data.tenants || []);
        setIsPlatformOwner(!!me.data.isPlatformOwner);
        const savedOrg = me.data.orgs.find(o => o.id === org?.id) ?? me.data.orgs[0];
        if (savedOrg) selectOrg(savedOrg);
      } catch {
        // no valid session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectOrg(o) {
    setOrgState(o);
    setOrgId(o.id);
    localStorage.setItem('ledger_org', JSON.stringify(o));
  }

  // Merge changed org fields (e.g. branding) into state + storage without a reload.
  function applyOrgUpdate(updated) {
    if (!updated?.id) return;
    setOrgs(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
    setOrgState(prev => (prev && prev.id === updated.id) ? { ...prev, ...updated } : prev);
    try {
      const cur = JSON.parse(localStorage.getItem('ledger_org'));
      if (cur && cur.id === updated.id) localStorage.setItem('ledger_org', JSON.stringify({ ...cur, ...updated }));
    } catch { /* ignore */ }
  }

  // Re-fetch the signed-in user's companies/tenants from the server without a full
  // page reload. Used to pick up a client company the moment its access is approved,
  // so it appears in the company switcher right away. Keeps the current selection.
  const refreshMe = useCallback(async () => {
    try {
      const me = await api.get('/auth/me');
      setUser(me.data.user);
      setOrgs(me.data.orgs);
      setTenants(me.data.tenants || []);
      setIsPlatformOwner(!!me.data.isPlatformOwner);
      setOrgState(prev => {
        const still = me.data.orgs.find(o => o.id === prev?.id);
        return still ? { ...prev, ...still } : prev;
      });
      return me.data;
    } catch { /* ignore — a later protected call will surface any auth issue */ }
  }, []);

  // Merge changed user fields (e.g. a new login email) into state without a reload.
  // opts.isPlatformOwner, when provided, keeps the admin-console visibility in sync
  // (the allow-list is keyed by email, so a new email can change it).
  function applyUserUpdate(updated, opts = {}) {
    if (updated) setUser(prev => ({ ...(prev || {}), ...updated }));
    if (typeof opts.isPlatformOwner === 'boolean') setIsPlatformOwner(opts.isPlatformOwner);
  }

  // Keep the access token fresh. Access tokens are short-lived now, and several
  // pages read the token straight from localStorage (no auto-retry), so we
  // proactively refresh well before expiry — on an interval and when the tab
  // regains focus — to keep those pages working seamlessly.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const doRefresh = async () => {
      try { await refreshSession(); } catch { /* refresh failed — the next protected call will handle it */ }
    };
    const iv = setInterval(doRefresh, 10 * 60 * 1000); // every 10 minutes
    const onFocus = () => doRefresh();
    window.addEventListener('focus', onFocus);
    return () => { cancelled = true; clearInterval(iv); window.removeEventListener('focus', onFocus); };
  }, [user]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    // If the account has 2FA enabled, no session is issued yet — the caller
    // must collect a code and call verify2FA with the short-lived token.
    if (data.twoFactorRequired) return data;
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setUser(data.user);
    setOrgs(data.orgs);
    setTenants(data.tenants || []);
    setIsPlatformOwner(!!data.isPlatformOwner);
    const firstOrg = data.orgs[0];
    if (firstOrg) selectOrg(firstOrg);
    return data;
  }, []);

  // Sign in with Google: `credential` is the Google ID token from Google Identity
  // Services. Same shape as login — may return { twoFactorRequired } for 2FA users.
  const loginWithGoogle = useCallback(async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    if (data.twoFactorRequired) return data;
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setUser(data.user);
    setOrgs(data.orgs);
    setTenants(data.tenants || []);
    setIsPlatformOwner(!!data.isPlatformOwner);
    const firstOrg = data.orgs[0];
    if (firstOrg) selectOrg(firstOrg);
    return data;
  }, []);

  const verify2FA = useCallback(async (twoFactorToken, code) => {
    const { data } = await api.post('/auth/2fa/verify', { twoFactorToken, code });
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setUser(data.user);
    setOrgs(data.orgs);
    setTenants(data.tenants || []);
    setIsPlatformOwner(!!data.isPlatformOwner);
    const firstOrg = data.orgs[0];
    if (firstOrg) selectOrg(firstOrg);
    return data;
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    setAccessToken(data.accessToken);
    if (data.refreshToken) setRefreshToken(data.refreshToken);
    setUser(data.user);
    setOrgs([data.org]);
    selectOrg(data.org);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    clearAuth();
    setUser(null);
    setOrgs([]);
    setTenants([]);
    setIsPlatformOwner(false);
    setOrgState(null);
    localStorage.removeItem('ledger_org');
  }, []);

  return (
    <AuthContext.Provider value={{ user, orgs, tenants, isPlatformOwner, org, loading, login, loginWithGoogle, verify2FA, register, logout, selectOrg, applyOrgUpdate, applyUserUpdate, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
