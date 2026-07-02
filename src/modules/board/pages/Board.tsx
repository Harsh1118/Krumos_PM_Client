import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWorkspaces, WorkspaceRole } from '../../../context/WorkspaceContext';
import { useAuthStore } from '../../../store/authStore';
import { useSocket } from '../../../context/SocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { useProjectDetailsQuery } from '../../../api/projects/useProjectsApi';
import { useMembersQuery } from '../../../api/workspace/useWorkspaceApi';
import {
  useBoardTasksQuery,
  useTaskCommentsQuery,
  useTaskActivityQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useAddCommentMutation,
} from '../../../api/tasks/useTasksApi';
import { useToast } from '../../../context/ToastContext';
import { BoardSkeleton } from '../../../components/ui/Skeleton';

// Decomposed components
import { BoardHeader } from '../components/BoardHeader';
import { BoardFilters } from '../components/BoardFilters';
import { KanbanColumn } from '../components/KanbanColumn';
import { TaskDetailsDrawer } from '../components/TaskDetailsDrawer';
import { CreateTaskModal } from '../components/CreateTaskModal';

import type { Task, BoardMember as Member } from '../../../types';

const EMPTY_TASKS: Task[] = [];

export const Board: React.FC = () => {
  const queryClient = useQueryClient();
  const { projectId } = useParams<{ slug: string; projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWorkspace } = useWorkspaces();
  const { user: currentUser } = useAuthStore();
  const { socket } = useSocket();
  const toast = useToast();

  const [activeDragColumn, setActiveDragColumn] = useState<Task['status'] | null>(null);

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
  const [createPriority, setCreatePriority] = useState<Task['priority']>('MEDIUM');
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
  const { data: projectDetails } = useProjectDetailsQuery(activeWorkspace?.slug, projectId);
  const projectName = projectDetails?.name || 'Project Board';

  // 2. Fetch Workspace Members
  const { data: members = [] } = useMembersQuery(activeWorkspace?.slug) as { data?: Member[] };

  // 3. Fetch Tasks
  const { data: queryTasks, isLoading: loading } = useBoardTasksQuery(
    activeWorkspace?.slug,
    projectId,
    {
      assigneeId: filterAssignee,
      priority: filterPriority,
      dueDate: filterDueDate,
      search: searchQuery,
    },
    !!activeWorkspace && !!projectId
  );
  const tasks = queryTasks || EMPTY_TASKS;

  // Fetch comments
  const { data: comments = [] } = useTaskCommentsQuery(activeWorkspace?.slug, selectedTask?.id);

  // Fetch activity logs
  const { data: activityLogs = [] } = useTaskActivityQuery(activeWorkspace?.slug, selectedTask?.id);

  // Auto-open selected task from URL query parameters
  const autoTaskId = searchParams.get('taskId');
  useEffect(() => {
    if (autoTaskId && tasks.length > 0) {
      const found = tasks.find((t: Task) => t.id === autoTaskId);
      if (found) {
        if (!selectedTask || selectedTask.id !== autoTaskId) {
          setTimeout(() => {
            setSelectedTask(found);
            setEditTitle(found.title);
            setEditDesc(found.description || '');
          }, 0);
        }
      }
    } else if (!autoTaskId && selectedTask) {
      setTimeout(() => {
        setSelectedTask(null);
        setEditTitle('');
        setEditDesc('');
      }, 0);
    }
  }, [autoTaskId, tasks, selectedTask, searchParams]);

  // Sync the open task sidebar when the tasks list is refetched
  useEffect(() => {
    if (!selectedTask || tasks.length === 0) return;
    const freshTask = tasks.find((t: Task) => t.id === selectedTask.id);
    if (!freshTask) return;

    const isTitleActive = document.activeElement?.getAttribute('placeholder') === 'Task Title';
    const isDescActive = document.activeElement?.tagName === 'TEXTAREA';

    setTimeout(() => {
      setSelectedTask(freshTask);
      if (!isTitleActive) setEditTitle(freshTask.title);
      if (!isDescActive) setEditDesc(freshTask.description || '');
    }, 0);
  }, [tasks, selectedTask]);

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
  const createTaskMutation = useCreateTaskMutation(activeWorkspace?.slug, projectId);

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
    }, {
      onSuccess: (newTask) => {
        setIsCreateOpen(false);
        setCreateTitle('');
        setCreateDesc('');
        setCreateAssignee('');
        setCreatePriority('MEDIUM');
        setCreateDueDate('');
        toast.success(`Task "${newTask.title}" created successfully`);
      },
      onError: (err) => {
        toast.error('Failed to create task');
        console.error(err);
      }
    });
  };

  // 6. Update Task Mutation
  const updateTaskMutation = useUpdateTaskMutation(activeWorkspace?.slug, projectId);

  const handleUpdateTaskField = async (taskId: string, fields: Partial<Task>) => {
    updateTaskMutation.mutate({
      taskId,
      fields
    }, {
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
      onError: (err: any) => {
        toast.error(err.response?.data?.message || 'Failed to update task');
      }
    });
  };

  // 7. HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnColumn = async (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t: Task) => t.id === taskId);
    if (!task) return;

    if (isMember && task.assigneeId !== currentUser?.id) {
      toast.error('Members can only update tasks assigned to them');
      return;
    }

    if (task.status === status) return;

    const columnTasks = tasks.filter((t: Task) => t.status === status).sort((a: Task, b: Task) => a.order - b.order);
    const nextOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order + 1.0 : 1.0;

    await handleUpdateTaskField(taskId, { status, order: nextOrder });
  };

  const handleDropOnCard = async (e: React.DragEvent, targetTask: Task) => {
    e.stopPropagation();
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId === targetTask.id) return;

    const draggedTask = tasks.find((t: Task) => t.id === taskId);
    if (!draggedTask) return;

    if (isMember && draggedTask.assigneeId !== currentUser?.id) {
      toast.error('Members can only update tasks assigned to them');
      return;
    }

    const status = targetTask.status;
    const columnTasks = tasks.filter((t: Task) => t.status === status).sort((a: Task, b: Task) => a.order - b.order);
    const targetIndex = columnTasks.findIndex((t: Task) => t.id === targetTask.id);

    const prevTask = targetIndex > 0 ? columnTasks[targetIndex - 1] : null;
    if (prevTask && prevTask.id === taskId) return;
    const nextOrder = prevTask
      ? (prevTask.order + targetTask.order) / 2
      : targetTask.order / 2;

    await handleUpdateTaskField(taskId, { status, order: nextOrder });
  };

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

  // Post Comment Mutation
  const addCommentMutation = useAddCommentMutation(activeWorkspace?.slug, selectedTask?.id, currentUser);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    addCommentMutation.mutate(newCommentText.trim(), {
      onSuccess: () => {
        setNewCommentText('');
      },
      onError: () => {
        toast.error('Failed to post comment');
      }
    });
  };

  // Delete Task Mutation
  const deleteTaskMutation = useDeleteTaskMutation(activeWorkspace?.slug, projectId);

  const handleDeleteTask = () => {
    if (!selectedTask) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this task? This cannot be undone.`,
    );
    if (!confirmDelete) return;

    const previousSelected = selectedTask;
    handleCloseDetails();

    deleteTaskMutation.mutate(selectedTask.id, {
      onError: () => {
        setSelectedTask(previousSelected);
        setSearchParams({ taskId: previousSelected.id });
        toast.error('Failed to delete task');
      }
    });
  };

  const columns: { title: string; status: Task['status'] }[] = [
    { title: 'To Do', status: 'TODO' },
    { title: 'In Progress', status: 'IN_PROGRESS' },
    { title: 'In Review', status: 'IN_REVIEW' },
    { title: 'Done', status: 'DONE' },
  ];

  return (
    <div className="flex flex-col gap-6 flex-1 min-h-0 h-full page-enter">
      {/* Top Banner */}
      <BoardHeader
        projectName={projectName}
        onAddTaskClick={() => setIsCreateOpen(true)}
        loading={loading}
        activeWorkspaceSlug={activeWorkspace?.slug}
      />

      {/* Filter Options */}
      <BoardFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterAssignee={filterAssignee}
        setFilterAssignee={setFilterAssignee}
        filterPriority={filterPriority}
        setFilterPriority={setFilterPriority}
        filterDueDate={filterDueDate}
        setFilterDueDate={setFilterDueDate}
        members={members}
        onClear={() => {
          setFilterAssignee('');
          setFilterPriority('');
          setFilterDueDate('');
          setSearchQuery('');
        }}
      />

      {loading ? (
        <BoardSkeleton />
      ) : (
        /* Kanban Columns Grid */
        <div className="flex-1 min-h-0 flex flex-col">
          <div
            className="grid grid-cols-4 gap-6 flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2 items-stretch max-lg:grid-cols-[repeat(4,min(280px,80vw))] max-lg:snap-x max-lg:snap-mandatory"
            style={{ scrollbarWidth: 'thin' }}
          >
            {columns.map((col) => {
              const colTasks = tasks
                .filter((t: Task) => t.status === col.status)
                .sort((a: Task, b: Task) => a.order - b.order);
              return (
                <KanbanColumn
                  key={col.status}
                  title={col.title}
                  status={col.status}
                  tasks={colTasks}
                  isSleek={isSleek}
                  activeDragColumn={activeDragColumn}
                  setActiveDragColumn={setActiveDragColumn}
                  onDropOnColumn={handleDropOnColumn}
                  onDropOnCard={handleDropOnCard}
                  onCardClick={handleOpenDetails}
                  onDragStart={handleDragStart}
                  onDragEnd={() => setActiveDragColumn(null)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Task Details Side Drawer */}
      {selectedTask && (
        <TaskDetailsDrawer
          selectedTask={selectedTask}
          onClose={handleCloseDetails}
          isManagerOrAdmin={isManagerOrAdmin}
          isMember={isMember}
          currentUserId={currentUser?.id}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editDesc={editDesc}
          setEditDesc={setEditDesc}
          onTitleBlur={handleDetailsTitleBlur}
          onDescBlur={handleDetailsDescBlur}
          members={members}
          comments={comments}
          activityLogs={activityLogs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          newCommentText={newCommentText}
          setNewCommentText={setNewCommentText}
          onAddComment={handleAddComment}
          onDeleteTask={handleDeleteTask}
          onUpdateField={(fields) => handleUpdateTaskField(selectedTask.id, fields)}
          isUpdating={updateTaskMutation.isPending}
          isDeleting={deleteTaskMutation.isPending}
          isPostingComment={addCommentMutation.isPending}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTask}
        creating={creating}
        createTitle={createTitle}
        setCreateTitle={setCreateTitle}
        createDesc={createDesc}
        setCreateDesc={setCreateDesc}
        createAssignee={createAssignee}
        setCreateAssignee={setCreateAssignee}
        createPriority={createPriority}
        setCreatePriority={setCreatePriority}
        createDueDate={createDueDate}
        setCreateDueDate={setCreateDueDate}
        members={members}
      />
    </div>
  );
};
