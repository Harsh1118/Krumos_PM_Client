import React from 'react';
import { Clock } from 'lucide-react';
import type { Task } from '../../../types';

interface TaskCardProps {
  task: Task;
  isSleek: boolean;
  isDoneCol: boolean;
  onCardClick: () => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onDropOnCard: (e: React.DragEvent, targetTask: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isSleek,
  isDoneCol,
  onCardClick,
  onDragStart,
  onDragEnd,
  onDropOnCard,
}) => {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  const getCardBorders = () => {
    if (isSleek) {
      switch (task.status) {
        case 'TODO':
          return 'border-l-[#4B5263]! dark:bg-[#121212] dark:border-white/5!';
        case 'IN_PROGRESS':
          return 'border-l-[#00B8D4]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(0,184,212,0.1)]';
        case 'IN_REVIEW':
          return 'border-l-[#00F5FF]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(0,245,255,0.15)]';
        case 'DONE':
          return 'border-l-[#39FF14]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(57,255,20,0.1)]';
      }
    } else {
      switch (task.status) {
        case 'TODO':
          return 'border-l-[#8B847A]!';
        case 'IN_PROGRESS':
          return 'border-l-orange! shadow-[0_0_10px_rgba(244,78,20,0.1)]';
        case 'IN_REVIEW':
          return 'border-l-orange-hot! shadow-[0_0_10px_rgba(255,106,43,0.1)]';
        case 'DONE':
          return 'border-l-green! shadow-[0_0_10px_rgba(61,204,109,0.1)]';
      }
    }
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => onDropOnCard(e, task)}
      className={`card bg-bone p-5 cursor-grab active:cursor-grabbing select-none flex flex-col gap-4 transition-all duration-250 w-full min-w-0 border-l-[3px]! hover:border-line-strong hover:shadow-md ${
        isDoneCol ? 'opacity-70' : ''
      } ${getCardBorders()}`}
      onClick={onCardClick}
    >
      <span className="font-display font-bold text-sm text-text leading-snug break-words">
        {task.title}
      </span>

      <div className="flex justify-between items-center gap-3">
        <span
          className={`badge ${
            task.priority === 'HIGH' || task.priority === 'URGENT'
              ? 'badge-high'
              : 'badge-medium'
          } text-[9px]`}
        >
          {task.priority}
        </span>

        <div className="flex items-center gap-2.5">
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 text-mute text-[9px] eyebrow ${
                isOverdue && !isDoneCol ? 'text-red-650 font-bold' : ''
              }`}
            >
              <Clock size={10} />
              <span>
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {task.assignee && (
            <img
              src={
                task.assignee.avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee.name}`
              }
              alt={task.assignee.name}
              className="w-6 h-6 rounded-sm"
              title={`Assigned to ${task.assignee.name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
