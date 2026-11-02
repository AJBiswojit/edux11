/**
 * Question-bank adapter — maps live GET /faculty/question-bank payloads
 * onto the faculty UI shape and applies filters the backend currently
 * ignores (see docs/PHASE-F-BACKEND-GAP-REGISTER.md GAP-02).
 *
 * Isolation rule: University / JEE / NEET is never inferred from subject
 * name. Identity comes from payload fields (domain, examFamily, exam_mode,
 * exam_family) or, as a last resort, from backend-assigned question IDs
 * that encode family (`EA-JEE-…`, `EA-NEET-…`, `EA-UNI-…`).
 */

import { resolveMediaUrl } from '@/utils/media'
export { resolveMediaUrl }

export function titleCaseDifficulty(value) {
  if (value == null || value === '') return null
  const s = String(value)
  if (/^(easy|medium|hard)$/i.test(s)) return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
  return s
}

export function normalizeQuestionType(value) {
  if (value == null || value === '') return null
  const s = String(value)
  const lower = s.toLowerCase().replace(/[-\s]/g, '_')
  if (lower === 'mcq') return 'MCQ'
  if (lower === 'fill_in_the_blank' || lower === 'fill_in_blank' || lower === 'fib' || lower === 'numerical' || lower === 'numeric' || lower === 'integer' || lower.includes('fill_in')) {
    return 'Fill in the Blank'
  }
  return s
}

export function isFillInBlankQuestion(question) {
  if (!question) return false
  const raw = question.questionType ?? question.qType ?? question.q_type ?? question.type ?? ''
  const lower = String(raw).toLowerCase().replace(/[-\s]/g, '_')
  return lower === 'fill_in_the_blank' || lower === 'fill_in_blank' || lower === 'fib' || lower === 'numerical' || lower === 'numeric' || lower === 'integer' || lower.includes('fill_in')
}

export function canonicalDomain(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  const lower = s.toLowerCase()
  if (lower === 'university') return 'University'
  if (lower === 'competitive') return 'Competitive'
  if (s === 'University' || s === 'Competitive') return s
  return null
}

export function canonicalExamFamily(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim()
  const lower = s.toLowerCase()
  if (lower === 'jee' || lower.startsWith('jee')) return 'JEE'
  if (lower === 'neet' || lower.startsWith('neet')) return 'NEET'
  return null
}

/**
 * Last-resort identity from backend question IDs. Not subject-name inference.
 * Returns nulls when the id is not one of the seeded exam-agent prefixes.
 */
export function inferIdentityFromQuestionId(id) {
  if (!id || typeof id !== 'string') return { domain: null, examFamily: null, source: null }
  if (/^EA-JEE/i.test(id)) return { domain: 'Competitive', examFamily: 'JEE', source: 'id-prefix' }
  if (/^EA-NEET/i.test(id)) return { domain: 'Competitive', examFamily: 'NEET', source: 'id-prefix' }
  if (/^EA-UNI/i.test(id)) return { domain: 'University', examFamily: null, source: 'id-prefix' }
  return { domain: null, examFamily: null, source: null }
}

/**
 * Option display text for the faculty question UI.
 *
 * Bank questions authored by the AI question service carry structured option
 * records (`{ key, text, imageUrl }`); classic bank rows carry plain strings.
 */
export function optionText(option) {
  if (option == null) return ''
  if (typeof option === 'object') {
    for (const label of [option.text, option.label, option.key]) {
      if (label != null && String(label).trim() !== '') return String(label)
    }
    return ''
  }
  return String(option)
}

/** Preserve structured options (text + imageUrl); pass strings through. */
export function normalizeOption(option) {
  if (option == null) return null
  if (typeof option === 'string') return option
  if (typeof option === 'object') {
    return {
      key: option.key ?? null,
      text: option.text ?? option.label ?? '',
      imageUrl: resolveMediaUrl(option.imageUrl ?? option.image_url ?? null),
    }
  }
  return String(option)
}

