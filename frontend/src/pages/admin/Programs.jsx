import { motion } from 'framer-motion'
import { GraduationCap, Plus, Table2, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminPrograms, useCreateAdminProgram } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, useToast } from '@/components/ui'
import { useState } from 'react'

function Programs() {
  const { data, isLoading, isError, refetch } = useAdminPrograms()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ examFamily: 'JEE', name: '' })
  const createProgram = useCreateAdminProgram()
  const toast = useToast()
  const programs = data?.programs ?? []

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Programs"
        title="Exam programs"
        description="JEE and NEET tracks for this institution — open a program to see the official result sheet."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Programs' }]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New program
          </Button>
        }
      />

      {programs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">No JEE or NEET programs yet. Create one to organise batches and subjects.</Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {programs.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-lg shadow-indigo-500/25 transition-transform duration-300 group-hover:scale-110">
                    <GraduationCap className="h-5 w-5" />
                  </span>
                  <Badge variant={p.examFamily === 'NEET' ? 'success' : 'warning'}>{p.examFamily || p.code || 'Exam'}</Badge>
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{p.name}</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-400">{p.batches ?? 0} batches</p>
                <div className="mt-4 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-800/60">
                  <p className="flex items-center justify-center gap-1 text-sm font-bold text-slate-800 dark:text-white">
                    <Users className="h-3 w-3 text-indigo-500" /> {(p.students ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400">Students</p>
                </div>
                <Button asChild size="sm" className="mt-4 w-full">
                  <Link to={`/admin/programs/${p.id}/results`}>
                    <Table2 className="h-3.5 w-3.5" /> View results
                  </Link>
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New exam program</DialogTitle>
            <DialogDescription>Add a JEE or NEET track for this institution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <Field label="Display name">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={form.examFamily === 'NEET' ? 'NEET (UG)' : 'JEE (Main & Advanced)'}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const name = form.name.trim() || (form.examFamily === 'NEET' ? 'NEET (UG)' : 'JEE (Main & Advanced)')
              try {
                await createProgram.mutateAsync({ name, code: form.examFamily, examFamily: form.examFamily, degreeType: form.examFamily })
                setOpen(false)
                setForm({ examFamily: 'JEE', name: '' })
                toast.success('Program created', `${form.examFamily} track saved.`)
              } catch (err) {
                toast.error('Create failed', err?.response?.data?.detail || 'Could not create program.')
              }
            }}>Create program</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Programs }
export default Programs
