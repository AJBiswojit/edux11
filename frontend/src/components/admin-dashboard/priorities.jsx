/**
 * MediXO EduX — Institution Command Center · Section 9: Today's Priorities.
 * Management priority list sorted Critical → Attention → Positive, derived
 * from the intelligence snapshot (interventions, departments, students).
 */

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { Badge, Button, useToast } from '@/components/ui'

const PRIORITY_STYLE = {
  Critical: { badge: 'danger', dot: '#ef4444', Icon: AlertTriangle },
  Attention: { badge: 'warning', dot: '#f59e0b', Icon: Info },
  Positive: { badge: 'success', dot: '#10b981', Icon: CheckCircle2 },
}

function TodayPriorities({ data }) {
  const toast = useToast()
  const derived = data.derived
  const interventions = derived.interventions?.list ?? []
  const departments = derived.departments ?? {}
  const students = derived.students ?? {}

  /* Build priority list from intelligence (sorted Critical → Attention → Positive). */
  const list = []

  interventions.filter((i) => i.priority === 'Critical').forEach((i) => {
    list.push({ level: 'Critical', title: i.category === 'Student Risk' ? 'Students requiring intervention' : `${i.category} · critical`, why: i.reason, action: i.action })
  })
  interventions.filter((i) => i.priority === 'High').forEach((i) => {
    list.push({ level: 'Attention', title: `${i.category} · attention`, why: i.reason, action: i.action })
  })
  if (departments.worst) {
    list.push({ level: 'Attention', title: 'Department performance decline', why: `${departments.worst.name} at ${departments.worst.score}/100 — pass ${departments.worst.passRate}%, placement ${departments.worst.placement}%.`, action: `Schedule a review with ${departments.worst.hod}.` })
  }
  if (departments.best && departments.best.code !== departments.worst?.code) {
    list.push({ level: 'Positive', title: 'Department improvement', why: `${departments.best.name} leads at ${departments.best.score}/100 — a model for peer departments.`, action: 'Share the playbook at the next HOD meeting.' })
  }
  if (students.riskSummary?.trendReduction > 0) {
    list.push({ level: 'Positive', title: 'Student risk improving', why: `At-risk rate down ${students.riskSummary.trendReduction}% this term (${students.riskSummary.firstRate}% → ${students.riskSummary.latestRate}%).`, action: 'Sustain the intervention pipeline.' })
  }

  const sorted = [...list].sort((a, b) => {
    const rank = { Critical: 0, Attention: 1, Positive: 2 }
    return rank[a.level] - rank[b.level]
  })

  return (
    <ChartCard
      title="Today's priorities"
      subtitle="What requires management attention right now"
      className="h-full"
      actions={<Badge variant="danger" size="sm">{sorted.filter((i) => i.level === 'Critical').length} critical</Badge>}
    >
      <div className="space-y-2.5">
        {sorted.map((item, i) => {
          const st = PRIORITY_STYLE[item.level]
          return (
            <motion.div key={`${item.level}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${st.dot}1a`, color: st.dot }}>
                    <st.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{item.title}</p>
                      <Badge variant={st.badge} size="sm">{item.level}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{item.why}</p>
                    <p className="mt-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">→ {item.action}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-3">
        <Button size="sm" variant="outline" className="w-full" onClick={() => toast.info('Action log', 'Priorities synced to the weekly management review.')}>
          Sync to weekly review
        </Button>
      </div>
    </ChartCard>
  )
}

export { TodayPriorities }
export default TodayPriorities
