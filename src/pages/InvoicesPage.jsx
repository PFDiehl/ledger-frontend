import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export default function InvoicesPage({ onView, onNew }) {
  const { org } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    setLoading(true);
    api.get(`/orgs/${org.id}/invoices`)
      .then(r => { setInvoices(r.data?.data || r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [org?.id]);

  function fmt(n) { return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0); }

  const statusColor = (s) => {
    if (s === 'paid') return '#2D7A4A';
    if (s === 'sent') return '#2D4A7A';
    if (s === 'overdue') return '#c0392b';
    return '#7A9A7A';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Invoices</h1>
        <button className="btn-primary" onClick={()=>onNew?.()}>+ New Invoice</button>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#7A9A7A'}}>Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="card" style={{padding:40,marginTop:20,textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:16}}>📄</div>
          <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No invoices yet</p>
          <button className="btn-primary" onClick={()=>onNew?.()}>Create invoice</button>
        </div>
      ) : (
        <div className="card" style={{marginTop:20,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid #D4DDCC'}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Invoice #</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Client</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Due Date</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Amount</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} style={{borderBottom:'0.5px solid #EBF2E8',cursor:'pointer'}} onClick={()=>onView?.(inv)}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fbf8'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 16px',fontFamily:'monospace',color:'#7A9A7A'}}>{inv.invoiceNumber}</td>
                  <td style={{padding:'12px 16px',fontWeight:500}}>{inv.contact?.name||'-'}</td>
                  <td style={{padding:'12px 16px',color:'#7A9A7A'}}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '-'}</td>
                  <td style={{padding:'12px 16px',textAlign:'right',fontWeight:500}}>{fmt(inv.total)}</td>
                  <td style={{padding:'12px 16px'}}>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:500,background: inv.status==='paid'?'#EBF2E8':'#f0f0f0',color:statusColor(inv.status),textTransform:'capitalize'}}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}