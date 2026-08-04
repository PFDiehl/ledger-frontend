import { useState, useEffect } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const fmt = (n) => Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' });

function Avatar({ name }) {
  const colors = ['#2D6A4F','#1B4332','#40916C','#52B788','#1E6091','#184E77','#6B2D8B','#9B2226'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{width:38,height:38,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:700,color:'#fff',flexShrink:0}}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function CustomersPage({ org }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', poNumber:'', salesperson:'' });

  useEffect(() => { if (org) loadCustomers(); }, [org]);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orgs/${org.id}/contacts?type=customer`, { headers: authHeaders() });
      const data = await res.json();
      setCustomers(data.data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setForm({ name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', poNumber:'', salesperson:'' });
    setShowForm(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ name:c.name||'', email:c.email||'', phone:c.phone||'', address:c.address||'', city:c.city||'', state:c.state||'', zip:c.zip||'', poNumber:c.poNumber||'', salesperson:c.salesperson||'' });
    setShowForm(true);
    setSelected(null);
  }

  async function saveCustomer() {
    if (!form.name.trim()) return alert('Name is required');
    try {
      if (editing) {
        await fetch(`${API}/orgs/${org.id}/contacts/${editing.id}`, { method:'PATCH', headers: authHeaders(), body: JSON.stringify({ ...form, type:'customer' }) });
      } else {
        await fetch(`${API}/orgs/${org.id}/contacts`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ ...form, type:'customer' }) });
      }
      setShowForm(false);
      loadCustomers();
    } catch(e) { alert('Error saving customer'); }
  }

  async function deleteCustomer(c) {
    if (!window.confirm(`Delete ${c.name}?`)) return;
    try {
      await fetch(`${API}/orgs/${org.id}/contacts/${c.id}`, { method:'DELETE', headers: authHeaders() });
      setSelected(null);
      loadCustomers();
    } catch(e) { alert('Error deleting customer'); }
  }

  function getTotals(c) {
    const invoices = c.invoices || [];
    const totalInvoiced = invoices.reduce((s,i) => s + Number(i.total||0), 0);
    const totalPaid = invoices.filter(i => i.status==='paid').reduce((s,i) => s + Number(i.total||0), 0);
    const outstanding = invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).reduce((s,i) => s + Number(i.total||0), 0);
    return { totalInvoiced, totalPaid, outstanding };
  }

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email||'').toLowerCase().includes(search.toLowerCase()));

  const F = ({label, field, placeholder, type='text'}) => (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:'var(--color-text-tertiary)',marginBottom:4,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>{label}</div>
      <input type={type} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
        placeholder={placeholder} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #40916C',background:'var(--color-surface)',color:'var(--color-text)',fontSize:14,boxSizing:'border-box'}} />
    </div>
  );

  if (selected) {
    const {totalInvoiced, totalPaid, outstanding} = getTotals(selected);
    return (
      <div style={{padding:32,maxWidth:860,margin:'0 auto'}}>
        <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'var(--color-text-secondary)',cursor:'pointer',fontSize:14,marginBottom:28,display:'flex',alignItems:'center',gap:6,padding:0}}>
          ← Back to Customers
        </button>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <Avatar name={selected.name} />
            <div>
              <h2 style={{margin:0,fontSize:26,fontWeight:700}}>{selected.name}</h2>
              <div style={{color:'var(--color-text-secondary)',fontSize:14,marginTop:2}}>{selected.email||'No email on file'}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>openEdit(selected)} style={{padding:'8px 18px',borderRadius:8,border:'1px solid var(--color-border)',background:'var(--color-surface)',color:'var(--color-text)',cursor:'pointer',fontSize:14,fontWeight:500}}>Edit</button>
            <button onClick={()=>deleteCustomer(selected)} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#dc2626',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:500}}>Delete</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
          {[['Total Invoiced',totalInvoiced,'var(--color-text)'],['Total Paid',totalPaid,'#16a34a'],['Outstanding',outstanding,'#d97706']].map(([l,v,c])=>(
            <div key={l} style={{background:'var(--color-surface)',borderRadius:14,padding:22,border:'1px solid var(--color-border)'}}>
              <div style={{fontSize:12,color:'var(--color-text-secondary)',marginBottom:8,fontWeight:500}}>{l}</div>
              <div style={{fontSize:24,fontWeight:700,color:c}}>${fmt(v)}</div>
            </div>
          ))}
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div style={{background:'var(--color-surface)',borderRadius:14,padding:22,border:'1px solid var(--color-border)'}}>
            <h3 style={{margin:'0 0 16px',fontSize:14,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Contact Info</h3>
            {[['Email',selected.email],['Phone',selected.phone],['Address',selected.address],['City',selected.city],['State',selected.state],['Zip',selected.zip]].map(([l,v])=> v ? (
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)',fontSize:14}}>
                <span style={{color:'var(--color-text-secondary)'}}>{l}</span><span style={{fontWeight:500}}>{v}</span>
              </div>
            ) : null)}
          </div>
          <div style={{background:'var(--color-surface)',borderRadius:14,padding:22,border:'1px solid var(--color-border)'}}>
            <h3 style={{margin:'0 0 16px',fontSize:14,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Account Details</h3>
            {[['PO Number',selected.poNumber],['Salesperson',selected.salesperson]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--color-border)',fontSize:14}}>
                <span style={{color:'var(--color-text-secondary)'}}>{l}</span><span style={{fontWeight:500}}>{v||'-'}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{background:'var(--color-surface)',borderRadius:14,padding:22,border:'1px solid var(--color-border)'}}>
          <h3 style={{margin:'0 0 16px',fontSize:14,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Invoice History</h3>
          {(selected.invoices||[]).length === 0 ? (
            <div style={{color:'var(--color-text-secondary)',fontSize:14,padding:'20px 0',textAlign:'center'}}>No invoices yet</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
              <thead><tr>{['Invoice','Date','Amount','Status'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'8px 12px',borderBottom:'1px solid var(--color-border)',color:'var(--color-text-secondary)',fontWeight:600,fontSize:12,textTransform:'uppercase',letterSpacing:'0.04em'}}>{h}</th>
              ))}</tr></thead>
              <tbody>{(selected.invoices||[]).map(inv=>(
                <tr key={inv.id} style={{borderBottom:'1px solid var(--color-border)'}}>
                  <td style={{padding:'11px 12px',fontWeight:600}}>{inv.invoiceNumber}</td>
                  <td style={{padding:'11px 12px',color:'var(--color-text-secondary)'}}>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '-'}</td>
                  <td style={{padding:'11px 12px',fontWeight:600}}>${fmt(inv.total)}</td>
                  <td style={{padding:'11px 12px'}}>
                    <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,
                      background:inv.status==='paid'?'#dcfce7':inv.status==='sent'?'#dbeafe':inv.status==='overdue'?'#fee2e2':'#fef9c3',
                      color:inv.status==='paid'?'#16a34a':inv.status==='sent'?'#1d4ed8':inv.status==='overdue'?'#dc2626':'#854d0e'}}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:32,maxWidth:1060,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <h1 style={{margin:0,fontSize:28,fontWeight:700}}>Customers</h1>
          <div style={{color:'var(--color-text-secondary)',fontSize:14,marginTop:4}}>{customers.length} customer{customers.length!==1?'s':''}</div>
        </div>
        <button onClick={openNew} style={{padding:'10px 22px',borderRadius:10,border:'none',background:'#2D6A4F',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',gap:6,border:'ap:6}}>
          + Add Customer
        </button>
      </div>

      <div style={{marginBottom:20}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search customers..." style={{width:'100%',padding:'11px 16px',borderRadius:10,border:'1.5px solid #40916C',background:'var(--color-surface)',color:'var(--color-text)',fontSize:14,boxSizing:'border-box'}} />
      </div>

      {loading ? (
        <div style={{color:'var(--color-text-secondary)',padding:40,textAlign:'center'}}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{textAlign:'center',padding:60,color:'var(--color-text-secondary)'}}>
          <div style={{fontSize:48,marginBottom:16}}>👥</div>
          <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:'var(--color-text)'}}>No customers yet</div>
          <div style={{fontSize:14,marginBottom:24}}>Add your first customer to get started</div>
          <button onClick={openNew} style={{padding:'10px 22px',borderRadius:10,border:'none',background:'var(--color-primary)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600}}>+ Add Customer</button>
        </div>
      ) : (
        <div style={{background:'var(--color-surface)',borderRadius:14,border:'1px solid var(--color-border)',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
            <thead><tr style={{background:'var(--color-surface-secondary)'}}>
              {['Customer','Email','Phone','Salesperson','Total Invoiced','Outstanding',''].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'12px 16px',color:'var(--color-text-secondary)',fontWeight:600,fontSize:11,borderBottom:'1px solid var(--color-border)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{filtered.map(c => {
              const {totalInvoiced, outstanding} = getTotals(c);
              return (
                <tr key={c.id} onClick={()=>setSelected(c)} style={{borderBottom:'1px solid var(--color-border)',cursor:'pointer',transition:'background 0.15s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--color-surface-secondary)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{padding:'12px 16px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <Avatar name={c.name} />
                      <span style={{fontWeight:600}}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{padding:'12px 16px',color:'var(--color-text-secondary)'}}>{c.email||'-'}</td>
                  <td style={{padding:'12px 16px',color:'var(--color-text-secondary)'}}>{c.phone||'-'}</td>
                  <td style={{padding:'12px 16px',color:'var(--color-text-secondary)'}}>{c.salesperson||'-'}</td>
                  <td style={{padding:'12px 16px',fontWeight:600}}>${fmt(totalInvoiced)}</td>
                  <td style={{padding:'12px 16px'}}>
                    {outstanding > 0
                      ? <span style={{color:'#d97706',fontWeight:700}}>${fmt(outstanding)}</span>
                      : <span style={{color:'var(--color-text-secondary)'}}>$0.00</span>}
                  </td>
                  <td style={{padding:'12px 16px'}}>
                    <button onClick={e=>{e.stopPropagation();openEdit(c);}} style={{padding:'5px 14px',borderRadius:6,border:'1px solid var(--color-border)',background:'none',cursor:'pointer',fontSize:12,color:'var(--color-text-secondary)',fontWeight:500}}>Edit</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div style={{background:'var(--color-background)',borderRadius:18,padding:32,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h2 style={{margin:0,fontSize:20,fontWeight:700}}>{editing ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'var(--color-text-secondary)',lineHeight:1}}>×</button>
            </div>
            <F label="Name *" field="name" placeholder="Acme Corp" />
            <F label="Email" field="email" placeholder="billing@acme.com" type="email" />
            <F label="Phone" field="phone" placeholder="(555) 000-0000" />
            <F label="Address" field="address" placeholder="123 Main St" />
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
              <F label="City" field="city" placeholder="Miami" />
              <F label="State" field="state" placeholder="FL" />
              <F label="Zip" field="zip" placeholder="33101" />
            </div>
            <F label="Default PO Number" field="poNumber" placeholder="PO-001" />
            <F label="Salesperson" field="salesperson" placeholder="Jane Smith" />
            <div style={{display:'flex',gap:12,marginTop:8}}>
              <button onClick={()=>setShowForm(false)} style={{flex:1,padding:'12px',borderRadius:10,border:'1px solid var(--color-border)',background:'none',cursor:'pointer',fontSize:14,color:'var(--color-text)'}}>Cancel</button>
              <button onClick={saveCustomer} style={{flex:1,padding:'12px',borderRadius:10,border:'none',background:'var(--color-primary)',color:'#fff',cursor:'pointer',fontSize:14,fontWeight:600}}>Save Customer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
