import { useState } from 'react'
import { motion } from 'framer-motion'
import { format, isSameDay, isSameMonth } from 'date-fns'
import { AlarmClock, CalendarDays, ClipboardList, FlaskConical, GraduationCap, Trophy } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, Calendar } from '@/components/ui'
import { cn } from '@/utils/cn'

const TYPE_META = {
  class: { label: 'Lecture', icon: GraduationCap, color: '#6366f1', bg: 'from-indigo-500/10 to-blue-500/10', ring: 'ring-indigo-500/20' },
  lab: { label: 'Lab', icon: FlaskConical, color: '#14b8a6', bg: 'from-teal-500/10 to-emerald-500/10', ring: 'ring-teal-500/20' },
  deadline: { label: 'Deadline', icon: AlarmClock, color: '#f59e0b', bg: 'from-amber-500/10 to-orange-500/10', ring: 'ring-amber-500/20' },
  exam: { label: 'Exam', icon: ClipboardList, color: '#ef4444', bg: 'from-rose-500/10 to-red-500/10', ring: 'ring-rose-500/20' },
  event: { label: 'Event', icon: Trophy, color: '#8b5cf6', bg: 'from-violet-500/10 to-purple-500/10', ring: 'ring-violet-500/20' },
}

function CalendarPage() {
  /* Phase 27.3: calendar events come from the Student Intelligence Foundation (was /student/events) —
     derived from the exam, assignment and project datasets plus the operational event catalogue. */
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const [selected, setSelected] = useState(new Date())
  const events = intel?.derived?.university?.calendarEvents ?? []

  const selectedEvents = events.filter((e) => isSameDay(new Date(e.date), selected))
  const monthEvents = events.filter((e) => isSameMonth(new Date(e.date), selected))

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Overview · Calendar"
        title="Academic calendar"
        description="Classes, deadlines, exams and events — synced with your planner automatically."
        breadcrumbs={[{ label: 'Student' }, { label: 'Calendar' }]}
        actions={<Badge variant="secondary"><CalendarDays className="h-3 w-3" /> {monthEvents.length} events this month</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Calendar card */}
        <Card className="min-w-0 p-6">
          <Calendar
            selected={selected}
            onSelect={(d) => d && setSelected(d)}
            events={monthEvents}
            className="mx-auto max-w-md"
          />
          <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} /> {v.label}
              </span>
            ))}
          </div>
        </Card>

        {/* Selected day events */}
        <Card className="min-w-0 p-6">
          <p className="text-[15px] font-bold text-slate-900 dark:text-white">{format(selected, 'EEEE, MMMM d, yyyy')}</p>
          <p className="mt-0.5 text-xs text-slate-400">{selectedEvents.length} events scheduled</p>
          <div className="mt-5 space-y-3">
            {selectedEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400 dark:border-slate-700">
                Nothing scheduled — a good day to study a weak topic! 🎯
              </div>
            )}
            {selectedEvents.map((e, i) => {
              const meta = TYPE_META[e.type] ?? TYPE_META.event
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={cn('flex items-start gap-3.5 rounded-2xl bg-gradient-to-br p-4 ring-1', meta.bg, meta.ring)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md" style={{ background: meta.color }}>
                    <meta.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{e.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                      {format(new Date(e.date), 'hh:mm a')}
                      {e.end ? ` – ${format(new Date(e.end), 'hh:mm a')}` : ''}
                      {e.subject ? ` · ${e.subject}` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" size="sm">{meta.label}</Badge>
                </motion.div>
              )
            })}
          </div>

          {/* upcoming mini list */}
          <p className="mt-7 text-[11px] font-bold uppercase tracking-widest text-slate-400">Coming up</p>
          <div className="mt-3 space-y-2">
            {events
              .filter((e) => new Date(e.date) >= new Date() && !isSameDay(new Date(e.date), selected))
              .slice(0, 4)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-16 shrink-0 font-bold text-indigo-600 dark:text-indigo-300">{format(new Date(e.date), 'MMM d')}</span>
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
