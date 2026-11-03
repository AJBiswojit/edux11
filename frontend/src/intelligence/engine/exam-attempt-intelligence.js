/**
 * Student Intelligence Engine — EXAM ATTEMPT INTELLIGENCE ADAPTER (Phase 2).
 *
 * A THIN adapter between the canonical ExamAttempt storage contract
 * (Phase 1) and the EXISTING Student Intelligence engines. It performs NO
 * new intelligence derivation of its own beyond aggregation — the actual
 * analysis (classifications, strengths/weaknesses, recommendations) is
 * reused from the existing exam-agent engine (`buildExamAgentReport`) and
 * the existing DNA engine. This module:
 *
 *   · buildAttemptSignals(attempts)      — cross-attempt subject/chapter
 *     aggregation (University vs Competitive fully isolated)
 *   · buildExamEvidence(attempts)        — AI Academic DNA evidence pools
 *     (strengths/weaknesses with evidence + longitudinal trends)
 *   · buildAttemptAnalysisVariant()      — per-attempt analysis shaped for
 *     the EXISTING AI Exam Analysis dashboard (reads ONLY the metadata
 *     embedded in the canonical attempt — never re-fetches the exam)
 *   · classifyChapterTrend()             — deterministic longitudinal
 *     classification (improving / declining / stable / persistent /
 *     resolved) from raw attempt history
 *
 * Rules honoured: raw vs derived separation (everything here derives from
 * raw question attempts); demo attempts excluded by callers; no concept
 * invention; no psychological claims — only observable exam data.
 */

import { round1, avg, clamp } from './scores.js'
import { classifyAttempt, classifyAttemptContext as resolveCanonicalAttemptContext, ATTEMPT_CLASSIFICATIONS, SPEED_THRESHOLDS } from './exam-agent.js'
import { calculateExamAccuracy, examAccuracyConfigFromExam, questionsFromResultRows } from './exam-accuracy.js'

/* ------------------------------------------------------------------ */
/* Small helpers                                                      */
/* ------------------------------------------------------------------ */

const LETTERS = ['A', 'B', 'C', 'D']

function isFibType(type) {
  if (!type) return false
  const t = String(type).toLowerCase().replace(/[-\s]/g, '_')
  return t === 'fill_in_the_blank' || t === 'fill_in_blank' || t === 'fib' || t.includes('fill_in')
}

function gradeOf(pct) {
  if (pct >= 85) return 'A+'
  if (pct >= 75) return 'A'
  if (pct >= 65) return 'B+'
  if (pct >= 55) return 'B'
  if (pct >= 45) return 'C'
  return 'D'
}

function masteryOf(acc) {
  if (acc >= 75) return 'Strong'
  if (acc >= 60) return 'Average'
  if (acc >= 45) return 'Weak'
  return 'Critical'
}

function levelOf(acc) {
  if (acc >= 75) return 'Strong'
  if (acc >= 55) return 'Developing'
  return 'Weak'
}

/**
 * Context view for intelligence consumers. It deliberately rejects a
 * competitive record with no recognized exam family rather than guessing
 * from subject text. University is represented as its own family label for
 * partition consumers; the canonical normalized attempt retains null there.
 */
export function classifyAttemptContext(attempt) {
  const context = resolveCanonicalAttemptContext(attempt)
  if (context.domain === 'university') return { domain: 'university', examFamily: 'University' }
  if (!context.examFamily) return { domain: null, examFamily: null }
  return { domain: 'competitive', examFamily: context.examFamily }
}

const asDomain = (attempt) => {
  const context = classifyAttemptContext(attempt)
  return context.domain === 'university' ? 'university' : context.examFamily
}

