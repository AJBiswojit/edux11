/**
 * MediXO EduX — Reports Workspace · Tab 2: Report Library.
 * Every generated report with view / download / print / share / archive /
 * delete, plus filters by status & format and search.
 */

import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { useFacultyReports } from '@/services'
import { useDeleteReport, useArchiveReport, useDownloadReport } from '@/services/extra'
import { StatCard } from '@/components/shared/stat-card'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, useToast } from '@/components/ui'
import { ReportCard, ReportPreviewDialog, ReportDeleteDialog } from './report-parts'
import { buildReportPreview } from '@/intelligence/faculty'

function ReportsLibraryTab({ data }) {
  const { data: reportsData, isLoading, isError, refetch } = useFacultyReports()
  const { mutateAsync: deleteReport } = useDeleteReport()
  const { mutateAsync: archiveReport } = useArchiveReport()
  const { mutateAsync: downloadReport } = useDownloadReport()
  const [filter, setFilter] = useState('All')
  const [format, setFormat] = useState('All')
  const [query, setQuery] = useState('')
  const [previewing, setPreviewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const items = useMemo(() => {
    let rows = reportsData?.items ?? []
    if (filter === 'Archived') rows = rows.filter((r) => r.archived)
    else if (filter !== 'All') rows = rows.filter((r) => r.status === filter && !r.archived)
    else rows = rows.filter((r) => !r.archived)
    if (format !== 'All') rows = rows.filter((r) => r.type === format)
    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter((r) => r.title.toLowerCase().includes(q) || (r.template ?? '').toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q))
    }
    return rows
  }, [reportsData, filter, format, query])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const all = reportsData?.items ?? []
  const previewFor = (report) => {
    const template = (data.derived.reports?.templates ?? []).find((t) => t.name === report.template)
    const preview = buildReportPreview({ template, derived: data.derived })
    return { report, preview }
  }

  const handleArchive = async (report) => {
    try {
      const res = await archiveReport(report.id)
      toast.success(report.archived ? 'Restored' : 'Archived', `${res.report?.title ?? report.title} ${report.archived ? 'restored to the library.' : 'moved to the archive.'}`)
      refetch()
    } catch {
      toast.error('Could not archive', 'Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReport(deleteTarget.id)
      toast.success('Report deleted', `${deleteTarget.title} was permanently removed.`)
      setDeleteTarget(null)
      refetch()
    } catch {
      toast.error('Could not delete', 'Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Reports" value={String(all.length)} sub={`${all.filter((r) => !r.archived).length} active`} icon="FileText" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Total downloads" value={String(all.reduce((a, r) => a + (r.downloads ?? 0), 0))} sub="across the library" icon="Download" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Formats" value={String(new Set(all.map((r) => r.type)).size)} sub="PDF · XLSX · CSV" icon="FileSpreadsheet" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Archived" value={String(all.filter((r) => r.archived).length)} sub="restore anytime" icon="Archive" gradient="from-rose-500 to-red-500" />
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {['All', 'Ready', 'Processing', 'Archived'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${filter === f ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {f}
            <span className="ml-1.5 opacity-60">
              {f === 'All' ? all.filter((r) => !r.archived).length : f === 'Archived' ? all.filter((r) => r.archived).length : all.filter((r) => r.status === f && !r.archived).length}
            </span>
          </button>
        ))}
        {['All', 'PDF', 'XLSX', 'CSV'].map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${format === f ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}
          >
            {f === 'All' ? 'All formats' : f}
          </button>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports…"
          className="ml-auto h-9 w-56 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Library */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((r, i) => (
          <ReportCard
            key={r.id}
            report={r}
            index={i}
            onView={(report) => setPreviewing(previewFor(report))}
            onDownload={async (report) => {
              if (report.generationStatus && report.generationStatus !== 'READY') {
                toast.error('Not ready', 'Download is available only when the report status is READY.')
                return
              }
              try {
                await downloadReport(report)
              } catch {
                toast.error('Could not download', 'The report file is not ready.')
              }
            }}
            onArchive={handleArchive}
            onDelete={setDeleteTarget}
          />
        ))}
      </div>

      {items.length === 0 && (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No reports in this view</p>
          <p className="mt-1 text-xs text-slate-400">Change the filters or generate a new report.</p>
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <Badge variant="gradient" className="mt-0.5 shrink-0">NAAC / NBA</Badge>
        <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          Every report includes methodology notes and evidence links, formatted for accreditation portfolio uploads. Exports are watermarked with your institution's identity.
        </p>
      </div>

      <ReportPreviewDialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
        report={previewing?.report}
        preview={previewing?.preview}
      />
      <ReportDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && !deleting && setDeleteTarget(null)}
        report={deleteTarget}
        onConfirm={handleDelete}
        deleting={deleting}
      />
    </div>
  )
}

export { ReportsLibraryTab }
export default ReportsLibraryTab
