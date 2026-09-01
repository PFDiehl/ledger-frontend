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

// Minimal delimited-text parser — handles quoted fields and embedded
// delimiters/newlines. Delimiter defaults to comma but can be tab, pipe, etc.
function parseCSV(text, delim = ',') {
  const rows = []; let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === delim) { cur.push(field); field = ''; }
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

// Guess the delimiter from the first non-empty line: banks export comma, tab,
// pipe, or semicolon "spreadsheet" files — whichever appears most (outside
// quotes) wins, defaulting to comma.
function detectDelimiter(text) {
  const line = (text.split(/\r?\n/).find(l => l.trim() !== '') || '');
  const counts = { ',': 0, '\t': 0, '|': 0, ';': 0 };
  let inQ = false;
  for (const c of line) {
    if (c === '"') inQ = !inQ;
    else if (!inQ && counts[c] !== undefined) counts[c]++;
  }
  let best = ',', n = 0;
  for (const d of Object.keys(counts)) if (counts[d] > n) { n = counts[d]; best = d; }
  return best;
}

// Is this a Quicken/QuickBooks WEB Connect (OFX) file, i.e. .qbo/.qfx/.ofx?
function isOFX(text) { return /<OFX>|OFXHEADER|<STMTTRN>/i.test(text); }

