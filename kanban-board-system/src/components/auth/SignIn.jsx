import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="split-auth-container">
      {/* Left Hero Panel */}
      <div className="split-auth-left">
        <div className="split-auth-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 600 }}>Kanban Progress Tracker</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>by StartupLab</span>
        </div>
        <h1 className="split-auth-hero-title">
          One <span>workspace</span> for your active projects.
        </h1>
        <p className="split-auth-hero-desc">
          Log in to track your personal progress, manage active tickets, or access the admin panel to assign tasks and oversee team workflows.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="split-auth-right">
        <div className="auth-card" style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
          <div className="auth-header" style={{ textAlign: 'left' }}>
            <h2 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome back</h2>
            <p className="auth-subtitle">Sign in to your workspace</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Work Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.725rem', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••••••"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem', fontSize: '0.95rem' }} disabled={loading}>
              {loading ? <div className="spinner"></div> : '→ Sign In'}
            </button>
          </form>

          <div className="auth-links" style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No account? <Link to="/register" className="auth-link" style={{ fontWeight: 600 }}>Register for access</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
