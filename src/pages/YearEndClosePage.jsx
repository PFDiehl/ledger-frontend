import { useState, useEffect } from 'react';
import { useAuth }  from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';
import { api }      from '../lib/api';

const card  = { background: 'var(--color-surface, #fff)', border: '0.5px solid var(--color-border, #E2E8E0)', borderRadius: 12, padding: 20 };
const money = (n) => (Number(n || 0) < 0 ? '-$' : '$') + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
const iso = (d) => new Date(d).toISOString().slice(0, 10);

// Sensible default: the Dec 31 that should be closed next. If never closed, last
// completed calendar year; if already closed, the year after the closing date.
function defaultCloseDate(closingDate) {
  const now = new Date();
  let year;
  if (closingDate) year = new Date(closingDate).getFullYear() + 1;
  else year = now.getFullYear() - 1;
  if (year > now.getFullYear()) year = now.getFullYear();
  return `${year}-12-31`;
}

export default function YearEndClosePage() {
  const toast = useToast();
  const { org } = useAuth();

  const [status, setStatus]   = useState(null); // { closingDate, openNetIncome, events }
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState('');
  const [preview, setPreview] = useState(null); // { netIncome } for the chosen date
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy]       = useState(false);

  async function load() {
    if (!org?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/orgs/${org.id}/fiscal-close`);
      const data = res?.data || null;
      setStatus(data);
      setDateStr(defaultCloseDate(data?.closingDate));
    } catch { toast.error('Could not load year-end close.'); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [org?.id]);

  // Refresh the preview whenever the chosen date changes.
  useEffect(() => {
    if (!org?.id || !dateStr) { setPreview(null); return; }
    let live = true;
    api.get(`/orgs/${org.id}/fiscal-close/preview?closingDate=${dateStr}`)
      .then(r => { if (live) setPreview(r?.data || null); })
      .catch(() => { if (live) setPreview(null); });
    return () => { live = false; };
  }, [org?.id, dateStr]);

  async function doClose() {
    setBusy(true);
    try {
      const res = await api.post(`/orgs/${org.id}/fiscal-close/close`, { closingDate: dateStr });
      if (res?.success === false) toast.error(res.message || 'Could not close the year.');
      else { toast.success('Year closed.'); setConfirming(false); load(); }
    } catch (e) { toast.error(e?.message || 'Could not close the year.'); }
    setBusy(false);
  }

  async function doReopen() {
    setBusy(true);
    try {
      const res = await api.post(`/orgs/${org.id}/fiscal-close/reopen`, {});
      if (res?.success === false) toast.error(res.message || 'Could not reopen.');
      else { toast.success('Period reopened.'); load(); }
    } catch (e) { toast.error(e?.message || 'Could not reopen.'); }
    setBusy(false);
  }

  const closingDate = status?.closingDate;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Year-end close</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
          Lock a finished year so its numbers can’t change, and roll its profit into Retained Earnings.
        </p>
      </div>

      {loading ? (
        <div style={{ ...card, color: 'var(--color-text-secondary)' }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>

          {/* Current status */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-lock" style={{ fontSize: 20, color: closingDate ? '#1E7A3D' : 'var(--color-text-tertiary)' }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  {closingDate ? `Books are closed through ${fmtDate(closingDate)}` : 'Your books are fully open'}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {closingDate
                    ? 'Transactions dated on or before this date are locked.'
                    : 'No year has been closed yet.'}
                </div>
              </div>
              {closingDate && (
                <button onClick={doReopen} disabled={busy}
                  style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: '#B4482F', background: 'none', border: '1px solid #E7C3B9', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
                  {busy ? '…' : 'Reopen last period'}
                </button>
              )}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '0.5px solid var(--color-border, #E2E8E0)', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Net income in the open period (through today)</span>
              <span style={{ fontWeight: 700, color: Number(status?.openNetIncome) < 0 ? '#B4482F' : '#1E7A3D' }}>{money(status?.openNetIncome)}</span>
            </div>
          </div>

          {/* Close a year */}
          <div style={card}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>Close a year</h2>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '0 0 14px' }}>
              Pick the last day of the period you want to lock — usually December 31. Its profit rolls into Retained Earnings, and nothing dated on or before it can change until you reopen it.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 5 }}>Closing date</label>
                <input type="date" value={dateStr} max={iso(new Date())}
                  min={closingDate ? iso(new Date(new Date(closingDate).getTime() + 86400000)) : undefined}
                  onChange={e => setDateStr(e.target.value)}
                  style={{ padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--color-border, #E2E8E0)', fontSize: 13, background: 'var(--color-surface,#fff)', color: 'var(--color-text,#1F2A24)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--color-background-secondary, #F5F8F3)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Will roll into Retained Earnings</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: Number(preview?.netIncome) < 0 ? '#B4482F' : '#1E7A3D' }}>
                  {preview ? money(preview.netIncome) : '—'}
                </div>
              </div>
            </div>

            <button onClick={() => setConfirming(true)} disabled={!dateStr}
              style={{ marginTop: 16, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-primary, #1a3a1a)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: dateStr ? 'pointer' : 'default' }}>
              Close year through {dateStr ? fmtDate(dateStr) : '…'}
            </button>
          </div>

          {/* History */}
          {status?.events?.length > 0 && (
            <div style={card}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>History</h2>
              {status.events.map(ev => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '0.5px solid var(--color-border, #E2E8E0)', paddingTop: 10, marginTop: 10, fontSize: 13 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: ev.action === 'close' ? '#1E7A3D' : '#B4482F', width: 64 }}>
                    {ev.action === 'close' ? 'Closed' : 'Reopened'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div>{ev.action === 'close' ? `Through ${fmtDate(ev.closingDate)}` : (ev.closingDate ? `Back to ${fmtDate(ev.closingDate)}` : 'Fully reopened')}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                      {new Date(ev.createdAt).toLocaleString()}{ev.performedBy ? ` · ${ev.performedBy.fullName}` : ''}
                      {ev.action === 'close' && ev.netIncomeRolled != null ? ` · ${money(ev.netIncomeRolled)} to Retained Earnings` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm modal */}
      {confirming && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--color-surface, #fff)', borderRadius: 14, padding: 26, width: 460, maxWidth: '94vw' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>Close the year?</h2>
            <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>
              You’re about to lock everything dated on or before <strong>{fmtDate(dateStr)}</strong>.
              {preview ? <> Its net income of <strong>{money(preview.netIncome)}</strong> will roll into Retained Earnings.</> : null}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', margin: '0 0 18px' }}>
              You can reopen the period later if you need to make a correction.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirming(false)} disabled={busy}
                style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid var(--color-border, #E2E8E0)', background: 'var(--color-surface,#fff)', color: 'var(--color-text,#1F2A24)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={doClose} disabled={busy}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-primary, #1a3a1a)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {busy ? 'Closing…' : 'Yes, close the year'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
