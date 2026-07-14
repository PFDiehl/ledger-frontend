import { useState } from 'react';

const PERIODS = ['This month','Last month','This quarter','Last quarter','This year','Custom'];
const REPORTS = ['P&L','Balance Sheet','Cash Flow','Aged AR','Expenses'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('This month');
  const [report, setReport] = useState('P&L');
  return (
    <div className='page'>
      <div className='page-header'><h1 className='page-title'>Reports</h1></div>
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {REPORTS.map(r => (
          <button key={r} onClick={()=>setReport(r)} style={{padding:'7px 16px',borderRadius:20,border:'1px solid',borderColor:report===r?'#2D4A35':'#D4DDCC',background:report===r?'#2D4A35':'#fff',color:report===r?'#A8D4A8':'#7A9A7A',fontSize:13,fontWeight:report===r?500:400,cursor:'pointer'}}>{r}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {PERIODS.map(p => (
          <button key={p} onClick={()=>setPeriod(p)} style={{padding:'5px 14px',borderRadius:20,border:'1px solid',borderColor:period===p?'#2D4A35':'#D4DDCC',background:period===p?'#EBF2E8':'#fff',color:period===p?'#2D4A35':'#7A9A7A',fontSize:12,cursor:'pointer'}}>{p}</button>
        ))}
      </div>
      <div className='card' style={{padding:24}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{fontSize:16,fontWeight:500}}>{report} — {period}</h2>
          <button style={{padding:'7px 16px',borderRadius:8,border:'1px solid #D4DDCC',background:'#fff',fontSize:12,cursor:'pointer'}}>Export PDF</button>
        </div>
        <div style={{textAlign:'center',padding:'40px 0',color:'#7A9A7A'}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <p style={{fontSize:14,marginBottom:6}}>No data yet for {period}</p>
          <p style={{fontSize:13}}>Create invoices and record expenses to see your {report} report.</p>
        </div>
      </div>
    </div>
  );
}