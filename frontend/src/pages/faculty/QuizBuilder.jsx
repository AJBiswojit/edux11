import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Clock, Plus, Timer, Wand2 } from 'lucide-react'
import { useFacultyQuizBuilder } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, DonutChart } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'

const STATUS_STYLES = { Published: 'success', Scheduled: 'info', Draft: 'secondary' }

function QuizBuilder() {
  const { data, isLoading, isError, refetch } = useFacultyQuizBuilder()
  const [createOpen, setCreateOpen] = useState(false)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Quiz Builder"
        title="Quiz builder"
        description="Create auto-graded quizzes from the question bank in minutes — with analytics after every attempt."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Quiz Builder' }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New quiz
          </Button>
        }
      />

      {/* Quiz list */}
      <div className="grid gap-4 md:grid-cols-2">
        {data.quizzes.map((q, i) => (
          <motion.div key={q.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{q.course}</p>
                  <h3 className="mt-1 text-[15px] font-bold text-slate-900 dark:text-white">{q.title}</h3>
                </div>
                <Badge variant={STATUS_STYLES[q.status]}>{q.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{q.questions}</p>
                  <p className="text-[9px] font-medium text-slate-400">Questions</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-800 dark:text-white"><Timer className="h-3 w-3" />{q.duration}</p>
                  <p className="text-[9px] font-medium text-slate-400">Minutes</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{q.avgScore ?? '—'}</p>
                  <p className="text-[9px] font-medium text-slate-400">Avg score</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{q.participants}</p>
                  <p className="text-[9px] font-medium text-slate-400">Attempts</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-medium text-slate-400">{q.window}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => toast.success('Quiz opened', `Editing ${q.title}.`)}>Edit</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.info('Analytics', q.avgScore ? `Average ${q.avgScore}/10 · completion ${q.completionRate ?? 97}%` : 'No attempts yet.')}>
                  <BarChart3 className="h-3.5 w-3.5" /> Analytics
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Quiz performance" subtitle="Score distribution across published quizzes">
          <BarCompare
            data={data.analytics ?? []}
            xKey="quiz"
            height={240}
            series={[
              { key: 'avgScore', name: 'Average', color: '#6366f1' },
              { key: 'highest', name: 'Highest', color: '#10b981' },
              { key: 'lowest', name: 'Lowest', color: '#f43f5e' },
            ]}
          />
        </ChartCard>

        <ChartCard title="Question difficulty mix" subtitle="AI-tuned to your course level">
          <DonutChart
            data={(data.questionDistribution ?? []).map((d) => ({ name: d.difficulty, value: d.pct, color: d.difficulty === 'Easy' ? '#10b981' : d.difficulty === 'Medium' ? '#6366f1' : '#f43f5e' }))}
            height={240}
            centerLabel="100%"
            centerSub="balance"
          />
        </ChartCard>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-indigo-500" /> Create a quiz</DialogTitle>
            <DialogDescription>Questions are drafted from your bank — you approve before publishing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Course">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                <option>CS501 — DSA</option><option>CS503 — OS</option><option>CS505 — ML</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Questions">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>5 questions</option><option>10 questions</option><option>15 questions</option>
                </select>
              </Field>
              <Field label="Duration (min)">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>8</option><option>15</option><option>20</option><option>30</option>
                </select>
              </Field>
            </div>
            <Field label="Topics (comma separated)">
              <Input placeholder="e.g. Network flows, MST, bipartite matching" />
            </Field>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 p-3.5 text-xs text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
              <Clock className="h-4 w-4 shrink-0" /> Auto-grading, per-question analytics and a student-friendly time limit included.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => { setCreateOpen(false); toast.success('Quiz drafted ✨', '10 questions ready for review.') }}>
              <Wand2 className="h-4 w-4" /> Draft quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { QuizBuilder }
export default QuizBuilder
