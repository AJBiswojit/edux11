/**
 * MediXO EduX — Assessment Workspace · Question Paper Studio.
 *
 * Generate Paper triggers the REAL deployed AI generation agent:
 * Faculty configures paper -> clicks Generate Paper
 * -> POST /faculty/question-bank/generate (complete configuration)
 * -> backend creates a generation identity and submits the job to the deployed
 *    AI agent -> backend persists the agent's real questions to PostgreSQL and
 *    links them to the generation -> GET generation/{id}/questions returns ONLY
 *    those questions -> faculty reviews/selects -> Save Paper.
 *
 * No mock/seeded/fallback questions. Phase 6 shows ONLY the questions of the
 * CURRENT generation request; it never renders question-bank records, old
 * generations or historical AI papers.
 *
 * Generation lifecycle: mounting the studio never generates automatically. If
 * the faculty already has a persisted current generation, the tab rehydrates
 * that generation state (refresh recovery) without re-running the agent;
 * otherwise it opens in a clean empty state.
 *
 * Preserves existing UI: paper name, domain, exam family, subject, chapter, topic, question count,
 * difficulty, question type, advanced blueprint, Bloom, chapter weighting, CO coverage, PYQ preference,
 * negative marking, exam pattern, KPI cards, tabs, filters, dropdowns, Paper Library, etc.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, Printer, Save, SlidersHorizontal, ChevronDown, Wand2, AlertTriangle, Database,
  Sparkles, Loader2, RefreshCw,
} from 'lucide-react'
import { usePaperGeneratorBackend, usePaperCreateBackend } from '@/services/faculty-papers'
import { useQuestionGeneration, useGenerationStatus, useGenerationQuestions, useCurrentGeneration, GENERATION_STATUS, isTerminalStatus } from '@/services/faculty-question-generation'
import { Badge, Button, Field, Input, Select, SelectItem, useToast } from '@/components/ui'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { MathText } from '@/components/shared/math-text'
import { optionText } from '@/api/adapters/questions'
import { useFilterCascade } from '@/hooks/use-filter-cascade'
import { buildPaperGeneratorCascade } from './paper-generator-cascade'
import { PaperPrintPreview } from './paper-parts'
import { DIFF_STYLES } from './paper-styles'

function Section({ n, title, subtitle, children, right }) {
  return (
    <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-[13px] font-bold text-white shadow-md shadow-indigo-500/25">{n}</span>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-[11.5px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

const DIFF_OPTIONS = ['Easy', 'Medium', 'Hard', 'Mixed']
const QTYPE_OPTIONS_UNI = ['MCQ', 'Short Answer', 'Long Answer', 'Numerical', 'Assertion Reason', 'Case Based']
const QTYPE_OPTIONS_COMP = ['MCQ', 'Integer', 'Numerical', 'Assertion Reason', 'Case Based']
const BLOOM_PRESETS = ['Balanced', 'Remember-heavy', 'Understand-heavy', 'Apply-heavy', 'Analyze-heavy', 'Evaluate-heavy', 'Create-heavy']
const WEIGHTAGE_PRESETS = ['Balanced chapters', 'Important chapters', 'Weak-unit heavy', 'Custom']
const CO_PRESETS = ['Balanced CO coverage', 'CO1–CO2 priority', 'CO3–CO4 priority', 'Custom']
const PYQ_PRESETS = ['No PYQs', 'Include PYQs', 'PYQ Balanced', 'PYQ Heavy']
const EXAM_PATTERNS = ['Standard', 'Practice', 'Mock Test']

function PaperGeneratorTab({ data: _intelData, editPaper = null, onClearEdit = null }) {
  const [searchParams] = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()

  // Catalog config for the generator. The Paper Library lives in its own tab now.
  const { data: paperData, isLoading: catalogLoading, isError: catalogError, refetch: refetchCatalog } = usePaperGeneratorBackend()
  const { mutateAsync: createPaper } = usePaperCreateBackend()

  // Form state — domain isolation explicit
  const [domain, setDomain] = useState(() => (searchParams.get('mode') === 'Competitive' ? 'Competitive' : 'University'))
  const [examFamily, setExamFamily] = useState(() => (searchParams.get('exam') === 'NEET' ? 'NEET' : 'JEE'))
  const [title, setTitle] = useState(() => searchParams.get('title') ?? '')
  const [paperType, setPaperType] = useState('Mid Semester')
  const [program, setProgram] = useState('B.Tech — CSE')
  const [marks, setMarks] = useState(() => searchParams.get('marks') ?? '')
  const [duration, setDuration] = useState(() => searchParams.get('duration') ?? '')
  const [questionCount, setQuestionCount] = useState(() => searchParams.get('count') ?? '')
  const [qTypes, setQTypes] = useState(['MCQ', 'Short Answer', 'Long Answer'])
  const [difficulty, setDifficulty] = useState(() => searchParams.get('difficulty') ?? 'Mixed')
  const [questionTypeFilter, setQuestionTypeFilter] = useState('All')

  // Cascade — backend-oriented, uses only the real catalog from the live API.
  // No hardcoded course/subject/chapter/topic fallbacks.
  const cfg = paperData?.config ?? null
  const courseCatalog = useMemo(() => cfg?.courseCatalog ?? [], [cfg])
  const subjectCatalog = useMemo(() => cfg?.subjectCatalog ?? [], [cfg])
  const courseLabel = (row) => (row ? `${row.code} — ${row.name}` : '')
  const courseOptions = courseCatalog.map(courseLabel)
  const courseByLabel = useMemo(() => new Map(courseCatalog.map((c) => [courseLabel(c), c])), [courseCatalog])
  const normalizeCourseValue = (value) => {
    if (!value) return ''
    const row = courseCatalog.find((c) => courseLabel(c) === value || c.code === value || c.name === value)
    return row ? courseLabel(row) : value
  }

  const cascadeConfig = useMemo(() => ({
    ...buildPaperGeneratorCascade({ mode: domain, exam: examFamily, cfg }),
    initialValues: {
      course: normalizeCourseValue(searchParams.get('course') ?? ''),
      subject: searchParams.get('subject') ?? 'All subjects',
      chapter: searchParams.get('chapter') ?? 'All chapters',
      topic: searchParams.get('topic') ?? 'All topics',
    },
  }), [domain, examFamily, cfg, searchParams, courseCatalog])

  const { values: scopeValues, options: scopeOptions, apply: applyScope } = useFilterCascade(cascadeConfig)
  const { course, subject, chapter, topic } = scopeValues

  /* Multi-select scope. The cascade `subject`/`chapter`/`topic` remain the
     ANCHOR selection that drives which chapter/topic options are shown; these
     arrays carry the full set of ticked names sent to the backend (which
     resolves each subject's own chapters). Empty array = follow the anchor. */
  const [subjectSel, setSubjectSel] = useState([])
  const [chapterSel, setChapterSel] = useState([])
  const [topicSel, setTopicSel] = useState([])

  /* Display helpers: parent validity + honest empty-state labels (no
     backend/PostgreSQL/API wording leaks to the end user). */
  const courseEmpty = !course
  const subjectOptions = scopeOptions.subject ?? []
  const subjectByName = useMemo(() => new Map(subjectCatalog.map((s) => [s.name, s])), [subjectCatalog])

  /* Chapter options = the UNION of chapters across every ticked subject, so
     selecting Biology + Physics shows both subjects' chapters combined. With
     0/1 subject ticked we fall back to the cascade's single-subject list. */
  const chapterOptions = useMemo(() => {
    if (subjectSel.length <= 1) return scopeOptions.chapter ?? []
    const seen = new Set()
    const out = []
    for (const name of subjectSel) {
      for (const ch of subjectByName.get(name)?.chapters ?? []) {
        if (!seen.has(ch.name)) { seen.add(ch.name); out.push(ch.name) }
      }
    }
    return out
  }, [subjectSel, scopeOptions.chapter, subjectByName])

  /* Topic options = the UNION of topics across the ticked chapters, searched
     within the ticked subjects. With 0/1 chapter ticked we fall back to the
     cascade's single-chapter list. */
  const topicOptions = useMemo(() => {
    if (chapterSel.length <= 1) return scopeOptions.topic ?? []
    const scopeSubjects = subjectSel.length > 0 ? subjectSel : subjectByName.keys()
    const wantedChapters = new Set(chapterSel)
    const seen = new Set()
    const out = []
    for (const name of scopeSubjects) {
      for (const ch of subjectByName.get(name)?.chapters ?? []) {
        if (!wantedChapters.has(ch.name)) continue
        for (const t of ch.topics ?? []) {
          if (!seen.has(t)) { seen.add(t); out.push(t) }
        }
      }
    }
    return out
  }, [chapterSel, subjectSel, scopeOptions.topic, subjectByName])

  const subjectSelected = subjectSel.length > 0 || (!!subject && subject !== 'All subjects')
  const chapterSelected = chapterSel.length > 0 || (!!chapter && chapter !== 'All chapters')

  /* The "All …" checkbox shows ticked when every option is selected.
     Defined before the handlers so the allTicked flag is available to them. */
  const allSubjectsTicked = subjectOptions.length > 1 && subjectSel.length === subjectOptions.length
  const allChaptersTicked = chapterOptions.length > 1 && chapterSel.length === chapterOptions.length
  const allTopicsTicked = topicOptions.length > 1 && topicSel.length === topicOptions.length

  /* Handlers that keep the multi-select arrays and the cascade anchor in sync.
     The anchor (used for option derivation) is always the first ticked value;
     clearing all ticks falls back to the "All …" sentinel. */
  /* Resolve a multi-select change that may include the "All …" sentinel into
     a concrete list.

     The Select component always works with the *display* array (which includes
     the sentinel when every option is ticked), but our state never stores the
     sentinel.  We use the `allTicked` flag — which reflects whether the display
     array included the sentinel before this change — to detect what actually
     happened:

       • Sentinel just ADDED  (incomingHasSentinel && !allTicked)
         → select all real options.
       • Sentinel just REMOVED (!incomingHasSentinel && allTicked)
         → user clicked "All …" again to deselect everything → return [].
       • Sentinel still present + allTicked (incomingHasSentinel && allTicked)
         → user un-ticked one individual item while in all-selected state.
         Strip the sentinel from raw and return the remaining real items.
       • No sentinel at all (!incomingHasSentinel && !allTicked)
         → plain individual toggle; return raw as-is (sentinel already absent).
  */
  const resolveScopeSelection = (raw, options, sentinel, allTicked) => {
    const incomingHasSentinel = raw.includes(sentinel)

    if (incomingHasSentinel && !allTicked) {
      // Sentinel just ticked → select all real options.
      return [...options]
    }
    if (!incomingHasSentinel && allTicked) {
      // Sentinel just un-ticked → deselect all.
      return []
    }
    // Strip the sentinel and return the remaining real items (covers both
    // "un-tick one item while all selected" and plain individual toggles).
    return raw.filter((v) => v !== sentinel)
  }

  const applySubjectSelection = (raw) => {
    const arr = resolveScopeSelection(raw, subjectOptions, 'All subjects', allSubjectsTicked)
    setSubjectSel(arr)
    setChapterSel([])
    setTopicSel([])
    applyScope({ subject: arr[0] ?? 'All subjects', chapter: 'All chapters', topic: 'All topics' })
    setSelectedIds([])
  }
  const applyChapterSelection = (raw) => {
    const arr = resolveScopeSelection(raw, chapterOptions, 'All chapters', allChaptersTicked)
    setChapterSel(arr)
    setTopicSel([])
    applyScope({ chapter: arr[0] ?? 'All chapters', topic: 'All topics' })
    setSelectedIds([])
  }
  const applyTopicSelection = (raw) => {
    const arr = resolveScopeSelection(raw, topicOptions, 'All topics', allTopicsTicked)
    setTopicSel(arr)
    applyScope({ topic: arr[0] ?? 'All topics' })
    setSelectedIds([])
  }
  /* Value handed to each multi-Select: include the "All …" sentinel when every
     option is ticked so its checkbox reflects the select-all state. */
  const subjectSelValue = allSubjectsTicked ? ['All subjects', ...subjectSel] : subjectSel
  const chapterSelValue = allChaptersTicked ? ['All chapters', ...chapterSel] : chapterSel
  const topicSelValue = allTopicsTicked ? ['All topics', ...topicSel] : topicSel
  /* Payload scope value: none ticked (or every option ticked) => "All …"
     sentinel so the backend uses its whole-family path; exactly one => plain
     string (unchanged single-select contract); many => array. */
  const scopeValue = (arr, options, sentinel) => {
    if (arr.length === 0) return sentinel
    // Collapse to the sentinel only when there are multiple options and every
    // one is ticked (a genuine "select all"). Ticking the lone option stays
    // explicit so a single-subject/chapter scope is preserved.
    if (options.length > 1 && arr.length === options.length) return sentinel
    return arr.length === 1 ? arr[0] : arr
  }

  const [bloomPreset, setBloomPreset] = useState('Balanced')
  const [weightagePreset, setWeightagePreset] = useState('Balanced chapters')
  const [coPreset, setCoPreset] = useState('Balanced CO coverage')
  const [pyqPreference, setPyqPreference] = useState('Include PYQs')
  const [negativeMarking, setNegativeMarking] = useState('Enabled')
  const [examPattern, setExamPattern] = useState('Standard')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ===== Question Generation State =====
  // A generation exists ONLY after a real Generate request (or when this
  // session rehydrates the faculty's persisted current generation). No
  // persisted/paper-library record is ever re-surfaced as a new generation.
  const [generationId, setGenerationId] = useState(null)
  const [generationRequested, setGenerationRequested] = useState(0)
  const [generationStatus, setGenerationStatus] = useState(null) // idle | GENERATING | PROCESSING | READY | FAILED
  const [generationError, setGenerationError] = useState(null)
  const [generationQuestions, setGenerationQuestions] = useState([]) // real backend records
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationTriggered, setGenerationTriggered] = useState(false)
  const generationStartedInSession = useRef(false)
  // Tracks whether the user has explicitly cleared the studio to start a new
  // paper. When true, the rehydration effect is blocked so the just-saved
  // generation's questions never reappear for the fresh configuration.
  const newPaperRequestedInSession = useRef(false)

  const { mutateAsync: triggerGeneration } = useQuestionGeneration()
  const { data: currentGeneration } = useCurrentGeneration()
  const { data: statusData } = useGenerationStatus(generationId, { enabled: !!generationId && !isTerminalStatus(generationStatus) })
  const { data: genQuestionsData } = useGenerationQuestions(generationId, { enabled: !!generationId && (generationStatus === GENERATION_STATUS.READY || generationStatus === GENERATION_STATUS.COMPLETED) })

  // Refresh/navigation recovery — rehydrate the persisted current generation
  // identity without generating again. When no current generation exists the
  // studio stays in the clean empty state. Never overrides a generation that
  // was started in THIS session, and never repopulates state after the user
  // has explicitly started a new paper (newPaperRequestedInSession guard).
  useEffect(() => {
    if (!currentGeneration?.id) return
    if (generationStartedInSession.current) return
    if (newPaperRequestedInSession.current) return
    if (generationId === currentGeneration.id) return
    setGenerationId(currentGeneration.id)
    setGenerationStatus(currentGeneration.status ?? null)
    setGenerationRequested(currentGeneration.requestedCount ?? 0)
    if (currentGeneration.errorMessage) setGenerationError(currentGeneration.errorMessage)
    setGenerationTriggered(false)
  }, [currentGeneration, generationId])

  // Update status from polling
  useEffect(() => {
    if (statusData?.status) {
      setGenerationStatus(statusData.status)
      if (statusData.requestedCount) setGenerationRequested(statusData.requestedCount)
      if (isTerminalStatus(statusData.status)) {
        setIsGenerating(false)
        if (statusData.status === GENERATION_STATUS.FAILED) {
          setGenerationError(statusData.error || statusData.errorMessage || 'Generation failed')
        }
        // When polling transitions to READY/COMPLETED, force-refetch the questions
        // so they appear without a page refresh. invalidateQueries alone can miss
        // the window if the hook wasn't yet enabled when the mutation fired it.
        if (statusData.status === GENERATION_STATUS.READY || statusData.status === GENERATION_STATUS.COMPLETED) {
          const polledId = statusData.id ?? statusData.generationId
          if (polledId) {
            queryClient.refetchQueries({ queryKey: ['faculty', 'question-generations', polledId, 'questions'] })
          }
        }
      }
    }
  }, [statusData, queryClient])

  // Update generated questions when fetched. Pre-selection applies ONLY to a
  // generation triggered in this session (restored generations are presented
  // for review without selecting anything).
  useEffect(() => {
    if (genQuestionsData?.questions) {
      setGenerationQuestions(genQuestionsData.questions)
      if (generationTriggered && genQuestionsData.questions.length > 0) {
        const realIds = genQuestionsData.questions.map(q => q.id).filter(Boolean)
        setSelectedIds(prev => (prev.length === 0 ? realIds : prev))
      }
      setIsGenerating(false)
    }
  }, [genQuestionsData, generationTriggered])

  const parseQuestionCount = (raw) => {
    if (!raw || !raw.toString().trim()) return null
    const n = parseInt(raw, 10)
    if (isNaN(n) || n < 1 || n > 100) return null
    return n
  }

  const handleGenerateQuestions = async () => {
    // The backend scopes generated questions to the selected subject. For
    // Competitive, an explicit 'All subjects' choice distributes across the
    // exam family's subjects — never an arbitrary single-subject fallback.
    // University papers always need an explicit subject (the deployed agent
    // supports JEE/NEET only, so an unselected University scope is a real
    // configuration error, not a "distribute across everything" request).
    // University requires at least one ticked subject; Competitive allows an
    // empty selection (distributes across the exam family).
    if (domain === 'University' && subjectSel.length === 0) {
      toast.error('Select a subject', 'Choose a course and subject before generating questions.')
      return
    }

    // Strict validation — all three numeric fields must be valid before generation.
    const marksNum = Number(marks)
    if (!marks || !marks.trim() || isNaN(marksNum) || marksNum < 1) {
      toast.error('Total marks required', 'Enter a valid number for total marks (e.g. 50).')
      return
    }
    const durationNum = Number(duration)
    if (!duration || !duration.trim() || isNaN(durationNum) || durationNum < 1) {
      toast.error('Duration required', 'Enter a valid duration in minutes (e.g. 120).')
      return
    }
    const count = parseQuestionCount(questionCount)
    if (count === null) {
      toast.error('Question count required', 'Enter a valid number of questions between 1 and 100 (e.g. 30).')
      return
    }
    setGenerationError(null)
    setIsGenerating(true)
    setGenerationStatus(GENERATION_STATUS.GENERATING)
    setGenerationRequested(count)
    setGenerationQuestions([])
    setSelectedIds([])
    setQuestionTypeFilter('All')
    setGenerationTriggered(true)
    generationStartedInSession.current = true
    // A new generation is now underway — lift the new-paper block so future
    // page-refresh recovery can rehydrate this generation correctly.
    newPaperRequestedInSession.current = false
    // Reveal the questions list for this new generation.
    setPaperSaved(false)

    try {
      const payload = {
        title: title.trim() || `Paper — ${subjectSel.length > 0 ? subjectSel.join(', ') : 'All subjects'} — ${new Date().toISOString().slice(0,10)}`,
        domain,
        examFamily: domain === 'Competitive' ? examFamily : null,
        mode: domain,
        exam: domain === 'Competitive' ? examFamily : null,
        // Multi-select scope. None ticked (or "All …" ticked) => the "All …"
        // sentinel; exactly one => a plain string (unchanged single-select
        // contract); many => array. Backend accepts string or array.
        subject: scopeValue(subjectSel, subjectOptions, 'All subjects'),
        chapter: scopeValue(chapterSel, chapterOptions, 'All chapters'),
        topic: scopeValue(topicSel, topicOptions, 'All topics'),
        questionCount: count,
        count,
        difficulty,
        questionTypes: qTypes,
        qTypes,
        bloomPreset,
        weightagePreset,
        coPreset,
        pyqPreference: domain === 'Competitive' ? pyqPreference : null,
        negativeMarking: domain === 'Competitive' ? negativeMarking : null,
        examPattern: domain === 'Competitive' ? examPattern : null,
        program: domain === 'University' ? program : null,
        course: domain === 'University' ? course : `${examFamily} · ${subjectSel.length > 0 ? subjectSel.join(', ') : 'All subjects'}`,
        paperType,
        examType: paperType,
        totalMarks: marksNum,
        duration: durationNum,
      }

      const res = await triggerGeneration(payload)
      const genId = res?.generationId || res?.id
      const status = res?.status || GENERATION_STATUS.READY
      const generatedCount = res?.generatedCount ?? res?.questions?.length ?? 0

      if (!genId) {
        throw new Error('Question generation did not start')
      }

      setGenerationId(genId)
      setGenerationStatus(status)

      if (status === GENERATION_STATUS.READY || status === GENERATION_STATUS.COMPLETED) {
        // Force-invalidate the questions cache for this generation so
        // useGenerationQuestions fetches immediately when it becomes enabled,
        // without waiting for React's state-update cycle or staleTime.
        queryClient.invalidateQueries({ queryKey: ['faculty', 'question-generations', genId, 'questions'] })
        // Real questions are read back by the generation-questions query, which
        // becomes enabled as soon as generationId + READY land in state. The
        // bank listing is refreshed by the mutation's cache invalidation.
        setIsGenerating(false)
        toast.success('Questions Generated', `${generatedCount || count} questions generated and saved.`)
      } else {
        // Polling will handle PROCESSING -> READY
        toast.success('Generation started', `AI is generating ${count} questions...`)
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || 'Generation failed'
      setGenerationStatus(GENERATION_STATUS.FAILED)
      setGenerationError(msg)
      setIsGenerating(false)
      if (e?.response?.status === 401) {
        toast.error('Authentication required', 'Please log in as faculty to generate questions.')
      } else if (e?.response?.status === 403) {
        toast.error('Access denied', 'Faculty role required for question generation.')
      } else if (e?.response?.status === 422) {
        toast.error('Invalid configuration', msg)
      } else if (!e?.response || e?.response?.status >= 500) {
        toast.error('Generation unavailable', 'Question generation is temporarily unavailable. Please try again.')
      } else {
        toast.error('Question generation failed', msg)
      }
    }
  }

  const handleRetryGeneration = () => {
    setGenerationError(null)
    setGenerationId(null)
    setGenerationStatus(null)
    setGenerationQuestions([])
    handleGenerateQuestions()
  }

  // Reset the studio to a clean idle state so the user can configure and
  // generate a completely new paper. Clears all generation-related state and
  // lifts the rehydration block so a future page refresh still recovers
  // correctly once the new generation is started.
  const handleNewPaper = () => {
    setGenerationId(null)
    setGenerationStatus(null)
    setGenerationRequested(0)
    setGenerationQuestions([])
    setGenerationError(null)
    setIsGenerating(false)
    setGenerationTriggered(false)
    setSelectedIds([])
    setPaperSaved(false)
    // Allow the rehydration effect to pick up the next real generation after
    // the new Generate call sets generationStartedInSession back to true.
    generationStartedInSession.current = false
    // Block rehydration from re-loading the previous generation's data until
    // the user explicitly clicks Generate for the new paper.
    newPaperRequestedInSession.current = true
  }

  // Determine empty state category per spec
  const hasGeneration = !!generationId
  const isGenerationRunning = generationStatus === GENERATION_STATUS.GENERATING || generationStatus === GENERATION_STATUS.PROCESSING || isGenerating
  const isGenerationReady = generationStatus === GENERATION_STATUS.READY || generationStatus === GENERATION_STATUS.COMPLETED
  const isGenerationFailed = generationStatus === GENERATION_STATUS.FAILED

  // Phase 6 working set: ONLY the questions of the CURRENT generation request.
  // The optional question-type filter narrows that set client-side; it never
  // reaches into the question bank or another generation.
  const availableQuestions = useMemo(() => {
    if (!isGenerationReady) return []
    if (questionTypeFilter === 'All') return generationQuestions
    return generationQuestions.filter((q) => (q.type ?? q.questionType) === questionTypeFilter)
  }, [generationQuestions, isGenerationReady, questionTypeFilter])

  const totalQuestions = availableQuestions.length
  // The idle empty-state panel (Step 5) must reappear whenever no generation
  // is active — either on first load with no prior generation, or after the
  // user clicks New Paper (which resets generationId → null). Checking only
  // hasGeneration is sufficient: if generationId is null there is nothing to
  // show regardless of whether generationQuestions still holds stale data from
  // a previous render cycle.
  const isBankEmpty = !hasGeneration

  const requestedCountForDisplay = generationRequested || parseQuestionCount(questionCount) || 0
  const generatedCountForDisplay = generationQuestions.length || 0

  // Generate button is only enabled when every required field passes the same
  // validation that handleGenerateQuestions enforces, so the faculty gets
  // visual feedback before clicking rather than a toast after.
  const canGenerate = useMemo(() => {
    if (isGenerating || isGenerationRunning) return false
    // At least one ticked subject for University; Competitive allows none (= all).
    if (domain === 'University' && subjectSel.length === 0) return false
    // Marks
    const marksNum = Number(marks)
    if (!marks || !marks.trim() || isNaN(marksNum) || marksNum < 1) return false
    // Duration
    const durationNum = Number(duration)
    if (!duration || !duration.trim() || isNaN(durationNum) || durationNum < 1) return false
    // Question count
    if (parseQuestionCount(questionCount) === null) return false
    return true
  }, [isGenerating, isGenerationRunning, domain, subjectSel, marks, duration, questionCount])

  /* Display-only label for the generation state (IDLE → "Idle"). No behaviour change. */
  const GENERATION_STATUS_LABELS = {
    [GENERATION_STATUS.GENERATING]: 'Generating',
    [GENERATION_STATUS.PROCESSING]: 'Generating',
    [GENERATION_STATUS.READY]: 'Ready',
    [GENERATION_STATUS.COMPLETED]: 'Complete',
    [GENERATION_STATUS.FAILED]: 'Failed',
  }
  const generationStatusLabel = GENERATION_STATUS_LABELS[generationStatus] ?? 'Idle'

  // Paper builder — ID-based only, real backend IDs
  const [selectedIds, setSelectedIds] = useState([])
  const [saving, setSaving] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  // When true, the generated questions list is hidden. Set after a successful
  // save so the faculty doesn't see the old questions for a paper they've
  // already saved. Cleared as soon as a new generation begins.
  const [paperSaved, setPaperSaved] = useState(false)

  // Edit paper from library — load IDs only
  useEffect(() => {
    if (editPaper) {
      setTitle(editPaper.title ?? '')
      // Bug 1 fix: derive domain from examFamily/exam as a last resort so a
      // Competitive paper is never incorrectly loaded as University. The backend
      // serializes domain as "Competitive" | "University" (title_domain), but
      // older records may have mode instead, or neither. If both are absent we
      // infer from the exam family: any non-null JEE/NEET value means Competitive.
      const rawDomain = editPaper.domain ?? editPaper.mode
      const inferredDomain =
        rawDomain ||
        (() => {
          const fam = (editPaper.examFamily ?? editPaper.exam ?? '').toLowerCase()
          return fam === 'jee' || fam === 'neet' ? 'Competitive' : 'University'
        })()
      setDomain(inferredDomain)
      setPaperType(editPaper.paperType ?? editPaper.examType ?? 'Mid Semester')
      const editCourse = editPaper.course ?? ''
      const matchingCourse = courseCatalog.find(
        (row) => row.code === editCourse || row.name === editCourse || courseLabel(row) === editCourse,
      )
      applyScope({
        course: matchingCourse ? courseLabel(matchingCourse) : '',
        subject: editPaper.subject ?? 'All subjects',
        chapter: editPaper.chapter ?? 'All chapters',
        topic: editPaper.topic ?? 'All topics',
      })
      // Rehydrate the multi-select arrays from the (single-value) saved scope.
      const toSel = (v, sentinels) => (v && !sentinels.includes(v) ? [v] : [])
      setSubjectSel(toSel(editPaper.subject, ['All subjects']))
      setChapterSel(toSel(editPaper.chapter, ['All chapters']))
      setTopicSel(toSel(editPaper.topic, ['All topics']))
      setExamFamily(editPaper.examFamily ?? editPaper.exam ?? 'JEE')
      setMarks(String(editPaper.totalMarks ?? ''))
      setDuration(String(editPaper.duration ?? ''))
      setQuestionCount(String(editPaper.questions ?? editPaper.questionCount ?? ''))
      setDifficulty(editPaper.difficulty ?? 'Mixed')
      // ID-based: prefer selectedQuestionIds, fallback to questionList IDs for backward compat
      if (Array.isArray(editPaper.selectedQuestionIds)) {
        setSelectedIds(editPaper.selectedQuestionIds)
      } else if (Array.isArray(editPaper.questionList)) {
        setSelectedIds(editPaper.questionList.map((q) => q.id).filter(Boolean))
      } else if (Array.isArray(editPaper.questions) && typeof editPaper.questions[0] === 'string') {
        setSelectedIds(editPaper.questions)
      }
      // Bug 3 fix: restore the generationId from the loaded paper so the
      // re-saved paper is stamped with a valid generationId and remains visible
      // in the Paper Library. Without this, generationId stays null and the
      // re-saved paper is filtered out by list_faculty_papers on the backend.
      if (editPaper.generationId) {
        setGenerationId(editPaper.generationId)
        setGenerationStatus(GENERATION_STATUS.COMPLETED)
        generationStartedInSession.current = false
        newPaperRequestedInSession.current = false
      }
      // Bug 2 fix: clear the paperSaved flag so the generated questions list is
      // visible when the faculty loads a paper for re-editing. Fix 1 set this
      // flag to true after the original save, hiding the questions — but when the
      // user explicitly opens a paper from the library to edit it, the questions
      // must reappear so they can review and adjust the question selection.
      setPaperSaved(false)
      onClearEdit?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editPaper])

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleQType = (t) => setQTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const isPaperReady = useMemo(() => {
    if (isGenerationRunning) return false
    if (isGenerationFailed) return false
    if (selectedIds.length === 0) return false
    if (isGenerationReady) {
      // Check completeness: requested vs generated
      if (generatedCountForDisplay > 0 && requestedCountForDisplay > 0) {
        if (generatedCountForDisplay < requestedCountForDisplay) return false
      }
    }
    return true
  }, [isGenerationRunning, isGenerationFailed, selectedIds.length, isGenerationReady, generatedCountForDisplay, requestedCountForDisplay])

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Paper name required', 'Give the paper a name before creating.')
      return
    }
    if (selectedIds.length === 0) {
      toast.error('Select questions', 'Pick at least one question from the question bank.')
      return
    }
    if (isGenerationRunning) {
      toast.error('Generation in progress', 'Wait for question generation to complete before saving paper.')
      return
    }
    if (isGenerationFailed) {
      toast.error('Generation failed', 'Retry question generation before saving paper.')
      return
    }
    // Completeness check: if generation requested N but only M < N were generated,
    // block the save so the faculty fixes it (regenerate or adjust count).
    // The paper must not be saved in an incomplete state — the Paper Library
    // Send button would be permanently disabled for an incomplete paper.
    if (isGenerationReady && requestedCountForDisplay > 0 && generatedCountForDisplay < requestedCountForDisplay) {
      toast.error('Incomplete generation', `Requested ${requestedCountForDisplay} but only ${generatedCountForDisplay} generated. Regenerate or adjust the question count before saving.`)
      return
    }
    setSaving(true)
    try {
      // Resolve a canonical exam family for Competitive papers. The state value
      // is always 'JEE' or 'NEET' (set by the toggle), but guard against edge
      // cases (e.g. an old paper loaded from the library with a missing family)
      // by falling back to 'JEE' so the backend never receives an empty value.
      const resolvedExamFamily = domain === 'Competitive'
        ? (examFamily ? (examFamily.toUpperCase() === 'NEET' ? 'NEET' : 'JEE') : 'JEE')
        : null
      const res = await createPaper({
        title: title.trim(),
        domain,
        examFamily: resolvedExamFamily,
        mode: domain,
        exam: resolvedExamFamily,
        course: domain === 'University' ? course : `${examFamily} · ${subject}`,
        subject,
        chapter,
        topic,
        program: domain === 'University' ? program : null,
        totalMarks: Number(marks) || 0,
        duration: Number(duration) || 0,
        difficulty,
        selectedQuestionIds: selectedIds,
        paperType,
        examType: paperType,
        bloomPreset: domain === 'University' ? bloomPreset : null,
        weightagePreset: domain === 'University' ? weightagePreset : null,
        coPreset: domain === 'University' ? coPreset : null,
        pyqPreference: domain === 'Competitive' ? pyqPreference : null,
        negativeMarking: domain === 'Competitive' ? negativeMarking : null,
        examPattern: domain === 'Competitive' ? examPattern : null,
        coverage: 90,
        sets: 1,
        interventionId: searchParams.get('intervention') ?? null,
        // Pass the active generation ID so the backend marks this paper as
        // AI-generated and includes it in the Paper Library filter.
        generationId: generationId ?? null,
      })
      if (res?.ok || res?.paper) {
        toast.success('Paper saved to library', `"${title.trim()}" is now in your Paper Library with ${selectedIds.length} questions.`)
        setSelectedIds([])
        setPaperSaved(true)
        // After saving, block the rehydration effect from re-loading this
        // generation so the studio is ready for a new paper configuration.
        newPaperRequestedInSession.current = true
      } else {
        toast.error('Could not save paper', res?.error ?? res?.message ?? 'Please try again.')
      }
    } catch (e) {
      const msg = e?.response?.data?.detail ?? e?.response?.data?.message ?? e?.message ?? 'Service unavailable'
      if (e?.response?.status === 409) {
        toast.error('Name already taken', `A paper named "${title.trim()}" already exists. Change the paper name and save again.`)
      } else if (e?.response?.status === 422) {
        toast.error('Invalid paper configuration', msg)
      } else if (String(msg).toLowerCase().includes('backend') || e?.response?.status >= 500 || !e?.response) {
        toast.error('Paper Library unavailable', 'The paper library is temporarily unavailable. Please try again later.')
      } else {
        toast.error('Could not save', msg)
      }
    } finally {
      setSaving(false)
    }
  }

  if (catalogLoading) return <DashboardSkeleton cards={3} />
  if (catalogError) return <ErrorState onRetry={() => refetchCatalog()} />

  const TYPE_OPTIONS = domain === 'Competitive' ? QTYPE_OPTIONS_COMP : QTYPE_OPTIONS_UNI

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <Wand2 className="h-3.5 w-3.5" /> Question Paper Studio
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Design, generate and publish question papers</h2>
        </div>
        <Badge variant={isGenerationReady ? 'success' : isGenerationFailed ? 'danger' : isGenerationRunning ? 'warning' : 'secondary'} className="px-3 py-1">
          Generation: {generationStatusLabel}
        </Badge>
      </div>

      {/* Section 1 */}
      <Section n={1} title="Basic details" subtitle="The domain and exam family set the scope of this paper.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper name" required className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={domain === 'Competitive' ? 'e.g. JEE Physics — Mechanics Mock 01' : 'e.g. Mid Semester — DSA — Paper A'} />
          </Field>
          <Field label="Domain" required className="sm:col-span-2">
            <div className="flex rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800/50">
              {['University', 'Competitive'].map((m) => (
                <button
                  key={m}
                  onClick={() => { setDomain(m); setPaperType(m === 'University' ? 'Mid Semester' : 'Full Mock Test'); setSelectedIds([]); setSubjectSel([]); setChapterSel([]); setTopicSel([]); applyScope({ course: '', subject: 'All subjects', chapter: 'All chapters', topic: 'All topics' }) }}
                  className={`flex-1 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${domain === m ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                >
                  {m === 'University' ? '🏛️' : '🎯'} {m}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Paper type">
            <Select value={paperType} onValueChange={setPaperType}>
              {(cfg?.universityTypes && domain === 'University' ? cfg.universityTypes : cfg?.competitiveTypes && domain === 'Competitive' ? cfg.competitiveTypes : ['Mid Semester', 'End Semester', 'Full Mock Test', 'Practice Test']).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
          {domain === 'Competitive' && (
            <Field label="Exam Family">
              <div className="flex rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 dark:border-slate-700 dark:bg-slate-800/50">
                {['JEE', 'NEET'].map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      // Domain stays Competitive; only the exam family changes.
                      // The cascade hook re-sanitizes against the new family's
                      // subject list (JEE Mathematics ∉ NEET etc.), so a stale
                      // subject/chapter/topic selection is cleared — but call
                      // applyScope too so the reset is synchronous (no stale
                      // option rendered for one frame) and page selection resets.
                      setExamFamily(e)
                      setSelectedIds([])
                      setSubjectSel([]); setChapterSel([]); setTopicSel([])
                      applyScope({ subject: 'All subjects', chapter: 'All chapters', topic: 'All topics' })
                    }}
                    className={`flex-1 rounded-xl px-4 py-2 text-[13px] font-bold transition-all ${examFamily === e ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {domain === 'University' && (
            <Field label="Program">
              <Select value={program} onValueChange={setProgram}>
                {(cfg?.programs ?? ['B.Tech — CSE', 'B.Tech — ECE', 'M.Sc — Data Science', 'MBA']).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </Select>
            </Field>
          )}
        </div>
      </Section>

      {/* Section 2 — Syllabus filters backend-oriented. No standalone search field. */}
      <Section n={2} title="Syllabus / content" subtitle={domain === 'Competitive' ? 'Domain + Exam Family → Subject → Chapter → Topic.' : 'Domain → Course → Subject → Chapter → Topic.'}>
        <div className={`grid grid-cols-2 gap-4 ${domain === 'University' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {domain === 'University' && (
            <Field label="Course">
              <Select
                value={course}
                ariaLabel="Course"
                onValueChange={(v) => { applyScope({ course: v, subject: 'All subjects', chapter: 'All chapters', topic: 'All topics' }); setSubjectSel([]); setChapterSel([]); setTopicSel([]); setSelectedIds([]) }}
                group="paper-generator"
                disabled={!catalogLoading && courseOptions.length === 0}
                loading={catalogLoading}
                emptyText="No courses available"
                placeholder={catalogLoading ? 'Loading courses…' : courseOptions.length === 0 ? 'No courses available' : 'Select course…'}
                helper={!catalogLoading && courseOptions.length === 0 ? 'No courses available' : undefined}
              >
                {courseOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </Select>
            </Field>
          )}
          <Field label="Subject">
            <Select
              multiple
              value={subjectSelValue}
              multipleSummary={allSubjectsTicked ? 'All subjects' : undefined}
              ariaLabel="Subject"
              onValueChange={applySubjectSelection}
              group="paper-generator"
              disabled={domain === 'University' ? courseEmpty && subjectOptions.length === 0 : false}
              emptyText="No subjects available"
              placeholder={domain === 'University' && courseEmpty ? 'Select a course first' : subjectOptions.length === 0 ? 'No subjects available' : 'All subjects'}
              helper={domain === 'University' && courseEmpty ? 'Select a course first' : subjectOptions.length === 0 ? 'No subjects available' : 'Tick All subjects, or one or more'}
            >
              {subjectOptions.length > 0 && <SelectItem value="All subjects">All subjects</SelectItem>}
              {subjectOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Chapter">
            <Select
              multiple
              value={chapterSelValue}
              multipleSummary={allChaptersTicked ? 'All chapters' : undefined}
              ariaLabel="Chapter"
              onValueChange={applyChapterSelection}
              group="paper-generator"
              disabled={!subjectSelected && chapterOptions.length === 0}
              emptyText="No chapters available"
              placeholder={!subjectSelected ? 'Select a subject first' : chapterOptions.length === 0 ? 'No chapters available' : 'All chapters'}
              helper={!subjectSelected ? 'Select a subject first' : chapterOptions.length === 0 ? 'No chapters available' : 'Tick All chapters, or one or more'}
            >
              {chapterOptions.length > 0 && <SelectItem value="All chapters">All chapters</SelectItem>}
              {chapterOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Topic">
            <Select
              multiple
              value={topicSelValue}
              multipleSummary={allTopicsTicked ? 'All topics' : undefined}
              ariaLabel="Topic"
              onValueChange={applyTopicSelection}
              group="paper-generator"
              disabled={!chapterSelected && topicOptions.length === 0}
              emptyText="No topics available"
              placeholder={!chapterSelected ? 'Select a chapter first' : topicOptions.length === 0 ? 'No topics available' : 'All topics'}
              helper={!chapterSelected ? 'Select a chapter first' : topicOptions.length === 0 ? 'No topics available' : 'Tick All topics, or one or more'}
            >
              {topicOptions.length > 0 && <SelectItem value="All topics">All topics</SelectItem>}
              {topicOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
        </div>
      </Section>

      {/* Section 3 */}
      <Section n={3} title="Paper configuration" subtitle="Marks, duration and difficulty for the paper.">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Field label="Total marks">
            <Input
              type="number"
              min="1"
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder="00"
            />
          </Field>
          <Field label="Duration (minutes)">
            <Input
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="00"
            />
          </Field>
          <Field label="Question count" hint="Max 100">
            <Input
              type="number"
              min="1"
              max="100"
              value={questionCount}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || (Number(v) >= 1 && Number(v) <= 100)) setQuestionCount(v)
              }}
              placeholder="00"
            />
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v) }}>
              {DIFF_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </Select>
          </Field>
          <Field label="Question Type filter">
            <Select value={questionTypeFilter} onValueChange={(v) => { setQuestionTypeFilter(v) }}>
              <SelectItem value="All">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </Select>
          </Field>
        </div>
      </Section>

      {/* Advanced */}
      <Section
        n={4}
        title="Advanced blueprint"
        subtitle="Bloom's taxonomy, chapter weightage, CO coverage · PYQ preference, negative marking, exam pattern"
        right={
          <button onClick={() => setAdvancedOpen(!advancedOpen)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" /> {advancedOpen ? 'Hide' : 'Show'} advanced options
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
        }
      >
        {!advancedOpen ? (
          <p className="text-[12.5px] text-slate-400">Advanced blueprint controls collapsed — expand to tune Bloom's taxonomy, chapter weightage, CO coverage {domain === 'Competitive' ? 'or PYQ preference, negative marking and exam pattern.' : '.'}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {domain === 'University' ? (
              <>
                <Field label="Bloom's taxonomy">
                  <Select value={bloomPreset} onValueChange={setBloomPreset}>
                    {BLOOM_PRESETS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </Select>
                </Field>
                <Field label="Chapter weightage">
                  <Select value={weightagePreset} onValueChange={setWeightagePreset}>
                    {WEIGHTAGE_PRESETS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </Select>
                </Field>
                <Field label="Course outcome coverage">
                  <Select value={coPreset} onValueChange={setCoPreset}>
                    {CO_PRESETS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </Select>
                </Field>
              </>
            ) : (
              <>
                <Field label="PYQ preference">
                  <Select value={pyqPreference} onValueChange={setPyqPreference}>
                    {PYQ_PRESETS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </Select>
                </Field>
                <Field label="Negative marking">
                  <Select value={negativeMarking} onValueChange={setNegativeMarking}>
                    <SelectItem value="Enabled">Enabled (−1 per incorrect answer)</SelectItem>
                    <SelectItem value="Disabled">Disabled</SelectItem>
                  </Select>
                </Field>
                <Field label="Exam pattern">
                  <Select value={examPattern} onValueChange={setExamPattern}>
                    {EXAM_PATTERNS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </Select>
                </Field>
              </>
            )}
          </div>
        )}
      </Section>

      {/* Phase G: Generate Questions Action — Primary CTA */}
      <Section
        n={5}
        title="Question Generation"
        subtitle={`Generate questions for this paper · Status: ${generationStatusLabel} · Requested: ${requestedCountForDisplay} · Generated: ${generatedCountForDisplay}`}
        right={
          <Badge variant={isGenerationReady ? 'success' : isGenerationFailed ? 'danger' : isGenerationRunning ? 'warning' : 'secondary'} className="px-3 py-1">
            {isGenerationRunning ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating</> : isGenerationReady ? <><CheckCircle2 className="h-3 w-3" /> {generatedCountForDisplay} generated</> : isGenerationFailed ? <><AlertTriangle className="h-3 w-3" /> Failed</> : <>Idle</>}
          </Badge>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={handleGenerateQuestions}
              disabled={!canGenerate}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-2.5 text-[13px] font-bold shadow-lg shadow-indigo-500/25 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="generate-questions-button"
            >
              {isGenerating || isGenerationRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating Questions...
                </>
              ) : isGenerationFailed ? (
                <>
                  <RefreshCw className="h-4 w-4" /> Retry Generation
                </>
              ) : isGenerationReady ? (
                <>
                  <Sparkles className="h-4 w-4" /> Generate New Paper
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Questions
                </>
              )}
            </Button>

            {isGenerationReady && (
              <>
                <Button size="sm" variant="outline" onClick={handleRetryGeneration} className="border-indigo-200 text-indigo-600">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate Questions
                </Button>
                <Button size="sm" variant="outline" onClick={handleNewPaper} className="border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  <Database className="h-3.5 w-3.5" /> New Paper
                </Button>
              </>
            )}

            <div className="text-[11px] text-slate-400">
              <p>Config: {domain}{domain === 'Competitive' ? ` · ${examFamily}` : ''} · {subject} · {chapter} · {topic} · {difficulty} · {parseQuestionCount(questionCount) || questionCount} Qs · {qTypes.join(', ')}</p>
              <p>Blueprint: {bloomPreset} · {weightagePreset} · {coPreset} · {domain === 'Competitive' ? `${pyqPreference} · ${negativeMarking} · ${examPattern}` : 'University'}</p>
              {!canGenerate && !isGenerationRunning && (
                <p className="mt-1 text-amber-500">
                  {domain === 'University' && !subjectSelected
                    ? 'Select a course and subject to enable generation.'
                    : domain === 'Competitive' && subject !== 'All subjects' && !subjectSelected
                    ? 'Select a subject to enable generation.'
                    : !(Number(marks) >= 1)
                    ? 'Enter valid total marks to enable generation.'
                    : !(Number(duration) >= 1)
                    ? 'Enter valid duration to enable generation.'
                    : parseQuestionCount(questionCount) === null
                    ? 'Enter a valid question count to enable generation.'
                    : ''}
                </p>
              )}
            </div>
          </div>

          {/* Generation lifecycle UI */}
          {isBankEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-700 dark:bg-slate-800/30">
              <Database className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No questions generated yet.</p>
              <p className="mt-1 text-xs text-slate-400">Configure your paper and click Generate Paper.</p>
            </div>
          )}

          {isGenerationRunning && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6 text-center dark:border-indigo-500/30 dark:bg-indigo-500/5">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-3 text-sm font-bold text-indigo-700 dark:text-indigo-200">AI is generating {requestedCountForDisplay} questions...</p>
              <p className="mt-1 text-xs text-indigo-600/80 dark:text-indigo-300/80">Status: {generationStatusLabel} · Reference: {generationId}</p>
              <p className="mt-2 text-[11px] text-slate-400">Please keep this tab open while the questions are being created.</p>
            </div>
          )}

          {isGenerationReady && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> {generatedCountForDisplay} questions generated
                  {requestedCountForDisplay !== generatedCountForDisplay && (
                    <span className="ml-2 text-[11px] font-normal text-amber-600">Requested {requestedCountForDisplay}, got {generatedCountForDisplay} — {generatedCountForDisplay < requestedCountForDisplay ? 'not ready, Send disabled' : 'ready'}</span>
                  )}
                </p>
                <Badge variant={generatedCountForDisplay >= requestedCountForDisplay ? 'success' : 'warning'} size="sm">
                  {generatedCountForDisplay >= requestedCountForDisplay ? 'Ready · Send enabled' : 'Not ready · Send disabled'}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-emerald-700/70 dark:text-emerald-300/70">Reference {generationId} · Status {generationStatusLabel}</p>
            </div>
          )}

          {isGenerationFailed && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-500/30 dark:bg-rose-500/5">
              <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-200">Question generation failed.</p>
              <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-300/80">{generationError || 'Unknown error'} · Generation ID: {generationId}</p>
              <Button size="sm" variant="outline" className="mt-3 border-rose-300 text-rose-700" onClick={handleRetryGeneration}>
                <RefreshCw className="h-3.5 w-3.5" /> Retry Generation
              </Button>
            </div>
          )}

          {/* Completeness check */}
          {isGenerationReady && generatedCountForDisplay < requestedCountForDisplay && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
              <p className="flex items-center gap-2 text-[12px] font-bold text-amber-800 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Incomplete generation — Send disabled</p>
              <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/80">Requested {requestedCountForDisplay} questions, generated {generatedCountForDisplay}. The paper is not ready — regenerate or adjust the count.</p>
            </div>
          )}

          {/* Generated questions — review and select, then save. Visible once
              generation is ready and the paper has not yet been saved. */}
          {!paperSaved && isGenerationReady && (
            <div className="mt-2 space-y-3">
              {/* Header row: label + Select All toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Generated questions — review and select, then save the paper
                </p>
                {availableQuestions.length > 0 && (
                  <button
                    onClick={() => {
                      const allIds = availableQuestions.map((q) => q.id ?? q._id).filter(Boolean)
                      const allSelected = allIds.every((id) => selectedIds.includes(id))
                      setSelectedIds(allSelected ? [] : allIds)
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[11.5px] font-bold text-slate-500 transition-all hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                  >
                    {availableQuestions.map((q) => q.id ?? q._id).filter(Boolean).every((id) => selectedIds.includes(id))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                )}
              </div>

              {availableQuestions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-700">
                  <Database className="mx-auto h-8 w-8 text-slate-300" />
                  {generationQuestions.length === 0 ? (
                    <>
                      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No questions were generated for this generation.</p>
                      <p className="mt-1 text-xs text-slate-400">Regenerate questions or adjust the paper configuration and try again.</p>
                      <Button size="sm" variant="outline" className="mt-4 border-indigo-200 text-indigo-600" onClick={handleRetryGeneration}><RefreshCw className="h-3.5 w-3.5" /> Regenerate Questions</Button>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-200">No questions match these filters</p>
                      <p className="mt-1 text-xs text-slate-400">Try a different question type filter.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {availableQuestions.map((q) => {
                      const id = q.id ?? q._id
                      const isSelected = selectedIds.includes(id)
                      return (
                        <div key={id} className={`rounded-2xl border p-3.5 transition-all ${isSelected ? 'border-indigo-300 bg-indigo-50/50 dark:border-indigo-500/40 dark:bg-indigo-500/5' : 'border-slate-100 bg-white hover:border-indigo-200 dark:border-slate-800 dark:bg-slate-900'}`}>
                          <div className="flex items-start gap-3">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(id)} className="mt-1 h-4 w-4 accent-indigo-600" data-testid={`question-checkbox-${id}`} />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap gap-1.5">
                                <Badge variant="secondary" size="sm">{q.subjectName ?? q.subject ?? q.subjectCode ?? '—'}</Badge>
                                {q.chapter && <Badge variant="outline" size="sm">{q.chapter}</Badge>}
                                {q.topic && <Badge variant="outline" size="sm">{q.topic}</Badge>}
                                {q.difficulty && <Badge variant={DIFF_STYLES[q.difficulty] ?? 'secondary'} size="sm">{q.difficulty}</Badge>}
                                {q.type && <Badge variant="secondary" size="sm">{q.type}</Badge>}
                                {q.questionType && <Badge variant="secondary" size="sm">{q.questionType}</Badge>}
                                {q.exam && <Badge variant="info" size="sm">{q.exam}</Badge>}
                                {q.marks && <Badge variant="outline" size="sm">{q.marks} marks</Badge>}
                              </div>
                              <div className="mt-2 text-[13px] font-medium leading-relaxed text-slate-700 dark:text-slate-200">
                                <MathText>{q.text ?? q.question ?? '—'}</MathText>
                              </div>
                              {Array.isArray(q.options) && q.options.length > 0 && (
                                <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                  {q.options.map((opt, i) => (
                                    <span key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11.5px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">({String.fromCharCode(65 + i)}) <MathText>{optionText(opt)}</MathText></span>
                                  ))}
                                </div>
                              )}
                              <p className="mt-1 text-[10px] text-slate-400">ID: {id} · Domain: {q.domain ?? domain} · Exam family: {q.examFamily ?? examFamily ?? 'University'} · Source: {q.source ?? 'AI'}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                    <div>
                      <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{selectedIds.length} questions selected</p>
                      <p className="text-[11px] text-slate-400">{isGenerationReady && generatedCountForDisplay < requestedCountForDisplay ? 'Not ready — incomplete generation, Send disabled.' : isPaperReady ? 'Ready — Send enabled.' : 'Select questions to enable Save.'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPrintOpen(true)}><Printer className="h-3.5 w-3.5" /> Preview</Button>
                      <Button size="sm" onClick={handleCreate} disabled={saving || selectedIds.length === 0 || isGenerationRunning || isGenerationFailed} data-testid="save-paper-button"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : `Save Paper (${selectedIds.length})`}</Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Paper Library removed — it now lives in the dedicated Paper Library tab. */}

      {/* Dialogs — print preview is used by the Preview button in the questions list. */}
      <PaperPrintPreview paper={{ title, totalMarks: Number(marks) || 50, duration: Number(duration) || 120, questions: selectedIds.length, questionList: availableQuestions.filter((q) => selectedIds.includes(q.id ?? q._id)) }} open={printOpen} onOpenChange={setPrintOpen} />
    </div>
  )
}

export { PaperGeneratorTab }
export default PaperGeneratorTab
