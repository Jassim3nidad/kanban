import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if this is a password recovery flow vs standard update flow
  const isRecovery = location.state?.isRecovery || localStorage.getItem('supabase_password_recovery') === 'true';

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword || (!isRecovery && !oldPassword)) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. If not a recovery flow, verify old password by signing in
      if (!isRecovery) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          setError('Session expired. Please log in again.');
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
        });

        if (verifyError) {
          setError('Incorrect current password.');
          setLoading(false);
          return;
        }
      }

      // 2. Perform password update
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Password updated successfully! Redirecting to Dashboard...');
        localStorage.removeItem('supabase_password_recovery');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ marginBottom: '-0.5rem' }}>
          <button
            onClick={() => {
              localStorage.removeItem('supabase_password_recovery');
              navigate(isRecovery ? '/' : '/dashboard');
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            &larr; {isRecovery ? 'Back to Login' : 'Back to Dashboard'}
          </button>
        </div>

        <div className="auth-header">
          <h2 className="auth-title">Change Password</h2>
          <p className="auth-subtitle">
            {isRecovery ? 'Enter your new password below' : 'Verify your current password and enter a new one'}
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {!isRecovery && (
            <div className="form-group">
              <label className="form-label" htmlFor="oldPassword">Current Password</label>
              <input
                id="oldPassword"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={loading || !!success}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || !!success}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || !!success}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !!success}>
            {loading ? <div className="spinner"></div> : 'Update Password'}
          </button>

          {!loading && !success && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem('supabase_password_recovery');
                navigate(isRecovery ? '/' : '/dashboard');
              }}
            >
              {isRecovery ? 'Back to Login' : 'Back to Dashboard'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
