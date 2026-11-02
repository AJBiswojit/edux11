/**
 * Faculty Intelligence Engine — Reports Intelligence (pure functions).
 * Report library statistics, enriched report templates (live numbers always
 * derived from the foundation), export options with real row counts,
 * rule-based AI recommendations and the reports AI summary.
 */

import { round1, avg } from './scores.js'

/* ---------- Reports intelligence (assembled) ---------- */
export function computeReportIntelligence({
  reports, reportTemplates, exportHistory, reportSchedule,
  teachingHealth, teachingEffectiveness, performanceTrend, assessmentHealth,
  engagementAnalytics, attentionStudents, cohorts,
  questionStats, paperLibrary, pyqAnalysis, attendanceIntelligence, research,
}) {
  const list = (reports ?? []).map((r) => ({ ...r }))
  const byFormat = {}
  const byCategory = {}
  list.forEach((r) => {
    byFormat[r.type] = (byFormat[r.type] ?? 0) + 1
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
  })

  const library = {
    total: list.length,
    active: list.filter((r) => !r.archived).length,
    archived: list.filter((r) => r.archived).length,
    totalDownloads: list.reduce((a, r) => a + (r.downloads ?? 0), 0),
    avgDownloads: list.length ? round1(list.reduce((a, r) => a + (r.downloads ?? 0), 0) / list.length) : 0,
    byFormat,
    byCategory,
    latest: [...list].sort((a, b) => String(b.generated ?? '').localeCompare(String(a.generated ?? '')))[0] ?? null,
  }

  /* Enrich templates with live derived numbers. */
  const templates = (reportTemplates ?? []).map((t) => {
    let latest = ''
    let stat = null
    switch (t.id) {
      case 'rt_class':
        latest = `Class avg ${teachingEffectiveness?.avgScore ?? '—'}% · pass ${teachingEffectiveness?.passRate ?? '—'}% · trend ${performanceTrend?.classDelta >= 0 ? '+' : ''}${performanceTrend?.classDelta ?? '—'} pts`
        stat = { label: 'Class avg', value: `${teachingEffectiveness?.avgScore ?? '—'}%` }
        break
      case 'rt_atrisk':
        latest = `${attentionStudents?.total ?? 0} students flagged · ${attentionStudents?.critical ?? 0} critical`
        stat = { label: 'Flagged', value: String(attentionStudents?.total ?? 0) }
        break
      case 'rt_attendance':
        latest = `${attendanceIntelligence?.overall ?? '—'}% overall · ${attendanceIntelligence?.summary?.studentsBelow75 ?? 0} below 75%`
        stat = { label: 'Overall', value: `${attendanceIntelligence?.overall ?? '—'}%` }
        break
      case 'rt_qbank':
        latest = `${questionStats?.total ?? 0} questions · quality ${questionStats?.qualityAvg ?? '—'}/100`
        stat = { label: 'Questions', value: String(questionStats?.total ?? 0) }
        break
      case 'rt_gradebook':
        latest = `${cohorts?.totalStudents ?? '—'} students across ${cohorts?.sections?.length ?? '—'} sections · per-student marks ready`
        stat = { label: 'Students', value: String(cohorts?.totalStudents ?? '—') }
        break
      case 'rt_assessment':
        latest = `Health ${assessmentHealth?.score ?? '—'}/100 (${assessmentHealth?.grade ?? '—'}) · weakest unit flagged`
        stat = { label: 'Health', value: `${assessmentHealth?.score ?? '—'}` }
        break
      case 'rt_teaching':
        latest = `Health ${teachingHealth?.score ?? '—'}/100 (${teachingHealth?.grade ?? '—'}) · ${questionStats ? '' : ''}${attentionStudents?.items?.length ?? 0} at-risk`
        stat = { label: 'Health', value: `${teachingHealth?.score ?? '—'}` }
        break
      case 'rt_engagement':
        latest = `Composite ${engagementAnalytics?.overall ?? '—'}% · ${engagementAnalytics?.distribution?.Excellent ?? 0} excellent`
        stat = { label: 'Composite', value: `${engagementAnalytics?.overall ?? '—'}%` }
        break
      case 'rt_pyq':
        latest = `${pyqAnalysis?.overview?.totalPapers ?? 0} papers · ${pyqAnalysis?.overview?.totalQuestions ?? 0} questions analysed`
        stat = { label: 'Corpus', value: `${pyqAnalysis?.overview?.totalPapers ?? 0} papers` }
        break
      case 'rt_papers':
        latest = `${paperLibrary?.total ?? 0} papers · ${paperLibrary?.readyCount ?? 0} ready`
        stat = { label: 'Papers', value: String(paperLibrary?.total ?? 0) }
        break
      case 'rt_research':
        latest = `${research?.summary?.publications ?? 0} publications · h-index ${research?.summary?.hIndex ?? '—'}`
        stat = { label: 'Output', value: `${research?.summary?.publications ?? 0} pubs` }
        break
      default:
        latest = ''
    }
    return { ...t, latest, stat }
  })

  /* Export options with real derived counts. */
  const cohortRows = cohorts?.totalStudents ?? 0
  const exportOptions = [
    { id: 'ex_qb', name: 'Question Bank', format: 'XLSX', rows: questionStats?.total ?? 0, detail: `${Object.keys(questionStats?.bySubject ?? {}).length} subjects` },
    { id: 'ex_papers', name: 'Paper Library', format: 'CSV', rows: paperLibrary?.total ?? 0, detail: `${paperLibrary?.readyCount ?? 0} ready` },
    { id: 'ex_pyq', name: 'PYQ Corpus', format: 'JSON', rows: pyqAnalysis?.overview?.totalQuestions ?? 0, detail: `${pyqAnalysis?.overview?.totalPapers ?? 0} papers` },
    { id: 'ex_cohorts', name: 'Student Cohorts', format: 'CSV', rows: cohortRows, detail: `${cohorts?.sections?.length ?? '—'} sections · all courses` },
    { id: 'ex_gradebook', name: 'Gradebook', format: 'CSV', rows: cohortRows, detail: 'assignments + quizzes + internals' },
  ]

  /* Export history stats. */
  const history = (exportHistory ?? []).map((e) => ({ ...e }))
  const exportStats = {
    total: history.length,
    completed: history.filter((e) => e.status === 'Completed').length,
    failed: history.filter((e) => e.status === 'Failed').length,
    rowsExported: history.reduce((a, e) => a + (e.rows ?? 0), 0),
  }

  /* Rule-based recommendations. */
  const recommendations = []
  const top = [...list].sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0))[0]
  if (top) {
    recommendations.push({
      id: 'rrec1', priority: 'Medium', title: `${top.title} is your most-downloaded report`,
      reason: `${top.downloads} downloads · regenerated ${top.generated} — keep it fresh for the next review cycle.`,
    })
  }
  if ((attentionStudents?.critical ?? 0) > 0) {
    recommendations.push({
      id: 'rrec2', priority: 'Critical', title: 'Schedule the At-Risk register daily',
      reason: `${attentionStudents.critical} critical students are flagged — a daily XLSX keeps outreach on track.`,
    })
  }
  if ((assessmentHealth?.score ?? 100) < 85) {
    recommendations.push({
      id: 'rrec3', priority: 'High', title: 'Export the Assessment Health report before the HOD review',
      reason: `Health is ${assessmentHealth.score}/100 (${assessmentHealth.grade}) — the PDF includes the gap analysis and AI recommendations.`,
    })
  }
  const scheduleOff = (reportSchedule ?? []).find((s) => !s.enabled)
  if (scheduleOff) {
    recommendations.push({
      id: 'rrec4', priority: 'Medium', title: `Enable the "${scheduleOff.name}" schedule`,
      reason: `${scheduleOff.frequency} · ${scheduleOff.format} — automation means one less thing to remember.`,
    })
  }
  const neverDownloaded = list.filter((r) => (r.downloads ?? 0) === 0)
  if (neverDownloaded.length) {
    recommendations.push({
      id: 'rrec5', priority: 'Low', title: `${neverDownloaded.length} report${neverDownloaded.length > 1 ? 's' : ''} never downloaded`,
      reason: neverDownloaded.map((r) => r.title).slice(0, 2).join(' · ') + ' — generate a fresh version or archive them.',
    })
  }

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  const summary = {
    headline: `Report library ${library.total} reports · ${library.totalDownloads} downloads`,
    body: `${topCategory ? `${topCategory[0]} reports lead your library (${topCategory[1]}). ` : ''}${library.latest ? `Most recent: ${library.latest.title} (${library.latest.generated}). ` : ''}${(reportSchedule ?? []).filter((s) => s.enabled).length} schedules are active — the daily at-risk register and weekly attendance summary run automatically.`,
    highlights: [
      `${library.totalDownloads} total downloads · avg ${library.avgDownloads}/report`,
      `${exportStats.completed}/${exportStats.total} exports completed · ${exportStats.rowsExported.toLocaleString('en-IN')} rows moved`,
      `${attentionStudents?.total ?? 0} at-risk students · ${questionStats?.total ?? 0} bank questions covered by reports`,
    ],
  }

  return {
    library,
    templates,
    exportOptions,
    exportHistory: history,
    exportStats,
    schedule: reportSchedule ?? [],
    recommendations,
    summary,
  }
}

