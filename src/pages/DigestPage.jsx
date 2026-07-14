import { useState, useMemo } from 'react';
import { useToast } from '../lib/ToastContext';
import { fmt } from '../lib/utils';

// ── Seed data — what the backend /reports/digest endpoint would return ────────

const TODAY = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

const SEED = {
  ownerName: 'Alex',
  cashBalance: 33440,
  cashChange:  -2100,   // vs 7 days ago
  needsAttention: [
    {
      id: 'inv-overdue-1',
      type: 'overdue_invoice',
      priority: 'high',
      title: 'Umbrella Ltd owes you $3,100',
      detail: '45 days late — this one needs a call, not just an email.',
      action: 'Send reminder',
      secondaryAction: 'View invoice',
      icon: '⚠️',
    },
    {
      id: 'inv-overdue-2',
      type: 'overdue_invoice',
      priority: 'medium',
      title: 'Wayne Enterprises owes you $3,580',
      detail: '7 days late. They usually pay — a quick email should do it.',
      action: 'Send reminder',
      secondaryAction: 'View invoice',
      icon: '📬',
    },
    {
      id: 'payroll-due',
      type: 'payroll_due',
      priority: 'high',
      title: 'Payroll is due in 2 days',
      detail: '4 employees · estimated $14,280 · direct deposit takes 1 business day.',
      action: 'Run payroll',
      secondaryAction: 'View employees',
      icon: '👥',
    },
    {
      id: 'txns-uncategorized',
      type: 'uncategorized_transactions',
      priority: 'low',
      title: '8 transactions need a quick look',
      detail: 'We guessed the categories but want your confirmation. Takes about 2 minutes.',
      action: 'Review now',
      secondaryAction: null,
      icon: '🏦',
    },
    {
      id: 'expense-approval',
      type: 'expense_approval',
      priority: 'low',
      title: '2 expenses waiting for your approval',
      detail: 'Bob submitted $429 for a hotel and $312 for a Delta flight.',
      action: 'Approve or reject',
      secondaryAction: null,
      icon: '💳',
    },
  ],
  upcomingBills: [
    { vendor: 'WeWork',              amount: 2400, dueDate: 'Tomorrow',   daysUntil: 1 },
    { vendor: 'AWS',                 amount: 892,  dueDate: 'In 4 days',  daysUntil: 4 },
    { vendor: 'Gusto payroll',       amount: 14280,dueDate: 'In 2 days',  daysUntil: 2 },
    { vendor: 'Shopify subscription',amount: 299,  dueDate: 'In 8 days',  daysUntil: 8 },
  ],
  moneyComingIn: [
    { client: 'Globex Corp',       amount: 4200, dueDate: 'Due in 27 days', confidence: 'likely' },
    { client: 'Initech',           amount: 1500, dueDate: 'Due in 3 days',  confidence: 'likely' },
  ],
  recentWins: [
    { text: 'Initech paid invoice #1038 — $7,500 received', when: '2 days ago' },
    { text: 'AI categorized 14 transactions automatically',  when: 'Yesterday' },
  ],
  insight: {
    text: "Your profit margin is 35% this month — that's healthy. The main drag is software subscriptions, which are up 18% from last month.",
    action: 'See the breakdown',
  },
};

const PRIORITY_CONFIG = {
  high:   { border:'#E24B4A', bg:'#FCEBEB', dot:'#E24B4A' },
  medium: { border:'#EF9F27', bg:'#FAEEDA', dot:'#EF9F27' },
  low:    { border:'var(--color-border-tertiary)', bg:'var(--color-background-primary)', dot:'#B4B2A9' },
};

// ── Natural language action bar ───────────────────────────────────────────────

function ActionBar({ onAction }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const SUGGESTIONS = [
    'Invoice Globex for $4,200 for web design',
    'Record that I paid the electric bill $240 yesterday',
    'Send a reminder to Wayne Enterprises',
    'How much did I spend on software this month?',
  ];

  async function handleSubmit(text) {
    if (!text.trim()) return;
    setLoading(true);
    setValue(text);
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    onAction?.(text);
    setValue('');
  }

  return (
    <div style={{
      background: 'var(--color-background-primary)',
      border: '1.5px solid var(--color-border-secondary)',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 24,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:18 }}>✨</span>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit(value)}
          placeholder="What do you need to do? e.g. 'Invoice Acme for $2,000 for consulting'"
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 14,
            background: 'transparent', color: 'var(--color-text-primary)',
          }}
        />
        {value && (
          <button
            onClick={() => handleSubmit(value)}
            disabled={loading}
            style={{ background: 'var(--brand-primary,#2D4A35)', color:'#fff', border:'none', borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            {loading ? '…' : 'Go →'}
          </button>
        )}
      </div>
      {!value && (
        <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSubmit(s)}
              style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', color:'var(--color-text-secondary)', cursor:'pointer', whiteSpace:'nowrap' }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cash position strip ───────────────────────────────────────────────────────

function CashStrip({ balance, change }) {
  const positive = change >= 0;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #2D4A35, #3D6045)',
      borderRadius: 12, padding: '18px 22px', marginBottom: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff',
    }}>
      <div>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Money in the bank right now</div>
        <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em' }}>{fmt(balance)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>vs 7 days ago</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: positive ? '#9FE1CB' : '#F09595' }}>
          {positive ? '+' : ''}{fmt(change)}
        </div>
      </div>
    </div>
  );
}

