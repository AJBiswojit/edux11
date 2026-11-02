import { motion } from 'framer-motion'
import { Award, IndianRupee, Plus } from 'lucide-react'
import { useAdminScholarships } from '@/services/extra'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Progress, useToast } from '@/components/ui'
import { useState } from 'react'

function Scholarships() {
  const { data, isLoading, isError, refetch } = useAdminScholarships()
  const [open, setOpen] = useState(false)
  const toast = useToast()
  const items = data?.items ?? []
  const totalBudget = items.reduce((a, s) => a + (s.budget || 0), 0)
  const gap = data?.unavailable

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  return (
    <div>
      <PageHeader
        eyebrow="Management · Scholarships"
        title="Scholarships & financial aid"
        description={gap ? 'Scholarships are not available yet.' : `${items.length} active schemes · ₹${(totalBudget / 10000000).toFixed(1)} Cr annual budget`}
        breadcrumbs={[{ label: 'Admin' }, { label: 'Scholarships' }]}
        actions={
          <Button size="sm" onClick={() => toast.info('Unavailable', 'Scholarship schemes cannot be saved yet.')}>
            <Plus className="h-4 w-4" /> New scheme
          </Button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((s, i) => {
          const usedPct = Math.round((s.awarded * s.amount) / s.budget * 100)
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="group h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 transition-transform duration-300 group-hover:scale-110">
                    <Award className="h-5 w-5" />
                  </span>
                  <Badge variant={s.status === 'Open' ? 'success' : 'secondary'}>{s.status}</Badge>
                </div>
                <h3 className="mt-3.5 text-[15px] font-bold leading-snug text-slate-900 dark:text-white">{s.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-400">
                  <Badge variant="secondary" size="sm">{s.type}</Badge>
                  <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{s.amount.toLocaleString('en-IN')} / student</span>
                </div>
                <p className="mt-2.5 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                  Eligibility: {s.eligibility}
                </p>
                <div className="mt-3.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Budget utilisation</span><span>{usedPct}% · {s.awarded} awarded</span>
                  </div>
                  <Progress value={usedPct} className="mt-1.5 h-1.5" gradient={usedPct > 90 ? 'from-rose-500 to-red-400' : usedPct > 65 ? 'from-amber-500 to-orange-400' : 'from-emerald-500 to-teal-400'} />
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create scholarship scheme</DialogTitle>
            <DialogDescription>Schemes are reviewed by the Financial Aid Committee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Scheme name" required><Input placeholder="e.g. Academic Excellence — 2027" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount per student (₹)" required><Input type="number" placeholder="25000" /></Field>
              <Field label="Type">
                <select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100">
                  <option>Merit</option><option>Need-based</option><option>Sports</option><option>Research</option><option>Cultural</option>
                </select>
              </Field>
            </div>
            <Field label="Eligibility criteria" required><Input placeholder="e.g. CGPA ≥ 8.0 · family income < ₹8L" /></Field>
            <Field label="Total budget (₹)" required><Input type="number" placeholder="5000000" /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { setOpen(false); toast.info('Unavailable', 'Scholarship schemes cannot be saved yet.') }}>
              <Award className="h-4 w-4" /> Create scheme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { Scholarships }
export default Scholarships
