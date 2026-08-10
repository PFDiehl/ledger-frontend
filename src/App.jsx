import { useState, useEffect } from 'react';
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
import './styles.css';

const isPortal = window.location.pathname.startsWith('/portal/');
const isPrivacy = window.location.pathname === '/privacy';
const API_BASE = import.meta.env.VITE_API_URL || 'https://ledger-accounting-production.up.railway.app/api';

export default function App() {
  const { user, org, loading, logout } = useAuth();
  const [activeNav, setActiveNav]  = useState('dashboard');
  const [view, setView]            = useState({ type:'list' });
  const [onboarded, setOnboarded]  = useState(() => !!localStorage.getItem('onboarded'));
  const [showLanding, setShowLanding] = useState(true);
  const [showAI, setShowAI]        = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'checking' | 'paid' | 'notpaid' | 'error'

  // After Stripe redirects back to /?paid=true&session_id=..., confirm the payment with our backend
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true' && params.get('session_id')) {
      const sessionId = params.get('session_id');
      setPaymentStatus('checking');
      // Clean the URL so refreshing this page won't re-run the check
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

  if (isPrivacy) return <PrivacyPage />;
  if (isPortal) return <CustomerPortalPage token={window.location.pathname.replace('/portal/','')} />;
  if (loading)  return <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'var(--color-text-secondary)' }}>Loading…</div>;
  if (!user && showLanding) return <LandingPage onGetStarted={()=>setShowLanding(false)} />;
  if (!user) return <AuthPage onSuccess={() => {}} />;
  if (!onboarded) return <OnboardingPage onComplete={() => { localStorage.setItem('onboarded','1'); setOnboarded(true); }} />;

  const nav = id => { setActiveNav(id); setView({ type:'list' }); };

  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard':   return <DashboardPage />;
      case 'digest':     return <DigestPage />;
      case 'invoices':
        if (view.type==='detail') return <InvoiceDetailPage invoice={view.data} onBack={()=>setView({type:'list'})} onEdit={inv=>setView({type:'form',data:inv})} />;
        if (view.type==='form')   return <InvoiceFormPage   invoice={view.data} onBack={()=>setView(view.data?{type:'detail',data:view.data}:{type:'list'})} onSave={()=>setView({type:'list'})} />;
        return <InvoicesPage onView={inv=>setView({type:'detail',data:inv})} onNew={()=>setView({type:'form',data:null})} />;
      case 'bills':
        if (view.type==='detail') return <BillDetailPage bill={view.data} onBack={()=>setView({type:'list'})} onEdit={b=>setView({type:'form',data:b})} />;
        if (view.type==='form')   return <BillFormPage   bill={view.data} onBack={()=>setView(view.data?{type:'detail',data:view.data}:{type:'list'})} onSave={()=>setView({type:'list'})} />;
        return <BillsPage onView={b=>setView({type:'detail',data:b})} onNew={()=>setView({type:'form',data:null})} />;
      case 'customers':   return <CustomersPage org={org} />;
      case 'vendors':     return <VendorsPage org={org} />;
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
