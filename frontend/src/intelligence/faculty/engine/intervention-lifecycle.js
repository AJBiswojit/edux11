/**
 * Faculty Intelligence Engine — INTERVENTION LIFECYCLE (Phase 6).
 *
 * Implements the actionable intervention lifecycle on top of the Phase 5
 * foundation:
 *
 *   Detected → Recommended → Approved → Planned → Assigned → In Progress
 *   → Completed → Re-test Pending → Evaluating → Resolved / Improving /
 *   Persistent        (Dismissed allowed before assignment)
 *
 * Faculty approval is MANDATORY (approvedBy/approvedAt); no automatic
 * delivery; all persistence is prototype localStorage. This module is
 * pure/Node-testable and contains:
 *
 *   · INTERVENTION_STATUSES / TRANSITIONS / canTransition
 *   · buildInterventionFromGroup()      — canonical intervention entity
 *   · practiceTypeFor()                 — practice-set type per issue
 *   · selectPracticeQuestions()         — existing Question Bank / PYQ
 *     selection with honest insufficiency + broaden levels
 *   · buildRetest()                     — re-test entity (different
 *     questions, linked to interventionId)
 *   · computeEffectiveness()            — deterministic before/after
 *     outcome ("Prototype Intervention Effectiveness" — NOT validated)
 */

import { round1, avg } from './scores.js'

/* ------------------------------------------------------------------ */
/* Status machine                                                     */
/* ------------------------------------------------------------------ */

export const INTERVENTION_STATUSES = [
  'Detected', 'Recommended', 'Approved', 'Planned', 'Assigned', 'In Progress',
  'Completed', 'Re-test Pending', 'Evaluating', 'Resolved', 'Improving', 'Persistent', 'Dismissed',
]

export const TRANSITIONS = {
  Detected: ['Recommended', 'Dismissed'],
  Recommended: ['Approved', 'Dismissed'],
  Approved: ['Planned', 'Dismissed'],
  Planned: ['Assigned', 'Dismissed'],
  Assigned: ['In Progress', 'Dismissed'],
  'In Progress': ['Completed'],
  Completed: ['Re-test Pending'],
  'Re-test Pending': ['Evaluating'],
  Evaluating: ['Resolved', 'Improving', 'Persistent'],
  Resolved: [],
  Improving: [],
  Persistent: [],
  Dismissed: [],
}

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to)
}

/* ------------------------------------------------------------------ */
/* Practice-set types per issue                                       */
/* ------------------------------------------------------------------ */

export function practiceTypeFor(issueType) {
  switch (issueType) {
    case 'Persistent Weakness': return 'Concept + Targeted + PYQ'
    case 'Time Management': return 'Timed Practice'
    case 'High Skip Rate': return 'Mixed Practice'
    case 'Careless Errors': return 'Concept + Targeted'
    case 'Declining Performance': return 'Targeted Practice'
    case 'Performance Gap': return 'Concept Practice'
    default: return 'Targeted Practice'
  }
}

export function objectivesFor(issueType, chapter) {
  const base = [`Achieve ≥70% accuracy on ${chapter} questions`, 'Reduce average solving time below 100 seconds per question']
  if (issueType === 'Persistent Weakness') base.push('Resolve the recurring pattern across at least 2 consecutive assessments')
  if (issueType === 'High Skip Rate') base.push('Increase attempt rate to ≥85% on the targeted set')
  if (issueType === 'Careless Errors') base.push('Zero fast-incorrect answers on the final drill')
  return base
}

/* ------------------------------------------------------------------ */
/* Canonical intervention entity                                      */
/* ------------------------------------------------------------------ */

