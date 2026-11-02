import { motion } from 'framer-motion'
import { BookOpen, Flame, Target, Timer, TrendingUp, Zap } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge } from '@/components/ui'

const PALETTE = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9']

/**
 * Study Stats Widget.
 * Replaces the university "Today's Schedule" slot.
 * Reads from datasets.studyStatistics which exists in the intelligence snapshot:
 *   { weeklyHours, avgFocus, streakDays, hoursBySubject, weeklyActivity }
 *
 * Shows: streak · weekly hours · avg focus · per-subject hours bar
 */
function TodayStudyPlan({ datasets }) {
  const stats = datasets.studyStatistics ?? {}
  const weeklyHours = stats.weeklyHours ?? 0
  const avgFocus = stats.avgFocus ?? 0
  const streak = stats.streakDays ?? 0
  const hoursBySubject = stats.hoursBySubject ?? []
  const weeklyActivity = stats.weeklyActivity ?? []

  // Top 5 days of activity for the mini bar chart
  const activityDays = weeklyActivity.slice(-7)
  const maxHours = activityDays.length ? Math.max(...activityDays.map((d) => d.hours ?? 0), 1) : 1

  const statTiles = [
    { icon: Flame, label: 'Streak', value: `${streak}d`, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { icon: Timer, label: 'This week', value: `${weeklyHours}h`, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { icon: Target, label: 'Avg focus', value: `${avgFocus}%`, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ]

  return (
    <ChartCard
      title="Study statistics"
      subtitle="Streak · hours · focus this week"
      className="h-full"
      actions={
        streak >= 7
          ? <Badge variant="success" size="sm"><Flame className="mr-1 h-3 w-3" />{streak}d streak</Badge>
          : <Badge variant="secondary" size="sm">{weeklyHours}h this week</Badge>
      }
      contentClassName="pt-3"
    >
      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        {statTiles.map((t) => (
          <div key={t.label} className={`flex flex-col items-center rounded-2xl px-3 py-3 ${t.bg}`}>
            <t.icon className={`h-4 w-4 ${t.color}`} />
            <p className={`mt-1.5 text-lg font-bold ${t.color}`}>{t.value}</p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly activity mini-bars */}
      {activityDays.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily study hours</p>
          <div className="flex items-end gap-1.5 h-14">
            {activityDays.map((d, i) => {
              const pct = Math.round(((d.hours ?? 0) / maxHours) * 100)
              return (
                <div key={d.day ?? i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t-md overflow-hidden bg-slate-100 dark:bg-slate-800" style={{ height: '40px' }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${pct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 }}
                      className="w-full rounded-t-md"
                      style={{ background: PALETTE[i % PALETTE.length] + 'cc' }}
                    />
                  </div>
                  <p className="text-[9px] font-medium text-slate-400">{d.day?.slice(0, 1) ?? ''}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hours by subject */}
      {hoursBySubject.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hours by subject</p>
          {hoursBySubject.slice(0, 4).map((s, i) => {
            const color = PALETTE[i % PALETTE.length]
            const maxH = Math.max(...hoursBySubject.map((x) => x.hours ?? 0), 1)
            const pct = Math.round(((s.hours ?? 0) / maxH) * 100)
            return (
              <div key={s.subject ?? i}>
                <div className="flex justify-between">
                  <p className="truncate text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">{s.subject}</p>
                  <p className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color }}>{s.hours}h</p>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + i * 0.06 }}
                    className="h-full rounded-full"
                    style={{ background: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {weeklyHours === 0 && hoursBySubject.length === 0 && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center dark:border-slate-800">
          <BookOpen className="h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">No study sessions recorded yet</p>
        </div>
      )}
    </ChartCard>
  )
}

export { TodayStudyPlan }
export default TodayStudyPlan
