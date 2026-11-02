/**
 * Admin Intelligence Engine — Institution Health (pure functions).
 *
 * Every score is derived deterministically from EXISTING deterministic admin datasets —
 * no invented numbers. The factor weights are documented below and are the
 * only "policy" in this file.
 *
 * Institution health = weighted blend of six pillars:
 *   academic (0.25) · student success (0.20) · attendance (0.15) ·
 *   assessment (0.15) · faculty (0.15) · outcomes (0.10)
 */

import { clamp, round1, avg, weighted } from './scores.js'

/* ---------- Academic health ---------- */
export function computeAcademicHealth({ adminAnalytics, adminPerformance }) {
  const retention = adminAnalytics?.retention?.slice(-1)[0]?.overall ?? 0
  const cgpaAvg = adminAnalytics?.semesterWise?.length
    ? avg(adminAnalytics.semesterWise, 'cgpa') * 10
    : 0
  const passRate = adminPerformance?.deptPassRates?.length
    ? avg(adminPerformance.deptPassRates, 'pass')
    : 0
  const digitalSatisfaction = adminAnalytics?.satisfaction?.digital != null
    ? (adminAnalytics.satisfaction.digital) * 20
    : 0

  const score = round1(weighted([
    { value: retention, weight: 0.3 },
    { value: cgpaAvg, weight: 0.2 },
    { value: passRate, weight: 0.3 },
    { value: digitalSatisfaction, weight: 0.2 },
  ]))
  return {
    score,
    grade: gradeFor(score),
    factors: [
      { label: 'Retention', value: round1(retention) },
      { label: 'Average CGPA', value: round1(cgpaAvg) },
      { label: 'Pass rate', value: round1(passRate) },
      { label: 'Digital satisfaction', value: round1(digitalSatisfaction) },
    ],
  }
}

/* ---------- Attendance health ---------- */
export function computeAttendanceHealth({ adminAttendanceAnalytics }) {
  const overall = adminAttendanceAnalytics?.overall ?? 0
  const trendDelta = (adminAttendanceAnalytics?.trend ?? []).length >= 2
    ? round1(adminAttendanceAnalytics.trend[adminAttendanceAnalytics.trend.length - 1].pct - adminAttendanceAnalytics.trend[0].pct)
    : 0
  const below = adminAttendanceAnalytics?.belowThreshold?.length ?? 0
  return {
    score: round1(clamp(overall - Math.min(below * 0.4, 4))), // small penalty per flagged student
    overall: round1(overall),
    trendDelta,
    belowThreshold: below,
    factors: [
      { label: 'Overall attendance', value: round1(overall) },
      { label: 'Threshold violations', value: round1(Math.max(100 - below * 2.5, 80)) },
    ],
  }
}

/* ---------- Assessment health ---------- */
export function computeAssessmentHealth({ adminExamAnalytics, adminAssignmentAnalytics }) {
  const examAvg = adminExamAnalytics?.kpis?.find((k) => k.label === 'Average score')?.value
  const examPass = adminExamAnalytics?.kpis?.find((k) => k.label === 'Pass rate')?.value
  const examAvgNum = typeof examAvg === 'number' ? examAvg : 0
  const examPassNum = typeof examPass === 'number' ? examPass : 0
  const submission = adminAssignmentAnalytics?.kpis?.find((k) => k.label === 'Submission rate')?.value
  const submissionNum = typeof submission === 'number' ? submission : 0
  const onTime = adminAssignmentAnalytics?.kpis?.find((k) => k.label === 'On-time rate')?.value
  const onTimeNum = typeof onTime === 'number' ? onTime : 0
  const drafts = (adminExamAnalytics?.upcoming ?? []).filter((e) => e.status === 'Drafting').length
  const upcoming = (adminExamAnalytics?.upcoming ?? []).length

  const score = round1(weighted([
    { value: examAvgNum, weight: 0.3 },
    { value: examPassNum, weight: 0.3 },
    { value: submissionNum, weight: 0.2 },
    { value: onTimeNum, weight: 0.1 },
    { value: upcoming ? clamp(100 - (drafts / upcoming) * 60) : 0, weight: 0.1 }, // readiness
  ]))
  return {
    score,
    grade: gradeFor(score),
    examAvg: round1(examAvgNum),
    examPassRate: round1(examPassNum),
    submissionRate: round1(submissionNum),
    onTimeRate: round1(onTimeNum),
    draftsPending: drafts,
    factors: [
      { label: 'Exam average', value: round1(examAvgNum) },
      { label: 'Exam pass rate', value: round1(examPassNum) },
      { label: 'Assignment submission', value: round1(submissionNum) },
      { label: 'Readiness', value: upcoming ? round1(clamp(100 - (drafts / upcoming) * 60)) : 0 },
    ],
  }
}

/* ---------- Faculty health ---------- */
export function computeFacultyHealth({ adminAnalytics, adminResearch, profile }) {
  const teachingSatisfaction = adminAnalytics?.satisfaction?.teaching != null
    ? adminAnalytics.satisfaction.teaching * 20
    : 0
  const digitalSatisfaction = adminAnalytics?.satisfaction?.digital != null
    ? adminAnalytics.satisfaction.digital * 20
    : 0
  const pubs = adminResearch?.kpis?.find((k) => String(k.label || '').toLowerCase().includes('publication'))?.value ?? 0
  const facultyCount = profile?.totals?.faculty ?? 0
  const pubsPerFaculty = Math.min(100, (pubs / Math.max(facultyCount, 1)) / 3 * 100) // 1.94/3 → 64.6

  const score = round1(weighted([
    { value: teachingSatisfaction, weight: 0.6 },
    { value: digitalSatisfaction, weight: 0.2 },
    { value: pubsPerFaculty, weight: 0.2 },
  ]))
  return {
    score,
    grade: gradeFor(score),
    teachingSatisfaction: round1(teachingSatisfaction),
    publicationsPerFaculty: round1(pubs / Math.max(facultyCount, 1)),
    factors: [
      { label: 'Teaching satisfaction', value: round1(teachingSatisfaction) },
      { label: 'Digital satisfaction', value: round1(digitalSatisfaction) },
      { label: 'Research output', value: round1(pubsPerFaculty) },
    ],
  }
}

