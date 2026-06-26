import React from 'react';
import { Routes as ReactRoutes, Route, Navigate } from 'react-router-dom';
import { AuthenticatedRoute } from './authenticatedUser/AuthenticatedRoute';
import { UnauthenticatedRoute } from './unauthenticated/UnauthenticatedRoute';
import { AuthenticatedUserLayout } from './authenticatedUser/AuthenticatedUserLayout';
import { UnAuthenticatedUserLayout } from './unauthenticated/UnAuthenticatedUserLayout';

// Module pages
import { Login } from '../modules/auth/pages/Login';
import { OAuthCallback } from '../modules/auth/pages/OAuthCallback';
import { AcceptInvite } from '../modules/auth/pages/AcceptInvite';
import { WorkspaceSelect } from '../modules/workspace/pages/WorkspaceSelect';
import { Dashboard } from '../modules/dashboard/pages/Dashboard';
import { Projects } from '../modules/projects/pages/Projects';
import { Board } from '../modules/board/pages/Board';
import { Members } from '../modules/members/pages/Members';
import { Settings } from '../modules/settings/pages/Settings';

export const Routes: React.FC = () => {
  return (
    <ReactRoutes>
      {/* Public/Unauthenticated Routes */}
      <Route element={<UnAuthenticatedUserLayout />}>
        <Route
          path="/login"
          element={
            <UnauthenticatedRoute>
              <Login />
            </UnauthenticatedRoute>
          }
        />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
      </Route>

      {/* Protected Workspace Selector */}
      <Route
        path="/workspaces"
        element={
          <AuthenticatedRoute>
            <WorkspaceSelect />
          </AuthenticatedRoute>
        }
      />

      {/* Workspace Scoped Routes */}
      <Route
        path="/w/:slug"
        element={
          <AuthenticatedRoute>
            <AuthenticatedUserLayout />
          </AuthenticatedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<Board />} />
        <Route path="members" element={<Members />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback Redirects */}
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </ReactRoutes>
  );
};

export const AppRoutes = Routes;
export default Routes;
