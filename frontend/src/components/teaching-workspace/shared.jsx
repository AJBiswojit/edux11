/**
 * MediXO EduX — Teaching Workspace shared pieces.
 * Small, reusable building blocks used across the Teaching Intelligence tabs.
 */

import { motion } from 'framer-motion'
import { AlertTriangle, Info, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

const TONE_STYLES = {
  positive: { wrap: 'border-emerald-200/70 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/[0.07]', icon: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-500/10', Icon: TrendingUp },
  warning: { wrap: 'border-amber-200/70 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/[0.07]', icon: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-500/10', Icon: AlertTriangle },
  neutral: { wrap: 'border-indigo-200/70 bg-indigo-50/60 dark:border-indigo-500/20 dark:bg-indigo-500/[0.07]', icon: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-500/10', Icon: Info },
}

const ICON_MAP = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  alert: AlertTriangle,
  target: Info,
  users: Info,
  clock: Info,
  list: Info,
  sparkles: Sparkles,
  zap: Sparkles,
}

/** Tone-aware AI insight card (derived insights rendered as glassy callouts). */
function AiInsightCard({ insight, index = 0, className }) {
  const tone = TONE_STYLES[insight?.tone] ?? TONE_STYLES.neutral
  const Icon = ICON_MAP[insight?.icon] ?? tone.Icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn('rounded-2xl border p-4', tone.wrap, className)}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', tone.iconBg, tone.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{insight?.title}</p>
          {insight?.body && <p className="mt-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{insight.body}</p>}
        </div>
      </div>
    </motion.div>
  )
}

/** Section heading used inside tabs to keep rhythm consistent. */
function WorkspaceSection({ title, subtitle, icon: Icon, children, className, actions }) {
  return (
    <section className={cn('mt-8 first:mt-0', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

/** Gradient "AI summary" callout used on Overview. */
function AiSummaryCard({ summary, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-indigo-500/20',
        className
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl" />
      <div className="relative">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
          <Sparkles className="h-3.5 w-3.5" /> Quick AI summary
        </p>
        <h3 className="mt-2 font-display text-lg font-bold leading-snug">{summary?.headline}</h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/85">{summary?.body}</p>
        {(summary?.highlights ?? []).length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {summary.highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-[12px] font-medium text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70" /> {h}
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

export { AiInsightCard, WorkspaceSection, AiSummaryCard }
export default AiInsightCard
