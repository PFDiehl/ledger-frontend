import { useState, useEffect, useRef } from 'react';
import { useAuth }               from './lib/AuthContext';
import { api }                   from './lib/api';
import AuthPage                  from './pages/AuthPage';
import TopBar                    from './components/layout/TopBar';
import Sidebar                   from './components/layout/Sidebar';
import DashboardPage             from './pages/DashboardPage';
import DigestPage               from './pages/DigestPage';
import InvoicesPage              from './pages/InvoicesPage';
import InvoiceDetailPage         from './pages/InvoiceDetailPage';
import InvoiceFormPage           from './pages/InvoiceFormPage';
import BillsPage                 from './pages/BillsPage';
import BillDetailPage            from './pages/BillDetailPage';
import BillFormPage              from './pages/BillFormPage';
import BankingPage               from './pages/BankingPage';
import ReportsPage               from './pages/ReportsPage';
import ChartOfAccountsPage       from './pages/ChartOfAccountsPage';
import JournalEntriesPage        from './pages/JournalEntriesPage';
import PayrollPage               from './pages/PayrollPage';
import ExpensesPage              from './pages/ExpensesPage';
import BudgetsPage               from './pages/BudgetsPage';
import RecurringInvoicesPage     from './pages/RecurringInvoicesPage';
import DocumentsPage             from './pages/DocumentsPage';
import CurrenciesPage            from './pages/CurrenciesPage';
import CustomerPortalPage        from './pages/CustomerPortalPage';
import BillingPage               from './pages/BillingPage';
import MultiCompanyPage          from './pages/MultiCompanyPage';
import ResellerPage              from './pages/ResellerPage';
import PlatformAdminPage         from './pages/PlatformAdminPage';
import AccountantAccessPage, { PendingAccessBanner } from './pages/AccountantAccessPage';
import YearEndClosePage         from './pages/YearEndClosePage';
import AICategorizePage          from './pages/AICategorizePage';
import AnomalyDetectionPage      from './pages/AnomalyDetectionPage';
import CashFlowForecastPage      from './pages/CashFlowForecastPage';
import CustomersPage from './pages/CustomersPage';
import VendorsPage from './pages/VendorsPage';
import SettingsPage              from './pages/SettingsPage';
import AIInsightsPanel           from './components/ai/AIInsightsPanel';
import LandingPage from './pages/LandingPage';
import PrivacyPage from './pages/PrivacyPage';
import DataDeletionPage from './pages/DataDeletionPage';
import TermsPage from './pages/TermsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ApproveAccessPage from './pages/ApproveAccessPage';
import SubscribeGate from './pages/SubscribeGate';
import './styles.css';

const isPortal = window.location.pathname.startsWith('/portal/');
const isPrivacy = window.location.pathname === '/privacy';
const isDeleteData = window.location.pathname === '/delete-data';
const isTerms = window.location.pathname === '/terms';
const isReset = window.location.pathname === '/reset-password';
const isApprove = window.location.pathname === '/approve-access';
const isPlaidOauth = window.location.pathname === '/plaid-oauth';
const API_BASE = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
// When 'true', users without an active/trialing subscription are sent to the
// SubscribeGate (card required). Off by default so existing users are never
// locked out during build/test — flipped on at launch.
const BILLING_ENFORCED = import.meta.env.VITE_BILLING_ENFORCED === 'true';

// Load Plaid's Link script once.
function loadPlaidScript() {
  if (window.Plaid) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-plaid-link]');
    if (existing) { existing.addEventListener('load', () => resolve()); if (window.Plaid) resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    s.setAttribute('data-plaid-link', '1');
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Plaid.'));
    document.head.appendChild(s);
  });
}

