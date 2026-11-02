/**
 * Institution Intelligence Workspace · Tab 6: Attendance & Engagement.
 * Merges the former Attendance Analytics + Assignment engagement content.
 */

import { AlertTriangle, CalendarCheck2, TrendingUp, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, LineTrend } from '@/components/charts'
import { Badge } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { KpiStrip, WorkspaceSection } from './shared'

function AttendanceTab({ data }) {
  const d = data.derived
  const attendance = d.attendance ?? {}
  const assignments = d.assessments?.assignments ?? {}

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Overall attendance', value: `${attendance.overall ?? '—'}%`, sub: 'institution-wide' },
          { label: 'Best department', value: `${attendance.best?.dept ?? '—'} ${attendance.best?.pct ?? '—'}%`, sub: 'highest average' },
          { label: 'Needs attention', value: `${attendance.worst?.dept ?? '—'} ${attendance.worst?.pct ?? '—'}%`, sub: 'lowest average' },
          { label: 'Below threshold (75%)', value: String(attendance.belowThresholdCount ?? 0), sub: 'students flagged' },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Monthly attendance trend" subtitle="All departments" className="min-w-0">
          <AreaTrend
            data={(attendance.trend ?? []).map((t) => ({ label: t.month, value: t.pct }))}
            xKey="label"
            height={210}
            series={[{ key: 'value', name: 'Attendance %', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Weekly attendance" subtitle="Last 8 weeks" className="min-w-0">
          <LineTrend
            data={(attendance.weekly ?? []).map((w) => ({ label: w.week, value: w.pct }))}
            xKey="label"
            height={210}
            series={[{ key: 'value', name: 'Attendance %', color: '#14b8a6' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Attendance by department" subtitle="Current term average" className="min-w-0">
          <BarCompare
            data={(attendance.byDept ?? []).map((x) => ({ label: x.dept, pct: x.pct }))}
            xKey="label"
            height={210}
            series={[{ key: 'pct', name: 'Attendance %', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      <WorkspaceSection title="Low attendance students" subtitle="Below the 75% floor">
        {(attendance.belowThreshold ?? []).length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(attendance.belowThreshold ?? []).map((s) => (
              <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-rose-100 p-3.5 dark:border-rose-500/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[10.5px] text-slate-400">{s.roll} · {s.dept} · {s.classesMissed} missed</p>
                </div>
                <span className="text-sm font-bold text-rose-500">{s.attendance}%</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact title="No students below threshold" description="All cohorts are above the 75% floor." />
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Assignment engagement" subtitle="Submission behaviour by department">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Submission rate by department" className="min-w-0">
            <BarCompare
              data={(assignments.byDept ?? []).map((x) => ({ label: x.dept, submitted: x.submitted }))}
              xKey="label"
              height={210}
              series={[{ key: 'submitted', name: 'Submission %', color: '#8b5cf6' }]}
              formatter={(v) => `${v}%`}
            />
          </ChartCard>
          <ChartCard title="Engagement summary" subtitle="Institution-level">
            <div className="space-y-3">
              {[
                { label: 'Assignment submission', value: `${assignments.submissionRate ?? '—'}%`, icon: TrendingUp, tone: 'text-emerald-500' },
                { label: 'On-time rate', value: `${assignments.onTimeRate ?? '—'}%`, icon: CalendarCheck2, tone: 'text-indigo-500' },
                { label: 'AI-graded share', value: `${assignments.aiGradedShare ?? '—'}%`, icon: Users, tone: 'text-violet-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                  <s.icon className={`h-4 w-4 ${s.tone}`} />
                  <span className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">{s.label}</span>
                  <span className="ml-auto font-bold text-slate-800 dark:text-slate-100">{s.value}</span>
                </div>
              ))}
              <Badge variant="outline" size="sm">Plagiarism flags {assignments.plagiarism?.total ?? '—'} · {assignments.plagiarism?.resolved ?? '—'} resolved</Badge>
            </div>
          </ChartCard>
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { AttendanceTab }
export default AttendanceTab
