/**
 * Student Intelligence Engine — Readiness Orchestration (SINGLE authority).
 *
 * ONE readiness layer with TWO context-specific strategies:
 *
 *   calculateReadiness(context)           context: 'university' | 'competitive'
 *   buildReadinessIntelligence(data)      full snapshot (university + competitive)
 *
 * Part 6–8 of Phase 27.1: the audit found two independent readiness
 * calculations (computeExamReadiness in engine/derive.js and
 * buildExamIntelligence in engine/exams.js) producing conflicting values
 * for the same exam (79.1 vs 77.8 for UNI-MID-CS501-2026). This module is
 * the replacement: every readiness value in the Student module now comes
 * from here — one authoritative score per context per exam.
 *
 * CONTEXT ISOLATION (Part 5, non-negotiable):
 *  · university strategy inputs  — course/subject mastery, attendance,
 *    assignments, internals, revision, consistency. NEVER percentiles,
 *    negative marking or PYQ stats.
 *  · competitive strategy inputs — mock-test performance, PYQ accuracy,
 *    speed, negative-marking discipline, chapter/topic mastery, trends.
 *    NEVER CGPA, university attendance or semester internals.
 */

import { clamp, round1, weighted, avg } from './scores.js'

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */
export const READINESS_LEVEL = (r) => (r >= 80 ? 'Ready' : r >= 60 ? 'Almost Ready' : r >= 40 ? 'Needs Work' : 'Not Ready')
export const READINESS_RISK = (r) => (r >= 80 ? 'Low' : r >= 60 ? 'Moderate' : r >= 40 ? 'High' : 'Critical')
export const RING_COLOR = (v) => (v >= 80 ? '#10b981' : v >= 60 ? '#f59e0b' : v >= 40 ? '#f97316' : '#f43f5e')
export const FAMILY_SUBJECTS = { JEE: ['Physics', 'Chemistry', 'Mathematics'], NEET: ['Physics', 'Chemistry', 'Biology'] }

/** Exam-family detection: NEET if the exam's subjects include Biology, else JEE. */
export function detectExamFamily(exam = {}) {
  const hay = `${exam.title ?? ''} ${exam.shortName ?? ''} ${exam.subject ?? ''} ${exam.examType ?? ''}`
  return /NEET|Biology/i.test(hay) ? 'NEET' : 'JEE'
}

const daysTo = (date, todayTs) => Math.ceil((new Date(date) - todayTs) / 86400000)

function buildRevisionPlanner(weakTopic, daysLeft) {
  const weak = weakTopic ?? 'Weak chapters drill'
  if (daysLeft <= 1) {
    return [
      { slot: "Today's revision", items: ['Formula sheet + key definitions', `Quick scan: ${weak}`, 'Light mock section (30 min)'] },
      { slot: 'Final revision', items: ['Error-log review', 'High-yield topics only', 'Rest well before the exam'] },
    ]
  }
  if (daysLeft <= 3) {
    return [
      { slot: "Today's revision", items: [weak, '1 full mock section', 'NCERT table scan'] },
      { slot: 'Tomorrow', items: ['Second mock section', 'Previous-year questions', 'Weak topics drill'] },
      { slot: 'Final revision', items: ['Formula sheet', 'Mistake review', 'Light practice'] },
    ]
  }
  return [
    { slot: "Today's revision", items: [weak, 'Concept revision (2 chapters)'] },
    { slot: 'Tomorrow', items: ['Practice set (30 questions)', 'Chapter-wise PYQs'] },
    { slot: 'Weekend', items: ['Full Length Mock Test', 'Mistake analysis', 'Targeted re-revision'] },
    { slot: 'Final revision', items: ['Formula sheet', 'High-yield topics', 'Mock review'] },
  ]
}

const DEFAULT_STRATEGY = {
  timeAllocation: [
    { section: 'Easy questions', pct: 30, note: 'Answer first — bank marks fast' },
    { section: 'Medium questions', pct: 45, note: 'Steady pace, verify units' },
    { section: 'Hard questions', pct: 25, note: 'Attempt last with remaining time' },
  ],
}

