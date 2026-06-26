import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../config/apiConfig';
import { queryKeys } from '../queryKeys';
import type { Workspace, Member, Invitation } from '../../types';

export const useWorkspacesQuery = (enabled: boolean) => {
  return useQuery<Workspace[]>({
    queryKey: queryKeys.workspaces,
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
    enabled,
  });
};

export const useCreateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const res = await api.post('/workspaces', { name, slug });
      return res.data;
    },
    onSuccess: (newWorkspace) => {
      queryClient.setQueryData<Workspace[]>(queryKeys.workspaces, (old) => [
        ...(old || []),
        { ...newWorkspace, role: 'ADMIN' },
      ]);
    },
  });
};

export const useUpdateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: { name: string; logoUrl: string | null } }) => {
      const res = await api.patch(`/workspaces/${slug}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceDetails(variables.slug) });
    },
  });
};

export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (slug: string) => {
      await api.delete(`/workspaces/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
    },
  });
};

export const useMembersQuery = (slug?: string) => {
  return useQuery<Member[]>({
    queryKey: queryKeys.members(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/members`);
      return res.data;
    },
    enabled: !!slug,
  });
};

export const useUpdateMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, userId, role }: { slug: string; userId: string; role: string }) => {
      const res = await api.patch(`/workspaces/${slug}/members/${userId}`, { role });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(variables.slug) });
    },
  });
};

export const useDeleteMemberMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, userId }: { slug: string; userId: string }) => {
      await api.delete(`/workspaces/${slug}/members/${userId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(variables.slug) });
    },
  });
};

export const useInvitationsQuery = (slug?: string) => {
  return useQuery<Invitation[]>({
    queryKey: queryKeys.invitations(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/invitations`);
      return res.data;
    },
    enabled: !!slug,
  });
};

export const useCreateInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, email, role }: { slug: string; email: string; role: string }) => {
      const res = await api.post(`/workspaces/${slug}/invitations`, { email, role });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations(variables.slug) });
    },
  });
};

export const useDeleteInvitationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slug, inviteId }: { slug: string; inviteId: string }) => {
      await api.delete(`/workspaces/${slug}/invitations/${inviteId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations(variables.slug) });
    },
  });
};
