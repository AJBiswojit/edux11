import { motion } from 'framer-motion'
import { Award, FlaskConical, Handshake, Wallet } from 'lucide-react'
import { useAdminResearch } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend, BarCompare } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Card, useToast } from '@/components/ui'

function Research() {
  const { data, isLoading, isError, refetch } = useAdminResearch()
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Research"
        title="Research dashboard"
        description="Grants, publications and citations across the institution — with funding trends."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Research' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><FlaskConical className="h-3 w-3" /> FY 2026-27</Badge>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(data?.kpis ?? []).map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="font-display text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
            <p className="text-[11px] font-medium text-slate-400">{k.label}</p>
            <p className={`text-[11px] font-bold ${k.up ? 'text-emerald-500' : 'text-rose-500'}`}>{k.delta}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Research funding" subtitle="₹ crore sanctioned by year">
          <AreaTrend
            data={data.grantTrend ?? []}
            xKey="year"
            height={240}
            series={[{ key: 'amount', name: '₹ crore', color: '#8b5cf6' }]}
            formatter={(v) => `₹${v} Cr`}
          />
        </ChartCard>

        <ChartCard title="Publications by department" subtitle="FY 2026-27">
          <BarCompare
            data={data.byDept ?? []}
            xKey="dept"
            height={240}
            series={[{ key: 'pubs', name: 'Publications', color: '#6366f1' }]}
          />
        </ChartCard>
      </div>

      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Flagship projects</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {(data?.topProjects ?? []).map((p, i) => (
          <motion.div key={p.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <Award className="h-5 w-5 text-violet-500" />
                <Badge variant="success">{p.status}</Badge>
              </div>
              <h3 className="mt-3 text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{p.title}</h3>
              <p className="mt-1.5 text-[11.5px] text-slate-400">PI: {p.pi}</p>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] font-bold text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" /> {p.funding}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-violet-600/10 to-indigo-500/10 p-5 ring-1 ring-violet-500/15">
        <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Research office note:</span> 3 new MOUs signed this quarter (IIT Bombay · CMU · Tata Research). Funding pipeline for FY 2027 stands at ₹68 Cr across 14 proposals.
        </p>
      </div>
    </div>
  )
}

export { Research }
export default Research
