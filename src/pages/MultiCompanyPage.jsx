import { useState } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { api }      from '../lib/api';

const ROLE_COLORS = {
  owner:      { bg:'#EBF2E8', color:'var(--brand-primary,#2D4A35)' },
  admin:      { bg:'#E6F1FB', color:'#185FA5' },
  accountant: { bg:'#FAEEDA', color:'#854F0B' },
  member:     { bg:'#F1EFE8', color:'#5F5E5A' },
  viewer:     { bg:'#F1EFE8', color:'#888780' },
};
const CARD_COLORS = ['var(--brand-primary,#2D4A35)','#0F6E56','#993C1D','#185FA5','#854F0B','#5B3E8F'];

function OrgCard({ org, index, active, onSwitch }) {
  const rc    = ROLE_COLORS[org.role] ?? ROLE_COLORS.member;
  const color = CARD_COLORS[index % CARD_COLORS.length];
  return (
    <div
      onClick={() => onSwitch(org)}
      style={{
        background:'var(--color-background-primary)',
        border: active ? `2px solid ${color}` : '0.5px solid var(--color-border-tertiary)',
        borderRadius:12, padding:'18px 20px', cursor:'pointer', transition:'all 0.15s', position:'relative',
      }}
    >
      {active && <div style={{ position:'absolute', top:12, right:12, width:8, height:8, borderRadius:'50%', background:color }} />}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'#fff', fontWeight:600, flexShrink:0 }}>
          {(org.name || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{org.name}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
            <span style={{ fontSize:11, fontWeight:600, padding:'1px 7px', borderRadius:20, background:rc.bg, color:rc.color, textTransform:'capitalize' }}>{org.role || 'member'}</span>
            {org.plan && <span style={{ fontSize:11, color:'var(--color-text-tertiary)', textTransform:'capitalize' }}>{org.plan}</span>}
            <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{org.currency || 'USD'}</span>
          </div>
        </div>
        {active
          ? <span style={{ fontSize:11, fontWeight:600, color:color }}>Active</span>
          : <span style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>Switch →</span>}
      </div>
    </div>
  );
}

export default function MultiCompanyPage() {
  const { orgs, org, selectOrg, refreshMe } = useAuth();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name:'', currency:'USD' });
  const [creating, setCreating] = useState(false);

  const list = orgs || [];

  function handleSwitch(selected) {
    if (selected.id === org?.id) return;
    selectOrg(selected);
    toast.success(`Switched to ${selected.name}`);
  }

  async function handleCreate() {
    const name = newForm.name.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await api.post('/companies', { name, currency: newForm.currency });
      const created = res?.data;
      await refreshMe();                 // pull the new company into the list
      if (created?.id) selectOrg(created); // make it the active company
      setShowNew(false);
      setNewForm({ name:'', currency:'USD' });
      toast.success(`${name} created — you're now in it.`);
    } catch (e) {
      toast.error(e.message || 'Could not create the company.');
    }
    setCreating(false);
  }

  return (
    <div className="page multicompany-page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">My companies</h1>
          <p style={{ color:'var(--color-text-secondary)', fontSize:13, marginTop:2 }}>
            Each company keeps its own books and bank connections. Click one to switch, or add a new business.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowNew(s => !s)}>
          <i className="ti ti-plus" /> Add company
        </button>
      </div>

      {showNew && (
        <div className="card" style={{ marginBottom:16, padding:'20px' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>New company</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
            <div className="form-field" style={{ flex:2, minWidth:180 }}>
              <label>Company name</label>
              <input value={newForm.name} autoFocus
                onChange={e => setNewForm(f => ({ ...f, name:e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                placeholder="e.g. Diehl Rentals LLC" />
            </div>
            <div className="form-field" style={{ flex:1, minWidth:120 }}>
              <label>Currency</label>
              <select value={newForm.currency} onChange={e => setNewForm(f => ({ ...f, currency:e.target.value }))}>
                {['USD','EUR','GBP','CAD','AUD'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !newForm.name.trim()}>
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button className="btn-secondary" onClick={() => setShowNew(false)} disabled={creating}>Cancel</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card" style={{ padding:40, textAlign:'center' }}>
          <p style={{ fontSize:14, color:'var(--color-text-secondary)' }}>No companies yet. Click “Add company” to create your first one.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12 }}>
          {list.map((o, i) => (
            <OrgCard key={o.id} org={o} index={i} active={o.id === org?.id} onSwitch={handleSwitch} />
          ))}
        </div>
      )}
    </div>
  );
}
