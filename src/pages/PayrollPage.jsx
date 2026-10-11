import { useState, useEffect, useMemo, Fragment } from 'react';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../lib/ToastContext';

const GREEN = '#2D4A35', SAGE = '#7A9A7A', INK = '#1F2A24', INK2 = '#5E6B62', LINE = '#E2E8E0';

const fmt = n => '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round2 = n => Math.round(n * 100) / 100;
const todayISO = () => { try { return new Date().toISOString().slice(0, 10); } catch { return ''; } };
const dISO = v => { const d = new Date(v); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); };

const BLANK = { payDate: todayISO(), employerTaxes: '', grossWages: '', netPay: '', withholdings: '', employeeCount: '', provider: 'Gusto', memo: '' };
const BLANK_EMP = { name: '', email: '', payType: '', payRate: '' };

export default function PayrollPage() {
  const { org } = useAuth();
  const toast = useToast();
  const [runs, setRuns]           = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ytd, setYtd]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [expanded, setExpanded]   = useState(null);

  const [mode, setMode]       = useState('totals');     // 'byEmployee' | 'totals'
  const [autoPicked, setAutoPicked] = useState(false);  // default the entry mode just once
  const [form, setForm]       = useState(BLANK);
  const [showTakeHome, setShowTakeHome] = useState(false);
  const [lineAmts, setLineAmts] = useState({});         // { [empId]: { gross, wh, net } }

  const [showEmp, setShowEmp] = useState(false);
  const [newEmp, setNewEmp]   = useState(BLANK_EMP);
  const [addingEmp, setAddingEmp] = useState(false);

  async function load() {
    if (!org?.id) return;
    setLoading(true);
    try {
      const [r, e, y] = await Promise.all([
        api.get(`/orgs/${org.id}/payroll/pay-runs`).catch(() => ({ data: [] })),
        api.get(`/orgs/${org.id}/payroll/employees`).catch(() => ({ data: [] })),
        api.get(`/orgs/${org.id}/payroll/employees/ytd`).catch(() => ({ data: [] })),
      ]);
      const emps = e?.data || [];
      setRuns(r?.data || []);
      setEmployees(emps);
      setYtd(y?.data || []);
      // On first load, default to by-employee entry if the client has employees
      // on file. After that, respect whatever tab the user is on.
      if (!autoPicked) {
        if (emps.some(x => x.active)) setMode('byEmployee');
        setAutoPicked(true);
      }
    } catch { setRuns([]); setEmployees([]); setYtd([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [org?.id]);

  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLn = (id, k, v) => setLineAmts(m => ({ ...m, [id]: { ...(m[id] || {}), [k]: v } }));

  const activeEmps = useMemo(() => employees.filter(e => e.active), [employees]);

  // Totals, derived from either the per-employee lines or the typed total.
  const lineGrossSum = useMemo(
    () => round2(activeEmps.reduce((s, e) => s + num(lineAmts[e.id]?.gross), 0)),
    [activeEmps, lineAmts]
  );
  const gross  = mode === 'byEmployee' ? lineGrossSum : round2(num(form.grossWages));
  const empTax = round2(num(form.employerTaxes));
  const toBank = round2(gross + empTax);

  // Totals-only sanity check: net + withholdings should equal gross.
  const net = num(form.netPay), wh = num(form.withholdings);
  const checkMismatch = mode === 'totals' && form.netPay !== '' && form.withholdings !== ''
    ? Math.abs(round2(net + wh) - gross) > 0.01 : false;

  async function addEmployee(e) {
    e.preventDefault();
    const name = newEmp.name.trim();
    if (!name) { toast.error('Enter the employee’s name.'); return; }
    setAddingEmp(true);
    try {
      const r = await api.post(`/orgs/${org.id}/payroll/employees`, {
        name, email: newEmp.email, payType: newEmp.payType, payRate: newEmp.payRate,
      });
      if (r?.success) { toast.success(`${name} added.`); setNewEmp(BLANK_EMP); load(); }
      else toast.error(r?.message || 'Could not add employee.');
    } catch (err) { toast.error(err?.message || 'Could not add employee.'); }
    finally { setAddingEmp(false); }
  }

  async function removeEmployee(emp) {
    if (!window.confirm(`Remove ${emp.name}? Past pay runs keep their record.`)) return;
    try {
      const r = await api.delete(`/orgs/${org.id}/payroll/employees/${emp.id}`);
      if (r?.success) { toast.success('Employee removed.'); load(); }
      else toast.error(r?.message || 'Could not remove employee.');
    } catch (err) { toast.error(err?.message || 'Could not remove employee.'); }
  }

  async function submit(e) {
    e.preventDefault();
    let body;
    if (mode === 'byEmployee') {
      const lines = activeEmps
        .filter(emp => num(lineAmts[emp.id]?.gross) > 0)
        .map(emp => {
          const a = lineAmts[emp.id] || {};
          return {
            employeeId: emp.id, employeeName: emp.name,
            grossWages: a.gross,
            withholdings: showTakeHome && a.wh !== '' && a.wh != null ? a.wh : undefined,
            netPay:       showTakeHome && a.net !== '' && a.net != null ? a.net : undefined,
          };
        });
      if (!lines.length) { toast.error('Enter gross pay for at least one employee.'); return; }
      body = { payDate: form.payDate, employerTaxes: form.employerTaxes, provider: form.provider, memo: form.memo, lines };
    } else {
      if (gross <= 0) { toast.error('Enter the gross wages for this pay run.'); return; }
      body = {
        payDate: form.payDate, grossWages: form.grossWages, employerTaxes: form.employerTaxes,
        netPay: form.netPay, withholdings: form.withholdings, employeeCount: form.employeeCount,
        provider: form.provider, memo: form.memo,
      };
    }
    setSaving(true);
    try {
      const r = await api.post(`/orgs/${org.id}/payroll/pay-runs`, body);
      if (r?.success) {
        toast.success('Pay run recorded and posted to the books.');
        setForm({ ...BLANK, provider: form.provider });
        setLineAmts({});
        load();
      } else toast.error(r?.message || 'Could not save the pay run.');
    } catch (err) { toast.error(err?.message || 'Could not save the pay run.'); }
    finally { setSaving(false); }
  }

  async function removeRun(run) {
    if (!window.confirm(`Delete the ${dISO(run.payDate)} pay run? This also removes its journal entry.`)) return;
    try {
      const r = await api.delete(`/orgs/${org.id}/payroll/pay-runs/${run.id}`);
      if (r?.success) { toast.success('Pay run deleted.'); load(); }
      else toast.error(r?.message || 'Could not delete.');
    } catch (err) { toast.error(err?.message || 'Could not delete.'); }
  }

  // Year-to-date run totals.
  const yr = new Date().getFullYear();
  const ytdTotals = runs.filter(r => new Date(r.payDate).getFullYear() === yr)
    .reduce((a, r) => ({ gross: a.gross + num(r.grossWages), tax: a.tax + num(r.employerTaxes), cash: a.cash + num(r.grossWages) + num(r.employerTaxes) }), { gross: 0, tax: 0, cash: 0 });

  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${LINE}`, fontSize: 14, color: INK, background: '#fff', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: INK2, marginBottom: 4, display: 'block' };
  const field = (label, k, opts = {}) => (
    <div style={{ flex: opts.flex || '1 1 150px', minWidth: 120 }}>
      <label style={labelStyle}>{label}{opts.hint && <span style={{ color: SAGE, fontWeight: 400 }}> {opts.hint}</span>}</label>
      <input type={opts.type || 'text'} inputMode={opts.money ? 'decimal' : undefined} value={form[k]}
        onChange={e => set(k, e.target.value)} placeholder={opts.ph || ''} style={inputStyle} />
    </div>
  );
  const tabBtn = (val, label) => (
    <button type="button" onClick={() => setMode(val)}
      style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${mode === val ? GREEN : LINE}`,
        background: mode === val ? GREEN : '#fff', color: mode === val ? '#fff' : INK2,
        fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <div className="page">
      <div className="page-header"><h1 className="page-title">Payroll</h1></div>

      <div className="card" style={{ padding: 16, marginBottom: 16, background: '#F6F9F4', border: '1px solid #E6EFE8' }}>
        <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.55 }}>
          MountainTop Ledger doesn't run payroll — your provider (<strong>Gusto</strong> or QuickBooks Payroll) pays the team and files the taxes.
          Here you <strong>record each pay run</strong> — by employee or as totals — and MTL posts the journal entry to your books:
          {' '}<strong>Payroll &amp; Wages</strong> and <strong>Payroll Taxes</strong> offset to a <strong>Payroll Clearing</strong> account.
          Then in Banking, <strong>categorize the payroll bank withdrawal to “Payroll Clearing”</strong> — the two cancel out, so the cost hits your books exactly once and reconciles.
        </div>
      </div>

      {/* Employees */}
      <div className="card" style={{ padding: 20, marginBottom: 18, maxWidth: 820 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => setShowEmp(s => !s)}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: GREEN, margin: 0 }}>
            Employees {employees.length > 0 && <span style={{ color: SAGE, fontWeight: 500 }}>· {activeEmps.length} active</span>}
          </h2>
          <span style={{ color: SAGE, fontSize: 13 }}>{showEmp ? 'Hide ▲' : 'Manage ▼'}</span>
        </div>

        {showEmp && (
          <div style={{ marginTop: 14 }}>
            <form onSubmit={addEmployee} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', marginBottom: employees.length ? 16 : 0 }}>
              <div style={{ flex: '2 1 180px', minWidth: 140 }}>
                <label style={labelStyle}>Name</label>
                <input value={newEmp.name} onChange={e => setNewEmp(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Maria Lopez" style={inputStyle} />
              </div>
              <div style={{ flex: '2 1 180px', minWidth: 140 }}>
                <label style={labelStyle}>Email <span style={{ color: SAGE, fontWeight: 400 }}>(optional)</span></label>
                <input value={newEmp.email} onChange={e => setNewEmp(v => ({ ...v, email: e.target.value }))} placeholder="name@email.com" style={inputStyle} />
              </div>
              <div style={{ flex: '1 1 110px', minWidth: 100 }}>
                <label style={labelStyle}>Pay type</label>
                <select value={newEmp.payType} onChange={e => setNewEmp(v => ({ ...v, payType: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  <option value="hourly">Hourly</option>
                  <option value="salary">Salary</option>
                </select>
              </div>
              <div style={{ flex: '1 1 110px', minWidth: 100 }}>
                <label style={labelStyle}>Rate <span style={{ color: SAGE, fontWeight: 400 }}>(opt.)</span></label>
                <input value={newEmp.payRate} inputMode="decimal" onChange={e => setNewEmp(v => ({ ...v, payRate: e.target.value }))} placeholder="0.00" style={inputStyle} />
              </div>
              <button type="submit" disabled={addingEmp}
                style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: GREEN, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: addingEmp ? 'not-allowed' : 'pointer', opacity: addingEmp ? 0.6 : 1 }}>
                {addingEmp ? 'Adding…' : 'Add'}
              </button>
            </form>

            {employees.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id} style={{ borderBottom: '0.5px solid #EBF2E8', opacity: emp.active ? 1 : 0.55 }}>
                        <td style={{ padding: '8px 6px', fontWeight: 500 }}>{emp.name}{!emp.active && <span style={{ color: SAGE, fontSize: 11.5 }}> (inactive)</span>}</td>
                        <td style={{ padding: '8px 6px', color: INK2 }}>{emp.email || ''}</td>
                        <td style={{ padding: '8px 6px', color: INK2, textTransform: 'capitalize' }}>{emp.payType || ''}{emp.payType && emp.payRate ? ` · ${fmt(emp.payRate)}` : ''}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', width: 36 }}>
                          <button onClick={() => removeEmployee(emp)} title="Remove employee"
                            style={{ border: 'none', background: 'none', color: '#B9C4B2', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record a pay run */}
      <div className="card" style={{ padding: 20, marginBottom: 18, maxWidth: 820 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: GREEN, margin: 0 }}>Record a pay run</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {tabBtn('byEmployee', 'By employee')}
            {tabBtn('totals', 'Totals only')}
          </div>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {field('Pay date', 'payDate', { type: 'date', flex: '1 1 150px' })}
            {field('Employer payroll taxes', 'employerTaxes', { money: true, ph: '0.00', hint: '(whole run)' })}
            {field('Provider', 'provider', { flex: '1 1 140px' })}
          </div>

          {mode === 'byEmployee' ? (
            activeEmps.length === 0 ? (
              <div style={{ marginTop: 14, fontSize: 13, color: INK2, background: '#F6F9F4', border: '1px solid #E6EFE8', borderRadius: 8, padding: '12px 14px' }}>
                No employees yet. Open <strong>Employees</strong> above and add your team, then enter each person’s pay here — or switch to <strong>Totals only</strong>.
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Gross pay per employee</label>
                  <label style={{ fontSize: 12, color: INK2, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showTakeHome} onChange={e => setShowTakeHome(e.target.checked)} />
                    Include take-home (net / withholdings)
                  </label>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: showTakeHome ? 520 : 320 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                        <th style={{ textAlign: 'left',  padding: '6px', color: SAGE, fontWeight: 600 }}>Employee</th>
                        <th style={{ textAlign: 'right', padding: '6px', color: SAGE, fontWeight: 600, width: 120 }}>Gross</th>
                        {showTakeHome && <th style={{ textAlign: 'right', padding: '6px', color: SAGE, fontWeight: 600, width: 120 }}>Withholdings</th>}
                        {showTakeHome && <th style={{ textAlign: 'right', padding: '6px', color: SAGE, fontWeight: 600, width: 120 }}>Net pay</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeEmps.map(emp => (
                        <tr key={emp.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                          <td style={{ padding: '6px', fontWeight: 500 }}>{emp.name}</td>
                          <td style={{ padding: '6px' }}>
                            <input value={lineAmts[emp.id]?.gross ?? ''} inputMode="decimal" placeholder="0.00"
                              onChange={e => setLn(emp.id, 'gross', e.target.value)}
                              style={{ ...inputStyle, textAlign: 'right', padding: '6px 8px' }} />
                          </td>
                          {showTakeHome && (
                            <td style={{ padding: '6px' }}>
                              <input value={lineAmts[emp.id]?.wh ?? ''} inputMode="decimal" placeholder="0.00"
                                onChange={e => setLn(emp.id, 'wh', e.target.value)}
                                style={{ ...inputStyle, textAlign: 'right', padding: '6px 8px' }} />
                            </td>
                          )}
                          {showTakeHome && (
                            <td style={{ padding: '6px' }}>
                              <input value={lineAmts[emp.id]?.net ?? ''} inputMode="decimal" placeholder="0.00"
                                onChange={e => setLn(emp.id, 'net', e.target.value)}
                                style={{ ...inputStyle, textAlign: 'right', padding: '6px 8px' }} />
                            </td>
                          )}
                        </tr>
                      ))}
                      <tr>
                        <td style={{ padding: '8px 6px', fontWeight: 700, color: GREEN }}>Total</td>
                        <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>{fmt(lineGrossSum)}</td>
                        {showTakeHome && <td></td>}
                        {showTakeHome && <td></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {field('Gross wages', 'grossWages', { money: true, ph: '0.00' })}
                {field('Net pay', 'netPay', { money: true, ph: '0.00', hint: '(optional)' })}
                {field('Employee withholdings', 'withholdings', { money: true, ph: '0.00', hint: '(optional)' })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {field('# Employees', 'employeeCount', { ph: 'e.g. 4', hint: '(optional)', flex: '1 1 140px' })}
                {field('Memo', 'memo', { flex: '2 1 320px', ph: 'e.g. Oct 1–15 pay period' })}
              </div>
              {checkMismatch && (
                <div style={{ marginTop: 12, fontSize: 12.5, color: '#9A7B2A', background: '#FBF5E3', border: '1px solid #EADFBF', borderRadius: 8, padding: '8px 12px' }}>
                  Heads up: net pay + withholdings ({fmt(round2(net + wh))}) doesn't equal gross wages ({fmt(gross)}). Double-check the numbers — it won't block saving.
                </div>
              )}
            </>
          )}

          {mode === 'byEmployee' && (
            <div style={{ marginTop: 12 }}>
              {field('Memo', 'memo', { flex: '1 1 100%', ph: 'e.g. Oct 1–15 pay period' })}
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

      {/* YTD run summary */}
      {runs.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {[['Gross wages YTD', ytdTotals.gross], ['Employer taxes YTD', ytdTotals.tax], ['Total to bank YTD', ytdTotals.cash]].map(([lab, v]) => (
            <div key={lab} style={{ flex: '1 1 160px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 11.5, color: SAGE, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{lab}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per-employee YTD */}
      {ytd.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: GREEN, margin: '0 0 12px' }}>Paid by employee · {yr}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 420 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                  <th style={{ textAlign: 'left',  padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Employee</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Gross YTD</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Withholdings</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Net YTD</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', color: SAGE, fontWeight: 600 }}>Runs</th>
                </tr>
              </thead>
              <tbody>
                {ytd.map((r, i) => (
                  <tr key={r.employeeId || `n${i}`} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                    <td style={{ padding: '9px 6px', fontWeight: 500 }}>{r.name}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.gross)}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', color: INK2, fontVariantNumeric: 'tabular-nums' }}>{r.withholdings ? fmt(r.withholdings) : '—'}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', color: INK2, fontVariantNumeric: 'tabular-nums' }}>{r.net ? fmt(r.net) : '—'}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'center', color: INK2 }}>{r.runs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {runs.map(r => {
                  const hasLines = r.lines && r.lines.length > 0;
                  const open = expanded === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr style={{ borderBottom: open ? 'none' : '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '9px 6px', fontWeight: 500 }}>
                          {hasLines ? (
                            <button onClick={() => setExpanded(open ? null : r.id)}
                              style={{ border: 'none', background: 'none', color: GREEN, cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, marginRight: 6 }}>
                              {open ? '▾' : '▸'}
                            </button>
                          ) : null}
                          {dISO(r.payDate)}{r.memo ? <span style={{ display: 'block', color: SAGE, fontSize: 12, marginLeft: hasLines ? 18 : 0 }}>{r.memo}</span> : null}
                        </td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.grossWages)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.employerTaxes)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.totalCash)}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'center', color: INK2 }}>{hasLines ? r.lines.length : (r.employeeCount ?? '—')}</td>
                        <td style={{ padding: '9px 6px', color: INK2 }}>{r.provider || '—'}</td>
                        <td style={{ padding: '9px 6px', textAlign: 'center' }}>
                          <button onClick={() => removeRun(r)} title="Delete this pay run"
                            style={{ border: 'none', background: 'none', color: '#B9C4B2', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>✕</button>
                        </td>
                      </tr>
                      {open && hasLines && (
                        <tr style={{ borderBottom: '0.5px solid #EBF2E8', background: '#FAFCF9' }}>
                          <td colSpan={7} style={{ padding: '4px 6px 12px 24px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                              <thead>
                                <tr style={{ color: SAGE }}>
                                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600 }}>Employee</th>
                                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Gross</th>
                                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Withholdings</th>
                                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600 }}>Net</th>
                                </tr>
                              </thead>
                              <tbody>
                                {r.lines.map(l => (
                                  <tr key={l.id}>
                                    <td style={{ padding: '3px 6px', color: INK }}>{l.employeeName}</td>
                                    <td style={{ padding: '3px 6px', textAlign: 'right', color: INK, fontVariantNumeric: 'tabular-nums' }}>{fmt(l.grossWages)}</td>
                                    <td style={{ padding: '3px 6px', textAlign: 'right', color: INK2, fontVariantNumeric: 'tabular-nums' }}>{l.withholdings != null ? fmt(l.withholdings) : '—'}</td>
                                    <td style={{ padding: '3px 6px', textAlign: 'right', color: INK2, fontVariantNumeric: 'tabular-nums' }}>{l.netPay != null ? fmt(l.netPay) : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: '#aaa', marginTop: 16, maxWidth: 820, lineHeight: 1.6 }}>
        Enter each run from your provider's payroll report — by employee or as totals. Every run is posted via a <strong>Payroll Clearing</strong> account — standard bookkeeping practice — so it reconciles against the single payroll bank withdrawal and the cost hits your books exactly once. Per-employee amounts are tracked for your records (year-to-date pay, W-2 prep); the journal entry always posts from the run totals. It's a bookkeeping entry, not a tax filing — your provider still files and remits.
      </div>
    </div>
  );
}
