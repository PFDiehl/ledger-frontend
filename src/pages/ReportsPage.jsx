import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const TABS = ['P&L', 'Balance Sheet', 'Cash Flow'];
const PRESETS = [
  { key: 'month',    label: 'This month'   },
  { key: 'quarter',  label: 'This quarter' },
  { key: 'year',     label: 'This year'    },
  { key: 'lastyear', label: 'Last year'    },
];

const fmt = n => (Number(n || 0) < 0 ? '-$' : '$') +
  Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function isoDate(d) { return d.toISOString().slice(0, 10); }
function rangeForPreset(preset) {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  switch (preset) {
    case 'month':    return { from: isoDate(new Date(y, m, 1)),          to: isoDate(new Date(y, m + 1, 0)) };
    case 'quarter':  { const q = Math.floor(m / 3) * 3; return { from: isoDate(new Date(y, q, 1)), to: isoDate(new Date(y, q + 3, 0)) }; }
    case 'lastyear': return { from: isoDate(new Date(y - 1, 0, 1)),      to: isoDate(new Date(y - 1, 11, 31)) };
    case 'year':
    default:         return { from: isoDate(new Date(y, 0, 1)),          to: isoDate(new Date(y, 11, 31)) };
  }
}

const GREEN = '#2D4A35', RED = '#c0392b', AMBER = '#d4682a';

export default function ReportsPage() {
  const { org } = useAuth();
  const [tab, setTab]         = useState('P&L');
  const [preset, setPreset]   = useState('year');
  const [basis, setBasis]     = useState('accrual');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!org) return;
    let cancelled = false;
    async function load() {
      setLoading(true); setError('');
      try {
        let path;
        if (tab === 'Balance Sheet') {
          path = `/orgs/${org.id}/reports/balance-sheet`;
        } else {
          const { from, to } = rangeForPreset(preset);
          const base = tab === 'Cash Flow' ? 'cash-flow' : 'pl';
          const extra = tab === 'P&L' ? `&basis=${basis}` : '';
          path = `/orgs/${org.id}/reports/${base}?from=${from}&to=${to}${extra}`;
        }
        const res = await api.get(path);
        if (!cancelled) setData(res.data?.data ?? null);
      } catch (e) {
        if (!cancelled) { setError('Could not load report.'); console.error(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [org, tab, preset, basis]);

  const line = (label, value, opts = {}) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: 14, color: opts.strong ? '#222' : '#555', fontWeight: opts.strong ? 600 : 400, paddingLeft: opts.indent ? 14 : 0 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: opts.strong ? 700 : 600, color: opts.color || '#333' }}>{fmt(value)}</span>
    </div>
  );
  const sectionHead = t => (
    <h3 style={{ fontSize: 12, fontWeight: 700, color: '#7A9A7A', margin: '18px 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t}</h3>
  );

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

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {tab !== 'Balance Sheet' && PRESETS.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)} style={{
            padding: '5px 12px', borderRadius: 8, border: '1px solid',
            borderColor: preset === p.key ? GREEN : '#e0e0e0', background: preset === p.key ? '#f0f7f0' : '#fff',
            color: preset === p.key ? GREEN : '#777', fontSize: 12.5, cursor: 'pointer', fontWeight: preset === p.key ? 600 : 400,
          }}>{p.label}</button>
        ))}
        {tab === 'Balance Sheet' && (
          <span style={{ fontSize: 12.5, color: '#7A9A7A' }}>As of today</span>
        )}
        {tab === 'P&L' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#999' }}>Basis:</span>
            {['accrual', 'cash'].map(b => (
              <button key={b} onClick={() => setBasis(b)} style={{
                padding: '5px 12px', borderRadius: 8, border: '1px solid',
                borderColor: basis === b ? GREEN : '#e0e0e0', background: basis === b ? '#f0f7f0' : '#fff',
                color: basis === b ? GREEN : '#777', fontSize: 12.5, cursor: 'pointer', textTransform: 'capitalize',
                fontWeight: basis === b ? 600 : 400,
              }}>{b}</button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, color: RED }}>{error}</div>
      ) : !data ? null : (
        <div className="card" style={{ padding: 24, maxWidth: 640 }}>

          {tab === 'P&L' && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Profit &amp; Loss</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                {isoDate(new Date(data.from))} → {isoDate(new Date(data.to))} · {data.basis} basis
              </div>
              {sectionHead('Revenue')}
              {(data.revenueByCategory || []).map(r => line(r.category, r.amount, { indent: true }))}
              {line('Total revenue', data.revenue, { strong: true, color: GREEN })}
              {sectionHead('Expenses')}
              {(data.expenseByCategory || []).map(r => line(r.category, r.amount, { indent: true, color: RED }))}
              {line('Total expenses', data.expenses, { strong: true, color: RED })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Net income</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: data.netIncome >= 0 ? GREEN : RED }}>{fmt(data.netIncome)}</span>
              </div>
            </>
          )}

          {tab === 'Balance Sheet' && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Balance Sheet</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>As of {isoDate(new Date(data.asOf))}</div>
              {sectionHead('Assets')}
              {line('Cash (bank accounts)', data.assets.cash, { indent: true })}
              {line('Accounts receivable', data.assets.accountsReceivable, { indent: true })}
              {line('Total assets', data.assets.total, { strong: true, color: GREEN })}
              {sectionHead('Liabilities')}
              {line('Accounts payable', data.liabilities.accountsPayable, { indent: true, color: RED })}
              {line('Total liabilities', data.liabilities.total, { strong: true, color: RED })}
              {sectionHead('Equity')}
              {line('Retained earnings', data.equity.retainedEarnings, { indent: true })}
              {line('Total equity', data.equity.total, { strong: true })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Liabilities + Equity</span>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{fmt(data.liabilities.total + data.equity.total)}</span>
              </div>
            </>
          )}

          {tab === 'Cash Flow' && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: GREEN }}>Cash Flow</h2>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
                {isoDate(new Date(data.from))} → {isoDate(new Date(data.to))}
              </div>
              {sectionHead('Cash in')}
              {line('Collected from invoices', data.detail.collectedFromInvoices, { indent: true, color: GREEN })}
              {line('Total cash in', data.cashIn, { strong: true, color: GREEN })}
              {sectionHead('Cash out')}
              {line('Expenses paid', data.detail.expensesPaid, { indent: true, color: RED })}
              {line('Bills paid', data.detail.billsPaid, { indent: true, color: RED })}
              {line('Total cash out', data.cashOut, { strong: true, color: RED })}
              <div style={{ borderTop: '2px solid ' + GREEN, marginTop: 10, paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 700 }}>Net cash flow</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: data.netCashFlow >= 0 ? GREEN : RED }}>{fmt(data.netCashFlow)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>
        Reports are derived from your invoices, expenses, bills, and bank balances. Balance Sheet and Cash Flow are
        practical estimates for a small business, not full double-entry statements. Cash-basis figures approximate
        payment timing until per-payment dates are tracked.
      </div>
    </div>
  );
}
