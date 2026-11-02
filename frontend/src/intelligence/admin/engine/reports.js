/**
 * Admin Intelligence Engine — Report foundations (structured summaries).
 * The engine is capable of producing structured data for institution,
 * department, student-risk, faculty and assessment summaries. The Reports
 * UI itself is a later phase — this is the data contract.
 */

import { avg } from './scores.js'

export function buildInstitutionSummary({ health, totals, students, assessments, aiAdoption }) {
  const pillars = health?.pillars ?? []
  const weakest = [...pillars].sort((a, b) => a.value - b.value)[0]
  const strongest = [...pillars].sort((a, b) => b.value - a.value)[0]
  return {
    headline: `Institution health ${health?.score ?? '—'}/100 (${health?.grade ?? '—'})`,
    body: `${totals?.students ?? '—'} students · ${totals?.faculty ?? '—'} faculty across ${totals?.departments ?? '—'} departments. ${strongest ? `Strongest pillar: ${strongest.label} (${strongest.value}/100).` : ''} ${weakest ? `Priority: ${weakest.label} (${weakest.value}/100).` : ''} At-risk rate ${students?.riskSummary?.latestRate ?? '—'}% (${students?.riskSummary?.trendReduction ?? 0}% reduction since ${students?.riskTrend?.[0]?.month ?? 'start'}).`,
    highlights: [
      `${students?.totals?.activeRisk ?? '—'} active-risk students · ${students?.totals?.improvingStudents ?? '—'} recovered`,
      `Exam pass rate ${assessments?.exams?.passRate ?? '—'}% · attendance ${assessments?.attendance?.overall ?? '—'}%`,
      `AI adoption ${aiAdoption?.sessions ?? '—'} sessions this month`,
    ],
  }
}

export function buildDepartmentSummary({ departments }) {
  return {
    headline: `${departments?.list?.length ?? 0} departments · average health ${departments?.avgScore ?? '—'}/100`,
    body: departments?.best
      ? `Best: ${departments.best.name} (${departments.best.score}/100 — pass ${departments.best.passRate}%, attendance ${departments.best.attendance}%, placement ${departments.best.placement}%). Need attention: ${departments.worst?.name ?? '—'} (${departments.worst?.score ?? '—'}/100).`
      : 'No department data.',
    list: (departments?.list ?? []).map((d) => ({
      code: d.code, name: d.name, score: d.score, grade: d.grade,
      passRate: d.passRate, attendance: d.attendance, placement: d.placement,
    })),
  }
}

export function buildStudentRiskSummary({ students }) {
  return {
    headline: `At-risk rate ${students?.riskSummary?.latestRate ?? '—'}% · ${students?.totals?.activeRisk ?? '—'} students`,
    body: `${students?.riskTrend?.length ?? 0}-month trend from ${students?.riskSummary?.firstRate ?? '—'}% to ${students?.riskSummary?.latestRate ?? '—'}% (${students?.riskSummary?.trendDelta ?? 0} pts). ${students?.totals?.improvingStudents ?? 0} students recovered via interventions; ${students?.totals?.flagged ?? 0} flagged this term.`,
    attendanceRisk: (students?.attendanceRisk ?? []).map((s) => ({ name: s.name, roll: s.roll, dept: s.dept, attendance: s.attendance })),
    distribution: students?.distribution ?? [],
  }
}

export function buildFacultySummary({ facultyHealth, profile, people }) {
  const roster = people?.faculty ?? []
  const byDept = {}
  roster.forEach((f) => {
    byDept[f.dept] = byDept[f.dept] ?? []
    byDept[f.dept].push(f)
  })
  return {
    headline: `${profile?.totals?.faculty ?? '—'} faculty · health ${facultyHealth?.score ?? '—'}/100`,
    body: `Teaching satisfaction ${facultyHealth?.teachingSatisfaction ?? '—'}/100 · publications per faculty ${facultyHealth?.publicationsPerFaculty ?? '—'}. ${roster.length} faculty in the roster across ${Object.keys(byDept).length} departments.`,
    byDept: Object.entries(byDept).map(([code, list]) => ({ code, count: list.length })),
  }
}

