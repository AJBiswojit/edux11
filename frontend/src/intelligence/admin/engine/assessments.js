/**
 * Admin Intelligence Engine — Assessment & Attendance aggregation.
 *
 * Institution-level derived metrics that REPLACE the hardcoded UI values
 * identified in the audit (e.g. "DES 94.1%", "CE 88.4%", "5 students",
 * "8.6/10", "71,000 sessions") with computed values from the same data.
 */

export function computeAssessmentIntelligence({
  adminExamAnalytics, adminAssignmentAnalytics, adminQuestionBank, adminAttendanceAnalytics,
}) {
  const examKpis = Object.fromEntries((adminExamAnalytics?.kpis ?? []).map((k) => [k.label, k.value]))
  const assignmentKpis = Object.fromEntries((adminAssignmentAnalytics?.kpis ?? []).map((k) => [k.label, k.value]))

  const scoreDistribution = (adminExamAnalytics?.scoreDistribution ?? []).map((d) => ({ ...d }))
  const bySubject = (adminExamAnalytics?.bySubject ?? []).map((s) => ({ ...s }))
  const upcoming = (adminExamAnalytics?.upcoming ?? []).map((e) => ({ ...e }))
  const readiness = {
    total: upcoming.length,
    ready: upcoming.filter((e) => e.status === 'Ready').length,
    inReview: upcoming.filter((e) => e.status === 'In Review').length,
    drafting: upcoming.filter((e) => e.status === 'Drafting').length,
  }

  return {
    exams: {
      total: examKpis['Exams this term'] ?? 0,
      averageScore: typeof examKpis['Average score'] === 'number' ? examKpis['Average score'] : 0,
      passRate: typeof examKpis['Pass rate'] === 'number' ? examKpis['Pass rate'] : 0,
      malpractice: examKpis['Malpractice cases'] ?? 0,
      scoreDistribution,
      bySubject,
      upcoming,
      readiness,
    },
    assignments: {
      total: assignmentKpis['Assignments this term'] ?? 0,
      submissionRate: assignmentKpis['Submission rate'] ?? 0,
      onTimeRate: assignmentKpis['On-time rate'] ?? 0,
      aiGradedShare: assignmentKpis['AI-graded share'] ?? 0,
      byDept: (adminAssignmentAnalytics?.byDept ?? []).map((d) => ({ ...d })),
      monthly: (adminAssignmentAnalytics?.monthly ?? []).map((m) => ({ ...m })),
      plagiarism: { ...(adminAssignmentAnalytics?.plagiarismFlags ?? {}) },
    },
    questionBank: {
      total: adminQuestionBank?.summary?.total ?? 0,
      aiGenerated: adminQuestionBank?.summary?.aiGenerated ?? 0,
      approved: adminQuestionBank?.summary?.approved ?? 0,
      flagged: adminQuestionBank?.summary?.flagged ?? 0,
      byType: adminQuestionBank?.summary?.byType ?? {},
    },
  }
}

export function computeAttendanceIntelligence({ adminAttendanceAnalytics }) {
  const byDept = (adminAttendanceAnalytics?.byDept ?? []).map((d) => ({ ...d }))
  const best = [...byDept].sort((a, b) => b.pct - a.pct)[0] ?? null
  const worst = [...byDept].sort((a, b) => a.pct - b.pct)[0] ?? null
  const belowThreshold = (adminAttendanceAnalytics?.belowThreshold ?? []).map((s) => ({ ...s }))

  return {
    overall: adminAttendanceAnalytics?.overall ?? 0,
    trend: (adminAttendanceAnalytics?.trend ?? []).map((t) => ({ ...t })),
    weekly: (adminAttendanceAnalytics?.weekly ?? []).map((w) => ({ ...w })),
    byDept,
    best: best ? { dept: best.dept, pct: best.pct } : null,
    worst: worst ? { dept: worst.dept, pct: worst.pct } : null,
    belowThreshold,
    belowThresholdCount: belowThreshold.length,
  }
}

export default computeAssessmentIntelligence
