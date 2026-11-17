import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { MoneyInput, SearchSelect, parseMoney } from '../components/FormFields';

const BILL_CATEGORIES = [
  'Rent & Lease', 'Utilities', 'Insurance', 'Loan Payment',
  'Supplier Invoice', 'Equipment Lease', 'Professional Services',
  'Payroll', 'Taxes', 'Software & Subscriptions', 'Other'
];

export default function BillsPage({ presetVendor, autoNew } = {}) {
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
  const [editingPayCount, setEditingPayCount] = useState(0);
  const [form, setForm] = useState({ vendor:'', amount:'', dueDate:'', description:'', category:'', paidDate:'', projectId:'' });
  const [saving, setSaving] = useState(false);
  // Payment being recorded against the open bill (the amount can be less than the balance).
  const [pay, setPay] = useState({ amount:'', date:'', note:'' });
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState('');
  // The payment box is open when a bill is first opened. Once a payment is recorded
  // or removed it closes and a confirmation shows instead, so a stray second click
  // can't record another payment. `notice` holds that confirmation.
  const [showPayForm, setShowPayForm] = useState(true);
  const [notice, setNotice] = useState('');
  // For a moment after a payment is recorded or removed, the bill window ignores
  // clicks. The buttons move when the payment box closes, and the second click of a
  // double-click must not land on whatever is now under the pointer.
  const [settling, setSettling] = useState(false);
  const settleTimer = useRef(null);
  useEffect(() => () => clearTimeout(settleTimer.current), []);

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

  // Open the New Bill form immediately when launched via the keyboard shortcut.
  useEffect(() => { if (autoNew) openNew(); }, [autoNew]);

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
    setEditingPayCount((b.payments || []).length);
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

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n||0); }
  // Today's date on this computer's calendar, as YYYY-MM-DD for a date field.
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  // Show a payment date as the calendar day that was entered. A date picked in a
  // date field is stored as midnight UTC, which would display as the day before in
  // US time zones if shown in local time.
  const showDate = (v) => {
    const d = new Date(v);
    if (!v || isNaN(d)) return '-';
    const dateOnly = d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
    return d.toLocaleDateString(undefined, dateOnly ? { timeZone: 'UTC' } : undefined);
  };

  // What is still owed on a bill, and what has been paid so far. The server sends
  // both; the fallbacks cover a server that hasn't been updated yet.
  const balanceOf = (b) => b.balance != null ? Number(b.balance) : (b.status === 'paid' ? 0 : Number(b.amount || 0));
  const paidOf    = (b) => b.amountPaid != null ? Number(b.amountPaid) : (b.status === 'paid' ? Number(b.amount || 0) : 0);

  // Open a bill, with the payment form ready to pay off whatever is still owed.
  function openBill(b) {
    const bal = balanceOf(b);
    setSelected(b);
    setPay({ amount: bal > 0 ? bal.toFixed(2) : '', date: todayStr(), note: '' });
    setPayMsg('');
    setShowPayForm(true);
    setNotice('');
  }

  // After a payment is added or removed: refresh the row, keep the bill open, close
  // the payment box and say what just happened.
  function applyUpdated(updated, message) {
    setBills(prev => prev.map(b => b.id === updated.id ? updated : b));
    openBill(updated);
    setShowPayForm(false);
    setNotice(message || '');
    setSettling(true);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettling(false), 700);
  }

  // Record a payment against the open bill. Any amount up to the balance is allowed,
  // so a bill can be paid in parts.
  async function recordPayment() {
    if (!selected) return;
    // Read the amount strictly. A slip such as typing extra digits after the amount
    // that was filled in ("1000.00400") must be refused, never quietly rounded into
    // a payment of the full balance.
    const raw = String(pay.amount ?? '').replace(/[$,\s]/g, '');
    if (!raw) { setPayMsg('Enter a payment amount.'); return; }
    if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(raw)) { setPayMsg('Enter the amount in dollars and cents, for example 400.00.'); return; }
    const amount = Math.round(Number(raw) * 100) / 100;
    const bal = balanceOf(selected);
    if (!(amount > 0)) { setPayMsg('Enter a payment amount greater than zero.'); return; }
    if (amount > bal + 0.005) { setPayMsg(`That is more than the ${fmt(bal)} still owed on this bill.`); return; }
    setPaying(true); setPayMsg('');
    try {
      let r;
      try {
        r = await api.post(`/orgs/${org.id}/bills/${selected.id}/payments`, { amount, date: pay.date || undefined, note: pay.note || undefined });
      } catch (e) {
        // If the server can't take part payments yet, paying the whole balance still
        // works through the original "mark as paid" route. Real refusals (a bad
        // amount, a closed period) are shown as they are.
        const payingInFull = Math.abs(amount - bal) < 0.005;
        if (payingInFull && e?.status !== 400 && e?.status !== 423) {
          r = await api.patch(`/orgs/${org.id}/bills/${selected.id}`, { status: 'paid', paidDate: pay.date || undefined });
        } else if (e?.status === 404 || e instanceof SyntaxError) {
          throw new Error('Part payments are not available on the server yet. Try again once the server update has finished.');
        } else throw e;
      }
      const updated = r?.data?.data || r?.data;   // api returns the body; payload is r.data
      if (updated) {
        const left = balanceOf(updated);
        applyUpdated(updated, left > 0
          ? `Payment of ${fmt(amount)} recorded. ${fmt(left)} still owed.`
          : `Payment of ${fmt(amount)} recorded. This bill is now paid in full.`);
      }
    } catch (e) { setPayMsg((e?.message || '').trim() || 'The payment could not be recorded. Please try again.'); }
    finally { setPaying(false); }
  }

  // Remove one payment (to fix a mistake). The bill shows that amount as owed again.
  async function removePayment(p) {
    if (!selected) return;
    if (!window.confirm(`Remove the ${fmt(p.amount)} payment? The bill will show that amount as owed again.`)) return;
    setPayMsg('');
    try {
      const r = await api.delete(`/orgs/${org.id}/bills/${selected.id}/payments/${p.id || 'legacy'}`);
      const updated = r?.data?.data || r?.data;
      if (updated) applyUpdated(updated, `Payment of ${fmt(p.amount)} removed. ${fmt(balanceOf(updated))} still owed.`);
    } catch (e) { setPayMsg((e?.message || '').trim() || 'The payment could not be removed. Please try again.'); }
  }

  const statusColor = (s) => {
    if (s === 'paid') return { background:'#EBF2E8', color:'#2D7A4A' };
    if (s === 'partial') return { background:'#E9F1F9', color:'#185FA5' };
    if (s === 'overdue') return { background:'#FDE8E8', color:'#c0392b' };
    return { background:'#FAEEDA', color:'#854F0B' };
  };
  const statusLabel = (s) => s === 'partial' ? 'Part paid' : s;

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
          <table style={{width:'100%',minWidth:720,borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid #D4DDCC'}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Vendor</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Category</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Due Date</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Balance</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => (
                <tr key={b.id} style={{borderBottom:'0.5px solid #EBF2E8',cursor:'pointer'}}
                  onClick={()=>openBill(b)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fbf8'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{b.vendor}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{b.category||'-'}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(b.amount)}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500,color:balanceOf(b) > 0 ? '#c0392b' : '#7A9A7A'}}>{fmt(balanceOf(b))}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,textTransform:'capitalize',whiteSpace:'nowrap',...statusColor(b.status)}}>
                      {statusLabel(b.status)}
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
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,maxWidth:'92vw',maxHeight:'90vh',overflowY:'auto',boxSizing:'border-box',pointerEvents:settling?'none':'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>{selected.vendor}</h2>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Category: </span><span style={{fontSize:13}}>{selected.category||'-'}</span></div>
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Amount: </span><span style={{fontSize:18,fontWeight:700,color:'#c0392b'}}>{fmt(selected.amount)}</span></div>
            {paidOf(selected) > 0 && (
              <div style={{marginBottom:12,display:'flex',gap:22,flexWrap:'wrap'}}>
                <span><span style={{color:'#7A9A7A',fontSize:13}}>Paid so far: </span><span style={{fontSize:13,fontWeight:600,color:'#2D7A4A'}}>{fmt(paidOf(selected))}</span></span>
                <span><span style={{color:'#7A9A7A',fontSize:13}}>Still owed: </span><span style={{fontSize:13,fontWeight:600,color:balanceOf(selected) > 0 ? '#c0392b' : '#2D7A4A'}}>{fmt(balanceOf(selected))}</span></span>
              </div>
            )}
            <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Status: </span><span style={{fontSize:13,textTransform:'capitalize'}}>{statusLabel(selected.status)}</span></div>
            {selected.status === 'paid' && selected.paidDate && <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Paid: </span><span style={{fontSize:13}}>{showDate(selected.paidDate)}</span></div>}
            {selected.dueDate && <div style={{marginBottom:12}}><span style={{color:'#7A9A7A',fontSize:13}}>Due: </span><span style={{fontSize:13}}>{new Date(selected.dueDate).toLocaleDateString()}</span></div>}
            {selected.description && <div style={{marginBottom:20}}><span style={{color:'#7A9A7A',fontSize:13}}>Description: </span><span style={{fontSize:13}}>{selected.description}</span></div>}

            {/* Payments made so far */}
            {(selected.payments || []).length > 0 && (
              <div style={{marginTop:16,borderTop:'1px solid #EBF2E8',paddingTop:14}}>
                <div style={{fontSize:12,fontWeight:500,color:'#7A9A7A',marginBottom:8}}>PAYMENTS</div>
                {selected.payments.map((p, i) => (
                  <div key={p.id || 'legacy-' + i} style={{display:'flex',alignItems:'baseline',gap:10,fontSize:13,padding:'5px 0'}}>
                    <span style={{color:'#7A9A7A',minWidth:86}}>{showDate(p.date)}</span>
                    <span style={{fontWeight:600,minWidth:86}}>{fmt(p.amount)}</span>
                    <span style={{flex:1,color:'#7A9A7A',overflowWrap:'anywhere'}}>{p.note || ''}</span>
                    <button onClick={()=>removePayment(p)} style={{background:'none',border:'none',color:'#c0392b',cursor:'pointer',fontSize:12,padding:0}}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            {/* What just happened, shown in place of the payment box after a payment is recorded or removed */}
            {notice && (
              <div role="status" style={{marginTop:16,background:'#EBF2E8',border:'1px solid #CFE0D2',borderRadius:10,padding:'12px 14px',fontSize:13.5,fontWeight:500,color:'#1F4030'}}>{notice}</div>
            )}
            {balanceOf(selected) > 0 && !showPayForm && (
              <button onClick={()=>{ setShowPayForm(true); setNotice(''); setPayMsg(''); }} style={{width:'100%',marginTop:10,padding:'9px',borderRadius:8,border:'1px solid #2D4A35',background:'#fff',color:'#2D4A35',cursor:'pointer',fontSize:13,fontWeight:600,userSelect:'none'}}>Record another payment</button>
            )}

            {/* Record a payment: the full balance by default, or any smaller amount */}
            {balanceOf(selected) > 0 && showPayForm && (
              <div style={{marginTop:16,background:'#F4F8F4',border:'1px solid #D4DDCC',borderRadius:10,padding:14}}>
                <div style={{fontSize:12,fontWeight:500,color:'#7A9A7A',marginBottom:8}}>RECORD A PAYMENT</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {/* Clicking into the amount selects it, so typing replaces the filled-in balance. */}
                  <div onFocusCapture={e => { const el = e.target; if (el && el.select) setTimeout(() => { try { el.select(); } catch {} }, 0); }}>
                    <div style={{fontSize:11,color:'#7A9A7A',marginBottom:3}}>Amount</div>
                    <MoneyInput value={pay.amount} onChange={v=>setPay(p=>({...p,amount:v}))} placeholder='0.00' />
                  </div>
                  <div>
                    <label htmlFor="bill-pay-date" style={{fontSize:11,color:'#7A9A7A',display:'block',marginBottom:3}}>Date paid</label>
                    <input id="bill-pay-date" type='date' value={pay.date} onChange={e=>setPay(p=>({...p,date:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
                  </div>
                </div>
                <input id="bill-pay-note" value={pay.note} onChange={e=>setPay(p=>({...p,note:e.target.value}))} placeholder='Note (optional), such as a check number' aria-label="Payment note" style={{width:'100%',marginTop:10,padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
                <div style={{fontSize:11.5,color:'#7A9A7A',marginTop:8}}>Leave the amount as it is to pay the bill in full, or lower it to pay part of it.</div>
                <button onClick={recordPayment} disabled={paying} style={{width:'100%',marginTop:10,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',cursor:paying?'wait':'pointer',fontSize:14,fontWeight:600}}>{paying ? 'Recording…' : 'Record payment'}</button>
              </div>
            )}
            {payMsg && <div style={{marginTop:10,fontSize:12.5,color:'#B4472D'}}>{payMsg}</div>}

            <div style={{display:'flex',gap:10,marginTop:20}}>
              <button onClick={()=>openEdit(selected)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #2D4A35',background:'#fff',color:'#2D4A35',cursor:'pointer',fontSize:14,fontWeight:600}}>Edit</button>
              <button onClick={()=>deleteBill(selected.id)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #c0392b',background:'#fff',color:'#c0392b',cursor:'pointer',fontSize:14,fontWeight:600}}>Delete</button>
              {/* After a payment is recorded or removed, this becomes the highlighted "Done" button. */}
              <button onClick={()=>setSelected(null)} style={notice
                ? {flex:1,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',cursor:'pointer',fontSize:14,fontWeight:600}
                : {flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',cursor:'pointer',fontSize:14}}>{notice ? 'Done' : 'Close'}</button>
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
                <SearchSelect value={form.vendor} allowCustom placeholder='Start typing a vendor…'
                  options={vendors.map(v => ({ value: v.company || v.name, label: v.company || v.name }))}
                  onPick={name => setForm(f=>({...f, vendor:name}))} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>CATEGORY</label>
                <SearchSelect value={form.category} placeholder='Type to search a category…'
                  options={expenseAccounts.length ? expenseAccounts : BILL_CATEGORIES}
                  onPick={name => setForm(f=>({...f, category:name}))} />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>AMOUNT</label>
                <MoneyInput value={form.amount} onChange={v=>setForm(f=>({...f,amount:v}))} placeholder='0.00' />
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DUE DATE</label>
                <input type='date' value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13,boxSizing:'border-box'}} />
              </div>
              {editingId && editingStatus === 'paid' && editingPayCount <= 1 && (
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