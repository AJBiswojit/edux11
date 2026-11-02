/**
 * Faculty · AI Micro-Assessment Studio.
 *
 * One progressive workspace rather than a collection of generated-content
 * pages: source → processing → understanding → questions → review → send →
 * results and an explicitly approved intervention hand-off.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, ClipboardCheck, FileQuestion, Send, Sparkles, Users, WandSparkles } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Field, Input, Select, SelectItem, Textarea, useToast } from '@/components/ui'
import { EmptyState } from '@/components/shared/empty-state'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { PageHeader } from '@/components/shared/page-header'
import { useCreateMicroAssessment, useCreateMicroAssessmentIntervention, useFacultyMicroAssessments, useGenerateMicroQuestions, useGenerateMissingCoverage, useMicroAssessmentParticipants, useMicroAssessmentResults, useMicroAssessmentSources, useProcessMicroSource, useRegenerateMicroQuestion } from '@/services/micro-assessments'
import { QuestionReview } from '@/components/micro-assessment-studio/question-review'
import { ResultsPanel } from '@/components/micro-assessment-studio/results-panel'
import { SourceEditor, SourceLibrary } from '@/components/micro-assessment-studio/source-library'

const STEPS = [
  { id: 1, label: 'Choose Source', icon: FileQuestion },
  { id: 2, label: 'Process Content', icon: WandSparkles },
  { id: 3, label: 'Review AI Understanding', icon: BrainCircuit },
  { id: 4, label: 'Generate Questions', icon: Sparkles },
  { id: 5, label: 'Review Assessment', icon: ClipboardCheck },
  { id: 6, label: 'Send to Students', icon: Send },
  { id: 7, label: 'Results / Insights', icon: BrainCircuit },
]

const EMPTY_SOURCE = {
  id: 'custom-source', title: '', domain: 'university', examFamily: null, subject: '', chapter: '', topic: '', sourceType: 'Custom Text', content: '', detectedConcepts: [], questionOpportunities: [], generatedQuestions: [],
}
const DEFAULT_DEADLINE = '2026-08-30'

function shortError(error) {
  return error?.response?.data?.message ?? error?.message ?? 'Something went wrong. Please try again.'
}

function CompactMetric({ label, value, sub, icon: Icon }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600/10 to-teal-500/15 text-indigo-600 dark:text-indigo-300"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="font-display text-lg font-bold text-slate-900 dark:text-white">{value}</p><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>{sub && <p className="truncate text-[10.5px] font-medium text-slate-400">{sub}</p>}</div></div>
}

function WorkspaceStepper({ activeStep, completed, onSelect }) {
  return <nav aria-label="Micro-assessment workflow" className="rounded-3xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"><ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{STEPS.map((step) => { const Icon = step.icon; const done = completed >= step.id; const active = activeStep === step.id; return <li key={step.id}><button type="button" onClick={() => onSelect(step.id)} className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${active ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/70'}`} aria-current={active ? 'step' : undefined}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold ${done && !active ? 'bg-emerald-500 text-white' : active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>{done && !active ? <CheckCircle2 className="h-4 w-4" /> : step.id}</span><span className="min-w-0"><span className="block truncate text-[11.5px] font-bold">{step.label}</span><span className={`mt-0.5 block truncate text-[9.5px] font-medium ${active ? 'text-white/70' : 'text-slate-400'}`}>{step.id === 1 ? 'Material + metadata' : step.id === 7 ? 'Faculty insight' : 'Progressive workspace'}</span></span><Icon className={`ml-auto hidden h-3.5 w-3.5 shrink-0 sm:block ${active ? 'text-white/80' : 'text-slate-300 dark:text-slate-600'}`} /></button></li> })}</ol></nav>
}

function ProcessingState({ stage }) {
  const labels = ['Reading source', 'Identifying concepts', 'Finding question opportunities', 'Preparing assessment']
  return <Card className="border-indigo-200/70 bg-gradient-to-r from-indigo-600/10 via-blue-600/5 to-teal-500/10 p-5 dark:border-indigo-500/25"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-500/25"><Sparkles className="h-5 w-5 animate-pulse" /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 2 · Process Content</p><h2 className="mt-1 text-[16px] font-bold text-slate-900 dark:text-white">EduX is building a source understanding</h2><div className="mt-4 grid gap-2 sm:grid-cols-4">{labels.map((label, index) => <div key={label} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-semibold ${index <= stage ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-900 dark:text-indigo-300' : 'text-slate-400'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] ${index < stage ? 'bg-emerald-500 text-white' : index === stage ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>{index < stage ? '✓' : index + 1}</span><span>{label}</span></div>)}</div></div></div></Card>
}

function UnderstandingPanel({ understanding }) {
  if (!understanding) return <EmptyState compact icon={BrainCircuit} title="No AI understanding yet" description="Process the source to reveal concepts, important facts and question opportunities." />
  return <Card className="border-indigo-100 bg-white p-4 shadow-card sm:p-5 dark:border-indigo-500/20 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300"><BrainCircuit className="h-3.5 w-3.5" /> Step 3 · AI Understanding</p><h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">What EduX found in the source</h2></div><Badge variant="info" size="sm">Prototype AI Understanding</Badge></div><div className="mt-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]"><div className="rounded-2xl bg-indigo-50/70 p-4 dark:bg-indigo-500/10"><dl className="space-y-2.5 text-[12px]"><div><dt className="font-bold uppercase tracking-wider text-[9.5px] text-indigo-500">Chapter</dt><dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{understanding.chapter}</dd></div><div><dt className="font-bold uppercase tracking-wider text-[9.5px] text-indigo-500">Topic</dt><dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{understanding.topic}</dd></div><div><dt className="font-bold uppercase tracking-wider text-[9.5px] text-indigo-500">Context</dt><dd className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{understanding.context}</dd></div></dl></div><div className="space-y-4"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Detected concepts</p><div className="mt-2 flex flex-wrap gap-1.5">{understanding.concepts?.length ? understanding.concepts.map((concept) => <Badge key={concept} variant="secondary" size="sm">{concept}</Badge>) : <span className="text-xs text-slate-400">No concepts detected.</span>}</div></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Important facts / potential question areas</p><ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{(understanding.importantFacts ?? []).map((fact) => <li key={fact} className="flex items-start gap-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-slate-300"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />{fact}</li>)}</ul></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question opportunities</p><div className="mt-2 flex flex-wrap gap-1.5">{(understanding.questionOpportunities ?? []).map((opportunity) => <Badge key={opportunity} variant="outline" size="sm">{opportunity}</Badge>)}</div></div></div></div></Card>
}

function AudiencePicker({ source, participants, audience, onAudience, batchIds, onBatchIds, studentIds, onStudentIds, search, onSearch }) {
  const batches = participants?.batches ?? []
  const students = participants?.students ?? []
  const visibleStudents = students.filter((student) => `${student.name} ${student.roll} ${student.batchId}`.toLowerCase().includes(search.toLowerCase()))
  const toggleBatch = (id) => onBatchIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleStudent = (id) => onStudentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  return <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Assessment audience">{['Entire Batch', 'Selected Batch', 'Selected Students'].map((value) => <button type="button" role="radio" aria-checked={audience === value} key={value} onClick={() => onAudience(value)} className={`rounded-xl border px-3 py-2 text-[11.5px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 ${audience === value ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-300' : 'border-slate-200 text-slate-500 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-400'}`}>{value}</button>)}</div><div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/50"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{source?.domain === 'competitive' ? `${source.examFamily} audience` : 'University audience'} · existing faculty directory</p><Badge variant="secondary" size="sm">{audience === 'Selected Students' ? studentIds.length : students.filter((student) => batchIds.includes(student.batchId)).length} selected</Badge></div>{!students.length ? <div className="py-6"><EmptyState compact icon={Users} title="No students in this source context" description="The existing faculty directory has no matching batch for this domain and exam family." /></div> : <><div className="mt-3 grid gap-2 md:grid-cols-2">{batches.map((batch) => <label key={batch.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${batchIds.includes(batch.id) ? 'border-indigo-300 bg-white dark:border-indigo-500/40 dark:bg-slate-900' : 'border-transparent bg-white/60 hover:border-slate-200 dark:bg-slate-900/50 dark:hover:border-slate-700'}`}><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={batchIds.includes(batch.id)} onChange={() => toggleBatch(batch.id)} aria-label={`Select batch ${batch.name}`} /><span className="min-w-0"><span className="block truncate text-[11.5px] font-bold text-slate-700 dark:text-slate-200">{batch.name}</span><span className="block truncate text-[10px] text-slate-400">{batch.domain === 'University' ? `${batch.courseCode ?? 'University'} · ${batch.section ?? 'All sections'}` : `${batch.examLabel ?? batch.examFamily}`}</span></span><span className="ml-auto text-[10px] font-semibold text-slate-400">{students.filter((student) => student.batchId === batch.id).length}</span></label>)}</div>{audience === 'Selected Students' && <><div className="relative mt-3"><Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search selected-context students…" className="h-9 text-xs" aria-label="Search students" /></div><div className="mt-2 grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 scrollbar-thin">{visibleStudents.map((student) => <label key={student.id} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[11px] ${studentIds.includes(student.id) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400'}`}><input type="checkbox" className="h-3.5 w-3.5 accent-indigo-600" checked={studentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} aria-label={`Select student ${student.name}`} /><span className="min-w-0 truncate"><strong>{student.name}</strong> · {student.roll}</span></label>)}{!visibleStudents.length && <p className="col-span-full py-4 text-center text-xs text-slate-400">No students match the search.</p>}</div></>}</>}{students.length > 0 && ((audience === 'Selected Students' ? studentIds.length : students.filter((student) => batchIds.includes(student.batchId)).length) === 0) && <div className="mt-3"><EmptyState compact icon={Users} title="No students selected" description={audience === 'Selected Students' ? 'Select at least one learner from this context.' : 'Select at least one batch to target its learners.'} /></div>}</div></div>
}

function AssessmentConfiguration({ source, questions, config, setConfig, participants, audience, setAudience, batchIds, setBatchIds, studentIds, setStudentIds, studentSearch, setStudentSearch, onOpenSend, invalid }) {
  const set = (key, value) => setConfig((current) => ({ ...current, [key]: value }))
  return <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 6 · Send to Students</p><h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">Configure a focused formative check</h2><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Choose a target from the existing faculty batch/student directory. No notifications are sent in this prototype.</p></div><Badge variant="gradient" size="sm">{questions.length} reviewed questions</Badge></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Field label="Assessment title" required className="sm:col-span-2 lg:col-span-2"><Input value={config.title} onChange={(event) => set('title', event.target.value)} placeholder="e.g. Graph Traversal · 10-minute check" /></Field><Field label="Difficulty"><Select value={config.difficulty} onValueChange={(value) => set('difficulty', value)}><SelectItem value="Mixed">Mixed</SelectItem><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></Select></Field><Field label="Question count"><Input value={`${questions.length} questions`} disabled aria-label="Question count" /></Field><Field label="Duration (minutes)" required><Input type="number" min="1" max="180" value={config.duration} onChange={(event) => set('duration', event.target.value)} /></Field><Field label="Deadline" required><Input type="date" value={config.deadline} onChange={(event) => set('deadline', event.target.value)} /></Field><Field label="Description" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={config.description} onChange={(event) => set('description', event.target.value)} placeholder="What should students focus on?" /></Field><Field label="Optional instructions" className="sm:col-span-2 lg:col-span-3"><Textarea rows={2} value={config.instructions} onChange={(event) => set('instructions', event.target.value)} placeholder="e.g. Explain your reasoning where asked." /></Field></div><AudiencePicker source={source} participants={participants} audience={audience} onAudience={setAudience} batchIds={batchIds} onBatchIds={setBatchIds} studentIds={studentIds} onStudentIds={setStudentIds} search={studentSearch} onSearch={setStudentSearch} />{invalid && <p className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{invalid}</p>}<div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800"><p className="text-[10.5px] font-medium text-slate-400">Audience stays isolated to {source?.domain === 'competitive' ? `${source.examFamily} · Competitive` : 'University'} context.</p><Button onClick={onOpenSend} disabled={!questions.length}><Send className="h-3.5 w-3.5" /> Send Assessment</Button></div></Card>
}

function SendDialog({ open, onOpenChange, config, questions, selectedCount, targetLabel, source, onConfirm, sending }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Send Micro-Assessment?</DialogTitle></DialogHeader><div className="space-y-3"><div className="rounded-2xl bg-indigo-50/70 p-4 dark:bg-indigo-500/10"><p className="text-[15px] font-bold text-slate-900 dark:text-white">{config.title || 'Untitled assessment'}</p><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{source?.subject} · {source?.chapter} · {source?.topic}</p></div><dl className="grid grid-cols-2 gap-2 text-[12px]"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Questions</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-100">{questions.length}</dd></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target</dt><dd className="mt-1 truncate font-bold text-slate-800 dark:text-slate-100" title={targetLabel}>{targetLabel || `${selectedCount} students`}</dd></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-100">{config.duration} minutes</dd></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</dt><dd className="mt-1 font-bold text-slate-800 dark:text-slate-100">{config.deadline || '—'}</dd></div></dl><p className="text-[11px] leading-relaxed text-slate-400">This sends a prototype assignment inside EduX only. No email, SMS, push notification or external message will be sent.</p></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Go back</Button><Button onClick={onConfirm} disabled={sending}>{sending ? 'Sending…' : <><Send className="h-4 w-4" /> Send Assessment</>}</Button></DialogFooter></DialogContent></Dialog>
}

function AssessmentHistory({ items, onOpen }) {
  if (!items?.length) return null
  return <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">Recent micro-assessments</p><p className="mt-1 text-[11px] text-slate-400">Resume a sent assessment to review its formative results.</p></div><Badge variant="secondary" size="sm">{items.length} sent</Badge></div><div className="mt-3 grid gap-2 md:grid-cols-2">{items.slice(0, 4).map((assessment) => <div key={assessment.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/70 px-3 py-2.5 dark:border-slate-800"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><ClipboardCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-bold text-slate-800 dark:text-slate-100">{assessment.title}</p><p className="text-[10.5px] text-slate-400">{assessment.studentsCompleted ?? 0} completed · {assessment.averageAccuracy == null ? '—' : `${assessment.averageAccuracy}%`} accuracy</p></div><Button type="button" size="sm" variant="outline" onClick={() => onOpen(assessment)}>View results</Button></div>)}</div></Card>
}

function MicroAssessmentStudio() {
  const toast = useToast()
  const navigate = useNavigate()
  const [sourceFilters, setSourceFilters] = useState({ domain: '', examFamily: '', subject: '', chapter: '', topic: '', sourceType: '', search: '' })
  const { data: sourcesData, isLoading: sourcesLoading, isError: sourcesError, refetch: refetchSources } = useMicroAssessmentSources(sourceFilters)
  const { data: assessmentHistory } = useFacultyMicroAssessments()
  const [draft, setDraft] = useState(null)
  const [selectedLibraryId, setSelectedLibraryId] = useState(null)
  const [understanding, setUnderstanding] = useState(null)
  const [processErrors, setProcessErrors] = useState({})
  const [processing, setProcessing] = useState(false)
  const [processingStage, setProcessingStage] = useState(0)
  const [activeStep, setActiveStep] = useState(1)
  const [generationCount, setGenerationCount] = useState('')
  const [generationDifficulty, setGenerationDifficulty] = useState('Mixed')
  const [questions, setQuestions] = useState([])
  const [coverage, setCoverage] = useState([])
  const [diversity, setDiversity] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [config, setConfig] = useState({ title: '', description: '', instructions: '', duration: '15', deadline: DEFAULT_DEADLINE, difficulty: 'Mixed' })
  const [audience, setAudience] = useState('Selected Batch')
  const [batchIds, setBatchIds] = useState([])
  const [studentIds, setStudentIds] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [sendOpen, setSendOpen] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sentAssessment, setSentAssessment] = useState(null)
  const [interventionCreated, setInterventionCreated] = useState(false)

  const sourceData = useMemo(() => draft ?? null, [draft])
  const { data: participantData } = useMicroAssessmentParticipants({ sourceId: draft?.id, domain: draft?.domain, examFamily: draft?.examFamily })
  const process = useProcessMicroSource()
  const generate = useGenerateMicroQuestions()
  const regenerate = useRegenerateMicroQuestion()
  const missingCoverage = useGenerateMissingCoverage()
  const create = useCreateMicroAssessment()
  const createIntervention = useCreateMicroAssessmentIntervention()
  const { data: resultsData, isLoading: resultsLoading, isError: resultsError, refetch: refetchResults } = useMicroAssessmentResults(sentAssessment?.id)

  useEffect(() => {
    const available = participantData?.batches ?? []
    setBatchIds((current) => {
      const kept = current.filter((id) => available.some((batch) => batch.id === id))
      return kept.length ? kept : available[0] ? [available[0].id] : []
    })
    setStudentIds((current) => current.filter((id) => (participantData?.students ?? []).some((student) => student.id === id)))
  }, [draft?.domain, draft?.examFamily, participantData?.batches, participantData?.students])

  useEffect(() => {
    const source = draft
    if (source && !config.title) setConfig((current) => ({ ...current, title: `${source.topic} · Micro Check` }))
  }, [draft?.id])

  if (sourcesLoading) return <DashboardSkeleton cards={3} />
  if (sourcesError) return <ErrorState title="Source library unavailable" onRetry={() => refetchSources()} />

  const completedStep = sentAssessment ? 7 : questions.length ? 5 : understanding ? 4 : draft ? 1 : 0
  const selectedCount = audience === 'Selected Students'
    ? studentIds.length
    : (participantData?.students ?? []).filter((student) => batchIds.includes(student.batchId)).length
  const targetLabel = audience === 'Selected Students'
    ? `${studentIds.length} selected students`
    : `${audience}: ${(participantData?.batches ?? []).filter((batch) => batchIds.includes(batch.id)).map((batch) => batch.name).join(', ') || 'no batch selected'}`

  const clearSelectedSource = () => {
    setSelectedLibraryId(null)
    setDraft(null)
    setUnderstanding(null)
    setQuestions([])
    setCoverage([])
    setDiversity(0)
    setGenerationCount('')
    setSentAssessment(null)
    setInterventionCreated(false)
    toast.info('Source selection cleared', 'The selected source no longer matches the active library filters.')
  }
  const useSource = (source) => {
    setSelectedLibraryId(source.id)
    setDraft({ ...source })
    setUnderstanding(null); setQuestions([]); setCoverage([]); setDiversity(0); setGenerationCount(''); setSentAssessment(null); setInterventionCreated(false); setProcessErrors({}); setSendError(''); setActiveStep(1)
    setConfig((current) => ({ ...current, title: `${source.topic} · Micro Check`, description: `A short formative check on ${source.topic}.`, instructions: '', difficulty: 'Mixed' }))
    window.setTimeout(() => document.getElementById('source-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }
  const startCustom = () => {
    setSelectedLibraryId(null); setDraft({ ...EMPTY_SOURCE }); setUnderstanding(null); setQuestions([]); setCoverage([]); setDiversity(0); setGenerationCount(''); setSentAssessment(null); setInterventionCreated(false); setProcessErrors({}); setActiveStep(1); setConfig((current) => ({ ...current, title: '', description: '', instructions: '' }))
    window.setTimeout(() => document.getElementById('source-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const sourcePayload = () => selectedLibraryId ? { sourceId: selectedLibraryId, source: draft } : { source: draft }
  const runProcess = async () => {
    setProcessErrors({}); setProcessing(true); setProcessingStage(0)
    try {
      for (let index = 0; index < 4; index += 1) { setProcessingStage(index); await new Promise((resolve) => window.setTimeout(resolve, 140)) }
      const response = await process.mutateAsync(sourcePayload())
      setDraft(response.source); setUnderstanding(response.understanding); setProcessing(false); setActiveStep(3); toast.success('Source understood', 'Concepts and question opportunities are ready for faculty review.')
    } catch (error) {
      setProcessing(false); setProcessErrors(error?.response?.data?.errors ?? {}); toast.error('Source needs attention', shortError(error))
    }
  }
  const runGenerate = async () => {
    if (!understanding) { toast.warning('Process the source first', 'Review the AI Understanding panel before generating questions.'); setActiveStep(2); return }
    if (!generationCount) { toast.warning('Select a size', 'Choose how many questions to generate before continuing.'); return }
    setGenerating(true)
    try {
      const response = await generate.mutateAsync({ ...sourcePayload(), count: Number(generationCount), difficulty: generationDifficulty })
      setQuestions(response.questions); setCoverage(response.conceptCoverage); setDiversity(response.questionDiversity); setGenerating(false); setActiveStep(5); toast.success(`${response.generated} questions ready`, 'Deterministic prototype generation completed. Review before sending.')
    } catch (error) { setGenerating(false); toast.error('Questions could not be generated', shortError(error)) }
  }
  const updateQuestion = (updated) => {
    const next = questions.map((question) => question.id === updated.id ? {
      ...updated,
      correctAnswer: updated.options?.length && updated.answerIndex != null ? updated.options[updated.answerIndex] : updated.correctAnswer,
      validation: question.validation,
    } : question)
    setQuestions(next); setCoverage((current) => current.map((item) => item.concept === updated.concept ? { ...item, count: next.filter((question) => question.concept === item.concept).length } : item))
  }
  const deleteQuestion = (question) => {
    const next = questions.filter((item) => item.id !== question.id); setQuestions(next); setCoverage((current) => current.map((item) => ({ ...item, count: next.filter((itemQuestion) => itemQuestion.concept === item.concept).length, percentage: Math.min(100, Math.round((next.filter((itemQuestion) => itemQuestion.concept === item.concept).length / Math.max(1, ...current.map((coverageItem) => next.filter((itemQuestion) => itemQuestion.concept === coverageItem.concept).length))) * 100)) }))); toast.info('Question deleted', 'The rest of the assessment was left unchanged.')
  }
  const regenerateOne = async (question) => {
    setRegeneratingId(question.id)
    try {
      const response = await regenerate.mutateAsync({ ...sourcePayload(), target: question, usedIds: questions.map((item) => item.id) })
      setQuestions((current) => current.map((item) => item.id === question.id ? response.question : item)); setRegeneratingId(null); toast.success('Question regenerated', 'Only this question changed; source metadata stayed attached.')
    } catch (error) { setRegeneratingId(null); toast.error('Regeneration unavailable', shortError(error)) }
  }
  const generateMissing = async () => {
    try {
      const response = await missingCoverage.mutateAsync({ ...sourcePayload(), questions })
      if (!response.questions.length) { toast.info('Coverage is balanced', 'There is no unused source-pool question for a lower-coverage concept.'); return }
      const next = [...questions, ...response.questions]; setQuestions(next)
      const nextCoverage = response.coverage.map((item) => ({ ...item, count: next.filter((question) => question.concept === item.concept).length }))
      const max = Math.max(1, ...nextCoverage.map((item) => item.count)); setCoverage(nextCoverage.map((item) => ({ ...item, percentage: Math.round((item.count / max) * 100) }))); setDiversity((current) => current); toast.success('Coverage question added', `Targeted ${response.questions.map((question) => question.concept).join(', ')}.`)
    } catch (error) { toast.error('Coverage generation unavailable', shortError(error)) }
  }
  const openSend = () => {
    setSendError('')
    if (!config.title.trim()) { setSendError('Add an assessment title.'); return }
    if (!Number(config.duration) || Number(config.duration) < 1 || Number(config.duration) > 180) { setSendError('Duration must be between 1 and 180 minutes.'); return }
    if (!config.deadline) { setSendError('Add a deadline.'); return }
    if (!selectedCount) { setSendError(audience === 'Selected Students' ? 'Select at least one student.' : 'Select at least one batch.'); return }
    setSendOpen(true)
  }
  const sendAssessment = async () => {
    setSendError('')
    try {
      const response = await create.mutateAsync({ ...sourcePayload(), questions, title: config.title, description: config.description, instructions: config.instructions, difficulty: config.difficulty, duration: Number(config.duration), deadline: config.deadline, audience, batchIds: audience === 'Selected Students' ? [] : batchIds, studentIds: audience === 'Selected Students' ? studentIds : [] })
      setSentAssessment(response.assessment); setSendOpen(false); setActiveStep(7); toast.success('Assessment Sent', `${response.summary.studentsSelected} students selected · ${response.summary.questions} questions · ${response.summary.duration} minutes.`)
    } catch (error) { setSendError(shortError(error)); toast.error('Assessment was not sent', shortError(error)) }
  }
  const createSuggestedIntervention = async () => {
    if (!sentAssessment || !resultsData?.interventionRecommendation) return
    try {
      const response = await createIntervention.mutateAsync({ id: sentAssessment.id, studentIds: sentAssessment.target.studentIds })
      setInterventionCreated(true); toast.success(response.created === false ? 'Intervention already exists' : 'Suggested intervention created', 'It is in the existing Intervention lifecycle at Recommended; faculty approval is still required.')
    } catch (error) { toast.error('Intervention hand-off unavailable', shortError(error)) }
  }
  const restoreAssessment = (assessment) => {
    setSentAssessment(assessment); setQuestions(assessment.questions ?? []); setDraft((current) => current ?? { ...EMPTY_SOURCE, id: assessment.sourceId, title: assessment.source?.title ?? assessment.title, domain: assessment.domain, examFamily: assessment.examFamily, subject: assessment.subject, chapter: assessment.chapter, topic: assessment.topic, sourceType: assessment.source?.sourceType ?? 'Custom Text', content: '' }); setInterventionCreated(false); setActiveStep(7)
  }

  return <div>
    <PageHeader eyebrow="Faculty · Question Intelligence · Formative" title="AI Micro-Assessment Studio" description="Give EduX a teaching paragraph and turn it into a targeted, source-grounded formative check — with faculty review, concept coverage and actionable results." breadcrumbs={[{ label: 'Faculty' }, { label: 'Question Intelligence', to: '/faculty/question-intelligence' }, { label: 'AI Micro-Assessment Studio' }]} actions={<div className="flex flex-wrap gap-2"><Link to="/faculty/question-intelligence"><Button size="sm" variant="outline"><ArrowRight className="h-3.5 w-3.5 rotate-180" /> Question Intelligence</Button></Link><Badge variant="gradient" className="px-3 py-1"><Sparkles className="h-3 w-3" /> Prototype workspace</Badge></div>} />
    <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3"><CompactMetric label="Sources" value={sourcesData?.total ?? 0} sub="uploaded library" icon={FileQuestion} /><CompactMetric label="Questions" value={questions.length || '—'} sub={questions.length ? 'in current review' : 'not generated'} icon={Sparkles} /><CompactMetric label="Students / completions" value={sentAssessment ? `${resultsData?.studentsCompleted ?? '—'} / ${sentAssessment.target.studentIds.length}` : '—'} sub={sentAssessment ? 'current assessment' : 'send to see responses'} icon={Users} /></div>
    <WorkspaceStepper activeStep={activeStep} completed={completedStep} onSelect={setActiveStep} />
    <div className="mt-5 space-y-5">
      {!sentAssessment && <AssessmentHistory items={assessmentHistory?.items} onOpen={restoreAssessment} />}
      <SourceLibrary data={sourcesData} filters={sourceFilters} onFiltersChange={setSourceFilters} onUseSource={useSource} onStartCustom={startCustom} selectedSourceId={selectedLibraryId} onSourceNoLongerVisible={clearSelectedSource} />
      <div id="source-editor"><SourceEditor draft={draft} onChange={setDraft} errors={processErrors} onProcess={runProcess} processing={processing} processed={!!understanding} /></div>
      {processing && <ProcessingState stage={processingStage} />}
      {understanding && <UnderstandingPanel understanding={understanding} />}
      {draft && <Card className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">Step 4 · Generate Questions</p><h2 className="mt-1 text-[17px] font-bold text-slate-900 dark:text-white">Choose the size of the micro-assessment</h2><p className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">Generation uses this source's deterministic curated pool. Select 5, 10, 15 or 20 questions.</p></div><Button size="sm" variant="outline" onClick={startCustom}><FileQuestion className="h-3.5 w-3.5" /> Paste custom source</Button></div><div className="mt-4 flex flex-wrap items-end gap-3"><Field label="Question count" className="min-w-[12.5rem]"><Select value={generationCount} placeholder="Select question count" ariaLabel="Question count" onValueChange={setGenerationCount}>{[5, 10, 15, 20].map((value) => <SelectItem key={value} value={String(value)}>{value} questions</SelectItem>)}</Select></Field><Field label="Preferred difficulty"><Select value={generationDifficulty} ariaLabel="Preferred difficulty" onValueChange={setGenerationDifficulty}><SelectItem value="Mixed">Mixed</SelectItem><SelectItem value="Easy">Easy</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Hard">Hard</SelectItem></Select></Field><Button onClick={runGenerate} disabled={!understanding || generating || !generationCount}>{generating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Generating…</> : <><Sparkles className="h-3.5 w-3.5" /> Generate Questions</>}</Button>{!understanding && <span className="text-[11px] font-semibold text-slate-400">Process the source first.</span>}{understanding && !generationCount && <span className="text-[11px] font-semibold text-slate-400">Select a size to generate.</span>}</div></Card>}
      {(questions.length || understanding) && <QuestionReview questions={questions} coverage={coverage} diversity={diversity} onUpdate={updateQuestion} onRegenerate={regenerateOne} onDelete={deleteQuestion} onGenerateMissing={generateMissing} regeneratingId={regeneratingId} />}
      {questions.length > 0 && <AssessmentConfiguration source={sourceData} questions={questions} config={config} setConfig={setConfig} participants={participantData} audience={audience} setAudience={setAudience} batchIds={batchIds} setBatchIds={setBatchIds} studentIds={studentIds} setStudentIds={setStudentIds} studentSearch={studentSearch} setStudentSearch={setStudentSearch} onOpenSend={openSend} invalid={sendError} />}
      {sentAssessment && (resultsLoading ? <DashboardSkeleton cards={2} /> : resultsError ? <ErrorState title="Results unavailable" onRetry={() => refetchResults()} /> : <ResultsPanel result={resultsData} assessment={sentAssessment} onCreateIntervention={createSuggestedIntervention} interventionCreated={interventionCreated} creatingIntervention={createIntervention.isPending} onViewStudents={() => navigate('/faculty/my-students?view=interventions')} />)}
    </div>
    <SendDialog open={sendOpen} onOpenChange={setSendOpen} config={config} questions={questions} selectedCount={selectedCount} targetLabel={targetLabel} source={sourceData} onConfirm={sendAssessment} sending={create.isPending} />
    <div className="mt-6 flex flex-wrap items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[10.5px] font-medium leading-relaxed text-slate-400 dark:bg-slate-800/60"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" /><span><strong className="text-slate-500 dark:text-slate-300">Prototype boundary:</strong> AI processing, questions, student responses and insights are deterministic in-browser prototype functionality. No file parsing, real LLM call or external notification is used.</span></div>
  </div>
}

export { MicroAssessmentStudio }
export default MicroAssessmentStudio
