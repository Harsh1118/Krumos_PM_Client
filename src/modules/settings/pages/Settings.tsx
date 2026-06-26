import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useWorkspaces, WorkspaceRole } from '../../../context/WorkspaceContext';
import api from '../../../config/apiConfig';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save, Trash2 } from 'lucide-react';
import type { ApiError } from '../../../types';

export const Settings: React.FC = () => {
  const { activeWorkspace } = useWorkspaces();

  if (!activeWorkspace) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bone gap-6">
        <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-mute">
          Loading Settings...
        </p>
      </div>
    );
  }

  const isAdmin = activeWorkspace.role === WorkspaceRole.ADMIN;
  if (!isAdmin) {
    return <Navigate to={`/w/${activeWorkspace.slug}`} replace />;
  }

  return <SettingsForm activeWorkspace={activeWorkspace} />;
};

interface SettingsFormProps {
  activeWorkspace: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    role: WorkspaceRole;
  };
}

const SettingsForm: React.FC<SettingsFormProps> = ({ activeWorkspace }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(activeWorkspace.name);
  const [logoUrl, setLogoUrl] = useState(activeWorkspace.logoUrl || '');
  const [confirmSlug, setConfirmSlug] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Update Settings Mutation
  const updateWorkspaceMutation = useMutation({
    mutationFn: async ({ name, logoUrl }: { name: string; logoUrl: string | null }) => {
      await api.patch(`/workspaces/${activeWorkspace.slug}`, {
        name,
        logoUrl,
      });
    },
    onSuccess: async () => {
      setSuccess('Workspace settings saved successfully');
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (err: ApiError) => {
      setError(err.response?.data?.message || 'Failed to update workspace');
    }
  });

  const saving = updateWorkspaceMutation.isPending;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError('Workspace name cannot be empty');
      return;
    }

    updateWorkspaceMutation.mutate({
      name: name.trim(),
      logoUrl: logoUrl.trim() || null
    });
  };

  // Delete Workspace Mutation
  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (confirmSlug: string) => {
      await api.delete(`/workspaces/${activeWorkspace.slug}`, {
        data: { confirmSlug },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      navigate('/workspaces');
    },
    onError: (err: ApiError) => {
      setDeleteError(err.response?.data?.message || 'Failed to delete workspace');
    }
  });

  const deleting = deleteWorkspaceMutation.isPending;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (confirmSlug !== activeWorkspace.slug) {
      setDeleteError('Confirmation slug does not match');
      return;
    }

    deleteWorkspaceMutation.mutate(confirmSlug);
  };

  return (
    <div className="flex flex-col w-full page-enter">
      {/* Page Header */}
      <div className="border-b-2 border-line-strong pb-5 mb-8">
        <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">
          Workspace Settings
        </h1>
        <p className="eyebrow text-mute mt-1 text-[11px]">
          Configure workspace meta and system properties
        </p>
      </div>

      {/* Settings Cards Column */}
      <div className="flex flex-col gap-6 max-w-[600px]">

        {/* General Properties Card */}
        <div className="flex flex-col rounded-md overflow-hidden bg-bone-2 border border-line">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-line">
            <h2 className="font-display font-extrabold text-base text-ink">
              General Properties
            </h2>
          </div>

          {/* Card Body */}
          <div className="p-6 flex flex-col gap-5">
            {/* Error / Success Banners */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-sm text-sm leading-relaxed text-center font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 px-4 py-3 rounded-sm text-sm leading-relaxed text-center font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleUpdate} className="flex flex-col gap-5">
              {/* Workspace Name */}
              <div className="form-group">
                <label htmlFor="ws-name" className="mb-2 block">Workspace Name</label>
                <input
                  id="ws-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Krumos Tech"
                  disabled={saving}
                  className="w-full placeholder:text-mute disabled:opacity-50"
                  required
                />
              </div>

              {/* Workspace Slug (read-only) */}
              <div className="form-group">
                <label htmlFor="ws-slug" className="mb-2 block">
                  Workspace Slug
                  <span className="ml-2 badge badge-low text-[9px] align-middle">Permanent</span>
                </label>
                <input
                  id="ws-slug"
                  type="text"
                  value={activeWorkspace.slug}
                  className="w-full px-4 py-3 font-display text-[15px] border border-line bg-bone-2 text-text rounded-sm opacity-50 cursor-not-allowed"
                  disabled
                />
                <span className="text-[11px] text-mute mt-1.5 block leading-relaxed">
                  Slug cannot be modified after creation.
                </span>
              </div>

              {/* Logo URL */}
              <div className="form-group">
                <label htmlFor="ws-logo" className="mb-2 block">Logo Image URL</label>
                <input
                  id="ws-logo"
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  disabled={saving}
                  className="w-full placeholder:text-mute disabled:opacity-50"
                />
              </div>

              {/* Save Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2"
                  disabled={saving}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone Card */}
        <div className="flex flex-col rounded-md overflow-hidden border border-red-500/30 bg-red-500/2 hover:border-red-500/50 transition-colors duration-200">
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-red-500/20 flex items-center gap-2.5">
            <AlertTriangle className="text-red-500 shrink-0" size={18} />
            <h2 className="font-display font-extrabold text-base text-red-600">
              Danger Zone
            </h2>
          </div>

          {/* Card Body */}
          <div className="p-6 flex flex-col gap-5">
            <p className="text-sm text-ink-soft leading-relaxed">
              Deleting a workspace is <strong>permanent and irreversible</strong>. All projects,
              Kanban tasks, comments, and historic activity records will be permanently deleted.
            </p>

            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-sm text-sm leading-relaxed text-center font-medium">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDelete} className="flex flex-col gap-5">
              <div className="form-group">
                <label htmlFor="delete-confirm" className="mb-2 block text-sm">
                  To confirm, type the workspace slug:{' '}
                  <strong className="font-mono text-red-600">{activeWorkspace.slug}</strong>
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  placeholder={activeWorkspace.slug}
                  disabled={deleting}
                  className="w-full focus:border-red-500! placeholder:text-mute disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="btn bg-red-600 text-bone border-red-600 hover:bg-red-700 hover:border-red-700 w-full flex items-center justify-center gap-2 disabled:border-ghost disabled:text-mute disabled:cursor-not-allowed disabled:bg-bone-2"
                  disabled={deleting || confirmSlug !== activeWorkspace.slug}
                >
                  <Trash2 size={16} />
                  <span>{deleting ? 'Deleting Workspace...' : 'Permanently Delete Workspace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
