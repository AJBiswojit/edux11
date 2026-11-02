import { motion } from 'framer-motion'
import { Award, Banknote, CheckCircle2, Clock, Download, Receipt, Wallet } from 'lucide-react'
import { useParentFees } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'

function Fees() {
  const { data, isLoading, isError, refetch } = useParentFees()
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const paidPct = Math.round((data.summary.totalPaid / data.summary.totalDue) * 100)

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Fees"
        title="Fee summary"
        description="Every charge, payment and receipt — transparent down to the rupee."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Fee Summary' }]}
        actions={
          <Button size="sm" onClick={() => toast.success('Payments enabled', 'UPI / net banking / card — instant receipt.')}>
            <Banknote className="h-4 w-4" /> Pay online
          </Button>
        }
      />

      {/* Summary hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-7 text-white shadow-lift sm:p-9">
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/75">Semester 5 — Fee account</p>
            <h2 className="mt-1 font-display text-3xl font-bold">₹{(data.summary.totalDue).toLocaleString('en-IN')}</h2>
            <p className="mt-1 text-sm text-white/85">Total assessed · {paidPct}% paid</p>
            <div className="mt-4 flex flex-wrap gap-6">
              <div>
                <p className="font-display text-xl font-bold text-emerald-300">₹{data.summary.totalPaid.toLocaleString('en-IN')}</p>
                <p className="text-[11px] font-semibold text-white/75">Paid</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-amber-300">₹{data.summary.outstanding.toLocaleString('en-IN')}</p>
                <p className="text-[11px] font-semibold text-white/75">Outstanding</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold">{data.summary.nextDue}</p>
                <p className="text-[11px] font-semibold text-white/75">{data.summary.installment}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-36 w-36">
              <svg className="h-36 w-36 -rotate-90">
                <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="72" cy="72" r="60" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - paidPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold">{paidPct}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Breakdown */}
        <Card className="p-6">
          <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <Receipt className="h-4 w-4 text-indigo-500" /> Fee breakdown
          </p>
          <div className="mt-4 space-y-3">
            {data.breakdown.map((b, i) => (
              <motion.div key={b.item} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{b.item}</p>
                  <p className="text-[11px] text-slate-400">Assessed ₹{b.amount.toLocaleString('en-IN')}{b.due !== '—' ? ` · due ${b.due}` : ''}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">₹{b.paid.toLocaleString('en-IN')}</span>
                  <Badge variant={b.status === 'Paid' ? 'success' : b.status === 'Partial' ? 'warning' : 'secondary'}>{b.status}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Transactions */}
        <div className="space-y-6">
          <Card className="p-6">
            <p className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <Wallet className="h-4 w-4 text-emerald-500" /> Payment history
            </p>
            <div className="mt-4 space-y-2.5">
              {data.transactions.map((t, i) => (
                <motion.div key={t.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.status === 'Success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                    {t.status === 'Success' ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{t.item}</p>
                    <p className="text-[10.5px] text-slate-400">{t.date} · {t.method} · {t.receipt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${t.status === 'Success' ? 'text-slate-800 dark:text-slate-100' : 'text-amber-500'}`}>₹{t.amount.toLocaleString('en-IN')}</span>
                    <Badge variant={t.status === 'Success' ? 'success' : 'warning'} size="sm">{t.status}</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>

          <div className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-emerald-600/10 to-teal-500/10 p-5 ring-1 ring-emerald-500/15">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
              <Award className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-slate-900 dark:text-white">{data.scholarshipApplied.name}</p>
              <p className="text-[12px] text-slate-500 dark:text-slate-400">
                ₹{data.scholarshipApplied.amount.toLocaleString('en-IN')} · {data.scholarshipApplied.status} · credited {data.scholarshipApplied.credited}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.success('Downloading…', 'Scholarship letter saved.')}>
              <Download className="h-3.5 w-3.5" /> Letter
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export { Fees }
export default Fees
