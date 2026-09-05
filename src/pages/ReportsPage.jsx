import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const TABS = ['P&L', 'Balance Sheet', 'Cash Flow', 'Aged A/R', 'Trial Balance', 'General Ledger'];
const PERIODS = [
  { key: 'full',   label: 'Full year' },
  { key: 'q1',     label: 'Q1' },
  { key: 'q2',     label: 'Q2' },
  { key: 'q3',     label: 'Q3' },
  { key: 'q4',     label: 'Q4' },
  { key: 'custom', label: 'Custom' },
];
const GREEN = '#2D4A35', RED = '#c0392b';

const fmt = n => (Number(n || 0) < 0 ? '-$' : '$') +
  Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Never throw on a bad/missing date — return '' instead of crashing the page.
const safeISO = v => { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); };

function computeRange(year, period) {
  if (period === 'full') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const q = { q1: [0, 2], q2: [3, 5], q3: [6, 8], q4: [9, 11] }[period] || [0, 11];
  const [sm, em] = q;
  const lastDay = new Date(year, em + 1, 0).getDate();
  return {
    from: `${year}-${String(sm + 1).padStart(2, '0')}-01`,
    to:   `${year}-${String(em + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

const isoOf = d => { const x = new Date(d); return isNaN(x.getTime()) ? '' : x.toISOString().slice(0, 10); };

// The comparison window for a selected range: the equal-length span immediately
// before it ('prev'), or the same dates one year earlier ('prevyear').
function priorRange(from, to, mode) {
  const f = new Date(from), t = new Date(to);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return null;
  if (mode === 'prevyear') {
    const pf = new Date(f); pf.setFullYear(pf.getFullYear() - 1);
    const pt = new Date(t); pt.setFullYear(pt.getFullYear() - 1);
    return { from: isoOf(pf), to: isoOf(pt) };
  }
  const span = t.getTime() - f.getTime();
  const pt = new Date(f.getTime() - 86400000);
  const pf = new Date(pt.getTime() - span);
  return { from: isoOf(pf), to: isoOf(pt) };
}

// Merge two category lists into { category, a, b } rows (a = this period, b = prior).
function mergeRows(aRows = [], bRows = []) {
  const map = new Map();
  for (const r of aRows) map.set(r.category, { category: r.category, a: Number(r.amount || 0), b: 0 });
  for (const r of bRows) {
    const e = map.get(r.category) || { category: r.category, a: 0, b: 0 };
    e.b = Number(r.amount || 0); map.set(r.category, e);
  }
  return [...map.values()];
}

export default function ReportsPage() {
  const { org } = useAuth();
  const now = new Date();
  const [tab, setTab]       = useState('P&L');
  const [year, setYear]     = useState(now.getFullYear());
  const [period, setPeriod] = useState('full');
  const [basis, setBasis]   = useState('accrual');
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [accounts, setAccounts]       = useState([]);
  const [glAccountId, setGlAccountId] = useState('');
  const [customFrom, setCustomFrom]   = useState(`${now.getFullYear()}-01-01`);
  const [customTo, setCustomTo]       = useState(safeISO(now));
  const [asOfDate, setAsOfDate]       = useState(safeISO(now));
  const [compare, setCompare]         = useState('none');   // none | prev | prevyear
  const [data2, setData2]             = useState(null);      // comparison-period payload

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 6; y--) years.push(y);

  useEffect(() => {
    if (!org) return;
    api.get(`/orgs/${org.id}/accounts`).then(r => setAccounts(r?.data || [])).catch(() => {});
  }, [org]);

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        const { from, to } = period === 'custom' ? { from: customFrom, to: customTo } : computeRange(year, period);
        if (!cancelled) setData2(null);
        let path;
        if (tab === 'Aged A/R') {
          path = `/orgs/${org.id}/reports/aged-ar`;
        } else if (tab === 'Balance Sheet') {
          path = `/orgs/${org.id}/reports/balance-sheet?asOf=${asOfDate}`;
        } else if (tab === 'Trial Balance') {
          path = `/orgs/${org.id}/reports/trial-balance?asOf=${asOfDate}`;
        } else if (tab === 'General Ledger') {
          if (!glAccountId) { if (!cancelled) setData(null); return; }
          path = `/orgs/${org.id}/reports/ledger?accountId=${glAccountId}&from=${from}&to=${to}`;
        } else {
          const base  = tab === 'Cash Flow' ? 'cash-flow' : 'pl';
          const extra = tab === 'P&L' ? `&basis=${basis}` : '';
          path = `/orgs/${org.id}/reports/${base}?from=${from}&to=${to}${extra}`;
        }
        const res = await api.get(path);
        // api.get returns the response body { success, data }, so the payload is res.data.
        const payload = res?.data ?? null;
        // Guard: the real engine returns an object; the old stub returned []. Treat
        // a non-object (or array) as "no data" rather than crashing.
        if (!cancelled) setData((payload && !Array.isArray(payload)) ? payload : null);

        // Comparison period (P&L only): fetch the same statement for the prior window.
        if (tab === 'P&L' && compare !== 'none') {
          const pr = priorRange(from, to, compare);
          if (pr) {
            const res2 = await api.get(`/orgs/${org.id}/reports/pl?from=${pr.from}&to=${pr.to}&basis=${basis}`);
            const p2 = res2?.data ?? null;
            if (!cancelled) setData2((p2 && !Array.isArray(p2)) ? { ...p2, _range: pr } : null);
          }
        }
      } catch (e) {
        if (!cancelled) { setError('Could not load report.'); console.error(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [org, tab, year, period, basis, glAccountId, customFrom, customTo, asOfDate, compare]);

  const line = (label, value, opts = {}) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: 14, color: opts.strong ? '#222' : '#555', fontWeight: opts.strong ? 600 : 400, paddingLeft: opts.indent ? 14 : 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: opts.strong ? 700 : 600, color: opts.color || '#333' }}>{fmt(value)}</span>
    </div>
  );
  const sectionHead = t => (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#7A9A7A', margin: '18px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t}</h3>
  );
  const ctrlBtn = (active) => ({
    padding: '5px 12px', borderRadius: 8, border: '1px solid',
    borderColor: active ? GREEN : '#e0e0e0', background: active ? '#f0f7f0' : '#fff',
    color: active ? GREEN : '#777', fontSize: 12.5, cursor: 'pointer', fontWeight: active ? 600 : 400,
  });
  const dateInput = { padding: '5px 9px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', color: GREEN, fontSize: 12.5, cursor: 'pointer' };
  // Change cell: favorable direction depends on the row kind (revenue up = good, expense up = bad).
  const deltaColor = (delta, kind) => { if (!delta) return '#999'; const good = kind === 'expense' ? delta < 0 : delta > 0; return good ? GREEN : RED; };
  const cmpRow = (label, a, b, opts = {}) => {
    const delta = Number(a || 0) - Number(b || 0);
    const pct = Number(b) ? (delta / Math.abs(Number(b))) * 100 : null;
    return (
      <tr style={{ borderBottom: '1px solid #f0f0f0', ...(opts.top ? { borderTop: '2px solid ' + GREEN } : {}) }}>
        <td style={{ padding: '9px 6px', fontSize: 14, color: opts.strong ? '#222' : '#555', fontWeight: opts.strong ? 600 : 400, paddingLeft: opts.indent ? 16 : 6 }}>{label}</td>
        <td style={{ padding: '9px 6px', textAlign: 'right', fontSize: 14, fontWeight: opts.strong ? 700 : 600, color: opts.color || '#333' }}>{fmt(a)}</td>
        <td style={{ padding: '9px 6px', textAlign: 'right', fontSize: 14, fontWeight: opts.strong ? 700 : 600, color: '#888' }}>{fmt(b)}</td>
        <td style={{ padding: '9px 6px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: deltaColor(delta, opts.kind) }}>
          {delta > 0 ? '+' : ''}{fmt(delta)}
          {pct !== null && <span style={{ color: '#aaa', fontWeight: 400, marginLeft: 6 }}>{pct > 0 ? '+' : ''}{pct.toFixed(0)}%</span>}
        </td>
      </tr>
    );
  };

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Reports</h1></div>

      {/* Statement tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '7px 16px', borderRadius: 20, border: '1px solid',
            borderColor: tab === t ? GREEN : '#D4DDCC', background: tab === t ? GREEN : '#fff',
            color: tab === t ? '#A8D4A8' : '#7A9A7A', fontSize: 13, fontWeight: tab === t ? 500 : 400, cursor: 'pointer',
          }}>{t}</button>
        ))}
      </div>

      {/* Controls: period / dates + basis + compare */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {['P&L', 'Cash Flow', 'General Ledger'].includes(tab) && (
          <select value={year} onChange={e => setYear(Number(e.target.value))} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff',
            color: GREEN, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
        {tab === 'General Ledger' && (
          <select value={glAccountId} onChange={e => setGlAccountId(e.target.value)} style={{
            padding: '6px 10px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff',
            color: GREEN, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <option value="">Select account…</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        )}
        {(tab === 'P&L' || tab === 'Cash Flow') && PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={ctrlBtn(period === p.key)}>{p.label}</button>
        ))}
        {(tab === 'P&L' || tab === 'Cash Flow') && period === 'custom' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateInput} />
            <span style={{ color: '#999', fontSize: 12 }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={dateInput} />
          </span>
        )}
        {(tab === 'Balance Sheet' || tab === 'Trial Balance') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#999' }}>As of</span>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} style={dateInput} />
          </span>
        )}
        {tab === 'Aged A/R' && <span style={{ fontSize: 12.5, color: '#7A9A7A' }}>As of today · what customers owe you</span>}
        {tab === 'P&L' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#999' }}>Compare:</span>
              {[['none', 'Off'], ['prev', 'Prev period'], ['prevyear', 'Prev year']].map(([k, lbl]) => (
                <button key={k} onClick={() => setCompare(k)} style={ctrlBtn(compare === k)}>{lbl}</button>
              ))}
            </span>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#999' }}>Basis:</span>
              {['accrual', 'cash'].map(b => (
                <button key={b} onClick={() => setBasis(b)} style={{ ...ctrlBtn(basis === b), textTransform: 'capitalize' }}>{b}</button>
              ))}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: RED }}>{error}</div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>
          {tab === 'General Ledger' && !glAccountId ? 'Select an account above to view its ledger.' : 'No data for this period yet.'}
        </div>
      ) : (
        <div className="card" style={{ padding: 24, maxWidth: ['Aged A/R', 'Trial Balance', 'General Ledger'].includes(tab) ? 920 : 640 }}>

          {tab === 'P&L' && !data2 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Profit &amp; Loss</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                {safeISO(data.from)} → {safeISO(data.to)} · {data.basis || basis} basis
              </div>
              {sectionHead('Revenue')}
              {(data.revenueByCategory || []).map(r => line(r.category, r.amount, { indent: true }))}
              {line('Total revenue', data.revenue, { strong: true, color: GREEN })}
              {sectionHead('Expenses')}
              {(data.expenseByCategory || []).map(r => line(r.category, r.amount, { indent: true, color: RED }))}
              {line('Total expenses', data.expenses, { strong: true, color: RED })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Net income</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: Number(data.netIncome) >= 0 ? GREEN : RED }}>{fmt(data.netIncome)}</span>
              </div>
            </>
          )}

          {tab === 'P&L' && data2 && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Profit &amp; Loss</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                {safeISO(data.from)} → {safeISO(data.to)} vs {safeISO(data2._range?.from)} → {safeISO(data2._range?.to)} · {data.basis || basis} basis
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                      <th style={{ textAlign: 'left', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600, fontSize: 12 }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600, fontSize: 12 }}>This period</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600, fontSize: 12 }}>{compare === 'prevyear' ? 'Prior year' : 'Prior period'}</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#222', fontWeight: 700, fontSize: 12 }}>Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td colSpan={4} style={{ padding: '16px 6px 4px', fontSize: 12, fontWeight: 700, color: '#7A9A7A', textTransform: 'uppercase', letterSpacing: 0.5 }}>Revenue</td></tr>
                    {mergeRows(data.revenueByCategory, data2.revenueByCategory).map(r => cmpRow(r.category, r.a, r.b, { indent: true, kind: 'revenue' }))}
                    {cmpRow('Total revenue', data.revenue, data2.revenue, { strong: true, color: GREEN, kind: 'revenue' })}
                    <tr><td colSpan={4} style={{ padding: '16px 6px 4px', fontSize: 12, fontWeight: 700, color: '#7A9A7A', textTransform: 'uppercase', letterSpacing: 0.5 }}>Expenses</td></tr>
                    {mergeRows(data.expenseByCategory, data2.expenseByCategory).map(r => cmpRow(r.category, r.a, r.b, { indent: true, color: RED, kind: 'expense' }))}
                    {cmpRow('Total expenses', data.expenses, data2.expenses, { strong: true, color: RED, kind: 'expense' })}
                  </tbody>
                  <tfoot>
                    {cmpRow('Net income', data.netIncome, data2.netIncome, { strong: true, top: true, kind: 'revenue' })}
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {tab === 'Balance Sheet' && data.assets && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Balance Sheet</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>As of {safeISO(data.asOf)} · from the general ledger</div>
              {sectionHead('Assets')}
              {(data.assets.lines || []).map(l => line(`${l.code} · ${l.name}`, l.amount, { indent: true }))}
              {(data.assets.lines || []).length === 0 && line('—', 0, { indent: true, color: '#999' })}
              {line('Total assets', data.assets.total, { strong: true, color: GREEN })}
              {sectionHead('Liabilities')}
              {(data.liabilities.lines || []).map(l => line(`${l.code} · ${l.name}`, l.amount, { indent: true, color: RED }))}
              {(data.liabilities.lines || []).length === 0 && line('—', 0, { indent: true, color: '#999' })}
              {line('Total liabilities', data.liabilities.total, { strong: true, color: RED })}
              {sectionHead('Equity')}
              {(data.equity.lines || []).map(l => line(`${l.code} · ${l.name}`, l.amount, { indent: true }))}
              {Number(data.equity.retainedEarnings) !== 0 && line('Retained earnings (prior years)', data.equity.retainedEarnings, { indent: true })}
              {line('Net income (current earnings)', data.equity.netIncome, { indent: true })}
              {line('Total equity', data.equity.total, { strong: true })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Liabilities + Equity</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt(data.liabilitiesAndEquity ?? (data.liabilities.total + data.equity.total))}</span>
              </div>
              {data.balanced === false && (
                <div style={{ marginTop: 8, fontSize: 12, color: RED }}>⚠ Assets don't equal Liabilities + Equity — check the ledger.</div>
              )}
            </>
          )}

          {tab === 'Cash Flow' && data.detail && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Cash Flow</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>{safeISO(data.from)} → {safeISO(data.to)}</div>
              {sectionHead('Cash in')}
              {line('Collected from invoices', data.detail.collectedFromInvoices, { indent: true, color: GREEN })}
              {line('Total cash in', data.cashIn, { strong: true, color: GREEN })}
              {sectionHead('Cash out')}
              {line('Expenses paid', data.detail.expensesPaid, { indent: true, color: RED })}
              {line('Bills paid', data.detail.billsPaid, { indent: true, color: RED })}
              {line('Total cash out', data.cashOut, { strong: true, color: RED })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Net cash flow</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: Number(data.netCashFlow) >= 0 ? GREEN : RED }}>{fmt(data.netCashFlow)}</span>
              </div>
            </>
          )}

          {tab === 'Aged A/R' && data.totals && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Aged Accounts Receivable</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>As of {safeISO(data.asOf)}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                      <th style={{ textAlign: 'left',  padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Customer</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Current</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>1–30</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>31–60</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>61–90</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>90+</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#222',    fontWeight: 700 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customers.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '16px 6px', color: '#7A9A7A' }}>No outstanding receivables — everyone's paid up. 🎉</td></tr>
                    )}
                    {data.customers.map(c => (
                      <tr key={c.customer} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '9px 6px', fontWeight: 500 }}>{c.customer}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{fmt(c.current)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{fmt(c.d1_30)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{fmt(c.d31_60)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', color: c.d61_90 > 0 ? '#d4682a' : '#333' }}>{fmt(c.d61_90)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', color: c.d90_plus > 0 ? RED : '#333' }}>{fmt(c.d90_plus)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid ' + GREEN }}>
                      <td style={{ padding: '10px 6px', fontWeight: 700 }}>Total</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totals.current)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totals.d1_30)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totals.d31_60)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totals.d61_90)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: data.totals.d90_plus > 0 ? RED : '#333' }}>{fmt(data.totals.d90_plus)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmt(data.totals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          {tab === 'Trial Balance' && data.rows && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Trial Balance</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 14 }}>As of {safeISO(data.asOf)}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 520 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                      <th style={{ textAlign: 'left',  padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Account</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Debit</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '16px 6px', color: '#7A9A7A' }}>No posted journal entries yet.</td></tr>
                    )}
                    {data.rows.map(r => (
                      <tr key={r.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '9px 6px' }}><span style={{ fontFamily: 'monospace', color: '#7A9A7A', marginRight: 8 }}>{r.code}</span>{r.name}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{r.debit ? fmt(r.debit) : ''}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{r.credit ? fmt(r.credit) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid ' + GREEN }}>
                      <td style={{ padding: '10px 6px', fontWeight: 700 }}>Total</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totalDebit)}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700 }}>{fmt(data.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: data.balanced ? GREEN : RED }}>
                {data.balanced ? '✓ In balance — total debits equal total credits' : 'Out of balance — check your entries'}
              </div>
            </>
          )}

          {tab === 'General Ledger' && data.rows && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>General Ledger</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                {data.account?.code} {data.account?.name} · {safeISO(data.from)} → {safeISO(data.to)}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                      <th style={{ textAlign: 'left',  padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Date</th>
                      <th style={{ textAlign: 'left',  padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Ref</th>
                      <th style={{ textAlign: 'left',  padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Memo</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Debit</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#7A9A7A', fontWeight: 600 }}>Credit</th>
                      <th style={{ textAlign: 'right', padding: '8px 6px', color: '#222',    fontWeight: 700 }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                      <td colSpan={5} style={{ padding: '9px 6px', color: '#7A9A7A', fontStyle: 'italic' }}>Opening balance</td>
                      <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(data.opening)}</td>
                    </tr>
                    {data.rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '9px 6px' }}>{safeISO(r.date)}</td>
                        <td style={{ padding: '9px 6px', fontFamily: 'monospace', color: '#7A9A7A' }}>{r.reference || ''}</td>
                        <td style={{ padding: '9px 6px' }}>{r.memo || ''}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{r.debit ? fmt(r.debit) : ''}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right' }}>{r.credit ? fmt(r.credit) : ''}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(r.balance)}</td>
                      </tr>
                    ))}
                    {data.rows.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '16px 6px', color: '#7A9A7A' }}>No activity in this period.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid ' + GREEN }}>
                      <td colSpan={5} style={{ padding: '10px 6px', fontWeight: 700 }}>Closing balance</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: GREEN }}>{fmt(data.closing)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>
        The P&amp;L (accrual), Balance Sheet, Trial Balance, and General Ledger are computed directly from your
        general ledger — real double-entry statements. Cash Flow and cash-basis figures are practical estimates
        that approximate payment timing until per-payment dates are tracked.
      </div>
    </div>
  );
}
