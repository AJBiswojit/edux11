/**
 * Faculty Intelligence · Micro-Assessment Studio engine.
 *
 * The engine contains the deterministic prototype behaviour behind the API
 * boundary. It deliberately does not call an LLM, infer context from a
 * subject name, or write to the official ExamAttempt store.
 */

import { generateQuestions as generateStudioQuestions } from './question-studio.js'

export const MICRO_ASSESSMENT_COUNTS = [5, 10, 15, 20]
export const MICRO_ASSESSMENT_DIFFICULTIES = ['Mixed', 'Easy', 'Medium', 'Hard']

/* Question taxonomy contract — the accepted exam-family vocabulary for a
   competitive micro-assessment source. This is configuration, not seeded
   content; sources are supplied to the engine as injectable parameters. */
export const MICRO_ASSESSMENT_EXAM_FAMILIES = ['JEE', 'NEET']
export const MICRO_ASSESSMENT_SOURCE_TYPES = [
  'Textbook',
  'NCERT',
  'Lecture Notes',
  'PDF',
  'Faculty Notes',
  'Custom Text',
  'NCERT / Study Material',
  'Study Material',
]
export const MICRO_ASSESSMENT_DOMAINS = ['university', 'competitive']

const QUESTION_TYPES = [
  'Short Answer',
  'Fill in the Blank',
  'Direct MCQ',
  'Statement Based',
  'Multiple Statement',
  'Application Based',
  'Conceptual',
  'Why / Reasoning',
  'Match the Following',
  'Diagram Based',
]

export function normalizeMicroDomain(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (normalized === 'university') return 'university'
  if (normalized === 'competitive') return 'competitive'
  return normalized || null
}

export function normalizeExamFamily(value) {
  const normalized = String(value ?? '').trim().toUpperCase()
  return MICRO_ASSESSMENT_EXAM_FAMILIES.includes(normalized) ? normalized : null
}

/**
 * Strict context comparison. A University source never has an exam family;
 * Competitive sources must match their family. Subject is only compared
 * after domain/family, never used to infer either one.
 */
export function sameMicroContext(a = {}, b = {}) {
  const aDomain = normalizeMicroDomain(a.domain)
  const bDomain = normalizeMicroDomain(b.domain)
  const aFamily = aDomain === 'competitive' ? normalizeExamFamily(a.examFamily) : null
  const bFamily = bDomain === 'competitive' ? normalizeExamFamily(b.examFamily) : null
  return aDomain === bDomain
    && aFamily === bFamily
    && String(a.subject ?? '') === String(b.subject ?? '')
    && String(a.chapter ?? '') === String(b.chapter ?? '')
    && String(a.topic ?? '') === String(b.topic ?? '')
}

export function sourceContextLabel(source = {}) {
  const domain = normalizeMicroDomain(source.domain)
  if (domain === 'university') return 'University'
  if (domain === 'competitive') return `${source.examFamily ?? 'Competitive'} · Competitive`
  return 'Custom'
}

function safeWordCount(content = '') {
  return String(content).trim().split(/\s+/).filter(Boolean).length
}

function slug(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom'
}

export function validateMicroSourceInput(input = {}) {
  const errors = {}
  const content = String(input.content ?? '').trim()
  if (!content) errors.content = 'Paste a paragraph or choose a sample source.'
  else if (safeWordCount(content) < 12) errors.content = 'Add a little more source material (at least 12 words) so the prototype can find useful concepts.'
  if (!String(input.subject ?? '').trim()) errors.subject = 'Subject is required.'
  if (!String(input.chapter ?? '').trim()) errors.chapter = 'Chapter is required.'
  if (!String(input.topic ?? '').trim()) errors.topic = 'Topic is required.'
  const domain = normalizeMicroDomain(input.domain)
  if (domain === 'competitive' && !normalizeExamFamily(input.examFamily)) errors.examFamily = 'Choose JEE or NEET for a competitive source.'
  if (domain === 'university' && input.examFamily) errors.examFamily = 'University sources cannot carry a competitive exam family.'
  return { valid: Object.keys(errors).length === 0, errors }
}

