/**
 * Academic Intelligence Workspace — Academic Health tab.
 * Dedicated health dashboard: overall score, component health rings, trend.
 */

import { motion } from 'framer-motion'
import {
  Activity, BookOpen, CalendarCheck2, FileText, Flame, HeartPulse, Target, TrendingUp, Zap,
} from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { AreaTrend,  } from '@/components/charts'
import { Badge, Progress } from '@/components/ui'

const ICONS = {
  attendance: CalendarCheck2, assignments: FileText, projects: Target, practice: Zap,
  quiz: Target, examinations: Activity, revision: BookOpen, learningBehaviour: HeartPulse,
  consistency: Flame,
}

function HealthTab({ derived, dna }) {
  const h = derived.academicHealth
  const breakdown = dna?.healthBreakdown ?? []

  const trendData = derived.university?.attendance?.monthlyTrend?.map((row) => ({ month: row.month, health: row.pct })) ?? []

  return (
    <div className="space-y-6">
      {/* Overall + component rings */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative flex items-center gap-6">
            <ProgressRing value={h.score} size={130} stroke={11} color="#ffffff" track="rgba(255,255,255,0.2)" label={`${h.score}`} sublabel="Overall" />
            <div>
              <p className="text-lg font-bold">{h.grade}</p>
              <p className="text-xs text-white/80">{h.trend} · {h.delta >= 0 ? `+${h.delta}` : h.delta} vs last semester</p>
              <div className="mt-3 space-y-1.5">
                {h.factors.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-[10.5px]">
                    <span className="w-24 truncate text-white/75">{f.label}</span>
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-white" style={{ width: `${f.value}%` }} />
                    </div>
                    <span className="font-bold">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <ChartCard title="Health trend" subtitle="Last 6 months" className="lg:col-span-2">
          <AreaTrend data={trendData} xKey="month" height={220} series={[{ key: 'health', name: 'Health', color: '#10b981' }]} />
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              { label: 'Attendance health', value: breakdown.find((b) => b.key === 'attendance')?.value ?? 0, color: '#14b8a6' },
              { label: 'Learning health', value: derived.learningBehaviourScore, color: '#8b5cf6' },
              { label: 'Consistency health', value: derived.consistencyScore, color: '#f59e0b' },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <p className="font-display text-lg font-bold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-[10px] font-medium text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Component breakdown */}
      <ChartCard title="Health component breakdown" subtitle="Every dimension contributing to your academic health">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {breakdown.map((b, i) => {
            const Icon = ICONS[b.key] ?? Activity
            return (
              <motion.div key={b.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${b.value >= 85 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : b.value >= 70 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <Badge variant={b.tone === 'success' ? 'success' : b.tone === 'warning' ? 'warning' : 'danger'} size="sm">{b.value}</Badge>
                </div>
                <p className="mt-2.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">{b.label}</p>
                <Progress value={b.value} className="mt-2 h-2" gradient={b.value >= 85 ? 'from-emerald-500 to-teal-400' : b.value >= 70 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400'} />
                <p className="mt-1.5 text-[10.5px] font-medium text-slate-400">Contribution {b.contribution} pts</p>
              </motion.div>
            )
          })}
        </div>
      </ChartCard>

      <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
        <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
          <span className="font-bold text-indigo-600 dark:text-indigo-300">AI take:</span> {h.hasEvidence ? `${h.grade} · ${h.trend}.` : 'Academic health will appear after attendance, assignments or exams are recorded.'}
        </p>
      </div>
    </div>
  )
}

export { HealthTab }
export default HealthTab
