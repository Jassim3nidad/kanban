import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Check if the email exists in our users table
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) {
        setError('An error occurred while verifying the email. Please try again.');
        setLoading(false);
        return;
      }

      if (!userProfile) {
        setError('No account found with this email address.');
        setLoading(false);
        return;
      }

      // 2. Redirect URL should point to our site's root or a route that handles reset.
      // Supabase will redirect back, and App.jsx will catch the PASSWORD_RECOVERY event
      const redirectToUrl = `${window.location.origin}/`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectToUrl,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess('Reset link sent! Please check your email inbox.');
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
        <div className="auth-header">
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">Enter your email to receive a password reset link</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/" className="auth-link">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
