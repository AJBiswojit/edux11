/**
 * Institution Intelligence Workspace · Tab 4: Academic Intelligence.
 * Merges the useful content of the former Academic Analytics + Performance
 * pages into one management view: retention, CGPA, dept pass rates,
 * subject performance, fee & AI adoption trends.
 */

import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, LineTrend } from '@/components/charts'
import { Badge } from '@/components/ui'
import { KpiStrip, WorkspaceSection } from './shared'

function AcademicTab({ data }) {
  const ds = data.datasets?.analytics ?? {}
  const aa = ds.adminAnalytics ?? {}
  const perf = ds.adminPerformance ?? {}
  const exam = ds.adminExamAnalytics ?? {}
  const admin = data.derived

  const subjects = (exam.bySubject ?? []).map((s) => ({ ...s }))
  const sortedSubjects = [...subjects].sort((a, b) => b.avg - a.avg)
  const strong = sortedSubjects.slice(0, 2)
  const weak = [...sortedSubjects].reverse().slice(0, 2)

  return (
    <div>
      <KpiStrip
        cols={4}
        items={[
          { label: 'Retention (2025)', value: `${aa.retention?.slice(-1)[0]?.overall ?? '—'}%`, sub: 'overall retention' },
          { label: 'Avg CGPA', value: (admin.students?.cgpaAvg ?? '—').toFixed ? admin.students?.cgpaAvg?.toFixed(2) ?? '—' : '—', sub: 'semester average' },
          { label: 'Avg pass rate', value: `${perf.deptPassRates?.length ? Math.round(perf.deptPassRates.reduce((a, d) => a + d.pass, 0) / perf.deptPassRates.length) : '—'}%`, sub: 'across departments' },
          { label: 'Satisfaction', value: `${aa.satisfaction?.overall ?? '—'}/5`, sub: `teaching ${aa.satisfaction?.teaching ?? '—'} · digital ${aa.satisfaction?.digital ?? '—'}` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Retention by intake year" subtitle="First-year vs overall">
          <LineTrend
            data={(aa.retention ?? []).map((r) => ({ label: r.year, first: r.first, overall: r.overall }))}
            xKey="label"
            height={230}
            series={[
              { key: 'first', name: 'First-year', color: '#6366f1' },
              { key: 'overall', name: 'Overall', color: '#14b8a6' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Semester-wise CGPA" subtitle="Institution average">
          <BarCompare
            data={(aa.semesterWise ?? []).map((s) => ({ label: s.sem, cgpa: s.cgpa }))}
            xKey="label"
            height={230}
            series={[{ key: 'cgpa', name: 'Avg CGPA', color: '#3b82f6' }]}
            formatter={(v) => v.toFixed(1)}
          />
        </ChartCard>
      </div>

      <WorkspaceSection title="Department academic performance" subtitle="Pass rate by department — former Performance page content">
        <ChartCard className="min-w-0">
          <BarCompare
            data={(perf.deptPassRates ?? []).map((d) => ({ label: d.dept, pass: d.pass }))}
            xKey="label"
            height={230}
            series={[{ key: 'pass', name: 'Pass rate %', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </WorkspaceSection>

      <WorkspaceSection title="Subject performance" subtitle="Strong vs weak subjects — from exam analytics">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Average score by subject" className="min-w-0">
            <BarCompare
              data={subjects.map((s) => ({ label: s.subject, avg: s.avg }))}
              xKey="label"
              height={220}
              series={[{ key: 'avg', name: 'Avg score', color: '#6366f1' }]}
              formatter={(v) => `${v}%`}
            />
          </ChartCard>
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Strong subjects</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {strong.map((s) => <Badge key={s.subject} variant="success" size="sm" className="px-3 py-1.5">{s.subject} · {s.avg}%</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Weak subjects</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {weak.map((s) => <Badge key={s.subject} variant="danger" size="sm" className="px-3 py-1.5">{s.subject} · {s.avg}%</Badge>)}
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              {weak[0] ? `${weak[0].subject} scores ${strong[0] ? strong[0].avg - weak[0].avg : '—'} points below ${strong[0]?.subject ?? 'the strongest subject'} — a candidate for department-level review before the midsem.` : 'Subject data unavailable.'}
            </p>
          </div>
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Institutional trends" subtitle="Former Academic Analytics page content">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Fee collection" subtitle="% of expected fees collected · FY 2026-27" className="min-w-0">
            <AreaTrend
              data={(aa.feeCollection ?? []).map((m) => ({ label: m.month, value: m.collected }))}
              xKey="label"
              height={210}
              series={[{ key: 'value', name: 'Collected %', color: '#10b981' }]}
              formatter={(v) => `${v}%`}
            />
          </ChartCard>
          <ChartCard title="AI platform usage" subtitle="Tutor + Copilot sessions / month" className="min-w-0">
            <BarCompare
              data={(aa.aiUsage ?? []).map((m) => ({ label: m.month, value: m.sessions }))}
              xKey="label"
              height={210}
              series={[{ key: 'value', name: 'Sessions', color: '#8b5cf6' }]}
              formatter={(v) => `${Math.round(v / 1000)}K`}
            />
          </ChartCard>
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { AcademicTab }
export default AcademicTab
