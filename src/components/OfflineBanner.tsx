import React, { useState, useEffect } from 'react';
import { useNetwork } from '../network/NetworkStatusContext';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setTimeout(() => setShouldShow(true), 0);
    } else {
      // Wait for slide-out animation to finish
      const timer = setTimeout(() => setShouldShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!shouldShow) return null;

  return (
    <div
      className={`offline-banner-wrapper ${
        !isOnline ? 'slide-down-active' : 'slide-up-inactive'
      }`}
    >
      <div className="offline-banner-container">
        <WifiOff size={14} className="text-orange animate-pulse" />
        <span className="offline-banner-text">
          Offline Mode — displaying cached data. Changes will sync when online.
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
