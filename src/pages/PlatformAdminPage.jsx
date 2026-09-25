import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

const API = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` });
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

const card  = { background: '#ffffff', border: '0.5px solid #EBF2E8', borderRadius: 12, padding: 20 };
const box   = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box', background: '#ffffff', color: '#1f2a24' };
const label = { display: 'block', fontSize: 12, fontWeight: 600, color: '#5E6B62', marginBottom: 5 };

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

function StatCard({ label, value }) {
  return (
    <div style={{ ...card, padding: 16, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 12, color: '#8A968C', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1f2a24', marginTop: 4 }}>{value}</div>
    </div>
  );
}

function statusPill(status) {
  const map = {
    active:    { bg: '#E6F4EA', fg: '#1E7A3D' },
    trialing:  { bg: '#EAF2FB', fg: '#2564A8' },
    suspended: { bg: '#FBECEA', fg: '#B4482F' },
    canceled:  { bg: '#F0F0F0', fg: '#6B6B6B' },
    retired:   { bg: '#F0F0F0', fg: '#6B6B6B' },
  };
  const c = map[status] || { bg: '#F0F0F0', fg: '#6B6B6B' };
  return <span style={{ background: c.bg, color: c.fg, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, textTransform: 'capitalize' }}>{status || 'unknown'}</span>;
}

export default function PlatformAdminPage() {
  const toast = useToast();
  const { isPlatformOwner } = useAuth();

  const [stats, setStats]     = useState(null);
  const [tenants, setTenants] = useState([]);
  const [fees, setFees]       = useState(null);
  const [loading, setLoading] = useState(true);

  // create-reseller form
  const [form, setForm] = useState({ name: '', slug: '', ownerName: '', ownerEmail: '', supportEmail: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated]   = useState(null); // { org/owner + tempPassword }
  const [busyId, setBusyId]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmCharge, setConfirmCharge] = useState(null);
  const [purgeFor, setPurgeFor]   = useState(null);   // reseller id being purged (has clients)
  const [purgeName, setPurgeName] = useState('');      // typed name confirmation

  async function loadAll() {
    setLoading(true);
    try {
      const [s, t, f] = await Promise.all([
        fetch(`${API}/tenants/admin/stats`, { headers: H() }).then(r => r.json()),
        fetch(`${API}/tenants`,             { headers: H() }).then(r => r.json()),
        fetch(`${API}/platform-fees/admin`, { headers: H() }).then(r => r.json()),
      ]);
      setStats(s.data || null);
      setTenants(Array.isArray(t.data) ? t.data : []);
      setFees(f.data || null);
    } catch {
      toast.error('Could not load the platform admin data.');
    }
    setLoading(false);
  }
  useEffect(() => { if (isPlatformOwner) loadAll(); }, [isPlatformOwner]);

  function set(k, v) {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !slugTouched) next.slug = slugify(v);
      return next;
    });
  }

  async function createReseller(e) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.ownerName || !form.ownerEmail) {
      toast.error('Company name, slug, owner name, and owner email are all required.');
      return;
    }
    setCreating(true);
    setCreated(null);
    try {
      const res = await fetch(`${API}/tenants`, {
        method: 'POST',
        headers: H(),
        body: JSON.stringify({
          name:         form.name,
          slug:         form.slug,
          ownerName:    form.ownerName,
          ownerEmail:   form.ownerEmail,
          supportEmail: form.supportEmail || undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok || j.success === false) {
        toast.error(j.message || 'Could not create the reseller.');
      } else {
        setCreated(j.data);
        toast.success('Reseller created.');
        setForm({ name: '', slug: '', ownerName: '', ownerEmail: '', supportEmail: '' });
        setSlugTouched(false);
        loadAll();
      }
    } catch {
      toast.error('Could not reach the server.');
    }
    setCreating(false);
  }

  async function retireToggle(t) {
    setBusyId(t.id);
    try {
      const path = t.status === 'retired' ? 'reactivate' : 'retire';
      const res = await fetch(`${API}/tenants/${t.id}/${path}`, { method: 'POST', headers: H() });
      const j = await res.json();
      if (!res.ok || j.success === false) throw new Error(j.message || 'Could not update.');
      toast.success(t.status === 'retired' ? 'Reseller reactivated.' : 'Reseller retired.');
      loadAll();
    } catch (e) { toast.error(e.message || 'Could not update the reseller.'); }
    setBusyId(null);
  }

  async function deleteReseller(t, opts = {}) {
    setBusyId(t.id);
    try {
      const body = opts.deleteClients ? { deleteClients: true, confirmName: opts.confirmName } : null;
      const res = await fetch(`${API}/tenants/${t.id}`, {
        method: 'DELETE', headers: H(),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const j = await res.json();
      if (!res.ok || j.success === false) throw new Error(j.message || 'Could not delete.');
      const n = j.data?.deletedClients || 0;
      toast.success(n ? `Reseller and ${n} client compan${n > 1 ? 'ies' : 'y'} deleted.` : 'Reseller deleted.');
      setConfirmDelete(null); setPurgeFor(null); setPurgeName('');
      loadAll();
    } catch (e) { toast.error(e.message || 'Could not delete the reseller.'); }
    setBusyId(null);
  }

  async function chargeReseller(t) {
    setBusyId(t.id);
    try {
      const res = await fetch(`${API}/platform-fees/tenant/${t.id}/billing/charge`, { method: 'POST', headers: H() });
      const j = await res.json();
      if (!res.ok || j.success === false) throw new Error(j.message || 'Could not charge.');
      const d = j.data || {};
      if (d.skipped) toast.info(`${t.name}: nothing to charge (${d.reason}).`);
      else if (d.paid) toast.success(`${t.name}: charged ${money(d.amount)} ✓`);
      else toast.error(`${t.name}: charge ${d.status || 'did not complete'} — check the card.`);
      loadAll();
    } catch (e) { toast.error(e.message || 'Could not charge the reseller.'); }
    setBusyId(null);
  }

  const actionBtn = { fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, color: '#2564A8' };

  if (!isPlatformOwner) {
    return (
      <div className="page">
        <div className="page-header"><h1 className="page-title">Platform admin</h1></div>
        <div style={{ ...card, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Platform owner access required</p>
          <p style={{ fontSize: 13, color: '#5E6B62' }}>This console is limited to the platform owner account.</p>
        </div>
      </div>
    );
  }

  const feeByTenant = Object.fromEntries((fees?.resellers || []).map(r => [r.tenantId, r.monthlyTotal]));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Platform admin</h1>
        <p style={{ color: '#5E6B62', fontSize: 13, marginTop: 2 }}>
          Every reseller on the platform, and the totals across all of them.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Resellers"     value={loading ? '—' : (stats?.tenants ?? 0)} />
        <StatCard label="Active"        value={loading ? '—' : (stats?.activeTenants ?? 0)} />
        <StatCard label="Client cos."   value={loading ? '—' : (stats?.organizations ?? 0)} />
        <StatCard label="Total users"   value={loading ? '—' : (stats?.users ?? 0)} />
        <StatCard label="Platform fee / mo" value={loading ? '—' : money(fees?.grandTotal ?? 0)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 20, alignItems: 'start' }}>
        {/* Reseller list */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#1f2a24' }}>Resellers</h2>
          {loading ? (
            <p style={{ fontSize: 13, color: '#8A968C' }}>Loading…</p>
          ) : tenants.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A968C' }}>No resellers yet. Create your first one on the right.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#8A968C', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    <th style={{ padding: '6px 8px' }}>Reseller</th>
                    <th style={{ padding: '6px 8px' }}>Owner</th>
                    <th style={{ padding: '6px 8px' }}>Status</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Clients</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Fee/mo</th>
                    <th style={{ padding: '6px 8px' }}>Payments</th>
                    <th style={{ padding: '6px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} style={{ borderTop: '0.5px solid #EBF2E8' }}>
                      <td style={{ padding: '9px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: t.primaryColor || '#2564A8', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 600, color: '#1f2a24' }}>{t.name}</div>
                            <div style={{ fontSize: 11, color: '#8A968C' }}>/{t.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '9px 8px', color: '#5E6B62' }}>
                        {t.owner ? (
                          <div>
                            <div>{t.owner.fullName}</div>
                            <div style={{ fontSize: 11, color: '#8A968C' }}>{t.owner.email}</div>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '9px 8px' }}>{statusPill(t.status)}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'center', color: '#1f2a24', fontWeight: 600 }}>{t.clientCount}</td>
                      <td style={{ padding: '9px 8px', textAlign: 'right', color: '#1f2a24', fontWeight: 600 }}>{money(feeByTenant[t.id] ?? 0)}</td>
                      <td style={{ padding: '9px 8px', color: '#5E6B62', fontSize: 12 }}>
                        {t.stripeConnectStatus === 'active'
                          ? <span style={{ color: '#1E7A3D', fontWeight: 600 }}>Connected</span>
                          : <span style={{ color: '#8A968C' }}>{t.stripeConnectStatus || 'Not connected'}</span>}
                      </td>
                      <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
                        {confirmCharge === t.id ? (
                          <span style={{ marginRight: 8 }}>
                            <button onClick={() => { setConfirmCharge(null); chargeReseller(t); }} disabled={busyId === t.id}
                              style={{ ...actionBtn, color: '#1E7A3D', fontWeight: 700 }}>Charge now</button>
                            <button onClick={() => setConfirmCharge(null)}
                              style={{ ...actionBtn, color: '#8A968C', marginLeft: 6 }}>Cancel</button>
                          </span>
                        ) : (
                          <button onClick={() => setConfirmCharge(t.id)} disabled={busyId === t.id}
                            style={{ ...actionBtn, marginRight: 8 }} title="Charge this reseller's monthly platform fee (test mode)">Charge</button>
                        )}
                        <button onClick={() => retireToggle(t)} disabled={busyId === t.id} style={actionBtn}>
                          {t.status === 'retired' ? 'Reactivate' : 'Retire'}
                        </button>
                        {confirmDelete === t.id ? (
                          <span style={{ marginLeft: 8 }}>
                            <button onClick={() => deleteReseller(t)} disabled={busyId === t.id}
                              style={{ ...actionBtn, color: '#B4482F', fontWeight: 700 }}>Confirm</button>
                            <button onClick={() => setConfirmDelete(null)}
                              style={{ ...actionBtn, color: '#8A968C', marginLeft: 6 }}>Cancel</button>
                          </span>
                        ) : purgeFor === t.id ? (
                          <span style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <input
                              value={purgeName}
                              onChange={e => setPurgeName(e.target.value)}
                              placeholder={`Type "${t.name}"`}
                              style={{ padding: '4px 8px', border: '1px solid #E0A8A0', borderRadius: 6, fontSize: 12, width: 150 }}
                            />
                            <button
                              onClick={() => deleteReseller(t, { deleteClients: true, confirmName: purgeName.trim() })}
                              disabled={busyId === t.id || purgeName.trim() !== t.name}
                              title={purgeName.trim() !== t.name ? 'Type the exact name to enable' : `Permanently delete ${t.name} and its ${t.clientCount} client compan${t.clientCount > 1 ? 'ies' : 'y'}`}
                              style={{ ...actionBtn, color: purgeName.trim() === t.name ? '#B4482F' : '#C9C9C9', fontWeight: 700, cursor: purgeName.trim() === t.name ? 'pointer' : 'not-allowed' }}>
                              Delete all
                            </button>
                            <button onClick={() => { setPurgeFor(null); setPurgeName(''); }}
                              style={{ ...actionBtn, color: '#8A968C' }}>Cancel</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => { if (t.clientCount > 0) { setPurgeName(''); setPurgeFor(t.id); } else setConfirmDelete(t.id); }}
                            disabled={busyId === t.id}
                            title={t.clientCount > 0 ? `Permanently delete this reseller AND its ${t.clientCount} client compan${t.clientCount > 1 ? 'ies' : 'y'}` : 'Delete permanently'}
                            style={{ ...actionBtn, marginLeft: 8, color: '#B4482F' }}>
                            {t.clientCount > 0 ? 'Purge' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create reseller */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: '#1f2a24' }}>New reseller</h2>
          <p style={{ fontSize: 12, color: '#8A968C', margin: '0 0 14px' }}>
            Creates a partner workspace and emails the owner a secure link to set their own password.
          </p>

          {created ? (
            <div style={{ background: '#F5F8F3', border: '0.5px solid #D4DDCC', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E7A3D', marginBottom: 8 }}>✓ Reseller created</div>
              <div style={{ fontSize: 12, color: '#5E6B62', marginBottom: 4 }}>Owner login</div>
              <div style={{ fontSize: 13, color: '#1f2a24', marginBottom: 10, wordBreak: 'break-all' }}>{created.owner?.email}</div>
              <div style={{ fontSize: 12.5, color: '#5E6B62', marginBottom: 12, lineHeight: 1.5 }}>
                {created.emailSent === false
                  ? <>The reseller was created, but the set-password email couldn’t be sent. Have the owner use <strong>“Forgot password”</strong> on the sign-in page to get a link.</>
                  : <>We emailed <strong>{created.owner?.email}</strong> a secure link to set their password (valid 7 days). No password to relay by hand.</>}
              </div>
              <button onClick={() => setCreated(null)}
                style={{ width: '100%', padding: '9px', borderRadius: 8, border: 'none', background: '#2564A8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Create another
              </button>
            </div>
          ) : (
            <form onSubmit={createReseller}>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Company name</label>
                <input style={box} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Smith Accounting" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Slug</label>
                <input style={box} value={form.slug}
                  onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
                  placeholder="smith-accounting" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Owner name</label>
                <input style={box} value={form.ownerName} onChange={e => set('ownerName', e.target.value)} placeholder="Jane Smith" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={label}>Owner email</label>
                <input style={box} type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} placeholder="jane@smithacct.com" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>Support email <span style={{ color: '#8A968C', fontWeight: 400 }}>(optional)</span></label>
                <input style={box} type="email" value={form.supportEmail} onChange={e => set('supportEmail', e.target.value)} placeholder="help@smithacct.com" />
              </div>
              <button type="submit" disabled={creating}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: creating ? '#9BB8D6' : '#2564A8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'default' : 'pointer' }}>
                {creating ? 'Creating…' : 'Create reseller'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
