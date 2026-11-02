/**
 * Exam progress persistence — protects a live attempt against internet drops,
 * refreshes and browser crashes.
 *
 * Layer 1 (this module): localStorage autosave, keyed by exam id. It survives a
 * page reload / crash on the SAME browser. Server-side autosave (Layer 2) is a
 * separate, more durable path handled by the exam-agent service.
 *
 * The stored shape is intentionally small and JSON-safe:
 *   { interactions, elapsedSeconds, current, violations, startedAtIso, savedAt }
 */

const PREFIX = 'edux.exam.progress.'
const ACTIVE_KEY = 'edux.exam.active_id'
/* Discard anything older than this — a stale draft from a previous sitting
   must never resurrect into a new attempt. Exams here run <= a few hours. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000

function keyFor(examId) {
  return `${PREFIX}${examId}`
}

export function saveProgress(examId, progress) {
  if (!examId || typeof window === 'undefined') return
  try {
    const payload = { ...progress, savedAt: Date.now() }
    window.localStorage.setItem(keyFor(examId), JSON.stringify(payload))
    window.localStorage.setItem(ACTIVE_KEY, examId)
  } catch {
    /* storage full / disabled (private mode) — silently skip, memory still holds progress */
  }
}

export function loadProgress(examId) {
  if (!examId || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyFor(examId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.savedAt && Date.now() - parsed.savedAt > MAX_AGE_MS) {
      clearProgress(examId)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function getActiveProgressExamId() {
  if (typeof window === 'undefined') return null
  try {
    const activeId = window.localStorage.getItem(ACTIVE_KEY)
    if (!activeId) return null
    const progress = loadProgress(activeId)
    if (!progress) {
      window.localStorage.removeItem(ACTIVE_KEY)
      return null
    }
    return activeId
  } catch {
    return null
  }
}

export function clearProgress(examId) {
  if (!examId || typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyFor(examId))
    const activeId = window.localStorage.getItem(ACTIVE_KEY)
    if (activeId === examId) {
      window.localStorage.removeItem(ACTIVE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export default { saveProgress, loadProgress, getActiveProgressExamId, clearProgress }
