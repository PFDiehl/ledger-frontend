import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function AuthPage({ onSuccess }) {
  const { login, register } = useAuth();
  const [mode,   setMode]   = useState('login'); // 'login' | 'register'
  const [form,   setForm]   = useState({ email: '', password: '', fullName: '', orgName: '' });
  const [error,  setError]  = useState('');
  const [loading,setLoading]= useState(false);

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
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
    <div className="auth-page"><div style={{textAlign:'center',padding:'12px',marginBottom:'8px'}}><a href="/" style={{color:'#2D4A35',fontSize:'18px',fontWeight:'600',textDecoration:'none',fontFamily:'sans-serif'}}>< Back to home</a></div>
      <div className="auth-card">
        <div className="auth-logo">Mountain Top Ledger</div><div class="auth-tagline">Small business accounting, simplified</div>
        <div className="auth-title">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="form-field">
                <label>Full name</label>
                <input type="text" value={form.fullName} onChange={e => setField('fullName', e.target.value)} placeholder="Jane Smith" required />
              </div>
              <div className="form-field">
                <label>Company name</label>
                <input type="text" value={form.orgName} onChange={e => setField('orgName', e.target.value)} placeholder="Acme Co." required />
              </div>
            </>
          )}
          <div className="form-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder="••••••••" required minLength={8} />
          </div>
          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => setMode('register')}>Sign up</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode('login')}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}








