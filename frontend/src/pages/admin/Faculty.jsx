import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart2, BookOpen, GraduationCap, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAdminDepartments } from '@/services'
import { useAdminFaculty, useInviteAdminUsers } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Avatar, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, useToast } from '@/components/ui'

function Faculty() {
  const { data: deptData, isLoading: deptLoading, isError: deptError, refetch: refetchDepts } = useAdminDepartments()
  const { data: facultyData, isLoading: facultyLoading, isError: facultyError, refetch: refetchFaculty } = useAdminFaculty()
  const navigate = useNavigate()
  const [dept, setDept] = useState('All')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const inviteUsers = useInviteAdminUsers()
  const toast = useToast()
  const deptCodes = ['All', ...new Set((deptData?.departments ?? []).map((d) => d.code).filter(Boolean))]

  const roster = (facultyData?.faculty ?? []).filter((f) => dept === 'All' || f.dept === dept)

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Faculty',
      sortable: true,
      render: (f) => (
        <div className="flex items-center gap-3">
          <Avatar name={f.name} size="sm" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{f.name}</p>
            <p className="text-[11px] text-slate-400">{f.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'dept', label: 'Dept', render: (f) => <Badge variant="secondary" size="sm">{f.dept}</Badge> },
    { key: 'designation', label: 'Designation', render: (f) => <span className="text-slate-500 dark:text-slate-400">{f.designation}</span> },
    {
      key: 'courses',
      label: 'Courses',
      sortable: true,
      render: (f) => (
        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400"><BookOpen className="h-3.5 w-3.5" /> {f.courses ?? '—'}</span>
      ),
    },
    {
      key: 'students',
      label: 'Students',
      sortable: true,
      render: (f) => (
        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400"><Users className="h-3.5 w-3.5" /> {f.students ?? '—'}</span>
      ),
    },
    {
      key: 'publications',
      label: 'Publications',
      sortable: true,
      render: (f) => <span className="font-semibold text-slate-600 dark:text-slate-300">{f.publications}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (f) => <Badge variant={f.status === 'Active' ? 'success' : 'warning'}>{f.status}</Badge>,
    },
    {
      key: 'actions',
      label: '',
      render: (f) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/faculty/${f.id}`)} title={`View full analysis for ${f.name}`} aria-label={`View full analysis for ${f.name}`}><BarChart2 className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => toast.info('Message', `Compose a message to ${f.name}.`)}><Mail className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => toast.success('Permissions', `${f.name} — faculty role access confirmed.`)}><ShieldCheck className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ], [toast, navigate])

  const totalFaculty = facultyData?.total ?? deptData?.departments?.reduce((a, d) => a + (d.faculty || 0), 0) ?? 0
  const deptCount = deptData?.departments?.length ?? 0

  if (deptLoading || facultyLoading) return <DashboardSkeleton cards={3} />
  if (deptError || facultyError) return <ErrorState onRetry={() => { refetchDepts(); refetchFaculty() }} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Faculty"
        title="Faculty management"
        description={`${totalFaculty} faculty members across ${deptCount} departments — assignments, load and publications.`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Faculty' }]}
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite faculty
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {deptCodes.map((d) => (
          <button key={d} onClick={() => setDept(d)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${dept === d ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
            {d}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={roster}
        searchKeys={['name', 'email', 'designation']}
        searchPlaceholder="Search faculty…"
        pageSize={8}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite faculty</DialogTitle>
            <DialogDescription>Faculty accounts include teaching tools and the AI assistant.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Email addresses" required>
              <textarea rows={3} placeholder="name@institution.edu" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
            </Field>
            <Field label="Department">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                {['CSE', 'ECE', 'ME', 'EE', 'MBA', 'DES'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => { setInviteOpen(false); toast.success('Invitations sent ✉️', 'Faculty onboarding emails dispatched.') }}>
              <GraduationCap className="h-4 w-4" /> Send invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Faculty }
export default Faculty
