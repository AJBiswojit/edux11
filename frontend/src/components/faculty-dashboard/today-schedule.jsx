/**
 * MediXO EduX — Faculty Command Center · 3. Today's Teaching Schedule.
 * Today's classes with attendance & teaching status and quick actions —
 * derived from the teaching schedule + attendance records.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarCheck2, Clock, MapPin, PlayCircle } from 'lucide-react'
/* Hidden with the Teaching workspace links
import { ArrowRight } from 'lucide-react'
*/
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, useToast } from '@/components/ui'

const STATUS_STYLE = {
  Done: { badge: 'success', label: 'Completed' },
  'In progress': { badge: 'warning', label: 'In progress' },
  Upcoming: { badge: 'info', label: 'Upcoming' },
  Lecture: { badge: 'secondary', label: 'Lecture' },
  Lab: { badge: 'secondary', label: 'Lab' },
  Office: { badge: 'secondary', label: 'Office hours' },
  Meeting: { badge: 'secondary', label: 'Meeting' },
  Mentoring: { badge: 'secondary', label: 'Mentoring' },
}

function TodaySchedule({ data }) {
  const slots = data.derived.dashboard?.todaySchedule ?? []
  const toast = useToast()

  return (
    <ChartCard
      title="Today's teaching schedule"
      subtitle="Derived from your weekly timetable & attendance records"
      className="h-full"
      actions={
        /* Teaching workspace page is commented out
        <Button asChild variant="ghost" size="sm">
          <Link to="/faculty/teaching">Teaching workspace <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
        */
        null
      }
    >
      <div className="space-y-3">
        {slots.map((s, i) => {
          const st = STATUS_STYLE[s.teachingStatus] ?? { badge: 'secondary', label: s.teachingStatus }
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-indigo-50 px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{s.time}</span>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{s.course}</p>
                    <p className="text-[10.5px] text-slate-400">{s.subject} · {s.section}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant={s.attendanceStatus === 'Marked' ? 'success' : 'warning'} size="sm">
                    <CalendarCheck2 className="mr-1 h-3 w-3" /> {s.attendanceStatus}
                  </Badge>
                  <Badge variant={st.badge} size="sm">{st.label}</Badge>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-medium text-slate-400">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {s.room}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration} · {s.type}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => toast.success('Class started 🎬', `${s.course} (${s.section}) session marked as started.`)}>
                  <PlayCircle className="h-3.5 w-3.5" /> Start class
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/faculty/attendance"><CalendarCheck2 className="h-3.5 w-3.5" /> Open attendance</Link>
                </Button>
                {/* Teaching workspace page is commented out
                <Button asChild size="sm" variant="ghost">
                  <Link to="/faculty/teaching">Teaching workspace</Link>
                </Button>
                */}
              </div>
            </motion.div>
          )
        })}
        {slots.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
            <Clock className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700 dark:text-slate-200">No classes scheduled today</p>
            <p className="mt-1 text-xs text-slate-400">Enjoy the breather — or plan tomorrow's lectures.</p>
          </div>
        )}
      </div>
    </ChartCard>
  )
}

export { TodaySchedule }
export default TodaySchedule
