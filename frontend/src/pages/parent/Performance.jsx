import { motion } from 'framer-motion'
import { Award, Sparkles, TrendingUp } from 'lucide-react'
import { useParentPerformance } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge } from '@/components/ui'

function Performance() {
  const { data, isLoading, isError, refetch } = useParentPerformance()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Performance"
        title="Performance"
        description="Internal marks vs class average, subject by subject — in plain language."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Performance' }]}
        actions={<Badge variant="success" className="px-3 py-1"><TrendingUp className="h-3 w-3" /> Above average in all subjects</Badge>}
      />

      <ChartCard title="Internal marks — your ward vs class average" subtitle="Current semester · all subjects">
        <BarCompare
          data={data.comparison ?? []}
          xKey="subject"
          height={280}
          series={[
            { key: 'student', name: 'Aarav', color: '#6366f1' },
            { key: 'class', name: 'Class average', color: '#c7d2fe' },
          ]}
        />
      </ChartCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <ChartCard title="Subject standings">
          <div className="space-y-3">
            {data.internals.map((s, i) => {
              const diff = s.internal - s.classAvg
              return (
                <motion.div key={s.subject} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                    <p className="text-[10.5px] text-slate-400">Class avg {s.classAvg}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg font-bold text-slate-900 dark:text-white">{s.internal}</span>
                    <Badge variant={diff >= 10 ? 'success' : 'info'}>+{diff} vs avg</Badge>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </ChartCard>

        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <Award className="h-4 w-4" /> Teacher's remark
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/95">{data.remarks}</p>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-indigo-500" /> What this means for you
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Worth celebrating', text: 'DSA (86) and ML (82) are class-leading. Appreciation matters more than advice here.' },
                { title: 'Worth watching', text: 'ToC (64) and Networks (69) — both have AI study plans running. Check in lightly after Aug 14.' },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{c.title}</p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Performance }
export default Performance
