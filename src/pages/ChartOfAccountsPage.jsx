import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

const TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const EMPTY_FORM = { code: '', name: '', type: 'Expense', subtype: '' };

export default function ChartOfAccountsPage() {
  const { orgId, token } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts`, { headers });
      const j = await r.json();
      setAccounts(j.data || []);
    } catch (e) { setMsg('Could not load accounts.'); }
    setLoading(false);
  }
  useEffect(() => { if (orgId) load(); }, [orgId]);

  async function seedDefaults() {
    setSeeding(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts/seed`, { method: 'POST', headers });
      const j = await r.json();
      if (j.success) { setAccounts(j.data.accounts || []); setMsg(`Added ${j.data.created} standard accounts.`); }
      else setMsg(j.message || 'Could not set up accounts.');
    } catch (e) { setMsg('Could not set up accounts.'); }
    setSeeding(false);
  }

  function openNew()  { setEditingId(null); setForm(EMPTY_FORM); setMsg(''); setShowForm(true); }
  function openEdit(a){ setEditingId(a.id); setForm({ code: a.code, name: a.name, type: a.type, subtype: a.subtype || '' }); setMsg(''); setShowForm(true); }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) { setMsg('Code and name are required.'); return; }
    setSaving(true); setMsg('');
    try {
      const url    = editingId ? `${API}/orgs/${orgId}/accounts/${editingId}` : `${API}/orgs/${orgId}/accounts`;
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.success) { setShowForm(false); await load(); }
      else setMsg(j.message || 'Could not save the account.');
    } catch (e) { setMsg('Could not save the account.'); }
    setSaving(false);
  }

  async function del() {
    if (!editingId) return;
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    setSaving(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts/${editingId}`, { method: 'DELETE', headers });
      const j = await r.json();
      if (j.success) { setShowForm(false); await load(); }
      else setMsg(j.message || 'Could not delete the account.');
    } catch (e) { setMsg('Could not delete the account.'); }
    setSaving(false);
  }

  const normalBalanceFor = (type) => (type === 'Asset' || type === 'Expense') ? 'Dr' : 'Cr';
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">Chart of Accounts</h1>
          <p style={{ color:'var(--color-text-secondary)', fontSize:13, marginTop:2 }}>
            The list of accounts your bookkeeping is organized into.
          </p>
        </div>
        {accounts.length > 0 && (
          <button className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }} onClick={openNew}>
            <span>+</span> New account
          </button>
        )}
      </div>

      {msg && (
        <div style={{ margin:'12px 0', fontSize:13, color:'var(--brand-primary)' }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--color-text-secondary)' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        // Empty state → offer to seed a standard chart.
        <div className="card" style={{ padding:40, marginTop:20, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📇</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Set up your chart of accounts</p>
          <p style={{ fontSize:13, color:'var(--color-text-secondary)', maxWidth:440, margin:'0 auto 20px' }}>
            Start with a standard small-business chart of accounts — assets, liabilities, equity,
            income, and expenses — then rename or add accounts to fit your business.
          </p>
          <button className="btn-primary" onClick={seedDefaults} disabled={seeding}>
            {seeding ? 'Setting up…' : 'Set up standard accounts'}
          </button>
          <div style={{ marginTop:14 }}>
            <button onClick={openNew}
              style={{ background:'none', border:'none', color:'var(--color-text-secondary)', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>
              or add accounts one at a time
            </button>
          </div>
        </div>
      ) : (
        // Accounts grouped by type.
        TYPES.filter(type => accounts.some(a => a.type === type)).map(type => (
          <div key={type} style={{ marginTop:20 }}>
            <h2 style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
              {type}
            </h2>
            <div className="card" style={{ overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--color-border, #D4DDCC)' }}>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Subtype</th>
                    <th style={{ ...thStyle, textAlign:'center' }}>Normal</th>
                    <th style={{ ...thStyle, textAlign:'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.filter(a => a.type === type).map(a => (
                    <tr key={a.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary, #EBF2E8)' }}>
                      <td style={{ ...tdStyle, fontFamily:'monospace', color:'var(--color-text-secondary)' }}>{a.code}</td>
                      <td style={{ ...tdStyle, fontWeight:500 }}>
                        {a.name}
                        {a.isSystem && <span style={badge}>standard</span>}
                      </td>
                      <td style={{ ...tdStyle, color:'var(--color-text-secondary)' }}>{a.subtype || '—'}</td>
                      <td style={{ ...tdStyle, textAlign:'center', color:'var(--color-text-secondary)' }}>{normalBalanceFor(a.type)}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>
                        <button onClick={() => openEdit(a)}
                          style={{ background:'none', border:'none', color:'var(--brand-primary)', cursor:'pointer', fontSize:12 }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* New / edit account modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:17, fontWeight:600 }}>{editingId ? 'Edit account' : 'New account'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--color-text-secondary)' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12 }}>
                <Field label="Code">
                  <input style={input} value={form.code} onChange={set('code')} placeholder="6050" />
                </Field>
                <Field label="Name">
                  <input style={input} value={form.name} onChange={set('name')} placeholder="Office Supplies" />
                </Field>
              </div>
              <Field label="Type">
                <select style={input} value={form.type} onChange={set('type')}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:4 }}>
                  Normal balance: {normalBalanceFor(form.type) === 'Dr' ? 'Debit' : 'Credit'} (set automatically from the type)
                </div>
              </Field>
              <Field label="Subtype (optional)">
                <input style={input} value={form.subtype} onChange={set('subtype')} placeholder="Expense" />
              </Field>
              {msg && <div style={{ fontSize:12, color:'#B4472D' }}>{msg}</div>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                <div>
                  {editingId && (
                    <button onClick={del} disabled={saving}
                      style={{ background:'none', border:'none', color:'#B4472D', cursor:'pointer', fontSize:13 }}>
                      Delete account
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
                  <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle = { padding:'10px 16px', textAlign:'left', fontWeight:500, color:'var(--color-text-secondary)', fontSize:12 };
const tdStyle = { padding:'10px 16px' };
const badge   = { marginLeft:8, fontSize:10, padding:'1px 6px', borderRadius:6, background:'var(--brand-accent-light, #EBF2E8)', color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.04em' };
const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 };
const modal   = { background:'var(--color-background-primary, #fff)', borderRadius:14, padding:24, width:480, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,0.18)' };
const input   = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', fontSize:14, background:'var(--color-background-primary, #fff)', color:'var(--color-text-primary)' };
const btnGhost = { padding:'8px 16px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, cursor:'pointer' };
