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

function OrgCard({ org, index, active, onSwitch, onDelete }) {
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
      {org.role === 'owner' && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:'0.5px solid var(--color-border-tertiary)', textAlign:'right' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(org); }}
            style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:12, display:'inline-flex', alignItems:'center', gap:4 }}
            title="Delete this company">
            <i className="ti ti-trash" style={{ fontSize:13 }} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function MultiCompanyPage() {
  const { orgs, org, selectOrg, refreshMe } = useAuth();
  const toast = useToast();
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ name:'', currency:'USD' });
  const [creating, setCreating] = useState(false);
  const [deleteFor, setDeleteFor] = useState(null);   // company pending deletion
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const list = orgs || [];

  function openDelete(o) { setDeleteFor(o); setConfirmText(''); }
  function cancelDelete() { if (deleting) return; setDeleteFor(null); setConfirmText(''); }

  async function confirmDelete() {
    const target = deleteFor;
    if (!target || confirmText.trim() !== target.name) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${target.id}?confirmName=${encodeURIComponent(target.name)}`);
      const remaining = (orgs || []).filter(o => o.id !== target.id);
      await refreshMe();
      if (org?.id === target.id && remaining[0]) selectOrg(remaining[0]);
      toast.success(`${target.name} deleted.`);
      setDeleteFor(null); setConfirmText('');
    } catch (e) {
      toast.error(e.message || 'Could not delete the company.');
    }
    setDeleting(false);
  }

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
            <OrgCard key={o.id} org={o} index={i} active={o.id === org?.id} onSwitch={handleSwitch} onDelete={openDelete} />
          ))}
        </div>
      )}

      {deleteFor && (
        <div onClick={cancelDelete}
          style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ maxWidth:460, width:'100%', padding:24 }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8, color:'#B4482F' }}>Delete “{deleteFor.name}”?</div>
            <p style={{ fontSize:13, color:'var(--color-text-secondary)', lineHeight:1.5, marginBottom:14 }}>
              This permanently deletes this company and <strong>all of its books</strong> — transactions, invoices, bills, reports, and bank connections. This cannot be undone.
            </p>
            <label style={{ fontSize:12, color:'var(--color-text-secondary)' }}>Type <strong>{deleteFor.name}</strong> to confirm</label>
            <input autoFocus value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={deleteFor.name}
              onKeyDown={e => { if (e.key === 'Enter') confirmDelete(); }}
              style={{ width:'100%', marginTop:6, marginBottom:16 }} />
            <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button className="btn-secondary" onClick={cancelDelete} disabled={deleting}>Cancel</button>
              <button onClick={confirmDelete} disabled={deleting || confirmText.trim() !== deleteFor.name}
                style={{ background:'#B4482F', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontWeight:600,
                  cursor: (confirmText.trim() === deleteFor.name && !deleting) ? 'pointer' : 'not-allowed',
                  opacity: (confirmText.trim() === deleteFor.name && !deleting) ? 1 : 0.6 }}>
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
