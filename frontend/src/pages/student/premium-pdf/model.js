/**
 * Data layer for the premium PDF reports.
 *
 * This module only normalises and labels the API payload. It never draws
 * anything and never invents academic values. Missing optional fields are
 * represented by an em dash. A flattened, de-duplicated list of every source
 * primitive is kept so the renderer can append a data-preservation register
 * for any value that is not already visible in the publication.
 */

import {
  analysisPdfUser,
  formatReportTime,
  masteryFromAccuracy,
  optLetter,
} from '../exam-analysis-pdf.js'

import { buildBaseReportModel } from './base-model.js'
import { fmt, normalizeForMatch } from './theme.js'
import { normalizeQuestionContent, toDisplayText } from './questions.js'

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function sourcePrimitive(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number' || typeof value === 'string') return String(value)
  return null
}

/** Recursively collect unique primitive values from the source payload. */
export function flattenSourceValues(data) {
  const seen = new Set()
  const rows = []
  const visit = (node, path) => {
    const primitive = sourcePrimitive(node)
    if (primitive !== null) {
      const key = normalizeForMatch(primitive)
      // Punctuation-only formatting tokens are ignored; short numeric values
      // (marks, counts, times) are academic data and must be preserved.
      if (primitive.length > 0 && !/^[\s·—–\-.,;:]+$/u.test(primitive) && !seen.has(key)) {
        seen.add(key)
        rows.push({ path, value: primitive })
      }
      return
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`))
      return
    }
    if (isRecord(node)) {
      Object.entries(node).forEach(([key, value]) => visit(value, path ? `${path}.${key}` : key))
    }
  }
  visit(data ?? {}, '')
  return rows
}

function hashString(value) {
  let hash = 0x811c9dc5
  const str = String(value)
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

function normName(value) {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * Running-header title. Exam names arrive with long qualifiers such as
 * "(calibrated local equivalent)" that wrap the header onto a second line and
 * collide with the header rule. The qualifier stays on the cover and in the
 * report body; the running header keeps the identity only.
 */
export function compactExamTitle(value, limit = 48) {
  let title = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!title) return 'Examination'
  title = title.replace(/\s*[(\[][^)\]`]*[)\]]\s*$/g, '').trim() || title
  title = title.replace(/\s*[·|–—-]?\s*$/, '').trim() || title
  if (title.length > limit) {
    const cut = title.slice(0, limit)
    const at = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('-'))
    title = `${(at > limit * 0.6 ? cut.slice(0, at) : cut).replace(/[\s·|–—-]+$/, '')}…`
  }
  return title
}

function filterBySubject(rows, subject) {
  const list = Array.isArray(rows) ? rows : []
  if (!subject || subject === 'All Subjects') return list
  return list.filter((row) => (
    normName(row?.subject) === normName(subject) || normName(row?.name) === normName(subject)
  ))
}

function displayAnswer(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return toDisplayText(value, '—') || '—'
  const letter = optLetter(value)
  return letter === '—' ? fmt(value) : letter
}

/**
 * Display text for any payload value. Objects are reduced to their
 * human-readable field: a serialised object is never report content.
 */
function asText(value) {
  return toDisplayText(value, '')
}

