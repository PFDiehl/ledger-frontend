import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

export default function DashboardPage() {
  const { org, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [pnl, setPnl] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!org) return;
    async function load() {
      setLoading(true);
      try {
        const [inv, exp, bil, pl, bt] = await Promise.all([
          api.get(`/orgs/${org.id}/invoices`),
          api.get(`/orgs/${org.id}/expenses`),
          api.get(`/orgs/${org.id}/bills`),
          // P&L (accrual) from the real ledger — includes categorized bank-feed
          // transactions, so the Dashboard totals match the P&L report. Defaults
          // to the current calendar year. Tolerate failure so the rest still loads.
          api.get(`/orgs/${org.id}/reports/pl?basis=accrual`).catch(() => null),
          // Recent bank-feed transactions (date desc) for the activity card.
          api.get(`/orgs/${org.id}/banking/transactions`).catch(() => null),
        ]);
        setInvoices(inv.data?.data || inv.data || []);
        setExpenses(exp.data?.data || exp.data || []);
        setBills(bil.data?.data || bil.data || []);
        setPnl(pl?.data?.data || null);
        setTxns(bt?.data?.data || bt?.data || []);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [org]);

  function fmt(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }); }

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalBills = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  // Revenue / expenses / net income come from the P&L (the real ledger, which
  // includes categorized bank-feed transactions) so the Dashboard matches the
  // P&L report. Falls back to invoice/expense records if the P&L didn't load.
  const plRevenue  = pnl ? Number(pnl.revenue   || 0) : totalPaid;
  const plExpenses = pnl ? Number(pnl.expenses  || 0) : totalExpenses;
  const netIncome  = pnl ? Number(pnl.netIncome || 0) : (totalPaid - totalExpenses);

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
          {/* Hero — themed by the active palette (navy in Deep Harbor) */}
          <div style={{
            background:'var(--brand-kpi-hero-bg)', borderRadius:16, padding:'24px 26px', marginBottom:16,
            display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:20,
          }}>
            <div>
              <div style={{fontSize:11, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--brand-kpi-hero-label)', marginBottom:8}}>Net income · revenue − expenses · this year</div>
              <div style={{fontSize:38, fontWeight:700, lineHeight:1, color:'var(--brand-kpi-hero-val)'}}>{fmt(netIncome)}</div>
              <div style={{fontSize:12.5, color:'var(--brand-kpi-hero-label)', marginTop:9}}>{fmt(plRevenue)} revenue · {fmt(plExpenses)} expenses</div>
            </div>
            <div style={{display:'flex', gap:26}}>
              <div>
                <div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--brand-kpi-hero-label)', marginBottom:5}}>Outstanding A/R</div>
                <div style={{fontSize:19, fontWeight:600, color:'var(--brand-kpi-hero-val)'}}>{fmt(totalOutstanding)}</div>
              </div>
              <div>
                <div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--brand-kpi-hero-label)', marginBottom:5}}>Unpaid bills</div>
                <div style={{fontSize:19, fontWeight:600, color:'var(--brand-kpi-hero-val)'}}>{fmt(totalBills)}</div>
              </div>
            </div>
          </div>

          {/* Themed stat tiles */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:22}}>
            {[
              ['Total Invoiced', fmt(totalInvoiced), 'var(--brand-primary)', `${invoices.length} invoices`],
              ['Revenue', fmt(plRevenue), '#2D7A4A', 'this year · from ledger'],
              ['Outstanding', fmt(totalOutstanding), '#C0703A', `${invoices.filter(i=>i.status!=='paid').length} unpaid`],
              ['Total Expenses', fmt(plExpenses), '#B4472D', 'this year · from ledger'],
            ].map(([label, val, color, sub]) => (
              <div key={label} style={{background:'var(--brand-kpi-tint-bg)', border:'1px solid var(--brand-kpi-tint-border)', borderRadius:12, padding:'15px 16px'}}>
                <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>{label}</div>
                <div style={{fontSize:24,fontWeight:700,color}}>{val}</div>
                <div style={{fontSize:11.5,color:'var(--color-text-secondary)',marginTop:4}}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            {/* Recent bank activity — the live feed, since this is how the books are kept */}
            <div className="card" style={{padding:20, gridColumn:'1 / -1'}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--brand-primary)'}}>Recent bank activity</h2>
              {txns.slice(0,6).map(t => (
                <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.payee || t.description}</div>
                    <div style={{fontSize:11,color:'var(--color-text-secondary)'}}>{(t.category || 'Uncategorized')} · {new Date(t.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',marginLeft:12,color: Number(t.amount) >= 0 ? '#2D7A4A' : '#c0392b'}}>
                    {Number(t.amount) >= 0 ? '+' : '−'}{fmt(Math.abs(Number(t.amount)))}
                  </div>
                </div>
              ))}
              {txns.length === 0 && <p style={{fontSize:13,color:'var(--color-text-secondary)'}}>No bank activity yet</p>}
            </div>

            {/* Recent Invoices */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--brand-primary)'}}>Recent Invoices</h2>
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

            {/* Quick Summary */}
            <div className="card" style={{padding:20}}>
              <h2 style={{fontSize:14,fontWeight:600,marginBottom:16,color:'var(--brand-primary)'}}>Financial Summary</h2>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                <span style={{fontSize:13,color:'var(--color-text-secondary)'}}>Total Revenue</span>
                <span style={{fontSize:13,fontWeight:600,color:'#2D7A4A'}}>{fmt(plRevenue)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)'}}>
                <span style={{fontSize:13,color:'var(--color-text-secondary)'}}>Total Expenses</span>
                <span style={{fontSize:13,fontWeight:600,color:'#c0392b'}}>{fmt(plExpenses)}</span>
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