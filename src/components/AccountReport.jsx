import { useState, useEffect, useMemo } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const isoDay = (d) => d.toISOString().slice(0, 10);

// Date-range presets. "This" periods run to today; "last" periods are the full prior period.
function presetRange(key) {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const first = (yy, mm) => new Date(Date.UTC(yy, mm, 1));
  const last  = (yy, mm) => new Date(Date.UTC(yy, mm + 1, 0));
  switch (key) {
    case 'this_month':   return { from: isoDay(first(y, m)),     to: isoDay(now) };
    case 'last_month':   return { from: isoDay(first(y, m - 1)), to: isoDay(last(y, m - 1)) };
    case 'this_quarter': return { from: isoDay(first(y, Math.floor(m / 3) * 3)), to: isoDay(now) };
    case 'this_year':    return { from: isoDay(first(y, 0)),     to: isoDay(now) };
    case 'last_year':    return { from: isoDay(first(y - 1, 0)), to: isoDay(last(y - 1, 11)) };
    default:             return null; // custom
  }
}

// The period to compare against: same dates a year earlier, or the same-length span
// immediately before the current one.
function priorRange(from, to, mode) {
  if (mode === 'none' || !from || !to) return null;
  const f = new Date(from + 'T00:00:00Z'), t = new Date(to + 'T00:00:00Z');
  if (mode === 'year') {
    const f2 = new Date(f); f2.setUTCFullYear(f2.getUTCFullYear() - 1);
    const t2 = new Date(t); t2.setUTCFullYear(t2.getUTCFullYear() - 1);
    return { from: isoDay(f2), to: isoDay(t2) };
  }
  const days = Math.round((t - f) / 86400000);
  const pt = new Date(f); pt.setUTCDate(pt.getUTCDate() - 1);
  const pf = new Date(pt); pf.setUTCDate(pf.getUTCDate() - days);
  return { from: isoDay(pf), to: isoDay(pt) };
}

