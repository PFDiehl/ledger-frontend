import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setRefreshToken, setOrgId, clearAuth, refreshSession } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [orgs,    setOrgs]    = useState([]);
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
    setOrgState(null);
    localStorage.removeItem('ledger_org');
  }, []);

  return (
    <AuthContext.Provider value={{ user, orgs, org, loading, login, verify2FA, register, logout, selectOrg, applyOrgUpdate }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
