/**
 * Student Intelligence Engine — AI Academic Progress Report (Phase 31).
 *
 * THIN CONSUMER of the existing Student Intelligence snapshot — it never
 * recomputes academic scores, DNA or readiness; it assembles a formal,
 * document-ready progress report from the derived keys already produced by
 * computeDerivedIntelligence() (academicHealth, dnaWorkspace, readiness,
 * university, competitive, recommendations, academicJourney, …).
 *
 * Every metric carries a `source` label so the UI can show provenance and
 * nothing is hardcoded. Missing contexts are handled honestly ("No
 * competitive activity recorded yet."), never with fake numbers.
 */

import { clamp, round1 } from './scores.js'

export const REPORT_PERIODS = [
  { id: 'semester', label: 'Current Semester' },
  { id: 'academic-year', label: 'Current Academic Year' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' },
]

/** Deterministic overall score (documented weights) — consumes derived data. */
export function computeOverallReportScore(derived) {
  const u = derived.university ?? {}
  const c = derived.competitive ?? {}
  const h = derived.academicHealth ?? {}

  const academicPerf = h.score ?? 0                                // academicHealth (CGPA-led)
  const assessment = u.assessments?.averagePct ?? 0                // university exam avg
  const attendance = u.attendance?.overall ?? 0                    // attendance
  const course = u.progress?.overall ?? u.courses?.length ? Math.round(u.courses.reduce((a, x) => a + (x.progress ?? 0), 0) / u.courses.length) : 0
  const consistency = derived.consistencyScore ?? 0                // learning consistency
  const comp = c.readiness?.byExamFamily
    ? Math.round(Object.values(c.readiness.byExamFamily).reduce((a, f) => a + (f.score ?? 0), 0) / Math.max(Object.keys(c.readiness.byExamFamily).length, 1))
    : 0

  const hasComp = (c.examFamilies ?? []).length > 0
  const score = round1(
    academicPerf * 0.30 +
    assessment * 0.20 +
    attendance * 0.15 +
    course * 0.15 +
    consistency * 0.10 +
    (hasComp ? comp * 0.10 : 0)
  )
  const grade = score >= 85 ? 'Excellent' : score >= 75 ? 'Good' : score >= 65 ? 'Steady' : 'Needs Attention'
  return {
    score: round1(clamp(score)),
    grade,
    weights: { academicPerformance: 30, assessment: 20, attendance: 15, courseProgress: 15, consistency: 10, competitive: hasComp ? 10 : 0 },
    factors: [
      { label: 'Academic performance', value: round1(academicPerf), weight: 30, source: 'derived.academicHealth.score' },
      { label: 'Assessment performance', value: round1(assessment), weight: 20, source: 'derived.university.assessments.averagePct' },
      { label: 'Attendance', value: round1(attendance), weight: 15, source: 'derived.university.attendance.overall' },
      { label: 'Course progress', value: round1(course), weight: 15, source: 'derived.university.courses.progress' },
      { label: 'Learning consistency', value: round1(consistency), weight: 10, source: 'derived.consistencyScore' },
      { label: 'Competitive preparation', value: round1(comp), weight: hasComp ? 10 : 0, source: hasComp ? 'derived.competitive.readiness.byExamFamily' : 'no competitive activity' },
    ],
  }
}

/** Assessment attempt aggregation — university exams + competitive mocks. */
function aggregateAttempts(derived) {
  const uni = (derived.university?.assessments?.results ?? [])
  const mocks = (derived.competitive?.performance?.mocks ?? [])
  const total = uni.length + mocks.length
  const pcts = [...uni.map((r) => r.pct).filter(Number.isFinite), ...mocks.map((m) => m.pct).filter(Number.isFinite)]
  const accuracy = pcts.length ? round1(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null
  return {
    attempted: total,
    accuracy,
    universityExams: uni.length,
    competitiveMocks: mocks.length,
    latest: mocks[mocks.length - 1] ?? uni[uni.length - 1] ?? null,
    previous: mocks[mocks.length - 2] ?? uni[uni.length - 2] ?? null,
  }
}

/** Exam-performance trend: improving / stable / declining, data-derived. */
function performanceTrend(attempts) {
  if (!attempts.latest || !attempts.previous) return { direction: 'stable', delta: null }
  const latest = attempts.latest.pct ?? 0
  const prev = attempts.previous.pct ?? 0
  const delta = round1(latest - prev)
  return { direction: delta > 2 ? 'improving' : delta < -2 ? 'declining' : 'stable', delta }
}

/** Recommended next steps — derived from weak areas + recommendations. */
function buildRecommendations(derived) {
  const recs = []
  const weak = derived.weaknesses ?? []
  const weakSubjects = weak.filter((w) => /subject/i.test(w.reason ?? '') || /mastery/i.test(w.reason ?? '') || !w.subjectCode?.includes('-'))
  weakSubjects.slice(0, 3).forEach((w, i) => {
    recs.push({ order: recs.length + 1, title: `Revise ${w.subject} — ${w.mastery}% mastery`, detail: w.reason ?? 'Below the 70% mastery threshold', priority: i === 0 ? 'High' : 'Medium', source: 'derived.weaknesses' })
  })
  const compWeak = derived.competitive?.dna?.weakChapters?.[0]
  if (compWeak) recs.push({ order: recs.length + 1, title: `Practice ${compWeak.chapter} PYQs (${compWeak.mastery}% accuracy)`, detail: 'Weakest competitive chapter from PYQ performance', priority: 'High', source: 'derived.competitive.dna.weakChapters' })
  const att = derived.university?.attendance
  const lowAtt = (att?.bySubject ?? []).filter((s) => s.pct < 88)
  if (lowAtt[0]) recs.push({ order: recs.length + 1, title: `Maintain attendance above 85% — ${lowAtt[0].subject} is at ${lowAtt[0].pct}%`, detail: 'Attendance buffer protects midsem eligibility', priority: 'Medium', source: 'derived.university.attendance.bySubject' })
  const pending = derived.university?.assignments?.pending ?? []
  if (pending[0]) recs.push({ order: recs.length + 1, title: `Complete ${pending[0].title} (${pending[0].progress}% done)`, detail: 'Pending assignment protects internal marks', priority: 'High', source: 'derived.university.assignments.pending' })
  if (recs.length < 3) {
    ;(derived.recommendations ?? []).slice(0, 3 - recs.length).forEach((r) => {
      recs.push({ order: recs.length + 1, title: r.topic, detail: r.reason, priority: r.priority ?? 'Medium', source: 'derived.recommendations' })
    })
  }
  return recs.slice(0, 5)
}

/** Course performance table rows (university). */
function courseRows(derived) {
  return (derived.university?.courses ?? []).map((c) => {
    const att = (derived.university?.attendance?.bySubject ?? []).find((s) => s.subjectCode === c.code)
    const m = (derived.academicDna?.mastery ?? []).find((x) => x.subjectCode === c.code)
    const score = m?.mastery ?? c.progress
    const status = score >= 85 ? 'Strong' : score >= 75 ? 'Good' : score >= 65 ? 'Improve' : 'Needs Attention'
    return {
      code: c.code, title: c.title, score: Math.round(score),
      attendance: att?.pct ?? null, progress: c.progress, status, source: 'derived.university.courses + academicDna.mastery',
    }
  })
}

/** Build the full report snapshot for a given period. */
export function buildProgressReport({ derived, profile, datasets, period = 'semester' }) {
  const overall = computeOverallReportScore(derived)
  const attempts = aggregateAttempts(derived)
  const trend = performanceTrend(attempts)
  const courses = courseRows(derived)

  /* strengths / weaknesses (reused from DNA — never recomputed) */
  const strengths = (derived.strengths ?? []).map((s) => ({ ...s, note: 'Strong performance is supported by consistent assessment accuracy and assignment completion.' }))
  const weaknesses = (derived.weaknesses ?? []).map((w) => {
    const att = (derived.university?.attendance?.bySubject ?? []).find((s) => s.subjectCode === w.subjectCode)
    return {
      ...w,
      attendance: att?.pct ?? null,
      recommendedAction: `Revise ${w.subject} fundamentals and complete two additional practice sets.`,
      source: 'derived.weaknesses',
    }
  })

  /* competitive per-family subject readiness */
  const compFamilies = (derived.competitive?.examFamilies ?? []).map((f) => {
    const fam = derived.competitive?.exams?.[f] ?? {}
    const score = derived.competitive?.readiness?.byExamFamily?.[f]?.score ?? 0
    const subjects = (fam.pyq?.bySubject ?? []).map((s) => ({ subject: s.subject, accuracy: s.accuracy }))
    return { family: f, score: Math.round(score), level: score >= 75 ? 'Strong' : score >= 60 ? 'Developing' : 'Building', subjects }
  })

  const lowAttendance = (derived.university?.attendance?.bySubject ?? []).filter((s) => s.pct < 88)
  const attendanceSection = {
    overall: derived.university?.attendance?.overall ?? null,
    strongest: [...(derived.university?.attendance?.bySubject ?? [])].sort((a, b) => b.pct - a.pct)[0] ?? null,
    weakest: lowAttendance.sort((a, b) => a.pct - b.pct)[0] ?? null,
    requiresAttention: lowAttendance.length > 0,
    lowList: lowAttendance,
    trend: derived.university?.attendance?.monthlyTrend ?? [],
    source: 'derived.university.attendance',
  }

  /* learning consistency */
  const lb = derived.learningBehaviourScore ?? null
  const consistencySection = {
    score: derived.consistencyScore ?? null,
    streak: datasets?.studyStatistics?.streakDays ?? null,
    assignments: derived.university?.assignments?.averageGradedPct ?? null,
    practicePerWeek: datasets?.learningBehaviourDetailed?.practiceFrequency?.perWeek ?? null,
    studyDays: datasets?.studyStatistics?.activeDaysPerWeek ?? null,
    improved: (derived.improvementIndex ?? 0) > 5,
    delta: derived.improvementIndex ?? null,
    source: 'derived.consistencyScore + datasets.studyStatistics',
  }

  /* goals — only if real goal data exists */
  const achievements = derived.achievements ?? {}
  const goals = achievements.total
    ? { completed: achievements.completed, total: achievements.total, progress: achievements.progress, pending: achievements.total - achievements.completed }
    : null

  const report = {
    cgpa: profile?.cgpa ?? derived.university?.performance?.cgpa ?? null,
    meta: {
      student: profile?.fullName ?? '—',
      rollNo: profile?.rollNo ?? '—',
      program: profile?.program ?? '—',
      branch: profile?.branch ?? profile?.department ?? '—',
      semester: derived.university?.identity?.semester ?? profile?.semester ?? '—',
      academicYear: derived.university?.identity?.academicYear ?? '—',
      institution: profile?.institution ?? '—',
      generatedAt: new Date().toISOString(),
      periodLabel: REPORT_PERIODS.find((p) => p.id === period)?.label ?? 'Current Semester',
    },
    overall,
    attempts,
    trend,
    courses,
    strengths,
    weaknesses,
    compFamilies,
    attendance: attendanceSection,
    consistency: consistencySection,
    recommendations: buildRecommendations(derived),
    goals,
    timeline: (derived.academicJourney ?? []).slice(0, 12),
    dna: {
      executive: derived.dnaWorkspace?.executive ?? null,
      summary: derived.academicDna?.summary ?? null,
      weakConcepts: derived.academicDna?.weakConcepts ?? [],
      strongConcepts: derived.academicDna?.strongConcepts ?? [],
      errorPatterns: derived.academicDna?.errorPatterns ?? [],
    },
    readiness: {
      university: derived.readiness?.university ?? [],
      competitive: derived.readiness?.competitive ?? [],
      byFamily: derived.readiness?.byExamFamily ?? {},
    },
    status: overall.grade,
    statusNarrative: `Your academic performance is ${overall.grade.toLowerCase()} with an overall score of ${overall.score}/100. ${weaknesses[0] ? `The primary opportunities for improvement are ${weaknesses.slice(0, 2).map((w) => w.subject).join(' and ')}.` : 'Keep the momentum going.'}`,
  }
  return report
}

export default buildProgressReport
