import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { org, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    async function load() {
      setLoading(true);
      try {
        const [inv, exp, bil] = await Promise.all([
          api.get(`/orgs/${org.id}/invoices`),
          api.get(`/orgs/${org.id}/expenses`),
          api.get(`/orgs/${org.id}/bills`),
        ]);
        setInvoices(inv.data?.data || inv.data || []);
        setExpenses(exp.data?.data || exp.data || []);
        setBills(bil.data?.data || bil.data || []);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [org]);

  function fmt(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }); }

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalBills = bills.reduce((s, b) => s + Number(b.amount), 0);
  const netIncome = totalPaid - totalExpenses;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p style={{color:'var(--color-text-secondary)',fontSize:14,marginTop:4}}>Welcome back, {user?.fullName}</p>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#7A9A7A'}}>Loading...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:16,marginBottom:24}}>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Total Invoiced</div>
              <div style={{fontSize:28,fontWeight:700,color:'var(--brand-primary)'}}>{fmt(totalInvoiced)}</div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>{invoices.length} invoices</div>
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Revenue (Paid)</div>
              <div style={{fontSize:28,fontWeight:700,color:'#2D7A4A'}}>{fmt(totalPaid)}</div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>{invoices.filter(i=>i.status==='paid').length} paid invoices</div>
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Outstanding</div>
              <div style={{fontSize:28,fontWeight:700,color:'#d4682a'}}>{fmt(totalOutstanding)}</div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>{invoices.filter(i=>i.status!=='paid').length} unpaid invoices</div>
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Total Expenses</div>
              <div style={{fontSize:28,fontWeight:700,color:'#c0392b'}}>{fmt(totalExpenses)}</div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>{expenses.length} expenses</div>
            </div>
            <div className="card" style={{padding:20}}>
              <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:4,textTransform:'uppercase',letterSpacing:1}}>Net Income</div>
              <div style={{fontSize:28,fontWeight:700,color: netIncome >= 0 ? '#2D7A4A' : '#c0392b'}}>{fmt(netIncome)}</div>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginTop:4}}>Revenue minus expenses</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            {/* Recent Invoices */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--color-text-primary)'}}>Recent Invoices</h2>
              {invoices.slice(0,5).map(inv => (
                <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{inv.contact?.name || 'Client'}</div>
                    <div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{inv.invoiceNumber}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:13,fontWeight:600,color: inv.status==='paid'?'#2D7A4A':'#d4682a'}}>{fmt(inv.total)}</div>
                    <div style={{fontSize:11,color:'var(--color-text-secondary)',textTransform:'capitalize'}}>{inv.status}</div>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && <p style={{fontSize:13,color:'var(--color-text-secondary)'}}>No invoices yet</p>}
            </div>

            {/* Recent Expenses */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--color-text-primary)'}}>Recent Expenses</h2>
              {expenses.slice(0,5).map(exp => (
                <div key={exp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{exp.vendor}</div>
                    <div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{exp.category}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{fmt(exp.amount)}</div>
                </div>
              ))}
              {expenses.length === 0 && <p style={{fontSize:13,color:'var(--color-text-secondary)'}}>No expenses yet</p>}
            </div>

            {/* Recent Bills */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--color-text-primary)'}}>Recent Bills</h2>
              {bills.slice(0,5).map(bill => (
                <div key={bill.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:500}}>{bill.vendor}</div>
                    <div style={{fontSize:11,color:'var(--color-text-secondary)',textTransform:'capitalize'}}>{bill.status}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{fmt(bill.amount)}</div>
                </div>
              ))}
              {bills.length === 0 && <p style={{fontSize:13,color:'var(--color-text-secondary)'}}>No bills yet</p>}
            </div>

            {/* Quick Summary */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--color-text-primary)'}}>Financial Summary</h2>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                <span style={{fontSize:13,color:'var(--color-text-secondary)'}}>Total Revenue</span>
                <span style={{fontSize:13,fontWeight:600,color:'#2D7A4A'}}>{fmt(totalPaid)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                <span style={{fontSize:13,color:'var(--color-text-secondary)'}}>Total Expenses</span>
                <span style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{fmt(totalExpenses)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                <span style={{fontSize:13,color:'var(--color-text-secondary)'}}>Total Bills</span>
                <span style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{fmt(totalBills)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0 0'}}>
                <span style={{fontSize:14,fontWeight:700}}>Net Income</span>
                <span style={{fontSize:14,fontWeight:700,color: netIncome >= 0 ? '#2D7A4A' : '#c0392b'}}>{fmt(netIncome)}</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}