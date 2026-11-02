/**
 * AI Exam Conducting Agent — Instructions screen.
 * Exam meta + rules + agent note + consent checkbox before starting.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, Clock, FileQuestion, Info, ListChecks, Play, ShieldCheck, Sparkles, Timer,
} from 'lucide-react'
import { Badge, Button, Card } from '@/components/ui'
import { ExamTypeBadge, AgentChip } from './exam-agent-shared'

function ExamAgentInstructions({ exam, mode, onBack, onStart, starting = false, startError = null }) {

  const isDemo = mode === 'demo'

  // Scroll to top when the instructions card mounts so students always see
  // the exam header, not the middle of the instructions list.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-5xl"
    >
      <Card className="overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 px-6 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <ExamTypeBadge type={exam.type} className="bg-white/15 text-white ring-white/25" />
            {isDemo && <Badge className="bg-white/15 text-white ring-white/25"><Sparkles className="h-3 w-3" /> Demo Monitoring</Badge>}
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">{exam.title}</h2>
          <p className="mt-1 text-[13px] text-white/80">{exam.description}</p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { icon: Clock, label: 'Duration', value: `${exam.durationMinutes} minutes` },
              { icon: FileQuestion, label: 'Questions', value: `${exam.questions.length} MCQs` },
              { icon: BookOpenCheck, label: 'Marking', value: `+${exam.marksPerQuestion}${exam.negativeMarksPerQuestion > 0 ? ` / −${exam.negativeMarksPerQuestion}` : ' / 0'}` },
              { icon: Timer, label: 'Total marks', value: `${exam.totalMarks}` },
            ].map((m) => (
              <div key={m.label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
                <m.icon className="h-4 w-4 text-white/70" />
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60">{m.label}</p>
                <p className="text-[13px] font-bold">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Instructions — section-wise from DB (NEET / JEE), or flat fallback */}
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
            <BookOpenCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Instructions
          </h3>

          {Array.isArray(exam.instructionSections) && exam.instructionSections.length > 0 ? (
            /* ── DB-backed NTA sections ── */
            <div className="mt-3 space-y-4">
              {exam.instructionSections.map((section, si) => (
                <div key={si}>
                  <p className="text-[12px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                    {si + 1}. {section.title}
                  </p>
                  <ul className="space-y-1.5 pl-1">
                    {(section.items ?? []).map((item, ii) => (
                      <li key={ii} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            /* ── Legacy flat list fallback ── */
            <ol className="mt-3 space-y-2.5">
              {(exam.instructions ?? []).map((ins, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10.5px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {i + 1}
                  </span>
                  {ins}
                </li>
              ))}
            </ol>
          )}

          {/* ── Question Status Legend ── */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <ListChecks className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Question Status Legend
            </h3>
            <p className="mt-1 text-[12px] text-slate-400">Each number in the Question Palette shows the status of that question.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { color: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400', label: 'Not Visited', desc: 'You have not opened this question yet.' },
                { color: 'bg-rose-500 text-white', label: 'Not Answered', desc: 'You visited but did not select an answer.' },
                { color: 'bg-gradient-to-br from-emerald-500 to-green-600 text-white', label: 'Answered', desc: 'You selected an answer and saved it.' },
                { color: 'bg-violet-500 text-white', label: 'Marked for Review', desc: 'Marked without an answer — not evaluated.' },
                { color: 'bg-violet-500 text-white ring-2 ring-white/60', label: 'Answered + Marked for Review', desc: 'Answered and marked — will be evaluated.' },
              ].map(({ color, label, desc }) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${color}`}>1</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-bold text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-[11px] leading-relaxed text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Navigation Rules ── */}
          <div className="mt-6">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-slate-900 dark:text-white">
              <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Navigation Rules
            </h3>
            <div className="mt-3 space-y-2">
              {[
                { label: 'Save & Next', desc: 'Saves your current answer and moves to the next question.' },
                { label: 'Previous', desc: 'Goes back one question. Your current answer is preserved.' },
                { label: 'Mark for Review & Next', desc: 'Marks this question for a second look and advances. If already answered, it will still be evaluated.' },
                { label: 'Clear Response', desc: 'Removes your selected answer for the current question (status becomes Not Answered).' },
                { label: 'Question Palette', desc: 'Click any number to jump directly to that question at any time.' },
                { label: 'Save & Submit (last question)', desc: 'On the final question, the forward button becomes Save & Submit to end your exam.' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start gap-3 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                  <span><span className="font-bold text-slate-800 dark:text-slate-100">{label}</span> — {desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-indigo-200/60 bg-indigo-50/60 p-4 dark:border-indigo-500/25 dark:bg-indigo-500/5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-indigo-900 dark:text-indigo-200">
                <AgentChip pulse={false} /> will analyse your attempt in real time
              </p>
              <p className="mt-1 text-xs leading-relaxed text-indigo-800/70 dark:text-indigo-300/70">
                It tracks only your exam interactions — time per question, answers, changes, revisits and skips — to
                compute question intelligence, subject &amp; chapter analysis and recommendations. No webcam, facial
                recognition, microphone monitoring, emotion detection or device surveillance is used. Note: leaving the
                exam window (switching tabs or minimizing) is monitored — after 3 warnings the exam is auto-submitted
                and flagged on your report.
              </p>
            </div>
          </div>

          {/* Demo note */}
          {isDemo && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/5">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200">Demo Monitoring is ON</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800/80 dark:text-amber-300/70">
                  A simulated student will take this paper automatically with realistic, varied behaviour — some
                  questions solved fast, some slow, some skipped and revisited. Watch the timer, accuracy, pace and
                  performance signals update live, then review the AI report.
                </p>
              </div>
            </div>
          )}

          {/* Negative marking reminder */}
          {exam.negativeMarksPerQuestion > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 dark:border-rose-500/25 dark:bg-rose-500/5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="text-[13px] font-bold text-rose-900 dark:text-rose-200">Negative marking applies</p>
                <p className="mt-1 text-xs leading-relaxed text-rose-800/80 dark:text-rose-300/70">
                  Every incorrect answer deducts {exam.negativeMarksPerQuestion} mark. Unanswered questions cost
                  nothing — plan your guessing strategy accordingly.
                </p>
              </div>
            </div>
          )}

          {/* Consent + actions */}
          <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
            <p className="flex items-start gap-2 text-[12px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              Once started, the timer runs continuously and the paper auto-submits when time expires. Your answers
              are tracked for the AI analysis.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={onBack} disabled={starting}><ArrowLeft className="h-4 w-4" /> Back to papers</Button>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {startError ? (
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{startError}</p>
              ) : null}
              <Button size="lg" onClick={onStart} disabled={starting}>
                {starting ? 'Starting…' : (
                  <>
                    {isDemo ? <Sparkles className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isDemo ? 'Start demo monitoring' : 'Start exam'} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

export { ExamAgentInstructions }
export default ExamAgentInstructions
