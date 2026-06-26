import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token: currentToken, login } = useAuthStore();

  const token = searchParams.get('token');
  const userStr = searchParams.get('user');

  useEffect(() => {
    if (token && userStr) {
      if (currentToken === token) {
        navigate('/workspaces');
        return;
      }

      try {
        const user = JSON.parse(userStr);
        login(token, user);

        const pendingInviteToken = localStorage.getItem('krumos_pending_invite_token');
        if (pendingInviteToken) {
          localStorage.removeItem('krumos_pending_invite_token');
          navigate(`/invite/${pendingInviteToken}`);
        } else {
          navigate('/workspaces');
        }
      } catch (err) {
        console.error('Failed to parse user from Google OAuth redirect', err);
        navigate('/login?error=invalid_user');
      }
    } else {
      navigate('/login?error=missing_credentials');
    }
  }, [token, userStr, currentToken, login, navigate]);

  return (
    <div className="layout-loading">
      <div className="spinner"></div>
      <p className="eyebrow">Completing secure sign-in...</p>
    </div>
  );
};
export default OAuthCallback;
