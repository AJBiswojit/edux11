/**
 * MediXO EduX — Faculty Command Center · 8. Students Requiring Attention.
 * Weak students with reason, priority, suggested action, view profile &
 * assign remedial work (prototype) — derived from attentionStudents.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpenCheck, Mail, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Select, SelectItem, useToast } from '@/components/ui'
import { PRIORITY_VARIANT } from '@/constants/ui'

const CATEGORY_BADGE = {
  'Low Attendance': 'warning', 'Weak Performance': 'danger', 'Pending Assignments': 'info',
  'Low Engagement': 'secondary', 'Poor Quiz Results': 'danger', 'Academic Decline': 'warning',
}

function AttentionSection({ data }) {
  const students = data.derived.dashboard?.attention ?? []
  const [remedial, setRemedial] = useState(null)
  const [workType, setWorkType] = useState('practice-set')
  const toast = useToast()

  const assignWork = (e) => {
    e.preventDefault()
    toast.success('Remedial work assigned', `${workType} assigned to ${remedial.name} with a ${remedial.estimatedImprovement} target (prototype).`)
    setRemedial(null)
  }

  return (
    <ChartCard
      title="Students requiring attention"
      subtitle="Weak performance · low attendance · engagement · decline"
      className="h-full"
      actions={
        <Button asChild variant="ghost" size="sm">
          <Link to="/faculty/my-students">All flagged <Users className="h-3.5 w-3.5" /></Link>
        </Button>
      }
    >
      <div className="max-h-[26rem] space-y-2.5 overflow-y-auto overscroll-contain pr-1">
        {students.map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-[11px] font-bold text-white shadow-md">
                  {s.name.split(' ').map((x) => x[0]).join('')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.name} <span className="font-medium text-slate-400">· {s.roll}</span></p>
                  <p className="truncate text-[10.5px] text-slate-400">{s.category} · {s.course}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-base font-bold text-rose-500">{s.risk}%</span>
                <Badge variant={PRIORITY_VARIANT[s.priority] ?? 'secondary'} size="sm">{s.priority}</Badge>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{s.reason}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant={CATEGORY_BADGE[s.category] ?? 'secondary'} size="sm">{s.category}</Badge>
              <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">Expected · {s.estimatedImprovement}</span>
              <div className="ml-auto flex gap-1.5">
                <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                  <Link to="/faculty/my-students"><Users className="h-3 w-3" /> View profile</Link>
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setRemedial(s)}>
                  <BookOpenCheck className="h-3 w-3" /> Remedial work
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
        {students.length === 0 && <p className="py-8 text-center text-xs text-slate-400">No students need attention right now 🎉</p>}
      </div>

      {/* Remedial work dialog (prototype) */}
      <Dialog open={!!remedial} onOpenChange={(o) => !o && setRemedial(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign remedial work — {remedial?.name}</DialogTitle>
            <DialogDescription>Choose a targeted intervention. Expected improvement: {remedial?.estimatedImprovement}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={assignWork} className="space-y-4">
            <Field label="Remedial work type">
              <Select value={workType} onValueChange={setWorkType}>
                <SelectItem value="practice-set">Targeted practice set (auto-graded)</SelectItem>
                <SelectItem value="revision-class">Join revision class + quiz retake</SelectItem>
                <SelectItem value="peer-mentoring">Peer mentoring pair (top performer)</SelectItem>
                <SelectItem value="concept-clinic">Concept clinic session (1:1)</SelectItem>
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRemedial(null)}>Cancel</Button>
              <Button type="submit"><Mail className="h-4 w-4" /> Assign work</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ChartCard>
  )
}

export { AttentionSection }
export default AttentionSection
