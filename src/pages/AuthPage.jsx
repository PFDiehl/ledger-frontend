import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Light "Teal on white" palette
const TEAL     = '#0E7C86';
const TEAL_DK  = '#0B6670';
const INK      = '#0F2A2E';
const LABEL    = '#4A5B60';
const MUTED    = '#7C8B92';
const INPUT_BG = '#F7FAFA';
const INPUT_BD = '#DCE6E7';
const LINE     = '#E7EDED';

export default function AuthPage({ onSuccess, onBack, initialMode }) {
  const { login, loginWithGoogle, verify2FA, register } = useAuth();
  const googleBtnRef = useRef(null);
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', orgName: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [twoFactorCode, setTwoFactorCode]   = useState('');

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  async function handleGoogleCredential(credential) {
    setError(''); setNotice(''); setLoading(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result?.twoFactorRequired) {
        setTwoFactorToken(result.twoFactorToken); setTwoFactorCode(''); setMode('2fa'); return;
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Render Google's official "Sign in with Google" button when configured. No-op
  // (button simply doesn't appear) until VITE_GOOGLE_CLIENT_ID is set, so the page
  // works normally before Google setup is complete.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (mode !== 'login' && mode !== 'register') return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp) => { if (resp?.credential) handleGoogleCredential(resp.credential); },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', width: 360, shape: 'pill',
        text: mode === 'register' ? 'signup_with' : 'signin_with',
      });
    };
    if (window.google?.accounts?.id) { render(); return () => { cancelled = true; }; }
    let s = document.getElementById('gis-script');
    if (!s) {
      s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true; s.id = 'gis-script';
      document.body.appendChild(s);
    }
    s.addEventListener('load', render);
    return () => { cancelled = true; s && s.removeEventListener('load', render); };
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API}/auth/forgot-password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await res.json().catch(() => ({}));
        setNotice(data.message || 'If that email is registered, a reset link is on its way. Check your inbox.');
        return;
      }
      if (mode === '2fa') {
        await verify2FA(twoFactorToken, twoFactorCode);
        onSuccess?.();
        return;
      }
      if (mode === 'login') {
        const result = await login(form.email, form.password);
        if (result?.twoFactorRequired) {
          setTwoFactorToken(result.twoFactorToken);
          setTwoFactorCode('');
          setMode('2fa');
          return;
        }
      } else {
        await register({ email: form.email, password: form.password, fullName: form.fullName, orgName: form.orgName });
      }
      onSuccess?.();
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width:'100%', padding:'13px 15px', borderRadius:'11px', fontSize:'15px',
    background:INPUT_BG, border:`1.5px solid ${INPUT_BD}`,
    color:INK, outline:'none', boxSizing:'border-box',
  };
  const labelStyle = { display:'block', fontSize:'13px', color:LABEL, marginBottom:'7px', fontWeight:600 };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'sans-serif',
      position: 'relative',
    }}>
      {/* Back to home — clear, tappable pill */}
      <button
        type="button"
        onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
        style={{
          position: 'absolute', top: 20, left: 20,
          color: TEAL_DK, fontSize: '14px', fontWeight: 700,
          background: '#FFFFFF', border: `1.5px solid ${TEAL}`,
          borderRadius: 999, padding: '9px 18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
        ← Back to home
      </button>

      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <svg width="60" height="60" viewBox="0 0 64 64" style={{marginBottom:'14px'}}>
            <polygon points="32,4 8,56 56,56" fill={TEAL} opacity="0.16"/>
            <polygon points="32,4 22,30 32,26 42,30" fill={TEAL}/>
            <line x1="8" y1="56" x2="56" y2="56" stroke={TEAL} strokeWidth="2.5" opacity="0.35"/>
          </svg>
          <div style={{fontSize:'27px', fontWeight:'700', color:TEAL_DK, letterSpacing:'0.3px', fontFamily:'Georgia, serif'}}>
            MountainTop Ledger
          </div>
          <div style={{fontSize:'12px', color:MUTED, marginTop:'7px', letterSpacing:'2px', fontWeight:600}}>
            BUILT FOR WHERE YOU'RE GOING
          </div>
        </div>

        {/* Title */}
        <div style={{fontSize:'21px', fontWeight:'700', color:INK, marginBottom:'26px', textAlign:'center'}}>
          {mode === 'login' ? 'Sign in to your account'
            : mode === 'forgot' ? 'Reset your password'
            : mode === '2fa' ? 'Two-factor authentication'
            : 'Create your account'}
        </div>

        {error && (
          <div style={{
            background:'#FDECEA', border:'1px solid #F3C4BE',
            borderRadius:'10px', padding:'12px 16px', marginBottom:'20px',
            color:'#C0392B', fontSize:'14px'
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{
            background:'#E9F5F5', border:`1px solid #BFE0E1`,
            borderRadius:'10px', padding:'12px 16px', marginBottom:'20px',
            color:TEAL_DK, fontSize:'14px'
          }}>
            {notice}
          </div>
        )}

        {mode === 'forgot' && (
          <div style={{fontSize:'14px', color:MUTED, marginBottom:'20px', textAlign:'center'}}>
            Enter your email and we'll send you a link to reset your password.
          </div>
        )}

        {mode === '2fa' && (
          <div style={{fontSize:'14px', color:MUTED, marginBottom:'20px', textAlign:'center'}}>
            Enter the 6-digit code from your authenticator app. You can also use one of your backup codes.
          </div>
        )}

        {GOOGLE_CLIENT_ID && (mode === 'login' || mode === 'register') && (
          <div style={{ marginBottom: '22px' }}>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0 4px' }}>
              <div style={{ flex: 1, height: 1, background: LINE }} />
              <span style={{ fontSize: '12px', color: MUTED }}>or continue with email</span>
              <div style={{ flex: 1, height: 1, background: LINE }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === '2fa' && (
            <div style={{marginBottom:'28px'}}>
              <label style={labelStyle}>Authentication code</label>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus
                value={twoFactorCode}
                onChange={e => { setTwoFactorCode(e.target.value); setError(''); }}
                placeholder="123456"
                style={{ ...inputStyle, fontSize:'22px', letterSpacing:'6px', textAlign:'center' }}
              />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div style={{marginBottom:'15px'}}>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text" value={form.fullName} onChange={e => setField('fullName', e.target.value)}
                  placeholder="Jane Smith" required
                  style={inputStyle}
                />
              </div>
              <div style={{marginBottom:'15px'}}>
                <label style={labelStyle}>Company Name</label>
                <input
                  type="text" value={form.orgName} onChange={e => setField('orgName', e.target.value)}
                  placeholder="Acme Co." required
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {mode !== '2fa' && (
          <div style={{marginBottom:'15px'}}>
            <label style={labelStyle}>Email</label>
            <input
              type="email" value={form.email} onChange={e => setField('email', e.target.value)}
              placeholder="you@company.com" required
              style={inputStyle}
            />
          </div>
          )}

          {mode !== 'forgot' && mode !== '2fa' && (
          <div style={{marginBottom:'24px'}}>
            <label style={labelStyle}>Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setField('password', e.target.value)}
                placeholder="••••••••" required minLength={8}
                style={{ ...inputStyle, padding:'13px 56px 13px 15px' }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:MUTED, fontSize:'13px', fontWeight:600
              }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          )}

          {mode === 'login' && (
            <div style={{textAlign:'right', marginTop:'-10px', marginBottom:'20px'}}>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} style={{background:'none',border:'none',color:MUTED,cursor:'pointer',fontSize:'13px'}}>Forgot password?</button>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'15px', borderRadius:'11px', fontSize:'16px', fontWeight:'700',
            background: loading ? '#7FBEC3' : TEAL,
            color: '#ffffff', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing:'0.5px', transition:'opacity 0.2s'
          }}>
            {loading ? 'Please wait...'
              : mode === 'login' ? 'Sign In'
              : mode === 'forgot' ? 'Send Reset Link'
              : mode === '2fa' ? 'Verify'
              : 'Create Account'}
          </button>

          {mode === 'register' && (
            <div style={{marginTop:'16px', fontSize:'12px', color:MUTED, textAlign:'center', lineHeight:1.6}}>
              By creating an account, you agree to our{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={{color:TEAL_DK, textDecoration:'underline'}}>Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{color:TEAL_DK, textDecoration:'underline'}}>Privacy Policy</a>.
            </div>
          )}
        </form>

        {mode === '2fa' && (
          <div style={{textAlign:'center', marginTop:'20px', fontSize:'14px'}}>
            <button type="button" onClick={() => { setMode('login'); setError(''); setNotice(''); setTwoFactorCode(''); setTwoFactorToken(''); }} style={{background:'none',border:'none',color:MUTED,cursor:'pointer',fontSize:'14px'}}>← Back to sign in</button>
          </div>
        )}

        {mode !== '2fa' && (
        <div style={{textAlign:'center', marginTop:'24px', fontSize:'14px', color:MUTED}}>
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('register')} style={{background:'none',border:'none',color:TEAL_DK,cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setNotice(''); }} style={{background:'none',border:'none',color:TEAL_DK,cursor:'pointer',fontSize:'14px',fontWeight:'700'}}>Sign in</button></>
          )}
        </div>
        )}

        <div style={{textAlign:'center', marginTop:'32px', paddingTop:'24px', borderTop:`1px solid ${LINE}`}}>
          <div style={{fontSize:'11px', color:'#9AA8AC', letterSpacing:'1px'}}>
            © 2026 MOUNTAINTOP LEDGER · mountaintopledger.com
          </div>
        </div>
      </div>
    </div>
  );
}
