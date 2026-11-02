import { motion } from 'framer-motion'
import {
  ArrowRight, BookMarked, BrainCircuit, ClipboardList, Flame, Sparkles, Target, Timer,
} from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogHeader, DialogTitle, Progress } from '@/components/ui'
import { ProgressRing } from '@/components/shared/progress-ring'
import { formatDate } from '@/utils/format'

const ringColor = (v) => (v >= 85 ? '#10b981' : v >= 70 ? '#f59e0b' : '#f43f5e')

function isPlaceholderChip(value) {
  const text = String(value ?? '').trim()
  return !text || text === '—' || text === '-' || text === '–'
}

/**
 * Student Success Center — 4 competitive intelligence cards:
 *   1. AI Exam DNA        — concept-level strengths/weaknesses mapped to JEE/NEET syllabus
 *   2. Mock Test Readiness — next mock, projected rank, percentile trend
 *   3. Time Budget Planner — hours per subject vs target, streak, weak-subject alert
 *   4. Milestone Tracker  — syllabus completion %, chapters done, revision cycles
 */
function SuccessCenter({ derived, profile, datasets, dnaOpen, readinessOpen, careerOpen, portfolioOpen, onOpenChange }) {
  const h = derived.academicHealth
  const dna = derived.academicDna

  // Competitive readiness (all families merged)
  const competitive = derived.readiness?.competitive ?? []
  const university = derived.readiness?.university ?? []
  const allExams = [...competitive, ...university]
  const readinessByFamily = derived.readiness?.byExamFamily ?? {}

  const today = new Date().toISOString().slice(0, 10)
  const nextExam = [...allExams].sort((a, b) => new Date(a.date) - new Date(b.date)).find((r) => r.date >= today) ?? allExams[0]

  // Overall intelligence (keep existing formula)
  const overallIntelligence = Math.round(
    (h.score + derived.consistencyScore + derived.confidenceIndex + derived.improvementIndex) / 4,
  )

  // Mock test stats
  const mockHistory = datasets.mockHistory ?? datasets.examAttempts ?? []
  const lastMock = mockHistory[mockHistory.length - 1]
  const mockAvgScore = mockHistory.length
    ? Math.round(mockHistory.reduce((s, m) => s + (m.score ?? m.percentage ?? 0), 0) / mockHistory.length)
    : null
  const projectedRank = lastMock?.projectedRank ?? lastMock?.rank ?? null

  // Time budget
  const studyStats = datasets.studyStatistics ?? {}
  const weeklyHours = studyStats.weeklyHours ?? 0
  const targetWeeklyHours = studyStats.targetWeeklyHours ?? 35
  const streak = studyStats.streakDays ?? 0
  const weakSubject = derived.weaknesses?.[0]?.subject ?? '—'
  const timeBudgetPct = targetWeeklyHours > 0 ? Math.round((weeklyHours / targetWeeklyHours) * 100) : 0

  // Milestone / syllabus
  const syllabus = datasets.syllabusCoverage ?? datasets.competitiveSyllabus ?? []
  const syllabusAvg = syllabus.length
    ? Math.round(syllabus.reduce((s, x) => s + (x.progress ?? x.pct ?? 0), 0) / syllabus.length)
    : (derived.university?.courses?.length
      ? Math.round(derived.university.courses.reduce((s, c) => s + (c.progress ?? 0), 0) / derived.university.courses.length)
      : 0)
  const revisionCycles = datasets.revisionCycles ?? studyStats.revisionCycles ?? 0
  const chaptersDone = datasets.chaptersDone ?? null
  const chaptersTotal = datasets.chaptersTotal ?? null

  const competitiveChips = Object.entries(readinessByFamily).map(([family, fam]) => ({
    family,
    score: fam?.score ?? '—',
  }))

  const cards = [
    {
      key: 'dna',
      icon: BrainCircuit,
      grad: 'from-indigo-600 to-violet-600',
      title: 'AI Exam DNA',
      subtitle: 'Concept-level learning fingerprint',
      ringValue: h.score,
      ringLabel: `${h.score}`,
      ringSub: 'Health',
      headline: `${overallIntelligence}`,
      headlineSub: 'Overall intelligence',
      chips: [
        { label: 'Trend', value: h.delta >= 0 ? `+${h.delta}` : `${h.delta}`, tone: h.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500' },
        { label: 'Grade', value: h.grade },
        { label: 'Consistency', value: `${derived.consistencyScore}%` },
      ],
      summary: dna.summary,
      cta: 'View DNA Details',
    },
    {
      key: 'readiness',
      icon: Target,
      grad: 'from-teal-500 to-emerald-500',
      title: 'Mock Test Readiness',
      subtitle: nextExam ? `Next: ${nextExam.title?.slice(0, 34)}…` : 'No upcoming mock',
      ringValue: nextExam?.readiness ?? 0,
      ringLabel: `${nextExam?.readiness ?? 0}`,
      ringSub: 'Ready',
      headline: mockAvgScore != null ? `${mockAvgScore}%` : `${derived.confidenceIndex}`,
      headlineSub: mockAvgScore != null ? 'Mock avg score' : 'Confidence index',
      chips: [
        { label: 'Next mock', value: nextExam ? formatDate(nextExam.date, 'MMM d') : '—' },
        ...competitiveChips.slice(0, 2).map((c) => ({ label: `${c.family} ready`, value: `${c.score}%` })),
      ],
      summary: nextExam
        ? `${nextExam.title} on ${formatDate(nextExam.date, 'MMMM d')} — AI rates you "${nextExam.level}"${projectedRank ? ` · Projected rank ${projectedRank}` : ''}.`
        : 'No upcoming mock tests scheduled.',
      cta: 'View Readiness',
    },
    {
      key: 'career',
      icon: Timer,
      grad: 'from-amber-500 to-orange-500',
      title: 'Time Budget Planner',
      subtitle: `${weeklyHours}h studied this week`,
      ringValue: Math.min(timeBudgetPct, 100),
      ringLabel: `${Math.min(timeBudgetPct, 100)}`,
      ringSub: 'Target %',
      headline: `${streak}`,
      headlineSub: 'Day streak 🔥',
      chips: [
        { label: 'This week', value: `${weeklyHours}h` },
        { label: 'Target', value: `${targetWeeklyHours}h` },
        { label: 'Weak area', value: weakSubject },
      ],
      summary: timeBudgetPct >= 100
        ? `On track — you've hit your ${targetWeeklyHours}h weekly target. Keep the streak alive!`
        : `${weeklyHours}/${targetWeeklyHours}h done. ${targetWeeklyHours - weeklyHours}h remaining to hit your weekly goal. Focus on ${weakSubject}.`,
      cta: 'View Study Plan',
    },
    {
      key: 'portfolio',
      icon: BookMarked,
      grad: 'from-fuchsia-500 to-pink-500',
      title: 'Milestone Tracker',
      subtitle: 'Syllabus · chapters · revision',
      ringValue: syllabusAvg,
      ringLabel: `${syllabusAvg}`,
      ringSub: 'Syllabus',
      headline: chaptersDone != null ? `${chaptersDone}` : `${revisionCycles}`,
      headlineSub: chaptersDone != null ? `of ${chaptersTotal ?? '?'} chapters` : 'Revision cycles',
      chips: [
        { label: 'Syllabus done', value: `${syllabusAvg}%` },
        { label: 'Revision cycles', value: `${revisionCycles}` },
        chaptersDone != null
          ? { label: 'Chapters done', value: `${chaptersDone}/${chaptersTotal ?? '?'}` }
          : { label: 'Weak concepts', value: `${dna.weakConcepts?.length ?? 0}` },
      ],
      summary: `${syllabusAvg}% of syllabus covered · ${revisionCycles} revision cycle(s) completed${chaptersDone != null ? ` · ${chaptersDone} of ${chaptersTotal} chapters done` : ''}.`,
      cta: 'View Milestones',
    },
  ]

  return (
    <section id="success-center" className="scroll-mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" /> Competitive Intelligence Center
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Your exam preparation at a glance</h2>
        </div>
        <Badge variant="gradient" className="px-3 py-1">AI powered</Badge>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {cards.map((c, i) => {
          const chips = c.chips.filter((ch) => !isPlaceholderChip(ch.value))
          return (
            <motion.div key={c.key} className="h-full" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="group flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${c.grad} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-right">
                    <Badge variant={c.key === 'dna' ? 'gradient' : 'secondary'} size="sm">{c.title}</Badge>
                    {c.subtitle && <p className="mt-1.5 text-[11px] font-medium leading-snug text-slate-400">{c.subtitle}</p>}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-5">
                  <ProgressRing value={c.ringValue} size={88} stroke={8} label={c.ringLabel} sublabel={c.ringSub} color={ringColor(c.ringValue)} />
                  <div className="min-w-0">
                    <p className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{c.headline}</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{c.headlineSub}</p>
                  </div>
                </div>

                {chips.length > 0 && (
                  <div className={`mt-5 grid gap-2 ${chips.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {chips.map((ch) => (
                      <div key={ch.label} className="rounded-xl bg-slate-50 px-2.5 py-2 text-center dark:bg-slate-800/60">
                        <p className={`text-[13px] font-bold leading-tight text-slate-800 dark:text-slate-100 ${ch.tone ?? ''}`}>{ch.value}</p>
                        <p className="mt-0.5 text-[10px] font-medium leading-tight text-slate-400">{ch.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 line-clamp-3 flex-1 text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">{c.summary}</p>

                <div className="mt-5">
                  <Button size="sm" variant="outline" className="w-full" onClick={() => onOpenChange({ [c.key]: true })}>
                    {c.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Detail Dialogs ── */}

      {/* 1. AI Exam DNA */}
      <Dialog open={dnaOpen} onOpenChange={(v) => onOpenChange({ dna: v })}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-indigo-500" /> AI Exam DNA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-6 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-violet-500/10 p-5 ring-1 ring-indigo-500/15">
              <ProgressRing value={h.score} size={110} stroke={10} label={`${h.score}`} sublabel="Health" color={ringColor(h.score)} />
              <div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-white">{h.grade} · {h.trend}</p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">{h.factors?.map((f) => `${f.label} ${f.value}`).join(' · ')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="success">Consistency {derived.consistencyScore}%</Badge>
                  <Badge variant="info">Confidence {derived.confidenceIndex}</Badge>
                  <Badge variant="gradient">Improvement {derived.improvementIndex}</Badge>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-emerald-50/60 p-4 dark:bg-emerald-500/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Strong topics</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {derived.strengths.map((s) => (
                    <Badge key={s.subjectCode} variant="success">{s.subject} · {s.mastery}%</Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-rose-50/60 p-4 dark:bg-rose-500/5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Weak topics</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {derived.weaknesses.map((s) => (
                    <Badge key={s.subjectCode} variant="danger">{s.subject} · {s.mastery}%</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Concepts to revise</p>
              <div className="flex flex-wrap gap-1.5">
                {dna.weakConcepts?.slice(0, 8).map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 text-[12px] leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <span className="font-bold text-indigo-600 dark:text-indigo-300">AI Summary:</span> {dna.summary}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Mock Test Readiness */}
      <Dialog open={readinessOpen} onOpenChange={(v) => onOpenChange({ readiness: v })}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-teal-500" /> Mock Test Readiness
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* Per-exam-family summary */}
            {Object.entries(readinessByFamily).map(([family, fam]) => (
              <div key={family} className="rounded-2xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 p-4 ring-1 ring-teal-500/15">
                <div className="flex items-center justify-between">
                  <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100">{family}</p>
                  <Badge variant={fam.score >= 70 ? 'success' : fam.score >= 55 ? 'warning' : 'danger'} size="sm">{fam.level}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={fam.score ?? 0} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fam.score ?? '—'}%</span>
                </div>
                {fam.recommendations?.slice(0, 2).map((r) => (
                  <p key={r.text} className="mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">• {r.text}</p>
                ))}
              </div>
            ))}
            {/* Individual upcoming exams */}
            {allExams.map((r) => (
              <div key={r.examId} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-bold text-slate-800 dark:text-slate-100">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={r.context === 'university' ? 'secondary' : 'gradient'} size="sm">
                      {r.context === 'university' ? 'University' : r.examFamily}
                    </Badge>
                    <Badge variant={r.level === 'Ready' ? 'success' : r.level === 'Almost Ready' ? 'info' : r.level === 'Needs Work' ? 'warning' : 'danger'} size="sm">
                      {r.level}
                    </Badge>
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(r.date, 'MMM d, yyyy')}</p>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={r.readiness} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.readiness}%</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.factors?.map((f) => (
                    <Badge key={f.label} variant="secondary" size="sm">{f.label}: {Math.round(f.value)}%</Badge>
                  ))}
                </div>
              </div>
            ))}
            {allExams.length === 0 && (
              <p className="text-center text-sm text-slate-400">No upcoming mock tests scheduled.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Time Budget Planner */}
      <Dialog open={careerOpen} onOpenChange={(v) => onOpenChange({ career: v })}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-500" /> Time Budget Planner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-6 rounded-3xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5 ring-1 ring-amber-500/15">
              <ProgressRing value={Math.min(timeBudgetPct, 100)} size={110} stroke={10} label={`${Math.min(timeBudgetPct, 100)}`} sublabel="Target %" color={ringColor(Math.min(timeBudgetPct, 100))} />
              <div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-white">{weeklyHours}h / {targetWeeklyHours}h target</p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {streak} day streak · Focus on {weakSubject}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant={streak >= 7 ? 'success' : streak >= 3 ? 'info' : 'secondary'}>
                    <Flame className="mr-1 h-3 w-3" />{streak}d streak
                  </Badge>
                  <Badge variant="warning">Weak: {weakSubject}</Badge>
                </div>
              </div>
            </div>
            {/* Per-subject time allocation if available */}
            {(datasets.subjectTimeAllocation ?? []).map((s) => (
              <div key={s.subject} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex justify-between">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject}</p>
                  <span className="text-xs font-bold text-slate-500">{s.hours}h / {s.target}h</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={s.target > 0 ? Math.round((s.hours / s.target) * 100) : 0} className="h-2 flex-1" />
                  <span className="text-[10px] font-bold text-slate-400">
                    {s.target > 0 ? `${Math.round((s.hours / s.target) * 100)}%` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. Milestone Tracker */}
      <Dialog open={portfolioOpen} onOpenChange={(v) => onOpenChange({ portfolio: v })}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-fuchsia-500" /> Milestone Tracker
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="flex items-center gap-6 rounded-3xl bg-gradient-to-r from-fuchsia-500/10 to-pink-500/10 p-5 ring-1 ring-fuchsia-500/15">
              <ProgressRing value={syllabusAvg} size={110} stroke={10} label={`${syllabusAvg}`} sublabel="Syllabus %" color={ringColor(syllabusAvg)} />
              <div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-white">
                  {chaptersDone != null ? `${chaptersDone}/${chaptersTotal ?? '?'} chapters done` : `${revisionCycles} revision cycle(s)`}
                </p>
                <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">
                  {syllabusAvg}% syllabus covered overall
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="gradient">Syllabus {syllabusAvg}%</Badge>
                  <Badge variant="info">Revisions {revisionCycles}</Badge>
                </div>
              </div>
            </div>
            {/* Per-subject syllabus coverage */}
            {(datasets.syllabusCoverage ?? datasets.competitiveSyllabus ?? []).map((s, i) => (
              <div key={s.id ?? i} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex justify-between">
                  <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.subject ?? s.title}</p>
                  <Badge variant="secondary" size="sm">{s.examFamily ?? ''}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={s.progress ?? s.pct ?? 0} className="h-2 flex-1" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{s.progress ?? s.pct ?? 0}%</span>
                </div>
                {s.chaptersDone != null && (
                  <p className="mt-1 text-[11px] text-slate-400">{s.chaptersDone}/{s.chaptersTotal ?? '?'} chapters</p>
                )}
              </div>
            ))}
            {(datasets.syllabusCoverage ?? datasets.competitiveSyllabus ?? []).length === 0 && (
              <p className="text-center text-sm text-slate-400">Syllabus coverage data will appear once tracked.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export { SuccessCenter }
export default SuccessCenter
