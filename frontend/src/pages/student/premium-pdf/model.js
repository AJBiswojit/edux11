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
  buildReportModel,
  formatReportTime,
  masteryFromAccuracy,
  optLetter,
} from '../exam-analysis-pdf.js'

import { fmt, normalizeForMatch } from './theme.js'

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

function filterBySubject(rows, subject) {
  const list = Array.isArray(rows) ? rows : []
  if (!subject || subject === 'All Subjects') return list
  return list.filter((row) => (
    normName(row?.subject) === normName(subject) || normName(row?.name) === normName(subject)
  ))
}

function displayAnswer(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  const letter = optLetter(value)
  return letter === '—' ? fmt(value) : letter
}

function asText(value) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function buildQuestions(review, subject) {
  return filterBySubject(review, subject).map((q, index) => {
    const explanation = asText(q?.explanation ?? q?.solution)
    const hint = asText(q?.hint)
    const mistakeHint = asText(q?.mistakeHint)
    const solutionParts = []
    if (explanation) solutionParts.push({ label: 'Explanation', text: explanation })
    if (hint && hint !== explanation) solutionParts.push({ label: 'Solution / hint', text: hint })
    if (mistakeHint && mistakeHint !== explanation && mistakeHint !== hint) {
      solutionParts.push({ label: 'Mistake note', text: mistakeHint })
    }
    const options = Array.isArray(q?.options) ? q.options.map((option) => asText(option)) : []
    return {
      index: index + 1,
      q: fmt(q?.q, `Q${index + 1}`),
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
      questionText: asText(q?.text ?? q?.question ?? q?.stem),
      options,
      explanation,
      hint,
      solutionParts,
      raw: q,
    }
  })
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
  const base = buildReportModel({ data, subject, user, generatedAt })
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
    reportId: `${kind === 'full' ? 'FAR' : 'EIR'} / ${examId}`,
    examId,
    examName,
    examTitleShort: examName,
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
