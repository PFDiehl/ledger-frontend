import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

const fmt  = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmt0 = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Self-contained inline SVG line chart of the projected weekly balance.
function ForecastChart({ startingCash, weeks }) {
  const W = 720, H = 240, padL = 56, padR = 16, padT = 16, padB = 28;
  const pts = [{ balance: startingCash, label: 'Now' }, ...weeks.map(w => ({ balance: w.balance, label: 'W' + w.week }))];
  const vals = pts.map(p => p.balance).concat([0]);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1 || 1; min -= pad; max += pad;
  const x = (i) => padL + (i / (pts.length - 1)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${y(min).toFixed(1)} L${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const zeroY = y(0);
  const showZero = 0 >= min && 0 <= max;
  const lowIdx = pts.reduce((lo, p, i) => (p.balance < pts[lo].balance ? i : lo), 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const v = min + t * (max - min);
        const yy = y(v);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="#EDF1EA" strokeWidth="1" />
            <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize="10" fill="#9AA">{fmt0(v)}</text>
          </g>
        );
      })}
      {showZero && <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#E05B52" strokeWidth="1.5" strokeDasharray="4 3" />}
      <path d={area} fill="#2D7A4A" opacity="0.10" />
      <path d={line} fill="none" stroke="#2D7A4A" strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.balance)} r={i === lowIdx ? 4.5 : 3} fill={p.balance < 0 ? '#E05B52' : (i === lowIdx ? '#9A6A15' : '#2D7A4A')} />
          <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="9.5" fill="#9AA">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '14px 18px', flex: '1 1 150px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, color: '#7A8A7A', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

export default function CashFlowForecastPage() {
  const { org } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    if (!org?.id) return;
    setLoading(true); setErr(null);
    try {
      const res = await api.get(`/orgs/${org.id}/ai/forecast`);
      setData(res.data);
    } catch (e) { setErr(e.message || 'Could not build the forecast.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [org?.id]);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">📈 Cash Flow Forecast</h1>
        <button className="btn-primary" onClick={load} disabled={loading}>{loading ? 'Building…' : 'Refresh'}</button>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, maxWidth: 720 }}>
        Projects your cash position 12 weeks out from real data: current cash, money due in from open invoices,
        money due out on open bills, plus your recent recurring run-rate.
      </p>

      {err && <div className="card" style={{ padding: 14, marginTop: 16, background: '#FDEDED', color: '#B4271F', fontSize: 13 }}>{err}</div>}
      {loading && <div style={{ padding: 40, color: 'var(--color-text-secondary)', fontSize: 14 }}>Building your forecast…</div>}

      {!loading && data && (
        <>
          {data.crunch && (
            <div className="card" style={{ padding: '14px 16px', margin: '16px 0', background: '#FDEDED', borderLeft: '4px solid #E05B52' }}>
              <b style={{ color: '#B4271F' }}>⚠️ Projected cash crunch</b>
              <div style={{ fontSize: 13, color: '#3A4A3A', marginTop: 3 }}>
                Cash is projected to dip to <b>{fmt(data.crunch.balance)}</b> the week of {fmtDate(data.crunch.weekStart)} (week {data.crunch.week}).
                Consider chasing open invoices or timing bills around it.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, margin: '16px 0', flexWrap: 'wrap' }}>
            <Stat label="Cash now" value={fmt0(data.startingCash)} />
            <Stat label="Run-rate / wk" value={fmt0(data.weeklyRunRate)} color={data.weeklyRunRate < 0 ? '#B4271F' : '#1E7A46'} />
            <Stat label="Due in (invoices)" value={fmt0(data.openInvoices)} color="#1E7A46" />
            <Stat label="Due out (bills)" value={fmt0(data.openBills)} color="#B4271F" />
            <Stat label="Low point" value={fmt0(data.lowest.balance)} color={data.lowest.balance < 0 ? '#B4271F' : undefined} />
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Projected balance — next 12 weeks</div>
            <ForecastChart startingCash={data.startingCash} weeks={data.weeks} />
          </div>

          <div className="card" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', background: '#F5F7F2', color: '#5A6B5A' }}>
                    <th style={th}>Week</th>
                    <th style={{ ...th, textAlign: 'right' }}>In</th>
                    <th style={{ ...th, textAlign: 'right' }}>Out</th>
                    <th style={{ ...th, textAlign: 'right' }}>Run-rate</th>
                    <th style={{ ...th, textAlign: 'right' }}>Net</th>
                    <th style={{ ...th, textAlign: 'right' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weeks.map(w => (
                    <tr key={w.week} style={{ borderTop: '1px solid #EDF1EA' }}>
                      <td style={td}>Wk {w.week} · {fmtDate(w.weekStart)}</td>
                      <td style={{ ...td, textAlign: 'right', color: w.inflow ? '#1E7A46' : '#B9C2B9' }}>{w.inflow ? fmt(w.inflow) : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', color: w.outflow ? '#B4271F' : '#B9C2B9' }}>{w.outflow ? fmt(w.outflow) : '—'}</td>
                      <td style={{ ...td, textAlign: 'right', color: '#7A8A7A' }}>{fmt(w.runRate)}</td>
                      <td style={{ ...td, textAlign: 'right', color: w.net < 0 ? '#B4271F' : '#1E7A46' }}>{fmt(w.net)}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: w.balance < 0 ? '#B4271F' : 'inherit' }}>{fmt(w.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.assumptions?.length > 0 && (
            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
              <div style={{ fontWeight: 700, marginBottom: 4, color: '#5A6B5A' }}>How this is calculated</div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
                {data.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
              <p style={{ marginTop: 8 }}>An estimate to plan around — not a guarantee. It sharpens as invoices, bills, and bank activity build up.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const th = { padding: '10px 12px', fontSize: 12, fontWeight: 700 };
const td = { padding: '8px 12px', fontVariantNumeric: 'tabular-nums' };
