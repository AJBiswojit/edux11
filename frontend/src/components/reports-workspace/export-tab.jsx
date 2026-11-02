/**
 * MediXO EduX — Reports Workspace · Tab 4: Export Center.
 * One-click data exports (question bank, papers, PYQ corpus, cohorts,
 * gradebook) with real derived row counts, export history and share links.
 */

import { FileBarChart, Share2 } from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, Card, useToast } from '@/components/ui'
import { WorkspaceSection, AiInsightCard } from '@/components/teaching-workspace/shared'
import { ReportTypeIcon } from './report-parts'

function ReportsExportTab({ data }) {
  const r = data.derived.reports ?? {}
  const toast = useToast()
  const stats = r.exportStats ?? {}

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} label="Exports run" value={String(stats.total ?? 0)} sub="all time" icon="FileSpreadsheet" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Completed" value={String(stats.completed ?? 0)} sub="successfully exported" icon="CheckCircle2" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Rows moved" value={(stats.rowsExported ?? 0).toLocaleString('en-IN')} sub="questions, papers & students" icon="Database" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Failed" value={String(stats.failed ?? 0)} sub="retry available" icon="AlertTriangle" gradient="from-rose-500 to-red-500" />
      </div>

      {/* Export options */}
      <WorkspaceSection title="Data exports" subtitle="Ship your datasets — XLSX, CSV or JSON" icon={FileBarChart}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {(r.exportOptions ?? []).map((opt, i) => (
            <Card key={opt.id} className="group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-white shadow-md shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                <ReportTypeIcon format={opt.format} />
              </span>
              <p className="mt-3 text-[13.5px] font-bold text-slate-900 dark:text-white">{opt.name}</p>
              <p className="mt-0.5 font-display text-lg font-bold text-indigo-600 dark:text-indigo-400">{opt.rows.toLocaleString('en-IN')} <span className="text-[10px] font-semibold text-slate-400">rows</span></p>
              <p className="text-[10.5px] text-slate-400">{opt.detail}</p>
              <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => toast.success('Export started ⚡', `${opt.name} (${opt.format}, ${opt.rows.toLocaleString('en-IN')} rows) is being prepared.`)}>
                Export {opt.format}
              </Button>
            </Card>
          ))}
        </div>
      </WorkspaceSection>

      {/* Export history */}
      <ChartCard
        title="Export history"
        subtitle="Recent data exports & share links"
        actions={<Badge variant="secondary" size="sm">{r.exportHistory?.length ?? 0} exports</Badge>}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">Export</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Format</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Rows</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Size</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Exported</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">Share</th>
              </tr>
            </thead>
            <tbody>
              {(r.exportHistory ?? []).map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-100">{e.name}</td>
                  <td className="px-4 py-3 text-center"><Badge variant="secondary" size="sm">{e.format}</Badge></td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{(e.rows ?? 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400">{e.size}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={e.status === 'Completed' ? 'success' : 'danger'} size="sm">{e.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">{e.exported}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast.success('Share link copied', `${e.name} (${e.format}) link ready to share.`)}>
                      <Share2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* AI insight */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(r.recommendations ?? []).slice(0, 2).map((rec, i) => (
          <AiInsightCard key={rec.id} index={i} insight={{ id: rec.id, tone: 'neutral', icon: 'sparkles', title: rec.title, body: rec.reason }} />
        ))}
      </div>
    </div>
  )
}

export { ReportsExportTab }
export default ReportsExportTab
