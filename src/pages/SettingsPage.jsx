import { useState, useEffect, useRef } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { api }      from '../lib/api';
import ThemePicker   from '../components/ui/ThemePicker';
import BillingPage   from './BillingPage';

const TABS = [
  { id:'appearance',   icon:'palette',     label:'Appearance'    },
  { id:'brand',        icon:'photo',       label:'Branding'      },
  { id:'company',      icon:'building',    label:'Company'       },
  { id:'team',         icon:'users',       label:'Team'          },
  { id:'billing',      icon:'credit-card', label:'Billing'       },
  { id:'security',     icon:'lock',        label:'Security'      },
  { id:'integrations', icon:'plug',        label:'Integrations'  },
  { id:'data',         icon:'download',    label:'Export'        },
];

function DataExport() {
  const toast = useToast();
  const { org } = useAuth();
  const [busy, setBusy] = useState('');
  const API = 'https://ledger-accounting-production.up.railway.app/api';

  async function download(entity, filename) {
    if (!org) return;
    setBusy(entity);
    try {
      const r = await fetch(`${API}/orgs/${org.id}/export/${entity}.csv`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      });
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch { toast.error('Could not export — please try again.'); }
    finally { setBusy(''); }
  }

  const items = [
    ['customers', 'customers.csv', 'Customers'],
    ['vendors',   'vendors.csv',   'Vendors'],
    ['invoices',  'invoices.csv',  'Invoices'],
    ['expenses',  'expenses.csv',  'Expenses'],
    ['bills',     'bills.csv',     'Bills'],
  ];

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Export your data</div>
      <div style={{ fontSize:12, color:'var(--color-text-tertiary)', marginBottom:16 }}>Download your records as CSV files — open them in Excel, Google Sheets, or Numbers. Your data is always yours.</div>
      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {items.map(([entity, filename, label], i) => (
          <div key={entity} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i<items.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <i className="ti ti-file-spreadsheet" style={{ fontSize:18, color:'var(--color-text-secondary)' }} />
            <div style={{ flex:1, fontSize:13, fontWeight:500 }}>{label}</div>
            <button className="btn-secondary" style={{ fontSize:12 }} disabled={busy===entity} onClick={()=>download(entity, filename)}>
              {busy===entity ? 'Preparing…' : 'Download CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="form-field" style={{ marginBottom:14 }}>
      <label style={{ fontSize:12, fontWeight:500, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>{label}</label>
      {children}
    </div>
  );
}

function CompanySettings() {
  const toast = useToast();
  const { org } = useAuth();
  const API = 'https://ledger-accounting-production.up.railway.app/api';
  const [form, setForm] = useState({ name:'', email:'', phone:'', taxId:'', address:'', city:'', state:'', zip:'', country:'', website:'', currency:'USD', paymentTerms:'30', invoicePrefix:'INV-', invoiceNotes:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!org) return;
    fetch(`${API}/orgs/${org.id}/settings`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` } })
      .then(r => r.json())
      .then(j => { if (j.success && j.data) setForm(f => ({ ...f, ...j.data, invoicePrefix: j.data.invoicePrefix || 'INV-' })); })
      .catch(() => {});
  }, [org?.id]);

  async function save() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/orgs/${org.id}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
        body: JSON.stringify(form)
      });
      const j = await r.json();
      if (j.success) toast.success('Company settings saved!');
      else toast.error(j.message || 'Failed to save');
    } catch(e) { toast.error('Cannot connect'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Business details</div>
        <div className="form-row two-col">
          <FieldRow label="Business name"><input value={form.name||''} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></FieldRow>
          <FieldRow label="Business email"><input type="email" value={form.email||''} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></FieldRow>
        </div>
        <div className="form-row two-col">
          <FieldRow label="Phone"><input value={form.phone||''} onChange={e => { const digits = e.target.value.replace(/\D/g,'').slice(0,10); let formatted = ''; if (digits.length > 0) formatted = '(' + digits.slice(0,3); if (digits.length >= 4) formatted += ') ' + digits.slice(3,6); if (digits.length >= 7) formatted += '-' + digits.slice(6,10); setForm(f=>({...f,phone:formatted})); }} placeholder="(555) 000-0000" /></FieldRow>
          <FieldRow label="Tax ID / EIN"><input value={form.taxId||''} onChange={e => setForm(f=>({...f,taxId:e.target.value}))} placeholder="12-3456789" /></FieldRow>
        </div>
        <FieldRow label="Website"><input value={form.website||''} onChange={e => setForm(f=>({...f,website:e.target.value}))} placeholder="https://yourcompany.com" /></FieldRow>
      </div>
      <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:20 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Business address</div>
        <FieldRow label="Street address"><input value={form.address||''} onChange={e => setForm(f=>({...f,address:e.target.value}))} placeholder="123 Main St" /></FieldRow>
        <div className="form-row two-col">
          <FieldRow label="City"><input value={form.city||''} onChange={e => setForm(f=>({...f,city:e.target.value}))} placeholder="Tampa" /></FieldRow>
          <FieldRow label="State"><input value={form.state||''} onChange={e => setForm(f=>({...f,state:e.target.value}))} placeholder="FL" /></FieldRow>
        </div>
        <div className="form-row two-col">
          <FieldRow label="ZIP"><input value={form.zip||''} onChange={e => setForm(f=>({...f,zip:e.target.value}))} placeholder="33601" /></FieldRow>
          <FieldRow label="Country"><input value={form.country||''} onChange={e => setForm(f=>({...f,country:e.target.value}))} placeholder="United States" /></FieldRow>
        </div>
      </div>
      <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:20 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Invoice defaults</div>
        <div className="form-row two-col">
          <FieldRow label="Invoice prefix"><input value={form.invoicePrefix||'INV-'} onChange={e => setForm(f=>({...f,invoicePrefix:e.target.value}))} style={{ maxWidth:120 }} /></FieldRow>
          <FieldRow label="Payment terms">
            <select value={form.paymentTerms||'30'} onChange={e => setForm(f=>({...f,paymentTerms:e.target.value}))}>
              {[['0','Due on receipt'],['7','Net 7'],['15','Net 15'],['30','Net 30'],['60','Net 60']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FieldRow>
        </div>
        <FieldRow label="Default invoice notes">
          <textarea value={form.invoiceNotes||''} onChange={e => setForm(f=>({...f,invoiceNotes:e.target.value}))} rows={2} style={{ resize:'vertical', fontSize:13 }} />
        </FieldRow>
      </div>
      <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:20 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:14 }}>Regional</div>
        <FieldRow label="Base currency">
          <select value={form.currency||'USD'} onChange={e => setForm(f=>({...f,currency:e.target.value}))}>
            {['USD','EUR','GBP','CAD','AUD','JPY'].map(c => <option key={c}>{c}</option>)}
          </select>
        </FieldRow>
      </div>
      <div>
        <button className="btn-primary" onClick={save} disabled={loading} style={{ marginRight:8 }}>
          {loading ? 'Saving...' : 'Save changes'}
        </button>
        <button className="btn-secondary">Discard</button>
      </div>
    </div>
  );
}
const TEAM_ROLE_RANK = { viewer:0, member:1, manager:2, admin:3, owner:4 };
const ASSIGNABLE_ROLES = ['viewer','member','manager','admin'];
const ROLE_LABEL = { viewer:'Viewer', member:'Member', manager:'Manager', admin:'Admin', owner:'Owner' };

function initials(name, email) {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0,2).toUpperCase();
}

function TeamSettings() {
  const toast = useToast();
  const { org } = useAuth();
  const myRole  = org?.role || 'viewer';
  const canManage = (TEAM_ROLE_RANK[myRole] ?? 0) >= TEAM_ROLE_RANK.admin;

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!org) return;
    setLoading(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/team`, { headers: secHeaders() });
      const j = await r.json();
      if (j.success) setMembers(j.data || []);
    } catch { /* leave list as-is */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [org?.id]);

  async function changeRole(userId, role) {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/team/${userId}`, {
        method:'PATCH', headers: secHeaders(), body: JSON.stringify({ role }),
      });
      const j = await r.json();
      if (j.success) { toast.success('Role updated'); setMembers(ms => ms.map(m => m.userId===userId ? { ...m, role } : m)); }
      else toast.error(j.message || 'Could not update role');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function removeMember(userId, name) {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/team/${userId}`, { method:'DELETE', headers: secHeaders() });
      const j = await r.json();
      if (j.success) { toast.success(`Removed ${name || 'member'}`); setMembers(ms => ms.filter(m => m.userId!==userId)); }
      else toast.error(j.message || 'Could not remove');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function sendInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { toast.error('Enter an email'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/team`, {
        method:'POST', headers: secHeaders(), body: JSON.stringify({ email, role: inviteRole }),
      });
      const j = await r.json();
      if (j.success) {
        toast.success('Added to your team');
        setInviteEmail(''); setInviteOpen(false); load();
      } else toast.error(j.message || 'Could not add that person');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500 }}>Team members</div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>
            {loading ? 'Loading…' : `${members.length} member${members.length===1?'':'s'}`}
          </div>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setInviteOpen(o => !o)}><i className="ti ti-plus" /> Invite</button>
        )}
      </div>

      {canManage && inviteOpen && (
        <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, padding:'14px 16px', marginBottom:16, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input type="email" placeholder="teammate@email.com" value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)} style={{ flex:'1 1 220px', fontSize:13 }} />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ fontSize:13 }}>
            {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button className="btn-primary" style={{ fontSize:12 }} disabled={busy} onClick={sendInvite}>{busy ? '…' : 'Add'}</button>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => setInviteOpen(false)}>Cancel</button>
          <div style={{ flexBasis:'100%', fontSize:11, color:'var(--color-text-tertiary)' }}>
            They need a MountainTop Ledger account first. Roles: Viewer (read-only), Member (day-to-day work), Manager, Admin (settings &amp; team).
          </div>
        </div>
      )}

      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {members.length === 0 && !loading && (
          <div style={{ padding:'16px', fontSize:13, color:'var(--color-text-tertiary)' }}>No team members yet.</div>
        )}
        {members.map((m,i) => {
          const editable = canManage && m.role !== 'owner' && !m.isSelf;
          return (
            <div key={m.userId} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom: i<members.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
              <div style={{ width:34, height:34, borderRadius:'50%', background:'var(--brand-accent-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:500, color:'var(--brand-primary)', flexShrink:0 }}>{initials(m.name, m.email)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{m.name || m.email}{m.isSelf ? ' (you)' : ''}</div>
                <div style={{ fontSize:11, color:'var(--color-text-tertiary)', overflow:'hidden', textOverflow:'ellipsis' }}>{m.email}</div>
              </div>
              {editable ? (
                <select value={m.role} disabled={busy} onChange={e => changeRole(m.userId, e.target.value)}
                  style={{ fontSize:12, padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)' }}>
                  {ASSIGNABLE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </select>
              ) : (
                <span style={{ fontSize:12, color:'var(--color-text-secondary)', padding:'4px 8px' }}>{ROLE_LABEL[m.role] || m.role}</span>
              )}
              {editable && (
                <button className="btn-secondary" style={{ fontSize:12, marginLeft:4 }} disabled={busy} onClick={() => removeMember(m.userId, m.name)}>Remove</button>
              )}
            </div>
          );
        })}
      </div>

      {!canManage && (
        <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:10 }}>
          Only admins and owners can invite people or change roles.
        </div>
      )}
    </div>
  );
}

const SEC_API = 'https://ledger-accounting-production.up.railway.app/api';
function secHeaders() {
  return { 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('accessToken') ?? ''}` };
}

function TwoFactorRow() {
  const toast = useToast();
  const [enabled, setEnabled]   = useState(null);   // null = loading
  const [step, setStep]         = useState('idle');  // idle | setup | backup | disable
  const [busy, setBusy]         = useState(false);
  const [qr, setQr]             = useState('');
  const [secret, setSecret]     = useState('');
  const [code, setCode]         = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  useEffect(() => {
    fetch(`${SEC_API}/auth/2fa/status`, { headers: secHeaders() })
      .then(r => r.json())
      .then(j => setEnabled(!!j?.data?.enabled))
      .catch(() => setEnabled(false));
  }, []);

  async function beginSetup() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/auth/2fa/setup`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (!j.success) { toast.error(j.message || 'Could not start setup'); return; }
      setQr(j.data.qrDataUrl); setSecret(j.data.secret); setCode(''); setStep('setup');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function confirmEnable() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/auth/2fa/enable`, { method:'POST', headers: secHeaders(), body: JSON.stringify({ code }) });
      const j = await r.json();
      if (!j.success) { toast.error(j.message || 'That code was incorrect'); return; }
      setBackupCodes(j.data.backupCodes || []); setEnabled(true); setStep('backup');
      toast.success('Two-factor authentication enabled');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function confirmDisable() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/auth/2fa/disable`, { method:'POST', headers: secHeaders(), body: JSON.stringify({ password }) });
      const j = await r.json();
      if (!j.success) { toast.error(j.message || 'Incorrect password'); return; }
      setEnabled(false); setStep('idle'); setPassword('');
      toast.success('Two-factor authentication disabled');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  const sub = enabled === null ? 'Checking…' : enabled ? 'Enabled — your account is protected' : 'Not enabled — recommended';

  return (
    <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, padding:'14px 16px', background: enabled ? 'transparent' : 'var(--brand-accent-light)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <i className="ti ti-shield" style={{ fontSize:18, color:'var(--color-text-secondary)' }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500 }}>Two-factor authentication</div>
          <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:2 }}>{sub}</div>
        </div>
        {enabled === false && step === 'idle' && (
          <button className="btn-primary" style={{ fontSize:12 }} disabled={busy} onClick={beginSetup}>{busy ? '…' : 'Enable'}</button>
        )}
        {enabled === true && step === 'idle' && (
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => { setPassword(''); setStep('disable'); }}>Disable</button>
        )}
      </div>

      {step === 'setup' && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:12 }}>
            1. Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password).
          </div>
          {qr && <img src={qr} alt="2FA QR code" style={{ width:180, height:180, borderRadius:8, background:'#fff', padding:8, display:'block' }} />}
          <div style={{ fontSize:11, color:'var(--color-text-tertiary)', margin:'10px 0' }}>
            Can't scan? Enter this key manually: <code style={{ fontSize:11 }}>{secret}</code>
          </div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:8 }}>2. Enter the 6-digit code to confirm.</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" inputMode="numeric"
              style={{ width:120, fontSize:16, letterSpacing:3, textAlign:'center' }} />
            <button className="btn-primary" style={{ fontSize:12 }} disabled={busy || code.length < 6} onClick={confirmEnable}>{busy ? '…' : 'Confirm'}</button>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => setStep('idle')}>Cancel</button>
          </div>
        </div>
      )}

      {step === 'backup' && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>Save your backup codes</div>
          <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginBottom:12 }}>
            Each code works once if you lose access to your authenticator. Store them somewhere safe — they won't be shown again.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontFamily:'monospace', fontSize:14, marginBottom:12 }}>
            {backupCodes.map(c => <div key={c} style={{ padding:'6px 10px', background:'var(--color-background-secondary)', borderRadius:6, textAlign:'center' }}>{c}</div>)}
          </div>
          <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => { navigator.clipboard?.writeText(backupCodes.join('\n')); toast.success('Backup codes copied'); }}>Copy codes</button>
          <button className="btn-primary" style={{ fontSize:12, marginLeft:8 }} onClick={() => setStep('idle')}>Done</button>
        </div>
      )}

      {step === 'disable' && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginBottom:8 }}>Enter your password to turn off two-factor authentication.</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" style={{ maxWidth:220, fontSize:14 }} />
            <button className="btn-primary" style={{ fontSize:12 }} disabled={busy || !password} onClick={confirmDisable}>{busy ? '…' : 'Disable'}</button>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => setStep('idle')}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySettings() {
  const toast = useToast();
  const { logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!window.confirm('Permanently delete this account and ALL of its data (invoices, accounts, journal entries)? This cannot be undone.')) return;
    if (!window.confirm('Last chance — really delete this account for good?')) return;
    setDeleting(true);
    try {
      await api.delete('/auth/account');
      // Clear this browser's stored session so it can't auto-restore the deleted user.
      await logout();
      window.location.href = '/login';
    } catch (e) {
      toast.error(e.message || 'Could not delete the account.');
      setDeleting(false);
    }
  };

  const items = [
    { title:'Change password', sub:'Use "Forgot password" on the sign-in screen', action:'Reset', icon:'lock' },
    { title:'Active sessions', sub:'1 active session', action:'View', icon:'device-laptop' },
    { title:'API keys', sub:'0 keys', action:'Manage', icon:'key' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <TwoFactorRow />
      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i<items.length-1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
            <i className={`ti ti-${item.icon}`} style={{ fontSize:18, color:'var(--color-text-secondary)' }} />
            <div style={{ flex:1 }}><div style={{ fontSize:13, fontWeight:500 }}>{item.title}</div><div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:2 }}>{item.sub}</div></div>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={() => toast.info(item.title)}>{item.action}</button>
          </div>
        ))}
      </div>
      <div style={{ background:'#FCEBEB', border:'0.5px solid #F09595', borderRadius:10, padding:'14px 16px' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#A32D2D', marginBottom:4 }}>Danger zone</div>
        <div style={{ fontSize:12, color:'#791F1F', marginBottom:10 }}>Deleting your account is permanent and cannot be undone.</div>
        <button disabled={deleting} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, background:'transparent', border:'1px solid #A32D2D', color:'#A32D2D', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1 }} onClick={deleteAccount}>{deleting ? 'Deleting…' : 'Delete account'}</button>
      </div>
    </div>
  );
}

function IntegrationsSettings() {
  const toast = useToast();
  const { org } = useAuth();
  const myRole  = org?.role || 'viewer';
  const canManage = (TEAM_ROLE_RANK[myRole] ?? 0) >= TEAM_ROLE_RANK.admin;
  const [status, setStatus] = useState(null); // { configured, connected, realmId, env, connectedAt }
  const [busy, setBusy] = useState(false);
  const [company, setCompany] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncingInv, setSyncingInv] = useState(false);
  const [invResult, setInvResult] = useState(null);
  const [syncingExp, setSyncingExp] = useState(false);
  const [expResult, setExpResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importingInv, setImportingInv] = useState(false);
  const [invImportResult, setInvImportResult] = useState(null);
  const [importingExp, setImportingExp] = useState(false);
  const [expImportResult, setExpImportResult] = useState(null);
  const [syncingVen, setSyncingVen] = useState(false);
  const [venResult, setVenResult] = useState(null);
  const [syncingBill, setSyncingBill] = useState(false);
  const [billResult, setBillResult] = useState(null);
  const [importingVen, setImportingVen] = useState(false);
  const [venImportResult, setVenImportResult] = useState(null);
  const [importingBill, setImportingBill] = useState(false);
  const [billImportResult, setBillImportResult] = useState(null);

  const runSync = async (path, setBusy, setResult, noun) => {
    setBusy(true); setResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/${path}`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setResult(j.data);
        const moved = (j.data.created || 0) + (j.data.linked || 0) + (j.data.imported || 0);
        toast.success(`${moved} of ${j.data.total} ${noun}${j.data.total === 1 ? '' : 's'} processed`);
      } else toast.error(j.message || 'Operation failed');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  };

  async function loadStatus() {
    if (!org) return;
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/status`, { headers: secHeaders() });
      const j = await r.json();
      if (j.success) setStatus(j.data);
    } catch { /* leave null */ }
  }
  useEffect(() => { loadStatus(); }, [org?.id]);

  // Surface the OAuth redirect result (?qbo=connected / error) once on mount.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const qbo = p.get('qbo');
    if (qbo === 'connected') { toast.success('QuickBooks connected'); loadStatus(); }
    else if (qbo === 'error') { toast.error('QuickBooks connection failed: ' + (p.get('reason') || 'unknown')); }
    if (qbo) {
      const url = new URL(window.location.href);
      url.searchParams.delete('qbo'); url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  async function connect() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/connect`, { headers: secHeaders() });
      const j = await r.json();
      if (j.success && j.data?.url) { window.location.href = j.data.url; }
      else toast.error(j.message || 'Could not start QuickBooks connection');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/disconnect`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) { toast.success('QuickBooks disconnected'); setCompany(null); setSyncResult(null); loadStatus(); }
      else toast.error(j.message || 'Could not disconnect');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function verify() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/company`, { headers: secHeaders() });
      const j = await r.json();
      if (j.success) { setCompany(j.data); toast.success(`Connected to ${j.data.companyName || 'QuickBooks'}`); }
      else toast.error(j.message || 'Could not read company info');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function syncCustomers() {
    setSyncing(true); setSyncResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/sync/customers`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setSyncResult(j.data);
        const moved = (j.data.created || 0) + (j.data.linked || 0);
        toast.success(`Synced ${moved} of ${j.data.total} customer${j.data.total === 1 ? '' : 's'} to QuickBooks`);
      } else toast.error(j.message || 'Sync failed');
    } catch { toast.error('Cannot connect'); }
    finally { setSyncing(false); }
  }

  async function syncInvoices() {
    setSyncingInv(true); setInvResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/sync/invoices`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setInvResult(j.data);
        toast.success(`Synced ${j.data.created} of ${j.data.total} invoice${j.data.total === 1 ? '' : 's'} to QuickBooks`);
      } else toast.error(j.message || 'Invoice sync failed');
    } catch { toast.error('Cannot connect'); }
    finally { setSyncingInv(false); }
  }

  async function syncExpenses() {
    setSyncingExp(true); setExpResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/sync/expenses`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setExpResult(j.data);
        toast.success(`Synced ${j.data.created} of ${j.data.total} expense${j.data.total === 1 ? '' : 's'} to QuickBooks`);
      } else toast.error(j.message || 'Expense sync failed');
    } catch { toast.error('Cannot connect'); }
    finally { setSyncingExp(false); }
  }

  async function importCustomers() {
    setImporting(true); setImportResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/import/customers`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setImportResult(j.data);
        const added = (j.data.imported || 0) + (j.data.linked || 0);
        toast.success(`Imported ${added} of ${j.data.total} customer${j.data.total === 1 ? '' : 's'} from QuickBooks`);
      } else toast.error(j.message || 'Import failed');
    } catch { toast.error('Cannot connect'); }
    finally { setImporting(false); }
  }

  async function importInvoices() {
    setImportingInv(true); setInvImportResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/import/invoices`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setInvImportResult(j.data);
        toast.success(`Imported ${j.data.imported} of ${j.data.total} invoice${j.data.total === 1 ? '' : 's'} from QuickBooks`);
      } else toast.error(j.message || 'Invoice import failed');
    } catch { toast.error('Cannot connect'); }
    finally { setImportingInv(false); }
  }

  async function importExpenses() {
    setImportingExp(true); setExpImportResult(null);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/quickbooks/import/expenses`, { method:'POST', headers: secHeaders() });
      const j = await r.json();
      if (j.success) {
        setExpImportResult(j.data);
        toast.success(`Imported ${j.data.imported} of ${j.data.total} expense${j.data.total === 1 ? '' : 's'} from QuickBooks`);
      } else toast.error(j.message || 'Expense import failed');
    } catch { toast.error('Cannot connect'); }
    finally { setImportingExp(false); }
  }

  const connected  = status?.connected;
  const configured = status?.configured;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, padding:'16px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:8, background:'#2CA01C', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:18, flexShrink:0 }}>qb</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>QuickBooks Online</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)', marginTop:2 }}>
              {status == null ? 'Checking…'
                : connected ? `Connected${status.env ? ` · ${status.env}` : ''}${status.realmId ? ` · company ${status.realmId}` : ''}`
                : configured ? 'Sync customers, invoices, and expenses with QuickBooks.'
                : 'Not configured yet — coming soon.'}
            </div>
          </div>
          {status != null && (
            connected ? (
              canManage && <button className="btn-secondary" style={{ fontSize:12 }} disabled={busy} onClick={disconnect}>{busy ? '…' : 'Disconnect'}</button>
            ) : (
              canManage
                ? <button className="btn-primary" style={{ fontSize:12, opacity: configured ? 1 : 0.5 }} disabled={busy || !configured} onClick={connect}>{busy ? '…' : 'Connect'}</button>
                : <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>Admin only</span>
            )
          )}
        </div>
      </div>

      {connected && canManage && (
        <div style={{ border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Sync</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)' }}>Push your MountainTop Ledger customers into QuickBooks. Runs safely — already-synced customers are skipped.</div>
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button className="btn-secondary" style={{ fontSize:12 }} disabled={busy} onClick={verify}>{busy ? '…' : 'Verify connection'}</button>
            <button className="btn-primary" style={{ fontSize:12 }} disabled={syncing} onClick={syncCustomers}>{syncing ? 'Syncing…' : 'Sync customers → QuickBooks'}</button>
            <button className="btn-primary" style={{ fontSize:12 }} disabled={syncingInv} onClick={syncInvoices}>{syncingInv ? 'Syncing…' : 'Sync invoices → QuickBooks'}</button>
            <button className="btn-primary" style={{ fontSize:12 }} disabled={syncingExp} onClick={syncExpenses}>{syncingExp ? 'Syncing…' : 'Sync expenses → QuickBooks'}</button>
            <button className="btn-primary" style={{ fontSize:12 }} disabled={syncingVen} onClick={()=>runSync('sync/vendors', setSyncingVen, setVenResult, 'vendor')}>{syncingVen ? 'Syncing…' : 'Sync vendors → QuickBooks'}</button>
            <button className="btn-primary" style={{ fontSize:12 }} disabled={syncingBill} onClick={()=>runSync('sync/bills', setSyncingBill, setBillResult, 'bill')}>{syncingBill ? 'Syncing…' : 'Sync bills → QuickBooks'}</button>
          </div>

          {company && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              ✓ Verified: <b>{company.companyName || 'Unknown company'}</b>{company.country ? ` · ${company.country}` : ''}
            </div>
          )}

          {syncResult && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Customers synced</div>
              <div>{syncResult.created} created · {syncResult.linked} linked to existing · {syncResult.skipped} already synced · {syncResult.failed} failed</div>
              {syncResult.errors?.length > 0 && (
                <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                  {syncResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          {invResult && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Invoices synced</div>
              <div>{invResult.created} created · {invResult.skipped} already synced · {invResult.failed} failed</div>
              {invResult.errors?.length > 0 && (
                <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                  {invResult.errors.map((e, i) => <li key={i}>#{e.name}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          {expResult && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Expenses synced</div>
              <div>{expResult.created} created · {expResult.skipped} already synced · {expResult.failed} failed</div>
              {expResult.errors?.length > 0 && (
                <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                  {expResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          {venResult && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Vendors synced</div>
              <div>{venResult.created} created · {venResult.linked} linked to existing · {venResult.skipped} already synced · {venResult.failed} failed</div>
              {venResult.errors?.length > 0 && (
                <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                  {venResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          {billResult && (
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px' }}>
              <div style={{ fontWeight:600, marginBottom:4 }}>Bills synced</div>
              <div>{billResult.created} created · {billResult.skipped} already synced · {billResult.failed} failed</div>
              {billResult.errors?.length > 0 && (
                <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                  {billResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                </ul>
              )}
            </div>
          )}

          <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:14, marginTop:2 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>Import</div>
            <div style={{ fontSize:12, color:'var(--color-text-tertiary)', marginBottom:10 }}>Already keep your books in QuickBooks? Pull your existing data into MountainTop Ledger. Safe to re-run — matches are updated, not duplicated. Import customers first, since invoices link to them.</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={importing} onClick={importCustomers}>{importing ? 'Importing…' : 'Import customers ← QuickBooks'}</button>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={importingInv} onClick={importInvoices}>{importingInv ? 'Importing…' : 'Import invoices ← QuickBooks'}</button>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={importingExp} onClick={importExpenses}>{importingExp ? 'Importing…' : 'Import expenses ← QuickBooks'}</button>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={importingVen} onClick={()=>runSync('import/vendors', setImportingVen, setVenImportResult, 'vendor')}>{importingVen ? 'Importing…' : 'Import vendors ← QuickBooks'}</button>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={importingBill} onClick={()=>runSync('import/bills', setImportingBill, setBillImportResult, 'bill')}>{importingBill ? 'Importing…' : 'Import bills ← QuickBooks'}</button>
            </div>

            {importResult && (
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Customers imported</div>
                <div>{importResult.imported} new · {importResult.linked} matched &amp; updated · {importResult.skipped} already linked · {importResult.failed} failed</div>
                {importResult.errors?.length > 0 && (
                  <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                    {importResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}

            {invImportResult && (
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Invoices imported</div>
                <div>{invImportResult.imported} new · {invImportResult.skipped} already imported · {invImportResult.failed} failed</div>
                {invImportResult.errors?.length > 0 && (
                  <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                    {invImportResult.errors.map((e, i) => <li key={i}>#{e.name}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}

            {expImportResult && (
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Expenses imported</div>
                <div>{expImportResult.imported} new · {expImportResult.skipped} already imported · {expImportResult.failed} failed</div>
                {expImportResult.errors?.length > 0 && (
                  <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                    {expImportResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}

            {venImportResult && (
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Vendors imported</div>
                <div>{venImportResult.imported} new · {venImportResult.linked} matched &amp; updated · {venImportResult.skipped} already linked · {venImportResult.failed} failed</div>
                {venImportResult.errors?.length > 0 && (
                  <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                    {venImportResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}

            {billImportResult && (
              <div style={{ fontSize:12, color:'var(--color-text-secondary)', background:'var(--color-background-secondary)', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Bills imported</div>
                <div>{billImportResult.imported} new · {billImportResult.skipped} already imported · {billImportResult.failed} failed</div>
                {billImportResult.errors?.length > 0 && (
                  <ul style={{ margin:'8px 0 0', paddingLeft:18, color:'#b23b2e' }}>
                    {billImportResult.errors.map((e, i) => <li key={i}>{e.name}: {e.error}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>
        More integrations are on the way. Only admins and owners can connect or disconnect.
      </div>
    </div>
  );
}

function BrandingSettings() {
  const toast = useToast();
  const { org, applyOrgUpdate } = useAuth();
  const [brandName, setBrandName] = useState(org?.brandName || '');
  const [primary, setPrimary]     = useState(org?.brandPrimary || '#0C2A44');
  const [accent, setAccent]       = useState(org?.brandAccent || '#E0B154');
  const [logoUrl, setLogoUrl]     = useState(org?.logoUrl || '');
  const [busy, setBusy]           = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const hasCustom = !!(org?.brandPrimary || org?.brandAccent);

  useEffect(() => {
    setBrandName(org?.brandName || '');
    setPrimary(org?.brandPrimary || '#0C2A44');
    setAccent(org?.brandAccent || '#E0B154');
    setLogoUrl(org?.logoUrl || '');
  }, [org?.id]);

  const readable = (hex) => {
    const c = String(hex || '').replace('#', ''); if (c.length < 6) return '#fff';
    const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
    return (0.299*r + 0.587*g + 0.114*b) / 255 < 0.6 ? '#ffffff' : '#0C2A44';
  };

  async function uploadLogo(file) {
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imageBase64 = String(e.target.result).split(',')[1];
        const r = await fetch(`${SEC_API}/orgs/${org.id}/settings/logo`, { method:'POST', headers: secHeaders(), body: JSON.stringify({ imageBase64, mediaType: file.type || 'image/png' }) });
        const j = await r.json();
        const url = j.logoUrl || j.data?.logoUrl;
        if (j.success && url) { setLogoUrl(url); applyOrgUpdate({ id: org.id, logoUrl: url }); toast.success('Logo uploaded'); }
        else toast.error(j.message || 'Upload failed');
      } catch { toast.error('Upload failed'); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  }

  async function removeLogo() {
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/settings/logo`, { method:'DELETE', headers: secHeaders() });
      const j = await r.json();
      if (j.success) { setLogoUrl(''); applyOrgUpdate({ id: org.id, logoUrl: null }); toast.success('Logo removed'); }
    } catch { toast.error('Could not remove logo'); }
  }

  async function save() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/settings`, { method:'PATCH', headers: secHeaders(), body: JSON.stringify({ brandName, brandPrimary: primary, brandAccent: accent }) });
      const j = await r.json();
      if (j.success) { applyOrgUpdate({ id: org.id, brandName, brandPrimary: primary, brandAccent: accent }); toast.success('Branding saved'); }
      else toast.error(j.message || 'Could not save');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function useThemeColors() {
    setBusy(true);
    try {
      const r = await fetch(`${SEC_API}/orgs/${org.id}/settings`, { method:'PATCH', headers: secHeaders(), body: JSON.stringify({ brandPrimary:'', brandAccent:'' }) });
      const j = await r.json();
      if (j.success) { applyOrgUpdate({ id: org.id, brandPrimary: null, brandAccent: null }); toast.success('Reverted to theme colors'); }
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  const box = { width:'100%', padding:'9px 12px', borderRadius:8, border:'0.5px solid var(--color-border-secondary)', fontSize:13, boxSizing:'border-box', background:'var(--color-background-primary)', color:'var(--color-text-primary)' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ fontSize:12, color:'var(--color-text-tertiary)', lineHeight:1.5 }}>
        Make the app your own. Your logo, name, and colors appear across the app, on invoices, and on the client payment page — ideal for firms reselling under their own brand.
      </div>

      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Logo</div>
        <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ width:180, height:56, borderRadius:8, border:'0.5px dashed var(--color-border-secondary)', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--color-background-secondary)', overflow:'hidden' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxHeight:44, maxWidth:160, objectFit:'contain' }} /> : <span style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>No logo</span>}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display:'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value=''; }} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn-secondary" style={{ fontSize:12 }} disabled={uploading} onClick={()=>fileRef.current?.click()}>{uploading ? 'Uploading…' : (logoUrl ? 'Replace logo' : 'Upload logo')}</button>
              {logoUrl && <button className="btn-secondary" style={{ fontSize:12 }} onClick={removeLogo}>Remove</button>}
            </div>
            <div style={{ fontSize:11, color:'var(--color-text-tertiary)' }}>PNG or SVG with a transparent background works best.</div>
          </div>
        </div>
      </div>

      <FieldRow label="Brand name (shown when there's no logo)">
        <input style={box} value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="MountainTop Ledger" />
      </FieldRow>

      <div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Colors</div>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
            <input type="color" value={primary} onChange={e=>setPrimary(e.target.value)} style={{ width:40, height:32, border:'none', background:'none', cursor:'pointer' }} />
            <span>Primary <span style={{ color:'var(--color-text-tertiary)', fontFamily:'monospace' }}>{primary}</span></span>
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
            <input type="color" value={accent} onChange={e=>setAccent(e.target.value)} style={{ width:40, height:32, border:'none', background:'none', cursor:'pointer' }} />
            <span>Accent <span style={{ color:'var(--color-text-tertiary)', fontFamily:'monospace' }}>{accent}</span></span>
          </label>
        </div>
        <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:8 }}>Primary is the sidebar/header color; accent is used for buttons and highlights.</div>
      </div>

      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:8 }}>Preview</div>
        <div style={{ display:'flex', border:'0.5px solid var(--color-border-tertiary)', borderRadius:10, overflow:'hidden', height:120 }}>
          <div style={{ width:130, background:primary, color:readable(primary), padding:'12px 14px', fontSize:12, fontWeight:600, display:'flex', alignItems:'flex-start' }}>
            {logoUrl ? <img src={logoUrl} alt="" style={{ maxWidth:100, maxHeight:26, objectFit:'contain' }} /> : (brandName || 'MountainTop Ledger')}
          </div>
          <div style={{ flex:1, background:'var(--color-background-secondary)', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ height:10, width:'40%', background:'var(--color-border-secondary)', borderRadius:4 }} />
            <button style={{ alignSelf:'flex-start', background:accent, color:readable(accent), border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'default' }}>Primary button</button>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save branding'}</button>
        {hasCustom && <button className="btn-secondary" style={{ fontSize:12 }} onClick={useThemeColors} disabled={busy}>Use theme colors instead</button>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('appearance');

  const renderContent = () => {
    switch(tab) {
      case 'appearance':   return <ThemePicker />;
      case 'brand':        return <BrandingSettings />;
      case 'company':      return <CompanySettings />;
      case 'team':         return <TeamSettings />;
      case 'billing':      return <BillingPage />;
      case 'security':     return <SecuritySettings />;
      case 'integrations': return <IntegrationsSettings />;
      case 'data':         return <DataExport />;
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