/** Question rows of a canonical attempt, in question order. */
const qRows = (attempt) => (attempt?.questionAttempts ?? []).map((qa, i) => {
  const isCorrect = qa.evaluation?.isCorrect ?? false
  const isSkipped = qa.evaluation?.isSkipped ?? qa.response?.status === 'skipped'
  const attempted = qa.response?.selectedAnswer != null
  const status = attempted ? (isCorrect ? 'Correct' : 'Incorrect') : qa.response?.status === 'skipped' ? 'Skipped' : 'Not visited'
  const threshold = (SPEED_THRESHOLDS[attempt?.examFamily ?? attempt?.examType] ?? SPEED_THRESHOLDS.University)[qa.question?.difficulty ?? 'Medium'] ?? 90
  const classification = qa.evaluation?.classification
    ? (ATTEMPT_CLASSIFICATIONS[qa.evaluation.classification] ? { code: qa.evaluation.classification, ...ATTEMPT_CLASSIFICATIONS[qa.evaluation.classification] } : { code: qa.evaluation.classification })
    : classifyAttempt({ timeSpent: qa.timing?.timeSpent ?? 0, result: status, threshold })
  return {
    index: i + 1,
    id: qa.questionId,
    subject: qa.academicContext?.subject ?? null,
    chapter: qa.academicContext?.chapter ?? null,
    topic: qa.academicContext?.topic ?? null,
    difficulty: qa.question?.difficulty ?? null,
    type: qa.question?.type ?? 'MCQ',
    marks: qa.question?.marks ?? 0,
    negativeMarks: qa.question?.negativeMarks ?? 0,
    status,
    isCorrect,
    isSkipped,
    attempted,
    selectedAnswer: qa.response?.selectedAnswer ?? null,
    correctAnswer: qa.question?.correctAnswer ?? null,
    timeSpent: qa.timing?.timeSpent ?? 0,
    visits: qa.behaviour?.visits ?? 0,
    answerChanges: qa.response?.answerChanges ?? 0,
    markedForReview: !!qa.response?.markedForReview,
    classification,
    text: qa.question?.text ?? qa.question?.question ?? null,
    options: qa.question?.options ?? [],
    // Figures travel with the attempt snapshot so the PDF export can embed
    // the original examination image against its own question and option.
    imageUrl: qa.question?.imageUrl ?? qa.question?.image_url ?? qa.question?.stemImageUrl ?? null,
    stemImageUrls: qa.question?.stemImageUrls ?? qa.question?.stem_image_urls ?? [],
    stemImageUrl: qa.question?.stemImageUrl ?? qa.question?.stem_image_url ?? null,
    explanationImages: qa.question?.explanationImageUrls ?? qa.question?.solutionImageUrls ?? [],
    explanation: qa.question?.explanation ?? qa.question?.solution ?? qa.evaluation?.explanation ?? null,
    hint: qa.question?.hint ?? qa.question?.explanation ?? qa.question?.solution ?? qa.evaluation?.hint ?? qa.evaluation?.reason ?? null,
  }
})

const chapterKey = (subject, chapter) => `${subject ?? '?'}·${chapter ?? '?'}`
const domainChapterKey = (domain, subject, chapter) => `${domain}|${chapterKey(subject, chapter)}`

/* ------------------------------------------------------------------ */
/* § Longitudinal trend classification (deterministic)                 */
/* ------------------------------------------------------------------ */

/**
 * Classify a chapter's trajectory from its accuracy series across
 * attempts (chronological). Values: 'new' (1 attempt) · 'improving' ·
 * 'declining' · 'stable'. Delta = late-half avg − early-half avg;
 * threshold ±12 points. Single-answer chapters oscillate 0/100 — the
 * threshold keeps genuine shifts while tolerating noise.
 */
export function classifyChapterTrend(accuracies = []) {
  const vals = accuracies.filter((v) => v != null)
  if (vals.length < 2) return 'new'
  if (vals.length === 2) {
    const d = vals[1] - vals[0]
    if (d >= 12) return 'improving'
    if (d <= -12) return 'declining'
    return 'stable'
  }
  const mid = Math.ceil(vals.length / 2)
  const early = vals.slice(0, mid)
  const late = vals.slice(mid)
  const delta = avg(late) - avg(early)
  if (delta >= 12) return 'improving'
  if (delta <= -12) return 'declining'
  return 'stable'
}

/** Status from trend + latest accuracy (persistent / resolved / strong /
    developing / weak). */
export function chapterStatus({ trend, accuracies = [], latest }) {
  const weakCount = accuracies.filter((v) => v != null && v < 55).length
  const everWeak = accuracies.some((v) => v != null && v < 55)
  if (latest >= 75 && everWeak) return 'resolved'
  if (trend === 'improving' && latest >= 55) return 'improving'
  if (latest < 55 && weakCount >= 2) return 'persistent'
  if (latest >= 75) return 'strong'
  if (latest >= 55) return 'developing'
  return 'weak'
}

/* ------------------------------------------------------------------ */
/* § Cross-attempt aggregation (subjects + chapters)                  */
/* ------------------------------------------------------------------ */

