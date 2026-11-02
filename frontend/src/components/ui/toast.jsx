import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

const ToastCtx = createContext(null)

const variantStyles = {
  default: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/60',
  error: 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-950/60',
  warning: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/60',
  info: 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-950/60',
}

const variantIcons = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />,
  error: <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />,
  info: <Info className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />,
}

let counter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  const push = ({ title, description, variant = 'default', duration = 4200 }) => {
    const id = ++counter
    setToasts((prev) => [...prev.slice(-4), { id, title, description, variant }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }

  const toast = {
    default: push,
    success: (title, description) => push({ title, description, variant: 'success' }),
    error: (title, description) => push({ title, description, variant: 'error' }),
    warning: (title, description) => push({ title, description, variant: 'warning' }),
    info: (title, description) => push({ title, description, variant: 'info' }),
    dismiss,
  }

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-full max-w-sm flex-col gap-2.5">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: 60, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, scale: 0.96 }}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  className={cn(
                    'pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-lift backdrop-blur-xl',
                    variantStyles[t.variant]
                  )}
                >
                  {variantIcons[t.variant]}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
                    {t.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default ToastProvider
