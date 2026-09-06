import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

const API = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
const H = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` });

const card = { background: '#ffffff', border: '0.5px solid #EBF2E8', borderRadius: 12, padding: 24, maxWidth: 760, margin: '0 auto' };
const field = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '0.5px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box', background: '#ffffff', color: '#1f2a24' };

// Blocks the reseller console until the firm's owner/admin accepts the current
// White-Label Reseller Partner Agreement. `status` comes from
// GET /partner-agreement/status (carries canAccept + the current version).
export default function PartnerAgreementGate({ tenantId, tenantName, status, onAccepted }) {
  const toast = useToast();
  const { user } = useAuth();
  const canAccept = !!status?.canAccept;

  const [doc, setDoc]         = useState(null);   // { version, title, text }
  const [loading, setLoading] = useState(true);
  const [agree, setAgree]     = useState(false);
  const [name, setName]       = useState(user?.fullName || '');
  const [title, setTitle]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/partner-agreement/current`, { headers: H() }).then(x => x.json());
        if (!cancelled) setDoc(r.data || null);
      } catch { if (!cancelled) toast.error('Could not load the partner agreement.'); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function accept() {
    if (!agree || !name.trim() || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/partner-agreement/accept`, {
        method: 'POST',
        headers: H(),
        body: JSON.stringify({ tenantId, name: name.trim(), title: title.trim() || undefined }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.message || 'Could not record acceptance.');
      toast.success('Agreement accepted — you’re all set.');
      onAccepted?.();
    } catch (e) {
      toast.error(e.message || 'Could not record acceptance.');
    }
    setSaving(false);
  }

  return (
    <div style={{ padding: '4px 0 24px' }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🤝</div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#0A2440' }}>One step before you begin</h2>
          <p style={{ fontSize: 13, color: '#5E6B62', marginTop: 6, lineHeight: 1.5 }}>
            {canAccept
              ? <>Please review and accept the Partner Agreement to activate <strong>{tenantName || 'your firm'}</strong>. Your acceptance is recorded and takes the place of a signature.</>
              : <>Your firm hasn’t accepted the Partner Agreement yet. An <strong>owner or admin</strong> of {tenantName || 'your firm'} needs to review and accept it before the console can be used.</>}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#5E6B62' }}>Loading agreement…</div>
        ) : !doc ? (
          <div style={{ textAlign: 'center', padding: 30, color: '#B4482F' }}>The agreement could not be loaded. Please refresh and try again.</div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#5E6B62', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{doc.title}</span>
              <span>Version {doc.version}</span>
            </div>
            <div style={{
              maxHeight: 300, overflowY: 'auto', border: '0.5px solid #D4DDCC', borderRadius: 8,
              padding: '14px 16px', background: '#FBFDFA', fontSize: 12.5, lineHeight: 1.55,
              color: '#26332B', whiteSpace: 'pre-wrap', fontFamily: 'inherit',
            }}>
              {doc.text}
            </div>

            {canAccept ? (
              <div style={{ marginTop: 18 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#26332B', lineHeight: 1.45 }}>
                  <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, flex: 'none' }} />
                  <span>I have read and agree to the MountainTop Ledger White-Label Reseller Partner Agreement, and I am authorized to accept it on behalf of my firm.</span>
                </label>

                <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 240px' }}>
                    <label style={{ fontSize: 12, color: '#5E6B62', display: 'block', marginBottom: 4 }}>Your full name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Bookkeeper" style={field} />
                  </div>
                  <div style={{ flex: '1 1 240px' }}>
                    <label style={{ fontSize: 12, color: '#5E6B62', display: 'block', marginBottom: 4 }}>Your title (optional)</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Owner" style={field} />
                  </div>
                </div>

                <button
                  onClick={accept}
                  disabled={!agree || !name.trim() || saving}
                  style={{
                    marginTop: 16, width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
                    background: (!agree || !name.trim() || saving) ? '#B7C4B4' : 'var(--brand-primary, #0A2440)',
                    color: '#fff', fontSize: 14, fontWeight: 700,
                    cursor: (!agree || !name.trim() || saving) ? 'not-allowed' : 'pointer',
                  }}>
                  {saving ? 'Recording…' : 'I Agree'}
                </button>
                <p style={{ fontSize: 11, color: '#8A968E', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                  Clicking “I Agree” records your name, the version above, and the date, time, and IP address of acceptance as your electronic signature. This draft is pending final legal review.
                </p>
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: '#5E6B62', marginTop: 16, textAlign: 'center' }}>
                Ask an owner or admin of your firm to sign in and accept the agreement.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
