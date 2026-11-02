/**
 * Institution Intelligence Workspace · Tab 2: Student Intelligence.
 * Institution-level student analytics with a department filter.
 */

import { useState } from 'react'
import { AlertTriangle, Award } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { Badge, Select, SelectItem } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { KpiStrip, WorkspaceSection } from './shared'

function StudentTab({ data }) {
  const d = data.derived
  const students = d.students ?? {}
  const [dept, setDept] = useState('All')

  const depts = ['All', ...new Set((students.attendanceRisk ?? []).map((s) => s.dept))]
  const attendanceRisk = (students.attendanceRisk ?? []).filter((s) => dept === 'All' || s.dept === dept)
  const highPerformers = (students.highPerformers ?? []).filter((s) => dept === 'All' || s.dept === dept)

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Total students', value: (d.totals?.students ?? 0).toLocaleString('en-IN'), sub: 'institution-wide' },
          { label: 'At-risk', value: students.totals?.activeRisk ?? '—', sub: `${students.riskSummary?.latestRate ?? '—'}% · improving` },
          { label: 'Recovered', value: students.totals?.improvingStudents ?? '—', sub: `${students.totals?.recoveryRate ?? '—'}% recovery rate` },
          { label: 'Avg CGPA', value: (students.cgpaAvg ?? '—').toFixed ? students.cgpaAvg?.toFixed(2) ?? '—' : students.cgpaAvg ?? '—', sub: `retention ${students.retention ?? '—'}%` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Performance distribution" subtitle="Grade share across assessments">
          <BarCompare
            data={(students.distribution ?? []).map((g) => ({ label: g.grade, pct: g.pct }))}
            xKey="label"
            height={230}
            series={[{ key: 'pct', name: '% of grades', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="success" size="sm">A+ · {students.distributionSummary?.topBand ?? '—'}%</Badge>
            <Badge variant="danger" size="sm">D/F · {students.distributionSummary?.bottomBand ?? '—'}%</Badge>
          </div>
        </ChartCard>

        <ChartCard title="At-risk trend" subtitle="Institution roll-up">
          <AreaTrend
            data={(students.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk }))}
            xKey="label"
            height={230}
            series={[{ key: 'value', name: 'At-risk %', color: '#f43f5e' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Exam readiness" subtitle="Academic improvement signals">
          <DonutChart
            data={[
              { name: 'Healthy (≥90)', value: 58, color: '#10b981' },
              { name: 'Watch (75–89)', value: 27, color: '#f59e0b' },
              { name: 'Risk (<75)', value: 15, color: '#ef4444' },
            ]}
            height={230}
            centerLabel="58%"
            centerSub="healthy"
          />
        </ChartCard>
      </div>

      <WorkspaceSection
        title="Attendance risk"
        subtitle="Students below the 75% attendance floor"
        actions={
          <Select value={dept} onValueChange={setDept} className="w-44">
            {depts.map((x) => <SelectItem key={x} value={x}>{x === 'All' ? 'All departments' : x}</SelectItem>)}
          </Select>
        }
      >
        {attendanceRisk.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attendanceRisk.map((s) => (
              <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-rose-100 p-3.5 dark:border-rose-500/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-500 dark:bg-rose-500/10">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[10.5px] text-slate-400">{s.roll} · {s.dept} · {s.classesMissed} missed</p>
                </div>
                <span className={`text-sm font-bold ${s.attendance < 75 ? 'text-rose-500' : 'text-amber-500'}`}>{s.attendance}%</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact title="No attendance risk" description="All students are above the 75% floor for this filter." />
        )}
      </WorkspaceSection>

      <WorkspaceSection title="High performers" subtitle="Class leaders across the institution">
        {highPerformers.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {highPerformers.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white ${i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' : i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500' : 'bg-gradient-to-br from-amber-700 to-amber-800'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[10.5px] text-slate-400">{s.dept}</p>
                </div>
                <Badge variant="success"><Award className="mr-1 h-3 w-3" />{s.cgpa}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState compact title="No performers for this filter" description="Results appear once assessments are graded." />
        )}
      </WorkspaceSection>
    </div>
  )
}

export { StudentTab }
export default StudentTab
