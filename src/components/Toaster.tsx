import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = toast.type === 'success' 
          ? CheckCircle2 
          : toast.type === 'error' 
            ? AlertCircle 
            : Info;

        return (
          <div key={toast.id} className={`toast-item toast-${toast.type}`}>
            <div className="toast-icon-wrapper">
              <Icon size={16} />
            </div>
            <div className="toast-message-text">{toast.message}</div>
            <button className="toast-close-btn" onClick={() => removeToast(toast.id)} aria-label="Close notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export const Toaster = ToastContainer;
export default Toaster;
