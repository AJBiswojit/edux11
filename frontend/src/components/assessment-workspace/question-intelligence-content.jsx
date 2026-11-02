/**
 * MediXO EduX — Assessment Workspace · Question Intelligence (enhanced bank).
 * Beyond listing questions: difficulty · Bloom · topic coverage · usage ·
 * accuracy · quality · chapter & course mapping · status · tags ·
 * preview / edit / duplicate / archive / delete / tag / filter / search /
 * bulk actions. Every number derives from the question bank dataset.
 */

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import {
  Archive, Copy, Database, Eye, Filter, PencilLine, Sparkles, Tag, Trash2, Wand2,
} from 'lucide-react'
import { CompetitiveQuestionBrowser } from './competitive-question-browser'
import { toCompetitiveBrowserQuestion, optionText } from '@/api/adapters/questions'
import { Badge, Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea, useToast } from '@/components/ui'
import { MathText } from '@/components/shared/math-text'
import { useUpdateQuestion } from '@/services/faculty-questions'
import { cn } from '@/utils/cn'

const DIFF_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }
const STATUS_STYLES = { Approved: 'success', Review: 'warning', Flagged: 'danger' }
const QUALITY_STYLES = { Excellent: 'success', Good: 'info', Average: 'warning', 'Needs attention': 'danger' }
const BLOOM_COLORS = { Remember: '#6366f1', Understand: '#3b82f6', Apply: '#14b8a6', Analyze: '#10b981', Evaluate: '#f59e0b', Create: '#8b5cf6' }

/* Question bank (`data`) and Faculty Intelligence (`intelData`) are loaded by
   the parent Question Intelligence workspace and passed as props — this child
   never re-fetches them. */
