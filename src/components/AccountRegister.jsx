import { useState, useEffect, useMemo } from 'react';
import { MoneyInput, SearchSelect, parseMoney } from './FormFields.jsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const today = () => new Date().toISOString().slice(0, 10);
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// QuickBooks-style account register for a balance-sheet account (Asset, Liability,
// Equity). Shows every entry that touches the account with a running balance, and
// lets you manually enter new items — each a balanced double entry (this account +
// an offsetting account), with a payee and memo. Entries posted automatically from a
// source document (invoice/bill/expense/bank) are read-only here.
export default function AccountRegister({ account, accounts, orgId, token, onClose, onChanged }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // Entry form (also used for editing a manual row).
  const empty = { entryId: null, date: today(), payee: '', reference: '', other: '', memo: '', decrease: '', increase: '' };
  const [form, setForm] = useState(empty);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Offsetting-account options: every account except the one we're viewing.
  const otherOpts = useMemo(
    () => (accounts || []).filter(a => a.id !== account.id).map(a => ({ id: a.id, code: a.code, name: a.name })),
    [accounts, account.id]
  );
  const idByName = useMemo(() => {
    const m = {}; for (const a of accounts || []) m[a.name] = a.id; return m;
  }, [accounts]);

  async function load() {
    setLoading(true); setErr('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/accounts/${account.id}/register`, { headers }).then(x => x.json());
      if (r.success) setData(r.data);
      else setErr(r.message || 'Could not load the register.');
    } catch { setErr('Could not load the register.'); }
    setLoading(false);
  }
  useEffect(() => { load(); setForm(empty); /* eslint-disable-next-line */ }, [account.id]);

  const debitNormal = data?.account?.debitNormal ?? true;
  // Column headers read naturally for the account's side.
  const decLabel = debitNormal ? 'Decrease' : 'Decrease';
  const incLabel = debitNormal ? 'Increase' : 'Increase';

  function startEdit(row) {
    if (!row.editable) return;
    if (row.otherAccount === '-Split-' || !row.otherAccountId) {
      setErr('This entry splits across several accounts — delete it and re-enter, or edit it from the Journal.');
      return;
    }
    setErr('');
    setForm({
      entryId: row.entryId, date: new Date(row.date).toISOString().slice(0, 10),
      payee: row.payee || '', reference: row.reference || '',
      other: row.otherAccount, memo: row.memo || '',
      decrease: row.decrease ? String(row.decrease) : '', increase: row.increase ? String(row.increase) : '',
    });
  }

  async function save() {
    setErr('');
    const inc = parseMoney(form.increase), dec = parseMoney(form.decrease);
    if (inc > 0 && dec > 0) { setErr('Enter an amount in Increase OR Decrease, not both.'); return; }
    const amount = inc > 0 ? inc : dec;
    if (!(amount > 0)) { setErr('Enter an amount in Increase or Decrease.'); return; }
    const offsetId = idByName[form.other];
    if (!offsetId) { setErr('Pick the other account for this entry (where the money came from or went).'); return; }
    const isIncrease = inc > 0;
    // Which side hits THIS account, then the offset gets the opposite side.
    const thisDebit = debitNormal ? isIncrease : !isIncrease;
    const a = Math.round(amount * 100) / 100;
    const lines = [
      { accountId: account.id, debit: thisDebit ? a : 0, credit: thisDebit ? 0 : a, memo: form.memo || null },
      { accountId: offsetId,   debit: thisDebit ? 0 : a, credit: thisDebit ? a : 0, memo: form.memo || null },
    ];
    const body = JSON.stringify({ date: form.date, payee: form.payee, reference: form.reference, memo: form.memo, lines });
    setSaving(true);
    try {
      const url = form.entryId
        ? `${API}/orgs/${orgId}/journal/${form.entryId}`
        : `${API}/orgs/${orgId}/journal`;
      const method = form.entryId ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers, body }).then(x => x.json());
      if (r.success) { setForm(empty); await load(); onChanged?.(); }
      else setErr(r.message || 'Could not save the entry.');
    } catch { setErr('Could not save the entry.'); }
    setSaving(false);
  }

  async function del(row) {
    if (!row.editable) return;
    if (!window.confirm('Delete this entry? This removes it from the books.')) return;
    setSaving(true); setErr('');
    try {
      const r = await fetch(`${API}/orgs/${orgId}/journal/${row.entryId}`, { method: 'DELETE', headers }).then(x => x.json());
      if (r.success) { if (form.entryId === row.entryId) setForm(empty); await load(); onChanged?.(); }
      else setErr(r.message || 'Could not delete the entry.');
    } catch { setErr('Could not delete the entry.'); }
    setSaving(false);
  }

  const rows = data?.rows || [];

  return (
    <div style={overlay}>
      <div style={sheet}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--color-border-tertiary, #EBF2E8)' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{account.name} <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)', fontSize: 13 }}>· register</span></h2>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {account.type}{data ? <> · balance <b style={{ color: 'var(--color-text-primary)' }}>{money(data.closingBalance)}</b></> : ''}
            </div>
          </div>
          <button onClick={onClose} style={xBtn}>×</button>
        </div>

        {/* manual entry form */}
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--color-border-tertiary, #EBF2E8)', background: 'var(--color-background-secondary, #FAFCF9)' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            {form.entryId ? 'Edit entry' : 'Add an entry'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 110px 110px', gap: 10, alignItems: 'start' }}>
            <Lbl t="Date"><input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={input} /></Lbl>
            <Lbl t="Payee"><input value={form.payee} onChange={e => set('payee', e.target.value)} placeholder="Who did you pay / who paid you?" style={input} /></Lbl>
            <Lbl t="Account (other side)"><SearchSelect value={form.other} options={otherOpts} onPick={v => set('other', v)} placeholder="Offsetting account" /></Lbl>
            <Lbl t={decLabel}><MoneyInput value={form.decrease} onChange={v => set('decrease', v)} /></Lbl>
            <Lbl t={incLabel}><MoneyInput value={form.increase} onChange={v => set('increase', v)} /></Lbl>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', gap: 10, alignItems: 'end', marginTop: 10 }}>
            <Lbl t="Ref no."><input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="Optional" style={input} /></Lbl>
            <Lbl t="Memo / description"><input value={form.memo} onChange={e => set('memo', e.target.value)} placeholder="What was this for?" style={input} /></Lbl>
            <div style={{ display: 'flex', gap: 8 }}>
              {form.entryId && <button onClick={() => { setForm(empty); setErr(''); }} style={ghostBtn}>Cancel edit</button>}
              <button onClick={save} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : form.entryId ? 'Save changes' : 'Add entry'}
              </button>
            </div>
          </div>
          {err && <div style={{ marginTop: 10, fontSize: 12.5, color: '#B4472D' }}>{err}</div>}
        </div>

        {/* register table */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading register…</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: 'var(--color-background-primary, #fff)', boxShadow: '0 1px 0 var(--color-border-tertiary, #EBF2E8)' }}>
                  <th style={th}>Date</th><th style={th}>Payee</th><th style={th}>Account</th><th style={th}>Memo</th>
                  <th style={{ ...th, textAlign: 'right' }}>{decLabel}</th><th style={{ ...th, textAlign: 'right' }}>{incLabel}</th>
                  <th style={{ ...th, textAlign: 'right' }}>Balance</th><th style={th}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td} colSpan={6}><span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Opening balance</span></td>
                  <td style={{ ...td, textAlign: 'right', color: 'var(--color-text-secondary)' }}>{money(data?.openingBalance || 0)}</td>
                  <td style={td}></td>
                </tr>
                {rows.length === 0 ? (
                  <tr><td style={{ ...td, color: 'var(--color-text-secondary)' }} colSpan={8}>No entries in this account yet. Add one above.</td></tr>
                ) : rows.map(row => (
                  <tr key={row.entryId} style={{ borderTop: '0.5px solid var(--color-border-tertiary, #EBF2E8)' }}>
                    <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{fmtDate(row.date)}</td>
                    <td style={td}>{row.payee || <span style={{ color: '#B7C6B7' }}>—</span>}</td>
                    <td style={td}>{row.otherAccount}{row.reference ? <span style={{ color: '#9DB39D' }}> · #{row.reference}</span> : ''}</td>
                    <td style={{ ...td, color: 'var(--color-text-secondary)' }}>{row.memo}{!row.editable && <span style={badge} title="Posted automatically from a source document — edit it there">auto</span>}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#A3302A' }}>{row.decrease ? money(row.decrease) : ''}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#0F6E56' }}>{row.increase ? money(row.increase) : ''}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600 }}>{money(row.balance)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {row.editable && (
                        <>
                          <button onClick={() => startEdit(row)} style={linkBtn} title="Edit">Edit</button>
                          <button onClick={() => del(row)} style={{ ...linkBtn, color: '#B4472D' }} title="Delete">Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Lbl({ t, children }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>{t}</label>
      {children}
    </div>
  );
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const sheet = { background: 'var(--color-background-primary, #fff)', color: 'var(--color-text-primary)', borderRadius: 14, width: 1040, maxWidth: '97vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const th = { padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em' };
const td = { padding: '8px 12px', verticalAlign: 'top' };
const input = { width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13 };
const xBtn = { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', lineHeight: 1, color: 'var(--color-text-secondary)' };
const primaryBtn = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--brand-primary, #2D4A35)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const ghostBtn = { padding: '9px 14px', borderRadius: 8, border: '1px solid #D4DDCC', background: 'transparent', color: 'var(--color-text-primary)', fontSize: 13, cursor: 'pointer' };
const linkBtn = { background: 'none', border: 'none', color: 'var(--brand-primary, #2D4A35)', cursor: 'pointer', fontSize: 12, marginLeft: 8 };
const badge = { marginLeft: 8, fontSize: 10, padding: '1px 6px', borderRadius: 6, background: '#EBF2E8', color: '#7A9A7A', textTransform: 'uppercase', letterSpacing: '0.04em' };
