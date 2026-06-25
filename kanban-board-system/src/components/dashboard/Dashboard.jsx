import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';
import SignOut from '../auth/SignOut';
import Board from '../board/Board';
import ShareBoardModal from '../collaboration/ShareBoardModal';
import { getUserRole, canEdit } from '../../utils/permissions.js';

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('intern-board'); // 'intern-board' | 'admin-oversight'
  const [userProfile, setUserProfile] = useState(null);
  const [boardId, setBoardId] = useState(null);
  const [boardTitle, setBoardTitle] = useState('Intern Workspace');
  const [userRole, setUserRole] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin Oversight States
  const [teamMembers, setTeamMembers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allBoards, setAllBoards] = useState([]);
  const [oversightLoading, setOversightLoading] = useState(false);

  // Quick Task Creator Form (Admin)
  const [quickTask, setQuickTask] = useState({ title: '', description: '', tag: 'Backend', columnId: '' });
  const [columnsList, setColumnsList] = useState([]);
  const [selectedBoardId, setSelectedBoardId] = useState(null);

  const user = session?.user;

  // 1. Fetch user profile and setup default workspace board
  useEffect(() => {
    async function loadWorkspace() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch public profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setUserProfile(profile);

        let activeBoard = null;

        // Every user (admin or member) gets their OWN board by owner_id.
        // Admins view other people's data only through the Oversight tab — NOT by sharing a board.
        const { data: ownedBoards, error: ownedError } = await supabase
          .from('boards')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (!ownedError && ownedBoards?.length > 0) {
          activeBoard = ownedBoards[0];
        }

        // Fallback: boards the user is a member of
        if (!activeBoard) {
          const { data: memberRows, error: memberError } = await supabase
            .from('board_members')
            .select('board_id, boards(*)')
            .eq('user_id', user.id)
            .limit(1);

          if (!memberError && memberRows?.length > 0) {
            activeBoard = memberRows[0].boards;
          }
        }

        // If still no board, auto-create a personal workspace
        if (!activeBoard) {
          const { data: newBoard, error: createBoardError } = await supabase
            .from('boards')
            .insert({
              title: 'Intern Workspace',
              owner_id: user.id
            })
            .select()
            .single();

          if (createBoardError) throw createBoardError;
          activeBoard = newBoard;

          // Insert the 3 default columns
          const defaultCols = [
            { board_id: activeBoard.board_id, title: 'To Do', position: 0 },
            { board_id: activeBoard.board_id, title: 'In Progress', position: 1 },
            { board_id: activeBoard.board_id, title: 'Done', position: 2 },
          ];

          const { error: createColsError } = await supabase
            .from('columns')
            .insert(defaultCols);

          if (createColsError) throw createColsError;
        }

        setBoardId(activeBoard.board_id);
        setBoardTitle(activeBoard.title);

        const role = await getUserRole(activeBoard.board_id, user.id);
        setUserRole(role);
      } catch (err) {
        setError(err.message || 'Failed to initialize workspace.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [user]);

  // 2. Fetch admin oversight data if the active tab changes to Oversight
  useEffect(() => {
    if (activeTab === 'admin-oversight') {
      loadOversightData();
    }
  }, [activeTab]);

  const loadOversightData = async () => {
    setOversightLoading(true);
    try {
      // Fetch all team profiles
      const { data: members, error: membersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;
      setTeamMembers(members || []);

      // Fetch ALL boards across all users for admin oversight
      const { data: boards, error: boardsError } = await supabase
        .from('boards')
        .select('*, users(display_name, email)')
        .order('created_at', { ascending: true });

      if (boardsError) throw boardsError;
      setAllBoards(boards || []);

      // Default to the first board for task assignment
      const firstBoard = boards?.[0];
      if (firstBoard) {
        setSelectedBoardId(firstBoard.board_id);

        // Load columns for the default selected board
        const { data: cols, error: colsError } = await supabase
          .from('columns')
          .select('*')
          .eq('board_id', firstBoard.board_id)
          .order('position', { ascending: true });

        if (!colsError && cols?.length > 0) {
          setColumnsList(cols);
          setQuickTask((prev) => ({ ...prev, columnId: cols[0].column_id }));
        }
      }

      // Fetch ALL tasks from ALL boards (no board_id filter)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, columns(title, board_id), users(email, display_name)')
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setAllTasks(tasks || []);

    } catch (err) {
      console.error(err);
      alert('Failed to load admin oversight panel: ' + err.message);
    } finally {
      setOversightLoading(false);
    }
  };

  // When admin changes which board to assign to, reload columns for that board
  const handleBoardSelectionChange = async (newBoardId) => {
    setSelectedBoardId(newBoardId);
    const { data: cols, error: colsError } = await supabase
      .from('columns')
      .select('*')
      .eq('board_id', newBoardId)
      .order('position', { ascending: true });

    if (!colsError && cols?.length > 0) {
      setColumnsList(cols);
      setQuickTask((prev) => ({ ...prev, columnId: cols[0].column_id }));
    } else {
      setColumnsList([]);
      setQuickTask((prev) => ({ ...prev, columnId: '' }));
    }
  };

  const handleCreateQuickTask = async (e) => {
    e.preventDefault();
    if (!quickTask.title.trim() || !quickTask.columnId || !selectedBoardId) return;

    try {
      const columnTasks = allTasks.filter((t) => t.column_id === quickTask.columnId);
      const position = columnTasks.length;

      const { error: insertError } = await supabase
        .from('tasks')
        .insert({
          board_id: selectedBoardId,
          column_id: quickTask.columnId,
          title: quickTask.title.trim(),
          description: quickTask.description.trim(),
          tag: quickTask.tag,
          position,
          created_by: user.id
        });

      if (insertError) throw insertError;

      setQuickTask((prev) => ({ ...prev, title: '', description: '' }));
      loadOversightData(); // reload all tasks
    } catch (err) {
      alert('Failed to assign task: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout" style={{ backgroundColor: '#f8fafc' }}>
      <header className="navbar" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '1rem 3rem' }}>
        <div className="nav-brand" style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
          <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Kanban Tracker</span>
        </div>

        {/* Tab selection menu */}
        {userProfile?.role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setActiveTab('intern-board')}
              className={`btn`}
              style={{
                padding: '0.4rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: activeTab === 'intern-board' ? '#ffffff' : 'transparent',
                color: activeTab === 'intern-board' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'intern-board' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer'
              }}
            >
              Intern Board
            </button>
            
            <button
              onClick={() => setActiveTab('admin-oversight')}
              className={`btn`}
              style={{
                padding: '0.4rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: activeTab === 'admin-oversight' ? '#ffffff' : 'transparent',
                color: activeTab === 'admin-oversight' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'admin-oversight' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                cursor: 'pointer'
              }}
            >
              Admin Oversight
            </button>
          </div>
        )}

        <div className="nav-user">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="nav-email" style={{ fontWeight: 600, color: '#0f172a' }}>{userProfile?.display_name || user.email}</span>
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.05em' }}>
              {userProfile?.role === 'admin' ? 'Administrator' : 'Team Member'}
            </span>
          </div>
          <Link to="/change-password" className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Change Password
          </Link>
          <SignOut />
        </div>
      </header>

      {/* Main Container */}
      <main className="dashboard-container" style={{ padding: '2rem 3rem' }}>
        
        {/* Workspace Banner */}
        <div style={{ background: 'linear-gradient(to right, #ffffff, #f1f5f9)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: '2rem' }}>📁</span>
          <div style={{ flexGrow: 1 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{boardTitle}</h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.15rem' }}>Manage your assigned tasks</p>
          </div>
          {boardId && canEdit(userRole) && (
            <button
              className="btn btn-primary"
              onClick={() => setShareModalOpen(true)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                height: 'fit-content'
              }}
            >
              <svg style={{ width: '16px', height: '16px', fill: '#fff' }} viewBox="0 0 24 24">
                <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.14,18.3C15.09,18.53 15.08,18.75 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.91,20.61 20.91,19C20.91,17.39 19.61,16.08 18,16.08Z" />
              </svg>
              Share Board
            </button>
          )}
        </div>

        {/* Collapsible Info Bar */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span>ℹ️</span> About This Workspace
          </h4>
          <p style={{ color: '#475569', fontSize: '0.825rem', lineHeight: '1.6' }}>
            This platform synchronizes daily workflows between interns and management. Interns use the interactive Kanban board to track their active projects, move tickets through development stages, and log their progress. Administrators can use the Admin Oversight page to monitor team activity, review completed work, and assign new tasks directly to specific team members.
          </p>
        </div>

        {error && <div className="error-message" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {/* Active Tab rendering */}
        {activeTab === 'intern-board' || userProfile?.role !== 'admin' ? (
          <div>
            {boardId ? (
              <Board session={session} boardId={boardId} hideHeader={true} />
            ) : (
              <p>No active board setup.</p>
            )}
          </div>
        ) : (
          /* Admin Oversight tab view */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
            {/* Left side: Members & Task Creator */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Quick Task Assigner Form */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Assign New Task</h3>
                <form onSubmit={handleCreateQuickTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Task Title</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Task details..."
                      value={quickTask.title}
                      onChange={(e) => setQuickTask({ ...quickTask, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Task Description</label>
                    <textarea
                      className="form-input"
                      placeholder="Task description..."
                      value={quickTask.description}
                      onChange={(e) => setQuickTask({ ...quickTask, description: e.target.value })}
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category Tag</label>
                    <select
                      className="form-input"
                      value={quickTask.tag}
                      onChange={(e) => setQuickTask({ ...quickTask, tag: e.target.value })}
                    >
                      <option value="Backend">Backend</option>
                      <option value="Frontend">Frontend</option>
                      <option value="Design">Design</option>
                      <option value="Research">Research</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Assign to Member Board</label>
                    <select
                      className="form-input"
                      value={selectedBoardId || ''}
                      onChange={(e) => handleBoardSelectionChange(e.target.value)}
                    >
                      {allBoards
                        .filter((b, index, self) => index === self.findIndex((t) => t.owner_id === b.owner_id))
                        .map((b) => (
                        <option key={b.board_id} value={b.board_id}>
                          {b.title} — {b.users?.display_name || b.users?.email || 'Unknown owner'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status Column</label>
                    <select
                      className="form-input"
                      value={quickTask.columnId}
                      onChange={(e) => setQuickTask({ ...quickTask, columnId: e.target.value })}
                    >
                      {columnsList.length > 0 ? columnsList.map((col) => (
                        <option key={col.column_id} value={col.column_id}>{col.title}</option>
                      )) : <option value="">No columns available</option>}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={!selectedBoardId || !quickTask.columnId}>
                    Assign Task
                  </button>
                </form>
              </div>

              {/* Team Members List */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>Active Team Members</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {teamMembers.map((member) => (
                    <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{member.display_name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{member.email}</p>
                      </div>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: member.role === 'admin' ? 'rgba(37,99,235,0.08)' : 'rgba(16,185,129,0.08)',
                        color: member.role === 'admin' ? 'var(--primary)' : 'var(--success)',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right side: Overall Board Tickets list */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', marginBottom: '1.25rem' }}>Workspace Tickets Oversight</h3>
              {oversightLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div className="spinner"></div>
                </div>
              ) : allTasks.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No active tickets on the board.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Ticket Title</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Category</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Column Status</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Board</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Created By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTasks.map((t) => {
                        const ownerBoard = allBoards.find((b) => b.board_id === t.board_id);
                        return (
                          <tr key={t.task_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem 0.5rem', fontWeight: 600, color: '#0f172a' }}>{t.title}</td>
                            <td style={{ padding: '1rem 0.5rem' }}>
                              {t.tag ? (
                                <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>{t.tag}</span>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '1rem 0.5rem' }}>
                              {(() => {
                                const title = (t.columns?.title || '').toLowerCase();
                                const statusStyle =
                                  title === 'to do'
                                    ? { background: 'rgba(59,130,246,0.12)', color: '#1d4ed8' }
                                    : title === 'in progress'
                                    ? { background: 'rgba(245,158,11,0.15)', color: '#b45309' }
                                    : title === 'done'
                                    ? { background: 'rgba(16,185,129,0.13)', color: '#065f46' }
                                    : { background: 'rgba(139,92,246,0.12)', color: '#5b21b6' };
                                return (
                                  <span style={{ padding: '0.25rem 0.6rem', fontWeight: 700, borderRadius: '999px', fontSize: '0.72rem', ...statusStyle }}>
                                    {t.columns?.title || 'Unknown'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                              {ownerBoard?.title || 'Unknown Board'}
                            </td>
                            <td style={{ padding: '1rem 0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                              {t.users?.display_name || t.users?.email || 'Guest'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Share Modal Dialog */}
      {shareModalOpen && boardId && (
        <ShareBoardModal
          boardId={boardId}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
