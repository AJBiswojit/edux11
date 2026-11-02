/**
 * Faculty Intelligence Engine — alerts, recommendations & summary.
 * Rule-based teaching alerts, ranked recommendations and the text summary.
 */

import { round1, avg } from './scores.js'

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }

/* ---------- Teaching alerts (rule-based) ---------- */
export function evaluateTeachingAlerts({
  attendance, evaluationProgress, weakStudentDetection, examBuilder, quizBuilder, engagement,
}) {
  const alerts = []

  const avgAtt = avg(attendance?.classes ?? [], 'pct')
  if (avgAtt && avgAtt < 90) {
    alerts.push({
      id: 'tal_att', type: 'attendance', severity: 'warning', priority: 'High',
      title: `Class attendance at ${round1(avgAtt)}%`, reason: 'Below your 90% self-target across marked classes.',
      action: 'Review the lowest class sheet and share an attendance reminder.',
      related: { metric: 'attendance' },
    })
  }

  const pending = evaluationProgress?.pending ?? 0
  if (pending > 30) {
    alerts.push({
      id: 'tal_eval', type: 'grading', severity: 'warning', priority: 'High',
      title: `${pending} submissions pending grading`, reason: 'Backlog is growing faster than AI pre-grading can clear.',
      action: 'Approve AI drafts in batches of 10 — estimated 30 minutes.',
      related: { metric: 'evaluation' },
    })
  }

  const activeRisk = (weakStudentDetection?.detections ?? []).filter((d) => d.status === 'Active').length
  if (activeRisk >= 3) {
    alerts.push({
      id: 'tal_risk', type: 'students', severity: 'critical', priority: 'Critical',
      title: `${activeRisk} students at high risk`, reason: 'AI flags immediate outreach for the top-risk cohort.',
      action: 'Schedule 1:1 check-ins before Friday.',
      related: { metric: 'at-risk' },
    })
  }

  const drafts = (examBuilder?.drafts ?? []).filter((d) => d.status === 'Draft').length
  if (drafts >= 2) {
    alerts.push({
      id: 'tal_exam', type: 'assessment', severity: 'info', priority: 'Medium',
      title: `${drafts} exam drafts not finalized`, reason: 'Midsem deadline is approaching — finalize blueprint coverage.',
      action: 'Review Paper B coverage and approve.',
      related: { metric: 'assessment' },
    })
  }

  const lowEng = (engagement?.byCourse ?? []).find((c) => (c.participation ?? 100) < 82)
  if (lowEng) {
    alerts.push({
      id: 'tal_eng', type: 'engagement', severity: 'info', priority: 'Medium',
      title: `${lowEng.courseCode} engagement trailing`, reason: `Participation ${lowEng.participation}% — lowest across your classes.`,
      action: 'Add a quick warm-up quiz to lift participation.',
      related: { metric: 'engagement', courseCode: lowEng.courseCode },
    })
  }

  return alerts
}

/* ---------- Teaching recommendations (ranked from pool + derived) ---------- */
export function generateTeachingRecommendations({ pool, teachingHealth, alerts }) {
  const ranked = (pool ?? []).map((r) => ({ ...r, rank: PRIORITY_RANK[r.priority] ?? 3 }))
    .sort((a, b) => a.rank - b.rank)

  /* fold high-severity alerts into the recommendations */
  const alertRecs = (alerts ?? []).filter((a) => a.priority === 'Critical' || a.priority === 'High')
    .map((a) => ({
      id: `rec_${a.id}`,
      type: a.type,
      priority: a.priority,
      title: a.title,
      reason: a.reason,
      effort: '15 min',
      impact: 'High',
      fromAlert: true,
    }))

  const merged = [...alertRecs, ...ranked]
    .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3))
    .slice(0, 6)
    .map((r, i) => ({ ...r, sequence: i + 1, status: 'Active' }))

  return { items: merged, critical: merged.filter((i) => i.priority === 'Critical').length }
}

/* ---------- Teaching summary (narrative) ---------- */
export function buildTeachingSummary({
  teachingHealth, effectiveness, engagement, productivity, performanceTrend, cohorts, weakChapters,
}) {
  const bestCourse = effectiveness?.avgScore != null ? 'CS501' : 'your courses'
  return {
    headline: `Teaching health ${teachingHealth?.score}/100 (${teachingHealth?.grade})`,
    body: `Your classes average ${effectiveness?.avgScore ?? '—'}% with a ${performanceTrend?.classDelta >= 0 ? '+' : ''}${performanceTrend?.classDelta ?? 0}-point 6-week trend (${performanceTrend?.direction ?? '—'}). Student engagement sits at ${engagement?.score ?? '—'}% and AI tooling has saved ${productivity?.hoursSaved ?? '—'} hours this term. ${cohorts?.weakStudents?.active ?? 0} students need immediate outreach and the highest-yield next step is ${weakChapters?.items?.[0]?.chapter ?? 'clearing your grading queue'}.`,
    highlights: [
      `Best course: ${bestCourse} (${effectiveness?.avgScore ?? '—'}% avg)`,
      `Engagement: ${engagement?.score ?? '—'}% · AI hours saved: ${productivity?.hoursSaved ?? '—'}h`,
      `${cohorts?.weakStudents?.active ?? 0} at-risk · ${weakChapters?.count ?? 0} weak chapters flagged`,
    ],
  }
}

/* ---------- Assessment summary ---------- */
export function buildAssessmentSummary({ assessmentSummaryInputs, questionBank, paperGenerator, examBuilder, quizBuilder, pyqAnalysis }) {
  return {
    questionBank: questionBank?.summary?.total ?? 0,
    aiGenerated: questionBank?.summary?.aiGenerated ?? 0,
    papersGenerated: (paperGenerator?.generatedPapers ?? []).length,
    examDrafts: (examBuilder?.drafts ?? []).length,
    quizzes: (quizBuilder?.quizzes ?? []).length,
    pyqPapers: pyqAnalysis?.overview?.totalPapers ?? 0,
    flagged: questionBank?.summary?.flagged ?? 0,
  }
}
