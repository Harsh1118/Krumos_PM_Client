import { WorkspaceRole } from '../context/WorkspaceContext';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId?: string | null;
  loginAt?: string | null;
  loggedOut?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  role: WorkspaceRole;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  activeTasksCount: number;
  totalTasksCount: number;
  createdBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export interface Member {
  id: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

export interface BoardMember {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    name: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  order: number;
  projectId: string;
  assigneeId: string | null;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  reporter: {
    id: string;
    name: string;
  };
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

export interface LogDetails {
  old?: string | number | boolean | object | null;
  new?: string | number | boolean | object | null;
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface ActivityLog {
  id: string;
  event: string;
  details: LogDetails;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

// Dashboard Analytics and Summary types
export interface TaskSummary {
  TODO: number;
  IN_PROGRESS: number;
  IN_REVIEW: number;
  DONE: number;
}

export interface UserTask {
  id: string;
  title: string;
  projectId: string;
  status: string;
  priority: string;
  dueDate: string | null;
  project: {
    id: string;
    name: string;
  };
}

export interface ActivityLogItem {
  id: string;
  user: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  taskId: string;
  taskTitle: string;
  event: string;
  details: LogDetails;
  createdAt: string;
}

export interface ProjectAnalytic {
  projectId: string;
  projectName: string;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

export interface MemberWorkload {
  userId: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  openTasksCount: number;
  completedTasksThisWeekCount: number;
}

export interface ApiError extends Error {
  response?: {
    data: {
      message?: string;
      [key: string]: string | number | boolean | object | null | undefined;
    };
    status: number;
    statusText: string;
  };
}