export function normalizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null
  const fromFields = {
    domain: canonicalDomain(raw.domain ?? raw.examMode ?? raw.exam_mode ?? raw.mode),
    examFamily: canonicalExamFamily(raw.examFamily ?? raw.exam_family ?? raw.exam),
  }
  const inferred = inferIdentityFromQuestionId(raw.id)
  const domain = fromFields.domain ?? inferred.domain
  const examFamily = fromFields.examFamily ?? (domain === 'University' ? null : inferred.examFamily)
  const type = normalizeQuestionType(raw.type ?? raw.q_type ?? raw.questionType) ?? 'MCQ'
  const fib = isFillInBlankQuestion({ ...raw, type, questionType: raw.questionType ?? type })
  let options
  if (raw.options == null && fib) {
    options = null
  } else if (Array.isArray(raw.options)) {
    options = raw.options.map(normalizeOption)
  } else {
    options = []
  }
  const stemImageUrls = Array.isArray(raw.stemImageUrls)
    ? raw.stemImageUrls.map(resolveMediaUrl).filter(Boolean)
    : (raw.imageUrl || raw.stemImageUrl || raw.stem_image_url
      ? [resolveMediaUrl(raw.imageUrl || raw.stemImageUrl || raw.stem_image_url)].filter(Boolean)
      : [])
  const text = raw.text ?? raw.question ?? raw.stem ?? ''
  return {
    ...raw,
    id: raw.id,
    text,
    question: raw.question ?? text,
    type,
    questionType: raw.questionType ?? (fib ? 'fill_in_the_blank' : type),
    difficulty: titleCaseDifficulty(raw.difficulty) ?? raw.difficulty ?? null,
    domain,
    examFamily,
    exam: examFamily === 'JEE' ? 'JEE Main' : examFamily === 'NEET' ? 'NEET UG' : raw.exam ?? null,
    subject: raw.subject ?? raw.subjectCode ?? null,
    chapter: raw.chapter ?? null,
    topic: raw.topic ?? raw.concept ?? null,
    options,
    imageUrl: resolveMediaUrl(raw.imageUrl) ?? stemImageUrls[0] ?? null,
    stemImageUrls,
    correctValue: raw.correctValue ?? raw.correct_value ?? (fib ? (raw.correctOption ?? raw.correctAnswer) : null),
    status: raw.status ?? 'Approved',
    source: raw.source ?? 'Bank',
    usage: raw.usage ?? 0,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    identitySource: fromFields.domain || fromFields.examFamily ? 'payload' : inferred.source,
  }
}

function matchesDomain(question, domain) {
  if (!domain) return true
  if (domain === 'University') {
    return question.domain === 'University' || (!question.domain && !question.examFamily)
  }
  return question.domain === domain
}

function matchesExamFamily(question, examFamily) {
  const family = canonicalExamFamily(examFamily)
  if (!family) return true
  return question.examFamily === family
}

function isAllSentinel(value) {
  if (value == null || value === '') return true
  const s = String(value)
  return (
    s === 'All'
    || s === 'All subjects'
    || s === 'All chapters'
    || s === 'All topics'
    || s === 'Mixed'
  )
}

/**
 * Client-side filters over a fully-fetched bank. Backend question-bank
 * currently ignores query params (GAP-02). This is NOT server pagination.
 */
