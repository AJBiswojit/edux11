import { motion } from 'framer-motion'
import { CalendarDays, Download, FileBarChart, FileText, Sparkles } from 'lucide-react'
import { useParentReports } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'

function Reports() {
  const { data, isLoading, isError, refetch } = useParentReports()
  const toast = useToast()
  const items = data?.items ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Reports"
        title="Reports & report cards"
        description="Official documents — term reports, attendance certificates and more."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Reports' }]}
        actions={<Badge variant="secondary"><FileBarChart className="h-3 w-3" /> Issued by Registrar</Badge>}
      />

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`group flex h-full items-center gap-4 p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${r.status === 'Upcoming' ? 'opacity-75' : ''}`}>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${r.status === 'Available' ? 'bg-gradient-to-br from-indigo-600 to-blue-600' : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600'}`}>
                {r.status === 'Available' ? <FileText className="h-6 w-6" /> : <CalendarDays className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{r.title}</h3>
                <p className="mt-1 text-[11.5px] font-medium text-slate-400">{r.period} · issued {r.issued}</p>
                {r.summary && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3 w-3" /> {r.summary}
                  </p>
                )}
              </div>
              {r.status === 'Available' ? (
                <Button size="sm" variant="outline" onClick={() => toast.success('Downloading…', `${r.title}.pdf saved.`)}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              ) : (
                <Badge variant="info">{r.status}</Badge>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <FileBarChart className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Good to know:</span> report cards are digitally signed and verifiable via QR. The Term 5 mid-term report (Aug 16) will include the AI progress narrative alongside official grades.
        </p>
      </div>
    </div>
  )
}

export { Reports }
export default Reports
