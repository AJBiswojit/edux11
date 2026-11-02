import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Plus } from 'lucide-react'
import { useAdminCalendar, useCreateAdminCalendarEvent } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Calendar, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'
import { format } from 'date-fns'

const TYPE_META = {
  Deadline: { badge: 'warning', color: '#f59e0b' },
  Event: { badge: 'info', color: '#8b5cf6' },
  Exam: { badge: 'danger', color: '#ef4444' },
  Academic: { badge: 'success', color: '#6366f1' },
  Placement: { badge: 'success', color: '#10b981' },
  Research: { badge: 'secondary', color: '#14b8a6' },
  Finance: { badge: 'warning', color: '#f59e0b' },
}

function AcademicCalendar() {
  const { data, isLoading, isError, refetch } = useAdminCalendar()
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', date: '', type: 'Academic' })
  const createEvent = useCreateAdminCalendarEvent()
  const toast = useToast()
  const events = (data?.events ?? []).filter((e) => filter === 'All' || e.type === filter)

  const byMonth = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      if (!e.date) return
      const key = format(new Date(e.date), 'MMMM yyyy')
      map[key] = map[key] ?? []
      map[key].push(e)
    })
    return Object.entries(map).sort(([a], [b]) => new Date(a) - new Date(b))
  }, [events])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Academic Calendar"
        title="Academic calendar"
        description="The institution-wide calendar — exams, deadlines, events and finance dates."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Academic Calendar' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {['All', 'Exam', 'Deadline', 'Event', 'Academic', 'Placement', 'Research', 'Finance'].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${filter === t ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit p-6">
          <div className="overflow-x-auto scrollbar-thin"><Calendar events={events} className="mx-auto max-w-xs" /></div>
          <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <span key={k} className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.color }} /> {k}
              </span>
            ))}
          </div>
        </Card>

        <div className="min-w-0 space-y-8">
          {byMonth.map(([month, list]) => (
            <div key={month}>
              <p className="mb-3 flex items-center gap-2 text-[14px] font-bold text-slate-900 dark:text-white">
                <CalendarDays className="h-4 w-4 text-indigo-500" /> {month}
                <Badge variant="secondary" size="sm">{list.length} events</Badge>
              </p>
              <div className="space-y-2.5">
                {list.map((e, i) => {
                  const meta = TYPE_META[e.type] ?? TYPE_META.Event
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-md" style={{ background: meta.color }}>
                          <span className="text-[9px] font-bold leading-none">{format(new Date(e.date), 'MMM')}</span>
                          <span className="text-base font-bold leading-tight">{format(new Date(e.date), 'd')}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{e.title}</p>
                          <p className="text-[11.5px] text-slate-400">Scope: {e.scope}</p>
                        </div>
                        <Badge variant={meta.badge}>{e.type}</Badge>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add calendar event</DialogTitle>
            <DialogDescription>Publishes to students, faculty and parent calendars instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Event title" required><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Mid-term results release" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" required><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
              <Field label="Type">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>Academic</option><option>Exam</option><option>Deadline</option><option>Event</option><option>Placement</option><option>Finance</option>
                </select>
              </Field>
            </div>
            <Field label="Audience">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                <option>All</option><option>CSE Sem 5</option><option>Final year</option><option>Faculty only</option>
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createEvent.mutateAsync({ title: form.title, date: form.date, type: form.type })
                setOpen(false)
                setForm({ title: '', date: '', type: 'Academic' })
                toast.success('Event created', 'Saved to the institution calendar.')
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create event.')
              }
            }}>
              <CalendarDays className="h-4 w-4" /> Create event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { AcademicCalendar }
export default AcademicCalendar
