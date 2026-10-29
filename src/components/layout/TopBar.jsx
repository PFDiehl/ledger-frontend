import { useState, useEffect } from 'react';
import { useTheme, THEMES } from '../../lib/ThemeContext';
import { useAuth }  from '../../lib/AuthContext';
import { api }      from '../../lib/api';

// Quick "jump to a page" destinations for the top-bar search. Each id matches a
// case in App's renderPage(), so selecting one navigates straight there.
const SEARCH_DESTINATIONS = [
  { id:'dashboard', label:'Dashboard',          kw:'home overview' },
  { id:'customers', label:'Customers',          kw:'clients money in' },
  { id:'invoices',  label:'Invoices',           kw:'billing client money in' },
  { id:'expenses',  label:'Expenses',           kw:'receipts spending money out' },
  { id:'bank',      label:'Banking',            kw:'bank feed transactions reconcile plaid' },
  { id:'vendors',   label:'Vendors',            kw:'suppliers money out' },
  { id:'bills',     label:'Bills',              kw:'payables money out' },
  { id:'reports',   label:'Reports',            kw:'profit loss p&l balance sheet cash flow' },
  { id:'coa',       label:'Chart of accounts',  kw:'accounts ledger' },
  { id:'journal',   label:'Journal entries',    kw:'journal adjusting' },
  { id:'budgets',   label:'Budgets',            kw:'budget planning' },
  { id:'recurring', label:'Recurring invoices', kw:'recurring subscriptions' },
  { id:'companies', label:'My companies',       kw:'switch company businesses' },
  { id:'billing',   label:'Billing',            kw:'subscription plan payment' },
  { id:'settings',  label:'Settings',           kw:'company profile team security integrations branding export' },
];

