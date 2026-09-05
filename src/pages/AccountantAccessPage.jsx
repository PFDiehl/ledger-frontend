import { useState, useEffect } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

const API = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` });

const card = { background: 'var(--color-surface, #fff)', border: '0.5px solid var(--color-border, #E2E8E0)', borderRadius: 12, padding: 20 };

// Client-side preview of the authorization language. The AUTHORITATIVE copy is
// snapshotted on the server the moment the client approves (see backend
// renderConsent / CONSENT_VERSION) and is what the downloadable record shows.
function previewConsent({ firmName, clientName, scope }) {
  const level = scope === 'full'
    ? 'view AND edit my books — including creating and editing transactions, invoices, bills, and categorizations, and posting journal entries'
    : 'view my books on a READ-ONLY basis (no changes)';
  return [
    'AUTHORIZATION TO ACCESS BOOKKEEPING RECORDS',
    '',
    'DRAFT — PENDING LEGAL REVIEW. This wording is a starting point and has not been reviewed by an attorney. It is not legal advice.',
    '',
    `I, acting on behalf of ${clientName}, authorize ${firmName} to ${level} within the MountainTop Ledger platform.`,
    '',
    'I understand that:',
    `• This access is given voluntarily and I may revoke it at any time, which immediately ends ${firmName}'s access.`,
    `• ${firmName} acts as my agent for bookkeeping/accounting purposes and is expected to keep my financial information confidential.`,
    '• MountainTop Ledger provides this access at my direction and keeps a dated record of this authorization.',
    '• Granting access does not transfer ownership of my data, which remains mine.',
    '',
    `By approving, I confirm I am authorized to grant this permission on behalf of ${clientName}.`,
  ].join('\n');
}

const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

// ── Banner shown app-wide when a request is waiting on this client ──────────────
export function PendingAccessBanner({ onReview }) {
  const { org } = useAuth();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!org?.id) return;
    let live = true;
    fetch(`${API}/access-grants/org/${org.id}`, { headers: H() })
      .then(r => r.json())
      .then(j => { if (live) setCount((j.data || []).filter(g => g.status === 'pending').length); })
      .catch(() => {});
    return () => { live = false; };
  }, [org?.id]);
  if (!count) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#EAF2FB', border: '0.5px solid #B9D4E8', color: '#1f2a24', padding: '10px 16px', borderRadius: 10, margin: '0 0 16px' }}>
      <i className="ti ti-shield-lock" style={{ fontSize: 18, color: '#2564A8' }} />
      <span style={{ flex: 1, fontSize: 13 }}>
        {count} bookkeeper access request{count > 1 ? 's are' : ' is'} waiting for your approval.
      </span>
      <button onClick={onReview}
        style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#2564A8', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>
        Review
      </button>
    </div>
  );
}