/**
 * Aggregates canonical attempts into per-domain subject/chapter signals.
 * Domains are fully isolated: university vs competitive, and within
 * competitive JEE vs NEET — university performance can never leak into
 * JEE/NEET pools (§13).
 */
export function buildAttemptSignals(attempts = []) {
  const domains = { university: [], JEE: [], NEET: [] }
  const chapterSeries = new Map() // key → { subject, chapter, series: [{date, accuracy}] }

  ;(attempts ?? []).forEach((attempt) => {
    const domain = asDomain(attempt)
    if (!(domain in domains)) return
    const rows = qRows(attempt)
    if (!rows.length) return
    const date = attempt.submittedAt ?? attempt.completedAt ?? ''
    domains[domain].push({ attempt, rows })

    const byChapter = new Map()
    rows.forEach((r) => {
      const k = domainChapterKey(domain, r.subject, r.chapter)
      if (!byChapter.has(k)) byChapter.set(k, { subject: r.subject, chapter: r.chapter, correct: 0, incorrect: 0, skipped: 0, attempted: 0, time: 0 })
      const c = byChapter.get(k)
      if (r.isCorrect) c.correct += 1
      else if (r.isSkipped) c.skipped += 1
      else c.incorrect += 1
      if (r.attempted) c.attempted += 1
      c.time += r.timeSpent
    })
    byChapter.forEach((c, k) => {
      if (!chapterSeries.has(k)) chapterSeries.set(k, { subject: c.subject, chapter: c.chapter, domain, series: [] })
      const entry = chapterSeries.get(k)
      entry.series.push({ date, accuracy: c.attempted ? round1((c.correct / c.attempted) * 100) : null })
    })
  })

  /* per-domain subjects + chapters */
  const build = (domain) => {
    const entries = domains[domain] ?? []
    const subjectMap = new Map()
    const chapterMap = new Map()
    entries.forEach(({ attempt, rows }) => {
      const bySubject = new Map()
      rows.forEach((r) => {
        const key = r.subject ?? '—'
        if (!bySubject.has(key)) bySubject.set(key, { subject: key, correct: 0, incorrect: 0, skipped: 0, attempted: 0, time: 0, marks: 0 })
        const s = bySubject.get(key)
        if (r.isCorrect) s.correct += 1
        else if (r.isSkipped) s.skipped += 1
        else s.incorrect += 1
        if (r.attempted) s.attempted += 1
        s.time += r.timeSpent
        s.marks += r.marks
      })
      bySubject.forEach((s, key) => {
        if (!subjectMap.has(key)) subjectMap.set(key, { subject: s.subject, attempts: 0, questions: 0, correct: 0, incorrect: 0, skipped: 0, attempted: 0, time: 0, marks: 0 })
        const agg = subjectMap.get(key)
        agg.attempts += 1
        agg.questions += rows.length ? rows.filter((r) => r.subject === s.subject).length : 0
        agg.correct += s.correct
        agg.incorrect += s.incorrect
        agg.skipped += s.skipped
        agg.attempted += s.attempted
        agg.time += s.time
        agg.marks += s.marks
      })
    })
    const subjects = [...subjectMap.values()].map((s) => {
      const accuracy = s.attempted ? round1((s.correct / s.attempted) * 100) : 0
      const attemptRate = s.questions ? round1((s.attempted / s.questions) * 100) : 0
      const avgTime = s.attempted ? round1(s.time / s.attempted) : 0
      const speedFactor = clamp(100 - Math.max(0, avgTime - 90) / 90 * 60, 0, 100)
      const strengthScore = s.attempted >= 3
        ? Math.round(clamp(accuracy * 0.6 + attemptRate * 0.25 + speedFactor * 0.15, 0, 100))
        : null
      return {
        subject: s.subject,
        attempts: s.attempts,
        questions: s.questions,
        attempted: s.attempted,
        correct: s.correct,
        incorrect: s.incorrect,
        skipped: s.skipped,
        accuracy,
        attemptRate,
        avgTime,
        timeEfficiency: Math.round(clamp(100 - Math.max(0, avgTime - 60) / 60 * 50, 0, 100)),
        strengthScore,
        level: s.attempted < 3 ? 'Limited data' : levelOf(accuracy),
      }
    }).sort((a, b) => (b.strengthScore ?? 0) - (a.strengthScore ?? 0))

    /* chapters with trend from their chronological series */
    const chapters = []
    chapterSeries.forEach((entry, key) => {
      if (entry.domain !== domain) return
      entry.series.sort((a, b) => String(a.date).localeCompare(String(b.date)))
      const accuracies = entry.series.map((s) => s.accuracy)
      const trend = classifyChapterTrend(accuracies)
      const latest = accuracies.filter((v) => v != null).pop() ?? 0
      /* aggregate totals across attempts */
      let questions = 0, correct = 0, incorrect = 0, skipped = 0, attempted = 0, time = 0
      domains[domain].forEach(({ rows }) => {
        rows.filter((r) => domainChapterKey(domain, r.subject, r.chapter) === key).forEach((r) => {
          questions += 1
          if (r.isCorrect) correct += 1
          else if (r.isSkipped) skipped += 1
          else incorrect += 1
          if (r.attempted) attempted += 1
          time += r.timeSpent
        })
      })
      chapters.push({
        subject: entry.subject,
        chapter: entry.chapter,
        domain,
        attempts: entry.series.length,
        questions,
        attempted,
        correct,
        incorrect,
        skipped,
        accuracy: attempted ? round1((correct / attempted) * 100) : 0,
        avgTime: attempted ? round1(time / attempted) : 0,
        trend,
        status: chapterStatus({ trend, accuracies, latest }),
        series: entry.series.map((s) => ({ date: s.date, accuracy: s.accuracy })),
      })
    })
    chapters.sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    return { subjects, chapters }
  }

  return {
    university: build('university'),
    competitive: {
      JEE: build('JEE'),
      NEET: build('NEET'),
    },
    totals: {
      attempts: attempts.length,
      university: domains.university.length,
      competitive: domains.JEE.length + domains.NEET.length,
      questions: attempts.reduce((n, a) => n + (a.questionAttempts ?? []).length, 0),
    },
  }
}

