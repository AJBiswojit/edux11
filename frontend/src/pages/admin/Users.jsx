import { useState } from 'react'
import { Download, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { useAdminUsers } from '@/services'
import { useInviteAdminUsers, useSetAdminUserStatus } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Avatar, Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Select, SelectItem, useToast } from '@/components/ui'

const STATUS_VARIANT = { Active: 'success', Suspended: 'danger', Invited: 'info', Inactive: 'secondary' }
const ROLE_COLOR = { Student: 'from-indigo-500 to-blue-500', Faculty: 'from-teal-500 to-emerald-500', Parent: 'from-emerald-500 to-lime-500', Admin: 'from-violet-500 to-purple-500' }

function Users() {
  const { data, isLoading, isError, refetch } = useAdminUsers()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteRole, setInviteRole] = useState('student')
  const inviteUsers = useInviteAdminUsers()
  const setStatus = useSetAdminUserStatus()
  const toast = useToast()
  const users = data?.users ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const columns = [
    {
      key: 'name',
      label: 'User',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} size="sm" />
          <div>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{u.name}</p>
            <p className="text-[11px] text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${ROLE_COLOR[u.role] ?? ROLE_COLOR.Student} px-2.5 py-0.5 text-[10px] font-bold text-white`}>
          {u.role}
        </span>
      ),
    },
    { key: 'dept', label: 'Department', sortable: true, render: (u) => <span className="text-slate-500 dark:text-slate-400">{u.dept}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge>,
    },
    {
      key: 'lastActive',
      label: 'Last active',
      render: (u) => <span className="text-xs text-slate-400">{u.lastActive}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (u) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => toast.info('Message', `Compose a message to ${u.name}.`)}><Mail className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            const next = (u.status || '').toLowerCase() === 'active' ? 'inactive' : 'active'
            try {
              await setStatus.mutateAsync({ userId: u.id, status: next })
              toast.success('Status updated', `${u.name} is now ${next}.`)
            } catch (err) {
              toast.error('Update failed', err?.response?.data?.detail || 'Could not change status.')
            }
          }}><ShieldCheck className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Management · Users"
        title="User management"
        description="Every student, faculty member, parent and administrator across the institution."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export unavailable', 'Directory export is not available yet.')}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite users
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        searchKeys={['name', 'email', 'dept', 'role']}
        searchPlaceholder="Search users…"
        pageSize={15}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite users</DialogTitle>
            <DialogDescription>Send an invitation email with role-based access. One per line.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Email addresses" required>
              <textarea value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} rows={3} placeholder="name1@institution.edu&#10;name2@institution.edu" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
            </Field>
            <Field label="Assign role" required>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                const res = await inviteUsers.mutateAsync({ emails: inviteEmails, role: inviteRole })
                setInviteOpen(false)
                setInviteEmails('')
                toast.success('Invitations saved', `${res.count} user(s) created as invited.`)
              } catch (err) {
                toast.error('Invite failed', err?.response?.data?.detail || 'Could not persist invitations.')
              }
            }}>
              <UserPlus className="h-4 w-4" /> Send invitations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Users }
export default Users
