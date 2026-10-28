import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const today = new Date().toISOString().slice(0, 10);

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

function fmt(n) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '-'; }

const STATUS_STYLE = {
  active:    { bg: '#EBF2E8', col: '#2D4A35', label: 'Active' },
  completed: { bg: '#E3EDFB', col: '#1B4B8A', label: 'Completed' },
  archived:  { bg: '#EEE', col: '#777', label: 'Archived' },
};

const emptyJob = () => ({ name: '', code: '', customer: '', status: 'active', estRevenue: '', estCost: '', startDate: '', endDate: '', notes: '' });

export default function JobsPage() {
  const { orgId, token } = getAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState({ type: 'list' });   // {type:'list'} | {type:'detail', id}
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyJob());
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  async function loadJobs() {
    if (!orgId || !token) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/orgs/${orgId}/projects/summary`, { headers: authHeaders });
      const j = await r.json();
      if (j.success) setJobs(j.data || []);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadJobs(); }, [orgId]);

  function openNew() { setForm(emptyJob()); setEditId(null); setShowForm(true); }
  function openEdit(job) {
    setForm({
      name: job.name || '', code: job.code || '', customer: job.customer || '',
      status: job.status || 'active',
      estRevenue: job.estRevenue != null ? String(job.estRevenue) : '',
      estCost: job.estCost != null ? String(job.estCost) : '',
      startDate: job.startDate ? job.startDate.slice(0, 10) : '',
      endDate: job.endDate ? job.endDate.slice(0, 10) : '',
      notes: job.notes || '',
    });
    setEditId(job.id);
    setShowForm(true);
  }

  async function saveJob() {
    if (!form.name.trim()) return alert('Please give the job a name.');
    setSaving(true);
    try {
      const url = editId ? `${API}/orgs/${orgId}/projects/${editId}` : `${API}/orgs/${orgId}/projects`;
      const r = await fetch(url, { method: editId ? 'PATCH' : 'POST', headers: authHeaders, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.success) { setShowForm(false); loadJobs(); }
      else alert(j.message || 'Could not save the job.');
    } catch { alert('Could not save the job.'); } finally { setSaving(false); }
  }

  async function deleteJob(id) {
    if (!window.confirm('Delete this job? The invoices, bills and expenses tagged to it are kept — they just lose the job tag.')) return;
    try {
      const r = await fetch(`${API}/orgs/${orgId}/projects/${id}`, { method: 'DELETE', headers: authHeaders });
      const j = await r.json();
      if (j.success) { setView({ type: 'list' }); loadJobs(); }
      else alert(j.message);
    } catch { alert('Could not delete the job.'); }
  }

  const JF = (label, field, props = {}) => (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#7A9A7A', display: 'block', marginBottom: 4 }}>{label}</label>
      {props.el === 'textarea'
        ? <textarea value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} rows={2} style={inStyle} {...props} />
        : props.el === 'select'
        ? <select value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inStyle}>{props.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        : <input value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} style={inStyle} {...props} />}
    </div>
  );

  if (view.type === 'detail') {
    return <JobDetail jobId={view.id} orgId={orgId} token={token}
      onBack={() => { setView({ type: 'list' }); loadJobs(); }}
      onEdit={openEdit} onDelete={deleteJob} />;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Jobs</h1>
          <p style={{ fontSize: 13, color: '#7A9A7A', marginTop: 2 }}>Track profit on each project or contract.</p>
        </div>
        <button className="btn-primary" onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span>+</span> New job</button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center', color: '#7A9A7A' }}>Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏗️</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No jobs yet</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>Create a job, then tag invoices, bills and expenses to it to see profit per job.</p>
          <button className="btn-primary" onClick={openNew}>Create your first job</button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 20, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ borderBottom: '1px solid #D4DDCC' }}>
              {['Job', 'Customer', 'Status', 'Revenue', 'Cost', 'Profit', 'Margin'].map((h, i) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: i >= 3 ? 'right' : 'left', fontWeight: 500, color: '#7A9A7A' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {jobs.map(j => {
                const st = STATUS_STYLE[j.status] || STATUS_STYLE.active;
                const profitCol = j.profit > 0 ? '#2D7A4A' : j.profit < 0 ? '#c0392b' : 'inherit';
                return (
                  <tr key={j.id} style={{ borderBottom: '0.5px solid #EBF2E8', cursor: 'pointer' }}
                    onClick={() => setView({ type: 'detail', id: j.id })}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fbf8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{j.name}{j.code ? <span style={{ color: '#9DB39D', fontWeight: 400 }}> · {j.code}</span> : ''}</td>
                    <td style={{ padding: '12px 16px', color: '#7A9A7A' }}>{j.customer || '-'}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.col }}>{st.label}</span></td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmt(j.income)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{fmt(j.cost)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: profitCol }}>{fmt(j.profit)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', color: '#7A9A7A' }}>{j.margin != null ? j.margin + '%' : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={overlay}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 520, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>{editId ? 'Edit job' : 'New job'}</h2>
              <button onClick={() => setShowForm(false)} style={xBtn}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {JF('JOB NAME', 'name', { placeholder: 'e.g. Smith Residence — Kitchen Remodel' })}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {JF('JOB # (optional)', 'code', { placeholder: 'e.g. 2026-014' })}
                {JF('CUSTOMER', 'customer', { placeholder: 'Client name' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {JF('ESTIMATED REVENUE ($)', 'estRevenue', { type: 'number', placeholder: 'Contract amount' })}
                {JF('ESTIMATED COST ($)', 'estCost', { type: 'number', placeholder: 'Budgeted cost' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {JF('START DATE', 'startDate', { type: 'date' })}
                {JF('END DATE', 'endDate', { type: 'date' })}
              </div>
              {JF('STATUS', 'status', { el: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'archived', label: 'Archived' }] })}
              {JF('NOTES', 'notes', { el: 'textarea', placeholder: 'Optional notes about this job' })}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={cancelBtn}>Cancel</button>
                <button onClick={saveJob} disabled={saving} style={saveBtn}>{saving ? 'Saving…' : (editId ? 'Save changes' : 'Create job')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Job detail: P&L + tagged records + assign existing records ────────────────
function JobDetail({ jobId, orgId, token, onBack, onEdit, onDelete }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [data, setData] = useState(null);     // { project, pnl }
  const [txns, setTxns] = useState(null);      // { invoices, bills, expenses, bankTransactions }
  const [loading, setLoading] = useState(true);
  const [assignKind, setAssignKind] = useState(null);  // 'invoice'|'bill'|'expense'|'bank'

  async function load() {
    setLoading(true);
    try {
      const [dRes, tRes] = await Promise.all([
        fetch(`${API}/orgs/${orgId}/projects/${jobId}`, { headers: authHeaders }).then(r => r.json()),
        fetch(`${API}/orgs/${orgId}/projects/${jobId}/transactions`, { headers: authHeaders }).then(r => r.json()),
      ]);
      if (dRes.success) setData(dRes.data);
      if (tRes.success) setTxns(tRes.data);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [jobId]);

  // Unassign a tagged record (set its projectId to null via the record's own endpoint).
  async function unassign(kind, rec) {
    try {
      const url = kind === 'invoice' ? `${API}/orgs/${orgId}/invoices/${rec.id}`
        : kind === 'bill' ? `${API}/orgs/${orgId}/bills/${rec.id}`
        : kind === 'expense' ? `${API}/orgs/${orgId}/expenses/${rec.id}`
        : `${API}/orgs/${orgId}/banking/accounts/${rec.accountId}/transactions/${rec.id}`;
      const r = await fetch(url, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ projectId: null }) });
      const j = await r.json();
      if (j.success) load(); else alert(j.message || 'Could not remove the tag.');
    } catch { alert('Could not remove the tag.'); }
  }

  if (loading || !data) {
    return <div className="page"><div className="card" style={{ padding: 40, textAlign: 'center', color: '#7A9A7A' }}>Loading job…</div></div>;
  }

  const { project, pnl } = data;
  const st = STATUS_STYLE[project.status] || STATUS_STYLE.active;
  const profitCol = pnl.profit > 0 ? '#2D7A4A' : pnl.profit < 0 ? '#c0392b' : '#2D4A35';
  const estProfit = (project.estRevenue != null && project.estCost != null) ? Number(project.estRevenue) - Number(project.estCost) : null;

  const Row = ({ label, value, strong, col, indent }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', paddingLeft: indent ? 16 : 0, borderBottom: strong ? '1px solid #D4DDCC' : '0.5px solid #F0F4EE' }}>
      <span style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 600 : 400, color: strong ? '#2D4A35' : '#5A6B5A' }}>{label}</span>
      <span style={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500, color: col || 'inherit' }}>{value}</span>
    </div>
  );

  const taggedSection = (kind, title, rows, renderRow) => (
    <div className="card" style={{ marginTop: 14, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2D4A35' }}>{title} <span style={{ color: '#9DB39D', fontWeight: 400 }}>({rows.length})</span></div>
        <button onClick={() => setAssignKind(kind)} style={{ fontSize: 12, fontWeight: 600, color: '#2D4A35', background: '#F4F8F4', border: '1px solid #D4DDCC', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>+ Assign</button>
      </div>
      {rows.length === 0 ? <div style={{ fontSize: 12, color: '#9DB39D' }}>Nothing tagged yet.</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}><tbody>{rows.map(renderRow)}</tbody></table>
      )}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} aria-label="Back" style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>←</button>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>{project.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#7A9A7A' }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.col }}>{st.label}</span>
              {project.code && <span>#{project.code}</span>}
              {project.customer && <span>· {project.customer}</span>}
              {(project.startDate || project.endDate) && <span>· {fmtDate(project.startDate)} – {fmtDate(project.endDate)}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(project)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2D4A35', background: '#fff', color: '#2D4A35', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
          <button onClick={() => onDelete(project.id)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #c0392b', background: '#fff', color: '#c0392b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginTop: 20, alignItems: 'start' }}>
        {/* P&L */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#2D4A35' }}>Profit on this job</div>
          <Row label="Invoices billed" value={fmt(pnl.income.invoiced)} indent />
          <Row label="Deposits / money in (bank)" value={fmt(pnl.income.deposits)} indent />
          <Row label="Total income" value={fmt(pnl.income.total)} strong col="#2D7A4A" />
          <div style={{ height: 10 }} />
          <Row label="Bills" value={fmt(pnl.cost.bills)} indent />
          <Row label="Expenses" value={fmt(pnl.cost.expenses)} indent />
          <Row label="Card / bank spending" value={fmt(pnl.cost.spending)} indent />
          <Row label="Total cost" value={fmt(pnl.cost.total)} strong col="#c0392b" />
          <div style={{ height: 10 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F4F8F4', borderRadius: 10, marginTop: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#2D4A35' }}>Profit</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: profitCol }}>{fmt(pnl.profit)}{pnl.margin != null && <span style={{ fontSize: 13, fontWeight: 600, color: '#7A9A7A' }}> · {pnl.margin}%</span>}</span>
          </div>
          <div style={{ fontSize: 11, color: '#9DB39D', marginTop: 12, lineHeight: 1.5 }}>
            Tip: tag each amount in <strong>one</strong> place only (either a bill/expense <em>or</em> the bank charge) so a cost isn't counted twice.
          </div>
        </div>

        {/* Estimate vs actual */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#2D4A35' }}>Estimate vs. actual</div>
          {(project.estRevenue == null && project.estCost == null) ? (
            <div style={{ fontSize: 13, color: '#9DB39D', lineHeight: 1.6 }}>
              No estimate set. <button onClick={() => onEdit(project)} style={{ background: 'none', border: 'none', color: '#2D4A35', fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Add an estimate</button> to compare your quote against actual results.
            </div>
          ) : (
            <>
              <Row label="Estimated revenue" value={project.estRevenue != null ? fmt(project.estRevenue) : '—'} indent />
              <Row label="Actual income" value={fmt(pnl.income.total)} indent />
              <Row label="Estimated cost" value={project.estCost != null ? fmt(project.estCost) : '—'} indent />
              <Row label="Actual cost" value={fmt(pnl.cost.total)} indent />
              {estProfit != null && <Row label="Estimated profit" value={fmt(estProfit)} strong />}
              {estProfit != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F4F8F4', borderRadius: 10, marginTop: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#2D4A35' }}>Actual vs. estimate</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: (pnl.profit - estProfit) >= 0 ? '#2D7A4A' : '#c0392b' }}>
                    {(pnl.profit - estProfit) >= 0 ? '+' : ''}{fmt(pnl.profit - estProfit)}
                  </span>
                </div>
              )}
            </>
          )}
          {project.notes && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '0.5px solid #EBF2E8' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#7A9A7A', marginBottom: 4 }}>NOTES</div>
              <div style={{ fontSize: 13, color: '#5A6B5A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{project.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Tagged records */}
      {txns && (
        <>
          {taggedSection('invoice', 'Invoices', txns.invoices, inv => (
            <tr key={inv.id} style={trStyle}><td style={tdL}>{inv.invoiceNumber}</td><td style={tdMid}>{fmtDate(inv.issueDate)}</td><td style={tdR}>{fmt(inv.total)}</td><td style={tdX}><button style={rmBtn} onClick={() => unassign('invoice', inv)}>Remove</button></td></tr>
          ))}
          {taggedSection('bill', 'Bills', txns.bills, b => (
            <tr key={b.id} style={trStyle}><td style={tdL}>{b.vendor}</td><td style={tdMid}>{b.category || ''}</td><td style={tdR}>{fmt(b.amount)}</td><td style={tdX}><button style={rmBtn} onClick={() => unassign('bill', b)}>Remove</button></td></tr>
          ))}
          {taggedSection('expense', 'Expenses', txns.expenses, ex => (
            <tr key={ex.id} style={trStyle}><td style={tdL}>{ex.vendor}</td><td style={tdMid}>{ex.category || ''}</td><td style={tdR}>{fmt(ex.amount)}</td><td style={tdX}><button style={rmBtn} onClick={() => unassign('expense', ex)}>Remove</button></td></tr>
          ))}
          {taggedSection('bank', 'Bank / card transactions', txns.bankTransactions, t => (
            <tr key={t.id} style={trStyle}><td style={tdL}>{t.description}</td><td style={tdMid}>{fmtDate(t.date)}</td><td style={{ ...tdR, color: Number(t.amount) >= 0 ? '#2D7A4A' : '#c0392b' }}>{fmt(t.amount)}</td><td style={tdX}><button style={rmBtn} onClick={() => unassign('bank', t)}>Remove</button></td></tr>
          ))}
        </>
      )}

      {assignKind && <AssignModal kind={assignKind} jobId={jobId} orgId={orgId} token={token} onClose={() => setAssignKind(null)} onAssigned={() => { setAssignKind(null); load(); }} />}
    </div>
  );
}

// ── Assign-existing modal: pick untagged records and tag them to this job ──────
function AssignModal({ kind, jobId, orgId, token, onClose, onAssigned }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [cands, setCands] = useState(null);
  const [busy, setBusy] = useState(null);

  const titles = { invoice: 'invoice', bill: 'bill', expense: 'expense', bank: 'bank / card transaction' };

  async function loadCandidates() {
    try {
      if (kind === 'invoice') {
        const j = await fetch(`${API}/orgs/${orgId}/invoices`, { headers: authHeaders }).then(r => r.json());
        setCands((j.data || []).filter(x => !x.projectId).map(x => ({ id: x.id, main: x.invoiceNumber, sub: x.contact?.name || '', amount: x.total, date: x.issueDate })));
      } else if (kind === 'bill') {
        const j = await fetch(`${API}/orgs/${orgId}/bills`, { headers: authHeaders }).then(r => r.json());
        setCands((j.data || []).filter(x => !x.projectId).map(x => ({ id: x.id, main: x.vendor, sub: x.category || '', amount: x.amount, date: x.dueDate })));
      } else if (kind === 'expense') {
        const j = await fetch(`${API}/orgs/${orgId}/expenses`, { headers: authHeaders }).then(r => r.json());
        setCands((j.data || []).filter(x => !x.projectId).map(x => ({ id: x.id, main: x.vendor, sub: x.category || '', amount: x.amount, date: x.date })));
      } else {
        // Bank: fetch accounts, then recent transactions for each; keep untagged only.
        const accJ = await fetch(`${API}/orgs/${orgId}/banking/accounts`, { headers: authHeaders }).then(r => r.json());
        const accounts = accJ.data || [];
        const per = await Promise.all(accounts.map(a =>
          fetch(`${API}/orgs/${orgId}/banking/accounts/${a.id}/transactions`, { headers: authHeaders }).then(r => r.json())
            .then(tj => (tj.data || tj.transactions || []).map(t => ({ ...t, accountId: a.id, accountName: a.name }))).catch(() => [])
        ));
        const all = per.flat().filter(t => !t.projectId)
          .sort((x, y) => new Date(y.date) - new Date(x.date)).slice(0, 200);
        setCands(all.map(t => ({ id: t.id, accountId: t.accountId, main: t.description, sub: t.accountName || '', amount: t.amount, date: t.date })));
      }
    } catch { setCands([]); }
  }
  useEffect(() => { loadCandidates(); }, [kind]);

  async function assign(rec) {
    setBusy(rec.id);
    try {
      const url = kind === 'invoice' ? `${API}/orgs/${orgId}/invoices/${rec.id}`
        : kind === 'bill' ? `${API}/orgs/${orgId}/bills/${rec.id}`
        : kind === 'expense' ? `${API}/orgs/${orgId}/expenses/${rec.id}`
        : `${API}/orgs/${orgId}/banking/accounts/${rec.accountId}/transactions/${rec.id}`;
      const r = await fetch(url, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ projectId: jobId }) });
      const j = await r.json();
      if (j.success) setCands(cs => cs.filter(c => c.id !== rec.id));
      else alert(j.message || 'Could not assign.');
    } catch { alert('Could not assign.'); } finally { setBusy(null); }
  }

  return (
    <div style={overlay}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 560, maxWidth: '92vw', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600, textTransform: 'capitalize' }}>Assign {titles[kind]}s to this job</h2>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: '#7A9A7A', marginBottom: 14 }}>Only records not already tagged to a job are shown. Click Add to tag one to this job.</p>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {cands == null ? <div style={{ padding: 24, textAlign: 'center', color: '#9DB39D' }}>Loading…</div>
            : cands.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: '#9DB39D' }}>Nothing available to assign.</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}><tbody>
                {cands.map(c => (
                  <tr key={c.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                    <td style={{ padding: '9px 8px' }}><div style={{ fontWeight: 500 }}>{c.main}</div>{c.sub && <div style={{ fontSize: 11, color: '#9DB39D' }}>{c.sub}</div>}</td>
                    <td style={{ padding: '9px 8px', color: '#7A9A7A', whiteSpace: 'nowrap' }}>{fmtDate(c.date)}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 500, color: Number(c.amount) < 0 ? '#c0392b' : 'inherit' }}>{fmt(c.amount)}</td>
                    <td style={{ padding: '9px 8px', textAlign: 'right' }}><button disabled={busy === c.id} onClick={() => assign(c)} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#2D4A35', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>{busy === c.id ? '…' : 'Add'}</button></td>
                  </tr>
                ))}
              </tbody></table>
            )}
        </div>
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button onClick={onAssigned} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#2D4A35', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ── shared styles ─────────────────────────────────────────────────────────────
const inStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' };
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const xBtn = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', lineHeight: 1 };
const cancelBtn = { flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', fontSize: 13, cursor: 'pointer' };
const saveBtn = { flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#2D4A35', color: '#A8D4A8', fontSize: 13, fontWeight: 500, cursor: 'pointer' };
const trStyle = { borderBottom: '0.5px solid #F0F4EE' };
const tdL = { padding: '7px 6px', fontWeight: 500 };
const tdMid = { padding: '7px 6px', color: '#7A9A7A' };
const tdR = { padding: '7px 6px', textAlign: 'right', fontWeight: 500 };
const tdX = { padding: '7px 6px', textAlign: 'right' };
const rmBtn = { fontSize: 11.5, color: '#c0392b', background: 'none', border: '1px solid #EADBD9', borderRadius: 6, padding: '3px 9px', cursor: 'pointer' };
