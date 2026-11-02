import { motion } from 'framer-motion'
import { BookOpen, BookMarked, FlaskConical, Handshake, Users, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useFacultyResearch } from '@/services'
import { useCreatePublication } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { ChartCard } from '@/components/shared/chart-card'
import { AreaTrend } from '@/components/charts'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'

function Research() {
  const { data, isLoading, isError, refetch } = useFacultyResearch()
  const { mutateAsync: createPublication, isPending: creating } = useCreatePublication()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', venue: '', year: '' })

  if (isLoading) return <DashboardSkeleton cards={2} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Research"
        title="Research console"
        description="Publications, citations, grants and collaborations — your research life in one place."
        breadcrumbs={[{ label: 'Faculty' }, { label: 'Research' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <FlaskConical className="h-4 w-4" /> Add publication
          </Button>
        }
      />

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: 'Publications', value: String(data.summary.publications), icon: BookOpen, color: '#6366f1' },
          { label: 'Citations', value: String(data.summary.citations), icon: BookMarked, color: '#14b8a6' },
          { label: 'h-index', value: String(data.summary.hIndex), icon: Users, color: '#10b981' },
          { label: 'Active grants', value: String(data.summary.grants), icon: Wallet, color: '#f59e0b' },
          { label: 'PhD students', value: String(data.summary.phdStudents), icon: FlaskConical, color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <s.icon className="h-5 w-5" style={{ color: s.color }} />
            <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[11px] font-medium text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Citations trajectory" subtitle="Annual citations" className="lg:col-span-2">
          <AreaTrend
            data={data.citationsTrend ?? []}
            xKey="year"
            height={230}
            series={[{ key: 'citations', name: 'Citations', color: '#14b8a6' }]}
          />
        </ChartCard>

        <ChartCard title="Collaborations" subtitle="Active research partnerships">
          <div className="space-y-2.5">
            {data.collaborations.map((c) => (
              <div key={c.org} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/10 to-emerald-500/10 text-teal-600 ring-1 ring-teal-500/20 dark:text-teal-300">
                  <Handshake className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{c.org}</p>
                  <p className="text-[11px] text-slate-400">{c.focus} · since {c.since}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Publications</h2>
      <div className="space-y-3">
        {data.publications.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14.5px] font-bold leading-snug text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{p.authors} · {p.venue} · {p.year}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant={p.status === 'Published' ? 'success' : p.status === 'Under Review' ? 'warning' : 'secondary'}>{p.status}</Badge>
                  {p.citations > 0 && <span className="text-[11px] font-bold text-indigo-500">{p.citations} citations</span>}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add publication</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Paper title" /></Field>
            <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Journal or conference" /></Field>
            <Field label="Year"><Input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} placeholder="2026" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={creating} onClick={async () => {
              if (!form.title.trim()) { toast.error('Title required', 'Add a publication title.'); return }
              try {
                const res = await createPublication({ title: form.title.trim(), venue: form.venue, year: form.year ? Number(form.year) : undefined })
                if (res?.ok) {
                  toast.success('Publication saved', res.publication?.title || form.title)
                  setOpen(false)
                  setForm({ title: '', venue: '', year: '' })
                  refetch()
                }
              } catch (e) {
                toast.error('Could not save', e?.response?.data?.detail ?? e?.message ?? 'Please try again.')
              }
            }}>{creating ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <h2 className="mb-4 mt-8 text-[15px] font-bold text-slate-900 dark:text-white">Active grants</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {data.grants.map((g, i) => (
          <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-center justify-between">
                <Wallet className="h-5 w-5 text-emerald-500" />
                <Badge variant="success">{g.status}</Badge>
              </div>
              <h3 className="mt-3 text-[14px] font-bold leading-snug text-slate-900 dark:text-white">{g.title}</h3>
              <p className="mt-1.5 text-[11.5px] text-slate-400">{g.agency}</p>
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">{g.amount}</span>
                <span className="text-[11px] font-medium text-slate-400">{g.period}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

export { Research }
export default Research
