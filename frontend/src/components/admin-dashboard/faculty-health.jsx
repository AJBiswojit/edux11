/**
 * MediXO EduX — Institution Command Center · Section 7: Faculty Health
 * (compact institutional roll-up — NOT the faculty dashboard).
 */

import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, GraduationCap, HeartPulse } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Badge, Button } from '@/components/ui'

function FacultyHealth({ data }) {
  const faculty = data.derived.faculty ?? {}
  const health = faculty.health ?? {}
  const byDept = faculty.byDept ?? []

  return (
    <ChartCard
      title="Faculty health"
      subtitle="Institution-level roll-up"
      className="h-full"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/faculty">Faculty intelligence <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      }
    >
      <div className="flex items-center gap-5">
        <ProgressRing value={health.score ?? 0} size={110} stroke={10} color="#f59e0b" label={`${health.score ?? '—'}`} sublabel="health" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700 dark:text-slate-200">
            <GraduationCap className="h-4 w-4 text-amber-500" /> {faculty.totals ?? '—'} faculty
          </div>
          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
            <HeartPulse className="h-3.5 w-3.5 text-rose-400" /> Teaching satisfaction {health.teachingSatisfaction ?? '—'}/100
          </div>
          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
            <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> {health.publicationsPerFaculty ?? '—'} publications / faculty
          </div>
          <div className="flex items-center gap-1.5">
            {(health.factors ?? []).slice(0, 3).map((f) => (
              <span key={f.label} className="rounded-full bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400" title={f.label}>
                {f.label.split(' ')[0]} {f.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-400">Department faculty distribution</p>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {(byDept ?? []).map((d, i) => (
          <span
            key={d.code}
            className="h-full"
            style={{ width: `${(d.count / Math.max(faculty.rosterCount ?? 1, 1)) * 100}%`, background: ['#6366f1', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#0ea5e9'][i % 8] }}
            title={`${d.code} · ${d.count}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {(byDept ?? []).map((d) => (
          <span key={d.code} className="text-[9.5px] font-semibold text-slate-400">{d.code} {d.count}</span>
        ))}
      </div>
      <Badge variant="outline" size="sm" className="mt-3">Sample roster · {faculty.rosterCount ?? '—'} of {faculty.totals ?? '—'} faculty</Badge>
    </ChartCard>
  )
}

export { FacultyHealth }
export default FacultyHealth
