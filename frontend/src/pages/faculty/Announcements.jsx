import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, CalendarDays, FileText, Megaphone, Pin, Plus, Send } from 'lucide-react'
import { useFacultyAnnouncements } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Textarea, useToast } from '@/components/ui'
import { formatDate } from '@/utils/format'

function Announcements() {
  const { data, isLoading, isError, refetch } = useFacultyAnnouncements()
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const items = data?.items ?? []
  const sorted = [...items].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Teaching · Announcements"
        title="Announcements"
        description="Broadcast to sections or the whole department — students see these instantly in their portal."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Announcements' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New announcement
          </Button>
        }
      />

      <div className="mx-auto max-w-3xl space-y-4">
        {sorted.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={`p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${a.pinned ? 'border-indigo-200/70 dark:border-indigo-500/30' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${a.pinned ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300'}`}>
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{a.title}</h3>
                      {a.pinned && <Badge variant="info" size="sm"><Pin className="h-3 w-3" /> Pinned</Badge>}
                    </div>
                    <p className="mt-0.5 text-[11.5px] font-medium text-slate-400">
                      {a.audience} · {formatDate(a.date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => toast.success('Announcement edited', 'Changes saved.')}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success('Sent', 'Push + email delivered to students.')}>
                    <Send className="h-3.5 w-3.5" /> Re-send
                  </Button>
                </div>
              </div>
              <p className="mt-3.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">{a.body}</p>
              {a.attachments.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {a.attachments.map((att) => (
                    <span key={att} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <FileText className="h-3 w-3" /> {att}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-indigo-500" /> New announcement</DialogTitle>
            <DialogDescription>Students receive push + email within seconds of publishing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Title" required>
              <Input placeholder="e.g. Midsem revision session — Saturday 10 AM" />
            </Field>
            <Field label="Audience">
              <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                <option>All sections — CS501</option><option>Sec A — CS501</option><option>Sec B — CS503</option><option>All CSE department</option>
              </select>
            </Field>
            <Field label="Message" required>
              <Textarea rows={4} placeholder="Write the announcement…" />
            </Field>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 p-3.5 text-xs text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
              <CalendarDays className="h-4 w-4 shrink-0" /> Optionally schedule — otherwise it publishes now.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setOpen(false); toast.success('Announcement published 📣', 'Students have been notified.') }}>
              <Send className="h-4 w-4" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Announcements }
export default Announcements
