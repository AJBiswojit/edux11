import { motion } from 'framer-motion'
import { GraduationCap, Plus, Users } from 'lucide-react'
import { useAdminBatches, useCreateAdminBatch } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'
import { useState } from 'react'

function Batches() {
  const { data, isLoading, isError, refetch } = useAdminBatches()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', examFamily: 'JEE' })
  const createBatch = useCreateAdminBatch()
  const toast = useToast()
  const batches = data?.batches ?? []

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Batches"
        title="Batch management"
        description="JEE and NEET cohorts — strength and exam family per batch."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Batches' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New batch
          </Button>
        }
      />

      {batches.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">No JEE or NEET batches yet. Create a cohort to get started.</Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {batches.map((b, i) => (
            <motion.div key={b.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <Badge variant={b.examFamily === 'NEET' ? 'success' : 'warning'}>{b.examFamily || b.status || '—'}</Badge>
                </div>
                <h3 className="mt-3.5 font-display text-lg font-bold text-slate-900 dark:text-white">{b.name}</h3>
                <p className="text-[11.5px] font-medium text-slate-400">{b.examFamily ? `${b.examFamily} cohort` : (b.program || 'Exam cohort')}</p>
                <div className="mt-4 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-800 dark:text-white">
                    <Users className="h-3 w-3 text-indigo-500" /> {b.students ?? 0}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400">Students</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create batch</DialogTitle>
            <DialogDescription>Create a JEE or NEET cohort for this exam year.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Batch name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. JEE-2026-A"
              />
            </Field>
            <Field label="Exam">
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
                value={form.examFamily}
                onChange={(e) => setForm((f) => ({ ...f, examFamily: e.target.value }))}
              >
                <option value="JEE">JEE</option>
                <option value="NEET">NEET</option>
              </select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              try {
                await createBatch.mutateAsync({
                  name: form.name,
                  code: form.name,
                  examMode: 'competitive',
                  examFamily: form.examFamily,
                })
                setOpen(false)
                setForm({ name: '', examFamily: 'JEE' })
                toast.success('Batch created', `${form.examFamily} cohort saved.`)
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create batch.')
              }
            }}>Create batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Batches }
export default Batches
