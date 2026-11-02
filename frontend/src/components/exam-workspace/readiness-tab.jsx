/**
 * Examination Intelligence Workspace — AI Exam Readiness tab (flagship).
 * ONE readiness orchestration (engine/readiness.js) with two contexts:
 *   University   → every upcoming university exam (semester/course signals)
 *   Competitive  → every upcoming mock (JEE · NEET exam-specific signals)
 * Context is explicit; university and competitive data never mix (Part 5).
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowUpRight, BrainCircuit, CalendarClock, CalendarDays, CheckCircle2,
  ClipboardList, GraduationCap, Lightbulb, Sparkles, Target, TrendingUp, Zap,
} from 'lucide-react'
import { ChartCard } from '@/components/shared/chart-card'
import { ProgressRing } from '@/components/shared/progress-ring'
import { Badge, } from '@/components/ui'
import { formatDate } from '@/utils/format'

const CONTEXTS = [
  { id: 'University', label: 'University', icon: GraduationCap },
  { id: 'Competitive', label: 'Competitive', icon: Zap },
]

function ReadinessTab({ readiness }) {
  const [context, setContext] = useState('University')
  const [family, setFamily] = useState('All')
  const [activeId, setActiveId] = useState(null)

  const university = readiness?.university ?? []
  const competitive = readiness?.competitive ?? []
  const byFamily = readiness?.byExamFamily ?? {}
  const families = readiness?.summary?.families ?? Object.keys(byFamily)

  /* Part 12: when a competitive family (JEE/NEET) is selected, ONLY that
     family's exams appear in the selector — no cross-family mixing. */
  const competitiveFiltered = family === 'All' ? competitive : competitive.filter((e) => e.examFamily === family)
  const exams = context === 'University' ? university : competitiveFiltered
  const effectiveActiveId = activeId ?? exams[0]?.examId
  const active = exams.find((e) => e.examId === effectiveActiveId) ?? exams[0]
  if (!active) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-800">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No {context.toLowerCase()} examinations scheduled</p>
        <p className="mt-1 text-xs text-slate-400">Switch the context to see the other examination set.</p>
      </div>
    )
  }
  const exp = active.expectedPerformance
  const isCompetitive = active.context === 'competitive'

  const switchContext = (id) => {
    setContext(id)
    setFamily('All')
    setActiveId(null)
  }
  const switchFamily = (f) => {
    setFamily(f)
    setActiveId(null)
  }

  return (
    <div className="space-y-6">
      {/* context selector — the distinction is University vs Competitive */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {CONTEXTS.map((c) => (
            <button
              key={c.id}
              onClick={() => switchContext(c.id)}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${context === c.id ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              <c.icon className="h-4 w-4" /> {c.label}
            </button>
          ))}
        </div>
        <Badge variant="gradient" className="px-3 py-1">
          <BrainCircuit className="h-3 w-3" /> {university.length} university · {competitive.length} competitive exams
        </Badge>
        {context === 'Competitive' && families.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {['All', ...families].map((f) => (
              <button
                key={f}
                onClick={() => switchFamily(f)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${family === f ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400'}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* competitive family overview (JEE · NEET) — only in competitive context */}
      {isCompetitive && (
        <div className="grid gap-4 md:grid-cols-2">
          {families.map((f) => {
            const fam = byFamily[f] ?? {}
            return (
              <div key={f} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    <Target className="h-3.5 w-3.5" /> {f} readiness
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {fam.score ?? '—'}<span className="text-sm text-slate-400">/100</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge variant={fam.score >= 70 ? 'success' : fam.score >= 55 ? 'warning' : 'danger'} size="sm">{fam.level ?? '—'}</Badge>
                    <Badge variant="outline" size="sm">Trend {fam.trend ?? '—'}</Badge>
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col gap-1.5 sm:flex">
                  {(fam.factors ?? []).slice(0, 3).map((fct) => (
                    <p key={fct.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                      {fct.label} <span className="font-bold text-slate-700 dark:text-slate-200">{fct.value}%</span>
                    </p>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* exam selector */}
      <div className="flex flex-wrap gap-1.5">
        {exams.map((e) => (
          <button
            key={e.examId}
            onClick={() => setActiveId(e.examId)}
            className={`rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${(activeId ?? exams[0]?.examId) === e.examId ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400'}`}
          >
            {e.title.slice(0, 34)}… · {formatDate(e.date, 'MMM d')}
          </button>
        ))}
      </div>

      {/* overall readiness hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-7 text-white shadow-lift">
        <div className="bg-dots absolute inset-0 opacity-15" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/75">
              <BrainCircuit className="h-4 w-4" /> AI Exam Readiness · {active.context === 'university' ? 'University' : `${active.examFamily} · Competitive`} · {active.title}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold">{active.level} · {active.readiness}% readiness</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
              {isCompetitive
                ? 'Competitive readiness blends mock-test performance, PYQ accuracy, speed, negative-marking discipline, chapter mastery and recent trends — exam-specific signals only.'
                : 'University readiness blends syllabus coverage, internals, attendance, assignments, revision, consistency and your previous exam history — never competitive metrics.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20"><CalendarDays className="mr-1 inline h-3 w-3" /> {active.daysLeft <= 0 ? 'Today' : `${active.daysLeft} days left`}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20"><Target className="mr-1 inline h-3 w-3" /> Confidence {active.confidence}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20"><AlertTriangle className="mr-1 inline h-3 w-3" /> Risk {active.riskLevel}</span>
              {isCompetitive && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20"><TrendingUp className="mr-1 inline h-3 w-3" /> Family {active.examFamily}</span>
              )}
              {active.previousScore != null && (
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold ring-1 ring-white/20"><TrendingUp className="mr-1 inline h-3 w-3" /> Previous {active.previousScore}%{active.previousGrade ? ` (${active.previousGrade})` : ''}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center gap-5">
            <ProgressRing value={active.readiness} size={140} stroke={11} color="#ffffff" track="rgba(255,255,255,0.2)" label={`${active.readiness}%`} sublabel="Ready" />
            <div className="hidden flex-col gap-3 sm:flex">
              <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/20">
                <p className="font-display text-xl font-bold">{exp.marks}<span className="text-xs text-white/70">/{exp.maxMarks}</span></p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">Expected marks</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/20">
                <p className="font-display text-xl font-bold">{isCompetitive && exp.percentile != null ? `${exp.percentile}%ile` : exp.grade ?? '—'}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-white/70">{isCompetitive ? 'Expected percentile' : 'Expected grade'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* preparation factors */}
      <ChartCard title="Preparation status" subtitle="Context-specific factors that feed this readiness score">
        <div className="space-y-3">
          {active.factors.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-44 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{f.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${f.value}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{Math.round(f.value)}%</span>
            </div>
          ))}
        </div>
      </ChartCard>

      {/* strengths vs needs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Strengths before exam" subtitle="What you can rely on" actions={<Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {active.strengths.subjects.length} strong</Badge>}>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isCompetitive ? 'Strong subjects' : 'Strong subjects'}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {active.strengths.subjects.map((s) => <Badge key={s.subjectCode} variant="success">{s.subject} · {s.mastery}%</Badge>)}
                {active.strengths.subjects.length === 0 && <Badge variant="secondary" size="sm">Building — no subject above 75% yet</Badge>}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Strong chapters</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {active.strengths.chapters.slice(0, 5).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
                {active.strengths.chapters.length === 0 && <Badge variant="secondary" size="sm">—</Badge>}
              </div>
            </div>
            {active.strengths.topics.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confident topics</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {active.strengths.topics.slice(0, 5).map((t) => <Badge key={t} variant="info">{t}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Needs revision" subtitle="Prioritise these before the exam" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {active.needsRevision.chapters.length} areas</Badge>}>
          <div className="space-y-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500">Weak subjects</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {active.needsRevision.subjects.map((s) => <Badge key={s.subjectCode} variant="danger">{s.subject} · {s.mastery}%</Badge>)}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Weak chapters</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {active.needsRevision.chapters.slice(0, 5).map((c) => <Badge key={c} variant="warning">{c}</Badge>)}
              </div>
            </div>
            {active.needsRevision.topics.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Weak topics</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {active.needsRevision.topics.slice(0, 5).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                </div>
              </div>
            )}
            {active.needsRevision.concepts.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Priority concepts</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {active.needsRevision.concepts.slice(0, 4).map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* revision planner + exam strategy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Revision planner" subtitle="AI-generated plan counting down to the exam" actions={<Badge variant="gradient"><CalendarClock className="h-3 w-3" /> {active.planner.length} slots</Badge>}>
          <div className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {active.planner.map((slot, i) => (
              <motion.div key={slot.slot} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="relative flex items-start gap-4 pl-1">
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold ring-2 ring-white dark:ring-slate-900 ${i === 0 ? 'bg-gradient-to-br from-indigo-600 to-teal-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{slot.slot}</p>
                  <ul className="mt-1.5 space-y-1">
                    {slot.items.map((it) => (
                      <li key={it} className="flex items-start gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" /> {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </ChartCard>

        <div className="space-y-6">
          <ChartCard title="Exam strategy" subtitle="Time allocation · attempt order · revision order">
            <div className="space-y-3">
              <div className="grid gap-2">
                {active.strategy.timeAllocation.map((t) => (
                  <div key={t.section} className="flex items-center gap-3">
                    <span className="w-36 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{t.section}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs font-bold text-slate-700 dark:text-slate-200">{t.pct}%</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-indigo-50/60 p-3.5 text-[11.5px] leading-relaxed text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
                <Lightbulb className="mr-1 inline h-3.5 w-3.5" /> {active.strategy.questionStrategy}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revision order</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {active.strategy.revisionOrder.map((r, i) => <Badge key={r} variant="outline" size="sm">{i + 1}. {r}</Badge>)}
                </div>
              </div>
            </div>
          </ChartCard>

          <div className="flex items-start gap-3 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <p className="text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
              <span className="font-bold text-indigo-600 dark:text-indigo-300">AI take:</span> your weakest {isCompetitive ? 'chapter' : 'topic'} is "{active.needsRevision.chapters[0] ?? active.needsRevision.topics[0] ?? '—'}" — 30 focused minutes today adds ~2 marks to the expected outcome.
            </p>
          </div>
        </div>
      </div>

      {/* expected outcome + suggestions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Expected outcome" subtitle="Predicted performance for this exam" actions={<Badge variant="gradient"><BrainCircuit className="h-3 w-3" /> AI modelled</Badge>}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Expected marks', value: `${exp.marks}/${exp.maxMarks}` },
              { label: isCompetitive ? 'Expected percentile' : 'Expected grade', value: isCompetitive ? (exp.percentile != null ? `${exp.percentile}%ile` : '—') : exp.grade },
              { label: 'Expected accuracy', value: `${exp.accuracy}%` },
              { label: isCompetitive ? 'Expected rank' : 'Expected rank', value: exp.rank != null ? `#${exp.rank}` : '—' },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-slate-50 p-3.5 text-center dark:bg-slate-800/60">
                <p className="font-display text-lg font-bold text-indigo-600 dark:text-indigo-300">{m.value}</p>
                <p className="text-[10px] font-medium text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50/60 px-3.5 py-2.5 text-[11.5px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" /> Prediction confidence: {active.riskLevel === 'Low' ? 'High' : active.riskLevel === 'Moderate' ? 'Medium' : 'Low'}
          </div>
        </ChartCard>

        <ChartCard title="AI suggestions" subtitle="Highest-impact actions before the exam" actions={<Badge variant="gradient"><Sparkles className="h-3 w-3" /> {active.suggestions.length} actions</Badge>}>
          <div className="space-y-2.5">
            {active.suggestions.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <p className="flex items-start gap-2 text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" /> {s.text}
                </p>
                <Badge variant={s.impact === 'High' ? 'danger' : 'warning'} size="sm">{s.impact}</Badge>
              </motion.div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 p-6 text-white shadow-lift sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[15px] font-bold">Dive deeper into the exam</p>
            <p className="text-xs text-white/80">Generate the full AI Exam Analysis for this paper — question-level intelligence, mistakes and recommendations.</p>
          </div>
        </div>
        <a href="/student/exam-analysis" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 transition-all hover:bg-indigo-50">
          <ArrowUpRight className="h-4 w-4" /> Open AI Exam Analysis
        </a>
      </div>
    </div>
  )
}

export { ReadinessTab }
export default ReadinessTab
