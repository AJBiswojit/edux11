/**
 * Faculty Intelligence Engine — scoring utilities (pure functions).
 * Deterministic: same datasets in → same scores out. Mirrors the student
 * engine conventions (clamp / round1 / avg / weighted).
 */

export const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0))

export const round1 = (v) => Math.round((Number.isFinite(v) ? v : 0) * 10) / 10

export const avg = (arr, key) => {
  if (!arr?.length) return 0
  const vals = arr.map((x) => (key ? Number(x?.[key]) : Number(x))).filter(Number.isFinite)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
}

export const weighted = (factors) => {
  const total = factors.reduce((a, f) => a + (Number(f.weight) || 0), 0) || 1
  return factors.reduce((a, f) => a + (clamp(f.value) * (Number(f.weight) || 0)), 0) / total
}

/* ---------- Teaching Health ---------- */
export function computeTeachingHealth({
  attendance, courses, assignments, engagement, evaluationProgress, workloadBalance = 80,
}) {
  const attendanceScore = clamp(avg(attendance?.classes ?? [], 'pct'))
  const courseProgress = clamp(avg(courses ?? [], 'progress'))
  const assignmentHealth = clamp((() => {
    const list = assignments ?? []
    if (!list.length) return 80
    return avg(list, 'submissions') ? avg(list, 'submissions') : 80
  })())
  const engagementScore = clamp(avg(engagement?.byCourse ?? [], 'participation') || 80)
  const evalScore = clamp(evaluationProgress?.overall ?? 80)

  const score = round1(weighted([
    { value: attendanceScore, weight: 0.25 },
    { value: courseProgress, weight: 0.25 },
    { value: assignmentHealth, weight: 0.15 },
    { value: engagementScore, weight: 0.2 },
    { value: evalScore, weight: 0.15 },
  ]))

  return {
    score,
    grade: score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'At Risk' : 'Critical',
    factors: [
      { label: 'Attendance', value: round1(attendanceScore) },
      { label: 'Course progress', value: round1(courseProgress) },
      { label: 'Assignment completion', value: round1(assignmentHealth) },
      { label: 'Student engagement', value: round1(engagementScore) },
      { label: 'Evaluation progress', value: round1(evalScore) },
    ],
  }
}

/* ---------- Teaching Effectiveness ---------- */
export function computeTeachingEffectiveness({ courses, quizBuilder, attendance }) {
  const avgScore = clamp(avg(courses ?? [], 'avgScore'))
  const passRate = clamp(avg(courses ?? [], 'passRate'))
  const attainment = clamp(avg(
    (courses ?? []).flatMap((c) => (c.outcomes ?? []).map((o) => o.attainment))
  ))
  const quizAvg = quizBuilder?.analytics?.length
    ? clamp(avg(quizBuilder.analytics, 'avgScore') * 10)
    : 75

  const score = round1(weighted([
    { value: avgScore, weight: 0.35 },
    { value: passRate, weight: 0.25 },
    { value: attainment, weight: 0.25 },
    { value: quizAvg, weight: 0.15 },
  ]))

  return {
    score,
    grade: score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Improvement',
    avgScore: round1(avgScore),
    passRate: round1(passRate),
    attainment: round1(attainment),
  }
}

/* ---------- Student Engagement ---------- */
export function computeStudentEngagement({ engagement }) {
  const byCourse = (engagement?.byCourse ?? []).map((c) => {
    const score = round1(weighted([
      { value: c.attendance ?? 90, weight: 0.3 },
      { value: c.submissionRate ?? 90, weight: 0.25 },
      { value: c.quizParticipation ?? 90, weight: 0.2 },
      { value: c.timeliness ?? 90, weight: 0.15 },
      { value: c.participation ?? 85, weight: 0.1 },
    ]))
    return { courseCode: c.courseCode, score, factors: { attendance: c.attendance, submissionRate: c.submissionRate, quizParticipation: c.quizParticipation, timeliness: c.timeliness, participation: c.participation } }
  })

  return {
    score: round1(avg(byCourse, 'score')),
    byCourse,
  }
}

/* ---------- Teaching Productivity ---------- */
export function computeTeachingProductivity({ dashboard, weeklyTeachingHours }) {
  const ai = dashboard?.aiAssistStats ?? {}
  const hoursSaved = Number(ai.hoursSaved ?? 0)
  const questionsGenerated = Number(ai.questionsGenerated ?? 0)
  const lessonsDrafted = Number(ai.lessonsDrafted ?? 0)
  const gradedAutomated = Number(ai.gradedAutomated ?? 0)

  const aiLeverage = clamp(hoursSaved * 6 + lessonsDrafted * 4)
  const automation = clamp(gradedAutomated / 300 * 100)
  const hours = clamp(weeklyTeachingHours ?? 14)

  const score = round1(weighted([
    { value: aiLeverage, weight: 0.4 },
    { value: automation, weight: 0.35 },
    { value: hours, weight: 0.25 },
  ]))

  return {
    score,
    hoursSaved,
    questionsGenerated,
    lessonsDrafted,
    gradedAutomated,
  }
}

/* ---------- Faculty Performance Trend ---------- */
export function computePerformanceTrend({ dashboard, attendance }) {
  const classTrend = (dashboard?.classTrend ?? []).map((w) => ({ label: w.week, value: w.avg }))
  const attendanceTrend = (attendance?.weeklyTrend ?? []).map((w) => ({ label: w.week, value: w.pct }))
  const first = classTrend[0]?.value ?? 0
  const last = classTrend[classTrend.length - 1]?.value ?? 0
  return {
    classTrend,
    attendanceTrend,
    classDelta: round1(last - first),
    direction: last >= first ? 'improving' : 'declining',
  }
}

/* ---------- Assessment Readiness ---------- */
export function computeAssessmentReadiness({ examBuilder, paperGenerator, quizBuilder }) {
  const drafts = examBuilder?.drafts ?? []
  const coverage = clamp(avg(drafts, 'coverage') || 0)
  const inReview = drafts.filter((d) => d.status === 'In Review' || d.status === 'Approved').length
  const papers = paperGenerator?.generatedPapers ?? []
  const readyPapers = papers.filter((p) => p.status === 'Ready').length
  const quizzes = quizBuilder?.quizzes ?? []
  const publishedQuizzes = quizzes.filter((q) => q.status === 'Published').length

  const score = round1(weighted([
    { value: coverage, weight: 0.4 },
    { value: readyPapers / Math.max(papers.length, 1) * 100, weight: 0.3 },
    { value: publishedQuizzes / Math.max(quizzes.length, 1) * 100, weight: 0.3 },
  ]))

  return { score, coverage: round1(coverage), draftsInReview: inReview, readyPapers, publishedQuizzes }
}
