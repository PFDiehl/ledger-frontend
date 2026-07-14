import { useState } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { CURRENCIES } from './CurrenciesPage';

const STEPS = [
  { id: 'company',  icon: 'building',        title: 'Your company'       },
  { id: 'currency', icon: 'currency',         title: 'Currency & tax'     },
  { id: 'accounts', icon: 'building-bank',    title: 'Bank accounts'      },
  { id: 'team',     icon: 'users',            title: 'Invite your team'   },
  { id: 'done',     icon: 'circle-check',     title: 'Ready to go'        },
];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];

function StepIndicator({ steps, current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:32 }}>
      {steps.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const last    = i === steps.length - 1;
        return (
          <div key={step.id} style={{ display:'flex', alignItems:'center', flex: last ? 0 : 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius:'50%', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center',
              background: done ? '#5DCAA5' : active ? 'var(--brand-primary,#2D4A35)' : 'var(--color-background-secondary)',
              border: `2px solid ${done ? '#5DCAA5' : active ? 'var(--brand-primary,#2D4A35)' : 'var(--color-border-secondary)'}`,
              fontSize: 14,
              color: done || active ? '#fff' : 'var(--color-text-tertiary)',
              transition: 'all 0.2s',
            }}>
              {done ? <i className="ti ti-check" style={{ fontSize:14 }} /> : <i className={`ti ti-${step.icon}`} style={{ fontSize:14 }} />}
            </div>
            {!last && (
              <div style={{ flex:1, height:2, background: done ? '#5DCAA5' : 'var(--color-border-tertiary)', margin:'0 4px', transition:'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CompanyStep({ data, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:22, fontWeight:500, marginBottom:4 }}>Tell us about your business</div>
      <div style={{ fontSize:14, color:'var(--color-text-secondary)', marginBottom:12 }}>
        This information appears on your invoices and reports.
      </div>
      <div className="form-row two-col">
        <div className="form-field">
          <label>Business name</label>
          <input value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Acme Co." />
        </div>
        <div className="form-field">
          <label>Industry</label>
          <select value={data.industry} onChange={e => onChange('industry', e.target.value)}>
            <option value="">Select…</option>
            {['Consulting','Software / Tech','Creative / Design','Legal','Healthcare','Real Estate','Retail','Manufacturing','Other'].map(i => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label>Business email</label>
        <input type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="billing@yourco.com" />
      </div>
      <div className="form-field">
        <label>Phone (optional)</label>
        <input type="tel" value={data.phone} onChange={e => onChange('phone', e.target.value)} placeholder="(555) 000-0000" />
      </div>
      <div className="form-row two-col">
        <div className="form-field">
          <label>City</label>
          <input value={data.city} onChange={e => onChange('city', e.target.value)} placeholder="Charlotte" />
        </div>
        <div className="form-field">
          <label>State</label>
          <select value={data.state} onChange={e => onChange('state', e.target.value)}>
            <option value="">Select…</option>
            {US_STATES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="form-field">
        <label>Tax ID / EIN (optional)</label>
        <input value={data.taxId} onChange={e => onChange('taxId', e.target.value)} placeholder="12-3456789" />
      </div>
    </div>
  );
}

function CurrencyStep({ data, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:22, fontWeight:500, marginBottom:4 }}>Currency & tax settings</div>
      <div style={{ fontSize:14, color:'var(--color-text-secondary)', marginBottom:12 }}>
        Your base currency is used for all reports and cannot be changed later.
      </div>
      <div className="form-field">
        <label>Base currency</label>
        <select value={data.currency} onChange={e => onChange('currency', e.target.value)}>
          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Fiscal year end</label>
        <select value={data.fiscalYearEnd} onChange={e => onChange('fiscalYearEnd', e.target.value)}>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i) => (
            <option key={i+1} value={i+1}>{m}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Default payment terms</label>
        <select value={data.paymentTerms} onChange={e => onChange('paymentTerms', e.target.value)}>
          {[['Due on receipt','0'],['Net 7','7'],['Net 15','15'],['Net 30','30'],['Net 60','60'],['Net 90','90']].map(([l,v]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label>Default tax rate (%)</label>
        <input type="number" min="0" max="100" step="0.01" value={data.taxRate}
          onChange={e => onChange('taxRate', e.target.value)} placeholder="0" />
      </div>
      <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:'12px 14px', fontSize:12, color:'var(--color-text-secondary)' }}>
        <i className="ti ti-info-circle" style={{ marginRight:6 }} />
        You can add multiple tax rates and connect Stripe for automated tax collection in Settings later.
      </div>
    </div>
  );
}

function BankStep({ data, onChange }) {
  const [showManual, setShowManual] = useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:22, fontWeight:500, marginBottom:4 }}>Connect your bank</div>
      <div style={{ fontSize:14, color:'var(--color-text-secondary)', marginBottom:8 }}>
        Connecting your bank account lets us automatically import transactions and keep your books in sync.
      </div>

      <button
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'var(--color-background-primary)', border:'2px solid #2D4A35', borderRadius:10, cursor:'pointer', textAlign:'left' }}
        onClick={() => onChange('plaidConnected', true)}
      >
        <i className="ti ti-building-bank" style={{ fontSize:22, color:'var(--brand-primary,#2D4A35)' }} />
        <div>
          <div style={{ fontSize:14, fontWeight:500, color:'var(--brand-primary,#2D4A35)' }}>Connect with Plaid</div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>Secure, read-only access to 12,000+ banks</div>
        </div>
        {data.plaidConnected && <i className="ti ti-circle-check" style={{ marginLeft:'auto', fontSize:18, color:'#0F6E56' }} />}
      </button>

      <button
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:10, cursor:'pointer', textAlign:'left' }}
        onClick={() => setShowManual(m => !m)}
      >
        <i className="ti ti-upload" style={{ fontSize:22, color:'var(--color-text-secondary)' }} />
        <div>
          <div style={{ fontSize:14, fontWeight:500 }}>Import CSV manually</div>
          <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>Upload a bank statement export</div>
        </div>
      </button>

      <button
        style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderRadius:10, cursor:'pointer', textAlign:'left', border:'none', background:'none', color:'var(--color-text-tertiary)', fontSize:13 }}
        onClick={() => onChange('skipBank', true)}
      >
        <i className="ti ti-arrow-right" style={{ fontSize:16 }} />
        Skip for now — I'll add a bank account later
      </button>
    </div>
  );
}

