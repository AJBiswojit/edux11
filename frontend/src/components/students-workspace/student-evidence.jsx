/**
 * Faculty — Student Profile · Question evidence / detail / intervention.
 * EvidenceQuestionCard · EvidenceQuestionsDialog (THE one shared evidence
 * dialog) · SuggestedInterventionDialog · QuestionDetailDialog ·
 * InterventionRecommendationCard.
 *
 * Phase 5 hardening: EvidenceQuestionsDialog is the single reusable evidence
 * surface for Strengths, Weaknesses, Chapter Intelligence, Similar Issues
 * (grouped) and Individual Issues — never one dialog per panel. It renders
 * ONLY canonical attempt rows (real questions the student answered) plus the
 * existing Question Bank / PYQ datasets as related sources. No fabricated
 * questions, ever; if there is no question-level evidence it says so.
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, BrainCircuit, CheckCircle2, ClipboardList, FileText, Target, X } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui'
import {
  resolveEvidenceQuestions,
  generateAiObservation,
  generateWhyFlagged,
  generateInterventionRecommendation,
} from '@/intelligence/faculty/engine/ground-level-intelligence'
import { useWeakTopicQuestions } from '@/services/faculty-students'
import { useRelatedResources } from '@/services/faculty-interventions'
import { ReviewCreateInterventionDialog } from './intervention-center'
import { QUESTION_OPTION_LABELS } from '@/constants/ui'
import { MathText } from '@/components/shared/math-text'
import { optionText } from '@/api/adapters/questions'

const LETTERS = QUESTION_OPTION_LABELS

const RESULT_STYLE = { Correct: 'success', Incorrect: 'danger', Skipped: 'warning' }
export const EVIDENCE_EMPTY_MESSAGE = 'No question-level evidence available.'

/** Pure filter used by every evidence surface (exported for tests). */
export function filterEvidenceRows(rows = [], { status = 'All' } = {}) {
  if (status === 'All') return rows
  if (status === 'Slow') return rows.filter((r) => (r.timeSpent ?? 0) >= 90)
  return rows.filter((r) => r.status === status)
}

/* ================= Single evidence question card ================= */
function EvidenceQuestionCard({ row, allRows, onDetail }) {
  const evidence = resolveEvidenceQuestions([row])[0]
  const whyFlags = generateWhyFlagged(evidence, allRows)

  return (
    <div className="rounded-2xl border border-slate-200/70 p-3.5 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={row.status === 'Correct' ? 'success' : row.status === 'Incorrect' ? 'danger' : 'warning'} size="sm">{row.status}</Badge>
        <Badge variant="outline" size="sm">{row.difficulty ?? 'Medium'}</Badge>
        <Badge variant="secondary" size="sm">{row.type ?? 'MCQ'}</Badge>
        {row.id && <Badge variant="secondary" size="sm">{row.id}</Badge>}
        <span className="ml-auto text-[10px] font-medium text-slate-400">{row.examName} · {row.date}</span>
      </div>
      {row.text && <p className="mt-2 text-[12px] leading-relaxed text-slate-700 dark:text-slate-200">{row.text}</p>}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10.5px]">
        <span className="text-slate-500">Student answer: <span className="font-bold text-slate-700 dark:text-slate-200">{typeof row.selected === 'number' ? LETTERS[row.selected] : row.selected ?? '—'}</span></span>
        <span className="text-slate-500">Correct answer: <span className="font-bold text-emerald-600">{typeof row.correctAnswer === 'number' ? LETTERS[row.correctAnswer] : row.correctAnswer ?? '—'}</span></span>
        <span className="text-slate-500">Time: <span className="font-bold">{row.timeSpent}s</span></span>
        <span className="text-slate-500">Answer changes: <span className="font-bold">{row.answerChanges ?? 0}</span></span>
        <span className="text-slate-500">Revisits: <span className="font-bold">{row.revisits ?? 0}</span></span>
        <span className="text-slate-500">Marked for review: <span className="font-bold">{row.markedForReview ? 'Yes' : 'No'}</span></span>
        <span className="text-slate-500">Subject: <span className="font-bold">{row.subject ?? '—'}</span></span>
        <span className="text-slate-500">Chapter: <span className="font-bold">{row.chapter ?? '—'}</span></span>
        {row.topic && <span className="text-slate-500">Topic: <span className="font-bold">{row.topic}</span></span>}
      </div>
      {whyFlags.length > 0 && (
        <div className="mt-2 rounded-xl bg-amber-50/70 p-2 dark:bg-amber-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Why Flagged</p>
          <ul className="mt-1 space-y-0.5">
            {whyFlags.map((f, i) => <li key={i} className="text-[10.5px] text-amber-800 dark:text-amber-300">• {f}</li>)}
          </ul>
        </div>
      )}
      {onDetail && (
        <Button size="sm" variant="ghost" className="mt-1.5 !px-2 !py-1 text-[10.5px]" onClick={() => onDetail(row)}>
          <FileText className="h-3 w-3" /> Question details
        </Button>
      )}
    </div>
  )
}

