import { motion } from 'framer-motion'
import { AlertTriangle, CalendarDays, Info, Sparkles, TrendingUp } from 'lucide-react'
import { useStudentIntelligence } from '@/services/intelligence'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend } from '@/components/charts'
import { ProgressRing } from '@/components/shared/progress-ring'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, CardContent } from '@/components/ui'
import { formatDate } from '@/utils/format'

const STATUS_META = {
  Present: { label: 'Present', cell: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/30', dot: 'bg-emerald-500', badge: 'success' },
  Absent: { label: 'Absent', cell: 'bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30', dot: 'bg-rose-500', badge: 'danger' },
  Leave: { label: 'Leave', cell: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/30', dot: 'bg-amber-500', badge: 'warning' },
  Holiday: { label: 'Holiday', cell: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/30 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/30', dot: 'bg-indigo-500', badge: 'info' },
  Upcoming: { label: 'Upcoming', cell: 'bg-slate-100/70 text-slate-300 ring-slate-200/60 dark:bg-slate-800/40 dark:text-slate-600 dark:ring-slate-800', dot: 'bg-slate-300 dark:bg-slate-600', badge: 'secondary' },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Premium monthly attendance calendar — Present / Absent / Leave / Holiday. */
function MonthlyCalendar({ days }) {
  const firstWeekday = days.find((d) => d.day === 1)?.weekday ?? 0
  const monthName = days.length ? formatDate(days[0].date, 'MMMM yyyy') : ''
  const counts = days.reduce((acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc }, {})

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-base font-bold text-slate-900 dark:text-white">{monthName}</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(STATUS_META).filter((s) => s !== 'Upcoming').map((s) => (
            <span key={s} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
              <span className="text-slate-400 dark:text-slate-500">{counts[s] ?? 0}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {WEEKDAYS.map((w) => (
          <p key={w} className="pb-1 text-center text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{w}</p>
        ))}
        {Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad-${i}`} />)}
        {days.map((d) => {
          const meta = STATUS_META[d.status] ?? STATUS_META.Upcoming
          return (
            <motion.div
              key={d.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: d.day * 0.012 }}
              title={`${formatDate(d.date, 'MMM d, yyyy')} — ${d.status}${d.note ? ` (${d.note})` : ''}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-xl ring-1 ${meta.cell} transition-transform duration-200 hover:scale-110`}
            >
              <span className="text-[13px] font-bold leading-none sm:text-sm">{d.day}</span>
              <span className="mt-1 hidden text-[8px] font-semibold uppercase tracking-wide opacity-80 sm:block">{d.status === 'Holiday' && d.note ? 'Holiday' : d.status}</span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Attendance() {
  /* Phase 27.3: attendance comes from the Student Intelligence Foundation (was /student/attendance). */
  const { data: intel, isLoading, isError, refetch } = useStudentIntelligence()
  const data = intel?.derived?.university?.attendance ?? {}

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const totalPresent = (data.bySubject ?? []).reduce((a, s) => a + s.present, 0)
  const totalClasses = (data.bySubject ?? []).reduce((a, s) => a + s.total, 0)
  const leaves = (data.calendar ?? []).filter((d) => d.status === 'Leave').length
  const holidays = (data.calendar ?? []).filter((d) => d.status === 'Holiday').length

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Attendance"
        title="Attendance"
        description="Track your presence across subjects, spot trends and stay above the 75% institution threshold."
        breadcrumbs={[{ label: 'Student' }, { label: 'Attendance' }]}
        actions={<Badge variant={data.overall >= 90 ? 'success' : 'warning'} className="px-3 py-1 text-sm">Overall {data.overall}%</Badge>}
      />

      {/* Row 1 — overall ring + trend */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="This semester" subtitle={`vs institution minimum (${data.required ?? 75}%)`}>
          <div className="flex flex-col items-center pt-3">
            <ProgressRing
              value={data.overall}
              size={170}
              stroke={14}
              label={`${data.overall}%`}
              sublabel="Overall"
              color={data.overall >= 90 ? '#10b981' : data.overall >= (data.required ?? 75) ? '#f59e0b' : '#ef4444'}
            />
            <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{totalPresent}</p>
                <p className="text-[10px] font-medium text-slate-400">Present</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-2.5 dark:bg-rose-500/10">
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{totalClasses - totalPresent}</p>
                <p className="text-[10px] font-medium text-slate-400">Absent</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-2.5 dark:bg-amber-500/10">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{leaves}</p>
                <p className="text-[10px] font-medium text-slate-400">Leaves</p>
              </div>
            </div>
            <div className="mt-4 w-full rounded-2xl bg-indigo-50/70 p-3 text-center dark:bg-indigo-500/5">
              <p className="text-[11.5px] font-semibold text-indigo-700 dark:text-indigo-300">
                <TrendingUp className="mr-1 inline h-3.5 w-3.5" /> Buffer above threshold: <span className="font-bold">{(data.overall - (data.required ?? 75)).toFixed(1)} pts</span>
              </p>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Attendance trend" subtitle="Attendance % over the last 6 months" className="lg:col-span-2">
          <AreaTrend
            data={data.trend ?? []}
            xKey="month"
            height={250}
            series={[{ key: 'pct', name: 'Attendance', color: '#6366f1' }]}
            formatter={(v) => `${v}%`}
          />
          <div className="mt-3 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-4 dark:border-slate-800">
            {data.weekly?.slice(-3).map((w) => (
              <div key={w.week} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{w.pct}%</p>
                <p className="text-[10px] font-medium text-slate-400">Week {w.week.replace('W', '')}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 2 — monthly calendar + weekly summary */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard
          title="Monthly attendance calendar"
          subtitle="Present · absent · leave · holiday — at a glance"
          className="lg:col-span-2"
          actions={<Badge variant="secondary" size="sm"><CalendarDays className="h-3 w-3" /> {holidays} holidays</Badge>}
        >
          <MonthlyCalendar days={data.calendar ?? []} />
        </ChartCard>

        <ChartCard title="Weekly summary" subtitle="Current month, week by week">
          <div className="space-y-3.5">
            {(data.weeklySummary ?? []).map((w) => (
              <div key={w.week}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{w.week} <span className="font-normal text-slate-400">· {w.range}</span></span>
                  <span className={`font-bold ${w.pct >= 90 ? 'text-emerald-600 dark:text-emerald-400' : w.pct >= 80 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>
                    {w.present}/{w.total} · {w.pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${w.pct}%`, background: w.pct >= 90 ? 'linear-gradient(90deg,#10b981,#34d399)' : w.pct >= 80 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f43f5e,#fb7185)' }}
                  />
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-slate-400">{w.focus}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600/8 to-teal-500/8 p-3.5 ring-1 ring-indigo-500/15">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-600 dark:text-indigo-300">AI:</span> {(data.insights?.[0]?.body) || 'Attendance insights appear after faculty mark a class.'}
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Row 3 — subject-wise + insights */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Subject-wise attendance" subtitle="Present / total classes" className="lg:col-span-2">
          <div className="space-y-4">
            {(data.bySubject ?? []).map((s) => (
              <div key={s.subject} className="flex items-center gap-3.5">
                <span className="w-24 shrink-0 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{s.subject}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${s.pct}%`, background: s.color }}
                  />
                </div>
                <span className="w-24 text-right text-[11px] font-medium text-slate-400">{s.present}/{s.total} classes</span>
                <span className="w-12 text-right text-xs font-bold" style={{ color: s.color }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Attendance insights" subtitle="What the data says about you">
            <div className="space-y-2.5">
              {(data.insights ?? []).slice(0, 3).map((i) => (
                <div key={i.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                  <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${i.tone === 'positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : i.tone === 'warning' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400'}`}>
                    {i.tone === 'positive' ? '✓' : i.tone === 'warning' ? '!' : 'i'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{i.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{i.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>

          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-slate-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-500" /> AI suggestions
              </p>
              <div className="mt-3 space-y-2.5">
                {(data.aiSuggestions ?? []).map((s) => (
                  <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{s.topic}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{s.body}</p>
                    </div>
                    <Badge variant={s.impact === 'High' ? 'danger' : 'warning'} size="sm">{s.impact}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 4 — history table */}
      <ChartCard
        title="Attendance history"
        subtitle="Every class record, latest first"
        className="mt-6"
        actions={<Badge variant="secondary" size="sm">{data.history?.length ?? data.recent?.length ?? 0} records</Badge>}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subject</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data.history ?? data.recent ?? []).map((r) => (
                <tr key={`${r.date}-${r.subject}`} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{formatDate(r.date, 'EEE, MMM d')}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{r.subject}</td>
                  <td className="px-4 py-3 text-slate-400">{r.type ?? 'Class'}</td>
                  <td className="px-4 py-3 text-right">
                    <Badge variant={STATUS_META[r.status]?.badge ?? 'secondary'} size="sm">{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="mt-6 flex items-start gap-2.5 rounded-3xl bg-amber-50 p-4 text-[12px] leading-relaxed text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Institution policy: attendance below {data.required ?? 75}% blocks midsem eligibility. You have a {(data.overall - (data.required ?? 75)).toFixed(1)}-point buffer.
      </div>
    </div>
  )
}

export { Attendance }
export default Attendance
