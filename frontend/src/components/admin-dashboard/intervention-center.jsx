/**
 * MediXO EduX — Institution Command Center · Section 5: Student Intervention
 * Center. Groups derived student risk into CRITICAL / NEEDS ATTENTION /
 * IMPROVING buckets. Each intervention communicates WHAT · WHY · PRIORITY ·
 * RECOMMENDED ACTION. Uses existing mock student identities only.
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, CheckCircle2, Users } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button } from '@/components/ui'
import { WorkspaceSection } from '@/components/teaching-workspace/shared'

function InterventionCard({ icon: Icon, tone, title, why, action, priority, toneCls, iconCls }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{title}</p>
            <Badge variant={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'success'} size="sm">{priority}</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-600 dark:text-slate-300">Why:</span> {why}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-600 dark:text-slate-300">Recommended:</span> {action}</p>
        </div>
      </div>
    </div>
  )
}

function InterventionCenter({ data }) {
  const students = data.derived.students ?? {}
  const interventions = data.derived.interventions?.list ?? []
  const attendanceRisk = students.attendanceRisk ?? []

  /* CRITICAL — attendance floor breaches (why: attendance is the strongest
     performance signal; risk of academic decline). */
  const critical = attendanceRisk
    .filter((s) => s.attendance < 75)
    .map((s) => ({
      title: `${s.name} — attendance risk`, roll: s.roll,
      why: `Attendance at ${s.attendance}% — below the 75% floor after ${s.classesMissed} missed classes.`,
      action: 'Mentor review + attendance contract with weekly check-ins.',
      priority: 'Critical', tone: 'danger',
    }))

  /* NEEDS ATTENTION — flagged cohort + assessment/attendance interventions. */
  const needsAttention = [
    ...attendanceRisk
      .filter((s) => s.attendance >= 75 && s.attendance < 85)
      .slice(0, 3)
      .map((s) => ({
        title: `${s.name} — attendance watch`, roll: s.roll,
        why: `Attendance ${s.attendance}% — trending toward the floor (${s.classesMissed} missed).`,
        action: 'Targeted reminder + attendance review at next HOD meeting.',
        priority: 'Needs attention', tone: 'warning',
      })),
    ...interventions.slice(1, 4).map((i) => ({
      title: i.category === 'Assessment' ? 'Assessment readiness risk' : `${i.category} intervention`,
      why: i.reason,
      action: i.action,
      priority: 'Needs attention', tone: 'warning',
    })),
  ].slice(0, 4)

  /* IMPROVING — recovery evidence from the intervention pipeline. */
  const improving = [
    {
      title: 'Cohort at-risk reduction', 
      why: `At-risk rate down from ${students.riskSummary?.firstRate ?? '—'}% to ${students.riskSummary?.latestRate ?? '—'}% (${students.riskSummary?.trendReduction ?? 0}% reduction) — interventions are working.`,
      action: 'Sustain weekly reviews; escalate top 10% to counsellors.',
      priority: 'Improving', tone: 'success',
    },
    {
      title: 'Student recovery pipeline',
      why: `${students.totals?.improvingStudents ?? '—'} students recovered of ${students.totals?.flagged ?? '—'} flagged (${students.totals?.recoveryRate ?? '—'}% recovery rate in ${students.totals?.avgWeeksToRecover ?? '—'} weeks on average).`,
      action: 'Continue the mentor-led recovery programme.',
      priority: 'Improving', tone: 'success',
    },
  ]

  const Group = ({ label, items, icon: Icon, accent }) => (
    <div>
      <p className={`mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${accent}`}>
        <Icon className="h-3.5 w-3.5" /> {label} · {items.length}
      </p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div key={`${label}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <InterventionCard {...item} icon={Icon} />
          </motion.div>
        ))}
      </div>
    </div>
  )

  return (
    <WorkspaceSection title="Student Intervention Center" subtitle="Institution-level risk roll-up — what needs management attention right now" icon={Users}>
      <ChartCard className="p-0">
        <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-3">
          <Group label="Critical" items={critical} icon={AlertTriangle} accent="text-rose-500" />
          <Group label="Needs attention" items={needsAttention} icon={AlertTriangle} accent="text-amber-500" />
          <Group label="Improving" items={improving} icon={CheckCircle2} accent="text-emerald-500" />
        </div>
      </ChartCard>
      <div className="mt-3 flex justify-end">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/performance">Full risk register <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
    </WorkspaceSection>
  )
}

export { InterventionCenter }
export default InterventionCenter