export function buildAssessmentSummary({ assessments, health }) {
  return {
    headline: `Assessment health ${health?.score ?? '—'}/100 (${health?.grade ?? '—'})`,
    body: `Exam average ${assessments?.exams?.averageScore ?? '—'}% · pass rate ${assessments?.exams?.passRate ?? '—'}% · assignment submission ${assessments?.assignments?.submissionRate ?? '—'}% · ${assessments?.exams?.readiness?.drafting ?? 0} drafts pending before midsem.`,
    readiness: assessments?.exams?.readiness ?? {},
    questionBank: assessments?.questionBank ?? {},
  }
}

export default buildInstitutionSummary

/* =====================================================================
 * Phase 4 — Executive Reporting additions (same engine, same source).
 * ===================================================================== */

/* ---------- Report type catalog (filters are per-type, no irrelevant ones) ---------- */
export const REPORT_TYPES = [
  { id: 'institution', name: 'Institution Performance', icon: 'Landmark', description: 'Overall institutional health, pillars, scale and the executive summary.', category: 'Executive', filters: ['yearRange'] },
  { id: 'academic', name: 'Academic Health', icon: 'BookOpen', description: 'Retention, CGPA, department pass rates, strong & weak subjects, fee and AI adoption.', category: 'Academic', filters: ['yearRange'] },
  { id: 'students', name: 'Student Success', icon: 'Users', description: 'Distribution, at-risk population, attendance risk, high performers and readiness.', category: 'Academic', filters: ['department', 'program'] },
  { id: 'faculty', name: 'Faculty Performance', icon: 'GraduationCap', description: 'Faculty health, effectiveness, workload, engagement and department distribution.', category: 'Academic', filters: ['department'] },
  { id: 'assessment', name: 'Assessment Intelligence', icon: 'ClipboardList', description: 'Exam averages, readiness, weak subjects, question bank coverage and engagement.', category: 'Academic', filters: ['department'] },
  { id: 'departments', name: 'Department Comparison', icon: 'Building2', description: 'Multi-department comparison across health, academics, attendance and outcomes.', category: 'Management', filters: ['departmentMulti'] },
  { id: 'risk', name: 'Risk & Intervention', icon: 'AlertTriangle', description: 'Unified six-category risk register with evidence and recommended actions.', category: 'Management', filters: [] },
  { id: 'outcomes', name: 'Institutional Outcomes', icon: 'TrendingUp', description: 'Placement rate, CTC trend, drives, grants and scholarships.', category: 'Executive', filters: ['yearRange'] },
]

/* ---------- Deterministic executive summary ---------- */
export function buildExecutiveSummary(derived) {
  const health = derived.institutionHealth ?? {}
  const pillars = health.pillars ?? []
  const students = derived.students ?? {}
  const departments = derived.departments ?? {}
  const interventions = derived.interventions?.list ?? []
  const insights = derived.ai?.insights ?? []

  const sorted = [...pillars].sort((a, b) => b.value - a.value)
  const strongest = sorted[0]
  const weakest = sorted[sorted.length - 1]
  const critical = interventions.filter((i) => i.priority === 'Critical')
  const attention = interventions.filter((i) => i.priority === 'High')

  return {
    overall: {
      status: health.score >= 85 ? 'Institutional health remains strong.' : health.score >= 70 ? 'Institutional health is stable with room to improve.' : 'Institutional health requires immediate attention.',
      score: health.score ?? '—',
      grade: health.grade ?? '—',
    },
    positives: [
      strongest ? `${strongest.label} is the strongest pillar at ${strongest.value}/100.` : '',
      departments.best ? `${departments.best.name} leads department health (${departments.best.score}/100).` : '',
      students.riskSummary?.trendReduction > 0 ? `At-risk rate down ${students.riskSummary.trendReduction}% this term (${students.riskSummary.firstRate}% → ${students.riskSummary.latestRate}%).` : '',
      ...insights.filter((i) => i.tone === 'positive').slice(0, 2).map((i) => i.title + '.'),
    ].filter(Boolean),
    attention: [
      weakest ? `${weakest.label} is below other pillars at ${weakest.value}/100.` : '',
      departments.worst ? `${departments.worst.name} shows the lowest department health (${departments.worst.score}/100).` : '',
      ...insights.filter((i) => i.tone === 'warning').slice(0, 2).map((i) => i.title + '.'),
    ].filter(Boolean),
    risks: critical.map((i) => `${i.category}: ${i.reason}`),
    recommendations: [
      weakest?.label?.toLowerCase().includes('assessment') ? 'Prioritise assessment review and targeted intervention before the midsem window.' : 'Prioritise the weakest pillar with the responsible HOD this quarter.',
      departments.worst ? `Schedule an HOD review for ${departments.worst.name} on pass rate and placement strategy.` : '',
      students.riskSummary?.latestRate > 5 ? 'Sustain weekly intervention reviews; escalate the top 10% of at-risk students to counsellors.' : '',
      ...attention.slice(0, 2).map((i) => i.action),
    ].filter(Boolean),
  }
}

