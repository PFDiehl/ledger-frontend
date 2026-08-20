import { useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message || 'This reset link is invalid or has expired.'); return; }
      setDone(true);
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width:'100%', padding:'14px 16px', borderRadius:'12px', fontSize:'16px',
    background:'rgba(255,255,255,0.06)', border:'1px solid rgba(168,212,168,0.25)',
    color:'#fff', outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(135deg, #1a3a1a 0%, #0d2010 40%, #070f28 70%, #020408 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', fontFamily:'sans-serif'
    }}>
      <div style={{
        width:'100%', maxWidth:'460px', background:'rgba(255,255,255,0.04)',
        border:'1px solid rgba(168,212,168,0.2)', borderRadius:'24px', padding:'48px 40px', backdropFilter:'blur(10px)',
      }}>
        <div style={{textAlign:'center', marginBottom:'32px'}}>
          <div style={{fontSize:'24px', fontWeight:'700', color:'#ffd166', fontFamily:'Georgia, serif'}}>Mountain Top Ledger</div>
        </div>

        <div style={{fontSize:'20px', fontWeight:'600', color:'#fff', marginBottom:'24px', textAlign:'center'}}>
          {done ? 'Password reset' : 'Choose a new password'}
        </div>

        {!token && !done && (
          <div style={{color:'#ff8a7a', fontSize:'14px', textAlign:'center', marginBottom:'20px'}}>
            This reset link is missing its code. Please use the link from your email, or request a new one.
          </div>
        )}

        {error && (
          <div style={{background:'rgba(192,57,43,0.15)', border:'1px solid rgba(192,57,43,0.4)', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', color:'#ff8a7a', fontSize:'14px'}}>
            {error}
          </div>
        )}

        {done ? (
          <div style={{textAlign:'center'}}>
            <div style={{color:'#A8D4A8', fontSize:'15px', marginBottom:'24px'}}>
              Your password has been reset. You can now sign in with your new password.
            </div>
            <a href="/" style={{display:'inline-block', padding:'14px 28px', borderRadius:'12px', fontSize:'16px', fontWeight:'700', background:'linear-gradient(135deg, #ffd166 0%, #f5a623 100%)', color:'#0d2010', textDecoration:'none'}}>
              Go to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{marginBottom:'16px'}}>
              <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>New Password</label>
              <div style={{position:'relative'}}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••" required minLength={8} style={{...inputStyle, padding:'14px 56px 14px 16px'}} />
                <button type="button" onClick={() => setShowPw(p => !p)} style={{position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#7A9A7A', fontSize:'13px'}}>
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{marginBottom:'28px'}}>
              <label style={{display:'block', fontSize:'13px', color:'#A8D4A8', marginBottom:'8px', fontWeight:'500'}}>Confirm New Password</label>
              <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => { setConfirm(e.target.value); setError(''); }}
                placeholder="••••••••" required minLength={8} style={inputStyle} />
            </div>

            <button type="submit" disabled={loading || !token} style={{
              width:'100%', padding:'15px', borderRadius:'12px', fontSize:'16px', fontWeight:'700',
              background: (loading || !token) ? '#5a8a5a' : 'linear-gradient(135deg, #ffd166 0%, #f5a623 100%)',
              color:'#0d2010', border:'none', cursor:(loading || !token) ? 'not-allowed' : 'pointer', letterSpacing:'0.5px'
            }}>
              {loading ? 'Please wait...' : 'Reset Password'}
            </button>
          </form>
        )}

        <div style={{textAlign:'center', marginTop:'24px', fontSize:'14px'}}>
          <a href="/" style={{color:'#7A9A7A', textDecoration:'none'}}>← Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
