import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', orgName: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

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
      if (mode === 'login') {
        await login(form.email, form.password);
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a3a1a 0%, #0d2010 40%, #070f28 70%, #020408 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'sans-serif'
    }}>
      {/* Back to home */}
      <a href="/" style={{
        position: 'absolute', top: 24, left: 24,
        color: '#A8D4A8', fontSize: '15px', textDecoration: 'none',
        display: 'flex', alignItems: 'center', gap: 6,
        opacity: 0.8
      }}>
        ← Home
      </a>

      <div style={{
        width: '100%', maxWidth: '460px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(168,212,168,0.2)',
        borderRadius: '24px',
        padding: '48px 40px',
        backdropFilter: 'blur(10px)',
      }}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{marginBottom:'16px'}}>
            <defs>
              <linearGradient id="iconbg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a3a1a"/>
                <stop offset="100%" stopColor="#070f28"/>
              </linearGradient>
            </defs>
            <rect width="56" height="56" rx="14" fill="url(#iconbg)"/>
            <polygon points="28,8 14,42 42,42" fill="#ffd166" opacity="0.2"/>
            <polygon points="28,8 21,26 28,23 35,26" fill="#ffd166" opacity="0.9"/>
            <line x1="14" y1="42" x2="42" y2="42" stroke="#ffd166" strokeWidth="1.5" opacity="0.4"/>
          </svg>
          <div style={{fontSize:'28px', fontWeight:'700', color:'#ffd166', letterSpacing:'0.5px', fontFamily:'Georgia, serif'}}>
            Mountain Top Ledger
          </div>
          <div style={{fontSize:'13px', color:'#7A9A7A', marginTop:'6px', letterSpacing:'2px'}}>
            BUILT FOR WHERE YOU ARE GOING
          </div>
        </div>

        {/* Title */}
        <div style={{fontSize:'20px', fontWeight:'600', color:'#fff', marginBottom:'28px', textAlign:'center'}}>
          {mode === 'login' ? 'Sign in to your account' : mode === 'forgot' ? 'Reset your password' : 'Create your account'}
        </div>

        {error && (
          <div style={{
            background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.4)',
            borderRadius:'10px', padding:'12px 16px', marginBottom:'20px',
            color:'#ff8a7a', fontSize:'14px'
          }}>
            {error}
          </div>
        )}

        {notice && (
          <div style={{
            background:'rgba(168,212,168,0.15)', border:'1px solid rgba(168,212,168,0.4)',
            borderRadius:'10px', padding:'12px 16px', marginBottom:'20px',
            color:'#A8D4A8', fontSize:'14px'
          }}>
            {notice}
          </div>
        )}

        {mode === 'forgot' && (
          <div style={{fontSize:'14px', color:'#7A9A7A', marginBottom:'20px', textAlign:'center'}}>
            Enter your email and we'll send you a link to reset your password.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>Full Name</label>
                <input
                  type="text" value={form.fullName} onChange={e => setField('fullName', e.target.value)}
                  placeholder="Jane Smith" required
                  style={{
                    width:'100%', padding:'14px 16px', borderRadius:'12px', fontSize:'16px',
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
                    color:'#fff', outline:'none', boxSizing:'border-box',
                  }}
                />
              </div>
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>Company Name</label>
                <input
                  type="text" value={form.orgName} onChange={e => setField('orgName', e.target.value)}
                  placeholder="Acme Co." required
                  style={{
                    width:'100%', padding:'14px 16px', borderRadius:'12px', fontSize:'16px',
                    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
                    color:'#fff', outline:'none', boxSizing:'border-box',
                  }}
                />
              </div>
            </>
          )}

          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>Email</label>
            <input
              type="email" value={form.email} onChange={e => setField('email', e.target.value)}
              placeholder="you@company.com" required
              style={{
                width:'100%', padding:'14px 16px', borderRadius:'12px', fontSize:'16px',
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
                color:'#fff', outline:'none', boxSizing:'border-box',
              }}
            />
          </div>

          {mode !== 'forgot' && (
          <div style={{marginBottom:'28px'}}>
            <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>Password</label>
            <div style={{position:'relative'}}>
              <input
                type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setField('password', e.target.value)}
                placeholder="••••••••" required minLength={8}
                style={{
                  width:'100%', padding:'14px 56px 14px 16px', borderRadius:'12px', fontSize:'16px',
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
                  color:'#fff', outline:'none', boxSizing:'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)} style={{
                position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'#7A9A7A', fontSize:'13px'
              }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          )}

          {mode === 'login' && (
            <div style={{textAlign:'right', marginTop:'-14px', marginBottom:'20px'}}>
              <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} style={{background:'none',border:'none',color:'#7A9A7A',cursor:'pointer',fontSize:'13px'}}>Forgot password?</button>
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width:'100%', padding:'15px', borderRadius:'12px', fontSize:'16px', fontWeight:'700',
            background: loading ? '#5a8a5a' : 'linear-gradient(135deg, #ffd166 0%, #f5a623 100%)',
            color: '#0d2010', border:'none', cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing:'0.5px', transition:'opacity 0.2s'
          }}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Send Reset Link' : 'Create Account'}
          </button>
        </form>

        <div style={{textAlign:'center', marginTop:'24px', fontSize:'14px', color:'#7A9A7A'}}>
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('register')} style={{background:'none',border:'none',color:'#A8D4A8',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>Sign up free</button></>
          ) : (
            <>Already have an account? <button onClick={() => { setMode('login'); setError(''); setNotice(''); }} style={{background:'none',border:'none',color:'#A8D4A8',cursor:'pointer',fontSize:'14px',fontWeight:'600'}}>Sign in</button></>
          )}
        </div>

        <div style={{textAlign:'center', marginTop:'32px', paddingTop:'24px', borderTop:'1px solid rgba(168,212,168,0.1)'}}>
          <div style={{fontSize:'11px', color:'#3a5a3a', letterSpacing:'1px'}}>
            © 2026 MOUNTAIN TOP LEDGER · mountaintopledger.com
          </div>
        </div>
      </div>
    </div>
  );
}