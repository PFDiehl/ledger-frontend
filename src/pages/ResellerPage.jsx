import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

const API = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` });
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'clients',  label: 'Clients'  },
  { id: 'branding', label: 'Branding' },
  { id: 'domains',  label: 'Domains'  },
  { id: 'payments', label: 'Payments' },
];

const box = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box', background: '#ffffff', color: '#1f2a24' };
const card = { background: '#ffffff', border: '0.5px solid #EBF2E8', borderRadius: 12, padding: 20 };

export default function ResellerPage() {
  const toast = useToast();
  const { tenants = [] } = useAuth();
  const [activeTenantId, setActiveTenantId] = useState(tenants[0]?.id || null);
  const [tab, setTab] = useState('overview');

  const [tenant, setTenant]   = useState(null);
  const [usage, setUsage]     = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const tenantId = activeTenantId || tenants[0]?.id;

  async function loadAll(id) {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [t, u, c] = await Promise.all([
        fetch(`${API}/tenants/${id}`, { headers: H() }).then(r => r.json()),
        fetch(`${API}/tenants/${id}/usage`, { headers: H() }).then(r => r.json()),
        fetch(`${API}/tenants/${id}/clients`, { headers: H() }).then(r => r.json()),
      ]);
      setTenant(t.data || null);
      setUsage(u.data || null);
      setClients(c.data || []);
    } catch { toast.error('Could not load your reseller workspace.'); }
    setLoading(false);
  }
  useEffect(() => { if (tenantId) loadAll(tenantId); }, [tenantId]);

  if (!tenants.length) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Reseller</h1></div>
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🏢</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No reseller workspace on this account</p>
          <p style={{ fontSize: 13, color: '#5E6B62' }}>This area is for partner firms reselling under their own brand.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Reseller</h1>
          <p style={{ color: '#5E6B62', fontSize: 13, marginTop: 2 }}>
            Manage your client companies, brand, and domains.
          </p>
        </div>
        {tenants.length > 1 && (
          <select value={tenantId} onChange={e => { setActiveTenantId(e.target.value); }} style={{ ...box, width: 'auto' }}>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0 18px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '7px 16px', borderRadius: 20, border: '1px solid',
            borderColor: tab === t.id ? 'var(--brand-primary)' : '#D4DDCC',
            background: tab === t.id ? 'var(--brand-primary)' : '#ffffff',
            color: tab === t.id ? '#fff' : '#5E6B62', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#5E6B62' }}>Loading…</div>
      ) : (
        <>
          {tab === 'overview'  && <Overview tenant={tenant} usage={usage} />}
          {tab === 'clients'   && <Clients tenantId={tenantId} clients={clients} reload={() => loadAll(tenantId)} />}
          {tab === 'branding'  && <Branding tenantId={tenantId} tenant={tenant} onSaved={() => loadAll(tenantId)} />}
          {tab === 'domains'   && <Domains tenantId={tenantId} tenant={tenant} reload={() => loadAll(tenantId)} />}
          {tab === 'payments'  && <Payments tenantId={tenantId} tenant={tenant} />}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ ...card, flex: '1 1 160px' }}>
      <div style={{ fontSize: 12, color: '#5E6B62', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brand-primary)' }}>{value}</div>
    </div>
  );
}

function Overview({ tenant, usage }) {
  const statusColor = tenant?.status === 'active' ? '#2D7A4A' : tenant?.status === 'suspended' ? '#c0392b' : '#854F0B';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Stat label="Client companies" value={usage?.organizations ?? 0} />
        <Stat label="Total users" value={usage?.totalUsers ?? 0} />
        <Stat label="Invoices (30 days)" value={usage?.invoicesThisMonth ?? 0} />
      </div>
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your reseller plan</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #EBF2E8', fontSize: 13 }}>
          <span style={{ color: '#5E6B62' }}>Plan</span><span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{(tenant?.plan || '—').replace(/_/g, ' ')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #EBF2E8', fontSize: 13 }}>
          <span style={{ color: '#5E6B62' }}>Status</span><span style={{ fontWeight: 600, color: statusColor, textTransform: 'capitalize' }}>{tenant?.status || '—'}</span>
        </div>
        {tenant?.trialEndsAt && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13 }}>
            <span style={{ color: '#5E6B62' }}>Trial ends</span><span style={{ fontWeight: 600 }}>{new Date(tenant.trialEndsAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#8A968C' }}>
        Billing through your own Stripe account (with the platform fee) is set up separately — that's the next phase.
      </div>
    </div>
  );
}

function Clients({ tenantId, clients, reload }) {
  const toast = useToast();
  const [show, setShow]   = useState(false);
  const [form, setForm]   = useState({ name: '', ownerName: '', email: '', plan: 'starter', currency: 'USD' });
  const [busy, setBusy]   = useState(false);
  const [created, setCreated] = useState(null); // { org, tempPassword }

  async function add() {
    if (!form.name.trim() || !form.ownerName.trim() || !form.email.trim()) { toast.error('Name, owner, and email are required.'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/tenants/${tenantId}/clients`, { method: 'POST', headers: H(), body: JSON.stringify(form) });
      const j = await r.json();
      if (j.success !== false && j.data) {
        setCreated(j.data);
        setForm({ name: '', ownerName: '', email: '', plan: 'starter', currency: 'USD' });
        reload();
      } else toast.error(j.message || 'Could not create the client.');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: '#5E6B62' }}>{clients.length} client compan{clients.length === 1 ? 'y' : 'ies'}</div>
        <button className="btn-primary" onClick={() => { setShow(true); setCreated(null); }}>+ Add client</button>
      </div>

      {clients.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗂️</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No client companies yet</p>
          <p style={{ fontSize: 13, color: '#5E6B62', marginBottom: 16 }}>Add a client to create their company and owner login.</p>
          <button className="btn-primary" onClick={() => { setShow(true); setCreated(null); }}>Add your first client</button>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EBF2E8' }}>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#5E6B62', fontWeight: 600 }}>Company</th>
                <th style={{ textAlign: 'left', padding: '10px 16px', color: '#5E6B62', fontWeight: 600 }}>Plan</th>
                <th style={{ textAlign: 'right', padding: '10px 16px', color: '#5E6B62', fontWeight: 600 }}>Users</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                  <td style={{ padding: '11px 16px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '11px 16px', color: '#5E6B62', textTransform: 'capitalize' }}>{c.plan || '—'}</td>
                  <td style={{ padding: '11px 16px', textAlign: 'right' }}>{c._count?.members ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#ffffff', borderRadius: 14, padding: 26, width: 440, maxWidth: '94vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600 }}>{created ? 'Client created' : 'Add client company'}</h2>
              <button onClick={() => { setShow(false); setCreated(null); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#5E6B62' }}>×</button>
            </div>

            {created ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#5E6B62' }}>
                  <strong style={{ color: '#1f2a24' }}>{created.org?.name}</strong> is set up. Share this temporary password with the owner — they should change it on first sign-in.
                </div>
                <div style={{ background: 'var(--brand-accent-light)', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#5E6B62', marginBottom: 4 }}>TEMPORARY PASSWORD</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 700, color: 'var(--brand-primary)' }}>{created.tempPassword}</div>
                </div>
                <button className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(created.tempPassword); toast.success('Copied'); }}>Copy password</button>
                <button className="btn-primary" onClick={() => { setShow(false); setCreated(null); }}>Done</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Company name"><input style={box} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Acme LLC" /></Field>
                <Field label="Owner name"><input style={box} value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="Jane Smith" /></Field>
                <Field label="Owner email"><input style={box} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@acme.com" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="Plan">
                    <select style={box} value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                      {['starter', 'growth'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Currency">
                    <select style={box} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                      {['USD', 'EUR', 'GBP', 'CAD', 'AUD'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShow(false)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 2 }} disabled={busy} onClick={add}>{busy ? 'Creating…' : 'Create client'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Branding({ tenantId, tenant, onSaved }) {
  const toast = useToast();
  const [name, setName]       = useState(tenant?.name || '');
  const [color, setColor]     = useState(tenant?.primaryColor || '#534AB7');
  const [logoUrl, setLogoUrl] = useState(tenant?.logoUrl || '');
  const [support, setSupport] = useState(tenant?.supportEmail || '');
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    setName(tenant?.name || '');
    setColor(tenant?.primaryColor || '#534AB7');
    setLogoUrl(tenant?.logoUrl || '');
    setSupport(tenant?.supportEmail || '');
  }, [tenant?.id]);

  async function save() {
    setBusy(true);
    try {
      const body = { name, primaryColor: color, supportEmail: support };
      if (logoUrl.trim()) body.logoUrl = logoUrl.trim();
      const r = await fetch(`${API}/tenants/${tenantId}/branding`, { method: 'PATCH', headers: H(), body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success !== false) { toast.success('Branding saved'); onSaved?.(); }
      else toast.error(j.message || 'Could not save');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  const readable = (hex) => { const c = String(hex || '').replace('#', ''); if (c.length < 6) return '#fff'; const r = parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16); return (0.299*r+0.587*g+0.114*b)/255 < 0.6 ? '#fff' : '#0C2A44'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 560 }}>
      <div style={{ fontSize: 12, color: '#8A968C', lineHeight: 1.5 }}>
        This is the brand your client companies see. Colors and logo apply across their app and login when they reach you on your own domain.
      </div>
      <Field label="Brand name"><input style={box} value={name} onChange={e => setName(e.target.value)} placeholder="Smith Accounting" /></Field>
      <Field label="Logo URL"><input style={box} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" /></Field>
      <Field label="Support email"><input style={box} type="email" value={support} onChange={e => setSupport(e.target.value)} placeholder="help@smithaccounting.com" /></Field>
      <div>
        <label style={{ fontSize: 12, fontWeight: 500, color: '#5E6B62', display: 'block', marginBottom: 6 }}>Primary color</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 40, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} />
          <span style={{ fontFamily: 'monospace', color: '#8A968C' }}>{color}</span>
        </label>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6B62', marginBottom: 8 }}>Preview</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: color, color: readable(color), padding: '14px 16px', borderRadius: 10 }}>
          {logoUrl ? <img src={logoUrl} alt="" style={{ maxHeight: 26, maxWidth: 120, objectFit: 'contain' }} /> : <span style={{ fontWeight: 700 }}>{name || 'Your brand'}</span>}
        </div>
      </div>
      <div><button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save branding'}</button></div>
    </div>
  );
}

function Domains({ tenantId, tenant, reload }) {
  const toast = useToast();
  const [domain, setDomain] = useState('');
  const [busy, setBusy]     = useState(false);
  const [pending, setPending] = useState(null); // { id, domain, instructions }
  const verifiedDomains = tenant?.domains || [];

  async function add() {
    const d = domain.trim().toLowerCase();
    if (!d) return;
    setBusy(true);
    try {
      const r = await fetch(`${API}/tenants/${tenantId}/domains`, { method: 'POST', headers: H(), body: JSON.stringify({ domain: d }) });
      const j = await r.json();
      if (j.success !== false && j.data) { setPending(j.data); setDomain(''); }
      else toast.error(j.message || 'Could not add the domain.');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function verify(domainId) {
    setBusy(true);
    try {
      const r = await fetch(`${API}/tenants/${tenantId}/domains/${domainId}/verify`, { method: 'POST', headers: H() });
      const j = await r.json();
      if (j.data?.verified) { toast.success('Domain verified!'); setPending(null); reload(); }
      else toast.info(j.data?.message || 'Not verified yet — DNS can take time to propagate.');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 620 }}>
      <div style={{ fontSize: 12, color: '#8A968C', lineHeight: 1.5 }}>
        Point your own domain (e.g. <code>app.smithaccounting.com</code>) at the platform so your clients sign in under your brand.
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input style={box} value={domain} onChange={e => setDomain(e.target.value)} placeholder="app.yourfirm.com" />
        <button className="btn-primary" style={{ whiteSpace: 'nowrap' }} disabled={busy} onClick={add}>Add domain</button>
      </div>

      {pending && (
        <div style={{ ...card, background: 'var(--brand-accent-light)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Verify {pending.domain}</div>
          <div style={{ fontSize: 12.5, color: '#5E6B62', marginBottom: 10, lineHeight: 1.5 }}>{pending.instructions}</div>
          <button className="btn-primary" style={{ fontSize: 12 }} disabled={busy} onClick={() => verify(pending.id)}>{busy ? 'Checking…' : "I've added the record — verify"}</button>
        </div>
      )}

      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6B62', marginBottom: 8 }}>Verified domains</div>
        {verifiedDomains.length === 0 ? (
          <div style={{ fontSize: 13, color: '#8A968C', padding: '12px 0' }}>None yet.</div>
        ) : (
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {verifiedDomains.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '0.5px solid #EBF2E8' }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{d.domain}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#2D7A4A', background: '#EBF2E8', padding: '2px 10px', borderRadius: 20 }}>✓ Verified</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Payments({ tenantId, tenant }) {
  const toast = useToast();
  const [status, setStatus]   = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [prices, setPrices]   = useState({ starter: '', growth: '' });
  const [busy, setBusy]       = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = tenant?.stripePriceIds || {};
    setPrices({ starter: p.starter || '', growth: p.growth || '' });
  }, [tenant?.id]);

  async function load() {
    setLoading(true);
    try {
      const s = await fetch(`${API}/connect/tenants/${tenantId}/status`, { headers: H() }).then(r => r.json());
      setStatus(s.data || { connected: false });
      if (s.data?.connected) {
        const rev = await fetch(`${API}/connect/tenants/${tenantId}/revenue`, { headers: H() }).then(r => r.json());
        setRevenue(rev.data || null);
      }
    } catch { setStatus({ connected: false }); }
    setLoading(false);
  }
  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  async function connect() {
    setBusy(true);
    try {
      const r = await fetch(`${API}/connect/tenants/${tenantId}/onboard`, { method: 'POST', headers: H() }).then(r => r.json());
      if (r.data?.url) window.location.href = r.data.url;
      else toast.error(r.message || 'Could not start Stripe onboarding.');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  async function savePrices() {
    setBusy(true);
    try {
      const stripePriceIds = {};
      if (prices.starter.trim()) stripePriceIds.starter = prices.starter.trim();
      if (prices.growth.trim())  stripePriceIds.growth  = prices.growth.trim();
      const r = await fetch(`${API}/connect/tenants/${tenantId}/pricing`, { method: 'PATCH', headers: H(), body: JSON.stringify({ stripePriceIds }) }).then(r => r.json());
      if (r.data) toast.success('Plan prices saved'); else toast.error(r.message || 'Could not save');
    } catch { toast.error('Cannot connect'); }
    finally { setBusy(false); }
  }

  if (loading) return <div style={{ padding: 30, color: '#5E6B62' }}>Loading…</div>;

  const connected = status?.connected;
  const live = connected && status.chargesEnabled;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 620 }}>
      <div style={{ fontSize: 12, color: '#8A968C', lineHeight: 1.5 }}>
        Connect your own Stripe account to bill your client companies. Their subscription payments go to you; the platform automatically keeps a 20% fee.
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Stripe account</div>
            <div style={{ fontSize: 12, color: '#5E6B62', marginTop: 2 }}>
              {!connected ? 'Not connected yet.'
                : live ? 'Connected and ready to accept payments.'
                : 'Connected — finish Stripe onboarding to enable charges.'}
            </div>
          </div>
          {!connected
            ? <button className="btn-primary" disabled={busy} onClick={connect}>{busy ? '…' : 'Connect Stripe'}</button>
            : !live
              ? <button className="btn-secondary" disabled={busy} onClick={connect}>{busy ? '…' : 'Finish setup'}</button>
              : <span style={{ fontSize: 12, fontWeight: 600, color: '#2D7A4A', background: '#EBF2E8', padding: '4px 12px', borderRadius: 20 }}>✓ Active</span>}
        </div>
        {connected && (
          <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#5E6B62' }}>
            <span>Charges: {status.chargesEnabled ? '✓' : '—'}</span>
            <span>Payouts: {status.payoutsEnabled ? '✓' : '—'}</span>
            <span>Details: {status.detailsSubmitted ? '✓' : '—'}</span>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Plan prices</div>
        <div style={{ fontSize: 12, color: '#8A968C', marginBottom: 12 }}>
          Create products in your own Stripe dashboard, then paste each plan's Price ID (starts with "price_") here. These are what your clients are charged.
        </div>
        <Field label="Starter price ID"><input style={box} value={prices.starter} onChange={e => setPrices(p => ({ ...p, starter: e.target.value }))} placeholder="price_..." /></Field>
        <div style={{ height: 12 }} />
        <Field label="Growth price ID"><input style={box} value={prices.growth} onChange={e => setPrices(p => ({ ...p, growth: e.target.value }))} placeholder="price_..." /></Field>
        <div style={{ marginTop: 14 }}><button className="btn-primary" disabled={busy} onClick={savePrices}>{busy ? 'Saving…' : 'Save prices'}</button></div>
      </div>

      {revenue && !revenue.error && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Your balance</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Stat label={`Available (${revenue.currency})`} value={money(revenue.available)} />
            <Stat label={`Pending (${revenue.currency})`} value={money(revenue.pending)} />
          </div>
          {revenue.recentPayouts?.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5E6B62', marginBottom: 6 }}>Recent payouts</div>
              {revenue.recentPayouts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderBottom: '1px solid #EBF2E8' }}>
                  <span>{p.arrivalDate}</span><span>{money(p.amount)} {p.currency} · {p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#5E6B62', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}