/* ------------------------------------------------------------------ */
/* UNIVERSITY STRATEGY (Part 7)                                        */
/* ------------------------------------------------------------------ */
function universityEntry(input, ctx) {
  const { data, todayTs } = ctx
  const meta = (data.universityExams ?? []).find((e) => e.id === input.examId) ?? {}
  const dl = daysTo(input.date, todayTs)

  /* --- factors: university-only signals (no percentile / negative marking / PYQ) --- */
  const course = (data.courses ?? []).find((c) => c.subjectCode === meta.subjectCode)
  const syllabus = clamp(input.syllabusCoverage ?? course?.progress ?? 0)
  const quizAvg = (data.quizResults ?? []).length ? avg(data.quizResults, 'accuracy') : 0
  const practiceAvg = (data.practiceSessions ?? []).length ? avg(data.practiceSessions, 'score') : 0
  const mock = clamp(input.mockAveragePct ?? ((quizAvg + practiceAvg) / 2))
  const time = clamp(input.timeManagement ?? data.learningBehaviour?.avgFocus ?? 0)
  const revision = clamp(input.revisionCompleted ?? 0)
  const last = input.lastAssessmentPct ?? previousUniversityPct(data, meta.subjectCode)

  const att = data.attendance ?? {}
  const attendanceFactor = clamp(((att.overall ?? 0) - (att.required ?? 75)) * 1.2 + 70)

  const readiness = round1(weighted([
    { value: syllabus, weight: 0.3 },
    { value: mock, weight: 0.2 },
    { value: time, weight: 0.15 },
    { value: revision, weight: 0.15 },
    { value: attendanceFactor, weight: 0.1 },
    { value: data.consistencyScore ?? 0, weight: 0.1 },
  ]))

  /* --- strengths / weaknesses (university DNA: subjects + chapters + topics) --- */
  const dnaMastery = data.academicDna?.mastery ?? []
  const strongSubjects = dnaMastery.filter((m) => m.mastery >= 80).map((m) => ({ subjectCode: m.subjectCode, subject: m.subject, mastery: m.mastery }))
  const weakSubjects = dnaMastery.filter((m) => m.mastery < 70).map((m) => ({ subjectCode: m.subjectCode, subject: m.subject, mastery: m.mastery }))
  const strongChapters = (data.chapterMastery ?? []).filter((c) => c.level === 'Mastered').slice(0, 6).map((c) => c.chapter)
  const weakChapters = (data.chapterMastery ?? []).filter((c) => c.level === 'Critical' || c.level === 'Weak').slice(0, 6).map((c) => `${c.subjectCode} — ${c.chapter}`)
  const confidentTopics = (data.topicMastery ?? []).filter((t) => t.learningStatus === 'Mastered').slice(0, 6).map((t) => t.topic)
  const weakTopics = (data.topicMastery ?? []).filter((t) => t.learningStatus === 'Critical' || t.learningStatus === 'Needs Review').slice(0, 6).map((t) => t.topic)
  const weakConcepts = (data.academicDna?.weakConcepts ?? []).slice(0, 5)

  /* --- confidence (university blend) --- */
  const confidence = round1(weighted([
    { value: readiness, weight: 0.4 },
    { value: quizAvg, weight: 0.25 },
    { value: practiceAvg, weight: 0.25 },
    { value: data.academicHealth?.score ?? 0, weight: 0.1 },
  ]))

  /* --- expected outcome (university: attendance may shape expectation) --- */
  const expectedMarks = last != null
    ? Math.round(((readiness * 0.6 + last * 0.4)) * (meta.maxMarks ?? 100) / 100)
    : Math.round(((readiness * 0.7 + attendanceFactor * 0.3)) * (meta.maxMarks ?? 100) / 100)
  const expectedPct = Math.round((expectedMarks / (meta.maxMarks ?? 100)) * 100)
  const expectedGrade = expectedPct >= 85 ? 'A' : expectedPct >= 75 ? 'A-' : expectedPct >= 65 ? 'B+' : expectedPct >= 55 ? 'B' : expectedPct >= 45 ? 'C' : 'D'
  const expectedAccuracy = round1(weighted([{ value: confidence, weight: 0.6 }, { value: expectedPct, weight: 0.4 }]))

  /* --- recommendations (Part 14 — university, data-derived) --- */
  const recommendations = []
  const concept = weakConcepts[0]
  if (concept) recommendations.push({ text: `Revise ${concept.split(' — ')[1] ?? concept} (concept mastery ${(data.academicDnaInputs?.conceptSignals ?? []).find((c) => `${c.subjectCode} — ${c.concept}` === concept)?.mastery ?? '<60'}%)`, impact: 'High' })
  const pending = (data.assignments ?? []).filter((a) => a.status === 'Pending').sort((a, b) => new Date(a.due) - new Date(b.due))[0]
  if (pending) recommendations.push({ text: `Complete ${pending.title.split(' — ')[0]} before ${pending.due.slice(0, 10)} (${pending.progress}% done)`, impact: 'High' })
  const weakAtt = (data.attendance?.bySubject ?? []).find((s) => s.pct < 88)
  if (weakAtt) recommendations.push({ text: `Attend the next ${Math.max(1, Math.round((88 - weakAtt.pct) / 2))} ${weakAtt.subject} lectures to restore the attendance buffer`, impact: 'Medium' })
  if (weakTopics[0]) recommendations.push({ text: `Drill ${weakTopics[0]} — 20 questions before the next revision slot`, impact: 'Medium' })

  const suggestions = [...recommendations]
  const practiceCount = (data.practiceSessions ?? []).length
  if (practiceCount < 8) suggestions.push({ text: 'Attempt 2 mock tests before the exam', impact: 'Medium' })
  if (weakSubjects[0]) suggestions.push({ text: `Practise ${weakSubjects[0].subject} — below 70% mastery`, impact: 'High' })
  if ((data.learningBehaviourScore ?? 80) < 70) suggestions.push({ text: 'Increase practice-session depth to 45+ min', impact: 'Medium' })

  return {
    examId: input.examId,
    title: input.title,
    date: input.date,
    daysLeft: dl,
    examType: meta.examType ?? 'Examination',
    category: 'University',
    context: 'university',
    examFamily: null,
    maxMarks: meta.maxMarks ?? 100,
    readiness,
    level: READINESS_LEVEL(readiness),
    riskLevel: READINESS_RISK(readiness),
    riskTone: readiness >= 80 ? 'success' : readiness >= 60 ? 'warning' : 'danger',
    color: RING_COLOR(readiness),
    trend: last != null ? (readiness >= last ? 'improving' : 'steady') : 'steady',
    confidence,
    expectedPerformance: { marks: expectedMarks, maxMarks: meta.maxMarks ?? 100, pct: expectedPct, grade: expectedGrade, accuracy: expectedAccuracy, rank: null },
    preparationStatus: { syllabus, mock, time, revision, practiceDrills: input.practiceDrills ?? 0 },
    factors: [
      { label: 'Syllabus coverage', value: syllabus },
      { label: 'Internal / mock average', value: mock },
      { label: 'Time management', value: time },
      { label: 'Revision completed', value: revision },
      { label: 'Attendance factor', value: attendanceFactor },
    ],
    strengths: { subjects: strongSubjects, chapters: strongChapters, topics: confidentTopics },
    needsRevision: { subjects: weakSubjects, chapters: weakChapters, topics: weakTopics, concepts: weakConcepts },
    weaknesses: { subjects: weakSubjects, chapters: weakChapters, topics: weakTopics, concepts: weakConcepts },
    planner: buildRevisionPlanner(weakTopics[0], dl),
    strategy: { ...DEFAULT_STRATEGY, questionStrategy: 'Attempt easy → medium → hard. Skip questions that take > 2× the average time; return if time permits. Never leave easy marks on the table.', revisionOrder: [...weakTopics.slice(0, 3), ...weakChapters.slice(0, 2), ...strongSubjects.map((s) => s.subject).slice(0, 2)] },
    suggestions: suggestions.slice(0, 5),
    recommendations,
    previousScore: last,
    previousGrade: previousUniversityGrade(data, meta.subjectCode),
  }
}