export function buildInterventionFromGroup(group, overrides = null) {
  const o = overrides ?? {}
  const issue = group.evidence ?? {}
  const rec = group.recommendation ?? {}
  const studentIds = o.studentIds ?? group.students.map((s) => s.studentId)
  return {
    id: group.id,
    interventionId: group.id,
    studentId: o.studentId ?? (studentIds.length === 1 ? studentIds[0] : null),
    groupId: o.groupId ?? group.issueGroupId ?? group.id,
    issueGroupId: o.groupId ?? group.issueGroupId ?? group.id,
    source: o.source ?? 'Similar Issues',
    createdBy: o.createdBy ?? 'Dr. Meera Krishnan',
    title: o.title ?? `Recovery — ${group.subject} — ${group.chapter}`,
    domain: group.domain,
    examFamily: group.examFamily ?? null,
    subject: group.subject,
    chapter: group.chapter,
    topic: null,
    issueType: group.issueType,
    priority: o.priority ?? group.priority,
    studentIds,
    allGroupStudentIds: group.students.map((s) => s.studentId),
    recommendation: {
      title: rec.title,
      actions: rec.actions ?? [],
      detail: rec.detail,
    },
    objectives: o.objectives ?? objectivesFor(group.issueType, group.chapter),
    expectedOutcome: `≥70% accuracy and reduced time on ${group.chapter} across ${group.students.length} student(s).`,
    practiceConfig: {
      type: o.practiceConfig?.type ?? practiceTypeFor(group.issueType),
      count: o.practiceConfig?.count ?? 8,
      difficulty: o.practiceConfig?.difficulty ?? 'Medium',
      duration: o.practiceConfig?.duration ?? 20,
      questionType: o.practiceConfig?.questionType ?? 'Any',
      includePyq: o.practiceConfig?.includePyq ?? (group.issueType === 'Persistent Weakness'),
      pyqPreference: o.practiceConfig?.pyqPreference ?? o.pyqPreference ?? (group.issueType === 'Persistent Weakness' ? 'Preferred' : 'No preference'),
      selectionLevel: o.practiceConfig?.selectionLevel ?? 'exact',
    },
    pyqPreference: o.pyqPreference ?? (group.issueType === 'Persistent Weakness' ? 'Yes' : 'No'),
    status: o.status ?? 'Detected',
    createdAt: o.createdAt ?? new Date().toISOString(),
    approvedAt: o.approvedAt ?? null,
    approvedBy: o.approvedBy ?? null,
    assignedAt: o.assignedAt ?? null,
    completedAt: o.completedAt ?? null,
    retestCreatedAt: o.retestCreatedAt ?? null,
    evaluatedAt: o.evaluatedAt ?? null,
    facultyId: 'fac_meera_krishnan',
    notes: o.notes ?? '',
    action: o.action ?? null,
    updatedAt: o.updatedAt ?? null,
    evidence: issue,
    whyDetected: group.whyDetected,
    students: group.students,
    baseline: {
      accuracy: issue.avgAccuracy ?? 0,
      avgTime: issue.avgTime ?? 0,
      incorrect: issue.incorrect ?? 0,
      skipped: issue.skipped ?? 0,
      attempted: issue.attempted ?? (Number.isFinite(issue.questions) && Number.isFinite(issue.skipped) ? issue.questions - issue.skipped : null),
      questions: issue.questions ?? 0,
      score: issue.score ?? null,
      affectedExams: issue.affectedExams ?? 0,
      persistence: issue.persistence ?? 1,
    },
  }
}

/* ------------------------------------------------------------------ */
/* Question selection (existing Question Bank / PYQ datasets)         */
/* ------------------------------------------------------------------ */

/**
 * Selects practice/re-test questions for an intervention.
 *   level: 'exact' | 'difficulty' | 'subject' | 'related-topics'
 * Returns { questions, available, required, insufficient, level }.
 * Questions carry { id, text, options, answer, chapter, topic, difficulty,
 * type, isPyq, source }.
 */
