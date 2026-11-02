/**
 * Academic Intelligence Workspace — AI Academic DNA tab (flagship).
 * 12 sections: executive summary · strengths · weaknesses · health
 * breakdown · learning behaviour · subject mastery · chapter mastery ·
 * topic mastery · mistake intelligence · improvement opportunities ·
 * weekly action plan · improvement prediction.
 */

import { motion } from 'framer-motion'
import { FileBarChart } from 'lucide-react'
import {
  AlertTriangle, ArrowUpRight, BookOpen, BrainCircuit, CalendarCheck2, Clock, FileText,
  Lightbulb, ShieldAlert, Sparkles, Target, Timer, TrendingUp, Zap,
} from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { ExamEvidenceCard } from './exam-evidence-card'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
  Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui'
import { formatDate } from '@/utils/format'
import { useState } from 'react'

const LEVEL_STYLE = { Mastered: 'success', Improving: 'info', Weak: 'warning', Critical: 'danger' }
const MISTAKE_SEVERITY = { High: 'danger', Medium: 'warning', Low: 'info' }
const FAMILY_STYLE = { JEE: 'info', NEET: 'success' }

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeMistakes(mistakes) {
  const empty = { items: [], total: 0, bySeverity: { high: 0, medium: 0, low: 0 } }
  if (mistakes && Array.isArray(mistakes.items)) {
    const items = mistakes.items
    return {
      items,
      total: mistakes.total ?? items.reduce((sum, m) => sum + (m.frequency ?? 0), 0),
      bySeverity: {
        high: 0, medium: 0, low: 0,
        ...(mistakes.bySeverity ?? {}),
      },
    }
  }
  if (Array.isArray(mistakes)) {
    return {
      items: mistakes,
      total: mistakes.reduce((sum, m) => sum + (m.frequency ?? 0), 0),
      bySeverity: {
        high: mistakes.filter((m) => m.severity === 'High').reduce((sum, m) => sum + (m.frequency ?? 0), 0),
        medium: mistakes.filter((m) => m.severity === 'Medium').reduce((sum, m) => sum + (m.frequency ?? 0), 0),
        low: mistakes.filter((m) => m.severity === 'Low').reduce((sum, m) => sum + (m.frequency ?? 0), 0),
      },
    }
  }
  return empty
}

