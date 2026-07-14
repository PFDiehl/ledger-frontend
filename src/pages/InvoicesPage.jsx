import { useState, useEffect } from 'react';
import { orgApi } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function InvoicesPage() {
  const { org } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientName:'', clientEmail:'', description:'', quantity:1, price:'', dueDate:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    orgApi(org.id).invoices()
      .then(r => { if(r?.data) setInvoices(r.data); })
      .catch(()=>{});
  }, [org?.id]);

  async function save() {
    if (!form.clientName || !form.price) return alert('Please fill in client name and price');
    setLoading(true);
    try {
      const r = await orgApi(org.id).createInvoice(form);
      if (r?.data) {
        setInvoices(prev=>[r.data,...prev]);
        setShowForm(false);
        setForm({ clientName:'', clientEmail:'', description:'', quantity:1, price:'', dueDate:'' });
      }
    } catch(e) { alert('Error: '+e.message); } finally { setLoading(false); }
  }

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n); }

  return (
    <div className='page'>
      <div className='page-header'>
        <h1 className='page-title'>Invoices</h1>
        <button className='btn-primary' onClick={()=>setShowForm(true)}>+ New invoice</button>
      </div>
      {invoices.length === 0 ? (
        <div className='card' style={{padding:40,marginTop:20,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>📄</div>
          <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No invoices yet</p>
          <button className='btn-primary' onClick={()=>setShowForm(true)}>Create invoice</button>
        </div>
      ) : (
        <div className='card' style={{marginTop:20,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead><tr style={{borderBottom:'1px solid #D4DDCC'}}>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Invoice #</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Client</th>
              <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
              <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{borderBottom:'0.5px solid #EBF2E8'}}>
                  <td style={{padding:'12px 16px',fontFamily:'monospace',color:'#7A9A7A'}}>{inv.invoiceNumber}</td>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{inv.contact?.name||'-'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(inv.total)}</td>
                  <td style={{padding:'12px 16px'}}><span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#F1EFE8',color:'#5F5E5A'}}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:28,width:480,maxWidth:'90vw'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{fontSize:18,fontWeight:600}}>New Invoice</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer'}}>x</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>CLIENT NAME</label><input value={form.clientName} onChange={e=>setForm(f=>({...f,clientName:e.target.value}))} placeholder='Acme Corp' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>CLIENT EMAIL</label><input type='email' value={form.clientEmail} onChange={e=>setForm(f=>({...f,clientEmail:e.target.value}))} placeholder='billing@acme.com' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DESCRIPTION</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder='Web design services' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>QUANTITY</label><input type='number' value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
                <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>PRICE ($)</label><input type='number' value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder='0.00' style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              </div>
              <div><label style={{fontSize:12,fontWeight:500,color:'#7A9A7A',display:'block',marginBottom:4}}>DUE DATE</label><input type='date' value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1px solid #D4DDCC',fontSize:13}} /></div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'10px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:13,cursor:'pointer'}}>Cancel</button>
                <button onClick={save} disabled={loading} style={{flex:2,padding:'10px',borderRadius:8,border:'none',background:'#2D4A35',color:'#A8D4A8',fontSize:13,fontWeight:500,cursor:'pointer'}}>{loading?'Saving...':'Save invoice'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
