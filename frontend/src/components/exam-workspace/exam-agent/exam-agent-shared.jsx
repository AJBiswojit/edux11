/**
 * AI Exam Conducting Agent — shared presentational bits.
 * Small, design-system-consistent atoms used across home / instructions /
 * live / report. No data logic lives here.
 */
import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'

const TYPE_STYLES = {
  University: 'bg-indigo-50 text-indigo-700 ring-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30',
  JEE: 'bg-orange-50 text-orange-700 ring-orange-200/60 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/30',
  NEET: 'bg-teal-50 text-teal-700 ring-teal-200/60 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-500/30',
}

export function ExamTypeBadge({ type, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset whitespace-nowrap', TYPE_STYLES[type] ?? TYPE_STYLES.University, className)}>
      {type === 'JEE' ? '🎯' : type === 'NEET' ? '🧬' : '🏛️'} {type === 'University' ? 'University' : type}
    </span>
  )
}

export function ResultBadge({ result }) {
  const map = {
    Correct: { variant: 'success', label: 'Correct' },
    Incorrect: { variant: 'danger', label: 'Incorrect' },
    Skipped: { variant: 'warning', label: 'Skipped' },
    'Not visited': { variant: 'secondary', label: 'Not visited' },
  }
  const m = map[result] ?? map['Not visited']
  return <Badge variant={m.variant} size="sm">{m.label}</Badge>
}

export function LevelBadge({ level }) {
  const map = {
    Strong: 'success',
    Developing: 'warning',
    Weak: 'danger',
    'Not attempted': 'secondary',
    'Limited data': 'secondary',
  }
  return <Badge variant={map[level] ?? 'secondary'} size="sm">{level}</Badge>
}

export function PacePill({ pace, compact = false }) {
  const styles = {
    idle: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    ahead: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    'on-track': 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    'slightly-behind': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    behind: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    'final-minute': 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', styles[pace?.level] ?? styles.idle)}>
      <span className={cn('h-1.5 w-1.5 rounded-full',
        pace?.level === 'ahead' ? 'bg-emerald-500'
          : pace?.level === 'on-track' ? 'bg-sky-500'
            : pace?.level === 'slightly-behind' || pace?.level === 'behind' || pace?.level === 'final-minute' ? 'bg-rose-500'
              : 'bg-slate-400')} />
      {pace?.message ?? '—'}
    </span>
  )
}

export function AgentChip({ pulse = true, label = 'AI Exam Agent' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200/60 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
      {pulse && <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
      </span>}
      ✨ {label}
    </span>
  )
}

export function SectionHeading({ step, title, sub }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {step != null && (
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-xs font-bold text-white shadow-md shadow-indigo-500/25">
          {step}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
        {sub && <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}