export function buildQuestions(review, subject) {
  const rows = filterBySubject(review, subject)
  const multiple = rows.length !== (Array.isArray(review) ? review.length : 0)
  return rows.map((q, index) => {
    const content = normalizeQuestionContent(q, index)
    const explanation = content.explanation
    const hint = asText(q?.hint)
    const mistakeHint = asText(q?.mistakeHint)
    // The hint is only repeated when it adds new information.
    const solutionParts = []
    if (explanation) solutionParts.push({ label: 'Explanation', text: explanation })
    if (hint && hint !== explanation) solutionParts.push({ label: 'Solution hint', text: hint })
    if (mistakeHint && mistakeHint !== explanation && mistakeHint !== hint) {
      solutionParts.push({ label: 'Mistake note', text: mistakeHint })
    }
    return {
      index: index + 1,
      q: fmt(q?.q, `Q${index + 1}`),
      numberLabel: content.numberLabel,
      subject: fmt(q?.subject),
      chapter: fmt(q?.chapter),
      topic: fmt(q?.topic),
      difficulty: fmt(q?.difficulty, '—'),
      type: fmt(q?.type, '—'),
      status: fmt(q?.status, '—'),
      marksRaw: q?.marks,
      marks: fmt(q?.marks),
      timeRaw: q?.time,
      time: formatReportTime(q?.time),
      selectedRaw: q?.selected,
      selected: displayAnswer(q?.selected),
      correctRaw: q?.correctAnswer,
      correct: displayAnswer(q?.correctAnswer),
      mistakeCategory: fmt(q?.mistakeCategory),
      mistakeHint,
      mistakeNote: mistakeHint,
      questionText: content.statement,
      statement: content.statement,
      statementImages: content.statementImages,
      explanationImages: content.explanationImages,
      explanation: content.explanation,
      explanationParts: solutionParts,
      hint,
      options: content.options.map((option) => option.text),
      optionItems: content.options,
      figureCount: content.figureCount,
      media: { statement: [], options: {}, explanation: [], failures: [] },
      subjectScope: multiple ? subject : null,
      solutionParts,
      raw: q,
    }
  })
}

function presentRank(rank, cohort) {
  const value = fmt(rank)
  if (value === '—') return '—'
  const position = Number(String(value).replace(/[^0-9.]/g, ''))
  const size = Number(String(fmt(cohort)).replace(/[^0-9.]/g, ''))
  // Only quote the cohort size when the two numbers describe the same field.
  if (!Number.isFinite(position) || !Number.isFinite(size) || size < position) return `#${value}`
  return `#${value} of ${fmt(cohort)}`
}

/** Average time per attempted question, e.g. "1m 35s". */
function averagePace(totalSeconds, attempted) {
  const seconds = Number(totalSeconds)
  const count = Number(attempted)
  if (!Number.isFinite(seconds) || !Number.isFinite(count) || count <= 0) return '—'
  return formatReportTime(seconds / count)
}

function withRawChapter(baseChapters, rawChapters) {
  return baseChapters.map((chapter, index) => ({
    ...chapter,
    attempted: fmt(rawChapters[index]?.attempted),
    questions: fmt(rawChapters[index]?.questions ?? rawChapters[index]?.n),
    mastery: chapter.mastery || masteryFromAccuracy(chapter.accuracy),
  }))
}

