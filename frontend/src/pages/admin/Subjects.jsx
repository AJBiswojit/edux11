import { useMemo, useState } from 'react'
import { BookOpen, Plus } from 'lucide-react'
import { useAdminSubjects, useCreateAdminSubject } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'

const EXAM_FILTERS = ['All', 'JEE', 'NEET']

function Subjects() {
  const { data, isLoading, isError, refetch } = useAdminSubjects()
  const [exam, setExam] = useState('All')
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const createSubject = useCreateAdminSubject()
  const [form, setForm] = useState({ code: '', name: '', examFamily: 'JEE' })
  const subjects = (data?.subjects ?? []).filter((s) => exam === 'All' || s.examFamily === exam)

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Subject',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{s.name}</p>
            <p className="text-[11px] text-slate-400">{s.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'examFamily',
      label: 'Exam',
      render: (s) => <Badge variant={s.examFamily === 'NEET' ? 'success' : 'warning'} size="sm">{s.examFamily || '—'}</Badge>,
    },
    { key: 'chapters', label: 'Chapters', render: (s) => <span className="font-semibold text-slate-700 dark:text-slate-200">{s.chapters ?? 0}</span> },
    { key: 'courses', label: 'Linked courses', render: (s) => <span className="text-slate-500 dark:text-slate-400">{s.courses ?? 0}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (s) => <Badge variant={s.status === 'Active' ? 'success' : 'secondary'}>{s.status}</Badge>,
    },
  ], [])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Subjects"
        title="Subjects"
        description="Physics, Chemistry, Mathematics and Biology for JEE and NEET."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Subjects' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New subject
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {EXAM_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setExam(d)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${exam === d ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {d === 'All' ? 'All exams' : d}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={subjects}
        searchKeys={['name', 'code', 'examFamily']}
        searchPlaceholder="Search subjects…"
        pageSize={8}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New subject</DialogTitle>
            <DialogDescription>Add a JEE or NEET subject such as Physics, Chemistry, Mathematics or Biology.</DialogDescription>
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
              <Field label="Subject code" required>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder={form.examFamily === 'NEET' ? 'NEET-PHY' : 'JEE-PHY'} />
              </Field>
              <Field label="Subject name" required>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Physics" />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createSubject.mutateAsync({
                  code: form.code,
                  name: form.name,
                  examMode: 'competitive',
                  examFamily: form.examFamily,
                })
                setOpen(false)
                setForm({ code: '', name: '', examFamily: 'JEE' })
                toast.success('Subject created', `${form.name} saved for ${form.examFamily}.`)
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create subject.')
              }
            }}>Create subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Subjects }
export default Subjects
