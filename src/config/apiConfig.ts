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
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

const handleRequest = async (url: string, options: RequestInit & { data?: ApiBody }) => {
  const token = localStorage.getItem('krumos_token');
  const activeSlug = localStorage.getItem('krumos_active_workspace_slug');

  // Pre-check online status
  if (!navigator.onLine) {
    if (options.method && options.method !== 'GET') {
      enqueueRequest(url, options.method as any, options.data || null);
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
  };
  
  const rawOptions = fetchOptions as Record<string, string | number | boolean | object | null | undefined>;
  if ('data' in rawOptions) {
    delete rawOptions.data;
  }

  try {
    const response = await fetch(`${ENV.API_URL}${url}`, fetchOptions);
    clearTimeout(timeoutId);

    if (response.status === 401) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
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
      } catch (e) {
        // ignore
      }
    }

    return { data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new TimeoutError();
    }

    if (error instanceof NetworkError || error instanceof TimeoutError || error instanceof ServerError) {
      throw error;
    }

    // General network failures (DNS lookup failed, server down, etc.)
    if (!navigator.onLine) {
      if (options.method && options.method !== 'GET') {
        enqueueRequest(url, options.method as any, options.data || null);
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