/* ------------------------------------------------------------------ */
/* § AI Academic DNA evidence pools                                   */
/* ------------------------------------------------------------------ */

const evidenceOf = (c) => ({
  attempts: c.attempts,
  questions: c.questions,
  accuracy: c.accuracy,
  avgTime: c.avgTime,
  incorrect: c.incorrect,
  skipped: c.skipped,
})

/**
 * Builds the exam-evidence pools consumed by the AI Academic DNA engine
 * (appended as `academicDna.examEvidence`). Each strength/weakness carries
 * traceable evidence (attempts · questions · accuracy · avg time ·
 * incorrect · skipped) and a longitudinal status — the explainable-AI
 * foundation for the DNA (§9–§11). University and Competitive (JEE/NEET)
 * pools are fully separate (§13).
 */
export function buildExamEvidence(attempts = []) {
  /* Defensive gate: demo attempts NEVER influence Academic DNA (§12),
     even if a caller forgets to filter. */
  const real = (attempts ?? []).filter((a) => a?.mode !== 'demo')
  const signals = buildAttemptSignals(real)

  const pool = ({ subjects, chapters }) => {
    const strengths = chapters
      .filter((c) => c.attempts >= 1 && (c.status === 'strong' || c.status === 'resolved' || (c.trend === 'improving' && c.accuracy >= 75)))
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 6)
      .map((c) => ({ chapter: c.chapter, subject: c.subject, accuracy: c.accuracy, avgTime: c.avgTime, trend: c.trend, status: c.status, evidence: evidenceOf(c) }))
    const weaknesses = chapters
      .filter((c) => c.attempts >= 1 && (c.status === 'persistent' || c.status === 'weak' || (c.trend === 'declining' && c.accuracy < 65)))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 6)
      .map((c) => ({ chapter: c.chapter, subject: c.subject, accuracy: c.accuracy, avgTime: c.avgTime, trend: c.trend, status: c.status, evidence: evidenceOf(c) }))
    return {
      chapters: chapters.map((c) => ({ ...c, evidence: evidenceOf(c) })),
      strengths,
      weaknesses,
      totals: {
        attempts: chapters.length ? Math.max(...chapters.map((c) => c.attempts)) : 0,
        questions: chapters.reduce((n, c) => n + c.questions, 0),
        accuracy: chapters.length ? round1(avg(chapters, 'accuracy')) : 0,
      },
    }
  }

  const sorted = [...real].sort((a, b) => String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? '')))
  const latest = sorted[sorted.length - 1] ?? null

  return {
    university: pool(signals.university),
    competitive: {
      JEE: pool(signals.competitive.JEE),
      NEET: pool(signals.competitive.NEET),
    },
    latest: latest
      ? {
          attemptId: latest.id, examId: latest.examId, examName: latest.examName ?? latest.examTitle,
          examMode: latest.examMode, examFamily: latest.examFamily, subject: latest.subject,
          submittedAt: latest.submittedAt, pct: latest.scoring?.pct ?? latest.summary?.pct ?? 0,
        }
      : null,
    totals: signals.totals,
  }
}

