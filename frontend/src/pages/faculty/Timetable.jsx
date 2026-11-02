import { motion } from 'framer-motion'
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { useFacultyTimetable } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card } from '@/components/ui'

const TYPE_STYLES = {
  Lecture: { badge: 'info', color: '#6366f1', bg: 'from-indigo-500/10 to-blue-500/5' },
  Lab: { badge: 'success', color: '#10b981', bg: 'from-emerald-500/10 to-teal-500/5' },
  Office: { badge: 'warning', color: '#f59e0b', bg: 'from-amber-500/10 to-orange-500/5' },
  Meeting: { badge: 'secondary', color: '#8b5cf6', bg: 'from-violet-500/10 to-purple-500/5' },
  Mentoring: { badge: 'info', color: '#14b8a6', bg: 'from-teal-500/10 to-cyan-500/5' },
}

function Timetable() {
  const { data, isLoading, isError, refetch } = useFacultyTimetable()
  const items = data?.items ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const totalSlots = items.reduce((a, d) => a + d.slots.length, 0)

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Timetable"
        title="Weekly timetable"
        description="Your teaching schedule for Term 5 — lectures, labs, office hours and research time."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Timetable' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><CalendarDays className="h-3 w-3" /> {totalSlots} slots / week</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-7">
        {items.map((day, di) => (
          <motion.div key={day.day} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: di * 0.05 }}>
            <Card className="h-full p-3.5">
              <p className={`mb-3 text-center text-[11px] font-bold uppercase tracking-widest ${di === 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400'}`}>
                {day.day.slice(0, 3)}
              </p>
              <div className="space-y-2">
                {day.slots.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-[10px] font-semibold text-slate-300 dark:border-slate-700 dark:text-slate-600">
                    Free
                  </div>
                )}
                {day.slots.map((s, i) => {
                  const meta = TYPE_STYLES[s.type] ?? TYPE_STYLES.Lecture
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 + di * 0.05 + i * 0.03 }}
                      className={`rounded-2xl bg-gradient-to-br p-3 ${meta.bg}`}
                      style={{ boxShadow: `inset 0 0 0 1px ${meta.color}33` }}
                    >
                      <p className="flex items-center gap-1 text-[9.5px] font-bold text-slate-400">
                        <Clock className="h-2.5 w-2.5" /> {s.time}
                      </p>
                      <p className="mt-1 text-[11px] font-bold leading-snug text-slate-800 dark:text-slate-100">{s.course}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[9px] font-medium text-slate-400">
                        <MapPin className="h-2.5 w-2.5" /> {s.room}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <Badge size="sm" variant={meta.badge}>{s.type}</Badge>
                        {s.section !== 'All' && <span className="flex items-center gap-0.5 text-[8.5px] font-bold text-slate-400"><Users className="h-2 w-2" />{s.section}</span>}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export { Timetable }
export default Timetable