function TeamStep({ data, onChange }) {
  const [email, setEmail] = useState('');
  const [role,  setRole]  = useState('member');

  function addInvite() {
    if (!email) return;
    const invites = [...(data.invites ?? []), { email, role }];
    onChange('invites', invites);
    setEmail('');
  }

  function removeInvite(i) {
    onChange('invites', (data.invites ?? []).filter((_, idx) => idx !== i));
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ fontSize:22, fontWeight:500, marginBottom:4 }}>Invite your team</div>
      <div style={{ fontSize:14, color:'var(--color-text-secondary)', marginBottom:8 }}>
        Add teammates so they can help manage your books. You can always do this later.
      </div>

      <div className="form-row two-col">
        <div className="form-field" style={{ flex:2 }}>
          <label>Email address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            onKeyDown={e => e.key === 'Enter' && addInvite()} />
        </div>
        <div className="form-field">
          <label>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="admin">Admin</option>
            <option value="accountant">Accountant</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
      <button className="btn-secondary" onClick={addInvite} style={{ alignSelf:'flex-start' }}>
        <i className="ti ti-plus" /> Add invite
      </button>

      {(data.invites ?? []).length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:4 }}>
          {(data.invites ?? []).map((inv, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--color-background-secondary)', borderRadius:8, fontSize:13 }}>
              <i className="ti ti-mail" style={{ fontSize:15, color:'var(--color-text-tertiary)' }} />
              <span style={{ flex:1 }}>{inv.email}</span>
              <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#EBF2E8', color:'var(--brand-primary,#2D4A35)' }}>{inv.role}</span>
              <button onClick={() => removeInvite(i)} style={{ fontSize:14, color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer' }}>
                <i className="ti ti-x" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button style={{ alignSelf:'flex-start', fontSize:13, color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer' }}
        onClick={() => onChange('skipTeam', true)}>
        Skip — I'll invite people later
      </button>
    </div>
  );
}

function DoneStep({ data }) {
  const HIGHLIGHTS = [
    { icon:'file-invoice',  title:'Create your first invoice', sub:'Send a professional invoice in under 2 minutes', action:'invoices' },
    { icon:'building-bank', title:'Review imported transactions', sub:'Categorize and reconcile your bank feed', action:'bank' },
    { icon:'chart-bar',     title:'Check your reports', sub:'P&L, balance sheet, and cash position', action:'reports' },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ textAlign:'center', padding:'8px 0 20px' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28, color:'#0F6E56' }}>
          <i className="ti ti-circle-check" />
        </div>
        <div style={{ fontSize:22, fontWeight:500, marginBottom:6 }}>You're all set, {data.name}!</div>
        <div style={{ fontSize:14, color:'var(--color-text-secondary)' }}>
          Your account is ready. Here's what to do first:
        </div>
      </div>
      {HIGHLIGHTS.map(h => (
        <div key={h.action} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--color-background-secondary)', borderRadius:10, cursor:'pointer' }}
          onClick={() => sendPrompt(`Take me to ${h.action}`)}>
          <div style={{ width:40, height:40, borderRadius:10, background:'#EBF2E8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'var(--brand-primary,#2D4A35)', flexShrink:0 }}>
            <i className={`ti ti-${h.icon}`} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:500 }}>{h.title}</div>
            <div style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>{h.sub}</div>
          </div>
          <i className="ti ti-arrow-right" style={{ fontSize:15, color:'var(--color-text-tertiary)' }} />
        </div>
      ))}
    </div>
  );
}

export default function OnboardingPage({ onComplete }) {
  const { org }   = useAuth();
  const toast     = useToast();
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData]   = useState({
    name:         org?.name ?? '',
    email:        '',
    phone:        '',
    industry:     '',
    city:         '',
    state:        '',
    taxId:        '',
    currency:     'USD',
    fiscalYearEnd: '12',
    paymentTerms: '30',
    taxRate:      '0',
    invites:      [],
    plaidConnected: false,
    skipBank:     false,
    skipTeam:     false,
  });

  function setField(key, value) {
    setData(d => ({ ...d, [key]: value }));
  }

  async function handleNext() {
    if (step === STEPS.length - 2) {
      setSaving(true);
      await new Promise(r => setTimeout(r, 800)); // simulate API save
      toast.success('Setup complete!');
      setSaving(false);
      setStep(STEPS.length - 1);
      return;
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else onComplete?.();
  }

  const isLast     = step === STEPS.length - 1;
  const isPreLast  = step === STEPS.length - 2;

  return (
    <div style={{ minHeight:'100vh', background:'var(--color-background-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <div style={{ width:'100%', maxWidth:560 }}>
        <div style={{ fontSize:18, fontWeight:500, color:'var(--brand-primary,#2D4A35)', textAlign:'center', marginBottom:28, letterSpacing:'-.02em' }}>
          Ledger
        </div>

        <div style={{ background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:16, padding:'32px 36px' }}>
          <StepIndicator steps={STEPS} current={step} />

          {step === 0 && <CompanyStep  data={data} onChange={setField} />}
          {step === 1 && <CurrencyStep data={data} onChange={setField} />}
          {step === 2 && <BankStep     data={data} onChange={setField} />}
          {step === 3 && <TeamStep     data={data} onChange={setField} />}
          {step === 4 && <DoneStep     data={data} />}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:28, paddingTop:20, borderTop:'0.5px solid var(--color-border-tertiary)' }}>
            {step > 0 && !isLast ? (
              <button className="btn-secondary" onClick={() => setStep(s => s - 1)}>
                <i className="ti ti-arrow-left" /> Back
              </button>
            ) : <div />}

            <button className="btn-primary" onClick={handleNext} disabled={saving}
              style={{ minWidth:120, justifyContent:'center' }}>
              {saving ? 'Saving…' : isLast ? 'Go to dashboard →' : isPreLast ? 'Finish setup' : 'Continue →'}
            </button>
          </div>
        </div>

        {!isLast && (
          <div style={{ textAlign:'center', marginTop:14, fontSize:12, color:'var(--color-text-tertiary)' }}>
            Step {step + 1} of {STEPS.length}
          </div>
        )}
      </div>
    </div>
  );
}
