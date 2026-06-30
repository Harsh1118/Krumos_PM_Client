import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { useToast } from '../context/ToastContext';
import api from '../config/apiConfig';
import { flushQueue } from './offlineQueue';

interface NetworkStatusContextType {
  isOnline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useNetworkStatus();
  const { error, success } = useToast();
  const prevOnlineRef = useRef<boolean>(isOnline);

  useEffect(() => {
    if (prevOnlineRef.current && !isOnline) {
      error('You are offline. Some actions will be queued and synced when connection is restored.', 5000);
    } else if (!prevOnlineRef.current && isOnline) {
      success('Back online! Syncing your changes...', 4000);
      flushQueue(api).catch((err) => {
        console.error('Failed to flush queue on reconnect', err);
      });
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, error, success]);

  // Trigger sync on initial app mount if online
  useEffect(() => {
    if (isOnline) {
      flushQueue(api).catch((err) => {
        console.error('Failed initial queue sync', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isOnline }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNetwork = (): NetworkStatusContextType => {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkStatusProvider');
  }
  return context;
};
export default NetworkStatusProvider;
