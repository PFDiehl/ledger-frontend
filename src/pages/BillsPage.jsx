import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const BILL_CATEGORIES = [
  'Rent & Lease', 'Utilities', 'Insurance', 'Loan Payment',
  'Supplier Invoice', 'Equipment Lease', 'Professional Services',
  'Payroll', 'Taxes', 'Software & Subscriptions', 'Other'
];

// Money helpers: show $#,###.## but store a clean number the API can read.
const money2 = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const parseMoney = v => Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0;

// Amount field with a $ prefix that formats to cents on blur.
function MoneyInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? (value ?? '') : (value === '' || value == null ? '' : money2(parseMoney(value)));
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A9A7A', fontSize: 13, pointerEvents: 'none' }}>$</span>
      <input inputMode="decimal" value={display} placeholder={placeholder || '0.00'}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px 9px 24px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}

// Type-to-search category picker. options = [{id,code,name}] or plain strings.
function CategorySearch({ value, options, onPick }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const norm = (options || []).map(o => typeof o === 'string' ? { id: o, code: '', name: o } : o);
  const ql = q.trim().toLowerCase();
  const filtered = ql ? norm.filter(o => (o.name || '').toLowerCase().includes(ql) || String(o.code || '').toLowerCase().includes(ql)) : norm;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={open ? q : (value || '')} placeholder="Type to search a category…"
        onFocus={() => { setOpen(true); setQ(''); }}
        onChange={e => { setQ(e.target.value); setOpen(true); }}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' }} />
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #D4DDCC', borderRadius: 8, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '9px 12px', fontSize: 13, color: '#9BB39B' }}>No match</div>
          ) : filtered.map(o => (
            <div key={o.id} onMouseDown={() => { onPick(o.name); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = '#F2F7F0'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: '#2C3E52' }}>
              {o.code ? o.code + ' · ' : ''}{o.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BillsPage({ presetVendor } = {}) {
  const { org } = useAuth();
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [form, setForm] = useState({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'', projectId:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    api.get(`/orgs/${org.id}/bills`)
      .then(r => { setBills(r.data?.data || r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
    api.get(`/orgs/${org.id}/contacts`, { type: 'Vendor' })
      .then(r => setVendors(r.data?.data || r.data || []))
      .catch(() => {});
    api.get(`/orgs/${org.id}/accounts`)
      .then(r => setAccounts(r.data?.data || r.data || []))
      .catch(() => {});
    api.get(`/orgs/${org.id}/projects`, { status: 'active' })
      .then(r => setProjects(r.data?.data || r.data || []))
      .catch(() => {});
  }, [org?.id]);

  // "New Bill" from a vendor opens the form pre-filled for them.
  useEffect(() => {
    if (presetVendor) {
      setForm({ vendor: presetVendor.company || presetVendor.name || '', amount:'', dueDate:'', description:'', category:'', paidDate:'', projectId:'' });
      setShowForm(true);
    }
  }, [presetVendor]);

  async function save() {
    if (!form.vendor || !form.amount) return alert('Please fill in vendor and amount');
    setSaving(true);
    try {
      const payload = { ...form, amount: parseMoney(form.amount) };
      if (editingId) {
        const r = await api.patch(`/orgs/${org.id}/bills/${editingId}`, payload);
        const updated = r.data?.data || r.data;   // api returns the body; payload is r.data
        if (updated) setBills(prev => prev.map(b => b.id === editingId ? updated : b));
      } else {
        const r = await api.post(`/orgs/${org.id}/bills`, payload);
        const created = r.data?.data || r.data;
        if (created) setBills(prev => [created, ...prev]);
      }
      closeForm();
    } catch(e) { const m=(e?.message||'').trim(); alert('Error saving bill:\n\n' + (m.split('\n').map(s=>s.trim()).filter(Boolean).pop() || 'please try again')); }
    finally { setSaving(false); }
  }

  function openNew() {
    setEditingId(null);
    setEditingStatus(null);
    setForm({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'', projectId:'' });
    setShowForm(true);
  }

  function openEdit(b) {
    setEditingId(b.id);
    setEditingStatus(b.status);
    setForm({
      vendor: b.vendor || '',
      amount: b.amount != null ? String(b.amount) : '',
      dueDate: b.dueDate ? new Date(b.dueDate).toISOString().slice(0,10) : '',
      description: b.description || '',
      category: b.category || '',
      paidDate: b.paidDate ? new Date(b.paidDate).toISOString().slice(0,10) : '',
      projectId: b.projectId || '',
    });
    setSelected(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setEditingStatus(null);
    setForm({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'', projectId:'' });
  }

  async function deleteBill(id) {
    if (!window.confirm('Delete this bill?')) return;
    try {
      await api.delete(`/orgs/${org.id}/bills/${id}`);
      setBills(prev => prev.filter(b => b.id !== id));
      setSelected(null);
    } catch(e) { alert('Error deleting bill'); }
  }

  async function markPaid(id) {
    try {
      const r = await api.patch(`/orgs/${org.id}/bills/${id}`, { status: 'paid' });
      const updated = r.data?.data || r.data;   // api returns the body; payload is r.data
      if (updated) setBills(prev => prev.map(b => b.id === id ? updated : b));
      setSelected(null);
    } catch(e) { alert('Error updating bill'); }
  }

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n||0); }

  const statusColor = (s) => {
    if (s === 'paid') return { background:'#EBF2E8', color:'#2D7A4A' };
    if (s === 'overdue') return { background:'#FDE8E8', color:'#c0392b' };
    return { background:'#FAEEDA', color:'#854F0B' };
  };

  // Categories come from the Chart of Accounts (expense accounts), sorted by code.
  const expenseAccounts = accounts
    .filter(a => a.type === 'Expense')
    .sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Bills</h1>
        <button className="btn-primary" onClick={openNew}>+ New bill</button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#7A9A7A'}}>Loading...</div>
      ) : bills.length === 0 ? (
        <div className="card" style={{padding:40,marginTop:20,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>🧾</div>
          <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No bills yet</p>
          <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>Track bills from vendors to stay on top of what you owe.</p>
          <button className="btn-primary" onClick={openNew}>Add bill</button>
        </div>
      ) : (
        <div className="card" style={{marginTop:20,overflowX:'auto'}}>
          <table style={{width:'100%',minWidth:620,borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid #D4DDCC'}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Vendor</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Category</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Due Date</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => (
                <tr key={b.id} style={{borderBottom:'0.5px solid #EBF2E8',cursor:'pointer'}}
                  onClick={()=>setSelected(b)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fbf8'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{b.vendor}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{b.category||'-'}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(b.amount)}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,textTransform:'capitalize',...statusColor(b.status)}}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:480,maxWidth:'90vw'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>{selected.vendor}</h2>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Category: </span><span style={{fontSize:13}}>{selected.category||'-'}</span></div>
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Amount: </span><span style={{fontSize:18,fontWeight:700,color:'#c0392b'}}>{fmt(selected.amount)}</span></div>
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Status: </span><span style={{fontSize:13,textTransform:'capitalize'}}>{selected.status}</span></div>
            {selected.status === 'paid' && selected.paidDate && <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Paid: </span><span style={{fontSize:13}}>{new Date(selected.paidDate).toLocaleDateString()}</span></div>}
            {selected.dueDate && <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Due: </span><span style={{fontSize:13}}>{new Date(selected.dueDate).toLocaleDateString()}</span></div>}
            {selected.description && <div style={{marginBottom:20}}><span style={{color:'#7A9A7A',fontSize:13}}>Description: </span><span style={{fontSize:13}}>{selected.description}</span></div>}
            <div style={{display:'flex',gap:10,marginTop:20}}>
              {selected.status !== 'paid' && (
                <button onClick={()=>markPaid(selected.id)} style={{flex:1,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',cursor:'pointer',fontSize:14,fontWeight:600}}>Mark as Paid</button>
              )}
              <button onClick={()=>openEdit(selected)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #2D4A35',background:'#fff',color:'#2D4A35',cursor:'pointer',fontSize:14,fontWeight:600}}>Edit</button>
              <button onClick={()=>deleteBill(selected.id)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #c0392b',background:'#fff',color:'#c0392b',cursor:'pointer',fontSize:14,fontWeight:600}}>Delete</button>
              <button onClick={()=>setSelected(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',cursor:'pointer',fontSize:14}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:440,maxWidth:'90vw'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>{editingId ? 'Edit Bill' : 'New Bill'}</h2>
              <button onClick={closeForm} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>VENDOR</label>
                <input list="bill-vendor-list" value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder='Start typing a vendor…' autoComplete="off" style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
                <datalist id="bill-vendor-list">{vendors.map(v => <option key={v.id} value={v.company || v.name} />)}</datalist>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>CATEGORY</label>
                <CategorySearch value={form.category} options={expenseAccounts.length ? expenseAccounts : BILL_CATEGORIES} onPick={name => setForm(f=>({...f, category:name}))} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>AMOUNT</label>
                <MoneyInput value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder='0.00' />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DUE DATE</label>
                <input type='date' value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
              </div>
              {editingId && editingStatus === 'paid' && (
                <div>
                  <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>PAID DATE <span style={{fontWeight:400,textTransform:'none',color:'#9BB39B'}}>(when it was paid)</span></label>
                  <input type='date' value={form.paidDate} onChange={e=>setForm(f=>({...f,paidDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
                </div>
              )}
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DESCRIPTION</label>
                <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Monthly rent' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
              </div>
              {projects.length > 0 && (
                <div>
                  <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>JOB <span style={{fontWeight:400,textTransform:'none',color:'#9BB39B'}}>(optional)</span></label>
                  <select value={form.projectId} onChange={e=>setForm(f=>({...f,projectId:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box',background:'#fff'}}>
                    <option value="">— No job —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ' · ' + p.code : ''}</option>)}
                  </select>
                </div>
              )}
              <div style={{display:'flex',gap:10}}>
                <button onClick={closeForm} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,fontWeight:500,cursor:'pointer'}}>{saving?'Saving...':(editingId?'Save changes':'Save bill')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}