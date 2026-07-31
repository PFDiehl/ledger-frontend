
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const REPORTS = ['P&L', 'Income', 'Expenses', 'Bills'];

export default function ReportsPage() {
  const { org } = useAuth();
  const [report, setReport] = useState('P&L');
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

  const row = (label, value, color) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid #f0f0f0'}}>
      <span style={{fontSize:14,color:'#555'}}>{label}</span>
      <span style={{fontSize:14,fontWeight:600,color: color || '#333'}}>{fmt(value)}</span>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Reports</h1></div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {REPORTS.map(r => (
          <button key={r} onClick={()=>setReport(r)} style={{padding:'7px 16px',borderRadius:20,border:'1px solid',borderColor:report===r?'#2D4A35':'#D4DDCC',background:report===r?'#2D4A35':'#fff',color:report===r?'#A8D4A8':'#7A9A7A',fontSize:13,fontWeight:report===r?500:400,cursor:'pointer'}}>{r}</button>
        ))}
      </div>
      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#7A9A7A'}}>Loading...</div>
      ) : (
        <div style={{display:'grid',gap:16}}>
          {report === 'P&L' && (
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:16,fontWeight:600,marginBottom:20,color:'#2D4A35'}}>Profit & Loss Summary</h2>
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:13,fontWeight:600,color:'#7A9A7A',marginBottom:8,textTransform:'uppercase'}}>Income</h3>
                {row('Total Invoiced', totalInvoiced)}
                {row('Total Paid (Revenue)', totalPaid, '#2D4A35')}
                {row('Outstanding', totalOutstanding, '#d4682a')}
              </div>
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:13,fontWeight:600,color:'#7A9A7A',marginBottom:8,textTransform:'uppercase'}}>Expenses</h3>
                {row('Total Expenses', totalExpenses, '#c0392b')}
                {row('Total Bills', totalBills, '#c0392b')}
              </div>
              <div style={{borderTop:'2px solid #2D4A35',paddingTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:16,fontWeight:700,color:'#333'}}>Net Income</span>
                  <span style={{fontSize:20,fontWeight:700,color: netIncome >= 0 ? '#2D4A35' : '#c0392b'}}>{fmt(netIncome)}</span>
                </div>
              </div>
            </div>
          )}
          {report === 'Income' && (
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:16,fontWeight:600,marginBottom:20,color:'#2D4A35'}}>Income Details</h2>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                <div style={{background:'#f0f7f0',borderRadius:12,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#7A9A7A',marginBottom:4}}>TOTAL INVOICED</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#2D4A35'}}>{fmt(totalInvoiced)}</div>
                  <div style={{fontSize:11,color:'#7A9A7A',marginTop:4}}>{invoices.length} invoices</div>
                </div>
                <div style={{background:'#f0f7f0',borderRadius:12,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#7A9A7A',marginBottom:4}}>PAID</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#2D4A35'}}>{fmt(totalPaid)}</div>
                  <div style={{fontSize:11,color:'#7A9A7A',marginTop:4}}>{invoices.filter(i=>i.status==='paid').length} invoices</div>
                </div>
                <div style={{background:'#fff8f0',borderRadius:12,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:11,color:'#7A9A7A',marginBottom:4}}>OUTSTANDING</div>
                  <div style={{fontSize:22,fontWeight:700,color:'#d4682a'}}>{fmt(totalOutstanding)}</div>
                  <div style={{fontSize:11,color:'#7A9A7A',marginTop:4}}>{invoices.filter(i=>i.status!=='paid').length} invoices</div>
                </div>
              </div>
              {invoices.map(inv => (
                <div key={inv.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:500}}>{inv.contact?.name || 'Client'}</div>
                    <div style={{fontSize:12,color:'#7A9A7A'}}>{inv.invoiceNumber}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:14,fontWeight:600,color: inv.status==='paid'?'#2D4A35':'#d4682a'}}>{fmt(inv.total)}</div>
                    <div style={{fontSize:11,color:'#7A9A7A',textTransform:'capitalize'}}>{inv.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {report === 'Expenses' && (
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:16,fontWeight:600,marginBottom:20,color:'#2D4A35'}}>Expense Details</h2>
              <div style={{background:'#fff0f0',borderRadius:12,padding:16,textAlign:'center',marginBottom:24}}>
                <div style={{fontSize:11,color:'#7A9A7A',marginBottom:4}}>TOTAL EXPENSES</div>
                <div style={{fontSize:28,fontWeight:700,color:'#c0392b'}}>{fmt(totalExpenses)}</div>
                <div style={{fontSize:11,color:'#7A9A7A',marginTop:4}}>{expenses.length} expenses</div>
              </div>
              {expenses.map(exp => (
                <div key={exp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:500}}>{exp.vendor}</div>
                    <div style={{fontSize:12,color:'#7A9A7A'}}>{exp.category}{exp.description ? ' · '+exp.description : ''}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:'#c0392b'}}>{fmt(exp.amount)}</div>
                </div>
              ))}
            </div>
          )}
          {report === 'Bills' && (
            <div className="card" style={{padding:24}}>
              <h2 style={{fontSize:16,fontWeight:600,marginBottom:20,color:'#2D4A35'}}>Bills Details</h2>
              <div style={{background:'#fff0f0',borderRadius:12,padding:16,textAlign:'center',marginBottom:24}}>
                <div style={{fontSize:11,color:'#7A9A7A',marginBottom:4}}>TOTAL BILLS</div>
                <div style={{fontSize:28,fontWeight:700,color:'#c0392b'}}>{fmt(totalBills)}</div>
                <div style={{fontSize:11,color:'#7A9A7A',marginTop:4}}>{bills.length} bills</div>
              </div>
              {bills.map(bill => (
                <div key={bill.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f0f0f0'}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:500}}>{bill.vendor}</div>
                    <div style={{fontSize:12,color:'#7A9A7A',textTransform:'capitalize'}}>{bill.status}</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:'#c0392b'}}>{fmt(bill.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}