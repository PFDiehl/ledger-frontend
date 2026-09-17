import { useState, useEffect } from 'react';

export default function LandingPage({ onGetStarted }) {
  // Responsive: shrink header + hero on narrow screens
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const mobile = vw < 640;

  // Which feature card is expanded in place (null = none)
  const [openFeature, setOpenFeature] = useState(null);

  // Palette — Deep Teal + Gold (gold used only in the header)
  const DT = '#0A5E66';        // deep teal (header band, primary accent)
  const DT_INK = '#083338';    // dark headings / prices
  const GOLD = '#F2C14E';      // dollar-sign gold — header accent only
  const SOFT_TEAL = '#4F9AA0'; // Growth box accent (low-contrast)
  const FEAT_BD = '#93A6BA';   // feature-card borders
  const BODY = '#33465A';      // body text
  const MUTED = '#6E7F92';

  // Feature cards — short blurb + deeper detail shown when expanded in place
  const FEATURES = [
    {icon:'📄',title:'Invoicing',desc:'Create and send professional invoices in seconds. Track what you\'re owed.',
      detail:'Create polished, professional invoices in seconds and send them straight to your customers. Track what\'s paid, outstanding, and overdue at a glance, set up recurring invoices for repeat clients, and let customers pay online so you get paid faster.'},
    {icon:'💰',title:'Expense Tracking',desc:'Log expenses on the go from your phone or desktop. Never miss a deduction.',
      detail:'Log expenses the moment they happen from your phone or desktop, and snap a photo of the receipt so it\'s always attached. Keep spending organized by category so nothing slips through the cracks and every deduction is ready at tax time.'},
    {icon:'📋',title:'Bills Management',desc:'Stay on top of what you owe. Never miss a payment deadline again.',
      detail:'Keep every bill you owe in one place with clear due dates, so you never miss a payment or get hit with a late fee again. See exactly what\'s coming due and plan your cash flow with confidence.'},
    {icon:'📊',title:'Reports',desc:'Clear financial reports so you always know where your business stands.',
      detail:'Get clear Profit & Loss, Balance Sheet, and Cash Flow statements on demand — no accounting degree required. Filter by any date range and switch between cash and accrual accounting so you always know exactly where your business stands.'},
    {icon:'📱',title:'Mobile App',desc:'Full accounting power in your pocket, wherever you are.',
      detail:'Take your whole business with you. The mobile app puts invoicing, expenses, and reports right in your pocket, so you can run the books from the job site, a client meeting, or your couch. Available on iPhone, with Android on the way.'},
    {icon:'☁️',title:'Cloud Sync',desc:'Your data is always safe and accessible from any device, anywhere.',
      detail:'Your data is automatically backed up and synced to the cloud, so it\'s always safe and always current on every device you use. Start an invoice on your laptop and finish it on your phone — everything stays perfectly in sync.'},
  ];

  return (
    <div style={{minHeight:'100vh',backgroundColor:'#ffffff',fontFamily:'Georgia, serif',overflowX:'hidden'}}>

      {/* Header band — deep teal, gold logo + name + Sign In */}
      <nav style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:mobile?'16px 18px':'36px 56px',backgroundColor:DT,gap:12}}>
        <div style={{display:'flex',alignItems:'center',gap:mobile?9:18,minWidth:0}}>
          <svg width={mobile?32:56} height={mobile?32:56} viewBox="0 0 32 32" style={{flex:'0 0 auto'}}>
            <polygon points="16,2 4,28 28,28" fill={GOLD} opacity="0.28"/>
            <polygon points="16,2 11,16 16,14 21,16" fill={GOLD}/>
          </svg>
          <span style={{fontSize:mobile?20:34,fontWeight:700,color:GOLD,letterSpacing:mobile?0.3:1,lineHeight:1.1}}>MountainTop Ledger</span>
        </div>
        <button onClick={()=>onGetStarted(null,'login')} style={{backgroundColor:'transparent',border:`2px solid ${GOLD}`,color:GOLD,padding:mobile?'8px 16px':'12px 32px',borderRadius:8,fontSize:mobile?14:17,fontWeight:600,cursor:'pointer',fontFamily:'sans-serif',letterSpacing:mobile?0.3:1,whiteSpace:'nowrap',flex:'0 0 auto'}}>
          Sign In
        </button>
      </nav>

      {/* Hero */}
      <div style={{textAlign:'center',padding:mobile?'56px 22px 60px':'96px 32px 88px',background:'linear-gradient(180deg,#E7F2F3 0%,#FFFFFF 60%,#EDF6F7 100%)'}}>
        <div style={{marginBottom:34}}>
          <svg width="104" height="104" viewBox="0 0 64 64">
            <polygon points="32,4 8,56 56,56" fill={DT} opacity="0.16"/>
            <polygon points="32,4 22,30 32,26 42,30" fill={DT}/>
            <line x1="8" y1="56" x2="56" y2="56" stroke={DT} strokeWidth="2.5" opacity="0.35"/>
          </svg>
        </div>
        <p style={{fontSize:mobile?13:16,color:DT,letterSpacing:mobile?3:5,marginBottom:20,fontWeight:600,fontFamily:'sans-serif'}}>MOUNTAINTOP LEDGER</p>
        <h1 style={{fontSize:mobile?34:52,fontWeight:700,color:DT_INK,marginBottom:28,lineHeight:1.14,maxWidth:720,marginLeft:'auto',marginRight:'auto'}}>Built for where you're going</h1>
        <p style={{fontSize:mobile?17:21,color:BODY,maxWidth:660,margin:'0 auto 44px',lineHeight:1.7,fontFamily:'sans-serif'}}>
          Every great business starts somewhere. MountainTop Ledger is business accounting built to take you from your first invoice to your biggest milestone — and every step in between. Start with just the essentials, then add payroll and advanced tools only when you're ready.
        </p>
        <button onClick={()=>onGetStarted(null,'register')} style={{backgroundColor:DT,color:'#ffffff',padding:'18px 54px',borderRadius:12,fontSize:19,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Get Started Free
        </button>
        <p style={{fontSize:14,color:'#8798A8',marginTop:18,fontFamily:'sans-serif'}}>Free first month · Cancel anytime</p>
      </div>

      {/* Features */}
      <div style={{padding:mobile?'56px 22px':'70px 32px',backgroundColor:'#F3F8F9'}}>
        <h2 style={{textAlign:'center',fontSize:mobile?28:34,color:DT_INK,marginBottom:mobile?36:52,fontWeight:700}}>Everything your business needs</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24,maxWidth:920,margin:'0 auto'}}>
          {FEATURES.map(f => {
            const isOpen = openFeature?.title === f.title;
            return (
            <div key={f.title} onClick={()=>setOpenFeature(isOpen?null:f)} style={{backgroundColor:'#ffffff',border:`1.5px solid ${isOpen?DT:FEAT_BD}`,borderRadius:16,padding:30,cursor:'pointer',boxShadow:'0 1px 3px rgba(20,40,50,0.07)',transition:'border-color 0.15s'}} onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.borderColor=DT;}} onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.borderColor=FEAT_BD;}}>
              <div style={{fontSize:34,marginBottom:14}}>{f.icon}</div>
              <h3 style={{fontSize:19,color:DT_INK,marginBottom:8,fontWeight:700,fontFamily:'sans-serif'}}>{f.title}</h3>
              <p style={{fontSize:15,color:BODY,lineHeight:1.6,fontFamily:'sans-serif',margin:0}}>{f.desc}</p>
              <div style={{marginTop:14,fontSize:14,color:DT,fontWeight:700,fontFamily:'sans-serif'}}>{isOpen?'Hide ▲':'Learn more →'}</div>
            </div>
            );
          })}
        </div>

        {/* Expand-in-place detail panel — keeps visitors on the page, funnels to sign-up */}
        {openFeature && (
          <div style={{maxWidth:920,margin:'24px auto 0',background:'#ffffff',border:`2px solid ${DT}`,borderRadius:16,padding:mobile?'26px 22px':'36px 40px',boxShadow:'0 6px 22px rgba(20,40,50,0.10)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
              <span style={{fontSize:32}}>{openFeature.icon}</span>
              <h3 style={{fontSize:mobile?22:26,color:DT_INK,fontWeight:700,margin:0}}>{openFeature.title}</h3>
            </div>
            <p style={{fontSize:mobile?16:17,color:BODY,lineHeight:1.75,fontFamily:'sans-serif',margin:'0 0 26px'}}>{openFeature.detail}</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:14}}>
              <button onClick={()=>onGetStarted(null,'register')} style={{backgroundColor:DT,color:'#ffffff',padding:'14px 32px',borderRadius:10,fontSize:16,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:0.5}}>Get Started Free</button>
              <button onClick={()=>setOpenFeature(null)} style={{backgroundColor:'transparent',color:DT,padding:'14px 28px',borderRadius:10,fontSize:16,fontWeight:600,cursor:'pointer',border:`1.5px solid ${DT}`,fontFamily:'sans-serif'}}>Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Pricing */}
      <div style={{padding:'80px 24px 92px',backgroundColor:'#F3F8F9'}}>
        <div style={{textAlign:'center',maxWidth:760,margin:'0 auto 12px'}}>
          <h2 style={{fontSize:40,color:DT_INK,fontWeight:700,lineHeight:1.15}}>Simple pricing that grows with you</h2>
          <p style={{fontSize:19,color:'#42556A',fontFamily:'sans-serif',marginTop:16,lineHeight:1.6}}>Start free. No long contracts, no surprise fees — just clean books at an affordable price.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:28,maxWidth:840,margin:'54px auto 0'}}>

          {/* Startup (featured) */}
          <div style={{background:'#ffffff',border:`2px solid ${DT}`,borderRadius:18,overflow:'hidden',position:'relative',display:'flex',flexDirection:'column',boxShadow:'0 4px 16px rgba(20,40,50,0.10)'}}>
            <div style={{height:7,background:DT}} />
            <div style={{padding:'34px 30px',display:'flex',flexDirection:'column',flex:1,position:'relative'}}>
              <div style={{position:'absolute',top:0,right:24,transform:'translateY(-50%)',background:DT,color:'#ffffff',fontFamily:'sans-serif',fontWeight:700,fontSize:12,letterSpacing:1,padding:'7px 16px',borderRadius:20,whiteSpace:'nowrap'}}>START HERE</div>
              <div style={{fontSize:23,color:DT_INK,fontWeight:700}}>Startup</div>
              <div style={{fontFamily:'sans-serif',fontSize:13,color:MUTED,marginTop:6}}>Everything you need to run the books.</div>
              <div style={{margin:'22px 0 4px'}}><span style={{fontSize:54,color:DT_INK,fontWeight:700,fontFamily:'sans-serif'}}>$15</span><span style={{fontSize:16,color:'#42556A',fontFamily:'sans-serif'}}> / month</span></div>
              <div style={{fontFamily:'sans-serif',fontSize:13,color:MUTED,margin:'10px 0 0'}}>Free first month, then $15.</div>

              <ul style={{listStyle:'none',margin:'22px 0 26px',padding:0,fontFamily:'sans-serif'}}>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Unlimited invoices & estimates</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Expense tracking with receipt scanning</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Customers & vendors</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Core financial reports</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> iPhone mobile app</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Single user</li>
              </ul>

              <button onClick={() => onGetStarted('startup','register')} style={{marginTop:'auto',padding:'16px 24px',borderRadius:12,fontSize:17,fontWeight:700,fontFamily:'sans-serif',letterSpacing:1,cursor:'pointer',border:'none',background:DT,color:'#ffffff',width:'100%'}}>Start free</button>
            </div>
          </div>

          {/* Growth (soft teal accent) */}
          <div style={{background:'#ffffff',border:`2px solid ${SOFT_TEAL}`,borderRadius:18,overflow:'hidden',position:'relative',display:'flex',flexDirection:'column',boxShadow:'0 3px 12px rgba(20,40,50,0.09)'}}>
            <div style={{height:7,background:SOFT_TEAL}} />
            <div style={{padding:'34px 30px',display:'flex',flexDirection:'column',flex:1}}>
              <div style={{fontSize:23,color:DT_INK,fontWeight:700}}>Growth</div>
              <div style={{fontFamily:'sans-serif',fontSize:13,color:MUTED,marginTop:6}}>For teams ready to scale up.</div>
              <div style={{margin:'22px 0 4px'}}><span style={{fontSize:54,color:DT_INK,fontWeight:700,fontFamily:'sans-serif'}}>$39</span><span style={{fontSize:16,color:'#42556A',fontFamily:'sans-serif'}}> / month</span></div>
              <div style={{fontFamily:'sans-serif',fontSize:13,color:MUTED,margin:'10px 0 0'}}>Free first month, then $39.</div>

              <ul style={{listStyle:'none',margin:'22px 0 26px',padding:0,fontFamily:'sans-serif'}}>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> <strong style={{color:DT_INK,fontWeight:700}}>Everything in Startup, plus:</strong></li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Payroll</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Automatic bank connections</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Multiple team members</li>
                <li style={{display:'flex',alignItems:'flex-start',gap:10,color:'#2C3E52',fontSize:15.5,lineHeight:1.5,marginBottom:13}}><span style={{color:DT,fontWeight:700}}>✓</span> Advanced reports</li>
              </ul>

              <button onClick={() => onGetStarted('growth','register')} style={{marginTop:'auto',padding:'16px 24px',borderRadius:12,fontSize:17,fontWeight:700,fontFamily:'sans-serif',letterSpacing:1,cursor:'pointer',background:'transparent',color:DT,border:`1.5px solid ${DT}`,width:'100%'}}>Start free</button>
            </div>
          </div>

        </div>

        <div style={{textAlign:'center',fontFamily:'sans-serif',color:'#8798A8',fontSize:14,marginTop:42}}>Free first month on both plans · Card required · Cancel anytime</div>
      </div>

      {/* CTA band */}
      <div style={{textAlign:'center',padding:'74px 32px',backgroundColor:DT}}>
        <h2 style={{fontSize:36,color:'#ffffff',marginBottom:16,fontWeight:700}}>Ready to take your books to the top?</h2>
        <p style={{fontSize:18,color:'#CFE6E8',marginBottom:38,fontFamily:'sans-serif'}}>Start your journey with MountainTop Ledger today</p>
        <button onClick={()=>onGetStarted(null,'register')} style={{backgroundColor:'#ffffff',color:DT,padding:'17px 50px',borderRadius:12,fontSize:18,fontWeight:700,cursor:'pointer',border:'none',fontFamily:'sans-serif',letterSpacing:1}}>
          Create Free Account
        </button>
      </div>

      {/* Footer */}
      <div style={{textAlign:'center',padding:'24px 48px',backgroundColor:'#052A2F'}}>
        <p style={{fontSize:13,color:'#AED3D6',fontFamily:'sans-serif',margin:0,letterSpacing:1}}>
          Copyright 2026 MountainTop Ledger &nbsp;·&nbsp; mountaintopledger.com &nbsp;·&nbsp;
          <a href="/privacy" style={{color:'#8FC7CB',textDecoration:'none'}}>Privacy Policy</a>
        </p>
      </div>

    </div>
  );
}