function customQuestions(source) {
  const concepts = source.detectedConcepts?.length ? source.detectedConcepts : ['Core definition', 'Key relationship', 'Application context']
  const topic = source.topic || 'the source topic'
  const chapter = source.chapter || 'the source chapter'
  const make = (id, questionType, difficulty, concept, question, options, correctAnswer, explanation) => ({
    id: `${source.id}-q${id}`,
    question,
    questionType,
    difficulty,
    chapter,
    topic,
    concept,
    options: options ?? [],
    correctAnswer,
    answerIndex: typeof correctAnswer === 'number' ? correctAnswer : null,
    explanation,
    sourceId: source.id,
  })
  return [
    make('01', 'Direct MCQ', 'Easy', concepts[0], `Which idea is introduced most directly by the source's discussion of ${topic}?`, [`${concepts[0]}`, 'An unrelated historical date', 'A laboratory safety rule', 'A separate subject area'], 0, `The source metadata identifies ${concepts[0]} as a central idea in ${topic}.`),
    make('02', 'Conceptual', 'Medium', concepts[1] ?? concepts[0], `Which statement best describes the relationship highlighted in this source about ${topic}?`, [`It connects ${concepts[0]} with ${concepts[1] ?? 'the key relationship'}`, 'It denies every relationship', 'It applies only to an unrelated topic', 'It depends on a fact not present in the source'], 0, 'This option stays within the concepts declared for the faculty source.'),
    make('03', 'Application Based', 'Medium', concepts[2] ?? concepts[0], `A learner applies the source to a new example in ${chapter}. What should the learner check first?`, ['Whether the example satisfies the stated conditions', 'Whether the topic can be ignored', 'Whether the answer is always zero', 'Whether a different subject is substituted'], 0, 'Application begins by checking whether the example meets the conditions in the source.'),
    make('04', 'Statement Based', 'Medium', concepts[0], `Statement: ${concepts[0]} is a relevant concept for ${topic}. This statement is:`, ['Supported by the source metadata', 'Contradicted by every sentence', 'Unrelated to the source', 'Impossible to evaluate in principle'], 0, 'The concept is explicitly part of the source understanding layer.'),
    make('05', 'Fill in the Blank', 'Easy', concepts[1] ?? concepts[0], `The source is organized under the topic of ______.`, [], topic, 'The topic is supplied by the faculty source metadata.'),
    make('06', 'Short Answer', 'Medium', concepts[0], `Name one concept a learner should retain after reading the source.`, [], concepts[0], 'The answer is grounded in the source concept list.'),
    make('07', 'Why / Reasoning', 'Hard', concepts[2] ?? concepts[0], `Why is it useful to connect ${concepts[0]} with an application example?`, ['It tests whether the idea transfers beyond its definition', 'It removes the need to read the source', 'It guarantees every problem has the same answer', 'It changes the source into a different subject'], 0, 'A formative application check reveals whether a concept can be used, not only recalled.'),
    make('08', 'Multiple Statement', 'Hard', concepts.slice(0, 2).join(' and '), `Which statements are consistent with the ${topic} source? I. It has a defined concept structure. II. It supports review questions. III. It requires a real LLM.`, ['I and II only', 'I and III only', 'II and III only', 'I, II and III'], 0, 'The prototype derives questions from structured metadata and does not call a real LLM.'),
    make('09', 'Match the Following', 'Medium', concepts[0], `Match the source layer with its role: concept — ?; opportunity — ?`, ['Idea to assess; possible formative question angle', 'Deadline; student roll number', 'Exam mark; attendance total'], 0, 'Concepts describe what was understood; opportunities describe how it may be checked.'),
    make('10', 'Diagram Based', 'Medium', concepts[1] ?? concepts[0], `A diagram for ${topic} labels ${concepts[0]}. What should the label identify?`, [`The ${concepts[0]} part or relationship`, 'A random decoration', 'A deadline unrelated to the source', 'A student identity'], 0, 'A diagram-based check should point back to a source-grounded structure.'),
  ]
}

/** Construct a transient source for pasted material while retaining the same
 * source contract used by a library source. */
