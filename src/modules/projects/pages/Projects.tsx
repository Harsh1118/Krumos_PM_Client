import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaces, WorkspaceRole } from '../../../context/WorkspaceContext';
import {
  useProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '../../../api/projects/useProjectsApi';
import {
  FolderOpen,
  Plus,
  Archive,
  Trash2,
  ExternalLink,
  Edit,
  FolderMinus,
  CheckCircle
} from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { CardSkeleton } from '../../../components/ui/Skeleton';
import { LoadingButton } from '../../../components/ui/LoadingButton';
import { ResponsiveModal } from '../../../components/ui/ResponsiveModal';
import { formatActivityTime } from '../../../utils';
import { PageContainer } from '../../../components/common/PageContainer';
import type { Project, ApiError } from '../../../types';

export const Projects: React.FC = () => {
  const { activeWorkspace } = useWorkspaces();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [showArchived, setShowArchived] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const isManagerOrAdmin =
    activeWorkspace?.role === WorkspaceRole.ADMIN || activeWorkspace?.role === WorkspaceRole.MANAGER;
  const isAdmin = activeWorkspace?.role === WorkspaceRole.ADMIN;

  // Fetch Projects using URL-driven slug
  const { data: projects = [], isLoading: loading } = useProjectsQuery(slug);

  // Project Creation/Edit Mutations
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  const submitting = createProjectMutation.isPending || updateProjectMutation.isPending;

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (project: Project) => {
    setModalMode('edit');
    setSelectedProject(project);
    setName(project.name);
    setDescription(project.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }

    if (!slug) return;

    if (modalMode === 'create') {
      createProjectMutation.mutate({
        slug: slug,
        name: name.trim(),
        description: description.trim(),
      }, {
        onSuccess: (data) => {
          toast.success(`Project "${data.name}" created successfully`);
          setIsModalOpen(false);
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          toast.error(apiErr.response?.data?.message || 'Failed to create project');
        }
      });
    } else {
      if (!selectedProject?.id) return;
      updateProjectMutation.mutate({
        slug: slug,
        projectId: selectedProject.id,
        name: name.trim(),
        description: description.trim(),
      }, {
        onSuccess: (data) => {
          toast.success(`Project "${data.name}" updated successfully`);
          setIsModalOpen(false);
        },
        onError: (err) => {
          const apiErr = err as ApiError;
          toast.error(apiErr.response?.data?.message || 'Failed to update project');
        }
      });
    }
  };

  // Archive/Restore Mutation
  const handleArchiveToggle = async (project: Project) => {
    if (!slug) return;
    updateProjectMutation.mutate({
      slug: slug,
      projectId: project.id,
      name: project.name,
      description: project.description,
      isArchived: !project.isArchived,
    }, {
      onSuccess: (updatedProject) => {
        toast.success(`Project "${updatedProject.name}" ${updatedProject.isArchived ? 'archived' : 'restored'} successfully`);
      },
      onError: () => {
        toast.error('Failed to update project archive state');
      }
    });
  };

  // Delete Mutation
  const deleteProjectMutation = useDeleteProjectMutation();

  const handleDelete = async (project: Project) => {
    const confirmDelete = window.confirm(
      `Are you absolutely sure you want to delete the project "${project.name}"?\nThis will permanently delete all tasks, comments, and activity logs. This action is irreversible.`,
    );

    if (!confirmDelete || !slug) return;

    deleteProjectMutation.mutate({
      slug: slug,
      projectId: project.id,
    }, {
      onSuccess: () => {
        toast.success('Project deleted successfully');
      },
      onError: () => {
        toast.error('Failed to delete project');
      }
    });
  };

  const handleNavigateToBoard = (projectId: string) => {
    navigate(`/w/${slug}/projects/${projectId}`);
  };

  const filteredProjects = projects.filter((p) => p.isArchived === showArchived);

  const headerActions = (
    <>
      <button
        onClick={() => setShowArchived(!showArchived)}
        className="btn btn-secondary flex items-center gap-2"
        disabled={loading}
      >
        {showArchived ? <FolderOpen size={16} /> : <Archive size={16} />}
        <span>{showArchived ? 'Show Active' : 'Show Archived'}</span>
      </button>

      {isManagerOrAdmin && (
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary flex items-center gap-2"
          disabled={loading}
        >
          <Plus size={16} />
          <span>Create Project</span>
        </button>
      )}
    </>
  );

  return (
    <PageContainer
      title="Projects"
      subtitle="Manage your workspace projects and sprint scopes"
      headerActions={headerActions}
    >

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(3).fill(0).map((_, idx) => <CardSkeleton key={idx} />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 text-center text-mute">
          {showArchived ? <FolderMinus size={48} /> : <FolderOpen size={48} />}
          <h3 className="font-display font-extrabold text-lg text-ink">
            No {showArchived ? 'archived' : 'active'} projects found
          </h3>
          <p className="eyebrow text-xs uppercase tracking-wider max-w-xs">
            {showArchived
              ? 'No projects in this workspace have been archived yet.'
              : 'Create a project to start organizing tasks and sprinting.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const syncPercent = p.totalTasksCount > 0
              ? Math.round(((p.totalTasksCount - p.activeTasksCount) / p.totalTasksCount) * 100)
              : 0;
            const isLive = p.activeTasksCount > 0;
            return (
              <div key={p.id} className="project-card card flex flex-col gap-5">
                {/* Card Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <h3
                      className="font-display font-black text-xl text-ink cursor-pointer transition-colors duration-150 uppercase tracking-tight hover:text-orange truncate"
                      onClick={() => handleNavigateToBoard(p.id)}
                    >
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase text-mute">
                      <span
                        className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${isLive ? 'bg-orange shadow-[0_0_8px_var(--color-orange)] animate-pulse' : 'bg-mute'}`}
                      />
                      <span>{isLive ? 'Live' : 'Standby'}</span>
                      <span className="opacity-30">|</span>
                      <span>Node Sync: {syncPercent}%</span>
                    </div>
                  </div>
                  <span className={`badge shrink-0 ${p.isArchived ? 'badge-low' : 'badge-medium'}`}>
                    {p.isArchived ? 'Archived' : 'Active'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-ink-soft leading-relaxed flex-1 line-clamp-3">
                  {p.description || 'No description provided.'}
                </p>

                {/* Telemetry Progress Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="h-1.5 bg-ghost rounded-[2px] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF2D00] via-[#F44E14] to-[#FF8A3D] rounded-[2px] transition-[width] duration-300 ease-out"
                      style={{ width: `${syncPercent}%` }}
                    />
                  </div>
                </div>

                {/* Task Stats */}
                <div className="flex gap-8 border-t border-dashed border-line pt-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xl font-bold text-ink leading-none">{p.activeTasksCount}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-mute mt-1">Active Tasks</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xl font-bold text-ink leading-none">{p.totalTasksCount}</span>
                    <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-mute mt-1">Total Tasks</span>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="border-t border-line pt-4 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.createdBy.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${p.createdBy.name}`}
                      alt={p.createdBy.name}
                      className="w-7 h-7 rounded-sm shrink-0"
                    />
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <span className="text-xs font-bold text-text truncate">{p.createdBy.name}</span>
                      <span className="text-[10px] text-mute">
                        {formatActivityTime(p.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleNavigateToBoard(p.id)}
                      className="btn btn-secondary btn-icon-only"
                      title="Open Kanban Board"
                    >
                      <ExternalLink size={14} />
                    </button>

                    {isManagerOrAdmin && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="btn btn-secondary btn-icon-only"
                          title="Edit Project"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(p)}
                          className="btn btn-secondary btn-icon-only"
                          title={p.isArchived ? 'Restore Project' : 'Archive Project'}
                        >
                          {p.isArchived ? <CheckCircle size={14} /> : <Archive size={14} />}
                        </button>
                      </>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(p)}
                        className="btn btn-danger btn-icon-only"
                        title="Delete Project"
                        disabled={deleteProjectMutation.isPending && deleteProjectMutation.variables?.projectId === p.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Project Modal */}
      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create Project' : 'Edit Project'}
        subtitle={modalMode === 'create' ? 'Create a new project column space' : `Modifying ${selectedProject?.name}`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="form-group">
            <label htmlFor="proj-name" className="mb-2 block">Project Name</label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Website Revamp"
              disabled={submitting}
              className="w-full placeholder:text-mute disabled:opacity-50"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="proj-desc" className="mb-2 block">Description</label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize the project goals..."
              rows={4}
              disabled={submitting}
              className="w-full placeholder:text-mute disabled:opacity-50"
            />
          </div>

          <div className="flex gap-4 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3 px-6 rounded-sm border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-bone-2 text-ink border-line hover:bg-line/20 disabled:border-ghost disabled:text-mute disabled:cursor-not-allowed disabled:bg-bone-2"
              disabled={submitting}
            >
              Cancel
            </button>
            <LoadingButton
              type="submit"
              className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3 px-6 rounded-sm border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-ink text-bone border-ink hover:bg-text hover:border-text focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-2 disabled:border-ghost disabled:text-mute disabled:cursor-not-allowed disabled:bg-bone-2"
              loading={submitting}
              loadingText="Submitting..."
            >
              {modalMode === 'create' ? 'Create Project' : 'Save Changes'}
            </LoadingButton>
          </div>
        </form>
      </ResponsiveModal>
    </PageContainer>
  );
};
export default Projects;
