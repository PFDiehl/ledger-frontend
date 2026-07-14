import { useState, useCallback } from 'react';
import { orgApi } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

// Dynamically loads the Plaid Link script once
let plaidScriptLoaded = false;
function loadPlaidScript() {
  if (plaidScriptLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src     = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.onload  = () => { plaidScriptLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function PlaidLinkButton({ onSuccess, onError }) {
  const { org }       = useAuth();
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState('idle'); // idle | connecting | success | error

  const connect = useCallback(async () => {
    if (!org) return;
    setLoading(true);
    setStatus('connecting');

    try {
      // 1. Load Plaid script
      await loadPlaidScript();

      // 2. Get link token from our backend
      const { data } = await orgApi(org.id).post?.('/plaid/link-token') ??
        await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/plaid/link-token`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
          },
        }).then(r => r.json());

      const linkToken = data?.linkToken ?? data?.link_token;
      if (!linkToken) throw new Error('Could not get Plaid link token');

      // 3. Open Plaid Link
      await new Promise((resolve, reject) => {
        const handler = window.Plaid.create({
          token: linkToken,

          onSuccess: async (publicToken, metadata) => {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/orgs/${org.id}/plaid/exchange`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
                body:    JSON.stringify({ publicToken, institutionName: metadata.institution?.name }),
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json.message ?? 'Exchange failed');
              setStatus('success');
              onSuccess?.(json.data);
            } catch (err) {
              setStatus('error');
              onError?.(err.message);
            }
            resolve();
          },

          onExit: (err) => {
            if (err) { setStatus('error'); onError?.(err.error_message); }
            else      setStatus('idle');
            resolve();
          },
        });

        handler.open();
      });

    } catch (err) {
      setStatus('error');
      onError?.(err.message ?? 'Plaid connection failed');
    } finally {
      setLoading(false);
    }
  }, [org, onSuccess, onError]);

  const labels = {
    idle:       'Connect bank account',
    connecting: 'Connecting…',
    success:    'Connected!',
    error:      'Retry connection',
  };

  return (
    <button
      className={`btn-primary ${status === 'success' ? 'success-btn' : ''}`}
      onClick={connect}
      disabled={loading}
      style={{ opacity: loading ? 0.7 : 1 }}
    >
      <i className={`ti ti-${status === 'success' ? 'check' : 'building-bank'}`} aria-hidden="true" />
      {labels[status]}
    </button>
  );
}
