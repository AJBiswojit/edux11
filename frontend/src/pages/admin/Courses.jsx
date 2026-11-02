import { useMemo, useState } from 'react'
import { BookOpen, Plus, Users } from 'lucide-react'
import { useAdminCourses } from '@/services'
import { useCreateAdminCourse } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'

const EXAM_FILTERS = ['All', 'JEE', 'NEET']

function Courses() {
  const { data, isLoading, isError, refetch } = useAdminCourses()
  const [exam, setExam] = useState('All')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', examFamily: 'JEE' })
  const toast = useToast()
  const createCourse = useCreateAdminCourse()
  const courses = (data?.courses ?? []).filter((c) => exam === 'All' || c.examFamily === exam)

  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Course',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</p>
            <p className="text-[11px] text-slate-400">{c.code}{c.subject ? ` · ${c.subject}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'examFamily',
      label: 'Exam',
      render: (c) => <Badge variant={c.examFamily === 'NEET' ? 'success' : 'warning'} size="sm">{c.examFamily || '—'}</Badge>,
    },
    { key: 'subject', label: 'Subject', render: (c) => <span className="text-slate-500 dark:text-slate-400">{c.subject || '—'}</span> },
    {
      key: 'enrolled',
      label: 'Students',
      sortable: true,
      render: (c) => (
        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
          <Users className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" /> {c.enrolled ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (c) => <Badge variant={c.status === 'Active' ? 'success' : 'secondary'}>{c.status}</Badge>,
    },
  ], [])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Courses"
        title="Courses"
        description="JEE and NEET course catalogue — grouped by exam and subject."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Courses' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New course
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {EXAM_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setExam(d)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              exam === d
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {d === 'All' ? 'All exams' : d}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={courses}
        searchKeys={['title', 'code', 'subject', 'examFamily']}
        searchPlaceholder="Search courses…"
        pageSize={8}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New course</DialogTitle>
            <DialogDescription>Create a course under JEE or NEET.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Exam">
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
                value={form.examFamily}
                onChange={(e) => setForm((f) => ({ ...f, examFamily: e.target.value }))}
              >
                <option value="JEE">JEE</option>
                <option value="NEET">NEET</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Course code" required>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder={form.examFamily === 'NEET' ? 'NEET-PHY-01' : 'JEE-PHY-01'} />
              </Field>
              <Field label="Course name" required>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Physics — Mechanics" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createCourse.mutateAsync({ code: form.code, name: form.name })
                setOpen(false)
                setForm({ code: '', name: '', examFamily: 'JEE' })
                toast.success('Course created', `${form.code} saved.`)
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create course.')
              }
            }}>Create course</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Courses }
export default Courses
