import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../config/apiConfig';

export const useGetGoogleUrl = () => {
  return useQuery({
    queryKey: ['googleUrl'],
    queryFn: async () => {
      const res = await api.get('/auth/google/url');
      return res.data as { url: string };
    },
    staleTime: Infinity,
  });
};

export const useVerifyInvite = (token: string) => {
  return useQuery({
    queryKey: ['inviteVerify', token],
    queryFn: async () => {
      const res = await api.get(`/invitations/verify/${token}`);
      return res.data;
    },
    enabled: !!token,
  });
};

export const useAcceptInviteMutation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await api.post('/invitations/accept', { token });
      return res.data;
    },
  });
};
