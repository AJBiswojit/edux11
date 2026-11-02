import { motion } from 'framer-motion'
import { Receipt, Wallet } from 'lucide-react'
import { useAdminRevenue } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, DonutChart } from '@/components/charts'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'

function Revenue() {
  const { data, isLoading, isError, refetch } = useAdminRevenue()
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={4} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const columns = [
    { key: 'student', label: 'Student', sortable: true, render: (r) => <span className="font-semibold text-slate-800 dark:text-slate-100">{r.student}</span> },
    { key: 'dept', label: 'Dept', render: (r) => <Badge variant="secondary" size="sm">{r.dept}</Badge> },
    { key: 'item', label: 'Item', render: (r) => <span className="text-slate-500 dark:text-slate-400">{r.item}</span> },
    { key: 'amount', label: 'Amount', sortable: true, render: (r) => <span className="font-bold text-slate-700 dark:text-slate-200">₹{r.amount.toLocaleString('en-IN')}</span> },
    { key: 'due', label: 'Due', render: (r) => <span className="text-xs text-slate-400">{r.due}</span> },
    { key: 'status', label: 'Status', render: (r) => <Badge variant={r.status === 'Paid' ? 'success' : r.status === 'Overdue' ? 'danger' : 'warning'}>{r.status}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Management · Revenue"
        title="Revenue overview"
        description="Institution finances — collections, outstanding invoices and revenue streams."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Revenue' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'Invoices are not available yet.')}>
            <Receipt className="h-4 w-4" /> Export ledger
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(data?.kpis ?? []).map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-5 text-white shadow-lg">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{k.value}</p>
            <p className={`text-[11px] font-bold ${k.up ? 'text-emerald-300' : 'text-rose-300'}`}>{k.delta} · {k.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Revenue vs target" subtitle="₹ crore · FY 2026-27">
          <BarCompare
            data={data.revenueTrend ?? []}
            xKey="month"
            height={250}
            series={[
              { key: 'revenue', name: 'Revenue', color: '#6366f1' },
              { key: 'target', name: 'Target', color: '#c7d2fe' },
            ]}
            formatter={(v) => `₹${v} Cr`}
          />
        </ChartCard>

        <ChartCard title="Revenue by source" subtitle="Share of total collections">
          <DonutChart data={data.bySource ?? []} height={250} centerLabel="—" centerSub="no invoices" />
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Revenue by department" subtitle="₹ crore collected to date" className="min-w-0 lg:col-span-1">
          <BarCompare
            data={data.byDept ?? []}
            xKey="dept"
            height={240}
            series={[{ key: 'revenue', name: '₹ crore', color: '#10b981' }]}
            formatter={(v) => `₹${v} Cr`}
          />
        </ChartCard>

        <div className="lg:col-span-2">
          <p className="mb-3 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Wallet className="h-4 w-4 text-indigo-500" /> Invoices & collections
          </p>
          <DataTable
            columns={columns}
            data={data.invoices ?? []}
            searchKeys={['student', 'item', 'dept']}
            searchPlaceholder="Search invoices…"
            pageSize={6}
          />
        </div>
      </div>
    </div>
  )
}

export { Revenue }
export default Revenue