export function buildMicroSource(input = {}, base = null) {
  const domain = normalizeMicroDomain(input.domain ?? base?.domain) ?? 'university'
  const examFamily = domain === 'competitive'
    ? normalizeExamFamily(input.examFamily ?? base?.examFamily)
    : null
  const id = input.id ?? base?.id ?? `custom-${slug(input.topic ?? input.title ?? 'source')}`
  const content = String(input.content ?? base?.content ?? '').trim()
  const subject = String(input.subject ?? base?.subject ?? '').trim()
  const chapter = String(input.chapter ?? base?.chapter ?? '').trim()
  const topic = String(input.topic ?? base?.topic ?? '').trim()
  const detectedConcepts = input.detectedConcepts?.length
    ? input.detectedConcepts
    : base?.detectedConcepts?.length
      ? base.detectedConcepts
      : [topic || 'Core idea', `${topic || 'Key'} relationship`, 'Application context']
  const questionOpportunities = input.questionOpportunities?.length
    ? input.questionOpportunities
    : base?.questionOpportunities?.length
      ? base.questionOpportunities
      : ['Definition', 'Conceptual relationship', 'Application', 'Statement evaluation']
  const source = {
    ...(base ?? {}),
    id,
    title: String(input.title ?? base?.title ?? `${topic || 'Untitled'} source`).trim(),
    domain,
    examFamily,
    subject,
    chapter,
    topic,
    sourceType: input.sourceType ?? base?.sourceType ?? 'Custom Text',
    content,
    wordCount: safeWordCount(content),
    estimatedReadingTime: Math.max(1, Math.ceil(safeWordCount(content) / 200)),
    detectedConcepts,
    questionOpportunities,
  }
  const inheritedQuestions = input.generatedQuestions ?? base?.generatedQuestions
  source.generatedQuestions = inheritedQuestions?.map((question) => ({
    ...question,
    sourceId: id,
    chapter: source.chapter,
    topic: source.topic,
  })) ?? customQuestions(source)
  return source
}

export function findMicroSource(id, sources = []) {
  return sources.find((source) => source.id === id) ?? null
}

export function filterMicroSources(filters = {}, sources = []) {
  let items = [...sources]
  const optionalFilter = (value) => {
    const normalized = String(value ?? '').trim()
    return !normalized || normalized.toLowerCase().startsWith('all') ? '' : normalized
  }
  const domain = optionalFilter(filters.domain) ? normalizeMicroDomain(optionalFilter(filters.domain)) : null
  const examFamily = optionalFilter(filters.examFamily) ? normalizeExamFamily(optionalFilter(filters.examFamily)) : null
  const sourceType = optionalFilter(filters.sourceType)
  const subject = optionalFilter(filters.subject)
  const chapter = optionalFilter(filters.chapter)
  const topic = optionalFilter(filters.topic)
  const search = String(filters.search ?? '').trim().toLowerCase()
  if (domain) items = items.filter((source) => normalizeMicroDomain(source.domain) === domain)
  /* Exam family is meaningful only inside Competitive. This prevents a
     University Physics source from appearing in a JEE/NEET filter. */
  if (examFamily) items = items.filter((source) => normalizeMicroDomain(source.domain) === 'competitive' && source.examFamily === examFamily)
  if (subject && subject !== 'All') items = items.filter((source) => source.subject === subject)
  if (chapter && chapter !== 'All') items = items.filter((source) => source.chapter === chapter)
  if (topic && topic !== 'All') items = items.filter((source) => source.topic === topic)
  if (sourceType && sourceType !== 'All') items = items.filter((source) => source.sourceType === sourceType)
  if (search) {
    items = items.filter((source) => [source.title, source.subject, source.chapter, source.topic, source.sourceType, source.examFamily, source.content]
      .filter(Boolean).join(' ').toLowerCase().includes(search))
  }
  return items
}

export function processMicroSource(sourceInput, base = null) {
  const source = buildMicroSource(sourceInput, base)
  const validation = validateMicroSourceInput(source)
  if (!validation.valid) return { ok: false, errors: validation.errors, source }
  return {
    ok: true,
    source,
    understanding: {
      chapter: source.chapter,
      topic: source.topic,
      concepts: source.detectedConcepts,
      importantFacts: source.questionOpportunities.map((opportunity) => `Potential ${opportunity.toLowerCase()} area in ${source.topic}.`),
      questionOpportunities: source.questionOpportunities,
      context: sourceContextLabel(source),
    },
    processingSteps: ['Reading source', 'Identifying concepts', 'Finding question opportunities', 'Preparing assessment'],
    note: 'Prototype AI Understanding — deterministic processing derived from source metadata; no real LLM call.',
  }
}

function stableVariants(source, baseQuestions) {
  const variants = []
  baseQuestions.forEach((question, index) => {
    const variantNumber = index + 1
    variants.push({
      ...question,
      id: `${question.id}-extension-${variantNumber}`,
      question: `${question.question} Use the same source-grounded reasoning and select the answer that remains consistent.`,
      explanation: `${question.explanation} This deterministic extension keeps the same source concept and answer while checking transfer.`,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceReference: `${source.chapter} · ${source.topic}`,
      generationMetadata: {
        kind: 'source-pool-extension',
        variantNumber,
      },
    })
  })
  return variants
}

