import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient.js';
import { getUserRole, canEdit, enforcePermission } from '../../utils/permissions.js';
import Column from './Column';
import ShareBoardModal from '../collaboration/ShareBoardModal';

export default function Board({ session = null, guestMode = false, accessMode = null, boardId: propBoardId = null, hideHeader = false }) {
  const { boardId: paramBoardId } = useParams();
  const boardId = propBoardId || paramBoardId;
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState(accessMode); // 'viewer' | 'editor' | 'owner'
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Task Create/Edit Modal State
  const [taskModal, setTaskModal] = useState({
    open: false,
    type: 'create', // 'create' | 'edit'
    columnId: null,
    task: null, // task object for editing
  });
  const [taskForm, setTaskForm] = useState({ title: '', description: '', tag: 'None' });

  const userId = session?.user?.id;

  // 1. Fetch initial board data, columns, tasks, and permissions
  useEffect(() => {
    async function initBoard() {
      if (!boardId) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch board details
        const { data: boardData, error: boardError } = await supabase
          .from('boards')
          .select('*')
          .eq('board_id', boardId)
          .maybeSingle();

        if (boardError || !boardData) {
          throw new Error('Board not found or access denied.');
        }
        setBoard(boardData);

        // Resolve user role
        let role = accessMode;
        if (!guestMode && userId) {
          role = await getUserRole(boardId, userId);
        }
        setUserRole(role);

        if (!role) {
          throw new Error('Access denied. You do not have permissions for this board.');
        }

        // Fetch columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('columns')
          .select('*')
          .eq('board_id', boardId)
          .order('position', { ascending: true });

        if (columnsError) throw columnsError;
        setColumns(columnsData || []);

        // Fetch tasks
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('board_id', boardId)
          .order('position', { ascending: true });

        if (tasksError) throw tasksError;
        setTasks(tasksData || []);

      } catch (err) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    initBoard();
  }, [boardId, userId, guestMode, accessMode]);

  // 2. Set up Realtime subscriptions for live tasks/columns updates
  useEffect(() => {
    if (!boardId) return;

    const channel = supabase
      .channel(`board-realtime-${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === 'INSERT') {
            if (newRow.board_id !== boardId) return;
            setTasks((prev) => {
              if (prev.some((t) => t.task_id === newRow.task_id)) return prev;
              return [...prev, newRow].sort((a, b) => a.position - b.position);
            });
          } else if (eventType === 'UPDATE') {
            if (newRow.board_id !== boardId) return;
            setTasks((prev) =>
              prev.map((t) => (t.task_id === newRow.task_id ? newRow : t))
                .sort((a, b) => a.position - b.position)
            );
          } else if (eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.task_id !== oldRow.task_id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
        },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (eventType === 'INSERT') {
            if (newRow.board_id !== boardId) return;
            setColumns((prev) => {
              if (prev.some((c) => c.column_id === newRow.column_id)) return prev;
              return [...prev, newRow].sort((a, b) => a.position - b.position);
            });
          } else if (eventType === 'UPDATE') {
            if (newRow.board_id !== boardId) return;
            setColumns((prev) =>
              prev.map((c) => (c.column_id === newRow.column_id ? newRow : c))
                .sort((a, b) => a.position - b.position)
            );
          } else if (eventType === 'DELETE') {
            setColumns((prev) => prev.filter((c) => c.column_id !== oldRow.column_id));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [boardId]);

  // Task Move handler (Drag and Drop)
  const handleTaskMove = async (taskId, targetColumnId) => {
    try {
      enforcePermission(userRole, 'edit');

      // Optimistically update locally
      const movingTask = tasks.find((t) => t.task_id === taskId);
      if (!movingTask || movingTask.column_id === targetColumnId) return;

      const columnTasks = tasks.filter((t) => t.column_id === targetColumnId);
      const newPosition = columnTasks.length;

      // Update in Supabase
      const { error: moveError } = await supabase
        .from('tasks')
        .update({
          column_id: targetColumnId,
          position: newPosition,
        })
        .eq('task_id', taskId);

      if (moveError) throw moveError;
    } catch (err) {
      alert(err.message || 'Failed to move task.');
      console.error(err);
    }
  };

  // Task Create Modal Trigger
  const openCreateModal = (columnId) => {
    try {
      enforcePermission(userRole, 'edit');
      setTaskForm({ title: '', description: '', tag: 'None' });
      setTaskModal({ open: true, type: 'create', columnId, task: null });
    } catch (err) {
      alert(err.message);
    }
  };

  // Task Edit Modal Trigger
  const openEditModal = (task) => {
    try {
      enforcePermission(userRole, 'edit');
      setTaskForm({ title: task.title, description: task.description || '', tag: task.tag || 'None' });
      setTaskModal({ open: true, type: 'edit', columnId: task.column_id, task });
    } catch (err) {
      alert(err.message);
    }
  };

  // Task Delete Trigger
  const handleTaskDelete = async (taskId) => {
    try {
      enforcePermission(userRole, 'edit');
      if (!confirm('Are you sure you want to delete this task?')) return;

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('task_id', taskId);

      if (deleteError) throw deleteError;

      // Update local state immediately
      setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    } catch (err) {
      alert(err.message || 'Failed to delete task.');
    }
  };

  // Modal Save (Create or Update)
  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    try {
      enforcePermission(userRole, 'edit');
      const finalTag = taskForm.tag !== 'None' ? taskForm.tag : null;

      if (taskModal.type === 'create') {
        const columnTasks = tasks.filter((t) => t.column_id === taskModal.columnId);
        const position = columnTasks.length;

        const { data: createdTask, error: createError } = await supabase
          .from('tasks')
          .insert({
            board_id: boardId,
            column_id: taskModal.columnId,
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            tag: finalTag,
            position,
            created_by: userId || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Update local state immediately
        setTasks((prev) => {
          if (prev.some((t) => t.task_id === createdTask.task_id)) return prev;
          return [...prev, createdTask].sort((a, b) => a.position - b.position);
        });
      } else {
        const { data: updatedTask, error: updateError } = await supabase
          .from('tasks')
          .update({
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            tag: finalTag,
          })
          .eq('task_id', taskModal.task.task_id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update local state immediately
        setTasks((prev) =>
          prev.map((t) => (t.task_id === updatedTask.task_id ? updatedTask : t))
            .sort((a, b) => a.position - b.position)
        );
      }

      setTaskModal({ open: false, type: 'create', columnId: null, task: null });
    } catch (err) {
      alert(err.message || 'Failed to save task.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: hideHeader ? '200px' : '100vh', backgroundColor: 'transparent', color: 'var(--text-primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading board details...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', padding: '2rem' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', maxWidth: '480px', width: '100%' }}>
          <h3 style={{ fontSize: '1.5rem', color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>{error || 'You do not have access to view this board.'}</p>
          {!guestMode && <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="board-layout" style={{ height: 'auto' }}>
      {/* Board Top Toolbar */}
      {!hideHeader && (
        <div className="board-toolbar">
          <div className="board-info">
            {!guestMode && (
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                &larr; Dashboard
              </button>
            )}
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#fff' }}>{board.title}</h2>
            <span className="board-role-badge">
              {guestMode ? `${userRole} (guest)` : userRole}
            </span>
          </div>

          <div className="board-actions">
            {canEdit(userRole) && (
              <button className="btn btn-primary" onClick={() => setShareModalOpen(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                <svg style={{ width: '16px', height: '16px', fill: '#fff' }} viewBox="0 0 24 24">
                  <path d="M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8A3,3 0 0,0 21,5A3,3 0 0,0 18,2A3,3 0 0,0 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9A3,3 0 0,0 3,12A3,3 0 0,0 6,15C6.79,15 7.5,14.69 8.04,14.19L15.14,18.3C15.09,18.53 15.08,18.75 15.08,19C15.08,20.61 16.39,21.91 18,21.91C19.61,21.91 20.91,20.61 20.91,19C20.91,17.39 19.61,16.08 18,16.08Z" />
                </svg>
                Share Board
              </button>
            )}
          </div>
        </div>
      )}

      {/* Kanban Board Area */}
      <div className="kanban-container" style={{ padding: hideHeader ? '0' : '1.5rem 2rem' }}>
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.column_id === column.column_id);
          return (
            <Column
              key={column.column_id}
              column={column}
              tasks={columnTasks}
              onTaskMove={handleTaskMove}
              onAddTask={openCreateModal}
              onEditTask={openEditModal}
              onDeleteTask={handleTaskDelete}
              canEditBoard={canEdit(userRole)}
            />
          );
        })}
      </div>

      {/* Share Modal Dialog */}
      {shareModalOpen && (
        <ShareBoardModal
          boardId={boardId}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Task Create / Edit Modal Dialog */}
      {taskModal.open && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#0f172a' }}>
                {taskModal.type === 'create' ? 'Create New Task' : 'Edit Task'}
              </h3>
              <button className="modal-close" onClick={() => setTaskModal({ open: false, type: 'create', columnId: null, task: null })}>&times;</button>
            </div>
            <form onSubmit={handleSaveTask}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="taskTitle">Task Title</label>
                  <input
                    id="taskTitle"
                    type="text"
                    className="form-input"
                    placeholder="Refactor auth pipeline..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="taskTag">Category Tag</label>
                  <select
                    id="taskTag"
                    className="form-input"
                    value={taskForm.tag || 'None'}
                    onChange={(e) => setTaskForm({ ...taskForm, tag: e.target.value })}
                  >
                    <option value="None">None</option>
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Design">Design</option>
                    <option value="Research">Research</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="taskDesc">Description</label>
                  <textarea
                    id="taskDesc"
                    className="form-input"
                    placeholder="Add detailed task notes here..."
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setTaskModal({ open: false, type: 'create', columnId: null, task: null })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