export function selectPracticeQuestions({
  domain, examFamily, subject, chapter, difficulty = 'Medium', count = 8,
  questionType = 'Any', includePyq = false, pyqPreference = null,
  excludeIds = [], pool = null, level = 'exact',
}) {
  const LETTERS = ['A', 'B', 'C', 'D']
  const answerIndex = (a) => (typeof a === 'number' ? a : typeof a === 'string' && /^[A-D]$/i.test(a) ? LETTERS.indexOf(a.toUpperCase()) : null)
  const required = Math.max(1, Number(count) || 1)
  const canonicalDomain = domain === 'University' || domain === 'university' ? 'University' : 'Competitive'
  const wantsPyqOnly = pyqPreference === 'Only'
  const typeMatches = (q) => questionType === 'Any' || questionType === 'Mixed' || (q.questionType ?? q.type ?? 'MCQ') === questionType
  const contextMatches = (q) => {
    /* Pools are normally pre-partitioned by questionPoolFor(), but these
       checks keep the pure selector safe when a combined pool is supplied. */
    if (q.domain && q.domain !== canonicalDomain) return false
    if (canonicalDomain === 'Competitive' && q.examFamily && q.examFamily !== examFamily) return false
    if (canonicalDomain === 'University' && q.examFamily) return false
    if (wantsPyqOnly && !(q.isPyq || q.pyqFrequency)) return false
    if (!typeMatches(q)) return false
    return (q.options ?? []).length === 4
  }
  const exact = (pool ?? []).filter((q) => {
    if (!contextMatches(q)) return false
    if (q.subject !== subject) return false
    if (q.chapter !== chapter) return false
    if (difficulty && difficulty !== 'Mixed' && q.difficulty !== difficulty) return false
    return true
  })
  const usable = (arr) => arr.filter((q) => !excludeIds.includes(q.id))
  let candidates = usable(exact)
  let actualLevel = 'exact'
  const compatible = (arr) => (arr ?? []).filter(contextMatches)
  if (candidates.length < required && level !== 'exact') {
    /* difficulty broaden: same chapter, any difficulty */
    const byChapter = usable(compatible((pool ?? []).filter((q) => q.subject === subject && q.chapter === chapter)))
    if (byChapter.length > candidates.length) { candidates = byChapter; actualLevel = 'difficulty' }
  }
  if (candidates.length < required && (level === 'subject' || level === 'related-topics')) {
    const bySubject = usable(compatible((pool ?? []).filter((q) => q.subject === subject)))
    if (bySubject.length > candidates.length) { candidates = bySubject; actualLevel = 'subject' }
  }
  if (candidates.length < required && level === 'related-topics') {
    const byTopic = usable(compatible((pool ?? []).filter((q) => (q.topic ?? '').toLowerCase().includes(String(chapter).toLowerCase().split(' ')[0].toLowerCase()) || (q.chapter ?? '').toLowerCase().includes(String(chapter).toLowerCase().split(' ')[0].toLowerCase()))))
    if (byTopic.length > candidates.length) { candidates = byTopic; actualLevel = 'related-topics' }
  }
  const selected = candidates.slice(0, required)
  return {
    questions: selected.map((q) => ({
      id: q.id, text: q.question ?? q.text, options: q.options ?? [], answer: q.answer,
      correctAnswerIndex: answerIndex(q.answer),
      chapter: q.chapter, topic: q.topic, difficulty: q.difficulty, type: q.questionType ?? q.type,
      isPyq: !!q.isPyq || !!q.pyqFrequency, source: q.source ?? 'bank', year: q.year ?? q.pyq?.year ?? null,
    })),
    available: candidates.length,
    required,
    insufficient: candidates.length < required,
    level: actualLevel,
  }
}

/* ------------------------------------------------------------------ */
/* Re-test                                                             */
/* ------------------------------------------------------------------ */

export function buildRetestEntity({
  intervention, title, difficulty = 'Medium', count = 10, timeLimit = 20,
  pyqPreference = 'No', studentIds = null, questions = [],
}) {
  return {
    id: `retest-${Date.now()}`,
    interventionId: intervention.id,
    studentId: (studentIds ?? intervention.studentIds)?.length === 1 ? (studentIds ?? intervention.studentIds)[0] : null,
    title: title ?? `Recovery Test — ${intervention.chapter}`,
    domain: intervention.domain,
    examFamily: intervention.examFamily,
    subject: intervention.subject,
    chapter: intervention.chapter,
    topic: null,
    difficulty,
    questionCount: questions.length,
    timeLimit,
    pyqPreference,
    studentIds: studentIds ?? intervention.studentIds,
    questions,
    status: 'Assigned',
    createdAt: new Date().toISOString(),
    interventionTitle: intervention.title,
  }
}

