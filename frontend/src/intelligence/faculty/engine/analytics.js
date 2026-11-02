/**
 * Faculty Intelligence Engine — analytics (pure functions).
 * Course progress, assessment coverage, assignment completion, evaluation
 * progress, weak-chapter detection, revision priority and cohorts.
 */

import { round1, avg } from './scores.js'

/* ---------- Course progress ---------- */
export function computeCourseProgress({ courses, attendance }) {
  return (courses ?? []).map((c) => {
    const classAtt = avg(
      (attendance?.classes ?? []).filter((a) => a.course.includes(c.code)),
      'pct'
    )
    const outcomeAttainment = c.outcomes?.length
      ? round1(avg(c.outcomes, 'attainment'))
      : null
    return {
      courseCode: c.code,
      title: c.title,
      section: c.section,
      students: c.students,
      progress: c.progress,
      lecturesDone: c.lecturesDone,
      lecturesTotal: c.lecturesTotal,
      avgScore: c.avgScore,
      passRate: c.passRate,
      atRisk: c.atRisk,
      classAttendance: classAtt ? round1(classAtt) : null,
      outcomeAttainment,
    }
  })
}

/* ---------- Assessment coverage ---------- */
export function computeAssessmentCoverage({ examBuilder, paperGenerator }) {
  const drafts = examBuilder?.drafts ?? []
  const papers = paperGenerator?.generatedPapers ?? []
  const byCourse = {}
  ;[...drafts, ...papers].forEach((d) => {
    const code = d.course ?? 'OTHER'
    byCourse[code] = byCourse[code] ?? []
    byCourse[code].push(d.coverage ?? 0)
  })
  return Object.entries(byCourse).map(([course, covs]) => ({
    course,
    coverage: round1(avg(covs)),
    assessments: covs.length,
  }))
}

/* ---------- Assignment completion ---------- */
export function computeAssignmentCompletion({ assignments }) {
  const list = assignments ?? []
  const completion = list.map((a) => ({
    id: a.id,
    title: a.title,
    course: a.course,
    due: a.due,
    status: a.status,
    submissionRate: a.total ? round1((a.submissions / a.total) * 100) : 0,
    gradedRate: a.submissions ? round1((a.graded / a.submissions) * 100) : 0,
  }))
  return {
    items: completion,
    overallSubmission: round1(avg(completion, 'submissionRate')),
    overallGraded: round1(avg(completion, 'gradedRate')),
    pendingGrading: list.reduce((acc, a) => acc + Math.max(0, (a.submissions ?? 0) - (a.graded ?? 0)), 0),
  }
}

/* ---------- Evaluation progress ---------- */
export function computeEvaluationProgress({ assignments, dashboard }) {
  const list = assignments ?? []
  const graded = list.reduce((a, x) => a + (x.graded ?? 0), 0)
  const submitted = list.reduce((a, x) => a + (x.submissions ?? 0), 0)
  const pending = Math.max(0, submitted - graded)
  const pendingFromDashboard = Number(dashboard?.kpis?.find?.((k) => k.id === 'fk3')?.value ?? 0) || 0
  return {
    graded,
    submitted,
    pending: pending || pendingFromDashboard || 0,
    overall: submitted ? round1((graded / submitted) * 100) : 0,
  }
}

/* ---------- Weak chapter detection (from skill gaps + PYQ patterns) ---------- */
export function detectWeakChapters({ studentAnalytics, pyqAnalysis }) {
  const gaps = (studentAnalytics?.skillGaps ?? []).map((g) => ({
    chapter: g.skill,
    gap: g.gap,
    affectedStudents: g.students,
    source: 'skill-gap',
    severity: g.gap >= 30 ? 'Critical' : g.gap >= 20 ? 'High' : 'Medium',
  }))

  const pyqWeak = (pyqAnalysis?.questionIntelligence?.frequentChapters ?? []).slice(0, 3).map((c) => ({
    chapter: c,
    gap: 25,
    affectedStudents: null,
    source: 'pyq-frequency',
    severity: 'Medium',
  }))

  return {
    items: [...gaps, ...pyqWeak],
    count: gaps.length + pyqWeak.length,
  }
}

/* ---------- Revision priority (from PYQ patterns + weak chapters) ---------- */
export function computeRevisionPriority({ pyqPatterns, weakChapters }) {
  const patterns = (pyqPatterns ?? []).map((p) => ({
    topic: p.pattern,
    frequency: p.frequency,
    impact: p.impact,
    priority: p.impact === 'High' && p.frequency >= 25 ? 'Critical' : p.impact === 'High' ? 'High' : 'Medium',
  }))

  const weakPriority = (weakChapters?.items ?? []).filter((w) => w.severity === 'Critical').map((w) => ({
    topic: w.chapter,
    frequency: null,
    impact: 'High',
    priority: 'Critical',
  }))

  const all = [...patterns, ...weakPriority].sort((a, b) => {
    const rank = { Critical: 0, High: 1, Medium: 2 }
    return (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3)
  })

  return {
    items: all.slice(0, 8),
    critical: all.filter((i) => i.priority === 'Critical').length,
  }
}

/* ---------- Student cohorts ---------- */
export function computeCohorts({ sections, studentAnalytics, weakStudentDetection }) {
  const distribution = studentAnalytics?.distribution ?? []
  const detections = weakStudentDetection?.detections ?? []
  const activeRisk = detections.filter((d) => d.status === 'Active').length
  const monitoring = detections.filter((d) => d.status === 'Monitoring' || d.status === 'Watchlist').length

  return {
    sections: (sections ?? []).map((s) => ({ id: s.id, courseCode: s.courseCode, section: s.section, students: s.students })),
    totalStudents: (sections ?? []).reduce((a, s) => a + s.students, 0),
    distribution,
    weakStudents: {
      active: activeRisk,
      monitoring,
      total: detections.length,
      avgRisk: detections.length ? round1(avg(detections, 'risk')) : 0,
    },
  }
}
