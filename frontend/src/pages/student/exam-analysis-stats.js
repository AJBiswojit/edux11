/**
 * Display helpers for the AI Exam Analysis dashboard.
 * KPI chips and per-subject counts are derived on this page from the
 * analysis payload. Nothing here writes to the analysis API or other engines.
 */

function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function roundPct(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 1000) / 10
}

/** Total questions on the paper. Backend payloads omit `total`; recover it. */
export function questionPaperTotal(qi = {}) {
  const attempted = toNumber(qi.attempted)
  const skipped = toNumber(qi.skipped)
  const explicit = toNumber(qi.total)
  if (explicit > 0) return explicit
  const ratio = toNumber(qi.attemptRatio)
  if (ratio > 0 && attempted > 0) return Math.round(attempted / (ratio / 100))
  return attempted + skipped
}

function statusOf(row) {
  return String(row?.status ?? '').trim().toLowerCase()
}

function sameSubject(row, name) {
  return String(row?.subject ?? '').trim().toLowerCase() === String(name ?? '').trim().toLowerCase()
}

/**
 * Per-subject question counts for the subject cards on the analysis page.
 * Calculated from questionReview so JEE (Phy/Chem/Math) and NEET
 * (Phy/Chem/Bio) each get their own totals. Display-only — does not
 * change the analysis API or other services.
 */
export function subjectQuestionStats(subject = {}, questionReview = []) {
  const name = subject?.name
  const rows = (questionReview ?? []).filter((row) => sameSubject(row, name))

  if (rows.length) {
    const correct = rows.filter((row) => statusOf(row) === 'correct').length
    const incorrect = rows.filter((row) => statusOf(row) === 'incorrect').length
    const attempted = rows.filter((row) => {
      const status = statusOf(row)
      return status === 'correct' || status === 'incorrect'
    }).length
    return {
      questions: rows.length,
      attempted,
      correct,
      incorrect,
      skipped: rows.length - attempted,
    }
  }

  const attempted = toNumber(subject.attempted)
  const correct = toNumber(subject.correct)
  const skipped = toNumber(subject.skipped ?? subject.unattempted)
  const questions = toNumber(subject.questions) || toNumber(subject.total) || attempted + skipped
  const incorrect = toNumber(subject.incorrect) || Math.max(0, attempted - correct)
  return { questions, attempted, correct, incorrect, skipped }
}

