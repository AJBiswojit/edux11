import { motion } from 'framer-motion'
import { Award, Briefcase, CalendarCheck2, ClipboardList, FolderKanban, GraduationCap, HeartPulse, Sparkles } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge } from '@/components/ui'
import { formatDate } from '@/utils/format'

const TYPE_STYLES = {
  milestone: { dot: 'bg-gradient-to-br from-indigo-500 to-blue-500', icon: GraduationCap, badge: 'info', label: 'Milestone' },
  achievement: { dot: 'bg-gradient-to-br from-emerald-500 to-teal-500', icon: Award, badge: 'success', label: 'Achievement' },
  project: { dot: 'bg-gradient-to-br from-violet-500 to-purple-500', icon: FolderKanban, badge: 'info', label: 'Project' },
  certification: { dot: 'bg-gradient-to-br from-amber-500 to-orange-500', icon: Award, badge: 'warning', label: 'Certification' },
  exam: { dot: 'bg-gradient-to-br from-rose-500 to-red-500', icon: ClipboardList, badge: 'danger', label: 'Exam' },
  deadline: { dot: 'bg-gradient-to-br from-amber-500 to-orange-500', icon: CalendarCheck2, badge: 'warning', label: 'Deadline' },
  grade: { dot: 'bg-gradient-to-br from-emerald-500 to-teal-500', icon: ClipboardList, badge: 'success', label: 'Grade' },
  alert: { dot: 'bg-gradient-to-br from-rose-500 to-red-500', icon: Sparkles, badge: 'danger', label: 'Alert' },
  ai: { dot: 'bg-gradient-to-br from-teal-500 to-emerald-500', icon: HeartPulse, badge: 'gradient', label: 'AI' },
  career: { dot: 'bg-gradient-to-br from-amber-500 to-orange-500', icon: Briefcase, badge: 'warning', label: 'Career' },
}

/**
 * Academic Journey / Preparation Journey — premium vertical timeline assembled
 * from the intelligence foundation. Accepts optional title/subtitle overrides
 * so it can be reused as "Preparation journey" on the competitive dashboard.
 */
function AcademicJourney({
  events = [],
  title = 'Academic journey',
  subtitle = 'Your progress through the semester',
}) {
  const visible = events.slice(0, 9)

  return (
    <ChartCard
      className="h-full"
      title={title}
      subtitle={subtitle}
      actions={<Badge variant="gradient" size="sm"><Sparkles className="h-3 w-3" /> {visible.length} milestones</Badge>}
      contentClassName="pt-2"
    >
      <ol className="relative ml-3 space-y-5 border-l-2 border-slate-100 pl-7 dark:border-slate-800">
        {visible.map((e, i) => {
          const style = TYPE_STYLES[e.type] ?? TYPE_STYLES.milestone
          const Icon = style.icon
          return (
            <motion.li key={e.id ?? i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative">
              <span className={`absolute -left-[35px] top-1 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-slate-900 ${style.dot}`}>
                <Icon className="h-3 w-3 text-white" />
              </span>
              <div className="rounded-2xl border border-slate-100 px-4 py-3.5 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={style.badge} size="sm">{style.label}</Badge>
                    <span className="text-[10.5px] font-medium text-slate-400">{formatDate(e.date, 'MMM d, yyyy')}</span>
                  </div>
                </div>
                {e.detail && <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">{e.detail}</p>}
              </div>
            </motion.li>
          )
        })}
      </ol>
    </ChartCard>
  )
}

export { AcademicJourney }
export default AcademicJourney
