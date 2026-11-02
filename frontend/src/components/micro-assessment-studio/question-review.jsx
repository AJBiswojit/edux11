import { useEffect, useId, useState } from 'react'
import { Check, CheckCircle2, FileQuestion, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { MathText } from '@/components/shared/math-text'
import { optionText } from '@/api/adapters/questions'
import { LETTERS, formatFacultyAnswer, presentationQuestionText } from '@/components/micro-assessment-studio/question-presentation.js'

export const MICRO_QUESTION_TYPES = [
  'Short Answer', 'Fill in the Blank', 'Direct MCQ', 'Statement Based',
  'Multiple Statement', 'Application Based', 'Conceptual', 'Why / Reasoning',
  'Match the Following', 'Diagram Based',
]
export const MICRO_DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const DIFFICULTY_BADGE = { Easy: 'success', Medium: 'warning', Hard: 'danger' }

function ValidationList({ validation }) {
  const checks = [
    ['sourceGrounded', 'Source grounded'],
    ['answerSupported', 'Answer supported'],
    ['noDuplicate', 'No duplicate detected'],
  ]
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-slate-400" aria-label="AI validation">
      <span className="font-semibold uppercase tracking-wider text-slate-400">AI validation</span>
      {checks.map(([key, label]) => (
        <span key={key} className={validation?.[key] ? 'inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400' : 'inline-flex items-center gap-1 text-amber-600 dark:text-amber-400'}>
          {validation?.[key] ? <Check className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}{label}
        </span>
      ))}
    </div>
  )
}

