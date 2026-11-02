import { motion } from 'framer-motion'
import { Award, HeartHandshake, ShieldCheck, Smile, Sparkles, Star, ThumbsUp } from 'lucide-react'
import { useParentBehavior } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { LineTrend } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card } from '@/components/ui'

function Behavior() {
  const { data, isLoading, isError, refetch } = useParentBehavior()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Behaviour"
        title="Behaviour & wellbeing"
        description="Teacher observations, commendations and any flags — always framed constructively."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Behaviour' }]}
        actions={<Badge variant="success" className="px-3 py-1"><Smile className="h-3 w-3" /> Rating {data.summary.rating}/5</Badge>}
      />

      {/* Summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Behaviour rating', value: `${data.summary.rating}/5`, icon: Star, color: 'text-amber-500' },
          { label: 'Incidents', value: String(data.summary.incidents), icon: ShieldCheck, color: 'text-emerald-500' },
          { label: 'Commendations', value: String(data.summary.commendations), icon: Award, color: 'text-indigo-500' },
          { label: 'Active flags', value: String(data.summary.flags), icon: HeartHandshake, color: 'text-teal-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] font-medium text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Behaviour trend" subtitle="Monthly teacher rating">
          <LineTrend
            data={data.trend ?? []}
            xKey="month"
            height={230}
            series={[{ key: 'rating', name: 'Rating', color: '#f59e0b' }]}
            formatter={(v) => `${v}/5`}
          />
        </ChartCard>

        {/* Commendations */}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <ThumbsUp className="h-4 w-4 text-emerald-500" /> Teacher commendations
          </p>
          <div className="mt-4 space-y-3">
            {data.commendations.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{c.teacher}</p>
                  <span className="text-[10.5px] font-medium text-slate-400">{c.date}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">“{c.text}”</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly reports */}
      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Monthly behaviour reports</h2>
      <div className="space-y-4">
        {data.reports.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{r.period} — {r.teacher}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
                      <span className="flex items-center gap-1 text-amber-500"><Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {r.rating}/5</span>
                      <span>{r.incidents} incidents</span>
                      <span>{r.commendations} commendations</span>
                    </div>
                  </div>
                </div>
                {r.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.flags.map((f) => <Badge key={f} variant="warning" size="sm">{f}</Badge>)}
                  </div>
                )}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{r.summary}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-emerald-600/10 to-teal-500/10 p-5 ring-1 ring-emerald-500/15">
        <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Our approach:</span> behaviour reports are written to celebrate strengths first. The only flag this year (one late lab submission in June) was resolved with a reminder — no further action was needed.
        </p>
      </div>
    </div>
  )
}

export { Behavior }
export default Behavior
