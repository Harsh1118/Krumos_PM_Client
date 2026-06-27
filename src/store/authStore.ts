import { useSyncExternalStore } from 'react';
import api, { setUnauthorizedHandler } from '../config/apiConfig';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  googleId?: string | null;
  loginAt?: string | null;
  loggedOut?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

let state: AuthState = {
  token: localStorage.getItem('krumos_token'),
  user: null,
  isAuthenticated: !!localStorage.getItem('krumos_token'),
  isLoading: true,
};

let isLoggingOut = false;

try {
  const storedUser = localStorage.getItem('krumos_user');
  if (storedUser) {
    state.user = JSON.parse(storedUser);
  }
} catch (e) {
  localStorage.removeItem('krumos_token');
  localStorage.removeItem('krumos_user');
  state.token = null;
  state.isAuthenticated = false;
}
state.isLoading = false;

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  login(token: string, user: User) {
    localStorage.setItem('krumos_token', token);
    localStorage.setItem('krumos_user', JSON.stringify(user));
    state = {
      token,
      user,
      isAuthenticated: true,
      isLoading: false,
    };
    emitChange();
  },
  async logout() {
    if (isLoggingOut) return;
    isLoggingOut = true;
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Failed to log out on server', err);
    } finally {
      localStorage.removeItem('krumos_token');
      localStorage.removeItem('krumos_user');
      localStorage.removeItem('krumos_active_workspace_slug');
      state = {
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
      emitChange();
      isLoggingOut = false;
      window.location.href = '/login';
    }
  },
  async googleLogin(code: string) {
    state = { ...state, isLoading: true };
    emitChange();
    try {
      const res = await api.post('/auth/google/callback', { code });
      authStore.login(res.data.token, res.data.user);
    } catch (err) {
      state = { ...state, isLoading: false };
      emitChange();
      console.error('Google login failed', err);
      throw err;
    }
  }
};

setUnauthorizedHandler(() => {
  authStore.logout();
});

export const useAuthStore = () => {
  const currentState = useSyncExternalStore(authStore.subscribe, authStore.getSnapshot);
  return {
    ...currentState,
    login: authStore.login,
    logout: authStore.logout,
    googleLogin: authStore.googleLogin,
  };
};
export type { AuthState };
