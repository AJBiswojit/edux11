/**
 * ExamModeContext
 *
 * Provides a lightweight client-side flag that signals whether a student is
 * actively in a live exam session. When `examModeActive` is true, AppLayout
 * hides the sidebar, topbar, footer and all overlays so the exam occupies the
 * full viewport — identical to a dedicated exam browser, but without any
 * routing change or server round-trip.
 *
 * Also owns the native browser Fullscreen API integration:
 *   - requestExamFullscreen()  — must be called from a user-gesture handler
 *   - exitExamFullscreen()     — programmatically leave fullscreen
 *   - isFullscreen             — true when document.fullscreenElement is set
 *   - fullscreenRequestFailed  — true when the browser rejected the request
 *
 * Designed to be zero-cost at scale: the flag lives entirely in React state
 * on the individual browser tab. No network calls, no shared server state.
 *
 * Usage:
 *   const { examModeActive, enterExamMode, exitExamMode,
 *           isFullscreen, fullscreenRequestFailed,
 *           requestExamFullscreen, exitExamFullscreen } = useExamMode()
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const ExamModeContext = createContext({
  examModeActive: false,
  enterExamMode: () => {},
  exitExamMode: () => {},
  isFullscreen: false,
  fullscreenEverEntered: false,
  fullscreenRequestFailed: false,
  requestExamFullscreen: () => {},
  exitExamFullscreen: () => {},
})

/**
 * Synchronously check localStorage on the first render to decide whether exam
 * mode should be active immediately. This eliminates the one-frame flash where
 * the sidebar/topbar are visible after a browser refresh mid-exam — before the
 * auto-resume useEffect in ExamAgent has had a chance to set step='live'.
 *
 * Only returns true when BOTH conditions hold:
 *   1. There is a valid, non-stale exam progress record in localStorage.
 *   2. The current page is the exam-agent route — so a student navigating to
 *      any other page never has exam mode activated on load.
 *
 * Mirrors the logic in exam-progress-store.getActiveProgressExamId() but is
 * intentionally inlined here (no import) to avoid a circular dep and keep the
 * context self-contained.
 */
function detectActiveExam() {
  try {
    // Only activate exam mode on the exam-agent page itself.
    if (!window.location.pathname.includes('/exam-agent')) return false
    const activeId = window.localStorage.getItem('edux.exam.active_id')
    if (!activeId) return false
    const raw = window.localStorage.getItem(`edux.exam.progress.${activeId}`)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return false
    // Discard stale drafts (> 12 h) — same threshold as exam-progress-store.
    if (parsed.savedAt && Date.now() - parsed.savedAt > 12 * 60 * 60 * 1000) return false
    return true
  } catch {
    return false
  }
}

function ExamModeProvider({ children }) {
  // Start in exam mode immediately if there is an active in-progress exam in
  // localStorage. This prevents the sidebar/topbar from flashing on page reload.
  const [examModeActive, setExamModeActive] = useState(() => detectActiveExam())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenRequestFailed, setFullscreenRequestFailed] = useState(false)
  // Tracks whether fullscreen was successfully entered at least once this session.
  // Guards the "you exited fullscreen" banner so it never shows before the
  // student has actually entered fullscreen — i.e. not on initial page load or
  // on any other page in the app.
  const [fullscreenEverEntered, setFullscreenEverEntered] = useState(false)

  /* Sync isFullscreen with the browser's native fullscreenchange event.
     This is the authoritative source — not React state from requestFullscreen()
     alone — because the student can exit via ESC without any React interaction. */
  useEffect(() => {
    const onFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
      if (active) setFullscreenEverEntered(true)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const enterExamMode = useCallback(() => {
    setExamModeActive(true)
    // Prevent the browser from navigating away via the back-swipe gesture
    // while the exam is live. The beforeunload warning is handled separately
    // inside exam-agent-live.jsx.
    document.body.style.overscrollBehavior = 'none'
  }, [])

  const exitExamMode = useCallback(() => {
    setExamModeActive(false)
    document.body.style.overscrollBehavior = ''
    // Exit fullscreen if still active (e.g. student submitted the exam).
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    setFullscreenRequestFailed(false)
    setFullscreenEverEntered(false)
  }, [])

  /**
   * Request native browser fullscreen.
   * MUST be called from a direct user-interaction handler (click, keydown, etc.)
   * so the browser grants the permission without a prompt.
   */
  const requestExamFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return
    if (document.fullscreenElement) return // already fullscreen
    setFullscreenRequestFailed(false)
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
      setFullscreenRequestFailed(true)
    })
  }, [])

  /**
   * Exit native fullscreen programmatically (e.g. student clicks
   * a "Return to Fullscreen" button that we render after ESC).
   * This itself is not a direct user-gesture entry point, so only
   * exitFullscreen (not requestFullscreen) is safe to call here.
   */
  const exitExamFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  return (
    <ExamModeContext.Provider value={{
      examModeActive, enterExamMode, exitExamMode,
      isFullscreen, fullscreenEverEntered, fullscreenRequestFailed,
      requestExamFullscreen, exitExamFullscreen,
    }}>
      {children}
    </ExamModeContext.Provider>
  )
}

function useExamMode() {
  return useContext(ExamModeContext)
}

export { ExamModeProvider, useExamMode }
export default ExamModeProvider