export function filterQuestions(questions, filters = {}) {
  let rows = Array.isArray(questions) ? questions : []
  if (filters.domain) rows = rows.filter((q) => matchesDomain(q, filters.domain))
  if (filters.examFamily) rows = rows.filter((q) => matchesExamFamily(q, filters.examFamily))
  if (!isAllSentinel(filters.subject)) {
    const subject = String(filters.subject)
    rows = rows.filter((q) => q.subject === subject || q.subjectCode === subject)
  }
  if (!isAllSentinel(filters.chapter)) {
    rows = rows.filter((q) => q.chapter === filters.chapter)
  }
  if (!isAllSentinel(filters.topic)) {
    rows = rows.filter((q) => q.topic === filters.topic)
  }
  if (!isAllSentinel(filters.difficulty)) {
    const difficulty = titleCaseDifficulty(filters.difficulty) ?? filters.difficulty
    rows = rows.filter((q) => q.difficulty === difficulty)
  }
  if (!isAllSentinel(filters.questionType) && filters.questionType !== 'All') {
    const type = normalizeQuestionType(filters.questionType) ?? filters.questionType
    rows = rows.filter((q) => q.type === type || q.questionType === type)
  }
  if (filters.search) {
    const needle = String(filters.search).toLowerCase()
    rows = rows.filter((q) => {
      const hay = `${q.text ?? ''} ${q.question ?? ''} ${q.topic ?? ''} ${q.chapter ?? ''} ${q.id ?? ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }
  return rows
}

export function paginateQuestions(questions, { page = 1, limit } = {}) {
  const total = questions.length
  const parsedLimit = Number(limit)
  if (!parsedLimit || parsedLimit <= 0) {
    return { items: questions, total, page: 1, limit: total, clientPaginated: false }
  }
  const p = Math.max(1, Number(page) || 1)
  const start = (p - 1) * parsedLimit
  return {
    items: questions.slice(start, start + parsedLimit),
    total,
    page: p,
    limit: parsedLimit,
    clientPaginated: true,
  }
}

export function adaptQuestionBank(payload, filters = {}) {
  const source = payload?.questions ?? payload?.items ?? (Array.isArray(payload) ? payload : [])
  const normalized = source.map(normalizeQuestion).filter(Boolean)
  const filtered = filterQuestions(normalized, filters)
  const page = paginateQuestions(filtered, { page: filters.page, limit: filters.limit })
  const summary = {
    ...(payload?.summary ?? {}),
    total: filtered.length,
  }
  return {
    ...payload,
    summary,
    questions: page.items,
    total: filtered.length,
    page: page.page,
    limit: page.limit,
    clientPaginated: page.clientPaginated,
  }
}

/* ---------- Runtime PYQ derivation from the REAL question bank ----------
 * The only production runtime question source is GET /faculty/question-bank.
 * Any surface that renders PYQ question records (University PYQ browser,
 * competitive PYQ browser, "repeated / suggested question" panels) derives
 * those records here — never from a bundled dataset or from the question
 * records embedded in other payloads (intelligence summary / PYQ analytics).
 * A question counts as PYQ when the BACKEND marks it so (isPyq / pyqYear /
 * pyqFrequency); an empty bank therefore yields an empty record list. */
export function isPyqQuestion(question) {
  if (!question) return false
  if (question.isPyq === true || question.isPyq === 'true') return true
  if ((Number(question.pyqFrequency) || 0) > 0) return true
  return question.pyqYear != null && question.pyqYear !== ''
}

/** University-domain records of a question-bank payload (never subject-name inference). */
export function isUniversityDomainQuestion(question) {
  if (!question) return false
  return question.domain === 'University' || (!question.domain && !question.examFamily)
}

/**
 * PYQ question records derived from a live question-bank array, shaped for
 * CompetitiveQuestionBrowser. `domain` filters by payload identity
 * ('University' | 'Competitive'); omit it for all PYQ records.
 */
export function bankPyqBrowserRecords(questions = [], { domain } = {}) {
  const rows = Array.isArray(questions) ? questions : []
  return rows
    .filter((q) => isPyqQuestion(q))
    .filter((q) => {
      if (!domain) return true
      if (domain === 'University') return isUniversityDomainQuestion(q)
      return q.domain === domain
    })
    .map(toCompetitiveBrowserQuestion)
    .filter(Boolean)
}

/** Shape expected by CompetitiveQuestionBrowser (exam / question / options). */
export function toCompetitiveBrowserQuestion(question) {
  if (!question) return null
  const q = question.question ?? question.text ?? ''
  let answer = question.answer ?? null
  if (answer == null && typeof question.correctAnswer === 'number') {
    answer = String.fromCharCode(65 + question.correctAnswer)
  }
  return {
    ...question,
    id: question.id,
    exam: question.exam
      ?? (question.examFamily === 'NEET' ? 'NEET UG'
        : question.examFamily === 'JEE' ? 'JEE Main'
          : question.domain === 'University' ? 'University'
            : null),
    year: question.year ?? question.pyqYear ?? null,
    session: question.session ?? null,
    subject: question.subject,
    chapter: question.chapter,
    topic: question.topic,
    difficulty: question.difficulty,
    questionType: question.questionType ?? question.type ?? 'MCQ',
    isPyq: Boolean(question.isPyq || (question.pyqFrequency ?? 0) > 0),
    marks: question.marks ?? 4,
    negativeMarks: question.negativeMarks ?? 0,
    question: q,
    options: Array.isArray(question.options) ? question.options : [],
    answer,
    explanation: question.explanation ?? null,
    pyq: question.pyq ?? {},
    bankId: question.id,
    source: question.source,
  }
}

export default {
  normalizeQuestion,
  optionText,
  filterQuestions,
  adaptQuestionBank,
  canonicalDomain,
  canonicalExamFamily,
  toCompetitiveBrowserQuestion,
  isPyqQuestion,
  isUniversityDomainQuestion,
  bankPyqBrowserRecords,
}
