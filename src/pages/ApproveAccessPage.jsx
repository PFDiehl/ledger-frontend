import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Public, no-login page. A client lands here from the emailed consent link, reads
// what they're authorizing, types their name (their e-signature), and approves.
// Their approval is the legal authorization for the bookkeeper to access the books.
export default function ApproveAccessPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';

  const [loading, setLoading] = useState(true);
  const [info, setInfo]       = useState(null);   // { firmName, clientName, scope, consentText, ... }
  const [loadError, setLoadError] = useState('');

  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [agree, setAgree]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult]   = useState(null);   // { approved, setupLoginUrl, ... }

  useEffect(() => {
    let cancelled = false;
    if (!token) { setLoading(false); setLoadError('This link is missing its code. Please use the link from your email.'); return; }
    (async () => {
      try {
        const res  = await fetch(`${API}/access-grants/approve/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) { setLoadError(data.message || 'This link is invalid, already used, or expired.'); }
        else { setInfo(data.data || data); setEmail((data.data || data)?.clientEmail || ''); }
      } catch {
        if (!cancelled) setLoadError('Could not connect. Please try again in a moment.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function handleApprove(e) {
    e.preventDefault();
    setSubmitError('');
    if (!name.trim())  { setSubmitError('Please type your name to approve.'); return; }
    if (!agree)        { setSubmitError('Please check the box to confirm your authorization.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/access-grants/approve/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approverName: name.trim(), approverEmail: email.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSubmitError(data.message || 'We could not record your approval. The link may have expired.'); return; }
      setResult(data.data || data);
    } catch {
      setSubmitError('Could not connect. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── shared styles ──
  const page = {
    minHeight:'100vh',
    background:'linear-gradient(135deg, #1a3a1a 0%, #0d2010 40%, #070f28 70%, #020408 100%)',
    display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'sans-serif',
  };
  const card = {
    width:'100%', maxWidth:'560px', background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(168,212,168,0.2)', borderRadius:'24px', padding:'40px 36px', backdropFilter:'blur(10px)',
  };
  const brand = { textAlign:'center', marginBottom:'28px' };
  const brandName = { fontSize:'24px', fontWeight:'700', color:'#ffd166', fontFamily:'Georgia, serif' };
  const inputStyle = {
    width:'100%', padding:'14px 16px', borderRadius:'12px', fontSize:'16px',
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
    color:'#fff', outline:'none', boxSizing:'border-box',
  };
  const label = { display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500' };
  const goldBtn = (disabled) => ({
    width:'100%', padding:'15px', borderRadius:'12px', fontSize:'16px', fontWeight:'700',
    background: disabled ? '#5a8a5a' : 'linear-gradient(135deg, #ffd166 0%, #f5a623 100%)',
    color:'#0d2010', border:'none', cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing:'0.3px',
  });
  const scopeText = info?.scope === 'full'
    ? 'view and edit your books (full bookkeeping access)'
    : 'view your books on a read-only basis';

  return (
    <div style={page}>
      <div style={card}>
        <div style={brand}><div style={brandName}>MountainTop Ledger</div></div>

        {loading && (
          <div style={{color:'#A8D4A8', fontSize:'15px', textAlign:'center', padding:'20px 0'}}>Loading…</div>
        )}

        {!loading && loadError && (
          <>
            <div style={{fontSize:'20px', fontWeight:'600', color:'#fff', marginBottom:'16px', textAlign:'center'}}>Link unavailable</div>
            <div style={{background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.4)', borderRadius:'10px', padding:'14px 16px', color:'#ff8a7a', fontSize:'14px', textAlign:'center'}}>
              {loadError}
            </div>
            <div style={{color:'#7A9A7A', fontSize:'13px', textAlign:'center', marginTop:'18px'}}>
              Ask your bookkeeper to resend the approval email, and use the newest link.
            </div>
          </>
        )}

        {!loading && !loadError && result && (
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'44px', marginBottom:'8px'}}>✅</div>
            <div style={{fontSize:'22px', fontWeight:'700', color:'#fff', marginBottom:'12px'}}>Access authorized</div>
            <div style={{color:'#A8D4A8', fontSize:'15px', marginBottom:'8px'}}>
              Thank you. <strong style={{color:'#fff'}}>{result.firmName}</strong> can now keep the books for <strong style={{color:'#fff'}}>{result.clientName}</strong>.
            </div>
            <div style={{color:'#7A9A7A', fontSize:'13px', marginBottom:'28px'}}>
              A confirmation has been emailed for your records. You can end this access at any time by contacting your bookkeeper.
            </div>

            {result.setupLoginUrl && (
              <div style={{borderTop:'1px solid rgba(168,212,168,0.15)', paddingTop:'24px'}}>
                <div style={{color:'#fff', fontSize:'15px', fontWeight:'600', marginBottom:'8px'}}>Want to see your books yourself?</div>
                <div style={{color:'#7A9A7A', fontSize:'13px', marginBottom:'16px'}}>
                  This is optional. Set up a login and you'll be able to view your books anytime.
                </div>
                <a href={result.setupLoginUrl} style={{display:'inline-block', ...goldBtn(false), textDecoration:'none', width:'auto', padding:'13px 26px'}}>
                  Set up my login
                </a>
              </div>
            )}
          </div>
        )}

        {!loading && !loadError && !result && info && (
          <form onSubmit={handleApprove}>
            <div style={{fontSize:'20px', fontWeight:'600', color:'#fff', marginBottom:'8px', textAlign:'center'}}>
              Authorize your bookkeeper
            </div>
            <div style={{color:'#A8D4A8', fontSize:'14px', textAlign:'center', marginBottom:'20px'}}>
              <strong style={{color:'#fff'}}>{info.firmName}</strong> would like to {scopeText} for <strong style={{color:'#fff'}}>{info.clientName}</strong>.
            </div>

            <div style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(168,212,168,0.15)', borderRadius:'12px',
              padding:'16px', maxHeight:'220px', overflowY:'auto', marginBottom:'20px',
              color:'#cfe3cf', fontSize:'13px', lineHeight:1.5, whiteSpace:'pre-wrap',
            }}>
              {info.consentText}
            </div>

            {submitError && (
              <div style={{background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.4)', borderRadius:'10px', padding:'12px 16px', marginBottom:'16px', color:'#ff8a7a', fontSize:'14px'}}>
                {submitError}
              </div>
            )}

            <div style={{marginBottom:'16px'}}>
              <label style={label}>Your full name (this is your signature)</label>
              <input type="text" value={name} onChange={e => { setName(e.target.value); setSubmitError(''); }}
                placeholder="e.g. Jane Smith" required style={inputStyle} />
            </div>

            <div style={{marginBottom:'18px'}}>
              <label style={label}>Your email (optional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <label style={{display:'flex', alignItems:'flex-start', gap:'10px', marginBottom:'22px', cursor:'pointer', color:'#cfe3cf', fontSize:'13px', lineHeight:1.4}}>
              <input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); setSubmitError(''); }}
                style={{marginTop:'2px', width:'18px', height:'18px', flexShrink:0, accentColor:'#f5a623'}} />
              <span>I confirm I am authorized to grant this permission on behalf of {info.clientName}, and I agree to the authorization above.</span>
            </label>

            <button type="submit" disabled={submitting} style={goldBtn(submitting)}>
              {submitting ? 'Recording your approval…' : 'Approve access'}
            </button>

            <div style={{color:'#7A9A7A', fontSize:'12px', textAlign:'center', marginTop:'16px'}}>
              No account or password is required. You can revoke this access at any time.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