/* ------------------------------------------------------------------ */
/* Canonical ExamAttempt outcome connection                           */
/* ------------------------------------------------------------------ */

const normalDomain = (value) => String(value ?? '').toLowerCase() === 'university' ? 'University' : 'Competitive'
const attemptDate = (attempt) => attempt?.submittedAt ?? attempt?.completedAt ?? null

/** Strict target comparison shared by duplicate checks and ExamAttempt
 * matching. Subject alone is intentionally never sufficient. */
export function sameInterventionTarget(a = {}, b = {}) {
  const aDomain = normalDomain(a.domain ?? a.examMode ?? a.category)
  const bDomain = normalDomain(b.domain ?? b.examMode ?? b.category)
  const aFamily = aDomain === 'University' ? null : (a.examFamily ?? a.examType ?? null)
  const bFamily = bDomain === 'University' ? null : (b.examFamily ?? b.examType ?? null)
  return aDomain === bDomain
    && aFamily === bFamily
    && a.subject === b.subject
    && a.chapter === b.chapter
}

/** Returns chapter-level metrics from a real canonical attempt. Missing
 * metrics remain null; an attempt-wide score is used only when every
 * question belongs to the target chapter. */
export function metricsFromCanonicalAttempt(attempt, target) {
  const allRows = attempt?.questionAttempts ?? []
  const rows = allRows.filter((q) =>
    q.academicContext?.subject === target?.subject
    && q.academicContext?.chapter === target?.chapter)
  if (!rows.length) return null
  const attemptedRows = rows.filter((q) =>
    q.response?.selectedAnswer != null
    || (q.response?.status === 'answered' && !q.evaluation?.isSkipped))
  const incorrect = attemptedRows.filter((q) => !q.evaluation?.isCorrect).length
  const skipped = rows.filter((q) => q.evaluation?.isSkipped || q.response?.status === 'skipped').length
  const times = attemptedRows.map((q) => q.timing?.timeSpent).filter((v) => Number.isFinite(v))
  const scoreAvailable = rows.length === allRows.length && Number.isFinite(attempt?.scoring?.score ?? attempt?.summary?.score)
  return {
    attemptId: attempt.id,
    examId: attempt.examId ?? null,
    examName: attempt.examName ?? attempt.examTitle ?? attempt.shortTitle ?? attempt.examId ?? 'Exam Agent attempt',
    date: attemptDate(attempt),
    accuracy: attemptedRows.length ? round1((attemptedRows.filter((q) => q.evaluation?.isCorrect).length / attemptedRows.length) * 100) : null,
    score: scoreAvailable ? (attempt.scoring?.score ?? attempt.summary?.score) : null,
    maxScore: scoreAvailable ? (attempt.scoring?.maxScore ?? attempt.summary?.maxScore ?? null) : null,
    avgTime: times.length ? round1(avg(times)) : null,
    incorrect,
    skipped,
    attempted: attemptedRows.length,
    questions: rows.length,
  }
}

/**
 * Deterministic intervention → canonical ExamAttempt matcher.
 * Explicit interventionId is preferred. Fallback requires student + domain +
 * family + subject + chapter + chronology. It never infers context from a
 * subject name and excludes intervention practice/re-test records.
 */
