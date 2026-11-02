import { motion } from 'framer-motion'
import { Award, CheckCircle2, Circle, Flag, GitBranch, Route as RouteIcon, Sparkles, Target } from 'lucide-react'
import { useLearningPath } from '@/services'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Progress, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

const IMPACT_STYLES = { High: 'danger', Medium: 'warning', Low: 'info' }
const STATUS_STYLES = { Recommended: 'gradient', Planned: 'info', Optional: 'secondary' }

/**
 * AI Learning Path — the dedicated skill-roadmap page. Uses the existing
 * /ai/learning-path endpoint; milestones, recommendations and history.
 */
function LearningPath() {
  const { data, isLoading, isError, refetch } = useLearningPath()
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="AI Learning · Learning Path"
        title="My AI learning path"
        description="A skill roadmap that re-routes itself as you master concepts — built from your goals, exams and weak areas."
        breadcrumbs={[{ label: 'Student' }, { label: 'Learning Path' }]}
        actions={<Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> {data.overall}% complete</Badge>}
      />

      {/* Overview */}
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-7 text-white shadow-lift sm:p-9">
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <RouteIcon className="h-4 w-4" /> Path health
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
              {data.overall}% of your roadmap is complete
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
              {data.nextSteps?.[0]?.reason
                || 'Your learning path fills in from enrolled courses, practice and exam attempts. Nothing is queued yet.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.milestones.slice(0, 3).map((m) => (
                <span key={m.id} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20">
                  🎯 {m.title} — {m.due}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative h-36 w-36">
              <svg className="h-36 w-36 -rotate-90">
                <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="72" cy="72" r="60" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - data.overall / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold">{data.overall}%</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/75">Complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <h2 className="mb-4 flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
        <Target className="h-4 w-4 text-indigo-500" /> Recommended next steps
      </h2>
      {!(data.nextSteps ?? []).length && (
        <EmptyState
          className="mb-6"
          title="No next steps yet"
          description="Complete a class, assignment or exam attempt and the path engine will recommend what to do next."
        />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(data.nextSteps ?? []).map((step, i) => (
          <motion.div key={step.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                  <Flag className="h-5 w-5" />
                </span>
                <Badge variant={STATUS_STYLES[step.status]}>{step.status}</Badge>
              </div>
              <h3 className="mt-3 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{step.reason}</p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3.5 text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-indigo-500" /> {step.effort}</span>
                <Badge variant={IMPACT_STYLES[step.impact]} size="sm">{step.impact} impact</Badge>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toast.info('Not available yet', 'Adding this to your planner is not available yet.')}>
                  Add to planner
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Milestones */}
        <ChartCard title="Milestones" subtitle="Tracked by the path engine">
          <div className="space-y-4">
            {(data.milestones ?? []).map((m, i) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <Award className="h-3.5 w-3.5 text-amber-500" /> {m.title}
                  </span>
                  <span className="font-bold text-slate-500 dark:text-slate-300">{m.progress}% · due {formatDate(m.due, 'MMM d')}</span>
                </div>
                <Progress value={m.progress} className="mt-1.5 h-2" gradient={m.progress >= 80 ? 'from-emerald-500 to-teal-400' : 'from-indigo-500 to-blue-400'} />
              </motion.div>
            ))}
          </div>
        </ChartCard>

        {/* History */}
        <ChartCard title="Path activity" subtitle="How the roadmap evolved">
          <div className="space-y-1">
            {(data.history ?? []).map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3.5 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                  {h.action.includes('re-routed') || h.action.includes('adjusted') ? <GitBranch className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
                    {h.action} <span className="ml-1 text-[10.5px] font-medium text-slate-400">{h.date}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{h.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[11px] font-semibold text-slate-400 dark:bg-slate-800/60">
            <Circle className="h-3 w-3 text-emerald-500" /> Next rebalance: Sunday, weekly — based on your practice data.
          </p>
        </ChartCard>
      </div>
    </div>
  )
}

export { LearningPath }
export default LearningPath