/* ---------- Report preview (mock content derived from the foundation) ---------- */
export function buildReportPreview({ template, derived }) {
  const sections = (template?.includes ?? []).map((title) => ({
    title,
    lines: previewLines(title, derived),
  }))
  return {
    title: template?.name ?? 'Report',
    meta: `Generated for ${template?.category ?? 'Academic'} · ${template?.format ?? 'PDF'} · watermarked`,
    sections,
  }
}

function previewLines(section, d) {
  const map = {
    'Class average & pass rate': [`Average score: ${d?.teachingEffectiveness?.avgScore ?? '—'}%`, `Pass rate: ${d?.teachingEffectiveness?.passRate ?? '—'}%`],
    'CO attainment per outcome': [`Understanding: ${d?.teachingInsights?.averageUnderstanding ?? '—'}% attainment across outcomes`],
    'Performance trend (6-week)': [`Trend: ${d?.performanceTrend?.classDelta >= 0 ? '+' : ''}${d?.performanceTrend?.classDelta ?? '—'} points (${d?.performanceTrend?.direction ?? '—'})`],
    'Cohort distribution': [`${d?.cohorts?.weakStudents?.total ?? 0} flagged · ${d?.cohorts?.totalStudents ?? '—'} students tracked`],
    'AI narrative': [`Teaching health ${d?.teachingHealth?.score ?? '—'}/100 — ${d?.teachingHealth?.grade ?? '—'}`],
    'Risk score & confidence': [`${d?.attentionStudents?.total ?? 0} students · avg risk ${d?.attentionStudents?.avgRisk ?? '—'}%`],
    'Intervention category': [`${(d?.attentionStudents?.summary ?? []).map((c) => `${c.category} ${c.count}`).join(' · ') || '—'}`],
    'Recommended action': [`Top action: ${d?.attentionStudents?.items?.[0]?.suggestedAction ?? '—'}`],
    'Estimated improvement': [`Avg uplift target: ${d?.attentionStudents?.items?.[0]?.estimatedImprovement ?? '—'}`],
    'Priority ranking': [`${d?.attentionStudents?.critical ?? 0} critical · ${d?.attentionStudents?.high ?? 0} high`],
    'Overall attendance %': [`Overall: ${d?.attendanceIntelligence?.overall ?? '—'}% (8-week)`],
    'Class-wise breakdown': [`${(d?.attendanceIntelligence?.byClass ?? []).slice(0, 3).map((c) => `${c.label} ${c.weeksAvg}%`).join(' · ') || '—'}`],
    '8-week trend': [`Latest week ${d?.attendanceIntelligence?.weeklyTrend?.slice(-1)[0]?.pct ?? '—'}%`],
    'Below-75% cohort': [`${d?.attendanceIntelligence?.summary?.studentsBelow75 ?? 0} students below threshold`],
    'Consecutive-missing list': [`${d?.attendanceIntelligence?.consecutiveMissing?.length ?? 0} students missing consecutively`],
    'Difficulty & Bloom distribution': [`Difficulty: ${(d?.assessment?.questionStats?.difficultyDistribution ?? []).map((x) => `${x.level} ${x.pct}%`).join(' · ')}`],
    'Question quality scores': [`Quality avg ${d?.assessment?.questionStats?.qualityAvg ?? '—'}/100 · accuracy ${d?.assessment?.questionStats?.avgAccuracy ?? '—'}%`],
    'Topic coverage & usage': [`${d?.assessment?.questionStats?.totalUsage ?? 0} usages across ${d?.assessment?.questionStats?.topicCoverage?.length ?? 0} topics`],
    'Unit coverage gaps': [`${d?.assessment?.coverage?.gapInsight ?? 'No gaps flagged'}`],
    'Tag frequency': [`${(d?.assessment?.questionStats?.questions ?? []).flatMap((q) => q.tags ?? []).length} tag instances in the bank`],
    'Per-student marks': [`${d?.cohorts?.totalStudents ?? '—'} students · assignments + quizzes + internals`],
    'Assignment & quiz scores': [`${d?.evaluationProgress?.submitted ?? 0} submissions · ${d?.evaluationProgress?.graded ?? 0} graded`],
    'Attendance alongside marks': [`Attendance correlates strongly — below-75% cohort scores ${d?.attendanceIntelligence?.correlationGap ?? '—'} pts lower`],
    'Pass/fail flags': [`Pass rate ${d?.teachingEffectiveness?.passRate ?? '—'}%`],
    'Health score & grade': [`Assessment health ${d?.assessment?.assessmentHealth?.score ?? '—'}/100 (${d?.assessment?.assessmentHealth?.grade ?? '—'})`],
    'Coverage vs target': [`Weakest: ${d?.assessment?.coverage?.weakest?.name ?? '—'} (${d?.assessment?.coverage?.weakest?.coveragePct ?? '—'}%)`],
    'Readiness factors': [`Readiness ${d?.assessmentReadiness?.score ?? '—'} · ${d?.assessmentReadiness?.readyPapers ?? 0} papers ready`],
    'Weak units': [`${d?.assessment?.coverage?.belowTarget?.length ?? 0} units below target`],
    'AI recommendations': [`${(d?.assessment?.recommendations?.items ?? []).slice(0, 2).map((r) => r.title).join(' · ') || '—'}`],
    'Teaching health score': [`Teaching health ${d?.teachingHealth?.score ?? '—'}/100 (${d?.teachingHealth?.grade ?? '—'})`],
    'Effectiveness & engagement': [`Effectiveness ${d?.teachingEffectiveness?.score ?? '—'} · engagement ${d?.studentEngagement?.score ?? '—'}%`],
    'AI hours saved': [`${d?.teachingProductivity?.hoursSaved ?? 0} hours saved · ${d?.teachingProductivity?.gradedAutomated ?? 0} auto-graded`],
    'Evaluation backlog': [`${d?.evaluationProgress?.pending ?? 0} submissions pending grading`],
    'Composite engagement': [`Composite ${d?.engagementAnalytics?.overall ?? '—'}% · ${d?.engagementAnalytics?.distribution?.Excellent ?? 0} excellent`],
    'Academic-health distribution': [`${(d?.engagementAnalytics?.distributionData ?? []).map((x) => `${x.name} ${x.value}`).join(' · ')}`],
    'Top & least engaged': [`Top: ${d?.engagementAnalytics?.topEngaged?.[0]?.name ?? '—'} · Needs help: ${d?.engagementAnalytics?.leastEngaged?.[0]?.name ?? '—'}`],
    'Engagement trend': [`Trend: ${d?.engagementAnalytics?.weeklyTrend?.slice(-1)[0]?.value ?? '—'}% this week`],
    'PYQ frequency & weightage': [`Top chapter: ${d?.pyqIntelligence?.university?.weightage?.[0]?.chapter ?? '—'} (${d?.pyqIntelligence?.university?.weightage?.[0]?.weight ?? '—'}%)`],
    'Difficulty trend': [`Hard share ${d?.pyqIntelligence?.university?.difficultyTrend?.slice(-1)[0]?.hard ?? '—'}% (2025)`],
    'Repeated concepts': [`${(d?.pyqIntelligence?.university?.repeatedConcepts ?? []).slice(0, 3).join(' · ')}`],
    'Priority chapters': [`${(d?.revisionPriority?.items ?? []).slice(0, 3).map((x) => x.topic).join(' · ')}`],
    'Revision suggestions': [`${(d?.pyqIntelligence?.recommendations ?? []).slice(0, 2).map((r) => r.title).join(' · ')}`],
    'Paper metadata': [`${d?.assessment?.paperLibrary?.total ?? 0} papers · ${d?.assessment?.paperLibrary?.byMode?.University ?? 0} university · ${d?.assessment?.paperLibrary?.byMode?.Competitive ?? 0} competitive`],
    'Status & exam type': [`${(d?.assessment?.paperLibrary?.papers ?? []).map((p) => p.examType).filter(Boolean).slice(0, 4).join(' · ')}`],
    'Coverage & versions': [`Avg coverage ${round1(avg((d?.assessment?.paperLibrary?.papers ?? []), 'coverage')) || '—'}% · ${d?.assessment?.paperLibrary?.papers?.reduce((a, p) => a + (p.versions ?? 1), 0) ?? 0} versions`],
    'Export/download counts': [`${d?.assessment?.paperLibrary?.papers?.reduce((a, p) => a + (p.downloads ?? 0), 0) ?? 0} total exports`],
    'Publications & citations': [`${d?.research?.summary?.publications ?? 0} publications · ${d?.research?.summary?.citations ?? 0} citations`],
    'h-index trend': [`h-index ${d?.research?.summary?.hIndex ?? '—'} · ${d?.research?.summary?.phdStudents ?? 0} PhD students`],
    'Active projects': [`${d?.research?.summary?.activeProjects ?? 0} active projects · ${d?.research?.summary?.grants ?? 0} grants`],
    'Grants & PhD students': [`${d?.research?.summary?.grants ?? 0} grants · ${d?.research?.summary?.phdStudents ?? 0} PhD students`],
  }
  return map[section] ?? [`${section} — ready for export.`]
}

export default computeReportIntelligence
