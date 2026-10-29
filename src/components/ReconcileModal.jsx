import { useState, useEffect, useMemo } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const today = new Date().toISOString().slice(0, 10);

const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const toNum = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

// Classic statement reconciliation: enter the statement date + ending balance,
// check off the transactions that appear on the statement, and finish when the
// difference hits $0.00.
export default function ReconcileModal({ account, orgId, token, onClose, onDone }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState([]);
  const [checked, setChecked] = useState(() => new Set());
  const [beginning, setBeginning] = useState('0');
  const [ending, setEnding] = useState('');
  const [stmtDate, setStmtDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${account.id}/reconcile/data`, { headers }).then(x => x.json());
        if (cancel) return;
        if (r.success) {
          setTxns(r.data.transactions || []);
          setBeginning(String(r.data.beginningBalance ?? 0));
        } else setErr(r.message || 'Could not load reconciliation data.');
      } catch { if (!cancel) setErr('Could not load reconciliation data.'); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [account.id]);

  function toggle(id) {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setErr('');
  }

  const calc = useMemo(() => {
    let dep = 0, pay = 0;
    for (const t of txns) {
      if (!checked.has(t.id)) continue;
      const a = Number(t.amount);
      if (a >= 0) dep += a; else pay += -a;
    }
    const begin = toNum(beginning);
    const clearedBalance = r2(begin + dep - pay);
    const end = ending === '' ? null : toNum(ending);
    const difference = end == null ? null : r2(end - clearedBalance);
    return { dep: r2(dep), pay: r2(pay), clearedBalance, difference, begin: r2(begin), end };
  }, [txns, checked, beginning, ending]);

  const balanced = calc.difference != null && Math.abs(calc.difference) < 0.005;
  const canFinish = balanced && !!stmtDate && ending !== '' && !saving;

  async function finish() {
    if (!canFinish) return;
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${account.id}/reconcile`, {
        method: 'POST', headers,
        body: JSON.stringify({
          statementDate: stmtDate,
          beginningBalance: toNum(beginning),
          endingBalance: toNum(ending),
          clearedTxnIds: [...checked],
        }),
      }).then(x => x.json());
      if (r.success) { setDone({ count: checked.size, ending: toNum(ending), date: stmtDate }); onDone?.(); }
      else setErr(r.message || 'Could not complete the reconciliation.');
    } catch { setErr('Could not complete the reconciliation.'); }
    finally { setSaving(false); }
  }

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={overlay}>
      <div style={{ background: '#fff', borderRadius: 14, width: 760, maxWidth: '96vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #EBF2E8' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Reconcile — {account.name}</h2>
            <div style={{ fontSize: 12.5, color: '#7A9A7A', marginTop: 2 }}>Match MTL to your bank statement, then finish at a $0.00 difference.</div>
          </div>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>

        {done ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 18, margin: '0 0 8px' }}>Reconciled!</h3>
            <p style={{ fontSize: 14, color: '#5A6B5A', maxWidth: 420, margin: '0 auto 20px' }}>
              {account.name} is reconciled through <b>{fmtDate(done.date)}</b> at an ending balance of <b>{money(done.ending)}</b> — {done.count} transaction{done.count === 1 ? '' : 's'} cleared.
            </p>
            <button onClick={onClose} style={{ ...primaryBtn, padding: '10px 22px' }}>Done</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#7A9A7A' }}>Loading transactions…</div>
        ) : (
          <>
            {/* statement inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, padding: '16px 24px', borderBottom: '1px solid #EBF2E8' }}>
              {field('Statement ending date', <input type="date" value={stmtDate} onChange={e => setStmtDate(e.target.value)} style={inStyle} />)}
              {field('Beginning balance', <input type="number" step="0.01" value={beginning} onChange={e => setBeginning(e.target.value)} style={inStyle} />, 'Last reconciled balance (pre-filled).')}
              {field('Statement ending balance', <input type="number" step="0.01" value={ending} onChange={e => setEnding(e.target.value)} placeholder="From your statement" style={inStyle} />)}
            </div>

            {/* transactions */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 24px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 4px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2D4A35' }}>Check off what's on your statement <span style={{ color: '#9DB39D', fontWeight: 400 }}>({checked.size} of {txns.length} selected)</span></div>
                {txns.length > 0 && (
                  <button onClick={() => setChecked(checked.size === txns.length ? new Set() : new Set(txns.map(t => t.id)))}
                    style={{ fontSize: 12, color: '#2D4A35', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    {checked.size === txns.length ? 'Clear all' : 'Select all'}
                  </button>
                )}
              </div>
              {txns.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#9DB39D', fontSize: 13 }}>No unreconciled transactions on this account.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {txns.map(t => {
                      const on = checked.has(t.id);
                      const inflow = Number(t.amount) >= 0;
                      return (
                        <tr key={t.id} onClick={() => toggle(t.id)}
                          style={{ borderBottom: '0.5px solid #EBF2E8', cursor: 'pointer', background: on ? '#F4F8F4' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', width: 30 }}><input type="checkbox" checked={on} readOnly style={{ width: 15, height: 15, accentColor: '#2D4A35', pointerEvents: 'none' }} /></td>
                          <td style={{ padding: '8px 10px', color: '#7A9A7A', whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</td>
                          <td style={{ padding: '8px 10px' }}>{t.description}{t.payee ? <span style={{ color: '#9DB39D' }}> · {t.payee}</span> : ''}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 500, color: inflow ? '#0F6E56' : '#A3302A', whiteSpace: 'nowrap' }}>
                            {inflow ? '+' : '−'}{money(Math.abs(Number(t.amount)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* summary + finish */}
            <div style={{ borderTop: '1px solid #EBF2E8', padding: '14px 24px 18px', background: '#FAFCF9', borderRadius: '0 0 14px 14px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 22px', fontSize: 13, color: '#5A6B5A', marginBottom: 10 }}>
                <span>Beginning: <b style={{ color: '#2D4A35' }}>{money(calc.begin)}</b></span>
                <span>+ Deposits cleared: <b style={{ color: '#0F6E56' }}>{money(calc.dep)}</b></span>
                <span>− Payments cleared: <b style={{ color: '#A3302A' }}>{money(calc.pay)}</b></span>
                <span>= Cleared balance: <b style={{ color: '#2D4A35' }}>{money(calc.clearedBalance)}</b></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2D4A35' }}>Difference</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: calc.difference == null ? '#9DB39D' : balanced ? '#0F6E56' : '#A3302A' }}>
                    {calc.difference == null ? '—' : money(calc.difference)}
                  </span>
                  {balanced && <span style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56', background: '#E1F5EE', padding: '3px 10px', borderRadius: 20 }}>✓ Balanced</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={onClose} style={cancelBtn}>Cancel</button>
                  <button onClick={finish} disabled={!canFinish} style={{ ...primaryBtn, opacity: canFinish ? 1 : 0.5, cursor: canFinish ? 'pointer' : 'default' }}>
                    {saving ? 'Finishing…' : 'Finish reconciliation'}
                  </button>
                </div>
              </div>
              {err && <div style={{ marginTop: 10, fontSize: 13, color: '#A3302A' }}>{err}</div>}
              {!balanced && ending !== '' && calc.difference != null && (
                <div style={{ marginTop: 8, fontSize: 12.5, color: '#7A4E0B' }}>Keep checking off (or unchecking) statement items until the difference is $0.00.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function field(label, control, hint) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#7A9A7A', display: 'block', marginBottom: 4 }}>{label}</label>
      {control}
      {hint && <div style={{ fontSize: 11, color: '#9DB39D', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const inStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' };
const xBtn = { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1, color: '#7A9A7A' };
const cancelBtn = { padding: '10px 16px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', fontSize: 13, cursor: 'pointer' };
const primaryBtn = { padding: '10px 18px', borderRadius: 8, border: 'none', background: '#2D4A35', color: '#fff', fontSize: 13, fontWeight: 600 };
