import { ENV } from './env.config';
import { NetworkError, TimeoutError, ServerError } from '../network/errorClassifier';
import { enqueueRequest } from '../network/offlineQueue';

export interface ApiError extends Error {
  response?: {
    data: {
      message?: string;
      [key: string]: unknown;
    };
    status: number;
    statusText: string;
  };
}

export type ApiBody = object | string | number | boolean | null;

export interface ApiConfig extends Omit<RequestInit, 'method' | 'body'> {
  data?: ApiBody;
  // When true, the request skips the offline queue (used by flushQueue itself)
  skipQueue?: boolean;
  // When true, the 401 interceptor will NOT attempt a silent token refresh.
  // Use this for /auth/refresh and /auth/logout calls to avoid infinite loops.
  skipRefresh?: boolean;
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

// Lazy-loaded reference to authStore.refresh() to break a circular dependency.
// (apiConfig imports authStore, authStore imports apiConfig — this resolves it.)
let refreshTokenFn: (() => Promise<string | null>) | null = null;
export const setRefreshTokenFn = (fn: () => Promise<string | null>) => {
  refreshTokenFn = fn;
};

const handleRequest = async (url: string, options: RequestInit & { data?: ApiBody; skipQueue?: boolean; skipRefresh?: boolean }) => {
  const token = localStorage.getItem('krumos_token');
  const activeSlug = localStorage.getItem('krumos_active_workspace_slug');

  // Pre-check online status. Only queue mutating requests (not GETs).
  // Skip queueing when the request itself came from flushQueue to prevent the
  // circular duplication loop (flushQueue → api → enqueueRequest → flushQueue).
  if (!navigator.onLine) {
    if (options.method && options.method !== 'GET' && !options.skipQueue) {
      enqueueRequest(url, options.method as 'POST' | 'PATCH' | 'DELETE', options.data || null);
    }
    throw new NetworkError();
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (activeSlug) {
    headers.set('x-workspace-slug', activeSlug);
  }

  let body = options.body;
  if (options.data && !body) {
    body = JSON.stringify(options.data);
  }

  if (!headers.has('Content-Type') && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const fetchOptions: RequestInit = {
    ...options,
    body,
    headers,
    signal: controller.signal,
    credentials: 'include', // Ensure cookies are sent and received in cross-origin requests
  };

  const rawOptions = fetchOptions as Record<string, string | number | boolean | object | null | undefined>;
  if ('data' in rawOptions) delete rawOptions.data;
  if ('skipQueue' in rawOptions) delete rawOptions.skipQueue;
  if ('skipRefresh' in rawOptions) delete rawOptions.skipRefresh;

  try {
    const response = await fetch(`${ENV.API_URL}${url}`, fetchOptions);
    clearTimeout(timeoutId);

    if (response.status === 401 && !options.skipRefresh && refreshTokenFn) {
      // Attempt a silent token refresh before triggering a global logout.
      // This prevents users from being kicked out after the 15-minute access token expiry.
      const newToken = await refreshTokenFn();
      if (newToken) {
        // Retry the original request once with the refreshed token
        const retryHeaders = new Headers(headers);
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        const retryResponse = await fetch(`${ENV.API_URL}${url}`, {
          ...fetchOptions,
          headers: retryHeaders,
        });

        if (!retryResponse.ok) {
          if (retryResponse.status === 401) {
            // Refresh succeeded but the retry still got 401 — log out definitively
            if (unauthorizedHandler) unauthorizedHandler();
          }
          const errorData = await retryResponse.json().catch(() => ({}));
          const error = new Error(retryResponse.statusText) as ApiError;
          error.response = {
            data: errorData as { message?: string; [key: string]: unknown },
            status: retryResponse.status,
            statusText: retryResponse.statusText,
          };
          throw error;
        }

        const contentType = retryResponse.headers.get('content-type');
        let data = null;
        if (contentType?.includes('application/json')) {
          data = await retryResponse.json();
        }
        return { data };
      } else {
        // Refresh failed — trigger logout (handled inside authStore.refresh)
        if (unauthorizedHandler) unauthorizedHandler();
        throw new Error('Session expired');
      }
    }

    // Only trigger a global logout on 401 for real API calls.
    // skipRefresh=true is set on /auth/logout and /auth/refresh to prevent
    // an infinite loop: logout → 401 → unauthorizedHandler → logout → ...
    if (response.status === 401 && !options.skipRefresh) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch {
        // ignore
      }

      if (response.status >= 500) {
        throw new ServerError(response.status, response.statusText);
      }

      const error = new Error(response.statusText) as ApiError;
      error.response = {
        data: errorData as { message?: string; [key: string]: unknown },
        status: response.status,
        statusText: response.statusText,
      };
      throw error;
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch {
        // ignore
      }
    }

    return { data };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if ((error as Error).name === 'AbortError') {
      throw new TimeoutError();
    }

    if (error instanceof NetworkError || error instanceof TimeoutError || error instanceof ServerError) {
      throw error;
    }

    // General network failures (DNS lookup failed, server down, etc.)
    if (!navigator.onLine) {
      if (options.method && options.method !== 'GET' && !options.skipQueue) {
        enqueueRequest(url, options.method as 'POST' | 'PATCH' | 'DELETE', options.data || null);
      }
      throw new NetworkError();
    }

    throw new ServerError(503, 'Server unreachable or connection failed');
  }
};

const api = {
  get: (url: string, config?: ApiConfig) => {
    return handleRequest(url, { method: 'GET', ...config });
  },
  post: (url: string, body?: ApiBody, config?: ApiConfig) => {
    return handleRequest(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      data: body || undefined,
      ...config,
    });
  },
  patch: (url: string, body?: ApiBody, config?: ApiConfig) => {
    return handleRequest(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      data: body || undefined,
      ...config,
    });
  },
  delete: (url: string, config?: ApiConfig) => {
    return handleRequest(url, { method: 'DELETE', ...config });
  },
};

export default api;
