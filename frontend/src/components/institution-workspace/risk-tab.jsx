/**
 * Institution Intelligence Workspace · Tab 8: Risk & Intervention.
 * Unified institutional intervention center across six risk categories.
 * Every intervention carries priority, entity, reason, evidence, action and
 * status. Risk is never communicated by color alone (badges + labels).
 */

import { motion } from 'framer-motion'
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, GraduationCap, Info, Users } from 'lucide-react'
import { Badge, Card } from '@/components/ui'
import { KpiStrip, WorkspaceSection } from './shared'

const CATEGORY_META = {
  'STUDENT RISK': { Icon: Users, dot: '#ef4444' },
  'FACULTY RISK': { Icon: GraduationCap, dot: '#f59e0b' },
  'DEPARTMENT RISK': { Icon: Building2, dot: '#f97316' },
  'ACADEMIC RISK': { Icon: Info, dot: '#3b82f6' },
  'ATTENDANCE RISK': { Icon: AlertTriangle, dot: '#e11d48' },
  'ASSESSMENT RISK': { Icon: ClipboardList, dot: '#8b5cf6' },
}
const LEVEL_VARIANT = { Critical: 'danger', 'Needs Attention': 'warning', Improving: 'success' }

function RiskTab({ data }) {
  const d = data.derived
  const students = d.students ?? {}
  const departments = d.departments ?? {}
  const attendance = d.attendance ?? {}
  const assessments = d.assessments ?? {}
  const faculty = d.faculty ?? {}

  const readiness = assessments.exams?.readiness ?? {}
  const drafting = readiness.drafting ?? 0
  const facultyLowFactor = (faculty.health?.factors ?? []).filter((f) => f.value < 75).sort((a, b) => a.value - b.value)[0]

  /* ---- build interventions across six categories ---- */
  const interventions = []

  /* STUDENT RISK */
  students.attendanceRisk?.filter((s) => s.attendance < 75).forEach((s) => {
    interventions.push({
      category: 'STUDENT RISK', level: 'Critical', entity: `${s.name} (${s.roll})`,
      reason: 'Attendance below the 75% floor — strong predictor of academic decline.',
      evidence: `${s.attendance}% attendance · ${s.classesMissed} classes missed`,
      action: 'Mentor review + attendance contract with weekly check-ins.',
      status: 'Active',
    })
  })
  interventions.push({
    category: 'STUDENT RISK', level: students.riskSummary?.latestRate > 6 ? 'Critical' : 'Needs Attention',
    entity: `Cohort (${students.totals?.totalStudents ?? '—'} students)`,
    reason: 'Institution at-risk rate — early-warning model roll-up.',
    evidence: `${students.riskSummary?.latestRate ?? '—'}% at-risk · ${students.totals?.activeRisk ?? '—'} students · ${students.riskSummary?.trendReduction ?? 0}% reduction this term`,
    action: 'Sustain weekly intervention reviews; escalate top 10% to counsellors.',
    status: students.riskSummary?.trendReduction > 20 ? 'Improving' : 'Active',
  })

  /* FACULTY RISK */
  if (facultyLowFactor) {
    interventions.push({
      category: 'FACULTY RISK', level: 'Needs Attention', entity: 'Faculty (institution)',
      reason: 'A faculty health factor is below the 75 threshold.',
      evidence: `${facultyLowFactor.label} at ${facultyLowFactor.value}/100`,
      action: 'Targeted support for the lowest-scoring faculty factor — review workload and research enablement.',
      status: 'Active',
    })
  }

  /* DEPARTMENT RISK */
  if (departments.worst) {
    interventions.push({
      category: 'DEPARTMENT RISK', level: departments.worst.score < 85 ? 'Critical' : 'Needs Attention',
      entity: departments.worst.name,
      reason: 'Lowest department health score across the institution.',
      evidence: `${departments.worst.score}/100 health · pass ${departments.worst.passRate}% · placement ${departments.worst.placement}%`,
      action: `Schedule a review with HOD ${departments.worst.hod} on pass rate and placement strategy.`,
      status: 'Active',
    })
  }
  if (departments.best) {
    interventions.push({
      category: 'DEPARTMENT RISK', level: 'Improving', entity: departments.best.name,
      reason: 'Leading department health — a positive outlier worth replicating.',
      evidence: `${departments.best.score}/100 health · pass ${departments.best.passRate}% · placement ${departments.best.placement}%`,
      action: 'Share the playbook at the next HOD meeting.',
      status: 'Resolved',
    })
  }

  /* ACADEMIC RISK */
  const retention = d.students?.retention
  if (retention && retention < 90) {
    interventions.push({
      category: 'ACADEMIC RISK', level: 'Needs Attention', entity: 'All programmes',
      reason: 'Retention below the 90% management threshold.',
      evidence: `${retention}% overall retention (2025 intake)`,
      action: 'Review first-year mentorship and academic-support programmes.',
      status: 'Active',
    })
  }

  /* ATTENDANCE RISK */
  if ((attendance.belowThresholdCount ?? 0) > 0) {
    interventions.push({
      category: 'ATTENDANCE RISK', level: 'Critical', entity: `${attendance.worst?.dept ?? '—'} department`,
      reason: 'Students below the 75% attendance floor; lowest department attendance flagged.',
      evidence: `${attendance.belowThresholdCount} students below floor · ${attendance.worst?.dept ?? '—'} at ${attendance.worst?.pct ?? '—'}%`,
      action: 'Trigger attendance reminders + HOD review of flagged sections.',
      status: 'Active',
    })
  }

  /* ASSESSMENT RISK */
  if (drafting > 0) {
    interventions.push({
      category: 'ASSESSMENT RISK', level: 'Needs Attention', entity: 'Midsem examinations (Aug 19–23)',
      reason: 'Exam drafts still in drafting with the midsem window approaching.',
      evidence: `${drafting} drafting · ${readiness.inReview ?? 0} in review · ${readiness.ready ?? 0} ready`,
      action: 'Finalize remaining papers this week to reach 100% readiness.',
      status: 'Active',
    })
  }

  /* Group + sort by level */
  const order = { Critical: 0, 'Needs Attention': 1, Improving: 2 }
  const grouped = Object.keys(CATEGORY_META).map((category) => ({
    category,
    items: interventions.filter((i) => i.category === category).sort((a, b) => order[a.level] - order[b.level]),
  })).filter((g) => g.items.length > 0)

  const counts = {
    Critical: interventions.filter((i) => i.level === 'Critical').length,
    Attention: interventions.filter((i) => i.level === 'Needs Attention').length,
    Improving: interventions.filter((i) => i.level === 'Improving').length,
  }

  return (
    <div>
      <KpiStrip
        cols={3}
        items={[
          { label: 'Critical interventions', value: String(counts.Critical), sub: 'act immediately' },
          { label: 'Needs attention', value: String(counts.Attention), sub: 'act this week' },
          { label: 'Improving', value: String(counts.Improving), sub: 'sustain momentum' },
        ]}
      />

      <WorkspaceSection title="Unified intervention center" subtitle="Six risk categories · priority · entity · reason · evidence · action · status">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {grouped.map((group) => {
            const meta = CATEGORY_META[group.category] ?? { Icon: Info, dot: '#94a3b8' }
            return (
              <Card key={group.category} className="p-5">
                <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${meta.dot}1a`, color: meta.dot }}>
                    <meta.Icon className="h-3.5 w-3.5" />
                  </span>
                  {group.category} · {group.items.length}
                </p>
                <div className="space-y-2.5">
                  {group.items.map((item, i) => (
                    <motion.div key={`${group.category}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.entity}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={LEVEL_VARIANT[item.level] ?? 'secondary'} size="sm">{item.level}</Badge>
                            <Badge variant={item.status === 'Active' ? 'warning' : 'success'} size="sm">{item.status}</Badge>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-600 dark:text-slate-300">Reason:</span> {item.reason}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><span className="font-bold text-slate-600 dark:text-slate-300">Evidence:</span> {item.evidence}</p>
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" /> {item.action}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      </WorkspaceSection>
    </div>
  )
}

export { RiskTab }
export default RiskTab
