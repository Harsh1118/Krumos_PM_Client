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
  const { login } = useAuthStore();

  // The GET /auth/google/callback redirect now returns a short-lived one-time
  // state ?code= instead of the raw access token.
  // We exchange it here via POST to prevent token exposure in browser history.
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      navigate('/login?error=missing_code');
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

        const pendingInviteToken = localStorage.getItem('krumos_pending_invite_token');
        if (pendingInviteToken) {
          localStorage.removeItem('krumos_pending_invite_token');
          navigate(`/invite/${pendingInviteToken}`);
        } else {
          navigate('/workspaces');
        }
      })
      .catch((err) => {
        // Reset the tracker on error to allow retry if the user retries manually
        exchangedCode = null;
        console.error('Failed to exchange OAuth code', err);
        navigate('/login?error=oauth_exchange_failed');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="layout-loading">
      <div className="spinner"></div>
      <p className="eyebrow">Completing secure sign-in...</p>
    </div>
  );
};
export default OAuthCallback;

