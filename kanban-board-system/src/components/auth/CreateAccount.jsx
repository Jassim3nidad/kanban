import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';

export default function CreateAccount() {
  const [role, setRole] = useState('member'); // 'member' (Team Member) | 'admin' (Administrator)
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!email || !password || !displayName) {
      setError('Please fill in all fields.');
      return;
    }

    if (role === 'admin' && adminCode !== 'StartupLabAdmin') {
      setError('Invalid Admin Access Code. Please contact your organization administrator.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Verify if email already exists in public.users to prevent duplicate registrations
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        setError('An account with this email address already exists.');
        setLoading(false);
        return;
      }

      // 2. Sign up with Supabase Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            role,
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
      setLoading(false);
      
      // Delay redirect to allow user to read the instructions
      setTimeout(() => {
        navigate('/login');
      }, 6000);
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
      setLoading(false);
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
          Join the <span>workspace</span> today.
        </h1>
        <p className="split-auth-hero-desc">
          Create an account to join your organization's workflow. Select your role to get access to either the intern task board or the admin oversight panel.
        </p>
      </div>

      {/* Right Form Panel */}
      <div className="split-auth-right">
        <div className="auth-card" style={{ background: '#ffffff', boxShadow: 'var(--shadow-lg)' }}>
          <div className="auth-header" style={{ textAlign: 'left' }}>
            <h2 className="auth-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Account</h2>
            <p className="auth-subtitle">Join your organization's workspace</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message" style={{ lineHeight: '1.5' }}>
              <strong>Registration successful!</strong><br />
              Please check your email inbox for a confirmation link. Redirecting you to login shortly...
            </div>
          )}

          <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Account Type Role Selection */}
            <div className="form-group">
              <label className="form-label">Account Type</label>
              <div className="account-type-grid">
                <button
                  type="button"
                  className={`account-type-btn ${role === 'member' ? 'active' : ''}`}
                  onClick={() => setRole('member')}
                  disabled={loading || success}
                >
                  Team Member
                </button>
                <button
                  type="button"
                  className={`account-type-btn ${role === 'admin' ? 'active' : ''}`}
                  onClick={() => setRole('admin')}
                  disabled={loading || success}
                >
                  Administrator
                </button>
              </div>
            </div>

            {role === 'admin' && (
              <div className="form-group">
                <label className="form-label" htmlFor="adminCode">Admin Access Code</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="adminCode"
                    type={showAdminCode ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter organization security code..."
                    style={{ width: '100%', paddingRight: '2.5rem' }}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    required
                    disabled={loading || success}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminCode(!showAdminCode)}
                    disabled={loading || success}
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
                    title={showAdminCode ? 'Hide access code' : 'Show access code'}
                  >
                    {showAdminCode ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="displayName">Full Name</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="Tagab Manilla"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading || success}
              />
            </div>

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
                disabled={loading || success}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Create a strong password"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || success}
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

            <button type="submit" className="btn btn-primary" style={{ padding: '0.8rem', fontSize: '0.95rem' }} disabled={loading || success}>
              {loading ? <div className="spinner"></div> : '→ Create Account'}
            </button>
          </form>

          <div className="auth-links" style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Already have an account? <Link to="/login" className="auth-link" style={{ fontWeight: 600 }}>Sign In</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
