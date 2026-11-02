/**
 * Institutional Reports · Tab 5: Report Library.
 * Generated reports come from PostgreSQL (`generated_reports`). Download is
 * only available while generationStatus is READY.
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, Eye, FileBarChart, Heart, PencilLine, Printer, Star, Trash2 } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { formatDate } from '@/utils/format'
import { useDeleteAdminReport } from '@/services/extra'

const LIBRARY_KEY = 'EduX_admin_report_library'

function ReportLibraryTab({ items: remoteItems, onView, onExport, onPrint }) {
  const toast = useToast()
  const [items, setItems] = useState(remoteItems ?? [])
  const [renaming, setRenaming] = useState(null)
  const [name, setName] = useState('')
  const del = useDeleteAdminReport()

  useEffect(() => {
    setItems(remoteItems ?? [])
  }, [remoteItems])

  const remove = async (item) => {
    try {
      await del.mutateAsync(item.id)
      setItems((prev) => prev.filter((x) => x.id !== item.id))
      toast.success('Report deleted', `${item.title || item.name} removed.`)
    } catch (err) {
      toast.error('Delete failed', err?.response?.data?.detail || 'Could not delete report.')
    }
  }

  const favorite = (item) => {
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, favorite: !x.favorite } : x)))
  }

  const submitRename = () => {
    if (!name.trim()) return
    setItems((prev) => prev.map((x) => (x.id === renaming.id ? { ...x, title: name.trim(), name: name.trim() } : x)))
    toast.info('Rename is local', 'Report titles in storage stay as generated.')
    setRenaming(null)
  }

  return (
    <div>
      {items.length === 0 ? (
        <EmptyState
          icon={FileBarChart}
          title="Report library is empty"
          description="Generate a report and save it — it will appear here for viewing and download when READY."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item, i) => {
            const title = item.title || item.name
            return (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{title}</p>
                        {item.favorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" size="sm">{item.type}</Badge>
                        <Badge variant="outline" size="sm">{item.period}</Badge>
                        <Badge variant={item.generationStatus === 'READY' ? 'success' : 'warning'} size="sm">{item.status || item.generationStatus}</Badge>
                        <span className="text-[10.5px] text-slate-400">generated {formatDate(item.generated || item.generatedAt, 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <Button size="sm" className="flex-1" onClick={() => onView(item)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRenaming(item); setName(title) }}><PencilLine className="h-3.5 w-3.5" /> Rename</Button>
                    <Button size="sm" variant="ghost" onClick={() => favorite(item)}><Heart className={`h-3.5 w-3.5 ${item.favorite ? 'fill-rose-500 text-rose-500' : ''}`} /></Button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => onExport('pdf', item)} disabled={!item.downloadable}><Download className="h-3.5 w-3.5" /> PDF</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => onPrint(item)}><Printer className="h-3.5 w-3.5" /> Print</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => remove(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename report</DialogTitle>
            <DialogDescription>Local label only — the stored PDF title is unchanged.</DialogDescription>
          </DialogHeader>
          <Field label="Report name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button onClick={submitRename} disabled={!name.trim()}><PencilLine className="h-4 w-4" /> Save name</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ReportLibraryTab, LIBRARY_KEY }
export default ReportLibraryTab
