import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Clock, FilePlus2, FileText, Sparkles, UploadCloud, Rocket } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { useStudentIntelligence } from '@/services/intelligence'
import { useSubmitAssignment, useStudentAssignments } from '@/services'
import { EmptyState } from '@/components/shared/empty-state'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useToast, Textarea, Field } from '@/components/ui'
import { formatDate, formatRelative } from '@/utils/format'

const FILTERS = ['All', 'Pending', 'Submitted', 'Graded', 'Overdue']

const STATUS_VARIANT = {
  Pending: 'warning',
  Upcoming: 'info',
  Graded: 'success',
  Overdue: 'danger',
  Submitted: 'secondary',
  Draft: 'secondary',
}

function normaliseAssignment(a) {
  return {
    id: a.id,
    title: a.title ?? 'Untitled',
    subject: a.subject ?? a.courseTitle ?? a.courseCode ?? a.course ?? '—',
    type: a.type ?? 'Assignment',
    description: a.description ?? '',
    due: a.dueAt ?? a.due ?? null,
    maxScore: a.maxMarks ?? a.maxScore ?? 0,
    weight: a.weight ?? '—',
    status: a.status ?? 'Pending',
    progress: a.progress ?? (a.status === 'Submitted' || a.status === 'Graded' ? 100 : 0),
    score: a.score ?? a.marks ?? null,
    grade: a.grade ?? null,
    feedback: a.feedback ?? null,
  }
}