function questionPoolFor(source) {
  const base = source.generatedQuestions?.length ? source.generatedQuestions : customQuestions(source)
  return [...base, ...stableVariants(source, base)].slice(0, 20)
}

export function computeQuestionDiversity(questions = []) {
  if (!questions.length) return 0
  const types = new Set(questions.map((question) => question.questionType)).size
  const concepts = new Set(questions.map((question) => question.concept)).size
  const difficulties = new Set(questions.map((question) => question.difficulty)).size
  const typeScore = Math.min(1, types / Math.min(9, questions.length))
  const conceptScore = Math.min(1, concepts / Math.min(6, questions.length))
  const difficultyScore = Math.min(1, difficulties / 3)
  return Math.round((typeScore * 0.5 + conceptScore * 0.3 + difficultyScore * 0.2) * 100)
}

export function computeConceptCoverage(questions = [], source = {}) {
  const concepts = source.detectedConcepts?.length
    ? source.detectedConcepts
    : [...new Set(questions.map((question) => question.concept).filter(Boolean))]
  const counts = concepts.map((concept) => ({ concept, count: questions.filter((question) => question.concept === concept).length }))
  const max = Math.max(1, ...counts.map((item) => item.count))
  return counts.map((item) => ({
    ...item,
    percentage: Math.round((item.count / max) * 100),
    covered: item.count > 0,
  }))
}

export function validateGeneratedQuestion(question, source, seenIds = []) {
  const options = question.options ?? []
  const answerSupported = options.length === 0 || options.includes(question.correctAnswer)
  return {
    sourceGrounded: question.sourceId === source.id && question.chapter === source.chapter && question.topic === source.topic,
    answerSupported,
    noDuplicate: !seenIds.includes(question.id),
    label: 'Prototype AI Validation',
  }
}

function studioSourceFor(source, pool) {
  return {
    sourceId: source.id,
    title: source.title,
    sourceType: source.sourceType,
    domain: source.domain === 'university' ? 'University' : 'Competitive',
    exam: source.examFamily === 'JEE' ? 'JEE Main' : source.examFamily === 'NEET' ? 'NEET UG' : null,
    subject: source.subject,
    chapter: source.chapter,
    questionCountGenerated: 20,
    questionPatterns: [...new Set(pool.map((question) => question.questionType))],
    topics: [{ topic: source.topic, concepts: source.detectedConcepts }],
    concepts: source.detectedConcepts,
  }
}

function studioPoolFor(pool) {
  return pool.map((question) => ({
    ...question,
    qType: question.questionType,
    sourcePage: 1,
    sourceReference: `${question.chapter} · ${question.topic}`,
  }))
}

export function generateMicroQuestions({ source: sourceInput, count = 10, difficulty = 'Mixed', questionTypes = [] } = {}) {
  const source = buildMicroSource(sourceInput)
  const requested = MICRO_ASSESSMENT_COUNTS.includes(Number(count)) ? Number(count) : 10
  const typeFilter = Array.isArray(questionTypes) && questionTypes.length ? questionTypes : undefined
  const pool = questionPoolFor(source)
  const studioSource = studioSourceFor(source, pool)
  const result = generateStudioQuestions({
    source: studioSource,
    poolOverride: studioPoolFor(pool),
    settings: {
      count: requested,
      difficulty: difficulty === 'Mixed' ? 'Balanced' : difficulty,
      topic: 'All topics',
      concept: 'All concepts',
      questionTypes: typeFilter ?? [],
    },
    sessionId: `micro-${source.id}-${requested}-${difficulty}-${JSON.stringify(typeFilter ?? [])}`,
  })
  const generatedIds = []
  const questions = result.questions.map((question, index) => {
    const normalized = {
      id: question.id ?? `${source.id}-generated-${String(index + 1).padStart(2, '0')}`,
      question: question.question,
      questionType: question.qType ?? question.questionPattern,
      difficulty: question.difficulty,
      chapter: source.chapter,
      topic: source.topic,
      concept: question.concept,
      options: question.options ?? [],
      correctAnswer: question.correctAnswer ?? question.options?.[question.answerIndex ?? 0],
      answerIndex: question.answerIndex ?? null,
      explanation: question.explanation,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceReference: `${source.chapter} · ${source.topic}`,
      sequence: index + 1,
      generationMetadata: question.generationMetadata ?? null,
    }
    normalized.validation = validateGeneratedQuestion(normalized, source, generatedIds)
    generatedIds.push(normalized.id)
    return normalized
  })
  const coverage = computeConceptCoverage(questions, source)
  return {
    source,
    questions,
    requested,
    generated: questions.length,
    insufficient: questions.length < requested,
    available: result.available,
    difficulty,
    questionTypes: [...new Set(questions.map((question) => question.questionType))],
    questionDiversity: computeQuestionDiversity(questions),
    conceptCoverage: coverage,
    validation: questions.every((question) => Object.values(question.validation).every(Boolean)),
    note: 'Prototype Question Generation — shared deterministic Question Studio selection with a curated micro-assessment source pool; no real AI generation.',
  }
}

