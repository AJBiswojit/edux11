/**
 * MediXO EduX — Faculty Command Center · 2. AI Faculty Brief.
 * The premium briefing card — today at a glance, all derived.
 */

import { motion } from 'framer-motion'
import { CalendarCheck2, ClipboardCheck, FileBarChart, GraduationCap, Sparkles, Target, Users } from 'lucide-react'
import { Badge } from '@/components/ui'

function AiFacultyBrief({ data }) {
  const b = data.derived.dashboard?.aiBrief ?? {}
  const rows = [
    { icon: CalendarCheck2, label: "Today's schedule", value: `${b.todayClasses ?? 0} classes`, color: 'text-indigo-400' },
    { icon: ClipboardCheck, label: 'Assignments pending review', value: String(b.pendingReview ?? 0), color: 'text-amber-400' },
    { icon: Users, label: 'Students needing immediate attention', value: String(b.studentsNeedingAttention ?? 0), color: 'text-rose-400' },
    { icon: FileBarChart, label: 'Assessment coverage', value: `${b.assessmentCoverage ?? 0}%`, color: 'text-emerald-400' },
    { icon: GraduationCap, label: 'Recommended revision', value: b.recommendedRevision ?? '—', color: 'text-sky-400' },
  ]

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
              <Sparkles className="h-3.5 w-3.5" /> AI Faculty Brief
            </p>
            <h2 className="mt-2 font-display text-xl font-bold leading-snug">{b.greeting}</h2>
            <p className="mt-0.5 text-[11.5px] text-white/70">{b.date}</p>
          </div>
          <Badge className="bg-white/15 text-white ring-white/30">Today's command center</Badge>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {rows.map((r) => (
            <div key={r.label} className="rounded-2xl bg-white/10 px-3.5 py-3 ring-1 ring-white/15 backdrop-blur-sm">
              <r.icon className={`h-4 w-4 ${r.color}`} />
              <p className={`mt-1.5 truncate font-display text-[15px] font-bold`} title={r.value}>{r.value}</p>
              <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-white/60">{r.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Target className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Today's priority</p>
            <p className="mt-0.5 text-[13px] font-bold leading-snug">{b.todaysPriority}</p>
            {b.priorityDetail && <p className="mt-1 text-[11px] leading-relaxed text-white/75">{b.priorityDetail}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export { AiFacultyBrief }
export default AiFacultyBrief
