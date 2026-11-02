import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, FileQuestion, Send, Timer, Users } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Textarea } from '@/components/ui'
import { MathText } from '@/components/shared/math-text'
import { optionText } from '@/api/adapters/questions'

const LETTERS = ['A', 'B', 'C', 'D']

function StudentQuestion({ question, index, answer, onAnswer }) {
  const hasOptions = (question.options ?? []).length > 0
  return (
    <fieldset className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <legend className="sr-only">Question {index + 1}</legend>
      <div className="flex items-start gap-3"><Badge variant="gradient" size="sm">Q{index + 1}</Badge><div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100"><MathText>{question.question}</MathText></p><p className="mt-1 text-[10.5px] font-medium text-slate-400">{question.questionType} · {question.difficulty} · {question.concept}</p></div></div>
      {hasOptions ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => { const optLabel = optionText(option); const selected = answer === optLabel; return <button type="button" key={optionIndex} role="radio" aria-checked={selected} onClick={() => onAnswer(optLabel)} className={`flex items-start gap-2 rounded-2xl border px-3.5 py-3 text-left text-[12px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${selected ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/15 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-200' : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-500/50'}`}><span className="font-bold">{LETTERS[optionIndex]}.</span><span><MathText>{optLabel}</MathText></span></button> })}</div> : <div className="mt-4">{question.questionType === 'Short Answer' ? <Textarea value={answer ?? ''} onChange={(event) => onAnswer(event.target.value)} rows={3} placeholder="Write a concise response…" aria-label={`Answer for question ${index + 1}`} /> : <Input value={answer ?? ''} onChange={(event) => onAnswer(event.target.value)} placeholder="Type your answer…" aria-label={`Answer for question ${index + 1}`} />}</div>}
    </fieldset>
  )
}

export function StudentMicroAssessmentRunner({ assessment, attempt, onSubmit, onBack }) {
  const [answers, setAnswers] = useState(attempt?.answers ?? {})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const questions = assessment?.questions ?? []
  const answered = questions.filter((question) => answers[question.id] !== undefined && String(answers[question.id]).trim() !== '').length
  const update = (id, value) => setAnswers((current) => ({ ...current, [id]: value }))
  const submit = async () => {
    setSubmitting(true)
    await onSubmit?.({ answers, status: 'completed' })
    setSubmitting(false)
    setConfirmOpen(false)
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> My Assessments</Button><Badge variant="info" size="sm"><Clock3 className="h-3 w-3" /> {assessment.duration} minutes</Badge><Badge variant="outline" size="sm"><FileQuestion className="h-3 w-3" /> {questions.length} questions</Badge></div>
      <Card className="border-indigo-200/70 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-teal-500/10 p-5 dark:border-indigo-500/25"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Micro-Assessment · Formative</p><h1 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{assessment.title}</h1><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Faculty: {assessment.faculty ?? 'EduX Faculty'} · {assessment.subject} · {assessment.chapter} · {assessment.topic}</p></div><div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300"><Timer className="h-4 w-4 text-indigo-500" /> Deadline {assessment.deadline}</div></div>{assessment.description && <p className="mt-4 rounded-2xl bg-white/70 px-3.5 py-3 text-[12px] leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">{assessment.description}</p>}{assessment.instructions && <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"><strong>Instructions:</strong> {assessment.instructions}</p>}</Card>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-indigo-500" /> Answered {answered} of {questions.length}</span><span className="text-slate-400">Choose an option or type a response. This is a practice check, not an official exam.</span></div>
      <form onSubmit={(event) => { event.preventDefault(); setConfirmOpen(true) }} className="space-y-4">{questions.map((question, index) => <StudentQuestion key={question.id} question={question} index={index} answer={answers[question.id]} onAnswer={(value) => update(question.id, value)} />)}<div className="flex flex-wrap justify-end gap-2 pt-1"><Button type="button" variant="outline" onClick={onBack}>Save &amp; exit</Button><Button type="submit" disabled={!answered || submitting}><Send className="h-3.5 w-3.5" /> Submit assessment</Button></div></form>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Submit micro-assessment?</DialogTitle></DialogHeader><p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">You have answered {answered} of {questions.length} questions. Submit now? Your response is stored as a formative attempt and does not affect official exam analytics.</p><DialogFooter><Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep working</Button><Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : <><CheckCircle2 className="h-4 w-4" /> Submit</>}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}

export default StudentMicroAssessmentRunner
