/**
 * AI Question Studio — Generated question card + review dialogs (Phase 7).
 * Card shows full metadata, quality factors, source traceability; dialogs:
 *   · EditorDialog     — edit text/options/answer/explanation/difficulty/
 *     type/chapter/topic/concept/marks (source reference read-only)
 *   · SourceContextDialog — the source passage behind a question
 */
import { useState } from 'react'
import { BookOpen, CheckCircle2, FileText, PencilLine, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea } from '@/components/ui'
import { QUESTION_OPTION_LABELS } from '@/constants/ui'
import { optionText } from '@/api/adapters/questions'
import { MathText } from '@/components/shared/math-text'

const DIFF_STYLE = { Easy: 'success', Medium: 'warning', Hard: 'danger' }
const REVIEW_STYLE = { Draft: 'secondary', Reviewed: 'info', Approved: 'success', Rejected: 'danger' }
const LETTERS = QUESTION_OPTION_LABELS

export function SourceContextDialog({ question, source, open, onOpenChange }) {
  if (!question || !source) return null
  const pageNo = question.sourcePage ?? 1
  const page = source.content?.[Math.min(pageNo - 1, (source.content?.length ?? 1) - 1)] ?? source.content?.[0]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500" /> Source context</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">{question.sourceTitle} · Page {pageNo}</p>
          <p className="mt-1 text-[10.5px] font-medium text-slate-400">Topic: {question.topic} · Concept: {question.concept}{question.subConcept ? ` · Sub-concept: ${question.subConcept}` : ''}</p>
        </div>
        <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
          {page ? (
            <>
              <h4 className="text-[14px] font-bold text-slate-900 dark:text-white">{page.title}</h4>
              {page.paragraphs?.map((p, i) => <p key={i} className="text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">{p}</p>)}
              {page.bullets?.length > 0 && (
                <ul className="space-y-1">
                  {page.bullets.map((b, i) => <li key={i} className="flex items-start gap-2 text-[12px] text-slate-500 dark:text-slate-400"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-indigo-400" />{b}</li>)}
                </ul>
              )}
            </>
          ) : <p className="text-xs text-slate-400">No source passage available for this page.</p>}
        </div>
        <p className="text-[10.5px] font-medium text-slate-400">Demo source content — original material, not an extract from any copyrighted textbook.</p>
      </DialogContent>
    </Dialog>
  )
}

export function QuestionEditorDialog({ question, open, onOpenChange, onSave }) {
  const [form, setForm] = useState(null)
  const q = form ?? question
  if (!question) return null
  const set = (k, v) => setForm((f) => ({ ...(f ?? question), [k]: v }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><PencilLine className="h-5 w-5 text-indigo-500" /> Edit question {question.questionId}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label="Question text"><Textarea rows={4} value={q.question} onChange={(e) => set('question', e.target.value)} /></Field>
          <div className="grid gap-2">
            {LETTERS.map((L, i) => (
              <Field key={L} label={`Option ${L}`}>
                <Input value={q.options?.[i] ?? ''} onChange={(e) => { const opts = [...(q.options ?? [])]; opts[i] = e.target.value; set('options', opts) }} />
              </Field>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Correct answer">
              <Select value={String(q.answerIndex ?? 0)} onValueChange={(v) => set('answerIndex', Number(v))}>
                {LETTERS.map((L, i) => <SelectItem key={L} value={String(i)}>{L} — {q.options?.[i]?.slice(0, 40) ?? ''}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Difficulty">
              <Select value={q.difficulty} onValueChange={(v) => set('difficulty', v)}>
                {['Easy', 'Medium', 'Hard'].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Question type">
              <Select value={q.qType} onValueChange={(v) => set('qType', v)}>
                {['Direct MCQ', 'Statement Based', 'Multiple Statement', 'Assertion & Reason', 'Match the Following', 'Application Based', 'Numerical', 'Diagram Based', 'Case Based', 'Sequence / Arrangement'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </Select>
            </Field>
            <Field label="Concept"><Input value={q.concept ?? ''} onChange={(e) => set('concept', e.target.value)} /></Field>
            <Field label="Marks"><Input type="number" value={q.marks} onChange={(e) => set('marks', Number(e.target.value))} /></Field>
            <Field label="Negative marks"><Input type="number" value={q.negativeMarks} onChange={(e) => set('negativeMarks', Number(e.target.value))} /></Field>
            <Field label="Chapter" className="sm:col-span-2"><Input value={q.chapter} onChange={(e) => set('chapter', e.target.value)} /></Field>
            <Field label="Topic" className="sm:col-span-2"><Input value={q.topic} onChange={(e) => set('topic', e.target.value)} /></Field>
            <Field label="Explanation" className="sm:col-span-2"><Textarea rows={3} value={q.explanation ?? ''} onChange={(e) => set('explanation', e.target.value)} /></Field>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-[11px] font-medium text-slate-400 dark:bg-slate-800/60">
            Source reference is fixed: <span className="font-bold text-slate-600 dark:text-slate-300">{q.sourceTitle}</span> · Page {q.sourcePage} — the source relationship remains intact.
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { onSave(q); onOpenChange(false) }}><CheckCircle2 className="h-4 w-4" /> Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function StudioQuestionCard({ q, index, source, onEdit, onRegenerate, onDelete, onApprove, onReject }) {
  const [ctxOpen, setCtxOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge variant="gradient" size="sm">Q{index + 1}</Badge>
          <Badge variant="secondary" size="sm">{q.qType}</Badge>
          <Badge variant={DIFF_STYLE[q.difficulty]} size="sm">{q.difficulty}</Badge>
          <Badge variant="outline" size="sm">+{q.marks}{q.negativeMarks > 0 ? ` / −${q.negativeMarks}` : ''}</Badge>
          <Badge variant={REVIEW_STYLE[q.reviewStatus] ?? 'secondary'} size="sm">{q.reviewStatus}</Badge>
          {q.quality?.score != null && <Badge variant="info" size="sm">Quality {q.quality.score}%</Badge>}
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line text-[13.5px] font-medium leading-relaxed text-slate-800 dark:text-slate-100"><MathText>{q.question}</MathText></p>
      {q.diagram && (
        <div className="mt-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-3 text-[11.5px] font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/5 dark:text-indigo-300">
          📐 Diagram reference: {q.diagram}
        </div>
      )}
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {(q.options ?? []).map((o, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-[12px] ${i === (q.answerIndex ?? 0) ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30' : 'bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'}`}>
            <span className="font-bold">({LETTERS[i]})</span><span className="min-w-0"><MathText>{optionText(o)}</MathText></span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        <span className="font-bold text-slate-600 dark:text-slate-300">Explanation:</span> <MathText>{q.explanation}</MathText>
      </div>

      {/* source traceability */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 px-3.5 py-2.5 dark:border-indigo-500/20">
        <FileText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Generated from: <span className="font-bold text-slate-700 dark:text-slate-200">{q.sourceTitle}</span> · Page {q.sourcePage} · Topic: {q.topic} · Concept: {q.concept}
        </p>
        <Button size="sm" variant="ghost" className="text-indigo-600 dark:text-indigo-300" onClick={() => setCtxOpen(true)}>View Source Context</Button>
      </div>

      {/* actions */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setEditorOpen(true)}><PencilLine className="h-3 w-3" /> Edit</Button>
        <Button size="sm" variant="outline" onClick={() => onRegenerate?.(q)}><RefreshCw className="h-3 w-3" /> Regenerate</Button>
        <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => onDelete?.(q)}><Trash2 className="h-3 w-3" /> Delete</Button>
        <span className="ml-auto flex gap-2">
          {q.reviewStatus === 'Rejected' && <Button size="sm" variant="outline" onClick={() => onApprove?.(q)}><CheckCircle2 className="h-3 w-3" /> Approve</Button>}
          {!q.approved && q.reviewStatus !== 'Rejected' && (
            <>
              <Button size="sm" variant="ghost" className="text-rose-500" onClick={() => onReject?.(q)}><XCircle className="h-3 w-3" /> Reject</Button>
              <Button size="sm" variant="success" onClick={() => onApprove?.(q)}><CheckCircle2 className="h-3 w-3" /> Approve</Button>
            </>
          )}
          {q.approved && <Badge variant="success" size="sm"><CheckCircle2 className="h-3 w-3" /> In Question Bank</Badge>}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-3 border-t border-slate-100 pt-2.5 text-[10px] font-medium text-slate-400 dark:border-slate-800">
        <span>📖 Chapter: {q.chapter}</span><span>· Topic: {q.topic}</span><span>· Concept: {q.concept ?? '—'}</span>
        <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> Prototype Question Generation</span>
      </div>

      <SourceContextDialog question={q} source={source} open={ctxOpen} onOpenChange={setCtxOpen} />
      <QuestionEditorDialog question={q} open={editorOpen} onOpenChange={setEditorOpen} onSave={onEdit} />
    </div>
  )
}

export default StudioQuestionCard
