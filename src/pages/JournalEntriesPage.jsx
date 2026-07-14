import { useState } from 'react';

export default function JournalEntriesPage() {
  const [entries] = useState([]);
  return (
    <div className='page'>
      <div className='page-header'>
        <h1 className='page-title'>Journal Entries</h1>
        <button className='btn-primary' style={{display:'flex',alignItems:'center',gap:6}}><span>+</span> New entry</button>
      </div>
      <div className='card' style={{padding:40,marginTop:20,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>📒</div>
        <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No journal entries yet</p>
        <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>Journal entries are created automatically when you record invoices, bills, and payments. You can also create manual entries here.</p>
        <button className='btn-primary'>Create manual entry</button>
      </div>
    </div>
  );
}