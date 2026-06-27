import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../config/apiConfig';
import { queryKeys } from '../queryKeys';

export interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export const useNotificationsQuery = (slug?: string) => {
  return useQuery<Notification[]>({
    queryKey: queryKeys.notifications(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/notifications`);
      return res.data;
    },
    enabled: !!slug,
  });
};

export const useMarkAllNotificationsReadMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post(`/workspaces/${slug}/notifications/read-all`);
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(
        queryKeys.notifications(slug),
        (old) => old ? old.map((n) => ({ ...n, isRead: true })) : []
      );
    },
  });
};

export const useMarkNotificationReadMutation = (slug?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/workspaces/${slug}/notifications/${id}/read`);
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<Notification[]>(
        queryKeys.notifications(slug),
        (old) => old ? old.map((n) => (n.id === id ? { ...n, isRead: true } : n)) : []
      );
    },
  });
};

