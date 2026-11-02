/**
 * MediXO EduX — Reports Workspace · shared report components.
 * Report type icons, report cards, preview & delete dialogs shared across
 * the Reports Intelligence tabs.
 */

import { motion } from 'framer-motion'
import { Archive, Download, Eye, FileBarChart, FileSpreadsheet, FileText, Printer, Share2, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

export const FORMAT_ICON = { PDF: FileText, XLSX: FileSpreadsheet, CSV: FileSpreadsheet, JSON: FileBarChart }
export const CATEGORY_STYLES = { Academic: 'info', Students: 'warning', Assessment: 'gradient', Operations: 'secondary' }

export function ReportTypeIcon({ format = 'PDF', className = 'h-5 w-5' }) {
  const Icon = FORMAT_ICON[format] ?? FileText
  return <Icon className={className} />
}

/* ---------- Report card ---------- */
export function ReportCard({ report, index = 0, onView, onDownload, onPrint, onShare, onArchive, onDelete }) {
  const toast = useToast()
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className={`group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${report.archived ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
              <ReportTypeIcon format={report.type} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{report.title}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" size="sm">{report.type}</Badge>
                <Badge variant={CATEGORY_STYLES[report.category] ?? 'secondary'} size="sm">{report.category}</Badge>
                {report.template && <Badge variant="outline" size="sm">{report.template}</Badge>}
                {report.status === 'Processing' && <Badge variant="warning" size="sm">Processing</Badge>}
              </div>
            </div>
          </div>
          <span className="shrink-0 font-display text-lg font-bold text-slate-800 dark:text-white">{report.downloads ?? 0}</span>
        </div>

        {report.summary && (
          <p className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            {report.summary}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px] font-medium text-slate-400">
          <span>{report.scope ?? 'All courses'}</span>
          <span>· {report.period ?? 'Current'}</span>
          <span>· {report.size} · {report.pages ?? '—'} pages</span>
          <span>· generated {formatDate(report.generated, 'MMM d, yyyy')}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {onView && (
            <Button size="sm" className="flex-1" onClick={() => onView(report)}><Eye className="h-3.5 w-3.5" /> View</Button>
          )}
          <Button size="sm" variant="outline" onClick={onDownload ?? (() => toast.success('Downloading…', `${report.title}.${String(report.type).toLowerCase()} is being prepared.`))}>
            <Download className="h-3.5 w-3.5" /> Download
          </Button>
          <Button size="sm" variant="ghost" onClick={onPrint ?? (() => toast.success('Printing…', `${report.title} sent to print.`))}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button size="sm" variant="ghost" onClick={onShare ?? (() => toast.success('Share link copied', `${report.title} link ready to share.`))}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          {onArchive && (
            <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => onArchive(report)}>
              <Archive className="h-3.5 w-3.5" /> {report.archived ? 'Restore' : 'Archive'}
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => onDelete(report)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

/* ---------- Report preview dialog (mock content derived from the foundation) ---------- */
export function ReportPreviewDialog({ open, onOpenChange, report, preview }) {
  const toast = useToast()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" /> {report?.title}
          </DialogTitle>
          <DialogDescription>
            {report?.category} · {report?.type} · {report?.scope} · {report?.period} · generated {report?.generated}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto scrollbar-thin pr-1">
          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 px-4 py-3 ring-1 ring-indigo-500/15">
            <p className="text-[12px] font-bold text-indigo-700 dark:text-indigo-300">{preview?.title ?? report?.template ?? 'Report'} · live preview</p>
            <Badge variant="gradient" size="sm">{preview?.meta ?? 'Watermarked'}</Badge>
          </div>
          {(preview?.sections ?? []).map((s) => (
            <div key={s.title} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{s.title}</p>
              <div className="mt-1.5 space-y-1">
                {(s.lines ?? []).map((l) => (
                  <p key={l} className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{l}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success('Downloading…', `${report?.title}.${String(report?.type).toLowerCase()} is being prepared.`)}><Download className="h-4 w-4" /> Download</Button>
          <Button variant="outline" onClick={() => toast.success('Share link copied', 'Report link ready to share.')}><Share2 className="h-4 w-4" /> Share</Button>
          <Button variant="outline" onClick={() => toast.success('Printing…', `${report?.title} sent to print.`)}><Printer className="h-4 w-4" /> Print</Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- Delete confirmation dialog ---------- */
export function ReportDeleteDialog({ open, onOpenChange, report, onConfirm, deleting = false }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !deleting && onOpenChange?.(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-rose-500" /> Delete report?
          </DialogTitle>
          <DialogDescription>
            This permanently removes <span className="font-bold text-slate-700 dark:text-slate-200">{report?.title}</span> ({report?.id}) from your library. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-[12px] leading-relaxed text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-300">
          {report?.type} · {report?.size} · {report?.pages} pages · {report?.downloads} downloads · generated {report?.generated}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" /> Delete permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReportCard
