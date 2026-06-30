import React from 'react';
import { TaskCard } from './TaskCard';
import type { Task } from '../../../types';

interface KanbanColumnProps {
  title: string;
  status: Task['status'];
  tasks: Task[];
  isSleek: boolean;
  activeDragColumn: string | null;
  setActiveDragColumn: (status: Task['status'] | null) => void;
  onDropOnColumn: (e: React.DragEvent, status: Task['status']) => void;
  onDropOnCard: (e: React.DragEvent, targetTask: Task) => void;
  onCardClick: (task: Task) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  isSleek,
  activeDragColumn,
  setActiveDragColumn,
  onDropOnColumn,
  onDropOnCard,
  onCardClick,
  onDragStart,
  onDragEnd,
}) => {
  const isDoneCol = status === 'DONE';

  return (
    <div
      className={`bg-bone-2 border border-line rounded-md flex flex-col p-5 h-full min-h-0 box-border ${
        isDoneCol ? 'bg-[#dfdbd4]/40 dark:bg-bone-2/80' : ''
      } ${
        activeDragColumn === status ? 'border-dashed border-orange! bg-orange/2 shadow-inner' : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (activeDragColumn !== status) {
          setActiveDragColumn(status);
        }
      }}
      onDragEnter={() => setActiveDragColumn(status)}
      onDragLeave={() => setActiveDragColumn(null)}
      onDrop={(e) => {
        setActiveDragColumn(null);
        onDropOnColumn(e, status);
      }}
    >
      <div className="flex justify-between items-center mb-5 border-b border-line pb-3 shrink-0">
        <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-ink">{title}</h3>
        <span className="badge badge-medium font-mono text-[9px]">{tasks.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
        {tasks.length === 0 ? (
          <div className="font-mono text-[10px] text-mute text-center p-6 border border-dashed border-line rounded-sm">
            Drag tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSleek={isSleek}
              isDoneCol={isDoneCol}
              onCardClick={() => onCardClick(task)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDropOnCard={onDropOnCard}
            />
          ))
        )}
      </div>
    </div>
  );
};
