import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';

interface BoardHeaderProps {
  projectName: string;
  onAddTaskClick: () => void;
  loading: boolean;
  activeWorkspaceSlug?: string;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({
  projectName,
  onAddTaskClick,
  loading,
  activeWorkspaceSlug,
}) => {
  return (
    <div className="flex justify-between items-end border-b-2 border-line-strong pb-4 shrink-0">
      <div>
        <Link
          to={`/w/${activeWorkspaceSlug}/projects`}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-mute no-underline mb-2 py-1 px-2 rounded-sm transition-all duration-150 hover:text-orange hover:bg-orange/5 dark:hover:text-[#00F5FF] dark:hover:bg-[#00F5FF]/5"
        >
          <ArrowLeft size={16} />
          <span>All Projects</span>
        </Link>
        <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">
          {projectName}
        </h1>
        <p className="eyebrow text-mute mt-1">Visual Kanban Board Sprint Scope</p>
      </div>

      <button
        onClick={onAddTaskClick}
        className="btn btn-primary flex items-center gap-2"
        disabled={loading}
      >
        <Plus size={16} />
        <span>Add Task</span>
      </button>
    </div>
  );
};
