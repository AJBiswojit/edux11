/**
 * Student Intelligence Engine — AI EXAM CONDUCTING AGENT.
 *
 * One analysis layer for the student exam-agent flow:
 *
 *   Exam Interaction  →  Question Intelligence  →  Subject / Chapter
 *   Intelligence  →  Strengths / Weaknesses  →  Recommendations
 *   →  (context bridge into) AI Exam Analysis / AI Academic DNA
 *
 * Everything here is DERIVED from the actual attempt interaction data
 * (selected answers, per-question time, visits, answer changes, review
 * flags) — the UI never hardcodes a metric. The module is UI-free and
 * Node-runnable so the engine can be tested directly.
 *
 * Honesty contract: this is a deterministic rule-based engine over real
 * interaction data, not a trained model. Consumers label it "AI Exam
 * Agent (prototype)".
 */

import { round1, avg, clamp } from './scores.js'
import { calculateExamAccuracy, examAccuracyConfigFromExam, questionsFromExamAttempt, questionsFromResultRows } from './exam-accuracy.js'

/* ------------------------------------------------------------------ */
/* Configuration                                                      */
/* ------------------------------------------------------------------ */

/** Speed thresholds (exam-seconds) per exam type + difficulty.
    Below → "fast" solve; above → "slow" solve. Used for classification. */
export const SPEED_THRESHOLDS = {
  University: { Easy: 55, Medium: 95, Hard: 150 },
  JEE: { Easy: 50, Medium: 90, Hard: 140 },
  NEET: { Easy: 35, Medium: 60, Hard: 95 },
}

export const EXAM_TYPE_LABELS = { University: 'University', JEE: 'JEE Main', NEET: 'NEET UG' }

export const ATTEMPT_CLASSIFICATIONS = {
  'fast-correct': {
    code: 'fast-correct', label: 'Strong · Efficient', tone: 'success',
    detail: 'Solved fast and correctly — a genuine strength signal.',
  },
  'slow-correct': {
    code: 'slow-correct', label: 'Concept OK · Speed can improve', tone: 'info',
    detail: 'Correct answer, but slower than the target time for this difficulty.',
  },
  'fast-incorrect': {
    code: 'fast-incorrect', label: 'Accuracy risk · Careless error', tone: 'warning',
    detail: 'Answered quickly but incorrectly — possible careless error or a guessed option.',
  },
  'slow-incorrect': {
    code: 'slow-incorrect', label: 'Priority improvement area', tone: 'danger',
    detail: 'Slow and incorrect — concept gap that needs revision plus timed practice.',
  },
  skipped: {
    code: 'skipped', label: 'Skipped', tone: 'secondary',
    detail: 'Question was visited but not answered.',
  },
  'not-visited': {
    code: 'not-visited', label: 'Not visited', tone: 'outline',
    detail: 'Never reached during the exam.',
  },
}

export const CHAPTER_LEVELS = {
  Strong: { label: 'Strong', tone: 'success', minAccuracy: 75 },
  Developing: { label: 'Developing', tone: 'warning', minAccuracy: 55 },
  Weak: { label: 'Weak', tone: 'danger', minAccuracy: 0 },
}