export function regenerateMicroQuestion({ source: sourceInput, target, usedIds = [] } = {}) {
  const source = buildMicroSource(sourceInput)
  const pool = questionPoolFor(source)
  const exact = pool.filter((question) => question.concept === target?.concept
    && question.questionType === target?.questionType
    && question.difficulty === target?.difficulty)
  const fallback = pool.filter((question) => question.concept === target?.concept && !exact.includes(question))
  const candidate = [...exact, ...fallback, ...pool].find((question) => !usedIds.includes(question.id) && question.id !== target?.id)
  if (!candidate) return { unavailable: true, message: 'No unused source-grounded question is available for this concept.' }
  return {
    unavailable: false,
    question: {
      ...candidate,
      validation: validateGeneratedQuestion(candidate, source, usedIds),
    },
    note: 'Only this question was replaced; the rest of the assessment stayed unchanged.',
  }
}

export function generateMissingCoverage({ source: sourceInput, questions = [], count = 1 } = {}) {
  const source = buildMicroSource(sourceInput)
  const coverage = computeConceptCoverage(questions, source)
  const missing = coverage.filter((item) => item.count === 0 || item.percentage < 100).sort((a, b) => a.percentage - b.percentage)
  const pool = questionPoolFor(source)
  const selected = []
  missing.slice(0, Math.max(1, Number(count) || 1)).forEach((item) => {
    const question = pool.find((candidate) => candidate.concept === item.concept
      && !questions.some((existing) => existing.id === candidate.id)
      && !selected.some((existing) => existing.id === candidate.id))
    if (question) selected.push({ ...question, validation: validateGeneratedQuestion(question, source, questions.map((q) => q.id)) })
  })
  return { questions: selected, coverage, missingConcepts: missing.map((item) => item.concept), note: 'Prototype coverage completion — deterministic source-pool selection.' }
}

function normalizedAnswer(question, value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number' && question.options?.[value] !== undefined) return String(question.options[value]).trim().toLowerCase()
  return String(value).trim().toLowerCase()
}

function isCorrect(question, value) {
  return normalizedAnswer(question, value) === normalizedAnswer(question, question.correctAnswer)
}

function incorrectAnswer(question) {
  if (question.options?.length > 1) {
    const index = question.options.findIndex((option) => option === question.correctAnswer)
    return question.options[(index + 1) % question.options.length]
  }
  return 'Not sure'
}

/** Deterministic demo responses make the results view useful immediately
 * after Send, while leaving the first selected learner available to answer
 * in the student flow. These records are explicitly formative and are not
 * passed to the official ExamAttempt store. */
export function buildPrototypeMicroAttempts(assessment, studentIds = []) {
  const completedIds = studentIds.slice(1, Math.min(studentIds.length, 13))
  const weakConcept = assessment.questions?.[Math.min(2, (assessment.questions?.length ?? 1) - 1)]?.concept
  return completedIds.map((studentId, studentIndex) => {
    const answers = {}
    ;(assessment.questions ?? []).forEach((question, questionIndex) => {
      const shouldMiss = question.concept === weakConcept
        ? (studentIndex + questionIndex) % 2 === 0
        : (studentIndex + questionIndex) % 6 === 0
      answers[question.id] = shouldMiss ? incorrectAnswer(question) : question.correctAnswer
    })
    return {
      id: `${assessment.id}-attempt-${studentId}`,
      assessmentId: assessment.id,
      studentId,
      status: 'completed',
      answers,
      submittedAt: '2026-08-25T09:30:00.000Z',
      source: 'micro-assessment',
      mode: 'formative-micro-assessment',
    }
  })
}