function QuestionEditor({ question, open, onOpenChange, onSave }) {
  const [draft, setDraft] = useState(question)
  useEffect(() => { if (open) setDraft(question) }, [question, open])
  if (!question) return null
  const current = draft ?? question
  const set = (key, value) => setDraft((item) => ({ ...item, [key]: value }))
  const setOption = (index, value) => {
    const options = [...(current.options ?? [])]
    options[index] = value
    setDraft((item) => ({ ...item, options, correctAnswer: item.answerIndex === index ? value : item.correctAnswer }))
  }
  const answerValue = current.options?.length && current.answerIndex != null
    ? current.options[current.answerIndex]
    : current.correctAnswer
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Edit question {question.id}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Question text"><Textarea rows={4} value={current.question ?? ''} onChange={(event) => set('question', event.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Difficulty"><Select value={current.difficulty} onValueChange={(value) => set('difficulty', value)}>{MICRO_DIFFICULTIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</Select></Field>
            <Field label="Question type"><Select value={current.questionType} onValueChange={(value) => set('questionType', value)}>{MICRO_QUESTION_TYPES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</Select></Field>
          </div>
          {(current.options ?? []).length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {current.options.map((option, index) => <Field key={index} label={`Option ${LETTERS[index]}`}><Input value={optionText(option)} onChange={(event) => setOption(index, event.target.value)} /></Field>)}
              <Field label="Correct option" className="sm:col-span-2"><Select value={String(current.answerIndex ?? 0)} onValueChange={(value) => { const answerIndex = Number(value); setDraft((item) => ({ ...item, answerIndex, correctAnswer: item.options?.[answerIndex] })) }}>{current.options.map((option, index) => <SelectItem key={index} value={String(index)}>{LETTERS[index]} · {optionText(option)}</SelectItem>)}</Select></Field>
            </div>
          )}
          {!(current.options ?? []).length && <Field label="Expected answer"><Input value={answerValue ?? ''} onChange={(event) => set('correctAnswer', event.target.value)} /></Field>}
          <Field label="Explanation"><Textarea rows={3} value={current.explanation ?? ''} onChange={(event) => set('explanation', event.target.value)} /></Field>
          <p className="rounded-2xl bg-indigo-50/70 px-3.5 py-3 text-[11px] font-medium leading-relaxed text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">Source relationship is fixed to <strong>{question.chapter}</strong> · {question.topic} · {question.sourceId}. Editing the wording does not detach the question from its source.</p>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => { onSave(current); onOpenChange(false) }}><CheckCircle2 className="h-4 w-4" /> Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AnswerReveal({ question }) {
  const [revealed, setRevealed] = useState(false)
  const panelId = useId()
  const formatted = formatFacultyAnswer(question)
  return (
    <div className="mt-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-expanded={revealed}
        aria-controls={panelId}
        onClick={() => setRevealed((current) => !current)}
      >
        <Sparkles className="h-3 w-3" />
        {revealed ? 'Hide answer' : 'Show answer'}
      </Button>
      <div
        id={panelId}
        hidden={!revealed}
        className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ${revealed ? 'mt-2 grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0">
          {revealed && (
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-800/60">
              <p className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Answer</p>
              <p className="mt-1 break-words text-[13px] font-semibold text-slate-900 dark:text-slate-100">{formatted || 'Faculty review required'}</p>
              {question.explanation ? (
                <>
                  <p className="mt-3 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Why</p>
                  <p className="mt-1 break-words text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{question.explanation}</p>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function QuestionCard({ question, index, onUpdate, onRegenerate, onDelete, regenerating }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const sourceLabel = question.sourceTitle || question.sourceReference || question.sourceId
  return (
    <article className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <Badge variant="gradient" size="sm">Q{index + 1}</Badge>
        <Badge variant="secondary" size="sm">{question.questionType}</Badge>
        <Badge variant={DIFFICULTY_BADGE[question.difficulty] ?? 'secondary'} size="sm">{question.difficulty}</Badge>
      </div>

      <p className="mt-3 text-[13.5px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{presentationQuestionText(question)}</p>
      {(question.options ?? []).length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, optionIndex) => (
            <div key={optionIndex} className="flex min-w-0 items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[12px] text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              <span className="font-bold">{LETTERS[optionIndex]}.</span><span className="min-w-0 break-words"><MathText>{optionText(option)}</MathText></span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Chapter</p><p className="mt-0.5 break-words text-[12px] font-semibold text-slate-700 dark:text-slate-200">{question.chapter}</p></div>
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Topic</p><p className="mt-0.5 break-words text-[12px] font-semibold text-slate-700 dark:text-slate-200">{question.topic}</p></div>
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Concept</p><p className="mt-0.5 break-words text-[12px] font-semibold text-slate-700 dark:text-slate-200">{question.concept}</p></div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Field label="Difficulty" className="space-y-1"><Select value={question.difficulty} ariaLabel="Difficulty" onValueChange={(value) => onUpdate({ ...question, difficulty: value })}>{MICRO_DIFFICULTIES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</Select></Field>
        <Field label="Question type" className="space-y-1"><Select value={question.questionType} ariaLabel="Question type" onValueChange={(value) => onUpdate({ ...question, questionType: value })}>{MICRO_QUESTION_TYPES.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</Select></Field>
      </div>

      <AnswerReveal question={question} />
      <ValidationList validation={question.validation} />
      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button size="sm" variant="outline" onClick={() => setEditorOpen(true)}><FileQuestion className="h-3 w-3" /> Edit</Button>
        <Button size="sm" variant="outline" onClick={() => onRegenerate(question)} disabled={regenerating}><RefreshCw className={regenerating ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} /> {regenerating ? 'Regenerating…' : 'Regenerate'}</Button>
        <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" onClick={() => onDelete(question)}><Trash2 className="h-3 w-3" /> Delete</Button>
        <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold text-slate-400"><Sparkles className="h-3 w-3 shrink-0 text-indigo-500" /> Source: <span className="truncate">{sourceLabel}</span></span>
      </div>
      <QuestionEditor question={question} open={editorOpen} onOpenChange={setEditorOpen} onSave={onUpdate} />
    </article>
  )
}

function CoverageBar({ item }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-[11.5px] font-semibold text-slate-600 dark:text-slate-300" title={item.concept}>{item.concept}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" style={{ width: `${Math.max(4, item.percentage)}%` }} /></div>
      <span className="w-10 text-right text-[10.5px] font-bold text-slate-400">{item.percentage}%</span>
    </div>
  )
}

export function QuestionReview({ questions, coverage = [], diversity = 0, onUpdate, onRegenerate, onDelete, onGenerateMissing, regeneratingId }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 5 · Review Assessment</p>
          <h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">Review every question before sending</h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">Question metadata, source grounding and the answer explanation stay visible so faculty remain in control.</p>
        </div>
        <Badge variant="info" size="sm"><Sparkles className="h-3 w-3" /> Question Diversity · {diversity}%</Badge>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Concept Coverage</p><span className="text-[10px] font-semibold text-slate-400">relative to best-covered concept</span></div>
          <div className="mt-3 space-y-2.5">{coverage.length ? coverage.map((item) => <CoverageBar key={item.concept} item={item} />) : <p className="text-xs text-slate-400">No concept coverage available yet.</p>}</div>
          <Button size="sm" variant="outline" className="mt-4" onClick={onGenerateMissing} disabled={!coverage.some((item) => item.percentage < 100)}><Sparkles className="h-3.5 w-3.5" /> Generate Missing Coverage</Button>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Assessment mix</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{[...new Set(questions.map((question) => question.questionType))].map((type) => <Badge key={type} variant="secondary" size="sm">{type} · {questions.filter((question) => question.questionType === type).length}</Badge>)}</div>
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400"><span>{questions.length} questions</span><span>{new Set(questions.map((question) => question.concept)).size} concepts</span><span>{new Set(questions.map((question) => question.difficulty)).size} difficulty levels</span></div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-slate-400">Diversity is a lightweight contextual signal derived from question types, concepts and difficulty distribution — not a validated AI score.</p>
        </div>
      </div>

      {questions.length ? (
        <div className="mt-5 space-y-4">{questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} onUpdate={onUpdate} onRegenerate={onRegenerate} onDelete={onDelete} regenerating={regeneratingId === question.id} />)}</div>
      ) : (
        <div className="mt-5"><EmptyState compact icon={FileQuestion} title="No questions generated" description="Process a source and generate a question set before opening the review workspace." /></div>
      )}
    </Card>
  )
}

export default QuestionReview
