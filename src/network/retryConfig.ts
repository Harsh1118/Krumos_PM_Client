import { NetworkError, TimeoutError, ServerError } from './errorClassifier';

export const retryStrategy = (failureCount: number, error: unknown): boolean => {
  // Network connection failures: retry up to 3 times
  if (error instanceof NetworkError) {
    return failureCount < 3;
  }

  // Timeout failures: retry up to 2 times
  if (error instanceof TimeoutError) {
    return failureCount < 2;
  }

  // Internal Server Errors (5xx): retry up to 2 times
  if (error instanceof ServerError) {
    return failureCount < 2;
  }

  // Do not retry 4xx errors or other client-side validation failures
  return false;
};

export const retryDelay = (attempt: number): number => {
  return Math.min(1000 * Math.pow(2, attempt), 15000);
};
