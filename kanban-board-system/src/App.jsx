import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient.js';
import SignIn from './components/auth/SignIn';
import CreateAccount from './components/auth/CreateAccount';
import ForgotPassword from './components/auth/ForgotPassword';
import ChangePassword from './components/auth/ChangePassword';
import LandingPage from './components/landing/LandingPage';
import Dashboard from './components/dashboard/Dashboard';
import Board from './components/board/Board';
import GuestAccess from './components/collaboration/GuestAccess';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setLoading(false);

      if (event === 'SIGNED_IN') {
        navigate('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        navigate('/');
      } else if (event === 'PASSWORD_RECOVERY') {
        localStorage.setItem('supabase_password_recovery', 'true');
        navigate('/change-password', { state: { isRecovery: true } });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading session...</p>
        </div>
      </div>
    );
  }

  const ProtectedRoute = ({ children }) => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <SignIn />} />
      <Route path="/register" element={session ? <Navigate to="/dashboard" replace /> : <CreateAccount />} />
      <Route path="/forgot-password" element={session ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard session={session} /></ProtectedRoute>} />
      <Route path="/board/:boardId" element={<ProtectedRoute><Board session={session} /></ProtectedRoute>} />
      <Route path="/guest/:token" element={<GuestAccess />} /> {/* no auth required */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
