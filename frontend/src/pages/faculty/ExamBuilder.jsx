import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardList, FileCheck2, Sparkles, Wand2 } from 'lucide-react'
import { useFacultyExamBuilder } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, useToast } from '@/components/ui'

const STATUS_STYLES = { Draft: 'secondary', 'In Review': 'warning', Approved: 'success' }

function ExamBuilder() {
  const { data, isLoading, isError, refetch } = useFacultyExamBuilder()
  const toast = useToast()
  const drafts = data?.drafts ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Exam Builder"
        title="Exam builder"
        description="From blueprint to OMR-ready paper in under an hour — with AI-drafted questions you approve."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Exam Builder' }]}
        actions={
          <Button size="sm" onClick={() => toast.success('New paper started', 'Blueprint wizard launched — pick course & outcomes.')}>
            <Wand2 className="h-4 w-4" /> New exam paper
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {drafts.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{d.course}</p>
                  <h3 className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">{d.title}</h3>
                </div>
                <Badge variant={STATUS_STYLES[d.status]}>{d.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{d.questions}</p>
                  <p className="text-[9px] font-medium text-slate-400">Questions</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{d.totalMarks}</p>
                  <p className="text-[9px] font-medium text-slate-400">Marks</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{d.coverage}%</p>
                  <p className="text-[9px] font-medium text-slate-400">Outcome cov.</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{d.difficulty}</p>
                  <p className="text-[9px] font-medium text-slate-400">Level</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-slate-400">
                <span>{d.blueprint} · edited {d.lastEdited}</span>
                <span>predicted mean 34/50</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => toast.success('Paper opened', `${d.title} is ready in the editor.`)}>
                  <ClipboardList className="h-4 w-4" /> Open editor
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.info('Validation', 'Difficulty, plagiarism and coverage checks passed.')}>
                  <FileCheck2 className="h-4 w-4" /> Validate
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Blueprint */}
      <ChartCard title="Blueprint coverage — Midsem DSA (Paper A)" subtitle="Outcome weightage: target vs current" className="mt-8">
        <div className="space-y-4">
          {data.blueprint.map((b, i) => {
            const diff = Math.abs(b.weight - b.current)
            const ok = diff <= 3
            return (
              <div key={b.outcome}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{b.outcome}</span>
                  <span className="flex items-center gap-2 font-bold">
                    <span className="text-slate-500 dark:text-slate-300">target {b.weight}%</span>
                    <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>current {b.current}%</span>
                    {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Sparkles className="h-4 w-4 text-amber-500" />}
                  </span>
                </div>
                <div className="mt-1.5 flex h-2.5 gap-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.weight, 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08 }}
                    className="h-full rounded-full bg-slate-300 dark:bg-slate-600"
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.current, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400"
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 flex items-center gap-5 text-[11px] font-semibold text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Target weight</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Current weight</span>
          <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">92% overall coverage ✓</span>
        </div>
      </ChartCard>
    </div>
  )
}

export { ExamBuilder }
export default ExamBuilder
