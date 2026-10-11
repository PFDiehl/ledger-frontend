import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const GREEN = '#2D4A35', SAGE = '#7A9A7A', INK = '#1F2A24', INK2 = '#5E6B62', LINE = '#E2E8E0', RED = '#c0392b';

const fmt = n => '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = n => Math.round(n * 100) / 100;
const todayISO = () => { try { return new Date().toISOString().slice(0, 10); } catch { return ''; } };
const dISO = v => { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); };

const BLANK = { payDate: todayISO(), grossWages: '', employerTaxes: '', netPay: '', withholdings: '', providerFee: '', employeeCount: '', provider: 'Gusto', memo: '' };

export default function PayrollPage() {
  const { org } = useAuth();
  const toast = useToast();
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(BLANK);
  const [saving, setSaving]   = useState(false);

  async function load() {
    if (!org?.id) return;
    setLoading(true);
    try {
      const r = await api.get(`/orgs/${org.id}/payroll/pay-runs`);
      setRuns(r?.data || []);
    } catch { setRuns([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const gross    = round2(num(form.grossWages));
  const empTax   = round2(num(form.employerTaxes));
  const toBank   = round2(gross + empTax);
  const net      = num(form.netPay), wh = num(form.withholdings);
  // Sanity: net pay + employee withholdings should equal gross wages.
  const checkMismatch = (form.netPay !== '' && form.withholdings !== '') ? Math.abs(round2(net + wh) - gross) > 0.01 : false;

  async function submit(e) {
    e.preventDefault();
    if (gross <= 0) { toast.error('Enter the gross wages for this pay run.'); return; }
    setSaving(true);
    try {
      const r = await api.post(`/orgs/${org.id}/payroll/pay-runs`, {
        payDate: form.payDate, grossWages: form.grossWages, employerTaxes: form.employerTaxes,
        netPay: form.netPay, withholdings: form.withholdings, providerFee: form.providerFee,
        employeeCount: form.employeeCount, provider: form.provider, memo: form.memo,
      });
      if (r?.success) {
        toast.success('Pay run recorded and posted to the books.');
        setForm({ ...BLANK, provider: form.provider });
        load();
      } else { toast.error(r?.message || 'Could not save the pay run.'); }
    } catch (err) { toast.error(err?.message || 'Could not save the pay run.'); }
    finally { setSaving(false); }
  }

  async function remove(run) {
    if (!window.confirm(`Delete the ${dISO(run.payDate)} pay run? This also removes its journal entry.`)) return;
    try {
      const r = await api.delete(`/orgs/${org.id}/payroll/pay-runs/${run.id}`);
      if (r?.success) { toast.success('Pay run deleted.'); load(); }
      else toast.error(r?.message || 'Could not delete.');
    } catch (err) { toast.error(err?.message || 'Could not delete.'); }
  }

  // Year-to-date totals across the recorded runs (by pay date).
  const yr = new Date().getFullYear();
  const ytd = runs.filter(r => new Date(r.payDate).getFullYear() === yr)
    .reduce((a, r) => ({ gross: a.gross + num(r.grossWages), tax: a.tax + num(r.employerTaxes), cash: a.cash + num(r.grossWages) + num(r.employerTaxes) }), { gross: 0, tax: 0, cash: 0 });

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 14, color: INK, background: '#fff' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: INK2, marginBottom: 4, display: 'block' };
  const field = (label, k, opts = {}) => (
    <div style={{ flex: opts.flex || '1 1 150px', minWidth: 120 }}>
      <label style={labelStyle}>{label}{opts.hint && <span style={{ color: SAGE, fontWeight: 400 }}> {opts.hint}</span>}</label>
      <input type={opts.type || 'text'} inputMode={opts.money ? 'decimal' : undefined} value={form[k]}
        onChange={e => set(k, e.target.value)} placeholder={opts.ph || ''} style={inputStyle} />
    </div>
  );

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Payroll</h1></div>

      <div className="card" style={{ padding: 16, marginBottom: 16, background: '#F6F9F4', border: '1px solid #E6EFE8' }}>
        <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.55 }}>
          MountainTop Ledger doesn't run payroll — your provider (<strong>Gusto</strong> or QuickBooks Payroll) pays the team and files the taxes.
          Here you <strong>record each pay run's totals</strong> and MTL posts the correct journal entry to your books:
          {' '}<strong>Payroll &amp; Wages</strong> and <strong>Payroll Taxes</strong> (expenses) offset to a <strong>Payroll Clearing</strong> account.
          Then, in Banking, <strong>categorize the payroll withdrawal from your bank to “Payroll Clearing”</strong> — the two cancel out, so the cost hits your books exactly once and reconciles.
        </div>
      </div>

      {/* Record a pay run */}
      <div className="card" style={{ padding: 20, marginBottom: 18, maxWidth: 760 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: GREEN, margin: '0 0 14px' }}>Record a pay run</h2>
        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {field('Pay date', 'payDate', { type: 'date', flex: '1 1 150px' })}
            {field('Gross wages', 'grossWages', { money: true, ph: '0.00' })}
            {field('Employer payroll taxes', 'employerTaxes', { money: true, ph: '0.00' })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {field('Net pay', 'netPay', { money: true, ph: '0.00', hint: '(optional)' })}
            {field('Employee withholdings', 'withholdings', { money: true, ph: '0.00', hint: '(optional)' })}
            {field('# Employees', 'employeeCount', { ph: 'e.g. 4', hint: '(optional)' })}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {field('Provider', 'provider', { flex: '1 1 150px' })}
            {field('Memo', 'memo', { flex: '2 1 320px', ph: 'e.g. Oct 1–15 pay period' })}
          </div>

          {checkMismatch && (
            <div style={{ marginTop: 12, fontSize: 12.5, color: '#9A7B2A', background: '#FBF5E3', border: '1px solid #EADFBF', borderRadius: 8, padding: '8px 12px' }}>
              Heads up: net pay + withholdings ({fmt(round2(net + wh))}) doesn't equal gross wages ({fmt(gross)}). Double-check the numbers — it won't block saving.
            </div>
          )}

          {/* Live posting preview */}
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: '#fff', border: `1px dashed ${LINE}`, fontSize: 13 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>This will post</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: INK2, padding: '2px 0' }}><span>Dr&nbsp; Payroll &amp; Wages</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(gross)}</span></div>
            {empTax > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: INK2, padding: '2px 0' }}><span>Dr&nbsp; Payroll Taxes</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(empTax)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: INK2, padding: '2px 0', borderTop: `1px solid ${LINE}`, marginTop: 4, paddingTop: 6 }}><span>Cr&nbsp; Payroll Clearing</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(toBank)}</span></div>
            <div style={{ fontSize: 12, color: SAGE, marginTop: 6 }}>Your bank will show one payroll withdrawal of about <strong style={{ color: GREEN }}>{fmt(toBank)}</strong> — categorize it to Payroll Clearing.</div>
          </div>

          <button type="submit" disabled={saving || gross <= 0}
            style={{ marginTop: 16, padding: '11px 20px', borderRadius: 10, border: 'none', background: GREEN, color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: saving || gross <= 0 ? 'not-allowed' : 'pointer', opacity: saving || gross <= 0 ? 0.6 : 1 }}>
            {saving ? 'Posting…' : 'Record & post pay run'}
          </button>
        </form>
      </div>

      {/* YTD summary */}
      {runs.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {[['Gross wages YTD', ytd.gross], ['Employer taxes YTD', ytd.tax], ['Total to bank YTD', ytd.cash]].map(([lab, v]) => (
            <div key={lab} style={{ flex: '1 1 160px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 11.5, color: SAGE, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{lab}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recorded pay runs */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: GREEN, margin: '0 0 12px' }}>Recorded pay runs</h2>
        {loading ? (
          <div style={{ color: SAGE, fontSize: 14, padding: '12px 0' }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: SAGE, fontSize: 14, padding: '12px 0' }}>No pay runs recorded yet. Enter your first one above and it'll post to the books.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                  <th style={{ textAlign: 'left',  padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Pay date</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Gross wages</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Employer taxes</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>To bank</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Emp.</th>
                  <th style={{ textAlign: 'left',  padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Provider</th>
                  <th style={{ padding: '8px 6px', width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                    <td style={{ padding: '9px 6px', fontWeight: 500 }}>{dISO(r.payDate)}{r.memo ? <span style={{ display: 'block', color: SAGE, fontSize: 12 }}>{r.memo}</span> : null}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.grossWages)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.employerTaxes)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.totalCash)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'center', color: INK2 }}>{r.employeeCount ?? '—'}</td>
                    <td style={{ padding: '9px 6px', color: INK2 }}>{r.provider || '—'}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'center' }}>
                      <button onClick={() => remove(r)} title="Delete this pay run"
                        style={{ border: 'none', background: 'none', color: '#B9C4B2', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 16, maxWidth: 760, lineHeight: 1.6 }}>
        Enter the totals from your provider's payroll report for each run. Each run is posted via a <strong>Payroll Clearing</strong> account — standard bookkeeping practice — so it reconciles against the single payroll bank withdrawal and the cost hits your books exactly once. It's a bookkeeping entry, not a tax filing — your provider still files and remits.
      </div>
    </div>
  );
}
