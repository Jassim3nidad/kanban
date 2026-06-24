import { useState } from 'react';
import Task from './Task';

// Color themes keyed by normalized column title
const COLUMN_THEMES = {
  'to do': {
    border: '#3b82f6',
    bg: 'rgba(59,130,246,0.04)',
    badgeBg: 'rgba(59,130,246,0.12)',
    badgeColor: '#1d4ed8',
    dotColor: '#3b82f6',
    headerColor: '#1e3a8a',
  },
  'in progress': {
    border: '#f59e0b',
    bg: 'rgba(245,158,11,0.04)',
    badgeBg: 'rgba(245,158,11,0.15)',
    badgeColor: '#b45309',
    dotColor: '#f59e0b',
    headerColor: '#78350f',
  },
  'done': {
    border: '#10b981',
    bg: 'rgba(16,185,129,0.04)',
    badgeBg: 'rgba(16,185,129,0.13)',
    badgeColor: '#065f46',
    dotColor: '#10b981',
    headerColor: '#064e3b',
  },
};

const DEFAULT_THEME = {
  border: '#8b5cf6',
  bg: 'rgba(139,92,246,0.04)',
  badgeBg: 'rgba(139,92,246,0.12)',
  badgeColor: '#5b21b6',
  dotColor: '#8b5cf6',
  headerColor: '#3b0764',
};

function getTheme(title = '') {
  return COLUMN_THEMES[title.trim().toLowerCase()] || DEFAULT_THEME;
}

export default function Column({
  column,
  tasks = [],
  onTaskMove,
  onAddTask,
  onEditTask,
  onDeleteTask,
  canEditBoard
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const theme = getTheme(column?.title);

  const handleDragOver = (e) => {
    if (!canEditBoard) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    if (!canEditBoard) return;
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onTaskMove(taskId, column.column_id);
    }
  };

  return (
    <div
      className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        borderTop: `3px solid ${theme.border}`,
        backgroundColor: isDragOver ? `${theme.border}10` : theme.bg,
        transition: 'background-color 0.2s ease',
      }}
    >
      <div className="column-header" style={{ paddingBottom: '0.75rem', borderBottom: `1px solid ${theme.border}22` }}>
        <div className="column-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Colored status dot */}
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: theme.dotColor,
            flexShrink: 0,
            boxShadow: `0 0 6px ${theme.dotColor}88`,
            display: 'inline-block',
          }} />
          <span style={{ fontWeight: 700, color: theme.headerColor, fontSize: '0.9rem' }}>
            {column?.title}
          </span>
          {/* Colored count badge */}
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.7rem',
            fontWeight: 700,
            backgroundColor: theme.badgeBg,
            color: theme.badgeColor,
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            minWidth: '20px',
            textAlign: 'center',
          }}>
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="tasks-list">
        {tasks.map((task) => (
          <Task
            key={task.task_id}
            task={task}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.task_id)}
            canEditBoard={canEditBoard}
          />
        ))}
      </div>

      {canEditBoard && (
        <div className="column-footer">
          <button
            className="btn btn-secondary"
            onClick={() => onAddTask(column.column_id)}
            style={{
              width: '100%',
              padding: '0.5rem',
              fontSize: '0.85rem',
              borderColor: `${theme.border}44`,
              color: theme.badgeColor,
            }}
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}
