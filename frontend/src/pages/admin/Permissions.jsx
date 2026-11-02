import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, KeyRound, Minus } from 'lucide-react'
import { useAdminPermissions } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'

const SHORT = { admin: 'Admin', hod: 'HOD', faculty: 'Faculty', student: 'Student', parent: 'Parent' }

function Permissions() {
  const { data, isLoading, isError, refetch } = useAdminPermissions()
  const [matrix, setMatrix] = useState(null)
  const toast = useToast()
  const modules = matrix ?? data?.modules ?? []

  const toggle = (mi, role) => {
    const next = modules.map((m, i) => {
      if (i !== mi) return m
      const perms = m[role] ?? []
      const has = perms.includes('read')
      return { ...m, [role]: has ? [] : ['read'] }
    })
    setMatrix(next)
  }

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Permissions"
        title="Permission matrix"
        description="Granular capability control per module and role. Changes take effect instantly and are audit-logged."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Permissions' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'Permission updates cannot be saved yet.')}>
            <KeyRound className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Module</th>
                {Object.keys(SHORT).map((r) => (
                  <th key={r} className="px-3 py-4 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">{SHORT[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m, mi) => (
                <motion.tr key={m.module} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: mi * 0.03 }} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{m.module}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {(m.admin ?? []).length > 0 && `Full: ${m.admin.join(', ')}`}
                    </p>
                  </td>
                  {Object.keys(SHORT).map((role) => {
                    const perms = m[role] ?? []
                    const enabled = perms.includes('read')
                    const extra = perms.filter((p) => p !== 'read').length
                    return (
                      <td key={role} className="px-3 py-4 text-center">
                        <button
                          onClick={() => toggle(mi, role)}
                          className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-200 ${
                            enabled
                              ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                              : 'bg-slate-100 text-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-600'
                          }`}
                          aria-label={`Toggle ${SHORT[role]} access for ${m.module}`}
                        >
                          {enabled ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {extra > 0 && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500 px-1 text-[8px] font-bold text-white">
                              +{extra}
                            </span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-400">
        <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white"><Check className="h-3 w-3" /></span> Read access</span>
        <span className="flex items-center gap-1.5"><Badge variant="secondary" size="sm">+N</Badge> Extended capabilities</span>
        <span className="flex items-center gap-1.5"><Minus className="h-4 w-4 text-slate-300" /> No access</span>
        <span className="ml-auto">Tip: click any cell to toggle read access instantly.</span>
      </div>
    </div>
  )
}

export { Permissions }
export default Permissions