// OAuth return page. Big banks (Chase, BofA, …) send the browser to their site and
// back here; we resume Plaid Link with the saved token, finish the exchange, and
// return to the app.
function PlaidOAuthPage() {
  const [msg, setMsg] = useState('Finishing your bank connection…');
  useEffect(() => {
    (async () => {
      try {
        const token     = localStorage.getItem('plaid_link_token');
        const orgId     = (JSON.parse(localStorage.getItem('ledger_org') || '{}')).id;
        const authToken = localStorage.getItem('accessToken');
        if (!token || !orgId) { window.location.href = '/'; return; }
        await loadPlaidScript();
        const handler = window.Plaid.create({
          token,
          receivedRedirectUri: window.location.href,
          onSuccess: async (publicToken, metadata) => {
            try {
              await fetch(`${API_BASE}/orgs/${orgId}/plaid/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ publicToken, institutionName: metadata?.institution?.name }),
              });
            } catch { /* the banking page will show the result on load */ }
            localStorage.removeItem('plaid_link_token');
            window.location.href = '/?bank_connected=1';
          },
          onExit: () => { localStorage.removeItem('plaid_link_token'); window.location.href = '/'; },
        });
        handler.open();
      } catch {
        setMsg('Could not finish the connection. Returning…');
        setTimeout(() => { window.location.href = '/'; }, 2500);
      }
    })();
  }, []);
  const box = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:'system-ui, sans-serif', padding:24, textAlign:'center' };
  return <div style={box}><div style={{ fontSize:18, color:'#555' }}>{msg}</div></div>;
}

// First-visit welcome bubble. Pops up once on the Dashboard to greet new users and
// point them at Settings → Company to fill in their business details.
function WelcomeBubble({ name, onAddCompany, onDismiss }) {
  return (
    <div style={{ position:'fixed', right:20, bottom:20, zIndex:1000, width:'min(340px, calc(100vw - 32px))',
      background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)',
      borderRadius:14, boxShadow:'0 10px 34px rgba(0,0,0,0.18)', padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'#EBF2E8', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--brand-primary,#2D4A35)', fontSize:17, flexShrink:0 }}>
          <i className="ti ti-sparkles" />
        </div>
        <div style={{ fontSize:15, fontWeight:600 }}>Welcome to MountainTop Ledger!</div>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-tertiary)', fontSize:16, lineHeight:1 }}>
          <i className="ti ti-x" />
        </button>
      </div>
      <div style={{ fontSize:13, color:'var(--color-text-secondary)', lineHeight:1.5, marginBottom:14 }}>
        Glad you're here{ name ? `, ${name}` : '' }. A great place to start is adding your company information — it appears on your invoices and reports. You'll find it under <strong>Settings → Company</strong>.
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn-primary" onClick={onAddCompany} style={{ fontSize:13 }}>Add company info</button>
        <button className="btn-secondary" onClick={onDismiss} style={{ fontSize:13 }}>Maybe later</button>
      </div>
    </div>
  );
}

export default function App() {
  const { user, org, orgs, tenants, isPlatformOwner, loading, logout } = useAuth();

  // Who is this? A normal client user has at least one company (org). A reseller
  // owner created from the Platform admin console has a login but NO company of
  // their own — their whole job lives in the Reseller console. We route those
  // users there instead of dropping them on an empty, company-less Dashboard.
  const hasOrg         = (orgs?.length || 0) > 0;
  const isResellerOnly = !hasOrg && (tenants?.length || 0) > 0;
  const isOrgAdmin     = ['owner', 'admin'].includes(org?.role);
  const landingNav     = isResellerOnly ? 'reseller'
                       : (!hasOrg && isPlatformOwner) ? 'admin'
                       : 'dashboard';
  const [activeNav, setActiveNav]  = useState('dashboard');
  const [view, setView]            = useState({ type:'list' });
  const [showWelcome, setShowWelcome] = useState(() => { try { return !localStorage.getItem('mtl_welcomed'); } catch { return false; } });
  const [showLanding, setShowLanding] = useState(true);
  const [authMode, setAuthMode]    = useState('login'); // 'login' | 'register' — which form AuthPage opens on
  const [showAI, setShowAI]        = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // invoice payment
  const [subStatus, setSubStatus]  = useState(null);          // subscription (post-checkout verify)
  const [subFreeUntil, setSubFreeUntil] = useState(null);     // real "no charge until" date from Stripe (trial + promo)
  const [selectedPlan, setSelectedPlan] = useState(() => localStorage.getItem('mtl_selected_plan') || null);
  const [subInfo, setSubInfo]   = useState(null);             // billing gate: current subscription
  const [subReady, setSubReady] = useState(!BILLING_ENFORCED); // gate open immediately when not enforced

  // On a fresh sign-in (no-user → user), always land on the Dashboard rather than
  // wherever the app was last viewing.
  const prevUser = useRef(null);
  useEffect(() => {
    if (user && !prevUser.current) { setActiveNav(landingNav); setView({ type:'list' }); }
    prevUser.current = user;
  }, [user, landingNav]);

  // Returning from a Plaid OAuth bank connection → land on Banking.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('bank_connected')) {
      window.history.replaceState({}, '', window.location.pathname);
      setActiveNav('bank');
      setView({ type:'list' });
    }
  }, [user]);

  // After Stripe redirects back from an INVOICE payment (/?paid=true&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true' && params.get('session_id')) {
      const sessionId = params.get('session_id');
      setPaymentStatus('checking');
      window.history.replaceState({}, '', window.location.pathname);
      fetch(`${API_BASE}/stripe/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
        .then(r => r.json())
        .then(data => setPaymentStatus(data.paid ? 'paid' : 'notpaid'))
        .catch(() => setPaymentStatus('error'));
    }
  }, []);

  // After Stripe redirects back from a SUBSCRIPTION signup (/?subscribed=true&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true' && params.get('session_id')) {
      const sessionId = params.get('session_id');
      setSubStatus('checking');
      window.history.replaceState({}, '', window.location.pathname);
      fetch(`${API_BASE}/billing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      })
        .then(r => r.json())
        .then(data => { setSubStatus(data.active ? 'active' : 'inactive'); if (data.freeUntil) setSubFreeUntil(data.freeUntil); })
        .catch(() => setSubStatus('error'));
    }
  }, []);

  // After Stripe redirects back from RESELLER platform-fee CARD SETUP
  // (/?fee_setup=done&session_id=...). Keyed on `user` so the auth token is ready.
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('fee_setup') === 'done' && params.get('session_id')) {
      const sessionId = params.get('session_id');
      window.history.replaceState({}, '', window.location.pathname);
      api.post('/platform-fees/billing/setup/verify', { session_id: sessionId })
        .catch((e) => console.error('Card setup verify failed:', e?.message));
    }
  }, [user]);

  // Billing gate: when enforced, check the org's subscription so we can require
  // a card before granting access. Fails OPEN on error to avoid locking anyone out.
  useEffect(() => {
    if (!BILLING_ENFORCED || !user || !org) return;
    let cancelled = false;
    setSubReady(false);
    fetch(`${API_BASE}/billing/subscription?orgId=${org.id}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setSubInfo(d.data || null); setSubReady(true); } })
      .catch(() => { if (!cancelled) { setSubInfo({ active: true, _failedOpen: true }); setSubReady(true); } });
    return () => { cancelled = true; };
  }, [user, org]);

  if (paymentStatus) {
    const box = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:'system-ui, sans-serif', padding:24, textAlign:'center' };
    if (paymentStatus === 'checking')
      return <div style={box}><div style={{fontSize:18, color:'#555'}}>Confirming your payment…</div></div>;
    if (paymentStatus === 'paid')
      return <div style={box}>
        <div style={{fontSize:48}}>✅</div>
        <h1 style={{margin:0, fontSize:24}}>Payment received</h1>
        <p style={{color:'#555', maxWidth:360}}>Thank you! Your invoice has been marked as paid.</p>
        <a href="/" style={{padding:'10px 20px', background:'#2D7A4A', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Continue</a>
      </div>;
    return <div style={box}>
      <div style={{fontSize:48}}>⚠️</div>
      <h1 style={{margin:0, fontSize:24}}>We couldn't confirm the payment yet</h1>
      <p style={{color:'#555', maxWidth:400}}>If you completed the payment it may take a moment to process. You can refresh this page, or contact support if you were charged.</p>
      <a href="/" style={{padding:'10px 20px', background:'#555', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Back to app</a>
    </div>;
  }

  if (subStatus) {
    const box = { minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, fontFamily:'system-ui, sans-serif', padding:24, textAlign:'center' };
    if (subStatus === 'checking')
      return <div style={box}><div style={{fontSize:18, color:'#555'}}>Setting up your subscription…</div></div>;
    if (subStatus === 'active')
      return <div style={box}>
        <div style={{fontSize:48}}>🎉</div>
        <h1 style={{margin:0, fontSize:24}}>You're all set!</h1>
        <p style={{color:'#555', maxWidth:380}}>Welcome to MountainTop Ledger! {subFreeUntil ? `You won't be charged until ${new Date(subFreeUntil).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}.` : "You won't be charged until your free period ends."}</p>
        <a href="/" style={{padding:'10px 20px', background:'#2D7A4A', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Go to my dashboard</a>
      </div>;
    return <div style={box}>
      <div style={{fontSize:48}}>⚠️</div>
      <h1 style={{margin:0, fontSize:24}}>We couldn't finish setting up your subscription</h1>
      <p style={{color:'#555', maxWidth:400}}>If you entered your card it may take a moment. You can refresh, or try again from the Billing page.</p>
      <a href="/" style={{padding:'10px 20px', background:'#555', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Back to app</a>
    </div>;
  }

  if (isPlaidOauth) return <PlaidOAuthPage />;
  if (isReset) return <ResetPasswordPage />;
  if (isApprove) return <ApproveAccessPage />;
  if (isPrivacy) return <PrivacyPage />;
  if (isDeleteData) return <DataDeletionPage />;
  if (isTerms) return <TermsPage />;
  if (isPortal) return <CustomerPortalPage token={window.location.pathname.replace('/portal/','')} />;
  if (loading)  return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--color-text-secondary)' }}>Loading…</div>;
  if (!user && showLanding) return <LandingPage onGetStarted={(plan, mode)=>{ if (typeof plan === 'string' && plan) { setSelectedPlan(plan); localStorage.setItem('mtl_selected_plan', plan); } setAuthMode(mode === 'login' ? 'login' : 'register'); setShowLanding(false); }} />;
  if (!user) return <AuthPage initialMode={authMode} onBack={() => setShowLanding(true)} onSuccess={() => {}} />;

  // Card-required gate: block access until the org has an active/trialing plan.
  // Exemptions (never gated): the platform owner, and reseller/bookkeeper-managed
  // client companies — those are billed through their reseller, not this paywall.
  if (BILLING_ENFORCED) {
    if (!subReady) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--color-text-secondary)' }}>Loading…</div>;
    const billingExempt = isPlatformOwner || subInfo?.exempt;
    if (subInfo && !subInfo.active && !billingExempt) return <SubscribeGate org={org} selectedPlan={selectedPlan} apiBase={API_BASE} onLogout={logout} />;
  }

  const nav = id => { setActiveNav(id); setView({ type:'list' }); };

  // First-visit welcome bubble (shown once on the Dashboard). Replaces the old
  // onboarding wizard — new users land straight on the Dashboard.
  const dismissWelcome   = () => { try { localStorage.setItem('mtl_welcomed','1'); } catch {} setShowWelcome(false); };
  const welcomeToCompany = () => { try { localStorage.setItem('mtl_welcomed','1'); localStorage.setItem('mtl_settings_tab','company'); } catch {} setShowWelcome(false); nav('settings'); };

  const renderPage = () => {
    // A reseller owner with no company can only reach their console, the platform
    // admin (if they're the owner), and Settings — everything else needs a company.
    if (isResellerOnly && !['reseller','admin','settings'].includes(activeNav)) {
      return <ResellerPage />;
    }
    switch (activeNav) {
      case 'dashboard':   return <DashboardPage />;
      case 'digest':     return <DigestPage />;
      case 'invoices':
        if (view.type==='detail') return <InvoiceDetailPage invoice={view.data} onBack={()=>setView({type:'list'})} onEdit={inv=>setView({type:'form',data:inv})} />;
        if (view.type==='form')   return <InvoiceFormPage   invoice={view.data} presetContact={view.preset} onBack={()=>setView(view.data?{type:'detail',data:view.data}:{type:'list'})} onSave={()=>setView({type:'list'})} />;
        return <InvoicesPage onView={inv=>setView({type:'detail',data:inv})} onNew={()=>setView({type:'form',data:null})} />;
      case 'bills':
        if (view.type==='detail') return <BillDetailPage bill={view.data} onBack={()=>setView({type:'list'})} onEdit={b=>setView({type:'form',data:b})} />;
        if (view.type==='form')   return <BillFormPage   bill={view.data} onBack={()=>setView(view.data?{type:'detail',data:view.data}:{type:'list'})} onSave={()=>setView({type:'list'})} />;
        return <BillsPage presetVendor={view.presetVendor} />;
      case 'customers':   return <CustomersPage org={org} onNewInvoice={(c)=>{ setActiveNav('invoices'); setView({ type:'form', data:null, preset:c }); }} />;
      case 'vendors':     return <VendorsPage org={org} onNewBill={(v)=>{ setActiveNav('bills'); setView({ type:'list', presetVendor:v }); }} />;
      case 'expenses':    return <ExpensesPage />;
      case 'bank':        return <BankingPage />;
      case 'reports':     return <ReportsPage />;
      case 'coa':         return <ChartOfAccountsPage />;
      case 'journal':     return <JournalEntriesPage />;
      case 'year-end':    return <YearEndClosePage />;
      case 'budgets':     return <BudgetsPage />;
      case 'recurring':   return <RecurringInvoicesPage />;
      case 'documents':   return <DocumentsPage />;
      case 'currencies':  return <CurrenciesPage />;
      case 'payroll':     return <PayrollPage />;
      case 'billing':     return <BillingPage />;
      case 'companies':   return <MultiCompanyPage />;
      case 'reseller':    return <ResellerPage />;
      case 'admin':       return <PlatformAdminPage />;
      case 'access':      return <AccountantAccessPage />;
      case 'ai-categorize':  return <AICategorizePage />;
      case 'ai-anomalies':   return <AnomalyDetectionPage />;
      case 'ai-forecast':    return <CashFlowForecastPage />;
      case 'settings':    return <SettingsPage />;
      default: return <div className="page"><h1 className="page-title" style={{textTransform:'capitalize'}}>{activeNav.replace(/-/g,' ')}</h1></div>;
    }
  };

  return (
    <div className="app">
      <TopBar orgName={org?.name ?? (isResellerOnly ? tenants?.[0]?.name : null) ?? 'My Company'} onLogout={logout} onAI={() => setShowAI(s => !s)} onNavigate={nav} />
      <div className="app-body">
        <Sidebar activeId={activeNav} onNavigate={item => nav(item.id)} hasOrg={hasOrg} isOrgAdmin={isOrgAdmin} isReseller={(tenants?.length || 0) > 0} isPlatformOwner={isPlatformOwner} />
        <main className="main-content">
          {isOrgAdmin && hasOrg && activeNav !== 'access' && <PendingAccessBanner onReview={() => nav('access')} />}
          {renderPage()}
        </main>
      </div>
      {showAI && <AIInsightsPanel onClose={() => setShowAI(false)} />}
      {showWelcome && hasOrg && activeNav === 'dashboard' && (
        <WelcomeBubble name={user?.name ? String(user.name).split(' ')[0] : ''} onAddCompany={welcomeToCompany} onDismiss={dismissWelcome} />
      )}
    </div>
  );
}