export function computeMicroAssessmentResults(assessment, attempts = []) {
  const questions = assessment?.questions ?? []
  const completed = attempts.filter((attempt) => attempt.status === 'completed')
  const rows = questions.map((question) => {
    const responses = completed.map((attempt) => attempt.answers?.[question.id]).filter((answer) => answer !== undefined)
    const correct = responses.filter((answer) => isCorrect(question, answer)).length
    const incorrect = responses.length - correct
    return {
      id: question.id,
      label: `Q${questions.indexOf(question) + 1}`,
      question: question.question,
      questionType: question.questionType,
      difficulty: question.difficulty,
      chapter: question.chapter,
      topic: question.topic,
      concept: question.concept,
      responses: responses.length,
      correct,
      incorrect,
      correctPercent: responses.length ? Math.round((correct / responses.length) * 100) : null,
      sourceId: question.sourceId,
    }
  })
  const conceptNames = [...new Set(questions.map((question) => question.concept).filter(Boolean))]
  const conceptPerformance = conceptNames.map((concept) => {
    const related = rows.filter((row) => row.concept === concept)
    const totalCorrect = related.reduce((total, row) => total + row.correct, 0)
    const totalResponses = related.reduce((total, row) => total + row.responses, 0)
    return {
      concept,
      correct: totalCorrect,
      responses: totalResponses,
      accuracy: totalResponses ? Math.round((totalCorrect / totalResponses) * 100) : null,
    }
  })
  const scoredResponses = rows.reduce((total, row) => total + row.responses, 0)
  const correctResponses = rows.reduce((total, row) => total + row.correct, 0)
  const mostDifficultConcept = [...conceptPerformance].filter((item) => item.accuracy != null).sort((a, b) => a.accuracy - b.accuracy)[0] ?? null
  const mostMissedQuestion = [...rows].filter((row) => row.responses > 0).sort((a, b) => b.incorrect - a.incorrect || (a.correctPercent ?? 101) - (b.correctPercent ?? 101))[0] ?? null
  const weakConcepts = conceptPerformance.filter((item) => item.accuracy != null && item.accuracy < 70)
  const interventionRecommendation = weakConcepts.length
    ? {
        concept: weakConcepts[0].concept,
        message: `Students show difficulty with ${weakConcepts[0].concept}.`,
        recommendedAction: 'Targeted Practice',
        questions: 5,
        difficulty: 'Medium',
        automatic: false,
        status: 'Suggested — faculty approval required',
      }
    : null
  return {
    assessmentId: assessment?.id ?? null,
    studentsCompleted: completed.length,
    studentsTargeted: assessment?.target?.studentIds?.length ?? assessment?.studentIds?.length ?? 0,
    averageAccuracy: scoredResponses ? Math.round((correctResponses / scoredResponses) * 100) : null,
    mostDifficultConcept,
    mostMissedQuestion,
    conceptPerformance,
    questions: rows,
    weakConcepts,
    interventionRecommendation,
    noAutomaticIntervention: true,
    note: 'Formative micro-assessment results are prototype data and remain separate from official ExamAttempt analytics.',
  }
}

export function studentAttemptStatus(assessment, studentId, attempts = []) {
  const attempt = attempts.find((item) => item.assessmentId === assessment?.id && item.studentId === studentId)
  return {
    status: attempt?.status === 'completed' ? 'Completed' : attempt?.status === 'in_progress' ? 'In Progress' : 'Not Started',
    attempt: attempt ?? null,
  }
}

export function sourceFilterOptions(sources = []) {
  return {
    domains: [...new Set(sources.map((source) => source.domain))],
    examFamilies: [...new Set(sources.map((source) => source.examFamily).filter(Boolean))],
    subjects: [...new Set(sources.map((source) => source.subject))],
    chapters: [...new Set(sources.map((source) => source.chapter))],
    topics: [...new Set(sources.map((source) => source.topic))],
    sourceTypes: [...new Set(sources.map((source) => source.sourceType))],
    questionTypes: QUESTION_TYPES,
  }
}

export { QUESTION_TYPES }

export default {
  MICRO_ASSESSMENT_COUNTS,
  normalizeMicroDomain,
  normalizeExamFamily,
  sameMicroContext,
  validateMicroSourceInput,
  buildMicroSource,
  findMicroSource,
  filterMicroSources,
  processMicroSource,
  generateMicroQuestions,
  regenerateMicroQuestion,
  computeQuestionDiversity,
  computeConceptCoverage,
  generateMissingCoverage,
  buildPrototypeMicroAttempts,
  computeMicroAssessmentResults,
  studentAttemptStatus,
  sourceFilterOptions,
}
