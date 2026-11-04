import { useState, useEffect, useMemo } from 'react';

// Find & remove duplicate bank transactions on one account. Groups transactions
// that share the same date + amount (the reliable signature of a true duplicate,
// even when the description differs between a bank feed and a manual import),
// lets the user keep one of each and delete the rest. Deleting a posted
// transaction also clears its ledger entry (handled by the delete endpoint).

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const GREEN = '#2D4A35', INK = '#1F2A24', INK2 = '#5E6B62', INK3 = '#8A968C', LINE = '#E2E8E0', SAGE = '#7A9A7A', RED = '#A32D2D';

const fmt = n => '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = n => (Number(n) < 0 ? '−' : '+') + fmt(n);
const dISO = v => { const d = new Date(v); return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); };
const isPosted = t => t.status === 'categorized' || t.status === 'matched';

export default function DuplicatesModal({ account, orgId, token, onClose, onDone }) {
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const [loading, setLoading]   = useState(true);
  const [txns, setTxns]         = useState([]);
  const [toDelete, setToDelete] = useState(new Set());   // txn ids selected for deletion
  const [busy, setBusy]         = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr]           = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${account.id}/transactions`, { headers }).then(r => r.json());
        if (!cancel) setTxns(r.data || []);
      } catch { if (!cancel) setTxns([]); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line
  }, [account.id]);

  // Group by date + amount; keep only groups with more than one transaction.
  const groups = useMemo(() => {
    const map = new Map();
    for (const t of txns) {
      const d = new Date(t.date);
      const day = isNaN(d.getTime()) ? String(t.date) : d.toISOString().slice(0, 10);
      const amt = Math.round(Number(t.amount || 0) * 100);
      const key = `${day}|${amt}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.values()]
      .filter(g => g.length > 1)
      .sort((a, b) => new Date(b[0].date) - new Date(a[0].date));
  }, [txns]);

  // Default: in each group keep one (prefer a posted copy, else the earliest) and
  // pre-select the rest for deletion. The user can change any of it.
  useEffect(() => {
    const sel = new Set();
    for (const g of groups) {
      const sorted = [...g].sort((a, b) => {
        const pa = isPosted(a) ? 0 : 1, pb = isPosted(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date);
      });
      for (let i = 1; i < sorted.length; i++) sel.add(sorted[i].id);
    }
    setToDelete(sel);
  }, [groups]);

  const toggle = id => setToDelete(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const dupTxnCount = groups.reduce((s, g) => s + g.length, 0);
  const removeCount = toDelete.size;

  async function remove() {
    if (!removeCount || busy) return;
    setBusy(true); setErr(''); setProgress(0);
    const ids = [...toDelete];
    let done = 0, failed = 0;
    for (const id of ids) {
      try {
        const r = await fetch(`${API}/orgs/${orgId}/banking/accounts/${account.id}/transactions/${id}`, { method: 'DELETE', headers }).then(r => r.json());
        if (!r?.success) failed++;
      } catch { failed++; }
      done++; setProgress(done);
    }
    setBusy(false);
    onDone && onDone();
    if (failed) setErr(`Removed ${done - failed} of ${ids.length}. ${failed} couldn't be deleted — close and try again.`);
    else onClose();
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(20,30,24,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 };
  const card = { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 660, maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.22)' };
  const head = { padding: '18px 22px', borderBottom: `1px solid ${LINE}` };
  const bodyS = { padding: '12px 22px', overflowY: 'auto', flex: 1 };
  const foot = { padding: '14px 22px', borderTop: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' };

  return (
    <div style={overlay} onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div style={card}>
        <div style={head}>
          <div style={{ fontSize: 17, fontWeight: 700, color: INK }}>Find &amp; remove duplicates</div>
          <div style={{ fontSize: 13, color: INK2, marginTop: 3 }}>
            {account.name} — transactions that share the same <strong>date and amount</strong>. Keep one of each, remove the extras.
          </div>
        </div>

        <div style={bodyS}>
          {loading ? (
            <div style={{ color: SAGE, fontSize: 14, padding: '26px 0', textAlign: 'center' }}>Scanning…</div>
          ) : groups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '34px 0' }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: GREEN }}>No duplicates found</div>
              <div style={{ fontSize: 13, color: INK2, marginTop: 4 }}>Nothing on this account shares a date and amount.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: INK2, margin: '6px 0 12px' }}>
                Found <strong style={{ color: INK }}>{groups.length}</strong> group{groups.length === 1 ? '' : 's'} ({dupTxnCount} transactions). The copies pre-checked for removal are highlighted — untick any you want to keep.
              </div>
              {groups.map((g, gi) => {
                const keptInGroup = g.filter(t => !toDelete.has(t.id)).length;
                return (
                  <div key={gi} style={{ border: `1px solid ${LINE}`, borderRadius: 10, marginBottom: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F6F9F4', borderBottom: `1px solid ${LINE}` }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{dISO(g[0].date)} · {signed(g[0].amount)}</span>
                      <span style={{ fontSize: 11.5, color: keptInGroup === 0 ? RED : INK3 }}>
                        {g.length} copies · keeping {keptInGroup}{keptInGroup === 0 ? ' ⚠' : ''}
                      </span>
                    </div>
                    {g.map(t => {
                      const del = toDelete.has(t.id);
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderTop: `1px solid #EFF3EE`, cursor: 'pointer', background: del ? '#FDF3F2' : '#fff' }}>
                          <input type="checkbox" checked={del} onChange={() => toggle(t.id)} style={{ marginTop: 3 }} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13.5, color: INK, fontWeight: 500 }}>{t.description || '(no description)'}</span>
                            <span style={{ display: 'block', fontSize: 12, color: INK3, marginTop: 1 }}>
                              {t.payee ? t.payee + ' · ' : ''}
                              {isPosted(t) ? <span style={{ color: '#0F6E56', fontWeight: 600 }}>✓ in your books{t.category ? ` · ${t.category}` : ''}</span> : <span style={{ color: SAGE }}>not categorized</span>}
                            </span>
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: del ? RED : GREEN, whiteSpace: 'nowrap', marginTop: 2 }}>{del ? 'Remove' : 'Keep'}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
              <div style={{ fontSize: 12, color: INK3, marginTop: 4, lineHeight: 1.5 }}>
                Removing a transaction that's in your books also deletes its ledger entry. This can't be undone, so keep one copy of anything real.
              </div>
            </>
          )}
        </div>

        <div style={foot}>
          <span style={{ fontSize: 13, color: busy ? GREEN : INK2 }}>
            {busy ? `Removing… ${progress} of ${removeCount}` : err ? <span style={{ color: RED }}>{err}</span> : removeCount > 0 ? <><strong style={{ color: INK }}>{removeCount}</strong> selected to remove</> : 'Nothing selected'}
          </span>
          <span style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={busy}
              style={{ padding: '9px 16px', borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', color: INK2, fontSize: 13.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer' }}>
              {err ? 'Close' : 'Cancel'}
            </button>
            <button onClick={remove} disabled={busy || removeCount === 0}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: busy || removeCount === 0 ? '#D7B3AE' : RED, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: busy || removeCount === 0 ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Removing…' : `Remove ${removeCount || ''} duplicate${removeCount === 1 ? '' : 's'}`}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
