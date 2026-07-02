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
    onMutate: async ({ slug, name, description }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects(slug) });
      const previousProjects = queryClient.getQueryData<Project[]>(queryKeys.projects(slug));

      const newProject: Project = {
        id: `temp-${Date.now()}`,
        name,
        description,
        isArchived: false,
        activeTasksCount: 0,
        totalTasksCount: 0,
        createdAt: new Date().toISOString(),
        createdBy: {
          id: 'temp-user',
          name: 'You',
          avatarUrl: null,
        },
      };

      queryClient.setQueryData<Project[]>(queryKeys.projects(slug), (old) => [
        ...(old || []),
        newProject,
      ]);

      return { previousProjects, slug };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects(context.slug), context.previousProjects);
      }
    },
    onSettled: (_, __, variables) => {
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
    onMutate: async ({ slug, projectId, name, description, isArchived }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects(slug) });
      await queryClient.cancelQueries({ queryKey: queryKeys.projectDetails(slug, projectId) });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKeys.projects(slug));
      const previousDetails = queryClient.getQueryData<Project>(queryKeys.projectDetails(slug, projectId));

      queryClient.setQueryData<Project[]>(queryKeys.projects(slug), (old) =>
        old?.map((p) =>
          p.id === projectId
            ? {
                ...p,
                name,
                description: description ?? p.description,
                isArchived: isArchived !== undefined ? isArchived : p.isArchived,
              }
            : p
        )
      );

      if (previousDetails) {
        queryClient.setQueryData<Project>(queryKeys.projectDetails(slug, projectId), {
          ...previousDetails,
          name,
          description: description ?? previousDetails.description,
          isArchived: isArchived !== undefined ? isArchived : previousDetails.isArchived,
        });
      }

      return { previousProjects, previousDetails, slug, projectId };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects(context.slug), context.previousProjects);
      }
      if (context?.previousDetails) {
        queryClient.setQueryData(queryKeys.projectDetails(context.slug, context.projectId), context.previousDetails);
      }
    },
    onSettled: (_, __, variables) => {
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
    onMutate: async ({ slug, projectId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects(slug) });

      const previousProjects = queryClient.getQueryData<Project[]>(queryKeys.projects(slug));

      queryClient.setQueryData<Project[]>(queryKeys.projects(slug), (old) =>
        old?.filter((p) => p.id !== projectId)
      );

      return { previousProjects, slug };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects(context.slug), context.previousProjects);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects(variables.slug) });
    },
  });
};
