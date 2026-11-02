import { motion } from 'framer-motion'
import { CalendarClock, FileText, Sparkles } from 'lucide-react'
import { useFacultyLecturePlanner } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Progress, useToast } from '@/components/ui'

function LecturePlanner() {
  const { data, isLoading, isError, refetch } = useFacultyLecturePlanner()
  const toast = useToast()
  const items = data?.items ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Lecture Planner"
        title="Lecture planner"
        description="Plan weeks ahead, attach resources and let AI draft the lesson structure when you need a head start."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Lecture Planner' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('AI draft', 'Pick a topic and the assistant drafts hooks, activities and exit tickets.')}>
            <Sparkles className="h-4 w-4" /> Draft with AI
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${l.status === 'Completed' ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 ring-1 ring-emerald-500/20' : 'bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-600 ring-1 ring-indigo-500/20'}`}>
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{l.week} · {l.date}</p>
                    <p className="text-[12px] font-bold text-indigo-600 dark:text-indigo-300">{l.course}</p>
                  </div>
                </div>
                <Badge variant={l.status === 'Completed' ? 'success' : 'warning'}>{l.status}</Badge>
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{l.topic}</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {l.resources.map((r) => <Badge key={r} variant="outline" size="sm">{r}</Badge>)}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Preparation</span><span>{l.prep}%</span>
                </div>
                <Progress value={l.prep} className="mt-1 h-1.5" gradient={l.status === 'Completed' ? 'from-emerald-500 to-teal-400' : 'from-indigo-500 to-blue-400'} />
              </div>
              {l.status === 'Upcoming' && (
                <Button size="sm" variant="outline" className="mt-4 w-full" onClick={() => toast.success('Lesson drafted ✨', 'Structure, worksheet and exit ticket ready for review.')}>
                  <Sparkles className="h-3.5 w-3.5" /> AI-draft this lecture
                </Button>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Weekly rhythm:</span> every Sunday, MediXO Mentor reviews your completed lectures and proposes next week's plan with the strongest resources from your collection. Approve or adjust in seconds.
        </p>
      </div>
    </div>
  )
}

export { LecturePlanner }
export default LecturePlanner
