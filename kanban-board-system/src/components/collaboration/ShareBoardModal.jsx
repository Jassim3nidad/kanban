import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ShareBoardModal({ boardId, onClose }) {
  const [permissionType, setPermissionType] = useState('viewer'); // 'viewer' | 'editor'
  const [generatedLink, setGeneratedLink] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generateToken = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const token = generateToken();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;

      const { error: insertError } = await supabase
        .from('shared_links')
        .insert({
          board_id: boardId,
          permission_type: permissionType,
          token,
          created_by: userId,
          is_active: true
        });

      if (insertError) throw insertError;

      const link = `${window.location.origin}/guest/${token}`;
      setGeneratedLink(link);
    } catch (err) {
      setError(err.message || 'Failed to generate link.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Share Board</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {!generatedLink ? (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Generate a secure, shareable link for guest collaborators. Anyone with this link can access this board.
              </p>

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label className="form-label">Permission Access</label>
                <div className="permission-options">
                  <div
                    className={`permission-option ${permissionType === 'viewer' ? 'active' : ''}`}
                    onClick={() => setPermissionType('viewer')}
                  >
                    <span className="permission-title">View Only</span>
                    <span className="permission-desc">Can view columns and tasks but cannot edit.</span>
                  </div>
                  <div
                    className={`permission-option ${permissionType === 'editor' ? 'active' : ''}`}
                    onClick={() => setPermissionType('editor')}
                  >
                    <span className="permission-title">Collaborator</span>
                    <span className="permission-desc">Can create, edit, delete and move tasks.</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateLink}
                disabled={loading}
                style={{ marginTop: '0.5rem' }}
              >
                {loading ? <div className="spinner"></div> : 'Generate Link'}
              </button>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Your link is ready! Copy it and share it with your team.
              </p>
              
              <div className="share-link-box">
                <span className="share-link-text">{generatedLink}</span>
                <button className="copy-btn" onClick={handleCopyLink}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <span>Access:</span>
                <span style={{ color: permissionType === 'editor' ? 'var(--success)' : 'var(--primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {permissionType === 'editor' ? 'Collaborator' : 'Viewer'}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ marginTop: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
