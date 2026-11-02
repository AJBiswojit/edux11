/**
 * AI Question Studio — workflow (Phase 7).
 * Steps: 1 Source → 2 Source analysis → 3 Generation settings → 4 Review.
 * "Generate 20 Questions" is the primary action; review supports Edit /
 * Regenerate / Delete / Approve / Reject (approved → Question Bank sync).
 * Everything is deterministic "Prototype Question Generation".
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { Badge, Button, Card, Field, Input, Select, SelectItem, useToast } from '@/components/ui'
import { useQuestionStudioSources, useQuestionStudioSource, useAnalyzeSource, useGenerateStudioQuestions, useStudioQuestionAction } from '@/services/question-studio'
import { createFilterCascade } from '@/utils/filter-cascade'
import { buildStudioCascade } from './studio-cascade'
import { SourcePreviewDialog, SourceAnalysisPanel } from './source-library'
import { StudioQuestionCard } from './question-card'

const COUNTS = [5, 10, 15, 20, 30]
const DIFFS = ['Balanced', 'Easy-weighted', 'Hard-weighted', 'Easy', 'Medium', 'Hard']
const TYPE_OPTIONS = ['Direct MCQ', 'Statement Based', 'Multiple Statement', 'Assertion & Reason', 'Match the Following', 'Application Based', 'Numerical', 'Diagram Based', 'Case Based', 'Sequence / Arrangement']

function StepBadge({ n, title, sub, done }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white'}`}>
        {done ? '✓' : n}
      </span>
      <div>
        <p className="text-[13px] font-bold text-slate-900 dark:text-white">{title}</p>
        {sub && <p className="text-[11px] font-medium text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

export function StudioWorkflow() {
  const toast = useToast()
  const [step, setStep] = useState(1) // 1 source · 2 analyze · 3 settings · 4 review
  const [selectedId, setSelectedId] = useState(null)
  const [useSourceId, setUseSourceId] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [settings, setSettings] = useState({ count: '20', difficulty: 'Balanced', questionTypes: [], topic: 'All topics', concept: 'All concepts', marks: '1', negativeMarks: '0', diagramRequired: 'false', explanationRequired: 'true', pyqStyle: 'Inspired / Pattern-aligned' })
  const [session, setSession] = useState(null)
  const [generating, setGenerating] = useState(false)

  const activeSourceId = useSourceId ?? selectedId
  const { data: sourcesData } = useQuestionStudioSources({})
  const { data: sourceData } = useQuestionStudioSource(activeSourceId)
  const analyze = useAnalyzeSource()
  const generate = useGenerateStudioQuestions()
  const action = useStudioQuestionAction()

  const source = sourceData?.source ?? sourcesData?.items?.find((s) => s.sourceId === activeSourceId)

  /* Topic → Concept cascade: declared per feature (studio-cascade.js),
     validated by the shared engine. The settings object carries extra
     independent form fields, which the engine passes through untouched. */
  const cascade = useMemo(() => createFilterCascade(buildStudioCascade(source)), [source])
  const topicOptions = cascade.options(settings).topic
  const conceptOptions = cascade.options(settings).concept
  useEffect(() => {
    setSettings((s) => cascade.sanitize(s))
  }, [cascade])

  const toggleType = (t) => setSettings((s) => ({ ...s, questionTypes: s.questionTypes.includes(t) ? s.questionTypes.filter((x) => x !== t) : [...s.questionTypes, t] }))

  const doAnalyze = async () => {
    setAnalyzing(true)
    setTimeout(async () => {
      const res = await analyze.mutateAsync(activeSourceId)
      setAnalysis(res.analysis)
      setAnalyzing(false)
      setStep(2)
      toast.success('Analysis complete', 'Prototype Content Intelligence — topics, concepts and patterns detected deterministically.')
    }, 900)
  }

  const doGenerate = async () => {
    if (!settings.questionTypes.length) {
      toast.error('Select question types', 'Pick at least one question type for generation.')
      return
    }
    setGenerating(true)
    setTimeout(async () => {
      const res = await generate.mutateAsync({ sourceId: activeSourceId, settings: { ...settings, count: Number(settings.count), marks: Number(settings.marks), negativeMarks: Number(settings.negativeMarks) } })
      setSession(res.session)
      setGenerating(false)
      setStep(3)
      toast.success(res.insufficient ? `Generated ${res.generated} of ${res.requested}` : `Generated ${res.generated} questions`, 'Prototype Question Generation — deterministic selection from curated demo pools.')
    }, 1200)
  }

  const act = async (q, name, payload) => {
    const res = await action.mutateAsync({ sessionId: session.studioSessionId, questionId: q.questionId, action: name, payload })
    if (res?.ok === false && res?.unavailable) {
      toast.error('Regeneration unavailable', res.message)
      return
    }
    if (name === 'delete') {
      setSession((s) => s && { ...s, questions: s.questions.filter((x) => x.questionId !== q.questionId) })
    } else if (res?.question) {
      setSession((s) => s && { ...s, questions: s.questions.map((x) => x.questionId === q.questionId ? { ...res.question } : x) })
    }
    if (name === 'approve') toast.success('Approved', 'Added to the existing Question Bank — never labelled as PYQ.')
    if (name === 'reject') toast.success('Rejected', 'Removed from the approval queue.')
    if (name === 'delete') toast.success('Deleted', 'Question removed from this session.')
    if (name === 'regenerate') toast.success('Regenerated', 'New question from the same source chapter/topic/concept/type/difficulty.')
    if (name === 'edit') toast.success('Question updated', 'Source reference was preserved.')
  }

  return (
    <div className="space-y-5">
      {/* step progress */}
      <div className="grid gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        <StepBadge n={1} title="Select source" sub={source?.shortTitle ?? '—'} done={!!source} />
        <StepBadge n={2} title="Source analysis" sub={analysis ? `${analysis.topicsDetected} topics · ${analysis.conceptsDetected} concepts` : '—'} done={!!analysis} />
        <StepBadge n={3} title="Generation settings" sub={session ? `${session.generated} questions` : '—'} done={!!session} />
        <StepBadge n={4} title="Review & approve" sub={session ? `${session.questions.filter((q) => q.approved).length} approved` : '—'} done={session?.questions?.some((q) => q.approved)} />
      </div>

      {/* STEP 1 — source */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 1 · Choose a source</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Select value={useSourceId ?? selectedId ?? 'none'} onValueChange={(v) => { setUseSourceId(v); setSelectedId(v); setAnalysis(null); setSession(null); setStep(1); setSettings((s) => ({ ...s, topic: 'All topics', concept: 'All concepts' })) }}>
            <SelectItem value="none">— Select a demo source —</SelectItem>
            {(sourcesData?.items ?? []).map((s) => (
              <SelectItem key={s.sourceId} value={s.sourceId}>{s.featured ? '⭐ ' : ''}{s.shortTitle} · {s.domain}{s.exam ? ` · ${s.exam}` : ''}</SelectItem>
            ))}
          </Select>
          <Button variant="outline" onClick={() => setPreviewId(useSourceId ?? selectedId)} disabled={!(useSourceId ?? selectedId)}><Sparkles className="h-4 w-4" /> Preview & Analyze</Button>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Wand2 className="h-3.5 w-3.5" /> {source?.sourceLabel ?? 'Demo sources only'}
          </span>
        </div>
        {source && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
            <Badge variant="gradient" size="sm">{source.sourceId}</Badge>
            <span className="text-[12.5px] font-bold text-slate-700 dark:text-slate-200">{source.title}</span>
            <span className="text-[11.5px] text-slate-400">{source.subject} · {source.chapter} · {source.pageCount} pages · {source.topics?.length} topics</span>
            <Button size="sm" variant="outline" className="ml-auto" onClick={doAnalyze} disabled={analyzing}>
              {analyzing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing…</> : <><Wand2 className="h-3.5 w-3.5" /> Analyze Source</>}
            </Button>
          </div>
        )}
      </Card>

      {/* STEP 2 — analysis */}
      {analysis && (
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 2 · Source analysis</p>
          <div className="mt-3"><SourceAnalysisPanel analysis={analysis} /></div>
        </Card>
      )}

      {/* STEP 3 — settings */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 3 · Generation settings</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Question count">
            <Select value={settings.count} onValueChange={(v) => setSettings((s) => ({ ...s, count: v }))}>
              {COUNTS.map((c) => <SelectItem key={c} value={String(c)}>{c} questions</SelectItem>)}
            </Select>
          </Field>
          <Field label="Difficulty distribution">
            <Select value={settings.difficulty} onValueChange={(v) => setSettings((s) => ({ ...s, difficulty: v }))}>
              {DIFFS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Topic">
            <Select value={settings.topic} onValueChange={(v) => setSettings((s) => cascade.sanitize({ ...s, topic: v }))} group="question-studio">
              <SelectItem value="All topics">All topics</SelectItem>
              {topicOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Concept">
            <Select value={settings.concept} onValueChange={(v) => setSettings((s) => cascade.sanitize({ ...s, concept: v }))} group="question-studio">
              <SelectItem value="All concepts">All concepts</SelectItem>
              {conceptOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Marks"><Input type="number" value={settings.marks} onChange={(e) => setSettings((s) => ({ ...s, marks: e.target.value }))} /></Field>
          <Field label="Negative marks"><Input type="number" value={settings.negativeMarks} onChange={(e) => setSettings((s) => ({ ...s, negativeMarks: e.target.value }))} /></Field>
          <Field label="PYQ style">
            <Select value={settings.pyqStyle} onValueChange={(v) => setSettings((s) => ({ ...s, pyqStyle: v }))}>
              <SelectItem value="Inspired / Pattern-aligned">Inspired / Pattern-aligned</SelectItem>
              <SelectItem value="No PYQ styling">No PYQ styling</SelectItem>
            </Select>
          </Field>
          <Field label="Diagram required">
            <Select value={settings.diagramRequired} onValueChange={(v) => setSettings((s) => ({ ...s, diagramRequired: v }))}>
              <SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem>
            </Select>
          </Field>
        </div>
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Question types ({settings.questionTypes.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {(analysis?.patterns ?? TYPE_OPTIONS).map((t) => (
              <button key={t} onClick={() => toggleType(t)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${settings.questionTypes.includes(t) ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={doGenerate} disabled={generating || !source}>
            {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Wand2 className="h-4 w-4" /> Generate {settings.count} Questions</>}
          </Button>
          <span className="text-[11px] font-medium text-slate-400">Prototype Question Generation — deterministic selection from curated demo pools, no real AI.</span>
        </div>
      </Card>

      {/* STEP 4 — review */}
      {session && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">Generated Questions — {session.generated}</p>
              <p className="text-[11.5px] font-medium text-slate-400">
                {session.questions.filter((q) => q.approved).length} approved · {session.questions.filter((q) => q.reviewStatus === 'Rejected').length} rejected · {session.questions.filter((q) => q.reviewStatus === 'Draft' || q.reviewStatus === 'Reviewed').length} draft — from “{session.sourceTitle}”
              </p>
            </div>
            <Badge variant="warning" size="sm"><Sparkles className="h-3 w-3" /> Prototype Question Generation</Badge>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {session.questions.map((q, i) => (
              <StudioQuestionCard
                key={q.questionId}
                q={q}
                index={i}
                source={source}
                onEdit={(updated) => act(q, 'edit', updated)}
                onRegenerate={(qq) => act(qq, 'regenerate')}
                onDelete={(qq) => act(qq, 'delete')}
                onApprove={(qq) => act(qq, 'approve')}
                onReject={(qq) => act(qq, 'reject')}
              />
            ))}
          </div>
          {session.questions.filter((q) => q.approved).length > 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-[12px] font-semibold text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/5 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Approved questions are synced into the existing Question Bank (and competitive foundation) — available to Question Intelligence and the Question Paper Generator.
            </div>
          )}
        </div>
      )}

      <SourcePreviewDialog sourceId={previewId ?? (useSourceId ?? selectedId)} open={!!previewId} onOpenChange={(v) => !v && setPreviewId(null)} onUse={(s) => { setUseSourceId(s.sourceId); setSelectedId(s.sourceId) }} />
    </div>
  )
}

export default StudioWorkflow
