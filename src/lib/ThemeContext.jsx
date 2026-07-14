import { createContext, useContext, useState, useEffect } from 'react';

// ── Theme definitions ─────────────────────────────────────────────────────────

export const THEMES = {
  sage: {
    id:          'sage',
    name:        'Sage',
    description: 'Forest green — calm, grounded, distinctive',
    preview:     ['#2D4A35', '#A8D4A8', '#EBF2E8', '#C07A50'],

    // CSS variable overrides applied to [data-theme="sage"]
    vars: {
      '--brand-sidebar':        '#2D4A35',
      '--brand-sidebar-mid':    '#3D6045',
      '--brand-sidebar-icon':   '#6A9A70',
      '--brand-nav-active-bg':  '#A8D4A8',
      '--brand-nav-active-icon':'#1A3020',
      '--brand-nav-active-border':'#A8D4A8',
      '--brand-topbar':         '#2D4A35',
      '--brand-logo':           '#A8D4A8',
      '--brand-topbar-sub':     '#6A9A70',
      '--brand-primary':        '#2D4A35',
      '--brand-primary-hover':  '#3D6045',
      '--brand-primary-text':   '#A8D4A8',
      '--brand-btn-primary-bg': '#A8D4A8',
      '--brand-btn-primary-text':'#1A3020',
      '--brand-kpi-hero-bg':    '#2D4A35',
      '--brand-kpi-hero-label': '#6A9A70',
      '--brand-kpi-hero-val':   '#A8D4A8',
      '--brand-kpi-tint-bg':    '#EBF2E8',
      '--brand-kpi-tint-border':'#D4DDCC',
      '--brand-page-bg':        '#F5F7F2',
      '--brand-card-border':    '#D4DDCC',
      '--brand-section-label':  '#7A9A7A',
      '--brand-inv-header':     '#2D4A35',
      '--brand-inv-header-logo':'#A8D4A8',
      '--brand-inv-header-sub': '#6A9A70',
      '--brand-inv-total':      '#2D4A35',
      '--brand-pay-btn-bg':     '#2D4A35',
      '--brand-pay-btn-text':   '#A8D4A8',
      '--brand-mobile-bar':     '#2D4A35',
      '--brand-mobile-active':  '#A8D4A8',
      '--brand-accent-light':   '#EBF2E8',
      '--brand-alert-bar':      '#C07A50',
    },
  },

  slate: {
    id:          'slate',
    name:        'Slate',
    description: 'Warm charcoal & gold — authoritative, editorial',
    preview:     ['#2E2C28', '#D4AA60', '#F5F2EA', '#C4603A'],

    vars: {
      '--brand-sidebar':        '#2E2C28',
      '--brand-sidebar-mid':    '#3E3C38',
      '--brand-sidebar-icon':   '#7A7770',
      '--brand-nav-active-bg':  '#D4AA60',
      '--brand-nav-active-icon':'#1A1610',
      '--brand-nav-active-border':'#D4AA60',
      '--brand-topbar':         '#2E2C28',
      '--brand-logo':           '#D4AA60',
      '--brand-topbar-sub':     '#7A7770',
      '--brand-primary':        '#2E2C28',
      '--brand-primary-hover':  '#3E3C38',
      '--brand-primary-text':   '#D4AA60',
      '--brand-btn-primary-bg': '#D4AA60',
      '--brand-btn-primary-text':'#1A1610',
      '--brand-kpi-hero-bg':    '#2E2C28',
      '--brand-kpi-hero-label': '#7A7770',
      '--brand-kpi-hero-val':   '#D4AA60',
      '--brand-kpi-tint-bg':    '#F5F2EA',
      '--brand-kpi-tint-border':'#E2DDD5',
      '--brand-page-bg':        '#F2F0EC',
      '--brand-card-border':    '#E2DDD5',
      '--brand-section-label':  '#9A9590',
      '--brand-inv-header':     '#2E2C28',
      '--brand-inv-header-logo':'#D4AA60',
      '--brand-inv-header-sub': '#7A7770',
      '--brand-inv-total':      '#2E2C28',
      '--brand-pay-btn-bg':     '#2E2C28',
      '--brand-pay-btn-text':   '#D4AA60',
      '--brand-mobile-bar':     '#2E2C28',
      '--brand-mobile-active':  '#D4AA60',
      '--brand-accent-light':   '#F5F2EA',
      '--brand-alert-bar':      '#C4603A',
    },
  },

  ocean: {
    id:          'ocean',
    name:        'Ocean',
    description: 'Deep navy & sky blue — trustworthy, modern',
    preview:     ['#0C3252', '#2A84B8', '#D8EBF8', '#C05A3A'],

    vars: {
      '--brand-sidebar':        '#0C3252',
      '--brand-sidebar-mid':    '#1A4D6E',
      '--brand-sidebar-icon':   '#4A7A9A',
      '--brand-nav-active-bg':  '#2A84B8',
      '--brand-nav-active-icon':'#ffffff',
      '--brand-nav-active-border':'#2A84B8',
      '--brand-topbar':         '#0C3252',
      '--brand-logo':           '#7EC4E8',
      '--brand-topbar-sub':     '#4A7A9A',
      '--brand-primary':        '#0C3252',
      '--brand-primary-hover':  '#1A4D6E',
      '--brand-primary-text':   '#7EC4E8',
      '--brand-btn-primary-bg': '#2A84B8',
      '--brand-btn-primary-text':'#ffffff',
      '--brand-kpi-hero-bg':    '#0C3252',
      '--brand-kpi-hero-label': '#4A7A9A',
      '--brand-kpi-hero-val':   '#7EC4E8',
      '--brand-kpi-tint-bg':    '#D8EBF8',
      '--brand-kpi-tint-border':'#C4D8E8',
      '--brand-page-bg':        '#EFF4F9',
      '--brand-card-border':    '#C4D8E8',
      '--brand-section-label':  '#6A9AB8',
      '--brand-inv-header':     '#0C3252',
      '--brand-inv-header-logo':'#7EC4E8',
      '--brand-inv-header-sub': '#4A7A9A',
      '--brand-inv-total':      '#0C3252',
      '--brand-pay-btn-bg':     '#2A84B8',
      '--brand-pay-btn-text':   '#ffffff',
      '--brand-mobile-bar':     '#0C3252',
      '--brand-mobile-active':  '#7EC4E8',
      '--brand-accent-light':   '#D8EBF8',
      '--brand-alert-bar':      '#C05A3A',
    },
  },

  default: {
    id:          'default',
    name:        'Classic',
    description: 'Purple — the original Ledger look',
    preview:     ['#534AB7', '#EEEDFE', '#5DCAA5', '#A32D2D'],

    vars: {
      '--brand-sidebar':        '#1a1a18',
      '--brand-sidebar-mid':    '#242422',
      '--brand-sidebar-icon':   '#888780',
      '--brand-nav-active-bg':  '#EEEDFE',
      '--brand-nav-active-icon':'#534AB7',
      '--brand-nav-active-border':'#534AB7',
      '--brand-topbar':         '#ffffff',
      '--brand-logo':           '#534AB7',
      '--brand-topbar-sub':     '#888780',
      '--brand-primary':        '#534AB7',
      '--brand-primary-hover':  '#3C3489',
      '--brand-primary-text':   '#ffffff',
      '--brand-btn-primary-bg': '#534AB7',
      '--brand-btn-primary-text':'#ffffff',
      '--brand-kpi-hero-bg':    '#534AB7',
      '--brand-kpi-hero-label': '#AFA9EC',
      '--brand-kpi-hero-val':   '#ffffff',
      '--brand-kpi-tint-bg':    '#EEEDFE',
      '--brand-kpi-tint-border':'#CECBF6',
      '--brand-page-bg':        '#f8f8f6',
      '--brand-card-border':    '#e8e6df',
      '--brand-section-label':  '#888780',
      '--brand-inv-header':     '#534AB7',
      '--brand-inv-header-logo':'#ffffff',
      '--brand-inv-header-sub': '#AFA9EC',
      '--brand-inv-total':      '#534AB7',
      '--brand-pay-btn-bg':     '#534AB7',
      '--brand-pay-btn-text':   '#ffffff',
      '--brand-mobile-bar':     '#534AB7',
      '--brand-mobile-active':  '#EEEDFE',
      '--brand-accent-light':   '#EEEDFE',
      '--brand-alert-bar':      '#A32D2D',
    },
  },
};

