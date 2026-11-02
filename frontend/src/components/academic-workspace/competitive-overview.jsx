/**
 * Academic Intelligence Workspace — COMPETITIVE overview (context view).
 * Shown when Performance & AI switches to the Competitive context:
 * JEE/NEET readiness, mock performance, PYQ accuracy, speed, negative
 * marking and competitive recommendations — all derived from the
 * competitive engine (src/intelligence/engine/competitive.js).
 */

import { motion } from 'framer-motion'
import { BrainCircuit, Gauge, Sparkles, Target, Timer, TrendingUp, Zap } from 'lucide-react'
import { ProgressRing } from '@/components/shared/progress-ring'
import { ChartCard } from '@/components/shared/chart-card'
import { BarCompare, LineTrend } from '@/components/charts'
import { Badge } from '@/components/ui'
import { formatDate } from '@/utils/format'

function CompetitiveOverview({ derived }) {
  const c = derived.competitive
  const readiness = derived.readiness?.byExamFamily ?? {}
  const families = c?.examFamilies ?? []
  const overall = c?.overall ?? {}

  const kpis = [
    { label: 'JEE readiness', value: `${readiness.JEE?.score ?? '—'}`, unit: '/100', icon: Target, grad: 'from-indigo-600 to-blue-600', sub: `${readiness.JEE?.level ?? '—'} · ${readiness.JEE?.trend ?? '—'}` },
    { label: 'NEET readiness', value: `${readiness.NEET?.score ?? '—'}`, unit: '/100', icon: Zap, grad: 'from-emerald-500 to-teal-500', sub: `${readiness.NEET?.level ?? '—'} · ${readiness.NEET?.trend ?? '—'}` },
    { label: 'Overall mock accuracy', value: `${overall.accuracy ?? '—'}`, unit: '%', icon: Gauge, grad: 'from-amber-500 to-orange-500', sub: `${overall.completedMocks ?? 0} mocks completed` },
    { label: 'Best percentile', value: overall.bestPercentile != null ? `${overall.bestPercentile}` : '—', unit: '%ile', icon: TrendingUp, grad: 'from-violet-500 to-purple-600', sub: overall.latestPercentile != null ? `Latest ${overall.latestPercentile}%ile` : '—' },
  ]

  const mockTrend = (c?.performance?.mocks ?? []).map((m) => ({ axis: m.title.split(' — ')[0].slice(0, 14), pct: m.pct, percentile: m.percentile }))
  const pyqBySubject = families.flatMap((f) => (c?.exams?.[f]?.pyq.bySubject ?? []).map((s) => ({ subject: `${f} · ${s.subject}`, accuracy: s.accuracy })))

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-3xl bg-gradient-to-br ${k.grad} p-5 text-white shadow-lg`}>
            <k.icon className="h-5 w-5 opacity-85" />
            <p className="mt-2 font-display text-2xl font-bold">{k.value}<span className="text-sm text-white/70">{k.unit}</span></p>
            <p className="text-[11px] font-medium text-white/75">{k.label}</p>
            <p className="text-[10px] font-semibold text-white/60">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* family readiness cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {families.map((f) => {
          const exam = c?.exams?.[f] ?? {}
          const fam = readiness[f] ?? {}
          const next = exam.upcoming?.[0]
          return (
            <ChartCard
              key={f}
              title={`${f} — exam-specific intelligence`}
              subtitle={f === 'JEE' ? 'Physics · Chemistry · Mathematics' : 'Physics · Chemistry · Biology'}
              actions={<Badge variant="gradient"><BrainCircuit className="h-3 w-3" /> {fam.score ?? '—'}/100</Badge>}
            >
              <div className="flex flex-wrap items-center gap-6">
                <ProgressRing value={fam.score ?? 0} size={120} stroke={11} label={`${fam.score ?? '—'}`} sublabel={f} color={fam.score >= 70 ? '#10b981' : fam.score >= 55 ? '#f59e0b' : '#f43f5e'} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Mocks', value: `${exam.mockStats?.completed ?? 0} · avg ${Math.round(exam.mockStats?.avgPct ?? 0)}%` },
                      { label: 'PYQ accuracy', value: `${exam.pyq?.accuracy ?? 0}%` },
                      { label: 'Speed', value: `${exam.speed?.avgSeconds ?? 0}s/q · ${exam.speed?.score ?? 0}/100` },
                      { label: 'Neg. marking', value: `${exam.negativeMarking?.discipline ?? 0}/100` },
                    ].map((m) => (
                      <div key={m.label} className="rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                        <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                        <p className="mt-0.5 text-[12px] font-bold text-slate-800 dark:text-slate-100">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                    {next
                      ? <>Next: <span className="font-bold text-slate-700 dark:text-slate-200">{next.title}</span> · {formatDate(next.date, 'MMM d')} · readiness {next.readiness}%</>
                      : 'No upcoming mocks scheduled.'}
                  </p>
                </div>
              </div>
            </ChartCard>
          )
        })}
      </div>

      {/* mock trend + PYQ accuracy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Mock test trend" subtitle="% score and percentile across completed mocks">
          {mockTrend.length ? (
            <LineTrend data={mockTrend} xKey="axis" height={230} series={[
              { key: 'pct', name: 'Score %', color: '#6366f1' },
              { key: 'percentile', name: 'Percentile', color: '#14b8a6' },
            ]} formatter={(v) => `${v}%`} />
          ) : <p className="py-10 text-center text-xs text-slate-400">No completed mocks yet.</p>}
        </ChartCard>
        <ChartCard title="PYQ accuracy by subject" subtitle="Previous-year question practice, per family">
          {pyqBySubject.length ? (
            <BarCompare data={pyqBySubject} xKey="subject" height={230} series={[{ key: 'accuracy', name: 'Accuracy %', color: '#8b5cf6' }]} formatter={(v) => `${v}%`} />
          ) : <p className="py-10 text-center text-xs text-slate-400">No PYQ practice recorded yet.</p>}
        </ChartCard>
      </div>

      {/* competitive recommendations */}
      <ChartCard title="Competitive recommendations" subtitle="Data-derived actions — PYQ drills · negative marking · mock discipline" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> {c?.recommendations?.length ?? 0} actions</Badge>}>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {(c?.recommendations ?? []).slice(0, 6).map((r, i) => (
            <motion.div key={`${r.examFamily}-${i}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold leading-snug text-slate-700 dark:text-slate-200">{r.text}</p>
                <Badge variant={r.examFamily === 'JEE' ? 'info' : 'success'} size="sm" className="mt-1">{r.examFamily}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}

export { CompetitiveOverview }
export default CompetitiveOverview
