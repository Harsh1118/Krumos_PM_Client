import React, { useState } from 'react';
import { useWorkspaces, WorkspaceRole } from '../context/WorkspaceContext';
import api from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Mail,
  UserX,
  Clock,
  Trash2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { RowSkeleton } from '../components/common/Skeleton';
import { LoadingButton } from '../components/common/LoadingButton';
import { ResponsiveModal } from '../components/common/ResponsiveModal';
import { formatActivityTime } from '../utils/formatDate';
import type { Member, Invitation, ApiError } from '../types';

export const Members: React.FC = () => {
  const { activeWorkspace } = useWorkspaces();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Invite Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);

  const isAdmin = activeWorkspace?.role === WorkspaceRole.ADMIN;

  // Fetch active contributors
  const { data: members = [], isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ['workspaceMembers', activeWorkspace?.slug],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/members`);
      return res.data;
    },
    enabled: !!activeWorkspace?.slug,
  });

  // Fetch pending invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ['workspaceInvitations', activeWorkspace?.slug],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspace?.slug}/invitations`);
      return res.data;
    },
    enabled: !!activeWorkspace?.slug && isAdmin,
  });

  // Invite Mutation
  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: WorkspaceRole }) => {
      const res = await api.post(`/workspaces/${activeWorkspace?.slug}/invitations`, {
        email,
        role,
      });
      return res.data;
    },
    onSuccess: (newInvite) => {
      toast.success(`Invitation successfully sent to ${newInvite.email}`);
      setEmail('');
      setRole(WorkspaceRole.MEMBER);
      queryClient.invalidateQueries({ queryKey: ['workspaceInvitations', activeWorkspace?.slug] });
      setIsModalOpen(false);
    },
    onError: (err: ApiError) => {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    }
  });

  const submitting = inviteMutation.isPending;

  const handleOpenInviteModal = () => {
    setEmail('');
    setRole(WorkspaceRole.MEMBER);
    setIsModalOpen(true);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Email address is required');
      return;
    }

    inviteMutation.mutate({ email: email.trim(), role });
  };

  // Role Change Mutation (Optimistic Update)
  const roleChangeMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: WorkspaceRole }) => {
      const res = await api.patch(`/workspaces/${activeWorkspace?.slug}/members/${userId}`, {
        role: newRole,
      });
      return res.data;
    },
    onMutate: async ({ userId, newRole }) => {
      await queryClient.cancelQueries({ queryKey: ['workspaceMembers', activeWorkspace?.slug] });
      const previousMembers = queryClient.getQueryData<Member[]>(['workspaceMembers', activeWorkspace?.slug]);

      if (previousMembers) {
        queryClient.setQueryData<Member[]>(
          ['workspaceMembers', activeWorkspace?.slug],
          previousMembers.map((m) => (m.user.id === userId ? { ...m, role: newRole } : m))
        );
      }

      return { previousMembers };
    },
    onError: (err: ApiError, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['workspaceMembers', activeWorkspace?.slug], context.previousMembers);
      }
      toast.error(err.response?.data?.message || 'Failed to update member role');
    },
    onSuccess: () => {
      toast.success('Member role updated successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers', activeWorkspace?.slug] });
    }
  });

  const handleRoleChange = async (userId: string, newRole: WorkspaceRole) => {
    roleChangeMutation.mutate({ userId, newRole });
  };

  // Remove Member Mutation (Optimistic Update)
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${activeWorkspace?.slug}/members/${userId}`);
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['workspaceMembers', activeWorkspace?.slug] });
      const previousMembers = queryClient.getQueryData<Member[]>(['workspaceMembers', activeWorkspace?.slug]);

      if (previousMembers) {
        queryClient.setQueryData<Member[]>(
          ['workspaceMembers', activeWorkspace?.slug],
          previousMembers.filter((m) => m.user.id !== userId)
        );
      }

      return { previousMembers };
    },
    onError: (err: ApiError, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(['workspaceMembers', activeWorkspace?.slug], context.previousMembers);
      }
      toast.error(err.response?.data?.message || 'Failed to remove member');
    },
    onSuccess: () => {
      toast.success('Member removed successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceMembers', activeWorkspace?.slug] });
    }
  });

  const handleRemoveMember = async (member: Member) => {
    const confirmRemove = window.confirm(
      `Are you sure you want to remove ${member.user.name} from the workspace?\nThis action is irreversible.`,
    );

    if (!confirmRemove) return;

    removeMemberMutation.mutate(member.user.id);
  };

  // Revoke Invitation Mutation (Optimistic Update)
  const revokeInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/workspaces/${activeWorkspace?.slug}/invitations/${inviteId}`);
    },
    onMutate: async (inviteId) => {
      await queryClient.cancelQueries({ queryKey: ['workspaceInvitations', activeWorkspace?.slug] });
      const previousInvites = queryClient.getQueryData<Invitation[]>(['workspaceInvitations', activeWorkspace?.slug]);

      if (previousInvites) {
        queryClient.setQueryData<Invitation[]>(
          ['workspaceInvitations', activeWorkspace?.slug],
          previousInvites.filter((i) => i.id !== inviteId)
        );
      }

      return { previousInvites };
    },
    onError: (err: ApiError, _variables, context) => {
      if (context?.previousInvites) {
        queryClient.setQueryData(['workspaceInvitations', activeWorkspace?.slug], context.previousInvites);
      }
      toast.error(err.response?.data?.message || 'Failed to revoke invitation');
    },
    onSuccess: () => {
      toast.success('Invitation cancelled successfully');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceInvitations', activeWorkspace?.slug] });
    }
  });

  const handleRevokeInvite = async (invite: Invitation) => {
    const confirmRevoke = window.confirm(
      `Are you sure you want to cancel the invitation sent to ${invite.email}?`,
    );

    if (!confirmRevoke) return;

    revokeInviteMutation.mutate(invite.id);
  };

  return (
    <div className="flex flex-col w-full page-enter">
      {/* Page Header */}
      <div className="flex justify-between items-center border-b-2 border-line-strong pb-5 mb-8 flex-wrap gap-4">
        <div>
          <h1 className="page-title text-3xl font-extrabold tracking-tight font-display text-ink uppercase">
            Members
          </h1>
          <p className="eyebrow text-mute text-[11px] mt-1">
            View active contributors and manage user permission levels
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenInviteModal}
            className="btn btn-primary flex items-center gap-2"
            disabled={membersLoading}
          >
            <UserPlus size={16} />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* Content Sections */}
      <div className="flex flex-col gap-8">
        {/* Active Members Card */}
        <div className="flex flex-col rounded-md overflow-hidden bg-bone-2 border border-line">
          {/* Card Header */}
          <div className="px-5 py-4 border-b border-line bg-bone-2">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-ink-soft dark:text-[#00F5FF]">
              Active Contributors
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse members-table">
              <thead>
                <tr>
                  <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                    User
                  </th>
                  <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                    Role
                  </th>
                  <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                    Joined
                  </th>
                  {isAdmin && (
                    <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-center bg-bone-2 font-mono uppercase tracking-widest">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {membersLoading ? (
                  Array(3).fill(0).map((_, idx) => <RowSkeleton key={idx} />)
                ) : members.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 4 : 3}
                      className="text-center eyebrow py-12 px-6 text-mute"
                    >
                      No members in this workspace.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr
                      key={m.id}
                      className="transition-colors duration-150 hover:bg-orange/5"
                    >
                      <td className="py-4 px-6 border-b border-line">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={m.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user.name}`}
                            alt={m.user.name}
                            className="w-9 h-9 rounded-full object-cover border-2 border-line shrink-0"
                          />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-ink text-sm">{m.user.name}</span>
                            <span className="font-mono text-[11px] text-mute">{m.user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-b border-line" data-label="Role">
                        {isAdmin ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user.id, e.target.value as WorkspaceRole)}
                            className="py-1.5 px-3 font-mono text-[10px] font-bold border border-line bg-bone text-ink-soft rounded-sm cursor-pointer w-auto! uppercase tracking-wide transition-all duration-150 hover:border-line-strong focus:outline-none focus:border-ink dark:focus:border-[#00F5FF] dark:focus:shadow-[0_0_6px_rgba(0,245,255,0.15)] dark:bg-white/5 dark:border-white/10 dark:text-white"
                            disabled={roleChangeMutation.isPending && roleChangeMutation.variables?.userId === m.user.id}
                          >
                            <option value={WorkspaceRole.ADMIN}>ADMIN</option>
                            <option value={WorkspaceRole.MANAGER}>MANAGER</option>
                            <option value={WorkspaceRole.MEMBER}>MEMBER</option>
                          </select>
                        ) : (
                          <span className="badge badge-medium">{m.role}</span>
                        )}
                      </td>
                      <td className="py-4 px-6 border-b border-line font-mono text-xs text-ink-soft" data-label="Joined">
                        {formatActivityTime(m.joinedAt, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6 border-b border-line text-center" data-label="Actions">
                          <button
                            onClick={() => handleRemoveMember(m)}
                            className="btn btn-danger btn-icon-only"
                            title="Remove Member"
                            disabled={
                              (m.role === WorkspaceRole.ADMIN && members.filter(x => x.role === WorkspaceRole.ADMIN).length <= 1) ||
                              (removeMemberMutation.isPending && removeMemberMutation.variables === m.user.id)
                            }
                          >
                            <UserX size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations Card (Admins only) */}
        {isAdmin && (
          <div className="flex flex-col rounded-md overflow-hidden bg-bone-2 border border-line">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-line bg-bone-2">
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-ink-soft dark:text-[#00F5FF]">
                Pending Invitations
              </h2>
            </div>

            {invitationsLoading ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <tbody>
                    {Array(2).fill(0).map((_, idx) => <RowSkeleton key={idx} />)}
                  </tbody>
                </table>
              </div>
            ) : invitations.length === 0 ? (
              <div className="py-12 px-6 flex flex-col items-center justify-center gap-3 text-mute">
                <Clock className="opacity-40" size={32} />
                <p className="eyebrow">No pending invitations</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse members-table">
                  <thead>
                    <tr>
                      <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                        Email
                      </th>
                      <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                        Role
                      </th>
                      <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-left bg-bone-2 font-mono uppercase tracking-widest">
                        Invited By
                      </th>
                      <th className="py-3.5 px-6 border-b border-line text-mute text-[9px] text-center bg-bone-2 font-mono uppercase tracking-widest">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((invite) => (
                      <tr key={invite.id} className="transition-colors duration-150 hover:bg-orange/5">
                        <td className="py-4 px-6 border-b border-line font-mono text-sm text-left text-text">
                          {invite.email}
                        </td>
                        <td className="py-4 px-6 border-b border-line" data-label="Role">
                          <span className="badge badge-medium">{invite.role}</span>
                        </td>
                        <td className="py-4 px-6 border-b border-line text-text text-[13px]" data-label="Invited By">
                          <span>{invite.invitedBy?.name || 'Admin'}</span>
                        </td>
                        <td className="py-4 px-6 border-b border-line text-center" data-label="Actions">
                          <button
                            onClick={() => handleRevokeInvite(invite)}
                            className="btn btn-danger btn-icon-only"
                            title="Revoke Invitation"
                            disabled={revokeInviteMutation.isPending && revokeInviteMutation.variables === invite.id}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite Team Member"
        subtitle="Send secure registration link via email"
      >
        <form onSubmit={handleInviteSubmit} className="flex flex-col gap-5">
          <div className="form-group">
            <label htmlFor="invite-email" className="mb-2 block">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-mute pointer-events-none" size={16} />
              <input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. engineer@krumos.com"
                disabled={submitting}
                className="pl-10! w-full placeholder:text-mute disabled:opacity-50"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="invite-role" className="mb-2 block">Workspace Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
              disabled={submitting}
              className="w-full placeholder:text-mute disabled:opacity-50"
            >
              <option value={WorkspaceRole.MEMBER}>MEMBER (Can edit own assigned tasks)</option>
              <option value={WorkspaceRole.MANAGER}>MANAGER (Can manage projects & tasks)</option>
              <option value={WorkspaceRole.ADMIN}>ADMIN (Full controls & invitation access)</option>
            </select>
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
              loadingText="Sending..."
            >
              Send Invitation
            </LoadingButton>
          </div>
        </form>
      </ResponsiveModal>
    </div>
  );
};
