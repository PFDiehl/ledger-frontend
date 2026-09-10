import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SEV = {
  high:   { label: 'High',   color: '#B4271F', bg: '#FDEDED', dot: '#E05B52' },
  medium: { label: 'Medium', color: '#9A6A15', bg: '#FBF1DC', dot: '#E0A94B' },
  low:    { label: 'Review', color: '#2f6fb0', bg: '#E5EFF9', dot: '#5AA0E0' },
};
const ICON = { duplicate: '⧉', outlier: '📈', new_vendor: '🆕' };

export default function AnomalyDetectionPage() {
  const { org } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [findings, setFindings] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [pending, setPending] = useState({});   // primaryId -> true while a dismiss/restore is in flight

  async function load() {
    if (!org?.id) return;
    setLoading(true); setErr(null);
    try {
      const res = await api.get(`/orgs/${org.id}/ai/anomalies`);
      setData(res.data);
      setFindings(res.data.findings || []);
      setDismissed(res.data.dismissed || []);
    } catch (e) { setErr(e.message || 'Could not run the scan.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [org?.id]);

  const keyOf = (f) => `${f.refType}|${f.primaryId}|${f.type}`;
  const mark = (f, v) => setPending(p => ({ ...p, [keyOf(f)]: v }));

  async function dismiss(f) {
    mark(f, true);
    // optimistic: move it out of the active list right away
    setFindings(list => list.filter(x => keyOf(x) !== keyOf(f)));
    setDismissed(list => [f, ...list]);
    try {
      await api.post(`/orgs/${org.id}/ai/anomalies/dismiss`, { refType: f.refType, refId: f.primaryId, findingType: f.type });
    } catch (e) {
      // roll back on failure
      setDismissed(list => list.filter(x => keyOf(x) !== keyOf(f)));
      setFindings(list => [f, ...list]);
      setErr(e.message || 'Could not dismiss that one.');
    } finally { mark(f, false); }
  }

  async function restore(f) {
    mark(f, true);
    setDismissed(list => list.filter(x => keyOf(x) !== keyOf(f)));
    setFindings(list => [f, ...list]);
    try {
      await api.post(`/orgs/${org.id}/ai/anomalies/restore`, { refType: f.refType, refId: f.primaryId, findingType: f.type });
    } catch (e) {
      setFindings(list => list.filter(x => keyOf(x) !== keyOf(f)));
      setDismissed(list => [f, ...list]);
      setErr(e.message || 'Could not restore that one.');
    } finally { mark(f, false); }
  }

  const counts = findings.reduce((a, f) => { a[f.severity] = (a[f.severity] || 0) + 1; return a; }, {});

  function Card({ f, action }) {
    const s = SEV[f.severity] || SEV.low;
    return (
      <div className="card" style={{ padding: '14px 16px', borderLeft: `4px solid ${s.dot}`, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: action === 'restore' ? 0.7 : 1 }}>
        <div style={{ fontSize: 22, lineHeight: 1 }}>{ICON[f.type] || '⚠️'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: s.color, background: s.bg }}>{s.label}</span>
            <span style={{ fontSize: 12, color: '#5A6B5A' }}>{fmtDate(f.date)}</span>
          </div>
          <div style={{ fontSize: 13, color: '#3A4A3A' }}>{f.detail}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(f.amount)}</div>
          {action === 'dismiss'
            ? <button onClick={() => dismiss(f)} disabled={pending[keyOf(f)]} style={miniBtn} title="I've reviewed this — stop flagging it">Dismiss</button>
            : <button onClick={() => restore(f)} disabled={pending[keyOf(f)]} style={miniBtn}>Restore</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">🛡️ Anomaly Scan</h1>
        <button className="btn-primary" onClick={load} disabled={loading}>{loading ? 'Scanning…' : 'Rescan'}</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, maxWidth: 720 }}>
        Reviews your bank transactions and expenses for likely duplicate charges, unusually large payments,
        and big first-time payees. Everything here is a flag to review — nothing is changed. Dismiss one you've
        checked and it won't come back.
      </p>

      {err && <div className="card" style={{ padding: 14, marginTop: 16, background: '#FDEDED', color: '#B4271F', fontSize: 13 }}>{err}</div>}

      {!loading && data && (
        <div style={{ display: 'flex', gap: 20, margin: '16px 0', flexWrap: 'wrap', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <span><b style={{ fontSize: 16 }}>{findings.length}</b> to review</span>
          {counts.high && <span style={{ color: SEV.high.color }}><b style={{ fontSize: 16 }}>{counts.high}</b> high</span>}
          {counts.medium && <span style={{ color: SEV.medium.color }}><b style={{ fontSize: 16 }}>{counts.medium}</b> medium</span>}
          <span>{data.scanned} transactions scanned</span>
        </div>
      )}

      {!loading && data?.note && (
        <div className="card" style={{ padding: 14, marginTop: 4, marginBottom: 14, background: '#F5F7F2', fontSize: 13, color: '#5A6B5A' }}>{data.note}</div>
      )}

      {!loading && findings.length === 0 && !data?.note && (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{dismissed.length ? 'All clear' : 'Nothing unusual'}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {dismissed.length
              ? `Everything flagged has been reviewed and dismissed. Scanned ${data?.scanned ?? 0} transactions.`
              : `Scanned ${data?.scanned ?? 0} transactions — no duplicates, outsized charges, or suspicious new payees stood out.`}
          </p>
        </div>
      )}

      {!loading && findings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {findings.map((f) => <Card key={keyOf(f)} f={f} action="dismiss" />)}
        </div>
      )}

      {!loading && dismissed.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <button onClick={() => setShowDismissed(s => !s)} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', fontSize: 13, cursor: 'pointer', padding: '6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ transform: showDismissed ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
            {dismissed.length} reviewed &amp; hidden
          </button>
          {showDismissed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              {dismissed.map((f) => <Card key={keyOf(f)} f={f} action="restore" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const miniBtn = { fontSize: 12, padding: '4px 10px', borderRadius: 7, border: '1px solid #D4DDCC', background: '#fff', color: '#5A6B5A', cursor: 'pointer', whiteSpace: 'nowrap' };
