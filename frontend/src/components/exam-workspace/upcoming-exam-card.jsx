/**
 * Examination Intelligence Workspace — Upcoming Examination card.
 * Enhanced card: countdown, priority, add-to-calendar + view details.
 */

import { Building2, CalendarDays, ClipboardList, Clock, MapPin, UserRound } from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { formatDate } from '@/utils/format'

const PRIORITY_BADGE = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'secondary' }

function daysLeft(dateStr) {
  const diff = new Date(dateStr) - new Date()
  return Math.ceil(diff / 86400000)
}

function UpcomingExamCard({ exam, onViewDetails, onAddToPlanner, onAddToCalendar }) {
  const dl = daysLeft(exam.date)
  const countdown = dl <= 0 ? 'Today' : dl === 1 ? 'Tomorrow' : `${dl} days`

  return (
    <Card className="group h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-stretch">
        {/* date block */}
        <div className="flex w-20 shrink-0 flex-col items-center justify-center bg-gradient-to-b from-indigo-600 to-blue-600 py-4 text-white sm:w-24">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">{formatDate(exam.date, 'MMM')}</p>
          <p className="font-display text-3xl font-bold">{formatDate(exam.date, 'd')}</p>
          <p className="text-[10px] font-semibold text-white/70">{formatDate(exam.date, 'EEE')}</p>
        </div>

        <div className="min-w-0 flex-1 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{exam.title}</h3>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={exam.status === 'Upcoming' ? 'info' : 'secondary'} size="sm">{exam.status}</Badge>
              {exam.priority && <Badge variant={PRIORITY_BADGE[exam.priority] ?? 'secondary'} size="sm">{exam.priority}</Badge>}
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] font-medium text-slate-400">
            <span className="flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> {exam.course ?? exam.subject}</span>
            <span className="flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {exam.faculty ?? 'Test Series'}</span>
            {exam.department && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {exam.department}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {formatDate(exam.date, 'h:mm a')} · {exam.duration}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {exam.venue ?? exam.mode}{exam.room ? ` · ${exam.room}` : ''}</span>
          </div>

          {/* countdown strip */}
          <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold ${dl <= 1 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' : dl <= 4 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
            <CalendarDays className="h-3 w-3" /> {countdown} to go
          </div>

          {(exam.pattern || exam.difficulty || exam.negativeMarking) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {exam.pattern && <Badge variant="secondary" size="sm">{exam.pattern}</Badge>}
              {exam.difficulty && <Badge variant={exam.difficulty === 'Easy' ? 'success' : exam.difficulty === 'Medium' ? 'warning' : 'danger'} size="sm">{exam.difficulty}</Badge>}
              {exam.negativeMarking && <Badge variant="outline" size="sm">{exam.negativeMarking}</Badge>}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={onViewDetails}>
              <ClipboardList className="h-3.5 w-3.5" /> View details
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={onAddToCalendar}>
              <CalendarDays className="h-3.5 w-3.5" /> Add to calendar
            </Button>
            <Button size="sm" className="flex-1" onClick={onAddToPlanner}>
              <Clock className="h-3.5 w-3.5" /> {exam.inPlanner ? 'In planner ✓' : 'Add to planner'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

export { UpcomingExamCard }
export default UpcomingExamCard
