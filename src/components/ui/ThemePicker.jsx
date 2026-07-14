import { useTheme, THEMES } from '../../lib/ThemeContext';
import { useToast } from '../../lib/ToastContext';

function ThemeCard({ theme, active, onSelect }) {
  const [p1, p2, p3, p4] = theme.preview;

  return (
    <button
      onClick={() => onSelect(theme.id)}
      aria-pressed={active}
      style={{
        all:         'unset',
        cursor:      'pointer',
        display:     'flex',
        flexDirection:'column',
        border:      active ? `2px solid ${p1}` : '1.5px solid var(--color-border-tertiary)',
        borderRadius: 12,
        overflow:    'hidden',
        transition:  'all 0.15s',
        position:    'relative',
        background:  'var(--color-background-primary)',
      }}
    >
      {active && (
        <div style={{
          position:'absolute', top:8, right:8,
          width:18, height:18, borderRadius:'50%',
          background: p1,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:10, color:'#fff', fontWeight:700,
          zIndex:1,
        }}>✓</div>
      )}

      {/* Mini app preview */}
      <div style={{ display:'flex', height:80 }}>
        {/* Sidebar */}
        <div style={{ width:22, background:p1, display:'flex', flexDirection:'column', alignItems:'center', padding:'6px 0', gap:4 }}>
          {[p2, p3, p3, p3].map((c, i) => (
            <div key={i} style={{ width:12, height:10, borderRadius:3, background: i===0 ? p2 : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        {/* Main area */}
        <div style={{ flex:1, padding:6, background:'#F8F8F6', display:'flex', flexDirection:'column', gap:4 }}>
          {/* Topbar line */}
          <div style={{ height:8, background:p1, borderRadius:3, marginBottom:2 }} />
          {/* KPI row */}
          <div style={{ display:'flex', gap:3, flex:1 }}>
            <div style={{ flex:1, background:p1, borderRadius:3 }} />
            <div style={{ flex:1, background:'#fff', borderRadius:3, border:'0.5px solid #e8e6df' }} />
            <div style={{ flex:1, background:p3, borderRadius:3, opacity:0.5 }} />
          </div>
          {/* Content row */}
          <div style={{ display:'flex', gap:3, flex:2 }}>
            <div style={{ flex:2, background:'#fff', borderRadius:3, border:'0.5px solid #e8e6df', padding:3 }}>
              <div style={{ height:3, background:p4, borderRadius:1, marginBottom:3 }} />
              <div style={{ height:2, background:'#e8e6df', borderRadius:1, marginBottom:2 }} />
              <div style={{ height:2, background:'#e8e6df', borderRadius:1 }} />
            </div>
            <div style={{ flex:1, background:'#fff', borderRadius:3, border:'0.5px solid #e8e6df' }} />
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding:'10px 12px 10px', borderTop:'0.5px solid var(--color-border-tertiary)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
          <span style={{ fontSize:13, fontWeight:500, color:'var(--color-text-primary)' }}>{theme.name}</span>
          {active && (
            <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20, background: p3, color: p1 }}>
              Active
            </span>
          )}
        </div>
        <div style={{ fontSize:11, color:'var(--color-text-secondary)', lineHeight:1.4 }}>{theme.description}</div>
        {/* Palette dots */}
        <div style={{ display:'flex', gap:4, marginTop:8 }}>
          {theme.preview.map((color, i) => (
            <div key={i} style={{ width:14, height:14, borderRadius:3, background:color, border:'0.5px solid rgba(0,0,0,0.1)' }} />
          ))}
        </div>
      </div>
    </button>
  );
}

export default function ThemePicker() {
  const { themeId, setTheme } = useTheme();
  const toast = useToast();

  function handleSelect(id) {
    setTheme(id);
    toast.success(`Switched to ${THEMES[id].name} theme`);
  }

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>App theme</div>
        <div style={{ fontSize:13, color:'var(--color-text-secondary)', lineHeight:1.5 }}>
          Choose the color palette for your Ledger experience. This is personal — each team member can pick their own.
          Your clients always see your invoices in your business's chosen brand colors.
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}>
        {Object.values(THEMES).map(theme => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            active={themeId === theme.id}
            onSelect={handleSelect}
          />
        ))}
      </div>

      <div style={{
        fontSize:12, color:'var(--color-text-tertiary)',
        display:'flex', alignItems:'center', gap:6,
        padding:'10px 14px', background:'var(--color-background-secondary)',
        borderRadius:8,
      }}>
        <i className="ti ti-info-circle" style={{ fontSize:14, flexShrink:0 }} />
        Theme changes apply instantly and sync across your devices. Invoice PDFs and the customer payment portal use your business's theme, not your personal one.
      </div>
    </div>
  );
}
