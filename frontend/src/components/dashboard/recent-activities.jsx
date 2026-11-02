import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, BookOpen, ClipboardList, Minus, Target, TrendingUp, Zap } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge } from '@/components/ui'
import { formatDate } from '@/utils/format'

const TYPE_META = {
  mock: { icon: ClipboardList, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10', label: 'Mock test' },
  exam: { icon: ClipboardList, color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10', label: 'Exam' },
  chapter: { icon: BookOpen, color: 'text-teal-500 bg-teal-50 dark:bg-teal-500/10', label: 'Chapter done' },
  revision: { icon: TrendingUp, color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', label: 'Revision' },
  milestone: { icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', label: 'Milestone' },
  // legacy fallbacks
  achievement: { icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10', label: 'Achievement' },
  grade: { icon: Target, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10', label: 'Grade' },
}
const DEFAULT_META = { icon: BookOpen, color: 'text-slate-500 bg-slate-50 dark:bg-slate-800', label: 'Activity' }

function DeltaChip({ delta }) {
  if (delta == null) return null
  const n = Number(delta)
  if (!Number.isFinite(n)) return null
  if (n > 0) return <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"><ArrowUp className="h-3 w-3" />+{n}%</span>
  if (n < 0) return <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-500 dark:text-rose-400"><ArrowDown className="h-3 w-3" />{n}%</span>
  return <span className="flex items-center gap-0.5 text-[10px] font-bold text-slate-400"><Minus className="h-3 w-3" />0%</span>
}

/**
 * Recent Performance Feed.
 * Replaces the university "Recent Activities" widget.
 * Shows last mock scores, question attempt accuracy, subject improvement/drop.
 *
 * Reads from:
 *   1. `datasets.recentPerformance` — competitive performance events
 *   2. `derived.recentActivities`   — legacy activity feed (fallback)
 *
 * Each performance event shape:
 *   { id, type, title, subject, score, accuracy, delta, date }
 */
function RecentActivities({ activities = [], datasets = {} }) {
  const performance = datasets.recentPerformance ?? []

  // Merge: prefer competitive performance events, fall back to legacy activities
  const items = performance.length > 0
    ? performance.slice(0, 7).map((p) => ({
        id: p.id,
        type: p.type ?? 'mock',
        title: p.title,
        subject: p.subject,
        score: p.score ?? p.percentage,
        accuracy: p.accuracy,
        delta: p.delta,
        date: p.date,
      }))
    : activities.slice(0, 7).map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title?.split(' — ')[0],
        subject: a.detail,
        score: null,
        accuracy: null,
        delta: null,
        date: a.date,
      }))

  return (
    <ChartCard
      className="h-full"
      title="Recent performance"
      subtitle="Scores · accuracy · subject trends"
      actions={<Badge variant="secondary" size="sm">{items.length} events</Badge>}
      contentClassName="pt-1"
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No performance data yet</p>
          <p className="mt-1 text-xs text-slate-400">Scores appear after your first mock test.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const meta = TYPE_META[item.type] ?? DEFAULT_META
            const Icon = meta.icon
            return (
              <motion.div
                key={item.id ?? i}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3.5 py-2.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.color}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                  <p className="text-[10.5px] font-medium text-slate-400">
                    {meta.label}{item.subject ? ` · ${item.subject}` : ''}
                    {item.date ? ` · ${formatDate(item.date, 'MMM d')}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.accuracy != null && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {item.accuracy}% acc
                    </span>
                  )}
                  {item.score != null && (
                    <Badge variant="outline" size="sm">{item.score}%</Badge>
                  )}
                  <DeltaChip delta={item.delta} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </ChartCard>
  )
}

export { RecentActivities }
export default RecentActivities
