import { useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, FileText } from 'lucide-react'
import { useParentAssignments } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Progress, useToast } from '@/components/ui'
import { formatDate, formatRelative } from '@/utils/format'

const STATUS_STYLES = { Pending: 'warning', Upcoming: 'info', Graded: 'success' }

function Assignments() {
  const { data, isLoading, isError, refetch } = useParentAssignments()
  const [filter, setFilter] = useState('All')
  const [detail, setDetail] = useState(null)
  const toast = useToast()
  const items = (data?.items ?? []).filter((a) => filter === 'All' || a.status === filter)

  const pending = (data?.items ?? []).filter((a) => a.status === 'Pending').length

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Ward Progress · Assignments"
        title="Assignments & homework"
        description={`Aarav's workload at a glance — ${pending} pending, everything else graded or scheduled.`}
        breadcrumbs={[{ label: 'Parent' }, { label: 'Assignments' }]}
        actions={<Badge variant={pending > 0 ? 'warning' : 'success'} className="px-3 py-1">{pending} pending now</Badge>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {['All', 'Pending', 'Upcoming', 'Graded'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${filter === f ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-slate-400">{items.length} shown</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="group h-full cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift" onClick={() => setDetail(a)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{a.subject}</p>
                  <h3 className="mt-1 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{a.title}</h3>
                </div>
                <Badge variant={STATUS_STYLES[a.status]}>{a.status}</Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">{a.description}</p>
              <div className="mt-3.5 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-400">
                <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> {a.status === 'Graded' ? `graded ${formatRelative(a.due)}` : `due ${formatDate(a.due, 'MMM d, h:mm a')}`}</span>
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {a.weight} of internals</span>
                <span>· {a.teacher}</span>
              </div>
              {a.status === 'Graded' ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50/70 px-4 py-3 dark:bg-emerald-500/5">
                  <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> {a.score}/{a.maxScore} · Grade {a.grade}
                  </p>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetail(a) }}>View feedback</Button>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>Progress</span><span>{a.progress}%</span></div>
                  <Progress value={a.progress} className="mt-1 h-1.5" />
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
            <DialogDescription>{detail?.subject} · {detail?.teacher} · {detail?.status}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{detail?.description}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
                <p className="text-xs font-bold text-slate-400">Due</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{detail ? formatDate(detail.due, 'MMM d, yyyy') : '—'}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
                <p className="text-xs font-bold text-slate-400">Weight</p>
                <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{detail?.weight}</p>
              </div>
            </div>
            {detail?.status === 'Graded' && detail?.feedback && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Teacher feedback</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{detail.feedback}</p>
              </div>
            )}
            {detail?.status !== 'Graded' && (
              <div className="rounded-2xl bg-indigo-50/60 p-4 text-[12.5px] leading-relaxed text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
                <span className="font-bold">AI tip for you:</span> the planner has scheduled {detail?.progress ? 'remaining' : ''} sessions to finish this comfortably before the deadline — no need to intervene unless Aarav asks.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            {detail?.status !== 'Graded' && (
              <Button onClick={() => { toast.success('Reminder set', 'A gentle nudge will reach Aarav before the deadline.'); setDetail(null) }}>
                Set gentle reminder
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Assignments }
export default Assignments
