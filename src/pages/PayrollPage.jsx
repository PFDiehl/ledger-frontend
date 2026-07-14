import { useState } from 'react';

export default function PayrollPage() {
  const [employees] = useState([]);
  return (
    <div className='page'>
      <div className='page-header'>
        <h1 className='page-title'>Payroll</h1>
        <button className='btn-primary' style={{display:'flex',alignItems:'center',gap:6}}><span>+</span> Add employee</button>
      </div>
      <div className='card' style={{padding:40,marginTop:20,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:16}}>👥</div>
        <p style={{fontSize:15,fontWeight:500,marginBottom:8}}>No employees yet</p>
        <p style={{fontSize:13,color:'var(--color-text-secondary)',marginBottom:20}}>Add your employees to run payroll, generate W-2s, and handle tax filings automatically.</p>
        <button className='btn-primary'>Add first employee</button>
      </div>
    </div>
  );
}