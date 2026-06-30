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

// Shared promise to prevent multiple simultaneous refresh calls (token refresh race condition guard)
let refreshPromise: Promise<string | null> | null = null;

try {
  const storedUser = localStorage.getItem('krumos_user');
  if (storedUser) {
    state.user = JSON.parse(storedUser);
  }
} catch {
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
      // skipRefresh prevents the refresh interceptor from firing during logout
      await api.post('/auth/logout', undefined, { skipRefresh: true });
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
  // Silently refreshes the access token using the HTTP-only refresh cookie.
  // Returns the new access token or null if refresh fails.
  // A shared promise prevents multiple simultaneous refresh calls (race condition guard).
  // NOTE: Do NOT call authStore.logout() here — the apiConfig interceptor handles
  // the null return value by calling unauthorizedHandler(), avoiding a double logout.
  async refresh(): Promise<string | null> {
    // Do not attempt refresh while a logout is already in progress
    if (isLoggingOut) return null;

    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = api
      .post('/auth/refresh', undefined, { skipRefresh: true })
      .then((res) => {
        const newToken: string = res.data.token;
        const updatedUser: User = res.data.user;
        localStorage.setItem('krumos_token', newToken);
        localStorage.setItem('krumos_user', JSON.stringify(updatedUser));
        state = {
          token: newToken,
          user: updatedUser,
          isAuthenticated: true,
          isLoading: false,
        };
        emitChange();
        return newToken;
      })
      .catch((err) => {
        console.error('Silent token refresh failed:', err);
        // Return null — the apiConfig 401 interceptor will call unauthorizedHandler()
        // which triggers authStore.logout(). Do not call logout() here to avoid a loop.
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });

    return refreshPromise;
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
    refresh: authStore.refresh,
    googleLogin: authStore.googleLogin,
  };
};
export type { AuthState };
