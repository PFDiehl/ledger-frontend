import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

const API = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';

const PLANS = [
  {
    key: 'startup', name: 'Startup', price: 15,
    description: 'Everything you need to run the books.',
    features: ['Unlimited invoices & estimates', 'Expense tracking with receipt scanning', 'Customers & vendors', 'Core financial reports', 'iPhone mobile app', 'Single user'],
  },
  {
    key: 'growth', name: 'Growth', price: 39, popular: true,
    description: 'For teams ready to scale up.',
    features: ['Everything in Startup, plus:', 'Payroll', 'Automatic bank connections', 'Multiple team members', 'Advanced reports'],
  },
];

const STATUS_LABEL = {
  trialing:   'Free trial — first month',
  active:     'Active · renews automatically',
  past_due:   'Payment past due',
  canceled:   'Canceled',
  incomplete: 'Incomplete',
  trial:      'No active subscription',
};

export default function BillingPage() {
  const { org } = useAuth();
  const toast = useToast();
  const [sub, setSub]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState('');

  async function loadSub() {
    if (!org?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/billing/subscription?orgId=${org.id}`);
      const data = await res.json();
      setSub(data.data || null);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSub(); /* eslint-disable-next-line */ }, [org?.id]);

  async function startCheckout(plan) {
    setBusy(plan);
    try {
      const res = await fetch(`${API}/billing/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id, plan }),
      });
      const data = await res.json();
      if (data.success && data.url) window.location.href = data.url;
      else { toast.error(data.message || 'Could not start checkout.'); setBusy(''); }
    } catch { toast.error('Network error. Please try again.'); setBusy(''); }
  }

  async function openPortal() {
    setBusy('portal');
    try {
      const res = await fetch(`${API}/billing/portal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: org.id }),
      });
      const data = await res.json();
      if (data.success && data.url) window.location.href = data.url;
      else { toast.error(data.message || 'Billing portal is not available yet.'); setBusy(''); }
    } catch { toast.error('Network error. Please try again.'); setBusy(''); }
  }

  if (loading) {
    return <div className="page"><div style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading your subscription…</div></div>;
  }

  const active      = !!sub?.active;
  const planKey     = sub?.plan;
  const planStatus  = sub?.planStatus;
  const currentPlan = PLANS.find(p => p.key === planKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Current plan */}
      <div style={{ background: 'var(--color-background-secondary)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 3 }}>Current plan</div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {active && currentPlan ? currentPlan.name : 'No active plan'}
            {active && currentPlan ? <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}> · ${currentPlan.price}/mo</span> : null}
          </div>
          <div style={{ fontSize: 12, color: active ? '#0F6E56' : 'var(--color-text-secondary)', marginTop: 2 }}>
            {STATUS_LABEL[planStatus] || (active ? 'Active' : 'No active subscription')}
          </div>
        </div>
        {sub?.hasCustomer && (
          <button className="btn-secondary" disabled={busy === 'portal'} onClick={openPortal}>
            {busy === 'portal' ? 'Opening…' : 'Manage billing'}
          </button>
        )}
      </div>

      {active ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            You're subscribed to <strong style={{ color: 'var(--color-text-primary)' }}>{currentPlan?.name}</strong>.
            To switch plans, update your card, or cancel, use <strong>Manage billing</strong> above — it opens Stripe's
            secure billing portal.
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Choose a plan — first month free</div>
      )}

      {/* Plans */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {PLANS.map(plan => {
          const isCurrent = active && plan.key === planKey;
          return (
            <div key={plan.key} style={{
              background: 'var(--color-background-primary)',
              border: isCurrent ? '2px solid #2D4A35' : plan.popular ? '2px solid var(--color-border-info)' : '0.5px solid var(--color-border-tertiary)',
              borderRadius: 12, padding: '18px 16px', position: 'relative',
            }}>
              {plan.popular && !isCurrent && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#185FA5', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>Most popular</div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#2D4A35', color: '#fff', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20, whiteSpace: 'nowrap' }}>Current plan</div>
              )}
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{plan.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>{plan.description}</div>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-.02em', marginBottom: 4 }}>
                ${plan.price}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>/mo</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>Free first month, then ${plan.price}.</div>
              <ul style={{ listStyle: 'none', marginBottom: 16, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <i className="ti ti-check" style={{ fontSize: 13, color: '#0F6E56', flexShrink: 0, marginTop: 1 }} /> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }} disabled>Current plan</button>
              ) : active ? (
                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy === 'portal'} onClick={openPortal}>
                  {busy === 'portal' ? 'Opening…' : 'Switch via Manage billing'}
                </button>
              ) : (
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!!busy} onClick={() => startCheckout(plan.key)}>
                  {busy === plan.key ? 'Opening checkout…' : `Start free with ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 16 }}>
        Payments are handled securely by Stripe. Card required; cancel anytime before your first month ends and you won't be charged.
      </div>
    </div>
  );
}
