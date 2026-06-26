import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaces } from '../../../context/WorkspaceContext';
import { useAuthStore } from '../../../store/authStore';
import { LogOut } from 'lucide-react';
import type { ApiError } from '../../../types';
import krumosLogo from '../../../assets/krumos_logo.svg';

export const WorkspaceSelect: React.FC = () => {
  const { workspaces, createWorkspace, isLoading: wsLoading } = useWorkspaces();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isCreating) {
      const autoSlug = val
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      setSlug(autoSlug);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    if (!slug.trim()) {
      setError('Workspace URL slug is required');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createWorkspace(name, slug);
      navigate(`/w/${created.slug}`);
    } catch (err) {
      const error = err as ApiError;
      setError(error.response?.data?.message || 'Failed to create workspace');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const noWorkspaces = workspaces.length === 0;
  const showCreateForm = isCreating || (noWorkspaces && !wsLoading);

  const handleSelect = (workspaceSlug: string) => {
    navigate(`/w/${workspaceSlug}`);
  };

  if (wsLoading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0d0d0d] gap-6">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-zinc-500">
          Fetching Workspaces...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0d0d0d] px-6 py-12">
      <div className="w-full max-w-[520px] justify-center bg-[#121212] border border-white/[0.08] rounded-2xl p-8 md:p-12 shadow-lg flex flex-col gap-8">
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-4">
          <img 
            src={krumosLogo} 
            alt="Krumos Logo" 
            className="w-12 h-12 object-contain transition-transform duration-300 hover:scale-110 drop-shadow-[0_0_12px_rgba(244,78,20,0.15)]" 
          />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight uppercase mb-1 font-display">
              {showCreateForm ? 'Create Workspace' : 'Select Workspace'}
            </h1>
            <p className="text-zinc-400 font-mono text-[10px] uppercase tracking-[0.22em]">
              {showCreateForm
                ? 'Onboard your team and organize projects'
                : `Welcome back, ${user?.name}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-none text-sm leading-relaxed text-center font-medium">
            {error}
          </div>
        )}

        <div>
          {showCreateForm ? (
            /* Create Workspace Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-name" className="block font-mono text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-400">
                  Workspace Name
                </label>
                <input
                  id="ws-name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Krumos Tech"
                  disabled={submitting}
                  className="w-full p-3.5 font-display text-[15px] border border-white/[0.08] bg-white/[0.03] text-white rounded-lg transition-all duration-150 focus:outline-none focus:border-white/[0.2] focus:bg-white/[0.05] placeholder:text-zinc-500 disabled:opacity-50"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="ws-slug" className="block font-mono text-[11px] font-normal uppercase tracking-[0.22em] text-zinc-400">
                  URL Slug
                </label>
                <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-lg overflow-hidden focus-within:border-white/[0.2] focus-within:bg-white/[0.05]">
                  <span className="font-mono text-sm text-zinc-550 pl-3 select-none">
                    krumos.pm/w/
                  </span>
                  <input
                    id="ws-slug"
                    type="text"
                    value={slug}
                    onChange={handleSlugChange}
                    placeholder="krumos-tech"
                    disabled={submitting}
                    className="w-full p-3.5 font-display text-[15px] text-white border-none rounded-lg pl-1 bg-transparent focus:outline-none focus:bg-transparent placeholder:text-zinc-500 disabled:opacity-50"
                    required
                  />
                </div>
                <span className="text-[11px] text-zinc-500 mt-1.5 leading-relaxed">
                  Permanent identifier. Lowercase letters, numbers, and dashes only.
                </span>
              </div>

              <div className="flex gap-4 mt-4">
                {noWorkspaces ? (
                  <button
                    type="button"
                    onClick={logout}
                    className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3.5 px-6 rounded-xl border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-white/[0.04] text-white border-white/[0.1] hover:bg-white/[0.08] disabled:border-zinc-850 disabled:text-zinc-650 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    Sign Out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setError(null);
                    }}
                    className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3.5 px-6 rounded-xl border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-white/[0.04] text-white border-white/[0.1] hover:bg-white/[0.08] disabled:border-zinc-850 disabled:text-zinc-650 disabled:cursor-not-allowed"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3.5 px-6 rounded-xl border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-white text-zinc-950 border-white hover:bg-slate-50 focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-2 disabled:border-zinc-850 disabled:text-zinc-650 disabled:cursor-not-allowed disabled:bg-zinc-800"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create & Launch'}
                </button>
              </div>
            </form>
          ) : (
            /* Workspace Selection View */
            <div className="flex flex-col gap-5">
              <div className="border border-white/[0.06] mx-0 bg-black/35 p-4 rounded-xl">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600 mb-3 px-1">Your Workspaces</p>
                {workspaces.length === 0 ? (
                  <div className="py-6 text-center border border-dashed border-zinc-800 p-4">
                    <p className="font-mono text-[11px] font-normal uppercase tracking-[0.06em] text-zinc-500 leading-relaxed">
                      You are not a member of any workspaces yet.<br />
                      Please ask your administrator to invite you or create a new workspace.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-stretch gap-2 max-h-[260px] overflow-y-auto">
                    {workspaces.map((w) => (
                      <button
                        key={w.id}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 text-left hover:border-white/[0.15] hover:bg-white/[0.06]"
                        onClick={() => handleSelect(w.slug)}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-9 h-9 bg-white text-zinc-950 font-display font-extrabold text-sm flex items-center justify-center overflow-hidden shrink-0 rounded-lg">
                            {w.logoUrl ? (
                              <img src={w.logoUrl} alt={w.name} className="w-full h-full object-cover" />
                            ) : (
                              w.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-display font-extrabold text-[13px] text-white truncate">{w.name}</span>
                            <span className="font-mono text-[10px] text-zinc-500 mt-0.5 truncate">krumos.pm/w/{w.slug}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.05em] py-1 px-2 border border-white/[0.1] bg-white/[0.04] text-white shrink-0">
                          {w.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 items-stretch">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3.5 px-6 rounded-xl border cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-white text-zinc-950 border-white hover:bg-slate-50 focus:outline focus:outline-2 focus:outline-orange focus:outline-offset-2"
                >
                  + Create New Workspace
                </button>
                <button
                  onClick={logout}
                  className="w-full font-mono text-[12px] font-bold uppercase tracking-[0.05em] py-3.5 px-6 rounded-xl border border-white/[0.1] cursor-pointer inline-flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] bg-transparent text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default WorkspaceSelect;
