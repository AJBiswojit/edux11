import { motion } from 'framer-motion'
import { ArrowRight, Building2, GraduationCap, Sparkles, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminDepartments } from '@/services'
import { useCreateAdminDepartment } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Button, Card, Progress, useToast } from '@/components/ui'

function Departments() {
  const { data, isLoading, isError, refetch } = useAdminDepartments()
  const createDept = useCreateAdminDepartment()
  const toast = useToast()
  const depts = data?.departments ?? []

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Departments"
        title="Departments"
        description={`${depts.length} departments — headcount, programmes and placement health.`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Departments' }]}
        actions={
          <Button size="sm" onClick={async () => {
            const code = window.prompt('Department code')
            const name = window.prompt('Department name')
            if (!code || !name) return
            try {
              await createDept.mutateAsync({ code, name })
              toast.success('Department created', `${code} saved.`)
            } catch (err) {
              toast.error('Create failed', err?.response?.data?.detail || 'Could not create department.')
            }
          }}>
            <Building2 className="h-4 w-4" /> Add department
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {depts.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{d.code}</p>
                  <h3 className="mt-1 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{d.name}</h3>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                  <Building2 className="h-4 w-4" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-800 dark:text-white"><Users className="h-3 w-3 text-indigo-500" /> {d.students.toLocaleString()}</p>
                  <p className="text-[9px] font-medium text-slate-400">Students</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-800 dark:text-white"><GraduationCap className="h-3 w-3 text-teal-500" /> {d.faculty}</p>
                  <p className="text-[9px] font-medium text-slate-400">Faculty</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60">
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{d.programs}</p>
                  <p className="text-[9px] font-medium text-slate-400">Programmes</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Placement rate</span>
                  <span className={d.placement == null ? 'text-slate-400' : d.placement >= 90 ? 'text-emerald-600 dark:text-emerald-400' : d.placement >= 85 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}>{d.placement == null ? '—' : `${d.placement}%`}</span>
                </div>
                <Progress value={d.placement ?? 0} className="mt-1.5 h-1.5" gradient={d.placement == null ? 'from-slate-300 to-slate-400' : d.placement >= 90 ? 'from-emerald-500 to-teal-400' : d.placement >= 85 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400'} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
                <span className="text-[11px] font-medium text-slate-400">HOD: {d.hod ?? '—'}</span>
                <Link to="/admin/performance" className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400">
                  Analytics <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">Note:</span> Placement rates stay empty until a placements pipeline is operational. Department counts come from live student and faculty records.
        </p>
      </div>
    </div>
  )
}

export { Departments }
export default Departments
