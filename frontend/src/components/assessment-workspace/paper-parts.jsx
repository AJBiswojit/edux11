/**
 * MediXO EduX — Assessment Workspace · shared paper components (Phase 9 Backend-Ready).
 * No localStorage as source of truth. Shares via backend API only.
 *
 * PaperCard is a compact library card: View (primary) · Edit · Share · Delete.
 * PaperPreviewDialog is a read-first question-paper viewer that loads the
 * paper's real questions from the backend (AI papers via
 * /faculty/paper-generator/ai-paper/{id}; SQL papers carry questionList).
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Eye, Pencil, Send, Trash2, Users, Sparkles, Loader2, AlertTriangle, FileText, Search, ChevronDown,
} from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, useToast } from '@/components/ui'
import { useAiPaperDetail, useSqlPaperDetail, usePaperPublishBackend, usePaperShareBackend, usePublishedPapers, useMergePapers } from '@/services/faculty-papers'
import { useFacultyRoster } from '@/services'
import { paperSendReadiness } from '@/api/adapters/paper-send-readiness'
import { optionText } from '@/api/adapters/questions'
import { formatDate } from '@/utils/format'
import { MathText } from '@/components/shared/math-text'
import { STATUS_STYLES, DIFF_STYLES, MODE_STYLES } from './paper-styles'

export { STATUS_STYLES, DIFF_STYLES, MODE_STYLES }

export function PaperStatusBadge({ status }) {
  return <Badge variant={STATUS_STYLES[status] ?? 'secondary'}>{status}</Badge>
}

/** Paper question count — authoritative numeric metadata from the paper payload. */
export function paperQuestionCount(paper) {
  return paper?.questions ?? paper?.selectedQuestionIds?.length ?? paper?.questionList?.length ?? 0
}

/**
 * Middle metadata row: question count · total marks · duration · domain.
 * Exam family is shown for Competitive papers only — University papers
 * never display competitive metadata.
 */