/* ---------- Deterministic preview-document builder ----------
   Sections carry typed blocks the preview UI renders (kpi-row, bars, line,
   donut, table, list, alert). All values come from derived/datasets. */
export function buildReportPreviewDoc({ type, derived, datasets, filters = {} }) {
  const d = derived
  const ds = datasets ?? {}
  const aa = ds.analytics ?? {}
  const period = filters.period ?? 'Term 5 · 2026-27'
  const title = (REPORT_TYPES.find((t) => t.id === type)?.name ?? 'Institution Report') + ' Report'
  const generatedAt = new Date().toISOString()

  const base = {
    title,
    meta: { generatedAt, period, institution: d.profile?.name || d.masterProfile?.name || 'Institution' },
    sections: [],
  }

  switch (type) {
    case 'institution': {
      base.sections = [
        kpiRow([
          { label: 'Institution health', value: `${d.institutionHealth?.score ?? '—'}/100` },
          { label: 'Students', value: (d.totals?.students ?? 0).toLocaleString('en-IN') },
          { label: 'Faculty', value: (d.totals?.faculty ?? 0).toLocaleString('en-IN') },
          { label: 'At-risk rate', value: `${d.students?.riskSummary?.latestRate ?? '—'}%` },
        ]),
        bars('Health pillars', 'Six-pillar weighted score', (d.institutionHealth?.pillars ?? []).map((p) => ({ label: p.label, value: p.value })), 'value', 'Score', '#6366f1'),
        line('At-risk trend', 'Monthly %', (d.students?.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk })), 'value', 'At-risk %', '#f43f5e'),
        alert('Executive summary', `${d.reports?.institution?.body ?? ''}`),
      ]
      break
    }
    case 'academic': {
      base.sections = [
        kpiRow([
          { label: 'Retention (2025)', value: `${aa.adminAnalytics?.retention?.slice(-1)[0]?.overall ?? '—'}%` },
          { label: 'Avg CGPA', value: String(d.students?.cgpaAvg ?? '—') },
          { label: 'Avg pass rate', value: `${aa.adminPerformance?.deptPassRates?.length ? Math.round(aa.adminPerformance.deptPassRates.reduce((a, x) => a + x.pass, 0) / aa.adminPerformance.deptPassRates.length) : '—'}%` },
          { label: 'Overall satisfaction', value: `${aa.adminAnalytics?.satisfaction?.overall ?? '—'}/5` },
        ]),
        line('Retention by intake year', 'First-year vs overall', (aa.adminAnalytics?.retention ?? []).map((r) => ({ label: r.year, first: r.first, overall: r.overall })), 'first', 'First-year %', '#6366f1', 'overall'),
        bars('Department pass rates', '% pass by department', (aa.adminPerformance?.deptPassRates ?? []).map((x) => ({ label: x.dept, value: x.pass })), 'value', 'Pass %', '#10b981'),
        list('Strong subjects', (aa.adminExamAnalytics?.bySubject ?? []).sort((a, b) => b.avg - a.avg).slice(0, 2).map((s) => `${s.subject} · ${s.avg}%`)),
        list('Weak subjects', (aa.adminExamAnalytics?.bySubject ?? []).sort((a, b) => a.avg - b.avg).slice(0, 2).map((s) => `${s.subject} · ${s.avg}%`)),
      ]
      break
    }
    case 'students': {
      const risk = (d.students?.attendanceRisk ?? []).filter((s) => filters.department === 'All' || filters.department == null || s.dept === filters.department)
      base.sections = [
        kpiRow([
          { label: 'Total students', value: (d.totals?.students ?? 0).toLocaleString('en-IN') },
          { label: 'At-risk', value: String(d.students?.totals?.activeRisk ?? '—') },
          { label: 'Recovered', value: String(d.students?.totals?.improvingStudents ?? '—') },
          { label: 'Avg CGPA', value: String(d.students?.cgpaAvg ?? '—') },
        ]),
        bars('Performance distribution', 'Grade share %', (d.students?.distribution ?? []).map((g) => ({ label: g.grade, value: g.pct })), 'value', '% of grades', '#6366f1'),
        line('At-risk trend', 'Monthly %', (d.students?.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk })), 'value', 'At-risk %', '#f43f5e'),
        table('Attendance risk', ['Name', 'Roll', 'Dept', 'Attendance', 'Missed'], risk.map((s) => [s.name, s.roll, s.dept, `${s.attendance}%`, String(s.classesMissed)])),
        list('High performers', (d.students?.highPerformers ?? []).slice(0, 4).map((s) => `${s.name} · ${s.dept} · CGPA ${s.cgpa}`)),
      ]
      break
    }
    case 'faculty': {
      base.sections = [
        kpiRow([
          { label: 'Faculty', value: (d.totals?.faculty ?? 0).toLocaleString('en-IN') },
          { label: 'Faculty health', value: `${d.faculty?.health?.score ?? '—'}/100` },
          { label: 'Teaching satisfaction', value: `${d.faculty?.health?.teachingSatisfaction ?? '—'}/100` },
          { label: 'Publications / faculty', value: String(d.faculty?.health?.publicationsPerFaculty ?? '—') },
        ]),
        bars('Faculty health factors', 'Component scores', (d.faculty?.health?.factors ?? []).map((f) => ({ label: f.label, value: f.value })), 'value', 'Score', '#f59e0b'),
        bars('Faculty by department', 'Faculty roster', (d.faculty?.byDept ?? []).map((x) => ({ label: x.code, value: x.count })), 'value', 'Faculty', '#6366f1'),
      ]
      break
    }
    case 'assessment': {
      const exams = d.assessments?.exams ?? {}
      base.sections = [
        kpiRow([
          { label: 'Assessment health', value: `${d.institutionHealth?.pillars?.find((p) => p.label === 'Assessment health')?.value ?? '—'}/100` },
          { label: 'Exams this term', value: String(exams.total ?? '—') },
          { label: 'Average score', value: `${exams.averageScore ?? '—'}%` },
          { label: 'Pass rate', value: `${exams.passRate ?? '—'}%` },
        ]),
        bars('Subject performance', 'Average score by subject', (exams.bySubject ?? []).map((s) => ({ label: s.subject, value: s.avg })), 'value', 'Avg score', '#6366f1'),
        donut('Score distribution', (exams.scoreDistribution ?? []).map((s, i) => ({ name: s.range, value: s.count, color: ['#6366f1', '#3b82f6', '#14b8a6', '#10b981', '#f59e0b', '#f43f5e'][i] }))),
        table('Upcoming exams & readiness', ['Exam', 'Date', 'Students', 'Status'], (exams.upcoming ?? []).map((u) => [u.title, u.date, String(u.students), u.status])),
        alert('Assessment risk', `${exams.readiness?.drafting ?? 0} draft(s) still drafting of ${exams.readiness?.total ?? 0} — finalize before the midsem window.`),
      ]
      break
    }
    case 'departments': {
      const selected = filters.departments?.length ? filters.departments : (d.departments?.list ?? []).map((x) => x.code)
      const rows = (d.departments?.list ?? []).filter((x) => selected.includes(x.code))
      base.sections = [
        kpiRow([
          { label: 'Departments compared', value: String(rows.length) },
          { label: 'Average health', value: `${d.departments?.avgScore ?? '—'}/100` },
          { label: 'Best', value: d.departments?.best?.code ?? '—' },
          { label: 'Needs attention', value: d.departments?.worst?.code ?? '—' },
        ]),
        table('Department comparison', ['Dept', 'Health', 'Pass', 'Attendance', 'Placement', 'Students', 'HOD'], rows.map((x) => [x.code, `${x.score}/100`, `${x.passRate}%`, `${x.attendance}%`, `${x.placement}%`, String(x.students), x.hod])),
        bars('Health by department', 'Selected departments', rows.map((x) => ({ label: x.code, value: x.score })), 'value', 'Health', '#8b5cf6'),
        list('Strengths', rows.filter((x) => x.score >= 90).map((x) => `${x.name} (${x.score}/100)`)),
        list('Weaknesses', rows.filter((x) => x.score < 85).map((x) => `${x.name} (${x.score}/100)`)),
        list('Recommended focus', rows.filter((x) => x.score < 85).map((x) => `${x.code} — HOD review on pass rate and placement.`)),
      ]
      break
    }
    case 'risk': {
      const items = d.interventions?.list ?? []
      const levels = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      base.sections = [
        kpiRow([
          { label: 'Critical', value: String(items.filter((i) => i.priority === 'Critical').length) },
          { label: 'High', value: String(items.filter((i) => i.priority === 'High').length) },
          { label: 'At-risk rate', value: `${d.students?.riskSummary?.latestRate ?? '—'}%` },
          { label: 'Trend', value: `${d.students?.riskSummary?.trendDelta ?? 0} pts` },
        ]),
        table('Intervention register', ['Priority', 'Category', 'Reason', 'Action'], [...items].sort((a, b) => (levels[a.priority] ?? 3) - (levels[b.priority] ?? 3)).map((i) => [i.priority, i.category, i.reason, i.action])),
        line('At-risk trend', 'Monthly %', (d.students?.riskTrend ?? []).map((r) => ({ label: r.month, value: r.atRisk })), 'value', 'At-risk %', '#f43f5e'),
      ]
      break
    }
    case 'outcomes': {
      const p = aa.adminPlacements ?? {}
      base.sections = [
        kpiRow([
          { label: 'Placement rate', value: p.kpis?.[0]?.value ?? '—' },
          { label: 'Average CTC', value: p.kpis?.[1]?.value ?? '—' },
          { label: 'Offers made', value: String(p.kpis?.[2]?.value ?? '—') },
          { label: 'Top recruiters', value: String(p.kpis?.[3]?.value ?? '—') },
        ]),
        bars('Placement rate by branch', '% placed', (p.branchWise ?? []).map((b) => ({ label: b.branch, value: b.placed })), 'value', 'Placed %', '#10b981'),
        bars('Offers by company', 'Offers per company', (p.companyWise ?? []).map((c) => ({ label: c.company.split(' ')[0], value: c.offers })), 'value', 'Offers', '#6366f1'),
        line('Average CTC trend', 'LPA by year', (p.salaryTrend ?? []).map((s) => ({ label: s.year, value: parseFloat(s.avg) || 0 })), 'value', 'CTC LPA', '#f59e0b'),
        table('Upcoming drives', ['Company', 'Role', 'Date', 'Positions'], (p.drives ?? []).map((dr) => [dr.company, dr.role, dr.date, String(dr.positions)])),
      ]
      break
    }
    default:
      base.sections = []
  }
  return base
}

/* ---------- block helpers ---------- */
const kpiRow = (items) => ({ heading: 'Key metrics', kind: 'kpi-row', items })
const bars = (title, subtitle, data, xKey, seriesName, color) => ({ heading: title, subtitle, kind: 'bars', data, xKey, seriesName, color })
const line = (title, subtitle, data, xKey, seriesName, color, secondKey) => ({ heading: title, subtitle, kind: 'line', data, xKey, seriesName, color, secondKey })
const donut = (title, data) => ({ heading: title, kind: 'donut', data })
const table = (title, headers, rows) => ({ heading: title, kind: 'table', headers, rows })
const list = (title, items) => ({ heading: title, kind: 'list', items })
const alert = (title, body) => ({ heading: title, kind: 'alert', body })
