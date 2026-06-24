import { useState } from 'react';
import Task from './Task';

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
    >
      <div className="column-header">
        <div className="column-title">
          <span>{column?.title}</span>
          <span className="column-count">{tasks.length}</span>
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
            style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
          >
            + Add Task
          </button>
        </div>
      )}
    </div>
  );
}