// QuickBooks-style account report for an income/expense account: the account's
// activity over a chosen period, with an optional comparison to a prior period.
export default function AccountReport({ account, orgId, token, onClose }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [preset, setPreset] = useState('this_month');
  const init = presetRange('this_month');
  const [from, setFrom] = useState(init.from);
  const [to, setTo] = useState(init.to);
  const [compare, setCompare] = useState('none'); // none | period | year
  const [cur, setCur] = useState(null);
  const [prev, setPrev] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  function applyPreset(key) {
    setPreset(key);
    const r = presetRange(key);
    if (r) { setFrom(r.from); setTo(r.to); }
  }

  async function fetchPeriod(range) {
    const r = await fetch(`${API}/orgs/${orgId}/accounts/${account.id}/register?from=${range.from}&to=${range.to}`, { headers }).then(x => x.json());
    if (!r.success) throw new Error(r.message || 'Could not load the report.');
    const rows = r.data.rows || [];
    const total = Math.round(rows.reduce((s, x) => s + (x.increase || 0) - (x.decrease || 0), 0) * 100) / 100;
    return { rows, total };
  }

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr('');
      try {
        const c = await fetchPeriod({ from, to });
        if (cancel) return;
        setCur(c);
        const pr = priorRange(from, to, compare);
        if (pr) { const p = await fetchPeriod(pr); if (!cancel) setPrev({ ...p, range: pr }); }
        else setPrev(null);
      } catch (e) { if (!cancel) setErr(e.message || 'Could not load the report.'); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [from, to, compare, account.id]);

  const rows = cur?.rows || [];
  // Running period total (starts at 0 at the period start).
  const withRunning = useMemo(() => {
    let run = 0;
    return rows.map(x => { run = Math.round((run + (x.increase || 0) - (x.decrease || 0)) * 100) / 100; return { ...x, run }; });
  }, [rows]);

  const change = cur && prev ? Math.round((cur.total - prev.total) * 100) / 100 : null;
  const pct = cur && prev && prev.total !== 0 ? Math.round((change / Math.abs(prev.total)) * 1000) / 10 : null;

  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--color-border-tertiary, #EBF2E8)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{account.name} <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: 13 }}>· report</span></h2>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>{account.type} account activity</div>
          </div>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>

        {/* controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end', padding: '14px 22px', borderBottom: '1px solid var(--color-border-tertiary, #EBF2E8)', background: 'var(--color-background-secondary, #FAFCF9)' }}>
          <Lbl t="Period">
            <select value={preset} onChange={e => applyPreset(e.target.value)} style={input}>
              <option value="this_month">This month</option>
              <option value="last_month">Last month</option>
              <option value="this_quarter">This quarter</option>
              <option value="this_year">This year</option>
              <option value="last_year">Last year</option>
              <option value="custom">Custom…</option>
            </select>
          </Lbl>
          <Lbl t="From"><input type="date" value={from} onChange={e => { setPreset('custom'); setFrom(e.target.value); }} style={input} /></Lbl>
          <Lbl t="To"><input type="date" value={to} onChange={e => { setPreset('custom'); setTo(e.target.value); }} style={input} /></Lbl>
          <Lbl t="Compare to">
            <select value={compare} onChange={e => setCompare(e.target.value)} style={input}>
              <option value="none">No comparison</option>
              <option value="period">Previous period</option>
              <option value="year">Previous year</option>
            </select>
          </Lbl>
        </div>

        {/* summary */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, padding: '14px 22px', borderBottom: '1px solid var(--color-border-tertiary, #EBF2E8)' }}>
          <Stat label={`This period (${fmtDate(from)} – ${fmtDate(to)})`} value={money(cur?.total || 0)} big />
          {prev && (
            <>
              <Stat label={`Prior (${fmtDate(prev.range.from)} – ${fmtDate(prev.range.to)})`} value={money(prev.total)} />
              <Stat label="Change" value={`${change >= 0 ? '+' : ''}${money(change)}${pct == null ? '' : `  (${pct >= 0 ? '+' : ''}${pct}%)`}`}
                color={change > 0 ? '#0F6E56' : change < 0 ? '#A3302A' : undefined} />
            </>
          )}
        </div>

        {/* transactions */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading report…</div>
          ) : err ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#B4472D' }}>{err}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--color-background-primary, #fff)', boxShadow: '0 1px 0 var(--color-border-tertiary, #EBF2E8)' }}>
                  <th style={th}>Date</th><th style={th}>Payee</th><th style={th}>Account</th><th style={th}>Memo</th>
                  <th style={{ ...th, textAlign: 'right' }}>Amount</th><th style={{ ...th, textAlign: 'right' }}>Running</th>
                </tr>
              </thead>
              <tbody>
                {withRunning.length === 0 ? (
                  <tr><td style={{ ...td, color: 'var(--color-text-secondary)' }} colSpan={6}>No activity in this account for the selected period.</td></tr>
                ) : withRunning.map(x => {
                  const amt = Math.round(((x.increase || 0) - (x.decrease || 0)) * 100) / 100;
                  return (
                    <tr key={x.entryId} style={{ borderTop: '0.5px solid var(--color-border-tertiary, #EBF2E8)' }}>
                      <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDate(x.date)}</td>
                      <td style={td}>{x.payee || <span style={{ color: '#B7C6B7' }}>—</span>}</td>
                      <td style={td}>{x.otherAccount}</td>
                      <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{x.memo}</td>
                      <td style={{ ...td, textAlign: 'right', color: amt >= 0 ? '#0F6E56' : '#A3302A' }}>{money(amt)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(x.run)}</td>
                    </tr>
                  );
                })}
                {withRunning.length > 0 && (
                  <tr style={{ borderTop: '1.5px solid var(--color-border-secondary, #D4DDCC)' }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={4}>Total for {account.name}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{money(cur.total)}</td>
                    <td style={td}></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Lbl({ t, children }) {
  return (<div><label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{t}</label>{children}</div>);
}
function Stat({ label, value, big, color }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: big ? 24 : 18, fontWeight: 700, color: color || 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const sheet = { background: 'var(--color-background-primary, #fff)', color: 'var(--color-text-primary)', borderRadius: 14, width: 980, maxWidth: '97vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const th = { padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const td = { padding: '8px 12px', verticalAlign: 'top' };
const input = { padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box', background: 'var(--color-background-primary, #fff)', color: 'var(--color-text-primary)' };
const xBtn = { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1, color: 'var(--color-text-secondary)' };
