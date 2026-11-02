/**
 * Faculty Intelligence Engine — GROUND-LEVEL QUESTION INTELLIGENCE (Phase 4+).
 *
 * Extends the existing Phase 4 360° intelligence by deriving topic-level
 * and concept-level aggregation from canonical exam-attempt question rows.
 * Enables the drilldown:
 *   Student → Subject → Chapter → Topic → Concept → Actual Questions
 *   → Question Attempt Details → Evidence → AI Intervention Recommendation
 *
 * RULES:
 *   · No duplicate engine — reuses Phase 2 buildAttemptSignals + qRows
 *   · No backend integration — everything derived from canonical attempts
 *   · No psychological claims — only observable attempt behaviour
 *   · Evidence questions are ALWAYS from canonical attempts, not Question Bank
 */

import { round1, avg } from './scores.js'

/* ------------------------------------------------------------------ */
/* Topic / Concept aggregation from question rows                     */
/* ------------------------------------------------------------------ */

/**
 * Aggregates question-level rows into topic-level intelligence.
 * Each topic gets: accuracy, questions, correct, incorrect, skipped, avgTime, trend.
 */
export function aggregateTopicIntelligence(questionRows = []) {
  const topicMap = new Map()
  questionRows.forEach((r) => {
    const key = `${r.subject}·${r.chapter}·${r.topic ?? 'General'}`
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        subject: r.subject, chapter: r.chapter, topic: r.topic ?? 'General',
        correct: 0, incorrect: 0, skipped: 0, attempted: 0, questions: 0, time: 0,
        rows: [],
      })
    }
    const t = topicMap.get(key)
    t.questions += 1
    if (r.status === 'Correct') t.correct += 1
    else if (r.status === 'Skipped') t.skipped += 1
    else t.incorrect += 1
    if (r.status !== 'Skipped') t.attempted += 1
    t.time += r.timeSpent ?? 0
    t.rows.push(r)
  })
  return [...topicMap.values()].map((t) => ({
    subject: t.subject,
    chapter: t.chapter,
    topic: t.topic,
    questions: t.questions,
    attempted: t.attempted,
    correct: t.correct,
    incorrect: t.incorrect,
    skipped: t.skipped,
    accuracy: t.attempted ? round1((t.correct / t.attempted) * 100) : 0,
    attemptRate: t.questions ? round1((t.attempted / t.questions) * 100) : 0,
    avgTime: t.attempted ? round1(t.time / t.attempted) : 0,
  }))
}

/**
 * Groups topic-level rows into concept-level intelligence.
 * In this data model, `topic` is the concept since exam questions
 * use topic as the most granular academic tag.
 * We treat topic as the concept level for drilldown purposes.
 */
export function aggregateConceptIntelligence(questionRows = []) {
  return aggregateTopicIntelligence(questionRows)
}

/* ------------------------------------------------------------------ */
/* Subject diagnostic intelligence (goes beyond simple KPIs)          */
/* ------------------------------------------------------------------ */

