import { useQuery } from '@tanstack/react-query';
import api from '../../config/apiConfig';
import { queryKeys } from '../queryKeys';
import type { TaskSummary, UserTask, ActivityLogItem, ProjectAnalytic, MemberWorkload } from '../../types';

export const useDashboardQuery = (slug?: string) => {
  return useQuery<{
    taskSummary: TaskSummary;
    myTasks: UserTask[];
    recentActivity: ActivityLogItem[];
  }>({
    queryKey: queryKeys.dashboard(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/dashboard`);
      return res.data;
    },
    enabled: !!slug,
  });
};

export const useDashboardAnalyticsQuery = (slug?: string, isManagerOrAdmin = false) => {
  return useQuery<{
    tasksByProject: ProjectAnalytic[];
    teamWorkload: MemberWorkload[];
  }>({
    queryKey: queryKeys.dashboardAnalytics(slug),
    queryFn: async () => {
      const res = await api.get(`/workspaces/${slug}/dashboard/analytics`);
      return res.data;
    },
    enabled: !!slug && isManagerOrAdmin,
  });
};