// ── Attention card ────────────────────────────────────────────────────────────

function AttentionCard({ item, onAction, onDismiss }) {
  const cfg = PRIORITY_CONFIG[item.priority];
  return (
    <div style={{
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderLeft: `4px solid ${cfg.border}`,
      borderRadius: '0 10px 10px 0',
      padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{item.title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 10 }}>{item.detail}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onAction?.(item)}
            style={{ fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8, background: 'var(--brand-primary,#2D4A35)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            {item.action}
          </button>
          {item.secondaryAction && (
            <button onClick={() => onAction?.(item, 'secondary')}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, background: 'transparent', border: '0.5px solid var(--color-border-secondary)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              {item.secondaryAction}
            </button>
          )}
          <button onClick={() => onDismiss?.(item.id)}
            style={{ marginLeft: 'auto', fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer' }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Money columns ─────────────────────────────────────────────────────────────

function MoneyColumn({ title, items, color, emptyText }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</div>
      {items.length === 0
        ? <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', padding: '12px 0' }}>{emptyText}</div>
        : items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: i < items.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.vendor ?? item.client}</div>
              <div style={{ fontSize: 11, color: item.daysUntil <= 2 ? '#A32D2D' : 'var(--color-text-tertiary)', marginTop: 2 }}>{item.dueDate}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: item.daysUntil <= 2 ? '#A32D2D' : 'var(--color-text-primary)', textAlign: 'right' }}>
              {fmt(item.amount)}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── Recent wins ───────────────────────────────────────────────────────────────

function RecentWins({ wins }) {
  if (!wins.length) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
        Recent wins
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {wins.map((win, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <span style={{ color: '#5DCAA5', fontSize: 15 }}>✓</span>
            <span style={{ flex: 1 }}>{win.text}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{win.when}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DigestPage({ onNavigate }) {
  const toast = useToast();
  const [dismissed, setDismissed] = useState(new Set());
  const [showAll,   setShowAll]   = useState(false);

  const items = SEED.needsAttention.filter(i => !dismissed.has(i.id));
  const shown = showAll ? items : items.slice(0, 3);

  function handleAction(item) {
    toast.info(`Opening ${item.title}…`);
  }

  function handleDismiss(id) {
    setDismissed(prev => new Set([...prev, id]));
    toast.success('Dismissed');
  }

  function handleNLAction(text) {
    toast.success(`Got it — working on: "${text}"`);
  }

  const outgoingTotal = SEED.upcomingBills.reduce((s, b) => s + b.amount, 0);
  const incomingTotal = SEED.moneyComingIn.reduce((s, b) => s + b.amount, 0);
  const netNext30     = incomingTotal - outgoingTotal;

  return (
    <div className="page digest-page">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em' }}>
          Good morning, {SEED.ownerName} 👋
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 3 }}>{TODAY}</div>
      </div>

      {/* Natural language bar */}
      <ActionBar onAction={handleNLAction} />

      {/* Cash strip */}
      <CashStrip balance={SEED.cashBalance} change={SEED.cashChange} />

      {/* AI insight */}
      {SEED.insight && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          background: '#EBF2E8', border: '0.5px solid #6A9A70',
          borderRadius: 10, padding: '12px 14px', marginBottom: 20, fontSize: 13,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>✨</span>
          <div style={{ flex: 1, color: '#1A3020', lineHeight: 1.5 }}>{SEED.insight.text}</div>
          <button style={{ fontSize: 12, color: 'var(--brand-primary,#2D4A35)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {SEED.insight.action} →
          </button>
        </div>
      )}

      {/* Needs attention */}
      {items.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Needs your attention
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500, background: '#FCEBEB', color: '#A32D2D', padding: '2px 8px', borderRadius: 20 }}>
              {items.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shown.map(item => (
              <AttentionCard key={item.id} item={item} onAction={handleAction} onDismiss={handleDismiss} />
            ))}
          </div>
          {items.length > 3 && (
            <button onClick={() => setShowAll(s => !s)}
              style={{ marginTop: 10, fontSize: 13, color: 'var(--brand-primary,#2D4A35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              {showAll ? 'Show less ↑' : `Show ${items.length - 3} more ↓`}
            </button>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px 20px', background: '#E1F5EE', borderRadius: 12, marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#085041', marginBottom: 4 }}>You're all caught up!</div>
          <div style={{ fontSize: 13, color: '#0F6E56' }}>Nothing urgent needs your attention right now.</div>
        </div>
      )}

      {/* Money in / out */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <MoneyColumn
          title="Money coming in"
          color="#0F6E56"
          items={SEED.moneyComingIn}
          emptyText="No outstanding invoices"
        />
        <MoneyColumn
          title="Bills coming up"
          color="#993C1D"
          items={SEED.upcomingBills}
          emptyText="No bills due soon"
        />
      </div>

      {/* 30-day net */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: 'var(--color-background-secondary)',
        borderRadius: 10, marginBottom: 20, fontSize: 13,
      }}>
        <span style={{ color: 'var(--color-text-secondary)' }}>Next 30 days — money in minus bills</span>
        <span style={{ fontWeight: 600, color: netNext30 >= 0 ? '#0F6E56' : '#A32D2D', fontSize: 15 }}>
          {netNext30 >= 0 ? '+' : ''}{fmt(netNext30)}
        </span>
      </div>

      {/* Recent wins */}
      <RecentWins wins={SEED.recentWins} />
    </div>
  );
}