/** Live intelligence returns a sparse dnaWorkspace; seed/engine payloads are dense. */
function normalizeDnaWorkspace(raw, derived) {
  const w = raw ?? {}
  const health = derived?.academicHealth ?? {}
  const ex = w.executive ?? {}
  const lb = w.learningBehaviour ?? {}
  const prediction = w.prediction ?? {}
  return {
    executive: {
      ...ex,
      overallRating: ex.overallRating ?? ex.score ?? health.score ?? 0,
      overallGrade: ex.overallGrade ?? ex.grade ?? health.grade ?? 'Building',
      academicHealthScore: ex.academicHealthScore ?? health.score ?? 0,
      learningEfficiency: ex.learningEfficiency ?? derived?.learningBehaviourScore ?? 0,
      consistencyScore: ex.consistencyScore ?? derived?.consistencyScore ?? 0,
      confidenceIndex: ex.confidenceIndex ?? derived?.confidenceIndex ?? 0,
      improvementIndex: ex.improvementIndex ?? derived?.improvementIndex ?? 0,
      summary: ex.summary ?? 'Building your academic DNA from live records.',
    },
    strengths: asArray(w.strengths).map((s) => ({
      ...s,
      reason: s.reason ?? (s.mastery != null ? `${s.mastery}% mastery from your attempts` : 'Signal from your records'),
      trend: s.trend ?? '—',
      confidence: s.confidence ?? s.mastery ?? 0,
    })),
    weaknesses: asArray(w.weaknesses).map((s) => ({
      ...s,
      priority: s.priority ?? ((s.mastery ?? 100) < 65 ? 'Critical' : 'High'),
      reason: s.reason ?? (s.mastery != null ? `${s.mastery}% mastery` : 'Needs more evidence'),
      academicImpact: s.academicImpact ?? 'Keep practising this area',
      estimatedRecovery: s.estimatedRecovery ?? '—',
      suggestedImprovement: s.suggestedImprovement ?? 'Complete more attempts and targeted practice.',
    })),
    healthBreakdown: asArray(w.healthBreakdown).length
      ? w.healthBreakdown
      : asArray(health.factors).map((f, i) => ({
          key: f.key ?? `factor-${i}`,
          label: f.label,
          value: f.value ?? 0,
          contribution: f.value ?? 0,
        })),
    learningBehaviour: {
      score: lb.score ?? derived?.learningBehaviourScore ?? 0,
      attendancePattern: { overall: 0, ...(lb.attendancePattern ?? {}) },
      assignmentCompletion: { onTime: 0, late: 0, pending: 0, ...(lb.assignmentCompletion ?? {}) },
      practiceFrequency: { perWeek: 0, sessions: 0, ...(lb.practiceFrequency ?? {}) },
      revisionHabit: { weeklySessions: 0, avgLengthMin: 0, ...(lb.revisionHabit ?? {}) },
      quizParticipation: { avgAccuracy: 0, attempted: 0, ...(lb.quizParticipation ?? {}) },
      dailyStudy: asArray(lb.dailyStudy),
      weeklyStudy: asArray(lb.weeklyStudy),
      monthlyPattern: asArray(lb.monthlyPattern),
      observations: asArray(lb.observations),
    },
    subjectMastery: asArray(w.subjectMastery).map((s) => {
      const chapters = asArray(s.chapters)
      return {
        ...s,
        chapters,
        status: s.status ?? ((s.mastery ?? 0) >= 80 ? 'Strong' : (s.mastery ?? 0) >= 65 ? 'Developing' : 'At Risk'),
        trend: s.trend ?? '—',
        confidence: s.confidence ?? s.mastery ?? 0,
        masteredCount: s.masteredCount ?? chapters.filter((c) => c.level === 'Mastered').length,
        weakCount: s.weakCount ?? chapters.filter((c) => c.level === 'Weak' || c.level === 'Critical').length,
      }
    }),
    chapterMastery: asArray(w.chapterMastery).map((g) => ({ ...g, chapters: asArray(g.chapters) })),
    topicMastery: asArray(w.topicMastery),
    mistakes: normalizeMistakes(w.mistakes),
    opportunities: asArray(w.opportunities),
    weeklyPlan: asArray(w.weeklyPlan),
    prediction: {
      metrics: asArray(prediction.metrics),
      expectedSemesterImprovement: prediction.expectedSemesterImprovement ?? { value: '—', unit: '' },
      timeline: asArray(prediction.timeline),
      confidence: prediction.confidence ?? 'Building',
      modelNote: prediction.modelNote ?? 'Predictions appear as more assessments are recorded.',
    },
  }
}