export function computeSubjectDiagnostics(questionRows = [], subjects = []) {
  return subjects.map((s) => {
    const subjectRows = questionRows.filter((r) => r.subject === s.subject)
    const topics = aggregateTopicIntelligence(subjectRows)

    const chapterMap = new Map()
    subjectRows.forEach((r) => {
      const ch = r.chapter ?? 'General'
      if (!chapterMap.has(ch)) {
        chapterMap.set(ch, { chapter: ch, correct: 0, incorrect: 0, skipped: 0, attempted: 0, questions: 0, time: 0 })
      }
      const c = chapterMap.get(ch)
      c.questions += 1
      if (r.status === 'Correct') c.correct += 1
      else if (r.status === 'Skipped') c.skipped += 1
      else c.incorrect += 1
      if (r.status !== 'Skipped') c.attempted += 1
      c.time += r.timeSpent ?? 0
    })

    const chapters = [...chapterMap.values()].map((c) => ({
      ...c,
      accuracy: c.attempted ? round1((c.correct / c.attempted) * 100) : 0,
      avgTime: c.attempted ? round1(c.time / c.attempted) : 0,
    }))

    const weakChapters = chapters
      .filter((c) => c.accuracy < 55 && c.attempted >= 2)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)

    const strongChapters = chapters
      .filter((c) => c.accuracy >= 75 && c.attempted >= 2)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 3)

    const mostIncorrect = chapters
      .filter((c) => c.incorrect >= 2)
      .sort((a, b) => b.incorrect - a.incorrect)
      .slice(0, 3)

    const slowest = chapters
      .filter((c) => c.attempted >= 2)
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 3)

    const mostSkipped = chapters
      .filter((c) => c.skipped >= 1)
      .sort((a, b) => b.skipped - a.skipped)
      .slice(0, 3)

    const mostConcerning = weakChapters[0] ?? mostIncorrect[0] ?? null

    return {
      ...s,
      diagnostics: {
        weakChapters,
        strongChapters,
        mostIncorrect,
        slowest,
        mostSkipped,
        mostConcerning,
        topicCount: topics.length,
      },
    }
  })
}

/* ------------------------------------------------------------------ */
/* Chapter → Topic → Concept drilldown                                */
/* ------------------------------------------------------------------ */

export function computeChapterDrilldown(questionRows = [], subject, chapter) {
  const chapterRows = questionRows.filter(
    (r) => r.subject === subject && r.chapter === chapter
  )
  if (!chapterRows.length) return null

  const topics = aggregateTopicIntelligence(chapterRows)
  const attempted = chapterRows.filter((r) => r.status !== 'Skipped').length
  const correct = chapterRows.filter((r) => r.status === 'Correct').length
  const incorrect = chapterRows.filter((r) => r.status === 'Incorrect').length
  const skipped = chapterRows.filter((r) => r.status === 'Skipped').length
  const timed = chapterRows.filter((r) => (r.timeSpent ?? 0) > 0)
  const avgTime = timed.length ? round1(avg(timed.map((r) => r.timeSpent))) : 0

  return {
    subject,
    chapter,
    summary: {
      questions: chapterRows.length,
      attempted,
      correct,
      incorrect,
      skipped,
      accuracy: attempted ? round1((correct / attempted) * 100) : 0,
      attemptRate: chapterRows.length ? round1((attempted / chapterRows.length) * 100) : 0,
      avgTime,
    },
    topics,
    questionRows: chapterRows,
  }
}

/* ------------------------------------------------------------------ */
/* Evidence questions — canonical attempt evidence (CRITICAL FIX)     */
/* ------------------------------------------------------------------ */

/**
 * Resolves evidence questions from canonical attempts for a given context.
 * NEVER relies solely on Question Bank — always uses actual student attempt data.
 */
export function resolveEvidenceQuestions(questionRows = [], filters = {}) {
  let rows = [...questionRows]
  if (filters.subject) rows = rows.filter((r) => r.subject === filters.subject)
  if (filters.chapter) rows = rows.filter((r) => r.chapter === filters.chapter)
  if (filters.topic) rows = rows.filter((r) => r.topic === filters.topic)
  if (filters.status) rows = rows.filter((r) => r.status === filters.status)
  if (filters.onlyProblematic) {
    rows = rows.filter((r) =>
      r.status === 'Incorrect' || r.status === 'Skipped' ||
      (r.timeSpent ?? 0) >= 90 || (r.answerChanges ?? 0) >= 1
    )
  }
  return rows.map((r) => buildEvidenceCard(r))
}

/**
 * Builds a full evidence card for a single question attempt.
 */
