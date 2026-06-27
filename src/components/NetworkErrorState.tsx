import React from 'react';
import { WifiOff, AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { classifyApiError } from '../network/errorClassifier';

interface NetworkErrorStateProps {
  isOffline?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  title?: string;
  message?: string;
}

export const NetworkErrorState: React.FC<NetworkErrorStateProps> = ({
  isOffline,
  isError,
  isEmpty,
  error,
  onRetry,
  emptyTitle = 'No records found',
  emptyMessage = 'There is no data to display here yet.',
  title,
  message,
}) => {
  const showOffline = isOffline || (!navigator.onLine && isError);

  if (showOffline) {
    return (
      <div className="network-error-state">
        <div className="network-error-icon-wrapper">
          <WifiOff size={28} className="text-mute" />
        </div>
        <h3 className="network-error-title">Offline</h3>
        <p className="network-error-message">
          You are currently disconnected. Showing local cached view.
        </p>
        {onRetry && (
          <button onClick={onRetry} className="network-error-retry-btn">
            <RotateCw size={12} className="animate-spin-hover" />
            <span>Reconnect</span>
          </button>
        )}
      </div>
    );
  }

  if (isError) {
    const details = classifyApiError(error);
    return (
      <div className="network-error-state">
        <div className="network-error-icon-wrapper border-red-500/20 bg-red-500/5">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h3 className="network-error-title">{title || details.title}</h3>
        <p className="network-error-message">{message || details.message}</p>
        {onRetry && (
          <button onClick={onRetry} className="network-error-retry-btn text-red-500 border-red-500/20 hover:bg-red-500/5">
            <RotateCw size={12} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="network-error-state">
        <div className="network-error-icon-wrapper">
          <Inbox size={28} className="text-mute" />
        </div>
        <h3 className="network-error-title">{emptyTitle}</h3>
        <p className="network-error-message">{emptyMessage}</p>
        {onRetry && (
          <button onClick={onRetry} className="network-error-retry-btn">
            <RotateCw size={12} />
            <span>Refresh</span>
          </button>
        )}
      </div>
    );
  }

  return null;
};

export default NetworkErrorState;