/* ================= THE shared evidence dialog ================= */
/**
 * ONE reusable evidence-question dialog.
 *   rows    — canonical s360 question rows for the issue (pre-scoped by the
 *             caller to the right subject/chapter/domain; never fabricated)
 *   domain  — 'University' | 'JEE' | 'NEET' (drives the related-source pool)
 * Supports: status filtering, per-question detail, time/changes/revisits,
 * related Question Bank (University) / PYQ (JEE-NEET) sources, and an honest
 * empty state — the dialog is never blank.
 */
function EvidenceQuestionsDialog({ open, onOpenChange, title, rows = [], subject, chapter, domain }) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [detail, setDetail] = useState(null)
  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows])
  const universityBank = useWeakTopicQuestions(
    domain === 'University' ? subject : null,
    domain === 'University' ? chapter : null,
  )
  const competitiveSources = useRelatedResources(
    domain && domain !== 'University' ? { subject, chapter, examFamily: domain } : { subject: null, chapter: null },
  )

  const filtered = useMemo(() => filterEvidenceRows(safeRows, { status: statusFilter }), [safeRows, statusFilter])
  const counts = useMemo(() => ({
    All: safeRows.length,
    Correct: safeRows.filter((r) => r.status === 'Correct').length,
    Incorrect: safeRows.filter((r) => r.status === 'Incorrect').length,
    Skipped: safeRows.filter((r) => r.status === 'Skipped').length,
    Slow: safeRows.filter((r) => (r.timeSpent ?? 0) >= 90).length,
  }), [safeRows])

  const relatedBank = domain === 'University' ? (universityBank.data?.items ?? []) : []
  const relatedPyqs = domain && domain !== 'University' ? (competitiveSources.data?.pyqs ?? []) : []
  const relatedLoading = domain === 'University' ? universityBank.isLoading : competitiveSources.isLoading
  const hasRelated = relatedBank.length > 0 || relatedPyqs.length > 0

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[88vh] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-500" /> {title ?? 'Evidence questions'}
              <Badge variant="secondary" size="sm">{safeRows.length} question(s)</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[64vh] space-y-3 overflow-y-auto pr-1">
            {/* status filter */}
            {safeRows.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {['All', 'Correct', 'Incorrect', 'Skipped', 'Slow'].map((f) => (
                  <button key={f} onClick={() => setStatusFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${statusFilter === f ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-400'}`}>
                    {f === 'Slow' ? 'Slow (≥90s)' : f} · {counts[f] ?? 0}
                  </button>
                ))}
              </div>
            )}

            {safeRows.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">{EVIDENCE_EMPTY_MESSAGE}</p>
            ) : filtered.length ? (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Student evidence — {filtered.length} of {safeRows.length} question(s)
                </p>
                {filtered.map((r, i) => (
                  <EvidenceQuestionCard key={`${r.attemptId}-${r.id}-${i}`} row={r} allRows={safeRows} onDetail={setDetail} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">No questions match the “{statusFilter}” filter.</p>
            )}

            {/* related sources (existing datasets, clearly separated) */}
            {domain && (relatedLoading || hasRelated) && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {domain === 'University' ? 'Related Question Bank' : `Related ${domain} PYQs`} — practice sources (not student answers)
                </p>
                {relatedLoading && <p className="text-[11px] text-slate-400">Loading related questions…</p>}
                {relatedBank.map((q) => (
                  <div key={q.id} className="mb-2 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" size="sm">{q.id}</Badge>
                      <Badge variant="outline" size="sm">{q.type} · {q.difficulty}</Badge>
                      {q.status && <Badge variant={q.status === 'Approved' ? 'success' : 'warning'} size="sm">{q.status}</Badge>}
                      {q.pyqFrequency > 0 && <Badge variant="warning" size="sm">PYQ ×{q.pyqFrequency}</Badge>}
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{q.text}</p>
                    <p className="mt-1 text-[10.5px] font-medium text-slate-400">{q.chapter} · {q.topic}</p>
                  </div>
                ))}
                {relatedPyqs.map((q) => (
                  <div key={q.id} className="mb-2 rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" size="sm">{q.id}</Badge>
                      <Badge variant="warning" size="sm">PYQ {q.exam}{q.year ? ` · ${q.year}` : ''}</Badge>
                      <Badge variant="outline" size="sm">{q.difficulty}</Badge>
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">{q.text}</p>
                    <p className="mt-1 text-[10.5px] font-medium text-slate-400">{q.chapter} · {q.topic ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <QuestionDetailDialog row={detail} open={!!detail} onClose={() => setDetail(null)} allRows={safeRows} />
    </>
  )
}

/* ================= Question detail dialog ================= */
function QuestionDetailDialog({ row, open, onClose, allRows }) {
  if (!row) return null
  const evidence = resolveEvidenceQuestions([row])[0]
  const observation = generateAiObservation(evidence)
  const whyFlags = generateWhyFlagged(evidence, allRows ?? [])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Question Detail
            <Badge variant={row.status === 'Correct' ? 'success' : row.status === 'Incorrect' ? 'danger' : 'warning'} size="sm">{row.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {row.text && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-800 dark:text-slate-100"><MathText>{row.text}</MathText></p>
            </div>
          )}
          {row.options?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Options</p>
              <div className="mt-1 space-y-1">
                {row.options.map((opt, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[12px] ${i === row.correctAnswer ? 'bg-emerald-50 font-bold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : i === row.selected && row.status === 'Incorrect' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>
                    <span className="font-bold">{LETTERS[i]}.</span> <MathText>{optionText(opt)}</MathText>
                    {i === row.correctAnswer && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                    {i === row.selected && row.status === 'Incorrect' && <X className="ml-auto h-3.5 w-3.5 text-rose-500" />}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-[11px] dark:bg-slate-800/60">
            <div><span className="text-slate-400">Student Answer:</span> <span className="font-bold">{typeof row.selected === 'number' ? LETTERS[row.selected] : row.selected ?? '—'}</span></div>
            <div><span className="text-slate-400">Correct Answer:</span> <span className="font-bold text-emerald-600">{typeof row.correctAnswer === 'number' ? LETTERS[row.correctAnswer] : row.correctAnswer ?? '—'}</span></div>
            <div><span className="text-slate-400">Time Spent:</span> <span className="font-bold">{row.timeSpent}s</span></div>
            <div><span className="text-slate-400">Answer Changes:</span> <span className="font-bold">{row.answerChanges ?? 0}</span></div>
            <div><span className="text-slate-400">Revisit Count:</span> <span className="font-bold">{row.revisits ?? 0}</span></div>
            <div><span className="text-slate-400">Marked for Review:</span> <span className="font-bold">{row.markedForReview ? 'Yes' : 'No'}</span></div>
            <div><span className="text-slate-400">Difficulty:</span> <span className="font-bold">{row.difficulty ?? '—'}</span></div>
            <div><span className="text-slate-400">Question Type:</span> <span className="font-bold">{row.type ?? 'MCQ'}</span></div>
            <div><span className="text-slate-400">Subject:</span> <span className="font-bold">{row.subject}</span></div>
            <div><span className="text-slate-400">Chapter:</span> <span className="font-bold">{row.chapter}</span></div>
            <div><span className="text-slate-400">Topic:</span> <span className="font-bold">{row.topic ?? '—'}</span></div>
            <div><span className="text-slate-400">Assessment:</span> <span className="font-bold">{row.examName}</span></div>
            <div><span className="text-slate-400">Date:</span> <span className="font-bold">{row.date}</span></div>
            <div><span className="text-slate-400">Question ID:</span> <span className="font-bold">{row.id}</span></div>
          </div>
          {observation && (
            <div className="rounded-xl bg-indigo-50/70 p-3 dark:bg-indigo-500/5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                <BrainCircuit className="h-3 w-3" /> AI Observation
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-indigo-900 dark:text-indigo-200">{observation}</p>
            </div>
          )}
          {whyFlags.length > 0 && (
            <div className="rounded-xl bg-amber-50/70 p-3 dark:bg-amber-500/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Why This Question Is Evidence</p>
              <ul className="mt-1 space-y-0.5">
                {whyFlags.map((f, i) => <li key={i} className="text-[11px] text-amber-800 dark:text-amber-300">• {f}</li>)}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================= Suggested intervention (recommendation only) ================= */
/**
 * Shared suggestion dialog: displays the recommendation derived by the
 * EXISTING generateInterventionRecommendation() engine from the issue's
 * actual question rows, then offers "Review & Create Intervention" (the
 * creation itself runs through the existing Phase 6 lifecycle via
 * ReviewCreateInterventionDialog). Recommendation only — clearly labelled
 * "Faculty review required". Never auto-creates.
 */
function SuggestedInterventionDialog({ open, onOpenChange, issue, domain, student, rows = [], onCreated }) {
  const [reviewOpen, setReviewOpen] = useState(false)
  /* Derive from the EXISTING engine using this issue's actual question rows. */
  const rowsForIssue = useMemo(() => (Array.isArray(rows) ? rows : []), [rows])
  const issueContext = useMemo(() => issue ?? {}, [issue])

  if (!issueContext.subject || !issueContext.chapter) return null
  const rec = generateSuggestion(rowsForIssue, issueContext)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Target className="h-4 w-4 text-indigo-500" /> Suggested intervention — {issueContext.chapter}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 px-3 py-2 dark:bg-amber-500/10">
              <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200">Faculty review required — this is a recommendation only. Nothing is created or assigned automatically.</p>
            </div>
            {rec && rec.issueType !== 'Strong Performance' ? (
              <div className="rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white p-4 dark:border-indigo-500/30 dark:from-indigo-500/5 dark:via-blue-500/5 dark:to-transparent">
                <p className="text-[14px] font-bold text-slate-900 dark:text-white">{issueContext.chapter} Accuracy Recovery</p>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">Suggested title — editable during review</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Target</p><p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{domain === 'University' ? 'University' : domain} {issueContext.subject} → {issueContext.chapter}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Issue</p><p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{rec.issueType}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p><Badge variant={rec.priority === 'High' || rec.priority === 'Critical' ? 'danger' : 'warning'} size="sm">{rec.priority}</Badge></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Practice</p><p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{rec.practiceConfig.questionCount} questions · {rec.practiceConfig.practiceType}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Difficulty</p><p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{rec.practiceConfig.difficultyProgression}</p></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">PYQ</p><p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{domain === 'University' ? 'University PYQs available' : 'Preferred'}</p></div>
                </div>
                <div className="mt-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Objective</p>
                  <p className="mt-0.5 text-[12px] text-slate-700 dark:text-slate-200">{rec.recommendedAction}</p>
                </div>
                {rec.evidence?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Evidence summary</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-slate-600 dark:text-slate-300">
                      {rec.evidence.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
                {rec.whyExplanation && <p className="mt-2 rounded-xl bg-amber-50/80 p-2 text-[11px] leading-relaxed text-amber-800 dark:bg-amber-500/5 dark:text-amber-200">{rec.whyExplanation}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setReviewOpen(true)}><Target className="h-3 w-3" /> Review &amp; Create Intervention</Button>
                  <Link to={`/faculty/question-intelligence?tab=question-intelligence&subject=${encodeURIComponent(issueContext.subject)}&chapter=${encodeURIComponent(issueContext.chapter)}`}>
                    <Button size="sm" variant="outline"><BookOpen className="h-3 w-3" /> Question Bank / PYQs</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-slate-400">{rec ? 'Performance is strong for this chapter — no intervention suggested.' : EVIDENCE_EMPTY_MESSAGE}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <ReviewCreateInterventionDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        student={student}
        domain={domain}
        subject={issueContext.subject}
        chapter={issueContext.chapter}
        issueLabel={rec ? `${rec.issueType} — ${rec.priority} priority` : (issueContext.issueType ?? 'Performance Gap')}
        whyDetected={issueContext.whyDetected ?? rec?.whyExplanation ?? null}
        evidenceSummary={rec?.evidence ?? []}
        defaults={{
          title: `${issueContext.chapter} Accuracy Recovery`,
          priority: rec?.priority ?? 'Medium',
          objective: rec?.recommendedAction ?? `Improve accuracy on ${issueContext.chapter} problems.`,
          count: rec?.practiceConfig?.questionCount ?? 8,
          difficulty: difficultyFromProgression(rec?.practiceConfig?.difficultyProgression),
          pyqPreference: 'Yes',
        }}
        onCreated={onCreated}
      />
    </>
  )
}

/* Suggestion derived by the EXISTING ground-level engine from the issue's
   actual question rows — no second recommendation engine. */
function generateSuggestion(rowsForIssue, issueContext) {
  if (!rowsForIssue.length) return null
  return generateInterventionRecommendation(rowsForIssue, {
    subject: issueContext.subject,
    chapter: issueContext.chapter,
    topic: issueContext.topic,
  })
}

export function difficultyFromProgression(progression) {
  if (progression === 'Easy') return 'Easy'
  if (progression === 'Medium') return 'Medium'
  if (progression === 'Hard') return 'Hard'
  return 'Mixed'
}

/* ================= Topic-level recommendation card (kept) ================= */
function InterventionRecommendationCard({ intervention, onReviewCreate }) {
  if (!intervention) return null
  return (
    <div className="rounded-2xl border-2 border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white p-5 dark:border-indigo-500/30 dark:from-indigo-500/5 dark:via-blue-500/5 dark:to-transparent">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">
        <Target className="h-3.5 w-3.5" /> Suggested Intervention
      </p>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Concept</p>
            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{intervention.concept}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Issue</p>
            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-100">{intervention.issueType}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Priority</p>
            <Badge variant={intervention.priority === 'High' ? 'danger' : intervention.priority === 'Critical' ? 'danger' : 'warning'} size="sm">{intervention.priority}</Badge>
          </div>
        </div>

        {intervention.evidence.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Evidence</p>
            <ul className="mt-1 space-y-0.5">
              {intervention.evidence.map((e, i) => <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">• {e}</li>)}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Recommended Action</p>
          <p className="mt-0.5 text-[12px] text-slate-700 dark:text-slate-200">{intervention.recommendedAction}</p>
        </div>

        <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-800/40">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Practice Recommendation</p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{intervention.practiceConfig.questionCount} questions</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{intervention.practiceConfig.difficultyProgression}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{intervention.practiceConfig.concept}</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{intervention.practiceConfig.practiceType}</span>
          </div>
        </div>

        {intervention.whyExplanation && (
          <div className="rounded-xl bg-amber-50/80 p-3 dark:bg-amber-500/5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Why This Intervention?</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200">{intervention.whyExplanation}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {onReviewCreate ? (
            <Button size="sm" variant="default" onClick={onReviewCreate}><Target className="h-3 w-3" /> Review &amp; Create Intervention</Button>
          ) : (
            <Button size="sm" variant="default" disabled title="Faculty review required"><Target className="h-3 w-3" /> Review required</Button>
          )}
          <Link to={`/faculty/question-intelligence?subject=${encodeURIComponent(intervention.subject ?? '')}&chapter=${encodeURIComponent(intervention.chapter ?? '')}`}>
            <Button size="sm" variant="outline"><BookOpen className="h-3 w-3" /> View Question Bank</Button>
          </Link>
        </div>
        <p className="text-[10px] font-medium text-slate-400">Faculty review required — this is a recommendation only; nothing is created automatically.</p>
      </div>
    </div>
  )
}

export { EvidenceQuestionCard, EvidenceQuestionsDialog, SuggestedInterventionDialog, QuestionDetailDialog, InterventionRecommendationCard }
export default { EvidenceQuestionCard, EvidenceQuestionsDialog, SuggestedInterventionDialog, QuestionDetailDialog, InterventionRecommendationCard }
