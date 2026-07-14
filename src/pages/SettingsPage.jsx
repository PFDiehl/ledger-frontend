import { useState } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import ThemePicker   from '../components/ui/ThemePicker';

const TABS = [
  { id:'appearance',   icon:'palette',     label:'Appearance'    },
  { id:'company',      icon:'building',    label:'Company'       },
  { id:'team',         icon:'users',       label:'Team'          },
  { id:'billing',      icon:'credit-card', label:'Billing'       },
  { id:'security',     icon:'lock',        label:'Security'      },
  { id:'integrations', icon:'plug',        label:'Integrations'  },
];

function CompanySettings() {
  const toast = useToast();
  const [form, setForm] = useState({ name:'Acme Co.', email:'billing@acmeco.com', phone:'', taxId:'', currency:'USD', fiscalYearEnd:'12', defaultPaymentTerms:'30', invoicePrefix:'INV-', invoiceNotes:'Thank you for your business!' });
  const F = ({ label, children }) => (
    <div className="form-field" style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Business details</div>
        <div className="form-row two-col">
          <F label="Business name"><input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></F>
          <F label="Business email"><input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></F>
        </div>
        <div className="form-row two-col">
          <F label="Phone"><input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 000-0000" /></F>
          <F label="Tax ID / EIN"><input value={form.taxId} onChange={e => setForm(f=>({...f,taxId:e.target.value}))} placeholder="12-3456789" /></F>
        </div>
      </div>
      <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:20 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Invoice defaults</div>
        <div className="form-row two-col">
          <F label="Invoice prefix"><input value={form.invoicePrefix} onChange={e => setForm(f=>({...f,invoicePrefix:e.target.value}))} style={{ maxWidth:120 }} /></F>
          <F label="Payment terms">
            <select value={form.defaultPaymentTerms} onChange={e => setForm(f=>({...f,defaultPaymentTerms:e.target.value}))}>
              {[['0','Due on receipt'],['7','Net 7'],['15','Net 15'],['30','Net 30'],['60','Net 60']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
        </div>
        <F label="Default invoice notes">
          <textarea value={form.invoiceNotes} onChange={e => setForm(f=>({...f,invoiceNotes:e.target.value}))} rows={2} style={{ resize:'vertical', fontSize:13 }} />
        </F>
      </div>
      <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:20 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Regional</div>
        <div className="form-row two-col">
          <F label="Base currency">
            <select value={form.currency} onChange={e => setForm(f=>({...f,currency:e.target.value}))}>
              {['USD','EUR','GBP','CAD','AUD','JPY'].map(c => <option key={c}>{c}</option>)}
            </select>
          </F>
          <F label="Fiscal year end">
            <select value={form.fiscalYearEnd} onChange={e => setForm(f=>({...f,fiscalYearEnd:e.target.value}))}>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => <option key={i+1} value={String(i+1)}>{m}</option>)}
            </select>
          </F>
        </div>
      </div>
      <div>
        <button className="btn-primary" onClick={() => toast.success('Company settings saved')} style={{ marginRight:8 }}>Save changes</button>
        <button className="btn-secondary">Discard</button>
      </div>
    </div>
  );
}

function TeamSettings() {
  const toast = useToast();
  const members = [
    { name:'Alex Demo', email:'alex@acmeco.com', role:'Owner', avatar:'AD', lastActive:'Now' },
    { name:'Jane Doe',  email:'jane@acmeco.com', role:'Admin', avatar:'JD', lastActive:'2h ago' },
    { name:'Bob Smith', email:'bob@acmeco.com',  role:'Member',avatar:'BS', lastActive:'Yesterday' },
  ];
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div><div style={{ fontSize:13, fontWeight:500 }}>Team members</div><div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>3 of 10 seats used</div></div>
        <button className="btn-primary" onClick={() => toast.info('Invite dialog…')}><i className="ti ti-plus" /> Invite</button>
      </div>
      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {members.map((m,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i<members.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--brand-accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, color:'var(--brand-primary)', flexShrink:0 }}>{m.avatar}</div>
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{m.name}</div><div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>{m.email}</div></div>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginRight:8 }}>Active {m.lastActive}</div>
            <select defaultValue={m.role} style={{ fontSize:12, padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)' }}>
              {['Owner','Admin','Accountant','Member','Viewer'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const toast = useToast();
  const items = [
    { title:'Change password', sub:'Last changed 3 months ago', action:'Change', icon:'lock' },
    { title:'Two-factor authentication', sub:'Not enabled — recommended', action:'Enable', icon:'shield', highlight:true },
    { title:'Active sessions', sub:'1 active session', action:'View', icon:'device-laptop' },
    { title:'API keys', sub:'0 keys', action:'Manage', icon:'key' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i<items.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none', background: item.highlight ? 'var(--brand-accent-light)' : 'transparent' }}>
            <i className={`ti ti-${item.icon}`} style={{ fontSize:18, color:'var(--color-text-secondary)' }} />
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{item.title}</div><div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:2 }}>{item.sub}</div></div>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => toast.info(item.title)}>{item.action}</button>
          </div>
        ))}
      </div>
      <div style={{ background:'#FCEBEB', border:'0.5px solid #F09595', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#A32D2D', marginBottom:4 }}>Danger zone</div>
        <div style={{ fontSize:12, color:'#791F1F', marginBottom:10 }}>Deleting your account is permanent and cannot be undone.</div>
        <button style={{ fontSize:12, padding:'6px 14px', borderRadius:8, background:'transparent', border:'1px solid #A32D2D', color:'#A32D2D', cursor:'pointer' }} onClick={() => toast.error('Contact support to delete your account.')}>Delete account</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('appearance');

  const renderContent = () => {
    switch(tab) {
      case 'appearance':   return <ThemePicker />;
      case 'company':      return <CompanySettings />;
      case 'team':         return <TeamSettings />;
      case 'security':     return <SecuritySettings />;
      default: return (
        <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-tertiary)', fontSize:13 }}>
          <i className="ti ti-tools" style={{ fontSize:28, display:'block', marginBottom:10 }} />
          Coming soon
        </div>
      );
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header"><h1 className="page-title">Settings</h1></div>
      <div style={{ display:'grid', gridTemplateColumns:'180px minmax(0,1fr)', gap:20, alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
              borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', fontSize:13,
              background: tab===t.id ? 'var(--brand-accent-light)' : 'transparent',
              color:      tab===t.id ? 'var(--brand-primary)' : 'var(--color-text-secondary)',
              fontWeight: tab===t.id ? 500 : 400,
            }}>
              <i className={`ti ti-${t.icon}`} style={{ fontSize:15 }} />
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:12, padding:'22px 24px' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
