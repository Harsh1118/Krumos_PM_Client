import { ENV } from './env.config';

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

  const fetchOptions: RequestInit = {
    ...options,
    body,
    headers,
  };
  
  const rawOptions = fetchOptions as Record<string, string | number | boolean | object | null | undefined>;
  if ('data' in rawOptions) {
    delete rawOptions.data;
  }

  const response = await fetch(`${ENV.API_URL}${url}`, fetchOptions);

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
    const error = new Error(response.statusText) as ApiError;
    error.response = {
      data: errorData,
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
};

const api = {
  get: (url: string, config?: ApiConfig) => {
    return handleRequest(url, { method: 'GET', ...config });
  },
  post: (url: string, body?: ApiBody, config?: ApiConfig) => {
    return handleRequest(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });
  },
  patch: (url: string, body?: ApiBody, config?: ApiConfig) => {
    return handleRequest(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });
  },
  delete: (url: string, config?: ApiConfig) => {
    return handleRequest(url, { method: 'DELETE', ...config });
  },
};

export default api;
