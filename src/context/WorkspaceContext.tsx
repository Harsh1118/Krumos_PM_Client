import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/apiConfig';
import { useAuthStore } from '../store/authStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'MEMBER';
// eslint-disable-next-line react-refresh/only-export-components
export const WorkspaceRole = {
  ADMIN: 'ADMIN' as const,
  MANAGER: 'MANAGER' as const,
  MEMBER: 'MEMBER' as const,
};

interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: WorkspaceRole;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (slug: string) => void;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, slug: string) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
const EMPTY_WORKSPACES: Workspace[] = [];

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const { data: queryData, isLoading } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const workspaces = queryData || EMPTY_WORKSPACES;

  const refreshWorkspaces = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
  }, [queryClient]);

  useEffect(() => {
    if (!isAuthenticated) {
      setTimeout(() => {
        setActiveWorkspace(null);
      }, 0);
      return;
    }

    if (workspaces.length > 0) {
      const storedSlug = localStorage.getItem('krumos_active_workspace_slug');
      const found = workspaces.find((w) => w.slug === storedSlug);
      setTimeout(() => {
        if (found) {
          setActiveWorkspace(found);
        } else {
          setActiveWorkspace(workspaces[0]);
          localStorage.setItem('krumos_active_workspace_slug', workspaces[0].slug);
        }
      }, 0);
    } else {
      setTimeout(() => {
        setActiveWorkspace(null);
        localStorage.removeItem('krumos_active_workspace_slug');
      }, 0);
    }
  }, [workspaces, isAuthenticated]);

  const switchWorkspace = useCallback((slug: string) => {
    const found = workspaces.find((w) => w.slug === slug);
    if (found) {
      setActiveWorkspace(found);
      localStorage.setItem('krumos_active_workspace_slug', slug);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (name: string, slug: string): Promise<Workspace> => {
    try {
      const res = await api.post('/workspaces', { name, slug });
      const newWorkspace = { ...res.data, role: WorkspaceRole.ADMIN };
      
      // Update local query cache
      queryClient.setQueryData<Workspace[]>(['workspaces'], (old) => [...(old || []), newWorkspace]);
      
      // Select the newly created workspace
      setActiveWorkspace(newWorkspace);
      localStorage.setItem('krumos_active_workspace_slug', newWorkspace.slug);
      
      return newWorkspace;
    } catch (err) {
      console.error('Failed to create workspace', err);
      throw err;
    }
  }, [queryClient]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        isLoading,
        switchWorkspace,
        refreshWorkspaces,
        createWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspaces = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaces must be used within a WorkspaceProvider');
  }
  return context;
};