export function matchInterventionExamAttempts({ intervention, attempts = [], after = null } = {}) {
  if (!intervention?.studentId && !(intervention?.studentIds ?? []).length) return []
  const studentId = intervention.studentId ?? intervention.studentIds?.[0]
  const threshold = after ?? intervention.retestCompletedAt ?? intervention.retestCreatedAt ?? intervention.createdAt ?? null
  const thresholdTime = threshold ? Date.parse(threshold) : null
  const candidates = (attempts ?? []).filter((attempt) => {
    if (!attempt || attempt.studentId !== studentId) return false
    if (attempt.mode === 'demo' || attempt.mode === 'intervention-practice' || attempt.mode === 'intervention-retest') return false
    if (attempt.source && attempt.source !== 'exam-agent') return false
    const when = Date.parse(attemptDate(attempt) ?? '')
    if (Number.isFinite(thresholdTime) && (!Number.isFinite(when) || when <= thresholdTime)) return false
    const context = {
      domain: attempt.examMode ?? attempt.category,
      examFamily: attempt.examFamily ?? (['JEE', 'NEET'].includes(attempt.examType) ? attempt.examType : null),
      subject: intervention.subject,
      chapter: intervention.chapter,
    }
    if (!sameInterventionTarget(intervention, context)) return false
    return !!metricsFromCanonicalAttempt(attempt, intervention)
  })
  const explicit = candidates.filter((a) => a.interventionId === intervention.id || a.interventionId === intervention.interventionId)
  const matched = explicit.length ? explicit : candidates.filter((a) => !a.interventionId)
  return matched
    .sort((a, b) => String(attemptDate(a) ?? '').localeCompare(String(attemptDate(b) ?? '')))
    .map((attempt) => ({
      attempt,
      metrics: metricsFromCanonicalAttempt(attempt, intervention),
      matchType: attempt.interventionId ? 'explicit-intervention-id' : 'strict-contextual-fallback',
    }))
}

/* ------------------------------------------------------------------ */
/* Effectiveness (deterministic, prototype-labelled)                  */
/* ------------------------------------------------------------------ */

const aggregateAttempts = (attempts) => {
  if (!attempts?.length) return null
  const values = (key) => attempts.map((a) => a?.[key]).filter((v) => Number.isFinite(v))
  const accuracy = values('accuracy')
  const times = values('avgTime')
  const incorrect = values('incorrect')
  const skipped = values('skipped')
  const questions = values('questions')
  const attempted = values('attempted')
  return {
    accuracy: accuracy.length ? round1(avg(accuracy)) : null,
    avgTime: times.length ? round1(avg(times)) : null,
    incorrect: incorrect.length ? incorrect.reduce((n, v) => n + v, 0) : null,
    skipped: skipped.length ? skipped.reduce((n, v) => n + v, 0) : null,
    questions: questions.length ? questions.reduce((n, v) => n + v, 0) : null,
    attempted: attempted.length ? attempted.reduce((n, v) => n + v, 0) : null,
    attempts: attempts.length,
  }
}

/**
 * Existing prototype outcome rules, extended to accept canonical Exam Agent
 * evidence. When a post-intervention ExamAttempt exists it is the comparison
 * endpoint; otherwise the existing re-test endpoint is used. This remains an
 * observed prototype outcome — never a causal or validated claim.
 */
