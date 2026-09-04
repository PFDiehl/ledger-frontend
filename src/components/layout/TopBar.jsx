import { useState } from 'react';
import { useTheme, THEMES } from '../../lib/ThemeContext';
import { useAuth }  from '../../lib/AuthContext';

export default function TopBar({ onLogout, onAI }) {
  const { org, orgs = [], user, selectOrg } = useAuth();
  const { themeId, setTheme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showOrgs, setShowOrgs] = useState(false);

  const initials = user?.fullName?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() ?? 'U';
  const canSwitch = (orgs?.length || 0) > 1;

  return (
    <header className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {org?.logoUrl ? (
          <img src={org.logoUrl} alt={org.brandName || 'Logo'} style={{ height:26, maxWidth:170, objectFit:'contain', display:'block' }} />
        ) : (
          <div className="app-logo" style={{ fontSize:16, fontWeight:600, letterSpacing:'-.03em', color:'var(--brand-logo)' }}>
            {org?.brandName || 'Mountain Top Ledger'}
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

        <button className="icon-btn" aria-label="Search"><i className="ti ti-search" /></button>
        <button className="icon-btn" aria-label="Notifications"><i className="ti ti-bell" /></button>

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
                <a
                  href="mailto:pfd77@pm.me?subject=Mountain%20Top%20Ledger%20support"
                  onClick={() => setShowAccount(false)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left', background:'transparent', color:'var(--color-text-primary)', fontSize:13, textDecoration:'none', boxSizing:'border-box' }}
                >
                  <i className="ti ti-lifebuoy" style={{ fontSize:14 }} /> Contact support
                </a>
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
    </header>
  );
}