function buildEvidenceCard(row) {
  const flags = []
  if (row.status === 'Incorrect') flags.push('Incorrect answer')
  if (row.status === 'Skipped') flags.push('Skipped question')
  if ((row.timeSpent ?? 0) >= 90) flags.push(`High response time (${row.timeSpent}s)`)
  if ((row.answerChanges ?? 0) >= 1) flags.push(`Answer changed ${row.answerChanges} time(s)`)
  if ((row.revisits ?? 0) >= 1) flags.push(`Revisited ${row.revisits} time(s)`)
  if (row.markedForReview) flags.push('Marked for review')
  if (row.status === 'Correct') flags.push('Correct answer')

  return {
    questionId: row.id,
    attemptId: row.attemptId,
    examName: row.examName,
    date: row.date,
    subject: row.subject,
    chapter: row.chapter,
    topic: row.topic,
    questionText: row.text,
    options: row.options ?? [],
    studentAnswer: row.selected,
    correctAnswer: row.correctAnswer,
    status: row.status,
    timeSpent: row.timeSpent,
    answerChanges: row.answerChanges ?? 0,
    revisits: row.revisits ?? 0,
    markedForReview: row.markedForReview ?? false,
    difficulty: row.difficulty,
    questionType: row.type ?? 'MCQ',
    observation: row.observation,
    classification: row.classification,
    flags,
    questionNumber: row.questionNumber,
    examMode: row.examMode,
    examFamily: row.examFamily,
  }
}

/**
 * Generates observable AI observation for a question (no psychological claims).
 */
export function generateAiObservation(evidence) {
  const parts = []
  const LETTERS = ['A', 'B', 'C', 'D']
  const studentAns = typeof evidence.studentAnswer === 'number'
    ? LETTERS[evidence.studentAnswer] ?? evidence.studentAnswer
    : evidence.studentAnswer
  const correctAns = typeof evidence.correctAnswer === 'number'
    ? LETTERS[evidence.correctAnswer] ?? evidence.correctAnswer
    : evidence.correctAnswer

  if (evidence.status === 'Incorrect') {
    parts.push(`Student selected option ${studentAns ?? '?'} while the correct answer was ${correctAns ?? '?'}.`)
    parts.push(`The response took ${evidence.timeSpent ?? 0} seconds`)
    if (evidence.answerChanges > 0) parts[parts.length - 1] += ` and the answer was changed ${evidence.answerChanges} time(s).`
    else parts[parts.length - 1] += '.'
  } else if (evidence.status === 'Skipped') {
    parts.push(`Question was visited but left unanswered after ${evidence.timeSpent ?? 0} seconds.`)
  } else if (evidence.status === 'Correct') {
    parts.push(`Correctly answered ${correctAns ?? '?'} in ${evidence.timeSpent ?? 0} seconds.`)
    if (evidence.answerChanges > 0) parts.push(`Answer was changed ${evidence.answerChanges} time(s) before final submission.`)
  }

  if (evidence.revisits > 0) parts.push(`Question was revisited ${evidence.revisits} time(s).`)
  if (evidence.markedForReview) parts.push('Question was marked for review.')

  return parts.join(' ')
}

/* ------------------------------------------------------------------ */
/* Why flagged — transparent evidence reason                          */
/* ------------------------------------------------------------------ */

export function generateWhyFlagged(evidence, contextRows = []) {
  const reasons = []
  if (evidence.status === 'Incorrect') reasons.push('Incorrect answer')
  if (evidence.status === 'Skipped') reasons.push('Skipped question')
  if ((evidence.timeSpent ?? 0) >= 90) reasons.push(`Response time (${evidence.timeSpent}s) above average`)
  if ((evidence.answerChanges ?? 0) >= 1) reasons.push('Answer changed')
  if ((evidence.revisits ?? 0) >= 1) reasons.push('Revisited')
  if (evidence.markedForReview) reasons.push('Marked for review')

  const sameTopicRows = contextRows.filter(
    (r) => r.topic === evidence.topic && r.id !== evidence.questionId && r.status === 'Incorrect'
  )
  if (sameTopicRows.length >= 1) {
    reasons.push(`Same concept incorrect in ${sameTopicRows.length + 1} question(s)`)
  }

  const sameChapterRows = contextRows.filter(
    (r) => r.chapter === evidence.chapter && r.attemptId !== evidence.attemptId && r.status === 'Incorrect'
  )
  if (sameChapterRows.length >= 2) {
    reasons.push('Repeated incorrect across assessments')
  }

  return reasons
}

