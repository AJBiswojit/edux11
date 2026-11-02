/**
 * MediXO EduX — Institution Command Center · Section 1: Success Center.
 * Four primary KPI cards — Institution Health, Student Success, Faculty
 * Performance, Assessment Health. Every value derives from the Phase 1
 * intelligence snapshot (`derived.institutionHealth.pillars`).
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, HeartPulse, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Card } from '@/components/ui'

const CARD_META = [
  {
    key: 'Academic health', icon: HeartPulse, grad: 'from-indigo-500 to-blue-500', ring: '#6366f1',
    desc: 'Retention, CGPA, pass rates & digital experience',
    to: '/admin/academic-analytics',
  },
  {
    key: 'Student success', icon: TrendingUp, grad: 'from-emerald-500 to-teal-500', ring: '#10b981',
    desc: 'Retention, exam pass rate & low-risk share',
    to: '/admin/performance',
  },
  {
    key: 'Faculty health', icon: ShieldCheck, grad: 'from-amber-500 to-orange-500', ring: '#f59e0b',
    desc: 'Teaching satisfaction, digital adoption & research',
    to: '/admin/faculty',
  },
  {
    key: 'Assessment health', icon: Sparkles, grad: 'from-rose-500 to-red-500', ring: '#f43f5e',
    desc: 'Exam averages, assignment completion & readiness',
    to: '/admin/exam-analytics',
  },
]

function SuccessCenter({ data }) {
  const pillars = data.derived.institutionHealth?.pillars ?? []
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARD_META.map((def, i) => {
        const pillar = pillars.find((p) => p.label === def.key) ?? { value: 0, grade: '—' }
        return (
          <motion.div key={def.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Link to={def.to} className="block h-full">
              <Card className="group relative h-full overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${def.grad} opacity-[0.08] blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-[0.16]`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${def.grad} text-white shadow-md`}>
                          <def.icon className="h-3.5 w-3.5" />
                        </span>
                        {def.key}
                      </p>
                      <p className="mt-2.5 line-clamp-2 text-[11.5px] leading-relaxed text-slate-400">{def.desc}</p>
                    </div>
                    <div className="shrink-0">
                      <ProgressRing value={pillar.value} size={76} stroke={7} color={def.ring} label={`${pillar.value}`} sublabel="score" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                      pillar.grade === 'Excellent' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : pillar.grade === 'Good' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                    }`}>
                      {pillar.grade}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 transition-colors group-hover:text-indigo-800 dark:text-indigo-400 dark:group-hover:text-indigo-300">
                      View <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        )
      })}
    </div>
  )
}

export { SuccessCenter }
export default SuccessCenter
