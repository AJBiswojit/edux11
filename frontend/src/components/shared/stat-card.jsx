import { motion } from 'framer-motion'
import {
  AlertTriangle, Archive, ArrowDownRight, ArrowUpRight, Award, BookOpen, BookOpenCheck,
  BrainCircuit, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList, Clock,
  Crosshair, Database, Download, Eye, FileSpreadsheet, FileText, Gauge, HeartPulse,
  ListChecks, Minus, PencilLine, Sparkles, Target, Timer, TrendingDown, TrendingUp, Users,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Sparkline } from '@/components/charts'

/* Curated icon map — keeps the main bundle tree-shakeable (no `import *`). */
const ICON_MAP = {
  Activity: TrendingUp, AlertTriangle, Archive, Award, BookOpen, BookOpenCheck, BrainCircuit,
  CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList, Clock, Crosshair, Database,
  Download, Eye, FileSpreadsheet, FileText, Gauge, HeartPulse, ListChecks, PencilLine,
  Sparkles, Target, Timer, TrendingDown, TrendingUp, Users,
}

function StatCard({
  label, value, delta, up = true, sub, icon = 'Activity', gradient = 'from-indigo-500 to-blue-500',
  spark, index = 0, iconBg = true, onClick,
}) {
  const Icon = ICON_MAP[icon] ?? TrendingUp
  const DeltaIcon = delta == null ? null : up === true ? ArrowUpRight : up === false ? ArrowDownRight : Minus
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick(e) : undefined}
      className={cn(
        'group relative overflow-hidden rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-900/5 transition-shadow duration-300 hover:shadow-lift dark:bg-slate-900 dark:ring-white/10',
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
      )}
    >
      <div className={cn('pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-[0.14]', gradient)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1.5 truncate text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {delta != null && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  up ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                )}
              >
                {DeltaIcon && <DeltaIcon className="h-3 w-3" />}
                {delta}
              </span>
            )}
            {sub && <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">{sub}</span>}
          </div>
        </div>
        <div className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg', gradient, !iconBg && 'bg-none shadow-none')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {spark && spark.length > 1 && (
        <div className="pointer-events-none absolute -bottom-1 right-3 opacity-70">
          <Sparkline data={spark.map((v, i) => ({ value: v, i }))} color="rgba(99,102,241,0.5)" width={92} height={30} />
        </div>
      )}
    </motion.div>
  )
}

export { StatCard }
export default StatCard