/* ------------------------------------------------------------------ */
/* AI Intervention Recommendation (evidence-based)                    */
/* ------------------------------------------------------------------ */

export function generateInterventionRecommendation(conceptRows = [], context = {}) {
  if (!conceptRows.length) return null

  const { subject, chapter, topic } = context
  const attempted = conceptRows.filter((r) => r.status !== 'Skipped').length
  const correct = conceptRows.filter((r) => r.status === 'Correct').length
  const incorrect = conceptRows.filter((r) => r.status === 'Incorrect').length
  const skipped = conceptRows.filter((r) => r.status === 'Skipped').length
  const timed = conceptRows.filter((r) => (r.timeSpent ?? 0) > 0)
  const avgTime = timed.length ? round1(avg(timed.map((r) => r.timeSpent))) : 0
  const accuracy = attempted ? round1((correct / attempted) * 100) : 0
  const answerChanges = conceptRows.reduce((n, r) => n + (r.answerChanges ?? 0), 0)
  const skipRate = conceptRows.length ? round1((skipped / conceptRows.length) * 100) : 0

  const uniqueAttempts = new Set(conceptRows.map((r) => r.attemptId)).size

  let issueType = 'Performance Gap'
  let priority = 'Medium'
  let recommendedAction = 'Targeted Practice'
  let practiceType = 'Application Based'
  let questionCount = 8
  let difficultyProgression = 'Easy → Medium'

  if (accuracy < 30 && incorrect >= 3) {
    issueType = 'Persistent Low Accuracy'
    priority = 'High'
    recommendedAction = 'Concept remediation followed by targeted application practice.'
    practiceType = 'Application Based'
    questionCount = 10
    difficultyProgression = 'Easy → Medium'
  } else if (accuracy < 55 && incorrect >= 2) {
    issueType = 'Low Accuracy'
    priority = 'High'
    recommendedAction = 'Concept revision + targeted practice with progressive difficulty.'
    practiceType = 'Conceptual + Application'
    questionCount = 10
    difficultyProgression = 'Easy → Medium'
  } else if (avgTime >= 90 && accuracy < 70) {
    issueType = 'High Response Time'
    priority = 'Medium'
    recommendedAction = 'Timed practice + concept reinforcement.'
    practiceType = 'Timed Practice'
    questionCount = 8
    difficultyProgression = 'Medium'
  } else if (skipRate >= 30) {
    issueType = 'High Skip Rate'
    priority = 'Medium'
    recommendedAction = 'Foundational review + guided questions to build confidence.'
    practiceType = 'Foundational + Guided'
    questionCount = 8
    difficultyProgression = 'Easy → Medium'
  } else if (answerChanges >= 3) {
    issueType = 'Answer Instability'
    priority = 'Medium'
    recommendedAction = 'Concept clarification + targeted practice for decision confidence.'
    practiceType = 'Conceptual'
    questionCount = 8
    difficultyProgression = 'Medium'
  } else if (accuracy >= 75) {
    issueType = 'Strong Performance'
    priority = 'Low'
    recommendedAction = 'Advanced/application practice to maintain and extend mastery.'
    practiceType = 'Application Based'
    questionCount = 5
    difficultyProgression = 'Medium → Hard'
  } else {
    issueType = 'Performance Gap'
    priority = 'Medium'
    recommendedAction = 'Targeted practice with concept review.'
    practiceType = 'Mixed'
    questionCount = 8
    difficultyProgression = 'Easy → Medium'
  }

  const evidence = []
  if (incorrect > 0) evidence.push(`${incorrect}/${conceptRows.length} questions incorrect`)
  if (avgTime >= 60) evidence.push(`Avg time: ${avgTime}s`)
  if (answerChanges > 0) evidence.push(`${answerChanges} answer change(s)`)
  if (uniqueAttempts >= 2 && accuracy < 55) evidence.push(`Same concept affected ${uniqueAttempts} assessments`)
  if (skipped > 0) evidence.push(`${skipped} question(s) skipped`)

  const whyExplanation = buildWhyExplanation({ incorrect, conceptRows, avgTime, answerChanges, uniqueAttempts, accuracy, topic, chapter })

  return {
    concept: topic ?? chapter ?? 'Unknown',
    subject,
    chapter,
    topic,
    issueType,
    priority,
    evidence,
    recommendedAction,
    practiceConfig: {
      questionCount,
      difficultyProgression,
      practiceType,
      concept: topic ?? chapter,
      subject,
      chapter,
    },
    whyExplanation,
    stats: { accuracy, avgTime, incorrect, skipped, answerChanges, questions: conceptRows.length, uniqueAttempts },
  }
}

