import { useState } from 'react';

// Shown to a signed-in user whose org has no active/trialing subscription,
// when billing is enforced (VITE_BILLING_ENFORCED). Card required at signup:
// picking a plan sends them to Stripe Checkout (first month free, card on file).
// Styled in the app's sage-green scheme.
const GREEN = '#2D4A35', GREEN_DK = '#1F3326', SAGE = '#7A9A7A';
const INK = '#1F2A24', INK_2 = '#5E6B62', INK_3 = '#8A968C';
const LINE = '#E2E8E0', ACCENT_LIGHT = '#EBF2E8', CHECK = '#0F6E56';

const PLANS = [
  {
    key: 'startup', name: 'Startup', price: 15,
    tagline: 'Everything you need to run the books.',
    features: ['Unlimited invoices & estimates', 'Expense tracking with receipt scanning', 'Customers & vendors', 'Core financial reports', 'iPhone mobile app', 'Single user'],
  },
  {
    key: 'growth', name: 'Growth', price: 39, popular: true,
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
      background: 'linear-gradient(180deg, #F5F8F3 0%, #EDF2EA 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '48px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 30, maxWidth: 600 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-.02em', color: GREEN, marginBottom: 14 }}>
          MountainTop Ledger
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', color: GREEN, marginBottom: 10 }}>
          Choose your plan
        </div>
        <p style={{ color: INK_2, fontSize: 15.5, lineHeight: 1.6, margin: 0 }}>
          Your <strong style={{ color: INK }}>first month is free</strong>. We collect a card now so your books keep
          running when the month ends — cancel anytime before then and you won't be charged.
        </p>
      </div>

      {error && (
        <div style={{
          background: '#FBECEA', border: '1px solid #E7B9B2',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#9A3B2E', fontSize: 14, maxWidth: 520,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20, maxWidth: 740, width: '100%' }}>
        {PLANS.map(plan => {
          const featured = plan.key === selectedPlan || (!selectedPlan && plan.popular);
          const busy = loading === plan.key;
          return (
            <div key={plan.key} style={{
              position: 'relative',
              background: '#fff',
              border: featured ? `2px solid ${GREEN}` : `1px solid ${LINE}`,
              borderRadius: 16, padding: '30px 26px', display: 'flex', flexDirection: 'column',
              boxShadow: featured ? '0 8px 28px rgba(45,74,53,0.12)' : '0 1px 3px rgba(31,42,36,0.05)',
            }}>
              {featured && (
                <div style={{
                  position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                  background: GREEN, color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: '.03em',
                  padding: '3px 13px', borderRadius: 20, whiteSpace: 'nowrap',
                }}>
                  {plan.key === selectedPlan ? 'Your pick' : 'Most popular'}
                </div>
              )}
              <div style={{ fontSize: 20, color: GREEN, fontWeight: 700 }}>{plan.name}</div>
              <div style={{ fontSize: 13, color: SAGE, marginTop: 6 }}>{plan.tagline}</div>
              <div style={{ margin: '18px 0 2px' }}>
                <span style={{ fontSize: 44, color: INK, fontWeight: 700, letterSpacing: '-.02em' }}>${plan.price}</span>
                <span style={{ fontSize: 15, color: INK_2 }}> / month</span>
              </div>
              <div style={{ fontSize: 13, color: INK_3, marginBottom: 20 }}>Free first month, then ${plan.price}.</div>

              <ul style={{ listStyle: 'none', margin: '0 0 24px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, color: INK_2, fontSize: 14, lineHeight: 1.5 }}>
                    <span style={{ color: CHECK, fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => choose(plan.key)}
                disabled={!!loading}
                style={{
                  marginTop: 'auto', padding: '13px 22px', borderRadius: 11, fontSize: 15.5, fontWeight: 600,
                  letterSpacing: '.01em', cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
                  border: featured ? 'none' : `1.5px solid ${GREEN}`,
                  background: featured ? GREEN : 'transparent',
                  color: featured ? '#fff' : GREEN,
                  opacity: (loading && !busy) ? 0.5 : 1,
                }}>
                {busy ? 'Opening secure checkout…' : `Start free with ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 20, fontSize: 13.5, color: INK_2, background: '#fff',
        border: `1px solid ${LINE}`, borderRadius: 10, padding: '10px 16px', maxWidth: 520, textAlign: 'center',
      }}>
        <strong style={{ color: GREEN }}>Have a promo code?</strong> You can enter it at checkout — look for “Add promotion code.”
      </div>

      <div style={{ marginTop: 18, fontSize: 13, color: INK_3, textAlign: 'center' }}>
        Payments are handled securely by Stripe · Cancel anytime
      </div>
      <button onClick={onLogout} style={{ marginTop: 16, background: 'none', border: 'none', color: SAGE, cursor: 'pointer', fontSize: 14 }}>
        Sign out
      </button>
    </div>
  );
}
