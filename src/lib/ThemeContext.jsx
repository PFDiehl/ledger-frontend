import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// ── Theme definitions ─────────────────────────────────────────────────────────
// Curated set: the three brand finalists (Teal, Dark Teal, Navy) plus two saved
// favorites (Slate — great at night — and Evergreen). Dark Teal is the default and
// matches the marketing site / app brand (deep teal #0A5E66 + gold #F2C14E).

export const THEMES = {
  teal: {
    id:          'teal',
    name:        'Teal',
    description: 'Bright teal & gold — fresh and clean',
    preview:     ['#0E7C86', '#17A2B0', '#E4F3F4', '#F2C14E'],

    vars: {
      '--brand-sidebar':        '#0E7C86',
      '--brand-sidebar-mid':    '#129AA6',
      '--brand-sidebar-icon':   '#EAF7F8',
      '--brand-nav-active-bg':  '#17A2B0',
      '--brand-nav-active-icon':'#FFFFFF',
      '--brand-nav-active-border':'#F2C14E',
      '--brand-topbar':         '#0E7C86',
      '--brand-logo':           '#FFFFFF',
      '--brand-topbar-sub':     '#9CD3D9',
      '--brand-primary':        '#0E7C86',
      '--brand-primary-hover':  '#0B6670',
      '--brand-primary-text':   '#FFFFFF',
      '--brand-btn-primary-bg': '#0E7C86',
      '--brand-btn-primary-text':'#FFFFFF',
      '--brand-kpi-hero-bg':    '#0E7C86',
      '--brand-kpi-hero-label': '#9CD3D9',
      '--brand-kpi-hero-val':   '#FFFFFF',
      '--brand-kpi-tint-bg':    '#E4F3F4',
      '--brand-kpi-tint-border':'#CBE8EA',
      '--brand-page-bg':        '#EFF7F7',
      '--brand-card-border':    '#D6E9EA',
      '--brand-section-label':  '#5F8489',
      '--brand-inv-header':     '#0E7C86',
      '--brand-inv-header-logo':'#FFFFFF',
      '--brand-inv-header-sub': '#9CD3D9',
      '--brand-inv-total':      '#0E7C86',
      '--brand-pay-btn-bg':     '#0E7C86',
      '--brand-pay-btn-text':   '#FFFFFF',
      '--brand-mobile-bar':     '#0E7C86',
      '--brand-mobile-active':  '#FFFFFF',
      '--brand-accent-light':   '#E4F3F4',
      '--brand-alert-bar':      '#C0703A',
    },
  },

  'dark-teal': {
    id:          'dark-teal',
    name:        'Dark Teal',
    description: 'Deep teal & gold — the MountainTop brand',
    preview:     ['#0A5E66', '#F2C14E', '#E3F0F0', '#0E7C86'],

    vars: {
      '--brand-sidebar':        '#0A5E66',
      '--brand-sidebar-mid':    '#0C7079',
      '--brand-sidebar-icon':   '#E6F3F4',
      '--brand-nav-active-bg':  '#0E7C86',
      '--brand-nav-active-icon':'#FFFFFF',
      '--brand-nav-active-border':'#F2C14E',
      '--brand-topbar':         '#0A5E66',
      '--brand-logo':           '#F2C14E',
      '--brand-topbar-sub':     '#7FB6BB',
      '--brand-primary':        '#0A5E66',
      '--brand-primary-hover':  '#084C53',
      '--brand-primary-text':   '#FFFFFF',
      '--brand-btn-primary-bg': '#0A5E66',
      '--brand-btn-primary-text':'#FFFFFF',
      '--brand-kpi-hero-bg':    '#0A5E66',
      '--brand-kpi-hero-label': '#7FB6BB',
      '--brand-kpi-hero-val':   '#FFFFFF',
      '--brand-kpi-tint-bg':    '#E3F0F0',
      '--brand-kpi-tint-border':'#C9E1E2',
      '--brand-page-bg':        '#EDF4F5',
      '--brand-card-border':    '#D3E4E5',
      '--brand-section-label':  '#5E8085',
      '--brand-inv-header':     '#0A5E66',
      '--brand-inv-header-logo':'#F2C14E',
      '--brand-inv-header-sub': '#7FB6BB',
      '--brand-inv-total':      '#0A5E66',
      '--brand-pay-btn-bg':     '#0A5E66',
      '--brand-pay-btn-text':   '#FFFFFF',
      '--brand-mobile-bar':     '#0A5E66',
      '--brand-mobile-active':  '#F2C14E',
      '--brand-accent-light':   '#E3F0F0',
      '--brand-alert-bar':      '#C0703A',
    },
  },

  midnight: {
    id:          'midnight',
    name:        'Midnight',
    description: 'Navy & gold with crisp white text',
    preview:     ['#0C2A44', '#E0B154', '#FBF4E2', '#FFFFFF'],

    vars: {
      '--brand-sidebar':        '#0C2A44',
      '--brand-sidebar-mid':    '#123A5C',
      '--brand-sidebar-icon':   '#E4EBF3',
      '--brand-nav-active-bg':  '#14416B',
      '--brand-nav-active-icon':'#FFFFFF',
      '--brand-nav-active-border':'#F2C14E',
      '--brand-topbar':         '#0C2A44',
      '--brand-logo':           '#FFFFFF',
      '--brand-topbar-sub':     '#9DB4CC',
      '--brand-primary':        '#0C2A44',
      '--brand-primary-hover':  '#123A5C',
      '--brand-primary-text':   '#FFFFFF',
      '--brand-btn-primary-bg': '#E0B154',
      '--brand-btn-primary-text':'#0C2A44',
      '--brand-kpi-hero-bg':    '#0C2A44',
      '--brand-kpi-hero-label': '#9DB4CC',
      '--brand-kpi-hero-val':   '#FFFFFF',
      '--brand-kpi-tint-bg':    '#FBF4E2',
      '--brand-kpi-tint-border':'#EAD9AE',
      '--brand-page-bg':        '#EEF1F6',
      '--brand-card-border':    '#D6DFEC',
      '--brand-section-label':  '#5F7183',
      '--brand-inv-header':     '#0C2A44',
      '--brand-inv-header-logo':'#E0B154',
      '--brand-inv-header-sub': '#9DB4CC',
      '--brand-inv-total':      '#0C2A44',
      '--brand-pay-btn-bg':     '#E0B154',
      '--brand-pay-btn-text':   '#0C2A44',
      '--brand-mobile-bar':     '#0C2A44',
      '--brand-mobile-active':  '#F2C14E',
      '--brand-accent-light':   '#FBF4E2',
      '--brand-alert-bar':      '#C0703A',
    },
  },

  harbor: {
    id:          'harbor',
    name:        'Harbor',
    description: 'Navy, blue & gold — private-bank premium',
    preview:     ['#0C2A44', '#2A84B8', '#7EC4E8', '#F2C14E'],

    vars: {
      '--brand-sidebar':        '#0C2A44',
      '--brand-sidebar-mid':    '#123A5C',
      '--brand-sidebar-icon':   '#CBA85A',
      '--brand-nav-active-bg':  '#164A70',
      '--brand-nav-active-icon':'#F2C14E',
      '--brand-nav-active-border':'#F2C14E',
      '--brand-topbar':         '#0C2A44',
      '--brand-logo':           '#F2C14E',
      '--brand-topbar-sub':     '#7EC4E8',
      '--brand-primary':        '#0C2A44',
      '--brand-primary-hover':  '#123A5C',
      '--brand-primary-text':   '#ffffff',
      '--brand-btn-primary-bg': '#2A84B8',
      '--brand-btn-primary-text':'#ffffff',
      '--brand-kpi-hero-bg':    '#0C2A44',
      '--brand-kpi-hero-label': '#7EC4E8',
      '--brand-kpi-hero-val':   '#F2C14E',
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
      '--brand-mobile-active':  '#F2C14E',
      '--brand-accent-light':   '#E7F1F9',
      '--brand-alert-bar':      '#C0703A',
    },
  },

  evergreen: {
    id:          'evergreen',
    name:        'Evergreen',
    description: 'Cream & forest green — the mobile app look',
    preview:     ['#2D7A4A', '#B9852B', '#F4F1E9', '#EAE6DA'],

    vars: {
      '--brand-sidebar':        '#256B3F',
      '--brand-sidebar-mid':    '#2D7A4A',
      '--brand-sidebar-icon':   '#E4EFE6',
      '--brand-nav-active-bg':  '#2D7A4A',
      '--brand-nav-active-icon':'#FFFFFF',
      '--brand-nav-active-border':'#B9852B',
      '--brand-topbar':         '#256B3F',
      '--brand-logo':           '#FFFFFF',
      '--brand-topbar-sub':     '#A9CBB1',
      '--brand-primary':        '#2D7A4A',
      '--brand-primary-hover':  '#256B3F',
      '--brand-primary-text':   '#FFFFFF',
      '--brand-btn-primary-bg': '#2D7A4A',
      '--brand-btn-primary-text':'#FFFFFF',
      '--brand-kpi-hero-bg':    '#256B3F',
      '--brand-kpi-hero-label': '#A9CBB1',
      '--brand-kpi-hero-val':   '#FFFFFF',
      '--brand-kpi-tint-bg':    '#EAE6DA',
      '--brand-kpi-tint-border':'#DED8C8',
      '--brand-page-bg':        '#F4F1E9',
      '--brand-card-border':    '#E2DCCF',
      '--brand-section-label':  '#6B7A6B',
      '--brand-inv-header':     '#256B3F',
      '--brand-inv-header-logo':'#B9852B',
      '--brand-inv-header-sub': '#A9CBB1',
      '--brand-inv-total':      '#256B3F',
      '--brand-pay-btn-bg':     '#2D7A4A',
      '--brand-pay-btn-text':   '#FFFFFF',
      '--brand-mobile-bar':     '#256B3F',
      '--brand-mobile-active':  '#B9852B',
      '--brand-accent-light':   '#EAE6DA',
      '--brand-alert-bar':      '#B4472D',
    },
  },

  slate: {
    id:          'slate',
    name:        'Slate',
    description: 'Charcoal & mint — sleek, great at night',
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

};

// ── Apply theme vars to :root ─────────────────────────────────────────────────

function applyTheme(themeId) {
  const theme = THEMES[themeId] ?? THEMES['dark-teal'];
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
    return (saved && THEMES[saved]) ? saved : 'dark-teal';
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
