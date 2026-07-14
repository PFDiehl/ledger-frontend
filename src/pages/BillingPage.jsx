import { useState } from 'react';
import { useToast } from '../lib/ToastContext';
import { fmt } from '../lib/utils';

const PLANS = [
  {
    key:          'starter',
    name:         'Starter',
    price:        29,
    description:  'For freelancers and solo operators',
    features:     ['50 invoices/month','3 users','2 bank accounts','Invoicing & billing','Expenses & reports','Email support'],
    limits:       { invoices:'50 / month', users:'3', banks:'2' },
  },
  {
    key:          'professional',
    name:         'Professional',
    price:        79,
    popular:      true,
    description:  'For growing small businesses',
    features:     ['500 invoices/month','10 users','10 bank accounts','Everything in Starter','Payroll','Budgets','Multi-currency','Recurring invoices','Document OCR'],
    limits:       { invoices:'500 / month', users:'10', banks:'10' },
  },
  {
    key:          'business',
    name:         'Business',
    price:        199,
    description:  'For teams that need everything',
    features:     ['Unlimited invoices','Unlimited users','Unlimited bank accounts','Everything in Professional','API access','Custom integrations','Priority support','Dedicated onboarding'],
    limits:       { invoices:'Unlimited', users:'Unlimited', banks:'Unlimited' },
  },
];

const USAGE_MOCK = {
  plan:        'professional',
  planStatus:  'active',
  trialEndsAt: null,
  usage: {
    invoicesThisMonth: { used: 23,  limit: 500 },
    users:             { used: 4,   limit: 10  },
    bankAccounts:      { used: 2,   limit: 10  },
  },
};

function UsageBar({ used, limit, label }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const warn = pct > 80;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:5 }}>
        <span style={{ color:'var(--color-text-secondary)' }}>{label}</span>
        <span style={{ fontWeight:500, color: warn ? '#993C1D' : 'var(--color-text-primary)' }}>
          {used.toLocaleString()} / {limit < 0 ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div style={{ height:5, background:'var(--color-background-secondary)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background: warn ? '#E24B4A' : '#5DCAA5', borderRadius:3, transition:'width 0.3s' }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const toast = useToast();
  const [billing, setBilling] = useState(USAGE_MOCK);
  const [upgrading, setUpgrading] = useState(false);
  const currentPlan = PLANS.find(p => p.key === billing.plan);

  async function handleUpgrade(planKey) {
    if (planKey === billing.plan) return;
    setUpgrading(true);
    await new Promise(r => setTimeout(r, 800));
    setUpgrading(false);
    toast.success(`Redirecting to checkout for ${PLANS.find(p=>p.key===planKey)?.name} plan…`);
    // In production: fetch('/api/billing/orgs/:orgId/checkout', { method:'POST', body:{plan:planKey} })
    // then redirect to the Stripe Checkout URL
  }

  async function handleManage() {
    toast.info('Opening billing portal…');
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {/* Current plan summary */}
      <div style={{ background:'var(--color-background-secondary)', borderRadius:10, padding:'16px 18px', marginBottom:20, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:3 }}>Current plan</div>
          <div style={{ fontSize:16, fontWeight:500 }}>{currentPlan?.name ?? 'Starter'}</div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>
            {billing.planStatus === 'active' ? `$${currentPlan?.price}/month · renews automatically` : billing.planStatus}
          </div>
        </div>
        <button className="btn-secondary" onClick={handleManage}>
          <i className="ti ti-external-link" /> Manage billing
        </button>
      </div>

      {/* Usage */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title" style={{ marginBottom:14 }}>This month's usage</div>
        <UsageBar used={billing.usage.invoicesThisMonth.used} limit={billing.usage.invoicesThisMonth.limit} label="Invoices" />
        <UsageBar used={billing.usage.users.used}             limit={billing.usage.users.limit}             label="Team members" />
        <UsageBar used={billing.usage.bankAccounts.used}      limit={billing.usage.bankAccounts.limit}      label="Bank accounts" />
      </div>

      {/* Plan comparison */}
      <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>Change plan</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0,1fr))', gap:12 }}>
        {PLANS.map(plan => {
          const isCurrent = plan.key === billing.plan;
          return (
            <div key={plan.key} style={{
              background: 'var(--color-background-primary)',
              border: isCurrent ? '2px solid #2D4A35' : plan.popular ? '2px solid var(--color-border-info)' : '0.5px solid var(--color-border-tertiary)',
              borderRadius: 12, padding: '18px 16px',
              position: 'relative',
            }}>
              {plan.popular && !isCurrent && (
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'#185FA5', color:'#fff', fontSize:11, fontWeight:600, padding:'3px 12px', borderRadius:20, whiteSpace:'nowrap' }}>
                  Most popular
                </div>
              )}
              {isCurrent && (
                <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'var(--brand-primary,#2D4A35)', color:'#fff', fontSize:11, fontWeight:600, padding:'3px 12px', borderRadius:20, whiteSpace:'nowrap' }}>
                  Current plan
                </div>
              )}
              <div style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>{plan.name}</div>
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:12 }}>{plan.description}</div>
              <div style={{ fontSize:24, fontWeight:500, letterSpacing:'-.02em', marginBottom:14 }}>
                ${plan.price}<span style={{ fontSize:13, fontWeight:400, color:'var(--color-text-secondary)' }}>/mo</span>
              </div>
              <ul style={{ listStyle:'none', marginBottom:16, display:'flex', flexDirection:'column', gap:6 }}>
                {plan.features.slice(0,5).map(f => (
                  <li key={f} style={{ fontSize:12, color:'var(--color-text-secondary)', display:'flex', alignItems:'flex-start', gap:6 }}>
                    <i className="ti ti-check" style={{ fontSize:13, color:'#0F6E56', flexShrink:0, marginTop:1 }} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={isCurrent ? 'btn-secondary' : 'btn-primary'}
                style={{ width:'100%', justifyContent:'center', opacity: isCurrent ? 0.5 : 1 }}
                disabled={isCurrent || upgrading}
                onClick={() => handleUpgrade(plan.key)}
              >
                {isCurrent ? 'Current plan' : plan.price > (currentPlan?.price ?? 0) ? 'Upgrade' : 'Downgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
