import { useState, useEffect, useRef } from 'react';

// Shared form helpers used across Bills, Expenses and Invoices so every
// money field and search box behaves the same way.

// Show $#,###.## for display, but hand the API a clean number it can read.
export const money2 = n => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const parseMoney = v => Number(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')) || 0;

// Amount field with a $ prefix that formats to cents when you click away.
// `value` is the raw form value; `onChange(rawString)` keeps the form in sync.
export function MoneyInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const display = focused
    ? (value ?? '')
    : (value === '' || value == null ? '' : money2(parseMoney(value)));
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A9A7A', fontSize: 13, pointerEvents: 'none' }}>$</span>
      <input inputMode="decimal" value={display} placeholder={placeholder || '0.00'}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '9px 12px 9px 24px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' }} />
    </div>
  );
}

// Type-to-search picker. Pass options as plain strings, {value,label},
// or {id,code,name}. Set allowCustom for fields where a brand-new typed
// value is valid (vendor, customer); the typed text is kept as you go.
export function SearchSelect({ value, options, onPick, placeholder, allowCustom }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const norm = (options || []).map(o => {
    if (typeof o === 'string') return { key: o, label: o, value: o };
    if (o && 'value' in o) return { key: String(o.value), label: o.label ?? String(o.value), value: o.value };
    return { key: o.id, label: o.code ? o.code + ' · ' + o.name : o.name, value: o.name };
  }).filter(o => o.value !== '' && o.value != null);
  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? norm.filter(o => o.label.toLowerCase().includes(ql) || String(o.value).toLowerCase().includes(ql))
    : norm;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={open ? q : (value || '')} placeholder={placeholder || 'Type to search…'} autoComplete="off"
        onFocus={() => { setOpen(true); setQ(allowCustom ? (value || '') : ''); }}
        onChange={e => { const v = e.target.value; setQ(v); setOpen(true); if (allowCustom) onPick(v); }}
        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D4DDCC', fontSize: 13, boxSizing: 'border-box' }} />
      {open && (
        <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #D4DDCC', borderRadius: 8, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '9px 12px', fontSize: 13, color: '#9BB39B' }}>{allowCustom ? 'Keep typing to add a new one' : 'No match'}</div>
          ) : filtered.map(o => (
            <div key={o.key} onMouseDown={() => { onPick(o.value); setQ(o.value); setOpen(false); }}
              onMouseEnter={e => e.currentTarget.style.background = '#F2F7F0'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', color: '#2C3E52' }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
