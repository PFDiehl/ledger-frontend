import { useState } from 'react';

// Shown to a signed-in user whose org has no active/trialing subscription,
// when billing is enforced (VITE_BILLING_ENFORCED). Card required at signup:
// picking a plan sends them to Stripe Checkout (first month free, card on file).
const PLANS = [
  {
    key: 'startup', name: 'Startup', price: 15,
    tagline: 'Everything you need to run the books.',
    features: ['Unlimited invoices & estimates', 'Expense tracking with receipt scanning', 'Customers & vendors', 'Core financial reports', 'iPhone mobile app', 'Single user'],
  },
  {
    key: 'growth', name: 'Growth', price: 39,
    tagline: 'For teams ready to scale up.',
    features: ['Everything in Startup, plus:', 'Payroll', 'Automatic bank connections', 'Multiple team members', 'Advanced reports'],
  },
];

export default function SubscribeGate({ org, selectedPlan, apiBase, onLogout }) {
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');

  async function choose(plan) {
    setLoading(plan);
    setError('');
    try {
      const res = await fetch(`${apiBase}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org?.id, plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success && data.url) {
        window.location.href = data.url;   // hand off to Stripe Checkout
      } else {
        setError(data.message || 'Could not start checkout. Please try again.');
        setLoading('');
      }
    } catch {
      setError('Network error starting checkout. Please try again in a moment.');
      setLoading('');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a3a1a 0%, #0d2010 40%, #070f28 70%, #020408 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', fontFamily: 'sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28, maxWidth: 620 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#ffd166', fontFamily: 'Georgia, serif', marginBottom: 10 }}>
          Choose your plan
        </div>
        <p style={{ color: '#a8d4a8', fontSize: 16, lineHeight: 1.6, margin: 0 }}>
          Your <strong style={{ color: '#fff' }}>first month is free</strong>. We collect a card now so your books keep
          running when the month ends — cancel anytime before then and you won't be charged.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.4)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ff8a7a', fontSize: 14, maxWidth: 520,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22, maxWidth: 760, width: '100%' }}>
        {PLANS.map(plan => {
          const highlight = plan.key === selectedPlan;
          const busy = loading === plan.key;
          return (
            <div key={plan.key} style={{
              background: highlight ? 'rgba(255,209,102,0.09)' : 'rgba(255,255,255,0.04)',
              border: highlight ? '2px solid #ffd166' : '1px solid rgba(168,212,168,0.2)',
              borderRadius: 18, padding: '30px 26px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 22, color: '#ffd166', fontWeight: 700 }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: '#7a9a7a', marginTop: 6 }}>{plan.tagline}</div>
              <div style={{ margin: '18px 0 2px' }}>
                <span style={{ fontSize: 46, color: '#fff', fontWeight: 700 }}>${plan.price}</span>
                <span style={{ fontSize: 15, color: '#a8d4a8' }}> / month</span>
              </div>
              <div style={{ fontSize: 13, color: '#7a9a7a', marginBottom: 18 }}>Free first month, then ${plan.price}.</div>

              <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: '#cbe3cb', fontSize: 14.5, lineHeight: 1.5 }}>
                    <span style={{ color: '#ffd166', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choose(plan.key)}
                disabled={!!loading}
                style={{
                  marginTop: 'auto', padding: '14px 22px', borderRadius: 12, fontSize: 16, fontWeight: 700,
                  fontFamily: 'sans-serif', letterSpacing: 0.5, cursor: loading ? 'not-allowed' : 'pointer',
                  border: highlight ? 'none' : '1px solid #ffd166', width: '100%',
                  background: highlight ? 'linear-gradient(135deg, #ffd166 0%, #f5a623 100%)' : 'transparent',
                  color: highlight ? '#0d2010' : '#ffd166', opacity: (loading && !busy) ? 0.5 : 1,
                }}>
                {busy ? 'Opening secure checkout…' : `Start free with ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 26, fontSize: 13, color: '#5a8a5a', textAlign: 'center' }}>
        Payments are handled securely by Stripe · Cancel anytime
      </div>
      <button onClick={onLogout} style={{ marginTop: 18, background: 'none', border: 'none', color: '#7a9a7a', cursor: 'pointer', fontSize: 14 }}>
        Sign out
      </button>
    </div>
  );
}
