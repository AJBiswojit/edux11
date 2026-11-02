import { motion } from 'framer-motion'
import { CalendarCheck2, Info, Stethoscope } from 'lucide-react'
import { useParentAttendance } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend } from '@/components/charts'
import { ProgressRing } from '@/components/shared/progress-ring'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, CardContent } from '@/components/ui'

function Attendance() {
  const { data, isLoading, isError, refetch } = useParentAttendance()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Attendance"
        title="Attendance"
        description="Aarav's presence across subjects — with leave history and context, not just numbers."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Attendance' }]}
        actions={<Badge variant="success" className="px-3 py-1">Overall {data.overall}%</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Overall attendance" subtitle="Institution minimum: 75%">
          <div className="flex flex-col items-center pt-3">
            <ProgressRing value={data.overall} size={160} stroke={13} label={`${data.overall}%`} sublabel="Overall" color="#10b981" />
            <p className="mt-4 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              Healthy buffer of <span className="font-bold text-emerald-600 dark:text-emerald-400">17 points</span> above the eligibility threshold.
            </p>
          </div>
        </ChartCard>

        <ChartCard title="Monthly trend" subtitle="Last 6 months" className="lg:col-span-2">
          <AreaTrend
            data={data.trend ?? []}
            xKey="month"
            height={230}
            series={[{ key: 'pct', name: 'Attendance', color: '#10b981' }]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Subject-wise attendance">
          <div className="space-y-3.5">
            {data.bySubject.map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{s.subject}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.pct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                  />
                </div>
                <span className="w-12 text-right text-xs font-bold text-slate-600 dark:text-slate-300">{s.pct}%</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <Card>
          <CardContent className="p-6">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <Stethoscope className="h-4 w-4 text-sky-500" /> Absences & leaves
            </p>
            <div className="mt-4 space-y-2.5">
              {data.absences.map((a) => (
                <div key={a.date} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <CalendarCheck2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{a.subject}</p>
                    <p className="text-[11px] text-slate-400">{a.date} · {a.duration}</p>
                  </div>
                  <Badge variant={a.reason.includes('Medical') ? 'info' : 'warning'} size="sm">{a.reason}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-sky-50 p-3.5 text-[11.5px] leading-relaxed text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Both absences are explained (medical leave, approved). The AI flags any unexplained pattern to you directly.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export { Attendance }
export default Attendance