export function buildPremiumModel({ data = {}, subject, user, generatedAt, kind = 'full' } = {}) {
  const base = buildBaseReportModel({ data, subject, user, generatedAt })
  const when = generatedAt instanceof Date ? generatedAt : new Date(generatedAt || Date.now())
  const meta = data?.meta ?? {}
  const hero = data?.hero ?? {}
  const qi = data?.questionIntelligence ?? {}
  const isAll = subject === 'All Subjects' || !subject
  const activeSubject = isAll ? null : subject

  const examId = fmt(meta.examId)
  const examName = fmt(meta.examName || hero.examName, 'Examination')
  const student = analysisPdfUser(data, user) || {}
  const who = [student.fullName, student.rollNo ? `Roll ${student.rollNo}` : null].filter(Boolean).join('  ·  ')
  const generatedDate = when.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const status = fmt(meta.examStatus ?? meta.status ?? hero.status, '—')

  const raw = {
    subjects: Array.isArray(data.subjects) ? data.subjects : [],
    chapters: Array.isArray(data.chapters) ? data.chapters : [],
    topics: Array.isArray(data.topics) ? data.topics : [],
    mistakes: Array.isArray(data.mistakes) ? data.mistakes : [],
    mistakeList: Array.isArray(data.mistakeList) ? data.mistakeList : [],
    difficulty: Array.isArray(data.difficulty) ? data.difficulty : [],
    questionReview: Array.isArray(data.questionReview) ? data.questionReview : [],
  }

  const display = {
    subjects: filterBySubject(raw.subjects, activeSubject),
    chapters: filterBySubject(raw.chapters, activeSubject),
    topics: filterBySubject(raw.topics, activeSubject),
    mistakes: raw.mistakes,
    mistakeList: filterBySubject(raw.mistakeList, activeSubject),
    difficulty: raw.difficulty,
    questionReview: filterBySubject(raw.questionReview, activeSubject),
  }

  const baseChapters = base.chapters.map((chapter, index) => ({
    ...chapter,
    attempted: fmt(display.chapters[index]?.attempted),
    questions: fmt(display.chapters[index]?.questions ?? display.chapters[index]?.n),
  }))

  const questions = buildQuestions(display.questionReview, activeSubject)
  const sourceValues = flattenSourceValues(data)
  const subjectValues = display.subjects.map((row, index) => ({
    ...row,
    scoreLabel: `${fmt(row.score)} / ${fmt(row.maxMarks)}`,
    accuracyLabel: fmt(row.accuracy),
    timeLabel: fmt(row.time),
    weakAreas: Array.isArray(row.weakAreas) ? row.weakAreas.map(asText) : [],
    strongAreas: Array.isArray(row.strongAreas) ? row.strongAreas.map(asText) : [],
    index,
  }))

  return {
    kind,
    reportCode: kind === 'full' ? 'FAR' : 'EIR',
    reportTitle: kind === 'full' ? 'FULL EXAM ANALYSIS REPORT' : 'EXAM INTELLIGENCE REPORT',
    reportLabel: kind === 'full' ? 'FULL EXAM ANALYSIS' : 'EXAM INTELLIGENCE REPORT',
    // Internal only: used for diagnostics and file naming, never printed in the PDF.
    reportId: `${kind === 'full' ? 'FAR' : 'EIR'} / ${examId}`,
    examId,
    examName,
    examTitleShort: compactExamTitle(examName),
    subjectText: base.subjectText,
    activeSubject,
    who,
    studentName: fmt(student.fullName, fmt(meta.student, '—')),
    rollNo: fmt(student.rollNo, fmt(meta.rollNo, '—')),
    generatedDate,
    generatedAtISO: when.toISOString(),
    status,
    pattern: base.pattern,
    examDate: base.examDate,
    durationLabel: base.durationLabel,
    sections: Array.isArray(meta.sections) ? meta.sections : [],
    course: fmt(meta.course),
    totalMarks: fmt(meta.totalMarks),
    sourceHash: hashString(JSON.stringify(data ?? {})),

    meta,
    hero,
    qi,
    scoreLine: base.scoreLine,
    breakdownLine: base.breakdownLine,
    scorePct: base.scorePct,
    accuracy: base.accuracy,
    successRate: fmt(qi.successRate),
    questionAccuracy: fmt(qi.accuracy),
    overallAccuracy: fmt(hero.overallAccuracy),
    // Secondary cover signals that are not already printed in the hero block.
    rankLabel: presentRank(hero.rank, hero.cohortSize),
    percentileLabel: fmt(hero.percentile),
    paceLabel: averagePace(data?.attempt?.elapsedSeconds, qi.attempted ?? base.attempted),
    attempted: fmt(qi.attempted ?? base.attempted),
    timeTakenLabel: base.timeTakenLabel,
    hasTime: base.hasTime,
    aiSummary: asText(hero.aiSummary),

    subjects: base.subjects,
    subjectValues,
    chapters: baseChapters,
    hasChapterTime: base.hasChapterTime,
    topics: display.topics,
    mistakes: base.mistakes,
    mistakeList: display.mistakeList,
    difficulty: display.difficulty,
    recommendations: data.recommendations ?? {},
    comparison: data.comparison ?? {},
    prediction: data.prediction ?? {},
    timeIntelligence: data.timeIntelligence ?? {},
    cognitiveQuadrants: data.cognitiveQuadrants ?? {},
    revisionGroups: base.revisionGroups,
    questions,
    figureQuestionCount: questions.filter((question) => (question.figureCount || 0) > 0).length,
    figureReferenceCount: questions.reduce((sum, question) => sum + (question.figureCount || 0), 0),
    totalQuestions: fmt(qi.total, String(questions.length)),
    questionRowsSupplied: questions.length,
    sourceValues,
    raw,
    base,
  }
}

export function buildPremiumFullModel(options) {
  return buildPremiumModel({ ...options, kind: 'full' })
}

export function buildPremiumIntelligenceModel(options) {
  return buildPremiumModel({ ...options, kind: 'intelligence' })
}
