/**
 * Institution Intelligence Workspace — shared bits.
 * KPI strip + section helper used across tabs (avoids repeating markup).
 */

import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

/** Compact KPI strip — label, value, sub, optional tone. */
export function KpiStrip({ items, cols = 4 }) {
  return (
    <div className={cn('grid grid-cols-2 gap-4', cols === 6 && 'lg:grid-cols-6', cols === 5 && 'lg:grid-cols-5', cols === 4 && 'lg:grid-cols-4', cols === 3 && 'lg:grid-cols-3')}>
      {items.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900"
        >
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
          <p className="mt-1 truncate font-display text-xl font-bold text-slate-900 dark:text-white" title={String(k.value)}>{k.value}</p>
          <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-400">{k.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}

/** Section wrapper with a title + optional actions. */
export function WorkspaceSection({ title, subtitle, actions, children, className }) {
  return (
    <section className={cn('mt-8 first:mt-0', className)}>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export default KpiStrip
