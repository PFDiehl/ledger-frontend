import { useState } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { fmt } from '../lib/utils';

const SEED_ORGS = [
  { id:'org1', name:'Acme Co.',         role:'owner',     plan:'professional', currency:'USD', invoicesThisMonth:23, revenue:48200,  expenses:31450, cashBalance:33440, overdueInvoices:3, color:'var(--brand-primary,#2D4A35)' },
  { id:'org2', name:'Smith Consulting', role:'accountant', plan:'starter',      currency:'USD', invoicesThisMonth:8,  revenue:12800,  expenses:9200,  cashBalance:11250, overdueInvoices:1, color:'#0F6E56' },
  { id:'org3', name:'West Side Bakery', role:'owner',     plan:'starter',      currency:'USD', invoicesThisMonth:4,  revenue:6400,   expenses:5100,  cashBalance:4820,  overdueInvoices:0, color:'#993C1D' },
];

const ROLE_COLORS = {
  owner:      { bg:'#EBF2E8', color:'var(--brand-primary,#2D4A35)' },
  admin:      { bg:'#E6F1FB', color:'#185FA5' },
  accountant: { bg:'#FAEEDA', color:'#854F0B' },
  member:     { bg:'#F1EFE8', color:'#5F5E5A' },
  viewer:     { bg:'#F1EFE8', color:'#888780' },
};

function OrgCard({ org, active, onSwitch }) {
  const rc = ROLE_COLORS[org.role] ?? ROLE_COLORS.member;
  const netProfit = org.revenue - org.expenses;
  const margin    = org.revenue > 0 ? Math.round((netProfit / org.revenue) * 100) : 0;

  return (
    <div
      onClick={() => onSwitch(org)}
      style={{
        background: 'var(--color-background-primary)',
        border: active ? `2px solid ${org.color}` : '0.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {active && (
        <div style={{ position:'absolute', top:12, right:12, width:8, height:8, borderRadius:'50%', background:org.color }} />
      )}

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:org.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:600, flexShrink:0 }}>
          {org.name.charAt(0)}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{org.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
            <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:rc.bg, color:rc.color, textTransform:'capitalize' }}>{org.role}</span>
            <span style={{ fontSize:11, color:'var(--color-text-tertiary)', textTransform:'capitalize' }}>{org.plan}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12 }}>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Revenue</div>
          <div style={{ fontWeight:500 }}>{fmt(org.revenue)}</div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Net profit</div>
          <div style={{ fontWeight:500, color: netProfit >= 0 ? '#0F6E56' : '#A32D2D' }}>
            {fmt(netProfit)} <span style={{ fontSize:10, color:'var(--color-text-tertiary)' }}>({margin}%)</span>
          </div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Cash</div>
          <div style={{ fontWeight:500 }}>{fmt(org.cashBalance)}</div>
        </div>
        <div>
          <div style={{ color:'var(--color-text-tertiary)', marginBottom:2 }}>Overdue</div>
          <div style={{ fontWeight:500, color: org.overdueInvoices > 0 ? '#A32D2D' : 'var(--color-text-secondary)' }}>
            {org.overdueInvoices} invoice{org.overdueInvoices !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsolidatedSummary({ orgs }) {
  const totalRevenue  = orgs.reduce((s, o) => s + o.revenue,  0);
  const totalExpenses = orgs.reduce((s, o) => s + o.expenses, 0);
  const totalCash     = orgs.reduce((s, o) => s + o.cashBalance, 0);
  const totalOverdue  = orgs.reduce((s, o) => s + o.overdueInvoices, 0);
  const netProfit     = totalRevenue - totalExpenses;

  return (
    <div className="card" style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <i className="ti ti-building" style={{ fontSize:15, color:'var(--brand-primary,#2D4A35)' }} />
        <span className="card-title">Consolidated — {orgs.length} companies</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:10 }}>
        {[
          { label:'Total revenue',   value:fmt(totalRevenue),  color:'var(--color-text-primary)' },
          { label:'Total expenses',  value:fmt(totalExpenses), color:'var(--color-text-primary)' },
          { label:'Combined profit', value:fmt(netProfit),     color: netProfit >= 0 ? '#0F6E56' : '#A32D2D' },
          { label:'Total cash',      value:fmt(totalCash),     color:'var(--color-text-primary)' },
        ].map(item => (
          <div key={item.label} style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'12px 14px' }}>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginBottom:5 }}>{item.label}</div>
            <div style={{ fontSize:17, fontWeight:500, color:item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
      {totalOverdue > 0 && (
        <div style={{ marginTop:12, fontSize:12, color:'#A32D2D', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-alert-circle" style={{ fontSize:14 }} />
          {totalOverdue} overdue invoice{totalOverdue !== 1 ? 's' : ''} across your companies require attention.
        </div>
      )}
    </div>
  );
}

export default function MultiCompanyPage({ onSwitchOrg }) {
  const { org }   = useAuth();
  const toast     = useToast();
  const [orgs, setOrgs] = useState(SEED_ORGS);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name:'', currency:'USD', industry:'' });

  function handleSwitch(selectedOrg) {
    if (selectedOrg.id === org?.id) return;
    toast.info(`Switching to ${selectedOrg.name}…`);
    onSwitchOrg?.(selectedOrg);
  }

  function handleCreate() {
    if (!newForm.name) return;
    const newOrg = {
      id:       `org-${Date.now()}`,
      name:      newForm.name,
      role:      'owner',
      plan:      'starter',
      currency:  newForm.currency,
      invoicesThisMonth: 0,
      revenue:   0,
      expenses:  0,
      cashBalance: 0,
      overdueInvoices: 0,
      color:     ['var(--brand-primary,#2D4A35)','#0F6E56','#993C1D','#185FA5','#854F0B'][orgs.length % 5],
    };
    setOrgs(prev => [...prev, newOrg]);
    setShowNew(false);
    setNewForm({ name:'', currency:'USD', industry:'' });
    toast.success(`${newForm.name} created`);
  }

  return (
    <div className="page multicompany-page">
      <div className="page-header">
        <h1 className="page-title">My companies</h1>
        <button className="btn-primary" onClick={() => setShowNew(s => !s)}>
          <i className="ti ti-plus" /> Add company
        </button>
      </div>

      <ConsolidatedSummary orgs={orgs} />

      {showNew && (
        <div className="card" style={{ marginBottom:16, padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>New company</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div className="form-field" style={{ flex:2, minWidth:160 }}>
              <label>Company name</label>
              <input value={newForm.name} onChange={e => setNewForm(f=>({...f,name:e.target.value}))} placeholder="Acme Inc." />
            </div>
            <div className="form-field" style={{ flex:1, minWidth:120 }}>
              <label>Currency</label>
              <select value={newForm.currency} onChange={e => setNewForm(f=>({...f,currency:e.target.value}))}>
                {['USD','EUR','GBP','CAD','AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={handleCreate}>Create</button>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12 }}>
        {orgs.map(o => (
          <OrgCard key={o.id} org={o} active={o.id === org?.id} onSwitch={handleSwitch} />
        ))}
      </div>
    </div>
  );
}
