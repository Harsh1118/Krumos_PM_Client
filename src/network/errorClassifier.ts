export class NetworkError extends Error {
  constructor(message = 'No internet connection. Please check your network.') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class TimeoutError extends Error {
  constructor(message = 'The request took too long. Please try again.') {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

export class ServerError extends Error {
  status: number;
  constructor(status: number, message = 'Service is temporarily unavailable. Try again in a moment.') {
    super(message);
    this.name = 'ServerError';
    this.status = status;
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export interface UserFacingError {
  title: string;
  message: string;
  isOffline: boolean;
  status?: number;
}

export const classifyApiError = (error: unknown): UserFacingError => {
  if (error instanceof NetworkError) {
    return {
      title: 'Connection Lost',
      message: 'No internet connection. Please check your network connection.',
      isOffline: true,
    };
  }

  if (error instanceof TimeoutError) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long. Please check your connection and try again.',
      isOffline: false,
    };
  }

  if (error instanceof ServerError) {
    return {
      title: 'Server Unavailable',
      message: 'The server is temporarily down or under maintenance. Please try again shortly.',
      isOffline: false,
      status: error.status,
    };
  }

  // Custom ApiError structure from apiConfig
  const apiError = error as {
    response?: {
      data?: {
        message?: string;
      };
      status: number;
      statusText: string;
    };
  };

  if (apiError && apiError.response) {
    const status = apiError.response.status;
    const data = apiError.response.data;
    const serverMessage = data?.message || apiError.response.statusText;

    if (status === 404) {
      return {
        title: 'Not Found',
        message: 'The requested resource could not be found.',
        isOffline: false,
        status,
      };
    }

    if (status === 403) {
      return {
        title: 'Access Denied',
        message: "You don't have permission to perform this action.",
        isOffline: false,
        status,
      };
    }

    if (status === 401) {
      return {
        title: 'Unauthorized',
        message: 'Your session has expired. Please sign in again.',
        isOffline: false,
        status,
      };
    }

    if (status >= 500) {
      return {
        title: 'Server Error',
        message: "Something went wrong on our end. We're looking into it.",
        isOffline: false,
        status,
      };
    }

    return {
      title: 'Error',
      message: typeof serverMessage === 'string' ? serverMessage : 'Could not complete your request.',
      isOffline: false,
      status,
    };
  }

  return {
    title: 'Unexpected Error',
    message: error instanceof Error ? error.message : 'An unexpected error occurred.',
    isOffline: !navigator.onLine,
  };
};

export default classifyApiError;
