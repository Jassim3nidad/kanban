import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateShareToken } from '../../utils/permissions';
import Board from '../board/Board';

export default function GuestAccess() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // 'checking' | 'valid' | 'invalid'
  const [accessMode, setAccessMode] = useState(null); // 'viewer' | 'editor'
  const [boardId, setBoardId] = useState(null);

  useEffect(() => {
    async function verifyLink() {
      if (!token) {
        setStatus('invalid');
        return;
      }

      setStatus('checking');
      const { valid, boardId: resolvedBoardId, permissionType } = await validateShareToken(token);

      if (valid) {
        setAccessMode(permissionType);
        setBoardId(resolvedBoardId);
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
    }

    verifyLink();
  }, [token]);

  if (status === 'checking') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Verifying shared link...</p>
        </div>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', padding: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '3.5rem 2rem', textAlign: 'center', maxWidth: '460px', width: '100%' }}>
          <svg style={{ width: '56px', height: '56px', fill: 'var(--danger)', marginBottom: '1.5rem' }} viewBox="0 0 24 24">
            <path d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V9H13V7M13,11H11V17H13V11Z" />
          </svg>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Expired or Invalid Link</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            This shareable link has expired, been deactivated, or is malformed. Please ask the board owner to generate a new link.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Render board in guest mode with specific access mode and board ID
  return <Board guestMode accessMode={accessMode} boardId={boardId} />;
}
