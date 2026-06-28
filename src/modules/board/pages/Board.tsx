import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useWorkspaces, WorkspaceRole } from '../../../context/WorkspaceContext';
import { useAuthStore } from '../../../store/authStore';
import { useSocket } from '../../../context/SocketContext';
import api from '../../../config/apiConfig';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Search,
  Plus,
  X,
  MessageSquare,
  History,
  Trash2,
  Send,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { BoardSkeleton } from '../../../components/ui/Skeleton';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { formatActivityTime } from '../../../utils';
import type { Task, BoardMember as Member, Comment, ActivityLog, ApiError } from '../../../types';

const EMPTY_TASKS: Task[] = [];

export const Board: React.FC = () => {
  const queryClient = useQueryClient();
  const { projectId } = useParams<{ slug: string; projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWorkspace } = useWorkspaces();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const toast = useToast();

  const [activeDragColumn, setActiveDragColumn] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterDueDate, setFilterDueDate] = useState('');

  // Task panel drawers / modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [newCommentText, setNewCommentText] = useState('');

  // Edit fields states
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Create task modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createAssignee, setCreateAssignee] = useState('');
  const [createPriority, setCreatePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [createDueDate, setCreateDueDate] = useState('');

  const isMember = activeWorkspace?.role === WorkspaceRole.MEMBER;
  const isManagerOrAdmin =
    activeWorkspace?.role === WorkspaceRole.ADMIN || activeWorkspace?.role === WorkspaceRole.MANAGER;

  // Track if sleek theme is active for status glow effects
  const [isSleek, setIsSleek] = useState(() => document.body.getAttribute('data-theme') === 'sleek');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsSleek(document.body.getAttribute('data-theme') === 'sleek');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // 1. Fetch Project Details
  const { data: projectDetails } = useQuery<{ id: string; name: string }>({
    queryKey: ['projectDetails', activeWorkspace?.slug, projectId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/projects/${projectId}`);
      return res.data;
    },
    enabled: !!activeWorkspace && !!projectId,
  });

  const projectName = projectDetails?.name || 'Project Board';

  // 2. Fetch Workspace Members
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['workspaceMembers', activeWorkspace?.slug],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/members`);
      return res.data;
    },
    enabled: !!activeWorkspace,
  });

  // 3. Fetch Tasks
  const { data: queryTasks, isLoading: loading } = useQuery<Task[]>({
    queryKey: ['boardTasks', activeWorkspace?.slug, projectId, { filterAssignee, filterPriority, filterDueDate, searchQuery }],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (filterAssignee) q.append('assigneeId', filterAssignee);
      if (filterPriority) q.append('priority', filterPriority);
      if (filterDueDate) q.append('dueDate', filterDueDate);
      if (searchQuery) q.append('search', searchQuery);

      const res = await api.get(
        `/workspaces/${activeWorkspace?.slug}/projects/${projectId}/tasks?${q.toString()}`,
      );
      return res.data;
    },
    enabled: !!activeWorkspace && !!projectId,
  });

  const tasks = queryTasks || EMPTY_TASKS;

  // Fetch comments via TanStack Query
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['taskComments', selectedTask?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/tasks/${selectedTask?.id}/comments`);
      return res.data;
    },
    enabled: !!activeWorkspace && !!selectedTask?.id,
  });

  // Fetch activity logs via TanStack Query
  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ['taskActivity', selectedTask?.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/tasks/${selectedTask?.id}/activity`);
      return res.data;
    },
    enabled: !!activeWorkspace && !!selectedTask?.id,
  });

  // Auto-open selected task from URL query parameters
  const autoTaskId = searchParams.get('taskId');
  useEffect(() => {
    if (autoTaskId && tasks.length > 0) {
      const found = tasks.find((t: Task) => t.id === autoTaskId);
      if (found) {
        if (!selectedTask || selectedTask.id !== autoTaskId) {
          setSelectedTask(found);
          setEditTitle(found.title);
          setEditDesc(found.description || '');
        }
      }
    } else if (!autoTaskId && selectedTask) {
      setSelectedTask(null);
      setEditTitle('');
      setEditDesc('');
    }
  }, [autoTaskId, tasks, selectedTask]);

  // Sync the open task sidebar when the tasks list is refetched (e.g. from a WebSocket event).
  // This prevents stale data in the sidebar from overwriting a change made by another user.
  // We only update if the user is not actively editing the title or description fields.
  useEffect(() => {
    if (!selectedTask || tasks.length === 0) return;
    const freshTask = tasks.find((t: Task) => t.id === selectedTask.id);
    if (!freshTask) return;

    const isTitleActive = document.activeElement?.getAttribute('placeholder') === 'Task Title';
    const isDescActive = document.activeElement?.tagName === 'TEXTAREA';

    setSelectedTask(freshTask);
    if (!isTitleActive) setEditTitle(freshTask.title);
    if (!isDescActive) setEditDesc(freshTask.description || '');
  // tasks is the only dep needed; selectedTask ref is read but not a change driver here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);


  useEffect(() => {
    if (socket) {
      const handleTaskChange = () => {
        queryClient.invalidateQueries({ queryKey: ['boardTasks'] });
      };

      socket.on('task_created', handleTaskChange);
      socket.on('task_updated', handleTaskChange);
      socket.on('task_deleted', handleTaskChange);

      return () => {
        socket.off('task_created', handleTaskChange);
        socket.off('task_updated', handleTaskChange);
        socket.off('task_deleted', handleTaskChange);
      };
    }
  }, [socket, queryClient]);

  // 5. Create Task Mutation & Action
  const createTaskMutation = useMutation({
    mutationFn: async (fields: { title: string; description?: string; assigneeId?: string; priority: string; dueDate?: string }) => {
      const res = await api.post(`/workspaces/${activeWorkspace?.slug}/projects/${projectId}/tasks`, fields);
      return res.data;
    },
    onSuccess: (newTask) => {
      setIsCreateOpen(false);
      setCreateTitle('');
      setCreateDesc('');
      setCreateAssignee('');
      setCreatePriority('MEDIUM');
      setCreateDueDate('');
      toast.success(`Task "${newTask.title}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['boardTasks'] });
    },
    onError: (err) => {
      toast.error('Failed to create task');
      console.error(err);
    }
  });

  const creating = createTaskMutation.isPending;

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || !activeWorkspace || !projectId) return;

    createTaskMutation.mutate({
      title: createTitle.trim(),
      description: createDesc.trim() || undefined,
      assigneeId: createAssignee || undefined,
      priority: createPriority,
      dueDate: createDueDate || undefined,
    });
  };

  // 6. Update Task Mutation (Optimistic Update)
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, fields }: { taskId: string; fields: Partial<Task> }) => {
      const res = await api.patch(`/workspaces/${activeWorkspace?.slug}/tasks/${taskId}`, fields);
      return res.data;
    },
    onMutate: async ({ taskId, fields }) => {
      await queryClient.cancelQueries({ queryKey: ['boardTasks'] });
      
      const queryKey = ['boardTasks', activeWorkspace?.slug, projectId, { filterAssignee, filterPriority, filterDueDate, searchQuery }];
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          queryKey,
          previousTasks.map((t) => (t.id === taskId ? { ...t, ...fields } : t))
        );
      }

      const previousSelectedTask = selectedTask;
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask((curr) => curr ? { ...curr, ...fields } as Task : null);
      }

      return { previousTasks, previousSelectedTask, queryKey };
    },
    onError: (err: ApiError, _variables, context) => {
      if (context?.previousTasks && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
      if (context?.previousSelectedTask) {
        setSelectedTask(context.previousSelectedTask);
      }
      toast.error(err.response?.data?.message || 'Failed to update task');
    },
    onSuccess: (updatedTask) => {
      setSelectedTask((curr) => {
        if (curr && curr.id === updatedTask.id) {
          setEditTitle(updatedTask.title);
          setEditDesc(updatedTask.description || '');
          return updatedTask;
        }
        return curr;
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['boardTasks'] });
    }
  });

  const handleUpdateTaskField = async (taskId: string, fields: Partial<Task>) => {
    updateTaskMutation.mutate({ taskId, fields });
  };

  // 7. HTML5 Drag & Drop Handlers (With Optimistic UI updates)
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drop on column wrapper
  const handleDropOnColumn = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t: Task) => t.id === taskId);
    if (!task) return;

    // Enforce MEMBER gate
    if (isMember && task.assigneeId !== currentUser?.id) {
      toast.error('Members can only update tasks assigned to them');
      return;
    }

    if (task.status === status) return; // No change

    const columnTasks = tasks.filter((t: Task) => t.status === status).sort((a: Task, b: Task) => a.order - b.order);
    const nextOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order + 1.0 : 1.0;

    await handleUpdateTaskField(taskId, { status, order: nextOrder });
  };

  // Drop over specific card (reordering)
  const handleDropOnCard = async (e: React.DragEvent, targetTask: Task) => {
    e.stopPropagation();
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId === targetTask.id) return; // cannot drop on self

    const draggedTask = tasks.find((t: Task) => t.id === taskId);
    if (!draggedTask) return;

    // Enforce MEMBER gate
    if (isMember && draggedTask.assigneeId !== currentUser?.id) {
      toast.error('Members can only update tasks assigned to them');
      return;
    }

    const status = targetTask.status;
    const columnTasks = tasks.filter((t: Task) => t.status === status).sort((a: Task, b: Task) => a.order - b.order);
    const targetIndex = columnTasks.findIndex((t: Task) => t.id === targetTask.id);

    let nextOrder = 0;
    if (targetIndex === 0) {
      nextOrder = targetTask.order / 2;
    } else {
      const prevTask = columnTasks[targetIndex - 1];
      if (prevTask.id === taskId) return; // no-op
      nextOrder = (prevTask.order + targetTask.order) / 2;
    }

    await handleUpdateTaskField(taskId, { status, order: nextOrder });
  };

  // 8. Task Side Drawer details
  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setSearchParams({ taskId: task.id });
    setActiveTab('comments');
  };

  const handleCloseDetails = () => {
    setSelectedTask(null);
    setSearchParams({});
  };

  const handleDetailsTitleBlur = async () => {
    if (!selectedTask || editTitle.trim() === selectedTask.title) return;
    await handleUpdateTaskField(selectedTask.id, { title: editTitle.trim() });
  };

  const handleDetailsDescBlur = async () => {
    if (!selectedTask || editDesc.trim() === (selectedTask.description || '')) return;
    await handleUpdateTaskField(selectedTask.id, { description: editDesc.trim() || undefined });
  };

  // Post Comment Mutation (Optimistic Update)
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(
        `/workspaces/${activeWorkspace?.slug}/tasks/${selectedTask?.id}/comments`,
        { content }
      );
      return res.data;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['taskComments', selectedTask?.id] });
      const previousComments = queryClient.getQueryData<Comment[]>(['taskComments', selectedTask?.id]);

      if (previousComments && currentUser) {
        const tempComment: Comment = {
          id: Math.random().toString(),
          content,
          createdAt: new Date().toISOString(),
          user: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
          }
        };
        queryClient.setQueryData<Comment[]>(
          ['taskComments', selectedTask?.id],
          [...(previousComments || []), tempComment]
        );
      }

      return { previousComments };
    },
    onError: (_err, _content, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['taskComments', selectedTask?.id], context.previousComments);
      }
      toast.error('Failed to post comment');
    },
    onSuccess: () => {
      setNewCommentText('');
      queryClient.invalidateQueries({ queryKey: ['taskComments', selectedTask?.id] });
      queryClient.invalidateQueries({ queryKey: ['taskActivity', selectedTask?.id] });
    }
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    addCommentMutation.mutate(newCommentText.trim());
  };

  // Delete Task Mutation (Optimistic Update)
  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${activeWorkspace?.slug}/tasks/${selectedTask?.id}`);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['boardTasks'] });
      const queryKey = ['boardTasks', activeWorkspace?.slug, projectId, { filterAssignee, filterPriority, filterDueDate, searchQuery }];
      const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

      if (previousTasks && selectedTask) {
        queryClient.setQueryData<Task[]>(
          queryKey,
          previousTasks.filter((t) => t.id !== selectedTask.id)
        );
      }

      const previousSelectedTask = selectedTask;
      handleCloseDetails();

      return { previousTasks, previousSelectedTask, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
      if (context?.previousSelectedTask) {
        setSelectedTask(context.previousSelectedTask);
      }
      toast.error('Failed to delete task');
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['boardTasks'] });
    }
  });

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this task? This cannot be undone.`,
    );
    if (!confirmDelete) return;
    deleteTaskMutation.mutate();
  };

  const isOverdueTask = (dueDateStr: string | null) => {
    if (!dueDateStr) return false;
    return new Date(dueDateStr) < new Date() && selectedTask?.status !== 'DONE';
  };

  const columns: { title: string; status: Task['status']; color: string }[] = [
    { title: 'To Do', status: 'TODO', color: 'col-todo' },
    { title: 'In Progress', status: 'IN_PROGRESS', color: 'col-progress' },
    { title: 'In Review', status: 'IN_REVIEW', color: 'col-review' },
    { title: 'Done', status: 'DONE', color: 'col-done' },
  ];

  // Helper to resolve card borders
  const getCardBorders = (status: Task['status']) => {
    if (isSleek) {
      switch (status) {
        case 'TODO': return 'border-l-[#4B5263]! dark:bg-[#121212] dark:border-white/5!';
        case 'IN_PROGRESS': return 'border-l-[#00B8D4]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(0,184,212,0.1)]';
        case 'IN_REVIEW': return 'border-l-[#00F5FF]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(0,245,255,0.15)]';
        case 'DONE': return 'border-l-[#39FF14]! dark:bg-[#121212] dark:border-white/5! shadow-[0_0_10px_rgba(57,255,20,0.1)]';
      }
    } else {
      switch (status) {
        case 'TODO': return 'border-l-[#8B847A]!';
        case 'IN_PROGRESS': return 'border-l-orange! shadow-[0_0_10px_rgba(244,78,20,0.1)]';
        case 'IN_REVIEW': return 'border-l-orange-hot! shadow-[0_0_10px_rgba(255,106,43,0.1)]';
        case 'DONE': return 'border-l-green! shadow-[0_0_10px_rgba(61,204,109,0.1)]';
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0 h-full page-enter">
      {/* Top Banner */}
      <div className="flex justify-between items-end border-b-2 border-line-strong pb-4 shrink-0">
        <div>
          <Link
            to={`/w/${activeWorkspace?.slug}/projects`}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-mute no-underline mb-2 py-1 px-2 rounded-sm transition-all duration-150 hover:text-orange hover:bg-orange/5 dark:hover:text-[#00F5FF] dark:hover:bg-[#00F5FF]/5"
          >
            <ArrowLeft size={16} />
            <span>All Projects</span>
          </Link>
          <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">{projectName}</h1>
          <p className="eyebrow text-mute mt-1">Visual Kanban Board Sprint Scope</p>
        </div>

        <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary flex items-center gap-2" disabled={loading}>
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Options — horizontally scrollable on mobile */}
      <div className="flex items-center gap-3 shrink-0 overflow-x-auto pb-1 mb-3 max-md:gap-2" style={{ scrollbarWidth: 'none' }}>
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
            onClick={() => {
              setFilterAssignee('');
              setFilterPriority('');
              setFilterDueDate('');
              setSearchQuery('');
            }}
            className="btn btn-secondary shrink-0 font-mono text-[10px] py-0! px-4! h-[38px] box-border"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <BoardSkeleton />
      ) : (
        /* Kanban Columns Grid — 4 cols on desktop, horizontal snap scroll on mobile */
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-4 gap-6 flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2 items-stretch max-lg:grid-cols-[repeat(4,min(280px,80vw))] max-lg:snap-x max-lg:snap-mandatory" style={{ scrollbarWidth: 'thin' }}>
          {columns.map((col) => {
            const colTasks = tasks.filter((t: Task) => t.status === col.status).sort((a: Task, b: Task) => a.order - b.order);
            const isDoneCol = col.status === 'DONE';
            return (
              <div
                key={col.status}
                className={`bg-bone-2 border border-line rounded-md flex flex-col p-5 h-full min-h-0 box-border ${isDoneCol ? 'bg-[#dfdbd4]/40 dark:bg-bone-2/80' : ''} ${activeDragColumn === col.status ? 'border-dashed border-orange! bg-orange/2 shadow-inner' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (activeDragColumn !== col.status) {
                    setActiveDragColumn(col.status);
                  }
                }}
                onDragEnter={() => setActiveDragColumn(col.status)}
                onDragLeave={() => setActiveDragColumn(null)}
                onDrop={async (e) => {
                  setActiveDragColumn(null);
                  await handleDropOnColumn(e, col.status);
                }}
              >
                <div className="flex justify-between items-center mb-5 border-b border-line pb-3 shrink-0">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-ink">{col.title}</h3>
                  <span className="badge badge-medium font-mono text-[9px]">{colTasks.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-0.5">
                  {colTasks.length === 0 ? (
                    <div className="font-mono text-[10px] text-mute text-center p-6 border border-dashed border-line rounded-sm">
                      Drag tasks here
                    </div>
                  ) : (
                    colTasks.map((t: Task) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onDragEnd={() => setActiveDragColumn(null)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropOnCard(e, t)}
                        className={`card bg-bone p-5 cursor-grab active:cursor-grabbing select-none flex flex-col gap-4 transition-all duration-250 w-full min-w-0 border-l-[3px]! hover:border-line-strong hover:shadow-md ${isDoneCol ? 'opacity-70' : ''} ${getCardBorders(t.status)}`}
                        onClick={() => handleOpenDetails(t)}
                      >
                        <span className="font-display font-bold text-sm text-text leading-snug break-words">{t.title}</span>

                        <div className="flex justify-between items-center gap-3">
                          <span className={`badge ${t.priority === 'HIGH' || t.priority === 'URGENT' ? 'badge-high' : 'badge-medium'} text-[9px]`}>
                            {t.priority}
                          </span>

                          <div className="flex items-center gap-2.5">
                            {t.dueDate && (
                              <div className={`flex items-center gap-1 text-mute text-[9px] eyebrow ${isOverdueTask(t.dueDate) && !isDoneCol ? 'text-red-600 font-bold' : ''}`}>
                                <Clock size={10} />
                                <span>{new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}

                            {t.assignee && (
                              <img
                                src={t.assignee.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${t.assignee.name}`}
                                alt={t.assignee.name}
                                className="w-6 h-6 rounded-sm"
                                title={`Assigned to ${t.assignee.name}`}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Task Details Side Drawer panel */}
      {selectedTask && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] z-[500] flex justify-end animate-fade-in" onClick={handleCloseDetails}>
          <div
            className="w-full max-w-[520px] h-full bg-bone border-l border-ink shadow-lg flex flex-col animate-slide-in-right dark:bg-[#0c0c0e] dark:border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[70px] px-6 border-b border-line flex justify-between items-center shrink-0">
              <span className="eyebrow text-mute">Task Settings</span>
              <div className="flex items-center gap-2">
                {isManagerOrAdmin && (
                  <button onClick={handleDeleteTask} className="btn btn-danger btn-icon-only" title="Delete Task" disabled={deleteTaskMutation.isPending}>
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={handleCloseDetails} className="btn btn-secondary btn-icon-only">
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
                  onBlur={handleDetailsTitleBlur}
                  className="w-full border-none bg-transparent font-display text-2xl font-black text-ink py-1 border-b border-dashed border-transparent transition-all duration-150 focus:border-ink focus:outline-none dark:text-[#E0E2E5] dark:focus:border-[#00F5FF]"
                  placeholder="Task Title"
                  disabled={(isMember && selectedTask.assigneeId !== currentUser?.id) || updateTaskMutation.isPending}
                />
              </div>

              {/* Grid Metadata Selector */}
              <div className="flex flex-col gap-4 bg-bone-2 border border-line rounded-sm p-5 dark:bg-[#121212] dark:border-white/5">
                <div className="grid grid-cols-[120px_1fr] items-center">
                  <span className="text-[10px] text-mute uppercase tracking-widest font-mono">Status</span>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, { status: e.target.value as Task['status'] })}
                    disabled={(isMember && selectedTask.assigneeId !== currentUser?.id) || updateTaskMutation.isPending}
                    className="py-1.5 px-3 font-display text-sm bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
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
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, { priority: e.target.value as Task['priority'] })}
                    disabled={!isManagerOrAdmin || updateTaskMutation.isPending}
                    className="py-1.5 px-3 font-display text-sm bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
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
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, { assigneeId: e.target.value || undefined })}
                    disabled={!isManagerOrAdmin || updateTaskMutation.isPending}
                    className="py-1.5 px-3 font-display text-sm bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white"
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
                    onChange={(e) => handleUpdateTaskField(selectedTask.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    disabled={!isManagerOrAdmin || updateTaskMutation.isPending}
                    className={`py-1.5 px-3 font-display text-sm bg-bone border border-line dark:bg-white/5 dark:border-white/10 dark:text-white ${isOverdueTask(selectedTask.dueDate) ? 'text-red-650 font-bold' : ''}`}
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
                  onBlur={handleDetailsDescBlur}
                  placeholder="Add detailed task instructions..."
                  rows={6}
                  disabled={(isMember && selectedTask.assigneeId !== currentUser?.id) || updateTaskMutation.isPending}
                  className="w-full p-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm transition-all duration-150 focus:outline-none focus:border-ink focus:bg-bone placeholder:text-mute"
                />
              </div>

              {/* Tabs Sections: Comments vs Activity Logs */}
              <div className="border-t border-line pt-8 flex flex-col gap-6">
                <div className="flex border-b border-line gap-4">
                  <button
                    className={`bg-transparent border-none py-2 px-0 text-mute cursor-pointer flex items-center gap-2 border-b-2 transition-all duration-150 eyebrow text-[10px] hover:text-ink ${activeTab === 'comments' ? 'text-orange border-b-orange dark:text-[#00F5FF] dark:border-b-[#00F5FF]' : 'border-transparent'}`}
                    onClick={() => setActiveTab('comments')}
                  >
                    <MessageSquare size={12} />
                    <span>Comments ({comments.length})</span>
                  </button>
                  <button
                    className={`bg-transparent border-none py-2 px-0 text-mute cursor-pointer flex items-center gap-2 border-b-2 transition-all duration-150 eyebrow text-[10px] hover:text-ink ${activeTab === 'activity' ? 'text-orange border-b-orange dark:text-[#00F5FF] dark:border-b-[#00F5FF]' : 'border-transparent'}`}
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
                                src={c.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${c.user.name}`}
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
                                <p className="text-[13px] text-text leading-relaxed break-words">{c.content}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Comment input */}
                      <form onSubmit={handleAddComment} className="flex gap-3 mt-4">
                        <input
                          type="text"
                          placeholder="Post a comment..."
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          disabled={addCommentMutation.isPending}
                          className="flex-1 bg-bone-2"
                          required
                        />
                        <button type="submit" className="btn btn-primary p-3 w-11" disabled={addCommentMutation.isPending}>
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
                            <div key={log.id} className="grid grid-cols-[90px_1fr] text-[12px] leading-relaxed">
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
                                {log.event === 'STATUS_CHANGED' && `changed status to ${log.details?.new}`}
                                {log.event === 'PRIORITY_CHANGED' && `changed priority to ${log.details?.new}`}
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
      )}

      {/* Create Task Modal */}
      <ResponsiveModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Task"
        subtitle="Define task scopes and sprint deliverables"
      >
        <form onSubmit={handleCreateTask} className="flex flex-col gap-6">
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
              onClick={() => setIsCreateOpen(false)}
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
    </div>
  );
};