/* ------------------------------------------------------------------ */
/* Formatting helpers (pure, shared with UI)                          */
/* ------------------------------------------------------------------ */

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function formatPace(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}m ${String(r).padStart(2, '0')}s`
}

/* ------------------------------------------------------------------ */
/* Question intelligence — one classification per question            */
/* ------------------------------------------------------------------ */

export function classifyAttempt({ timeSpent = 0, result = 'Not visited', threshold = 60 }) {
  if (result === 'Skipped') return { code: 'skipped', ...ATTEMPT_CLASSIFICATIONS.skipped }
  if (result === 'Not visited') return { code: 'not-visited', ...ATTEMPT_CLASSIFICATIONS['not-visited'] }
  const fast = timeSpent <= threshold
  if (fast && result === 'Correct') return { code: 'fast-correct', ...ATTEMPT_CLASSIFICATIONS['fast-correct'] }
  if (!fast && result === 'Correct') return { code: 'slow-correct', ...ATTEMPT_CLASSIFICATIONS['slow-correct'] }
  if (fast && result === 'Incorrect') return { code: 'fast-incorrect', ...ATTEMPT_CLASSIFICATIONS['fast-incorrect'] }
  return { code: 'slow-incorrect', ...ATTEMPT_CLASSIFICATIONS['slow-incorrect'] }
}

const NUMERIC_WITH_UNIT_RE = /^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:[a-zA-Z%°Ωμµ][a-zA-Z0-9%°Ωμµ/^\-²³\s.]*)?$/

function isFibQuestion(question) {
  if (!question) return false
  const raw = question.questionType ?? question.qType ?? question.q_type ?? question.type ?? ''
  const lower = String(raw).toLowerCase().replace(/[-\s]/g, '_')
  return lower === 'fill_in_the_blank' || lower === 'fill_in_blank' || lower === 'fib' || lower === 'numerical' || lower === 'numeric' || lower === 'integer' || lower.includes('fill_in')
}

function extractNumericToken(raw) {
  const cleaned = String(raw ?? '').trim().replace(/,/g, '')
  if (!cleaned) return null
  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(cleaned)) {
    const val = Number(cleaned)
    if (Number.isFinite(val)) return { val, tok: cleaned }
  }
  const m = NUMERIC_WITH_UNIT_RE.exec(cleaned)
  if (m) {
    const val = Number(m[1])
    if (Number.isFinite(val)) return { val, tok: m[1] }
  }
  return null
}

export function gradeFibAnswer(expected, given) {
  if (expected == null || given == null) return false
  const exp = String(expected).trim()
  const got = String(given).trim()
  if (!exp || !got) return false
  if (exp.toLowerCase() === got.toLowerCase()) return true
  const expParsed = extractNumericToken(exp)
  const gotParsed = extractNumericToken(got)
  if (expParsed && gotParsed) {
    if (expParsed.val === gotParsed.val) return true
    if (Math.abs(expParsed.val - gotParsed.val) <= 0.1 + 1e-9 || Math.round(expParsed.val * 10) === Math.round(gotParsed.val * 10)) return true
    if (expParsed.tok.includes('.') && gotParsed.tok.includes('.') && (expParsed.val >= 0) === (gotParsed.val >= 0)) {
      const [expInt, expFracRaw] = expParsed.tok.replace(/^[+-]/, '').split('.')
      const [gotInt, gotFracRaw] = gotParsed.tok.replace(/^[+-]/, '').split('.')
      const expFrac = (expFracRaw || '').replace(/0+$/, '')
      const gotFrac = (gotFracRaw || '').replace(/0+$/, '')
      if (Number(expInt || 0) === Number(gotInt || 0) && expFrac && gotFrac) {
        const [shortF, longF] = expFrac.length <= gotFrac.length ? [expFrac, gotFrac] : [gotFrac, expFrac]
        if (shortF.length === 1 && longF.length === 2 && (longF.startsWith(shortF) || longF.endsWith(shortF))) return true
      }
    }
    return false
  }
  return false
}

function answerOf(interaction) {
  if (!interaction) return null
  if (interaction.selected != null) return interaction.selected
  const v = interaction.value
  return v != null && String(v).trim() !== '' ? String(v).trim() : null
}

function isInteractionCorrect(question, interaction) {
  const ans = answerOf(interaction)
  if (ans == null) return false
  const expected = question?.correctAnswer ?? question?.correctValue
  if (expected == null) return false
  return isFibQuestion(question) ? gradeFibAnswer(expected, ans) : ans === expected
}

function resultOf(question, interaction) {
  const ans = answerOf(interaction)
  if (ans == null) return interaction?.visited ? 'Skipped' : 'Not visited'
  return isInteractionCorrect(question, interaction) ? 'Correct' : 'Incorrect'
}

/* ------------------------------------------------------------------ */
/* Real-time (during exam) statistics                                 */
/* ------------------------------------------------------------------ */

export function computeLiveExamStats({ exam, interactions = {}, elapsedSeconds = 0 }) {
  const questions = exam.questions ?? []
  const total = questions.length
  const duration = exam.durationMinutes * 60
  const targetPace = total ? duration / total : 0

  let visited = 0
  let attempted = 0
  let correct = 0
  let timeSpent = 0
  questions.forEach((qq) => {
    const it = interactions[qq.id]
    if (!it) return
    if (it.visits > 0 || it.timeSpent > 0) visited += 1
    if (answerOf(it) != null) {
      attempted += 1
      if (isInteractionCorrect(qq, it)) correct += 1
    }
    timeSpent += it.timeSpent ?? 0
  })

  const incorrect = attempted - correct
  const skipped = visited - attempted
  const notVisited = total - visited
  const accuracy = round1(calculateExamAccuracy({
    questions: questionsFromExamAttempt({ questions, interactions, exam }),
    examConfig: examAccuracyConfigFromExam(exam),
  }).accuracy)
  const avgTimePerQuestion = visited ? round1(timeSpent / visited) : 0
  const currentPace = visited ? round1(elapsedSeconds / visited) : targetPace
  const remainingTime = Math.max(0, duration - elapsedSeconds)
  const remainingQuestions = Math.max(0, total - attempted)
  const requiredPace = remainingQuestions ? round1(remainingTime / remainingQuestions) : 0

  /* time pressure — subtle language used by the live strip */
  const ratio = requiredPace ? currentPace / requiredPace : 1
  let pace = { level: 'on-track', message: 'On track.' }
  if (!visited) pace = { level: 'idle', message: 'Start answering to compute pace.' }
  else if (remainingTime <= 60) pace = { level: 'final-minute', message: 'Final minute — lock in your answers.' }
  else if (ratio <= 0.85) pace = { level: 'ahead', message: 'Ahead of pace — keep the rhythm.' }
  else if (ratio <= 1.1) pace = { level: 'on-track', message: 'On track.' }
  else if (ratio <= 1.35) pace = { level: 'slightly-behind', message: 'Running slightly behind.' }
  else pace = { level: 'behind', message: 'Running behind — pick up the pace.' }

  const timeEfficiency = Math.round(clamp(100 - Math.max(0, (currentPace - targetPace) / (targetPace || 1)) * 80, 0, 100))

  return {
    attempted,
    correct,
    incorrect,
    skipped,
    notVisited,
    visited,
    total,
    accuracy,
    avgTimePerQuestion,
    currentPace,
    requiredPace,
    remainingTime,
    remainingQuestions,
    timeEfficiency,
    pace,
  }
}

/* ------------------------------------------------------------------ */
/* Post-exam report — the full analysis                               */
/* ------------------------------------------------------------------ */

export function buildExamAgentReport({ exam, interactions = {}, elapsedSeconds = 0, completedAt = null, foundation = null }) {
  const questions = exam.questions ?? []
  const duration = exam.durationMinutes * 60
  const usedSeconds = Math.min(elapsedSeconds, duration)
  const targetPace = questions.length ? duration / questions.length : 0
  const marks = exam.marksPerQuestion ?? 0
  const neg = exam.negativeMarksPerQuestion ?? 0
  const thresholdByDifficulty = SPEED_THRESHOLDS[exam.type] ?? SPEED_THRESHOLDS.University

  /* ----- per-question rows (question intelligence) ----- */
  const rows = questions.map((qq, i) => {
    const it = interactions[qq.id] ?? {}
    const result = resultOf(qq, it)
    const threshold = thresholdByDifficulty[qq.difficulty] ?? 90
    const classification = classifyAttempt({ timeSpent: it.timeSpent ?? 0, result, threshold })
    return {
      index: i + 1,
      id: qq.id,
      subject: qq.subject,
      chapter: qq.chapter,
      topic: qq.topic,
      difficulty: qq.difficulty,
      question: qq.question,
      options: qq.options,
      correctAnswer: qq.correctAnswer,
      selected: answerOf(it),
      marks: qq.marks ?? marks,
      negativeMarks: isFibQuestion(qq) ? 0 : (qq.negativeMarks ?? neg),
      result,
      timeSpent: Math.round(it.timeSpent ?? 0),
      threshold,
      visits: it.visits ?? 0,
      revisits: Math.max(0, (it.visits ?? 0) - 1),
      answerChanges: it.answerChanges ?? 0,
      markedForReview: !!it.markedForReview,
      classification,
      observation: buildObservation(classification, it, qq, threshold),
    }
  })

  /* ----- overall ----- */
  const correct = rows.filter((r) => r.result === 'Correct').length
  const incorrect = rows.filter((r) => r.result === 'Incorrect').length
  const skipped = rows.filter((r) => r.result === 'Skipped').length
  const notVisited = rows.filter((r) => r.result === 'Not visited').length
  const attempted = correct + incorrect
  const score = rows.reduce((s, r) => s + (r.result === 'Correct' ? r.marks : r.result === 'Incorrect' ? -r.negativeMarks : 0), 0)
  const maxScore = exam.totalMarks ?? rows.reduce((s, r) => s + r.marks, 0)
  const pct = maxScore ? round1((score / maxScore) * 100) : 0
  const accuracy = round1(calculateExamAccuracy({
    questions: questionsFromResultRows(rows),
    examConfig: examAccuracyConfigFromExam(exam),
  }).accuracy)
  const attemptRate = questions.length ? round1((attempted / questions.length) * 100) : 0
  const visitedCount = rows.filter((r) => r.visits > 0 || r.timeSpent > 0).length
  const avgTimePerQuestion = visitedCount ? round1(usedSeconds / visitedCount) : 0
  const currentPace = avgTimePerQuestion || targetPace
  const timeEfficiency = Math.round(clamp(100 - Math.max(0, (currentPace - targetPace) / (targetPace || 1)) * 80, 0, 100))

  const paceRatio = currentPace / (targetPace || 1)
  const paceStatus = paceRatio <= 0.85 ? 'ahead' : paceRatio <= 1.1 ? 'on-track' : paceRatio <= 1.35 ? 'slightly-behind' : 'behind'
  const paceMessage =
    paceStatus === 'ahead' ? 'Finished ahead of the planned pace.'
      : paceStatus === 'on-track' ? 'Paced well against the paper plan.'
        : paceStatus === 'slightly-behind' ? 'Ran slightly behind the planned pace.'
          : 'Ran behind the planned pace — time pressure affected the closing questions.'

  /* ----- subject analysis ----- */
  const subjects = [...new Set(rows.map((r) => r.subject))].map((subject) => {
    const sRows = rows.filter((r) => r.subject === subject)
    const sCorrect = sRows.filter((r) => r.result === 'Correct').length
    const sIncorrect = sRows.filter((r) => r.result === 'Incorrect').length
    const sSkipped = sRows.filter((r) => r.result === 'Skipped').length
    const sNotVisited = sRows.filter((r) => r.result === 'Not visited').length
    const sAttempted = sCorrect + sIncorrect
    const sAccuracy = sAttempted ? round1((sCorrect / sAttempted) * 100) : 0
    const sAvg = sRows.length ? round1(avg(sRows, 'timeSpent')) : 0
    const sThresh = avg(sRows.map((r) => r.threshold))
    const speedFactor = sThresh ? clamp(100 - (Math.max(0, sAvg - sThresh) / sThresh) * 60, 0, 100) : 80
    const strengthScore = sAttempted >= 3
      ? Math.round(clamp(sAccuracy * 0.6 + (sAttempted / sRows.length) * 100 * 0.25 + speedFactor * 0.15, 0, 100))
      : null
    return {
      subject,
      attempted: sAttempted,
      correct: sCorrect,
      incorrect: sIncorrect,
      skipped: sSkipped,
      notVisited: sNotVisited,
      total: sRows.length,
      attemptRate: sRows.length ? round1((sAttempted / sRows.length) * 100) : 0,
      accuracy: sAccuracy,
      avgTime: sAvg,
      strengthScore,
      level: sAttempted < 3 ? 'Limited data' : sAccuracy >= 75 ? 'Strong' : sAccuracy >= 55 ? 'Developing' : 'Weak',
    }
  })

  /* ----- chapter analysis ----- */
  const chapters = [...new Map(rows.map((r) => [`${r.subject}·${r.chapter}`, r])).values()].map((first) => {
    const cRows = rows.filter((r) => r.subject === first.subject && r.chapter === first.chapter)
    const cAttempted = cRows.filter((r) => r.selected != null).length
    const cCorrect = cRows.filter((r) => r.result === 'Correct').length
    const cIncorrect = cRows.filter((r) => r.result === 'Incorrect').length
    const cSkipped = cRows.filter((r) => r.result === 'Skipped').length
    const cAccuracy = cAttempted ? round1((cCorrect / cAttempted) * 100) : null
    const cAvg = cRows.length ? round1(avg(cRows, 'timeSpent')) : 0
    const cThresh = avg(cRows.map((r) => r.threshold))
    const highTime = cAttempted > 0 && cAvg > cThresh * 1.25
    const level = cAttempted === 0 ? 'Not attempted'
      : cAccuracy >= 75 ? 'Strong' : cAccuracy >= 55 ? 'Developing' : 'Weak'
    return {
      subject: first.subject,
      chapter: first.chapter,
      topics: [...new Set(cRows.map((r) => r.topic))],
      attempted: cAttempted,
      correct: cCorrect,
      incorrect: cIncorrect,
      skipped: cSkipped,
      accuracy: cAccuracy,
      avgTime: cAvg,
      threshold: cThresh,
      highTime,
      level,
    }
  })

  /* ----- strengths / weaknesses (chapter-level, from the attempt) ----- */
  const strengths = chapters
    .filter((c) => c.level === 'Strong' && c.attempted >= 2)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)
    .map((c) => ({
      topic: c.chapter,
      subject: c.subject,
      accuracy: c.accuracy,
      avgTime: c.avgTime,
      speedNote: c.avgTime <= c.threshold * 1.15 ? 'good solving speed' : 'accuracy strong; speed can improve',
    }))

  const weaknesses = chapters
    .filter((c) => (c.level === 'Weak' || (c.level === 'Developing' && c.highTime)) && c.attempted >= 1)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 5)
    .map((c) => ({
      topic: c.chapter,
      subject: c.subject,
      accuracy: c.accuracy,
      avgTime: c.avgTime,
      attempted: c.attempted,
      timeNote: c.highTime ? 'high time consumption' : null,
      reason: `${c.chapter} — ${c.accuracy}% accuracy${c.highTime ? ', high time consumption' : ''}`,
    }))

  /* ----- classification rollup ----- */
  const classificationCounts = {
    'fast-correct': rows.filter((r) => r.classification.code === 'fast-correct').length,
    'slow-correct': rows.filter((r) => r.classification.code === 'slow-correct').length,
    'fast-incorrect': rows.filter((r) => r.classification.code === 'fast-incorrect').length,
    'slow-incorrect': rows.filter((r) => r.classification.code === 'slow-incorrect').length,
    skipped: rows.filter((r) => r.classification.code === 'skipped').length,
    'not-visited': rows.filter((r) => r.classification.code === 'not-visited').length,
  }

  /* ----- accuracy trend (rolling, in question order) ----- */
  const accuracyTrend = []
  let cumCorrect = 0
  let cumAttempted = 0
  rows.forEach((r) => {
    if (r.selected != null) {
      cumAttempted += 1
      if (r.result === 'Correct') cumCorrect += 1
    }
    accuracyTrend.push({ label: `Q${r.index}`, value: cumAttempted ? round1((cumCorrect / cumAttempted) * 100) : null })
  })

  const totalAnswerChanges = rows.reduce((s, r) => s + r.answerChanges, 0)
  const totalRevisits = rows.reduce((s, r) => s + r.revisits, 0)

  const overall = {
    score: Math.max(score, 0),
    maxScore,
    pct,
    accuracy,
    attemptRate,
    correct,
    incorrect,
    skipped,
    notVisited,
    attempted,
    unanswered: skipped + notVisited,
    timeEfficiency,
    avgTimePerQuestion,
    usedSeconds: Math.round(usedSeconds),
    durationSeconds: duration,
    timeUsagePct: duration ? Math.round((usedSeconds / duration) * 100) : 0,
    totalAnswerChanges,
    totalRevisits,
  }

  const distribution = [
    { name: 'Correct', value: correct, color: '#10b981' },
    { name: 'Incorrect', value: incorrect, color: '#f43f5e' },
    { name: 'Skipped', value: skipped, color: '#f59e0b' },
    { name: 'Not visited', value: notVisited, color: '#94a3b8' },
  ].filter((d) => d.value > 0)

  const recommendations = buildRecommendations({ rows, overall, chapters, classificationCounts, paceStatus, currentPace, targetPace, exam })

  return {
    examId: exam.id,
    examTitle: exam.title,
    shortTitle: exam.shortTitle,
    examType: exam.type,
    examTypeLabel: EXAM_TYPE_LABELS[exam.type] ?? exam.type,
    category: exam.category,
    subject: exam.subject,
    subjectCode: exam.subjectCode,
    durationMinutes: exam.durationMinutes,
    completedAt,
    overall,
    distribution,
    classifications: classificationCounts,
    accuracyTrend,
    pace: {
      targetPace: round1(targetPace),
      currentPace: round1(currentPace),
      status: paceStatus,
      message: paceMessage,
      timeEfficiency,
    },
    questions: rows,
    subjects,
    chapters,
    strengths,
    weaknesses,
    recommendations,
    integration: buildIntegration({ exam, report: { overall, strengths, weaknesses }, foundation }),
  }
}

/* ------------------------------------------------------------------ */
/* AI observation per question (from the classification)              */
/* ------------------------------------------------------------------ */

function buildObservation(classification, it, question, threshold) {
  const time = formatPace(it.timeSpent ?? 0)
  switch (classification.code) {
    case 'fast-correct':
      return `Strong, efficient solve (${time}) — among your fastest correct answers.`
    case 'slow-correct':
      return `Correct in ${time} — concept is clear; target for this difficulty is ${formatPace(threshold)}.`
    case 'fast-incorrect':
      return `Answered in ${time} but incorrect — careless-error risk. Correct option was ${'ABCD'[question.correctAnswer]}.`
    case 'slow-incorrect':
      return `Slow (${time}) and incorrect — priority improvement area. Correct option was ${'ABCD'[question.correctAnswer]}.`
    case 'skipped':
      return it.visits > 1
        ? `Skipped first, revisited later${it.selected != null ? ' and answered' : ' but left unanswered'}.`
        : `Skipped (${time} spent before moving on).`
    default:
      return 'Not reached during the exam.'
  }
}

/* ------------------------------------------------------------------ */
/* Server reconciliation                                              */
/*                                                                    */
/* Delivery payloads intentionally omit `correctAnswer` and may carry */
/* zeroed marks, so the client-only report scores every answered      */
/* question as Incorrect and shows 0 / 0. After submission the server */
/* returns the authoritative attempt (scoring + per-question          */
/* evaluation). This overlays that truth onto the report and          */
/* recomputes the derived rollups from the corrected per-question     */
/* rows so subjects / chapters / trends stay consistent.              */
/* ------------------------------------------------------------------ */

export function reconcileReportWithServerAttempt(report, attempt) {
  if (!report || !attempt) return report
  const qas = attempt.questionAttempts ?? []
  if (!qas.length) return report

  const byId = new Map(qas.map((qa) => [String(qa.questionId ?? qa.question?.id), qa]))

  const rows = report.questions.map((row) => {
    const qa = byId.get(String(row.id))
    if (!qa) return row
    const ev = qa.evaluation ?? {}
    const resp = qa.response ?? {}
    const selected = resp.selected ?? row.selected ?? null
    const marks = ev.maxMarks != null ? ev.maxMarks : row.marks
    let result
    if (selected == null) {
      result = row.visits > 0 || row.timeSpent > 0 ? 'Skipped' : 'Not visited'
    } else if (ev.isCorrect === true) {
      result = 'Correct'
    } else if (ev.isCorrect === false) {
      result = 'Incorrect'
    } else {
      result = row.result
    }
    return { ...row, selected, marks, result }
  })

  const correct = rows.filter((r) => r.result === 'Correct').length
  const incorrect = rows.filter((r) => r.result === 'Incorrect').length
  const skipped = rows.filter((r) => r.result === 'Skipped').length
  const notVisited = rows.filter((r) => r.result === 'Not visited').length
  const attempted = correct + incorrect

  const scoring = attempt.scoring ?? {}
  const score = scoring.score != null ? scoring.score : correct
  const maxScore = scoring.maxScore != null && scoring.maxScore > 0
    ? scoring.maxScore
    : (report.overall.maxScore || rows.reduce((s, r) => s + (r.marks ?? 0), 0))
  const pct = scoring.percentage != null
    ? round1(scoring.percentage)
    : (maxScore ? round1((score / maxScore) * 100) : 0)
  const accuracy = scoring.accuracy != null
    ? round1(scoring.accuracy)
    : round1(calculateExamAccuracy({
      questions: questionsFromResultRows(rows),
      examConfig: examAccuracyConfigFromExam(attempt.exam ?? report.exam ?? {}),
    }).accuracy)
  const attemptRate = rows.length ? round1((attempted / rows.length) * 100) : 0

  const distribution = [
    { name: 'Correct', value: correct, color: '#10b981' },
    { name: 'Incorrect', value: incorrect, color: '#f43f5e' },
    { name: 'Skipped', value: skipped, color: '#f59e0b' },
    { name: 'Not visited', value: notVisited, color: '#94a3b8' },
  ].filter((d) => d.value > 0)

  const accuracyTrend = []
  let cumCorrect = 0
  let cumAttempted = 0
  rows.forEach((r, i) => {
    if (r.selected != null) {
      cumAttempted += 1
      if (r.result === 'Correct') cumCorrect += 1
    }
    accuracyTrend.push({ label: `Q${i + 1}`, value: cumAttempted ? round1((cumCorrect / cumAttempted) * 100) : null })
  })

  const subjects = [...new Set(rows.map((r) => r.subject))].map((subject) => {
    const sRows = rows.filter((r) => r.subject === subject)
    const sCorrect = sRows.filter((r) => r.result === 'Correct').length
    const sIncorrect = sRows.filter((r) => r.result === 'Incorrect').length
    const sSkipped = sRows.filter((r) => r.result === 'Skipped').length
    const sNotVisited = sRows.filter((r) => r.result === 'Not visited').length
    const sAttempted = sCorrect + sIncorrect
    const sAccuracy = sAttempted ? round1((sCorrect / sAttempted) * 100) : 0
    const sAvg = sRows.length ? round1(avg(sRows, 'timeSpent')) : 0
    const sThresh = avg(sRows.map((r) => r.threshold))
    const speedFactor = sThresh ? clamp(100 - (Math.max(0, sAvg - sThresh) / sThresh) * 60, 0, 100) : 80
    const strengthScore = sAttempted >= 3
      ? Math.round(clamp(sAccuracy * 0.6 + (sAttempted / sRows.length) * 100 * 0.25 + speedFactor * 0.15, 0, 100))
      : null
    return {
      subject,
      attempted: sAttempted,
      correct: sCorrect,
      incorrect: sIncorrect,
      skipped: sSkipped,
      notVisited: sNotVisited,
      total: sRows.length,
      attemptRate: sRows.length ? round1((sAttempted / sRows.length) * 100) : 0,
      accuracy: sAccuracy,
      avgTime: sAvg,
      strengthScore,
      level: sAttempted < 3 ? 'Limited data' : sAccuracy >= 75 ? 'Strong' : sAccuracy >= 55 ? 'Developing' : 'Weak',
    }
  })

  const chapters = [...new Map(rows.map((r) => [`${r.subject}·${r.chapter}`, r])).values()].map((first) => {
    const cRows = rows.filter((r) => r.subject === first.subject && r.chapter === first.chapter)
    const cAttempted = cRows.filter((r) => r.selected != null).length
    const cCorrect = cRows.filter((r) => r.result === 'Correct').length
    const cIncorrect = cRows.filter((r) => r.result === 'Incorrect').length
    const cSkipped = cRows.filter((r) => r.result === 'Skipped').length
    const cAccuracy = cAttempted ? round1((cCorrect / cAttempted) * 100) : null
    const cAvg = cRows.length ? round1(avg(cRows, 'timeSpent')) : 0
    const cThresh = avg(cRows.map((r) => r.threshold))
    const highTime = cAttempted > 0 && cAvg > cThresh * 1.25
    const level = cAttempted === 0 ? 'Not attempted'
      : cAccuracy >= 75 ? 'Strong' : cAccuracy >= 55 ? 'Developing' : 'Weak'
    return {
      subject: first.subject,
      chapter: first.chapter,
      topics: [...new Set(cRows.map((r) => r.topic))],
      attempted: cAttempted,
      correct: cCorrect,
      incorrect: cIncorrect,
      skipped: cSkipped,
      accuracy: cAccuracy,
      avgTime: cAvg,
      threshold: cThresh,
      highTime,
      level,
    }
  })

  const strengths = chapters
    .filter((c) => c.level === 'Strong' && c.attempted >= 2)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5)
    .map((c) => ({
      topic: c.chapter,
      subject: c.subject,
      accuracy: c.accuracy,
      avgTime: c.avgTime,
      speedNote: c.avgTime <= c.threshold * 1.15 ? 'good solving speed' : 'accuracy strong; speed can improve',
    }))

  const weaknesses = chapters
    .filter((c) => (c.level === 'Weak' || (c.level === 'Developing' && c.highTime)) && c.attempted >= 1)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 5)
    .map((c) => ({
      topic: c.chapter,
      subject: c.subject,
      accuracy: c.accuracy,
      avgTime: c.avgTime,
      attempted: c.attempted,
      timeNote: c.highTime ? 'high time consumption' : null,
      reason: `${c.chapter} — ${c.accuracy}% accuracy${c.highTime ? ', high time consumption' : ''}`,
    }))

  const overall = {
    ...report.overall,
    score: Math.max(score, 0),
    maxScore,
    pct,
    accuracy,
    attemptRate,
    correct,
    incorrect,
    skipped,
    notVisited,
    attempted,
    unanswered: skipped + notVisited,
  }

  return { ...report, questions: rows, overall, distribution, accuracyTrend, subjects, chapters, strengths, weaknesses }
}

/* ------------------------------------------------------------------ */
/* Recommendations — generated from the actual attempt data           */
/* ------------------------------------------------------------------ */

function buildRecommendations({ rows, overall, chapters, classificationCounts, paceStatus, currentPace, targetPace, exam }) {
  const recs = []
  let id = 1
  const push = (priority, title, body, source) => recs.push({ id: `ea-rec-${id++}`, priority, title, body, source })

  /* 1. weakest chapters → timed practice (spec example: "Practice 15 timed Rotational Motion questions.") */
  const weakSorted = chapters
    .filter((c) => c.level === 'Weak' && c.attempted >= 1)
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 3)
  weakSorted.forEach((c) => {
    const n = c.accuracy < 40 ? 20 : c.accuracy < 60 ? 15 : 10
    push(
      c.accuracy < 60 ? 'High' : 'Medium',
      `Practice ${n} timed ${c.chapter} questions.`,
      `Your accuracy in ${c.chapter} (${c.subject}) was ${c.accuracy}% across ${c.attempted} attempt${c.attempted === 1 ? '' : 's'}. Revise the fundamentals first, then run ${n} timed questions to build recall speed.`,
      'accuracy'
    )
  })

  /* 2. high-time chapters → speed work */
  chapters
    .filter((c) => c.highTime && c.level !== 'Weak' && c.attempted >= 1)
    .slice(0, 2)
    .forEach((c) => {
      push(
        'Medium',
        `Work on speed in ${c.chapter}.`,
        `Average ${formatPace(c.avgTime)} per question vs a target of ${formatPace(c.threshold)} — run a 10-question timed sprint in this chapter.`,
        'speed'
      )
    })

  /* 3. careless errors */
  if (classificationCounts['fast-incorrect'] >= 2) {
    push(
      'High',
      'Slow down on easy questions.',
      `${classificationCounts['fast-incorrect']} answers were fast but incorrect — a careless-error pattern. Re-read every option before locking in your answer.`,
      'accuracy'
    )
  }

  /* 4. negative-marking discipline */
  if ((exam.negativeMarksPerQuestion ?? 0) > 0 && overall.incorrect >= 2) {
    push(
      'Medium',
      'Protect marks from negative marking.',
      `${overall.incorrect} incorrect answers cost ${overall.incorrect * exam.negativeMarksPerQuestion} marks (−${exam.negativeMarksPerQuestion} each). Skip low-confidence questions instead of guessing.`,
      'strategy'
    )
  }

  /* 5. answer churn */
  if (overall.totalAnswerChanges >= 3) {
    push(
      'Medium',
      'Reduce answer churn.',
      `${overall.totalAnswerChanges} answer changes across the paper — your first full-read choice is often right. Change an answer only when you can name the reason.`,
      'strategy'
    )
  }

  /* 6. skipped coverage */
  if (overall.skipped + overall.notVisited > 0) {
    const skippedChapters = [...new Set(
      rows.filter((r) => r.result === 'Skipped' || r.result === 'Not visited').map((r) => r.chapter)
    )].slice(0, 3).join(', ')
    push(
      'Medium',
      'Revisit skipped areas.',
      `${overall.skipped + overall.notVisited} question${overall.skipped + overall.notVisited === 1 ? ' was' : 's were'} left unattempted${skippedChapters ? ` across ${skippedChapters}` : ''} — fold these chapters into your revision plan.`,
      'coverage'
    )
  }

  /* 7. pace */
  if (paceStatus === 'slightly-behind' || paceStatus === 'behind') {
    push(
      'High',
      'Run a pace drill.',
      `Current pace ${formatPace(currentPace)} per question vs the planned ${formatPace(targetPace)} — add one timed mock section per day until you close the gap.`,
      'pace'
    )
  }

  return recs
}

/* ------------------------------------------------------------------ */
/* Integration bridge — AI Exam Analysis / AI Academic DNA context    */
/* ------------------------------------------------------------------ */

function buildIntegration({ exam, report, foundation }) {
  if (!foundation) return null
  const dna = foundation.academicDna ?? {}
  const byFamily = foundation.readinessByFamily ?? {}
  const uniReadiness = foundation.universityReadiness ?? []
  const family = exam.type === 'JEE' || exam.type === 'NEET' ? exam.type : null
  const familyData = family ? byFamily[family] : null
  const subjectMastery = (dna.mastery ?? []).find((m) => m.subjectCode === exam.subjectCode)

  const notes = []
  if (family && familyData?.score != null) {
    notes.push({
      tone: 'neutral',
      title: `${family} readiness context`,
      body: `Your AI Academic DNA rates ${family} preparation as “${familyData.level ?? '—'}” (${familyData.score}/100). This attempt scored ${report.overall.pct}% with ${report.overall.accuracy}% accuracy — a direct practice-data point for that readiness curve.`,
    })
  }
  if (subjectMastery && report.overall.attempted > 0) {
    notes.push({
      tone: 'neutral',
      title: `${subjectMastery.subject} DNA alignment`,
      body: `AI Academic DNA marks ${subjectMastery.subject} mastery at ${subjectMastery.mastery}% (${subjectMastery.level}). Your accuracy in this ${exam.shortTitle} attempt: ${report.overall.accuracy}%.`,
    })
  }
  const dnaStrongMatch = report.strengths[0]
  if (dnaStrongMatch) {
    notes.push({
      tone: 'positive',
      title: 'Strength confirmed by DNA',
      body: `${dnaStrongMatch.topic} shows ${dnaStrongMatch.accuracy}% accuracy with ${dnaStrongMatch.speedNote} — consistent with the mastery signals in your AI Academic DNA.`,
    })
  }

  return {
    learningStyle: dna.learningStyle ?? null,
    dnaStrongConcepts: (dna.strongConcepts ?? []).slice(0, 4),
    dnaWeakConcepts: (dna.weakConcepts ?? []).slice(0, 4),
    familyReadiness: familyData ? { family, score: familyData.score, level: familyData.level ?? '—' } : null,
    subjectMastery: subjectMastery
      ? { subjectCode: subjectMastery.subjectCode, subject: subjectMastery.subject, mastery: subjectMastery.mastery, level: subjectMastery.level }
      : null,
    notes,
  }
}

/* ------------------------------------------------------------------ */
/* Demo Monitoring — deterministic simulated student                  */
/* ------------------------------------------------------------------ */

/** Deterministic seeded PRNG (mulberry32) — the same exam always yields
    the same demo attempt, but different exams yield different patterns. */
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

function seedFromString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Builds the Demo Monitoring script for an exam: per-question dwell times,
 * answers (with strong/weak chapter bias), skips, revisits, answer changes
 * and review flags. Realistic VARIED behaviour — never identical questions.
 */
export function buildDemoSimulationPlan(exam) {
  const rand = mulberry32(seedFromString(exam.id) ^ 0xa1a2a3)
  const profile = exam.demoProfile ?? { strongChapters: [], weakChapters: [], baseAccuracy: 0.72 }
  const baseAccuracy = profile.baseAccuracy ?? 0.72
  const ranges = { Easy: [25, 55], Medium: [55, 95], Hard: [95, 150] }

  const visits = exam.questions.map((qq, i) => {
    const isStrong = profile.strongChapters?.includes(qq.chapter)
    const isWeak = profile.weakChapters?.includes(qq.chapter)
    const skip = rand() < (isWeak ? 0.34 : 0.1)
    const acc = isStrong ? 0.9 : isWeak ? 0.45 : baseAccuracy
    const [lo, hi] = ranges[qq.difficulty] ?? [55, 95]
    let dwell = lo + rand() * (hi - lo)
    if (isWeak) dwell *= 1.18
    if (isStrong) dwell *= 0.92
    const correct = rand() < acc
    const answer = skip ? null : correct ? qq.correctAnswer : pickWrong(qq, rand)
    return {
      qIndex: i,
      dwell: Math.round(dwell),
      answer,
      skip,
      markReview: !skip && rand() < 0.14,
      change: !skip && rand() < 0.22 ? 1 : 0,
      revisitLater: skip && rand() < 0.5,
    }
  })

  const revisits = visits
    .filter((v) => v.revisitLater)
    .map((v) => ({
      qIndex: v.qIndex,
      dwell: 25 + Math.round(rand() * 20),
      answer: rand() < 0.55 ? exam.questions[v.qIndex].correctAnswer : null,
      revisit: true,
    }))

  return { visits, revisits }
}

function pickWrong(qq, rand) {
  const others = [0, 1, 2, 3].filter((o) => o !== qq.correctAnswer)
  return others[Math.floor(rand() * others.length)]
}

/** Demo clock scale: compresses the full paper into ~60–75 real seconds. */
export function demoTimeScale(exam) {
  const total = exam.durationMinutes * 60
  return Math.max(6, Math.round(total / 60))
}

/* ================================================================== */
/* Phase 1 — CANONICAL EXAM ATTEMPT CONTRACT                          */
/* ================================================================== */
/* Implements the Phase 0 audit contract
   (docs/PHASE_0_FACULTY_EXAM_INTEGRATION_AUDIT.md §9–§13):
   · examMode = category ('University'|'Competitive')
   · examFamily = type ('JEE'|'NEET'|null)
   · denormalized exam snapshot + embedded question metadata (stable
     even if the original exam dataset later changes)
   · student identity (studentId · roll), startedAt/submittedAt, source,
     batchId/sectionId placeholders (Phase 3 populates them)
   · raw vs derived separation — `interactions` (raw) and `summary`
     (derived, recomputable) are preserved for backward compatibility
   · normalizeExamAttempt() — deterministic normalizer for OLD and NEW
     records (no AI inference; legacy records without new fields are
     upgraded using the stable exam dataset when available)
   · filterExamAttempts() — the analytics filter future consumers use;
     demo attempts are EXCLUDED by default.
   Every function is pure and Node-runnable for contract tests. */

const LETTERS = ['A', 'B', 'C', 'D']

function deriveInteractionStatus(it = {}) {
  const visited = !!it.visited || (it.visits ?? 0) > 0 || (it.timeSpent ?? 0) > 0
  if (!visited) return 'not-visited'
  return answerOf(it) != null ? 'answered' : 'skipped'
}

function interactionToCanonical(questionId, it = {}) {
  const selected = answerOf(it)
  const status = deriveInteractionStatus(it)
  return {
    questionId,
    questionNumber: null,
    question: {
      text: null, type: null, difficulty: null, options: [],
      correctAnswer: it.correctAnswer ?? null,
      correctAnswerLetter: typeof it.correctAnswer === 'number' ? LETTERS[it.correctAnswer] ?? null : null,
      marks: null, negativeMarks: null,
    },
    academicContext: { subject: null, chapter: null, topic: null, concept: null },
    response: {
      selectedAnswer: selected,
      value: it.value != null && String(it.value).trim() !== '' ? String(it.value).trim() : null,
      selectedLetter: typeof selected === 'number' ? LETTERS[selected] ?? null : null,
      answerChanges: it.answerChanges ?? 0,
      markedForReview: !!it.markedForReview,
      status,
    },
    timing: {
      timeSpent: Math.round(it.timeSpent ?? 0),
      firstViewedAt: it.firstViewedAt ?? null,
      lastViewedAt: it.lastViewedAt ?? null,
    },
    behaviour: {
      visits: it.visits ?? 0,
      revisitCount: Math.max(0, (it.visits ?? 0) - 1),
      attemptCount: it.visits ?? 0,
    },
    evaluation: {
      isCorrect: selected != null && it.correctAnswer != null ? selected === it.correctAnswer : null,
      isSkipped: status === 'skipped',
      classification: null,
    },
  }
}

/** Canonical QuestionAttempt[] — maps the existing interaction record
    (selected/timeSpent/visits/answerChanges/markedForReview/visited) into
    the Phase 0 §10 contract. `report` (optional) supplies the derived
    classification without recomputing it. */
export function buildCanonicalQuestionAttempts({ exam, interactions = {}, report = null }) {
  const questions = exam.questions ?? []
  const rows = report?.questions ?? []
  const rowById = new Map(rows.map((r) => [r.id, r]))
  const thresholds = SPEED_THRESHOLDS[exam.type] ?? SPEED_THRESHOLDS.University
  return questions.map((qq, i) => {
    const it = interactions[qq.id] ?? {}
    const selected = answerOf(it)
    const isFib = isFibQuestion(qq)
    const status = deriveInteractionStatus(it)
    const isCorrect = status === 'answered' ? isInteractionCorrect(qq, it) : false
    const row = rowById.get(qq.id)
    const classification = row?.classification ?? classifyAttempt({
      timeSpent: it.timeSpent ?? 0,
      result: status === 'answered' ? (isCorrect ? 'Correct' : 'Incorrect') : 'Skipped',
      threshold: thresholds[qq.difficulty] ?? 90,
    })
    return {
      questionId: qq.id,
      questionNumber: i + 1,
      question: {
        text: qq.question,
        type: qq.type ?? 'MCQ',
        difficulty: qq.difficulty,
        options: qq.options ?? [],
        correctAnswer: qq.correctAnswer ?? null,
        correctAnswerLetter: typeof qq.correctAnswer === 'number' ? LETTERS[qq.correctAnswer] ?? null : null,
        marks: qq.marks ?? exam.marksPerQuestion ?? 0,
        negativeMarks: isFib ? 0 : (qq.negativeMarks ?? exam.negativeMarksPerQuestion ?? 0),
      },
      academicContext: { subject: qq.subject ?? null, chapter: qq.chapter ?? null, topic: qq.topic ?? null, concept: null },
      response: {
        selectedAnswer: selected,
        value: isFib ? selected : (it.value ?? null),
        selectedLetter: typeof selected === 'number' ? LETTERS[selected] ?? null : null,
        answerChanges: it.answerChanges ?? 0,
        markedForReview: !!it.markedForReview,
        status,
      },
      timing: {
        timeSpent: Math.round(it.timeSpent ?? 0),
        firstViewedAt: it.firstViewedAt ?? null,
        lastViewedAt: it.lastViewedAt ?? null,
      },
      behaviour: {
        visits: it.visits ?? 0,
        revisitCount: Math.max(0, (it.visits ?? 0) - 1),
        attemptCount: it.visits ?? 0,
      },
      evaluation: {
        isCorrect,
        isSkipped: status === 'skipped',
        classification: classification.code,
      },
    }
  })
}

/** Canonical ExamAttempt — the Phase 0 §9 contract. Uses the existing
    field names; `interactions` (raw) and `summary` (derived, recomputable)
    are preserved for backward compatibility with the exam-agent history
    and report flows. `report` (optional) reuses an already-computed
    analysis instead of recomputing it. */
export function buildCanonicalExamAttempt({
  exam, interactions = {}, elapsedSeconds = 0, completedAt = null, startedAt = null,
  studentId = null, roll = null, mode = 'manual', batchId = null, sectionId = null,
  interventionId = null, report = null,
}) {
  const rep = report ?? buildExamAgentReport({ exam, interactions, elapsedSeconds, completedAt })
  const o = rep.overall
  const submittedAt = completedAt ?? new Date().toISOString()
  const usedSeconds = Math.min(elapsedSeconds || 0, (exam.durationMinutes ?? 0) * 60)
  const competitive = exam.type === 'JEE' || exam.type === 'NEET'
  return {
    id: `ea-attempt-${Date.now()}`,
    studentId,
    interventionId,
    roll,
    examId: exam.id,
    examName: exam.title,
    examTitle: exam.title,
    shortTitle: exam.shortTitle,
    examMode: exam.category ?? (competitive ? 'Competitive' : 'University'),
    examFamily: competitive ? exam.type : null,
    examType: exam.type,
    category: exam.category ?? (competitive ? 'Competitive' : 'University'),
    subject: exam.subject ?? null,
    mode,
    source: 'exam-agent',
    startedAt,
    submittedAt,
    completedAt: submittedAt, // backward-compat alias — submittedAt === completedAt
    batchId,
    sectionId,
    exam: {
      totalMarks: exam.totalMarks ?? o.maxScore,
      durationMinutes: exam.durationMinutes ?? null,
      marksPerQuestion: exam.marksPerQuestion ?? 0,
      negativeMarksPerQuestion: exam.negativeMarksPerQuestion ?? 0,
      difficulty: exam.difficulty ?? 'Mixed',
      subject: exam.subject ?? null,
      subjectCode: exam.subjectCode ?? null,
      course: exam.subjectCode ?? (competitive ? `${exam.type} · ${exam.subject ?? ''}` : null),
    },
    timing: {
      elapsedSeconds: Math.round(usedSeconds),
      timeUsagePct: o.timeUsagePct,
    },
    scoring: {
      score: o.score,
      maxScore: o.maxScore,
      pct: o.pct,
      accuracy: o.accuracy,
      attemptRate: o.attemptRate,
      correct: o.correct,
      incorrect: o.incorrect,
      skipped: o.skipped,
      notVisited: o.notVisited,
    },
    questionAttempts: buildCanonicalQuestionAttempts({ exam, interactions, report: rep }),
    elapsedSeconds: Math.round(usedSeconds), // legacy convenience
    interactions, // RAW — preserved as the single source
    summary: o, // DERIVED — recomputable from raw, kept for convenience
  }
}

/**
 * Resolves the canonical academic context for an attempt. A recognized
 * JEE/NEET family is competitive even when examMode was stored as University.
 * Legacy records without a family may still use examType, except an explicit
 * University mode with no family stays university.
 */
export function classifyAttemptContext(attempt = {}) {
  const mode = attempt.examMode ?? attempt.category ?? null
  const fromFamily = String(attempt.examFamily ?? '').toUpperCase()
  const family = fromFamily.includes('NEET') ? 'NEET' : fromFamily.includes('JEE') ? 'JEE' : null
  if (family) return { domain: 'competitive', examMode: 'Competitive', examFamily: family }
  const fromType = String(attempt.examType ?? '').toUpperCase()
  const typeFamily = fromType.includes('NEET') ? 'NEET' : fromType.includes('JEE') ? 'JEE' : null
  if (mode === 'Competitive') return { domain: 'competitive', examMode: 'Competitive', examFamily: typeFamily }
  if (mode === 'University') return { domain: 'university', examMode: 'University', examFamily: null }
  if (typeFamily) return { domain: 'competitive', examMode: 'Competitive', examFamily: typeFamily }
  return { domain: 'university', examMode: 'University', examFamily: null }
}

/** Deterministic normalizer: converts OLD and NEW attempt records into the
    canonical shape for intelligence consumers. Idempotent for canonical
    records. Legacy records (no questionAttempts/exam snapshot) are upgraded
    using the stable exam dataset when `examLookup` (an array of exams or a
    single exam) is provided; otherwise a minimal-but-usable structure is
    returned. No AI inference happens here. */
export function normalizeExamAttempt(raw, examLookup = null) {
  if (!raw || typeof raw !== 'object') return null

  /* canonical record → idempotent passthrough with consistency fills */
  if (Array.isArray(raw.questionAttempts)) {
    const submittedAt = raw.submittedAt ?? raw.completedAt ?? null
    const context = classifyAttemptContext(raw)
    return {
      ...raw,
      examMode: context.examMode,
      examFamily: context.examFamily,
      source: raw.source ?? 'exam-agent',
      submittedAt,
      completedAt: raw.completedAt ?? submittedAt,
      batchId: raw.batchId ?? null,
      sectionId: raw.sectionId ?? null,
      exam: raw.exam ?? {},
      timing: raw.timing ?? {},
      scoring: raw.scoring ?? {},
    }
  }

  /* legacy record */
  const exam = Array.isArray(examLookup)
    ? (examLookup.find((e) => e.id === raw.examId) ?? null)
    : (examLookup && examLookup.id === raw.examId ? examLookup : null)
  const context = classifyAttemptContext(raw)
  const family = context.examFamily
  const examMode = context.examMode
  const summary = raw.summary ?? {}
  const questionAttempts = exam
    ? buildCanonicalQuestionAttempts({ exam, interactions: raw.interactions ?? {} })
    : Object.entries(raw.interactions ?? {}).map(([questionId, it]) => interactionToCanonical(questionId, it))

  return {
    id: raw.id ?? null,
    studentId: raw.studentId ?? null,
    interventionId: raw.interventionId ?? null,
    roll: raw.roll ?? null,
    examId: raw.examId ?? null,
    examName: raw.examName ?? raw.examTitle ?? null,
    examTitle: raw.examTitle ?? null,
    shortTitle: raw.shortTitle ?? null,
    examMode,
    examFamily: family,
    examType: raw.examType ?? null,
    category: examMode,
    subject: raw.subject ?? null,
    mode: raw.mode ?? 'manual',
    source: raw.source ?? 'exam-agent',
    mock: !!raw.mock,
    startedAt: raw.startedAt ?? null,
    submittedAt: raw.completedAt ?? raw.submittedAt ?? null,
    completedAt: raw.completedAt ?? raw.submittedAt ?? null,
    batchId: raw.batchId ?? null,
    sectionId: raw.sectionId ?? null,
    exam: exam
      ? {
          totalMarks: exam.totalMarks ?? summary.maxScore ?? null,
          durationMinutes: exam.durationMinutes ?? null,
          marksPerQuestion: exam.marksPerQuestion ?? 0,
          negativeMarksPerQuestion: exam.negativeMarksPerQuestion ?? 0,
          difficulty: exam.difficulty ?? 'Mixed',
          subject: exam.subject ?? null,
          subjectCode: exam.subjectCode ?? null,
          course: exam.subjectCode ?? (family ? `${family} · ${exam.subject ?? ''}` : null),
        }
      : {},
    timing: {
      elapsedSeconds: raw.elapsedSeconds ?? 0,
      timeUsagePct: summary.timeUsagePct ?? 0,
    },
    scoring: {
      score: summary.score ?? 0,
      maxScore: summary.maxScore ?? null,
      pct: summary.pct ?? 0,
      accuracy: summary.accuracy ?? 0,
      attemptRate: summary.attemptRate ?? 0,
      correct: summary.correct ?? 0,
      incorrect: summary.incorrect ?? 0,
      skipped: summary.skipped ?? 0,
      notVisited: summary.notVisited ?? 0,
    },
    questionAttempts,
    elapsedSeconds: raw.elapsedSeconds ?? 0,
    interactions: raw.interactions ?? {},
    summary,
  }
}

/** Analytics filter for intelligence consumers (Faculty / DNA / Exam
    Analysis). Demo attempts are EXCLUDED unless `includeDemo: true`.
    All filter keys are optional; matching uses the canonical fields with
    legacy fallbacks (category/examType). */
export function filterExamAttempts(attempts = [], filters = {}) {
  const {
    studentId, roll, examMode, examFamily, examId, batchId, sectionId, includeDemo = false,
  } = filters ?? {}
  return (attempts ?? []).filter((a) => {
    if (!includeDemo && a.mode === 'demo') return false
    if (studentId && a.studentId !== studentId) return false
    if (roll && a.roll !== roll) return false
    if (examMode && (a.examMode ?? a.category) !== examMode) return false
    const fam = a.examFamily ?? (a.examType === 'JEE' || a.examType === 'NEET' ? a.examType : null)
    if (examFamily && fam !== examFamily) return false
    if (examId && a.examId !== examId) return false
    if (batchId && a.batchId !== batchId) return false
    if (sectionId && a.sectionId !== sectionId) return false
    return true
  })
}

export default buildExamAgentReport
