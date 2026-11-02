/**
 * Teaching Intelligence Workspace — Tab 2: Attendance Intelligence.
 * Overall / class-wise / subject-wise attendance, 8-week trend, class
 * heatmap, low-attendance & consecutive-missing cohorts, attendance-vs-
 * performance correlation and derived AI insights.
 */

import { CalendarCheck2, CalendarX2, Sparkles, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare, HeatmapGrid } from '@/components/charts'
import { Badge, Card } from '@/components/ui'
import { AiInsightCard, WorkspaceSection } from './shared'

const heatColor = (v) => (v >= 95 ? '#10b981' : v >= 90 ? '#34d399' : v >= 85 ? '#fbbf24' : v >= 80 ? '#f97316' : '#ef4444')

function AttendanceTab({ data }) {
  const ai = data.derived.attendanceIntelligence ?? {}
  const summary = ai.summary ?? {}

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Overall attendance" value={`${ai.overall ?? '—'}%`} sub="all classes · 8 weeks" icon="CalendarCheck2" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={1} label="Best class" value={summary.highestClass ?? '—'} sub="highest 8-week average" icon="TrendingUp" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={2} label="Needs attention" value={summary.lowestClass ?? '—'} sub="lowest 8-week average" icon="TrendingDown" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Students below 75%" value={String(summary.studentsBelow75 ?? 0)} sub={`${ai.consecutiveMissing?.length ?? 0} missing consecutively`} icon="Users" gradient="from-rose-500 to-red-500" />
      </div>

      {/* Class-wise + subject-wise */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Class-wise attendance" subtitle="8-week average per class">
          <BarCompare
            data={(ai.byClass ?? []).map((c) => ({ label: c.label, avg: c.weeksAvg, latest: c.latest }))}
            xKey="label"
            height={250}
            series={[
              { key: 'avg', name: '8-week avg', color: '#6366f1' },
              { key: 'latest', name: 'Latest session', color: '#14b8a6' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Subject-wise attendance" subtitle="Grouped by course code">
          <BarCompare
            data={(ai.bySubject ?? []).map((s) => ({ label: s.course, avg: s.avgPct }))}
            xKey="label"
            height={250}
            series={[{ key: 'avg', name: 'Attendance %', color: '#8b5cf6' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      {/* Trend + heatmap */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance trend" subtitle="All courses · last 8 weeks">
          <AreaTrend
            data={ai.weeklyTrend ?? []}
            xKey="week"
            height={240}
            series={[{ key: 'pct', name: 'Attendance', color: '#14b8a6' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="Attendance heatmap" subtitle="Weeks × classes — darker = lower attendance">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5">
              {(ai.heatmap ?? []).map((row) => (
                <span key={row.label} className="h-4 max-w-[110px] truncate text-[9px] font-semibold leading-4 text-slate-400">{row.label}</span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <HeatmapGrid
                weeks={8}
                days={(ai.heatmap ?? []).length}
                values={(ai.weeklyTrend ?? []).map((_, w) => (ai.heatmap ?? []).map((row) => row.weeks[w] ?? { value: 0 }))}
                getColor={heatColor}
              />
              <div className="mt-2 flex items-center justify-end gap-1.5 text-[9px] font-medium text-slate-400">
                Low <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#ef4444' }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#fbbf24' }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#34d399' }} />
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#10b981' }} /> High
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Low attendance + correlation */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Attendance vs performance" subtitle="Class-average score by attendance bucket">
          <BarCompare
            data={(ai.correlation ?? []).map((c) => ({ label: c.bucket, avgScore: c.avgScore }))}
            xKey="label"
            height={230}
            series={[{ key: 'avgScore', name: 'Avg score %', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
          {(ai.correlationGap ?? 0) > 0 && (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-3.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20">
              Students with attendance below 75% score {ai.correlationGap} points lower than the 90%+ cohort.
            </div>
          )}
        </ChartCard>

        <div className="grid gap-6 sm:grid-cols-2">
          <ChartCard
            title="Students with low attendance"
            subtitle="Below the 75% threshold"
            actions={<Badge variant="danger" size="sm">{ai.lowAttendance?.length ?? 0}</Badge>}
          >
            <div className="space-y-2.5">
              {(ai.lowAttendance ?? []).slice(0, 5).map((s) => (
                <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-rose-100 p-3 dark:border-rose-500/20">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[10.5px] text-slate-400">{s.roll} · {s.classes} missed</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${s.attendance < 75 ? 'text-rose-500' : 'text-amber-500'}`}>{s.attendance}%</span>
                    <Badge variant={s.level === 'Critical' ? 'danger' : 'warning'} size="sm" className="ml-1.5">{s.level}</Badge>
                  </div>
                </div>
              ))}
              {ai.lowAttendance?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No students below threshold 🎉</p>}
            </div>
          </ChartCard>

          <ChartCard
            title="Missing consecutive classes"
            subtitle="Attendance continuity risk"
            actions={<Badge variant="warning" size="sm">{ai.consecutiveMissing?.length ?? 0}</Badge>}
          >
            <div className="space-y-2.5">
              {(ai.consecutiveMissing ?? []).map((s) => (
                <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-amber-100 p-3 dark:border-amber-500/20">
                  <CalendarX2 className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                    <p className="text-[10.5px] text-slate-400">{s.course} · last present {s.lastPresent}</p>
                  </div>
                  <Badge variant="warning" size="sm">{s.consecutive} classes</Badge>
                </div>
              ))}
              {ai.consecutiveMissing?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No continuity risk.</p>}
            </div>
          </ChartCard>
        </div>
      </div>

      {/* AI insights */}
      <WorkspaceSection title="AI attendance insights" subtitle="Derived from your class records and cohort signals" icon={Sparkles}>
        <div className="grid gap-4 md:grid-cols-2">
          {(ai.insights ?? []).map((insight, i) => (
            <AiInsightCard key={insight.id} insight={insight} index={i} />
          ))}
          {ai.insights?.length === 0 && (
            <Card className="p-6 text-center text-xs text-slate-400 md:col-span-2">No attendance insights right now — all classes look healthy.</Card>
          )}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { AttendanceTab }
export default AttendanceTab
