import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setAccessToken, setOrgId, clearAuth } from './api';

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
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
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

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setOrgs(data.orgs);
    const firstOrg = data.orgs[0];
    if (firstOrg) selectOrg(firstOrg);
    return data;
  }, []);

  const register = useCallback(async (fields) => {
    const { data } = await api.post('/auth/register', fields);
    setAccessToken(data.accessToken);
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
    <AuthContext.Provider value={{ user, orgs, org, loading, login, register, logout, selectOrg }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
