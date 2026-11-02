import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock, ClipboardList, FileText, ShieldAlert, Timer } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, Progress } from '@/components/ui'

const TYPE_META = {
  mock: { icon: Timer, label: 'Mock test', tint: 'text-indigo-500' },
  registration: { icon: FileText, label: 'Registration', tint: 'text-violet-500' },
  admit_card: { icon: ClipboardList, label: 'Admit card', tint: 'text-emerald-500' },
  result: { icon: ShieldAlert, label: 'Result', tint: 'text-amber-500' },
  revision: { icon: CalendarClock, label: 'Revision', tint: 'text-teal-500' },
  exam: { icon: ClipboardList, label: 'Exam', tint: 'text-rose-500' },
  // legacy fallbacks
  assignment: { icon: FileText, label: 'Assignment', tint: 'text-slate-500' },
  quiz: { icon: ClipboardList, label: 'Quiz', tint: 'text-amber-500' },
}

const PRIORITY_BADGE = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'secondary' }

/**
 * Upcoming Mocks & Deadlines.
 * Replaces the university "Upcoming Deadlines" widget.
 * Shows scheduled mock tests, registration cutoffs, admit card dates,
 * result dates and revision checkpoints.
 *
 * Props:
 *   deadlines      — derived.upcomingDeadlines (legacy, used as fallback)
 *   competitiveExams — datasets.competitiveExams (primary source for mock tests)
 */
function UpcomingDeadlines({ deadlines = [], competitiveExams = [] }) {
  const today = new Date().toISOString().slice(0, 10)

  // Build competitive items from scheduled/upcoming competitive exams
  const competitiveItems = competitiveExams
    .filter((e) => e.status !== 'Completed' && e.date >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 6)
    .map((e) => {
      const examDate = new Date(e.date)
      const now = new Date()
      const daysLeft = Math.max(0, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)))
      const family = e.examType?.includes('NEET') ? 'NEET' : e.examType?.includes('JEE') ? 'JEE' : null
      return {
        id: e.id,
        type: 'mock',
        title: e.shortName ?? e.title,
        examFamily: family,
        subject: e.subject,
        daysLeft,
        priority: daysLeft <= 1 ? 'Critical' : daysLeft <= 7 ? 'High' : 'Medium',
        progress: 0,
      }
    })

  // Merge with legacy deadlines, de-duplicating by id, cap at 6
  const legacyItems = deadlines.filter((d) => !competitiveItems.find((c) => c.id === d.id))
  const merged = [...competitiveItems, ...legacyItems].slice(0, 6)
  const visible = merged.length > 0 ? merged : deadlines.slice(0, 6)

  return (
    <ChartCard
      className="h-full"
      title="Upcoming mocks & deadlines"
      subtitle="Mocks · registrations · admit cards · results"
      actions={
        <Link to="/student/exam-agent" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      <div className="space-y-2.5">
        {visible.map((d) => {
          const meta = TYPE_META[d.type] ?? TYPE_META.mock
          const Icon = meta.icon
          return (
            <div
              key={d.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30 dark:hover:bg-indigo-500/5"
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-800 ${meta.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{d.title}</p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {d.priority && (
                      <Badge variant={PRIORITY_BADGE[d.priority] ?? 'secondary'} size="sm">{d.priority}</Badge>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      d.daysLeft <= 1
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                        : d.daysLeft <= 3
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'
                          : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {d.daysLeft === 0 ? 'Today' : `${d.daysLeft}d left`}
                    </span>
                  </div>
                </div>
                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
                  {meta.label}{d.examFamily ? ` · ${d.examFamily}` : d.subject ? ` · ${d.subject}` : ''}
                </p>
                {d.progress > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={d.progress} className="h-1.5 flex-1" />
                    <span className="text-[10px] font-bold text-slate-400">{d.progress}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No upcoming deadlines</p>
            <p className="mt-1 text-xs text-slate-400">Mock tests and registration cutoffs appear here.</p>
          </div>
        )}
      </div>

      <Button asChild variant="ghost" size="sm" className="mt-3 w-full">
        <Link to="/student/exam-agent">Open exam workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
      </Button>
    </ChartCard>
  )
}

export { UpcomingDeadlines }
export default UpcomingDeadlines