export function PaperMetaChips({ paper }) {
  const qCount = paperQuestionCount(paper)
  const domain = paper.domain ?? paper.mode
  return (
    <div className="mt-3.5 flex flex-wrap gap-2 text-[11px] font-medium text-slate-400">
      <span className="rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-800/60">{qCount} questions</span>
      <span className="rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-800/60">{paper.totalMarks} marks</span>
      <span className="rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-800/60">{paper.duration} min</span>
      {domain && <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">{domain}</span>}
      {domain === 'Competitive' && paper.examFamily && (
        <span className="rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-800/60">{paper.examFamily}</span>
      )}
      {paper.examType && paper.examType !== 'AI Generated' && (
        <span className="rounded-full bg-slate-50 px-2.5 py-1 dark:bg-slate-800/60">{paper.examType}</span>
      )}
      {paper.retest && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Intervention re-test</span>}
    </div>
  )
}

/**
 * Paper Library card — one clear hierarchy, one compact action area.
 * Primary: View. Secondary: Edit · Share · Delete. Duplicate / versions /
 * DOCX / Print / Archive actions are intentionally absent from the card.
 */
export function PaperCard({ paper, index = 0, onView, onEdit, onDelete, onShare }) {
  const qCount = paperQuestionCount(paper)
  const send = paperSendReadiness(paper)
  const domain = paper.domain ?? paper.mode
  const isAiGenerated = paper.source === 'ai' || paper.examType === 'AI Generated' || paper.paperType === 'AI Generated'
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
      <Card className={`group h-full p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${paper.archived ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25">
              <BookOpen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                {paper.subject ?? paper.course ?? 'Question paper'}
                {domain === 'Competitive' && paper.examFamily && <span className="ml-1.5 text-slate-400">· {paper.examFamily}</span>}
              </p>
              <h3 className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{paper.title}</h3>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <PaperStatusBadge status={paper.status} />
            {isAiGenerated && (
              <Badge variant="gradient" size="sm" className="gap-1">
                <Sparkles className="h-3 w-3" /> AI Generated
              </Badge>
            )}
          </div>
        </div>

        <PaperMetaChips paper={paper} />

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] font-medium text-slate-400">
          <span>Created {formatDate(paper.created ?? paper.generated, 'MMM d, yyyy')}</span>
          <span>· Modified {formatDate(paper.modified ?? paper.generated, 'MMM d, yyyy')}</span>
          {paper.faculty && <span>· {paper.faculty}</span>}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
          {onView && (
            <Button size="sm" className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/25 hover:brightness-110" onClick={() => onView(paper)}>
              <Eye className="h-3.5 w-3.5" /> View
            </Button>
          )}
          {onEdit ? (
            <Button size="sm" variant="outline" aria-label="Edit paper" onClick={() => onEdit(paper)}>
              <Pencil className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span>
            </Button>
          ) : null}
          {onShare && (
            <span className="inline-flex" title={send.canSend ? undefined : send.message}>
              <Button
                size="sm"
                variant="outline"
                disabled={!send.canSend}
                aria-label={send.canSend ? 'Share paper' : send.message}
                className="border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-500/10"
                onClick={() => { if (send.canSend) onShare(paper) }}
              >
                <Send className="h-3.5 w-3.5" /><span className="hidden sm:inline">Share</span>
              </Button>
            </span>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" aria-label="Delete paper" className="h-8 w-8 shrink-0 px-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10" onClick={() => onDelete(paper)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {onShare && !send.canSend && send.message && (
          <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-slate-400">{send.message}</p>
        )}
      </Card>
    </motion.div>
  )
}

/** One option row for a viewer question — structured option records are
 *  resolved to human-readable text via the shared optionText adapter. */
function QuestionOption({ option, index, correct }) {
  const label = optionText(option)
  const key = (option && typeof option === 'object' && option.key) || String.fromCharCode(65 + index)
  const imageUrl = option && typeof option === 'object' ? option.imageUrl : null
  return (
    <div className={`rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed ${correct ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'}`}>
      <span className="font-bold">{key}.</span> <MathText>{label || '—'}</MathText>
      {imageUrl && (
        <img src={imageUrl} alt={`Option ${key}`} className="mt-2 max-h-48 rounded-lg border border-slate-200 object-contain dark:border-slate-700" loading="lazy" />
      )}
    </div>
  )
}

/** True when the option's key matches the question's correct answer marker. */
function isCorrectOption(option, index, question) {
  const correct = question.correctOption ?? question.correctAnswer ?? question.answer
  if (correct == null || correct === '') return false
  const key = (option && typeof option === 'object' && option.key) || String.fromCharCode(65 + index)
  const token = String(correct).trim()
  return token.toUpperCase() === String(key).toUpperCase()
    || token === String(index)
    || (Number.isInteger(Number(token)) && Number(token) === index)
}

/**
 * A single question in the viewer — number, text, type/marks/difficulty
 * badges, options (structured records normalised), and — when the backend
 * provides them — the correct answer marker and explanation.
 */
function ViewerQuestion({ question, number }) {
  const options = Array.isArray(question.options) ? question.options : []
  const fib = question.options == null || String(question.type || question.questionType || '').toLowerCase().includes('fill')
  const text = question.text ?? question.question ?? question.stem ?? ''
  const explanation = question.explanation ?? question.solution ?? null
  const expected = question.correctValue ?? question.correctOption ?? question.correctAnswer
  const stemImages = Array.isArray(question.stemImageUrls) && question.stemImageUrls.length
    ? question.stemImageUrls
    : (question.imageUrl ? [question.imageUrl] : [])
  const showAnswers = options.some((o, i) => isCorrectOption(o, i, question)) || !!explanation || (fib && expected != null && expected !== '')
  return (
    <div className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-indigo-50 px-1.5 text-[11px] font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">Q{number}</span>
        {question.type && <Badge variant="secondary" size="sm">{question.type}</Badge>}
        {question.difficulty && <Badge variant={DIFF_STYLES[question.difficulty] ?? 'secondary'} size="sm">{question.difficulty}</Badge>}
        {question.chapter && <Badge variant="outline" size="sm">{question.chapter}{question.topic ? ` · ${question.topic}` : ''}</Badge>}
        {question.marks != null && <span className="ml-auto text-[11px] font-bold text-slate-400">{question.marks} marks</span>}
      </div>
      <div className="mt-2 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200">
        <MathText>{text}</MathText>
      </div>
      {stemImages.map((src) => (
        <img key={src} src={src} alt="Question figure" className="mt-2 max-h-64 rounded-lg border border-slate-200 object-contain dark:border-slate-700" loading="lazy" />
      ))}
      {options.length > 0 && (
        <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
          {options.map((o, oi) => <QuestionOption key={oi} option={o} index={oi} correct={showAnswers && isCorrectOption(o, oi, question)} />)}
        </div>
      )}
      {fib && showAnswers && expected != null && expected !== '' && (
        <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 text-[12px] font-semibold text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
          Expected answer: <MathText>{String(expected)}</MathText>
        </div>
      )}
      {showAnswers && explanation && (
        <div className="mt-3 rounded-xl bg-indigo-50/60 p-3 text-[12px] leading-relaxed text-indigo-900 dark:bg-indigo-500/10 dark:text-indigo-200">
          <span className="font-bold">Explanation:</span> <MathText>{explanation}</MathText>
        </div>
      )}
    </div>
  )
}

/**
 * Paper preview — a read-first viewer.
 *
 * Questions come from the first source that genuinely has them:
 *   1. SQL paper detail payload (paper.questionList)
 *   2. the AI-paper read-back endpoint (useAiPaperDetail) for ai_generated_papers
 * If the backend truly has zero question relationships for a paper that
 * reports a non-zero count, an honest data-inconsistency notice is shown —
 * never fabricated questions.
 */
export function PaperPreviewDialog({ open, onOpenChange, paper }) {
  const toast = useToast()
  const { mutateAsync: publishPaper, isPending: publishing } = usePaperPublishBackend()

  const isSqlPaper = paper?.source === 'sql-ai'
  const isAiMicroPaper = paper?.source === 'ai'

  const aiDetail = useAiPaperDetail(open && isAiMicroPaper ? paper.id : null)
  const sqlDetail = useSqlPaperDetail(open && isSqlPaper ? paper.id : null)

  const embeddedQuestions = Array.isArray(paper?.questionList) ? paper.questionList : []
  const fetchedAiQuestions = Array.isArray(aiDetail.data?.questions) ? aiDetail.data.questions : []
  const fetchedSqlQuestions = Array.isArray(sqlDetail.data?.questionList) ? sqlDetail.data.questionList : []
  const questions = embeddedQuestions.length > 0
    ? embeddedQuestions
    : isSqlPaper ? fetchedSqlQuestions : fetchedAiQuestions

  const detailLoading = open && ((isAiMicroPaper && aiDetail.isLoading) || (isSqlPaper && sqlDetail.isLoading))
  const detailError = open && ((isAiMicroPaper && aiDetail.isError) || (isSqlPaper && sqlDetail.isError))
  const selectedIds = Array.isArray(paper?.selectedQuestionIds) ? paper.selectedQuestionIds : []
  const reportedCount = paperQuestionCount(paper)
  const hasQuestions = questions.length > 0
  const qCount = hasQuestions ? questions.length : reportedCount
  // Only flag inconsistency after the detail fetch completes with genuinely zero questions
  const inconsistent = open && !detailLoading && !detailError && !hasQuestions && reportedCount > 0 && isSqlPaper && sqlDetail.isFetched
  const aiInconsistent = open && isAiMicroPaper && !detailLoading && !detailError && !hasQuestions && reportedCount > 0

  const schemeByType = {}
  questions.forEach((q) => {
    const t = q.type ?? 'Question'
    const m = q.marks ?? 0
    if (!schemeByType[t]) schemeByType[t] = { marks: m, count: 0 }
    schemeByType[t].count += 1
    schemeByType[t].marks = m
  })
  const markingScheme = Object.entries(schemeByType).map(([type, s]) => ({ type, marks: s.marks, count: s.count }))

  const paperId = paper?.paperCode ?? paper?.id
  const domain = paper?.domain ?? paper?.mode ?? 'University'
  // Publish goes through the SQL paper lifecycle
  // (/papers/{id}/publish); ai_generated_papers are read-only records owned
  // by the AI service and are published via Share when ready.
  const canPublish = !!paper?.id && paper?.source !== 'ai' && paper?.status !== 'Published'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8">
            <FileText className="h-5 w-5 shrink-0 text-indigo-500" />
            <span className="min-w-0 break-words">{paper?.title}</span>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5">
            <PaperStatusBadge status={paper?.status} />
            <Badge variant={MODE_STYLES[domain] ?? 'secondary'} size="sm">{domain}</Badge>
            {domain === 'Competitive' && paper?.examFamily && <Badge variant="outline" size="sm">{paper.examFamily}</Badge>}
            {paper?.subject && <Badge variant="outline" size="sm">{paper.subject}</Badge>}
          </DialogDescription>
        </DialogHeader>

        {/* Summary: total marks · duration · question count · created */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-100 p-3.5 text-center sm:grid-cols-4 dark:border-slate-800">
          <div>
            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{paper?.totalMarks ?? '—'}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total marks</p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{paper?.duration ?? '—'} min</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Duration</p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{qCount}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Questions</p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{formatDate(paper?.created ?? paper?.generated, 'MMM d, yyyy')}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created</p>
          </div>
        </div>

        {/* Question area — scrollable, separated, readable */}
        <div className="max-h-[48vh] space-y-3 overflow-y-auto rounded-2xl pr-1">
          {detailLoading && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 p-8 text-[12.5px] text-slate-400 dark:border-slate-800">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
            </div>
          )}
          {detailError && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-[12px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>The questions for this paper could not be loaded. Please try opening the paper again.</span>
            </div>
          )}
          {!detailLoading && hasQuestions && questions.map((q, qi) => (
            <ViewerQuestion key={q.id ?? qi} question={q} number={q.no ?? qi + 1} />
          ))}
          {!detailLoading && !detailError && !hasQuestions && selectedIds.length > 0 && !inconsistent && (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 p-8 text-[12.5px] text-slate-400 dark:border-slate-800">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
            </div>
          )}
          {(inconsistent || aiInconsistent) && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-[12px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                This paper reports {reportedCount} question{reportedCount === 1 ? '' : 's'}, but no question records are linked to it yet.
                The paper metadata and its question list are out of sync — regenerate or re-save the paper to restore its questions.
              </span>
            </div>
          )}
          {!detailLoading && !detailError && !hasQuestions && selectedIds.length === 0 && reportedCount === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center dark:border-slate-700">
              <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No questions in this paper yet.</p>
              <p className="mt-1 text-xs text-slate-400">Select questions from the question bank when editing this paper.</p>
            </div>
          )}
        </div>

        {markingScheme.length > 0 && (
          <div className="rounded-2xl border border-slate-100 p-3.5 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Marking scheme (derived from questions)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {markingScheme.slice(0, 6).map((m) => <Badge key={m.type} variant="outline" size="sm">{m.type}: {m.count} × {m.marks} marks</Badge>)}
            </div>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {paperId && <Badge variant="gradient" size="sm">{paperId}</Badge>}
          {canPublish && (
            <Button
              disabled={publishing || detailLoading}
              onClick={async () => {
                try {
                  await publishPaper(paper.id)
                  toast.success('Published', `${paper?.title} is now available to students.`)
                  onOpenChange?.(false)
                } catch (e) {
                  toast.error('Could not publish', e?.response?.data?.detail ?? e?.message ?? 'Could not publish this paper.')
                }
              }}
            ><Send className="h-4 w-4" /> {publishing ? 'Publishing…' : 'Publish'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* Paper preview while building — selected live questions (ID-based builder). */
export function PaperPrintPreview({ paper, open, onOpenChange }) {
  if (!paper) return null
  const questionList = Array.isArray(paper?.questionList) ? paper.questionList : []
  const selectedIds = paper?.selectedQuestionIds ?? []
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-500" /> Paper preview</DialogTitle>
          <DialogDescription>Review the selected questions before saving.</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          <p className="text-center text-[15px] font-bold">{paper.title}</p>
          <p className="mt-1 text-center text-[11px] text-slate-500">{paper.domain ?? paper.mode} · {paper.totalMarks} marks · {paper.duration} min · {selectedIds.length || questionList.length} questions</p>
          <div className="mt-4 space-y-2">
            {questionList.length > 0
              ? questionList.map((q, i) => (
                <div key={q.id ?? i} className="text-[12px]">
                  <p className="leading-relaxed"><span className="font-bold">{i + 1}.</span> {q.text ?? q.question} [{q.marks} marks]</p>
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="mt-1 grid gap-1 pl-5 sm:grid-cols-2">
                      {q.options.map((o, oi) => <span key={oi} className="text-slate-600 dark:text-slate-300">({String.fromCharCode(65 + oi)}) <MathText>{optionText(o)}</MathText></span>)}
                    </div>
                  )}
                </div>
              ))
              : selectedIds.map((id, i) => <p key={id} className="text-[12px]"><span className="font-bold">{i + 1}.</span> {id}</p>)}
            {questionList.length === 0 && selectedIds.length === 0 && <p className="text-[11px] text-slate-400">No questions selected.</p>}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PaperDeleteDialog({ open, onOpenChange, paper, onConfirm, deleting = false }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !deleting && onOpenChange?.(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-500" /> Delete generated paper?</DialogTitle>
          <DialogDescription>This permanently removes <span className="font-bold text-slate-700 dark:text-slate-200">{paper?.title}</span>.</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-[12px] leading-relaxed text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/5 dark:text-rose-300">
          {paperQuestionCount(paper)} questions · {paper?.totalMarks} marks · {paper?.duration} min · created {formatDate(paper?.created ?? paper?.generated, 'MMM d, yyyy')}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete permanently'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* Share dialog — backend only, no localStorage */
export function SharePaperDialog({ paper, open, onOpenChange }) {
  const toast = useToast()
  const { data: rosterData } = useFacultyRoster()
  const { mutateAsync: sharePaper } = usePaperShareBackend()
  const [audience, setAudience] = useState('Entire class')
  const [selected, setSelected] = useState([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [sharing, setSharing] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState({})
  const [selectedFamily, setSelectedFamily] = useState(null)   // 'JEE' | 'NEET'
  const [selectedBatchId, setSelectedBatchId] = useState(null) // batch id of selected section

  const roster = rosterData?.students ?? rosterData?.items ?? []
  const batches = rosterData?.batches ?? []

  // Competitive batches grouped by examFamily for the Batch tab
  const competitiveBatches = batches.filter((b) => b.domain === 'Competitive')
  const jeeGroups = competitiveBatches.filter((b) => b.examFamily === 'JEE')
  const neetGroups = competitiveBatches.filter((b) => b.examFamily === 'NEET')

  // University batches grouped by program for the Course group tab
  const universityBatches = batches.filter((b) => b.domain === 'University')
  const courseGroupMap = universityBatches.reduce((acc, b) => {
    const key = b.program ?? b.name ?? 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})

  const visibleRoster = audience === 'Course group'
    ? roster.filter((r) => r.domain === 'University')
    : roster

  const filteredRoster = search.trim()
    ? visibleRoster.filter((r) => {
        const q = search.trim().toLowerCase()
        return r.name?.toLowerCase().includes(q) || String(r.roll ?? '').toLowerCase().includes(q)
      })
    : visibleRoster

  const toggle = (name) => setSelected((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name])

  const toggleBatch = (batchStudents) => {
    const names = batchStudents.map((s) => s.name)
    const allSelected = names.every((n) => selected.includes(n))
    setSelected((prev) => allSelected ? prev.filter((n) => !names.includes(n)) : [...new Set([...prev, ...names])])
  }

  const isBatchAllSelected = (batchStudents) => batchStudents.length > 0 && batchStudents.every((s) => selected.includes(s.name))
  const isBatchPartialSelected = (batchStudents) => batchStudents.some((s) => selected.includes(s.name)) && !isBatchAllSelected(batchStudents)

  const toggleGroupExpand = (key) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  const selectAll = () => setSelected((prev) => (prev.length === visibleRoster.length && visibleRoster.length > 0 ? [] : visibleRoster.map((r) => r.name)))

  const handleShare = async () => {
    if (audience !== 'Entire class' && selected.length === 0) {
      toast.error('Choose recipients', 'Select at least one student, or switch to "Entire class".')
      return
    }
    setSharing(true)
    try {
      const res = await sharePaper({
        id: paper.id,
        payload: { audience, recipients: audience === 'Entire class' ? roster.map((r) => r.name) : selected, message },
      })
      if (res?.ok || res?.share) {
        toast.success('Paper shared', `"${paper.title}" shared to ${audience === 'Entire class' ? 'entire class' : `${selected.length} students`}.`)
        onOpenChange(false)
        setMessage('')
        setSelected([])
      }
    } catch (e) {
      const isBackendDown = !e?.response || e?.response?.status >= 500
      if (isBackendDown) {
        toast.error('Could not share', 'Sharing is temporarily unavailable. Please try again later.')
      } else {
        toast.error('Could not share', e?.response?.data?.detail ?? e?.response?.data?.message ?? 'Please try again.')
      }
    } finally {
      setSharing(false)
    }
  }

  // Reusable grouped section renderer — used for both Batch (JEE/NEET) and Course group
  function BatchFamilyGroup({ label, labelColor, groups }) {
    if (groups.length === 0) return null
    return (
      <div className="mb-3">
        <p className={`mb-1.5 inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${labelColor}`}>{label}</p>
        <div className="space-y-2">
          {groups.map((batch) => {
            const batchStudents = batch.students ?? []
            const filteredStudents = search.trim()
              ? batchStudents.filter((s) => {
                  const q = search.trim().toLowerCase()
                  return s.name?.toLowerCase().includes(q) || String(s.roll ?? '').toLowerCase().includes(q)
                })
              : batchStudents
            if (filteredStudents.length === 0 && search.trim()) return null
            const allSel = isBatchAllSelected(batchStudents)
            const partSel = isBatchPartialSelected(batchStudents)
            const isOpen = expandedGroups[batch.id] ?? false
            return (
              <div key={batch.id} className="rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Section header row */}
                <div className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 ${allSel ? 'bg-teal-50/60 dark:bg-teal-500/10' : ''}`}>
                  {/* Checkbox — select all in this batch */}
                  <button
                    onClick={() => toggleBatch(batchStudents)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-all ${allSel ? 'border-teal-400 bg-teal-400 text-white' : partSel ? 'border-teal-400 bg-teal-100 text-teal-600' : 'border-slate-300 dark:border-slate-600'}`}
                  >
                    {allSel ? '✓' : partSel ? '–' : ''}
                  </button>
                  {/* Label — expands/collapses the student list */}
                  <button onClick={() => toggleGroupExpand(batch.id)} className="flex flex-1 items-center gap-2 text-left">
                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                      {batch.section ? `Section ${batch.section}` : batch.name}
                    </span>
                    <span className="text-[10px] text-slate-400">{batchStudents.length} students</span>
                    <ChevronDown className={`ml-auto h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {/* Students — shown when expanded */}
                {isOpen && filteredStudents.length > 0 && (
                  <div className="grid grid-cols-1 gap-1 border-t border-slate-100 p-2 dark:border-slate-700/60 sm:grid-cols-2">
                    {filteredStudents.map((s) => (
                      <button key={s.id} onClick={() => toggle(s.name)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-all ${selected.includes(s.name) ? 'border-teal-300 bg-teal-50/60 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300' : 'border-slate-100 text-slate-600 hover:border-teal-200 dark:border-slate-800 dark:text-slate-300'}`}>
                        <Users className="h-3 w-3 shrink-0" /><span className="truncate">{s.name}</span><span className="ml-auto text-[10px] text-slate-400">{s.roll}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Course group dropdown renderer — groups university batches by program
  function CourseGroupSection() {
    if (universityBatches.length === 0) {
      return <p className="py-4 text-center text-[12px] text-slate-400">No course groups found.</p>
    }
    return (
      <div className="space-y-2">
        {Object.entries(courseGroupMap).map(([programName, programBatches]) => {
          const isOpen = expandedGroups[`prog_${programName}`] ?? false
          const programStudents = programBatches.flatMap((b) => b.students ?? [])
          const allSel = programStudents.length > 0 && programStudents.every((s) => selected.includes(s.name))
          const partSel = programStudents.some((s) => selected.includes(s.name)) && !allSel
          return (
            <div key={programName} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              {/* Program header — acts as top-level dropdown toggle */}
              <div className={`flex items-center gap-2 px-3 py-2.5 ${allSel ? 'bg-teal-50/60 dark:bg-teal-500/10' : 'bg-slate-50/60 dark:bg-slate-800/30'}`}>
                <button
                  onClick={() => toggleBatch(programStudents)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-all ${allSel ? 'border-teal-400 bg-teal-400 text-white' : partSel ? 'border-teal-400 bg-teal-100 text-teal-600' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  {allSel ? '✓' : partSel ? '–' : ''}
                </button>
                <button onClick={() => toggleGroupExpand(`prog_${programName}`)} className="flex flex-1 items-center gap-2 text-left">
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{programName}</span>
                  <span className="text-[10px] text-slate-400">{programStudents.length} students</span>
                  <ChevronDown className={`ml-auto h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {/* Batch sections inside the program */}
              {isOpen && (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {programBatches.map((batch) => {
                    const batchStudents = batch.students ?? []
                    const filteredStudents = search.trim()
                      ? batchStudents.filter((s) => {
                          const q = search.trim().toLowerCase()
                          return s.name?.toLowerCase().includes(q) || String(s.roll ?? '').toLowerCase().includes(q)
                        })
                      : batchStudents
                    if (filteredStudents.length === 0 && search.trim()) return null
                    const bAllSel = isBatchAllSelected(batchStudents)
                    const bPartSel = isBatchPartialSelected(batchStudents)
                    const bIsOpen = expandedGroups[batch.id] ?? false
                    return (
                      <div key={batch.id}>
                        {/* Section row */}
                        <div className={`flex items-center gap-2 px-4 py-2 ${bAllSel ? 'bg-teal-50/40 dark:bg-teal-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}>
                          <button
                            onClick={() => toggleBatch(batchStudents)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold transition-all ${bAllSel ? 'border-teal-400 bg-teal-400 text-white' : bPartSel ? 'border-teal-400 bg-teal-100 text-teal-600' : 'border-slate-300 dark:border-slate-600'}`}
                          >
                            {bAllSel ? '✓' : bPartSel ? '–' : ''}
                          </button>
                          <button onClick={() => toggleGroupExpand(batch.id)} className="flex flex-1 items-center gap-2 text-left">
                            <span className="text-[11.5px] font-semibold text-slate-600 dark:text-slate-300">
                              {batch.section ? `Section ${batch.section}` : batch.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{batchStudents.length} students</span>
                            <ChevronDown className={`ml-auto h-3 w-3 text-slate-400 transition-transform ${bIsOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                        {/* Individual students */}
                        {bIsOpen && filteredStudents.length > 0 && (
                          <div className="grid grid-cols-1 gap-1 border-t border-slate-100 px-4 py-2 dark:border-slate-700/40 sm:grid-cols-2">
                            {filteredStudents.map((s) => (
                              <button key={s.id} onClick={() => toggle(s.name)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-all ${selected.includes(s.name) ? 'border-teal-300 bg-teal-50/60 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300' : 'border-slate-100 text-slate-600 hover:border-teal-200 dark:border-slate-800 dark:text-slate-300'}`}>
                                <Users className="h-3 w-3 shrink-0" /><span className="truncate">{s.name}</span><span className="ml-auto text-[10px] text-slate-400">{s.roll}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-teal-500" /> Share paper</DialogTitle>
          <DialogDescription>{paper?.title} · {paper?.domain ?? paper?.mode ?? 'University'} · {paper?.totalMarks} marks.</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto scrollbar-thin py-2">
          {/* Audience tabs */}
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Audience</p>
            <div className="flex flex-wrap gap-1.5">
              {['Entire class', 'Selected students', 'Batch', 'Course group'].map((a) => (
                <button key={a} onClick={() => { setAudience(a); setSelected([]); setSearch(''); setExpandedGroups({}); setSelectedFamily(null); setSelectedBatchId(null) }} className={`rounded-full px-3.5 py-1.5 text-[11.5px] font-bold transition-all ${audience === a ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25' : 'border border-slate-200 text-slate-500 hover:border-teal-300 dark:border-slate-700 dark:text-slate-400'}`}>{a}</button>
              ))}
            </div>
          </div>

          {audience !== 'Entire class' && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recipients ({selected.length})</p>
                {audience === 'Selected students' && (
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={selectAll}>{selected.length === visibleRoster.length && visibleRoster.length > 0 ? 'Clear all' : 'Select all'}</Button>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-2 shrink-0">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or roll number…"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-[12px] outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              {/* Scrollable recipient area */}
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-0.5">
                {audience === 'Batch' ? (
                  competitiveBatches.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-slate-400">No competitive batches found.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Step 1 — pick exam family */}
                      <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Exam</p>
                        <div className="flex gap-2">
                          {[{ label: 'JEE', groups: jeeGroups, activeColor: 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30', inactiveColor: 'border border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10' },
                            { label: 'NEET', groups: neetGroups, activeColor: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30', inactiveColor: 'border border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10' }
                          ].map(({ label, groups, activeColor, inactiveColor }) => groups.length > 0 && (
                            <button
                              key={label}
                              onClick={() => { setSelectedFamily(selectedFamily === label ? null : label); setSelectedBatchId(null) }}
                              className={`rounded-full px-4 py-1.5 text-[12px] font-bold transition-all ${selectedFamily === label ? activeColor : inactiveColor}`}
                            >
                              {label}
                              <span className="ml-1.5 text-[10px] opacity-75">
                                {groups.reduce((s, b) => s + (b.students?.length ?? 0), 0)} students
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 2 — pick section */}
                      {selectedFamily && (() => {
                        const sectionGroups = selectedFamily === 'JEE' ? jeeGroups : neetGroups
                        return (
                          <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Section</p>
                            <div className="flex flex-wrap gap-2">
                              {sectionGroups.map((batch) => {
                                const isActive = selectedBatchId === batch.id
                                const allSel = isBatchAllSelected(batch.students ?? [])
                                const partSel = isBatchPartialSelected(batch.students ?? [])
                                return (
                                  <button
                                    key={batch.id}
                                    onClick={() => setSelectedBatchId(isActive ? null : batch.id)}
                                    className={`relative rounded-full px-4 py-1.5 text-[12px] font-bold transition-all ${isActive ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30' : 'border border-slate-200 text-slate-600 hover:border-teal-300 dark:border-slate-700 dark:text-slate-300'}`}
                                  >
                                    {batch.section ? `Section ${batch.section}` : batch.name}
                                    <span className="ml-1.5 text-[10px] opacity-75">{batch.students?.length ?? 0}</span>
                                    {(allSel || partSel) && (
                                      <span className={`absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-black ${allSel ? 'bg-teal-400 text-white' : 'bg-amber-400 text-white'}`}>
                                        {allSel ? '✓' : '~'}
                                      </span>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Step 3 — student list for selected section */}
                      {selectedBatchId && (() => {
                        const batch = competitiveBatches.find((b) => b.id === selectedBatchId)
                        const batchStudents = batch?.students ?? []
                        const filteredStudents = search.trim()
                          ? batchStudents.filter((s) => {
                              const q = search.trim().toLowerCase()
                              return s.name?.toLowerCase().includes(q) || String(s.roll ?? '').toLowerCase().includes(q)
                            })
                          : batchStudents
                        const allSel = isBatchAllSelected(batchStudents)
                        return (
                          <div>
                            <div className="mb-1.5 flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {batch.section ? `Section ${batch.section}` : batch.name} — {batchStudents.length} students
                              </p>
                              <button onClick={() => toggleBatch(batchStudents)} className="text-[11px] font-semibold text-teal-500 hover:text-teal-400">
                                {allSel ? 'Clear all' : 'Select all'}
                              </button>
                            </div>
                            <div className="grid max-h-48 grid-cols-1 gap-1 overflow-y-auto scrollbar-thin sm:grid-cols-2">
                              {filteredStudents.length === 0
                                ? <p className="col-span-2 py-3 text-center text-[12px] text-slate-400">No students match.</p>
                                : filteredStudents.map((s) => (
                                  <button key={s.id} onClick={() => toggle(s.name)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-all ${selected.includes(s.name) ? 'border-teal-300 bg-teal-50/60 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300' : 'border-slate-100 text-slate-600 hover:border-teal-200 dark:border-slate-800 dark:text-slate-300'}`}>
                                    <Users className="h-3 w-3 shrink-0" /><span className="truncate">{s.name}</span><span className="ml-auto text-[10px] text-slate-400">{s.roll}</span>
                                  </button>
                                ))
                              }
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                ) : audience === 'Course group' ? (
                  <CourseGroupSection />
                ) : (
                  /* Flat grid — Selected students */
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredRoster.length === 0 ? (
                      <p className="col-span-3 py-4 text-center text-[12px] text-slate-400">No students match your search.</p>
                    ) : filteredRoster.map((r) => (
                      <button key={r.id} onClick={() => toggle(r.name)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition-all ${selected.includes(r.name) ? 'border-teal-300 bg-teal-50/60 text-teal-700 dark:border-teal-500/40 dark:bg-teal-500/10 dark:text-teal-300' : 'border-slate-100 text-slate-600 hover:border-teal-200 dark:border-slate-800 dark:text-slate-300'}`}>
                        <Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{r.name}</span><span className="ml-auto text-[10px] text-slate-400">{r.roll}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Optional message */}
          <div className="shrink-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Optional message</p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="e.g. Attempt this paper before Friday — answers will be discussed in class." className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm shadow-sm outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100" />
          </div>
        </div>

        <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleShare} disabled={sharing || !paperSendReadiness(paper).canSend} className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:brightness-110">{sharing ? 'Sharing…' : <><Send className="h-4 w-4" /> Share</>}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Merge Papers Dialog — 2-step flow:
 * Step 1: Select 2+ papers
 * Step 2: Give the merged paper a name → create it
 */
export function MergePapersDialog({ open, onOpenChange, onMerged }) {
  const toast = useToast()
  const { data: publishedPapers = [], isLoading: loadingPapers } = usePublishedPapers(open)
  const { mutateAsync: doMerge, isPending: merging } = useMergePapers()

  const [step, setStep] = useState(1)          // 1 = select, 2 = name
  const [selectedIds, setSelectedIds] = useState([])
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')

  const handleOpenChange = (v) => {
    if (!v) { setStep(1); setSelectedIds([]); setTitle(''); setSearch('') }
    onOpenChange(v)
  }

  const togglePaper = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const filtered = publishedPapers.filter((p) => {
    if (!search.trim()) return true
    const hay = `${p.title} ${p.subject ?? ''} ${p.examFamily ?? ''}`.toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  const selectedPapers = publishedPapers.filter((p) => selectedIds.includes(p.id))
  const totalQuestions = selectedPapers.reduce((a, p) => a + (p.questions ?? 0), 0)
  const totalMarks = selectedPapers.reduce((a, p) => a + (p.totalMarks ?? 0), 0)
  const totalDuration = selectedPapers.reduce((a, p) => a + (p.duration ?? p.durationMinutes ?? 0), 0)

  // Auto-suggest title when entering step 2
  const goToStep2 = () => {
    if (selectedIds.length < 2) return
    const suggested = selectedPapers.map((p) => p.title).join(' + ')
    setTitle(suggested)
    setStep(2)
  }

  const handleMerge = async () => {
    if (!title.trim() || merging) return
    try {
      const result = await doMerge({
        title: title.trim(),
        paperIds: selectedIds,
        duration: totalDuration || undefined,
        totalMarks: totalMarks || undefined,
      })
      toast.success('Papers merged!', `"${title.trim()}" created with ${totalQuestions} questions.`)
      handleOpenChange(false)
      if (onMerged) onMerged(result?.paper)
    } catch (e) {
      const detail = e?.response?.data?.detail ?? e?.message ?? 'Could not merge papers.'
      toast.error('Merge failed', detail)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">

        {/* ── Step 1: Select papers ── */}
        {step === 1 && (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" /> Merge Papers
              </DialogTitle>
              <DialogDescription>
                Select 2 or more papers to merge. All their questions will be combined into one new paper.
              </DialogDescription>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-1 pr-1">
              {/* Search */}
              <div className="relative shrink-0">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search papers…"
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                />
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>

              {/* Selected chips */}
              {selectedPapers.length > 0 && (
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {selectedPapers.map((p) => (
                    <span key={p.id} className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                      {p.title}
                      <button onClick={() => togglePaper(p.id)} className="ml-0.5 text-indigo-400 hover:text-indigo-600" aria-label={`Remove ${p.title}`}>×</button>
                    </span>
                  ))}
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {totalQuestions} questions · {totalMarks} marks · {totalDuration} min
                  </span>
                </div>
              )}

              {/* Paper list */}
              {loadingPapers ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-100 p-8 text-[12.5px] text-slate-400 dark:border-slate-800">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading papers…
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                  <BookOpen className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-2 text-[12px] font-medium text-slate-500">
                    {publishedPapers.length === 0 ? 'No papers available yet.' : 'No papers match your search.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 rounded-2xl border border-slate-100 p-3 dark:border-slate-800">
                  {filtered.map((p) => {
                    const checked = selectedIds.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        onClick={() => togglePaper(p.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${checked ? 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-500/40 dark:bg-indigo-500/10' : 'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:hover:border-indigo-500/30'}`}
                      >
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${checked ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                          {checked && <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 text-white"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{p.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {p.subject && <span className="mr-2">{p.subject}</span>}
                            <span>{p.questions ?? 0} questions</span>
                            {p.totalMarks ? <span> · {p.totalMarks} marks</span> : null}
                            {(p.duration ?? p.durationMinutes) ? <span> · {p.duration ?? p.durationMinutes} min</span> : null}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button
                disabled={selectedIds.length < 2}
                onClick={goToStep2}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/25 hover:brightness-110"
              >
                <BookOpen className="h-4 w-4" /> Merge {selectedIds.length >= 2 ? `${selectedIds.length} papers` : 'papers'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Name the merged paper ── */}
        {step === 2 && (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-500" /> Name your merged paper
              </DialogTitle>
              <DialogDescription>
                Merging {selectedIds.length} papers · {totalQuestions} questions · {totalMarks} marks
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Paper title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Physics + Chemistry + Biology — Full Syllabus"
                autoFocus
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100"
                onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) handleMerge() }}
              />
              {/* Source papers summary */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedPapers.map((p) => (
                  <span key={p.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {p.title}
                  </span>
                ))}
              </div>
            </div>

            <DialogFooter className="shrink-0 flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button variant="outline" onClick={() => setStep(1)} disabled={merging}>← Back</Button>
              <Button
                disabled={!title.trim() || merging}
                onClick={handleMerge}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-500/25 hover:brightness-110"
              >
                {merging ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <><BookOpen className="h-4 w-4" /> Create merged paper</>}
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
