import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

const BILL_CATEGORIES = [
  'Rent & Lease', 'Utilities', 'Insurance', 'Loan Payment',
  'Supplier Invoice', 'Equipment Lease', 'Professional Services',
  'Payroll', 'Taxes', 'Software & Subscriptions', 'Other'
];

export default function BillsPage({ presetVendor } = {}) {
  const { org } = useAuth();
  const [bills, setBills] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [form, setForm] = useState({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'' });
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
  }, [org?.id]);

  // "New Bill" from a vendor opens the form pre-filled for them.
  useEffect(() => {
    if (presetVendor) {
      setForm({ vendor: presetVendor.company || presetVendor.name || '', amount:'', dueDate:'', description:'', category:'' });
      setShowForm(true);
    }
  }, [presetVendor]);

  async function save() {
    if (!form.vendor || !form.amount) return alert('Please fill in vendor and amount');
    setSaving(true);
    try {
      if (editingId) {
        const r = await api.patch(`/orgs/${org.id}/bills/${editingId}`, form);
        const updated = r.data?.data || r.data;   // api returns the body; payload is r.data
        if (updated) setBills(prev => prev.map(b => b.id === editingId ? updated : b));
      } else {
        const r = await api.post(`/orgs/${org.id}/bills`, form);
        const created = r.data?.data || r.data;
        if (created) setBills(prev => [created, ...prev]);
      }
      closeForm();
    } catch(e) { alert('Error saving bill'); }
    finally { setSaving(false); }
  }

  function openNew() {
    setEditingId(null);
    setEditingStatus(null);
    setForm({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'' });
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
    });
    setSelected(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setEditingStatus(null);
    setForm({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'' });
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
        <div className="card" style={{marginTop:20,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
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
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}}>
                  <option value="">Select category…</option>
                  {expenseAccounts.length
                    ? expenseAccounts.map(a => <option key={a.id} value={a.name}>{a.code} · {a.name}</option>)
                    : BILL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  {form.category && !expenseAccounts.some(a => a.name === form.category) && !BILL_CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>AMOUNT ($)</label>
                <input type='number' value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder='0.00' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
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