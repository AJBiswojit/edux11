/**
 * Teaching Intelligence Workspace — Tab 4: Student Engagement.
 * Composite engagement per student, dimension averages, academic-health
 * distribution, top & least engaged cohorts, engagement trend, course-level
 * comparison and derived AI insights.
 */

import { Sparkles, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { Badge, Card } from '@/components/ui'
import { AiInsightCard, WorkspaceSection } from './shared'

function StudentList({ title, students, tone = 'emerald', empty = 'No students' }) {
  const toneBg = tone === 'emerald' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
  return (
    <ChartCard title={title} subtitle="Composite engagement score">
      <div className="space-y-2.5">
        {(students ?? []).map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${toneBg}`}>
              {s.name.split(' ').map((x) => x[0]).join('')}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
              <p className="text-[10.5px] text-slate-400">{s.course} · {s.roll}</p>
            </div>
            <span className={`text-sm font-bold ${s.score >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.score}%</span>
            <Badge variant={String(s.trend).startsWith('-') ? 'warning' : 'success'} size="sm">{s.trend}</Badge>
          </div>
        ))}
        {students?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">{empty}</p>}
      </div>
    </ChartCard>
  )
}

function EngagementTab({ data }) {
  const ea = data.derived.engagementAnalytics ?? {}
  const dims = ea.dimensionAverages ?? []

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard index={0} label="Composite engagement" value={`${ea.overall ?? '—'}%`} sub={`${ea.students?.length ?? 0} students tracked`} icon="Users" gradient="from-indigo-500 to-blue-500" />
        {(dims ?? []).slice(0, 4).map((d, i) => (
          <StatCard key={d.key} index={i + 1} label={d.label} value={`${d.value ?? 0}%`} sub="cohort average" icon={['Activity', 'CalendarCheck2', 'FileCheck2', 'ListChecks'][i]} gradient={['from-emerald-500 to-teal-500', 'from-violet-500 to-purple-500', 'from-amber-500 to-orange-500', 'from-sky-500 to-cyan-500'][i]} />
        ))}
      </div>

      {/* Distribution + trend */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Users className="h-4 w-4 text-indigo-500" /> Academic health distribution
          </p>
          <div className="mt-2 flex items-center justify-center">
            <DonutChart
              data={ea.distributionData ?? []}
              height={250}
              centerLabel={`${ea.overall ?? 0}%`}
              centerSub="avg engagement"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(ea.distributionData ?? []).map((d) => (
              <div key={d.name} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{d.name}</span>
                <span className="ml-auto text-[12px] font-bold text-slate-800 dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <ChartCard title="Engagement trend" subtitle="Cohort composite · last 8 weeks" className="lg:col-span-1">
          <AreaTrend
            data={ea.weeklyTrend ?? []}
            xKey="week"
            height={250}
            series={[{ key: 'value', name: 'Engagement', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Course-level engagement" subtitle="Composite per course">
          <BarCompare
            data={(ea.byCourse ?? []).map((c) => ({ label: c.courseCode, score: c.score, participation: c.participation }))}
            xKey="label"
            height={250}
            series={[
              { key: 'score', name: 'Composite', color: '#6366f1' },
              { key: 'participation', name: 'Participation', color: '#f59e0b' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Top / least engaged */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StudentList title="Top engaged students" subtitle="Highest composite engagement" students={ea.topEngaged ?? []} tone="emerald" />
        <StudentList title="Least engaged students" subtitle="Needs participation nudges" students={ea.leastEngaged ?? []} tone="rose" />
      </div>

      {/* AI insights */}
      <WorkspaceSection title="AI engagement insights" subtitle="Derived from participation, attendance, submissions & quiz signals" icon={Sparkles}>
        <div className="grid gap-4 md:grid-cols-2">
          {(ea.insights ?? []).map((insight, i) => <AiInsightCard key={insight.id} insight={insight} index={i} />)}
          {ea.insights?.length === 0 && <Card className="p-6 text-center text-xs text-slate-400 md:col-span-2">Engagement looks healthy across all cohorts.</Card>}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { EngagementTab }
export default EngagementTab
