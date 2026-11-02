/**
 * Teaching Intelligence Workspace — Tab 3: Assignments.
 * Assignment pipelines (pending / submitted / late / needs review), average
 * marks, completion trend, high & weak performers, common mistakes, derived
 * AI suggestions and per-assignment actions: review · grade · comment ·
 * archive · duplicate.
 */

import { useState } from 'react'
import { Archive, ClipboardCheck, Copy, FileText, MessageSquare, PencilLine, Users } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare } from '@/components/charts'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Textarea, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'
import { AiInsightCard, WorkspaceSection } from './shared'

const STATUS_VARIANT = { Open: 'info', Graded: 'success' }

function AssignmentsTab({ data }) {
  const aa = data.derived.assignmentAnalytics ?? {}
  const [items, setItems] = useState(aa.items ?? [])
  const [archived, setArchived] = useState([])
  const [reviewing, setReviewing] = useState(null)
  const [commenting, setCommenting] = useState(null)
  const toast = useToast()

  const visible = items.filter((a) => !archived.includes(a.id))
  const archivedItems = items.filter((a) => archived.includes(a.id))

  const submitReview = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    toast.success('Review submitted ✓', `${reviewing.title} — grade ${fd.get('grade')}/100 recorded. Student will be notified (prototype).`)
    setReviewing(null)
  }

  const submitComment = (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    toast.success('Comment added', `Feedback on ${commenting.title} saved and published to the student (prototype).`)
    setCommenting(null)
  }

  const duplicate = (a) => {
    const copy = { ...a, id: `${a.id}_copy`, title: `${a.title} (copy)`, submissions: 0, graded: 0, status: 'Open', avgScore: null, failureRate: null }
    setItems((prev) => [copy, ...prev])
    toast.success('Duplicated', `A draft copy of ${a.title} was created — edit and republish.`)
  }

  const archiveItem = (a) => {
    setArchived((prev) => [...prev, a.id])
    toast.success('Archived', `${a.title} moved to the archive.`)
  }

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard index={0} label="Pending grading" value={String(aa.pendingGrading ?? 0)} sub="submissions to review" icon="ClipboardCheck" gradient="from-amber-500 to-orange-500" />
        <StatCard index={1} label="Submitted" value={String(aa.submitted ?? 0)} sub="across all assignments" icon="CheckCircle2" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Late submissions" value={String(aa.late ?? 0)} sub="flagged for follow-up" icon="Clock" gradient="from-rose-500 to-red-500" />
        <StatCard index={3} label="Needs review" value={String(aa.needsReviewCount ?? 0)} sub="assignments in progress" icon="PencilLine" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={4} label="Average marks" value={aa.avgMarks != null ? `${aa.avgMarks}%` : '—'} sub="graded assignments" icon="Target" gradient="from-violet-500 to-purple-500" />
      </div>

      {/* Completion trend */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Assignment completion trend" subtitle="Submission vs grading rate per assignment">
          <BarCompare
            data={aa.completionTrend ?? []}
            xKey="label"
            height={240}
            series={[
              { key: 'submissionRate', name: 'Submitted %', color: '#6366f1' },
              { key: 'gradedRate', name: 'Graded %', color: '#14b8a6' },
            ]}
            formatter={(v) => `${v}%`}
          />
        </ChartCard>

        <ChartCard title="AI suggestions" subtitle="Derived from submission & grading signals">
          <div className="space-y-3">
            {(aa.suggestions ?? []).slice(0, 4).map((s, i) => <AiInsightCard key={s.id} insight={s} index={i} />)}
            {aa.suggestions?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">All assignments are healthy.</p>}
          </div>
        </ChartCard>
      </div>

      {/* Assignment management */}
      <WorkspaceSection title="Assignment management" subtitle="Review · grade · comment · archive · duplicate" icon={FileText}>
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((a, i) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-bold text-slate-900 dark:text-white">{a.title}</p>
                    <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'} size="sm">{a.status}</Badge>
                    {a.needsReview && <Badge variant="warning" size="sm">{a.pendingGrading} pending</Badge>}
                  </div>
                  <p className="mt-1 text-[11.5px] text-slate-400">{a.course} · published {a.published ? formatDate(a.published, 'MMM d') : '—'} · due {formatDate(a.due, 'MMM d')} · max {a.maxScore} marks</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setReviewing(a)}><PencilLine className="h-3.5 w-3.5" /> Review</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCommenting(a)}><MessageSquare className="h-3.5 w-3.5" /> Comment</Button>
                  <Button size="sm" variant="ghost" onClick={() => duplicate(a)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-rose-500" onClick={() => archiveItem(a)}><Archive className="h-3.5 w-3.5" /> Archive</Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Submitted', value: `${a.submissions}/${a.total}` },
                  { label: 'Graded', value: `${a.graded}` },
                  { label: 'Late', value: `${a.lateCount}` },
                  { label: 'Avg marks', value: a.avgScore != null ? `${a.avgPct}%` : '—' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{s.value}</p>
                    <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${a.submissionRate}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-semibold text-slate-400">
                  <span>{a.submissionRate}% submission rate</span>
                  {a.failureRate != null && <span className={a.failureRate >= 10 ? 'text-rose-500' : 'text-slate-400'}>{a.failureRate}% failure rate</span>}
                </div>
              </div>

              {(a.commonMistakes ?? []).length > 0 && (
                <div className="mt-3.5 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/[0.07]">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Common mistakes</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {a.commonMistakes.map((m) => <Badge key={m} variant="outline" size="sm" className="text-amber-700 dark:text-amber-300">{m}</Badge>)}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {archivedItems.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Archived ({archivedItems.length})</p>
            <div className="flex flex-wrap gap-2">
              {archivedItems.map((a) => (
                <Badge key={a.id} variant="outline" size="sm" className="opacity-70">
                  <Archive className="mr-1 h-3 w-3" /> {a.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </WorkspaceSection>

      {/* Performers */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="High performing students" subtitle="Best class averages across your courses" actions={<Badge variant="success" size="sm">{aa.highPerformers?.length ?? 0}</Badge>}>
          <div className="space-y-2.5">
            {(aa.highPerformers ?? []).map((s) => (
              <div key={s.name} className="flex items-center gap-3 rounded-2xl border border-emerald-100 p-3 dark:border-emerald-500/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">{s.name.split(' ').map((x) => x[0]).join('')}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name}</p>
                  <p className="text-[11px] text-slate-400">attendance {s.attendance}% · trend {s.trend}</p>
                </div>
                <Badge variant="success">{s.avg}%</Badge>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Students needing help" subtitle="Assignment / quiz related flags" actions={<Badge variant="warning" size="sm">{aa.needsHelp?.length ?? 0}</Badge>}>
          <div className="space-y-2.5">
            {(aa.needsHelp ?? []).map((s) => (
              <div key={s.roll} className="flex items-center gap-3 rounded-2xl border border-amber-100 p-3 dark:border-amber-500/20">
                <Users className="h-4 w-4 shrink-0 text-amber-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name} <span className="font-medium text-slate-400">· {s.roll}</span></p>
                  <p className="truncate text-[11px] text-slate-400">{s.reason}</p>
                </div>
                <Badge variant={s.priority === 'Critical' ? 'danger' : s.priority === 'High' ? 'warning' : 'secondary'} size="sm">{s.priority}</Badge>
              </div>
            ))}
            {aa.needsHelp?.length === 0 && <p className="py-6 text-center text-xs text-slate-400">No students flagged on assignments right now.</p>}
          </div>
        </ChartCard>
      </div>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review — {reviewing?.title}</DialogTitle>
            <DialogDescription>
              {reviewing?.course} · {reviewing?.submissions} submitted · {reviewing?.graded} graded · {reviewing?.pendingGrading} pending
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitReview} className="space-y-4">
            <Field label="Grade (0–100)">
              <Input type="number" name="grade" min="0" max="100" defaultValue="80" required />
            </Field>
            <Field label="Comment / feedback">
              <Textarea name="comment" rows={4} placeholder="Personalised feedback for this submission batch…" defaultValue="Good attempt. Revise complexity analysis for graph variants before the midsem." />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setReviewing(null)}>Cancel</Button>
              <Button type="submit"><ClipboardCheck className="h-4 w-4" /> Submit review</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Comment dialog */}
      <Dialog open={!!commenting} onOpenChange={(o) => !o && setCommenting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comment — {commenting?.title}</DialogTitle>
            <DialogDescription>Publish a class-wide or student-scoped note.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitComment} className="space-y-4">
            <Field label="Message">
              <Textarea name="message" rows={4} placeholder="e.g. Attend Friday's doubt session if you scored below 70%…" defaultValue="Reminder: solutions will be discussed in class on Friday. Review your mistakes before then." />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCommenting(null)}>Cancel</Button>
              <Button type="submit"><MessageSquare className="h-4 w-4" /> Post comment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { AssignmentsTab }
export default AssignmentsTab