function Assignments() {
  const { data: apiData, isLoading: apiLoading, isError: apiError, refetch: apiRefetch } = useStudentAssignments()
  const { data: intel, isLoading: intelLoading } = useStudentIntelligence()

  const [filter, setFilter] = useState('All')
  const [submitFor, setSubmitFor] = useState(null)
  const [note, setNote] = useState('')
  const toast = useToast()
  const submitAssignment = useSubmitAssignment()

  const { getRootProps, getInputProps, acceptedFiles } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/zip': ['.zip'], 'text/plain': ['.txt'], 'application/x-python': ['.py'], 'text/markdown': ['.md'] },
    maxFiles: 1,
  })

  const isLoading = apiLoading && intelLoading
  if (isLoading) return <DashboardSkeleton cards={2} />
  if (apiError && !intel) return <ErrorState onRetry={() => apiRefetch()} />

  const rawItems = (apiData?.items?.length ? apiData.items : null)
    ?? (intel?.derived?.university?.assignments?.items ?? [])

  const allItems = rawItems.map(normaliseAssignment)

  const filtered = allItems.filter((a) => {
    if (filter === 'All') return true
    if (filter === 'Pending') return a.status === 'Pending' || a.status === 'Upcoming'
    if (filter === 'Submitted') return a.status === 'Submitted' || a.status === 'Graded'
    return a.status === filter
  })

  const counts = {
    All: allItems.length,
    Pending: allItems.filter((a) => a.status === 'Pending' || a.status === 'Upcoming').length,
    Submitted: allItems.filter((a) => a.status === 'Submitted' || a.status === 'Graded').length,
    Graded: allItems.filter((a) => a.status === 'Graded').length,
    Overdue: allItems.filter((a) => a.status === 'Overdue').length,
  }

  const emptyMsg = {
    All: { title: 'No assignments yet', desc: 'When faculty publish work for your enrolled courses, it will appear here.' },
    Pending: { title: 'No pending assignments', desc: "You're all caught up — nothing left to submit." },
    Submitted: { title: 'No submitted assignments', desc: "You haven't submitted any assignments yet." },
    Graded: { title: 'No graded assignments', desc: 'No graded results yet.' },
    Overdue: { title: 'No overdue assignments', desc: 'Great — nothing is overdue.' },
  }

  return (
    <div>
      {/* Coming Soon — rendered via portal so it's outside the page-transition motion.div */}
      {createPortal(
        <div className="fixed bottom-0 left-0 right-0 top-16 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-md lg:left-[264px]">
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 shadow-2xl shadow-indigo-500/40 ring-4 ring-indigo-500/20">
              <Rocket className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Coming Soon</h2>
          </div>
        </div>,
        document.body
      )}

      <PageHeader
        eyebrow="Academics · Assignments"
        title="Assignments"
        description="Everything due, submitted and graded — with AI-drafted submissions when you need a hand."
        breadcrumbs={[{ label: 'Student' }, { label: 'Assignments' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('New assignment', 'Your faculty will publish assignments here.')}>
            <FilePlus2 className="h-4 w-4" /> New assignment
          </Button>
        }
      />

      {/* Filter tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              filter === f
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {f} <span className="opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyMsg[filter]?.title ?? 'Nothing here'}
          description={emptyMsg[filter]?.desc ?? ''}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{a.subject} · {a.type}</p>
                    <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-slate-900 dark:text-white">{a.title}</h3>
                  </div>
                  <Badge variant={STATUS_VARIANT[a.status]}>{a.status}</Badge>
                </div>

                <p className="mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{a.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                  {a.due && <span className="flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Due {formatDate(a.due, 'MMM d, h:mm a')}</span>}
                  {a.maxScore > 0 && <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {a.maxScore} marks</span>}
                  {a.weight && a.weight !== '—' && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.weight}</span>}
                </div>

                {a.status === 'Graded' ? (
                  <div className="mt-4 rounded-2xl bg-emerald-50/70 p-3.5 dark:bg-emerald-500/5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" /> {a.score ?? '—'}/{a.maxScore} · Grade {a.grade ?? '—'}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400">{formatRelative(a.due)}</span>
                    </div>
                    {a.feedback && <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{a.feedback}</p>}
                  </div>
                ) : a.status === 'Submitted' ? (
                  <div className="mt-4 rounded-2xl bg-indigo-50/70 p-3.5 dark:bg-indigo-500/5">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-indigo-700 dark:text-indigo-300">
                      <CheckCircle2 className="h-4 w-4" /> Submitted — awaiting review
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Progress</span>
                      <span>{a.progress}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${a.progress}%` }} />
                    </div>
                    <div className="mt-4 flex gap-2.5">
                      <Button size="sm" className="flex-1" onClick={() => setSubmitFor(a)}>
                        <UploadCloud className="h-4 w-4" /> Submit work
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => toast.info('Not available yet', 'AI assignment drafting is not available yet.')}>
                        <Sparkles className="h-4 w-4 text-indigo-500" /> AI draft
                      </Button>
                    </div>
                  </>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Submit dialog */}
      <Dialog open={!!submitFor} onOpenChange={(v) => !v && setSubmitFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit — {submitFor?.title}</DialogTitle>
            <DialogDescription>
              Due {submitFor ? formatDate(submitFor.due, 'MMM d, h:mm a') : ''}. Upload your work below — files are checked for plagiarism on the faculty side.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div {...getRootProps()} className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-8 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-500/5">
              <input {...getInputProps()} />
              <UploadCloud className="h-8 w-8 text-indigo-500" />
              <p className="mt-2.5 text-sm font-bold text-slate-700 dark:text-slate-200">
                {acceptedFiles.length ? acceptedFiles[0].name : 'Drag & drop your file'}
              </p>
              <p className="mt-1 text-xs text-slate-400">PDF, ZIP, PY, MD or TXT · max 25 MB</p>
            </div>
            <Field label="Note to faculty (optional)">
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Briefly describe what you've implemented…" />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitFor(null)}>Cancel</Button>
            <Button onClick={async () => {
              if (!submitFor?.id) return
              try {
                await submitAssignment.mutateAsync({
                  id: submitFor.id,
                  files: acceptedFiles.map((f) => f.name),
                  fileName: acceptedFiles[0]?.name,
                  note,
                })
                toast.success('Submitted ✓', `"${submitFor?.title}" is with your faculty.`)
                setSubmitFor(null)
                setNote('')
              } catch (err) {
                const status = err?.response?.status
                if (status === 409) toast.error('Already graded', 'Graded submissions cannot be replaced.')
                else toast.error('Could not submit', 'The assignment was not saved. Try again.')
              }
            }}>
              <UploadCloud className="h-4 w-4" /> Submit assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Assignments }
export default Assignments
