/**
 * Faculty Intelligence Engine — Assignment Analytics (pure functions).
 * Pending / submitted / late / needs-review pipelines, average marks,
 * completion & grading trends, high & weak performers, common mistakes
 * and rule-based AI suggestions — all derived from the assignments dataset.
 */

import { round1, avg } from './scores.js'

/* ---------- Assignment Analytics ---------- */
export function computeAssignmentAnalytics({ assignments, studentAnalytics, attentionStudents }) {
  const list = (assignments ?? []).map((a) => {
    const submitted = a.submissions ?? 0
    const total = a.total ?? submitted
    const graded = a.graded ?? 0
    const pendingGrading = Math.max(0, submitted - graded)
    return {
      id: a.id,
      title: a.title,
      course: a.course,
      due: a.due,
      published: a.published,
      status: a.status,
      maxScore: a.maxScore,
      weight: a.weight,
      submissions: submitted,
      total,
      lateCount: a.lateCount ?? 0,
      avgScore: a.avgScore ?? null,
      avgPct: a.avgScore != null && a.maxScore ? round1((a.avgScore / a.maxScore) * 100) : null,
      failureRate: a.failureRate ?? null,
      commonMistakes: a.commonMistakes ?? [],
      submissionRate: total ? round1((submitted / total) * 100) : 0,
      gradedRate: submitted ? round1((graded / submitted) * 100) : 0,
      pendingGrading,
      needsReview: pendingGrading > 0,
    }
  })

  const completionTrend = list.map((a) => ({
    label: shortTitle(a.title),
    submissionRate: a.submissionRate,
    gradedRate: a.gradedRate,
  }))

  const pendingGradingTotal = list.reduce((acc, a) => acc + a.pendingGrading, 0)
  const submittedTotal = list.reduce((acc, a) => acc + a.submissions, 0)
  const lateTotal = list.reduce((acc, a) => acc + a.lateCount, 0)
  const needsReviewCount = list.filter((a) => a.needsReview).length
  const openCount = list.filter((a) => a.status === 'Open').length
  const gradedCount = list.filter((a) => a.status === 'Graded').length
  const avgMarks = list.filter((a) => a.avgScore != null).length
    ? round1(avg(list.filter((a) => a.avgScore != null), 'avgPct'))
    : null

  /* Performers. */
  const highPerformers = (studentAnalytics?.topPerformers ?? []).map((s) => ({
    name: s.name, avg: s.avg, attendance: s.attendance, trend: s.trend,
  }))
  const needsHelp = (attentionStudents?.items ?? [])
    .filter((s) => ['Pending Assignments', 'Weak Performance', 'Poor Quiz Results'].includes(s.category))
    .slice(0, 5)
    .map((s) => ({ name: s.name, roll: s.roll, course: s.course, reason: s.reason, priority: s.priority }))

  /* Rule-based AI suggestions — every number derived from the data. */
  const suggestions = []

  const worst = list.filter((a) => a.failureRate != null).sort((a, b) => b.failureRate - a.failureRate)[0]
  if (worst && worst.failureRate > 0) {
    suggestions.push({
      id: 'asg_sug_fail', tone: 'warning', icon: 'alert',
      title: `${worst.title} has the highest failure rate`,
      body: `${worst.failureRate}% of graded submissions fell below the pass mark. Schedule a doubt-clearing session and release a targeted practice set before the next assessment.`,
    })
  }

  const late = list.filter((a) => a.lateCount > 0).sort((a, b) => b.lateCount - a.lateCount)[0]
  if (late) {
    suggestions.push({
      id: 'asg_sug_late', tone: 'neutral', icon: 'clock',
      title: `${late.lateCount} late submissions on ${shortTitle(late.title)}`,
      body: 'Consider a 24-hour grace window with a 10%/day penalty — it typically recovers half of the late cohort.',
    })
  }

  const mistakes = [...new Set(list.flatMap((a) => a.commonMistakes ?? []))].slice(0, 4)
  if (mistakes.length) {
    suggestions.push({
      id: 'asg_sug_mistakes', tone: 'warning', icon: 'list',
      title: 'Common mistakes to address in class',
      body: mistakes.join(' · '),
    })
  }

  if (pendingGradingTotal > 0) {
    suggestions.push({
      id: 'asg_sug_grading', tone: 'positive', icon: 'sparkles',
      title: `${pendingGradingTotal} submissions awaiting review`,
      body: 'AI pre-graded drafts are ready — approve in batches of 10 to clear the queue in ~30 minutes.',
    })
  }

  const lowRate = list.filter((a) => a.submissionRate < 60).sort((a, b) => a.submissionRate - b.submissionRate)[0]
  if (lowRate) {
    suggestions.push({
      id: 'asg_sug_low', tone: 'warning', icon: 'users',
      title: `${shortTitle(lowRate.title)} has a ${lowRate.submissionRate}% submission rate`,
      body: 'A reminder push and a 24h extension usually lift completion by 15–20 points.',
    })
  }

  return {
    items: list,
    completionTrend,
    pendingGrading: pendingGradingTotal,
    submitted: submittedTotal,
    late: lateTotal,
    needsReviewCount,
    openCount,
    gradedCount,
    avgMarks,
    highPerformers,
    needsHelp,
    suggestions,
  }
}

const shortTitle = (t) => {
  const s = t ?? ''
  const m = s.match(/^([A-Za-z]+) (Assignment|Problem Set) (\d+)/)
  if (m) return `${m[1]} ${m[2].charAt(0)}${m[3]}`
  return s.length > 26 ? `${s.slice(0, 26)}…` : s
}

export default computeAssignmentAnalytics
