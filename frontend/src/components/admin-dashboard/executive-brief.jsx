/**
 * MediXO EduX — Institution Command Center · Section 2: AI Executive Brief.
 * Deterministic template-based summary generated from the derived snapshot:
 * overall summary, positive insight, priority insight and recommended action.
 * The brief always reflects the CURRENT derived data.
 */

import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, CheckCircle2, Sparkles, Target } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { Link } from 'react-router-dom'

/* Deterministic brief builder — pure function of the derived snapshot. */
export function buildExecutiveBrief(derived) {
  const health = derived.institutionHealth ?? {}
  const pillars = health.pillars ?? []
  const students = derived.students ?? {}
  const departments = derived.departments ?? {}
  const attendance = derived.attendance ?? {}

  const sorted = [...pillars].sort((a, b) => b.value - a.value)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]

  const first = derived.profile?.firstName || derived.masterProfile?.firstName || 'Admin'
  const greeting = `Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${first}.`
  const overall = health.score == null
    ? 'Overall institutional health has not been calculated yet.'
    : `Overall institutional health is ${health.score}/100 (${health.grade || 'Building'}). ${strongest ? `${strongest.label} is currently the strongest pillar at ${strongest.value}/100.` : ''}`
  const priority = weakest
    ? `${weakest.label} requires attention at ${weakest.value}/100.`
    : 'All pillars are healthy.'
  const priorityAction = weakest?.label?.toLowerCase().includes('assessment')
    ? 'Review assessment performance in departments showing declining exam averages before the midsem window.'
    : weakest?.label?.toLowerCase().includes('student')
      ? 'Prioritise the at-risk register — mentor reviews and targeted revision for the flagged cohort.'
      : weakest?.label?.toLowerCase().includes('faculty')
        ? 'Address faculty workload and research-output support in the lowest-scoring departments.'
        : 'Review the weakest pillar with the responsible HOD this week.'

  const positive = departments.best
    ? `${departments.best.name} currently leads department health at ${departments.best.score}/100 (pass ${departments.best.passRate}%, placement ${departments.best.placement}%).`
    : 'All departments are performing consistently.'
  const attention = departments.worst
    ? `${departments.worst.name} needs attention at ${departments.worst.score}/100 (pass ${departments.worst.passRate}%).`
    : 'No department flags.'

  return {
    greeting,
    overall,
    priority,
    priorityAction,
    positive,
    attention,
    riskLine: `At-risk rate ${students.riskSummary?.latestRate ?? '—'}% · ${students.totals?.activeRisk ?? '—'} students · ${students.riskSummary?.trendReduction ?? 0}% reduction this term.`,
    attendanceLine: `Attendance ${attendance.overall ?? '—'}% · best ${attendance.best?.dept ?? '—'} · needs attention ${attendance.worst?.dept ?? '—'}.`,
  }
}

function ExecutiveBrief({ data }) {
  const b = buildExecutiveBrief(data.derived)
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-indigo-500/20"
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-teal-300/20 blur-2xl" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> AI Executive Brief
            </p>
            <h2 className="mt-2 font-display text-xl font-bold leading-snug">{b.greeting}</h2>
            <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/85">{b.overall}</p>
          </div>
          <Badge className="bg-white/15 text-white ring-white/30">Institution command center</Badge>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Positive</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/90">{b.positive}</p>
              <p className="mt-1 text-[11px] text-white/70">{b.riskLine}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Priority</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/90">{b.priority}</p>
              <p className="mt-1 text-[11px] text-white/70">{b.priorityAction}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] text-white/70">
            <Target className="h-3.5 w-3.5" /> {b.attendanceLine}
          </p>
          <Button asChild size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50">
            <Link to="/admin/performance">Open analytics <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

export { ExecutiveBrief }
export default ExecutiveBrief
