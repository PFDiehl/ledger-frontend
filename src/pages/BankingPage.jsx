import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

const TYPE_ORDER = { Asset: 1, Liability: 2, Equity: 3, Revenue: 4, Expense: 5 };
const fmtMoney = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toAmount = (s) => { const n = Number(String(s ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };

// Minimal CSV parser — handles quoted fields and embedded commas/newlines.
function parseCSV(text) {
  const rows = []; let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some(x => x !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  if (field !== '' || cur.length) { cur.push(field); if (cur.some(x => x !== '')) rows.push(cur); }
  return rows;
}

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#7A9A7A', display: 'block', marginBottom: 4 };

export default function BankingPage() {
  const { orgId, token } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  const [accounts, setAccounts]   = useState([]);
  const [activeId, setActiveId]   = useState(null);
  const [txns, setTxns]           = useState([]);
  const [chart, setChart]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [msg, setMsg]             = useState('');

  const [showAddAcct, setShowAddAcct] = useState(false);
  const [acctForm, setAcctForm]   = useState({ name: '', institutionName: '', mask: '' });

  const [importData, setImportData] = useState(null); // { headerRow, rows, map }
  const [importing, setImporting]   = useState(false);
  const fileRef = useRef(null);

  const [matchFor, setMatchFor]       = useState(null);  // txn being reconciled
  const [matchCands, setMatchCands]   = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([
        fetch(`${API}/orgs/${orgId}/banking/accounts`, { headers }).then(r => r.json()),
        fetch(`${API}/orgs/${orgId}/accounts`, { headers }).then(r => r.json()),
      ]);
      const accts = a.data || [];
      setAccounts(accts);
      setChart(c.data || []);
      setActiveId(prev => (prev && accts.some(x => x.id === prev)) ? prev : (accts[0]?.id || null));
    } catch (e) { setMsg('Could not load banking.'); }
    setLoading(false);
  }
  useEffect(() => { if (orgId) loadAccounts(); }, [orgId]);

  async function loadTxns(acctId) {
    if (!acctId) { setTxns([]); return; }
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${acctId}/transactions`, { headers }).then(r => r.json());
      setTxns(r.data || []);
    } catch (e) { setTxns([]); }
  }
  useEffect(() => { if (activeId) loadTxns(activeId); else setTxns([]); }, [activeId]);

  async function addAccount() {
    if (!acctForm.name) return;
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts`, { method: 'POST', headers, body: JSON.stringify(acctForm) }).then(r => r.json());
      if (r.success) {
        setShowAddAcct(false);
        setAcctForm({ name: '', institutionName: '', mask: '' });
        await loadAccounts();
        setActiveId(r.data.id);
      }
    } catch (e) { setMsg('Could not add account.'); }
  }

  async function deleteAccount(id) {
    if (!window.confirm('Delete this bank account and all its imported transactions? Their ledger entries will be removed too.')) return;
    try {
      await fetch(`${API}/orgs/${orgId}/banking/accounts/${id}`, { method: 'DELETE', headers });
      await loadAccounts();
    } catch (e) { setMsg('Could not delete account.'); }
  }

  // ── CSV import ──
  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(String(reader.result || ''));
      if (rows.length < 2) { setMsg('That file has no data rows.'); return; }
      const headerRow = rows[0].map(h => h.trim());
      const find = (re) => { const i = headerRow.findIndex(h => re.test(h)); return i >= 0 ? i : ''; };
      const amountIdx = find(/amount/i);
      const debitIdx  = find(/debit|withdrawal/i);
      const creditIdx = find(/credit|deposit/i);
      const map = {
        date:   find(/date/i),
        desc:   find(/desc|name|memo|payee|detail/i),
        mode:   amountIdx !== '' ? 'single' : ((debitIdx !== '' || creditIdx !== '') ? 'split' : 'single'),
        amount: amountIdx,
        debit:  debitIdx,
        credit: creditIdx,
      };
      setImportData({ headerRow, rows: rows.slice(1), map });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function mappedRows(data) {
    const { rows, map } = data;
    return rows.map(cols => {
      const date = map.date !== '' ? cols[map.date] : '';
      const description = map.desc !== '' ? cols[map.desc] : '';
      let amount = 0;
      if (map.mode === 'single') amount = map.amount !== '' ? toAmount(cols[map.amount]) : 0;
      else {
        const debit  = map.debit  !== '' ? Math.abs(toAmount(cols[map.debit]))  : 0;
        const credit = map.credit !== '' ? Math.abs(toAmount(cols[map.credit])) : 0;
        amount = credit - debit;   // money in positive, money out negative
      }
      return { date, description, amount };
    }).filter(r => r.date && !isNaN(new Date(r.date)) && r.amount !== 0);
  }

  async function runImport() {
    const rows = mappedRows(importData);
    if (!rows.length) { setMsg('No valid rows to import — check the column mapping.'); return; }
    setImporting(true);
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/import`, {
        method: 'POST', headers, body: JSON.stringify({ transactions: rows }),
      }).then(r => r.json());
      if (r.success) {
        setImportData(null);
        setMsg(`Imported ${r.data.imported} transaction${r.data.imported === 1 ? '' : 's'}${r.data.skipped ? ` (${r.data.skipped} duplicate${r.data.skipped === 1 ? '' : 's'} skipped)` : ''}.`);
        await loadTxns(activeId);
      } else setMsg(r.message || 'Import failed.');
    } catch (e) { setMsg('Import failed.'); }
    setImporting(false);
  }

  async function categorize(txnId, category) {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ category }),
      }).then(r => r.json());
      if (r.success) setTxns(prev => prev.map(t => t.id === txnId ? r.data : t));
    } catch (e) { setMsg('Could not categorize.'); }
  }

  async function deleteTxn(txnId) {
    try {
      await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}`, { method: 'DELETE', headers });
      setTxns(prev => prev.filter(t => t.id !== txnId));
    } catch (e) { setMsg('Could not delete transaction.'); }
  }

  async function openMatch(txn) {
    setMatchFor(txn); setMatchCands([]); setMatchLoading(true);
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txn.id}/matches`, { headers }).then(r => r.json());
      setMatchCands(r.data || []);
    } catch (e) { setMatchCands([]); }
    setMatchLoading(false);
  }
  async function doMatch(cand) {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${matchFor.id}/match`, {
        method: 'PATCH', headers, body: JSON.stringify({ matchType: cand.type, matchId: cand.id }),
      }).then(r => r.json());
      if (r.success) setTxns(prev => prev.map(t => t.id === matchFor.id ? r.data : t));
      setMatchFor(null); setMatchCands([]);
    } catch (e) { setMsg('Could not match.'); }
  }
  async function unmatch(txnId) {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}/unmatch`, { method: 'PATCH', headers }).then(r => r.json());
      if (r.success) setTxns(prev => prev.map(t => t.id === txnId ? r.data : t));
    } catch (e) { setMsg('Could not unmatch.'); }
  }

  const sortedChart = [...chart]
    .filter(a => a.code !== '1000')   // don't categorize cash into cash
    .sort((a, b) => (TYPE_ORDER[a.type] || 9) - (TYPE_ORDER[b.type] || 9) || String(a.code).localeCompare(String(b.code)));

  const activeAcct = accounts.find(a => a.id === activeId);
  const uncategorized = txns.filter(t => t.status !== 'categorized' && t.status !== 'matched').length;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Banking</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
            Import your bank &amp; credit-card activity from CSV, categorize it, and it posts to your ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => fileRef.current?.click()} disabled={!activeId}>
              ⬆ Import CSV
            </button>
          )}
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAddAcct(true)}>+ Add account</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />

      {msg && <div style={{ margin: '10px 0', fontSize: 13, color: 'var(--brand-primary)' }}>{msg}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏦</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Add a bank or credit-card account</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Add an account, then import a CSV statement to bring in your transactions.
          </p>
          <button className="btn-primary" onClick={() => setShowAddAcct(true)}>Add account</button>
        </div>
      ) : (
        <>
          {/* Account tabs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
            {accounts.map(a => (
              <button key={a.id} onClick={() => setActiveId(a.id)}
                style={{
                  padding: '8px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                  border: a.id === activeId ? '1px solid var(--brand-primary, #2D4A35)' : '1px solid #D4DDCC',
                  background: a.id === activeId ? 'var(--brand-primary, #2D4A35)' : '#fff',
                  color: a.id === activeId ? '#fff' : 'var(--color-text-primary)', fontWeight: 500,
                }}>
                {a.name}{a.mask ? ` ••${a.mask}` : ''}
              </button>
            ))}
          </div>

          {activeAcct && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {txns.length} transaction{txns.length === 1 ? '' : 's'}
                {uncategorized > 0 && <span style={{ color: '#854F0B', fontWeight: 600 }}> · {uncategorized} to categorize</span>}
              </div>
              <button onClick={() => deleteAccount(activeAcct.id)} style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 12, cursor: 'pointer' }}>Delete account</button>
            </div>
          )}

          {txns.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>📄</div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No transactions yet</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 18 }}>Import a CSV statement to bring in this account's activity.</p>
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>⬆ Import CSV</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A', width: 90 }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A' }}>Description</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#7A9A7A', width: 110 }}>Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A', width: 230 }}>Category</th>
                    <th style={{ width: 34 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map(t => {
                    const inflow = Number(t.amount) > 0;
                    return (
                      <tr key={t.id} style={{ borderBottom: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '9px 16px', color: '#7A9A7A', whiteSpace: 'nowrap' }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td style={{ padding: '9px 16px' }}>{t.description}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 500, color: inflow ? '#0F6E56' : 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                          {inflow ? '+' : '−'}${fmtMoney(Math.abs(Number(t.amount)))}
                        </td>
                        <td style={{ padding: '6px 16px' }}>
                          {t.status === 'matched' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56', background: '#E1F5EE', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                ✓ Matched{t.matchedType ? ` · ${t.matchedType}` : ''}
                              </span>
                              <button onClick={() => unmatch(t.id)} style={{ background: 'none', border: 'none', color: '#7A9A7A', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>undo</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select value={t.category || ''} onChange={e => categorize(t.id, e.target.value)}
                                style={{ ...inputStyle, padding: '6px 8px', borderColor: t.category ? '#D4DDCC' : '#F0C36D', background: t.category ? '#fff' : '#FFFBF2' }}>
                                <option value="">Uncategorized…</option>
                                {sortedChart.map(a => <option key={a.id} value={a.name}>{a.code} · {a.name}</option>)}
                              </select>
                              <button onClick={() => openMatch(t)} title="Match to an invoice, bill, or expense you already entered"
                                style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 6, color: 'var(--brand-primary, #2D4A35)', fontSize: 11, padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Match</button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                          <button onClick={() => deleteTxn(t.id)} title="Delete" style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary, #999)', cursor: 'pointer', fontSize: 14 }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Add account modal */}
      {showAddAcct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 420, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Add account</h2>
              <button onClick={() => setShowAddAcct(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={labelStyle}>ACCOUNT NAME</label>
                <input value={acctForm.name} onChange={e => setAcctForm(f => ({ ...f, name: e.target.value }))} placeholder="Business Checking" style={inputStyle} /></div>
              <div><label style={labelStyle}>INSTITUTION (optional)</label>
                <input value={acctForm.institutionName} onChange={e => setAcctForm(f => ({ ...f, institutionName: e.target.value }))} placeholder="Chase" style={inputStyle} /></div>
              <div><label style={labelStyle}>LAST 4 DIGITS (optional)</label>
                <input value={acctForm.mask} onChange={e => setAcctForm(f => ({ ...f, mask: e.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))} placeholder="1234" style={inputStyle} /></div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowAddAcct(false)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button onClick={addAccount} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#2D4A35', color: '#A8D4A8', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Add account</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match / reconcile modal */}
      {matchFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Match transaction</h2>
              <button onClick={() => { setMatchFor(null); setMatchCands([]); }} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 2 }}>{matchFor.description}</div>
            <div style={{ fontSize: 13, color: '#7A9A7A', marginBottom: 14 }}>
              {new Date(matchFor.date).toLocaleDateString('en-US')} · {Number(matchFor.amount) > 0 ? '+' : '−'}${fmtMoney(Math.abs(Number(matchFor.amount)))}
            </div>
            <p style={{ fontSize: 12, color: '#7A9A7A', marginBottom: 12, lineHeight: 1.5 }}>
              Matching links this bank line to a record you already entered, so it won't post to the ledger twice. Nothing here? Close and categorize it instead.
            </p>
            {matchLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#7A9A7A' }}>Finding matches…</div>
            ) : matchCands.length === 0 ? (
              <div style={{ padding: '18px 12px', textAlign: 'center', color: '#A32D2D', fontSize: 13 }}>No records with a matching amount were found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matchCands.map(c => (
                  <button key={`${c.type}:${c.id}`} onClick={() => doMatch(c)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                    <span>
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#7A9A7A', marginRight: 8 }}>{c.type}</span>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</span>
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>{new Date(c.date).toLocaleDateString('en-US')}</span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>${fmtMoney(c.amount)}</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 18, textAlign: 'right' }}>
              <button onClick={() => { setMatchFor(null); setMatchCands([]); }} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV import / column-mapping modal */}
      {importData && (() => {
        const { headerRow } = importData;
        const map = importData.map;
        const colOpts = [<option key="none" value="">— none —</option>, ...headerRow.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)];
        const setMap = (patch) => setImportData(d => ({ ...d, map: { ...d.map, ...patch } }));
        const allValid = mappedRows(importData);
        const preview = allValid.slice(0, 6);
        const validCount = allValid.length;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: 640, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600 }}>Import transactions</h2>
                <button onClick={() => setImportData(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: 12, color: '#7A9A7A', marginBottom: 16 }}>Match your file's columns. We guessed from the headers — adjust if needed.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div><label style={labelStyle}>DATE COLUMN</label>
                  <select value={map.date} onChange={e => setMap({ date: e.target.value })} style={inputStyle}>{colOpts}</select></div>
                <div><label style={labelStyle}>DESCRIPTION COLUMN</label>
                  <select value={map.desc} onChange={e => setMap({ desc: e.target.value })} style={inputStyle}>{colOpts}</select></div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>AMOUNT FORMAT</label>
                <div style={{ display: 'flex', gap: 14, fontSize: 13, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={map.mode === 'single'} onChange={() => setMap({ mode: 'single' })} /> One signed amount column
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" checked={map.mode === 'split'} onChange={() => setMap({ mode: 'split' })} /> Separate debit / credit
                  </label>
                </div>
                {map.mode === 'single' ? (
                  <div><label style={labelStyle}>AMOUNT COLUMN <span style={{ fontWeight: 400, textTransform: 'none' }}>(negative = money out)</span></label>
                    <select value={map.amount} onChange={e => setMap({ amount: e.target.value })} style={inputStyle}>{colOpts}</select></div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={labelStyle}>DEBIT (money out)</label>
                      <select value={map.debit} onChange={e => setMap({ debit: e.target.value })} style={inputStyle}>{colOpts}</select></div>
                    <div><label style={labelStyle}>CREDIT (money in)</label>
                      <select value={map.credit} onChange={e => setMap({ credit: e.target.value })} style={inputStyle}>{colOpts}</select></div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#7A9A7A', marginBottom: 6 }}>Preview ({validCount} valid row{validCount === 1 ? '' : 's'})</div>
              <div style={{ border: '1px solid #EBF2E8', borderRadius: 8, overflow: 'hidden', marginBottom: 18 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#F6F9F4' }}>
                    <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A' }}>Date</th>
                    <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A' }}>Description</th>
                    <th style={{ padding: '7px 10px', textAlign: 'right', color: '#7A9A7A' }}>Amount</th>
                  </tr></thead>
                  <tbody>
                    {preview.length === 0 ? (
                      <tr><td colSpan={3} style={{ padding: 14, textAlign: 'center', color: '#A32D2D' }}>No valid rows with this mapping.</td></tr>
                    ) : preview.map((r, i) => (
                      <tr key={i} style={{ borderTop: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '7px 10px' }}>{new Date(r.date).toLocaleDateString('en-US')}</td>
                        <td style={{ padding: '7px 10px' }}>{r.description}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: r.amount > 0 ? '#0F6E56' : '#333' }}>{r.amount > 0 ? '+' : '−'}${fmtMoney(Math.abs(r.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setImportData(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
                <button onClick={runImport} disabled={importing || validCount === 0} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: validCount ? '#2D4A35' : '#9BB39B', color: '#A8D4A8', cursor: validCount ? 'pointer' : 'default', fontSize: 14, fontWeight: 600 }}>
                  {importing ? 'Importing…' : `Import ${validCount} transaction${validCount === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
