import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BookOpen, Download, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAdminStudents, useCreateAdminStudent } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, useToast } from '@/components/ui'

function familyToken(value) {
  const label = String(value || '').toUpperCase()
  if (label.includes('NEET')) return 'NEET'
  if (label.includes('JEE')) return 'JEE'
  return ''
}

function familiesOf(s) {
  const listed = Array.isArray(s.examFamilies) ? s.examFamilies : []
  const tokens = listed.map(familyToken).filter(Boolean)
  const one = familyToken(s.batchType || s.examFamily)
  if (one && !tokens.includes(one)) tokens.unshift(one)
  return tokens
}

function Students() {
  const { data, isLoading, isError, refetch } = useAdminStudents()
  const navigate = useNavigate()
  const [batch, setBatch] = useState('All')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ name: '', roll: '', email: '' })
  const createStudent = useCreateAdminStudent()
  const toast = useToast()

  const roster = (data?.students ?? []).filter((s) => {
    if (batch === 'All') return true
    if (batch === 'JEE' || batch === 'NEET') return familiesOf(s).includes(batch)
    return s.status === batch
  })
  const totalStudents = data?.total ?? data?.students?.length ?? roster.length
  const jeeCount = data?.totals?.JEE ?? (data?.students ?? []).filter((s) => familiesOf(s).includes('JEE')).length
  const neetCount = data?.totals?.NEET ?? (data?.students ?? []).filter((s) => familiesOf(s).includes('NEET')).length
  const chipCount = { All: totalStudents, JEE: jeeCount, NEET: neetCount }

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Student',
      sortable: true,
      render: (s) => (
        <button type="button" className="text-left" onClick={() => navigate(`/admin/students/${s.id}`)}>
          <p className="font-semibold text-slate-800 hover:text-indigo-700 dark:text-slate-100">{s.name}</p>
          <p className="text-[11px] text-slate-400">{s.roll}</p>
        </button>
      ),
    },
    {
      key: 'batchType',
      label: 'Batch',
      render: (s) => {
        const type = familiesOf(s)[0]
        if (!type && !s.batch) return <span className="text-slate-400">—</span>
        return (
          <div className="flex flex-col gap-0.5">
            {type ? (
              <Badge variant={type === 'JEE' ? 'info' : type === 'NEET' ? 'success' : 'warning'}>{type}</Badge>
            ) : null}
            {s.batch ? <span className="text-[11px] text-slate-400">{s.batch}</span> : null}
          </div>
        )
      },
    },
    {
      key: 'examsCompleted',
      label: 'Exams',
      sortable: true,
      render: (s) => <span className="font-semibold text-slate-700 dark:text-slate-200">{s.examsCompleted ?? 0}</span>,
    },
    {
      key: 'latestAccuracy',
      label: 'Accuracy',
      sortable: true,
      render: (s) => (
        s.latestAccuracy == null
          ? <span className="text-slate-400">—</span>
          : <span className={`font-semibold ${s.latestAccuracy >= 75 ? 'text-emerald-600' : s.latestAccuracy >= 55 ? 'text-amber-600' : 'text-rose-500'}`}>{s.latestAccuracy}%</span>
      ),
    },
    {
      key: 'analysisStatus',
      label: 'Analysis',
      render: (s) => (
        <Badge variant={s.analysisStatus === 'Ready' ? 'success' : 'secondary'}>
          {s.analysisStatus === 'Ready' ? 'AI analysis ready' : 'No exams'}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (s) => <Badge variant={s.status === 'Excellent' ? 'success' : s.status === 'Good' ? 'info' : s.status === 'At Risk' ? 'danger' : 'secondary'}>{s.status}</Badge>,
    },
    {
      key: 'actions',
      label: '',
      render: (s) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => toast.info('Message', `Compose a message to ${s.name}.`)}><Mail className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/students/${s.id}`)} title={`View full analysis for ${s.name}`}><BookOpen className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => toast.info('Permissions', `${s.name} — student role.`)}><ShieldCheck className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ], [toast, navigate])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Students"
        title="Student management"
        description={`${totalStudents.toLocaleString('en-IN')} students across programmes — academic health at a glance, drill into anyone.`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Students' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export unavailable', 'Directory export is not available yet.')}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Link to="/admin/students/similar-issues">
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4" /> Similar Issues
              </Button>
            </Link>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add student
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {['All', 'Excellent', 'Good', 'At Risk', 'JEE', 'NEET'].map((b) => {
          const isActive = batch === b
          let activeClass = 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
          if (isActive && b === 'JEE') activeClass = 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25'
          if (isActive && b === 'NEET') activeClass = 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
          return (
            <button key={b} onClick={() => setBatch(b)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${isActive ? activeClass : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
              {b}{chipCount[b] != null ? ` · ${chipCount[b]}` : ''}
            </button>
          )
        })}
      </div>

      <DataTable
        columns={columns}
        data={roster}
        searchKeys={['name', 'roll']}
        searchPlaceholder="Search students…"
        pageSize={25}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add student</DialogTitle>
            <DialogDescription>New students join via batch upload or individual invitation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="First Last" /></Field>
              <Field label="Roll number" required><Input value={form.roll} onChange={(e) => setForm((f) => ({ ...f, roll: e.target.value }))} placeholder="21CS117" /></Field>
            </div>
            <Field label="Email" required><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="student@institution.edu" /></Field>
            <Field label="Program">
              <Select defaultValue="B.Tech — Computer Science">
                <SelectItem value="B.Tech — Computer Science">B.Tech — Computer Science</SelectItem>
                <SelectItem value="B.Tech — ECE">B.Tech — ECE</SelectItem>
                <SelectItem value="MBA">MBA</SelectItem>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createStudent.mutateAsync({ fullName: form.name, roll: form.roll, email: form.email })
                setInviteOpen(false)
                setForm({ name: '', roll: '', email: '' })
                toast.success('Student added', 'Account persisted for this institution.')
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create student.')
              }
            }}>
              <UserPlus className="h-4 w-4" /> Add student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Students }
export default Students
