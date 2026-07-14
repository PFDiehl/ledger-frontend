import { useState } from 'react';

const DEFAULT_ACCOUNTS = [
  { code:'1010', name:'Checking Account', type:'Asset', balance: 0 },
  { code:'1100', name:'Accounts Receivable', type:'Asset', balance: 0 },
  { code:'2100', name:'Accounts Payable', type:'Liability', balance: 0 },
  { code:'4010', name:'Sales Revenue', type:'Revenue', balance: 0 },
  { code:'6010', name:'Salaries & Wages', type:'Expense', balance: 0 },
  { code:'6030', name:'Rent', type:'Expense', balance: 0 },
  { code:'6060', name:'Software Subscriptions', type:'Expense', balance: 0 },
];

export default function ChartOfAccountsPage() {
  const [accounts] = useState(DEFAULT_ACCOUNTS);
  const types = [...new Set(accounts.map(a => a.type))];
  return (
    <div className='page'>
      <div className='page-header'>
        <h1 className='page-title'>Chart of Accounts</h1>
        <button className='btn-primary' style={{display:'flex',alignItems:'center',gap:6}}><span>+</span> New account</button>
      </div>
      {types.map(type => (
        <div key={type} style={{marginTop:20}}>
          <h2 style={{fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8}}>{type}</h2>
          <div className='card' style={{overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{borderBottom:'1px solid #D4DDCC'}}>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Code</th>
                <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#7A9A7A'}}>Name</th>
                <th style={{padding:'10px 16px',textAlign:'right',fontWeight:500,color:'#7A9A7A'}}>Balance</th>
              </tr></thead>
              <tbody>
                {accounts.filter(a => a.type === type).map(a => (
                  <tr key={a.code} style={{borderBottom:'0.5px solid #EBF2E8'}}>
                    <td style={{padding:'10px 16px',color:'#7A9A7A',fontFamily:'monospace'}}>{a.code}</td>
                    <td style={{padding:'10px 16px',fontWeight:500}}>{a.name}</td>
                    <td style={{padding:'10px 16px',textAlign:'right'}}>.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}