/** Batch rank for one subject, as supplied by the analysis payload. */
export function subjectCardRank(subject = {}) {
  const n = Number(subject?.rank)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** JEE / NEET from the analysis payload only — not from subject names. */
export function analysisExamFamily(data = {}) {
  const blob = [
    data?.examFamily,
    data?.meta?.pattern,
    data?.hero?.rankMethod,
    ...((data?.subjects ?? []).map((s) => s?.rankMethod)),
  ].filter(Boolean).join(' ')
  if (/NEET/i.test(blob)) return 'NEET'
  if (/JEE/i.test(blob)) return 'JEE'
  return null
}

function finitePercentile(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** NTA session percentile for a JEE subject card. Hidden for NEET. */
export function subjectCardPercentile(subject = {}, family = null) {
  const method = String(subject?.rankMethod || '')
  if (family === 'NEET' || /NEET/i.test(method)) return null
  return finitePercentile(subject?.ntaPercentile)
}

export function formatNtaPercentile(value) {
  const n = finitePercentile(value)
  return n == null ? null : n.toFixed(7)
}

/** Hero NTA percentile badge. JEE only — NEET AIR is marks, not percentile. */
export function heroNtaPercentile(hero = {}, family = null) {
  const method = String(hero?.rankMethod || '')
  if (family === 'NEET' || /NEET/i.test(method)) return null
  return finitePercentile(hero?.ntaPercentile)
}

/** Comparison %ile extras. Hidden on NEET analysis (no NTA percentile). */
export function comparisonPercentileLabel(percentile, family = null) {
  if (family === 'NEET') return null
  if (percentile == null || percentile === '') return null
  const n = Number(percentile)
  return Number.isFinite(n) ? `${n}%ile` : null
}

/** Batch-scoped NTA AIR (JEE / NEET) for the analysis hero. Display only. */
export function heroAirLabel(hero = {}) {
  const rank = Number(hero?.batchRank)
  if (!Number.isFinite(rank) || rank < 1) return null
  const method = String(hero?.rankMethod || '')
  const cohort = Number(hero?.cohortSize)
  const title = method === 'JEE-NTA' || method === 'NEET-NTA' ? `Batch AIR #${rank}` : `Batch rank #${rank}`
  if (Number.isFinite(cohort) && cohort > 0) return `${title} · ${cohort}`
  return title
}

/** Spacing for the five subject-card counts. Change pad/gap here only. */
export const SUBJECT_STAT_SPACING = {
  pad: 'py-1 px-0',
  gap: 'gap-x-5 gap-y-1.5',
}

export function subjectStatCells(stats = {}) {
  const { questions = 0, attempted = 0, correct = 0, incorrect = 0, skipped = 0 } = stats
  return [
    { label: 'Questions', value: questions },
    { label: 'Attempted', value: attempted },
    { label: 'Correct', value: correct },
    { label: 'Incorrect', value: incorrect },
    { label: 'Skipped', value: skipped },
  ]
}

/**
 * Four StatCard configs. Lower chips are always percentages (display-only).
 *   Attempted / Skipped → percentage of the paper
 *   Correct             → success rate (% of attempted)
 *   Incorrect           → error rate (% of attempted)
 */
export function buildQuestionIntelligenceCards(qi = {}) {
  const attempted = toNumber(qi.attempted)
  const correct = toNumber(qi.correct)
  const incorrect = toNumber(qi.incorrect)
  const skipped = toNumber(qi.skipped)
  const total = questionPaperTotal(qi)

  const attemptRatio = qi.attemptRatio != null && qi.attemptRatio !== ''
    ? toNumber(qi.attemptRatio)
    : roundPct(attempted, total)
  const skipRate = roundPct(skipped, total)

  const successRate = qi.successRate != null && qi.successRate !== ''
    ? toNumber(qi.successRate)
    : roundPct(correct, attempted)
  const errorRate = roundPct(incorrect, attempted)

  return [
    { label: 'Attempted', value: String(attempted), delta: `${attemptRatio}% attempt ratio`, up: true, icon: 'ListChecks', gradient: 'from-indigo-500 to-blue-500' },
    { label: 'Correct', value: String(correct), delta: `${successRate}% success rate`, up: true, icon: 'CheckCircle2', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Incorrect', value: String(incorrect), delta: `${errorRate}% error rate`, up: false, icon: 'XCircle', gradient: 'from-rose-500 to-red-500' },
    { label: 'Skipped', value: String(skipped), delta: `${skipRate}% skip rate`, up: false, icon: 'MinusCircle', gradient: 'from-amber-500 to-orange-500' },
  ]
}

/** First-paint window for the question-by-question review table. Display-only. */
export const QUESTION_REVIEW_PAGE_SIZE = 20

/**
 * Slice the review list so the analysis page only mounts 20 question rows
 * at a time. Does not change the analysis payload or any other service.
 */
export function paginateQuestionReview(list = [], page = 1, pageSize = QUESTION_REVIEW_PAGE_SIZE) {
  const items = Array.isArray(list) ? list : []
  const total = items.length
  const size = Math.max(1, Number(pageSize) || QUESTION_REVIEW_PAGE_SIZE)
  const totalPages = Math.max(1, Math.ceil(total / size) || 1)
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const startIdx = (safePage - 1) * size
  const slice = items.slice(startIdx, startIdx + size)
  return {
    items: slice,
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    start: total === 0 ? 0 : startIdx + 1,
    end: startIdx + slice.length,
    hasPrev: safePage > 1,
    hasNext: safePage < totalPages && total > 0,
  }
}
