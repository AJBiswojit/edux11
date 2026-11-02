import { useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { AlarmClock, CalendarDays, ClipboardList, GraduationCap, HandCoins, Megaphone, Trophy } from 'lucide-react'
import { useParentEvents } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, Calendar } from '@/components/ui'

const TYPE_META = {
  deadline: { label: 'Deadline', icon: AlarmClock, color: '#f59e0b' },
  exam: { label: 'Exam', icon: ClipboardList, color: '#ef4444' },
  meeting: { label: 'Meeting', icon: GraduationCap, color: '#6366f1' },
  fee: { label: 'Fee', icon: HandCoins, color: '#10b981' },
  event: { label: 'Event', icon: Trophy, color: '#8b5cf6' },
  report: { label: 'Report', icon: Megaphone, color: '#14b8a6' },
}

function CalendarPage() {
  const { data, isLoading, isError, refetch } = useParentEvents()
  const [selected, setSelected] = useState(new Date())
  const events = data?.items ?? []
  const selectedEvents = events.filter((e) => isSameDay(new Date(e.date), selected))

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Calendar"
        title="Family calendar"
        description="Exams, deadlines, fees and meetings — everything a parent needs to know, in one view."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Calendar' }]}
        actions={<Badge variant="secondary"><CalendarDays className="h-3 w-3" /> {events.length} events this month</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-6">
          <Calendar selected={selected} onSelect={(d) => d && setSelected(d)} events={events} className="mx-auto max-w-md" />
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} /> {v.label}
              </span>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{format(selected, 'EEEE, MMMM d, yyyy')}</p>
          <p className="mt-0.5 text-xs text-slate-400">{selectedEvents.length} events</p>
          <div className="mt-5 space-y-3">
            {selectedEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
                Nothing scheduled for this day 🎈
              </div>
            )}
            {selectedEvents.map((e, i) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.event
              return (
                <div key={e.id} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md" style={{ background: meta.color }}>
                    <meta.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                    <p className="text-[11px] text-slate-400">{e.subject}</p>
                  </div>
                  <Badge variant="secondary" size="sm">{meta.label}</Badge>
                </div>
              )
            })}
          </div>

          <p className="mt-7 text-[11px] font-bold uppercase tracking-widest text-slate-400">Coming up</p>
          <div className="mt-3 space-y-2">
            {events
              .filter((e) => new Date(e.date) >= new Date() && !isSameDay(new Date(e.date), selected))
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(0, 5)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-20 shrink-0 font-bold text-indigo-600 dark:text-indigo-300">{format(new Date(e.date), 'MMM d')}</span>
                  <span className="truncate font-medium text-slate-600 dark:text-slate-300">{e.title}</span>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export { CalendarPage }
export default CalendarPage
