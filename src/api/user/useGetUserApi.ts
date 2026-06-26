import { useAuthStore } from '../../store/authStore';

export const useGetUserApi = () => {
  const { user, isLoading } = useAuthStore();
  return { data: user, isLoading };
};
