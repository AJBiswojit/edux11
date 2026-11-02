/**
 * Faculty Assessment — AI QUESTION STUDIO engine (Phase 7).
 *
 * Deterministic "Prototype Content Intelligence" — no real AI, no backend:
 *   · analyzeSource()          — source analysis (topics/concepts/patterns/
 *     recommended distribution) from the source configuration
 *   · generateQuestions()      — deterministic selection from the curated
 *     pools bound to the source, honouring settings
 *   · regenerateQuestion()     — next unused pool question with the same
 *     chapter/topic/concept/type/difficulty (or honest "unavailable")
 *   · qualityScore()           — transparent prototype quality factors
 *   · syncStudioQuestionsToBank() — pushes APPROVED studio questions into
 *     the existing Question Bank + competitive question foundation so
 *     Question Intelligence / Paper Generator consume them (never PYQ-
 *     labelled; never overwrites existing data).
 */

import {  } from './scores.js'
import { questionStudioSources } from '../datasets/question-studio-sources.js'
import { questionStudioPools, allStudioQuestions } from '../datasets/question-studio-questions.js'
import { questionBank } from '@/datasets/faculty/workspace.js'
import { competitiveQuestions } from '../datasets/competitive-questions.js'

/* ------------------------------------------------------------------ */
/* Subject-biased question-pattern suitability                        */
/* ------------------------------------------------------------------ */

const PATTERN_BIAS = {
  Biology: ['Direct MCQ', 'Statement Based', 'Multiple Statement', 'Assertion & Reason', 'Match the Following', 'Diagram Based', 'Application Based'],
  Physics: ['Direct MCQ', 'Numerical', 'Statement Based', 'Assertion & Reason', 'Application Based', 'Diagram Based'],
  Chemistry: ['Direct MCQ', 'Statement Based', 'Multiple Statement', 'Assertion & Reason', 'Match the Following', 'Numerical', 'Application Based'],
  Mathematics: ['Direct MCQ', 'Numerical', 'Statement Based', 'Multiple Statement', 'Assertion & Reason', 'Sequence / Arrangement'],
  'Data Structures & Algorithms': ['Direct MCQ', 'Multiple Statement', 'Application Based', 'Case Based', 'Sequence / Arrangement'],
  'Database Management Systems': ['Direct MCQ', 'Multiple Statement', 'Application Based', 'Case Based', 'Sequence / Arrangement'],
  'Operating Systems': ['Direct MCQ', 'Multiple Statement', 'Application Based', 'Case Based', 'Sequence / Arrangement'],
}

export function suitablePatternsFor(source) {
  const bias = PATTERN_BIAS[source.subject] ?? ['Direct MCQ', 'Statement Based', 'Application Based']
  const declared = source.questionPatterns ?? []
  return [...new Set([...bias.filter((p) => declared.includes(p)), ...declared])]
}

/** Recommended distribution across the source's suitable patterns. */
export function recommendDistribution(source) {
  const patterns = suitablePatternsFor(source)
  const weights = { 'Direct MCQ': 0.2, 'Statement Based': 0.15, 'Multiple Statement': 0.1, 'Assertion & Reason': 0.1, 'Match the Following': 0.08, 'Application Based': 0.12, Numerical: 0.1, 'Diagram Based': 0.05, 'Case Based': 0.05, 'Sequence / Arrangement': 0.05 }
  const usable = patterns.filter((p) => (weights[p] ?? 0) > 0)
  const total = usable.reduce((n, p) => n + (weights[p] ?? 0), 0)
  const base = Math.round((source.questionCountGenerated ?? 20) * 0.8)
  return usable.map((p) => ({ pattern: p, count: Math.max(2, Math.round((base * (weights[p] ?? 0.1)) / total)) }))
}

/* ------------------------------------------------------------------ */
/* Source analysis                                                    */
/* ------------------------------------------------------------------ */

