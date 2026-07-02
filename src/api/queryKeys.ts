export const queryKeys = {
  workspaces: ['workspaces'] as const,
  workspaceDetails: (slug?: string) => ['workspaces', slug] as const,
  projects: (slug?: string) => ['workspaces', slug, 'projects'] as const,
  projectDetails: (slug?: string, projectId?: string) => ['workspaces', slug, 'projects', projectId] as const,
  members: (slug?: string) => ['workspaces', slug, 'members'] as const,
  invitations: (slug?: string) => ['workspaces', slug, 'invitations'] as const,
  dashboard: (slug?: string) => ['dashboard', slug] as const,
  dashboardAnalytics: (slug?: string) => ['dashboardAnalytics', slug] as const,
  tasks: (slug?: string, projectId?: string, params?: any) => 
    params 
      ? ['workspaces', slug, 'projects', projectId, 'tasks', params] as const
      : ['workspaces', slug, 'projects', projectId, 'tasks'] as const,
  taskComments: (slug?: string, taskId?: string) => ['workspaces', slug, 'tasks', taskId, 'comments'] as const,
  taskActivity: (slug?: string, taskId?: string) => ['workspaces', slug, 'tasks', taskId, 'activity'] as const,
  notifications: (slug?: string) => ['notifications', slug] as const,
};
