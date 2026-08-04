import { useState } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' });

export default function CustomerForm({ org, editing, onSave, onCancel }) {
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', poNumber:'', salesperson:'', ...(editing||{}) });

  function formatPhone(val) {
    const digits = val.replace(/\D/g,'').slice(0,10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  }

  async function save() {
    if (!form.name.trim()) return alert('Name is required');
    try {
      if (editing?.id) {
        await fetch(`${API}/orgs/${org.id}/contacts/${editing.id}`, { method:'PATCH', headers: authHeaders(), body: JSON.stringify({ ...form, type:'customer' }) });
      } else {
        await fetch(`${API}/orgs/${org.id}/contacts`, { method:'POST', headers: authHeaders(), body: JSON.stringify({ ...form, type:'customer' }) });
      }
      onSave();
    } catch(e) { alert('Error saving customer'); }
  }

  const F = ({label, field, placeholder, type='text'}) => (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>{label}</div>
      <input type={type} value={form[field]||''} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
        placeholder={placeholder} style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #40916C',background:'var(--color-surface)',color:'var(--color-text)',fontSize:15,boxSizing:'border-box'}} />
    </div>
  );

  return (
    <div style={{padding:32,maxWidth:600,margin:'0 auto'}}>
      <button onClick={onCancel} style={{background:'none',border:'none',color:'var(--color-text-secondary)',cursor:'pointer',fontSize:14,marginBottom:28,display:'flex',alignItems:'center',gap:6,padding:0}}>
        ← Back to Customers
      </button>
      <h1 style={{margin:'0 0 32px',fontSize:26,fontWeight:700}}>{editing?.id ? 'Edit Customer' : 'New Customer'}</h1>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:20}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Basic Info</h3>
        <F label="Name *" field="name" placeholder="Acme Corp" />
        <F label="Email" field="email" placeholder="billing@acme.com" type="email" />
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,color:'var(--color-text-secondary)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>Phone</div>
          <input value={form.phone||''} onChange={e=>setForm(f=>({...f,phone:formatPhone(e.target.value)}))}
            placeholder="(555) 000-0000" style={{width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #40916C',background:'var(--color-surface)',color:'var(--color-text)',fontSize:15,boxSizing:'border-box'}} />
        </div>
      </div>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:20}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Address</h3>
        <F label="Street Address" field="address" placeholder="123 Main St" />
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
          <F label="City" field="city" placeholder="Miami" />
          <F label="State" field="state" placeholder="FL" />
          <F label="Zip" field="zip" placeholder="33101" />
        </div>
      </div>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:28}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Account Details</h3>
        <F label="Default PO Number" field="poNumber" placeholder="PO-001" />
        <F label="Salesperson" field="salesperson" placeholder="Jane Smith" />
      </div>

      <div style={{display:'flex',gap:12}}>
        <button onClick={onCancel} style={{flex:1,padding:'13px',borderRadius:10,border:'1px solid var(--color-border)',background:'none',cursor:'pointer',fontSize:15,color:'var(--color-text)'}}>Cancel</button>
        <button onClick={save} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:'#2D6A4F',color:'#fff',cursor:'pointer',fontSize:15,fontWeight:600}}>Save Customer</button>
      </div>
    </div>
  );
}