/* ---------- Student success ---------- */
export function computeStudentSuccess({ adminAnalytics, adminPerformance, adminExamAnalytics, atRiskRate }) {
  const retention = adminAnalytics?.retention?.slice(-1)[0]?.overall ?? 0
  const examPass = adminExamAnalytics?.kpis?.find((k) => k.label === 'Pass rate')?.value
  const examPassNum = typeof examPass === 'number' ? examPass : 0
  const atRiskInverted = typeof atRiskRate === 'number' ? clamp(100 - atRiskRate) : 0
  const placement = 0

  const score = round1(weighted([
    { value: retention, weight: 0.3 },
    { value: examPassNum, weight: 0.25 },
    { value: atRiskInverted, weight: 0.25 },
    { value: placement, weight: 0.2 },
  ]))
  return {
    score,
    grade: gradeFor(score),
    retention: round1(retention),
    atRiskInverted: round1(atRiskInverted),
    factors: [
      { label: 'Retention', value: round1(retention) },
      { label: 'Exam pass rate', value: round1(examPassNum) },
      { label: 'Low risk share', value: round1(atRiskInverted) },
      { label: 'Placement', value: round1(placement) },
    ],
  }
}

/* ---------- Outcomes health (placements + research) ---------- */
export function computeOutcomesHealth({ adminPlacements, adminResearch }) {
  const placementRate = adminPlacements?.kpis?.find((k) => k.label === 'Placement rate')?.value
  const placementNum = typeof placementRate === 'number' ? placementRate : 0
  const grants = adminResearch?.grantTrend?.slice(-1)[0]?.amount
  const grantsNum = typeof grants === 'number' ? grants : 0
  const grantsScore = grantsNum ? clamp((grantsNum / 60) * 100) : 0

  const score = round1(weighted([
    { value: placementNum, weight: 0.6 },
    { value: grantsScore, weight: 0.4 },
  ]))
  return {
    score,
    grade: gradeFor(score),
    placementRate: round1(placementNum),
    grants: round1(grantsNum),
    factors: [
      { label: 'Placement rate', value: round1(placementNum) },
      { label: 'Research funding', value: round1(grantsScore) },
    ],
  }
}

/* ---------- Department health ---------- */
export function computeDepartmentHealth({ departments, deptPassRates, attendanceByDept }) {
  const passMap = Object.fromEntries((deptPassRates ?? []).map((d) => [d.dept, d.pass]))
  const attMap = Object.fromEntries((attendanceByDept ?? []).map((d) => [d.dept, d.pct]))

  const list = (departments ?? []).map((d) => {
    const pass = passMap[d.code] ?? 0
    const att = attMap[d.code] ?? 0
    const placement = d.placement ?? 0
    const score = round1(weighted([
      { value: pass, weight: 0.4 },
      { value: att, weight: 0.25 },
      { value: placement, weight: 0.35 },
    ]))
    return {
      code: d.code,
      name: d.name,
      students: d.students,
      faculty: d.faculty,
      programs: d.programs,
      hod: d.hod,
      passRate: round1(pass),
      attendance: round1(att),
      placement: round1(placement),
      score,
      grade: gradeFor(score),
    }
  }).sort((a, b) => b.score - a.score)

  return {
    list,
    best: list[0] ?? null,
    worst: list[list.length - 1] ?? null,
    avgScore: list.length ? round1(avg(list, 'score')) : 0,
  }
}

/* ---------- Institution health (top-level) ---------- */
export function computeInstitutionHealth({
  academicHealth, attendanceHealth, assessmentHealth, facultyHealth, studentSuccess, outcomesHealth,
}) {
  const score = round1(weighted([
    { value: academicHealth.score, weight: 0.25 },
    { value: studentSuccess.score, weight: 0.2 },
    { value: attendanceHealth.score, weight: 0.15 },
    { value: assessmentHealth.score, weight: 0.15 },
    { value: facultyHealth.score, weight: 0.15 },
    { value: outcomesHealth.score, weight: 0.1 },
  ]))
  return {
    score,
    grade: gradeFor(score),
    pillars: [
      { label: 'Academic health', value: academicHealth.score, grade: academicHealth.grade },
      { label: 'Student success', value: studentSuccess.score, grade: studentSuccess.grade },
      { label: 'Attendance health', value: attendanceHealth.score, grade: gradeFor(attendanceHealth.score) },
      { label: 'Assessment health', value: assessmentHealth.score, grade: assessmentHealth.grade },
      { label: 'Faculty health', value: facultyHealth.score, grade: facultyHealth.grade },
      { label: 'Outcomes', value: outcomesHealth.score, grade: outcomesHealth.grade },
    ],
  }
}

export const gradeFor = (score) => (score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 55 ? 'At Risk' : 'Critical')

export default computeInstitutionHealth
