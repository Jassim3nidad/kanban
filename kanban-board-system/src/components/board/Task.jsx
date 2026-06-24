export default function Task({ task, onEdit, onDelete, canEditBoard }) {
  // task shape: { task_id, title, description, position, tag }

  const handleDragStart = (e) => {
    if (!canEditBoard) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.task_id);
  };

  const getTagDotColor = (tag) => {
    switch (tag?.toLowerCase()) {
      case 'backend': return '#64748b'; // grey
      case 'frontend': return '#f97316'; // orange/red
      case 'design': return '#2563eb'; // blue
      case 'research': return '#8b5cf6'; // purple
      default: return '#cbd5e1';
    }
  };

  return (
    <div
      className="task-card"
      draggable={canEditBoard}
      onDragStart={handleDragStart}
    >
      <h4 className="task-title" style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{task?.title}</h4>
      
      {task?.description && (
        <p className="task-desc" style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.25rem' }}>{task.description}</p>
      )}

      {task?.tag && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.725rem',
          fontWeight: 700,
          color: '#475569',
          marginTop: '0.5rem'
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: getTagDotColor(task.tag)
          }}></span>
          {task.tag}
        </div>
      )}

      {canEditBoard && (
        <div className="task-footer">
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Task</span>
          <div className="task-actions">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="task-action-btn"
              title="Edit Task"
            >
              <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="task-action-btn delete"
              title="Delete Task"
            >
              <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
