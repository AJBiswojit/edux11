/**
 * MediXO EduX — Faculty Command Center · 6. Pending Tasks.
 * Priority-sorted task list — grading, attendance, papers, reviews,
 * upcoming classes & meetings — all derived.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck2, ClipboardCheck, FileText, GraduationCap, ListChecks, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge } from '@/components/ui'
import { PRIORITY_VARIANT } from '@/constants/ui'

const TYPE_META = {
  assignments: { icon: ClipboardCheck, color: 'text-amber-500' },
  attendance: { icon: CalendarCheck2, color: 'text-indigo-500' },
  papers: { icon: FileText, color: 'text-violet-500' },
  assessment: { icon: GraduationCap, color: 'text-rose-500' },
  class: { icon: Users, color: 'text-emerald-500' },
  meeting: { icon: ListChecks, color: 'text-sky-500' },
}

function PendingTasks({ data }) {
  const tasks = data.derived.dashboard?.pendingTasks ?? []
  return (
    <ChartCard
      title="Pending tasks"
      subtitle="Sorted by priority — everything that needs you today"
      className="h-full"
      actions={<Badge variant="danger" size="sm">{tasks.filter((t) => t.priority === 'Critical').length} critical</Badge>}
    >
      <div className="space-y-2.5">
        {tasks.map((t, i) => {
          const meta = TYPE_META[t.type] ?? { icon: ListChecks, color: 'text-slate-400' }
          return (
            <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={t.link} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-slate-800/40">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/60 ${meta.color}`}>
                  <meta.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{t.title}</p>
                  <p className="truncate text-[10.5px] text-slate-400">{t.detail}</p>
                </div>
                <Badge variant={PRIORITY_VARIANT[t.priority] ?? 'secondary'} size="sm">{t.priority}</Badge>
              </Link>
            </motion.div>
          )
        })}
        {tasks.length === 0 && <p className="py-8 text-center text-xs text-slate-400">All caught up 🎉 — no pending tasks.</p>}
      </div>
    </ChartCard>
  )
}

export { PendingTasks }
export default PendingTasks
