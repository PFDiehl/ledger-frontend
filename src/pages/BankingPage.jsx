import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

// Load Plaid's Link script once (used to open the secure bank-connect popup).
let plaidScriptLoaded = false;
function loadPlaidScript() {
  if (plaidScriptLoaded && window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-plaid-link]');
    if (existing) { existing.addEventListener('load', () => resolve()); if (window.Plaid) resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.setAttribute('data-plaid-link', '1');
    s.onload  = () => { plaidScriptLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('Could not load Plaid. Check your connection and try again.'));
    document.head.appendChild(s);
  });
}

const TYPE_ORDER = { Asset: 1, Liability: 2, Equity: 3, Revenue: 4, Expense: 5 };
const fmtMoney = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toAmount = (s) => { const n = Number(String(s ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0; };
const round2 = (n) => Math.round(n * 100) / 100;

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
function CategoryPicker({ value, options, onPick, autoOpen, warn }) {
  const [open, setOpen]     = useState(!!autoOpen);   // autoOpen: start in "type to filter" mode
  const [q, setQ]           = useState('');
  const [active, setActive] = useState(0);
  const [dropUp, setDropUp] = useState(false);   // open upward when the row is near the bottom
  const boxRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0);
    // Decide which way to open: if there isn't room for the menu below the field
    // (near the bottom of the screen) and there's more room above, flip it upward.
    const r = boxRef.current?.getBoundingClientRect();
    if (r) { const spaceBelow = window.innerHeight - r.bottom; setDropUp(spaceBelow < 300 && r.top > spaceBelow); }
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

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
        title={warn ? 'This category was renamed or removed — re-pick it so the charge posts to the books.' : undefined}
        style={{ ...inputStyle, padding: '6px 8px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
          borderColor: warn ? '#E8894B' : (hasValue ? '#D4DDCC' : '#F0C36D'),
          background:  warn ? '#FFF4EC' : (hasValue ? '#fff' : '#FFFBF2'),
          color:       warn ? '#8A3B12' : (hasValue ? 'var(--color-text-primary)' : '#854F0B'), overflow: 'hidden' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{warn ? '⚠ ' : ''}{value || 'Uncategorized…'}</span>
        <span style={{ color: '#9BB39B', fontSize: 10 }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', ...(dropUp ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }), left: 0, zIndex: 50, width: 270, background: '#fff', border: '1px solid #D4DDCC', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
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

  const [connecting, setConnecting] = useState(false);   // Plaid connect in progress
  const [syncing, setSyncing]       = useState(false);   // Plaid sync in progress

  const [importData, setImportData] = useState(null); // { headerRow, rows, map }
  const [importing, setImporting]   = useState(false);
  const fileRef = useRef(null);
  const pdfRef  = useRef(null);                        // statement-PDF (AI reader) picker
  const [parsingPdf, setParsingPdf] = useState(false); // AI reading a statement PDF
  const venmoRef = useRef(null);                       // Venmo/Cash App export picker
  const [parsingVenmo, setParsingVenmo] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);        // account card being dragged
  const [overIdx, setOverIdx] = useState(null);        // account card being dragged over
  const [resyncing, setResyncing] = useState(false);   // re-posting categorized txns to the books
  const [unposted, setUnposted]   = useState([]);      // categorized txns that aren't in the books
  const [showUnposted, setShowUnposted] = useState(false);

  const [matchFor, setMatchFor]       = useState(null);  // txn being reconciled
  const [matchCands, setMatchCands]   = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const [rules, setRules]         = useState([]);
  const [showRules, setShowRules] = useState(false);
  const [rulePrompt, setRulePrompt] = useState(null);        // { match, category, description }
  const [newRule, setNewRule]     = useState({ match: '', category: '' });

  // Per-row drafts for the QuickBooks-style "Add" flow on uncategorized lines:
  // the user types a payee and picks a category, then clicks Add to post it.
  const [payeeDraft, setPayeeDraft] = useState({}); // txnId -> payee string
  const [catDraft, setCatDraft]     = useState({}); // txnId -> pending category name

  // Manual "Add transaction" entry (used when there's no bank feed). Supports a
  // split: one charge divided across two or more categories (e.g. rental vs. property).
  const emptyTxnForm = () => ({
    date: new Date().toISOString().slice(0, 10),
    description: '', payee: '', direction: 'out', amount: '',
    category: '', split: false,
    lines: [{ category: '', amount: '' }, { category: '', amount: '' }],
  });
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [txnForm, setTxnForm]       = useState(emptyTxnForm());
  const [savingTxn, setSavingTxn]   = useState(false);

  // Splitting an EXISTING bank line (e.g. an imported Lowe's charge) across categories.
  const [splitFor, setSplitFor]       = useState(null);  // the transaction being split
  const [splitLines, setSplitLines]   = useState([{ category: '', amount: '' }, { category: '', amount: '' }]);
  const [savingSplit, setSavingSplit] = useState(false);

  // Load the list of categorized transactions that aren't in the books (orphans) so
  // we can show a "needs attention" banner and a fix-them-all-in-one-place list.
  async function loadUnposted() {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/unposted`, { headers }).then(r => r.json());
      setUnposted(r?.data?.items || []);
    } catch (e) { /* non-critical */ }
  }
  useEffect(() => { if (orgId) loadUnposted(); }, [orgId]);

  // Re-post every categorized transaction to the books. Fixes any that were
  // categorized but never posted (e.g. a company that had no cash account yet).
  async function resyncBooks() {
    if (resyncing) return;
    setResyncing(true); setMsg('Re-posting your categorized transactions to the books…');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/resync-ledger`, { method: 'POST', headers }).then(r => r.json());
      if (r.success) {
        const d = r.data || {};
        setMsg(`Re-synced to the books: ${d.posted} of ${d.checked} posted${d.missed ? ` · ${d.missed} still need a category fix — click "Review" to see them` : ' — all set'}.`);
        await loadTxns(activeId);
        await loadUnposted();
      } else setMsg(r.message || 'Could not re-sync to the books.');
    } catch (e) { setMsg('Could not re-sync to the books.'); }
    setResyncing(false);
  }

  // Re-pick a category on an orphaned transaction, from the review list. Posts it and
  // drops it from the list. Works org-wide (the server finds the txn by id).
  async function fixUnposted(txn, category) {
    if (!category) return;
    try {
      const acctId = txn.accountId || activeId;
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${acctId}/transactions/${txn.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ category }),
      }).then(r => r.json());
      if (r.success) {
        setUnposted(prev => prev.filter(t => t.id !== txn.id));
        if (txn.accountId === activeId) await loadTxns(activeId);
      } else setMsg(r.message || 'Could not fix that transaction.');
    } catch (e) { setMsg('Could not fix that transaction.'); }
  }

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

  // ── Plaid: connect a bank and pull transactions automatically ──
  async function connectBank() {
    setConnecting(true); setMsg('');
    try {
      await loadPlaidScript();
      const r = await fetch(`${API}/orgs/${orgId}/plaid/link-token`, { method: 'POST', headers }).then(r => r.json());
      const linkToken = r?.data?.linkToken;
      if (!linkToken) throw new Error(r?.message || 'Could not start the bank connection.');
      // Persist the token so an OAuth bank redirect (Chase, etc.) can resume it on /plaid-oauth.
      try { localStorage.setItem('plaid_link_token', linkToken); } catch {}
      await new Promise((resolve) => {
        const handler = window.Plaid.create({
          token: linkToken,
          onSuccess: async (publicToken, metadata) => {
            try { localStorage.removeItem('plaid_link_token'); } catch {}
            setMsg('Importing your accounts and transactions…');
            try {
              const ex = await fetch(`${API}/orgs/${orgId}/plaid/exchange`, {
                method: 'POST', headers,
                body: JSON.stringify({ publicToken, institutionName: metadata?.institution?.name }),
              }).then(r => r.json());
              if (!ex.success) throw new Error(ex.message || 'Connection failed.');
              const d = ex.data || {};
              setMsg(`Connected ${metadata?.institution?.name || 'your bank'} — ${d.accounts || 0} account${d.accounts === 1 ? '' : 's'}, ${d.imported || 0} transaction${d.imported === 1 ? '' : 's'} imported${d.autoCategorized ? `, ${d.autoCategorized} auto-categorized` : ''}.`);
              await loadAccounts();
            } catch (err) { setMsg(err.message || 'Connection failed.'); }
            resolve();
          },
          onExit: (err) => {
            try { localStorage.removeItem('plaid_link_token'); } catch {}
            if (err) setMsg(err.display_message || err.error_message || 'Bank connection was cancelled.');
            resolve();
          },
        });
        handler.open();
      });
    } catch (e) { setMsg(e.message || 'Could not connect your bank.'); }
    setConnecting(false);
  }

  // Refresh transactions from the bank (all connected banks, or just one item).
  async function syncBank(itemId) {
    setSyncing(true); setMsg('Syncing…');
    try {
      const opts = { method: 'POST', headers };
      if (itemId) opts.body = JSON.stringify({ itemId });
      const r = await fetch(`${API}/orgs/${orgId}/plaid/sync`, opts).then(r => r.json());
      if (r.success) {
        const d = r.data || {};
        setMsg(`Sync complete — ${d.imported || 0} new, ${d.updated || 0} updated${d.autoCategorized ? `, ${d.autoCategorized} auto-categorized` : ''}.`);
        await loadAccounts();
        await loadTxns(activeId);
      } else setMsg(r.message || 'Sync failed.');
    } catch (e) { setMsg('Sync failed.'); }
    setSyncing(false);
  }

  // ── Drag-to-reorder the account cards ──
  // Save the new order to the server so it sticks (per company). Order is cosmetic,
  // so a failed save is silently ignored — the cards still show the new order locally.
  async function saveAccountOrder(ordered) {
    try {
      await fetch(`${API}/orgs/${orgId}/banking/accounts/reorder`, {
        method: 'PATCH', headers, body: JSON.stringify({ orderedIds: ordered.map(a => a.id) }),
      });
    } catch (e) { /* ignore — order is a convenience */ }
  }
  function moveAccount(from, to) {
    if (from == null || to == null || from === to) return;
    setAccounts(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      saveAccountOrder(next);
      return next;
    });
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

  // ── Statement PDF import (AI reader) ──
  // Send the PDF to the backend, which asks Claude to pull out the purchases as
  // { date, description, amount } rows. The rows then drop into the SAME import
  // review modal the CSV/.qbo flow uses — review, then import (which de-dupes).
  function onPdfFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!activeId) { setMsg('Pick an account above first, then import a statement.'); return; }
    setParsingPdf(true);
    setMsg('Reading your statement… this takes a few seconds.');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;   // strip the data: prefix
        const r = await fetch(`${API}/orgs/${orgId}/ai/parse-statement`, {
          method: 'POST', headers, body: JSON.stringify({ pdfBase64: base64 }),
        }).then(r => r.json());
        if (r.success) {
          const rows = r.data?.transactions || [];
          if (!rows.length) { setMsg('No purchases were found in that statement. If it’s a scanned image, try a clearer copy.'); }
          else { setImportData({ preParsed: true, parsedRows: rows.map((r, i) => ({ ...r, _id: `s${Date.now()}_${i}` })), source: 'ai' }); setMsg(''); }
        } else {
          setMsg(r.message || 'Could not read that statement.');
        }
      } catch (err) { setMsg('Could not read that statement.'); }
      setParsingPdf(false);
    };
    reader.onerror = () => { setMsg('Could not read that file.'); setParsingPdf(false); };
    reader.readAsDataURL(file);
  }

  // ── Venmo / Cash App import (AI reader) ──
  // Accepts a CSV export (most common) or a PDF. AI parses it into clean transactions
  // and decodes the cryptic username/note lines into readable payees, then drops them
  // into the same review-and-import flow as statements.
  function onVenmoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!activeId) { setMsg('Pick an account above first, then import.'); return; }
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    setParsingVenmo(true);
    setMsg('Reading your Venmo / Cash App export… this takes a few seconds.');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        let body;
        if (isPdf) {
          const result = String(reader.result || '');
          body = { pdfBase64: result.includes(',') ? result.split(',')[1] : result, source: 'venmo' };
        } else {
          body = { csvText: String(reader.result || ''), source: 'venmo' };
        }
        const r = await fetch(`${API}/orgs/${orgId}/ai/parse-statement`, {
          method: 'POST', headers, body: JSON.stringify(body),
        }).then(r => r.json());
        if (r.success) {
          const rows = r.data?.transactions || [];
          if (!rows.length) { setMsg('No transfers were found in that export.'); }
          else { setImportData({ preParsed: true, parsedRows: rows.map((r, i) => ({ ...r, _id: `v${Date.now()}_${i}` })), source: 'venmo' }); setMsg(''); }
        } else {
          setMsg(r.message || 'Could not read that export.');
        }
      } catch (err) { setMsg('Could not read that export.'); }
      setParsingVenmo(false);
    };
    reader.onerror = () => { setMsg('Could not read that file.'); setParsingVenmo(false); };
    if (isPdf) reader.readAsDataURL(file); else reader.readAsText(file);
  }

  // Edit / remove a parsed row in the review step (AI statement & Venmo imports),
  // before anything is imported.
  function setImportRow(i, patch) {
    setImportData(d => {
      const rows = [...(d.parsedRows || [])];
      rows[i] = { ...rows[i], ...patch };
      return { ...d, parsedRows: rows };
    });
  }
  function removeImportRow(i) {
    setImportData(d => ({ ...d, parsedRows: (d.parsedRows || []).filter((_, idx) => idx !== i) }));
  }

  function mappedRows(data) {
    if (data.preParsed) return data.parsedRows
      .filter(r => r.date && !isNaN(new Date(r.date)) && r.amount !== 0)
      .map(r => ({ date: r.date, description: r.description, amount: r.amount, ...(r.payee ? { payee: r.payee } : {}) }));   // keep payee (Venmo), strip edit-only fields
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

  async function categorize(txnId, category, txn, payee) {
    try {
      const body = { category };
      if (payee !== undefined) body.payee = payee;
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}`, {
        method: 'PATCH', headers, body: JSON.stringify(body),
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

  // Save just the payee/vendor name on a transaction (no ledger change).
  async function savePayee(txnId, payee) {
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${txnId}`, {
        method: 'PATCH', headers, body: JSON.stringify({ payee: payee || '' }),
      }).then(r => r.json());
      if (r.success) setTxns(prev => prev.map(t => t.id === txnId ? r.data : t));
    } catch (e) { setMsg('Could not save the payee.'); }
  }

  // QuickBooks-style "Add": post an uncategorized line to the books using the
  // drafted payee + category the user chose on that row.
  async function addTxn(t) {
    const category = catDraft[t.id];
    if (!category) { setMsg('Pick a category before adding.'); return; }
    const payee = payeeDraft[t.id] !== undefined ? payeeDraft[t.id] : (t.payee || '');
    await categorize(t.id, category, t, payee);
    setCatDraft(d => { const n = { ...d }; delete n[t.id]; return n; });
    setPayeeDraft(d => { const n = { ...d }; delete n[t.id]; return n; });
  }

  // ── Manual add (type a transaction in by hand, with optional split) ──
  function openAddTxn() { setTxnForm(emptyTxnForm()); setShowAddTxn(true); }
  const setTxn = (patch) => setTxnForm(f => ({ ...f, ...patch }));
  function setLine(i, patch) {
    setTxnForm(f => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, ...patch } : l) }));
  }
  function addSplitLine() { setTxnForm(f => ({ ...f, lines: [...f.lines, { category: '', amount: '' }] })); }
  function removeSplitLine(i) { setTxnForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) })); }
  // Fill the (first two) split lines with an even half of the total.
  function splitEvenly() {
    const half = round2(toAmount(txnForm.amount) / 2);
    setTxnForm(f => ({ ...f, lines: [
      { ...(f.lines[0] || { category: '' }), amount: half ? String(half) : '' },
      { ...(f.lines[1] || { category: '' }), amount: half ? String(round2(toAmount(f.amount) - half)) : '' },
      ...f.lines.slice(2),
    ] }));
  }

  async function saveManualTxn() {
    if (!activeId) { setMsg('Pick an account first.'); return; }
    const f = txnForm;
    const total = round2(Math.abs(toAmount(f.amount)));
    if (!f.date || !f.description.trim() || !total) { setMsg('Enter a date, a description, and an amount.'); return; }
    const sign = f.direction === 'in' ? 1 : -1;

    let lines;
    if (f.split) {
      const ls = f.lines.filter(l => l.category && toAmount(l.amount) > 0);
      if (ls.length < 2) { setMsg('A split needs at least two lines, each with a category and an amount.'); return; }
      const sum = round2(ls.reduce((s, l) => s + Math.abs(toAmount(l.amount)), 0));
      if (Math.abs(sum - total) > 0.01) {
        setMsg(`Your split lines add up to $${fmtMoney(sum)}, but the total is $${fmtMoney(total)}. They need to match.`);
        return;
      }
      lines = ls.map(l => ({
        amount: round2(sign * Math.abs(toAmount(l.amount))),
        category: l.category,
        description: `${f.description.trim()} (split)`,
      }));
    } else {
      if (!f.category) { setMsg('Pick a category (or turn on Split).'); return; }
      lines = [{ amount: round2(sign * total), category: f.category, description: f.description.trim() }];
    }

    const transactions = lines.map(l => ({
      date: f.date, description: l.description, payee: f.payee.trim(), amount: l.amount, category: l.category,
    }));

    setSavingTxn(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions`, {
        method: 'POST', headers, body: JSON.stringify({ transactions }),
      }).then(r => r.json());
      if (r.success) {
        setShowAddTxn(false); setTxnForm(emptyTxnForm());
        await loadTxns(activeId);
        setMsg(f.split ? `Added as ${r.data.created} split lines.` : 'Transaction added.');
      } else setMsg(r.message || 'Could not add the transaction.');
    } catch (e) { setMsg('Could not add the transaction.'); }
    setSavingTxn(false);
  }

  // ── Split an existing line across categories ──
  // Open with the amounts already split 50/50 (the common duplex rental/property case),
  // so you just pick the two categories and Save. Edit the amounts or re-click
  // "Split 50 / 50" for an uneven split.
  function openSplit(t) {
    setSplitFor(t);
    const tot  = round2(Math.abs(Number(t?.amount || 0)));
    const half = round2(tot / 2);
    setSplitLines([{ category: '', amount: String(half) }, { category: '', amount: String(round2(tot - half)) }]);
  }
  function setSplitLn(i, patch) { setSplitLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l)); }
  function addSplitLn() { setSplitLines(ls => [...ls, { category: '', amount: '' }]); }
  function removeSplitLn(i) { setSplitLines(ls => ls.filter((_, idx) => idx !== i)); }
  function splitExistingEvenly() {
    const tot = round2(Math.abs(Number(splitFor?.amount || 0)));
    const half = round2(tot / 2);
    setSplitLines(ls => [
      { ...(ls[0] || { category: '' }), amount: String(half) },
      { ...(ls[1] || { category: '' }), amount: String(round2(tot - half)) },
      ...ls.slice(2),
    ]);
  }
  async function saveSplit() {
    if (!splitFor) return;
    const tot = round2(Math.abs(Number(splitFor.amount || 0)));
    const ls = splitLines.filter(l => l.category && toAmount(l.amount) > 0);
    if (ls.length < 2) { setMsg('A split needs at least two lines, each with a category and an amount.'); return; }
    const sum = round2(ls.reduce((s, l) => s + Math.abs(toAmount(l.amount)), 0));
    if (Math.abs(sum - tot) > 0.01) {
      setMsg(`Your split lines add up to $${fmtMoney(sum)}, but the transaction is $${fmtMoney(tot)}. They need to match.`);
      return;
    }
    setSavingSplit(true); setMsg('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${activeId}/transactions/${splitFor.id}/split`, {
        method: 'POST', headers, body: JSON.stringify({ lines: ls.map(l => ({ category: l.category, amount: toAmount(l.amount) })) }),
      }).then(r => r.json());
      if (r.success) { setSplitFor(null); await loadTxns(activeId); setMsg(`Split into ${r.data.created} lines.`); }
      else setMsg(r.message || 'Could not split the transaction.');
    } catch (e) { setMsg('Could not split the transaction.'); }
    setSavingSplit(false);
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
    // Confirm first — deleting a transaction can't be undone, and if it's already
    // categorized it also removes the matching entry from the books.
    const t = txns.find(x => x.id === txnId);
    const label  = t ? `"${t.payee || t.description || 'this transaction'}" (${Number(t.amount) >= 0 ? '+' : '−'}$${fmtMoney(Math.abs(Number(t.amount)))})` : 'this transaction';
    const posted = t && t.status === 'categorized';
    const confirmMsg = `Delete ${label}?` + (posted ? ' This also removes it from your books.' : '') + ' This cannot be undone.';
    if (!window.confirm(confirmMsg)) return;
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

  // Split lines (created by the Split button) carry a "(split)" suffix and share the
  // same date + payee + base description. This key lets the register draw one box
  // around each group of sibling split lines so they read as one original charge.
  const SPLIT_BORDER = '#9DB293';
  const SPLIT_BG     = '#F5F8F2';
  const splitKey = (x) => {
    const d = String(x?.description || '');
    if (!/\(split\)\s*$/i.test(d)) return null;
    const base = d.replace(/\s*\(split\)\s*$/i, '').trim().toLowerCase();
    return `${new Date(x.date).toISOString().slice(0, 10)}|${(x.payee || '').trim().toLowerCase()}|${base}`;
  };

  const activeAcct = accounts.find(a => a.id === activeId);
  const uncategorized = txns.filter(t => t.status !== 'categorized' && t.status !== 'matched').length;
  const hasPlaid = accounts.some(a => a.plaidItemId);

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Banking</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>
            Connect your bank for automatic transactions, or import a CSV / .qbo / .qfx file. Categorize once and it posts to your ledger.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {hasPlaid && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => syncBank()} disabled={syncing}>
              ⟳ {syncing ? 'Syncing…' : 'Sync from bank'}
            </button>
          )}
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => fileRef.current?.click()} disabled={!activeId}>
              ⬆ Import statement
            </button>
          )}
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => pdfRef.current?.click()} disabled={!activeId || parsingPdf}>
              ✨ {parsingPdf ? 'Reading…' : 'Import statement PDF'}
            </button>
          )}
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => venmoRef.current?.click()} disabled={!activeId || parsingVenmo}>
              💸 {parsingVenmo ? 'Reading…' : 'Import Venmo / Cash App'}
            </button>
          )}
          {accounts.length > 0 && (
            <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={openAddTxn} disabled={!activeId}>
              ✏ Add transaction
            </button>
          )}
          <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={resyncBooks} disabled={resyncing}
            title="Re-post all categorized transactions to the books — fixes any that didn't make it into reports">
            ⟲ {resyncing ? 'Re-syncing…' : 'Re-sync books'}
          </button>
          <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setShowRules(true)}>
            ⚙ Rules{rules.length ? ` (${rules.length})` : ''}
          </button>
          <button className="btn-secondary" style={{ fontSize: 13, padding: '8px 14px' }} onClick={() => setShowAddAcct(true)}>+ Add manually</button>
          <button className="btn-primary" style={{ fontSize: 13 }} onClick={connectBank} disabled={connecting}>
            🔗 {connecting ? 'Connecting…' : 'Connect a bank'}
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.qbo,.qfx,.ofx,text/csv" style={{ display: 'none' }} onChange={onFile} />
      <input ref={pdfRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={onPdfFile} />
      <input ref={venmoRef} type="file" accept=".csv,text/csv,application/pdf,.pdf" style={{ display: 'none' }} onChange={onVenmoFile} />

      {msg && <div style={{ margin: '10px 0', fontSize: 13, color: 'var(--brand-primary)' }}>{msg}</div>}

      {unposted.length > 0 && (
        <div style={{ margin: '10px 0', padding: '10px 14px', background: '#FFF4EC', border: '1px solid #E8894B', borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#8A3B12' }}>
            ⚠ <strong>{unposted.length}</strong> categorized transaction{unposted.length === 1 ? '' : 's'} {unposted.length === 1 ? 'is' : 'are'} not in your books — their category was renamed or removed. Re-pick a category to post {unposted.length === 1 ? 'it' : 'them'}.
          </span>
          <button onClick={() => setShowUnposted(true)}
            style={{ background: '#C4662B', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12.5, fontWeight: 600, padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Review &amp; fix
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#7A9A7A' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding: 40, marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🏦</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>Connect your bank or add an account manually</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
            Connect your bank to pull transactions automatically, or add an account by hand and import a statement (CSV or .qbo/.qfx).
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={connectBank} disabled={connecting}>🔗 {connecting ? 'Connecting…' : 'Connect a bank'}</button>
            <button className="btn-secondary" onClick={() => setShowAddAcct(true)}>Add manually</button>
          </div>
        </div>
      ) : (
        <>
          {/* Account balance cards (QuickBooks-style) — one per account, running
              horizontally; click to select. "Sync from bank" (top right) refreshes all. */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '16px 2px', margin: '0 0 4px' }}>
            {accounts.map((a, i) => {
              const active = a.id === activeId;
              const bal = Number(a.currentBalance || 0);
              const isDragging   = dragIdx === i;
              const isDropTarget = dragIdx != null && overIdx === i && dragIdx !== i;
              return (
                <button key={a.id} onClick={() => setActiveId(a.id)}
                  draggable
                  onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (overIdx !== i) setOverIdx(i); }}
                  onDrop={(e) => { e.preventDefault(); moveAccount(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  title="Drag to reorder"
                  style={{
                    flex: '0 0 auto', minWidth: 190, maxWidth: 260, textAlign: 'left',
                    cursor: dragIdx != null ? 'grabbing' : 'grab',
                    border: isDropTarget ? '2px dashed var(--brand-primary, #2D4A35)'
                          : active ? '2px solid var(--brand-primary, #2D4A35)' : '1px solid #D4DDCC',
                    borderRadius: 12, padding: '12px 16px', background: '#fff',
                    opacity: isDragging ? 0.4 : 1,
                    boxShadow: (active && !isDropTarget) ? '0 2px 8px rgba(45,74,53,0.12)' : 'none',
                    transition: 'opacity .12s, border-color .12s',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                    {a.plaidItemId ? '🔗 ' : '🏦 '}{a.name}
                  </div>
                  {a.plaidItemId ? (
                    <div style={{ fontSize: 20, fontWeight: 700, color: bal < 0 ? '#A32D2D' : 'var(--color-text-primary)' }}>
                      {bal < 0 ? '−' : ''}${fmtMoney(Math.abs(bal))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-tertiary, #9BB39B)' }}>—</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {a.institutionName || 'Manual import'}{a.mask ? ` ••${a.mask}` : ''}
                  </div>
                </button>
              );
            })}
          </div>
          {accounts.length > 1 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', margin: '0 2px 8px' }}>
              Tip: drag a card to reorder — the order is saved for this company.
            </div>
          )}

          {activeAcct && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                {txns.length} transaction{txns.length === 1 ? '' : 's'}
                {uncategorized > 0 && <span style={{ color: '#854F0B', fontWeight: 600 }}> · {uncategorized} to categorize</span>}
                {activeAcct.plaidItemId && (
                  <span style={{ color: '#0F6E56', fontWeight: 600 }}>
                    {' '}· 🔗 Connected{activeAcct.lastSyncedAt ? ` · synced ${new Date(activeAcct.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {activeAcct.plaidItemId && (
                  <button onClick={() => syncBank(activeAcct.plaidItemId)} disabled={syncing} style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #2D4A35)', fontSize: 12, cursor: 'pointer' }}>{syncing ? 'Syncing…' : '⟳ Sync now'}</button>
                )}
                <button onClick={() => deleteAccount(activeAcct.id)} style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 12, cursor: 'pointer' }}>Delete account</button>
              </div>
            </div>
          )}

          {txns.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 34, marginBottom: 12 }}>📄</div>
              <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>No transactions yet</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 18 }}>
                {activeAcct?.plaidItemId ? 'Sync to pull this account’s latest activity from your bank.' : 'Upload a statement PDF and let AI read it, or import a CSV / .qbo / .qfx file — or add a transaction by hand.'}
              </p>
              {activeAcct?.plaidItemId
                ? <button className="btn-primary" onClick={() => syncBank(activeAcct.plaidItemId)} disabled={syncing}>{syncing ? 'Syncing…' : '⟳ Sync from bank'}</button>
                : (
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={() => pdfRef.current?.click()} disabled={parsingPdf}>✨ {parsingPdf ? 'Reading…' : 'Import statement PDF'}</button>
                    <button className="btn-secondary" onClick={() => fileRef.current?.click()}>⬆ Import statement (CSV / .qbo)</button>
                    <button className="btn-secondary" onClick={openAddTxn}>✏ Add a transaction</button>
                  </div>
                )}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #D4DDCC' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A', width: 90 }}>Date</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A' }}>Description</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A', width: 150 }}>Payee / vendor</th>
                    <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 500, color: '#7A9A7A', width: 110 }}>Amount</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, color: '#7A9A7A', width: 300 }}>Category</th>
                    <th style={{ width: 34 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((t, idx) => {
                    const inflow = Number(t.amount) > 0;
                    // Outline a contiguous group of sibling split lines (they're adjacent
                    // because the register is sorted by date). Top border on the first of
                    // the group, bottom on the last, side borders on the edge cells.
                    const key   = splitKey(t);
                    const isSplit = !!key;
                    const isTop = isSplit && key !== splitKey(txns[idx - 1]);
                    const isBot = isSplit && key !== splitKey(txns[idx + 1]);
                    const sideL = isSplit ? { borderLeft: `2px solid ${SPLIT_BORDER}` } : null;
                    const sideR = isSplit ? { borderRight: `2px solid ${SPLIT_BORDER}` } : null;
                    return (
                      <tr key={t.id} style={{
                        background: isSplit ? SPLIT_BG : undefined,
                        borderTop: isTop ? `2px solid ${SPLIT_BORDER}` : undefined,
                        borderBottom: isBot ? `2px solid ${SPLIT_BORDER}` : '0.5px solid #EBF2E8',
                      }}>
                        <td style={{ padding: '9px 16px', color: '#7A9A7A', whiteSpace: 'nowrap', ...sideL }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td style={{ padding: '9px 16px' }}>{t.description}</td>
                        <td style={{ padding: '6px 16px' }}>
                          {t.status === 'matched' ? (
                            <span style={{ color: '#7A9A7A' }}>{t.payee || '—'}</span>
                          ) : (
                            <input
                              value={payeeDraft[t.id] !== undefined ? payeeDraft[t.id] : (t.payee || '')}
                              onChange={(e) => setPayeeDraft(d => ({ ...d, [t.id]: e.target.value }))}
                              onBlur={(e) => { if ((t.payee || '') !== e.target.value) savePayee(t.id, e.target.value); }}
                              placeholder="Payee / vendor"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #D4DDCC', borderRadius: 6, fontSize: 12.5, boxSizing: 'border-box', background: '#fff', color: 'var(--color-text-primary)' }}
                            />
                          )}
                        </td>
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
                          ) : t.status === 'categorized' ? (
                            // Already added to the books — changing the category re-posts immediately.
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', background: '#E1F5EE', padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>✓ Added</span>
                              <CategoryPicker value={t.category || ''} options={sortedChart}
                                onPick={(name) => categorize(t.id, name, t)}
                                warn={!!t.category && !chart.some(a => (a.name || '').toLowerCase() === String(t.category).toLowerCase())} />
                              <button onClick={() => openSplit(t)} title="Split this charge across two or more categories (e.g. rental vs. property)"
                                style={{ background: 'none', border: 'none', color: 'var(--brand-primary, #2D4A35)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Split</button>
                            </div>
                          ) : (
                            // Uncategorized: pick a category, then click Add to post it.
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CategoryPicker value={catDraft[t.id] || ''} options={sortedChart}
                                onPick={(name) => setCatDraft(d => ({ ...d, [t.id]: name }))} />
                              <button onClick={() => addTxn(t)} disabled={!catDraft[t.id]}
                                title={catDraft[t.id] ? 'Add this transaction to the books' : 'Pick a category first'}
                                style={{ background: catDraft[t.id] ? 'var(--brand-primary, #2D4A35)' : '#9BB39B', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 12px', cursor: catDraft[t.id] ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>Add</button>
                              <button onClick={() => openMatch(t)} title="Match to an invoice, bill, or expense you already entered"
                                style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 6, color: 'var(--brand-primary, #2D4A35)', fontSize: 11, padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Match</button>
                              <button onClick={() => openSplit(t)} title="Split this charge across two or more categories (e.g. rental vs. property)"
                                style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 6, color: 'var(--brand-primary, #2D4A35)', fontSize: 11, padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Split</button>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 8px', textAlign: 'center', ...sideR }}>
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

      {/* Add transaction (manual entry, with optional split) modal */}
      {showAddTxn && (() => {
        const total    = round2(Math.abs(toAmount(txnForm.amount)));
        const splitSum = round2(txnForm.lines.reduce((s, l) => s + Math.abs(toAmount(l.amount)), 0));
        const matches  = total > 0 && Math.abs(splitSum - total) < 0.01;
        const catOpts  = sortedChart.map(a => <option key={a.id} value={a.name}>{a.code} · {a.name}</option>);
        const pill = (active) => ({
          flex: 1, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          border: active ? '2px solid var(--brand-primary, #2D4A35)' : '1px solid #D4DDCC',
          background: active ? '#EBF2E8' : '#fff', color: active ? 'var(--brand-primary, #2D4A35)' : '#5E6B62',
        });
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: 540, maxWidth: '95vw', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Add transaction</h2>
              <button onClick={() => setShowAddTxn(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 12.5, color: '#7A9A7A', lineHeight: 1.5, marginBottom: 16 }}>
              Type a transaction into <strong>{activeAcct?.name || 'this account'}</strong> by hand. Turn on <strong>Split</strong> to divide one charge across categories — for example rental vs. property.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>DATE</label>
                <input type="date" value={txnForm.date} onChange={e => setTxn({ date: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>PAYEE / VENDOR (optional)</label>
                <input value={txnForm.payee} onChange={e => setTxn({ payee: e.target.value })} placeholder="Lowe's" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <input value={txnForm.description} onChange={e => setTxn({ description: e.target.value })} placeholder="Lowe's Home Improvement" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-end' }}>
              <div style={{ flex: 1.3 }}>
                <label style={labelStyle}>DIRECTION</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => setTxn({ direction: 'out' })} style={pill(txnForm.direction === 'out')}>Money out</button>
                  <button type="button" onClick={() => setTxn({ direction: 'in' })} style={pill(txnForm.direction === 'in')}>Money in</button>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>AMOUNT</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7A9A7A', fontSize: 14 }}>$</span>
                  <input value={txnForm.amount} onChange={e => setTxn({ amount: e.target.value })} inputMode="decimal" placeholder="267.04"
                    style={{ ...inputStyle, paddingLeft: 22 }} />
                </div>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#3C473A', marginBottom: 14, cursor: 'pointer' }}>
              <input type="checkbox" checked={txnForm.split} onChange={e => setTxn({ split: e.target.checked })} />
              Split this charge across categories (e.g. rental vs. property)
            </label>

            {!txnForm.split ? (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>CATEGORY</label>
                <div style={{ display: 'flex' }}>
                  <CategoryPicker value={txnForm.category} options={sortedChart} onPick={(name) => setTxn({ category: name })} />
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid #EBF2E8', borderRadius: 10, padding: 14, marginBottom: 16, background: '#FBFCFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#5E6B62' }}>Split lines</span>
                  <button type="button" onClick={splitEvenly} disabled={!total}
                    style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 6, color: total ? 'var(--brand-primary,#2D4A35)' : '#9BB39B', fontSize: 12, padding: '4px 10px', cursor: total ? 'pointer' : 'default' }}>
                    Split 50 / 50
                  </button>
                </div>
                {txnForm.lines.map((l, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 2, minWidth: 0, display: 'flex' }}>
                      <CategoryPicker value={l.category} options={sortedChart} onPick={(name) => setLine(i, { category: name })} />
                    </div>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7A9A7A', fontSize: 13 }}>$</span>
                      <input value={l.amount} onChange={e => setLine(i, { amount: e.target.value })} inputMode="decimal" placeholder="0.00"
                        style={{ ...inputStyle, paddingLeft: 20 }} />
                    </div>
                    {txnForm.lines.length > 2
                      ? <button type="button" onClick={() => removeSplitLine(i)} title="Remove line" style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 16, cursor: 'pointer', width: 20 }}>×</button>
                      : <span style={{ width: 20 }} />}
                  </div>
                ))}
                <button type="button" onClick={addSplitLine} style={{ background: 'none', border: 'none', color: 'var(--brand-primary,#2D4A35)', fontSize: 12.5, cursor: 'pointer', padding: '2px 0' }}>+ Add another line</button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EBF2E8', fontSize: 13 }}>
                  <span style={{ color: '#5E6B62' }}>Lines add up to</span>
                  <span style={{ fontWeight: 700, color: matches ? '#0F6E56' : '#A32D2D' }}>
                    ${fmtMoney(splitSum)}{total ? ` of $${fmtMoney(total)}` : ''}{total && !matches ? ' — must match' : ''}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddTxn(false)} disabled={savingTxn} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveManualTxn} disabled={savingTxn}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#2D4A35', color: '#A8D4A8', cursor: savingTxn ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                {savingTxn ? 'Adding…' : (txnForm.split ? 'Add split transaction' : 'Add transaction')}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Split an existing line across categories */}
      {splitFor && (() => {
        const tot     = round2(Math.abs(Number(splitFor.amount || 0)));
        const sum     = round2(splitLines.reduce((s, l) => s + Math.abs(toAmount(l.amount)), 0));
        const readyLines = splitLines.filter(l => l.category && toAmount(l.amount) > 0).length;
        const matches = tot > 0 && Math.abs(sum - tot) < 0.01 && readyLines >= 2;
        const catOpts = sortedChart.map(a => <option key={a.id} value={a.name}>{a.code} · {a.name}</option>);
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 115, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 26, width: 520, maxWidth: '95vw', maxHeight: '92vh', overflow: 'visible' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Split transaction</h2>
              <button onClick={() => setSplitFor(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 13, color: '#333', marginBottom: 2 }}>{splitFor.description}</div>
            <div style={{ fontSize: 13, color: '#7A9A7A', marginBottom: 12 }}>
              {new Date(splitFor.date).toLocaleDateString('en-US')} · ${fmtMoney(tot)}
            </div>
            <p style={{ fontSize: 12.5, color: '#7A9A7A', lineHeight: 1.5, marginBottom: 14 }}>
              Divide this charge across categories — for example Rental Expense and Property Expense. The lines must add up to <strong>${fmtMoney(tot)}</strong>. This replaces the single line with the split lines.
            </p>

            <div style={{ border: '1px solid #EBF2E8', borderRadius: 10, padding: 14, marginBottom: 16, background: '#FBFCFA' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                <button type="button" onClick={splitExistingEvenly}
                  style={{ background: 'none', border: '1px solid #D4DDCC', borderRadius: 6, color: 'var(--brand-primary,#2D4A35)', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>
                  Split 50 / 50
                </button>
              </div>
              {splitLines.map((l, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ flex: 2, minWidth: 0, display: 'flex' }}>
                    <CategoryPicker value={l.category} options={sortedChart} onPick={(name) => setSplitLn(i, { category: name })} autoOpen={i === 0} />
                  </div>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#7A9A7A', fontSize: 13 }}>$</span>
                    <input value={l.amount} onChange={e => setSplitLn(i, { amount: e.target.value })} inputMode="decimal" placeholder="0.00"
                      style={{ ...inputStyle, paddingLeft: 20 }} />
                  </div>
                  {splitLines.length > 2
                    ? <button type="button" onClick={() => removeSplitLn(i)} title="Remove line" style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 16, cursor: 'pointer', width: 20 }}>×</button>
                    : <span style={{ width: 20 }} />}
                </div>
              ))}
              <button type="button" onClick={addSplitLn} style={{ background: 'none', border: 'none', color: 'var(--brand-primary,#2D4A35)', fontSize: 12.5, cursor: 'pointer', padding: '2px 0' }}>+ Add another line</button>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EBF2E8', fontSize: 13 }}>
                <span style={{ color: '#5E6B62' }}>Lines add up to</span>
                <span style={{ fontWeight: 700, color: matches ? '#0F6E56' : '#A32D2D' }}>
                  ${fmtMoney(sum)} of ${fmtMoney(tot)}{!matches ? ' — must match' : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setSplitFor(null)} disabled={savingSplit} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={saveSplit} disabled={savingSplit || !matches}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: matches ? '#2D4A35' : '#9BB39B', color: '#A8D4A8', cursor: (savingSplit || !matches) ? 'default' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                {savingSplit ? 'Splitting…' : 'Save split'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

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

      {/* "Not in your books" — fix orphaned (renamed-category) transactions in one place */}
      {showUnposted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 700, maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>Transactions not in your books</h2>
              <button onClick={() => setShowUnposted(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>×</button>
            </div>
            <p style={{ fontSize: 12.5, color: '#7A9A7A', marginBottom: 14, lineHeight: 1.5 }}>
              These were categorized, but their category was later renamed or removed, so they never posted to the books. Pick a current category for each and it posts right away.
            </p>
            {unposted.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#0F6E56', fontSize: 14, fontWeight: 600 }}>✓ All caught up — nothing left to fix.</div>
            ) : (
              <div style={{ overflowY: 'auto', border: '1px solid #EBF2E8', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: '#F6F9F4', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A' }}>Date</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A' }}>Description</th>
                      <th style={{ padding: '7px 10px', textAlign: 'right', color: '#7A9A7A' }}>Amount</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A', width: 240 }}>Pick a category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unposted.map(t => (
                      <tr key={t.id} style={{ borderTop: '0.5px solid #EBF2E8' }}>
                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', color: '#7A9A7A' }}>{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {t.description}
                          <div style={{ fontSize: 11, color: '#A3692B' }}>was: {t.category}</div>
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: Number(t.amount) > 0 ? '#0F6E56' : 'var(--color-text-primary)' }}>
                          {Number(t.amount) > 0 ? '+' : '−'}${fmtMoney(Math.abs(Number(t.amount)))}
                        </td>
                        <td style={{ padding: '7px 10px' }}>
                          <select defaultValue="" onChange={(e) => { if (e.target.value) fixUnposted(t, e.target.value); }}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #D4DDCC', fontSize: 12.5, background: '#fff', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
                            <option value="" disabled>Pick a category…</option>
                            {sortedChart.map(a => <option key={a.id} value={a.name}>{a.code} — {a.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 12, color: '#7A9A7A' }}>{unposted.length} left</span>
              <button onClick={() => setShowUnposted(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #D4DDCC', background: '#fff', cursor: 'pointer', fontSize: 14 }}>Done</button>
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
        const fromVenmo = importData.source === 'venmo';
        const fromAI = importData.source === 'ai' || fromVenmo;
        const preview = allValid.slice(0, fromAI ? 100 : 6);
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
                  {fromVenmo ? (
                    <>Read <strong>{validCount}</strong> transfer{validCount === 1 ? '' : 's'} from your Venmo / Cash App export — names decoded where possible, your own bank transfers skipped. Review and import; after importing, use <strong>AI Categorize</strong> to assign categories. Re-importing the same export won’t create duplicates.</>
                  ) : fromAI ? (
                    <>Read <strong>{validCount}</strong> transaction{validCount === 1 ? '' : 's'} from your statement PDF — purchases and fees only (card payments were skipped). Look them over, then import. Re-importing the same statement won’t create duplicates.</>
                  ) : (
                    <>Read <strong>{validCount}</strong> transaction{validCount === 1 ? '' : 's'} from your bank file (.qbo/.qfx). No column mapping needed — review below and import.</>
                  )}
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

              {fromAI ? (
                // Editable review: fix a description or amount, or drop a row, before importing.
                <>
                  <div style={{ fontSize: 12, color: '#7A9A7A', marginBottom: 6 }}>
                    Review &amp; edit — {validCount} will import. Click a description or amount to fix it, or ✕ to drop a row.
                  </div>
                  <div style={{ border: '1px solid #EBF2E8', borderRadius: 8, overflow: 'auto', maxHeight: '48vh', marginBottom: 18 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead><tr style={{ background: '#F6F9F4', position: 'sticky', top: 0 }}>
                        <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A', width: 78 }}>Date</th>
                        <th style={{ padding: '7px 10px', textAlign: 'left', color: '#7A9A7A' }}>Description</th>
                        <th style={{ padding: '7px 10px', textAlign: 'right', color: '#7A9A7A', width: 110 }}>Amount</th>
                        <th style={{ width: 28 }}></th>
                      </tr></thead>
                      <tbody>
                        {(importData.parsedRows || []).length === 0 ? (
                          <tr><td colSpan={4} style={{ padding: 14, textAlign: 'center', color: '#A32D2D' }}>No rows left.</td></tr>
                        ) : (importData.parsedRows || []).map((r, i) => {
                          const valid = r.date && !isNaN(new Date(r.date)) && Number(r.amount) !== 0;
                          return (
                          <tr key={r._id || i} style={{ borderTop: '0.5px solid #EBF2E8', opacity: valid ? 1 : 0.5 }}>
                            <td style={{ padding: '5px 8px', color: '#7A9A7A', whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
                            <td style={{ padding: '5px 8px' }}>
                              <input defaultValue={r.description}
                                onFocus={e => { e.target.style.border = '1px solid #D4DDCC'; e.target.style.background = '#fff'; }}
                                onBlur={e => { setImportRow(i, { description: e.target.value }); e.target.style.border = '1px solid transparent'; e.target.style.background = 'transparent'; }}
                                style={{ width: '100%', padding: '4px 6px', border: '1px solid transparent', borderRadius: 5, fontSize: 12, background: 'transparent', color: 'var(--color-text-primary)' }} />
                            </td>
                            <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                              <input defaultValue={r.amount} inputMode="decimal" onBlur={e => setImportRow(i, { amount: toAmount(e.target.value) })}
                                style={{ width: 90, padding: '4px 6px', border: '1px solid #EBF2E8', borderRadius: 5, fontSize: 12, textAlign: 'right', color: Number(r.amount) > 0 ? '#0F6E56' : '#333' }} />
                            </td>
                            <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                              <button onClick={() => removeImportRow(i)} title="Drop this row" style={{ background: 'none', border: 'none', color: '#A32D2D', fontSize: 14, cursor: 'pointer' }}>✕</button>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

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
