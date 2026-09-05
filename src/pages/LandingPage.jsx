export default function LandingPage({ onGetStarted }) {
  return (
    <div style={{minHeight:'100vh',backgroundColor:'#1a3a1a',fontFamily:'Georgia, serif'}}>

      <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 48px',borderBottom:'1px solid rgba(168,212,168,0.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <polygon points="16,2 4,28 28,28" fill="#ffd166" opacity="0.2"/>
            <polygon points="16,2 11,16 16,14 21,16" fill="#ffd166" opacity="0.8"/>
          </svg>
          <span style={{fontSize:20,fontWeight:700,color:'#ffd166',letterSpacing:1}}>MountainTop Ledger</span>
        </div>
        <button onClick={onGetStarted} style={{backgroundColor:'transparent',border:'1px solid #ffd166',color:'#ffd166',padding:'8px 24px',borderRadius:8,fontSize:14,cursor:'pointer',fontFamily:'sans-serif',letterSpacing:1}}>
          Sign In
        </button>
      </nav>

      <div style={{textAlign:'center',padding:'80px 48px 60px',background:'linear-gradient(180deg,#1a3a1a 0%,#0d2010 50%,#080f28 100%)'}}>
        <div style={{marginBottom:24}}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <polygon points="32,4 8,56 56,56" fill="#ffd166" opacity="0.15"/>
            <polygon points="32,4 22,30 32,26 42,30" fill="#ffd166" opacity="0.7"/>
            <line x1="8" y1="56" x2="56" y2="56" stroke="#ffd166" strokeWidth="2" opacity="0.3"/>
          </svg>
        </div>
        <h1 style={{fontSize:56,fontWeight:700,color:'#ffd166',marginBottom:8,lineHeight:1.1}}>MountainTop Ledger</h1>
        <p style={{fontSize:16,color:'#f5a623',letterSpacing:4,marginBottom:32,fontFamily:'sans-serif'}}>BUILT FOR WHERE YOU ARE GOING</p>
        <p style={{fontSize:20,color:'#a8d4a8',maxWidth:700,margin:'0 auto 48px',lineHeight:1.7,fontFamily:'sans-serif'}}>
          Every great business starts somewhere. MountainTop Ledger is business accounting built to take you from your first invoice to your biggest milestone, and every step in between. Start your free trial with just the essentials, then add payroll, advanced reports, and enterprise tools only when your business is ready. You always pay for what you need and nothing more.
        </p>
        <button onClick={onGetStarted} style={{backgroundColor:'#ffd166',color:'#0d2010',padding:'16px 48px',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Get Started Free
        </button>
        <p style={{fontSize:13,color:'#5a8a5a',marginTop:16,fontFamily:'sans-serif'}}>Free first month · Cancel anytime</p>
      </div>

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
            <div key={f.title} onClick={onGetStarted} style={{backgroundColor:'rgba(255,209,102,0.05)',border:'1px solid rgba(255,209,102,0.15)',borderRadius:16,padding:28,cursor:'pointer'}} onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(255,209,102,0.5)'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(255,209,102,0.15)'}>
              <div style={{fontSize:32,marginBottom:12}}>{f.icon}</div>
              <h3 style={{fontSize:18,color:'#ffd166',marginBottom:8,fontWeight:700,fontFamily:'sans-serif'}}>{f.title}</h3>
              <p style={{fontSize:14,color:'#7a9a7a',lineHeight:1.6,fontFamily:'sans-serif',margin:0}}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div style={{padding:'80px 24px 90px',background:'linear-gradient(180deg,#080f28 0%,#0a2010 55%,#071408 100%)'}}>
        <div style={{textAlign:'center',maxWidth:760,margin:'0 auto 12px'}}>
          <h2 style={{fontSize:38,color:'#ffd166',fontWeight:700,lineHeight:1.15}}>Simple pricing that grows with you</h2>
          <p style={{fontSize:18,color:'#a8d4a8',fontFamily:'sans-serif',marginTop:16,lineHeight:1.6}}>Start free. No long contracts, no surprise fees — just clean books at an affordable price.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:28,maxWidth:820,margin:'52px auto 0'}}>

          {/* Startup */}
          <div style={{background:'rgba(255,209,102,0.09)',border:'2px solid #ffd166',borderRadius:18,padding:'34px 30px',position:'relative',display:'flex',flexDirection:'column'}}>
            <div style={{position:'absolute',top:-14,left:'50%',transform:'translateX(-50%)',background:'#ffd166',color:'#0d2010',fontFamily:'sans-serif',fontWeight:700,fontSize:12,letterSpacing:1,padding:'6px 16px',borderRadius:20,whiteSpace:'nowrap'}}>START HERE</div>
            <div style={{fontSize:22,color:'#ffd166',fontWeight:700}}>Startup</div>
            <div style={{fontFamily:'sans-serif',fontSize:13,color:'#7a9a7a',marginTop:6}}>Everything you need to run the books.</div>
            <div style={{margin:'22px 0 4px'}}><span style={{fontSize:52,color:'#fff',fontWeight:700,fontFamily:'sans-serif'}}>$15</span><span style={{fontSize:16,color:'#a8d4a8',fontFamily:'sans-serif'}}> / month</span></div>
            <div style={{fontFamily:'sans-serif',fontSize:13,color:'#7a9a7a',margin:'10px 0 0'}}>Free first month, then $15.</div>

            <ul style={{listStyle:'none',margin:'22px 0 26px',padding:0,fontFamily:'sans-serif'}}>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Unlimited invoices & estimates</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Expense tracking with receipt scanning</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Customers & vendors</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Core financial reports</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> iPhone mobile app</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Single user</li>
            </ul>

            <button onClick={() => onGetStarted('startup')} style={{marginTop:'auto',padding:'15px 24px',borderRadius:12,fontSize:17,fontWeight:700,fontFamily:'sans-serif',letterSpacing:1,cursor:'pointer',border:'none',background:'#ffd166',color:'#0d2010',width:'100%'}}>Start free</button>
          </div>

          {/* Growth */}
          <div style={{background:'rgba(255,209,102,0.05)',border:'1px solid rgba(255,209,102,0.15)',borderRadius:18,padding:'34px 30px',position:'relative',display:'flex',flexDirection:'column'}}>
            <div style={{fontSize:22,color:'#ffd166',fontWeight:700}}>Growth</div>
            <div style={{fontFamily:'sans-serif',fontSize:13,color:'#7a9a7a',marginTop:6}}>For teams ready to scale up.</div>
            <div style={{margin:'22px 0 4px'}}><span style={{fontSize:52,color:'#fff',fontWeight:700,fontFamily:'sans-serif'}}>$39</span><span style={{fontSize:16,color:'#a8d4a8',fontFamily:'sans-serif'}}> / month</span></div>
            <div style={{fontFamily:'sans-serif',fontSize:13,color:'#7a9a7a',margin:'10px 0 0'}}>Free first month, then $39.</div>

            <ul style={{listStyle:'none',margin:'22px 0 26px',padding:0,fontFamily:'sans-serif'}}>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> <strong style={{color:'#fff',fontWeight:600}}>Everything in Startup, plus:</strong></li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Payroll</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Automatic bank connections</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Multiple team members</li>
              <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#cbe3cb',fontSize:15,lineHeight:1.5,marginBottom:12}}><span style={{color:'#ffd166',fontWeight:700}}>✓</span> Advanced reports</li>
            </ul>

            <button onClick={() => onGetStarted('growth')} style={{marginTop:'auto',padding:'15px 24px',borderRadius:12,fontSize:17,fontWeight:700,fontFamily:'sans-serif',letterSpacing:1,cursor:'pointer',background:'transparent',color:'#ffd166',border:'1px solid #ffd166',width:'100%'}}>Start free</button>
          </div>

        </div>

        <div style={{textAlign:'center',fontFamily:'sans-serif',color:'#5a8a5a',fontSize:14,marginTop:40}}>Free first month on both plans · Card required · Cancel anytime</div>
      </div>

      <div style={{textAlign:'center',padding:'80px 48px',background:'linear-gradient(180deg,#080f28 0%,#0a2010 50%,#071408 100%)'}}>
        <h2 style={{fontSize:36,color:'#ffd166',marginBottom:16,fontWeight:700}}>Ready to take your books to the top?</h2>
        <p style={{fontSize:18,color:'#a8d4a8',marginBottom:40,fontFamily:'sans-serif'}}>Start your journey with MountainTop Ledger today</p>
        <button onClick={onGetStarted} style={{backgroundColor:'#ffd166',color:'#0d2010',padding:'16px 48px',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Create Free Account
        </button>
      </div>

      <div style={{textAlign:'center',padding:'24px 48px',backgroundColor:'#030805',borderTop:'1px solid rgba(255,209,102,0.1)'}}>
        <p style={{fontSize:13,color:'#2a5a2a',fontFamily:'sans-serif',margin:0,letterSpacing:1}}>
          Copyright 2026 MountainTop Ledger &nbsp;·&nbsp; mountaintopledger.com &nbsp;·&nbsp;
          <a href="/privacy" style={{color:'#5a8a5a',textDecoration:'none'}}>Privacy Policy</a>
        </p>
      </div>

    </div>
  );
}