export default function TopBar({ onLogout, onAI, onNavigate }) {
  const { org, orgs = [], user, selectOrg } = useAuth();
  const { themeId, setTheme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showOrgs, setShowOrgs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState(null);     // backend record matches
  const [searching, setSearching] = useState(false);

  const q = query.trim().toLowerCase();
  const term = query.trim();
  const pageResults = q
    ? SEARCH_DESTINATIONS.filter(d => (d.label + ' ' + d.kw).toLowerCase().includes(q))
    : SEARCH_DESTINATIONS;

  // Debounced record search across customers / vendors / invoices / bills / transactions.
  useEffect(() => {
    if (!org?.id || term.length < 2) { setRecords(null); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try { const r = await api.get(`/orgs/${org.id}/search`, { q: term }); setRecords(r?.data || null); }
      catch { setRecords(null); }
      finally { setSearching(false); }
    }, 220);
    return () => clearTimeout(t);
  }, [term, org?.id]);

  const money = n => '$' + Math.abs(Number(n || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Flatten the record groups into a single ordered list of selectable rows, each
  // carrying the nav target + focus payload App needs to open it.
  const recordRows = [];
  if (records) {
    for (const c of records.customers || [])
      recordRows.push({ key: 'c' + c.id, group: 'Customers', title: c.name || c.company || '—', sub: c.company && c.company !== c.name ? c.company : (c.email || ''), nav: 'customers', focus: { focusName: c.name || c.company } });
    for (const v of records.vendors || [])
      recordRows.push({ key: 'v' + v.id, group: 'Vendors', title: v.name || v.company || '—', sub: v.company && v.company !== v.name ? v.company : (v.email || ''), nav: 'vendors', focus: { focusName: v.name || v.company } });
    for (const inv of records.invoices || [])
      recordRows.push({ key: 'i' + inv.id, group: 'Invoices', title: `${inv.invoiceNumber || 'Invoice'} · ${money(inv.total)}`, sub: `${inv.contact?.company || inv.contact?.name || ''}${inv.status ? ' · ' + inv.status : ''}`.trim(), nav: 'invoices', focus: { invoice: inv } });
    for (const b of records.bills || [])
      recordRows.push({ key: 'b' + b.id, group: 'Bills', title: `${b.vendor || 'Bill'} · ${money(b.amount)}`, sub: b.status || '', nav: 'bills', focus: { presetVendor: b.vendor } });
    for (const tx of records.transactions || [])
      recordRows.push({ key: 't' + tx.id, group: 'Transactions', title: `${tx.payee || tx.description || '—'} · ${money(tx.amount)}`, sub: tx.category || (tx.payee && tx.description ? tx.description : ''), nav: 'bank', focus: {} });
  }

  function go(id, focus) { onNavigate?.(id, focus); setShowSearch(false); setQuery(''); setRecords(null); }
  function selectFirst() {
    if (recordRows[0]) go(recordRows[0].nav, recordRows[0].focus);
    else if (q && pageResults[0]) go(pageResults[0].id);
  }

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() ?? 'U';
  const canSwitch = (orgs?.length || 0) > 1;

  return (
    <header className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {org?.logoUrl ? (
          <img src={org.logoUrl} alt={org.brandName || 'Logo'} style={{ height:26, maxWidth:170, objectFit:'contain', display:'block' }} />
        ) : (
          <div className="app-logo" style={{ fontSize:16, fontWeight:600, letterSpacing:'-.03em', color:'var(--brand-logo)' }}>
            {org?.brandName || 'MountainTop Ledger'}
          </div>
        )}
        {org && (
          <div style={{ position:'relative' }}>
            <div className="org-pill"
              onClick={canSwitch ? () => setShowOrgs(s => !s) : undefined}
              style={{ cursor: canSwitch ? 'pointer' : 'default' }}
              title={canSwitch ? 'Switch company' : undefined}>
              {org.name}
              {canSwitch && <i className="ti ti-chevron-down" style={{ fontSize:11, marginLeft:3 }} />}
            </div>
            {canSwitch && showOrgs && (
              <>
                <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setShowOrgs(false)} />
                <div style={{
                  position:'absolute', top:'calc(100% + 8px)', left:0,
                  background:'var(--color-background-primary)',
                  border:'0.5px solid var(--color-border-secondary)',
                  borderRadius:12, padding:6, zIndex:100,
                  boxShadow:'0 8px 24px rgba(0,0,0,0.10)', width:240, maxHeight:340, overflowY:'auto',
                }}>
                  <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', padding:'6px 10px 4px' }}>
                    Switch company
                  </div>
                  {orgs.map(o => (
                    <button key={o.id}
                      onClick={() => { if (o.id !== org.id) selectOrg?.(o); setShowOrgs(false); }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
                        background: o.id === org.id ? 'var(--color-background-secondary)' : 'transparent', color:'var(--color-text-primary)', fontSize:13 }}>
                      <span style={{ flex:1 }}>{o.name}</span>
                      {o.role && <span style={{ fontSize:10, color:'var(--color-text-tertiary)', textTransform:'capitalize' }}>{o.role}</span>}
                      {o.id === org.id && <i className="ti ti-check" style={{ fontSize:13, color:'var(--brand-primary)' }} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {/* AI assistant button hidden until AI features are built for real and
            cleared for QuickBooks data handling. Flip `false` to re-enable. */}
        {false && onAI && (
          <button className="icon-btn" onClick={onAI} aria-label="AI assistant" title="AI financial assistant">
            <i className="ti ti-sparkles" />
          </button>
        )}

        {/* Theme switcher */}
        <div style={{ position:'relative' }}>
          <button
            className="icon-btn"
            onClick={() => setShowThemes(s => !s)}
            aria-label="Change theme"
            title="Change theme"
          >
            <i className="ti ti-palette" />
          </button>

          {showThemes && (
            <>
              {/* Backdrop */}
              <div
                style={{ position:'fixed', inset:0, zIndex:99 }}
                onClick={() => setShowThemes(false)}
              />
              {/* Dropdown */}
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', right:0,
                background:'var(--color-background-primary)',
                border:'0.5px solid var(--color-border-secondary)',
                borderRadius:12, padding:12, zIndex:100,
                boxShadow:'0 8px 24px rgba(0,0,0,0.10)',
                width:220,
              }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', marginBottom:8, padding:'0 2px' }}>
                  App theme
                </div>
                {Object.values(THEMES).map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id); setShowThemes(false); }}
                    style={{
                      width:'100%', display:'flex', alignItems:'center', gap:10,
                      padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
                      background: themeId === theme.id ? 'var(--color-background-secondary)' : 'transparent',
                    }}
                  >
                    {/* Palette preview dots */}
                    <div style={{ display:'flex', gap:3, flexShrink:0 }}>
                      {theme.preview.slice(0,3).map((color, i) => (
                        <div key={i} style={{ width:12, height:12, borderRadius:3, background:color, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight: themeId===theme.id ? 500 : 400, color:'var(--color-text-primary)' }}>
                        {theme.name}
                      </div>
                    </div>
                    {themeId === theme.id && (
                      <i className="ti ti-check" style={{ fontSize:13, color:'var(--brand-primary)', flexShrink:0 }} />
                    )}
                  </button>
                ))}
                <div style={{ borderTop:'0.5px solid var(--color-border-tertiary)', marginTop:8, paddingTop:8 }}>
                  <button
                    onClick={() => { setShowThemes(false); }}
                    style={{ width:'100%', fontSize:11, color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:'4px 10px', display:'flex', alignItems:'center', gap:6 }}
                  >
                    <i className="ti ti-settings" style={{ fontSize:12 }} />
                    More options in Settings
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <button className="icon-btn" aria-label="Search" title="Search" onClick={() => setShowSearch(true)}><i className="ti ti-search" /></button>
        {/* Notifications bell hidden until there are real events to surface. Flip `false` to re-enable. */}
        {false && (
          <button className="icon-btn" aria-label="Notifications"><i className="ti ti-bell" /></button>
        )}

        <div style={{ position:'relative' }}>
          <div
            style={{
              width:28, height:28, borderRadius:'50%',
              background:'var(--brand-accent-light)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:500, color:'var(--brand-primary)',
              cursor:'pointer', border:'0.5px solid var(--color-border-secondary)',
            }}
            onClick={() => setShowAccount(s => !s)}
            title="Account"
          >
            {initials}
          </div>

          {showAccount && (
            <>
              <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setShowAccount(false)} />
              <div style={{
                position:'absolute', top:'calc(100% + 8px)', right:0,
                background:'var(--color-background-primary)',
                border:'0.5px solid var(--color-border-secondary)',
                borderRadius:12, padding:8, zIndex:100,
                boxShadow:'0 8px 24px rgba(0,0,0,0.10)', width:210,
              }}>
                <div style={{ padding:'8px 10px', borderBottom:'0.5px solid var(--color-border-tertiary)', marginBottom:4 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--color-text-primary)' }}>{user?.fullName || 'Account'}</div>
                  {user?.email && <div style={{ fontSize:11, color:'var(--color-text-tertiary)', marginTop:1 }}>{user.email}</div>}
                </div>
                <button
                  onClick={() => { setShowAccount(false); onNavigate?.('help'); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:'transparent', color:'var(--color-text-primary)', fontSize:13, boxSizing:'border-box' }}
                >
                  <i className="ti ti-help" style={{ fontSize:14 }} /> Help Center
                </button>
                <button
                  onClick={() => { setShowAccount(false); onNavigate?.('support'); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:'transparent', color:'var(--color-text-primary)', fontSize:13, boxSizing:'border-box' }}
                >
                  <i className="ti ti-lifebuoy" style={{ fontSize:14 }} /> Contact support
                </button>
                <button
                  onClick={() => { setShowAccount(false); onLogout?.(); }}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:'transparent', color:'var(--color-text-primary)', fontSize:13 }}
                >
                  <i className="ti ti-logout" style={{ fontSize:14 }} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showSearch && (
        <div onClick={() => { setShowSearch(false); setQuery(''); }}
          style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'80px 16px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width:'min(520px, 100%)', background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-secondary)', borderRadius:14, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'0.5px solid var(--color-border-tertiary)' }}>
              <i className="ti ti-search" style={{ fontSize:18, color:'var(--color-text-tertiary)' }} />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setQuery(''); setRecords(null); } if (e.key === 'Enter') selectFirst(); }}
                placeholder="Search customers, invoices, vendors, pages…"
                style={{ flex:1, border:'none', outline:'none', background:'transparent', fontSize:15, color:'var(--color-text-primary)' }} />
              <kbd style={{ fontSize:10, color:'var(--color-text-tertiary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:4, padding:'1px 5px' }}>Esc</kbd>
            </div>
            <div style={{ maxHeight:400, overflowY:'auto', padding:6 }}>
              {/* Matching records */}
              {term.length >= 2 && (
                <>
                  {searching && recordRows.length === 0 && (
                    <div style={{ padding:'10px 12px', fontSize:12.5, color:'var(--color-text-tertiary)' }}>Searching records…</div>
                  )}
                  {(() => {
                    let last = null; const out = [];
                    recordRows.forEach((r, idx) => {
                      if (r.group !== last) {
                        out.push(
                          <div key={'h' + r.group} style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', padding:'8px 12px 4px' }}>{r.group}</div>
                        );
                        last = r.group;
                      }
                      out.push(
                        <button key={r.key} onClick={() => go(r.nav, r.focus)}
                          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background: idx === 0 ? 'var(--color-background-secondary)' : 'transparent', color:'var(--color-text-primary)' }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.title}</div>
                            {r.sub && <div style={{ fontSize:11.5, color:'var(--color-text-tertiary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textTransform:'capitalize' }}>{r.sub}</div>}
                          </div>
                          <i className="ti ti-corner-down-left" style={{ fontSize:12, color:'var(--color-text-tertiary)', flexShrink:0 }} />
                        </button>
                      );
                    });
                    return out;
                  })()}
                  {!searching && records && recordRows.length === 0 && (
                    <div style={{ padding:'10px 12px', fontSize:12.5, color:'var(--color-text-tertiary)' }}>No records match “{term}”.</div>
                  )}
                </>
              )}

              {/* Pages */}
              {pageResults.length > 0 && (
                <>
                  <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--color-text-tertiary)', padding:'8px 12px 4px' }}>Pages</div>
                  {pageResults.map(d => (
                    <button key={d.id} onClick={() => go(d.id)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:'transparent', color:'var(--color-text-primary)', fontSize:14 }}>
                      <i className="ti ti-arrow-right" style={{ fontSize:14, color:'var(--color-text-tertiary)' }} />
                      {d.label}
                    </button>
                  ))}
                </>
              )}

              {pageResults.length === 0 && recordRows.length === 0 && !searching && term.length >= 2 && (
                <div style={{ padding:'16px', fontSize:13, color:'var(--color-text-tertiary)' }}>No matches for “{query}”.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}



