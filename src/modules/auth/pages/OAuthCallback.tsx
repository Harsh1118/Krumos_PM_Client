import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import api from '../../../config/apiConfig';

// Module-level tracking to prevent duplicate code exchange requests during
// React StrictMode's mount-unmount-remount cycles in development.
let exchangedCode: string | null = null;

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();

  const code = searchParams.get('code');

  // Handle redirection as soon as authentication state becomes true.
  // This is highly robust against React StrictMode unmount-remount cycles,
  // ensuring the currently active/mounted component instance handles navigation.
  useEffect(() => {
    if (isAuthenticated) {
      const pendingInviteToken = localStorage.getItem('krumos_pending_invite_token');
      if (pendingInviteToken) {
        localStorage.removeItem('krumos_pending_invite_token');
        navigate(`/invite/${pendingInviteToken}`, { replace: true });
      } else {
        navigate('/workspaces', { replace: true });
      }
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!code) {
      navigate('/login?error=missing_code', { replace: true });
      return;
    }

    if (isAuthenticated) {
      return;
    }

    // If we already initiated the exchange for this code, skip it
    if (exchangedCode === code) {
      return;
    }
    exchangedCode = code;

    api
      .post('/auth/google/exchange', { code }, { skipRefresh: true })
      .then((res) => {
        login(res.data.token, res.data.user);
      })
      .catch((err) => {
        // Reset the tracker on error to allow retry if the user retries manually
        exchangedCode = null;
        console.error('Failed to exchange OAuth code', err);
        navigate('/login?error=oauth_exchange_failed', { replace: true });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isAuthenticated]);

  return (
    <div className="layout-loading">
      <div className="spinner"></div>
      <p className="eyebrow">Completing secure sign-in...</p>
    </div>
  );
};
export default OAuthCallback;
