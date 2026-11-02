import { motion } from 'framer-motion'
import { Award, BarChart3, Download } from 'lucide-react'
import { useParentExamResults } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

function ExamResults() {
  const { data, isLoading, isError, refetch } = useParentExamResults()
  const toast = useToast()
  const items = data?.items ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Exam Results"
        title="Exam results"
        description="Every result with context — class average, rank and grade — so a number never floats alone."
        breadcrumbs={[{ label: 'Parent' }, { label: 'Exam Results' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><Award className="h-3 w-3" /> 5 exams · 0 backlogs</Badge>}
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((r, i) => {
          const pct = Math.round((r.score / r.max) * 100)
          return (
            <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group h-full overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-stretch">
                  <div className={`flex w-20 shrink-0 flex-col items-center justify-center py-5 text-white ${pct >= 80 ? 'bg-gradient-to-b from-emerald-600 to-teal-500' : 'bg-gradient-to-b from-indigo-600 to-blue-600'}`}>
                    <p className="font-display text-2xl font-bold">{pct}%</p>
                    <Badge className="mt-1 bg-white/20 text-white ring-white/30">{r.grade}</Badge>
                  </div>
                  <div className="flex-1 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{r.subject}</p>
                    <h3 className="mt-0.5 text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{r.title}</h3>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400">
                      <span>{formatDate(r.date)}</span>
                      <span>Score {r.score}/{r.max}</span>
                      <span>Class avg {r.classAvg}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Badge variant="secondary" size="sm">Rank {r.rank}</Badge>
                      {r.score >= r.classAvg && <Badge variant="success" size="sm">Above class avg</Badge>}
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <Button variant="ghost" size="sm" className="w-full text-indigo-600 dark:text-indigo-300" onClick={() => toast.success('Downloading…', 'Result PDF saved to your files.')}>
                    <Download className="h-3.5 w-3.5" /> Download report card
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Pattern note:</span> Aarav's strongest results come in the first exam of each season. With 5 midsems in 5 days (Aug 19–23), the AI planner has front-loaded revision to keep that edge.
        </p>
      </div>
    </div>
  )
}

export { ExamResults }
export default ExamResults
