/**
 * Academic Intelligence Workspace — Overview tab.
 * Two context views over ONE foundation:
 *   University   → overall performance · health · progress · trend
 *   Competitive  → JEE/NEET readiness · mocks · PYQ · recommendations
 */

import { motion } from 'framer-motion'
import { Activity, ArrowUpRight, Award, BrainCircuit, Flame, Gauge, Sparkles, Target, TrendingUp } from 'lucide-react'
import { ProgressRing } from '@/components/shared/progress-ring'
import { ChartCard } from '@/components/shared/chart-card'
import {  } from '@/components/ui'
import {  } from '@/utils/format'
import { CompetitiveOverview } from './competitive-overview'

function OverviewTab({ derived, profile, datasets, context = 'University' }) {
  if (context === 'Competitive') {
    return <CompetitiveOverview derived={derived} />
  }
  const d = derived
  const h = d.academicHealth ?? {}
  const perf = datasets?.academicPerformance ?? {}
  const history = perf.semesterHistory ?? []
  const lastSem = history.length >= 2 ? history[history.length - 2] : null
  const cgpaDelta = (profile?.cgpa != null && lastSem?.gpa != null)
    ? (profile.cgpa - lastSem.gpa).toFixed(2)
    : null
  const study = datasets?.studyStatistics ?? {}
  const practice = datasets?.practiceSessions ?? []
  const practiceFreq = datasets?.learningBehaviourDetailed?.practiceFrequency?.perWeek ?? 0

  const kpis = [
    { label: 'Overall academic performance', value: `${d.confidenceIndex ?? 0}`, unit: '/100', icon: Gauge, grad: 'from-indigo-600 to-blue-600', sub: `Confidence · ${d.confidenceIndex ?? 0}` },
    { label: 'Academic health', value: `${h.score ?? 0}`, unit: '/100', icon: Activity, grad: 'from-emerald-500 to-teal-500', sub: `${h.grade ?? 'Building'} · ${h.trend ?? 'steady'}` },
    { label: 'Overall progress', value: `${d.achievements?.progress ?? 0}`, unit: '%', icon: TrendingUp, grad: 'from-amber-500 to-orange-500', sub: `${d.achievements?.completed ?? 0}/${d.achievements?.total ?? 0} achievements` },
    { label: 'Current trend', value: cgpaDelta == null ? '—' : `${cgpaDelta.startsWith('-') ? '' : '+'}${cgpaDelta}`, unit: 'CGPA', icon: ArrowUpRight, grad: 'from-violet-500 to-purple-600', sub: lastSem?.semester ? `vs ${lastSem.semester}` : 'No prior semester yet' },
  ]

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

      {/* Performance + consistency summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Performance summary" subtitle="Health · confidence · consistency · improvement">
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
            <ProgressRing value={h.score} size={130} stroke={11} label={`${h.score}`} sublabel="Health" color={h.score >= 85 ? '#10b981' : h.score >= 70 ? '#f59e0b' : '#f43f5e'} />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Confidence', value: d.confidenceIndex, color: '#6366f1' },
                { label: 'Consistency', value: d.consistencyScore, color: '#8b5cf6' },
                { label: 'Improvement', value: d.improvementIndex, color: '#14b8a6' },
                { label: 'Learning behaviour', value: d.learningBehaviourScore, color: '#f59e0b' },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                  <ProgressRing value={m.value} size={70} stroke={7} label={`${m.value}`} sublabel="" color={m.color} />
                  <p className="mt-1.5 text-center text-[10px] font-bold text-slate-600 dark:text-slate-300">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Consistency summary" subtitle="What keeps you on track">
          <div className="space-y-3">
            {[
              { icon: Flame, label: 'Study streak', value: `${study.streakDays ?? 0} days`, note: `Longest: ${study.longestStreak ?? 0} days` },
              { icon: Target, label: 'Weekly study', value: `${study.weeklyHours ?? 0}h`, note: `Avg focus ${study.avgFocus ?? 0}%` },
              { icon: Award, label: 'Practice sessions', value: `${practice.length} completed`, note: `${practiceFreq}/week cadence` },
              { icon: Activity, label: 'Attendance', value: `${datasets?.attendance?.overall ?? 0}%`, note: `${datasets?.attendance?.buffer ?? 0} pts vs required` },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3.5 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-teal-500/10 text-indigo-600 ring-1 ring-indigo-500/15 dark:text-indigo-300">
                  <r.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{r.label}</p>
                  <p className="text-[11px] text-slate-400">{r.note}</p>
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.value}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Quick AI insights + recent improvement */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift lg:col-span-2">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <BrainCircuit className="h-3.5 w-3.5" /> Quick AI insights
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-white/95">{d.dnaWorkspace?.executive?.summary ?? 'Building your profile from live records.'}</p>
            <div className="mt-3.5 flex flex-wrap gap-2">
              {(d.strengths ?? []).slice(0, 2).map((s) => <span key={s.subjectCode} className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25">{s.subject} · {s.mastery}%</span>)}
              {(d.weaknesses ?? []).slice(0, 2).map((s) => <span key={s.subjectCode} className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold ring-1 ring-white/25">{s.subject} · {s.mastery}%</span>)}
            </div>
          </div>
        </div>

        <ChartCard title="Recent improvement" subtitle="Last 4 semesters">
          <div className="space-y-3">
            {history.slice(-4).map((s) => (
              <div key={s.semester} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
                <span className="w-14 text-[11px] font-bold text-slate-400">{s.semester}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${((s.gpa ?? 0) / 10) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.gpa ?? '—'}</span>
              </div>
            ))}
            <p className="rounded-2xl bg-emerald-50/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Sparkles className="mr-1 inline h-3 w-3" /> {history.length ? 'Semester GPA from graded records.' : 'Semester history appears after graded university work.'}
            </p>
          </div>
        </ChartCard>
      </div>

      {/* Mentor CTA */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-bold">Ask MediXO Mentor about your performance</p>
            <p className="text-xs text-white/80">Dive into your weakest chapters · build a plan for the week · review a mistake pattern.</p>
          </div>
        </div>
        <a href="/student/mentor" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-50">
          <Sparkles className="h-4 w-4" /> Ask MediXO Mentor
        </a>
      </div>
    </div>
  )
}

export { OverviewTab }
export default OverviewTab