// ── Apply theme vars to :root ─────────────────────────────────────────────────

function applyTheme(themeId) {
  const theme = THEMES[themeId] ?? THEMES.default;
  const root  = document.documentElement;

  // Apply all brand variables
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set data attribute for any direct CSS selectors
  root.setAttribute('data-theme', themeId);
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('ledger-theme') ?? 'sage';
  });

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyTheme(themeId);
  }, [themeId]);

  // When user data is available (from AuthContext), use their saved theme
  useEffect(() => {
    async function loadUserTheme() {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const res  = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const serverTheme = json?.data?.user?.theme;
        if (serverTheme && THEMES[serverTheme] && serverTheme !== themeId) {
          setThemeId(serverTheme);
          localStorage.setItem('ledger-theme', serverTheme);
          applyTheme(serverTheme);
        }
      } catch { /* ignore */ }
    }
    loadUserTheme();
  }, []); // only on mount

  function setTheme(id) {
    if (!THEMES[id]) return;
    setThemeId(id);
    localStorage.setItem('ledger-theme', id);
    applyTheme(id);

    // Persist to server (best-effort — don't block UI)
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/auth/theme`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ theme: id }),
      }).catch(() => {}); // ignore network errors
    }
  }

  return (
    <ThemeContext.Provider value={{ themeId, theme: THEMES[themeId], setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
