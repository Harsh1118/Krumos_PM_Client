import React from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`btn ${className} ${loading ? 'btn-loading' : ''}`}
    >
      {loading ? (
        <>
          <span className="btn-spinner" />
          <span>{loadingText || 'Please wait...'}</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
