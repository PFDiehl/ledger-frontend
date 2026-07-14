import { useState, useEffect, useCallback, useRef } from 'react';
import { orgApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

// ── Generic fetch hook ────────────────────────

export function useFetch(fetcher, deps = []) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (mountedRef.current) setData(res?.data ?? res);
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  return { data, loading, error, reload: load };
}

// ── Mutation hook ─────────────────────────────

export function useMutation(mutFn) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mutFn(...args);
      return res?.data ?? res;
    } catch (e) {
      setError(e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [mutFn]);

  return { mutate, loading, error };
}

// ── Resource hooks ────────────────────────────

function useOrgApi() {
  const { org } = useAuth();
  return org ? orgApi(org.id) : null;
}

export function useInvoices(params) {
  const client = useOrgApi();
  return useFetch(() => client?.invoices(params), [client, JSON.stringify(params)]);
}

export function useInvoice(id) {
  const client = useOrgApi();
  return useFetch(() => id && client?.invoice(id), [client, id]);
}

export function useBills(params) {
  const client = useOrgApi();
  return useFetch(() => client?.bills(params), [client, JSON.stringify(params)]);
}

export function useContacts(params) {
  const client = useOrgApi();
  return useFetch(() => client?.contacts(params), [client, JSON.stringify(params)]);
}

export function useAccounts() {
  const client = useOrgApi();
  return useFetch(() => client?.accounts(), [client]);
}

export function useBankAccounts() {
  const client = useOrgApi();
  return useFetch(() => client?.bankAccounts(), [client]);
}

export function useBankTransactions(accountId, params) {
  const client = useOrgApi();
  return useFetch(
    () => accountId && client?.transactions(accountId, params),
    [client, accountId, JSON.stringify(params)]
  );
}

export function useDashboardKPIs(params) {
  const client = useOrgApi();
  return useFetch(() => client?.dashboardKPIs(params), [client, JSON.stringify(params)]);
}

export function usePL(params) {
  const client = useOrgApi();
  return useFetch(() => client?.pl(params), [client, JSON.stringify(params)]);
}

export function useBalanceSheet(params) {
  const client = useOrgApi();
  return useFetch(() => client?.balanceSheet(params), [client, JSON.stringify(params)]);
}

export function useAgedAR() {
  const client = useOrgApi();
  return useFetch(() => client?.agedAR(), [client]);
}

// ── Invoice mutations ─────────────────────────

export function useInvoiceMutations() {
  const client = useOrgApi();
  return {
    create:  useMutation((data)         => client.createInvoice(data)),
    update:  useMutation((id, data)     => client.updateInvoice(id, data)),
    send:    useMutation((id)           => client.sendInvoice(id)),
    pay:     useMutation((id, data)     => client.payInvoice(id, data)),
    void_:   useMutation((id, reason)   => client.voidInvoice(id, reason)),
  };
}

export function useBillMutations() {
  const client = useOrgApi();
  return {
    create:  useMutation((data)     => client.createBill(data)),
    update:  useMutation((id, data) => client.updateBill(id, data)),
    approve: useMutation((id)       => client.approveBill(id)),
    pay:     useMutation((id, data) => client.payBill(id, data)),
  };
}

export function useContactMutations() {
  const client = useOrgApi();
  return {
    create: useMutation((data)     => client.createContact(data)),
    update: useMutation((id, data) => client.updateContact(id, data)),
    delete: useMutation((id)       => client.deleteContact(id)),
  };
}
