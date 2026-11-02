/**
 * AI Workspace — shared QuizRunner dialog.
 * Interactive MCQ runner with instant scoring + explanations.
 * Reused by the Practice Center and Notes & Summaries tabs.
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, ListChecks, RotateCcw } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useToast } from '@/components/ui'
import { ProgressRing } from '@/components/shared/progress-ring'
import { optionText } from '@/api/adapters/questions'

function QuizRunner({ title, meta, questions = [], open, onOpenChange }) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (open) {
      setAnswers({})
      setSubmitted(false)
    }
  }, [open])

  const answered = Object.keys(answers).length
  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  const handleSubmit = () => {
    if (answered < questions.length) {
      toast.error('Incomplete', 'Answer every question before submitting.')
      return
    }
    setSubmitted(true)
    toast.success(score === questions.length ? 'Perfect score! 🎉' : 'Quiz submitted', `${score}/${questions.length} correct (${pct}%).`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-500" /> {title}
          </DialogTitle>
          {meta && <DialogDescription>{meta}</DialogDescription>}
        </DialogHeader>

        {!submitted ? (
          <div className="space-y-5">
            {questions.map((q, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{i + 1}</span>
                  <Badge variant={q.difficulty === 'Easy' ? 'success' : q.difficulty === 'Medium' ? 'warning' : 'danger'} size="sm">{q.difficulty}</Badge>
                  <span className="ml-auto text-[11px] font-semibold text-slate-400">{answered > i ? 'Answered ✓' : 'Pending'}</span>
                </div>
                <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{q.q}</p>
                <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                  {q.options.map((o, oi) => {
                    const selected = answers[i] === oi
                    return (
                      <button
                        key={oi}
                        onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                        className={`rounded-xl border px-3.5 py-2.5 text-left text-[12.5px] font-medium transition-all ${
                          selected
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300'
                            : 'border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span className="mr-1.5 font-bold text-slate-400">({String.fromCharCode(65 + oi)})</span>{optionText(o)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-5 rounded-3xl bg-gradient-to-r from-indigo-600/10 to-teal-500/10 p-5 ring-1 ring-indigo-500/15">
              <ProgressRing value={pct} size={110} stroke={10} label={`${pct}%`} sublabel="Score" color={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'} />
              <div>
                <p className="text-[15px] font-bold text-slate-900 dark:text-white">{score}/{questions.length} correct</p>
                <p className="text-xs text-slate-400">{pct >= 80 ? 'Excellent — this topic is nearly mastered.' : pct >= 50 ? 'Good attempt — review the explanations below.' : 'Needs practice — go through each explanation.'}</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => { setSubmitted(false); setAnswers({}) }}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retake
                </Button>
              </div>
            </div>
            <div className="space-y-2.5">
              {questions.map((q, i) => {
                const correct = answers[i] === q.answer
                return (
                  <div key={i} className={`rounded-2xl border p-3.5 ${correct ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/25 dark:bg-emerald-500/5' : 'border-rose-200 bg-rose-50/50 dark:border-rose-500/25 dark:bg-rose-500/5'}`}>
                    <p className="flex items-start gap-2 text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">
                      <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${correct ? 'text-emerald-500' : 'text-rose-500'}`} />
                      <span className="min-w-0 flex-1">{q.q}</span>
                      <Badge variant={correct ? 'success' : 'danger'} size="sm">{correct ? 'Correct' : 'Incorrect'}</Badge>
                    </p>
                    <p className="mt-1.5 pl-6 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-600 dark:text-slate-300">Answer: ({String.fromCharCode(65 + q.answer)}) {q.options[q.answer]}</span>
                      {!correct && <span className="ml-2">You picked ({String.fromCharCode(65 + (answers[i] ?? 0))})</span>}
                      <br />{q.explanation}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!submitted && (
            <Button onClick={handleSubmit} disabled={answered < questions.length}>
              <CheckCircle2 className="h-4 w-4" /> Submit ({answered}/{questions.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { QuizRunner }
export default QuizRunner
