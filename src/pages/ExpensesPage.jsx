import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ vendor:'', category:'Other', amount:'', description:'' });
  const [loading, setLoading] = useState(false);
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
      if (j.success) { setExpenses(prev => [j.data, ...prev]); setShowForm(false); setForm({ vendor:'', category:'Other', amount:'', description:'' }); }
      else alert(j.message);
    } catch(e) { alert('Error saving expense'); } finally { setLoading(false); }
  }

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }

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
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Description</th>
              <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
            </tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{borderBottom:'0.5px solid #EBF2E8'}}>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{e.vendor}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{e.category}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{e.description}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(e.amount)}</td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#FAEEDA',color:'#854F0B',textTransform:'capitalize'}}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:440,maxWidth:'90vw'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>New Expense</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>VENDOR</label><input value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder='Amazon' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>CATEGORY</label><select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}}><option>Other</option><option>Software</option><option>Travel</option><option>Meals</option><option>Office</option><option>Marketing</option><option>Utilities</option><option>Rent</option></select></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>AMOUNT ($)</label><input type='number' value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder='0.00' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DESCRIPTION</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Optional notes' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
                <button onClick={save} disabled={loading} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,fontWeight:500,cursor:'pointer'}}>{loading ? 'Saving...' : 'Save expense'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}