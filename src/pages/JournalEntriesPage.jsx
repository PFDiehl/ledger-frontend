import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const today = new Date().toISOString().slice(0, 10);

function getAuth() {
  const org = JSON.parse(localStorage.getItem('ledger_org') || '{}');
  const token = localStorage.getItem('accessToken');
  return { orgId: org.id, token };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const blankLine = () => ({ accountId: '', debit: '', credit: '' });

export default function JournalEntriesPage() {
  const { orgId, token } = getAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

  const [entries, setEntries]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [msg, setMsg]           = useState('');

  const [head, setHead]   = useState({ date: today, reference: '', memo: '' });
  const [lines, setLines] = useState([blankLine(), blankLine()]);

  async function load() {
    setLoading(true);
    try {
      const [e, a] = await Promise.all([
        fetch(`${API}/orgs/${orgId}/journal`, { headers }).then(r => r.json()),
        fetch(`${API}/orgs/${orgId}/accounts`, { headers }).then(r => r.json()),
      ]);
      setEntries(e.data || []);
      setAccounts(a.data || []);
    } catch (err) { setMsg('Could not load journal entries.'); }
    setLoading(false);
  }
  useEffect(() => { if (orgId) load(); }, [orgId]);

  async function syncInvoices() {
    setSyncing(true); setMsg('');
    try {
      // Backfill every source document into the ledger: invoices, expenses, bills.
      let total = 0;
      for (const kind of ['invoices', 'expenses', 'bills']) {
        const r = await fetch(`${API}/orgs/${orgId}/journal/sync-${kind}`, { method: 'POST', headers });
        const j = await r.json();
        if (j.success) total += (j.data?.synced || 0);
      }
      await load();
      setMsg(`Posted ${total} source document${total === 1 ? '' : 's'} (invoices, expenses, bills) to the ledger.`);
    } catch (e) { setMsg('Could not post to the ledger.'); }
    setSyncing(false);
  }

  function openNew() {
    setHead({ date: today, reference: '', memo: '' });
    setLines([blankLine(), blankLine()]);
    setMsg('');
    setShowForm(true);
  }

  function setLine(i, key, val) {
    setLines(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      // Entering a debit clears the credit on that line, and vice-versa.
      if (key === 'debit'  && val)  return { ...l, debit: val, credit: '' };
      if (key === 'credit' && val)  return { ...l, credit: val, debit: '' };
      return { ...l, [key]: val };
    }));
  }
  const addLine = () => setLines(ls => [...ls, blankLine()]);
  const removeLine = (i) => setLines(ls => ls.length > 2 ? ls.filter((_, idx) => idx !== i) : ls);

  const totalDebit  = round2(lines.reduce((s, l) => s + (Number(l.debit)  || 0), 0));
  const totalCredit = round2(lines.reduce((s, l) => s + (Number(l.credit) || 0), 0));
  const diff        = round2(totalDebit - totalCredit);
  const balanced    = diff === 0 && totalDebit > 0;

  async function save() {
    if (!balanced) { setMsg('Debits must equal credits, and the total must be more than zero.'); return; }
    setSaving(true); setMsg('');
    try {
      const body = {
        date: head.date, reference: head.reference, memo: head.memo,
        lines: lines
          .filter(l => l.accountId && (Number(l.debit) || Number(l.credit)))
          .map(l => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      };
      const r = await fetch(`${API}/orgs/${orgId}/journal`, { method: 'POST', headers, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.success) { setShowForm(false); await load(); }
      else setMsg(j.message || 'Could not save the entry.');
    } catch (err) { setMsg('Could not save the entry.'); }
    setSaving(false);
  }

  async function del(id) {
    try {
      await fetch(`${API}/orgs/${orgId}/journal/${id}`, { method: 'DELETE', headers });
      await load();
    } catch (err) { /* ignore */ }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">Journal Entries</h1>
          <p style={{ color:'var(--color-text-secondary)', fontSize:13, marginTop:2 }}>
            Manual double-entry postings — every entry must balance (debits = credits).
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={syncInvoices} disabled={syncing}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, cursor:'pointer' }}>
            {syncing ? 'Posting…' : 'Post to ledger'}
          </button>
          <button className="btn-primary" style={{ display:'flex', alignItems:'center', gap:6 }} onClick={openNew}>
            <span>+</span> New entry
          </button>
        </div>
      </div>

      {msg && !showForm && (
        <div style={{ margin:'10px 0', fontSize:13, color:'var(--brand-primary)' }}>{msg}</div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:40, color:'var(--color-text-secondary)' }}>Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="card" style={{ padding:40, marginTop:20, textAlign:'center' }}>
          <p style={{ fontSize:14, color:'var(--color-text-secondary)' }}>
            Set up your <strong>Chart of Accounts</strong> first — journal entries post to those accounts.
          </p>
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding:40, marginTop:20, textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📒</div>
          <p style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>No journal entries yet</p>
          <p style={{ fontSize:13, color:'var(--color-text-secondary)', marginBottom:20 }}>
            Post a manual entry — for example, an owner contribution, a depreciation entry, or a correction.
          </p>
          <button className="btn-primary" onClick={openNew}>Create your first entry</button>
        </div>
      ) : (
        <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:14 }}>
          {entries.map(en => {
            const t = round2(en.lines.reduce((s, l) => s + Number(l.debit || 0), 0));
            return (
              <div key={en.id} className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', padding:'9px 16px 5px' }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:600, fontSize:13 }}>{new Date(en.date).toLocaleDateString('en-US')}</span>
                    {en.reference && <span style={{ fontSize:12, color:'var(--color-text-secondary)', fontFamily:'monospace' }}>{en.reference}</span>}
                    {en.memo && <span style={{ fontSize:13, color:'var(--color-text-secondary)' }}>{en.memo}</span>}
                    <span style={{ fontSize:13, fontWeight:600 }}>${fmt(t)}</span>
                  </div>
                  <button onClick={() => del(en.id)} style={{ background:'none', border:'none', color:'var(--color-text-tertiary, #999)', cursor:'pointer', fontSize:12 }}>Delete</button>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr>
                      <th style={{ padding:'0 16px 3px', width:'55%', borderBottom:'1px solid var(--color-border-tertiary, #EBF2E8)' }}></th>
                      <th style={{ padding:'0 16px 3px', textAlign:'right', fontSize:10, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--color-text-secondary, #5E6B62)', borderBottom:'1px solid var(--color-border-tertiary, #EBF2E8)' }}>Debit</th>
                      <th style={{ padding:'0 16px 3px', textAlign:'right', fontSize:10, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'var(--color-text-secondary, #5E6B62)', borderBottom:'1px solid var(--color-border-tertiary, #EBF2E8)' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {en.lines.map(l => (
                      <tr key={l.id} style={{ borderBottom:'0.5px solid var(--color-border-tertiary, #F2F5EF)' }}>
                        <td style={{ padding:'5px 16px', width:'55%' }}>
                          <span style={{ fontFamily:'monospace', color:'var(--color-text-secondary)', marginRight:8 }}>{l.account?.code}</span>
                          {l.account?.name}
                        </td>
                        <td style={{ padding:'5px 16px', textAlign:'right', color:'var(--color-text-secondary)' }}>{Number(l.debit) > 0 ? `$${fmt(l.debit)}` : ''}</td>
                        <td style={{ padding:'5px 16px', textAlign:'right', color:'var(--color-text-secondary)' }}>{Number(l.credit) > 0 ? `$${fmt(l.credit)}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* New entry modal */}
      {showForm && (
        <div style={overlay} onClick={() => setShowForm(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ fontSize:17, fontWeight:600 }}>New journal entry</h2>
              <button onClick={() => setShowForm(false)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--color-text-secondary)' }}>×</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'160px 160px 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={lbl}>Date</label>
                <input type="date" style={input} value={head.date} onChange={e => setHead(h => ({ ...h, date: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>Reference</label>
                <input style={input} value={head.reference} onChange={e => setHead(h => ({ ...h, reference: e.target.value }))} placeholder="JE-001" />
              </div>
              <div>
                <label style={lbl}>Memo</label>
                <input style={input} value={head.memo} onChange={e => setHead(h => ({ ...h, memo: e.target.value }))} placeholder="Description" />
              </div>
            </div>

            <div style={{ ...gridRow, marginBottom:2 }}>
              <div style={{ ...lbl, marginBottom:0 }}>Account</div>
              <div style={{ ...lbl, marginBottom:0, textAlign:'right' }}>Debit</div>
              <div style={{ ...lbl, marginBottom:0, textAlign:'right' }}>Credit</div>
              <div />
            </div>
            {lines.map((l, i) => (
              <div key={i} style={{ ...gridRow, marginBottom:6 }}>
                <select style={input} value={l.accountId} onChange={e => setLine(i, 'accountId', e.target.value)}>
                  <option value="">Select account…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
                <input type="number" step="0.01" min="0" style={{ ...input, textAlign:'right' }} value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} placeholder="0.00" />
                <input type="number" step="0.01" min="0" style={{ ...input, textAlign:'right' }} value={l.credit} onChange={e => setLine(i, 'credit', e.target.value)} placeholder="0.00" />
                {lines.length > 2
                  ? <button onClick={() => removeLine(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary, #aaa)', fontSize:18, lineHeight:1 }}>×</button>
                  : <span />}
              </div>
            ))}
            <div style={{ ...gridRow, marginTop:8, paddingTop:8, borderTop:'1px solid var(--color-border-secondary, #D4DDCC)' }}>
              <button onClick={addLine} style={{ background:'none', border:'none', color:'var(--brand-primary)', cursor:'pointer', fontSize:13, textAlign:'left', padding:0 }}>+ Add line</button>
              <div style={{ textAlign:'right', fontWeight:600 }}>${fmt(totalDebit)}</div>
              <div style={{ textAlign:'right', fontWeight:600 }}>${fmt(totalCredit)}</div>
              <div />
            </div>

            <div style={{ marginTop:10, fontSize:13, fontWeight:600, color: balanced ? '#2D7A4A' : '#B4472D' }}>
              {balanced ? '✓ Balanced' : (totalDebit === 0 && totalCredit === 0 ? 'Enter debits and credits' : `Out of balance by $${fmt(Math.abs(diff))}`)}
            </div>

            {msg && <div style={{ fontSize:12, color:'#B4472D', marginTop:8 }}>{msg}</div>}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
              <button onClick={() => setShowForm(false)} style={btnGhost}>Cancel</button>
              <button className="btn-primary" onClick={save} disabled={saving || !balanced}>{saving ? 'Saving…' : 'Post entry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl     = { fontSize:12, color:'var(--color-text-secondary)', display:'block', marginBottom:4, fontWeight:500 };
const gridRow = { display:'grid', gridTemplateColumns:'1fr 110px 110px 24px', gap:8, alignItems:'center' };
const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 };
const modal   = { background:'var(--color-background-primary, #fff)', borderRadius:14, padding:24, width:640, maxWidth:'94vw', maxHeight:'92vh', overflowY:'auto', boxShadow:'0 12px 40px rgba(0,0,0,0.18)' };
const input   = { width:'100%', boxSizing:'border-box', padding:'8px 10px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', fontSize:13, background:'var(--color-background-primary, #fff)', color:'var(--color-text-primary)' };
const btnGhost = { padding:'8px 16px', borderRadius:8, border:'1px solid var(--color-border-secondary, #D4DDCC)', background:'transparent', color:'var(--color-text-primary)', fontSize:13, cursor:'pointer' };
