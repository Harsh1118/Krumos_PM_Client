import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  selectNone?: boolean;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, selectNone = false }) => {
  return (
    <div className={`min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden ${selectNone ? 'select-none' : ''}`}>
      {/* Dynamic atmospheric mesh background blobs */}
      <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-[#F44E14]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[700px] h-[700px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[110px] pointer-events-none" />
      
      {/* Centered content card wrapper */}
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
