import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { DEVICE_CODES } from './api/client'
import { refreshData } from './lib/query'
import { toast } from './lib/toast'
import { router } from './router'
import './styles/app.css'

const AUTH_CODES = new Set(['authentication_required', 'mfa_required', 'mfa_setup_required'])
const isAuthError = (error) => AUTH_CODES.has(error?.code) || DEVICE_CODES.has(error?.code)

const queryClient = new QueryClient({
  queryCache: new QueryCache(),
  mutationCache: new MutationCache({
    // Like the flash() + redirect after every Jinja POST: show the error, refetch everything after success.
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.meta?.inline && !isAuthError(error)) toast(error.message, 'error')
    },
    onSuccess: () => refreshData(queryClient),
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (count, error) => count < 1 && !(error?.status >= 400 && error?.status < 500),
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
