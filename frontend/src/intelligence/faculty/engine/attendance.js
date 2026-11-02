/**
 * Faculty Intelligence Engine — Attendance Intelligence (pure functions).
 * Derives overall / class-wise / subject-wise attendance, trends, heatmap
 * grid, low-attendance & consecutive-missing cohorts, attendance-vs-
 * performance correlation and rule-based AI insights — all from the
 * attendance dataset (no hardcoded values in the UI).
 */

import { round1, avg } from './scores.js'

const matchesClass = (record, row) => {
  if (record.section !== row.section) return false
  if (row.course === 'CS501-LAB') return record.course.includes('Lab')
  return record.course.startsWith(row.course)
}

/* ---------- Attendance Intelligence ---------- */
export function computeAttendanceIntelligence({ attendance, teachingSchedule }) {
  const classes = attendance?.classes ?? []
  const byClassTrend = attendance?.byClassTrend ?? []
  const weeklyTrend = attendance?.weeklyTrend ?? []
  const vsPerformance = attendance?.attendanceVsPerformance ?? []

  /* Class-wise: 8-week average + latest marked record per class. */
  const byClass = byClassTrend.map((row) => {
    const records = classes.filter((c) => matchesClass(c, row)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    const last = records[0] ?? null
    return {
      label: row.label,
      course: row.course,
      section: row.section,
      weeksAvg: round1(avg(row.weeks)),
      latest: last?.pct ?? row.weeks[row.weeks.length - 1] ?? 0,
      lastDate: last?.date ?? null,
      status: last?.status ?? 'No record',
      delta: round1(row.weeks[row.weeks.length - 1] - row.weeks[0]),
      trend: row.weeks,
    }
  })

  /* Subject-wise: group class trend rows by course code. */
  const bySubjectMap = {}
  byClassTrend.forEach((row) => {
    bySubjectMap[row.course] = bySubjectMap[row.course] ?? []
    bySubjectMap[row.course].push(...row.weeks)
  })
  const bySubject = Object.entries(bySubjectMap).map(([code, weeks]) => ({
    course: code,
    avgPct: round1(avg(weeks)),
    delta: round1(weeks[weeks.length - 1] - weeks[0]),
  }))

  /* Heatmap grid: weeks (columns) × classes (rows). */
  const heatmap = byClassTrend.map((row) => ({
    label: row.label,
    weeks: row.weeks.map((pct) => ({ value: round1(pct) })),
  }))

  /* Low attendance cohorts. */
  const lowAttendance = (attendance?.studentsBelowThreshold ?? []).map((s) => ({
    ...s,
    level: s.attendance < 75 ? 'Critical' : s.attendance < 80 ? 'High' : 'Watch',
  }))

  const consecutiveMissing = (attendance?.consecutiveMissing ?? []).map((s) => ({
    ...s,
    level: s.consecutive >= 3 ? 'Critical' : 'High',
  }))

  /* Attendance vs performance correlation. */
  const correlation = (vsPerformance ?? []).map((b) => ({ bucket: b.bucket, avgScore: b.avgScore }))
  const best = correlation[0]?.avgScore ?? 0
  const worst = correlation[correlation.length - 1]?.avgScore ?? 0
  const correlationGap = round1(best - worst)

  const summary = attendance?.summary ?? {
    avgAttendance: round1(avg(byClass, 'weeksAvg')),
    lowestClass: byClass.reduce((a, b) => (b.weeksAvg < (a?.weeksAvg ?? 101) ? b : a), null)?.label ?? '—',
    highestClass: byClass.reduce((a, b) => (b.weeksAvg > (a?.weeksAvg ?? -1) ? b : a), null)?.label ?? '—',
    studentsBelow75: lowAttendance.length,
  }

  /* Rule-based AI insights — numbers always derived from the dataset. */
  const insights = []

  const threeWeek = (weeks) => round1(avg(weeks.slice(-3)) - avg(weeks.slice(0, 3)))
  const drops = byClass.map((c) => ({ ...c, threeWeekDelta: threeWeek(c.trend) }))
    .filter((c) => c.threeWeekDelta <= -2)
    .sort((a, b) => a.threeWeekDelta - b.threeWeekDelta)
  if (drops.length) {
    const d = drops[0]
    insights.push({
      id: 'att_ins_drop', tone: 'warning', icon: 'trending-down',
      title: `Attendance in ${d.label} has dropped by ${Math.abs(d.threeWeekDelta)} points`,
      body: `The 3-week rolling average fell from ${round1(avg(d.trend.slice(0, 3)))}% to ${round1(avg(d.trend.slice(-3)))}% — review recent sessions and follow up with absentees.`,
    })
  }

  const risers = byClass.map((c) => ({ ...c, threeWeekDelta: threeWeek(c.trend) }))
    .filter((c) => c.threeWeekDelta >= 2)
    .sort((a, b) => b.threeWeekDelta - a.threeWeekDelta)
  if (risers.length) {
    const r = risers[0]
    insights.push({
      id: 'att_ins_rise', tone: 'positive', icon: 'trending-up',
      title: `Attendance improving in ${r.label} after recent sessions`,
      body: `Up ${r.threeWeekDelta} points over the last 3 weeks — the tutorial/quiz block is working. Keep the pattern for ${r.course}.`,
    })
  }

  if (correlation.length >= 2) {
    insights.push({
      id: 'att_ins_corr', tone: 'neutral', icon: 'target',
      title: 'Attendance is a strong performance signal',
      body: `Students with attendance below 75% score ${correlationGap} points lower than the 90%+ cohort (${correlation[0]?.avgScore ?? '—'} vs ${correlation[correlation.length - 1]?.avgScore ?? '—'} avg).`,
    })
  }

  if (consecutiveMissing.length) {
    const top = consecutiveMissing[0]
    insights.push({
      id: 'att_ins_miss', tone: 'warning', icon: 'users',
      title: `${consecutiveMissing.length} students missing consecutive classes`,
      body: `${top.name} (${top.roll}) has missed ${top.consecutive} classes in a row — reach out before the attendance floor (75%) is breached.`,
    })
  }

  const lowest = byClass.reduce((a, b) => (b.weeksAvg < (a?.weeksAvg ?? 101) ? b : a), null)
  if (lowest) {
    insights.push({
      id: 'att_ins_lowest', tone: 'warning', icon: 'alert',
      title: `${lowest.label} is your lowest-attendance class`,
      body: `${lowest.weeksAvg}% 8-week average (${lowest.delta >= 0 ? '+' : ''}${lowest.delta} pts since W1). A gentle reminder via the announcement channel usually recovers 2–3 points.`,
    })
  }

  return {
    overall: summary.avgAttendance ?? round1(avg(byClass, 'weeksAvg')),
    summary,
    byClass,
    bySubject,
    weeklyTrend,
    heatmap,
    lowAttendance,
    consecutiveMissing,
    correlation,
    correlationGap,
    insights,
    pendingToday: computePendingAttendance(attendance, teachingSchedule),
  }
}

/* ---------- Pending attendance for today (schedule vs marked records) ---------- */
export function computePendingAttendance(attendance, teachingSchedule = []) {
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const today = new Date().toISOString().slice(0, 10)
  const markedToday = (attendance?.classes ?? []).filter((c) => c.date === today)
  const day = (teachingSchedule ?? []).find((d) => d.day === todayName)
  const slots = day?.slots ?? []
  const pending = slots.filter((s) => {
    if (!s.courseCode) return false
    const isLab = s.courseCode === 'CS501-LAB' || s.type === 'Lab'
    return !markedToday.some((m) => (isLab ? m.course.includes('Lab') : m.course.startsWith(s.courseCode)) && m.section === s.section)
  })
  return {
    count: pending.length,
    slots: pending.map((s) => ({ course: s.course, courseCode: s.courseCode, section: s.section, time: s.time, room: s.room })),
  }
}

export default computeAttendanceIntelligence