// Parse an OFX (.qbo/.qfx) file into { date, description, amount } rows.
// Handles both OFX 1.x (SGML, unclosed leaf tags) and 2.x (XML). Amount sign
// already matches our convention: positive = money in, negative = money out.
function parseOFX(text) {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  const tag = (b, name) => { const m = b.match(new RegExp('<' + name + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
  const out = [];
  for (const b of blocks) {
    const raw = tag(b, 'DTPOSTED');
    const amtStr = tag(b, 'TRNAMT');
    if (!raw || amtStr === '') continue;
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8);
    if (y.length !== 4 || !mo || !d) continue;
    const amount = toAmount(amtStr);
    if (amount === 0) continue;
    const description = [tag(b, 'NAME'), tag(b, 'MEMO')].filter(Boolean).join(' ').trim() || '(no description)';
    out.push({ date: `${y}-${mo}-${d}`, description, amount });
  }
  return out;
}

const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontSize: 12, fontWeight: 500, color: '#7A9A7A', display: 'block', marginBottom: 4 };

// A sensible default rule keyword from a transaction description: the first
// real word (e.g. "WAWA 123 PHILADELPHIA PA" → "WAWA"), capped for readability.
function defaultMatch(desc) {
  const s = String(desc || '').trim();
  const tok = s.split(/\s+/).find(w => w.replace(/[^A-Za-z0-9]/g, '').length >= 2);
  return (tok ? tok.replace(/[^A-Za-z0-9&]/g, '') : s).slice(0, 40);
}

// Searchable category picker: click to open, type to filter (so "T" jumps to
// Travel), arrow keys + Enter to choose. Value is the chart-account NAME.
function CategoryPicker({ value, options, onPick }) {
  const [open, setOpen]     = useState(false);
  const [q, setQ]           = useState('');
  const [active, setActive] = useState(0);
  const boxRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  useEffect(() => { if (open) { setQ(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);

  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter(a => a.name.toLowerCase().includes(ql) || String(a.code).toLowerCase().includes(ql))
    : options;
  const pick = (name) => { onPick(name); setOpen(false); };
  function onKey(e) {
    if (e.key === 'ArrowDown')      { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); const a = filtered[active]; if (a) pick(a.name); }
    else if (e.key === 'Escape')    { e.preventDefault(); setOpen(false); }
  }
  const hasValue = !!value;

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ ...inputStyle, padding: '6px 8px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          borderColor: hasValue ? '#D4DDCC' : '#F0C36D', background: hasValue ? '#fff' : '#FFFBF2',
          color: hasValue ? 'var(--color-text-primary)' : '#854F0B', overflow: 'hidden' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || 'Uncategorized…'}</span>
        <span style={{ color: '#9BB39B', fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, width: 270, background: '#fff', border: '1px solid #D4DDCC', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setActive(0); }} onKeyDown={onKey}
            placeholder="Type to filter… (T → Travel)"
            style={{ width: '100%', border: 'none', borderBottom: '1px solid #EBF2E8', padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {hasValue && (
              <div onMouseDown={e => e.preventDefault()} onClick={() => pick('')}
                style={{ padding: '7px 12px', fontSize: 12.5, color: '#A32D2D', cursor: 'pointer' }}>Clear category</div>
            )}
            {filtered.length === 0 ? (
              <div style={{ padding: '10px 12px', fontSize: 12.5, color: '#7A9A7A' }}>No matching category</div>
            ) : filtered.map((a, i) => (
              <div key={a.id} onMouseDown={e => e.preventDefault()} onClick={() => pick(a.name)} onMouseEnter={() => setActive(i)}
                style={{ padding: '7px 12px', fontSize: 13, cursor: 'pointer', background: i === active ? '#F1F6EE' : '#fff', display: 'flex', gap: 8 }}>
                <span style={{ color: '#9BB39B', fontVariantNumeric: 'tabular-nums' }}>{a.code}</span>
                <span>{a.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const [rules, setRules]         = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [rulePrompt, setRulePrompt] = useState(null);        // { match, category, description }
  const [newRule, setNewRule]     = useState({ match: '', category: '' });

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

  async function loadRules() {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/rules`, { headers }).then(r => r.json());
      setRules(r.data || []);
    } catch (e) { /* ignore */ }
  }
  useEffect(() => { if (orgId) loadRules(); }, [orgId]);

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
      const text = String(reader.result || '');
      // Bank file (.qbo/.qfx/.ofx): fixed fields, no column mapping needed.
      if (isOFX(text)) {
        const parsed = parseOFX(text).filter(r => r.date && !isNaN(new Date(r.date)) && r.amount !== 0);
        if (!parsed.length) { setMsg('Could not read any transactions from that .qbo/.qfx file.'); return; }
        setImportData({ preParsed: true, parsedRows: parsed });
        return;
      }
      const rows = parseCSV(text, detectDelimiter(text));
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
    if (data.preParsed) return data.parsedRows.filter(r => r.date && !isNaN(new Date(r.date)) && r.amount !== 0);
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
        const auto = r.data.autoCategorized || 0;
        setMsg(`Imported ${r.data.imported} transaction${r.data.imported === 1 ? '' : 's'}${r.data.skipped ? ` (${r.data.skipped} duplicate${r.data.skipped === 1 ? '' : 's'} skipped)` : ''}${auto ? ` · ${auto} auto-categorized by rules` : ''}.`);
        await loadTxns(activeId);
      } else setMsg(r.message || 'Import failed.');
    } catch (e) { setMsg('Import failed.'); }
    setImporting(false);
  }

  async function categorize(txnId, category, txn) {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ category }),
      }).then(r => r.json());
      if (r.success) {
        setTxns(prev => prev.map(t => t.id === txnId ? r.data : t));
        // When a previously-uncategorized line gets a category, offer to save a rule.
        if (category && txn && txn.status !== 'categorized') {
          setRulePrompt({ match: defaultMatch(txn.description), category, description: txn.description });
        }
      }
    } catch (e) { setMsg('Could not categorize.'); }
  }

  async function createRule() {
    if (!rulePrompt) return;
    const match = rulePrompt.match.trim();
    const category = rulePrompt.category;
    if (!match) { setRulePrompt(null); return; }
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/rules`, {
        method: 'POST', headers, body: JSON.stringify({ match, category }),
      }).then(r => r.json());
      if (r.success) {
        const applied = r.data?.applied || 0;
        setMsg(`Rule saved — anything containing "${match}" is now categorized as ${category}${applied ? `. Applied to ${applied} existing transaction${applied === 1 ? '' : 's'}.` : '.'}`);
        await loadRules();
        await loadTxns(activeId);
      } else setMsg(r.message || 'Could not save the rule.');
    } catch (e) { setMsg('Could not save the rule.'); }
    setRulePrompt(null);
  }

  async function addRuleFromModal() {
    const match = newRule.match.trim();
    if (!match || !newRule.category) return;
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/rules`, {
        method: 'POST', headers, body: JSON.stringify({ match, category: newRule.category }),
      }).then(r => r.json());
      if (r.success) {
        setNewRule({ match: '', category: '' });
        await loadRules();
        await loadTxns(activeId);
        const applied = r.data?.applied || 0;
        if (applied) setMsg(`Rule applied to ${applied} existing transaction${applied === 1 ? '' : 's'}.`);
      } else alert(r.message || 'Could not save the rule.');
    } catch (e) { alert('Could not save the rule.'); }
  }

  async function deleteRule(id) {
    try {
      await fetch(`${API}/orgs/${orgId}/banking/rules/${id}`, { method: 'DELETE', headers });
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (e) { /* ignore */ }
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
            Import your bank &amp; credit-card activity from a CSV or .qbo/.qfx file, categorize it, and it posts to your ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => fileRef.current?.click()} disabled={!activeId}>
              ⬆ Import statement
            </button>
          )}
          <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setShowRules(true)}>
            ⚙ Rules{rules.length ? ` (${rules.length})` : ''}
          </button>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={() => setShowAddAcct(true)}>+ Add account</button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.qbo,.qfx,.ofx,text/csv" style={{ display: 'none' }} onChange={onFile} />

      {msg && <div style={{ margin: '10px 0', fontSize: 13, color: 'var(--brand-primary)' }}>{msg}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏦</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Add a bank or credit-card account</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Add an account, then import a statement (CSV or .qbo/.qfx) to bring in your transactions.
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
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 18 }}>Import a statement (CSV or .qbo/.qfx) to bring in this account's activity.</p>
              <button className="btn-primary" onClick={() => fileRef.current?.click()}>⬆ Import statement</button>
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
                              <CategoryPicker value={t.category || ''} options={sortedChart}
                                onPick={(name) => categorize(t.id, name, t)} />
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

      {/* Create-rule prompt (after categorizing an uncategorized line) */}
      {rulePrompt && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:26, width:440, maxWidth:'92vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <h2 style={{ fontSize:18, fontWeight:600 }}>Create a rule?</h2>
              <button onClick={() => setRulePrompt(null)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'#5E6B62', lineHeight:1.5, marginBottom:16 }}>
              Automatically categorize any transaction whose description contains this text as <strong>{rulePrompt.category}</strong> — now and on future imports.
            </p>
            <label style={labelStyle}>WHEN DESCRIPTION CONTAINS</label>
            <input value={rulePrompt.match} onChange={e => setRulePrompt(p => ({ ...p, match: e.target.value }))} style={{ ...inputStyle, marginBottom:6 }} autoFocus />
            <div style={{ fontSize:12, color:'#7A9A7A', marginBottom:18 }}>e.g. “WAWA” → every Wawa transaction becomes {rulePrompt.category}.</div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setRulePrompt(null)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #D4DDCC', background:'#fff', cursor:'pointer', fontSize:13 }}>No thanks</button>
              <button onClick={createRule} style={{ padding:'9px 18px', borderRadius:8, border:'none', background:'#2D4A35', color:'#A8D4A8', cursor:'pointer', fontSize:13, fontWeight:600 }}>Create rule</button>
            </div>
          </div>
        </div>
      )}

      {/* Rules manager */}
      {showRules && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:110, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:26, width:560, maxWidth:'95vw', maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <h2 style={{ fontSize:18, fontWeight:600 }}>Categorization rules</h2>
              <button onClick={() => setShowRules(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>×</button>
            </div>
            <p style={{ fontSize:12.5, color:'#7A9A7A', marginBottom:16, lineHeight:1.5 }}>
              When an imported transaction's description contains the text on the left, it's automatically categorized on the right — on import and when you add the rule.
            </p>

            <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:16, flexWrap:'wrap' }}>
              <div style={{ flex:'1 1 150px' }}>
                <label style={labelStyle}>CONTAINS</label>
                <input value={newRule.match} onChange={e => setNewRule(n => ({ ...n, match: e.target.value }))} placeholder="WAWA" style={inputStyle} />
              </div>
              <div style={{ flex:'1 1 180px' }}>
                <label style={labelStyle}>CATEGORY</label>
                <select value={newRule.category} onChange={e => setNewRule(n => ({ ...n, category: e.target.value }))} style={inputStyle}>
                  <option value="">Select…</option>
                  {sortedChart.map(a => <option key={a.id} value={a.name}>{a.code} · {a.name}</option>)}
                </select>
              </div>
              <button onClick={addRuleFromModal} disabled={!newRule.match.trim() || !newRule.category}
                style={{ padding:'9px 16px', borderRadius:8, border:'none', background:(newRule.match.trim() && newRule.category)?'#2D4A35':'#9BB39B', color:'#A8D4A8', cursor:(newRule.match.trim() && newRule.category)?'pointer':'default', fontSize:13, fontWeight:600 }}>Add</button>
            </div>

            {rules.length === 0 ? (
              <div style={{ padding:'24px 12px', textAlign:'center', color:'#7A9A7A', fontSize:13, border:'1px dashed #D4DDCC', borderRadius:8 }}>
                No rules yet. Add one above, or create one while categorizing a transaction.
              </div>
            ) : (
              <div style={{ border:'1px solid #EBF2E8', borderRadius:8, overflow:'hidden' }}>
                {rules.map(r => (
                  <div key={r.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'0.5px solid #EBF2E8' }}>
                    <span style={{ fontSize:13, color:'#5E6B62' }}>contains</span>
                    <span style={{ fontSize:13, fontWeight:600 }}>“{r.match}”</span>
                    <span style={{ color:'#9BB39B' }}>→</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--brand-primary, #2D4A35)' }}>{r.category}</span>
                    <button onClick={() => deleteRule(r.id)} style={{ marginLeft:'auto', background:'none', border:'none', color:'#A32D2D', fontSize:12, cursor:'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop:18, textAlign:'right' }}>
              <button onClick={() => setShowRules(false)} style={{ padding:'9px 16px', borderRadius:8, border:'1px solid #D4DDCC', background:'#fff', cursor:'pointer', fontSize:13 }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV import / column-mapping modal */}
      {importData && (() => {
        const preParsed = importData.preParsed;
        const headerRow = importData.headerRow || [];
        const map = importData.map || {};
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
              {preParsed ? (
                <div style={{ background: '#F1F6EE', border: '1px solid #DCEAD4', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#2D4A35' }}>
                  Read <strong>{validCount}</strong> transaction{validCount === 1 ? '' : 's'} from your bank file (.qbo/.qfx). No column mapping needed — review below and import.
                </div>
              ) : (
                <>
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
                </>
              )}

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