/* ------------------------------------------------------------------ */
/* § Per-attempt analysis for the EXISTING AI Exam Analysis dashboard  */
/* ------------------------------------------------------------------ */

/**
 * Builds a variant-shaped analysis (the exact shape `AnalysisDashboard`
 * consumes) from ONE canonical attempt — using ONLY the question metadata
 * embedded in the attempt (§5). `previous` (optional) = earlier attempts
 * for the comparison/trajectory sections.
 */
export function buildAttemptAnalysisVariant(attempt, previous = []) {
  const rows = qRows(attempt)
  const scoring = attempt.scoring ?? attempt.summary ?? {}
  const examMode = attempt.examMode ?? 'University'
  const family = attempt.examFamily ?? null
  const pattern = examMode === 'University' ? 'University' : family === 'NEET' ? 'NEET UG' : 'JEE Main'
  const durationMin = attempt.exam?.durationMinutes ?? 0
  const total = rows.length
  const correct = scoring.correct ?? rows.filter((r) => r.isCorrect).length
  const incorrect = scoring.incorrect ?? rows.filter((r) => r.status === 'Incorrect').length
  // Derive attempted from correct + incorrect so all three are always consistent.
  // scoring.attempted can drift (e.g. includes "answered & marked for review" double-counts).
  const attempted = correct + incorrect
  // Derive skipped from total − attempted so attempted + skipped === total always.
  const skipped = total > 0 ? Math.max(0, total - attempted) : (scoring.skipped ?? rows.filter((r) => r.isSkipped).length)
  const notVisited = total - attempted - skipped
  const pct = round1(scoring.pct ?? (scoring.maxScore ? (scoring.score / scoring.maxScore) * 100 : 0))
  const accuracy = round1(scoring.accuracy ?? calculateExamAccuracy({
    questions: questionsFromResultRows(rows),
    examConfig: examAccuracyConfigFromExam(attempt.exam ?? {}),
  }).accuracy)
  const attemptRatio = round1(scoring.attemptRate ?? (total ? (attempted / total) * 100 : 0))
  const score = scoring.score ?? 0
  const maxScore = scoring.maxScore ?? 0
  const negativeMarks = rows.filter((r) => r.status === 'Incorrect').reduce((n, r) => n + r.negativeMarks, 0)
  const correctMarks = rows.filter((r) => r.isCorrect).reduce((n, r) => n + r.marks, 0)
  const guessAttempts = rows.filter((r) => r.classification?.code === 'fast-incorrect').length
  const successRate = attempted ? round1((correct / attempted) * 100) : 0
  const timeSpentTotal = rows.reduce((n, r) => n + r.timeSpent, 0)
  const avgTimeSec = attempted ? round1(timeSpentTotal / Math.max(1, rows.filter((r) => r.timeSpent > 0).length)) : 0

  const date = (attempt.submittedAt ?? attempt.completedAt ?? '').slice(0, 10)

  /* subjects */
  const subjects = [...new Set(rows.map((r) => r.subject).filter(Boolean))].map((name, i) => {
    const sRows = rows.filter((r) => r.subject === name)
    const sCorrect = sRows.filter((r) => r.isCorrect).length
    const sAttempted = sRows.filter((r) => r.attempted).length
    const sAcc = sAttempted ? round1((sCorrect / sAttempted) * 100) : 0
    const sTime = round1(sRows.reduce((n, r) => n + r.timeSpent, 0) / 60)
    const sMarks = sRows.reduce((n, r) => n + r.marks, 0)
    const sScore = sRows.filter((r) => r.isCorrect).reduce((n, r) => n + r.marks, 0)
    const chapters = [...new Set(sRows.map((r) => r.chapter).filter(Boolean))]
    const chAcc = (ch) => {
      const c = sRows.filter((r) => r.chapter === ch)
      const a = c.filter((r) => r.attempted).length
      return a ? round1((c.filter((r) => r.isCorrect).length / a) * 100) : 0
    }
    const diff = sRows.map((r) => r.difficulty).filter(Boolean)
    const modeDiff = diff.filter((d) => d === 'Medium').length >= diff.filter((d) => d === 'Hard').length && diff.filter((d) => d === 'Medium').length >= diff.filter((d) => d === 'Easy').length
      ? 'Medium' : diff.includes('Hard') && diff.filter((d) => d === 'Hard').length >= 2 ? 'Hard' : diff.includes('Easy') && diff.filter((d) => d === 'Easy').length >= diff.filter((d) => d === 'Hard').length ? 'Easy' : 'Medium'
    return {
      name,
      maxMarks: sMarks,
      score: sScore,
      accuracy: sAcc,
      time: sTime,
      rank: i + 1,
      difficulty: modeDiff,
      attempted: sAttempted,
      correct: sCorrect,
      weakAreas: chapters.filter((c) => chAcc(c) < 60).slice(0, 3),
      strongAreas: chapters.filter((c) => chAcc(c) >= 75).slice(0, 3),
    }
  })

  /* chapters (dashboard shape) */
  const chapters = [...new Map(rows.map((r) => [chapterKey(r.subject, r.chapter), r])).values()].map((first) => {
    const cRows = rows.filter((r) => chapterKey(r.subject, r.chapter) === chapterKey(first.subject, first.chapter))
    const cAttempted = cRows.filter((r) => r.attempted).length
    const cAcc = cAttempted ? round1((cRows.filter((r) => r.isCorrect).length / cAttempted) * 100) : 0
    return {
      chapter: first.chapter ?? '—',
      subject: first.subject,
      accuracy: cAcc,
      marks: cRows.reduce((n, r) => n + r.marks, 0),
      time: round1(cRows.reduce((n, r) => n + r.timeSpent, 0) / 60),
      attempted: cRows.length ? round1((cAttempted / cRows.length) * 100) : 0,
      mastery: masteryOf(cAcc),
    }
  }).sort((a, b) => a.accuracy - b.accuracy)

  /* topics */
  const topicMap = new Map()
  rows.forEach((r) => {
    const t = r.topic ?? r.chapter ?? '—'
    if (!topicMap.has(t)) topicMap.set(t, { topic: t, subject: r.subject, correct: 0, attempted: 0 })
    const e = topicMap.get(t)
    if (r.attempted) { e.attempted += 1; if (r.isCorrect) e.correct += 1 }
  })
  const topics = [...topicMap.values()].map((t) => {
    const mastery = t.attempted ? round1((t.correct / t.attempted) * 100) : 0
    return { topic: t.topic, subject: t.subject, mastery, level: masteryOf(mastery) }
  }).sort((a, b) => a.mastery - b.mastery)

  /* mistakes — observable categories only (no psychological claims) */
  const mistakes = []
  const pushMistake = (category, count) => { if (count > 0) mistakes.push({ category, count }) }
  pushMistake('Careless Mistake', rows.filter((r) => r.classification?.code === 'fast-incorrect').length)
  pushMistake('Time Management', rows.filter((r) => r.classification?.code === 'slow-incorrect').length)
  pushMistake('Unattempted', skipped + notVisited)

  const mistakeList = rows
    .filter((r) => r.status === 'Incorrect' || r.isSkipped)
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, 4)
    .map((r) => ({
      q: `Q${r.index}`,
      subject: r.subject,
      category: r.status === 'Incorrect' ? (r.classification?.code === 'fast-incorrect' ? 'Careless Mistake' : 'Time Management') : 'Unattempted',
      topic: r.topic ?? r.chapter ?? '—',
      detail: r.status === 'Incorrect'
        ? `${r.classification?.label ?? 'Incorrect'} · correct answer ${isFibType(r.type) ? (r.correctAnswer ?? '—') : (LETTERS[r.correctAnswer] ?? '—')}`
        : 'Left unanswered after viewing',
    }))

  /* time intelligence */
  const timed = rows.filter((r) => r.timeSpent > 0)
  const fastest = timed.length ? timed.reduce((a, b) => (a.timeSpent <= b.timeSpent ? a : b)) : null
  const slowest = timed.length ? timed.reduce((a, b) => (a.timeSpent >= b.timeSpent ? a : b)) : null
  const navigationCount = rows.reduce((n, r) => n + Math.max(0, r.visits - 1) + r.answerChanges, 0)
  const timeDistribution = subjects.map((s) => {
    const sRows = rows.filter((r) => r.subject === s.name)
    const used = round1(sRows.reduce((n, r) => n + r.timeSpent, 0) / 60)
    const allocated = durationMin || used || 1
    return { section: s.name, used, allocated, efficiency: allocated ? round1((used / allocated) * 100) : 0 }
  })

  /* comparison + trajectory (from previous attempts) */
  const prevSorted = [...(previous ?? [])].sort((a, b) => String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? '')))
  const prevLatest = prevSorted[prevSorted.length - 1] ?? null
  const prevPct = prevLatest?.scoring?.pct ?? prevLatest?.summary?.pct ?? null
  const deltaPct = prevPct != null ? round1(pct - prevPct) : null
  const trajectory = [...prevSorted, attempt]
    .filter(Boolean)
    .map((a, i) => ({ exam: i === prevSorted.length ? 'Latest attempt' : `Attempt ${i + 1}`, score: a.scoring?.score ?? a.summary?.score ?? 0 }))

  const recommendations = {
    weakChapters: chapters.filter((c) => c.accuracy < 60).slice(0, 4).map((c) => `${c.chapter} (${c.accuracy}%)`),
    weakTopics: topics.filter((t) => t.mastery < 60).slice(0, 4).map((t) => t.topic),
    priorityRevision: chapters.filter((c) => c.accuracy < 65).slice(0, 3).map((c, i) => ({
      topic: c.chapter, timeframe: i === 0 ? 'This week' : 'Next week', priority: i === 0 ? 'High' : 'Medium',
    })),
    suggestedPYQs: [],
    practiceQuestions: chapters.filter((c) => c.accuracy < 65).slice(0, 2).map((c) => ({ title: `15 timed ${c.chapter} questions` })),
    mockTests: subjects.slice(0, 1).map((s) => ({ title: `Sectional mock — ${s.name}` })),
    lectures: chapters.filter((c) => c.accuracy < 55).slice(0, 1).map((c) => ({ title: `Revision lecture — ${c.chapter}` })),
  }

  const strongChapter = chapters.filter((c) => c.accuracy >= 75).slice(-1)[0]
  const weakChapter = chapters.slice(0, 1)[0]

  return {
    meta: {
      examId: attempt.id,
      examName: attempt.examName ?? attempt.examTitle ?? 'Practice attempt',
      pattern,
      student: null,
      rollNo: attempt.roll ?? null,
      date,
      duration: durationMin ? `${durationMin} min` : '—',
      totalMarks: maxScore,
      sections: subjects.map((s) => s.name),
      examStatus: 'Completed',
      resultStatus: 'Analysed',
      admitCard: 'Practice attempt',
      course: examMode === 'University' ? (attempt.exam?.course ?? attempt.exam?.subjectCode ?? '—') : (attempt.exam?.course ?? pattern),
      ...(examMode === 'University'
        ? { faculty: '—', semester: '—', academicYear: '—', venue: '—', hallNumber: '—', seatNumber: '—', passingMarks: '—' }
        : {}),
    },
    hero: {
      score,
      maxScore,
      percentage: pct,
      grade: gradeOf(pct),
      rank: null,
      percentile: null,
      badge: pct >= 75 ? 'Excellent practice' : pct >= 60 ? 'Good practice' : pct >= 45 ? 'Average practice' : 'Needs more practice',
      overallAccuracy: accuracy,
      overallSpeed: avgTimeSec,
      readinessScore: Math.round(pct),
      healthScore: Math.round(clamp(accuracy * 0.7 + attemptRatio * 0.3, 0, 100)),
      confidenceIndex: Math.round(attemptRatio),
      batchRank: null,
      cohortSize: null,
      aiSummary: `Attempt on ${attempt.shortTitle ?? attempt.examName ?? 'this paper'}: ${score}/${maxScore} (${pct}%) with ${accuracy}% accuracy across ${attempted} of ${total} questions.${strongChapter ? ` Strongest area: ${strongChapter.chapter} (${strongChapter.accuracy}%).` : ''}${weakChapter && weakChapter.accuracy < 65 ? ` Priority area: ${weakChapter.chapter} (${weakChapter.accuracy}%, ${weakChapter.time} min).` : ''}`,
      min: 0,
    },
    questionIntelligence: {
      total,
      attempted,
      correct,
      incorrect,
      skipped,
      negativeMarks,
      correctMarks,
      guessAttempts,
      accuracy,
      successRate,
      attemptRatio,
    },
    subjects,
    chapters,
    topics,
    mistakes,
    mistakeList,
    difficulty: ['Easy', 'Medium', 'Hard'].map((level) => {
      const dRows = rows.filter((r) => r.difficulty === level)
      const dAttempted = dRows.filter((r) => r.attempted).length
      return {
        level,
        questions: dRows.length,
        accuracy: dAttempted ? round1((dRows.filter((r) => r.isCorrect).length / dAttempted) * 100) : 0,
        attempted: dAttempted,
        time: dRows.length ? round1(dRows.reduce((n, r) => n + r.timeSpent, 0) / 60 / dRows.length) : 0,
      }
    }).filter((d) => d.questions > 0),
    timeIntelligence: {
      avgTimePerQuestion: round1(avgTimeSec / 60),
      fastestQuestion: fastest ? { q: `Q${fastest.index} — ${fastest.topic ?? fastest.chapter}`, time: round1(fastest.timeSpent / 60) } : { q: '—', time: 0 },
      slowestQuestion: slowest ? { q: `Q${slowest.index} — ${slowest.topic ?? slowest.chapter}`, time: round1(slowest.timeSpent / 60) } : { q: '—', time: 0 },
      navigationCount,
      timeManagementScore: Math.round(clamp(100 - Math.max(0, avgTimeSec - (durationMin * 60) / Math.max(1, total)) / ((durationMin * 60) / Math.max(1, total)) * 80, 0, 100)),
      distribution: timeDistribution,
    },
    comparison: {
      previousTest: { label: 'Previous attempt', score: prevPct ?? null, percentile: null },
      previousMonth: { label: 'Previous month avg', score: null, percentile: null },
      batchAverage: { label: 'Batch average', score: null, percentile: null },
      instituteAverage: { label: 'Institute average', score: null, percentile: null },
      topPerformer: { label: 'Your best', score: prevSorted.length ? Math.max(...prevSorted.map((a) => a.scoring?.pct ?? 0)) : null, name: '—' },
      deltas: prevPct != null ? [{ label: 'vs previous attempt', value: `${deltaPct >= 0 ? '+' : '−'}${Math.abs(deltaPct)}%`, up: deltaPct >= 0 }] : [],
    },
    recommendations,
    prediction: {
      riskLevel: pct >= 60 ? 'Low' : 'Medium',
      university: examMode === 'University',
      expectedCGPA: null,
      expectedGrade: gradeOf(pct),
      classRank: null,
      jeePercentile: null,
      expectedAIR: null,
      expectedImprovement: deltaPct != null ? `${deltaPct >= 0 ? '+' : ''}${deltaPct}%` : '—',
      targetProbability: Math.round(pct),
      neetScore: null,
      trajectory,
    },
    questionReview: rows.map((r) => ({
      q: `Q${r.index}`,
      subject: r.subject,
      chapter: r.chapter ?? null,
      topic: r.topic ?? r.chapter ?? '—',
      difficulty: r.difficulty ?? 'Medium',
      type: r.type,
      status: r.status,
      marks: r.marks,
      time: round1(r.timeSpent / 60),
      selected: r.selectedAnswer ?? r.selected ?? r.response?.selected ?? r.answer ?? null,
      correctAnswer: r.correctAnswer ?? r.evaluation?.correctAnswer ?? r.key ?? null,
      text: r.text ?? null,
      options: r.options ?? [],
      imageUrl: r.imageUrl ?? null,
      stemImageUrls: r.stemImageUrls ?? [],
      stemImageUrl: r.stemImageUrl ?? null,
      explanationImages: r.explanationImages ?? [],
      explanation: r.explanation ?? null,
      hint: r.hint ?? r.explanation ?? r.classification?.hint ?? null,
      mistakeCategory: r.status === 'Incorrect' ? (r.classification?.label ?? null) : null,
      mistakeHint: r.status === 'Incorrect' ? (r.classification?.hint ?? null) : null,
    })),
  }
}

export default { buildAttemptSignals, buildExamEvidence, buildAttemptAnalysisVariant, classifyChapterTrend, chapterStatus }
