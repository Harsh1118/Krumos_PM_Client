import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../config/apiConfig';
import { queryKeys } from '../queryKeys';
import type { Task, Comment, ActivityLog } from '../../types';

export interface TasksQueryParams {
  assigneeId?: string;
  priority?: string;
  dueDate?: string;
  search?: string;
}

export const useBoardTasksQuery = (
  slug?: string,
  projectId?: string,
  params: TasksQueryParams = {},
  enabled = true
) => {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks(slug, projectId, params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.assigneeId) q.append('assigneeId', params.assigneeId);
      if (params.priority) q.append('priority', params.priority);
      if (params.dueDate) q.append('dueDate', params.dueDate);
      if (params.search) q.append('search', params.search);

      const res = await api.get(
        `/workspaces/${slug}/projects/${projectId}/tasks?${q.toString()}`
      );
      return res.data;
    },
    enabled: enabled && !!slug && !!projectId,
  });
};

export const useTaskCommentsQuery = (slug?: string, taskId?: string) => {
  return useQuery<Comment[]>({
    queryKey: queryKeys.taskComments(slug, taskId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/tasks/${taskId}/comments`);
      return res.data;
    },
    enabled: !!slug && !!taskId,
  });
};

export const useTaskActivityQuery = (slug?: string, taskId?: string) => {
  return useQuery<ActivityLog[]>({
    queryKey: queryKeys.taskActivity(slug, taskId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/tasks/${taskId}/activity`);
      return res.data;
    },
    enabled: !!slug && !!taskId,
  });
};

export const useCreateTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fields: {
      title: string;
      description?: string;
      assigneeId?: string;
      priority: string;
      dueDate?: string;
    }) => {
      const res = await api.post(`/workspaces/${slug}/projects/${projectId}/tasks`, fields);
      return res.data;
    },
    onMutate: async (fields) => {
      const queryKey = queryKeys.tasks(slug, projectId);
      await queryClient.cancelQueries({ queryKey });

      const previousTasks = queryClient.getQueryData<Task[]>(queryKey);

      const tempTask: Task = {
        id: `temp-${Date.now()}`,
        title: fields.title,
        description: fields.description || null,
        status: 'TODO',
        priority: fields.priority as Task['priority'],
        dueDate: fields.dueDate || null,
        order: previousTasks ? previousTasks.length + 1 : 1,
        projectId: projectId || '',
        assigneeId: fields.assigneeId || null,
        assignee: undefined,
        reporterId: 'temp-user-id',
        reporter: { id: 'temp-user-id', name: 'You' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Task[]>(queryKey, (old) => [
        ...(old || []),
        tempTask,
      ]);

      return { previousTasks, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(slug, projectId) });
    },
  });
};

export const useUpdateTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, fields }: { taskId: string; fields: Partial<Task> }) => {
      const res = await api.patch(`/workspaces/${slug}/tasks/${taskId}`, fields);
      return res.data;
    },
    onMutate: async ({ taskId, fields }) => {
      // Use general query key since filters might vary, cancel active boards queries
      const queryKey = queryKeys.tasks(slug, projectId);
      await queryClient.cancelQueries({ queryKey });

      // Find the exact query cache entries matching the key prefix
      const queries = queryClient.getQueriesData<Task[]>({ queryKey });
      const previousState = queries.map(([key, value]) => ({ key, value }));

      // Update all matching query caches to ensure it works with active filter states
      queries.forEach(([key, old]) => {
        if (old) {
          queryClient.setQueryData<Task[]>(
            key,
            old.map((t) => (t.id === taskId ? { ...t, ...fields } : t))
          );
        }
      });

      return { previousState };
    },
    onError: (_err, _variables, context) => {
      context?.previousState.forEach(({ key, value }) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(slug, projectId) });
      if (updatedTask) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(slug, updatedTask.id) });
      }
    },
  });
};

export const useAddCommentMutation = (slug?: string, taskId?: string, currentUser?: any) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/comments`, { content });
      return res.data;
    },
    onMutate: async (content) => {
      const queryKey = queryKeys.taskComments(slug, taskId);
      await queryClient.cancelQueries({ queryKey });

      const previousComments = queryClient.getQueryData<Comment[]>(queryKey);

      if (previousComments && currentUser) {
        const tempComment: Comment = {
          id: `temp-${Date.now()}`,
          content,
          createdAt: new Date().toISOString(),
          user: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
          },
        };
        queryClient.setQueryData<Comment[]>(queryKey, [...(previousComments || []), tempComment]);
      }

      return { previousComments, queryKey };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousComments && context.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.taskComments(slug, taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(slug, taskId) });
    },
  });
};

export const useDeleteTaskMutation = (slug?: string, projectId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/workspaces/${slug}/tasks/${taskId}`);
    },
    onMutate: async (taskId) => {
      const queryKey = queryKeys.tasks(slug, projectId);
      await queryClient.cancelQueries({ queryKey });

      // Find all queries matching this project's tasks to clear optimistically
      const queries = queryClient.getQueriesData<Task[]>({ queryKey });
      const previousState = queries.map(([key, value]) => ({ key, value }));

      queries.forEach(([key, old]) => {
        if (old) {
          queryClient.setQueryData<Task[]>(
            key,
            old.filter((t) => t.id !== taskId)
          );
        }
      });

      return { previousState };
    },
    onError: (_err, _variables, context) => {
      context?.previousState.forEach(({ key, value }) => {
        queryClient.setQueryData(key, value);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(slug, projectId) });
    },
  });
};
