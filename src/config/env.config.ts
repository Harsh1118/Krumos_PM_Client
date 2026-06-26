export const ENV = {
  API_URL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api',
  WS_URL: (import.meta.env.VITE_WS_URL as string) || 'http://localhost:5000',
};
