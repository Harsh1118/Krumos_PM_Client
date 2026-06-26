import React, { useState } from 'react';
import api from '../../../config/apiConfig';
import krumosLogo from '../../../assets/krumos_logo.svg';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/auth/google/url');
      window.location.href = res.data.url;
    } catch (err) {
      setError('Failed to initiate Google sign-in.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden select-none">
      {/* Dynamic atmospheric mesh background blobs */}
      <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-[#F44E14]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[700px] h-[700px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Glassmorphic card */}
      <div 
        className="w-full max-w-md bg-slate-950/30 backdrop-blur-[24px] border border-white/[0.08] rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8),_0_0_50px_rgba(244,78,20,0.05)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.85),_0_0_50px_rgba(244,78,20,0.12)] transition-all duration-500 hover:border-white/[0.14] hover:scale-[1.01] relative z-10 flex flex-col gap-9 p-10 pb-14"
      >
        
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-5">
          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl shadow-inner shadow-white/[0.02]">
            <img 
              src={krumosLogo} 
              alt="Krumos Logo" 
              className="w-14 h-14 object-contain transition-transform duration-500 hover:scale-110 drop-shadow-[0_0_12px_rgba(244,78,20,0.3)]" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight font-montserrat">
              Krumos
            </h1>
            <p className="text-slate-400 font-semibold uppercase tracking-[0.25em] text-[10px] font-montserrat opacity-80">
              Project Management
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        {/* Primary Action Button */}
        <button
          className="w-full flex items-center justify-center gap-3.5 bg-white hover:bg-slate-50 text-slate-950 font-bold px-6 py-4 rounded-xl shadow-[0_4px_20px_rgba(255,255,255,0.08)] hover:shadow-[0_8px_30px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-montserrat"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span className="text-sm tracking-wide">Sign In With Google</span>
        </button>
      </div>
    </div>
  );
};
export default Login;
