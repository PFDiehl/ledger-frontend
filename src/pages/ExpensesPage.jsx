import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const today = new Date().toISOString().slice(0,10);

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

const CATEGORIES = ['Advertising & Marketing','Bank Charges','Equipment','Insurance','Legal & Professional Fees','Meals & Entertainment','Office Supplies','Payroll','Rent & Lease','Software & Subscriptions','Taxes & Licenses','Travel','Utilities','Vehicle','Other'];
const PAYMENT_METHODS = ['Cash','Check','Credit Card','Debit Card','ACH / Bank Transfer','Wire Transfer','PayPal','Venmo','Zelle','Other'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor:'', category:'Other', amount:'', date:today, description:'', receiptNumber:'', paymentMethod:'' });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef(null);
  const scanInputRef = useRef(null);
  const { orgId, token } = getAuth();

  useEffect(() => {
    if (!orgId || !token) return;
    fetch(API+'/orgs/'+orgId+'/expenses', { headers: { Authorization: 'Bearer '+token } })
      .then(r => r.json()).then(j => { if(j.success) setExpenses(j.data); }).catch(()=>{});
  }, [orgId]);

  async function save() {
    if (!form.vendor || !form.amount) return alert('Please fill in vendor and amount');
    setLoading(true);
    try {
      const r = await fetch(API+'/orgs/'+orgId+'/expenses', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.success) { setExpenses(prev => [j.data, ...prev]); setShowForm(false); setForm({ vendor:'', category:'Other', amount:'', date:today, description:'', receiptNumber:'', paymentMethod:'' }); }
      else alert(j.message);
    } catch(e) { alert('Error saving expense'); } finally { setLoading(false); }
  }

  async function saveEdit() {
    if (!editForm.vendor || !editForm.amount) return alert('Please fill in vendor and amount');
    setLoading(true);
    try {
      const r = await fetch(API+'/orgs/'+orgId+'/expenses/'+selected.id, { method:'PATCH', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token }, body: JSON.stringify(editForm) });
      const j = await r.json();
      if (j.success) {
        const updated = { ...selected, ...j.data };
        setSelected(updated);
        setExpenses(prev => prev.map(e => e.id === selected.id ? updated : e));
        setEditing(false);
      } else alert(j.message);
    } catch(e) { alert('Error updating expense'); } finally { setLoading(false); }
  }

  async function deleteExpense(id) {
    if (!window.confirm('Delete this expense?')) return;
    try {
      const r = await fetch(API+'/orgs/'+orgId+'/expenses/'+id, { method:'DELETE', headers:{ Authorization:'Bearer '+token } });
      const j = await r.json();
      if (j.success) { setExpenses(prev => prev.filter(e => e.id !== id)); setSelected(null); setEditing(false); }
      else alert(j.message);
    } catch(e) { alert('Error deleting expense'); }
  }

  // Scan a receipt image/PDF and pre-fill the New Expense form from OCR.
  // Uses the same /receipts/scan endpoint the mobile app uses.
  async function scanReceipt(file) {
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target.result.split(',')[1];
          const mediaType = file.type || 'image/jpeg';
          const r = await fetch(API+'/orgs/'+orgId+'/receipts/scan', {
            method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
            body: JSON.stringify({ imageBase64: base64, mediaType })
          });
          const j = await r.json();
          if (!j.success) { alert(j.message || 'Could not read that receipt. You can still enter it by hand.'); return; }
          const info = j.data || {};
          const safeDate = info.date && !isNaN(new Date(info.date)) ? new Date(info.date).toISOString().slice(0,10) : today;
          setForm(f => ({
            ...f,
            vendor:   info.vendor || f.vendor,
            amount:   (info.amount != null && info.amount !== '') ? String(info.amount) : f.amount,
            date:     safeDate,
            category: (info.category && CATEGORIES.includes(info.category)) ? info.category : f.category,
          }));
        } catch { alert('Could not read that receipt. You can still enter it by hand.'); }
        finally { setScanning(false); }
      };
      reader.readAsDataURL(file);
    } catch { alert('Could not read that receipt.'); setScanning(false); }
  }

  async function uploadReceipt(file) {
    if (!file || !selected) return;
    setUploadingReceipt(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const mediaType = file.type || 'image/jpeg';
        const r = await fetch(API+'/orgs/'+orgId+'/expenses/'+selected.id+'/receipt', {
          method:'POST', headers:{ 'Content-Type':'application/json', Authorization:'Bearer '+token },
          body: JSON.stringify({ imageBase64: base64, mediaType })
        });
        const j = await r.json();
        if (j.success) {
          const updated = { ...selected, receiptUrl: j.receiptUrl };
          setSelected(updated);
          setExpenses(prev => prev.map(ex => ex.id === selected.id ? updated : ex));
        } else alert(j.message);
        setUploadingReceipt(false);
      };
      reader.readAsDataURL(file);
    } catch(e) { alert('Error uploading receipt'); setUploadingReceipt(false); }
  }

  async function deleteReceipt() {
    if (!selected || !window.confirm('Remove this receipt image?')) return;
    try {
      const r = await fetch(API+'/orgs/'+orgId+'/expenses/'+selected.id+'/receipt', { method:'DELETE', headers:{ Authorization:'Bearer '+token } });
      const j = await r.json();
      if (j.success) {
        const updated = { ...selected, receiptUrl: null };
        setSelected(updated);
        setExpenses(prev => prev.map(ex => ex.id === selected.id ? updated : ex));
      } else alert(j.message);
    } catch(e) { alert('Error removing receipt'); }
  }

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }

  const F = (label, field, el='input', props={}) => (
    <div key={field}>
      <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>{label}</label>
      {el === 'select' ? (
        <select value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} {...props}>
          {props.options?.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} {...props} />
      )}
    </div>
  );

  const EF = (label, field, el='input', props={}) => (
    <div key={field}>
      <label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>{label}</label>
      {el === 'select' ? (
        <select value={editForm[field]||''} onChange={e=>setEditForm(f=>({...f,[field]:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} {...props}>
          {props.options?.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input value={editForm[field]||''} onChange={e=>setEditForm(f=>({...f,[field]:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} {...props} />
      )}
    </div>
  );

  return (
    <div className='page'>
      <div className='page-header'>
        <h1 className='page-title'>Expenses</h1>
        <button className='btn-primary' onClick={()=>setShowForm(true)} style={{display:'flex',alignItems:'center',gap:6}}><span>+</span> New expense</button>
      </div>

      {expenses.length === 0 ? (
        <div className='card' style={{padding:40,marginTop:20,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>💳</div>
          <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No expenses yet</p>
          <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>Track your business expenses to keep your books accurate.</p>
          <button className='btn-primary' onClick={()=>setShowForm(true)}>Add expense</button>
        </div>
      ) : (
        <div className='card' style={{marginTop:20,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:'1px solid #D4DDCC'}}>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Vendor</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Category</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Date</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Payment</th>
              <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
              <th style={{padding:'10px 16px',textAlign:'center',fontWeight:500,color:'#7A9A7A'}}>Receipt</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
            </tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{borderBottom:'0.5px solid #EBF2E8',cursor:'pointer'}} onClick={()=>{setSelected(e);setEditing(false);}} onMouseEnter={ev=>ev.currentTarget.style.background='#f8fbf8'} onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{e.vendor}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{e.category}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{e.date ? new Date(e.date).toLocaleDateString() : '-'}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{e.paymentMethod || '-'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(e.amount)}</td>
                  <td style={{padding:'12px 16px',textAlign:'center'}}>{e.receiptUrl ? <span style={{fontSize:16}} title="Receipt attached">🧾</span> : <span style={{color:'#D4DDCC',fontSize:13}}>—</span>}</td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#FAEEDA',color:'#854F0B',textTransform:'capitalize'}}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Expense Form */}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:500,maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>New Expense</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <input ref={scanInputRef} type="file" accept="image/*,application/pdf" style={{display:'none'}}
                  onChange={e => { const file = e.target.files?.[0]; if (file) scanReceipt(file); e.target.value=''; }} />
                <button type="button" onClick={()=>scanInputRef.current?.click()} disabled={scanning}
                  style={{width:'100%',padding:'11px',borderRadius:8,border:'1px dashed #2D4A35',background:'#F4F8F4',color:'#2D4A35',fontSize:13,fontWeight:600,cursor:scanning?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {scanning ? 'Scanning receipt…' : '📷 Scan receipt to auto-fill'}
                </button>
                <div style={{fontSize:11,color:'#7A9A7A',marginTop:6,textAlign:'center'}}>Upload a photo or PDF — we'll read the vendor, amount, and date.</div>
              </div>
              {F('VENDOR', 'vendor', 'input', {placeholder:'Amazon'})}
              {F('CATEGORY', 'category', 'select', {options: CATEGORIES})}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                {F('AMOUNT ($)', 'amount', 'input', {type:'number', placeholder:'0.00'})}
                {F('DATE', 'date', 'input', {type:'date'})}
              </div>
              {F('PAYMENT METHOD', 'paymentMethod', 'select', {options: ['', ...PAYMENT_METHODS]})}
              {F('RECEIPT NUMBER', 'receiptNumber', 'input', {placeholder:'REC-001 (optional)'})}
              {F('DESCRIPTION', 'description', 'input', {placeholder:'Optional notes'})}
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
                <button onClick={save} disabled={loading} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,fontWeight:500,cursor:'pointer'}}>{loading ? 'Saving...' : 'Save expense'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail / Edit Modal */}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:480,maxWidth:'90vw',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>{editing ? 'Edit Expense' : selected.vendor}</h2>
              <button onClick={()=>{setSelected(null);setEditing(false);}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>

            {editing ? (
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {EF('VENDOR', 'vendor', 'input', {placeholder:'Amazon'})}
                {EF('CATEGORY', 'category', 'select', {options: CATEGORIES})}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {EF('AMOUNT ($)', 'amount', 'input', {type:'number', placeholder:'0.00'})}
                  {EF('DATE', 'date', 'input', {type:'date'})}
                </div>
                {EF('PAYMENT METHOD', 'paymentMethod', 'select', {options: ['', ...PAYMENT_METHODS]})}
                {EF('RECEIPT NUMBER', 'receiptNumber', 'input', {placeholder:'REC-001 (optional)'})}
                {EF('DESCRIPTION', 'description', 'input', {placeholder:'Optional notes'})}
                <div style={{display:'flex',gap:10,marginTop:4}}>
                  <button onClick={()=>setEditing(false)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
                  <button onClick={saveEdit} disabled={loading} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,fontWeight:500,cursor:'pointer'}}>{loading ? 'Saving...' : 'Save changes'}</button>
                </div>
              </div>
            ) : (
              <>
                {[['Category', selected.category],['Date', selected.date ? new Date(selected.date).toLocaleDateString() : '-'],['Amount', fmt(selected.amount)],['Payment Method', selected.paymentMethod],['Receipt #', selected.receiptNumber],['Description', selected.description]].map(([l,v]) => v ? (
                  <div key={l} style={{marginBottom:10}}><span style={{color:'#7A9A7A',fontSize:13}}>{l}: </span><span style={{fontSize:13,fontWeight:l==='Amount'?700:400,color:l==='Amount'?'#2D4A35':'inherit'}}>{v}</span></div>
                ) : null)}

                {/* Receipt Image Section */}
                <div style={{marginTop:20,borderTop:'1px solid #EBF2E8',paddingTop:16}}>
                  <div style={{fontSize:12,fontWeight:500,color:'#7A9A7A',marginBottom:10}}>RECEIPT IMAGE</div>
                  {selected.receiptUrl ? (
                    <div>
                      <img src={selected.receiptUrl} alt="Receipt" style={{width:'100%',maxHeight:240,objectFit:'contain',borderRadius:8,border:'1px solid #D4DDCC',cursor:'pointer',marginBottom:10}} onClick={() => setViewingImage(selected.receiptUrl)} />
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={() => setViewingImage(selected.receiptUrl)} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid #2D4A35',background:'#fff',color:'#2D4A35',fontSize:13,cursor:'pointer'}}>View Full Size</button>
                        <button onClick={() => fileInputRef.current?.click()} style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>{uploadingReceipt ? 'Uploading...' : 'Replace'}</button>
                        <button onClick={deleteReceipt} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #c0392b',background:'#fff',color:'#c0392b',fontSize:13,cursor:'pointer'}}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{border:'2px dashed #D4DDCC',borderRadius:8,padding:24,textAlign:'center',marginBottom:10}}>
                      <div style={{fontSize:28,marginBottom:8}}>🧾</div>
                      <p style={{fontSize:13,color:'#7A9A7A',marginBottom:12}}>No receipt attached</p>
                      <button onClick={() => fileInputRef.current?.click()} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,cursor:'pointer'}}>{uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}</button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => { if(e.target.files[0]) uploadReceipt(e.target.files[0]); e.target.value=''; }} />
                </div>

                <div style={{display:'flex',gap:10,marginTop:20}}>
                  <button onClick={()=>deleteExpense(selected.id)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #c0392b',background:'#fff',color:'#c0392b',cursor:'pointer',fontSize:14,fontWeight:600}}>Delete</button>
                  <button onClick={()=>{setEditing(true);setEditForm({vendor:selected.vendor,category:selected.category,amount:selected.amount,date:selected.date?selected.date.slice(0,10):today,description:selected.description||'',receiptNumber:selected.receiptNumber||'',paymentMethod:selected.paymentMethod||''});}} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #2D4A35',background:'#fff',color:'#2D4A35',cursor:'pointer',fontSize:14,fontWeight:600}}>Edit</button>
                  <button onClick={()=>setSelected(null)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',cursor:'pointer',fontSize:14}}>Close</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Size Image Viewer */}
      {viewingImage && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setViewingImage(null)}>
          <img src={viewingImage} alt="Receipt full size" style={{maxWidth:'90vw',maxHeight:'90vh',objectFit:'contain',borderRadius:8}} />
          <button onClick={()=>setViewingImage(null)} style={{position:'absolute',top:20,right:24,background:'none',border:'none',color:'#fff',fontSize:32,cursor:'pointer'}}>×</button>
        </div>
      )}
    </div>
  );
}