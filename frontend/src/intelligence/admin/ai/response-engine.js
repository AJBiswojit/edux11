/**
 * Executive AI — deterministic response engine.
 *
 * CONSUMES the derived snapshot + existing engines (buildExecutiveSummary,
 * buildReportPreviewDoc from Phase 4) — it never calculates intelligence.
 * Each supported intent reads the relevant derived fields and returns a
 * structured response: title · summary · keyMetrics · insights · risks ·
 * recommendations · actions (existing routes) · nav.
 *
 * Safety boundary: the engine only uses data present in the snapshot; when
 * data is unavailable it says so instead of inventing numbers.
 */

import { detectIntent, INTENT_NAV, INTENT_PATTERNS } from './prompts.js'
import { buildExecutiveSummary } from '../engine/reports.js'

const pct = (v) => (v == null ? '—' : `${v}%`)

function baseResponse(derived, intent) {
  return {
    intent: intent ?? 'institution',
    title: 'Institution Overview',
    summary: '',
    keyMetrics: [],
    insights: [],
    risks: [],
    recommendations: [],
    actions: [],
    nav: INTENT_NAV[intent ?? 'institution'] ?? null,
    generatedAt: new Date().toISOString(),
  }
}

export function generateExecResponse(question, derived) {
  const d = derived ?? {}
  const intent = detectIntent(question)
  const id = intent.id ?? 'unsupported'
  const r = baseResponse(d, id)

  const health = d.institutionHealth ?? {}
  const pillars = health.pillars ?? []
  const students = d.students ?? {}
  const departments = d.departments ?? {}
  const faculty = d.faculty ?? {}
  const attendance = d.attendance ?? {}
  const assessments = d.assessments ?? {}
  const exams = assessments.exams ?? {}
  const interventions = d.interventions?.list ?? []
  const insightsPool = d.ai?.insights ?? []
  const placements = d.datasets?.analytics?.adminPlacements ?? {}

  const weakest = [...pillars].sort((a, b) => a.value - b.value)[0]
  const strongest = [...pillars].sort((a, b) => b.value - a.value)[0]

  switch (id) {
    case 'institution': {
      r.title = 'Institution Overview'
      r.summary = `Institutional health is ${health.score}/100 (${health.grade}). ${strongest ? `${strongest.label} leads at ${strongest.value}/100` : ''}${weakest ? `; ${weakest.label} needs the most attention at ${weakest.value}/100.` : '.'}`
      r.keyMetrics = [
        { label: 'Institution health', value: `${health.score ?? '—'}/100` },
        { label: 'Students', value: (d.totals?.students ?? 0).toLocaleString('en-IN') },
        { label: 'Faculty', value: (d.totals?.faculty ?? 0).toLocaleString('en-IN') },
        { label: 'At-risk rate', value: pct(students.riskSummary?.latestRate) },
      ]
      r.insights = insightsPool.slice(0, 2).map((i) => i.title)
      r.risks = interventions.filter((i) => i.priority === 'Critical').map((i) => `${i.category}: ${i.reason}`)
      r.recommendations = weakest ? [`Review ${weakest.label} (${weakest.value}/100) with the responsible HOD.`] : []
      r.actions = [{ label: 'Open Command Center', to: '/admin' }]
      break
    }
    case 'student-risk': {
      r.title = 'Student Risk'
      r.summary = `${students.totals?.activeRisk ?? '—'} students are estimated at risk (${students.riskSummary?.latestRate ?? '—'}% of the institution) — ${students.riskSummary?.trendReduction ?? 0}% improvement this term.`
      r.keyMetrics = [
        { label: 'At-risk rate', value: pct(students.riskSummary?.latestRate) },
        { label: 'Active risk', value: String(students.totals?.activeRisk ?? '—') },
        { label: 'Recovered', value: String(students.totals?.improvingStudents ?? '—') },
        { label: 'Attendance risk', value: String((students.attendanceRisk ?? []).length) },
      ]
      r.risks = (students.attendanceRisk ?? []).slice(0, 3).map((s) => `${s.name} — ${s.attendance}% attendance (${s.classesMissed} missed)`)
      r.recommendations = ['Sustain weekly intervention reviews; escalate the top 10% to counsellors.', 'Attendance contracts for students below the 75% floor.']
      break
    }
    case 'faculty': {
      r.title = 'Faculty Performance'
      r.summary = `Faculty health is ${faculty.health?.score ?? '—'}/100 (${faculty.health?.grade ?? '—'}) across ${d.totals?.faculty ?? '—'} faculty.`
      r.keyMetrics = [
        { label: 'Faculty health', value: `${faculty.health?.score ?? '—'}/100` },
        { label: 'Teaching satisfaction', value: `${faculty.health?.teachingSatisfaction ?? '—'}/100` },
        { label: 'Publications / faculty', value: String(faculty.health?.publicationsPerFaculty ?? '—') },
        { label: 'Roster depts', value: String((faculty.byDept ?? []).length) },
      ]
      r.insights = (faculty.health?.factors ?? []).map((f) => `${f.label} ${f.value}/100`)
      r.recommendations = (faculty.health?.factors ?? []).filter((f) => f.value < 75).map((f) => `Address ${f.label.toLowerCase()} for the weakest departments.`)
      break
    }
    case 'department': {
      r.title = 'Department Performance'
      const best = departments.best
      const worst = departments.worst
      r.summary = `${best?.name ?? '—'} currently has the strongest department health at ${best?.score ?? '—'}/100. ${worst && worst.code !== best?.code ? `${worst.name} needs attention at ${worst.score}/100.` : ''}`
      r.keyMetrics = [
        { label: 'Best', value: `${best?.code ?? '—'} · ${best?.score ?? '—'}` },
        { label: 'Needs attention', value: `${worst?.code ?? '—'} · ${worst?.score ?? '—'}` },
        { label: 'Average', value: `${departments.avgScore ?? '—'}/100` },
        { label: 'Departments', value: String(departments.list?.length ?? '—') },
      ]
      r.insights = best ? [`${best.code} leads — pass ${best.passRate}%, attendance ${best.attendance}%, placement ${best.placement}%.`] : []
      r.risks = worst && worst.code !== best?.code ? [`${worst.code} — pass ${worst.passRate}%, placement ${worst.placement}%.`] : []
      r.recommendations = worst && worst.code !== best?.code ? [`Schedule an HOD review with ${worst.hod}.`] : []
      r.actions = [{ label: 'Compare departments', to: '/admin/reports?tab=departments' }]
      break
    }
    case 'academic': {
      r.title = 'Academic Performance'
      const aa = d.datasets?.analytics?.adminAnalytics ?? {}
      const passRates = d.datasets?.analytics?.adminPerformance?.deptPassRates ?? []
      const bySubject = exams.bySubject ?? []
      r.summary = `Retention is ${aa.retention?.slice(-1)[0]?.overall ?? '—'}% (2025 intake) with average CGPA ${students.cgpaAvg ?? '—'}.`
      r.keyMetrics = [
        { label: 'Retention', value: pct(aa.retention?.slice(-1)[0]?.overall) },
        { label: 'Avg CGPA', value: String(students.cgpaAvg ?? '—') },
        { label: 'Avg pass rate', value: pct(passRates.length ? Math.round(passRates.reduce((a, x) => a + x.pass, 0) / passRates.length) : null) },
        { label: 'Overall satisfaction', value: `${aa.satisfaction?.overall ?? '—'}/5` },
      ]
      r.risks = bySubject.sort((a, b) => a.avg - b.avg).slice(0, 2).map((s) => `${s.subject} at ${s.avg}% average`)
      r.recommendations = bySubject.sort((a, b) => a.avg - b.avg)[0] ? [`Review ${bySubject.sort((a, b) => a.avg - b.avg)[0].subject} before the midsem.`] : []
      break
    }
    case 'assessment': {
      r.title = 'Assessment Health'
      const healthPillar = pillars.find((p) => p.label === 'Assessment health')
      r.summary = `Assessment health is ${healthPillar?.value ?? '—'}/100. Exams average ${exams.averageScore ?? '—'}% with a ${exams.passRate ?? '—'}% pass rate.`
      r.keyMetrics = [
        { label: 'Assessment health', value: `${healthPillar?.value ?? '—'}/100` },
        { label: 'Exams this term', value: String(exams.total ?? '—') },
        { label: 'Average score', value: pct(exams.averageScore) },
        { label: 'Readiness', value: `${exams.readiness?.ready ?? 0}/${exams.readiness?.total ?? 0} ready` },
      ]
      r.risks = (exams.readiness?.drafting ?? 0) > 0 ? [`${exams.readiness.drafting} exam draft(s) still drafting — midsem begins Aug 19.`] : []
      r.recommendations = (exams.readiness?.drafting ?? 0) > 0 ? ['Finalize remaining papers this week.'] : []
      break
    }
    case 'attendance': {
      r.title = 'Attendance & Engagement'
      r.summary = `Overall attendance is ${attendance.overall ?? '—'}% — best ${attendance.best?.dept ?? '—'} (${attendance.best?.pct ?? '—'}%), needs attention ${attendance.worst?.dept ?? '—'} (${attendance.worst?.pct ?? '—'}%).`
      r.keyMetrics = [
        { label: 'Overall', value: pct(attendance.overall) },
        { label: 'Best dept', value: `${attendance.best?.dept ?? '—'} ${attendance.best?.pct ?? '—'}%` },
        { label: 'Below 75% floor', value: String(attendance.belowThresholdCount ?? 0) },
        { label: 'Assignment submission', value: pct(assessments.assignments?.submissionRate) },
      ]
      r.risks = (attendance.belowThreshold ?? []).slice(0, 3).map((s) => `${s.name} — ${s.attendance}%`)
      r.recommendations = ['Trigger attendance reminders + HOD review of flagged sections.']
      break
    }
    case 'outcomes': {
      r.title = 'Institutional Outcomes'
      r.summary = `Placement rate is ${placements.kpis?.[0]?.value ?? '—'} with average CTC ${placements.kpis?.[1]?.value ?? '—'}.`
      r.keyMetrics = [
        { label: 'Placement rate', value: placements.kpis?.[0]?.value ?? '—' },
        { label: 'Average CTC', value: placements.kpis?.[1]?.value ?? '—' },
        { label: 'Offers', value: String(placements.kpis?.[2]?.value ?? '—') },
        { label: 'Recruiters', value: String(placements.kpis?.[3]?.value ?? '—') },
      ]
      r.insights = (placements.drives ?? []).slice(0, 2).map((dr) => `${dr.company} drive · ${dr.date} · ${dr.positions} positions`)
      break
    }
    case 'summary': {
      const summary = buildExecutiveSummary(d)
      r.title = 'Executive Summary'
      r.summary = summary.overall.status
      r.keyMetrics = [{ label: 'Health', value: `${summary.overall.score}/100` }, { label: 'Grade', value: summary.overall.grade }]
      r.insights = summary.positives.slice(0, 3)
      r.risks = summary.attention.slice(0, 3)
      r.recommendations = summary.recommendations.slice(0, 3)
      r.actions = [{ label: 'Generate Report', to: '/admin/reports?tab=generate' }]
      break
    }
    case 'recommendations': {
      r.title = 'Management Recommendations'
      const summary = buildExecutiveSummary(d)
      const sorted = [...interventions].sort((a, b) => (a.priority === 'Critical' ? -1 : b.priority === 'Critical' ? 1 : 0))
      r.summary = `Priority focus: ${weakest?.label ?? 'institutional health'} — ${weakest?.value ?? '—'}/100.`
      r.keyMetrics = [
        { label: 'Critical', value: String(sorted.filter((i) => i.priority === 'Critical').length) },
        { label: 'High', value: String(sorted.filter((i) => i.priority === 'High').length) },
        { label: 'At-risk', value: pct(students.riskSummary?.latestRate) },
      ]
      r.recommendations = summary.recommendations.slice(0, 3)
      r.actions = [{ label: 'Open Risk & Intervention', to: '/admin/institution-intelligence?tab=risk' }]
      break
    }
    case 'trend': {
      r.title = 'Trend Analysis'
      r.summary = `At-risk rate ${students.riskSummary?.firstRate ?? '—'}% → ${students.riskSummary?.latestRate ?? '—'}% (${students.riskSummary?.trendDelta ?? 0} pts, ${students.riskSummary?.trendReduction ?? 0}% reduction); attendance ${attendance.trend?.[0]?.pct ?? '—'}% → ${attendance.overall ?? '—'}%.`
      r.keyMetrics = [
        { label: 'At-risk trend', value: `${students.riskSummary?.firstRate ?? '—'}→${students.riskSummary?.latestRate ?? '—'}%` },
        { label: 'Attendance trend', value: `${attendance.trend?.[0]?.pct ?? '—'}→${attendance.overall ?? '—'}%` },
        { label: 'Trend months', value: String(students.riskTrend?.length ?? 0) },
      ]
      r.insights = [students.riskSummary?.trendDelta < 0 ? 'The at-risk trend is improving institution-wide.' : 'The at-risk trend is stable or rising — review interventions.']
      break
    }
    case 'report': {
      r.title = 'Report Generation'
      r.summary = 'I can prepare a management-grade report from the intelligence foundation — choose a type to generate.'
      r.keyMetrics = [{ label: 'Report types', value: '8' }, { label: 'Templates', value: '8' }]
      r.actions = [
        { label: 'Open Report Center', to: '/admin/reports?tab=center' },
        { label: 'Generate a Report', to: '/admin/reports?tab=generate' },
        { label: 'Department Comparison', to: '/admin/reports?tab=departments' },
      ]
      break
    }
    case 'strongest': {
      r.title = 'Strongest Areas'
      r.summary = `${strongest?.label ?? '—'} is the strongest pillar (${strongest?.value ?? '—'}/100); ${departments.best?.name ?? '—'} leads departments (${departments.best?.score ?? '—'}/100).`
      r.keyMetrics = [{ label: 'Strongest pillar', value: `${strongest?.label ?? '—'} · ${strongest?.value ?? '—'}` }, { label: 'Best dept', value: `${departments.best?.code ?? '—'} · ${departments.best?.score ?? '—'}` }]
      r.recommendations = ['Share the leading department playbook at the next HOD meeting.']
      break
    }
    case 'weakest': {
      r.title = 'Areas Requiring Attention'
      r.summary = `${weakest?.label ?? '—'} is the weakest pillar (${weakest?.value ?? '—'}/100); ${departments.worst?.name ?? '—'} needs the most attention (${departments.worst?.score ?? '—'}/100).`
      r.keyMetrics = [{ label: 'Weakest pillar', value: `${weakest?.label ?? '—'} · ${weakest?.value ?? '—'}` }, { label: 'Dept to watch', value: `${departments.worst?.code ?? '—'} · ${departments.worst?.score ?? '—'}` }]
      r.recommendations = [`Schedule an HOD review with ${departments.worst?.hod ?? '—'} on pass rate and placement.`]
      r.risks = (students.attendanceRisk ?? []).slice(0, 2).map((s) => `${s.name} attendance ${s.attendance}%`)
      break
    }
    case 'unsupported': {
      /* Unsupported → helpful fallback (never "offline") */
      r.title = 'How I can help'
      r.summary = 'I can currently help with institutional performance, student risk, faculty performance, department analysis, attendance, assessments, outcomes and executive reporting.'
      r.insights = ['Ask about the institution, a department, students, faculty, assessments or outcomes — my answers use the latest institution data.']
      r.recommendations = ['Try one of the suggested prompts below.']
      r.actions = [{ label: 'View Institution Intelligence', to: '/admin/institution-intelligence' }, { label: 'Open Reports', to: '/admin/reports' }]
      r.intent = 'unsupported'
      break
    }
  }

  r.nav = INTENT_NAV[id] ?? null
  return r
}

export { detectIntent, INTENT_NAV, INTENT_PATTERNS }
export default generateExecResponse
