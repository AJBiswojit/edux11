import { motion } from 'framer-motion'
import { KeyRound, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAdminRoles } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Button, Card, useToast } from '@/components/ui'

function Roles() {
  const { data, isLoading, isError, refetch } = useAdminRoles()
  const toast = useToast()
  const roles = data?.roles ?? []

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Roles"
        title="Roles & access"
        description="Role-based access across the institution — least privilege by default, escalation when needed."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Roles' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'Custom roles cannot be created from this screen yet.')}>
            <ShieldCheck className="h-4 w-4" /> Create role
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {roles.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${r.color} text-white shadow-lg`}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-3.5 text-[15px] font-bold text-slate-900 dark:text-white">{r.name}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{r.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-300">
                  <Users className="h-3.5 w-3.5" /> {r.members.toLocaleString()} members
                </span>
                <Button size="sm" variant="ghost" onClick={() => toast.success('Permissions', `${r.name} — view the permission matrix.`)}>
                  <KeyRound className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <UserPlus className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Note:</span> Member counts come from live user_roles for this institution. Custom role creation is not operational yet.
        </p>
      </div>
    </div>
  )
}

export { Roles }
export default Roles