export function computeEffectiveness({ baseline, practiceAttempts = [], retestAttempts = [], postExamAttempts = [] }) {
  const b = baseline ?? {}
  const practice = aggregateAttempts(practiceAttempts)
  const retest = aggregateAttempts(retestAttempts)
  const postExam = aggregateAttempts(postExamAttempts)
  const after = postExam ?? retest

  if (!after || !Number.isFinite(after.accuracy) || !Number.isFinite(b.accuracy)) {
    return {
      label: 'Prototype Intervention Effectiveness', outcome: 'Pending', before: b,
      practice, retest, postExam, deltas: null,
      evidence: 'No comparable re-test or post-intervention Exam Agent evidence is available yet — completion is not effectiveness.',
      completed: false,
    }
  }

  const accuracyDelta = round1(after.accuracy - b.accuracy)
  const timeDelta = Number.isFinite(b.avgTime) && Number.isFinite(after.avgTime) ? round1(b.avgTime - after.avgTime) : null
  const errorDelta = Number.isFinite(b.incorrect) && Number.isFinite(after.incorrect) ? b.incorrect - after.incorrect : null
  const skippedDelta = Number.isFinite(b.skipped) && Number.isFinite(after.skipped) ? b.skipped - after.skipped : null
  const deltas = { accuracyDelta, timeDelta, errorDelta, skippedDelta }

  let outcome
  if (after.accuracy >= 75 && accuracyDelta >= 20 && (timeDelta == null || timeDelta >= 5)) outcome = 'Resolved'
  else if (after.accuracy >= 80 && accuracyDelta >= 15) outcome = 'Resolved'
  else if (after.accuracy >= 60 && accuracyDelta >= 10) outcome = 'Improving'
  else if (accuracyDelta < 5 && after.accuracy < 60) outcome = 'Persistent'
  else if (Math.abs(accuracyDelta) <= 5) outcome = 'No Significant Change'
  else outcome = 'Partially Effective'

  const parts = [`Accuracy ${b.accuracy}% → ${after.accuracy}% (${accuracyDelta >= 0 ? '+' : '−'}${Math.abs(accuracyDelta)}pp)`]
  if (timeDelta != null) parts.push(`average time ${b.avgTime}s → ${after.avgTime}s (${timeDelta >= 0 ? '−' : '+'}${Math.abs(timeDelta)}s)`)
  if (errorDelta != null) parts.push(`incorrect ${b.incorrect} → ${after.incorrect} (${errorDelta >= 0 ? '−' : '+'}${Math.abs(errorDelta)})`)
  const source = postExam ? 'post-intervention Exam Agent attempt' : 're-test assessment'
  const evidence = `${parts.join('; ')}. Observed after intervention using ${source}${practice?.accuracy != null ? `; practice accuracy ${practice.accuracy}%.` : '.'}`

  return {
    label: 'Prototype Intervention Effectiveness', outcome, before: b, practice, retest, postExam,
    comparisonBasis: postExam ? 'Exam Agent' : 'Re-test', deltas, evidence, completed: true,
  }
}

/** Group roll-up keeps individual outcomes intact and averages only available
 * deltas. */
export function computeGroupEffectiveness(items = []) {
  const received = items.length
  const completed = items.filter((i) => ['Completed', 'Re-test Pending', 'Evaluating', 'Resolved', 'Improving', 'Persistent'].includes(i.status) || i.effectiveness?.completed).length
  const retested = items.filter((i) => i.effectiveness?.retest || i.retestStatus === 'Completed').length
  const outcomes = items.map((i) => i.effectiveness?.outcome).filter(Boolean)
  const deltas = items.map((i) => i.effectiveness?.deltas).filter(Boolean)
  const accuracy = deltas.map((d) => d.accuracyDelta).filter(Number.isFinite)
  const times = deltas.map((d) => d.timeDelta).filter(Number.isFinite)
  return {
    label: 'Prototype group outcome', statement: 'Observed outcome after intervention',
    received, completed, retested,
    improved: outcomes.filter((o) => o === 'Resolved' || o === 'Improving' || o === 'Partially Effective').length,
    resolved: outcomes.filter((o) => o === 'Resolved').length,
    improving: outcomes.filter((o) => o === 'Improving').length,
    persistent: outcomes.filter((o) => o === 'Persistent').length,
    noSignificantChange: outcomes.filter((o) => o === 'No Significant Change').length,
    partiallyEffective: outcomes.filter((o) => o === 'Partially Effective').length,
    averageAccuracyChange: accuracy.length ? round1(avg(accuracy)) : null,
    averageTimeChange: times.length ? round1(avg(times)) : null,
    individuals: items.map((i) => ({ interventionId: i.id, studentId: i.studentId ?? i.studentIds?.[0] ?? null, outcome: i.effectiveness?.outcome ?? 'Pending', deltas: i.effectiveness?.deltas ?? null })),
  }
}

export default {
  INTERVENTION_STATUSES, TRANSITIONS, canTransition, practiceTypeFor, objectivesFor,
  buildInterventionFromGroup, selectPracticeQuestions, buildRetestEntity,
  sameInterventionTarget, metricsFromCanonicalAttempt, matchInterventionExamAttempts,
  computeEffectiveness, computeGroupEffectiveness,
}