function DnaTab({ dna, derived, datasets }) {
  const [context, setContext] = useState('University')
  const w = normalizeDnaWorkspace(dna, derived)
  const ex = w.executive

  /* Competitive DNA view — context-distinguishable signals (Part 13). */
  if (context === 'Competitive') {
    return (
      <div className="space-y-8">
        {/* Phase 2 — exam-attempt evidence (competitive pools) */}
        <ExamEvidenceCard evidence={derived.academicDna?.examEvidence} domain="competitive" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DNA context</p>
            <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {['University', 'Competitive'].map((c) => (
                <button
                  key={c}
                  onClick={() => setContext(c)}
                  className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${context === c ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {c === 'University' ? '🏛️' : '🎯'} {c}
                </button>
              ))}
            </div>
          </div>
          <Badge variant="gradient" className="px-3 py-1"><BrainCircuit className="h-3 w-3" /> JEE · NEET signals</Badge>
        </div>

        {/* executive per family */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-7 text-white shadow-lift">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <BrainCircuit className="h-4 w-4" /> AI Academic DNA · Competitive intelligence
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">Exam-specific learning fingerprint</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(derived.academicDna?.competitive?.summary ?? []).length === 0 && (
                <p className="text-[12.5px] text-white/80">Competitive DNA fills in after JEE/NEET practice attempts. University DNA is available on the other context.</p>
              )}
              {(derived.academicDna?.competitive?.summary ?? []).map((s) => (
                <div key={s.family} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20">
                  <Badge variant={FAMILY_STYLE[s.family]} size="sm" className="bg-white/20 text-white ring-white/30">{s.family}</Badge>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-white/90">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* strengths / weaknesses per family */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Competitive strengths" subtitle="Subjects & chapters above 75% accuracy" actions={<Badge variant="success"><TrendingUp className="h-3 w-3" /> {derived.academicDna?.competitive?.strengths?.length ?? 0} strong</Badge>}>
            <div className="space-y-2.5">
              {(derived.academicDna?.competitive?.strengths ?? []).map((s) => (
                <div key={`${s.family}-${s.subjectCode}`} className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject} <Badge variant={FAMILY_STYLE[s.family]} size="sm">{s.family}</Badge></p>
                  <Badge variant="success">{s.mastery}%</Badge>
                </div>
              ))}
              {(derived.academicDna?.competitive?.strongChapters ?? []).map((c) => (
                <div key={`${c.family}-${c.chapter}`} className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{c.subject} — {c.chapter}</p>
                  <Badge variant={FAMILY_STYLE[c.family]} size="sm">{c.mastery}%</Badge>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Competitive weaknesses" subtitle="Below 65% — priority PYQ drills" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {derived.academicDna?.competitive?.weaknesses?.length ?? 0} flagged</Badge>}>
            <div className="space-y-2.5">
              {(derived.academicDna?.competitive?.weaknesses ?? []).map((s) => (
                <div key={`${s.family}-${s.subjectCode}`} className="flex items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject} <Badge variant={FAMILY_STYLE[s.family]} size="sm">{s.family}</Badge></p>
                  <Badge variant="danger">{s.mastery}%</Badge>
                </div>
              ))}
              {(derived.academicDna?.competitive?.weakChapters ?? []).map((c) => (
                <div key={`${c.family}-${c.chapter}`} className="flex items-center justify-between gap-2 rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2 dark:border-rose-500/20 dark:bg-rose-500/5">
                  <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{c.subject} — {c.chapter}</p>
                  <Badge variant={FAMILY_STYLE[c.family]} size="sm">{c.mastery}%</Badge>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* chapter mastery per family (accordion) */}
        {(derived.competitive?.examFamilies ?? []).map((f) => {
          const chapters = derived.competitive?.exams?.[f]?.pyq?.byChapter ?? []
          return (
            <ChartCard key={`ch-${f}`} title={`${f} chapter mastery`} subtitle="PYQ accuracy per chapter — mastered · improving · weak" actions={<Badge variant={FAMILY_STYLE[f]} size="sm">{f}</Badge>}>
              <div className="space-y-2">
                {chapters.map((c) => (
                  <div key={c.chapter} className="flex items-center gap-3">
                    <span className="w-44 truncate text-[12px] font-semibold text-slate-600 dark:text-slate-300">{c.chapter}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full" style={{ width: `${c.mastery}%`, background: c.mastery >= 75 ? '#10b981' : c.mastery >= 65 ? '#f59e0b' : '#f43f5e' }} />
                    </div>
                    <span className="w-12 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{c.mastery}%</span>
                    <Badge variant={LEVEL_STYLE[c.level] ?? 'secondary'} size="sm">{c.level}</Badge>
                  </div>
                ))}
              </div>
            </ChartCard>
          )
        })}

        {/* mistake patterns (competitive sources) */}
        <ChartCard title="Mistake patterns — competitive" subtitle="From competitive mocks & PYQ practice" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {derived.academicDna?.competitive?.errorPatterns?.length ?? 0} patterns</Badge>}>
          <div className="space-y-2.5">
            {(derived.academicDna?.competitive?.errorPatterns ?? []).map((m, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <Badge variant={MISTAKE_SEVERITY[m.category === 'Concept Error' || m.category === 'Time Management' ? 'High' : m.category === 'Formula Error' ? 'High' : m.category === 'NCERT Detail Error' ? 'Medium' : 'Low']} size="sm">×{m.frequency}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{m.category}</p>
                  <p className="text-[11px] text-slate-400">{m.impact}</p>
                  <p className="mt-0.5 flex items-start gap-1 text-[11px] text-indigo-600 dark:text-indigo-300">
                    <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" /> {m.recommendation}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(m.affectedSubjects ?? []).slice(0, 3).map((s) => <Badge key={s} variant="secondary" size="sm">{s}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* competitive recommendations */}
        <ChartCard title="Competitive DNA recommendations" subtitle="Actionable — derived from chapter accuracy, guesses & mock trends" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> {derived.competitive?.recommendations?.length ?? 0} actions</Badge>}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(derived.competitive?.recommendations ?? []).slice(0, 6).map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <Badge variant={FAMILY_STYLE[r.examFamily]} size="sm">{r.examFamily}</Badge>
                <p className="mt-2 text-[12.5px] font-bold leading-snug text-slate-800 dark:text-slate-100">{r.text}</p>
                <Badge variant={r.impact === 'High' ? 'danger' : 'warning'} size="sm" className="mt-2">{r.impact}</Badge>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>
    )
  }

  /* ---------- 4. Health breakdown chart data ---------- */
  const breakdownDonut = w.healthBreakdown.map((b) => ({ name: b.label, value: b.contribution, color: b.value >= 85 ? '#10b981' : b.value >= 70 ? '#f59e0b' : '#f43f5e' }))

  /* ---------- 5. Learning behaviour chart data ---------- */
  const lb = w.learningBehaviour

  return (
    <div className="space-y-8">
      {/* context switch — University vs Competitive (Part 13) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DNA context</p>
          <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {['University', 'Competitive'].map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${context === c ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {c === 'University' ? '🏛️' : '🎯'} {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="gradient" className="px-3 py-1"><BrainCircuit className="h-3 w-3" /> University signals</Badge>
          <a href="/student/progress-report" className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-500/10">
            <FileBarChart className="h-3.5 w-3.5" /> View Progress Report
          </a>
        </div>
      </div>

      {/* Phase 2 — exam-attempt evidence (university pool) */}
      <ExamEvidenceCard evidence={derived.academicDna?.examEvidence} domain="university" />

      {/* ============ SECTION 1 · Executive summary ============ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-7 text-white shadow-lift">
          <div className="bg-dots absolute inset-0 opacity-15" />
          <div className="relative">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <BrainCircuit className="h-4 w-4" /> AI Academic DNA · Executive summary
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">Overall rating: {ex.overallRating}/100 · {ex.overallGrade}</h2>
            <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-white/90">{ex.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Health', value: ex.academicHealthScore },
                { label: 'Learning efficiency', value: ex.learningEfficiency },
                { label: 'Consistency', value: ex.consistencyScore },
                { label: 'Confidence', value: ex.confidenceIndex },
                { label: 'Improvement', value: ex.improvementIndex },
              ].map((m) => (
                <span key={m.label} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20">
                  {m.label} <span className="font-bold">{m.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <ProgressRing value={ex.overallRating} size={150} stroke={12} label={`${ex.overallRating}`} sublabel="Overall" color={ex.overallRating >= 85 ? '#10b981' : ex.overallRating >= 70 ? '#f59e0b' : '#f43f5e'} />
        </div>
      </div>

      {/* ============ SECTIONS 2 + 3 · Strength & weakness analysis ============ */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Strength analysis" subtitle="Subjects, chapters and topics where you excel" actions={<Badge variant="success"><TrendingUp className="h-3 w-3" /> {w.strengths.length} strengths</Badge>}>
          <div className="space-y-3">
            {w.strengths.length === 0 && (
              <p className="py-6 text-center text-[12px] text-slate-400">No strength signals yet — complete exams and practice to build this view.</p>
            )}
            {w.strengths.map((s) => (
              <div key={s.subjectCode} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                  <Badge variant="success">{s.mastery}%</Badge>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">{s.reason}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline" size="sm">Trend {s.trend}</Badge>
                  <Badge variant="outline" size="sm">Confidence {s.confidence}</Badge>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Weakness analysis" subtitle="Prioritised areas needing attention" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {w.weaknesses.length} flagged</Badge>}>
          <div className="space-y-3">
            {w.weaknesses.length === 0 && (
              <p className="py-6 text-center text-[12px] text-slate-400">No weakness flags yet — this fills in as attempt evidence arrives.</p>
            )}
            {w.weaknesses.slice(0, 5).map((s) => (
              <div key={`${s.subjectCode}-${s.subject}`} className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                  <Badge variant={s.priority === 'Critical' ? 'danger' : 'warning'}>{s.priority}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-500 dark:text-slate-400">{s.reason}</p>
                <div className="mt-2 grid gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <p className="flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-rose-500" /> {s.academicImpact}</p>
                  <p className="flex items-center gap-1"><Timer className="h-3 w-3 text-amber-500" /> Recovery: {s.estimatedRecovery}</p>
                </div>
                <p className="mt-1.5 flex items-start gap-1.5 text-[11.5px] text-indigo-600 dark:text-indigo-300">
                  <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" /> {s.suggestedImprovement}
                </p>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ============ SECTION 4 · Academic health breakdown ============ */}
      <ChartCard title="Academic health breakdown" subtitle="Contribution of each component to your health score" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> {derived.academicHealth.score}/100</Badge>}>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <DonutChart data={breakdownDonut} height={240} centerLabel={`${derived.academicHealth.score}`} centerSub="health" />
          <div className="space-y-2.5">
            {w.healthBreakdown.map((b) => (
              <div key={b.key} className="flex items-center gap-3">
                <span className="w-36 shrink-0 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.value}%`, background: b.value >= 85 ? 'linear-gradient(90deg,#10b981,#34d399)' : b.value >= 70 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#f43f5e,#fb7185)' }} />
                </div>
                <span className="w-14 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* ============ SECTION 5 · Learning behaviour ============ */}
      <ChartCard title="Learning behaviour analysis" subtitle="How you study — patterns and AI observations" actions={<Badge variant="info"><Zap className="h-3 w-3" /> Score {lb.score}</Badge>}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {[
              { label: 'Attendance', value: `${lb.attendancePattern.overall}%`, icon: CalendarCheck2 },
              { label: 'Assignments on time', value: `${lb.assignmentCompletion.onTime}/9`, icon: FileText },
              { label: 'Practice / week', value: `${lb.practiceFrequency.perWeek}`, icon: Target },
              { label: 'Revision sessions', value: `${lb.revisionHabit.weeklySessions}`, icon: BookOpen },
              { label: 'Quiz accuracy', value: `${lb.quizParticipation.avgAccuracy}%`, icon: Target },
              { label: 'Deep sessions', value: `${lb.revisionHabit.avgLengthMin} min`, icon: Clock },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
                <s.icon className="mx-auto h-4 w-4 text-indigo-500" />
                <p className="mt-1.5 font-display text-lg font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-[10px] font-medium text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">AI observations</p>
            <div className="space-y-2">
              {lb.observations.map((o, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                  <p className="text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{o.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <BarCompare data={lb.dailyStudy} xKey="day" height={160} series={[{ key: 'hours', name: 'Hours', color: '#6366f1' }]} />
          <BarCompare data={lb.weeklyStudy} xKey="week" height={160} series={[{ key: 'hours', name: 'Hours', color: '#14b8a6' }]} />
          <BarCompare data={lb.monthlyPattern} xKey="month" height={160} series={[{ key: 'hours', name: 'Hours', color: '#f59e0b' }]} />
        </div>
      </ChartCard>

      {/* ============ SECTION 6 · Subject mastery (expandable) ============ */}
      <ChartCard title="Subject mastery" subtitle="Click a subject to see chapter-level detail" actions={<Badge variant="gradient"><BrainCircuit className="h-3 w-3" /> 6 subjects</Badge>}>
        <Accordion type="multiple">
          {w.subjectMastery.map((s) => (
            <AccordionItem key={s.subjectCode} value={s.subjectCode}>
              <AccordionTrigger value={s.subjectCode}>
                <div className="flex w-full items-center gap-3 pr-2">
                  <span className="w-40 truncate text-left text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${s.mastery}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{s.mastery}%</span>
                  <Badge variant={s.status === 'Strong' ? 'success' : s.status === 'Developing' ? 'info' : 'warning'} size="sm">{s.status}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Chapters ({s.chapters.length})</p>
                    <div className="mt-2 space-y-1.5">
                      {s.chapters.map((c) => (
                        <div key={c.chapter} className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11.5px] text-slate-600 dark:text-slate-300">{c.chapter}</span>
                          <Badge variant={LEVEL_STYLE[c.level] ?? 'secondary'} size="sm">{c.level} · {c.mastery}%</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-3.5 py-2 text-[11.5px] dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Trend</span><span className="font-bold text-slate-700 dark:text-slate-200">{s.trend}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-3.5 py-2 text-[11.5px] dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Confidence</span><span className="font-bold text-slate-700 dark:text-slate-200">{s.confidence}/100</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-3.5 py-2 text-[11.5px] dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Mastered / Weak chapters</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{s.masteredCount} / {s.weakCount}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ChartCard>

      {/* ============ SECTION 7 · Chapter mastery (accordion by subject) ============ */}
      <ChartCard title="Chapter mastery" subtitle="Mastered · improving · weak · critical per subject">
        <Accordion type="single">
          {w.chapterMastery.map((g) => (
            <AccordionItem key={g.subjectCode} value={g.subjectCode}>
              <AccordionTrigger value={g.subjectCode}>
                <div className="flex w-full items-center justify-between pr-2">
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{g.subject}</span>
                  <div className="flex gap-1.5">
                    <Badge variant="success" size="sm">{g.chapters.filter((c) => c.level === 'Mastered').length} mastered</Badge>
                    <Badge variant="danger" size="sm">{g.chapters.filter((c) => c.level === 'Critical').length} critical</Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 px-4 pb-4">
                  {g.chapters.map((c) => (
                    <div key={c.chapter} className="flex items-center gap-3">
                      <span className="w-52 truncate text-[12px] font-semibold text-slate-600 dark:text-slate-300">{c.chapter}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full" style={{ width: `${c.mastery}%`, background: c.mastery >= 80 ? '#10b981' : c.mastery >= 65 ? '#f59e0b' : '#f43f5e' }} />
                      </div>
                      <span className="w-12 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{c.mastery}%</span>
                      <Badge variant={LEVEL_STYLE[c.level] ?? 'secondary'} size="sm">{c.level}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ChartCard>

      {/* ============ SECTION 8 · Topic mastery table ============ */}
      <ChartCard title="Topic mastery" subtitle="Topic · mastery · confidence · status · last practised" actions={<Badge variant="secondary" size="sm">{w.topicMastery.length} topics</Badge>}>
        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead className="text-center">Mastery</TableHead>
                <TableHead className="text-center">Confidence</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Last practised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {w.topicMastery.map((t) => (
                <TableRow key={`${t.subjectCode}-${t.topic}`}>
                  <TableCell>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{t.topic}</p>
                    <p className="text-[10.5px] text-slate-400">{t.subject}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${t.mastery >= 80 ? 'text-emerald-600 dark:text-emerald-400' : t.mastery >= 65 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}`}>{t.mastery}%</span>
                  </TableCell>
                  <TableCell className="text-center text-slate-500 dark:text-slate-400">{t.confidence}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={t.learningStatus === 'Mastered' ? 'success' : t.learningStatus === 'Improving' ? 'info' : t.learningStatus === 'Needs Review' ? 'warning' : 'danger'} size="sm">{t.learningStatus}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-slate-400">{formatDate(t.lastPracticed, 'MMM d')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ChartCard>

      {/* ============ SECTION 9 · Mistake intelligence ============ */}
      <ChartCard title="Mistake intelligence" subtitle="Aggregated across assignments · quizzes · practice · exams" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {w.mistakes.total} total</Badge>}>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <DonutChart
            data={[
              { name: 'High severity', value: w.mistakes.bySeverity.high, color: '#f43f5e' },
              { name: 'Medium severity', value: w.mistakes.bySeverity.medium, color: '#f59e0b' },
              { name: 'Low severity', value: w.mistakes.bySeverity.low, color: '#94a3b8' },
            ]}
            height={230}
            centerLabel={`${w.mistakes.total}`}
            centerSub="mistakes"
          />
          <div className="space-y-2.5">
            {w.mistakes.items.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                <Badge variant={MISTAKE_SEVERITY[m.severity] ?? 'secondary'} size="sm">{m.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{m.category}</p>
                  <p className="text-[11px] text-slate-400">{(m.sources ?? []).join(' · ')} · {m.impact}</p>
                  <p className="mt-0.5 flex items-start gap-1 text-[11px] text-indigo-600 dark:text-indigo-300">
                    <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" /> {m.recommendation}
                  </p>
                </div>
                <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <TrendingUp className="h-3 w-3" /> ×{m.frequency}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>

      {/* ============ SECTION 10 · Improvement opportunities ============ */}
      <ChartCard title="Improvement opportunities" subtitle="AI-ranked highest-impact actions">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {w.opportunities.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
              <div className="flex items-start justify-between gap-2">
                <Badge variant={o.category === 'Highest Impact' ? 'danger' : o.category === 'Quick Win' ? 'success' : 'info'} size="sm">{o.category}</Badge>
                <Badge variant={o.priority === 'Critical' ? 'danger' : o.priority === 'High' ? 'warning' : 'secondary'} size="sm">{o.priority}</Badge>
              </div>
              <p className="mt-2 text-[13px] font-bold leading-snug text-slate-800 dark:text-slate-100">{o.title}</p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{o.reason}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Badge variant="gradient" size="sm"><ArrowUpRight className="h-3 w-3" /> {o.estimatedGain}</Badge>
                <Badge variant="outline" size="sm">{o.effort}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </ChartCard>

      {/* ============ SECTION 11 · Weekly action plan ============ */}
      <ChartCard title="Weekly academic action plan" subtitle="AI-generated day-by-day plan" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> This week</Badge>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {w.weeklyPlan.map((day) => (
            <div key={day.day} className={`rounded-2xl border p-3.5 ${day.isToday ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-500/20 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 dark:border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{day.day}</p>
                {day.isToday && <Badge variant="gradient" size="sm">Today</Badge>}
              </div>
              <div className="mt-2 space-y-1.5 text-[10.5px] leading-snug">
                {day.revision && <p className="flex items-start gap-1"><BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-indigo-500" /> <span className="text-slate-600 dark:text-slate-300">{day.revision}</span></p>}
                {day.assignments && <p className="flex items-start gap-1"><FileText className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" /> <span className="text-slate-600 dark:text-slate-300">{day.assignments}</span></p>}
                {day.practice && <p className="flex items-start gap-1"><Target className="mt-0.5 h-3 w-3 shrink-0 text-teal-500" /> <span className="text-slate-600 dark:text-slate-300">{day.practice}</span></p>}
                {day.reading && <p className="flex items-start gap-1"><BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" /> <span className="text-slate-500 dark:text-slate-400">{day.reading}</span></p>}
                {day.mockTest && <p className="flex items-start gap-1"><Timer className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" /> <span className="font-semibold text-rose-600 dark:text-rose-300">{day.mockTest}</span></p>}
              </div>
              <p className="mt-2 border-t border-slate-100 pt-1.5 text-[10px] font-bold text-indigo-600 dark:border-slate-800 dark:text-indigo-300">🎯 {day.goal}</p>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* ============ SECTION 12 · Improvement prediction ============ */}
      <ChartCard
        title="Improvement prediction"
        subtitle="6-week projected growth across all dimensions"
        actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> Confidence: {w.prediction.confidence}</Badge>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {w.prediction.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-slate-100 p-4 text-center dark:border-slate-800">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
              <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
                {m.predicted}<span className="text-xs text-slate-400">{m.unit}</span>
              </p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {m.current} → {m.predicted}
              </p>
            </div>
          ))}
          <div className="rounded-2xl bg-gradient-to-br from-indigo-600/10 to-teal-500/10 p-4 text-center ring-1 ring-indigo-500/15">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Semester improvement</p>
            <p className="mt-1 font-display text-xl font-bold text-indigo-600 dark:text-indigo-300">{w.prediction.expectedSemesterImprovement.value}</p>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{w.prediction.expectedSemesterImprovement.unit}</p>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-1.5 text-[11px] font-semibold text-slate-400">Growth trajectory (6 weeks)</p>
          <AreaTrend data={w.prediction.timeline} xKey="week" height={170} series={[
            { key: 'health', name: 'Health', color: '#10b981' },
            { key: 'performance', name: 'Performance', color: '#6366f1' },
            { key: 'confidence', name: 'Confidence', color: '#8b5cf6' },
          ]} />
        </div>
        <p className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <Sparkles className="mr-1 inline h-3 w-3 text-indigo-500" /> {w.prediction.modelNote}
        </p>
      </ChartCard>
    </div>
  )
}

export { DnaTab }
export default DnaTab
