/**
 * Faculty Intelligence — Reports datasets.
 * Report templates (what each report includes), export history and the
 * scheduled/auto-report feed. Template "includes" lists are rendered in
 * the Reports workspace; live numbers always come from the derived layer,
 * never from this file.
 */

export const reportTemplates = [
  {
    id: 'rt_class', name: 'Class Performance', icon: 'BarChart3', category: 'Academic', format: 'PDF',
    description: 'Class average, pass rate, outcome attainment and the 6-week trend for a course.',
    includes: ['Class average & pass rate', 'CO attainment per outcome', 'Performance trend (6-week)', 'Cohort distribution', 'AI narrative'],
  },
  {
    id: 'rt_atrisk', name: 'At-Risk Register', icon: 'AlertTriangle', category: 'Students', format: 'XLSX',
    description: 'AI-flagged students with risk scores, categories, recommended actions and expected improvement.',
    includes: ['Risk score & confidence', 'Intervention category', 'Recommended action', 'Estimated improvement', 'Priority ranking'],
  },
  {
    id: 'rt_attendance', name: 'Attendance Summary', icon: 'CalendarCheck2', category: 'Academic', format: 'PDF',
    description: 'Overall, class-wise and subject-wise attendance with low-attendance and consecutive-missing cohorts.',
    includes: ['Overall attendance %', 'Class-wise breakdown', '8-week trend', 'Below-75% cohort', 'Consecutive-missing list'],
  },
  {
    id: 'rt_qbank', name: 'Question Bank Analytics', icon: 'Database', category: 'Assessment', format: 'XLSX',
    description: 'Question counts, difficulty & Bloom distribution, quality scores, usage and coverage gaps.',
    includes: ['Difficulty & Bloom distribution', 'Question quality scores', 'Topic coverage & usage', 'Unit coverage gaps', 'Tag frequency'],
  },
  {
    id: 'rt_gradebook', name: 'Gradebook Export', icon: 'FileSpreadsheet', category: 'Academic', format: 'CSV',
    description: 'Per-student marks across assignments, quizzes and internals for a course or section.',
    includes: ['Per-student marks', 'Assignment & quiz scores', 'Attendance alongside marks', 'Pass/fail flags', 'Rank'],
  },
  {
    id: 'rt_assessment', name: 'Assessment Health', icon: 'HeartPulse', category: 'Assessment', format: 'PDF',
    description: 'Assessment readiness, coverage, quality and PYQ depth scored against health thresholds.',
    includes: ['Health score & grade', 'Coverage vs target', 'Readiness factors', 'Weak units', 'AI recommendations'],
  },
  {
    id: 'rt_teaching', name: 'Teaching Health', icon: 'HeartHandshake', category: 'Academic', format: 'PDF',
    description: 'Teaching effectiveness, engagement, productivity and evaluation progress for HOD reviews.',
    includes: ['Teaching health score', 'Effectiveness & engagement', 'AI hours saved', 'Evaluation backlog', 'Recommendations'],
  },
  {
    id: 'rt_engagement', name: 'Student Engagement', icon: 'Users', category: 'Students', format: 'PDF',
    description: 'Composite engagement per student with academic-health distribution and trend.',
    includes: ['Composite engagement', 'Academic-health distribution', 'Top & least engaged', 'Engagement trend', 'AI insights'],
  },
  {
    id: 'rt_pyq', name: 'PYQ Intelligence', icon: 'BrainCircuit', category: 'Assessment', format: 'PDF',
    description: 'PYQ frequency, weightage, difficulty trend, repeated concepts and revision priorities.',
    includes: ['PYQ frequency & weightage', 'Difficulty trend', 'Repeated concepts', 'Priority chapters', 'Revision suggestions'],
  },
  {
    id: 'rt_papers', name: 'Paper Library Inventory', icon: 'Layers', category: 'Assessment', format: 'XLSX',
    description: 'Every generated paper with status, exam type, coverage, versions and export activity.',
    includes: ['Paper metadata', 'Status & exam type', 'Coverage & versions', 'Export/download counts'],
  },
  {
    id: 'rt_research', name: 'Research & Publications', icon: 'FlaskConical', category: 'Operations', format: 'PDF',
    description: 'Publication record, citations trend, h-index and active projects for portfolio reviews.',
    includes: ['Publications & citations', 'h-index trend', 'Active projects', 'Grants & PhD students'],
  },
]

export const exportHistory = [
  { id: 'eh1', name: 'Question Bank — all subjects', format: 'XLSX', rows: 1254, size: '380 KB', exported: '2026-08-04', status: 'Completed' },
  { id: 'eh2', name: 'Paper Library — full inventory', format: 'CSV', rows: 4, size: '42 KB', exported: '2026-08-03', status: 'Completed' },
  { id: 'eh3', name: 'PYQ corpus — CS501 & CS503', format: 'JSON', rows: 486, size: '1.8 MB', exported: '2026-08-02', status: 'Completed' },
  { id: 'eh4', name: 'Student cohorts — all sections', format: 'CSV', rows: 280, size: '96 KB', exported: '2026-08-01', status: 'Completed' },
  { id: 'eh5', name: 'Gradebook — CS503 Sec B', format: 'CSV', rows: 68, size: '31 KB', exported: '2026-07-31', status: 'Failed' },
  { id: 'eh6', name: 'Question Bank — CS501 only', format: 'XLSX', rows: 418, size: '142 KB', exported: '2026-07-30', status: 'Completed' },
]

export const reportSchedule = [
  { id: 'rs1', name: 'Weekly attendance summary', template: 'Attendance Summary', frequency: 'Every Monday 8:00 AM', format: 'PDF', nextRun: '2026-08-10', enabled: true },
  { id: 'rs2', name: 'At-risk register refresh', template: 'At-Risk Register', frequency: 'Daily 6:00 AM', format: 'XLSX', nextRun: '2026-08-07', enabled: true },
  { id: 'rs3', name: 'Assessment health monthly', template: 'Assessment Health', frequency: '1st of month', format: 'PDF', nextRun: '2026-09-01', enabled: false },
]

export default reportTemplates
