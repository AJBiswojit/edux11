import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-9 w-9' }
  return (
    <div className={cn('relative', sizes[size], className)} role="status" aria-label="Loading">
      <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-indigo-600 dark:border-t-indigo-400" />
    </div>
  )
}

function PageLoader({ label = 'Loading your experience…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 animate-ping-slow rounded-full bg-indigo-500/20" />
        <Spinner size="lg" />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-medium text-slate-400 dark:text-slate-500"
      >
        {label}
      </motion.p>
    </div>
  )
}

function DashboardSkeleton({ cards = 4 }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    </div>
  )
}

function ErrorState({ title = 'Something went wrong', message, error, onRetry }) {
  const isNetworkError = error?.message?.includes('Network Error') || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNREFUSED'
  const displayMessage = message || (isNetworkError 
    ? 'Unable to connect to the backend server (http://localhost:8000). Please ensure the backend server is running.' 
    : error?.message || 'We could not load this data. Please try again.')

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-rose-200 bg-rose-50/40 p-10 text-center dark:border-rose-500/30 dark:bg-rose-950/20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm ring-1 ring-rose-200 transition-all hover:shadow dark:bg-slate-900 dark:text-rose-400 dark:ring-rose-500/30"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export { Spinner, PageLoader, DashboardSkeleton, ErrorState }
export default Spinner
