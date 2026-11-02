/**
 * MediXO EduX — Institution Command Center · Section 3: Academic Health.
 * Six-pillar health visualization — master ring + horizontal pillar bars.
 * Derived from `derived.institutionHealth.pillars`.
 */

import { HeartPulse } from 'lucide-react'
import { ProgressRing } from '@/components/shared/progress-ring'
import { ChartCard } from '@/components/shared/chart-card'
import { cn } from '@/utils/cn'

const PILLAR_COLORS = {
  'Academic health': '#6366f1',
  'Student success': '#10b981',
  'Attendance health': '#14b8a6',
  'Assessment health': '#f43f5e',
  'Faculty health': '#f59e0b',
  'Outcomes': '#8b5cf6',
}

function HealthVisual({ data }) {
  const health = data.derived.institutionHealth ?? {}
  const pillars = health.pillars ?? []
  const weakest = [...pillars].sort((a, b) => a.value - b.value)[0]

  return (
    <ChartCard
      title="Institution health"
      subtitle="Six-pillar weighted score"
      className="h-full"
      actions={
        <span className={cn(
          'rounded-full px-2.5 py-1 text-[10.5px] font-bold',
          health.grade === 'Excellent' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : health.grade === 'Good' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
        )}>
          {health.grade}
        </span>
      }
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ProgressRing value={health.score ?? 0} size={140} stroke={12} color="#6366f1" label={`${health.score ?? '—'}`} sublabel="overall / 100" />
        <div className="w-full flex-1 space-y-3">
          {pillars.map((p) => (
            <div key={p.label}>
              <div className="flex items-center justify-between text-[11.5px] font-semibold">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: PILLAR_COLORS[p.label] ?? '#94a3b8' }} />
                  {p.label}
                </span>
                <span className="text-slate-800 dark:text-slate-100">{p.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${p.value}%`, background: PILLAR_COLORS[p.label] ?? '#6366f1' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      {weakest && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-rose-50/70 p-3.5 dark:bg-rose-500/5">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-800 dark:text-slate-100">Lowest pillar:</span> {weakest.label} at {weakest.value}/100 — the highest-yield improvement lever for overall health.
          </p>
        </div>
      )}
    </ChartCard>
  )
}

export { HealthVisual }
export default HealthVisual
