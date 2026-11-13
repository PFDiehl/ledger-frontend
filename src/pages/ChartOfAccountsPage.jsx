import { useState, useEffect } from 'react';
import AccountRegister from '../components/AccountRegister.jsx';
import AccountReport from '../components/AccountReport.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

const TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

// Subtypes offered per account type. Picking from a list (instead of typing)
// keeps the Subtype column clean and consistent — and the Expense list includes
// "Rental Expense" and "Property Expense" so a rental business can split its
// costs apart. The first option in each list is the default for a new account.
const SUBTYPE_OPTIONS = {
  Asset:     ['Current Asset', 'Bank', 'Accounts Receivable', 'Fixed Asset', 'Other Asset'],
  Liability: ['Current Liability', 'Accounts Payable', 'Credit Card', 'Long-term Liability'],
  Equity:    ['Equity'],
  Revenue:   ['Income', 'Other Income'],
  Expense:   ['Expense', 'Cost of Goods Sold', 'Rental Expense', 'Property Expense', 'Other Expense'],
};
const defaultSubtypeFor = (type) => (SUBTYPE_OPTIONS[type] && SUBTYPE_OPTIONS[type][0]) || '';

const EMPTY_FORM = { code: '', name: '', type: 'Expense', subtype: defaultSubtypeFor('Expense'), description: '' };

// Balance-sheet accounts get a register; income/expense accounts get "Run report".
const BALANCE_SHEET = ['Asset', 'Liability', 'Equity'];
const fmtMoney = (n) => (n == null ? '' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0));

