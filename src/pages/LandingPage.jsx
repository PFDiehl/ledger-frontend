export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{minHeight:'100vh',backgroundColor:'#1a3a1a',fontFamily:'Georgia, serif'}}>

      {/* Nav */}
      <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 48px',borderBottom:'1px solid rgba(168,212,168,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,2 4,28 28,28" fill="#ffd166" opacity="0.2"/>
            <polygon points="16,2 11,16 16,14 21,16" fill="#ffd166" opacity="0.8"/>
          </svg>
          <span style={{fontSize:20,fontWeight:700,color:'#ffd166',letterSpacing:1}}>Mountain Top Ledger</span>
        </div>
        <button onClick={onGetStarted} style={{backgroundColor:'transparent',border:'1px solid #ffd166',color:'#ffd166',padding:'8px 24px',borderRadius:8,fontSize:14,cursor:'pointer',fontFamily:'sans-serif',letterSpacing:1}}>
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <div style={{textAlign:'center',padding:'80px 48px 60px',background:'linear-gradient(180deg,#1a3a1a 0%,#0d2010 50%,#080f28 100%)'}}>
        <div style={{marginBottom:24}}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <polygon points="32,4 8,56 56,56" fill="#ffd166" opacity="0.15"/>
            <polygon points="32,4 22,30 32,26 42,30" fill="#ffd166" opacity="0.7"/>
            <line x1="8" y1="56" x2="56" y2="56" stroke="#ffd166" strokeWidth="2" opacity="0.3"/>
          </svg>
        </div>
        <h1 style={{fontSize:56,fontWeight:700,color:'#ffd166',marginBottom:8,lineHeight:1.1}}>Mountain Top Ledger</h1>
        <p style={{fontSize:16,color:'#f5a623',letterSpacing:4,marginBottom:32,fontFamily:'sans-serif'}}>ACCOUNTING, SIMPLIFIED</p>
        <p style={{fontSize:20,color:'#a8d4a8',maxWidth:600,margin:'0 auto 48px',lineHeight:1.7,fontFamily:'sans-serif'}}>
          Small business accounting that works as hard as you do. Track invoices, expenses, and bills — all in one place.
        </p>
        <button onClick={onGetStarted} style={{backgroundColor:'#ffd166',color:'#0d2010',padding:'16px 48px',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Get Started Free
        </button>
        <p style={{fontSize:13,color:'#5a8a5a',marginTop:16,fontFamily:'sans-serif'}}>No credit card required</p>
      </div>

      {/* Features */}
      <div style={{padding:'60px 48px',backgroundColor:'#080f28'}}>
        <h2 style={{textAlign:'center',fontSize:32,color:'#ffd166',marginBottom:48,fontWeight:700}}>Everything your business needs</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24,maxWidth:900,margin:'0 auto'}}>
          {[
            {icon:'📄',title:'Invoicing',desc:'Create and send professional invoices in seconds. Track what you\'re owed.'},
            {icon:'💰',title:'Expense Tracking',desc:'Log expenses on the go from your phone or desktop. Never miss a deduction.'},
            {icon:'📋',title:'Bills Management',desc:'Stay on top of what you owe. Never miss a payment deadline again.'},
            {icon:'📊',title:'Reports',desc:'Clear financial reports so you always know where your business stands.'},
            {icon:'📱',title:'Mobile App',desc:'Full accounting power in your pocket. Available on iPhone.'},
            {icon:'☁️',title:'Cloud Sync',desc:'Your data is always safe and accessible from any device, anywhere.'},
          ].map(f => (
            <div key={f.title} onClick={onGetStarted} style={{backgroundColor:'rgba(255,209,102,0.05)',border:'1px solid rgba(255,209,102,0.15)',borderRadius:16,padding:28,cursor:'pointer',transition:'border-color 0.2s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,209,102,0.5)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,209,102,0.15)'}>
              <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
              <h3 style={{fontSize:18,color:'#ffd166',marginBottom:8,fontWeight:700,fontFamily:'sans-serif'}}>{f.title}</h3>
              <p style={{fontSize:14,color:'#7a9a7a',lineHeight:1.6,fontFamily:'sans-serif',margin:0}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:'center',padding:'80px 48px',background:'linear-gradient(180deg,#080f28 0%,#0a2010 50%,#071408 100%)'}}>
        <h2 style={{fontSize:36,color:'#ffd166',marginBottom:16,fontWeight:700}}>Ready to take your books to the top?</h2>
        <p style={{fontSize:18,color:'#a8d4a8',marginBottom:40,fontFamily:'sans-serif'}}>Join small businesses already using Mountain Top Ledger</p>
        <button onClick={onGetStarted} style={{backgroundColor:'#ffd166',color:'#0d2010',padding:'16px 48px',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Create Free Account
        </button>
      </div>

      {/* Footer */}
      <div style={{textAlign:'center',padding:'24px 48px',backgroundColor:'#030805',borderTop:'1px solid rgba(255,209,102,0.1)'}}>
        <p style={{fontSize:13,color:'#2a5a2a',fontFamily:'sans-serif',margin:0,letterSpacing:1}}>© 2026 Mountain Top Ledger · mountaintopledger.com</p>
      </div>

    </div>
  );
}
