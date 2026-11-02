/**
 * Student — Intervention practice / re-test runner (Phase 6).
 * A compact, focused session runner for targeted practice and re-tests.
 * It reuses the exam-agent interaction conventions (option cards, timer,
 * prev/next, submit) WITHOUT creating a new exam engine — results are
 * stored as practice attempts (mode 'intervention-practice' / '-retest'),
 * never as official exams.
 */
import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Send, XCircle } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { QUESTION_OPTION_LABELS } from '@/constants/ui'
import { cn } from '@/utils/cn'
import { MathText } from '@/components/shared/math-text'
import { optionText } from '@/api/adapters/questions'

const LETTERS = QUESTION_OPTION_LABELS

function InterventionPracticeRunner({ questions = [], title, subtitle, durationMinutes = 20, kind = 'practice', onSubmit, onCancel }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(null)
  const [remaining, setRemaining] = useState((durationMinutes ?? 20) * 60)
  const [startedAt] = useState(() => new Date().toISOString())
  const [elapsedRef] = useState(() => ({ v: 0 }))

  const question = questions[current] ?? null
  const answered = Object.keys(answers).length
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0

  /* lightweight timer (no auto-submit complexities — prototype) */
  useMemo(() => {
    const id = setInterval(() => {
      elapsedRef.v += 1
      setRemaining((r) => Math.max(0, r - 1))
    }, 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const select = (idx) => {
    if (submitted) return
    setAnswers((a) => ({ ...a, [question.id]: idx }))
  }

  const finish = () => {
    const rows = questions.map((q) => {
      const sel = answers[q.id] ?? null
      const correctIdx = q.correctAnswerIndex ?? null
      return {
        questionId: q.id,
        text: q.text,
        options: q.options ?? [],
        correctAnswer: correctIdx,
        selected: sel,
        isCorrect: sel != null && correctIdx != null && sel === correctIdx,
        timeSpent: 0,
      }
    })
    const attempted = rows.filter((r) => r.selected != null).length
    const correct = rows.filter((r) => r.isCorrect).length
    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0
    const payload = {
      kind,
      startedAt,
      questionAttempts: rows,
      score: correct,
      maxScore: rows.length,
      accuracy,
      attemptRate: Math.round((attempted / rows.length) * 100),
      avgTime: Math.round(elapsedRef.v / Math.max(1, attempted)),
      incorrect: rows.filter((r) => r.selected != null && !r.isCorrect).length,
    }
    setSubmitted(payload)
    onSubmit?.(payload)
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200/70 bg-white p-8 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{kind === 'retest' ? 'Re-test submitted' : 'Practice completed'}</h3>
        <p className="mt-1 text-xs text-slate-400">{title}</p>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">{submitted.accuracy}%</p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-300/70">Accuracy</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{submitted.score}/{submitted.maxScore}</p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Correct</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <p className="text-xl font-bold text-slate-900 dark:text-white">{submitted.avgTime}s</p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Avg time</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-medium text-slate-400">
          {kind === 'retest' ? 'This re-test result is linked to your intervention for before/after effectiveness.' : 'This practice attempt is stored separately — it does not count as an official exam.'}
        </p>
        <Button className="mt-5" onClick={onCancel}>Done</Button>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">No questions available for this {kind === 'retest' ? 're-test' : 'practice'}.</p>
        <Button variant="outline" className="mt-3" onClick={onCancel}>Back</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-slate-900 dark:text-white">{title}</p>
          <p className="text-[11px] font-medium text-slate-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[12px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="h-3.5 w-3.5" /> {String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}
          </span>
          <Badge variant={kind === 'retest' ? 'warning' : 'info'}>{kind === 'retest' ? 'Re-test' : 'Practice'}</Badge>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* question */}
      <div className="mt-4 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">Question {current + 1} <span className="font-medium text-slate-400">of {questions.length}</span></p>
          <Badge variant="secondary" size="sm">{question.chapter}</Badge>
          <Badge variant="outline" size="sm">{question.difficulty}</Badge>
          {question.isPyq && <Badge variant="warning" size="sm">PYQ{question.year ? ` ${question.year}` : ''}</Badge>}
        </div>
        <div className="mt-3 text-[14.5px] font-medium leading-relaxed text-slate-800 dark:text-slate-100"><MathText>{question.text}</MathText></div>
        <div className="mt-4 grid gap-2.5">
          {(question.options ?? []).map((opt, i) => {
            const selected = answers[question.id] === i
            return (
              <button key={i} onClick={() => select(i)}
                className={cn('flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all',
                  selected ? 'border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900')}>
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold', selected ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                  {LETTERS[i]}
                </span>
                <span className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200"><MathText>{optionText(opt)}</MathText></span>
              </button>
            )
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}><ArrowLeft className="h-3.5 w-3.5" /> Previous</Button>
          {current < questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrent((c) => c + 1)}>Next <ArrowRight className="h-3.5 w-3.5" /></Button>
          ) : (
            <Button size="sm" variant="success" onClick={finish}><Send className="h-3.5 w-3.5" /> Submit {kind === 'retest' ? 're-test' : 'practice'}</Button>
          )}
          <div className="flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrent(i)}
                className={cn('flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-all',
                  i === current ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : '',
                  answers[q.id] != null ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-400">
        <span>{answered} of {questions.length} answered · auto-saved</span>
        <button onClick={onCancel} className="inline-flex items-center gap-1 hover:text-slate-600"><XCircle className="h-3.5 w-3.5" /> Exit</button>
      </div>
    </div>
  )
}

export { InterventionPracticeRunner }
export default InterventionPracticeRunner
