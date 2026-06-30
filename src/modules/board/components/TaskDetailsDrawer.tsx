import React from 'react';
import { X, Trash2, MessageSquare, History, Send } from 'lucide-react';
import { formatActivityTime } from '../../../utils';
import type { Task, BoardMember as Member, Comment, ActivityLog } from '../../../types';

interface TaskDetailsDrawerProps {
  selectedTask: Task;
  onClose: () => void;
  isManagerOrAdmin: boolean;
  isMember: boolean;
  currentUserId?: string;
  editTitle: string;
  setEditTitle: (title: string) => void;
  editDesc: string;
  setEditDesc: (desc: string) => void;
  onTitleBlur: () => void;
  onDescBlur: () => void;
  members: Member[];
  comments: Comment[];
  activityLogs: ActivityLog[];
  activeTab: 'comments' | 'activity';
  setActiveTab: (tab: 'comments' | 'activity') => void;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  onAddComment: (e: React.FormEvent) => void;
  onDeleteTask: () => void;
  onUpdateField: (fields: Partial<Task>) => void;
  isUpdating: boolean;
  isDeleting: boolean;
  isPostingComment: boolean;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  selectedTask,
  onClose,
  isManagerOrAdmin,
  isMember,
  currentUserId,
  editTitle,
  setEditTitle,
  editDesc,
  setEditDesc,
  onTitleBlur,
  onDescBlur,
  members,
  comments,
  activityLogs,
  activeTab,
  setActiveTab,
  newCommentText,
  setNewCommentText,
  onAddComment,
  onDeleteTask,
  onUpdateField,
  isUpdating,
  isDeleting,
  isPostingComment,
}) => {
  const isOverdue =
    selectedTask.dueDate &&
    new Date(selectedTask.dueDate) < new Date() &&
    selectedTask.status !== 'DONE';

  const isDisabled =
    (isMember && selectedTask.assigneeId !== currentUserId) || isUpdating;

  return (
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-[500] flex justify-end animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] h-full bg-bone border-l border-ink shadow-lg flex flex-col animate-slide-in-right dark:bg-[#0c0c0e] dark:border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[70px] px-6 border-b border-line flex justify-between items-center shrink-0">
          <span className="eyebrow text-mute">Task Settings</span>
          <div className="flex items-center gap-2">
            {isManagerOrAdmin && (
              <button
                onClick={onDeleteTask}
                className="btn btn-danger btn-icon-only"
                title="Delete Task"
                disabled={isDeleting}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={onClose} className="btn btn-secondary btn-icon-only">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-10 flex flex-col gap-8">
          {/* Title Input */}
          <div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="w-full border-none bg-transparent font-display text-2xl font-black text-ink py-1 border-b border-dashed border-transparent transition-all duration-150 focus:border-ink focus:outline-none dark:text-[#E0E2E5] dark:focus:border-[#00F5FF]"
              placeholder="Task Title"
              disabled={isDisabled}
            />
          </div>

          {/* Grid Metadata Selector */}
          <div className="flex flex-col gap-4 bg-bone-2 border border-line rounded-sm p-5 dark:bg-[#121212] dark:border-white/5">
            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Status</span>
              <select
                value={selectedTask.status}
                onChange={(e) => onUpdateField({ status: e.target.value as Task['status'] })}
                disabled={isDisabled}
                className="py-1.5 px-3 bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Priority</span>
              <select
                value={selectedTask.priority}
                onChange={(e) => onUpdateField({ priority: e.target.value as Task['priority'] })}
                disabled={!isManagerOrAdmin || isUpdating}
                className="py-1.5 px-3 bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Assignee</span>
              <select
                value={selectedTask.assigneeId || ''}
                onChange={(e) => onUpdateField({ assigneeId: e.target.value || null })}
                disabled={!isManagerOrAdmin || isUpdating}
                className="py-1.5 px-3 bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
              >
                <option value="">Unassigned</option>
                {members.map((m: Member) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Due Date</span>
              <input
                type="date"
                value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ''}
                onChange={(e) =>
                  onUpdateField({
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
                disabled={!isManagerOrAdmin || isUpdating}
                className={`py-1.5 px-3 bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white ${
                  isOverdue ? 'text-red-650 font-bold' : ''
                }`}
              />
            </div>

            <div className="grid grid-cols-[120px_1fr] items-center">
              <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Reporter</span>
              <div className="text-sm font-bold text-text">
                <span>{selectedTask.reporter.name}</span>
              </div>
            </div>
          </div>

          {/* Description editor */}
          <div className="flex flex-col gap-2">
            <label className="eyebrow text-muted">Description</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={onDescBlur}
              placeholder="Add detailed task instructions..."
              rows={6}
              disabled={isDisabled}
              className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
            />
          </div>

          {/* Tabs Sections: Comments vs Activity Logs */}
          <div className="border-t border-line pt-8 flex flex-col gap-6">
            <div className="flex border-b border-line gap-4">
              <button
                className={`bg-transparent border-none py-2 px-0 text-mute cursor-pointer flex items-center gap-2 border-b-2 transition-all duration-150 eyebrow text-[10px] hover:text-ink ${
                  activeTab === 'comments'
                    ? 'text-orange border-b-orange dark:text-[#00F5FF] dark:border-b-[#00F5FF]'
                    : 'border-transparent'
                }`}
                onClick={() => setActiveTab('comments')}
              >
                <MessageSquare size={12} />
                <span>Comments ({comments.length})</span>
              </button>
              <button
                className={`bg-transparent border-none py-2 px-0 text-mute cursor-pointer flex items-center gap-2 border-b-2 transition-all duration-150 eyebrow text-[10px] hover:text-ink ${
                  activeTab === 'activity'
                    ? 'text-orange border-b-orange dark:text-[#00F5FF] dark:border-b-[#00F5FF]'
                    : 'border-transparent'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                <History size={12} />
                <span>Activity Log ({activityLogs.length})</span>
              </button>
            </div>

            <div className="min-h-[200px]">
              {activeTab === 'comments' ? (
                /* Comments List */
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-5 max-h-[240px] overflow-y-auto pr-1">
                    {comments.length === 0 ? (
                      <p className="eyebrow text-center text-muted py-4">No comments posted yet.</p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.id} className="flex gap-4 items-start">
                          <img
                            src={
                              c.user.avatarUrl ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${c.user.name}`
                            }
                            alt={c.user.name}
                            className="w-7 h-7 rounded-sm shrink-0"
                          />
                          <div className="bg-bone-2 border border-line rounded-sm p-4 flex-1 dark:bg-[#121212] dark:border-white/5">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-bold text-ink">{c.user.name}</span>
                              <span className="font-mono text-[8px] text-mute">
                                {formatActivityTime(c.createdAt)}
                              </span>
                            </div>
                            <p className="text-[13px] text-text leading-relaxed break-words">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment input */}
                  <form onSubmit={onAddComment} className="flex gap-3 mt-4">
                    <input
                      type="text"
                      placeholder="Post a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      disabled={isPostingComment}
                      className="flex-1 bg-bone-2"
                      required
                    />
                    <button
                      type="submit"
                      className="btn btn-primary p-3 w-11"
                      disabled={isPostingComment}
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              ) : (
                /* Activity Log Feed */
                <div className="max-h-[280px] overflow-y-auto pr-1">
                  {activityLogs.length === 0 ? (
                    <p className="eyebrow text-center text-muted py-4">No activity logged.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className="grid grid-cols-[90px_1fr] text-[12px] leading-relaxed"
                        >
                          <span className="font-mono text-[9px] text-mute mt-0.5">
                            {formatActivityTime(log.createdAt, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                          <p className="text-ink-soft">
                            <strong className="font-bold text-ink">{log.user.name}</strong>{' '}
                            {log.event === 'CREATED' && 'created task'}
                            {log.event === 'STATUS_CHANGED' &&
                              `changed status to ${log.details?.new}`}
                            {log.event === 'PRIORITY_CHANGED' &&
                              `changed priority to ${log.details?.new}`}
                            {log.event === 'ASSIGNEE_CHANGED' && `updated assignee`}
                            {log.event === 'DUE_DATE_CHANGED' && 'updated due date'}
                            {log.event === 'COMMENT_ADDED' && 'posted a comment'}
                            {log.event === 'TITLE_CHANGED' && `renamed task`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
