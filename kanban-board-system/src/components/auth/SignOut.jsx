import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function SignOut() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/');
    }
  };

  return (
    <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
      Sign Out
    </button>
  );
}
