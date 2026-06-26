import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setUnauthorizedHandler } from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId?: string | null;
  loginAt?: string | null;
  loggedOut?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  googleLogin: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for existing session
    const storedToken = localStorage.getItem('krumos_token');
    const storedUser = localStorage.getItem('krumos_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        // Clear corrupt state
        localStorage.removeItem('krumos_token');
        localStorage.removeItem('krumos_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('krumos_token', newToken);
    localStorage.setItem('krumos_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Failed to log out on server', err);
    } finally {
      localStorage.removeItem('krumos_token');
      localStorage.removeItem('krumos_user');
      localStorage.removeItem('krumos_active_workspace_slug');
      setToken(null);
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  // Google OAuth flow
  const googleLogin = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const res = await api.post('/auth/google/callback', { code });
      login(res.data.token, res.data.user);
    } catch (err) {
      console.error('Google login failed', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Register the global response handler for 401s immediately during the render phase
  // so that child components (like WorkspaceProvider) have the interceptor active when their async requests return
  setUnauthorizedHandler(logout);


  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        googleLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
