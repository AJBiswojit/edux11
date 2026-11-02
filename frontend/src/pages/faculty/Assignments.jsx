import { useState } from 'react'
import { motion } from 'framer-motion'
import { FilePlus2, GraduationCap, Sparkles, Users } from 'lucide-react'
import {
  useFacultyAssignments,
  useFacultyRoster,
  useCreateFacultyAssignment,
  useGradeFacultyAssignment,
  usePublishFacultyAssignment,
} from '@/services'
import { useFacultyCourses } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import {
  Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  Field, Input, Progress, Select, SelectItem, useToast,
} from '@/components/ui'

function Assignments() {
  const { data, isLoading, isError, refetch } = useFacultyAssignments()
  const { data: coursesData } = useFacultyCourses()
  const { data: rosterData } = useFacultyRoster()
  const { mutateAsync: createAssignment, isPending: creating } = useCreateFacultyAssignment()
  const { mutateAsync: gradeAssignment, isPending: grading } = useGradeFacultyAssignment()
  const { mutateAsync: publishAssignment, isPending: publishing } = usePublishFacultyAssignment()
  const toast = useToast()
  const items = data?.items ?? []
  const courses = coursesData?.items ?? []
  const roster = rosterData?.students ?? []

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', courseId: '', dueAt: '', maxMarks: '100' })
  const [gradingItem, setGradingItem] = useState(null)
  const [gradeForm, setGradeForm] = useState({ studentId: '', marks: '', feedback: '' })

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const submitCreate = async () => {
    if (!form.title.trim()) {
      toast.error('Title required', 'Give the assignment a name before saving.')
      return
    }
    try {
      const res = await createAssignment({
        title: form.title.trim(),
        courseId: form.courseId || undefined,
        dueAt: form.dueAt || undefined,
        maxMarks: Number(form.maxMarks) || 100,
      })
      if (res?.ok) {
        toast.success('Assignment created', `"${res.assignment?.title || form.title}" is now in the live assignment list.`)
        setCreateOpen(false)
        setForm({ title: '', courseId: '', dueAt: '', maxMarks: '100' })
      }
    } catch (e) {
      toast.error('Could not create assignment', e?.response?.data?.detail ?? e?.message ?? 'Please try again.')
    }
  }

  const submitGrade = async () => {
    if (!gradingItem?.id || !gradeForm.studentId) {
      toast.error('Student required', 'Choose a student to grade.')
      return
    }
    try {
      const res = await gradeAssignment({
        assignmentId: gradingItem.id,
        studentId: gradeForm.studentId,
        marks: gradeForm.marks === '' ? undefined : Number(gradeForm.marks),
        feedback: gradeForm.feedback || undefined,
      })
      if (res?.ok) {
        toast.success('Grade saved', `${res.submission?.marks ?? gradeForm.marks} recorded for this submission.`)
        setGradingItem(null)
        setGradeForm({ studentId: '', marks: '', feedback: '' })
      }
    } catch (e) {
      toast.error('Could not grade', e?.response?.data?.detail ?? e?.message ?? 'Please try again.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Assignments"
        title="Assignments & grading"
        description="Create, track and grade — with AI pre-grading that gives you a first pass on every submission."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Assignments' }]}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <FilePlus2 className="h-4 w-4" /> Create assignment
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((a, i) => {
          const pct = a.total ? Math.round((a.submissions / a.total) * 100) : 0
          const gradedPct = a.submissions ? Math.round((a.graded / a.submissions) * 100) : 0
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">{a.course || '—'}</p>
                    <h3 className="mt-1.5 text-[16px] font-bold leading-snug text-slate-900 dark:text-white">{a.title}</h3>
                  </div>
                  <Badge variant={a.status === 'Open' ? 'warning' : 'success'}>{a.status}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2.5">
                  <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                    <p className="font-display text-lg font-bold text-slate-800 dark:text-white">{a.submissions}/{a.total}</p>
                    <p className="text-[10px] font-medium text-slate-400">Submitted</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                    <p className="font-display text-lg font-bold text-slate-800 dark:text-white">{a.graded}</p>
                    <p className="text-[10px] font-medium text-slate-400">Graded</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                    <p className="font-display text-lg font-bold text-slate-800 dark:text-white">{a.maxScore ?? '—'}</p>
                    <p className="text-[10px] font-medium text-slate-400">Max marks</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                    <span>Submission rate</span><span>{pct}%</span>
                  </div>
                  <Progress value={pct} className="mt-1.5" />
                </div>
                {a.submissions > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>Grading progress</span><span>{gradedPct}%</span>
                    </div>
                    <Progress value={gradedPct} className="mt-1.5" gradient="from-emerald-500 to-teal-400" />
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-indigo-50/60 p-3 dark:bg-indigo-500/5">
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {a.status === 'Open' ? `Due ${a.due || '—'} · ${Math.max((a.total || 0) - (a.submissions || 0), 0)} pending` : 'Ready to review'}
                  </p>
                  {a.lifecycleStatus === 'draft' ? (
                    <Button size="sm" variant="outline" disabled={publishing} onClick={async () => {
                      try {
                        const res = await publishAssignment(a.id)
                        if (res?.ok) toast.success('Published', `"${a.title}" is now visible to enrolled students.`)
                      } catch (e) {
                        toast.error('Could not publish', e?.response?.data?.detail ?? e?.message ?? 'Publish failed.')
                      }
                    }}>
                      Publish
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => { setGradingItem(a); setGradeForm({ studentId: roster[0]?.id || '', marks: '', feedback: '' }) }}>
                      <GraduationCap className="h-3.5 w-3.5" /> Grade
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {!items.length && (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No assignments yet</p>
          <p className="mt-1 text-xs text-slate-400">Create one to persist it for enrolled students.</p>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Grading:</span> marks are stored on the submission row. Students see the grade after you save.
        </p>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
            <DialogDescription>Saved to the assignments table and visible to enrolled students.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Week 4 problem set" /></Field>
            <Field label="Course">
              <Select value={form.courseId || '__none'} onValueChange={(v) => setForm((f) => ({ ...f, courseId: v === '__none' ? '' : v }))}>
                <SelectItem value="__none">No course</SelectItem>
                {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.code} · {c.title || c.name}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Due"><Input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} /></Field>
            <Field label="Max marks"><Input type="number" value={form.maxMarks} onChange={(e) => setForm((f) => ({ ...f, maxMarks: e.target.value }))} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={creating}>{creating ? 'Saving…' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!gradingItem} onOpenChange={(v) => !v && setGradingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Grade — {gradingItem?.title}</DialogTitle>
            <DialogDescription>Marks persist on the student submission.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Student">
              <Select value={gradeForm.studentId || '__none'} onValueChange={(v) => setGradeForm((f) => ({ ...f, studentId: v === '__none' ? '' : v }))}>
                <SelectItem value="__none">Select student</SelectItem>
                {roster.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.roll}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Marks"><Input type="number" value={gradeForm.marks} onChange={(e) => setGradeForm((f) => ({ ...f, marks: e.target.value }))} /></Field>
            <Field label="Feedback"><Input value={gradeForm.feedback} onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingItem(null)}>Cancel</Button>
            <Button onClick={submitGrade} disabled={grading || !roster.length}>{grading ? 'Saving…' : 'Save grade'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Assignments }
export default Assignments
