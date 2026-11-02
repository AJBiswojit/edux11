import { motion } from 'framer-motion'
import { Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'

function EmptyState({ icon: Icon = Inbox, title, description, action, className, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300/80 bg-white/60 text-center dark:border-slate-700 dark:bg-slate-900/40',
        compact ? 'p-8' : 'p-14',
        className
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 scale-150 rounded-full bg-gradient-to-br from-indigo-500/15 to-teal-500/15 blur-xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 ring-1 ring-indigo-500/20">
          <Icon className="h-7 w-7 text-indigo-500 dark:text-indigo-400" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

export { EmptyState }
export default EmptyState
