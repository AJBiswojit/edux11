/**
 * Institution Intelligence Workspace · Tab 1: Overview.
 * The analytical entry point (deeper than the Dashboard's executive view):
 * health pillars, department comparison, student risk summary and trends.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { AreaTrend, LineTrend } from '@/components/charts'
import { Badge, Button } from '@/components/ui'
import { KpiStrip, WorkspaceSection } from './shared'

const PILLAR_COLORS = {
  'Academic health': '#6366f1', 'Student success': '#10b981',
  'Attendance health': '#14b8a6', 'Assessment health': '#f43f5e',
  'Faculty health': '#f59e0b', 'Outcomes': '#8b5cf6',
}
const GRADE_VARIANT = { Excellent: 'success', Good: 'info', 'At Risk': 'warning', Critical: 'danger' }

function WorkspaceOverviewTab({ data }) {
  const d = data.derived
  const health = d.institutionHealth ?? {}
  const students = d.students ?? {}
  const departments = d.departments ?? {}
  const attendance = d.attendance ?? {}
  const report = d.reports?.institution ?? {}

  return (
    <div>
      {/* KPIs */}
      <KpiStrip
        cols={4}
        items={[
          { label: 'Institution health', value: `${health.score ?? '—'}/100`, sub: health.grade ?? '—' },
          { label: 'Students', value: (d.totals?.students ?? 0).toLocaleString('en-IN'), sub: `${d.totals?.departments ?? '—'} departments` },
          { label: 'At-risk rate', value: `${students.riskSummary?.latestRate ?? '—'}%`, sub: `${students.riskSummary?.trendReduction ?? 0}% reduction this term` },
          { label: 'Faculty', value: (d.totals?.faculty ?? 0).toLocaleString('en-IN'), sub: `health ${d.faculty?.health?.score ?? '—'}/100` },
        ]}
      />

      {/* Pillars + department comparison */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Health pillars" subtitle="Six-pillar weighted institution score" className="min-w-0">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <ProgressRing value={health.score ?? 0} size={120} stroke={11} color="#6366f1" label={`${health.score ?? '—'}`} sublabel="overall" />
            <div className="w-full flex-1 space-y-2.5">
              {(health.pillars ?? []).map((p) => (
                <div key={p.label}>
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">{p.label}</span>
                    <span className="text-slate-800 dark:text-slate-100">{p.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: PILLAR_COLORS[p.label] ?? '#6366f1' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="Department comparison"
          subtitle="Health · pass rate · attendance · placement"
          className="min-w-0"
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/institution-intelligence?tab=departments">Full drill-down <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          }
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-2 text-left">Dept</th>
                  <th className="py-2 pr-2 text-center">Health</th>
                  <th className="py-2 pr-2 text-center">Pass</th>
                  <th className="py-2 pr-2 text-center">Att.</th>
                  <th className="py-2 text-right">Placement</th>
                </tr>
              </thead>
              <tbody>
                {(departments.list ?? []).map((dp) => (
                  <tr key={dp.code} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                    <td className="py-2 pr-2">
                      <span className="font-bold text-slate-800 dark:text-slate-100">{dp.code}</span>
                      <Badge variant={GRADE_VARIANT[dp.grade] ?? 'secondary'} size="sm" className="ml-1.5">{dp.grade}</Badge>
                    </td>
                    <td className="py-2 pr-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{dp.score}</td>
                    <td className="py-2 pr-2 text-center text-slate-600 dark:text-slate-300">{dp.passRate}%</td>
                    <td className="py-2 pr-2 text-center text-slate-600 dark:text-slate-300">{dp.attendance}%</td>
                    <td className="py-2 text-right text-slate-600 dark:text-slate-300">{dp.placement}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>

      {/* Student risk summary + trends */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Student risk summary" subtitle="Institution roll-up">
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: 'Active risk', value: students.totals?.activeRisk ?? '—', tone: 'text-rose-500' },
              { label: 'Flagged', value: students.totals?.flagged ?? '—', tone: 'text-amber-500' },
              { label: 'Recovered', value: students.totals?.improvingStudents ?? '—', tone: 'text-emerald-500' },
              { label: 'Recovery rate', value: `${students.totals?.recoveryRate ?? '—'}%`, tone: 'text-indigo-500' },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                <p className={`font-display text-xl font-bold ${s.tone}`}>{s.value}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-rose-50/70 p-3 dark:bg-rose-500/5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {students.totals?.activeRisk ?? '—'} students estimated at risk ({students.riskSummary?.latestRate ?? '—'}%) — trend {students.riskSummary?.trendDelta ?? 0} pts since {students.riskTrend?.[0]?.month ?? 'start'}.
            </p>
          </div>
        </ChartCard>

        <ChartCard title="At-risk trend" subtitle="Monthly · institution roll-up" className="min-w-0">
          <AreaTrend
            data={(students.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk }))}
            xKey="label"
            height={200}
            series={[{ key: 'value', name: 'At-risk %', color: '#f43f5e' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Institution trends" subtitle="Attendance & retention" className="min-w-0">
          <LineTrend
            data={(attendance.trend ?? []).map((t) => ({ label: t.month, value: t.pct }))}
            xKey="label"
            height={90}
            series={[{ key: 'value', name: 'Attendance %', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-emerald-50/70 p-3 dark:bg-emerald-500/5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {report.body ?? 'Institution summary generated from the intelligence foundation.'}
            </span>
          </p>
        </ChartCard>
      </div>

      {/* Report highlights */}
      {(report.highlights ?? []).length > 0 && (
        <WorkspaceSection title="Executive summary" subtitle="Generated from the intelligence foundation" className="mt-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {report.highlights.map((h) => (
              <div key={h} className="rounded-2xl border border-slate-100 p-4 text-[12px] font-semibold leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">
                {h}
              </div>
            ))}
          </div>
        </WorkspaceSection>
      )}
    </div>
  )
}

export { WorkspaceOverviewTab }
export default WorkspaceOverviewTab
