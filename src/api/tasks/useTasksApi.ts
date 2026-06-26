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
    queryKey: queryKeys.tasks(slug, projectId),
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
    onSuccess: () => {
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
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(slug, projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.taskActivity(slug, updatedTask.id) });
    },
  });
};

export const useAddCommentMutation = (slug?: string, taskId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/workspaces/${slug}/tasks/${taskId}/comments`, { content });
      return res.data;
    },
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks(slug, projectId) });
    },
  });
};