/** Previous university exam % for a subject (from completed university examPerformance). */
function previousUniversityPct(data, subjectCode) {
  if (!subjectCode) return null
  const rec = (data.examPerformance ?? []).find((e) => e.type === 'University' && e.status === 'Completed' && e.subjectCode === subjectCode && e.pct != null)
  return rec?.pct ?? null
}
function previousUniversityGrade(data, subjectCode) {
  if (!subjectCode) return null
  const rec = (data.examPerformance ?? []).find((e) => e.type === 'University' && e.status === 'Completed' && e.subjectCode === subjectCode && e.grade != null)
  return rec?.grade ?? null
}

/** Upcoming university exams → readiness entries (university strategy). */
export function buildUniversityReadiness(data, today = '2026-08-06') {
  const todayTs = new Date(today)
  const inputs = data.examReadinessInputs ?? []
  const explicitIds = new Set(inputs.map((i) => i.examId))
  const scheduled = (data.universityExams ?? []).filter((e) => e.status === 'Scheduled' || e.status === 'Upcoming')

  /* explicit inputs (already include the full picture) */
  const entries = inputs
    .filter((i) => scheduled.some((e) => e.id === i.examId))
    .map((input) => universityEntry(input, { data, todayTs }))

  /* scheduled exams without an explicit input → derive factors from context */
  const covered = new Set(entries.map((e) => e.examId))
  scheduled
    .filter((e) => !covered.has(e.id) && !explicitIds.has(e.id))
    .forEach((e) => {
      const course = (data.courses ?? []).find((c) => c.subjectCode === e.subjectCode)
      entries.push(universityEntry({
        examId: e.id,
        title: e.title,
        date: e.date,
        syllabusCoverage: course?.progress ?? 0,
        timeManagement: null,
        revisionCompleted: null,
        practiceDrills: 0,
      }, { data, todayTs }))
    })

  return entries
    .filter((e) => e.daysLeft >= -1)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/* ------------------------------------------------------------------ */
/* COMPETITIVE STRATEGY (Part 8)                                       */
/* ------------------------------------------------------------------ */
function familyMockStats(data, family) {
  const mocks = (data.examPerformance ?? [])
    .filter((e) => e.type === 'Competitive' && e.status === 'Completed' && e.pct != null && detectExamFamily(e) === family)
    .sort((a, b) => a.date.localeCompare(b.date)) // chronological — latest is the most recent attempt
  const pcts = mocks.map((m) => Number(m.pct))
  const percentiles = mocks.map((m) => Number(m.percentile)).filter(Number.isFinite)
  return {
    mocks,
    completed: mocks.length,
    avgPct: pcts.length ? round1(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0,
    bestPct: pcts.length ? Math.max(...pcts) : 0,
    latestPct: pcts.length ? pcts[pcts.length - 1] : null,
    previousPct: pcts.length > 1 ? pcts[pcts.length - 2] : null,
    avgPercentile: percentiles.length ? round1(percentiles.reduce((a, b) => a + b, 0) / percentiles.length) : null,
  }
}

function competitiveEntry(exam, data, todayTs) {
  const family = detectExamFamily(exam)
  const dl = daysTo(exam.date, todayTs)
  const pyq = data.competitivePyqPerformance?.[family] ?? {}

  const mocks = familyMockStats(data, family)
  const mockAvg = mocks.avgPct
  const pyqAccuracy = clamp(pyq.accuracy ?? 0)
  const speedScore = clamp((120 - (pyq.avgSecondsPerQuestion ?? 100)) * 1.1 + 50)
  const negMarking = clamp(100 - (pyq.guessRate ?? 0) * 3)
  const chapterScore = clamp(avg(pyq.subjects?.flatMap((s) => s.chapters ?? []), 'accuracy') || 0)
  const trendScore = clamp(50 + ((mocks.latestPct ?? 0) - (mocks.previousPct ?? mocks.latestPct ?? 0)) * 3)

  const readiness = round1(weighted([
    { value: mockAvg, weight: 0.3 },
    { value: pyqAccuracy, weight: 0.2 },
    { value: speedScore, weight: 0.15 },
    { value: negMarking, weight: 0.1 },
    { value: chapterScore, weight: 0.15 },
    { value: trendScore, weight: 0.1 },
  ]))

  /* --- strengths / weaknesses: only this family's subjects & chapters --- */
  const subjects = (pyq.subjects ?? []).map((s) => ({
    subjectCode: s.code,
    subject: s.name,
    mastery: round1(s.accuracy),
    level: s.accuracy >= 75 ? 'Strong' : s.accuracy >= 65 ? 'Average' : 'Weak',
    attempted: s.attempted,
    avgSeconds: s.avgSeconds,
  }))
  const strongSubjects = subjects.filter((s) => s.mastery >= 75).map((s) => ({ subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery }))
  const weakSubjects = subjects.filter((s) => s.mastery < 65).map((s) => ({ subjectCode: s.subjectCode, subject: s.subject, mastery: s.mastery }))
  const chapters = (pyq.subjects ?? []).flatMap((s) => (s.chapters ?? []).map((c) => ({ subjectCode: s.code, subject: s.name, chapter: c.chapter, mastery: c.accuracy, level: c.accuracy >= 75 ? 'Mastered' : c.accuracy >= 65 ? 'Improving' : 'Weak' })))
  const strongChapters = chapters.filter((c) => c.level === 'Mastered').slice(0, 6).map((c) => `${c.subject} — ${c.chapter}`)
  const weakChapters = chapters.filter((c) => c.level === 'Weak').slice(0, 6).map((c) => `${c.subject} — ${c.chapter}`)

  /* --- confidence (competitive blend: readiness + mocks + PYQ) --- */
  const confidence = round1(weighted([
    { value: readiness, weight: 0.5 },
    { value: mockAvg, weight: 0.3 },
    { value: pyqAccuracy, weight: 0.2 },
  ]))

  /* --- expected outcome (competitive: no attendance; percentile proxy) --- */
  const maxMarks = exam.maxMarks ?? 300
  const expectedMarks = Math.round((readiness / 100) * maxMarks)
  /* percentile proxies calibrated to the dataset's own curve:
     JEE 60.7% → 91.4 · NEET 67.5% → 89.6 */
  const isNeet = family === 'NEET'
  const expectedPercentile = round1(clamp(isNeet ? readiness * 0.85 + 32 : readiness * 0.9 + 36, 0, 99))
  const expectedRank = Math.max(1, Math.round((100 - readiness * 0.9) * 12))

  /* --- recommendations (Part 14 — competitive, data-derived) --- */
  const recommendations = []
  const weakestChapter = [...chapters].sort((a, b) => a.mastery - b.mastery)[0]
  if (weakestChapter) recommendations.push({ text: `Practice 30 ${weakestChapter.chapter} PYQs (current accuracy ${weakestChapter.mastery}%)`, impact: 'High' })
  if (pyq.guessRate >= 5) recommendations.push({ text: `Review negative-marking mistakes — ${pyq.guessRate}% of attempts were guesses (${family} ${exam.negativeMarking ?? '−1 per incorrect'})`, impact: 'High' })
  const weakSubj = weakSubjects[0]
  if (weakSubj) recommendations.push({ text: `Attempt one ${weakSubj.subject} sectional before the next mock`, impact: 'Medium' })
  if (exam.examType === 'Mock Test (JEE Advanced)' || exam.examType === 'Mock Test (NEET)') recommendations.push({ text: `Rehearse ${exam.pattern ?? 'CBT'} flow: section-wise time-boxing + skip-and-return`, impact: 'Medium' })

  const suggestions = [...recommendations]
  if (mocks.completed < 4) suggestions.push({ text: `Complete ${4 - mocks.completed} more ${family} mocks for a reliable trend`, impact: 'Medium' })

  return {
    examId: exam.id,
    title: exam.title,
    date: exam.date,
    daysLeft: dl,
    examType: exam.examType ?? 'Mock Test',
    category: 'Competitive',
    context: 'competitive',
    examFamily: family,
    maxMarks,
    readiness,
    level: READINESS_LEVEL(readiness),
    riskLevel: READINESS_RISK(readiness),
    riskTone: readiness >= 80 ? 'success' : readiness >= 60 ? 'warning' : 'danger',
    color: RING_COLOR(readiness),
    trend: mocks.previousPct != null ? (mocks.latestPct >= mocks.previousPct ? 'improving' : 'steady') : 'steady',
    confidence,
    expectedPerformance: { marks: expectedMarks, maxMarks, pct: Math.round(readiness), grade: null, accuracy: round1(weighted([{ value: confidence, weight: 0.6 }, { value: readiness, weight: 0.4 }])), rank: expectedRank, percentile: expectedPercentile },
    preparationStatus: { syllabus: 0, mock: mockAvg, time: round1(speedScore), revision: 0, practiceDrills: 0 },
    factors: [
      { label: 'Mock average', value: round1(mockAvg) },
      { label: 'PYQ accuracy', value: round1(pyqAccuracy) },
      { label: 'Speed', value: round1(speedScore) },
      { label: 'Negative-marking discipline', value: round1(negMarking) },
      { label: 'Chapter mastery', value: round1(chapterScore) },
    ],
    strengths: { subjects: strongSubjects, chapters: strongChapters, topics: [] },
    needsRevision: { subjects: weakSubjects, chapters: weakChapters, topics: [], concepts: [] },
    weaknesses: { subjects: weakSubjects, chapters: weakChapters, topics: [], concepts: [] },
    planner: buildRevisionPlanner(weakestChapter ? `${weakestChapter.subject} — ${weakestChapter.chapter}` : `${family} full-length revision`, dl),
    strategy: {
      ...DEFAULT_STRATEGY,
      questionStrategy: `Attempt easy → medium → hard. ${exam.negativeMarking ?? '−1 per incorrect answer'} applies — only guess when 2 options can be eliminated confidently.`,
      revisionOrder: [...weakChapters.slice(0, 3), ...strongSubjects.map((s) => s.subject).slice(0, 2)],
    },
    suggestions: suggestions.slice(0, 5),
    recommendations,
    previousScore: mocks.latestPct,
    previousGrade: null,
  }
}

/** Upcoming competitive exams → readiness entries (competitive strategy). */
export function buildCompetitiveReadiness(data, today = '2026-08-06') {
  const todayTs = new Date(today)
  return (data.competitiveExams ?? [])
    .filter((e) => e.status === 'Scheduled' || e.status === 'Upcoming')
    .map((e) => competitiveEntry(e, data, todayTs))
    .filter((e) => e.daysLeft >= -1)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Per-family aggregate readiness (JEE / NEET) — the Part-18 contract. */
export function buildFamilyReadiness(data, entries, today = '2026-08-06') {
  const families = [...new Set(entries.map((e) => e.examFamily).filter(Boolean))]
  const out = {}
  families.forEach((family) => {
    const famEntries = entries.filter((e) => e.examFamily === family)
    const mocks = familyMockStats(data, family)
    const pyq = data.competitivePyqPerformance?.[family] ?? {}
    const upcoming = famEntries.length ? round1(avg(famEntries, 'readiness')) : 0
    const score = round1(clamp(mocks.avgPct * 0.45 + upcoming * 0.45 + (pyq.accuracy ?? 0) * 0.1))

    const subjects = (pyq.subjects ?? []).map((s) => ({ subjectCode: s.code, subject: s.name, mastery: round1(s.accuracy) }))
    const chapters = (pyq.subjects ?? []).flatMap((s) => (s.chapters ?? []).map((c) => ({ subject: s.name, chapter: c.chapter, mastery: c.accuracy })))
    const weaknesses = [...chapters].filter((c) => c.mastery < 65).sort((a, b) => a.mastery - b.mastery).slice(0, 4)
    const strengths = [...chapters].filter((c) => c.mastery >= 75).sort((a, b) => b.mastery - a.mastery).slice(0, 4)

    const recommendations = []
    const weakest = weaknesses[0]
    if (weakest) recommendations.push({ text: `Practice 30 ${weakest.chapter} PYQs (accuracy ${weakest.mastery}%)`, impact: 'High' })
    if ((pyq.guessRate ?? 0) >= 5) recommendations.push({ text: `Cut guess attempts from ${pyq.guessRate}% — review negative-marking mistakes weekly`, impact: 'High' })
    const next = famEntries[0]
    if (next) recommendations.push({ text: `Next: ${next.title} on ${next.date} — follow the AI revision plan`, impact: 'Medium' })

    out[family] = {
      examFamily: family,
      score,
      level: READINESS_LEVEL(score),
      trend: mocks.previousPct != null ? (mocks.latestPct >= mocks.previousPct ? 'improving' : 'steady') : 'steady',
      factors: [
        { label: 'Mock average', value: round1(mocks.avgPct) },
        { label: 'PYQ accuracy', value: round1(clamp(pyq.accuracy ?? 0)) },
        { label: 'Speed', value: round1(clamp((120 - (pyq.avgSecondsPerQuestion ?? 100)) * 1.1 + 50)) },
        { label: 'Negative-marking discipline', value: round1(clamp(100 - (pyq.guessRate ?? 0) * 3)) },
      ],
      strengths: { subjects, chapters: strengths },
      weaknesses: { subjects: subjects.filter((s) => s.mastery < 65), chapters: weaknesses },
      recommendations,
      mocks: mocks.mocks.map((m) => ({ examId: m.examId, title: m.title, date: m.date, pct: m.pct, percentile: m.percentile })),
      upcoming: famEntries.map((e) => ({ examId: e.examId, title: e.title, date: e.date, readiness: e.readiness })),
      subjects,
    }
  })
  return out
}

/* ------------------------------------------------------------------ */
/* Public orchestration API                                            */
/* ------------------------------------------------------------------ */

/**
 * Full readiness snapshot — ONE authoritative value per context.
 *   readiness.university    → entries for every upcoming university exam
 *   readiness.competitive   → entries for every upcoming competitive exam
 *   readiness.byExamFamily  → JEE / NEET aggregate (Part-18 contract)
 *   readiness.summary       → next-exam quick pointers
 */
export function buildReadinessIntelligence(data, today = '2026-08-06') {
  const university = buildUniversityReadiness(data, today)
  const competitive = buildCompetitiveReadiness(data, today)
  const byExamFamily = buildFamilyReadiness(data, competitive, today)

  const summary = {
    nextUniversity: university[0] ?? null,
    nextCompetitive: competitive[0] ?? null,
    universityCount: university.length,
    competitiveCount: competitive.length,
    families: Object.keys(byExamFamily),
  }
  return { university, competitive, byExamFamily, summary }
}

/**
 * Single-entry readiness for one exam — the Part-6 dispatch contract:
 *   calculateReadiness({ context: 'university' })  → university entries
 *   calculateReadiness({ context: 'competitive', exam: 'JEE' }) → JEE family aggregate + entries
 */
export function calculateReadiness({ context = 'university', exam = null, data, today = '2026-08-06' }) {
  const snapshot = buildReadinessIntelligence(data, today)
  if (context === 'competitive') {
    if (exam && snapshot.byExamFamily[exam]) {
      return { ...snapshot.byExamFamily[exam], entries: snapshot.competitive.filter((e) => e.examFamily === exam) }
    }
    return { university: snapshot.university, competitive: snapshot.competitive, byExamFamily: snapshot.byExamFamily }
  }
  return { ...snapshot.university, entries: snapshot.university }
}

export default buildReadinessIntelligence
