import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from '@/contexts/theme-context'
// Single toast system: the provider that also renders the toast UI lives in
// components/ui/toast.jsx.
import { ToastProvider } from '@/components/ui/toast'
import { AuthProvider } from '@/contexts/auth-context'
import { ExamModeProvider } from '@/contexts/exam-mode-context'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import '@/api'
import '@/index.css'

/**
 * MediXO EduX — An AI-Powered Education Platform
 * Entry point. Providers (outer → inner):
 * BrowserRouter → QueryClient → Theme → Toast → Auth
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Honor the app-level reduced-motion preference before first paint.
try {
  if (window.localStorage.getItem('EduX_reduced_motion') === 'true') {
    document.documentElement.classList.add('reduced-motion')
  }
} catch {
  /* storage unavailable */
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary showDetails>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <ExamModeProvider>
                  <App />
                </ExamModeProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
)
