import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useWorkspaces } from '../../../context/WorkspaceContext';
import api from '../../../config/apiConfig';
import { useVerifyInvite, useAcceptInviteMutation } from '../../../api/auth/useAuthApi';
import { LogIn, ShieldAlert } from 'lucide-react';
import type { ApiError } from '../../../types';

interface InvitePayload {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  invitedBy: string;
}

export const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { refreshWorkspaces, switchWorkspace } = useWorkspaces();

  const [error, setError] = useState<string | null>(null);

  // Verify invitation token with custom hook
  const { data: inviteInfo = null, isLoading: loading, error: verifyError } = useVerifyInvite(token || '');

  useEffect(() => {
    if (verifyError) {
      const apiErr = verifyError as ApiError;
      setTimeout(() => {
        setError(apiErr.response?.data?.message || 'Invalid or expired invitation link');
      }, 0);
    }
  }, [verifyError]);

  // Accept invitation mutation
  const acceptInviteMutation = useAcceptInviteMutation();

  const accepting = acceptInviteMutation.isPending;

  const handleAccept = async () => {
    if (!token) return;
    setError(null);
    acceptInviteMutation.mutate(token, {
      onSuccess: async (workspace) => {
        await refreshWorkspaces();
        switchWorkspace(workspace.slug);
        navigate(`/w/${workspace.slug}`);
      },
      onError: (err: unknown) => {
        const apiErr = err as ApiError;
        setError(apiErr.response?.data?.message || 'Failed to accept invitation');
      }
    });
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await api.get('/auth/google/url');
      localStorage.setItem('krumos_pending_invite_token', token || '');
      window.location.href = res.data.url;
    } catch (err) {
      console.error(err);
      setError('Google Sign-In failed to load');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 gap-6">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-slate-400">
          Validating Invitation...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10">
        {error ? (
          /* Error State */
          <div className="w-full flex flex-col items-center text-center">
            <ShieldAlert className="text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2 uppercase">Invitation Error</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
            >
              Go to Homepage
            </button>
          </div>
        ) : inviteInfo ? (
          /* Invite Info Card */
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-2xl font-bold text-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/20 mb-4 transition-transform hover:scale-105">
              K
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2 uppercase">You've Been Invited</h1>
            <p className="text-slate-400 text-sm mb-6">
              <strong className="text-slate-200 font-semibold">{(inviteInfo as InvitePayload).invitedBy}</strong> has invited you to join the
            </p>
            
            <div className="w-full bg-slate-800/40 border border-slate-700/40 rounded-xl p-6 mb-5 flex flex-col items-center gap-3">
              <h2 className="font-display font-black text-xl text-white uppercase tracking-tight">{(inviteInfo as InvitePayload).workspaceName}</h2>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider py-1 px-2 border border-orange bg-orange/10 text-orange rounded-sm">
                As {(inviteInfo as InvitePayload).role}
              </span>
            </div>

            <p className="font-mono text-xs text-slate-500 mb-6">
              Invitation email: {(inviteInfo as InvitePayload).email}
            </p>

            {isAuthenticated && user ? (
              /* Authenticated — let user attempt to accept; backend enforces email match */
              <div className="w-full flex flex-col gap-4 items-center">
                <p className="text-sm text-slate-300 leading-relaxed">
                  You are logged in as <strong className="text-white">{user.email}</strong>. Ready to join?
                </p>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange to-orange-hot text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {accepting ? 'Joining Workspace...' : 'Accept Invitation & Join'}
                </button>
              </div>
            ) : (
              /* Unauthenticated: Prompt Login */
              <div className="w-full flex flex-col gap-4 items-center">
                <p className="text-sm text-slate-300 leading-relaxed text-center">
                  Please sign in to accept this invitation.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-slate-50 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <LogIn size={18} />
                  <span>Sign In With Google</span>
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default AcceptInvite;