export default function ChartOfAccountsPage() {
  const { orgId, token } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]     = useState('');
  const [balances, setBalances] = useState({});
  const [registerAcct, setRegisterAcct] = useState(null);
  const [reportAcct, setReportAcct] = useState(null);
  const [showReclassify, setShowReclassify] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts`, { headers });
      const j = await r.json();
      setAccounts(j.data || []);
      const br = await fetch(`${API}/orgs/${orgId}/accounts/balances`, { headers }).then(x => x.json()).catch(() => null);
      if (br?.success) setBalances(br.data || {});
    } catch (e) { setMsg('Could not load accounts.'); }
    setLoading(false);
  }
  useEffect(() => { if (orgId) load(); }, [orgId]);

  async function seedDefaults() {
    setSeeding(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts/seed`, { method: 'POST', headers });
      const j = await r.json();
      if (j.success) { setAccounts(j.data.accounts || []); setMsg(`Added ${j.data.created} standard accounts.`); }
      else setMsg(j.message || 'Could not set up accounts.');
    } catch (e) { setMsg('Could not set up accounts.'); }
    setSeeding(false);
  }

  function openNew()  { setEditingId(null); setForm(EMPTY_FORM); setMsg(''); setShowForm(true); }
  function openEdit(a){ setEditingId(a.id); setForm({ code: a.code, name: a.name, type: a.type, subtype: a.subtype || defaultSubtypeFor(a.type), description: a.description || '' }); setMsg(''); setShowForm(true); }

  // When the type changes, if the current subtype doesn't belong to the new type,
  // snap it back to that type's default so the dropdown always shows a valid value.
  function onTypeChange(e) {
    const type = e.target.value;
    setForm(f => {
      const valid = SUBTYPE_OPTIONS[type] || [];
      const subtype = valid.includes(f.subtype) ? f.subtype : defaultSubtypeFor(type);
      return { ...f, type, subtype };
    });
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) { setMsg('Code and name are required.'); return; }
    setSaving(true); setMsg('');
    try {
      const url    = editingId ? `${API}/orgs/${orgId}/accounts/${editingId}` : `${API}/orgs/${orgId}/accounts`;
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      const j = await r.json();
      if (j.success) { setShowForm(false); await load(); }
      else setMsg(j.message || 'Could not save the account.');
    } catch (e) { setMsg('Could not save the account.'); }
    setSaving(false);
  }

  async function del() {
    if (!editingId) return;
    if (!window.confirm('Delete this account? This cannot be undone.')) return;
    setSaving(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts/${editingId}`, { method: 'DELETE', headers });
      const j = await r.json();
      if (j.success) { setShowForm(false); await load(); }
      else setMsg(j.message || 'Could not delete the account.');
    } catch (e) { setMsg('Could not delete the account.'); }
    setSaving(false);
  }

  const normalBalanceFor = (type) => (type === 'Asset' || type === 'Expense') ? 'Dr' : 'Cr';
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">Chart of Accounts</h1>
          <p style={{ color:'var(--color-text-secondary)', fontSize:13, marginTop:2 }}>
            The list of accounts your bookkeeping is organized into.
          </p>
        </div>
        {accounts.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setShowReclassify(true)} style={btnGhost}>Reclassify transactions</button>
            <button className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }} onClick={openNew}>
              <span>+</span> New account
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div style={{ margin:'12px 0', fontSize:13, color:'var(--brand-primary)' }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--color-text-secondary)' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        // Empty state → offer to seed a standard chart.
        <div className="card" style={{ padding:40, marginTop:20, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📇</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>Set up your chart of accounts</p>
          <p style={{ fontSize:13, color:'var(--color-text-secondary)', maxWidth:440, margin:'0 auto 20px' }}>
            Start with a standard small-business chart of accounts — assets, liabilities, equity,
            income, and expenses — then rename or add accounts to fit your business.
          </p>
          <button className="btn-primary" onClick={seedDefaults} disabled={seeding}>
            {seeding ? 'Setting up…' : 'Set up standard accounts'}
          </button>
          <div style={{ marginTop:14 }}>
            <button onClick={openNew}
              style={{ background:'none', border:'none', color:'var(--color-text-secondary)', fontSize:13, cursor:'pointer', textDecoration:'underline' }}>
              or add accounts one at a time
            </button>
          </div>
        </div>
      ) : (
        // Accounts grouped by type.
        TYPES.filter(type => accounts.some(a => a.type === type)).map(type => (
          <div key={type} style={{ marginTop:10 }}>
            <h2 style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
              {type}
            </h2>
            <div className="card" style={{ overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--color-border, #D4DDCC)' }}>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Subtype</th>
                    <th style={{ ...thStyle, textAlign:'center' }}>Normal</th>
                    <th style={{ ...thStyle, textAlign:'right' }}>Balance</th>
                    <th style={{ ...thStyle, textAlign:'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.filter(a => a.type === type).map(a => (
                    <tr key={a.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary, #EBF2E8)' }}>
                      <td style={{ ...tdStyle, fontFamily:'monospace', color:'var(--color-text-secondary)' }}>{a.code}</td>
                      <td style={{ ...tdStyle, fontWeight:500 }}>
                        {a.name}
                        {a.isSystem && <span style={badge}>standard</span>}
                        {a.description && (
                          <div style={{ fontSize:11, fontWeight:400, color:'var(--color-text-secondary)', marginTop:2 }}>{a.description}</div>
                        )}
                      </td>
                      <td style={{ ...tdStyle, color:'var(--color-text-secondary)' }}>{a.subtype || '—'}</td>
                      <td style={{ ...tdStyle, textAlign:'center', color:'var(--color-text-secondary)' }}>{normalBalanceFor(a.type)}</td>
                      <td style={{ ...tdStyle, textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{fmtMoney(balances[a.id])}</td>
                      <td style={{ ...tdStyle, textAlign:'right', whiteSpace:'nowrap' }}>
                        {BALANCE_SHEET.includes(a.type) ? (
                          <button onClick={() => setRegisterAcct(a)}
                            style={{ background:'none', border:'none', color:'var(--brand-primary)', cursor:'pointer', fontSize:12 }}>
                            View register
                          </button>
                        ) : (
                          <button onClick={() => setReportAcct(a)}
                            style={{ background:'none', border:'none', color:'var(--brand-primary)', cursor:'pointer', fontSize:12 }}>
                            Run report
                          </button>
                        )}
                        <button onClick={() => openEdit(a)}
                          style={{ background:'none', border:'none', color:'var(--brand-primary)', cursor:'pointer', fontSize:12, marginLeft:10 }}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* New / edit account modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:17, fontWeight:600 }}>{editingId ? 'Edit account' : 'New account'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--color-text-secondary)' }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:12 }}>
                <Field label="Code">
                  <input style={input} value={form.code} onChange={set('code')} placeholder="6050" />
                </Field>
                <Field label="Name">
                  <input style={input} value={form.name} onChange={set('name')} placeholder="Office Supplies" />
                </Field>
              </div>
              <Field label="Type">
                <select style={input} value={form.type} onChange={onTypeChange}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:4 }}>
                  Normal balance: {normalBalanceFor(form.type) === 'Dr' ? 'Debit' : 'Credit'} (set automatically from the type)
                </div>
              </Field>
              <Field label="Subtype">
                <select style={input} value={form.subtype} onChange={set('subtype')}>
                  {(SUBTYPE_OPTIONS[form.type] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {form.type === 'Expense' && (
                  <div style={{ fontSize:11, color:'var(--color-text-secondary)', marginTop:4 }}>
                    Use “Rental Expense” and “Property Expense” to split a rental business’s costs apart.
                  </div>
                )}
              </Field>
              <Field label="Description / notes (optional)">
                <textarea style={{ ...input, minHeight:60, resize:'vertical', fontFamily:'inherit' }}
                  value={form.description} onChange={set('description')}
                  placeholder="e.g. Coffee, cleaning supplies, towels for guests" />
              </Field>
              {msg && <div style={{ fontSize:12, color:'#B4472D' }}>{msg}</div>}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                <div>
                  {editingId && (
                    <button onClick={del} disabled={saving}
                      style={{ background:'none', border:'none', color:'#B4472D', cursor:'pointer', fontSize:13 }}>
                      Delete account
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
                  <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save account'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {registerAcct && (
        <AccountRegister
          account={registerAcct}
          accounts={accounts}
          orgId={orgId}
          token={token}
          onClose={() => setRegisterAcct(null)}
          onChanged={load}
        />
      )}

      {reportAcct && (
        <AccountReport
          account={reportAcct}
          orgId={orgId}
          token={token}
          onClose={() => setReportAcct(null)}
        />
      )}

      {showReclassify && (
        <ReclassifyModal
          accounts={accounts}
          orgId={orgId}
          token={token}
          onClose={() => setShowReclassify(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// Company-wide "move all of one category to another" tool. Lives on the Chart of
// Accounts page because categories ARE the chart of accounts. Previews the count
// first (a dry run), then applies across every account; the server skips reconciled
// and closed-period transactions so a closed month can never be moved by accident.
function ReclassifyModal({ accounts, orgId, token, onClose, onChanged }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const year = new Date().getFullYear();
  const [from, setFrom]   = useState('');
  const [to, setTo]       = useState('');
  const [scope, setScope] = useState('year');              // 'year' | 'all' | 'custom'
  const [start, setStart] = useState(`${year}-01-01`);
  const [end, setEnd]     = useState(`${year}-12-31`);
  const [preview, setPreview] = useState(null);
  const [done, setDone]   = useState(null);
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState('');

  // Any change to the selection invalidates a previous preview or result.
  useEffect(() => { setPreview(null); setDone(null); setErr(''); }, [from, to, scope, start, end]);

  const types = TYPES.filter(t => accounts.some(a => a.type === t));
  const options = types.map(t => (
    <optgroup key={t} label={t}>
      {accounts.filter(a => a.type === t).map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
    </optgroup>
  ));

  function dateRange() {
    if (scope === 'year')   return { start: `${year}-01-01`, end: `${year}-12-31` };
    if (scope === 'custom') return { start: start || null, end: end || null };
    return { start: null, end: null };                     // all years
  }

  async function run(dryRun) {
    if (!from || !to) { setErr('Choose the category to move from and the one to move to.'); return; }
    if (from === to)  { setErr('Those are the same category — pick two different ones.'); return; }
    setBusy(true); setErr('');
    try {
      const { start: s, end: e } = dateRange();
      const body = { from, to, dryRun };
      if (s) body.start = s;
      if (e) body.end = e;
      const r = await fetch(`${API}/orgs/${orgId}/banking/reclassify`, { method:'POST', headers, body: JSON.stringify(body) }).then(x => x.json());
      if (!r.success) { setErr(r.message || 'Something went wrong — nothing was changed.'); setBusy(false); return; }
      if (dryRun) setPreview(r.data);
      else { setDone(r.data); onChanged && onChanged(); }
    } catch { setErr('Something went wrong — nothing was changed.'); }
    setBusy(false);
  }

  const skipped = (p) => {
    const bits = [];
    if (p.reconciled) bits.push(`${p.reconciled} reconciled`);
    if (p.closed)     bits.push(`${p.closed} in a closed period`);
    return bits.length ? ` ${bits.join(' and ')} left unchanged.` : '';
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
          <h2 style={{ fontSize:17, fontWeight:600 }}>Reclassify transactions</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--color-text-secondary)' }}>×</button>
        </div>
        <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:18 }}>
          Move every transaction from one category to another, across all your accounts.
          Reconciled transactions and anything in a closed period are left untouched.
        </p>

        {done ? (
          <div>
            <div style={{ fontSize:14, padding:'14px 16px', borderRadius:10, background:'var(--brand-accent-light, #EBF2E8)', color:'var(--color-text-primary)' }}>
              Changed <b>{done.changed}</b> transaction{done.changed === 1 ? '' : 's'} from “{from}” to “{to}.”{skipped(done)}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18 }}>
              <button className="btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Field label="Move from">
              <select style={input} value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">Choose a category…</option>
                {options}
              </select>
            </Field>
            <Field label="Move to">
              <select style={input} value={to} onChange={e => setTo(e.target.value)}>
                <option value="">Choose a category…</option>
                {options}
              </select>
            </Field>

            <Field label="Which transactions">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {[['year', `This year (${year})`], ['all', 'All years'], ['custom', 'Custom range']].map(([v, lbl]) => (
                  <button key={v} onClick={() => setScope(v)}
                    style={{
                      padding:'7px 13px', borderRadius:8, fontSize:13, cursor:'pointer',
                      border: scope === v ? '1px solid var(--brand-primary)' : '1px solid var(--color-border-secondary, #D4DDCC)',
                      background: scope === v ? 'var(--brand-accent-light, #EBF2E8)' : 'transparent',
                      color: scope === v ? 'var(--brand-primary)' : 'var(--color-text-primary)',
                      fontWeight: scope === v ? 600 : 400,
                    }}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Field>

            {scope === 'custom' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="From date"><input type="date" style={input} value={start} onChange={e => setStart(e.target.value)} /></Field>
                <Field label="To date"><input type="date" style={input} value={end} onChange={e => setEnd(e.target.value)} /></Field>
              </div>
            )}

            {scope === 'all' && (
              <div style={{ fontSize:12.5, padding:'10px 13px', borderRadius:9, background:'#FBEEDC', border:'1px solid #F0D8B4', color:'#7A4E0B' }}>
                Heads up: changing prior years can move numbers on reports and tax returns you’ve already filed.
              </div>
            )}

            {err && <div style={{ fontSize:12.5, color:'#B4472D' }}>{err}</div>}

            {preview && (
              <div style={{ fontSize:14, padding:'12px 15px', borderRadius:10, background:'var(--brand-accent-light, #EBF2E8)', color:'var(--color-text-primary)' }}>
                {preview.toChange > 0
                  ? <>This will change <b>{preview.toChange}</b> transaction{preview.toChange === 1 ? '' : 's'} from “{from}” to “{to}.”{skipped(preview)}</>
                  : <>No transactions to change in “{from}” for this period.{skipped(preview)}</>}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
              <button onClick={onClose} style={btnGhost}>Cancel</button>
              {preview && preview.toChange > 0
                ? <button className="btn-primary" onClick={() => run(false)} disabled={busy}>{busy ? 'Changing…' : `Change ${preview.toChange} transaction${preview.toChange === 1 ? '' : 's'}`}</button>
                : <button className="btn-primary" onClick={() => run(true)} disabled={busy || !from || !to}>{busy ? 'Checking…' : 'Preview'}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4 }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle = { padding:'6px 14px 5px', textAlign:'left', fontWeight:500, color:'var(--color-text-secondary)', fontSize:12 };
const tdStyle = { padding:'4px 14px' };
const badge   = { marginLeft:8, fontSize:10, padding:'1px 6px', borderRadius:6, background:'var(--brand-accent-light, #EBF2E8)', color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.04em' };
const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 };
const modal   = { background:'var(--color-background-primary, #fff)', borderRadius:14, padding:24, width:480, maxWidth:'92vw', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,0.18)' };
const input   = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', fontSize:14, background:'var(--color-background-primary, #fff)', color:'var(--color-text-primary)' };
const btnGhost = { padding:'8px 16px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, cursor:'pointer' };
