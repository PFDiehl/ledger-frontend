import { useState } from 'react';

function getUsageLevel() {
  try {
    const used = JSON.parse(localStorage.getItem('usedFeatures') ?? '[]');
    const days = Math.floor((Date.now() - Number(localStorage.getItem('firstActiveAt') ?? Date.now())) / 864e5);
    return { used, days };
  } catch { return { used:[], days:0 }; }
}

function markFeatureUsed(id) {
  try {
    const used = JSON.parse(localStorage.getItem('usedFeatures') ?? '[]');
    if (!used.includes(id)) localStorage.setItem('usedFeatures', JSON.stringify([...used, id]));
    if (!localStorage.getItem('firstActiveAt')) localStorage.setItem('firstActiveAt', String(Date.now()));
  } catch {}
}

const ALL_NAV = [
  { id:'digest',        icon:'home',          label:'Home',           level:0, section:null },
  { id:'invoices',      icon:'file-invoice',  label:'Invoices',       level:0, section:'Money in' },
  { id:'expenses',      icon:'credit-card',   label:'Expenses',       level:0, section:'Money in' },
  { id:'bank',          icon:'building-bank', label:'Banking',        level:0, section:'Money in' },
  { id:'bills',         icon:'receipt',       label:'Bills',          level:0, section:'Money out' },
  { id:'reports',       icon:'chart-bar',     label:'Reports',        level:0, section:'Reports' },
  { id:'settings',      icon:'settings',      label:'Settings',       level:0, section:'More' },
  { id:'payroll',       icon:'users',         label:'Payroll',        level:1, section:'Money out' },
  { id:'recurring',     icon:'refresh',       label:'Recurring',      level:1, section:'Money in' },
  { id:'budgets',       icon:'trending-up',   label:'Budgets',        level:1, section:'Reports' },
  { id:'coa',           icon:'list',          label:'Chart of accounts',level:2, section:'Advanced' },
  { id:'journal',       icon:'book',          label:'Journal entries', level:2, section:'Advanced' },
  { id:'ai-categorize', icon:'sparkles',      label:'AI categorize',  level:2, section:'Advanced' },
  { id:'ai-anomalies',  icon:'shield-check',  label:'Anomaly scan',   level:2, section:'Advanced' },
  { id:'ai-forecast',   icon:'chart-line',    label:'Cash forecast',  level:2, section:'Advanced' },
  { id:'documents',     icon:'files',         label:'Documents',      level:2, section:'More' },
  { id:'currencies',    icon:'currency',      label:'Currencies',     level:2, section:'More' },
  { id:'companies',     icon:'building',      label:'My companies',   level:2, section:'More' },
  { id:'billing',       icon:'credit-card',   label:'Billing',        level:2, section:'More' },
];

export default function Sidebar({ activeId='digest', onNavigate }) {
  const [expanded, setExpanded] = useState(false);
  const { used, days } = getUsageLevel();

  const maxLevel = expanded ? 2
    : days >= 7 || used.length >= 5 ? 2
    : days >= 3 || used.length >= 2 ? 1
    : 0;

  const visible = ALL_NAV.filter(i => i.level <= maxLevel);
  const hiddenCount = ALL_NAV.filter(i => i.level > maxLevel).length;

  const sections = [...new Set(visible.map(i => i.section ?? ''))];

  function handleNav(item) {
    markFeatureUsed(item.id);
    onNavigate?.(item);
  }

  return (
    <nav className="sidebar">
      {sections.map(section => (
        <div key={section}>
          {section && <div className="nav-section-label">{section}</div>}
          {visible.filter(i => (i.section ?? '') === section).map(item => (
            <button key={item.id}
              className={`nav-item ${activeId === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item)}
              aria-current={activeId === item.id ? 'page' : undefined}
            >
              <i className={`ti ti-${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ))}
      {hiddenCount > 0 && !expanded && (
        <div style={{ padding:'6px 10px' }}>
          <button onClick={() => setExpanded(true)}
            style={{ width:'100%', fontSize:11, color:'var(--color-text-tertiary)', background:'none', border:'0.5px solid var(--color-border-tertiary)', borderRadius:8, padding:'6px 10px', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6 }}>
            <i className="ti ti-dots" style={{fontSize:13}} /> {hiddenCount} more features
          </button>
        </div>
      )}
      {expanded && (
        <div style={{ padding:'4px 10px' }}>
          <button onClick={() => setExpanded(false)}
            style={{ width:'100%', fontSize:11, color:'var(--color-text-tertiary)', background:'none', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:6, padding:'4px' }}>
            <i className="ti ti-chevron-up" style={{fontSize:13}} /> Show less
          </button>
        </div>
      )}
    </nav>
  );
}
