/**
 * AI Exam Conducting Agent — LIVE exam interface.
 *
 * Timer · question card · options · question navigator · mark-for-review ·
 * prev/next · submit · real-time intelligence strip · subtle AI Exam Agent
 * indicator · Demo Monitoring simulation (deterministic, varied behaviour).
 *
 * Every tracked value (attempted / correct / incorrect / skipped / pace /
 * time efficiency / pressure) is DERIVED from the interaction record via
 * computeLiveExamStats — the UI never hardcodes a metric.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2,
  Clock, FastForward, Flag, FlagOff, ListChecks, Maximize, Pause, Play, Send, Sparkles, X,
} from 'lucide-react'
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui'
import { MathText } from '@/components/shared/math-text'
import {
  buildDemoSimulationPlan, computeLiveExamStats, demoTimeScale, formatClock,
} from '@/intelligence/engine/exam-agent.js'
import { cn } from '@/utils/cn'
import { QUESTION_OPTION_LABELS } from '@/constants/ui'
import { isFillInBlankQuestion, optionText } from '@/api/adapters/questions'
import { ExamTypeBadge } from './exam-agent-shared'
import { loadProgress, saveProgress } from './exam-progress-store'
import { loadExamProgress, saveExamProgress } from '@/services/exam-agent'
import { useExamMode } from '@/contexts/exam-mode-context'

const LETTERS = QUESTION_OPTION_LABELS

/* Proctoring: allow 12 warnings for leaving the exam window; the 13th auto-submits. */
const MAX_PROCTOR_WARNINGS = 12

const DIFF_STYLES = { Easy: 'success', Medium: 'warning', Hard: 'danger' }

function hasAnswer(interaction) {
  if (!interaction) return false
  if (interaction.selected != null) return true
  const v = interaction.value
  return v != null && String(v).trim() !== ''
}

function statusOf(interaction) {
  if (!interaction || !interaction.visited) return 'not-visited'
  if (hasAnswer(interaction) && interaction.markedForReview) return 'answered-review'
  if (interaction.markedForReview) return 'review'
  if (hasAnswer(interaction)) return 'answered'
  return 'not-answered'
}

/* NTA-spec colour map for the question palette */
const NAV_STYLES = {
  'not-visited':   'bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700',
  'not-answered':  'bg-rose-500 text-white shadow-md shadow-rose-500/30',
  answered:        'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30',
  review:          'bg-violet-500 text-white shadow-md shadow-violet-500/30',
  'answered-review': 'bg-violet-500 text-white ring-2 ring-inset ring-white/60 shadow-md shadow-violet-500/30',
}

/* Legend must match the 5 NTA-spec states */
const LEGEND = [
  { key: 'not-visited',    dot: 'bg-slate-200 dark:bg-slate-700',                       label: 'Not visited' },
  { key: 'not-answered',  dot: 'bg-rose-500',                                           label: 'Not answered' },
  { key: 'answered',      dot: 'bg-gradient-to-br from-emerald-500 to-green-600',       label: 'Answered' },
  { key: 'review',        dot: 'bg-violet-500',                                         label: 'Marked for review' },
  { key: 'answered-review', dot: 'bg-violet-500 ring-2 ring-inset ring-white/60',       label: 'Answered + marked for review' },
]