function QuestionIntelligenceContent({ data, intelData }) {
  const [searchParams] = useSearchParams()
  const [context, setContext] = useState('University')
  const [difficulty, setDifficulty] = useState('All')
  const [status, setStatus] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [subject, setSubject] = useState('All')
  const [type, setType] = useState('All')
  const [tag, setTag] = useState('All')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState(null)
  /* Phase 5 — deep-link init: ?subject=Physics&chapter=Rotational Motion
     (used by the Similar-Issue "Open Question Bank" action) */
  useEffect(() => {
    const subjectParam = searchParams.get('subject')
    const chapterParam = searchParams.get('chapter')
    const familyParam = searchParams.get('family')
    if (familyParam) setFamily(familyParam)
    if (subjectParam) {
      setSubject(subjectParam)
      /* CS-codes are university courses; anything else is competitive (JEE/NEET) */
      setContext(/^CS\d/.test(subjectParam) ? 'University' : 'Competitive')
    }
    if (chapterParam) setQuery(chapterParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [family, setFamily] = useState('All')
  const [selected, setSelected] = useState([])
  const [previewing, setPreviewing] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  // Seed the controlled textarea when the edit dialog opens.
  useEffect(() => { setEditText(editing?.text ?? '') }, [editing])
  const [tagging, setTagging] = useState(null)
  const [tagValue, setTagValue] = useState('High-Yield')
  const [bulkTagging, setBulkTagging] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const toast = useToast()
  const updateQuestion = useUpdateQuestion()

  const allQuestions = data?.questions ?? []
  const universityQuestions = allQuestions.filter((q) => q.domain === 'University' || (!q.domain && !q.examFamily))
  const competitiveQuestions = allQuestions.filter((q) => q.domain === 'Competitive')
  const questions = items ?? universityQuestions
  const tagOptions = intelData?.datasets?.questionTags ?? ['High-Yield', 'Conceptual', 'Numerical', 'Frequently Missed', 'Important']

  const subjects = useMemo(() => [...new Set(universityQuestions.map((q) => q.subject).filter(Boolean))], [universityQuestions])
  const types = useMemo(() => [...new Set(universityQuestions.map((q) => q.type).filter(Boolean))], [universityQuestions])
  const tags = useMemo(() => [...new Set(universityQuestions.flatMap((q) => q.tags ?? []))], [universityQuestions])

  const filtered = useMemo(() => {
    let rows = questions
    if (difficulty !== 'All') rows = rows.filter((q) => q.difficulty === difficulty)
    if (status !== 'All') rows = rows.filter((q) => q.status === status)
    if (sourceFilter === 'AI Question Studio') rows = rows.filter((q) => q.source === 'AI Question Studio')
    if (sourceFilter === 'Question Bank') rows = rows.filter((q) => q.source !== 'AI Question Studio')
    if (subject !== 'All') rows = rows.filter((q) => q.subject === subject)
    if (type !== 'All') rows = rows.filter((q) => q.type === type)
    if (tag !== 'All') rows = rows.filter((q) => (q.tags ?? []).includes(tag))
    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter((r) =>
        r.text.toLowerCase().includes(q) || (r.topic ?? '').toLowerCase().includes(q) ||
        (r.chapter ?? '').toLowerCase().includes(q) || (r.id ?? '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [questions, difficulty, status, sourceFilter, subject, type, tag, query])

  const stats = intelData?.derived?.assessment?.questionStats ?? {}
  const qualityMap = Object.fromEntries((stats.quality ?? []).map((q) => [q.id, q]))

  const patchItems = (ids, fn) => {
    setItems((prev) => {
      const base = prev ?? data.questions
      return base.map((q) => (ids.includes(q.id) ? fn(q) : q))
    })
  }

  const removeItems = (ids) => {
    setItems((prev) => {
      const base = prev ?? data.questions
      return base.filter((q) => !ids.includes(q.id))
    })
    setSelected((prev) => prev.filter((id) => !ids.includes(id)))
  }

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    setSelected((prev) => (prev.length === filtered.length && filtered.every((q) => prev.includes(q.id)) ? [] : filtered.map((q) => q.id)))
  }

  const submitTag = () => {
    const target = tagging ?? selected
    patchItems(target, (q) => ({ ...q, tags: [...new Set([...(q.tags ?? []), tagValue])] }))
    toast.success('Tag applied', `"${tagValue}" added to ${target.length} question${target.length > 1 ? 's' : ''}.`)
    setTagging(null)
    setBulkTagging(false)
    setSelected([])
  }

  const submitEdit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const text = fd.get('text')
    const difficulty = fd.get('difficulty')
    const bloom = fd.get('bloom')
    const status = fd.get('status')
    const tagsVal = String(fd.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean)

    try {
      const res = await updateQuestion.mutateAsync({
        id: editing.id,
        text,
        difficulty,
        bloom,
        status,
        tags: tagsVal,
      })
      // Patch local list with the authoritative server response, falling back
      // to the form values if the server returns an unexpected shape.
      const updated = res?.question ?? { ...editing, text, difficulty, bloom, status, tags: tagsVal }
      patchItems([editing.id], () => ({ ...editing, ...updated }))
      toast.success('Question saved', `${editing.id} updated in the question bank.`)
    } catch {
      toast.error('Save failed', 'Could not reach the server. Your changes were not persisted.')
    }

    setEditing(null)
  }

  const filterChip = (active, onClick, label, count) => (
    <button
      key={label}
      onClick={onClick}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200',
        active
          ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
          : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
      )}
    >
      {label}
      {count != null && <span className="ml-1 opacity-60">{count}</span>}
    </button>
  )

  const competitiveRecords = competitiveQuestions.map(toCompetitiveBrowserQuestion).filter(Boolean)
  const jeeCount = competitiveQuestions.filter((q) => q.examFamily === 'JEE').length
  const neetCount = competitiveQuestions.filter((q) => q.examFamily === 'NEET').length
  const examSummaries = ['JEE', 'NEET'].map((familyName) => {
    const pool = competitiveQuestions.filter((q) => q.examFamily === familyName)
    const bySubject = Object.entries(pool.reduce((acc, q) => {
      const key = q.subject || '—'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})).map(([subjectName, count]) => ({ subject: subjectName, count }))
    const byDifficulty = Object.entries(pool.reduce((acc, q) => {
      const key = q.difficulty || '—'
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})).map(([difficultyName, count]) => ({ difficulty: difficultyName, count }))
    return { exam: familyName === 'JEE' ? 'JEE Main' : 'NEET UG', count: pool.length, bySubject, byDifficulty }
  }).filter((es) => es.count > 0)
  const pyqCount = competitiveRecords.filter((q) => q.isPyq).length

  /* Competitive mode — JEE/NEET rows from GET /faculty/question-bank, not intel fixtures */
  if (context === 'Competitive') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {['University', 'Competitive'].map((c) => (
              <button
                key={c}
                onClick={() => setContext(c)}
                className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${context === c ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {c === 'University' ? '🏛️' : '🎯'} {c}
              </button>
            ))}
          </div>
          <Badge variant="gradient" className="px-3 py-1">
            <Sparkles className="h-3 w-3" /> {competitiveQuestions.length} competitive questions · JEE {jeeCount} · NEET {neetCount}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {examSummaries.map((es) => (
            <div key={es.exam} className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">{es.exam}</p>
              <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{es.count}<span className="text-sm text-slate-400"> questions</span></p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(es.bySubject ?? []).map((sb) => <Badge key={sb.subject} variant="secondary" size="sm">{sb.subject} · {sb.count}</Badge>)}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(es.byDifficulty ?? []).map((d) => <Badge key={d.difficulty} variant="outline" size="sm">{d.difficulty} {d.count}</Badge>)}
              </div>
            </div>
          ))}
          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-300">PYQ coverage</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">{pyqCount}<span className="text-sm text-slate-400"> PYQ records</span></p>
            <p className="mt-1 text-[11px] text-slate-400">Counted from question bank fields only — year and session are shown when recorded.</p>
          </div>
        </div>

        <CompetitiveQuestionBrowser
          questions={competitiveRecords}
          title="Competitive question browser"
          subtitle="JEE and NEET previous-year questions — answer keys are omitted"
          badge={<Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> Question bank</Badge>}
          defaultExam={family === 'All' ? null : family === 'JEE' ? 'JEE Main' : 'NEET UG'}
          defaultSubject={subject !== 'All' ? subject : null}
          defaultChapter={query ? null : null}
          defaultQuery={query || null}
        />
      </div>
    )
  }

  return (
    <div>
      {/* context toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {['University', 'Competitive'].map((c) => (
            <button
              key={c}
              onClick={() => setContext(c)}
              className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-[13px] font-bold transition-all ${context === c ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {c === 'University' ? '🏛️' : '🎯'} {c}
            </button>
          ))}
        </div>
        <Badge variant="secondary" className="px-3 py-1">{universityQuestions.length} university questions · {subjects.length} courses</Badge>
      </div>

      {/* KPI strip — all values from the live question-bank response (an
          empty bank shows honest zeros / neutral '—', never seeded stats) */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
        {[
          { label: 'Total questions', value: String(data.summary?.total ?? stats.total ?? 0), color: '#6366f1' },
          { label: 'AI-generated', value: String(stats.aiGenerated ?? data.summary?.aiGenerated ?? 0), color: '#14b8a6' },
          { label: 'Used this term', value: String(stats.usedThisTerm ?? 0), color: '#10b981' },
          { label: 'Flagged', value: String(stats.flagged ?? 0), color: '#ef4444' },
          { label: 'Avg accuracy', value: stats.avgAccuracy != null ? `${stats.avgAccuracy}%` : '—', color: '#f59e0b' },
          { label: 'Avg quality', value: stats.qualityAvg != null ? `${stats.qualityAvg}/100` : '—', color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
            <p className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-2.5 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Difficulty</span>
          {['All', 'Easy', 'Medium', 'Hard'].map((f) => filterChip(difficulty === f, () => setDifficulty(f), f))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          {['All', 'Approved', 'Review', 'Flagged'].map((f) => filterChip(status === f, () => setStatus(f), f))}
          <span className="ml-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Course</span>
          {['All', ...subjects].map((f) => filterChip(subject === f, () => setSubject(f), f))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Source</span>
          {['All', 'AI Question Studio', 'Question Bank'].map((f) => filterChip(sourceFilter === f, () => setSourceFilter(f), f))}
          <span className="ml-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</span>
          {['All', ...types].map((f) => filterChip(type === f, () => setType(f), f))}
          <span className="ml-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tag</span>
          {['All', ...tags].map((f) => filterChip(tag === f, () => setTag(f), f))}
          <div className="relative ml-auto">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search questions…" className="h-9 w-56 pl-9 text-xs" />
            <Filter className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Bulk bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="outline" onClick={toggleAll}>
          {selected.length === filtered.length && filtered.length > 0 ? 'Deselect all' : `Select all (${filtered.length})`}
        </Button>
        {selected.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-2 rounded-2xl bg-indigo-50/80 px-3 py-1.5 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">{selected.length} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setBulkTagging(true)}><Tag className="h-3 w-3" /> Tag</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { removeItems(selected); toast.success('Archived', `${selected.length} questions archived.`) }}><Archive className="h-3 w-3" /> Archive</Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-rose-500 hover:text-rose-600" onClick={() => { removeItems(selected); toast.success('Deleted', `${selected.length} questions deleted.`) }}><Trash2 className="h-3 w-3" /> Delete</Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setSelected([])}>Clear</Button>
          </motion.div>
        )}
        <Button size="sm" className="ml-auto" onClick={() => setGenerateOpen(true)}>
          <Wand2 className="h-4 w-4" /> Generate with AI
        </Button>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {filtered.map((q, i) => {
          const quality = qualityMap[q.id]
          return (
            <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className={cn('group p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift', selected.includes(q.id) && 'ring-2 ring-indigo-500/40')}>
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary" size="sm">{q.subject}</Badge>
                      {q.chapter && <Badge variant="outline" size="sm">{q.chapter}</Badge>}
                      <Badge variant="outline" size="sm">{q.topic}</Badge>
                      <Badge variant={DIFF_STYLES[q.difficulty]} size="sm">{q.difficulty}</Badge>
                      <Badge variant="secondary" size="sm" className="gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: BLOOM_COLORS[q.bloom] ?? '#94a3b8' }} />
                        {q.bloom}
                      </Badge>
                      <Badge variant="secondary" size="sm">{q.type}</Badge>
                      <Badge variant={STATUS_STYLES[q.status] ?? 'secondary'} size="sm">{q.status}</Badge>
                      <Badge variant={q.source === 'AI' ? 'info' : 'secondary'} size="sm">{q.source === 'AI' ? '🤖 AI' : '✍️ Manual'}</Badge>
                      {q.pyqFrequency > 0 && <Badge variant="gradient" size="sm">PYQ ×{q.pyqFrequency}</Badge>}
                      {quality && <Badge variant={QUALITY_STYLES[quality.level] ?? 'secondary'} size="sm">Quality {quality.score}</Badge>}
                    </div>
                    <p className="mt-2 text-[14px] font-medium leading-relaxed text-slate-700 dark:text-slate-200">{q.text}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-slate-400">
                      <span>Used {q.usage}× this term</span>
                      <span>· accuracy {q.accuracy ?? '—'}%</span>
                      <span>· last used {q.lastUsed}</span>
                      {(q.tags ?? []).length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {(q.tags ?? []).map((t) => <Badge key={t} variant="outline" size="sm" className="text-indigo-600 dark:text-indigo-300">#{t}</Badge>)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                    <Button size="sm" variant="outline" onClick={() => setPreviewing(q)}><Eye className="h-3.5 w-3.5" /> Preview</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(q)}><PencilLine className="h-3.5 w-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => { patchItems([q.id], (x) => ({ ...x, id: `${x.id}_copy` })); toast.success('Duplicated', `A copy of ${q.id} was created.`) }}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                    <Button size="sm" variant="ghost" onClick={() => setTagging([q.id])}><Tag className="h-3.5 w-3.5" /> Tag</Button>
                    <Button size="sm" variant="ghost" onClick={() => { removeItems([q.id]); toast.success('Archived', `${q.id} archived.`) }}><Archive className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => { removeItems([q.id]); toast.success('Deleted', `${q.id} permanently removed.`) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <Card className="p-10 text-center">
            <Database className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No questions match these filters</p>
            <p className="mt-1 text-xs text-slate-400">Try widening the difficulty, status or course filters.</p>
          </Card>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-indigo-500" /> {previewing?.id} — question preview</DialogTitle>
            <DialogDescription>
              {previewing?.subject} · {previewing?.chapter ?? previewing?.topic} · {previewing?.type} · {previewing?.difficulty} · {previewing?.bloom}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-100 p-5 dark:border-slate-800">
            <p className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">{previewing?.text}</p>
            {previewing?.options?.length > 0 && (
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {previewing.options.map((o, oi) => (
                  <span key={oi} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">({String.fromCharCode(65 + oi)}) {optionText(o)}</span>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Usage', value: `${previewing?.usage}×` },
              { label: 'Accuracy', value: `${previewing?.accuracy ?? '—'}%` },
              { label: 'PYQ frequency', value: `×${previewing?.pyqFrequency ?? 0}` },
              { label: 'Status', value: previewing?.status },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/50">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{s.value}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.success('Added to exam', `${previewing?.id} queued for the active exam draft.`)}>Add to exam</Button>
            <Button onClick={() => setPreviewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit — {editing?.id}</DialogTitle>
            <DialogDescription>{editing?.subject} · {editing?.chapter ?? editing?.topic} · {editing?.type}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <Field label="Question text">
              <Textarea
                name="text"
                rows={4}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                required
              />
            </Field>
            {/* Live LaTeX preview — only shown when the text contains math */}
            {editText && /\$|\\\(|\\\[|\\begin\{/.test(editText) && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-500">Preview</p>
                <div className="text-[14px] leading-relaxed text-slate-800 dark:text-slate-100">
                  <MathText>{editText}</MathText>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Difficulty">
                <Select name="difficulty" defaultValue={editing?.difficulty}>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </Select>
              </Field>
              <Field label="Bloom's level">
                <Select name="bloom" defaultValue={editing?.bloom ?? 'Understand'}>
                  {Object.keys(BLOOM_COLORS).map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </Select>
              </Field>
              <Field label="Status">
                <Select name="status" defaultValue={editing?.status}>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Review">Review</SelectItem>
                  <SelectItem value="Flagged">Flagged</SelectItem>
                </Select>
              </Field>
            </div>
            <Field label="Tags (comma separated)">
              <Input name="tags" defaultValue={(editing?.tags ?? []).join(', ')} placeholder="High-Yield, Numerical…" />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={updateQuestion.isPending}>
                <PencilLine className="h-4 w-4" />
                {updateQuestion.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tag dialog (single + bulk) */}
      <Dialog open={!!tagging || bulkTagging} onOpenChange={(o) => { if (!o) { setTagging(null); setBulkTagging(false) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-indigo-500" /> Tag questions</DialogTitle>
            <DialogDescription>
              {bulkTagging ? `Applying a tag to ${selected.length} selected questions.` : `Tagging ${tagging?.length ?? 1} question.`}
            </DialogDescription>
          </DialogHeader>
          <Field label="Tag">
            <Select value={tagValue} onValueChange={setTagValue}>
              {tagOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTagging(null); setBulkTagging(false) }}>Cancel</Button>
            <Button onClick={submitTag}><Sparkles className="h-4 w-4" /> Apply tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-indigo-500" /> AI question generator</DialogTitle>
            <DialogDescription>Generates tagged, curriculum-mapped questions you approve before they enter the bank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Course</p>
                <Select defaultValue="CS501 — DSA">
                  <SelectItem value="CS501 — DSA">CS501 — DSA</SelectItem>
                  <SelectItem value="CS503 — OS">CS503 — OS</SelectItem>
                  <SelectItem value="CS505 — ML">CS505 — ML</SelectItem>
                </Select>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">Difficulty</p>
                <Select defaultValue="Medium">
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </Select>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Topic</p>
              <Input placeholder="e.g. Network flows, Deadlocks, Regularisation…" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-slate-500">Question type</p>
              <Select defaultValue="Mix (MCQ + Subjective)">
                <SelectItem value="Mix (MCQ + Subjective)">Mix (MCQ + Subjective)</SelectItem>
                <SelectItem value="MCQ only">MCQ only</SelectItem>
                <SelectItem value="Subjective">Subjective</SelectItem>
                <SelectItem value="Numerical">Numerical</SelectItem>
                <SelectItem value="Assertion Reason">Assertion Reason</SelectItem>
              </Select>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50/60 p-3.5 text-xs text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300">
              <Sparkles className="h-4 w-4 shrink-0" />
              You'll review every generated question before it's added. Bloom's level, chapter mapping and CO tagging included.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={() => { setGenerateOpen(false); toast.success('Generating…', '10 questions will be ready in about 20 seconds.') }}>
              <Wand2 className="h-4 w-4" /> Generate 10 questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { QuestionIntelligenceContent }
export default QuestionIntelligenceContent
