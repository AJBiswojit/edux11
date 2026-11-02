/**
 * Faculty Intelligence Engine — Student Engagement Analytics (pure functions).
 * Composite per-student engagement, academic-health distribution, top/least
 * engaged cohorts, engagement trend and rule-based AI insights — derived
 * from the per-student engagement signals dataset.
 */

import { round1, avg, weighted } from './scores.js'

const DIMENSIONS = [
  { key: 'participation', label: 'Class participation', weight: 0.25 },
  { key: 'attendanceBehavior', label: 'Attendance behaviour', weight: 0.2 },
  { key: 'assignmentCompletion', label: 'Assignment completion', weight: 0.25 },
  { key: 'quizParticipation', label: 'Quiz participation', weight: 0.2 },
  { key: 'consistency', label: 'Learning consistency', weight: 0.1 },
]

/* ---------- Engagement Analytics ---------- */
export function computeEngagementAnalytics({ engagementScores, engagementInputs }) {
  const students = (engagementScores?.students ?? []).map((s) => {
    const score = round1(weighted(DIMENSIONS.map((d) => ({ value: s[d.key] ?? 0, weight: d.weight }))))
    return {
      id: s.id,
      name: s.name,
      roll: s.roll,
      course: s.course,
      score,
      dimensions: DIMENSIONS.map((d) => ({ key: d.key, label: d.label, value: s[d.key] ?? 0 })),
      trend: s.trend ?? '0',
    }
  })

  const distribution = {
    Excellent: students.filter((s) => s.score >= 85).length,
    Good: students.filter((s) => s.score >= 70 && s.score < 85).length,
    'Needs support': students.filter((s) => s.score >= 50 && s.score < 70).length,
    'At risk': students.filter((s) => s.score < 50).length,
  }

  const topEngaged = [...students].sort((a, b) => b.score - a.score).slice(0, 4)
  const leastEngaged = [...students].sort((a, b) => a.score - b.score).slice(0, 4)

  const byCourse = (engagementInputs?.byCourse ?? []).map((c) => {
    const score = round1(weighted([
      { value: c.attendance ?? 90, weight: 0.3 },
      { value: c.submissionRate ?? 90, weight: 0.25 },
      { value: c.quizParticipation ?? 90, weight: 0.2 },
      { value: c.timeliness ?? 90, weight: 0.15 },
      { value: c.participation ?? 85, weight: 0.1 },
    ]))
    return { courseCode: c.courseCode, score, participation: c.participation, attendance: c.attendance, submissionRate: c.submissionRate, quizParticipation: c.quizParticipation }
  })

  /* Rule-based AI insights — numbers derived from the dataset. */
  const insights = []
  const overall = students.length ? round1(avg(students, 'score')) : 0

  const lowest = leastEngaged[0]
  if (lowest && lowest.score < 65) {
    insights.push({
      id: 'eng_ins_low', tone: 'warning', icon: 'users',
      title: `${lowest.name} is your least engaged student`,
      body: `Composite engagement ${lowest.score}% — quiz participation (${lowest.dimensions.find((d) => d.key === 'quizParticipation')?.value ?? '—'}%) and assignment completion (${lowest.dimensions.find((d) => d.key === 'assignmentCompletion')?.value ?? '—'}%) are the drag factors.`,
    })
  }

  const trailCourse = byCourse.sort((a, b) => a.score - b.score)[0]
  const leadCourse = byCourse.sort((a, b) => b.score - a.score)[0]
  if (trailCourse && leadCourse && trailCourse.courseCode !== leadCourse.courseCode) {
    insights.push({
      id: 'eng_ins_course', tone: 'neutral', icon: 'target',
      title: `${trailCourse.courseCode} engagement trails ${leadCourse.courseCode} by ${round1(leadCourse.score - trailCourse.score)} points`,
      body: `${trailCourse.courseCode}: ${trailCourse.score}% vs ${leadCourse.courseCode}: ${leadCourse.score}% — a quick warm-up quiz at lecture start lifts participation.`,
    })
  }

  const quizAvg = round1(avg(students, 'quizParticipation'))
  const quizFactor = DIMENSIONS.find((d) => d.key === 'quizParticipation')
  const assignmentAvg = round1(avg(students, 'assignmentCompletion'))
  if (quizAvg < assignmentAvg) {
    insights.push({
      id: 'eng_ins_quiz', tone: 'warning', icon: 'zap',
      title: 'Quiz participation lags assignment completion',
      body: `Cohort quiz participation averages ${quizAvg}% vs ${assignmentAvg}% for assignments — low-stakes quiz incentives would close the gap.`,
    })
  }

  const declining = students.filter((s) => String(s.trend).startsWith('-'))
  if (declining.length) {
    insights.push({
      id: 'eng_ins_decline', tone: 'warning', icon: 'trending-down',
      title: `${declining.length} students are on a declining engagement trend`,
      body: `${declining.map((s) => s.name).slice(0, 3).join(', ')}${declining.length > 3 ? '…' : ''} — schedule brief check-ins before the midsem.`,
    })
  }

  return {
    overall,
    students,
    distribution,
    distributionData: [
      { name: 'Excellent', value: distribution.Excellent, color: '#10b981' },
      { name: 'Good', value: distribution.Good, color: '#6366f1' },
      { name: 'Needs support', value: distribution['Needs support'], color: '#f59e0b' },
      { name: 'At risk', value: distribution['At risk'], color: '#ef4444' },
    ],
    dimensionAverages: DIMENSIONS.map((d) => ({ label: d.label, value: round1(avg(students, d.key)) })),
    topEngaged,
    leastEngaged,
    byCourse,
    weeklyTrend: engagementScores?.weeklyTrend ?? [],
    insights,
    note: engagementInputs?.note ?? null,
  }
}

export default computeEngagementAnalytics
