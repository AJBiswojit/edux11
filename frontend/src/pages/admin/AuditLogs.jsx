import { useMemo, useState } from 'react'
import { Download, ScrollText, Search } from 'lucide-react'
import { useAdminAuditLogs } from '@/services'
import { PageHeader } from '@/components/shared/page-header'
import { DataTable } from '@/components/shared/data-table'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, useToast } from '@/components/ui'

function AuditLogs() {
  const { data, isLoading, isError, refetch } = useAdminAuditLogs()
  const [module, setModule] = useState('All')
  const toast = useToast()
  const logs = (data?.logs ?? []).filter((l) => module === 'All' || l.module === module)

  const columns = useMemo(() => [
    {
      key: 'actor',
      label: 'Actor',
      sortable: true,
      render: (l) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{l.actor}</p>
          <p className="text-[11px] text-slate-400">{l.ip}</p>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (l) => (
        <Badge variant={l.action.includes('FAILED') || l.action === 'DELETE' ? 'danger' : l.action === 'CREATE' ? 'success' : l.action === 'UPDATE' ? 'warning' : 'info'}>
          {l.action}
        </Badge>
      ),
    },
    { key: 'module', label: 'Module', render: (l) => <span className="text-slate-500 dark:text-slate-400">{l.module}</span> },
    {
      key: 'target',
      label: 'Target',
      render: (l) => (
        <span className="block max-w-[280px] truncate text-[12.5px] text-slate-600 dark:text-slate-300" title={l.target}>{l.target}</span>
      ),
    },
    {
      key: 'time',
      label: 'Timestamp',
      sortable: true,
      render: (l) => <span className="whitespace-nowrap text-xs text-slate-400">{l.time}</span>,
    },
    {
      key: 'result',
      label: 'Result',
      render: (l) => <Badge variant={l.result === 'Success' ? 'success' : 'danger'}>{l.result}</Badge>,
    },
  ], [])

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Governance · Audit Logs"
        title="Audit trail"
        description="Every significant action, recorded immutably — who, what, when and from where."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Audit Logs' }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export unavailable', 'Audit export is not available yet.')}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={() => toast.info('Immutable by design', 'Logs are write-once; even admins cannot edit them.')}>
              <ScrollText className="h-4 w-4" /> How it works
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        {['All', 'Auth', 'Users', 'Exams', 'Reports', 'AI Config', 'Infrastructure', 'Roles', 'Admissions', 'Question Bank'].map((m) => (
          <button
            key={m}
            onClick={() => setModule(m)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
              module === m
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={logs}
        searchKeys={['actor', 'target', 'module', 'ip']}
        searchPlaceholder="Search audit trail…"
        pageSize={8}
      />

      <div className="mt-5 flex items-start gap-3 rounded-3xl bg-slate-100/70 p-5 text-[12px] leading-relaxed text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
        <ShieldNote />
        <p>
          Logs are hashed into a daily chain — tampering with any entry invalidates the chain. Retention: 7 years (compliance). Only Super Admins and Auditors (read-only) can view this module.
        </p>
      </div>
    </div>
  )
}

function ShieldNote() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2 4 5v6c0 5.5 3.4 9.7 8 11 4.6-1.3 8-5.5 8-11V5l-8-3Z" strokeLinejoin="round" />
      <path d="m9 11.5 2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export { AuditLogs }
export default AuditLogs