export function analyzeSource(source) {
  const topics = (source.topics ?? []).map((t) => ({
    topic: t.topic,
    concepts: t.concepts ?? [],
    conceptCount: (t.concepts ?? []).length,
    recommendedQuestions: t.recommended ?? 4,
  }))
  const concepts = (source.concepts ?? []).map((c) => {
    const topic = topics.find((t) => (t.concepts ?? []).includes(c))
    return { concept: c, topic: topic?.topic ?? null, subConcepts: null }
  })
  const patterns = suitablePatternsFor(source)
  const distribution = recommendDistribution(source)
  return {
    sourceId: source.sourceId,
    pagesAnalyzed: source.pageCount ?? 0,
    topicsDetected: topics.length,
    conceptsDetected: concepts.length,
    patternsDetected: patterns.length,
    topics,
    concepts,
    patterns,
    distribution,
    status: 'Analysis Complete',
    note: 'Prototype Content Intelligence — deterministic analysis of demo source content.',
    analyzedAt: new Date().toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Generation                                                         */
/* ------------------------------------------------------------------ */

export function difficultyDistribution(choice) {
  switch (choice) {
    case 'Easy': return { Easy: 1, Medium: 0, Hard: 0 }
    case 'Medium': return { Easy: 0, Medium: 1, Hard: 0 }
    case 'Hard': return { Easy: 0, Medium: 0, Hard: 1 }
    case 'Hard-weighted': return { Easy: 0.15, Medium: 0.45, Hard: 0.4 }
    case 'Easy-weighted': return { Easy: 0.4, Medium: 0.45, Hard: 0.15 }
    default: return { Easy: 0.2, Medium: 0.6, Hard: 0.2 } /* Balanced */
  }
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function rand() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedOf(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Transparent prototype quality score (0–100) with factor breakdown. */
export function qualityScore(q, source, settings = {}) {
  const relevance = 100 /* pool is bound to the source */
  const taxonomyMatch = q.concept && q.topic && q.chapter ? 100 : 80
  const patternMatch = (source.questionPatterns ?? []).includes(q.qType) || (suitablePatternsFor(source)).includes(q.qType) ? 100 : 75
  const difficultyMatch = settings.difficulty === 'Balanced' || settings.difficulty === q.difficulty ? 100 : 88
  const coverage = Math.min(100, 55 + q.sourcePage * 5)
  const score = Math.round(0.35 * relevance + 0.2 * taxonomyMatch + 0.2 * patternMatch + 0.15 * difficultyMatch + 0.1 * coverage)
  return {
    score,
    factors: [
      { label: 'Relevance', value: relevance, weight: 0.35 },
      { label: 'Taxonomy match', value: taxonomyMatch, weight: 0.2 },
      { label: 'Question pattern', value: patternMatch, weight: 0.2 },
      { label: 'Difficulty match', value: difficultyMatch, weight: 0.15 },
      { label: 'Source coverage', value: coverage, weight: 0.1 },
    ],
    note: 'Prototype quality score — not a scientifically validated measure.',
  }
}

/**
 * Generates `count` questions for a source honouring settings
 * (topic/concept filters, question-type mix, difficulty distribution).
 * Deterministic per (sessionId). Returns { questions, insufficient, used }.
 */
export function generateQuestions({ source, settings = {}, sessionId, poolOverride = null }) {
  /* Micro-Assessment Studio can pass its curated source pool through this
     same selection engine; the existing AI Question Studio remains the
     default consumer when no override is supplied. */
  const pool = poolOverride ?? questionStudioPools[source.sourceId] ?? []
  const count = Math.max(1, Math.min(30, Number(settings.count ?? 20)))
  const topicFilter = settings.topic && settings.topic !== 'All topics' ? settings.topic : null
  const conceptFilter = settings.concept && settings.concept !== 'All concepts' ? settings.concept : null
  const typeFilter = Array.isArray(settings.questionTypes) && settings.questionTypes.length ? settings.questionTypes : null
  const diff = difficultyDistribution(settings.difficulty ?? 'Balanced')

  let candidates = pool.filter((q) => {
    if (topicFilter && q.topic !== topicFilter) return false
    if (conceptFilter && q.concept !== conceptFilter) return false
    if (typeFilter && !typeFilter.includes(q.qType)) return false
    return true
  })

  /* difficulty assignment: deterministic shuffle then distribute by ratio */
  const rand = mulberry32(seedOf(sessionId ?? `${source.sourceId}-${count}-${JSON.stringify(settings)}`))
  const shuffled = [...candidates].sort(() => rand() - 0.5)

  const buckets = { Easy: [], Medium: [], Hard: [] }
  shuffled.forEach((q) => buckets[q.difficulty]?.push(q))
  const wanted = { Easy: Math.round(count * diff.Easy), Medium: Math.round(count * diff.Medium), Hard: count - Math.round(count * diff.Easy) - Math.round(count * diff.Medium) }
  const selected = []
  ;['Easy', 'Medium', 'Hard'].forEach((level) => {
    for (let i = 0; i < wanted[level] && buckets[level].length; i += 1) selected.push(buckets[level].shift())
  })
  /* fill the remainder with the best available */
  let fill = count - selected.length
  ;['Medium', 'Easy', 'Hard'].forEach((level) => {
    while (fill > 0 && buckets[level].length) { selected.push(buckets[level].shift()); fill -= 1 }
  })
  while (fill > 0 && shuffled.length) {
    const extra = shuffled.find((q) => !selected.includes(q))
    if (!extra) break
    selected.push(extra)
    fill -= 1
  }

  const questions = selected.slice(0, count).map((q, i) => {
    const explanation = q.explanation || (q.qType === 'Assertion & Reason'
      ? ['Both A and R are true and R correctly explains A', 'Both A and R are true but R does not explain A', 'A is true but R is false', 'A is false but R is true'][q.answerIndex ?? 0]
      : 'No explanation recorded for this demo question.')
    return {
    ...q,
    questionId: `SQS-${sessionId ?? source.sourceId}-${String(i + 1).padStart(2, '0')}`,
    sourceId: source.sourceId,
    sourceTitle: source.title,
    sourcePage: q.sourcePage,
    sourceReference: q.sourceReference,
    domain: source.domain,
    exam: source.exam,
    subject: source.subject,
    course: source.course ?? null,
    chapter: source.chapter,
    questionPattern: q.qType,
    reviewStatus: 'Draft',
    approved: false,
    explanation,
    quality: qualityScore(q, source, settings),
    createdAt: new Date().toISOString(),
  }}).map((q, i) => ({ ...q, sessionId: sessionId ?? source.sourceId }))

  return {
    questions,
    requested: count,
    generated: questions.length,
    insufficient: questions.length < count,
    available: candidates.length,
    sessionId,
  }
}

/** Regenerate one question from the same chapter/topic/concept/type/difficulty. */
export function regenerateQuestion({ source, sessionQuestions = [], target, sessionId }) {
  const usedIds = new Set((sessionQuestions ?? []).map((q) => q.questionId).concat(target.questionId))
  const unused = (arr) => arr.find((q) => !usedIds.has(`${source.sourceId}-${q.id}`))
  /* exact match first: same chapter/topic/concept/type/difficulty */
  const exact = (questionStudioPools[source.sourceId] ?? []).filter((q) =>
    q.topic === target.topic && q.concept === target.concept && q.qType === target.questionPattern && q.difficulty === target.difficulty)
  let candidate = unused(exact)
  /* related fallback: same topic/concept/type, any difficulty (still source-related) */
  if (!candidate) {
    const related = (questionStudioPools[source.sourceId] ?? []).filter((q) =>
      q.topic === target.topic && q.concept === target.concept && q.qType === target.questionPattern)
    candidate = unused(related)
  }
  if (!candidate) {
    return { unavailable: true, message: 'No further questions match this chapter, topic, concept and type — try broadening filters.' }
  }
  return {
    question: {
      ...candidate,
      questionId: `SQS-${sessionId}-${Date.now() % 100000}`,
      sourceId: source.sourceId,
      sourceTitle: source.title,
      sourcePage: candidate.sourcePage,
      sourceReference: candidate.sourceReference,
      domain: source.domain,
      exam: source.exam,
      subject: source.subject,
      chapter: source.chapter,
      questionPattern: candidate.qType,
      reviewStatus: 'Draft',
      approved: false,
      quality: qualityScore(candidate, source),
      createdAt: new Date().toISOString(),
    },
    unavailable: false,
  }
}

/* ------------------------------------------------------------------ */
/* Metrics                                                            */
/* ------------------------------------------------------------------ */

export function computeStudioMetrics(sessions = []) {
  const sources = questionStudioSources
  const generated = sources.reduce((n, s) => n + (s.questionCountGenerated ?? 0), 0)
  const baseApproved = sources.reduce((n, s) => n + (s.approvedQuestionCount ?? 0), 0)
  const sessionApproved = sessions.reduce((n, s) => n + (s.questions ?? []).filter((q) => q.approved).length, 0)
  const rejected = sessions.reduce((n, s) => n + (s.questions ?? []).filter((q) => q.reviewStatus === 'Rejected').length, 0)
  const draft = sessions.reduce((n, s) => n + (s.questions ?? []).filter((q) => q.reviewStatus === 'Draft' || q.reviewStatus === 'Reviewed').length, 0)
  const types = new Set(allStudioQuestions.map((q) => q.qType)).size
  const subjects = new Set(allStudioQuestions.map((q) => q.subject)).size
  return {
    sources: sources.length,
    questionsGenerated: generated + sessionApproved + rejected + draft,
    approved: baseApproved + sessionApproved,
    pendingReview: draft,
    rejected,
    questionTypes: types,
    subjects,
    sessions: sessions.length,
  }
}

/* ------------------------------------------------------------------ */
/* Question Bank integration (approved only — never PYQ-labelled)     */
/* ------------------------------------------------------------------ */

function bankSubjectFor(q) {
  if (q.domain === 'University') {
    const map = { 'Data Structures & Algorithms': 'CS501', 'Database Management Systems': 'CS502', 'Operating Systems': 'CS503' }
    return map[q.subject] ?? q.subject
  }
  return q.subject
}

function bankTypeFor(q) {
  const map = { 'Assertion & Reason': 'Assertion Reason', Numerical: 'Numerical', 'Case Based': 'Case Based' }
  return map[q.qType] ?? 'MCQ'
}

/** Push approved studio questions into the EXISTING question bank
    (same object the bank UI / QI / paper generator consume). */
export function syncStudioQuestionsToBank(sessions = []) {
  const approved = (sessions ?? []).flatMap((s) => (s.questions ?? []).filter((q) => q.approved))
  let added = 0
  approved.filter((q) => q.domain === 'University').forEach((q) => {
    const bankId = `qs-${q.questionId}`
    if (questionBank.questions.some((b) => b.id === bankId)) return
    questionBank.questions.push({
      id: bankId,
      bloom: 'Apply',
      accuracy: Math.round((q.quality?.score ?? 80) * 0.85),
      tags: ['AI Question Studio', q.qType],
      chapter: q.chapter,
      subject: bankSubjectFor(q),
      topic: q.topic,
      type: bankTypeFor(q),
      difficulty: q.difficulty,
      usage: 0,
      lastUsed: null,
      source: 'AI Question Studio',
      generationType: 'AI-assisted prototype',
      studioSessionId: q.sessionId ?? null,
      sourceId: q.sourceId,
      sourceTitle: q.sourceTitle,
      concept: q.concept,
      subConcept: q.subConcept,
      questionPattern: q.qType,
      qualityScore: q.quality?.score ?? null,
      reviewStatus: q.reviewStatus,
      approved: true,
      status: 'Approved',
      text: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      pyqFrequency: 0,
      appearedIn: [],
      pyqTopics: [],
    })
    added += 1
  })
  /* competitive questions join the competitive foundation (isPyq: false) */
  approved.filter((q) => q.domain === 'Competitive').forEach((q) => {
    const cid = `qs-c-${q.questionId}`
    if (competitiveQuestions.some((c) => c.id === cid)) return
    competitiveQuestions.push({
      id: cid,
      exam: q.exam === 'NEET UG' ? 'NEET UG' : 'JEE Main',
      subject: q.subject,
      subjectCode: q.subject === 'Biology' ? 'BIO' : q.subject === 'Mathematics' ? 'MAT' : q.subject === 'Chemistry' ? 'CHE' : 'PHY',
      year: null,
      session: null,
      chapter: q.chapter,
      topic: q.topic,
      question: q.question,
      options: q.options,
      answer: q.answerIndex != null ? 'ABCD'[q.answerIndex] : q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      questionType: q.qType === 'Numerical' ? 'Numerical' : 'MCQ',
      marks: q.marks,
      negativeMarks: q.negativeMarks,
      source: 'AI Question Studio',
      generationType: 'AI-assisted prototype',
      studioSessionId: q.sessionId ?? null,
      sourceId: q.sourceId,
      isPyq: false,
      pyq: null,
      tags: ['AI Question Studio', q.qType],
    })
    added += 1
  })
  return { added, approvedCount: approved.length }
}

export default { analyzeSource, suitablePatternsFor, recommendDistribution, generateQuestions, regenerateQuestion, qualityScore, difficultyDistribution, computeStudioMetrics, syncStudioQuestionsToBank }