// ── Downloadable permission record (opens a print-to-PDF window) ────────────────
function downloadRecord(grantId, toast) {
  const w = window.open('', '_blank');
  if (w) { try { w.document.write('<p style="font:14px system-ui;padding:24px">Preparing your copy…</p>'); } catch {} }
  fetch(`${API}/access-grants/${grantId}/record`, { headers: H() })
    .then(r => r.json())
    .then(j => {
      const rec = j.data;
      if (!rec) { toast?.error('Could not load the record.'); if (w) w.close(); return; }
      const esc = (s) => String(s ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const row = (k, v) => `<tr><td style="padding:6px 12px 6px 0;color:#5E6B62;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0;color:#1f2a24">${esc(v)}</td></tr>`;
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Access authorization ${esc(rec.id)}</title></head>
<body style="font:13px/1.6 system-ui,-apple-system,sans-serif;color:#1f2a24;max-width:680px;margin:32px auto;padding:0 24px">
  <h1 style="font-size:18px;margin:0 0 4px">Authorization to access bookkeeping records</h1>
  <div style="color:#8A968C;font-size:12px;margin-bottom:20px">MountainTop Ledger — permission record</div>
  <table style="border-collapse:collapse;font-size:13px;margin-bottom:20px">
    ${row('Status', (rec.status || '').toUpperCase())}
    ${row('Access level', rec.scope === 'full' ? 'Full (view & edit)' : 'View only')}
    ${row('Bookkeeping firm', rec.firm?.name)}
    ${row('Client company', rec.client?.name)}
    ${row('Requested by', rec.requestedBy ? `${rec.requestedBy.fullName} (${rec.requestedBy.email})` : '—')}
    ${row('Approved by', rec.grantedBy ? `${rec.grantedBy.fullName} (${rec.grantedBy.email})` : '—')}
    ${row('Requested at', fmt(rec.requestedAt))}
    ${row('Approved at', fmt(rec.grantedAt))}
    ${rec.revokedAt ? row('Ended at', fmt(rec.revokedAt)) : ''}
    ${rec.revokedBy ? row('Ended by', `${rec.revokedBy.fullName} (${rec.revokedBy.email})`) : ''}
    ${row('Recorded IP', rec.grantIp)}
    ${row('Consent version', rec.consentVersion)}
    ${row('Record ID', rec.id)}
  </table>
  <div style="font-size:12px;color:#5E6B62;font-weight:600;margin-bottom:6px">Consent agreed to</div>
  <pre style="white-space:pre-wrap;font:12px/1.6 system-ui,sans-serif;background:#F5F8F3;border:0.5px solid #D4DDCC;border-radius:8px;padding:16px;color:#1f2a24">${esc(rec.consentText || 'No consent text was recorded for this grant.')}</pre>
  <div style="font-size:11px;color:#8A968C;margin-top:16px">Generated ${new Date().toLocaleString()} from MountainTop Ledger. This is a copy of a record retained by the platform.</div>
</body></html>`;
      if (w) { w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { try { w.print(); } catch {} }, 350); }
    })
    .catch(() => { toast?.error('Could not load the record.'); if (w) w.close(); });
}

export default function AccountantAccessPage() {
  const toast = useToast();
  const { org } = useAuth();
  const [grants, setGrants]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [scopeById, setScopeById] = useState({});
  const [busy, setBusy]       = useState('');

  async function load() {
    if (!org?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const j = await fetch(`${API}/access-grants/org/${org.id}`, { headers: H() }).then(r => r.json());
      if (j.success === false) { toast.error(j.message || 'Could not load access requests.'); setGrants([]); }
      else setGrants(j.data || []);
    } catch { toast.error('Could not load access requests.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  async function act(id, action, body) {
    setBusy(id);
    try {
      const r = await fetch(`${API}/access-grants/${id}/${action}`, { method: 'POST', headers: H(), body: body ? JSON.stringify(body) : undefined });
      const j = await r.json();
      if (j.success === false) toast.error(j.message || 'Could not complete that.');
      else { toast.success(action === 'approve' ? 'Access granted.' : action === 'decline' ? 'Request declined.' : 'Access ended.'); load(); }
    } catch { toast.error('Cannot connect.'); }
    setBusy('');
  }

  const pending = grants.filter(g => g.status === 'pending');
  const active  = grants.filter(g => g.status === 'active');
  const history = grants.filter(g => ['declined', 'revoked'].includes(g.status));

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Bookkeeper access</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
          Control which bookkeepers can access this company’s books. You can end any access at any time.
        </p>
      </div>

      {loading ? (
        <div style={{ ...card, color: 'var(--color-text-secondary)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Pending requests */}
          {pending.length > 0 && (
            <div style={{ ...card, borderColor: '#B9D4E8' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Requests waiting for your approval</h2>
              {pending.map(g => {
                const firmName = g.tenant?.name || 'The firm';
                const scope    = scopeById[g.id] || g.scope || 'view';
                return (
                  <div key={g.id} style={{ borderTop: '0.5px solid var(--color-border, #E2E8E0)', paddingTop: 14, marginTop: 14 }}>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>
                      <strong>{firmName}</strong> is requesting access to <strong>{org?.name}</strong>’s books
                      {g.requestedBy ? <span style={{ color: 'var(--color-text-secondary)' }}> (requested by {g.requestedBy.fullName})</span> : null}.
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Access level:</span>
                      <label style={{ fontSize: 13, display: 'flex', gap: 5, alignItems: 'center' }}>
                        <input type="radio" name={`scope-${g.id}`} checked={scope === 'view'} onChange={() => setScopeById(s => ({ ...s, [g.id]: 'view' }))} /> View only
                      </label>
                      <label style={{ fontSize: 13, display: 'flex', gap: 5, alignItems: 'center' }}>
                        <input type="radio" name={`scope-${g.id}`} checked={scope === 'full'} onChange={() => setScopeById(s => ({ ...s, [g.id]: 'full' }))} /> Full (view &amp; edit)
                      </label>
                      {g.scope && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>· they asked for {g.scope === 'full' ? 'full' : 'view only'}</span>}
                    </div>

                    <details style={{ marginBottom: 12 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#2564A8' }}>Read the authorization you’re agreeing to</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', font: '12px/1.6 system-ui, sans-serif', background: 'var(--color-background-secondary, #F5F8F3)', border: '0.5px solid var(--color-border, #E2E8E0)', borderRadius: 8, padding: 14, marginTop: 8, color: 'var(--color-text)' }}>
                        {previewConsent({ firmName, clientName: org?.name || 'this company', scope })}
                      </pre>
                    </details>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn-primary" disabled={busy === g.id} onClick={() => act(g.id, 'approve', { scope })}>
                        {busy === g.id ? '…' : 'Approve access'}
                      </button>
                      <button className="btn-secondary" disabled={busy === g.id} onClick={() => act(g.id, 'decline')}>Decline</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active grants */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Firms with access</h2>
            {active.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>No bookkeeper currently has access to this company’s books.</p>
            ) : active.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid var(--color-border, #E2E8E0)', paddingTop: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{g.tenant?.name || 'Firm'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {g.scope === 'full' ? 'Full access (view & edit)' : 'View only'} · granted {fmt(g.grantedAt)}
                  </div>
                </div>
                <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => downloadRecord(g.id, toast)}>Download copy</button>
                <button disabled={busy === g.id} onClick={() => act(g.id, 'revoke')}
                  style={{ fontSize: 13, fontWeight: 600, color: '#B4482F', background: 'none', border: '1px solid #E7C3B9', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                  {busy === g.id ? '…' : 'End access'}
                </button>
              </div>
            ))}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Past authorizations</h2>
              {history.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid var(--color-border, #E2E8E0)', paddingTop: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{g.tenant?.name || 'Firm'}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textTransform: 'capitalize' }}>
                      {g.status} · {fmt(g.revokedAt || g.requestedAt)}
                    </div>
                  </div>
                  {g.status === 'revoked' && <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => downloadRecord(g.id, toast)}>Download copy</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
