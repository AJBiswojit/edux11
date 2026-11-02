import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, CheckCircle2, Globe, Image, LayoutTemplate, Plus, Send, Settings2 } from 'lucide-react'
import { useAdminCms } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Tabs, TabsContent, TabsList, TabsTrigger, Textarea, useToast } from '@/components/ui'
import { formatRelative } from '@/utils/format'

const PAGE_STATUS = { Published: 'success', Draft: 'secondary', 'In Review': 'warning' }

function Cms() {
  const { data, isLoading, isError, refetch } = useAdminCms()
  const [open, setOpen] = useState(false)
  const toast = useToast()

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · CMS"
        title="Content management"
        description="Website pages, portal banners and institutional announcements — one publishing console."
        breadcrumbs={[{ label: 'Admin' }, { label: 'CMS' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'CMS pages cannot be saved yet.')}>
            <Plus className="h-4 w-4" /> New page
          </Button>
        }
      />

      <Tabs defaultValue="pages">
        <TabsList className="mb-1 flex w-full flex-wrap justify-start sm:w-auto">
          <TabsTrigger value="pages"><Globe className="h-4 w-4" /> Pages</TabsTrigger>
          <TabsTrigger value="banners"><Image className="h-4 w-4" /> Banners</TabsTrigger>
          <TabsTrigger value="announcements"><Bell className="h-4 w-4" /> Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="pages">
          <div className="space-y-3">
            {(data?.pages ?? []).map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                    <LayoutTemplate className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{p.title}</p>
                    <p className="font-mono text-[11px] text-slate-400">{p.slug} · by {p.author} · updated {formatRelative(p.updated)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.views > 0 && <Badge variant="secondary" size="sm">{p.views.toLocaleString()} views</Badge>}
                    <Badge variant={PAGE_STATUS[p.status]}>{p.status}</Badge>
                    <Button size="sm" variant="outline" onClick={() => toast.info('Editor', `Opening ${p.title} in the page editor.`)}>Edit</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="banners">
          <div className="grid gap-4 md:grid-cols-3">
            {(data?.banners ?? []).map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-center justify-between">
                    <Image className="h-5 w-5 text-indigo-500" />
                    <Badge variant={b.status === 'Active' ? 'success' : b.status === 'Scheduled' ? 'info' : 'secondary'}>{b.status}</Badge>
                  </div>
                  <h3 className="mt-3 text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{b.title}</h3>
                  <p className="mt-1 text-[11px] text-slate-400">{b.placement} · ends {b.ends}</p>
                  <p className="mt-2.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-300">{b.clicks.toLocaleString()} clicks</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="announcements">
          <div className="space-y-3">
            {(data?.announcements ?? []).map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-300">
                    <Bell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-slate-900 dark:text-white">{a.title}</p>
                    <p className="text-[11px] text-slate-400">Audience: {a.audience} · {a.date}</p>
                  </div>
                  <Badge variant={a.status === 'Published' ? 'success' : a.status === 'Scheduled' ? 'info' : 'secondary'}>{a.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toast.success('Sent', 'Announcement pushed to the audience.')}>
                    <Send className="h-3.5 w-3.5" /> Push
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-indigo-500" /> New page</DialogTitle>
            <DialogDescription>Publish to the public website or an internal portal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Page title" required><Input placeholder="e.g. Research" /></Field>
            <Field label="Slug"><Input placeholder="/research" /></Field>
            <Field label="Content">
              <Textarea rows={5} placeholder="Start writing… the editor supports rich blocks and images." />
            </Field>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 p-3.5 text-xs text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
              <Settings2 className="h-4 w-4 shrink-0" /> Drafts save automatically; publish with one click after review.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Save draft</Button>
            <Button onClick={() => { setOpen(false); toast.info('Unavailable', 'CMS pages cannot be saved yet.') }}>
              <CheckCircle2 className="h-4 w-4" /> Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Cms }
export default Cms