function ExamAgentLive({ exam, mode, onExit, onComplete, resumeData }) {
  const { examModeActive, isFullscreen, fullscreenEverEntered, fullscreenRequestFailed, requestExamFullscreen } = useExamMode()
  const isDemo = mode === 'demo'
  const duration = exam.durationMinutes * 60
  const scale = useMemo(() => demoTimeScale(exam), [exam])

  const [current, setCurrent] = useState(0)
  const [version, setVersion] = useState(0)
  const [remaining, setRemaining] = useState(duration)
  const [paused, setPaused] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [finished, setFinished] = useState(false)
  const [log, setLog] = useState([])
  /* Proctoring: warning dialog state. warningCount drives the "X of 3" copy.
     warningIsRefresh distinguishes a browser-refresh attempt from a tab-switch. */
  const [warningOpen, setWarningOpen] = useState(false)
  const [warningCount, setWarningCount] = useState(0)
  const [warningIsRefresh, setWarningIsRefresh] = useState(false)
  const violationsRef = useRef(0)
  /* Set to true for ~1 s around a beforeunload so the visibilitychange/blur
     proctoring handler knows the leave-event was caused by a refresh attempt
     and does not double-count it as a second violation. */
  const unloadingRef = useRef(false)

  const interactionsRef = useRef({})
  const startedAtRef = useRef(Date.now())
  const startedAtIsoRef = useRef(new Date().toISOString())
  const qStartedAtRef = useRef(Date.now())
  const currentRef = useRef(0)
  const elapsedRef = useRef(0)
  const cursorRef = useRef(0)
  const submitLockRef = useRef(false)
  const pausedRef = useRef(paused)
  const finishedRef = useRef(false)
  const scheduleRef = useRef([])
  const onCompleteRef = useRef(onComplete)
  const finalizeRef = useRef(() => {})
  const applyEventRef = useRef(() => {})

  const resumeHydratedRef = useRef(false)
  /* Connection state (no UI) — used only to guard proctoring so a network drop
     is never mistaken for a deliberate tab switch. */
  const onlineRef = useRef(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => { currentRef.current = current }, [current])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  /* ---------------- resume saved progress (crash / refresh / disconnect / device loss) ----------------
     Runs once on mount for a real attempt. Prefers the local draft (Layer 1,
     instant). If none exists (fresh device / cleared browser) it falls back to
     the server-saved progress (Layer 2). Demo runs are never persisted. */
  const hydrateFrom = useCallback((saved) => {
    if (!saved || !saved.interactions || typeof saved.interactions !== 'object') return false
    if (Object.keys(saved.interactions).length === 0) return false
    interactionsRef.current = saved.interactions
    if (typeof saved.violations === 'number') {
      violationsRef.current = saved.violations
      if (saved.violations > MAX_PROCTOR_WARNINGS) {
        setTimeout(() => {
          finalizeRef.current('Auto-submitted: left the exam window or refreshed too many times')
        }, 100)
      } else if (saved.violations > 0) {
        setWarningIsRefresh(true)
        setWarningCount(saved.violations)
        setWarningOpen(true)
      }
    }
    if (typeof saved.startedAtIso === 'string') startedAtIsoRef.current = saved.startedAtIso
    // Prefer server-authoritative remaining time (from faculty resume grant or
    // sitting expires_at) over client-side elapsed which may be stale after a
    // long disconnection.
    let effectiveRemaining
    if (typeof saved.remainingSeconds === 'number' && saved.remainingSeconds > 0) {
      effectiveRemaining = saved.remainingSeconds
      const effectiveElapsed = Math.max(0, duration - effectiveRemaining)
      startedAtRef.current = Date.now() - effectiveElapsed * 1000
    } else {
      const savedElapsed = Math.max(0, Number(saved.elapsedSeconds) || 0)
      startedAtRef.current = Date.now() - savedElapsed * 1000
      effectiveRemaining = Math.max(0, duration - savedElapsed)
    }
    setRemaining(effectiveRemaining)
    const savedCurrent = Math.min(Math.max(Number(saved.current) || 0, 0), exam.questions.length - 1)
    currentRef.current = savedCurrent
    setCurrent(savedCurrent)
    qStartedAtRef.current = Date.now()
    setVersion((v) => v + 1)
    return true
  }, [duration, exam.questions.length])

  useEffect(() => {
    if (isDemo || resumeHydratedRef.current) return
    resumeHydratedRef.current = true
    // Priority 1: interactions returned inline by start_exam (admin-granted resume).
    if (resumeData && resumeData.interactions && Object.keys(resumeData.interactions).length > 0) {
      if (hydrateFrom(resumeData)) return
    }
    // Priority 2: local draft (Layer 1, instant).
    if (hydrateFrom(loadProgress(exam.id))) return
    // Priority 3: server-saved progress (Layer 2, different device / cleared browser).
    let cancelled = false
    loadExamProgress(exam.id).then((server) => {
      // Only hydrate if the student hasn't already started answering here.
      if (cancelled || Object.keys(interactionsRef.current).length > 0) return
      if (server && server.hasProgress) hydrateFrom(server)
    })
    return () => { cancelled = true }
  }, [exam.id, isDemo, hydrateFrom, resumeData])

  /* ---------------- interaction helpers ---------------- */
  const touch = useCallback((qid) => {
    if (!interactionsRef.current[qid]) {
      interactionsRef.current[qid] = {
        selected: null, timeSpent: 0, visits: 0, answerChanges: 0, markedForReview: false,
        visited: false, firstViewedAt: new Date().toISOString(), lastViewedAt: new Date().toISOString(),
      }
    } else {
      /* lastViewedAt — refreshed on every interaction with the question */
      interactionsRef.current[qid].lastViewedAt = new Date().toISOString()
    }
    return interactionsRef.current[qid]
  }, [])

  const accumulateCurrent = useCallback(() => {
    const q = exam.questions[currentRef.current]
    if (!q) return
    const it = touch(q.id)
    const now = Date.now()
    it.timeSpent += (now - qStartedAtRef.current) / 1000
    qStartedAtRef.current = now
  }, [exam, touch])

  const goTo = useCallback((i) => {
    if (finishedRef.current) return
    const next = Math.min(Math.max(i, 0), exam.questions.length - 1)
    accumulateCurrent()
    const it = touch(exam.questions[next].id)
    it.visits += 1
    it.visited = true
    currentRef.current = next
    setCurrent(next)
    qStartedAtRef.current = Date.now()
    setVersion((v) => v + 1)
  }, [accumulateCurrent, exam, touch])

  const selectOption = useCallback((idx) => {
    if (finishedRef.current) return
    const q = exam.questions[currentRef.current]
    const it = touch(q.id)
    if (it.selected != null && it.selected !== idx) it.answerChanges += 1
    if (it.selected === idx) { it.selected = null; it.value = null; setVersion((v) => v + 1); return }
    it.selected = idx
    it.value = null
    it.visited = true
    it.visits = Math.max(it.visits, 1)
    setVersion((v) => v + 1)
  }, [exam, touch])

  const setFillValue = useCallback((text) => {
    if (finishedRef.current) return
    const q = exam.questions[currentRef.current]
    const it = touch(q.id)
    const next = text ?? ''
    if (it.value != null && it.value !== next) it.answerChanges += 1
    it.value = next
    it.selected = null
    it.visited = true
    it.visits = Math.max(it.visits, 1)
    setVersion((v) => v + 1)
  }, [exam, touch])

  const clearAnswer = useCallback(() => {
    if (finishedRef.current) return
    const q = exam.questions[currentRef.current]
    const it = touch(q.id)
    it.selected = null
    it.value = null
    // Clearing an answer on a visited question leaves it in 'not-answered' state
    setVersion((v) => v + 1)
  }, [exam, touch])

  /* Mark for Review & Next — marks the question then advances one step.
     If already marked and student clicks again, it un-marks (toggle) but still advances. */
  const markForReviewAndNext = useCallback(() => {
    if (finishedRef.current) return
    const q = exam.questions[currentRef.current]
    const it = touch(q.id)
    it.markedForReview = !it.markedForReview
    it.visited = true
    setVersion((v) => v + 1)
    // Advance to next question (if not last)
    const next = currentRef.current + 1
    if (next < exam.questions.length) {
      accumulateCurrent()
      const nit = touch(exam.questions[next].id)
      nit.visits += 1
      nit.visited = true
      currentRef.current = next
      setCurrent(next)
      qStartedAtRef.current = Date.now()
      setVersion((v) => v + 1)
    }
  }, [exam, touch, accumulateCurrent])

  /* ---------------- demo simulation schedule ---------------- */
  const schedule = useMemo(() => {
    if (!isDemo) return []
    const plan = buildDemoSimulationPlan(exam)
    let t = 0
    const visits = plan.visits.map((v) => {
      const ev = {
        kind: 'visit', qIndex: v.qIndex, dwell: v.dwell, answer: v.answer,
        skip: v.skip, markReview: v.markReview, change: v.change, start: t,
      }
      t += v.dwell
      return ev
    })
    const revisits = plan.revisits.map((r) => {
      const ev = { kind: 'revisit', qIndex: r.qIndex, dwell: r.dwell, answer: r.answer, start: t }
      t += r.dwell
      return ev
    })
    return [...visits, ...revisits]
  }, [isDemo, exam])
  useEffect(() => { scheduleRef.current = schedule }, [schedule])

  const pushLog = useCallback((qIndex, text, atSeconds) => {
    setLog((l) => [...l.slice(-39), { t: formatClock(atSeconds), q: qIndex + 1, text }])
  }, [])

  const applyEvent = useCallback((ev) => {
    const q = exam.questions[ev.qIndex]
    if (!q) return
    const it = touch(q.id)
    it.visited = true
    it.visits += 1
    it.timeSpent += ev.dwell
    const t = Math.round(elapsedRef.current)
    if (ev.kind === 'revisit') {
      if (ev.answer != null) {
        it.selected = ev.answer
        pushLog(ev.qIndex, `Revisited — answered (${LETTERS[ev.answer]})`, t)
      } else {
        pushLog(ev.qIndex, 'Revisited — left unanswered', t)
      }
    } else if (ev.skip) {
      pushLog(ev.qIndex, 'Skipped', t)
    } else {
      it.selected = ev.answer
      if (ev.change) {
        it.answerChanges = 1
        pushLog(ev.qIndex, `Answer changed → (${LETTERS[ev.answer]})`, t)
      } else {
        pushLog(ev.qIndex, `Answered (${LETTERS[ev.answer]})`, t)
      }
    }
    if (ev.markReview) {
      it.markedForReview = true
      pushLog(ev.qIndex, 'Marked for review', t)
    }
  }, [exam, pushLog, touch])
  useEffect(() => { applyEventRef.current = applyEvent }, [applyEvent])

  /* ---------------- finalize (manual submit / time-up / demo end) ---------------- */
  const finalize = useCallback((terminationReason = null) => {
    if (submitLockRef.current) return
    submitLockRef.current = true
    finishedRef.current = true
    setFinished(true)
    accumulateCurrent()
    const elapsed = isDemo ? elapsedRef.current : Math.max(0, (Date.now() - startedAtRef.current) / 1000)
    onCompleteRef.current({
      interactions: interactionsRef.current,
      elapsedSeconds: Math.round(elapsed),
      completedAt: new Date().toISOString(),
      startedAt: startedAtIsoRef.current,
      proctorViolations: violationsRef.current,
      terminated: Boolean(terminationReason),
      terminationReason,
    })
  }, [accumulateCurrent, isDemo])
  useEffect(() => { finalizeRef.current = finalize }, [finalize])

  /* ---------------- Layer 1: autosave progress to localStorage ----------------
     Snapshots the live answer record so a refresh / crash / disconnect never
     loses work. Throttled to at most once every 2s, and also flushed on tab
     hide / unload. Never persists demo runs or a finished attempt. */
  const lastSaveRef = useRef(0)
  const lastServerSaveRef = useRef(0)
  const persistNow = useCallback(() => {
    if (isDemo || finishedRef.current || submitLockRef.current) return
    accumulateCurrent()
    const elapsed = Math.round(Math.max(0, (Date.now() - startedAtRef.current) / 1000))
    // Layer 1 — local draft (instant, survives refresh / crash).
    saveProgress(exam.id, {
      interactions: interactionsRef.current,
      elapsedSeconds: elapsed,
      current: currentRef.current,
      violations: violationsRef.current,
      startedAtIso: startedAtIsoRef.current,
    })
    lastSaveRef.current = Date.now()
    // Layer 2 — durable server save (Postgres), throttled to ~20s and only
    // when online, so a device loss / server restart still keeps the answers.
    if (onlineRef.current && Date.now() - lastServerSaveRef.current > 20000) {
      lastServerSaveRef.current = Date.now()
      saveExamProgress(exam.id, { interactions: interactionsRef.current, elapsedSeconds: elapsed })
    }
  }, [accumulateCurrent, exam.id, isDemo])
  const persistNowRef = useRef(persistNow)
  useEffect(() => { persistNowRef.current = persistNow }, [persistNow])

  // Throttled save on every tracked interaction (answer / navigation / review).
  useEffect(() => {
    if (isDemo) return
    if (Date.now() - lastSaveRef.current < 2000) return
    persistNowRef.current()
  }, [version, isDemo])

  // Periodic server autosave safety net — covers a student who stares at one
  // question for minutes without interacting. Fires the throttled server save.
  useEffect(() => {
    if (isDemo) return undefined
    const id = setInterval(() => persistNowRef.current(), 20000)
    return () => clearInterval(id)
  }, [isDemo])

  // Flush immediately when the tab is hidden or the page is being unloaded —
  // the most common moments right before a refresh or a network handoff.
  // When the student hits the browser refresh button we:
  //   1. Count it as a proctoring violation and show the in-app warning dialog.
  //   2. Persist progress so no answers are lost even if they force the reload.
  //   3. Set unloadingRef for ~1 s so the visibilitychange/blur handlers that
  //      fire in the same sequence don't double-count the same event.
  useEffect(() => {
    if (isDemo) return undefined
    const handleBeforeUnload = (e) => {
      if (finishedRef.current || submitLockRef.current) return
      // Mark as unloading so the proctoring blur/visibility handlers skip
      // their own violation increment for this same browser action.
      unloadingRef.current = true
      setTimeout(() => { unloadingRef.current = false }, 1000)
      violationsRef.current += 1
      const count = violationsRef.current
      persistNowRef.current()
      // Show the in-app warning dialog (it will appear after the page
      // remounts via auto-resume, since the browser will still reload).
      // We also trigger the native "Leave site?" prompt — modern browsers
      // require e.returnValue to be set to show it, but crucially the
      // violation is already recorded regardless of what the student clicks.
      e.preventDefault()
      e.returnValue = ''
      // Schedule the in-app dialog to open. Because the page may reload
      // this is a best-effort display; the real enforcement happens via the
      // violationsRef value that is persisted to localStorage and restored
      // on the next mount by hydrateFrom().
      if (count <= MAX_PROCTOR_WARNINGS) {
        setWarningIsRefresh(true)
        setWarningCount(count)
        setWarningOpen(true)
      }
    }
    const flush = () => persistNowRef.current()
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDemo])

  /* ---------------- hard-reload keyboard shortcut blocking ----------------
     Intercepts F5, Ctrl+R, Ctrl+Shift+R (hard refresh) and Ctrl+W / Ctrl+F4
     (close tab) at the keydown level so the browser never gets a chance to
     navigate away. This is the first line of defence; the beforeunload handler
     above is the fallback for cases the keyboard cannot catch (toolbar button,
     OS-level gestures, mobile pull-to-refresh blocked separately via CSS).

     When a blocked shortcut is detected:
       1. preventDefault / stopPropagation prevent the browser action.
       2. The violation count is incremented and the in-app warning dialog is
          shown immediately — no page reload means no auto-resume required.
       3. Progress is flushed to localStorage as a safety net.

     The unloadingRef guard is NOT set here because the page does not actually
     navigate away — the visibilitychange / blur handlers must still work
     normally so a concurrent tab switch is counted independently. */
  useEffect(() => {
    if (isDemo) return undefined
    const handleKeyDown = (e) => {
      if (finishedRef.current || submitLockRef.current) return
      const ctrl = e.ctrlKey || e.metaKey
      const isHardRefresh =
        e.key === 'F5' ||                              // F5 (soft refresh, blocked too)
        (ctrl && e.key.toLowerCase() === 'r') ||      // Ctrl+R / Cmd+R
        (ctrl && e.shiftKey && e.key.toLowerCase() === 'r') // Ctrl+Shift+R / hard refresh
      const isCloseTab =
        (ctrl && e.key.toLowerCase() === 'w') ||      // Ctrl+W
        (ctrl && e.key === 'F4')                       // Ctrl+F4
      if (!isHardRefresh && !isCloseTab) return
      // Block the browser-native action at the keyboard level.
      e.preventDefault()
      e.stopPropagation()
      // Count as a proctoring violation and show the in-app warning immediately.
      // Since the reload was blocked the page stays alive, so we show the dialog
      // right now rather than relying on the auto-resume path.
      violationsRef.current += 1
      const count = violationsRef.current
      persistNowRef.current()
      if (count > MAX_PROCTOR_WARNINGS) {
        finalizeRef.current('Auto-submitted: left the exam window or refreshed too many times')
      } else {
        setWarningIsRefresh(true)
        setWarningCount(count)
        setWarningOpen(true)
      }
    }
    // Use capture phase so the handler runs before any child component handlers,
    // and the event cannot be swallowed by a focused input or button.
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isDemo])

  // Track connection state (no UI). On reconnect, flush a save so the server
  // path (Layer 2) and the local draft are up to date at the earliest moment.
  useEffect(() => {
    if (isDemo) return undefined
    const goOnline = () => { onlineRef.current = true; persistNowRef.current() }
    const goOffline = () => { onlineRef.current = false }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [isDemo])

  /* ---------------- proctoring: tab-switch / leave-window detection ----------------
     A real (non-demo) attempt is monitored: switching tabs, minimizing, or
     otherwise moving focus away from the exam counts as a violation. The first
     three trigger a warning; the fourth auto-submits the exam as terminated. */
  useEffect(() => {
    if (isDemo) return undefined
    let lastAt = 0
    const onLeave = () => {
      if (finishedRef.current || submitLockRef.current) return
      // A network drop can fire blur/visibility events; do not punish the
      // student for losing connection — only real tab switches count.
      if (!onlineRef.current) return
      // A browser refresh triggers beforeunload (which already records the
      // violation) and then immediately fires visibilitychange + blur.
      // Skip here to avoid counting the same action twice.
      if (unloadingRef.current) return
      // Debounce: a single tab switch can fire both blur and visibilitychange.
      const now = Date.now()
      if (now - lastAt < 800) return
      lastAt = now
      violationsRef.current += 1
      const count = violationsRef.current
      if (count > MAX_PROCTOR_WARNINGS) {
        finalizeRef.current('Auto-submitted: left the exam window 13 times')
      } else {
        setWarningIsRefresh(false)
        setWarningCount(count)
        setWarningOpen(true)
      }
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') onLeave() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onLeave)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onLeave)
    }
  }, [isDemo])

  /* ---------------- proctoring: fullscreen exit (ESC / browser X button) ----------------
     When the student exits fullscreen via ESC or the browser's native fullscreen
     exit button, no blur/visibilitychange fires — only the document's
     fullscreenchange event. We treat this the same as a tab-switch violation.
     The exitExamFullscreen programmatic path (called on exam submit) sets
     submitLockRef before calling it, so legitimate exits are never counted. */
  useEffect(() => {
    if (isDemo) return undefined
    const onFullscreenChange = () => {
      if (document.fullscreenElement) return     // entering fullscreen — not a violation
      if (finishedRef.current || submitLockRef.current) return  // exam done / submitting
      if (!onlineRef.current) return             // network drop, not the student's action
      violationsRef.current += 1
      const count = violationsRef.current
      persistNowRef.current()
      if (count > MAX_PROCTOR_WARNINGS) {
        finalizeRef.current('Auto-submitted: left the exam window or refreshed too many times')
      } else {
        setWarningIsRefresh(false)
        setWarningCount(count)
        setWarningOpen(true)
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [isDemo])

  /* ---------------- manual ticker (real clock) ---------------- */
  useEffect(() => {
    if (isDemo) return undefined
    const id = setInterval(() => {
      const rem = Math.max(0, duration - (Date.now() - startedAtRef.current) / 1000)
      setRemaining(rem)
      if (rem <= 0) finalizeRef.current()
    }, 500)
    return () => clearInterval(id)
  }, [duration, isDemo])

  /* ---------------- demo ticker (accelerated clock) ---------------- */
  useEffect(() => {
    if (!isDemo) return undefined
    const id = setInterval(() => {
      if (pausedRef.current || finishedRef.current) return
      elapsedRef.current += 0.5 * scale
      const elapsed = elapsedRef.current
      setRemaining(Math.max(0, duration - elapsed))
      const events = scheduleRef.current
      while (cursorRef.current < events.length && events[cursorRef.current].start <= elapsed) {
        applyEventRef.current(events[cursorRef.current])
        cursorRef.current += 1
      }
      const active = [...events].reverse().find((e) => e.start <= elapsed && elapsed < e.start + e.dwell)
      if (active && active.qIndex !== currentRef.current) {
        currentRef.current = active.qIndex
        setCurrent(active.qIndex)
      }
      if (cursorRef.current >= events.length && !finishedRef.current) {
        finishedRef.current = true
        setFinished(true)
        setTimeout(() => finalizeRef.current(), 1400)
      }
      setVersion((v) => v + 1)
    }, 500)
    return () => clearInterval(id)
  }, [duration, isDemo, scale])

  /* ---------------- finish now (demo control) ---------------- */
  const finishNow = useCallback(() => {
    if (finishedRef.current) return
    const events = scheduleRef.current
    while (cursorRef.current < events.length) {
      applyEventRef.current(events[cursorRef.current])
      cursorRef.current += 1
    }
    if (events.length) {
      const last = events[events.length - 1]
      elapsedRef.current = Math.max(elapsedRef.current, last.start + last.dwell)
      currentRef.current = last.qIndex
      setCurrent(last.qIndex)
    }
    setRemaining(Math.max(0, duration - elapsedRef.current))
    finishedRef.current = true
    setFinished(true)
    setTimeout(() => finalizeRef.current(), 1200)
  }, [duration])

  /* ---------------- derived live stats ---------------- */
  const elapsed = isDemo ? elapsedRef.current : Math.max(0, duration - remaining)
  const live = computeLiveExamStats({ exam, interactions: interactionsRef.current, elapsedSeconds: elapsed })
  const question = exam.questions[current]
  const qInteraction = interactionsRef.current[question.id]
  const answeredCount = exam.questions.filter((qq) => hasAnswer(interactionsRef.current[qq.id])).length
  const reviewCount = exam.questions.filter((qq) => interactionsRef.current[qq.id]?.markedForReview).length
  const progressPct = exam.questions.length ? Math.round((answeredCount / exam.questions.length) * 100) : 0
  const timeLow = remaining <= 60
  const timeWarn = remaining <= 300 && !timeLow

  return (
    <div className={cn('flex h-screen flex-col overflow-hidden', examModeActive && 'px-4 sm:px-6 lg:px-8 pt-4')} style={{ touchAction: 'none' }}>
      {/* ================= Fullscreen status banners ================= */}
      {/* Shown when the browser rejected the fullscreen request */}
      {fullscreenRequestFailed && (
        <div className="shrink-0 flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-2.5 text-[12px] font-semibold text-rose-700 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/25 mb-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Fullscreen could not be activated. Your exam is still running — you can continue or try again.
          </span>
          <Button size="sm" variant="outline" onClick={requestExamFullscreen}
            className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-500/50 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <Maximize className="h-3.5 w-3.5" /> Try fullscreen
          </Button>
        </div>
      )}
      {/* Shown after the student presses ESC or otherwise exits fullscreen */}
      {fullscreenEverEntered && !isFullscreen && !fullscreenRequestFailed && !finished && !isDemo && (
        <div className="shrink-0 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25 mb-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            You have exited fullscreen mode.
          </span>
          <Button size="sm" variant="outline" onClick={requestExamFullscreen}
            className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-500/50 dark:text-amber-300 dark:hover:bg-amber-500/10"
          >
            <Maximize className="h-3.5 w-3.5" /> Return to Fullscreen
          </Button>
        </div>
      )}
      {/* ================= Top bar ================= */}
      <div className={cn(
        'shrink-0 z-40 mb-3 rounded-2xl border border-slate-200/70 bg-white/90 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90',
        examModeActive
          ? 'px-4 sm:px-6 lg:px-8'
          : '-mx-4 px-4',
      )}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">

          {/* LEFT: exam identity */}
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ExamTypeBadge type={exam.type} className="px-2 py-0 text-[10px]" />
                <p className="truncate text-[13.5px] font-bold text-slate-900 dark:text-white">{exam.shortTitle}</p>
                {isDemo && (
                  <Badge variant="warning" size="sm">
                    <Sparkles className="h-2.5 w-2.5" /> Demo
                  </Badge>
                )}
              </div>
              {/* Question progress inline */}
              <p className="mt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Question <span className="font-bold text-slate-600 dark:text-slate-300">{current + 1}</span> of {exam.questions.length}
                <span className="mx-1.5 opacity-40">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">{answeredCount} answered</span>
                {reviewCount > 0 && (
                  <><span className="mx-1.5 opacity-40">·</span>
                  <span className="text-amber-500 dark:text-amber-400">{reviewCount} flagged</span></>
                )}
              </p>
            </div>
          </div>

          {/* RIGHT: timer + submit */}
          <div className="flex items-center gap-2.5">
            <div className={cn(
              'flex items-center gap-2 rounded-2xl px-3.5 py-2 ring-1 transition-colors',
              timeLow
                ? 'bg-rose-50 ring-rose-200/70 dark:bg-rose-500/10 dark:ring-rose-500/30'
                : timeWarn
                  ? 'bg-amber-50 ring-amber-200/70 dark:bg-amber-500/10 dark:ring-amber-500/30'
                  : 'bg-slate-50 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700'
            )}>
              <Clock className={cn('h-4 w-4', timeLow ? 'text-rose-500' : timeWarn ? 'text-amber-500' : 'text-slate-400')} />
              <span className={cn(
                'font-mono text-lg font-bold tabular-nums tracking-tight',
                timeLow ? 'animate-pulse text-rose-600 dark:text-rose-400' : timeWarn ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              )}>
                {formatClock(remaining)}
              </span>
            </div>
            <Button
              size="sm"
              variant={finished ? 'secondary' : 'default'}
              disabled={finished}
              onClick={() => setConfirmOpen(true)}
              className="gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </Button>
          </div>
        </div>

        {/* Progress bar — answered fraction */}
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
            title={`${answeredCount} of ${exam.questions.length} answered`}
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 items-stretch gap-4 pb-4 lg:grid-cols-[1fr_300px]">
        {/* ================= Question column ================= */}
        <div className="flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto">

          <motion.div
            key={question.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col rounded-3xl border border-slate-200/70 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white">
                Question {current + 1} <span className="font-medium text-slate-400">of {exam.questions.length}</span>
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="info" size="sm">{question.subject}</Badge>
              </div>
            </div>

            <div className="mt-4 text-[15px] font-medium leading-relaxed text-slate-800 dark:text-slate-100">
              <MathText>{question.question}</MathText>
            </div>

            {(question.stemImageUrls?.length ? question.stemImageUrls : (question.imageUrl ? [question.imageUrl] : [])).map((src) => (
              <img
                key={src}
                src={src}
                alt="Question figure"
                className="mt-3 max-h-72 w-full rounded-2xl border border-slate-200 object-contain dark:border-slate-700"
                loading="lazy"
              />
            ))}

            <div className="mt-5 grid gap-2.5">
              {isFillInBlankQuestion(question) || question.options == null ? (
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Your answer</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    disabled={finished}
                    value={qInteraction?.value ?? ''}
                    onChange={(e) => setFillValue(e.target.value)}
                    placeholder="Type your answer"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 outline-none ring-indigo-500/30 focus:border-indigo-400 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
              ) : (
                (Array.isArray(question.options) ? question.options : []).map((opt, i) => {
                  const selected = qInteraction?.selected === i
                  const label = typeof opt === 'string' ? opt : optionText(opt)
                  const imageUrl = typeof opt === 'object' && opt ? (opt.imageUrl || opt.image_url) : null
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectOption(i)}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200',
                        selected
                          ? 'border-indigo-500 bg-indigo-50/80 shadow-sm ring-1 ring-indigo-500/40 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50 dark:hover:bg-slate-800/60'
                      )}
                    >
                      <span className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold transition-colors',
                        selected
                          ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      )}>
                        {LETTERS[i]}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                        {label ? <MathText>{label}</MathText> : null}
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={`Option ${LETTERS[i]}`}
                            className="mt-2 max-h-40 w-full rounded-xl border border-slate-200 object-contain dark:border-slate-700"
                            loading="lazy"
                          />
                        ) : null}
                      </span>
                      {selected && <CheckCircle2 className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* ── Action bar (NTA-spec): Clear Response · Mark for Review & Next · Previous · Save & Next / Save & Submit ── */}
            <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              {/* Row 1 — secondary actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Clear Response */}
                <Button
                  variant="outline" size="sm"
                  disabled={finished || !hasAnswer(qInteraction)}
                  onClick={clearAnswer}
                  className="border-slate-300 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 disabled:opacity-40"
                >
                  <FlagOff className="h-3.5 w-3.5" /> Clear Response
                </Button>

                {/* Mark for Review & Next */}
                <Button
                  variant={qInteraction?.markedForReview ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={finished}
                  onClick={markForReviewAndNext}
                  className={qInteraction?.markedForReview
                    ? 'border-violet-400 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/50 dark:bg-violet-500/10 dark:text-violet-300'
                    : 'border-slate-300 text-slate-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-violet-500/50 dark:hover:bg-violet-500/10 dark:hover:text-violet-400'
                  }
                >
                  {qInteraction?.markedForReview ? <Flag className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
                  {qInteraction?.markedForReview ? 'Unmark & Next' : 'Mark for Review & Next'}
                </Button>
              </div>

              {/* Row 2 — primary navigation */}
              <div className="flex items-center justify-between gap-2">
                {/* ← Previous */}
                <Button
                  variant="outline" size="sm"
                  disabled={current === 0 || finished}
                  onClick={() => goTo(current - 1)}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Previous
                </Button>

                {/* Save & Next  ·  or  Save & Submit on the last question */}
                {current === exam.questions.length - 1 ? (
                  <Button
                    size="sm"
                    disabled={finished}
                    onClick={() => setConfirmOpen(true)}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    <Send className="h-3.5 w-3.5" /> Save &amp; Submit
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={finished}
                    onClick={() => goTo(current + 1)}
                  >
                    Save &amp; Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>

          {/* time-up warning (manual, subtle) */}
          <AnimatePresence>
            {!isDemo && timeWarn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/25"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" /> Less than 5 minutes left — lock in your remaining answers.
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ================= Side column ================= */}
        <div className="flex min-h-0 flex-col">
          {/* Question navigator — fills full column height */}
          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200/70 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4 dark:border-slate-800">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ListChecks className="h-3.5 w-3.5" /> Question Navigator
              </p>
            </div>

            {/* Scrollable grid */}
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <div className="grid grid-cols-8 gap-1">
                {exam.questions.map((qq, i) => {
                  const st = statusOf(interactionsRef.current[qq.id])
                  return (
                    <button
                      key={qq.id}
                      onClick={() => goTo(i)}
                      aria-label={`Go to question ${i + 1}${st === 'answered' ? ' (answered)' : st === 'review' ? ' (marked for review)' : ''}`}
                      className={cn(
                        'flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-bold transition-all',
                        NAV_STYLES[st],
                        i === current && 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
                      )}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer — legend + counter, always visible */}
            <div className="shrink-0 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {LEGEND.map((l) => (
                  <span key={l.key} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                    <span className={cn('h-2 w-2 rounded-full', l.dot)} /> {l.label}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] font-medium leading-relaxed text-slate-400">
                <span className="font-bold text-slate-500 dark:text-slate-300">{answeredCount} answered</span> · {reviewCount} marked for review · {exam.questions.length - answeredCount} pending
              </p>
            </div>
          </div>

          {/* Demo monitoring panel */}
          {isDemo && (
            <div className="mt-3 shrink-0 rounded-3xl border border-amber-200/70 bg-white p-4 shadow-card dark:border-amber-500/25 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                  Demo Monitoring
                </p>
                <div className="flex gap-1.5">
                  <Button size="icon-sm" variant="outline" onClick={() => setPaused((p) => !p)} disabled={finished} aria-label={paused ? 'Resume demo' : 'Pause demo'}>
                    {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={finishNow} disabled={finished}>
                    <FastForward className="h-3.5 w-3.5" /> Finish now
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-400">
                A simulated student is taking this paper with varied timing and answer patterns. Watch the feed below.
              </p>
              <div className="mt-2.5 max-h-44 space-y-1 overflow-y-auto rounded-2xl bg-slate-950 p-3 font-mono text-[10.5px] leading-relaxed dark:bg-black/60">
                {log.length === 0 && <p className="text-slate-500">Waiting for the student to start…</p>}
                {log.map((entry, i) => (
                  <p key={i} className="text-slate-400">
                    <span className="text-slate-600">[{entry.t}]</span> Q{entry.q} · <span className="text-slate-200">{entry.text}</span>
                  </p>
                ))}
                {finished && <p className="text-amber-400">▸ Auto-submitting the paper…</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= Submit confirmation ================= */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit {exam.shortTitle}?</DialogTitle>
            <DialogDescription>
              The AI Exam Agent will analyse your attempt and generate the performance report. You cannot change answers after submission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-slate-800/60">
              <p className="text-xl font-bold text-slate-900 dark:text-white">{live.attempted}</p>
              <p className="text-[10.5px] font-semibold text-slate-400">Answered</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-center dark:bg-amber-500/10">
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{reviewCount}</p>
              <p className="text-[10.5px] font-semibold text-amber-600/70 dark:text-amber-300/70">Marked for review</p>
            </div>
            <div className="rounded-2xl bg-rose-50 p-3 text-center dark:bg-rose-500/10">
              <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{exam.questions.length - answeredCount}</p>
              <p className="text-[10.5px] font-semibold text-rose-600/70 dark:text-rose-300/70">Unanswered</p>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={finished}>Keep attempting</Button>
            <Button disabled={finished} onClick={() => { setConfirmOpen(false); finalize() }}>
              <Send className="h-4 w-4" /> {finished ? 'Submitting…' : 'Submit exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= Proctoring warning ================= */}
      <Dialog open={warningOpen} onOpenChange={setWarningOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              {warningIsRefresh ? 'Page Refresh Attempted' : 'Warning'} — {warningCount} of {MAX_PROCTOR_WARNINGS}
            </DialogTitle>
            <DialogDescription>
              {warningIsRefresh
                ? 'Refreshing the page during an exam is not allowed. Your progress has been saved and you have been returned to your exam, but this action has been recorded as a proctoring violation.'
                : 'Leaving the exam window is not allowed. Do not switch tabs, minimize, or move away from this screen.'}
              {' '}After {MAX_PROCTOR_WARNINGS} warnings your exam will be automatically submitted and this will be flagged on your report.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-rose-50 p-3 text-center dark:bg-rose-500/10">
            <p className="text-[12.5px] font-semibold text-rose-700 dark:text-rose-300">
              {MAX_PROCTOR_WARNINGS - warningCount} warning{MAX_PROCTOR_WARNINGS - warningCount === 1 ? '' : 's'} remaining before auto-submit
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setWarningOpen(false)}>I understand, continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { ExamAgentLive }
export default ExamAgentLive
