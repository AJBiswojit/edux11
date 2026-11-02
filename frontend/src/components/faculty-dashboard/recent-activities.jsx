/**
 * MediXO EduX — Faculty Command Center · 9. Recent Activities.
 * Attendance submitted · assignments reviewed · papers generated ·
 * assessments published · announcements sent · resources uploaded.
 */

import { CalendarCheck2, CheckCircle2, FileCheck2, FileText, Megaphone, Presentation, Repeat, Zap } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge } from '@/components/ui'
import { formatRelative } from '@/utils/format'

const ACTIVITY_ICON = {
  'calendar-check': { Icon: CalendarCheck2, cls: 'from-emerald-500 to-teal-500' },
  'check-circle': { Icon: CheckCircle2, cls: 'from-emerald-500 to-teal-500' },
  'file-check': { Icon: FileCheck2, cls: 'from-sky-500 to-cyan-500' },
  zap: { Icon: Zap, cls: 'from-fuchsia-500 to-pink-500' },
  megaphone: { Icon: Megaphone, cls: 'from-slate-500 to-slate-600' },
  repeat: { Icon: Repeat, cls: 'from-amber-500 to-orange-500' },
  presentation: { Icon: Presentation, cls: 'from-indigo-500 to-blue-500' },
  clipboard: { Icon: FileText, cls: 'from-rose-500 to-red-500' },
  'file-text': { Icon: FileText, cls: 'from-violet-500 to-purple-500' },
}

function RecentActivities({ data }) {
  const activities = data.derived.dashboard?.recentActivities ?? []
  return (
    <ChartCard
      title="Recent activities"
      subtitle="Your latest actions across teaching & assessments"
      className="h-full"
      actions={<Badge variant="secondary" size="sm">{activities.length} latest</Badge>}
    >
      <div className="grid grid-cols-1 gap-1 md:grid-cols-2 md:gap-x-4">
        {activities.map((a) => {
          const meta = ACTIVITY_ICON[a.icon] ?? { Icon: FileText, cls: 'from-slate-500 to-slate-600' }
          return (
            <div key={a.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.cls} text-white shadow-md`}>
                <meta.Icon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-slate-700 dark:text-slate-200">{a.title}</p>
                <p className="truncate text-[10.5px] text-slate-400">{a.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <Badge variant="outline" size="sm">{a.label}</Badge>
                <p className="mt-0.5 text-[9.5px] font-semibold text-slate-400">{formatRelative(a.date)}</p>
              </div>
            </div>
          )
        })}
        {activities.length === 0 && <p className="py-8 text-center text-xs text-slate-400">No recent activity.</p>}
      </div>
    </ChartCard>
  )
}

export { RecentActivities }
export default RecentActivities
