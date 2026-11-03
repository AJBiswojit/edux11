/**
 * Accuracy derived from a complete question-result set or trusted aggregate
 * answer counts. Accuracy excludes skipped questions and is distinct from
 * score percentage.
 */

function countValue(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(String(value).replace(/,/g, '').trim())
  return Number.isSafeInteger(number) && number >= 0 ? number : null
}

function statusValue(row) {
  const raw = row?.status ?? row?.result ?? row?.outcome ?? row?.answerStatus
  const normalized = String(raw ?? '').trim().toLowerCase().replace(/[\s_-]+/g, ' ')
  if (/^(?:skip(?:ped)?|unattempted|not attempted|not visited|omitted|blank)$/i.test(normalized)) return normalized
  if (/^(?:correct|right|fully correct|success|incorrect|wrong|error|partial|partially correct)$/i.test(normalized)) return normalized
  if (typeof row?.isCorrect === 'boolean') return row.isCorrect ? 'correct' : 'incorrect'
  if (typeof row?.correct === 'boolean') return row.correct ? 'correct' : 'incorrect'
  return normalized
}

function questionKey(row, index) {
  const id = row?.questionId ?? row?.question_id ?? row?.id ?? row?.q ?? row?.questionNumber ?? row?.number ?? row?.index
  if (id === null || id === undefined || id === '') return `row:${index}`
  return `${String(row?.subject ?? '').trim().toLowerCase()}:${String(id).trim().toLowerCase()}`
}

function tallyQuestionResults(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const unique = new Map()
  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    const key = questionKey(row, index)
    if (!unique.has(key)) unique.set(key, statusValue(row))
  })
  if (!unique.size) return null
  let correct = 0
  let incorrect = 0
  let skipped = 0
  for (const status of unique.values()) {
    if (/^(?:correct|right|fully correct|success)$/i.test(status)) correct += 1
    else if (/^(?:incorrect|wrong|error|partial|partially correct)$/i.test(status)) incorrect += 1
    else if (/^(?:skip(?:ped)?|unattempted|not attempted|not visited|omitted|blank)$/i.test(status)) skipped += 1
    else return null
  }
  return { correct, incorrect, skipped, attempted: correct + incorrect, uniqueQuestions: unique.size }
}

function aggregateCounts(source = {}) {
  const correct = countValue(source.correct ?? source.correctCount ?? source.correctAnswers)
  const incorrect = countValue(source.incorrect ?? source.incorrectCount ?? source.incorrectAnswers)
  if (correct === null || incorrect === null) return null
  const skipped = countValue(source.skipped ?? source.skippedCount ?? source.unattempted ?? source.unattemptedCount)
  return { correct, incorrect, skipped, attempted: correct + incorrect }
}

function questionRows(data = {}) {
  return data.questionReview
    ?? data.questionResults
    ?? data.questions
    ?? data.attempt?.questionReview
    ?? data.attempt?.questionResults
    ?? data.attempt?.questions
}

/**
 * Return counts plus a two-decimal percentage, or `accuracy: null` when the
 * number cannot be supported by actual detailed results or real aggregates.
 * When a review list is visibly partial, published aggregate counts take
 * precedence; question rows are only used when they cover the declared total.
 */
export function calculateOverallAccuracy(input = {}) {
  const data = Array.isArray(input) ? { questionReview: input } : input || {}
  const intelligence = data.questionIntelligence ?? data.qi ?? data
  const rows = questionRows(data)
  const total = countValue(intelligence.total ?? intelligence.totalQuestions ?? data.totalQuestions)
  const detailed = tallyQuestionResults(rows)
  const detailedComplete = detailed && total !== null && detailed.uniqueQuestions >= total
  const aggregate = aggregateCounts(intelligence) || aggregateCounts(data.hero) || aggregateCounts(data)
  const counts = detailedComplete ? detailed : aggregate || detailed

  if (!counts) {
    return { correct: null, incorrect: null, skipped: null, attempted: null, accuracy: null, source: null }
  }
  const accuracy = counts.attempted > 0
    ? Math.round((counts.correct / counts.attempted) * 10000) / 100
    : null
  return { ...counts, accuracy, source: detailedComplete ? 'question-results' : aggregate ? 'aggregate-counts' : 'question-results' }
}

export function scorePercentage(score, total, fallback = null) {
  const obtained = score === null || score === undefined || score === '' ? NaN : Number(score)
  const maximum = total === null || total === undefined || total === '' ? NaN : Number(total)
  if (Number.isFinite(obtained) && Number.isFinite(maximum) && maximum > 0) {
    return Math.round((obtained / maximum) * 10000) / 100
  }
  if (fallback === null || fallback === undefined || fallback === '') return null
  const published = Number(String(fallback).replace('%', '').trim())
  return Number.isFinite(published) ? Math.round(published * 100) / 100 : null
}

export function formatPercent(value, digits = 2) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(String(value).replace('%', '').trim())
  if (!Number.isFinite(n)) return ''
  return `${Number(n.toFixed(digits))}%`
}
