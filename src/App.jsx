import { useState, useEffect, useRef } from 'react';
import { useAuth }               from './lib/AuthContext';
import AuthPage                  from './pages/AuthPage';
import OnboardingPage            from './pages/OnboardingPage';
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
import AICategorizePage          from './pages/AICategorizePage';
import AnomalyDetectionPage      from './pages/AnomalyDetectionPage';
import CashFlowForecastPage      from './pages/CashFlowForecastPage';
import CustomersPage from './pages/CustomersPage';
import VendorsPage from './pages/VendorsPage';
import SettingsPage              from './pages/SettingsPage';
import AIInsightsPanel           from './components/ai/AIInsightsPanel';
import LandingPage from './pages/LandingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SubscribeGate from './pages/SubscribeGate';
import './styles.css';

const isPortal = window.location.pathname.startsWith('/portal/');
const isPrivacy = window.location.pathname === '/privacy';
const isTerms = window.location.pathname === '/terms';
const isReset = window.location.pathname === '/reset-password';
const API_BASE = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';
// When 'true', users without an active/trialing subscription are sent to the
// SubscribeGate (card required). Off by default so existing users are never
// locked out during build/test — flipped on at launch.
const BILLING_ENFORCED = import.meta.env.VITE_BILLING_ENFORCED === 'true';

export default function App() {
  const { user, org, loading, logout } = useAuth();
  const [activeNav, setActiveNav]  = useState('dashboard');
  const [view, setView]            = useState({ type:'list' });
  const [onboarded, setOnboarded]  = useState(() => !!localStorage.getItem('onboarded'));
  const [showLanding, setShowLanding] = useState(true);
  const [showAI, setShowAI]        = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // invoice payment
  const [subStatus, setSubStatus]  = useState(null);          // subscription (post-checkout verify)
  const [selectedPlan, setSelectedPlan] = useState(() => localStorage.getItem('mtl_selected_plan') || null);
  const [subInfo, setSubInfo]   = useState(null);             // billing gate: current subscription
  const [subReady, setSubReady] = useState(!BILLING_ENFORCED); // gate open immediately when not enforced

  // On a fresh sign-in (no-user → user), always land on the Dashboard rather than
  // wherever the app was last viewing.
  const prevUser = useRef(null);
  useEffect(() => {
    if (user && !prevUser.current) { setActiveNav('dashboard'); setView({ type:'list' }); }
    prevUser.current = user;
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
        .then(data => setSubStatus(data.active ? 'active' : 'inactive'))
        .catch(() => setSubStatus('error'));
    }
  }, []);

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
        <p style={{color:'#555', maxWidth:380}}>Your first month is free — welcome to Mountain Top Ledger. You won't be charged until next month.</p>
        <a href="/" style={{padding:'10px 20px', background:'#2D7A4A', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Go to my dashboard</a>
      </div>;
    return <div style={box}>
      <div style={{fontSize:48}}>⚠️</div>
      <h1 style={{margin:0, fontSize:24}}>We couldn't finish setting up your subscription</h1>
      <p style={{color:'#555', maxWidth:400}}>If you entered your card it may take a moment. You can refresh, or try again from the Billing page.</p>
      <a href="/" style={{padding:'10px 20px', background:'#555', color:'#fff', borderRadius:8, textDecoration:'none', fontWeight:600}}>Back to app</a>
    </div>;
  }

  if (isReset) return <ResetPasswordPage />;
  if (isPrivacy) return <PrivacyPage />;
  if (isTerms) return <TermsPage />;
  if (isPortal) return <CustomerPortalPage token={window.location.pathname.replace('/portal/','')} />;
  if (loading)  return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--color-text-secondary)' }}>Loading…</div>;
  if (!user && showLanding) return <LandingPage onGetStarted={(plan)=>{ if (typeof plan === 'string' && plan) { setSelectedPlan(plan); localStorage.setItem('mtl_selected_plan', plan); } setShowLanding(false); }} />;
  if (!user) return <AuthPage onSuccess={() => {}} />;

  // Card-required gate: block access until the org has an active/trialing plan.
  if (BILLING_ENFORCED) {
    if (!subReady) return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--color-text-secondary)' }}>Loading…</div>;
    if (subInfo && !subInfo.active) return <SubscribeGate org={org} selectedPlan={selectedPlan} apiBase={API_BASE} onLogout={logout} />;
  }

  if (!onboarded) return <OnboardingPage onComplete={() => { localStorage.setItem('onboarded','1'); setOnboarded(true); }} />;

  const nav = id => { setActiveNav(id); setView({ type:'list' }); };

  const renderPage = () => {
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
      case 'budgets':     return <BudgetsPage />;
      case 'recurring':   return <RecurringInvoicesPage />;
      case 'documents':   return <DocumentsPage />;
      case 'currencies':  return <CurrenciesPage />;
      case 'payroll':     return <PayrollPage />;
      case 'billing':     return <BillingPage />;
      case 'companies':   return <MultiCompanyPage />;
      case 'ai-categorize':  return <AICategorizePage />;
      case 'ai-anomalies':   return <AnomalyDetectionPage />;
      case 'ai-forecast':    return <CashFlowForecastPage />;
      case 'settings':    return <SettingsPage />;
      default: return <div className="page"><h1 className="page-title" style={{textTransform:'capitalize'}}>{activeNav.replace(/-/g,' ')}</h1></div>;
    }
  };

  return (
    <div className="app">
      <TopBar orgName={org?.name ?? 'My Company'} onLogout={logout} onAI={() => setShowAI(s => !s)} />
      <div className="app-body">
        <Sidebar activeId={activeNav} onNavigate={item => nav(item.id)} />
        <main className="main-content">{renderPage()}</main>
      </div>
      {showAI && <AIInsightsPanel onClose={() => setShowAI(false)} />}
    </div>
  );
}
