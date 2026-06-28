import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { retryStrategy, retryDelay } from './network/retryConfig'
import { setRefreshTokenFn } from './config/apiConfig'
import { authStore } from './store/authStore'
import './index.css'
import App from './App.tsx'

// Register the token refresh function with the API interceptor.
// Done here to break the circular dependency (apiConfig ↔ authStore).
setRefreshTokenFn(() => authStore.refresh());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 60000, // 1 minute
      gcTime: 5 * 60000, // 5 minutes
      retry: retryStrategy,
      retryDelay,
    },
    mutations: {
      retry: 0,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
