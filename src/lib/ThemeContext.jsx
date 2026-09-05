import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// ── Theme definitions ─────────────────────────────────────────────────────────
// Palettes mirror the MountainTop Ledger mobile app: Original, Evergreen, Slate.
// Ocean is kept as an extra option.

export const THEMES = {
  original: {
    id:          'original',
    name:        'Original',
    description: 'Forest green — the MountainTop look',
    preview:     ['#2D4A35', '#A8D4A8', '#EBF2E8', '#FFD166'],

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

  evergreen: {
    id:          'evergreen',
    name:        'Evergreen',
    description: 'Cream & deep teal — light and clean',
    preview:     ['#1E5F52', '#F4F1E9', '#EAE6DA', '#C08A2E'],

    vars: {
      '--brand-sidebar':        '#1E5F52',
      '--brand-sidebar-mid':    '#2A7A68',
      '--brand-sidebar-icon':   '#7FB8AC',
      '--brand-nav-active-bg':  '#2A7A68',
      '--brand-nav-active-icon':'#FFFFFF',
      '--brand-nav-active-border':'#2A7A68',
      '--brand-topbar':         '#1E5F52',
      '--brand-logo':           '#8FD4C4',
      '--brand-topbar-sub':     '#7FB8AC',
      '--brand-primary':        '#1E7A66',
      '--brand-primary-hover':  '#196554',
      '--brand-primary-text':   '#FFFFFF',
      '--brand-btn-primary-bg': '#1E7A66',
      '--brand-btn-primary-text':'#FFFFFF',
      '--brand-kpi-hero-bg':    '#1E5F52',
      '--brand-kpi-hero-label': '#7FB8AC',
      '--brand-kpi-hero-val':   '#FFFFFF',
      '--brand-kpi-tint-bg':    '#EAE6DA',
      '--brand-kpi-tint-border':'#DED8C8',
      '--brand-page-bg':        '#F4F1E9',
      '--brand-card-border':    '#E2DCCF',
      '--brand-section-label':  '#5E7A72',
      '--brand-inv-header':     '#1E5F52',
      '--brand-inv-header-logo':'#8FD4C4',
      '--brand-inv-header-sub': '#7FB8AC',
      '--brand-inv-total':      '#1E5F52',
      '--brand-pay-btn-bg':     '#1E7A66',
      '--brand-pay-btn-text':   '#FFFFFF',
      '--brand-mobile-bar':     '#1E5F52',
      '--brand-mobile-active':  '#8FD4C4',
      '--brand-accent-light':   '#EAE6DA',
      '--brand-alert-bar':      '#B4472D',
    },
  },

  slate: {
    id:          'slate',
    name:        'Slate',
    description: 'Charcoal & gold — sleek and modern',
    preview:     ['#21252C', '#5FCF9A', '#2A2F38', '#E8B94A'],

    vars: {
      '--brand-sidebar':        '#16181D',
      '--brand-sidebar-mid':    '#21252C',
      '--brand-sidebar-icon':   '#6A7480',
      '--brand-nav-active-bg':  '#263A32',
      '--brand-nav-active-icon':'#6FE0AB',
      '--brand-nav-active-border':'#5FCF9A',
      '--brand-topbar':         '#16181D',
      '--brand-logo':           '#E8B94A',
      '--brand-topbar-sub':     '#9AA3AE',
      '--brand-primary':        '#21252C',
      '--brand-primary-hover':  '#2A2F38',
      '--brand-primary-text':   '#5FCF9A',
      '--brand-btn-primary-bg': '#5FCF9A',
      '--brand-btn-primary-text':'#16181D',
      '--brand-kpi-hero-bg':    '#21252C',
      '--brand-kpi-hero-label': '#9AA3AE',
      '--brand-kpi-hero-val':   '#5FCF9A',
      '--brand-kpi-tint-bg':    '#EEF1F4',
      '--brand-kpi-tint-border':'#DDE2E8',
      '--brand-page-bg':        '#F1F3F5',
      '--brand-card-border':    '#DDE2E8',
      '--brand-section-label':  '#8A94A0',
      '--brand-inv-header':     '#21252C',
      '--brand-inv-header-logo':'#E8B94A',
      '--brand-inv-header-sub': '#9AA3AE',
      '--brand-inv-total':      '#21252C',
      '--brand-pay-btn-bg':     '#21252C',
      '--brand-pay-btn-text':   '#5FCF9A',
      '--brand-mobile-bar':     '#16181D',
      '--brand-mobile-active':  '#5FCF9A',
      '--brand-accent-light':   '#EEF1F4',
      '--brand-alert-bar':      '#E5928A',
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

  'deep-harbor': {
    id:          'deep-harbor',
    name:        'Deep Harbor',
    description: 'Deep navy & gold — private-bank premium',
    preview:     ['#0C2A44', '#2A84B8', '#7EC4E8', '#E0B154'],

    vars: {
      '--brand-sidebar':        '#0C2A44',
      '--brand-sidebar-mid':    '#123A5C',
      '--brand-sidebar-icon':   '#5E86A6',
      '--brand-nav-active-bg':  '#164A70',
      '--brand-nav-active-icon':'#ffffff',
      '--brand-nav-active-border':'#164A70',
      '--brand-topbar':         '#0C2A44',
      '--brand-logo':           '#E6EFF7',
      '--brand-topbar-sub':     '#5E86A6',
      '--brand-primary':        '#0C2A44',
      '--brand-primary-hover':  '#123A5C',
      '--brand-primary-text':   '#ffffff',
      '--brand-btn-primary-bg': '#2A84B8',
      '--brand-btn-primary-text':'#ffffff',
      '--brand-kpi-hero-bg':    '#0C2A44',
      '--brand-kpi-hero-label': '#7EC4E8',
      '--brand-kpi-hero-val':   '#ffffff',
      '--brand-kpi-tint-bg':    '#E7F1F9',
      '--brand-kpi-tint-border':'#CFE0EC',
      '--brand-page-bg':        '#EEF3F8',
      '--brand-card-border':    '#D6E2EC',
      '--brand-section-label':  '#5F7183',
      '--brand-inv-header':     '#0C2A44',
      '--brand-inv-header-logo':'#E0B154',
      '--brand-inv-header-sub': '#7EA7C4',
      '--brand-inv-total':      '#0C2A44',
      '--brand-pay-btn-bg':     '#2A84B8',
      '--brand-pay-btn-text':   '#ffffff',
      '--brand-mobile-bar':     '#0C2A44',
      '--brand-mobile-active':  '#7EC4E8',
      '--brand-accent-light':   '#E7F1F9',
      '--brand-alert-bar':      '#C0703A',
    },
  },
};

// ── Apply theme vars to :root ─────────────────────────────────────────────────

function applyTheme(themeId) {
  const theme = THEMES[themeId] ?? THEMES['deep-harbor'];
  const root  = document.documentElement;

  // Apply all brand variables
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  // Set data attribute for any direct CSS selectors
  root.setAttribute('data-theme', theme.id);
}

// ── Per-organization brand overrides (white-label) ────────────────────────────
// Layered ON TOP of the selected theme: an org's custom primary/accent colors
// override the chrome and accent tokens. Text-on-color tokens flip to white or
// dark automatically for legibility. No custom colors → the named theme shows.
function applyBrand(org) {
  const root = document.documentElement;
  const readable = (hex) => {
    const c = String(hex || '').replace('#', '');
    if (c.length < 6) return null;
    const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6 ? '#ffffff' : '#0C2A44';
  };
  const p = org?.brandPrimary, a = org?.brandAccent;
  if (p) {
    ['--brand-sidebar', '--brand-topbar', '--brand-primary', '--brand-primary-hover', '--brand-kpi-hero-bg', '--brand-inv-header', '--brand-inv-total', '--brand-mobile-bar']
      .forEach(k => root.style.setProperty(k, p));
    const t = readable(p);
    if (t) ['--brand-logo', '--brand-kpi-hero-val', '--brand-primary-text'].forEach(k => root.style.setProperty(k, t));
  }
  if (a) {
    ['--brand-btn-primary-bg', '--brand-pay-btn-bg', '--brand-nav-active-bg', '--brand-nav-active-border', '--brand-inv-header-logo', '--brand-mobile-active']
      .forEach(k => root.style.setProperty(k, a));
    const t = readable(a);
    if (t) ['--brand-btn-primary-text', '--brand-pay-btn-text', '--brand-nav-active-icon'].forEach(k => root.style.setProperty(k, t));
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    const saved = localStorage.getItem('ledger-theme');
    return (saved && THEMES[saved]) ? saved : 'deep-harbor';
  });

  const { org } = useAuth();

  // Apply on mount and whenever the theme OR the org's brand colors change.
  // applyTheme resets to the named palette first, then applyBrand layers any
  // custom colors on top (so switching to an unbranded org cleanly reverts).
  useEffect(() => {
    applyTheme(themeId);
    applyBrand(org);
  }, [themeId, org?.brandPrimary, org?.brandAccent]);

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
