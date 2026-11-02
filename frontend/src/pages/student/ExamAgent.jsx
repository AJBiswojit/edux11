/**
 * AI Exam Conducting Agent — Student portal page.
 *
 * Flow: Home (select exam) → Instructions → Live exam interface
 * (manual or Demo Monitoring) → Submission confirmation.
 *
 * After submission the student always sees the confirmation screen.
 * The full AI performance report is accessible later from the attempts
 * history via a deep-link (?attempt=ID).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { DashboardSkeleton, ErrorState } from '@/components/shared/loading'
import { Badge } from '@/components/ui'
import { useAuth } from '@/contexts/auth-context'
import { useExamAgentAttempt, useExamAgentAttempts, useExamAgentExams, enqueueExamSubmission, getSubmissionStatus, fetchExamAgentAttempt, startExamSitting } from '@/services/exam-agent'
import { useQueryClient } from '@tanstack/react-query'
import { useMasterStudentProfile, useStudentIntelligence } from '@/services/intelligence'
import { buildCanonicalExamAttempt, buildExamAgentReport, reconcileReportWithServerAttempt } from '@/intelligence/engine/exam-agent.js'
import { ExamAgentHome, ExamAgentInstructions, ExamAgentLive, ExamAgentReport } from '@/components/exam-workspace'
import { clearProgress, getActiveProgressExamId } from '@/components/exam-workspace/exam-agent/exam-progress-store'
import { useExamMode } from '@/contexts/exam-mode-context'

function ExamAgent() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { setTokens } = useAuth()
  const { data: examsData, isLoading, isError, refetch } = useExamAgentExams()
  const { data: attemptsData } = useExamAgentAttempts()
  const queryClient = useQueryClient()
  const { data: intel } = useStudentIntelligence()
  const { data: masterProfile } = useMasterStudentProfile()
  const { enterExamMode, exitExamMode, requestExamFullscreen } = useExamMode()

  /* Student identity — the existing master student profile (Phase 1:
     attempts must carry studentId + roll for future faculty/DNA consumers). */
  const identity = useMemo(() => ({
    studentId: masterProfile?.id ?? null,
    roll: masterProfile?.rollNo ?? null,
  }), [masterProfile])

  const exams = examsData?.items ?? []
  const attempts = attemptsData?.items ?? []

  /* attempt deep-link */
  const [viewAttemptId, setViewAttemptId] = useState(null)
  const { data: storedAttemptData } = useExamAgentAttempt(viewAttemptId)

  const [step, setStep] = useState('home') // home | instructions | live | submitted | pending | report
  const [selected, setSelected] = useState(null) // { exam, mode }
  const [liveKey, setLiveKey] = useState(0)
  const [report, setReport] = useState(null)
  const [resultsAvailableAt, setResultsAvailableAt] = useState(null) // ISO when a time-locked result unlocks
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(null)
  const [resumeData, setResumeData] = useState(null) // saved interactions from start_exam response
  const submittingRef = useRef(false)

  /* Auto-resume an active, unsubmitted exam on browser refresh / page load.
     Prevents students from escaping live exam mode by refreshing the tab.
     Guard: skip if a submission is already in flight (submittingRef) so that
     navigating away mid-poll and returning does NOT re-enter a submitted exam.
     The localStorage record is cleared immediately on submit (see handleComplete),
     so getActiveProgressExamId() should already return null — this ref is an
     additional safety net for the brief window before clearProgress executes. */
  useEffect(() => {
    if (step !== 'home' || selected || !exams.length) return
    if (submittingRef.current) return
    const activeExamId = getActiveProgressExamId()
    if (!activeExamId) return
    const activeExam = exams.find((e) => e.id === activeExamId)
    if (activeExam && !activeExam.attempted) {
      setSelected({ exam: activeExam, mode: 'manual' })
      setStep('live')
    }
  }, [exams, step, selected])

  /* Intelligence foundation for the report's DNA bridge */
  const foundation = useMemo(() => {
    const derived = intel?.derived ?? {}
    return {
      academicDna: derived.academicDna,
      readinessByFamily: derived.readiness?.byExamFamily,
      universityReadiness: derived.readiness?.university,
    }
  }, [intel])

  /* Deep-link: ?exam=ID&mode=demo / ?attempt=ID */
  useEffect(() => {
    const examId = searchParams.get('exam')
    const attemptId = searchParams.get('attempt')
    if (attemptId) {
      setViewAttemptId(attemptId)
      setStep('report')
      return
    }
    if (examId && exams.length) {
      const exam = exams.find((e) => e.id === examId)
      // A completed exam cannot be re-entered via deep link (real or demo).
      if (exam && !exam.attempted) {
        setSelected({ exam, mode: searchParams.get('mode') === 'demo' ? 'demo' : 'manual' })
        setStep('instructions')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, exams.length])

  /* Build report from a stored attempt (history / deep link) */
  useEffect(() => {
    const stored = storedAttemptData?.attempt
    if (!stored || !viewAttemptId) return
    // Result still time-locked: show the pending screen, not a report.
    if (stored.resultsPending) {
      setResultsAvailableAt(stored.resultsAvailableAt ?? null)
      setReport(null)
      setStep('pending')
      return
    }
    if (!exams.length) return
    const exam = exams.find((e) => e.id === stored.examId)
    if (exam) {
      const base = buildExamAgentReport({
        exam,
        interactions: stored.interactions ?? {},
        elapsedSeconds: stored.elapsedSeconds ?? 0,
        completedAt: stored.completedAt,
        foundation,
      })
      setReport(reconcileReportWithServerAttempt(base, stored))
      setStep('report')
    }
  }, [storedAttemptData, exams, viewAttemptId, foundation])

  const handleStart = useCallback((exam, mode) => {
    // Once an exam is completed it cannot be re-entered — neither a real
    // attempt nor a demo run of that same exam.
    if (exam?.attempted) return
    setStartError(null)
    setSelected({ exam, mode })
    setLiveKey((k) => k + 1)
    setStep('instructions')
  }, [])

  const handleBegin = useCallback(async () => {
    if (!selected?.exam?.id || starting) return
    setStarting(true)
    setStartError(null)
    setResumeData(null)
    try {
      // Creates the server sitting and returns JWTs that last for the full
      // exam duration (+ grace) so the default 30m access token cannot expire mid-exam.
      const res = await startExamSitting(selected.exam.id, {
        attemptKind: 'practice',
        isDemo: selected.mode === 'demo',
      })
      if (res?.accessToken) setTokens(res.accessToken, res.refreshToken)
      // If the server returned saved interactions (admin-granted resume),
      // pass them to ExamAgentLive so previous answers are pre-populated.
      if (res?.savedInteractions && Object.keys(res.savedInteractions).length > 0) {
        setResumeData({
          interactions: res.savedInteractions,
          elapsedSeconds: res.savedElapsedSeconds || 0,
          remainingSeconds: res.remainingSeconds || 0,
        })
      }
      setLiveKey((k) => k + 1)
      setStep('live')
      // Request native fullscreen here — inside the async continuation of a
      // click handler, which browsers treat as a user-gesture context.
      requestExamFullscreen()
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Could not start the exam. Try again.'
      setStartError(typeof detail === 'string' ? detail : 'Could not start the exam. Try again.')
    } finally {
      setStarting(false)
    }
  }, [selected, starting, setTokens, requestExamFullscreen])

  const handleComplete = useCallback((payload) => {
    if (!selected || submittingRef.current) return
    submittingRef.current = true

    /* Build the canonical attempt for server-side scoring. */
    const rep = buildExamAgentReport({
      exam: selected.exam,
      interactions: payload.interactions,
      elapsedSeconds: payload.elapsedSeconds,
      completedAt: payload.completedAt,
      foundation,
    })

    /* Phase 1 — save the CANONICAL ExamAttempt (identity + startedAt +
       source + denormalized exam/question snapshot + raw interactions +
       derived summary). Legacy fields are preserved inside the record for
       backward compatibility with the existing history/report flows.

       Scoring is authoritative on the server (delivery payloads omit the
       answer key), so once the attempt is saved we overlay the server's
       per-question evaluation + totals onto the report. */
    const canonical = buildCanonicalExamAttempt({
      exam: selected.exam,
      interactions: payload.interactions,
      elapsedSeconds: payload.elapsedSeconds,
      completedAt: payload.completedAt,
      startedAt: payload.startedAt ?? null,
      studentId: identity.studentId,
      roll: identity.roll,
      mode: selected.mode,
      report: rep,
    })
    /* Explicit answer key for server-side scoring. The canonical
       questionAttempts nest the choice under response.selectedAnswer, but the
       backend scorer reads a flat answers[] ({questionId, selected}). */
    const answers = Object.entries(payload.interactions ?? {}).map(([questionId, it]) => ({
      questionId,
      selected: it?.selected ?? null,
      value: it?.value != null && String(it.value).trim() !== '' ? String(it.value).trim() : null,
    }))
    const submissionBody = {
      ...canonical,
      answers,
      proctorViolations: payload.proctorViolations ?? 0,
      terminated: Boolean(payload.terminated),
      terminationReason: payload.terminationReason ?? null,
    }
    const examId = selected.exam.id

    /* Always show the submission confirmation immediately — analysis is never
       shown right after submission. The student can view the report later from
       the attempts history once the exam duration has elapsed. */
    setStep('submitted')

    // Clear the localStorage progress record immediately on submission so the
    // auto-resume effect never re-enters this exam if the student navigates away
    // before the background polling finishes. The server already holds the
    // submission body at this point, so the local draft is no longer needed.
    clearProgress(examId)

    // Optimistically mark the exam as attempted in the React Query cache so the
    // exam card switches to "Completed" (disabled) instantly — without waiting
    // for the server round-trip or the 2-minute staleTime to expire.
    queryClient.setQueryData(['exam-agent', 'exams'], (prev) => {
      if (!prev?.items) return prev
      return {
        ...prev,
        items: prev.items.map((e) =>
          e.id === examId ? { ...e, attempted: true } : e
        ),
      }
    })

    // Persist the scored attempt in the background so the history view is
    // up to date. On failure the local draft survives for a retry on reconnect.
    const applyServerAttempt = (serverAttempt) => {
      clearProgress(examId)
      queryClient.invalidateQueries({ queryKey: ['exam-agent', 'attempts'] })
      // Invalidate the exams list so the server-authoritative attempted flag
      // replaces the optimistic update above on next render.
      queryClient.invalidateQueries({ queryKey: ['exam-agent', 'exams'] })
      // Keep resultsAvailableAt in sync in case the student bookmarks or
      // refreshes — the pending screen will reflect the correct unlock time
      // if they navigate back via deep-link.
      if (serverAttempt?.resultsPending) {
        setResultsAvailableAt(serverAttempt.resultsAvailableAt ?? null)
      }
    }

    // Poll a queued submission until it finishes, then mark the attempt done.
    const pollUntilDone = (submissionId, tries = 0) =>
      getSubmissionStatus(submissionId).then((s) => {
        if (s?.status === 'completed' && s.attemptId) {
          return fetchExamAgentAttempt(s.attemptId).then((d) => applyServerAttempt(d?.attempt))
        }
        if (s?.status === 'failed') {
          clearProgress(examId)
          return undefined
        }
        if (tries >= 60) return undefined // ~2 min safety cap; answers are saved server-side
        return new Promise((r) => setTimeout(r, 2000)).then(() => pollUntilDone(submissionId, tries + 1))
      })

    /* Queue-based submit that absorbs large simultaneous bursts. On failure
       (e.g. the network dropped at the finish line) retry once the browser
       reports it is back online. The submission body lives in this closure, so
       the retry re-sends the in-memory data even though localStorage was already
       cleared to prevent the auto-resume effect from re-entering a submitted exam. */
    const trySubmit = () =>
      enqueueExamSubmission(examId, submissionBody)
        .then((res) => {
          if (res?.attempt) return applyServerAttempt(res.attempt) // sync fallback path
          if (res?.submissionId) return pollUntilDone(res.submissionId)
          return undefined
        })
        .catch(() => {
          const onBackOnline = () => {
            window.removeEventListener('online', onBackOnline)
            trySubmit()
          }
          window.addEventListener('online', onBackOnline)
        })
    trySubmit()
  }, [foundation, identity, queryClient, selected])

  /* Exam mode: enter full-page layout when live, exit for every other step.
     This also handles a page-refresh mid-exam — the progress rehydration in
     exam-agent-live restores the answers/timer, and this effect restores the
     full-page shell so the sidebar/topbar stay hidden after the reload. */
  useEffect(() => {
    if (step === 'live') {
      enterExamMode()
    } else {
      exitExamMode()
    }
    // On unmount (navigating away from /exam-agent entirely) always exit exam mode.
    return () => { exitExamMode() }
  }, [step, enterExamMode, exitExamMode])

  const handleHome = useCallback(() => {
    setSelected(null)
    setReport(null)
    setViewAttemptId(null)
    setStartError(null)
    setStarting(false)
    submittingRef.current = false
    setStep('home')
  }, [])

  if (isLoading) return <DashboardSkeleton cards={3} />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const counts = {
    University: exams.filter((e) => e.type === 'University').length,
    JEE: exams.filter((e) => e.type === 'JEE').length,
    NEET: exams.filter((e) => e.type === 'NEET').length,
  }

  // During the live exam the ExamAgentLive component owns the full viewport.
  // Render it directly — no PageHeader, no outer wrapper — so it fills the
  // bare <main> that AppLayout provides in exam mode.
  if (step === 'live' && selected) {
    return (
      <ExamAgentLive
        key={`${selected.exam.id}-${selected.mode}-${liveKey}`}
        exam={selected.exam}
        mode={selected.mode}
        onExit={handleHome}
        onComplete={handleComplete}
        resumeData={resumeData}
      />
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="Academics · Examinations · AI Agent"
        title="AI Exam Conducting Agent"
        description="Practice exams with real-time interaction intelligence — a live timer, question-by-question tracking, and a full AI performance report with strengths, weaknesses and recommendations."
        breadcrumbs={[{ label: 'Student' }, { label: 'Examinations' }]}
        actions={
          <Badge variant="gradient" className="px-3 py-1">
            <Sparkles className="h-3 w-3" /> {counts.University} University · {counts.JEE} JEE · {counts.NEET} NEET
          </Badge>
        }
      />

      {step === 'home' && (
        <ExamAgentHome
          exams={exams}
          onStart={handleStart}
        />
      )}

      {step === 'instructions' && selected && (
        <ExamAgentInstructions
          exam={selected.exam}
          mode={selected.mode}
          onBack={handleHome}
          onStart={handleBegin}
          starting={starting}
          startError={startError}
        />
      )}

      {/* Submission confirmation — shown immediately after every exam submission.
          The student never sees the analysis right after submitting. */}
      {step === 'submitted' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg rounded-3xl border border-indigo-200/60 bg-white p-8 text-center shadow-card dark:border-indigo-500/25 dark:bg-slate-900"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Your exam has been submitted</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Your answers are saved. The result and analysis will be available
            once the exam's full duration is over
            {resultsAvailableAt ? <> — after {new Date(resultsAvailableAt).toLocaleString()}</> : null}.
          </p>
          <Link to="/student/examinations">
            <Badge variant="gradient" className="mt-6 px-3 py-1">Back to Examinations</Badge>
          </Link>
        </motion.div>
      )}

      {/* Legacy pending screen — reached only via deep-link (?attempt=ID) when
          the server flags the attempt as time-locked. */}
      {step === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg rounded-3xl border border-indigo-200/60 bg-white p-8 text-center shadow-card dark:border-indigo-500/25 dark:bg-slate-900"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">Your exam has been submitted</h3>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            Your answers are saved. The result and analysis will be available once the exam's full duration is over
            {resultsAvailableAt ? <> — after {new Date(resultsAvailableAt).toLocaleString()}</> : null}.
          </p>
          <Link to="/student/examinations">
            <Badge variant="gradient" className="mt-6 px-3 py-1">Back to Examinations</Badge>
          </Link>
        </motion.div>
      )}

      {step === 'report' && report && (
        <ExamAgentReport
          report={report}
          mode={selected?.mode ?? (viewAttemptId ? 'manual' : 'manual')}
          onRetake={() => (selected && selected.mode === 'demo' ? setStep('instructions') : handleHome())}
          onBack={handleHome}
        />
      )}

      {step === 'report' && !report && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading attempt report…
        </div>
      )}
    </div>
  )
}

export { ExamAgent }
export default ExamAgent
