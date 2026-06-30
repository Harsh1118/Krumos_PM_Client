import React from 'react';
import { Search } from 'lucide-react';
import type { BoardMember as Member } from '../../../types';

interface BoardFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterAssignee: string;
  setFilterAssignee: (assignee: string) => void;
  filterPriority: string;
  setFilterPriority: (priority: string) => void;
  filterDueDate: string;
  setFilterDueDate: (dueDate: string) => void;
  members: Member[];
  onClear: () => void;
}

export const BoardFilters: React.FC<BoardFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  filterAssignee,
  setFilterAssignee,
  filterPriority,
  setFilterPriority,
  filterDueDate,
  setFilterDueDate,
  members,
  onClear,
}) => {
  return (
    <div
      className="flex items-center gap-3 shrink-0 overflow-x-auto pb-1 mb-3 max-md:gap-2"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="relative flex items-center shrink-0 flex-1 min-w-[160px] max-w-[280px]">
        <Search size={16} className="absolute left-3 text-mute pointer-events-none z-10" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9! py-0! h-[38px] box-border bg-bone-2 min-w-0 w-full"
        />
      </div>

      <select
        value={filterAssignee}
        onChange={(e) => setFilterAssignee(e.target.value)}
        className="h-[38px] py-0! px-3! w-auto! shrink-0 min-w-[150px] font-mono text-[10px] uppercase font-bold tracking-wide bg-bone-2 border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
      >
        <option value="">Assignee: All</option>
        {members.map((m: Member) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name}
          </option>
        ))}
      </select>

      <select
        value={filterPriority}
        onChange={(e) => setFilterPriority(e.target.value)}
        className="h-[38px] py-0! px-3! w-auto! shrink-0 min-w-[150px] font-mono text-[10px] uppercase font-bold tracking-wide bg-bone-2 border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
      >
        <option value="">Priority: All</option>
        <option value="LOW">LOW</option>
        <option value="MEDIUM">MEDIUM</option>
        <option value="HIGH">HIGH</option>
        <option value="URGENT">URGENT</option>
      </select>

      <select
        value={filterDueDate}
        onChange={(e) => setFilterDueDate(e.target.value)}
        className="h-[38px] py-0! px-3! w-auto! shrink-0 min-w-[130px] font-mono text-[10px] uppercase font-bold tracking-wide bg-bone-2 border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
      >
        <option value="">Due: All</option>
        <option value="today">Due Today</option>
        <option value="week">Due This Week</option>
        <option value="overdue">Overdue</option>
      </select>

      {(filterAssignee || filterPriority || filterDueDate || searchQuery) && (
        <button
          onClick={onClear}
          className="btn btn-secondary shrink-0 font-mono text-[10px] py-0! px-4! h-[38px] box-border"
        >
          Clear
        </button>
      )}
    </div>
  );
};
