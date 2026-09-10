import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function ConfBadge({ c }) {
  const t = c >= 0.9 ? ['High', '#1E7A46', '#E4F3EA']
          : c >= 0.6 ? ['Good', '#2f6fb0', '#E5EFF9']
          :            ['Best guess', '#9A6A15', '#FBF1DC'];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, color: t[1], background: t[2] }}>{t[0]}</span>;
}

export default function AICategorizePage() {
  const { org } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [rows, setRows] = useState({});   // txnId -> { include, category, remember }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  async function load() {
    if (!org?.id) return;
    setLoading(true); setErr(null); setDone(null);
    try {
      const res = await api.get(`/orgs/${org.id}/ai/categorize/suggestions`);
      setData(res.data);
      const init = {};
      for (const s of res.data.suggestions) {
        init[s.txnId] = { include: !!s.suggested && s.confidence >= 0.6, category: s.suggested || '', remember: false };
      }
      setRows(init);
    } catch (e) { setErr(e.message || 'Could not load suggestions.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [org?.id]);

  const set = (id, patch) => setRows(r => ({ ...r, [id]: { ...r[id], ...patch } }));
  const suggestions = data?.suggestions || [];
  const accounts = data?.accounts || [];
  const selected = suggestions.filter(s => rows[s.txnId]?.include && rows[s.txnId]?.category);

  function acceptAllConfident() {
    setRows(r => {
      const n = { ...r };
      for (const s of suggestions) if (s.suggested && s.confidence >= 0.6) n[s.txnId] = { ...n[s.txnId], include: true, category: s.suggested };
      return n;
    });
  }

  async function apply() {
    if (!selected.length) return;
    setBusy(true); setDone(null);
    try {
      const items = selected.map(s => ({ txnId: s.txnId, category: rows[s.txnId].category, createRule: !!rows[s.txnId].remember }));
      const res = await api.post(`/orgs/${org.id}/ai/categorize/apply`, { items });
      setDone(res.data);
      await load();
    } catch (e) { setErr(e.message || 'Could not apply.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">✨ AI Categorize</h1>
        <button className="btn-primary" onClick={load} disabled={loading || busy}>{loading ? 'Scanning…' : 'Rescan'}</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, maxWidth: 720 }}>
        Suggests a category for each uncategorized bank transaction — learned from how you've filed similar
        charges before, your saved rules, and common-merchant patterns. Nothing is changed until you apply.
      </p>

      {err && <div className="card" style={{ padding: 14, marginTop: 16, background: '#FDEDED', color: '#B4271F', fontSize: 13 }}>{err}</div>}
      {done && <div className="card" style={{ padding: 14, marginTop: 16, background: '#E4F3EA', color: '#1E7A46', fontSize: 13 }}>
        Filed {done.applied} transaction{done.applied === 1 ? '' : 's'}{done.rulesCreated ? `, and saved ${done.rulesCreated} rule${done.rulesCreated === 1 ? '' : 's'} for next time` : ''}. ✓
      </div>}

      {!loading && data && (
        <div style={{ display: 'flex', gap: 20, margin: '16px 0', flexWrap: 'wrap', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <span><b style={{ color: 'var(--color-text-primary,#1C2E1C)', fontSize: 16 }}>{data.counts.uncategorized}</b> uncategorized</span>
          <span><b style={{ color: 'var(--color-text-primary,#1C2E1C)', fontSize: 16 }}>{data.counts.suggested}</b> with a suggestion</span>
          <span>learned from <b>{data.counts.learnedFrom}</b> past entries</span>
        </div>
      )}

      {!loading && suggestions.length === 0 && (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Nothing to categorize</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Every bank transaction is filed. Import a statement on the Banking page and come back — new ones will show up here.
          </p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={acceptAllConfident} style={btnGhost}>Accept all confident</button>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{selected.length} selected</span>
            <button className="btn-primary" onClick={apply} disabled={!selected.length || busy}>{busy ? 'Applying…' : `Apply ${selected.length || ''}`.trim()}</button>
          </div>

          <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#F5F7F2', color: '#5A6B5A' }}>
                    <th style={th}></th>
                    <th style={th}>Date</th>
                    <th style={th}>Description</th>
                    <th style={{ ...th, textAlign: 'right' }}>Amount</th>
                    <th style={th}>Category</th>
                    <th style={th}>Why</th>
                    <th style={{ ...th, textAlign: 'center' }}>Remember</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map(s => {
                    const r = rows[s.txnId] || {};
                    return (
                      <tr key={s.txnId} style={{ borderTop: '1px solid #EDF1EA' }}>
                        <td style={td}><input type="checkbox" checked={!!r.include} onChange={e => set(s.txnId, { include: e.target.checked })} /></td>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: '#5A6B5A' }}>{fmtDate(s.date)}</td>
                        <td style={{ ...td, maxWidth: 260 }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.description}>{s.description}</div></td>
                        <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: s.amount < 0 ? '#B4271F' : '#1E7A46' }}>{fmt(s.amount)}</td>
                        <td style={td}>
                          <select value={r.category || ''} onChange={e => set(s.txnId, { category: e.target.value, include: !!e.target.value })} style={sel}>
                            <option value="">— pick —</option>
                            {accounts.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                          </select>
                        </td>
                        <td style={{ ...td, color: '#5A6B5A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {s.suggested ? <ConfBadge c={s.confidence} /> : <span style={{ fontSize: 11, color: '#9AA' }}>no idea yet</span>}
                            <span style={{ fontSize: 12 }}>{s.reason}</span>
                          </div>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}><input type="checkbox" checked={!!r.remember} onChange={e => set(s.txnId, { remember: e.target.checked })} title="Save a rule so this merchant auto-files next time" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 10 }}>
            “Remember” saves a rule so the same merchant is auto-filed on future statements.
          </p>
        </>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', fontSize: 12, fontWeight: 700 };
const td = { padding: '9px 12px', verticalAlign: 'middle' };
const sel = { padding: '6px 8px', borderRadius: 7, border: '1px solid #D4DDCC', fontSize: 12, maxWidth: 200 };
const btnGhost = { padding: '8px 12px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', fontSize: 13, cursor: 'pointer' };
