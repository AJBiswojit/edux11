/**
 * Faculty Intelligence Engine — Students Intelligence (pure functions).
 * Cohort overview, merged per-student roster, risk breakdown, intervention
 * impact (fully derived from the weak-student model & cohort trend),
 * rule-based AI recommendations and the students AI summary.
 */

import { round1, avg } from './scores.js'

/* ---------- Students intelligence (assembled) ---------- */
export function computeStudentIntelligence({
  cohorts, attentionStudents, engagementAnalytics, attendanceIntelligence,
  assignmentAnalytics, teachingInsights, studentAnalytics, weakStudentDetection,
}) {
  const detections = weakStudentDetection?.detections ?? []
  const cohortTrend = weakStudentDetection?.cohortTrend ?? []

  /* ---- merged per-student roster (engagement ∪ attention ∪ attendance) ---- */
  const engagementStudents = engagementAnalytics?.students ?? []
  const attentionItems = attentionStudents?.items ?? []
  const lowAtt = attendanceIntelligence?.lowAttendance ?? []
  const consec = attendanceIntelligence?.consecutiveMissing ?? []

  const rosterMap = new Map()
  engagementStudents.forEach((s) => {
    rosterMap.set(s.roll, {
      id: s.id, name: s.name, roll: s.roll, course: s.course,
      engagement: s.score, engagementTrend: s.trend,
      attendance: null, risk: null, status: null, category: null,
    })
  })
  attentionItems.forEach((s) => {
    const row = rosterMap.get(s.roll) ?? { id: s.id, name: s.name, roll: s.roll, course: s.course, engagement: null, engagementTrend: null }
    row.risk = s.risk
    row.status = s.status
    row.category = s.category
    row.suggestedAction = s.suggestedAction
    rosterMap.set(s.roll, row)
  })
  lowAtt.forEach((s) => {
    const row = rosterMap.get(s.roll) ?? { id: `la_${s.roll}`, name: s.name, roll: s.roll, course: '—', engagement: null, engagementTrend: null, risk: null, status: null, category: 'Low Attendance' }
    row.attendance = s.attendance
    row.attendanceLevel = s.level
    rosterMap.set(s.roll, row)
  })
  consec.forEach((s) => {
    const row = rosterMap.get(s.roll)
    if (row) row.consecutiveMissing = s.consecutive
  })

  const roster = [...rosterMap.values()].map((s) => ({
    ...s,
    needsAttention: s.risk != null || (s.attendance != null && s.attendance < 75) || (s.engagement != null && s.engagement < 60),
  })).sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0) || (b.engagement ?? 0) - (a.engagement ?? 0))

  /* ---- intervention stats (derived, never hardcoded) ---- */
  const active = detections.filter((d) => d.status === 'Active').length
  const monitoring = detections.filter((d) => d.status === 'Monitoring').length
  const watchlist = detections.filter((d) => d.status === 'Watchlist').length
  const cleared = detections.filter((d) => d.status === 'Cleared').length
  const firstTrend = cohortTrend[0]?.atRisk ?? null
  const lastTrend = cohortTrend[cohortTrend.length - 1]?.atRisk ?? null
  const trendDelta = firstTrend != null && lastTrend != null ? round1(lastTrend - firstTrend) : null

  const interventionStats = {
    flagged: detections.length,
    active,
    monitoring,
    watchlist,
    cleared,
    atRiskRate: lastTrend,
    trendDelta,
    trendReduction: firstTrend != null && lastTrend != null ? round1(((firstTrend - lastTrend) / firstTrend) * 100) : null,
    model: {
      version: weakStudentDetection?.model?.version ?? '—',
      accuracy: weakStudentDetection?.model?.accuracy ?? null,
      lastTrained: weakStudentDetection?.model?.lastTrained ?? '—',
      features: weakStudentDetection?.model?.features ?? 0,
    },
    cohortTrend,
  }

  /* ---- risk breakdown ---- */
  const riskBreakdown = {
    byPriority: {
      Critical: attentionItems.filter((s) => s.priority === 'Critical').length,
      High: attentionItems.filter((s) => s.priority === 'High').length,
      Medium: attentionItems.filter((s) => s.priority === 'Medium').length,
      Low: attentionItems.filter((s) => s.priority === 'Low').length,
    },
    byCategory: attentionStudents?.summary ?? [],
  }

  /* ---- course health (pass-through from student analytics) ---- */
  const courseHealth = (studentAnalytics?.byCourse ?? []).map((c) => ({
    course: c.course,
    avg: c.avg,
    passRate: c.passRate,
    atRisk: c.atRisk,
    atRiskPct: round1((c.atRisk / Math.max(cohorts?.totalStudents ?? 280, 1)) * 100),
  }))

  /* ---- rule-based recommendations ---- */
  const recommendations = []

  if ((attentionStudents?.critical ?? 0) > 0) {
    recommendations.push({
      id: 'srec1', priority: 'Critical', title: `Outreach to ${attentionStudents.critical} critical students today`,
      reason: (attentionStudents.items ?? []).filter((s) => s.priority === 'Critical').map((s) => s.name).join(', ') + ' — use the drafted messages in the intervention tab.',
    })
  }
  const lowAttCount = attendanceIntelligence?.summary?.studentsBelow75 ?? 0
  if (lowAttCount > 0) {
    recommendations.push({
      id: 'srec2', priority: 'High', title: `${lowAttCount} students below the 75% attendance floor`,
      reason: `Attendance is a strong performance signal — below-75% students score ${attendanceIntelligence?.correlationGap ?? '—'} points lower. Share the attendance reminder.`,
    })
  }
  const worstCourse = [...courseHealth].sort((a, b) => (b.atRiskPct ?? 0) - (a.atRiskPct ?? 0))[0]
  if (worstCourse && (worstCourse.atRiskPct ?? 0) > 5) {
    recommendations.push({
      id: 'srec3', priority: 'High', title: `${worstCourse.course} carries the highest at-risk load`,
      reason: `${worstCourse.atRisk} students (${worstCourse.atRiskPct}% of the cohort) · avg ${worstCourse.avg}% — pair the revision class with 1:1 check-ins.`,
    })
  }
  const lowEng = (engagementAnalytics?.students ?? []).filter((s) => s.score < 60)
  if (lowEng.length) {
    recommendations.push({
      id: 'srec4', priority: 'Medium', title: `${lowEng.length} students with engagement below 60%`,
      reason: lowEng.map((s) => s.name).slice(0, 3).join(', ') + ' — participation nudges and a warm-up quiz usually lift the cohort.',
    })
  }
  if ((cohorts?.weakStudents?.monitoring ?? 0) > 0) {
    recommendations.push({
      id: 'srec5', priority: 'Medium', title: `Review ${cohorts.weakStudents.monitoring} monitoring cases`,
      reason: 'Monitoring students are 2–4 weeks from recovery — a weekly progress review decides promotion or escalation.',
    })
  }

  const summary = {
    headline: `${cohorts?.totalStudents ?? '—'} students · ${cohorts?.sections?.length ?? '—'} sections · at-risk rate ${lastTrend ?? '—'}%`,
    body: `AI flags ${attentionItems.length} students for attention (${attentionStudents?.critical ?? 0} critical) with an average risk of ${attentionStudents?.avgRisk ?? '—'}%. Cohort engagement sits at ${engagementAnalytics?.overall ?? '—'}% and ${lowAttCount} students are below the attendance floor. ${worstCourse ? `${worstCourse.course} needs the most support (${worstCourse.atRisk} at risk).` : ''}`,
    highlights: [
      `${attentionItems.length} flagged · ${active} active interventions · ${cleared} recovered`,
      `Engagement ${engagementAnalytics?.overall ?? '—'}% · attendance ${attendanceIntelligence?.overall ?? '—'}%`,
      `At-risk rate ${lastTrend ?? '—'}%${trendDelta != null ? ` (${trendDelta >= 0 ? '+' : ''}${trendDelta} pts since ${cohortTrend[0]?.month ?? 'start'})` : ''}`,
    ],
  }

  return {
    roster,
    cohortSummary: {
      totalStudents: cohorts?.totalStudents ?? 0,
      sections: cohorts?.sections ?? [],
      distribution: cohorts?.distribution ?? [],
      weakStudents: cohorts?.weakStudents ?? {},
      engagementOverall: engagementAnalytics?.overall ?? null,
      attendanceOverall: attendanceIntelligence?.overall ?? null,
    },
    courseHealth,
    riskBreakdown,
    interventionStats,
    recommendations,
    summary,
    topPerformers: (studentAnalytics?.topPerformers ?? []).map((s) => ({ ...s })),
    scoreDistribution: (studentAnalytics?.distribution ?? []).map((d) => ({ ...d })),
    skillGaps: (studentAnalytics?.skillGaps ?? []).map((g) => ({ ...g })),
  }
}

export default computeStudentIntelligence
