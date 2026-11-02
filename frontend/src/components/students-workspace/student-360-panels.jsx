/**
 * Faculty — Student 360 canonical intelligence panels (Phase 4 consolidation,
 * Phase 5 evidence→action hardening).
 *
 * ONE canonical presentation surface for the 360 bundle produced by
 * computeStudent360() (canonical attempts → engine → s360 → UI). Every
 * panel is a PURE consumer of the pre-derived s360 data — no second
 * engine, no re-computation, no fabricated evidence.
 *
 * Panels (one per canonical tab):
 *   OverviewPanel          — KPI summary + AI summary + exam history
 *   StrengthsPanel         — evidence-driven strengths, click → questions;
 *                            intervention suggestion ONLY on a real negative
 *                            signal (declining trend / related weakness)
 *   WeaknessesPanel        — actionable weaknesses → evidence questions →
 *                            suggested intervention → Review & Create
 *   TimeBehaviourPanel     — time + observable behaviour (no psychology)
 *   ErrorsPanel            — Careless / Time-related / Unattempted / Unclassified
 *   TrendsPanel            — per-assessment progression + issue statuses
 *   ComparisonPanel        — first vs latest (context-isolated)
 *   DnaPanel               — Academic DNA evidence (reuses engine pools)
 *   SimilarIssuesPanel     — Phase 5: GROUPED issues (≥2 students) AND
 *                            INDIVIDUAL issues for THIS student, each with
 *                            evidence questions + suggested intervention
 *
 * All question evidence flows through the ONE shared EvidenceQuestionsDialog
 * (student-evidence.jsx) — no per-panel dialogs. Subject / Chapter / Question
 * Analysis live in student-intelligence-tabs; Interventions lives in
 * intervention-center. This file only owns the read-only 360 panels.
 */
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, ArrowUpRight, BookOpen, BrainCircuit, CheckCircle2,
  ClipboardList, FileText, Layers, Loader2, PlayCircle, RotateCcw,
  Shield, Target, Timer, TrendingUp, User, Users,
} from 'lucide-react'
import {
  Badge, Button, Card, Table,
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui'
import { ChartCard } from '@/components/shared/chart-card'
import { StatCard } from '@/components/shared/stat-card'
import { AreaTrend, BarCompare, DonutChart } from '@/components/charts'
import { canonicalExamFamily } from '@/api/adapters/questions'
import { ExamHistoryTable } from './student-exam-history'
import {
  EvidenceQuestionsDialog,
  SuggestedInterventionDialog,
} from './student-evidence'
import { useAdminGrantResume, useAdminRestartExam } from '@/services/extra'
import { useToast } from '@/components/ui'

const TREND_STYLE = { improving: 'success', declining: 'danger', stable: 'secondary', new: 'info' }
const ISSUE_TONE = {
  'Persistent weakness': 'danger', 'Resolved issue': 'success', 'Improving issue': 'info',
  'Declining area': 'warning', 'Strong area': 'success', 'Developing area': 'secondary',
}
const matchesContext = (item, context) => {
  const family = canonicalExamFamily(item.examFamily)
  if (family) return family === context
  return context === 'University'
}

/** Canonical question rows for one subject+chapter inside ONE domain. */
export function evidenceRowsFor(s360, domain, subject, chapter) {
  return (s360?.question?.rows ?? []).filter((r) =>
    r.subject === subject && r.chapter === chapter && matchesContext(r, domain))
}

/** The fingerprint partition of an issue matches the selected UI domain. */
export const issueMatchesDomain = (issue, domain) => {
  const family = canonicalExamFamily(issue.examFamily)
  if (family) return family === domain
  return domain === 'University'
}

/* Domain → the s360 sub-pool (subjects/chapters are stored university vs
   competitive[family]; strengths/weaknesses and question rows are the same). */
export function domainPool(s360, domain, key) {
  if (!s360) return []
  const bucket = s360[key]
  if (!bucket) return []
  return domain === 'University' ? (bucket.university ?? []) : (bucket.competitive?.[domain] ?? [])
}

export function domainSwPool(s360, domain) {
  if (!s360) return { strengths: [], weaknesses: [] }
  const sw = s360.strengthsWeaknesses
  return domain === 'University'
    ? (sw?.university ?? { strengths: [], weaknesses: [] })
    : (sw?.competitive?.[domain] ?? { strengths: [], weaknesses: [] })
}

/* ================= Evidence line ================= */
function EvidenceLine({ evidence }) {
  return (
    <p className="mt-1 text-[10.5px] font-medium text-slate-400">
      Evidence: {evidence?.attempts ?? 0} attempt{(evidence?.attempts ?? 0) === 1 ? '' : 's'} ·{' '}
      {evidence?.questions ?? 0} questions · {evidence?.incorrect ?? 0} incorrect ·{' '}
      {evidence?.skipped ?? 0} skipped{evidence?.avgTime ? ` · ${evidence.avgTime}s avg` : ''}
    </p>
  )
}

/* ================= Admin inline — terminated attempts for one student ================= */
function fmtTime(seconds) {
  if (!seconds || seconds <= 0) return '0m'
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function TerminatedAttemptsInline({ attempts }) {
  const toast = useToast()
  const grantMutation = useAdminGrantResume()
  const restartMutation = useAdminRestartExam()
  const [acting, setActing] = useState(null) // { id, action }

  const terminated = (attempts ?? []).filter((a) => a.terminated || a.terminationReason)
  if (!terminated.length) return null

  async function handleResume(a) {
    setActing({ id: a.id, action: 'resume' })
    try {
      const res = await grantMutation.mutateAsync(a.id)
      toast.success('Resume granted', `${res.studentName || a.studentName || 'Student'} can continue. ${fmtTime(res.remainingSeconds)} remaining.`)
    } catch (err) {
      toast.error('Resume failed', err?.response?.data?.detail || err?.message || 'Unexpected error')
    } finally {
      setActing(null)
    }
  }

  async function handleRestart(a) {
    setActing({ id: a.id, action: 'restart' })
    try {
      await restartMutation.mutateAsync(a.id)
      toast.success('Restart authorised', 'Student can now start the exam from scratch.')
    } catch (err) {
      toast.error('Restart failed', err?.response?.data?.detail || err?.message || 'Unexpected error')
    } finally {
      setActing(null)
    }
  }

  return (
    <Card className="border-rose-200/60 p-5 dark:border-rose-500/20">
      <h3 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-rose-700 dark:text-rose-300">
        <AlertTriangle className="h-4 w-4" /> Terminated Exam Attempts ({terminated.length})
      </h3>
      <div className="space-y-3">
        {terminated.map((a) => {
          const isBusy = acting?.id === a.id
          const alreadyGranted = a.resumeGranted
          return (
            <div
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-500/15 dark:bg-rose-500/5"
            >
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{a.examName ?? a.examId}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="danger" size="sm">{a.terminationReason || 'Terminated'}</Badge>
                  {a.submittedAt && (
                    <Badge variant="secondary" size="sm">
                      {new Date(a.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                  {alreadyGranted && <Badge variant="success" size="sm"><CheckCircle2 className="mr-0.5 h-3 w-3" /> Resume granted</Badge>}
                </div>
              </div>
              {!alreadyGranted && (
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" disabled={isBusy} onClick={() => handleResume(a)} title="Keep previous answers, continue from where stopped">
                    {isBusy && acting?.action === 'resume' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    Resume
                  </Button>
                  <Button size="sm" variant="outline" disabled={isBusy} onClick={() => handleRestart(a)} title="Start completely from scratch">
                    {isBusy && acting?.action === 'restart' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    Restart
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

/* ================= Overview ================= */
function OverviewPanel({ s360, studentId, domain, onDomainChange }) {
  const examHistoryRef = useRef(null)
  const [hideZeroScore, setHideZeroScore] = useState(true)
  const pack = s360.byDomain?.[domain]
  const o = (hideZeroScore ? pack?.overview : pack?.overviewAll) ?? s360.overview ?? {}
  const summary = (hideZeroScore ? pack?.aiSummary : pack?.aiSummaryAll) ?? s360.aiSummary
  const topStrengths = pack?.topStrengths ?? s360.strengthsWeaknesses?.topStrengths ?? []
  const topWeaknesses = pack?.topWeaknesses ?? s360.strengthsWeaknesses?.topWeaknesses ?? []

  const domainAttempts = useMemo(
    () => (s360.attempts ?? []).filter((a) => matchesContext(a, domain)),
    [s360, domain])

  /* Attempts visible in the table after applying the unanswered-paper filter.
     An attempt with attemptRate 0 is a walk-through with no answers. */
  const visibleAttempts = useMemo(() => {
    if (!hideZeroScore) return domainAttempts
    return domainAttempts.filter((a) => (Number(a.attemptRate) || 0) > 0)
  }, [domainAttempts, hideZeroScore])

  /* Find the first domain that actually has attempts (for the summary click) */
  const firstDomainWithAttempts = useMemo(() => {
    const all = s360.attempts ?? []
    if (all.some((a) => matchesContext(a, 'NEET'))) return 'NEET'
    if (all.some((a) => matchesContext(a, 'JEE'))) return 'JEE'
    if (all.some((a) => matchesContext(a, 'University'))) return 'University'
    return null
  }, [s360.attempts])

  const scrollToExamHistory = () => {
    /* If no exams visible in current domain, switch to the domain that has them */
    if (domainAttempts.length === 0 && firstDomainWithAttempts && firstDomainWithAttempts !== domain) {
      onDomainChange?.(firstDomainWithAttempts)
    }
    /* Small delay lets the re-render happen before scrolling */
    setTimeout(() => {
      examHistoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <StatCard index={0} label="Latest accuracy" value={o.latestAccuracy != null ? `${o.latestAccuracy}%` : '—'} sub={`avg ${o.avgAccuracy ?? 0}%`} icon="Crosshair" gradient="from-indigo-500 to-blue-500" />
        <StatCard index={1} label="Attempt rate" value={`${o.attemptRate}%`} sub="avg across attempts" icon="ListChecks" gradient="from-emerald-500 to-teal-500" />
        <StatCard index={2} label="Time efficiency" value={`${o.timeEfficiency}%`} sub="avg across attempts" icon="Timer" gradient="from-amber-500 to-orange-500" />
        <StatCard index={3} label="Exams completed" value={String(o.examsCompleted)} sub={`click to view history · trend ${o.trend}`} icon="ClipboardList" gradient="from-violet-500 to-purple-500" onClick={scrollToExamHistory} />
      </div>

      <div className="rounded-3xl border border-indigo-200/60 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-teal-500/10 p-5 ring-1 ring-indigo-500/15 dark:border-indigo-500/25">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
          <BrainCircuit className="h-3.5 w-3.5" /> AI Academic Summary
        </p>
        <button
          type="button"
          onClick={scrollToExamHistory}
          title="Click to view exam history below"
          className="mt-2 w-full cursor-pointer text-left text-[13.5px] leading-relaxed text-slate-700 underline-offset-2 hover:underline dark:text-slate-200"
        >
          {summary}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> What is going well</p>
          <ul className="mt-2.5 space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
            {topStrengths.slice(0, 4).map((s, i) => (
              <li key={i} className="flex items-start gap-2"><ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" /> {s.chapter} — {s.accuracy}% accuracy{s.fast ? ', fast solving' : ''}</li>
            ))}
            {!topStrengths.length && <li className="text-slate-400">No strong areas detected yet.</li>}
          </ul>
        </Card>
        <Card className="p-4">
          <p className="flex items-center gap-2 text-[12px] font-bold text-rose-700 dark:text-rose-300"><AlertTriangle className="h-4 w-4" /> What needs attention</p>
          <ul className="mt-2.5 space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
            {topWeaknesses.slice(0, 4).map((w, i) => (
              <li key={i} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" /> {w.chapter} — {w.accuracy}% accuracy{w.highTime ? ', high time consumption' : ''}</li>
            ))}
            {!topWeaknesses.length && <li className="text-slate-400">No weaknesses flagged.</li>}
          </ul>
        </Card>
      </div>

      {/* Exam history — domain-scoped; preserves the deep link into attempt analysis */}
      <Card ref={examHistoryRef} className="p-5 scroll-mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Exam history — {domain}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">Canonical ExamAgent attempts (demo excluded) · "View Analysis" opens the dedicated attempt route.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="gradient">{visibleAttempts.length} exam(s)</Badge>
            <button
              type="button"
              onClick={() => setHideZeroScore((v) => !v)}
              className={`rounded-xl border px-3 py-1 text-[11px] font-semibold transition-colors ${
                hideZeroScore
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
              }`}
            >
              {hideZeroScore ? 'Real attempts only' : 'Show all'}
            </button>
          </div>
        </div>
        {visibleAttempts.length ? (
          <div className="mt-4"><ExamHistoryTable attempts={visibleAttempts} studentId={studentId} basePath={window.location.pathname.startsWith('/admin') ? '/admin/students' : '/faculty/my-students'} /></div>
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-slate-400">No {domain} exam history yet.</p>
            {hideZeroScore && domainAttempts.length > 0 && (
              <button
                type="button"
                onClick={() => setHideZeroScore(false)}
                className="mt-2 text-[11px] font-semibold text-indigo-500 underline-offset-2 hover:underline"
              >
                Show {domainAttempts.length} hidden attempt(s)
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Admin only — inline resume/restart for this student's terminated attempts */}
      {window.location.pathname.startsWith('/admin') && (
        <TerminatedAttemptsInline attempts={s360.attempts ?? []} />
      )}
    </div>
  )
}

/* ================= Strengths ================= */
/**
 * A strength only earns an intervention suggestion when it carries a REAL
 * negative signal: a declining trend, or the same chapter is also tracked
 * as a weakness/issue in this domain. Never on accuracy alone.
 */
function strengthNegativeSignal(s, weaknessChapters) {
  return s.trend === 'declining' || weaknessChapters.has(`${s.subject}|${s.chapter}`)
}

function StrengthCard({ s, negative, onEvidence, onSuggestion }) {
  return (
    <div className="rounded-2xl border border-emerald-100 p-3.5 dark:border-emerald-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{s.chapter}</p>
        <Badge variant="success" size="sm">{s.accuracy}% accuracy</Badge>
        {s.fast && <Badge variant="outline" size="sm">Fast solving</Badge>}
        {s.trend && <Badge variant={TREND_STYLE[s.trend] ?? 'secondary'} size="sm">{s.trend}</Badge>}
        {negative && <Badge variant="danger" size="sm">Related concern</Badge>}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-400">{s.subject}</p>
      <EvidenceLine evidence={s.evidence} />
      {negative && (
        <p className="mt-1 text-[10.5px] leading-relaxed text-rose-600 dark:text-rose-300">
          {s.trend === 'declining'
            ? 'Accuracy in this strong area is declining across recent assessments.'
            : 'This chapter is also tracked as an active weakness in this domain.'}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEvidence(s)}><FileText className="h-3 w-3" /> View evidence questions</Button>
        {negative && (
          <Button size="sm" variant="ghost" onClick={() => onSuggestion(s)}><Target className="h-3 w-3" /> Suggested intervention</Button>
        )}
      </div>
    </div>
  )
}

function StrengthsPanel({ s360, domain, student, onInterventionCreated }) {
  const [active, setActive] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const pool = domainSwPool(s360, domain)
  const strengths = pool.strengths ?? []
  const weaknessChapters = useMemo(() => new Set((pool.weaknesses ?? []).map((w) => `${w.subject}|${w.chapter}`)), [pool])
  const evidenceRows = useMemo(() => active ? evidenceRowsFor(s360, domain, active.subject, active.chapter) : [], [s360, domain, active])
  const suggestionRows = useMemo(() => suggestion ? evidenceRowsFor(s360, domain, suggestion.subject, suggestion.chapter) : [], [s360, domain, suggestion])
  return (
    <ChartCard title={`Strengths — ${domain}`} subtitle="Evidence-driven: accuracy · speed · trend (from actual attempts). Interventions are suggested only when a real negative signal exists." actions={<Badge variant="success"><TrendingUp className="h-3 w-3" /> {strengths.length} strong</Badge>}>
      {strengths.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {strengths.map((s) => (
            <StrengthCard key={`st-${s.chapter}-${s.subject}`} s={s}
              negative={strengthNegativeSignal(s, weaknessChapters)}
              onEvidence={setActive} onSuggestion={setSuggestion} />
          ))}
        </div>
      ) : <p className="py-6 text-center text-xs text-slate-400">No {domain} strengths detected yet — complete more assessments.</p>}
      <EvidenceQuestionsDialog
        open={!!active} onOpenChange={(v) => !v && setActive(null)}
        title={`Strength evidence — ${active?.chapter ?? ''}`}
        rows={active ? evidenceRows.filter((r) => r.status === 'Correct') : []}
        subject={active?.subject} chapter={active?.chapter} domain={domain}
      />
      <SuggestedInterventionDialog
        open={!!suggestion} onOpenChange={(v) => !v && setSuggestion(null)}
        issue={suggestion} domain={domain} student={student} rows={suggestionRows}
        onCreated={onInterventionCreated}
      />
    </ChartCard>
  )
}

/* ================= Weaknesses (→ evidence → suggested intervention → review & create) ================= */
function WeaknessCard({ w, onEvidence, onSuggestion }) {
  return (
    <div className="rounded-2xl border border-rose-100 p-3.5 dark:border-rose-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{w.chapter}</p>
        <Badge variant="danger" size="sm">{w.accuracy}% accuracy</Badge>
        {w.highTime && <Badge variant="warning" size="sm">{w.avgTime}s avg</Badge>}
        <Badge variant={w.priority === 'High' ? 'danger' : 'warning'} size="sm">{w.priority} priority</Badge>
        {w.trend && <Badge variant={TREND_STYLE[w.trend] ?? 'secondary'} size="sm">{w.trend}</Badge>}
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">{w.reason}</p>
      <EvidenceLine evidence={w.evidence} />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEvidence(w)}><FileText className="h-3 w-3" /> Evidence questions</Button>
        <Button size="sm" variant="ghost" onClick={() => onSuggestion(w)}><Target className="h-3 w-3" /> Suggested intervention</Button>
        <Link to={`/faculty/question-intelligence?tab=question-intelligence&subject=${encodeURIComponent(w.subject)}&chapter=${encodeURIComponent(w.chapter)}`}>
          <Button size="sm" variant="ghost"><BookOpen className="h-3 w-3" /> Related questions</Button>
        </Link>
      </div>
    </div>
  )
}

function WeaknessesPanel({ s360, domain, student, onInterventionCreated }) {
  const [evidence, setEvidence] = useState(null)
  const [suggestion, setSuggestion] = useState(null)
  const pool = domainSwPool(s360, domain)
  const weaknesses = pool.weaknesses ?? []
  const evidenceRows = useMemo(() => evidence ? evidenceRowsFor(s360, domain, evidence.subject, evidence.chapter) : [], [s360, domain, evidence])
  const suggestionRows = useMemo(() => suggestion ? evidenceRowsFor(s360, domain, suggestion.subject, suggestion.chapter) : [], [s360, domain, suggestion])
  return (
    <ChartCard title={`Priority weaknesses — ${domain}`} subtitle="Low accuracy / high time across assessments · every weakness opens its actual questions, then a faculty-reviewed intervention" actions={<Badge variant="danger"><AlertTriangle className="h-3 w-3" /> {weaknesses.length} flagged</Badge>}>
      {weaknesses.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {weaknesses.map((w) => <WeaknessCard key={`wk-${w.chapter}-${w.subject}`} w={w} onEvidence={setEvidence} onSuggestion={setSuggestion} />)}
        </div>
      ) : <p className="py-6 text-center text-xs text-slate-400">No {domain} weaknesses flagged — excellent.</p>}
      <EvidenceQuestionsDialog
        open={!!evidence} onOpenChange={(v) => !v && setEvidence(null)}
        title={`Weakness evidence — ${evidence?.chapter ?? ''}`}
        rows={evidence ? evidenceRows.filter((r) => r.status !== 'Correct') : []}
        subject={evidence?.subject} chapter={evidence?.chapter} domain={domain}
      />
      <SuggestedInterventionDialog
        open={!!suggestion} onOpenChange={(v) => !v && setSuggestion(null)}
        issue={suggestion} domain={domain} student={student} rows={suggestionRows}
        onCreated={onInterventionCreated}
      />
    </ChartCard>
  )
}

/* ================= Time & Behaviour ================= */
function TimeBehaviourPanel({ s360, domain }) {
  const q = s360.question.byContext?.[domain] ?? s360.question
  const t = q.time ?? {}
  const b = q.behaviour ?? {}
  const timeData = (t.bySubject ?? []).map((s) => ({ label: s.subject?.slice(0, 12) ?? '', avgTime: s.avgTime }))
  const diffData = (t.byDifficulty ?? []).map((d) => ({ label: d.difficulty, avgTime: d.avgTime }))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Time intelligence" subtitle="Average time per question · fastest · slowest (observable)" actions={<Badge variant="gradient"><Timer className="h-3 w-3" /> {t.avgTime ?? 0}s avg</Badge>}>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: 'Avg / question', value: `${t.avgTime ?? 0}s` },
            { label: 'Avg correct', value: t.timeByCorrect != null ? `${t.timeByCorrect}s` : '—' },
            { label: 'Avg incorrect', value: t.timeByIncorrect != null ? `${t.timeByIncorrect}s` : '—' },
            { label: 'Fastest', value: t.fastest ? `${t.fastest.time}s` : '—' },
            { label: 'Slowest', value: t.slowest ? `${t.slowest.time}s` : '—' },
            { label: 'Slowest topic', value: t.slowest?.topic ?? '—' },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
              <p className="mt-0.5 truncate text-[14px] font-bold text-slate-800 dark:text-slate-100">{m.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {t.timeByIncorrect != null && t.timeByCorrect != null && t.timeByIncorrect > t.timeByCorrect * 1.3
            ? `Incorrect answers take ${t.timeByIncorrect}s vs ${t.timeByCorrect}s on correct ones — time pressure may be hurting accuracy.`
            : 'Average time on correct vs incorrect answers is broadly similar.'}
        </p>
        {timeData.length > 0 && (
          <div className="mt-3">
            <BarCompare data={timeData} xKey="label" height={200} series={[{ key: 'avgTime', name: 'Avg time (s)', color: '#f59e0b' }]} formatter={(v) => `${v}s`} />
          </div>
        )}
        {diffData.length > 1 && (
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">By difficulty</p>
            <BarCompare data={diffData} xKey="label" height={180} series={[{ key: 'avgTime', name: 'Avg time (s)', color: '#6366f1' }]} formatter={(v) => `${v}s`} />
          </div>
        )}
      </ChartCard>
      <ChartCard title="Behaviour intelligence" subtitle="Observable exam behaviour only — no emotion/motivation inferences">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[
            { label: 'Answer changes', value: String(b.answerChanges ?? 0) },
            { label: 'Revisits', value: String(b.revisits ?? 0) },
            { label: 'Skipped', value: String(b.skipped ?? 0) },
            { label: 'Marked for review', value: String(b.markedForReview ?? 0) },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{m.value}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          {(b.revisits ?? 0) >= 3 && (b.answerChanges ?? 0) >= 3
            ? 'Student frequently revisits and changes answers on difficult questions — typically on slow or incorrect attempts.'
            : (b.skipped ?? 0) >= 3
              ? 'Several questions were skipped after viewing — worth reviewing time allocation.'
              : 'No strong behavioural pattern detected yet.'}
        </p>
      </ChartCard>
    </div>
  )
}

/* ================= Errors ================= */
function ErrorsPanel({ s360, domain }) {
  const q = s360.question.byContext?.[domain] ?? s360.question
  const errors = q.errors ?? []
  const total = q.errorTotal ?? 0
  const ALLOWED = ['Careless', 'Time-related', 'Unattempted', 'Unclassified']
  const safeErrors = errors.filter((e) => ALLOWED.includes(e.category))
  return (
    <ChartCard title={`Error intelligence — ${domain}`} subtitle="Observable categories only — otherwise Unclassified (no fabricated causes)" actions={<Badge variant="gradient">{total} errors</Badge>}>
      {safeErrors.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <DonutChart data={safeErrors.map((e, i) => ({ name: e.category, value: e.count, color: ['#f43f5e', '#f59e0b', '#8b5cf6', '#94a3b8'][i % 4] }))} height={200} centerLabel={String(total)} centerSub="errors" />
          <div className="space-y-2">
            {safeErrors.map((e) => (
              <div key={e.category} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">{e.category}</span>
                <span className="ml-auto text-[13px] font-bold text-slate-800 dark:text-slate-100">{e.count} · {e.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="py-6 text-center text-xs text-slate-400">No error data yet.</p>}
    </ChartCard>
  )
}

/* ================= Trends ================= */
function TrendsPanel({ s360, domain }) {
  const series = useMemo(() => (s360.longitudinal?.series ?? []).filter((s) => matchesContext(s, domain)), [s360, domain])
  const issues = useMemo(() => (s360.longitudinal?.issues ?? []).filter((i) => domain === 'University' ? i.domain === 'university' : i.domain === domain), [s360, domain])
  const chartData = series.map((s) => ({ label: s.shortTitle ?? s.examName ?? s.examId, accuracy: s.accuracy, attemptRate: s.attemptRate, avgTime: s.avgTime }))
  return (
    <div className="space-y-4">
      <ChartCard title={`Performance trend — ${domain}`} subtitle="Accuracy · attempt rate across assessments (first → latest)" actions={<Badge variant="gradient">{series.length} assessments</Badge>}>
        {chartData.length > 1 ? (
          <AreaTrend data={chartData} xKey="label" height={220} series={[
            { key: 'accuracy', name: 'Accuracy (%)', color: '#6366f1' },
            { key: 'attemptRate', name: 'Attempt rate (%)', color: '#14b8a6' },
          ]} formatter={(v) => `${v}%`} />
        ) : <p className="py-8 text-center text-xs text-slate-400">Need at least 2 {domain} attempts to plot a trend.</p>}
      </ChartCard>
      <ChartCard title="Persistent vs resolved issues" subtitle="Classified from chapter trend analysis — each with evidence">
        {issues.length ? (
          <div className="grid gap-2.5 md:grid-cols-2">
            {issues.map((i) => (
              <div key={`${i.subject}-${i.chapter}`} className="flex items-start gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${i.type === 'Persistent weakness' ? 'bg-rose-500' : i.type === 'Resolved issue' ? 'bg-emerald-500' : i.type === 'Improving issue' ? 'bg-sky-500' : 'bg-amber-500'}`} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-slate-800 dark:text-slate-100">
                    {i.chapter} <Badge variant={ISSUE_TONE[i.type] ?? 'secondary'} size="sm">{i.type}</Badge>
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
                    {i.accuracy}% accuracy · {i.avgTime}s avg · {i.evidence?.attempts ?? 0} attempts · {i.evidence?.questions ?? 0} questions
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="py-6 text-center text-xs text-slate-400">No tracked {domain} issues yet.</p>}
      </ChartCard>
    </div>
  )
}

/* ================= Comparison ================= */
function ComparisonPanel({ s360, domain }) {
  const c = s360.comparisonByContext?.[domain] ?? null
  if (!c) {
    return (
      <ChartCard title={`First vs latest — ${domain}`} subtitle="Two attempts of the same context required">
        <p className="py-8 text-center text-xs text-slate-400">Need at least 2 {domain} attempts to compare.</p>
      </ChartCard>
    )
  }
  return (
    <ChartCard title="First vs latest comparison" subtitle={`${c.examA.date} → ${c.examB.date} · ${domain}-only`} actions={<Badge variant="gradient"><Layers className="h-3 w-3" /> Δ</Badge>}>
      <div className="overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>{c.examA.name}</TableHead>
              <TableHead>{c.examB.name}</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="font-semibold text-slate-700 dark:text-slate-200">{r.label}</TableCell>
                <TableCell className="text-[12.5px] font-semibold text-slate-500">{r.a}</TableCell>
                <TableCell className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{r.b}</TableCell>
                <TableCell className="text-right">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.delta === 0 ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : r.better ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                    {r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}{Math.abs(r.delta)}{r.unit}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCard>
  )
}

/* ================= Academic DNA ================= */
function DnaPanel({ s360, domain }) {
  const pool = domainSwPool(s360, domain)
  return (
    <ChartCard title={`AI Academic DNA — ${domain}`} subtitle="Reused from the Student Academic DNA engine (no duplicate calculation) · evidence-clickable" actions={<Badge variant="gradient"><BrainCircuit className="h-3 w-3" /> DNA</Badge>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Strength evidence</p>
          <div className="space-y-2">
            {(pool.strengths ?? []).slice(0, 6).map((s) => (
              <div key={`dna-st-${s.chapter}-${s.subject}`} className="rounded-xl bg-emerald-50/60 p-3 dark:bg-emerald-500/5">
                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{s.chapter} <span className="font-medium text-emerald-700 dark:text-emerald-300">{s.accuracy}%</span></p>
                <EvidenceLine evidence={s.evidence} />
              </div>
            ))}
            {!(pool.strengths ?? []).length && <p className="text-[11px] text-slate-400">No strengths yet.</p>}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400"><AlertTriangle className="h-3.5 w-3.5" /> Weakness evidence</p>
          <div className="space-y-2">
            {(pool.weaknesses ?? []).slice(0, 6).map((w) => (
              <div key={`dna-wk-${w.chapter}-${w.subject}`} className="rounded-xl bg-rose-50/60 p-3 dark:bg-rose-500/5">
                <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{w.chapter} <span className="font-medium text-rose-600 dark:text-rose-300">{w.accuracy}%</span></p>
                <EvidenceLine evidence={w.evidence} />
              </div>
            ))}
            {!(pool.weaknesses ?? []).length && <p className="text-[11px] text-slate-400">No weaknesses flagged.</p>}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

/* ================= Similar Issues (Phase 5, this-student scoped) ================= */
/**
 * TWO clearly separated areas, both domain-isolated:
 *   A. GROUPED ISSUES   — Phase 5 groups (≥2 students) containing this student
 *   B. INDIVIDUAL ISSUES — this student's fingerprints with NO ≥2-student
 *      group (buildIndividualIssue view: whyDetected + priority reuse the
 *      existing fingerprint/severity/priority rules — no second classifier)
 * Every issue exposes View Evidence Questions + Suggested Intervention.
 */
function GroupedIssueCard({ g, studentId, onEvidence, onSuggestion }) {
  const me = (g.students ?? []).find((s) => s.studentId === studentId)
  return (
    <div className="rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{g.subject} — {g.chapter}</p>
        <Badge variant={g.priority === 'Critical' || g.priority === 'High' ? 'danger' : 'warning'} size="sm">{g.priority}</Badge>
        <Badge variant="gradient" size="sm"><Users className="h-2.5 w-2.5" /> {g.studentCount} students</Badge>
      </div>
      <p className="mt-0.5 text-[11px] font-medium text-slate-400">{g.issueType} · {g.examFamily ?? g.domain} · {g.severity} severity</p>
      <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300">{g.whyDetected}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10.5px] text-slate-500">
        {me && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">This student: {me.accuracy}% · {me.avgTime}s</span>}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{g.avgAccuracy}% group avg</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{g.evidence?.questions ?? g.totalQuestions ?? 0} evidence questions</span>
        {g.persistent && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">Persistent</span>}
        {g.declining && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Declining</span>}
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">→ {g.recommendation?.title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEvidence(g)}><FileText className="h-3 w-3" /> Evidence questions</Button>
        <Button size="sm" variant="ghost" onClick={() => onSuggestion(g)}><Target className="h-3 w-3" /> Suggested intervention</Button>
      </div>
    </div>
  )
}

function IndividualIssueCard({ issue, onEvidence, onSuggestion }) {
  return (
    <div className="rounded-2xl border border-amber-100 p-4 dark:border-amber-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" size="sm"><User className="h-2.5 w-2.5" /> Individual issue</Badge>
        <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{issue.subject} → {issue.chapter}</p>
        <Badge variant="secondary" size="sm">{issue.issueType}</Badge>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10.5px] text-slate-500">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Severity: {issue.severity}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Priority: {issue.priority}</span>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">Accuracy: {issue.accuracy ?? '—'}%</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Avg time: {issue.avgTime ?? '—'}s</span>
        {issue.trend && (
          <span className={`rounded-full px-2 py-0.5 ${issue.trend === 'declining' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            Trend: {issue.trend === 'declining' ? 'Declining' : issue.trend}
          </span>
        )}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Evidence: {issue.evidenceQuestionCount ?? 0} questions</span>
      </div>
      <div className="mt-2 rounded-xl bg-amber-50/70 p-2.5 dark:bg-amber-500/5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Why detected</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-amber-900 dark:text-amber-200">{issue.whyDetected}</p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEvidence(issue)}><FileText className="h-3 w-3" /> Evidence questions</Button>
        <Button size="sm" variant="ghost" onClick={() => onSuggestion(issue)}><Target className="h-3 w-3" /> Suggested intervention</Button>
      </div>
    </div>
  )
}

function SimilarIssuesPanel({ studentId, domain, s360, similarIssues, similarIssuesLoading, similarIssuesError, onRetrySimilarIssues, student, onInterventionCreated }) {
  const [evidence, setEvidence] = useState(null)
  const [suggestion, setSuggestion] = useState(null)

  const groups = useMemo(() => {
    const all = similarIssues?.groups ?? []
    return all.filter((g) => issueMatchesDomain(g, domain) && (g.students ?? []).some((s) => s.studentId === studentId))
  }, [similarIssues, studentId, domain])

  const individualIssues = useMemo(() => {
    const all = similarIssues?.individuals ?? []
    return all.filter((f) => f.studentId === studentId && issueMatchesDomain(f, domain))
  }, [similarIssues, studentId, domain])

  const evidenceRows = useMemo(() => evidence ? evidenceRowsFor(s360, domain, evidence.subject, evidence.chapter) : [], [s360, domain, evidence])
  const suggestionRows = useMemo(() => suggestion ? evidenceRowsFor(s360, domain, suggestion.subject, suggestion.chapter) : [], [s360, domain, suggestion])

  if (similarIssuesLoading && !similarIssues) {
    return (
      <ChartCard title={`Similar issues — ${domain}`} subtitle="Loading similar-issue intelligence…">
        <p className="py-6 text-center text-xs text-slate-400">Loading similar issues…</p>
      </ChartCard>
    )
  }

  if (similarIssuesError) {
    return (
      <ChartCard title={`Similar issues — ${domain}`} subtitle="Similar-issue intelligence unavailable right now">
        <div className="py-6 text-center">
          <p className="text-xs text-slate-400">Similar issues could not be loaded. Individual and grouped issue detection needs this data.</p>
          {onRetrySimilarIssues && (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => onRetrySimilarIssues()}>Retry</Button>
          )}
        </div>
      </ChartCard>
    )
  }

  return (
    <ChartCard
      title={`Similar issues — ${domain}`}
      subtitle="Grouped issues are shared by multiple students; individual issues currently have no matching group (prototype similarity score)"
      actions={<Badge variant="gradient"><Users className="h-3 w-3" /> {groups.length} group(s) · {individualIssues.length} individual</Badge>}
    >
      {/* A. GROUPED ISSUES */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">A. Grouped issues — shared with other students</p>
        {groups.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((g) => (
              <GroupedIssueCard key={g.id} g={g} studentId={studentId} onEvidence={setEvidence} onSuggestion={setSuggestion} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">No similar issues currently identified.</p>
        )}
      </div>

      {/* B. INDIVIDUAL ISSUES */}
      <div className="mt-5">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">B. Individual issues — currently specific to this student</p>
        {individualIssues.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {individualIssues.map((issue, i) => (
              <IndividualIssueCard key={`${issue.subject}-${issue.chapter}-${i}`} issue={issue} onEvidence={setEvidence} onSuggestion={setSuggestion} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">No individual issues currently identified.</p>
        )}
      </div>

      <EvidenceQuestionsDialog
        open={!!evidence} onOpenChange={(v) => !v && setEvidence(null)}
        title={`Issue evidence — ${evidence?.chapter ?? ''}`}
        rows={evidenceRows}
        subject={evidence?.subject} chapter={evidence?.chapter} domain={domain}
      />
      <SuggestedInterventionDialog
        open={!!suggestion} onOpenChange={(v) => !v && setSuggestion(null)}
        issue={suggestion} domain={domain} student={student} rows={suggestionRows}
        onCreated={onInterventionCreated}
      />
    </ChartCard>
  )
}

export {
  OverviewPanel, StrengthsPanel, WeaknessesPanel, TimeBehaviourPanel, ErrorsPanel,
  TrendsPanel, ComparisonPanel, DnaPanel, SimilarIssuesPanel,
}
export default {
  OverviewPanel, StrengthsPanel, WeaknessesPanel, TimeBehaviourPanel, ErrorsPanel,
  TrendsPanel, ComparisonPanel, DnaPanel, SimilarIssuesPanel,
}
