import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../config/apiConfig';
import { queryKeys } from '../queryKeys';
import type { Project } from '../../types';

export const useProjectsQuery = (slug?: string) => {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/projects`);
      return res.data;
    },
    enabled: !!slug,
  });
};

export const useProjectDetailsQuery = (slug?: string, projectId?: string) => {
  return useQuery<Project>({
    queryKey: queryKeys.projectDetails(slug, projectId),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/projects/${projectId}`);
      return res.data;
    },
    enabled: !!slug && !!projectId,
  });
};

export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, name, description }: { slug: string; name: string; description: string }) => {
      const res = await api.post(`/workspaces/${slug}/projects`, { name, description });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(variables.slug) });
    },
  });
};

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, projectId, name, description, isArchived }: { slug: string; projectId: string; name: string; description: string | null; isArchived?: boolean }) => {
      const res = await api.patch(`/workspaces/${slug}/projects/${projectId}`, { name, description, isArchived });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(variables.slug) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projectDetails(variables.slug, variables.projectId) });
    },
  });
};

export const useDeleteProjectMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, projectId }: { slug: string; projectId: string }) => {
      await api.delete(`/workspaces/${slug}/projects/${projectId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(variables.slug) });
    },
  });
};
