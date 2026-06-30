import React from 'react';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import type { BoardMember as Member, Task } from '../../../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
  createTitle: string;
  setCreateTitle: (title: string) => void;
  createDesc: string;
  setCreateDesc: (desc: string) => void;
  createAssignee: string;
  setCreateAssignee: (assignee: string) => void;
  createPriority: Task['priority'];
  setCreatePriority: (priority: Task['priority']) => void;
  createDueDate: string;
  setCreateDueDate: (dueDate: string) => void;
  members: Member[];
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  creating,
  createTitle,
  setCreateTitle,
  createDesc,
  setCreateDesc,
  createAssignee,
  setCreateAssignee,
  createPriority,
  setCreatePriority,
  createDueDate,
  setCreateDueDate,
  members,
}) => {
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Task"
      subtitle="Define task scopes and sprint deliverables"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <div className="form-group">
          <label htmlFor="task-title">Task Title</label>
          <input
            id="task-title"
            type="text"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Task objective..."
            disabled={creating}
            className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute disabled:opacity-50"
            required
          />
        </div>

        <div className="form-group mt-6">
          <label htmlFor="task-desc">Description</label>
          <textarea
            id="task-desc"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="What needs to be done..."
            rows={4}
            disabled={creating}
            className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
          />
        </div>

        <div className="form-group mt-6">
          <label htmlFor="task-assignee">Assignee</label>
          <select
            id="task-assignee"
            value={createAssignee}
            onChange={(e) => setCreateAssignee(e.target.value)}
            disabled={creating}
            className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
          >
            <option value="">Unassigned</option>
            {members.map((m: Member) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-6 mt-6">
          <div className="form-group">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={createPriority}
              onChange={(e) => setCreatePriority(e.target.value as Task['priority'])}
              disabled={creating}
              className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="task-due">Due Date</label>
            <input
              id="task-due"
              type="date"
              value={createDueDate}
              onChange={(e) => setCreateDueDate(e.target.value)}
              disabled={creating}
              className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3 px-6 rounded-sm border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-bone-2 text-ink border-line hover:bg-line/20 disabled:border-ghost disabled:text-mute disabled:cursor-not-allowed disabled:bg-bone-2"
            disabled={creating}
          >
            Cancel
          </button>
          <LoadingButton
            type="submit"
            className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3 px-6 rounded-sm border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-ink text-bone border-ink hover:bg-text hover:border-text focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-2 disabled:border-ghost disabled:text-mute disabled:cursor-not-allowed disabled:bg-bone-2"
            loading={creating}
            loadingText="Creating..."
          >
            Create Task
          </LoadingButton>
        </div>
      </form>
    </ResponsiveModal>
  );
};
