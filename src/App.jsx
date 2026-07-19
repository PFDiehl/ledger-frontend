import { useState } from 'react';
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
import SettingsPage              from './pages/SettingsPage';
import AIInsightsPanel           from './components/ai/AIInsightsPanel';
import LandingPage from './pages/LandingPage';
import './styles.css';

const isPortal = window.location.pathname.startsWith('/portal/');

export default function App() {
  const { user, org, loading, logout } = useAuth();
  const [activeNav, setActiveNav]  = useState('dashboard');
  const [view, setView]            = useState({ type:'list' });
  const [onboarded, setOnboarded]  = useState(() => !!localStorage.getItem('onboarded'));
  const [showLanding, setShowLanding] = useState(true);
  const [showAI, setShowAI]        = useState(false);

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