function buildWhyExplanation({ incorrect, conceptRows, avgTime, answerChanges, uniqueAttempts, accuracy, topic, chapter }) {
  const parts = []
  const conceptLabel = topic ?? chapter ?? 'this concept'
  if (incorrect > 0) {
    parts.push(`${incorrect} of ${conceptRows.length} attempted questions from ${conceptLabel} were incorrect.`)
  }
  if (avgTime >= 60) {
    parts.push(`The student spent an average of ${avgTime} seconds per question.`)
  }
  if (answerChanges >= 2) {
    parts.push(`Answers were changed ${answerChanges} time(s).`)
  }
  if (uniqueAttempts >= 2 && accuracy < 55) {
    parts.push(`The same concept was incorrect across ${uniqueAttempts} assessment(s).`)
  }
  return parts.join(' ')
}

/* ------------------------------------------------------------------ */
/* Full ground-level bundle for a student's 360° view                 */
/* ------------------------------------------------------------------ */

export function computeGroundLevelIntelligence(questionRows = []) {
  const subjectDiag = computeSubjectDiagnostics(
    questionRows,
    getUniqueSubjects(questionRows)
  )
  return {
    subjectDiagnostics: subjectDiag,
    totalQuestions: questionRows.length,
    totalTopics: new Set(questionRows.map((r) => `${r.chapter}·${r.topic}`)).size,
  }
}

function getUniqueSubjects(rows) {
  const map = new Map()
  rows.forEach((r) => {
    if (!map.has(r.subject)) {
      const subjectRows = rows.filter((x) => x.subject === r.subject)
      const attempted = subjectRows.filter((x) => x.status !== 'Skipped').length
      const correct = subjectRows.filter((x) => x.status === 'Correct').length
      map.set(r.subject, {
        subject: r.subject,
        accuracy: attempted ? round1((correct / attempted) * 100) : 0,
        questions: subjectRows.length,
        attempted,
        correct,
        incorrect: subjectRows.filter((x) => x.status === 'Incorrect').length,
        skipped: subjectRows.filter((x) => x.status === 'Skipped').length,
        avgTime: attempted ? round1(avg(subjectRows.filter((x) => (x.timeSpent ?? 0) > 0).map((x) => x.timeSpent))) : 0,
      })
    }
  })
  return [...map.values()]
}

export default {
  aggregateTopicIntelligence,
  aggregateConceptIntelligence,
  computeSubjectDiagnostics,
  computeChapterDrilldown,
  resolveEvidenceQuestions,
  generateAiObservation,
  generateWhyFlagged,
  generateInterventionRecommendation,
  computeGroundLevelIntelligence,
}
