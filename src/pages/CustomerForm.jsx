import { useState } from 'react';
const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('accessToken')}`, 'Content-Type': 'application/json' });

const inputStyle = {width:'100%',padding:'12px 14px',borderRadius:10,border:'1.5px solid #40916C',background:'var(--color-surface)',color:'var(--color-text)',fontSize:15,boxSizing:'border-box'};
const labelStyle = {fontSize:11,color:'var(--color-text-secondary)',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,display:'block'};
const fieldStyle = {marginBottom:20};

function formatPhone(val) {
  const digits = val.replace(/\D/g,'').slice(0,10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

export default function CustomerForm({ org, editing, onSave, onCancel }) {
  const [form, setForm] = useState({ name:'', email:'', phone:'', address:'', city:'', state:'', zip:'', poNumber:'', salesperson:'', ...(editing||{}) });

  const set = (field) => (e) => setForm(f => ({...f, [field]: e.target.value}));

  async function save() {
    if (!form.name.trim()) return alert('Name is required');
    try {
      const url = editing?.id ? `${API}/orgs/${org.id}/contacts/${editing.id}` : `${API}/orgs/${org.id}/contacts`;
      const method = editing?.id ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ ...form, type:'customer' }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) { alert(j.message || 'Could not save the customer.'); return; }
      onSave();
    } catch(e) { alert('Error saving customer'); }
  }

  return (
    <div style={{padding:32,maxWidth:600,margin:'0 auto'}}>
      <button onClick={onCancel} style={{background:'none',border:'none',color:'var(--color-text-secondary)',cursor:'pointer',fontSize:14,marginBottom:28,display:'flex',alignItems:'center',gap:6,padding:0}}>
        ← Back to Customers
      </button>
      <h1 style={{margin:'0 0 32px',fontSize:26,fontWeight:700}}>{editing?.id ? 'Edit Customer' : 'New Customer'}</h1>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:20}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Basic Info</h3>
        <div style={fieldStyle}><label style={labelStyle}>Company</label><input style={inputStyle} value={form.company||''} onChange={set('company')} placeholder="Acme Corp" /></div>
        <div style={fieldStyle}><label style={labelStyle}>Contact Name *</label><input style={inputStyle} value={form.name} onChange={set('name')} placeholder="Jane Smith" /></div>
        <div style={fieldStyle}><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="billing@acme.com" /></div>
        <div style={fieldStyle}><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e=>setForm(f=>({...f,phone:formatPhone(e.target.value)}))} placeholder="(555) 000-0000" /></div>
      </div>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:20}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Address</h3>
        <div style={fieldStyle}><label style={labelStyle}>Street Address</label><input style={inputStyle} value={form.address} onChange={set('address')} placeholder="123 Main St" /></div>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
          <div style={fieldStyle}><label style={labelStyle}>City</label><input style={inputStyle} value={form.city} onChange={set('city')} placeholder="Miami" /></div>
          <div style={fieldStyle}><label style={labelStyle}>State</label><input style={inputStyle} value={form.state} onChange={set('state')} placeholder="FL" /></div>
          <div style={fieldStyle}><label style={labelStyle}>Zip</label><input style={inputStyle} value={form.zip} onChange={set('zip')} placeholder="33101" /></div>
        </div>
      </div>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:28}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Account Details</h3>
        <div style={fieldStyle}><label style={labelStyle}>Default PO Number</label><input style={inputStyle} value={form.poNumber} onChange={set('poNumber')} placeholder="PO-001" /></div>
        <div style={fieldStyle}><label style={labelStyle}>Salesperson</label><input style={inputStyle} value={form.salesperson} onChange={set('salesperson')} placeholder="Jane Smith" /></div>
      </div>

      <div style={{background:'var(--color-surface)',borderRadius:14,padding:28,border:'1px solid var(--color-border)',marginBottom:28}}>
        <h3 style={{margin:'0 0 20px',fontSize:13,fontWeight:600,color:'var(--color-text-secondary)',textTransform:'uppercase',letterSpacing:'0.05em'}}>Dates & Notes</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={fieldStyle}><label style={labelStyle}>Date Added</label><input style={inputStyle} type="date" value={form.dateAdded ? new Date(form.dateAdded).toISOString().slice(0,10) : ''} onChange={set('dateAdded')} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Last Contact</label><input style={inputStyle} type="date" value={form.lastContact ? new Date(form.lastContact).toISOString().slice(0,10) : ''} onChange={set('lastContact')} /></div>
        </div>
        <div style={fieldStyle}><label style={labelStyle}>Notes</label><textarea style={{...inputStyle,minHeight:80,resize:'vertical'}} value={form.notes||''} onChange={set('notes')} placeholder="Any notes about this customer..." /></div>
      </div>
<div style={{display:'flex',gap:12}}>
        <button onClick={onCancel} style={{flex:1,padding:'13px',borderRadius:10,border:'1px solid var(--color-border)',background:'none',cursor:'pointer',fontSize:15,color:'var(--color-text)'}}>Cancel</button>
        <button onClick={save} style={{flex:2,padding:'13px',borderRadius:10,border:'none',background:'#2D6A4F',color:'#fff',cursor:'pointer',fontSize:15,fontWeight:600}}>Save Customer</button>
      </div>
    </div>
  );
}
